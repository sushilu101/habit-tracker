export interface HabitEntry {
  id: string
  date: string // ISO date string YYYY-MM-DD
  equivalent_miles: number | null
  raw_run_miles: number | null
  raw_bike_miles: number | null
  strava_synced: boolean
  wakeup_time: string | null // HH:MM format
  unhealthy_meals: number | null
  flossed: boolean | null
  sms_confirmed: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WeekData {
  weekStart: Date // Monday of the week
  weekEnd: Date   // Sunday of the week
  days: (HabitEntry | null)[] // Mon-Sun, null if no entry
  weeklyTotals: WeeklyTotals
}

export interface WeeklyTotals {
  totalEquivalentMiles: number
  avgWakeupMinutes: number | null // minutes from midnight
  earlyWakeupDays: number         // days with wakeup before 6:30am PT
  totalUnhealthyMeals: number
  flossedDays: number
  daysWithData: number
  // Goal met flags (based on GOALS constants)
  milesGoalMet: boolean    // >= 30 mi
  wakeupGoalMet: boolean   // >= 5 early days
  mealsGoalMet: boolean    // <= 2 unhealthy meals
  flossGoalMet: boolean    // >= 5 nights
}

export interface HabitGoals {
  wakeupGoal: { hour: number; minute: number } // 6:30 AM PT
  mealsGoalPerWeek: number // 2
}

export type HabitStatus = 'achieved' | 'missed' | 'no-data'

export interface DayHabitStatus {
  miles: HabitStatus
  wakeup: HabitStatus
  meals: HabitStatus
  flossed: HabitStatus
}

export interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  distance: number // meters
  start_date: string
  moving_time: number
}

export interface ParsedSMSData {
  wakeup_time?: string | null // HH:MM
  unhealthy_meals?: number | null
  flossed?: boolean | null
  equivalent_miles?: number | null
  notes?: string
}

export interface StatsData {
  totalMiles: number
  avgMilesPerWeek: number
  wakeupSuccessRate: number // percentage
  avgMealsPerWeek: number
  flossSuccessRate: number // percentage
  currentStreak: {
    miles: number
    wakeup: number
    flossed: number
  }
  recentWeeks: WeekData[]
}
