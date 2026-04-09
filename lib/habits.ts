import { createServerClient } from './supabase'
import type { HabitEntry, WeekData, WeeklyTotals, HabitStatus, DayHabitStatus } from './types'
import { GOALS, isEarlyWakeup } from './goals'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const PT_TIMEZONE = 'America/Los_Angeles'

export function getPTDate(date: Date = new Date()): Date {
  return toZonedTime(date, PT_TIMEZONE)
}

export function getTodayPT(): string {
  return format(getPTDate(), 'yyyy-MM-dd')
}

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 }) // Monday
}

export function getWeekEnd(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 1 }) // Sunday
}

export async function getHabitEntries(
  fromDate: string,
  toDate: string
): Promise<HabitEntry[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from('habit_entries')
    .select('*')
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getOrCreateEntry(date: string): Promise<HabitEntry> {
  const db = createServerClient()
  const { data, error } = await db
    .from('habit_entries')
    .select('*')
    .eq('date', date)
    .single()

  if (data) return data
  if (error && error.code !== 'PGRST116') throw error

  // Create a new entry
  const { data: newEntry, error: insertError } = await db
    .from('habit_entries')
    .insert({ date })
    .select()
    .single()

  if (insertError) throw insertError
  return newEntry
}

export async function updateEntry(
  date: string,
  updates: Partial<HabitEntry>
): Promise<HabitEntry> {
  const db = createServerClient()
  const { data, error } = await db
    .from('habit_entries')
    .upsert({ date, ...updates }, { onConflict: 'date' })
    .select()
    .single()

  if (error) throw error
  return data
}

// Get weekly unhealthy meals total (Mon-Sun of the week containing 'date')
export async function getWeeklyMeals(date: string): Promise<number> {
  const d = parseISO(date)
  const weekStart = format(getWeekStart(d), 'yyyy-MM-dd')
  const weekEnd = format(getWeekEnd(d), 'yyyy-MM-dd')

  const db = createServerClient()
  const { data } = await db
    .from('habit_entries')
    .select('unhealthy_meals')
    .gte('date', weekStart)
    .lte('date', weekEnd)

  return (data ?? []).reduce((sum, e) => sum + (e.unhealthy_meals ?? 0), 0)
}

// Build WeekData objects for the calendar view
export function buildWeekData(entries: HabitEntry[], weekStart: Date): WeekData {
  const weekEnd = getWeekEnd(weekStart)
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const entryMap = new Map(entries.map(e => [e.date, e]))

  const dayDates = days.map(day => format(day, 'yyyy-MM-dd'))
  const dayEntries = dayDates.map(dateStr => entryMap.get(dateStr) ?? null)

  const weeklyTotals = calcWeeklyTotals(dayEntries)

  return {
    weekStart,
    weekEnd,
    days: dayEntries,
    dayDates,
    weeklyTotals,
  }
}

function calcWeeklyTotals(days: (HabitEntry | null)[]): WeeklyTotals {
  let totalEquivalentMiles = 0
  let wakeupMinutesSum = 0
  let wakeupDays = 0
  let earlyWakeupDays = 0
  let totalUnhealthyMeals = 0
  let flossedDays = 0
  let daysWithData = 0

  for (const day of days) {
    if (!day) continue
    daysWithData++

    totalEquivalentMiles += day.equivalent_miles ?? 0
    totalUnhealthyMeals += day.unhealthy_meals ?? 0

    if (day.wakeup_time) {
      const [h, m] = day.wakeup_time.split(':').map(Number)
      wakeupMinutesSum += h * 60 + m
      wakeupDays++
      if (isEarlyWakeup(day.wakeup_time)) earlyWakeupDays++
    }

    if (day.flossed === true) flossedDays++
  }

  const roundedMiles = Math.round(totalEquivalentMiles * 10) / 10

  return {
    totalEquivalentMiles: roundedMiles,
    avgWakeupMinutes: wakeupDays > 0 ? Math.round(wakeupMinutesSum / wakeupDays) : null,
    earlyWakeupDays,
    totalUnhealthyMeals,
    flossedDays,
    daysWithData,
    milesGoalMet: roundedMiles >= GOALS.milesPerWeek,
    wakeupGoalMet: earlyWakeupDays >= GOALS.earlyWakeupDaysPerWeek,
    mealsGoalMet: totalUnhealthyMeals <= GOALS.maxUnhealthyMealsPerWeek,
    flossGoalMet: flossedDays >= GOALS.flossNightsPerWeek,
  }
}

// Determine goal status for each habit on a given day
export function getDayHabitStatus(entry: HabitEntry | null): DayHabitStatus {
  if (!entry) {
    return { miles: 'no-data', wakeup: 'no-data', meals: 'no-data', flossed: 'no-data' }
  }

  const milesStatus: HabitStatus =
    entry.equivalent_miles === null ? 'no-data' : entry.equivalent_miles > 0 ? 'achieved' : 'no-data'

  let wakeupStatus: HabitStatus = 'no-data'
  if (entry.wakeup_time) {
    wakeupStatus = isEarlyWakeup(entry.wakeup_time) ? 'achieved' : 'missed'
  }

  const mealsStatus: HabitStatus =
    entry.unhealthy_meals === null ? 'no-data' : entry.unhealthy_meals === 0 ? 'achieved' : 'no-data'

  const flossedStatus: HabitStatus =
    entry.flossed === null ? 'no-data' : entry.flossed ? 'achieved' : 'missed'

  return {
    miles: milesStatus,
    wakeup: wakeupStatus,
    meals: mealsStatus,
    flossed: flossedStatus,
  }
}

export function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const period = h >= 12 ? 'pm' : 'am'
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayH}:${String(m).padStart(2, '0')}${period}`
}
