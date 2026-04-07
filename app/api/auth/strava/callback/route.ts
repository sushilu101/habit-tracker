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

  // Base URL for redirects: prefer APP_URL env var over request.url so it
  // works correctly behind Vercel's edge network.
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin

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

    return NextResponse.redirect(new URL('/?strava_connected=true', appBase))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Strava callback error:', msg)
    // Surface a sanitised version of the error so it's visible in the UI
    const code = msg.includes('401') ? 'unauthorized'
      : msg.includes('400') ? 'bad_request'
      : 'token_exchange_failed'
    return NextResponse.redirect(new URL(`/?strava_error=${code}`, appBase))
  }
}
