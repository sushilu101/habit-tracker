import { NextRequest, NextResponse } from 'next/server'
import { syncStravaActivities } from '@/lib/strava'

export async function POST(request: NextRequest) {
  // Verify auth - simple token check
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const daysBack = body.daysBack ?? 30

    const result = await syncStravaActivities(daysBack)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Strava sync error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const result = await syncStravaActivities(7)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
