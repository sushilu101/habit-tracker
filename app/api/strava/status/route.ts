import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const db = createServerClient()
    const { data } = await db
      .from('strava_tokens')
      .select('athlete_id, expires_at')
      .limit(1)
      .single()

    if (!data) return NextResponse.json({ connected: false })

    const now = Math.floor(Date.now() / 1000)
    return NextResponse.json({
      connected: true,
      expired: data.expires_at < now,
      athleteId: data.athlete_id,
    })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
