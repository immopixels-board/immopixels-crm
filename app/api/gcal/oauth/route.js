// GET /api/gcal/oauth?staff_id=xxx  → redirect to Google
// GET /api/gcal/oauth?code=xxx&state=xxx  → exchange code, save tokens
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const SCOPE = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file'

function getRedirectUri(req) {
  const host = req.headers.get('host')
  const proto = host?.includes('localhost') ? 'http' : 'https'
  return `${proto}://${host}/api/gcal/oauth`
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // staff_id
  const staffId = searchParams.get('staff_id')
  const error = searchParams.get('error')

  // Error from Google
  if (error) {
    return new NextResponse(`<script>window.opener?.postMessage({type:'gcal_error',error:'${error}'},location.origin);window.close()</script>`, 
      { headers: {'Content-Type':'text/html'} })
  }

  // Step 1: Redirect to Google
  if (staffId && !code) {
    const redirectUri = getRedirectUri(req)
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', CLIENT_ID)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', SCOPE)
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent') // force refresh token
    url.searchParams.set('state', staffId)
    return NextResponse.redirect(url.toString())
  }

  // Step 2: Exchange code for tokens
  if (code && state) {
    const redirectUri = getRedirectUri(req)
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      })
    })
    const tokens = await tokenRes.json()

    if (tokens.access_token) {
      const exp = new Date(Date.now() + (tokens.expires_in || 3600) * 1000)
      await supabase.from('gcal_tokens').upsert({
        staff_id: state,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: exp.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'staff_id' })
    }

    return new NextResponse(
      `<html><body><script>
        if(window.opener){
          window.opener.postMessage({type:'gcal_token',token:'${tokens.access_token}'},location.origin)
        }
        window.close()
      </script><p style="font-family:Arial;text-align:center;padding:40px">✓ Google Calendar verbunden. Fenster schließt sich...</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  return NextResponse.json({ error: 'invalid request' }, { status: 400 })
}
