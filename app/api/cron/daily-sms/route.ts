import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsApp, buildDailySummaryMessage } from '@/lib/twilio'
import { getOrCreateEntry, getTodayPT } from '@/lib/habits'
import { syncStravaActivities } from '@/lib/strava'

// Called by Vercel Cron at 10pm PT = 5am UTC (PDT/UTC-7) or 6am UTC (PST/UTC-8)
export async function GET(request: NextRequest) {
  // Verify cron secret — CRON_SECRET must be set in Vercel project settings
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('CRON_SECRET env var is not set — cron authentication will always fail')
    return NextResponse.json({ error: 'Server misconfigured: CRON_SECRET not set' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Sync Strava first (last 2 days to catch today's activities)
    await syncStravaActivities(2).catch(err =>
      console.error('Strava sync failed during daily SMS:', err)
    )

    const date = getTodayPT()
    const entry = await getOrCreateEntry(date)

    const message = buildDailySummaryMessage({
      date,
      equivalentMiles: entry.equivalent_miles,
      wakeupTime: entry.wakeup_time,
      todayUnhealthyMeals: entry.unhealthy_meals,
      flossed: entry.flossed,
    })

    await sendWhatsApp(message)

    return NextResponse.json({ success: true, date, message })
  } catch (err) {
    console.error('Daily SMS cron error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
