// Client-safe utility functions — no server imports
import type { HabitEntry, HabitStatus, DayHabitStatus, WeeklyTotals, WeekData } from './types'
import { GOALS, isEarlyWakeup } from './goals'
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns'

export function getWeekStartUtil(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function getWeekEndUtil(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 1 })
}

export function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const period = h >= 12 ? 'pm' : 'am'
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayH}:${String(m).padStart(2, '0')}${period}`
}

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

  // Daily meals: 0 = clean day (achieved), >0 = missed
  const mealsStatus: HabitStatus =
    entry.unhealthy_meals === null
      ? 'no-data'
      : entry.unhealthy_meals === 0
      ? 'achieved'
      : 'missed'

  const flossedStatus: HabitStatus =
    entry.flossed === null ? 'no-data' : entry.flossed ? 'achieved' : 'missed'

  return { miles: milesStatus, wakeup: wakeupStatus, meals: mealsStatus, flossed: flossedStatus }
}

export function calcWeeklyTotals(days: (HabitEntry | null)[]): WeeklyTotals {
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

export function buildWeekDataUtil(entries: HabitEntry[], weekStart: Date): WeekData {
  const weekEnd = getWeekEndUtil(weekStart)
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const entryMap = new Map(entries.map(e => [e.date, e]))
  const dayDates = days.map(day => format(day, 'yyyy-MM-dd'))
  const dayEntries = dayDates.map(dateStr => entryMap.get(dateStr) ?? null)

  return {
    weekStart,
    weekEnd,
    days: dayEntries,
    dayDates,
    weeklyTotals: calcWeeklyTotals(dayEntries),
  }
}
