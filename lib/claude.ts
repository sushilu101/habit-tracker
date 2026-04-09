import Anthropic from '@anthropic-ai/sdk'
import type { ParsedSMSData } from './types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function parseSMSReply(
  userMessage: string,
  contextDate: string,
  currentData: {
    equivalent_miles: number | null
    wakeup_time: string | null
    unhealthy_meals: number | null
    flossed: boolean | null
  }
): Promise<ParsedSMSData> {
  const prompt = `You are a habit tracking assistant parsing a WhatsApp reply for ${contextDate}.

Current values for today:
- equivalent_miles: ${currentData.equivalent_miles ?? 'not set'}
- wakeup_time: ${currentData.wakeup_time ?? 'not set'}
- unhealthy_meals: ${currentData.unhealthy_meals ?? 'not set'}
- flossed: ${currentData.flossed ?? 'not set'}

User message: "${userMessage}"

Extract ONLY the fields the user is updating. OMIT fields they did not mention — do not include them at all, do not set them to null.

Fields and how to parse them:
- equivalent_miles: number — any mention of miles, running, or biking. "miles 7", "7 miles", "change miles to 7.0", "ran 5", "7.0 miles", "set miles to 3" all map here.
- wakeup_time: "HH:MM" 24-hour string — any mention of waking up. "woke up at 6:20" → "06:20", "620" → "06:20", "6:20am" → "06:20", "up at 6" → "06:00".
- unhealthy_meals: integer — unhealthy/bad meals today. "1 unhealthy meal" → 1, "had pizza" → 1, "no bad meals" → 0, "0 unhealthy" → 0.
- flossed: boolean — "yes flossed", "flossed", "yeah", "yep" → true; "no", "didn't floss", "nope" → false.
- notes: string — anything else worth recording.

Examples (return ONLY the JSON object, nothing else):
"change miles to 7.0"        → {"equivalent_miles": 7.0}
"miles 7"                    → {"equivalent_miles": 7.0}
"7 miles"                    → {"equivalent_miles": 7.0}
"woke up at 6:20"            → {"wakeup_time": "06:20"}
"1 unhealthy meal"           → {"unhealthy_meals": 1}
"no unhealthy meals"         → {"unhealthy_meals": 0}
"yes flossed"                → {"flossed": true}
"didn't floss"               → {"flossed": false}
"woke 630, 1 bad meal"       → {"wakeup_time": "06:30", "unhealthy_meals": 1}
"miles 5 woke at 6 flossed"  → {"equivalent_miles": 5.0, "wakeup_time": "06:00", "flossed": true}

Return ONLY a valid JSON object. No markdown fences, no explanation.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  try {
    // Strip markdown code fences if Claude included them despite instructions
    const text = content.text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(text)
    return parsed as ParsedSMSData
  } catch {
    console.error('Failed to parse Claude response:', content.text)
    return {}
  }
}

export async function generateSMSAck(
  parsed: ParsedSMSData,
  date: string
): Promise<string> {
  const updates: string[] = []

  if (parsed.wakeup_time !== undefined && parsed.wakeup_time !== null) {
    const [h, m] = parsed.wakeup_time.split(':').map(Number)
    const period = h >= 12 ? 'pm' : 'am'
    const display = `${h > 12 ? h - 12 : h || 12}:${String(m).padStart(2, '0')}${period}`
    const goalMet = h < 6 || (h === 6 && m <= 30)
    updates.push(`wakeup at ${display} ${goalMet ? '✅' : '❌ (goal: before 6:30am)'}`)
  }

  if (parsed.unhealthy_meals !== undefined && parsed.unhealthy_meals !== null) {
    updates.push(`${parsed.unhealthy_meals} unhealthy meal${parsed.unhealthy_meals !== 1 ? 's' : ''} today`)
  }

  if (parsed.flossed !== undefined && parsed.flossed !== null) {
    updates.push(`flossed: ${parsed.flossed ? 'yes ✅' : 'no ❌'}`)
  }

  if (parsed.equivalent_miles !== undefined && parsed.equivalent_miles !== null) {
    updates.push(`${parsed.equivalent_miles.toFixed(1)} equiv. miles`)
  }

  if (updates.length === 0) {
    return `Got it! No changes recorded for ${date}.`
  }

  return `Got it! Updated for ${date}:\n${updates.map(u => `• ${u}`).join('\n')}`
}
