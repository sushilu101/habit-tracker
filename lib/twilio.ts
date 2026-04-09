import twilio from 'twilio'
import { GOALS } from './goals'

let _client: ReturnType<typeof twilio> | null = null

function getClient() {
  if (!_client) {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    if (!sid || !token) {
      throw new Error('Missing required env vars: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set')
    }
    _client = twilio(sid, token)
  }
  return _client
}

export async function sendSMS(body: string, to?: string): Promise<void> {
  const from = process.env.TWILIO_PHONE_NUMBER
  const toNumber = to ?? process.env.MY_PHONE_NUMBER
  if (!from) throw new Error('Missing required env var: TWILIO_PHONE_NUMBER must be set')
  if (!toNumber) throw new Error('Missing required env var: MY_PHONE_NUMBER must be set')
  const client = getClient()
  await client.messages.create({ body, from, to: toNumber })
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

// Format YYYY-MM-DD as M/D/YY
function formatDateMDYY(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return `${month}/${day}/${String(year).slice(2)}`
}

// Build daily summary message
export function buildDailySummaryMessage(data: {
  date: string
  equivalentMiles: number | null
  wakeupTime: string | null
  todayUnhealthyMeals: number | null
  flossed: boolean | null
}): string {
  const miles = data.equivalentMiles !== null ? data.equivalentMiles.toFixed(1) : '—'
  const wakeup = data.wakeupTime ? formatWakeupTime(data.wakeupTime) : 'TBD'
  const meals = data.todayUnhealthyMeals !== null ? String(data.todayUnhealthyMeals) : 'TBD'
  const flossed = data.flossed === null ? 'TBD' : data.flossed ? 'Yes' : 'No'

  return [
    `Daily habit check-in for ${formatDateMDYY(data.date)}`,
    `Miles: ${miles}`,
    `Wakeup: ${wakeup}`,
    `Unhealthy meals: ${meals}`,
    `Flossed: ${flossed}`,
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
