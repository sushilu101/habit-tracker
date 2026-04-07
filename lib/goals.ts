// Single source of truth for all habit goals
export const GOALS = {
  milesPerWeek: 30,
  earlyWakeupDaysPerWeek: 5,   // days/week with wakeup before 6:30am
  maxUnhealthyMealsPerWeek: 2,
  flossNightsPerWeek: 5,
  wakeupCutoffHour: 6,
  wakeupCutoffMinute: 30,
} as const

export function isEarlyWakeup(wakeupTime: string): boolean {
  const [h, m] = wakeupTime.split(':').map(Number)
  return h * 60 + m <= GOALS.wakeupCutoffHour * 60 + GOALS.wakeupCutoffMinute
}
