import { NextRequest, NextResponse } from 'next/server'
import { sendSMS, buildWeeklySummaryMessage } from '@/lib/twilio'
import { getHabitEntries, getWeekStart, getWeekEnd } from '@/lib/habits'
import { isEarlyWakeup } from '@/lib/goals'
import { format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const PT_TZ = 'America/Los_Angeles'

// Called by Vercel Cron every Sunday at 9pm PT = 5am UTC Monday
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const nowPT = toZonedTime(new Date(), PT_TZ)
    const weekStart = getWeekStart(nowPT)
    const weekEnd = getWeekEnd(nowPT)

    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

    const entries = await getHabitEntries(weekStartStr, weekEndStr)

    let totalMiles = 0
    let wakeupSuccessDays = 0
    let totalDaysTracked = 0
    let totalUnhealthyMeals = 0
    let flossedDays = 0

    for (const entry of entries) {
      totalDaysTracked++
      totalMiles += entry.equivalent_miles ?? 0
      totalUnhealthyMeals += entry.unhealthy_meals ?? 0

      if (entry.wakeup_time && isEarlyWakeup(entry.wakeup_time)) {
        wakeupSuccessDays++
      }

      if (entry.flossed === true) flossedDays++
    }

    const message = buildWeeklySummaryMessage({
      weekStart: format(weekStart, 'MMM d'),
      weekEnd: format(weekEnd, 'MMM d'),
      totalMiles,
      wakeupSuccessDays,
      totalDaysTracked,
      totalUnhealthyMeals,
      flossedDays,
    })

    await sendSMS(message)

    return NextResponse.json({ success: true, weekStartStr, weekEndStr })
  } catch (err) {
    console.error('Weekly SMS cron error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
