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
  const prompt = `You are parsing a user's SMS reply to a habit tracking check-in for ${contextDate}.

Current tracked data for today:
- Equivalent miles: ${currentData.equivalent_miles ?? 'not set'}
- Wakeup time: ${currentData.wakeup_time ?? 'not set'}
- Unhealthy meals (today's addition): ${currentData.unhealthy_meals ?? 'not set'}
- Flossed tonight: ${currentData.flossed ?? 'not set'}

The user replied: "${userMessage}"

Extract any habit data mentioned. Return a JSON object with only the fields the user mentioned/updated:
- wakeup_time: string in "HH:MM" 24-hour format (e.g. "06:20" for 6:20am, "06:35" for 6:35am), or null if not mentioned
- unhealthy_meals: integer (number of unhealthy meals mentioned for today), or null if not mentioned
- flossed: boolean (true/false), or null if not mentioned
- equivalent_miles: number (override for today's equivalent miles), or null if not mentioned
- notes: any additional text the user wanted to add

For wakeup time, convert naturally: "6:20" → "06:20", "620" → "06:20", "6:20am" → "06:20", "6:20 am" → "06:20"
For flossed: "yes", "yeah", "yep", "did floss" → true; "no", "nope", "didn't" → false
For meals: "1 unhealthy meal", "had pizza" → 1; "no bad meals", "0 unhealthy" → 0

Return ONLY valid JSON, no markdown, no explanation.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  try {
    const parsed = JSON.parse(content.text.trim())
    return parsed as ParsedSMSData
  } catch {
    // If parsing fails, return empty object (no updates)
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
