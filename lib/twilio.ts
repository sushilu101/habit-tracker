import twilio from 'twilio'
import { GOALS } from './goals'

let _client: ReturnType<typeof twilio> | null = null

function getClient() {
  if (!_client) {
    _client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )
  }
  return _client
}

export async function sendSMS(body: string, to?: string): Promise<void> {
  const client = getClient()
  await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: to ?? process.env.MY_PHONE_NUMBER!,
  })
}

// Validate that a request came from Twilio
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    params
  )
}

// Format wakeup time for display
export function formatWakeupTime(time: string | null): string {
  if (!time) return 'unknown'
  const [hour, minute] = time.split(':').map(Number)
  const period = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${String(minute).padStart(2, '0')}${period}`
}

// Build daily summary message
export function buildDailySummaryMessage(data: {
  date: string
  equivalentMiles: number | null
  wakeupTime: string | null
  weeklyUnhealthyMeals: number | null
  flossed: boolean | null
  stravaConfirmed: boolean
}): string {
  const miles =
    data.equivalentMiles !== null
      ? `${data.equivalentMiles.toFixed(1)} equiv. miles${data.stravaConfirmed ? '' : ' (from Strava — correct?)'}`
      : 'no activity logged'

  const wakeup = data.wakeupTime ? formatWakeupTime(data.wakeupTime) : 'unknown'
  const meals = data.weeklyUnhealthyMeals !== null ? `${data.weeklyUnhealthyMeals} so far` : 'TBD'
  const flossed = data.flossed === null ? 'TBD' : data.flossed ? 'yes' : 'no'

  return [
    `Hi! Daily habit check-in for ${data.date}:`,
    `🏃 Equiv miles: ${miles}`,
    `⏰ Wakeup: ${wakeup}`,
    `🍔 Unhealthy meals this week: ${meals}`,
    `🦷 Flossed tonight: ${flossed}`,
    '',
    'Reply with any corrections or missing info, e.g. "woke up at 6:20, no unhealthy meals, yes flossed"',
  ].join('\n')
}

// Build weekly summary message
export function buildWeeklySummaryMessage(data: {
  weekStart: string
  weekEnd: string
  totalMiles: number
  wakeupSuccessDays: number
  totalDaysTracked: number
  totalUnhealthyMeals: number
  flossedDays: number
}): string {
  const milesGoal = data.totalMiles >= GOALS.milesPerWeek
  const mealsGoal = data.totalUnhealthyMeals <= GOALS.maxUnhealthyMealsPerWeek
  const wakeupGoal = data.wakeupSuccessDays >= GOALS.earlyWakeupDaysPerWeek
  const flossGoal = data.flossedDays >= GOALS.flossNightsPerWeek

  return [
    `📊 Weekly Summary (${data.weekStart} – ${data.weekEnd}):`,
    '',
    `🏃 Miles: ${data.totalMiles.toFixed(1)}/${GOALS.milesPerWeek} equiv. miles ${milesGoal ? '✅' : '❌'}`,
    `⏰ Early wakeups: ${data.wakeupSuccessDays}/${GOALS.earlyWakeupDaysPerWeek} days before 6:30am ${wakeupGoal ? '✅' : '❌'}`,
    `🍔 Unhealthy meals: ${data.totalUnhealthyMeals}/${GOALS.maxUnhealthyMealsPerWeek} max ${mealsGoal ? '✅' : '❌'}`,
    `🦷 Nights flossed: ${data.flossedDays}/${GOALS.flossNightsPerWeek} nights ${flossGoal ? '✅' : '❌'}`,
  ].join('\n')
}
