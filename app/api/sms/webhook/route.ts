import { NextRequest, NextResponse } from 'next/server'
import { parseSMSReply, generateSMSAck } from '@/lib/claude'
import { sendSMS, sendWhatsApp } from '@/lib/twilio'
import { getOrCreateEntry, updateEntry, getTodayPT } from '@/lib/habits'
import { createServerClient } from '@/lib/supabase'

// Twilio sends form-encoded POST requests
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const body = formData.get('Body') as string
  const from = formData.get('From') as string

  if (!body || !from) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  // Only accept messages from the configured phone number.
  // Twilio prefixes WhatsApp numbers with "whatsapp:" so strip it before comparing.
  const myPhone = process.env.MY_PHONE_NUMBER
  const fromNormalized = from.replace(/^whatsapp:/, '')
  const isWhatsApp = from.startsWith('whatsapp:')
  if (myPhone && fromNormalized !== myPhone) {
    console.warn(`Ignoring message from unknown number: ${from}`)
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  const date = getTodayPT()

  try {
    // Get current entry for today
    const entry = await getOrCreateEntry(date)

    // Log inbound SMS
    const db = createServerClient()
    await db.from('sms_log').insert({
      direction: 'inbound',
      body,
      from_number: from,
      to_number: process.env.TWILIO_PHONE_NUMBER,
      related_date: date,
    })

    // Parse the message with Claude
    const parsed = await parseSMSReply(body, date, {
      equivalent_miles: entry.equivalent_miles,
      wakeup_time: entry.wakeup_time,
      unhealthy_meals: entry.unhealthy_meals,
      flossed: entry.flossed,
    })

    // Build updates object
    const updates: Record<string, unknown> = { sms_confirmed: true }
    if (parsed.wakeup_time !== undefined && parsed.wakeup_time !== null) {
      updates.wakeup_time = parsed.wakeup_time
    }
    if (parsed.unhealthy_meals !== undefined && parsed.unhealthy_meals !== null) {
      updates.unhealthy_meals = parsed.unhealthy_meals
    }
    if (parsed.flossed !== undefined && parsed.flossed !== null) {
      updates.flossed = parsed.flossed
    }
    if (parsed.equivalent_miles !== undefined && parsed.equivalent_miles !== null) {
      updates.equivalent_miles = parsed.equivalent_miles
      updates.strava_synced = false // manual override
    }
    if (parsed.notes) updates.notes = parsed.notes

    // Update the entry
    await updateEntry(date, updates as Partial<typeof entry>)

    // Generate and send acknowledgment via the same channel the reply came in on
    const ackMessage = await generateSMSAck(parsed, date)
    if (isWhatsApp) {
      await sendWhatsApp(ackMessage)
    } else {
      await sendSMS(ackMessage)
    }

    // Log outbound message
    await db.from('sms_log').insert({
      direction: 'outbound',
      body: ackMessage,
      from_number: isWhatsApp ? 'whatsapp:+14155238886' : process.env.TWILIO_PHONE_NUMBER,
      to_number: from,
      related_date: date,
      parsed_data: parsed,
    })
  } catch (err) {
    console.error('SMS webhook error:', err)
    const errMsg = 'Sorry, there was an error processing your message. Please try again.'
    if (isWhatsApp) {
      await sendWhatsApp(errMsg).catch(() => {})
    } else {
      await sendSMS(errMsg).catch(() => {})
    }
  }

  // Twilio expects TwiML response (empty = no auto-reply)
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  })
}
