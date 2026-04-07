import { NextResponse } from 'next/server'
import { getStravaAuthUrl } from '@/lib/strava'

export async function GET() {
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Validate required env vars before attempting the redirect.
  // If they're missing the URL params become the literal string "undefined",
  // Strava immediately rejects the request, and the error redirect back makes
  // it appear as if the button never left the page.
  if (!process.env.STRAVA_CLIENT_ID) {
    console.error('STRAVA_CLIENT_ID is not set')
    return NextResponse.redirect(new URL('/?strava_error=missing_client_id', appBase))
  }
  if (!process.env.STRAVA_CLIENT_SECRET) {
    console.error('STRAVA_CLIENT_SECRET is not set')
    return NextResponse.redirect(new URL('/?strava_error=missing_client_secret', appBase))
  }

  try {
    const authUrl = getStravaAuthUrl()
    // Use a 302 (temporary) redirect so browsers always re-request this route
    // rather than caching the destination.
    return NextResponse.redirect(authUrl, 302)
  } catch (err) {
    console.error('Failed to build Strava auth URL:', err)
    return NextResponse.redirect(new URL('/?strava_error=config_error', appBase))
  }
}
