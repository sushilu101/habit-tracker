import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { buildWeekData, getWeekStart } from '@/lib/habits'
import { format, subWeeks, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const PT_TZ = 'America/Los_Angeles'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const weeksParam = parseInt(searchParams.get('weeks') ?? '8')
  const weeks = Math.min(Math.max(weeksParam, 1), 52)

  try {
    const nowPT = toZonedTime(new Date(), PT_TZ)
    const currentWeekStart = getWeekStart(nowPT)

    // Fetch enough history
    const fromDate = format(subWeeks(currentWeekStart, weeks - 1), 'yyyy-MM-dd')
    const toDate = format(nowPT, 'yyyy-MM-dd')

    const db = createServerClient()
    const { data: entries, error } = await db
      .from('habit_entries')
      .select('*')
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true })

    if (error) throw error

    // Build week data for each week
    const weekDataList = []
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = getWeekStart(subWeeks(currentWeekStart, i))
      const weekData = buildWeekData(entries ?? [], weekStart)
      weekDataList.push(weekData)
    }

    return NextResponse.json({
      weeks: weekDataList,
      entries: entries ?? [],
    })
  } catch (err) {
    console.error('Habits GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, ...updates } = body

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }

    // Validate allowed fields
    const allowedFields = [
      'equivalent_miles', 'raw_run_miles', 'raw_bike_miles',
      'wakeup_time', 'unhealthy_meals', 'flossed', 'notes', 'strava_synced'
    ]
    const filtered: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in updates) filtered[field] = updates[field]
    }

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const db = createServerClient()
    const { data, error } = await db
      .from('habit_entries')
      .upsert({ date, ...filtered }, { onConflict: 'date' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Habits PATCH error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
