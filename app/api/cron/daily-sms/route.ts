import { NextRequest, NextResponse } from 'next/server'
import { sendSMS, buildDailySummaryMessage } from '@/lib/twilio'
import { getOrCreateEntry, getWeeklyMeals, getTodayPT } from '@/lib/habits'
import { syncStravaActivities } from '@/lib/strava'

// Called by Vercel Cron at 10pm PT = 6am UTC next day (or use vercel.json cron)
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Sync Strava first (last 2 days to catch today's activities)
    await syncStravaActivities(2).catch(err =>
      console.error('Strava sync failed during daily SMS:', err)
    )

    const date = getTodayPT()
    const entry = await getOrCreateEntry(date)
    const weeklyMeals = await getWeeklyMeals(date)

    const message = buildDailySummaryMessage({
      date,
      equivalentMiles: entry.equivalent_miles,
      wakeupTime: entry.wakeup_time,
      weeklyUnhealthyMeals: weeklyMeals,
      flossed: entry.flossed,
      stravaConfirmed: entry.sms_confirmed,
    })

    await sendSMS(message)

    return NextResponse.json({ success: true, date, message })
  } catch (err) {
    console.error('Daily SMS cron error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
