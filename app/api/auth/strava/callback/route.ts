import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/strava'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/?strava_error=${error}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?strava_error=no_code', request.url))
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const db = createServerClient()

    await db.from('strava_tokens').upsert(
      {
        athlete_id: tokens.athlete.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
        scope: 'read,activity:read_all',
      },
      { onConflict: 'athlete_id' }
    )

    return NextResponse.redirect(new URL('/?strava_connected=true', request.url))
  } catch (err) {
    console.error('Strava callback error:', err)
    return NextResponse.redirect(
      new URL('/?strava_error=token_exchange_failed', request.url)
    )
  }
}
