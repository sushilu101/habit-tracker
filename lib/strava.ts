import { createServerClient } from './supabase'
import type { StravaActivity } from './types'

const STRAVA_API_BASE = 'https://www.strava.com/api/v3'
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'

export function getStravaAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI!,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Strava token exchange failed: ${await res.text()}`)
  return res.json()
}

export async function getValidAccessToken(): Promise<string | null> {
  const db = createServerClient()
  const { data: tokens } = await db
    .from('strava_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!tokens) return null

  const now = Math.floor(Date.now() / 1000)
  if (tokens.expires_at > now + 300) {
    return tokens.access_token
  }

  // Refresh the token
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  })

  if (!res.ok) return null

  const refreshed = await res.json()
  await db.from('strava_tokens').upsert({
    athlete_id: tokens.athlete_id,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: refreshed.expires_at,
  })

  return refreshed.access_token
}

export async function fetchStravaActivities(
  accessToken: string,
  afterDate: Date
): Promise<StravaActivity[]> {
  const after = Math.floor(afterDate.getTime() / 1000)
  const res = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?after=${after}&per_page=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${await res.text()}`)
  return res.json()
}

// Calculate equivalent miles from a Strava activity
// Runs: 1:1, Bikes: 4:1 (4 bike miles = 1 equivalent run mile)
export function calcEquivalentMiles(activity: StravaActivity): {
  runMiles: number
  bikeMiles: number
  equivMiles: number
} {
  const metersToMiles = (m: number) => m / 1609.344
  const distanceMiles = metersToMiles(activity.distance)

  const isRun = ['Run', 'TrailRun', 'VirtualRun'].includes(activity.sport_type)
  const isBike = ['Ride', 'VirtualRide', 'EBikeRide', 'MountainBikeRide'].includes(
    activity.sport_type
  )

  if (isRun) {
    return { runMiles: distanceMiles, bikeMiles: 0, equivMiles: distanceMiles }
  } else if (isBike) {
    return { runMiles: 0, bikeMiles: distanceMiles, equivMiles: distanceMiles / 4 }
  }
  return { runMiles: 0, bikeMiles: 0, equivMiles: 0 }
}

// Sync Strava activities into habit_entries for the given date range
export async function syncStravaActivities(daysBack = 30): Promise<{
  synced: number
  errors: string[]
}> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) return { synced: 0, errors: ['No Strava token found'] }

  const afterDate = new Date()
  afterDate.setDate(afterDate.getDate() - daysBack)

  const activities = await fetchStravaActivities(accessToken, afterDate)
  const db = createServerClient()

  // Group activities by date (using PT timezone offset)
  const byDate: Record<string, { runMiles: number; bikeMiles: number; equivMiles: number }> = {}

  for (const activity of activities) {
    const { runMiles, bikeMiles, equivMiles } = calcEquivalentMiles(activity)
    if (equivMiles === 0) continue

    // Convert to PT date
    const actDate = new Date(activity.start_date)
    const ptDate = new Date(actDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
    const dateStr = ptDate.toISOString().split('T')[0]

    if (!byDate[dateStr]) {
      byDate[dateStr] = { runMiles: 0, bikeMiles: 0, equivMiles: 0 }
    }
    byDate[dateStr].runMiles += runMiles
    byDate[dateStr].bikeMiles += bikeMiles
    byDate[dateStr].equivMiles += equivMiles
  }

  let synced = 0
  const errors: string[] = []

  for (const [dateStr, miles] of Object.entries(byDate)) {
    const { error } = await db.from('habit_entries').upsert(
      {
        date: dateStr,
        equivalent_miles: Math.round(miles.equivMiles * 100) / 100,
        raw_run_miles: Math.round(miles.runMiles * 100) / 100,
        raw_bike_miles: Math.round(miles.bikeMiles * 100) / 100,
        strava_synced: true,
      },
      { onConflict: 'date', ignoreDuplicates: false }
    )
    if (error) errors.push(`${dateStr}: ${error.message}`)
    else synced++
  }

  return { synced, errors }
}
