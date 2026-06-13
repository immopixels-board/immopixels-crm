import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// GET ?staff_id=xxx → mindig FRISS access tokent ad vissza a refresh_token alapján.
// A Drive-feltöltés ezt hívja minden feltöltés előtt, hogy ne fusson lejárt tokenbe.
export async function GET(req) {
  noStore()
  const staffId = new URL(req.url).searchParams.get('staff_id')
  if (!staffId) return NextResponse.json({ ok: false, reason: 'staff_id fehlt' }, { status: 400 })
  const { data: t } = await sb().from('gcal_tokens').select('*').eq('staff_id', staffId).maybeSingle()
  if (!t?.refresh_token) return NextResponse.json({ ok: false, reason: 'not_connected' })
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: t.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    if (!data.access_token) return NextResponse.json({ ok: false, reason: data.error_description || data.error || 'refresh_failed' })
    const newExp = new Date(Date.now() + (data.expires_in || 3600) * 1000)
    await sb().from('gcal_tokens').update({ access_token: data.access_token, expires_at: newExp.toISOString(), updated_at: new Date().toISOString() }).eq('id', t.id)
    return NextResponse.json({ ok: true, access_token: data.access_token })
  } catch (e) {
    return NextResponse.json({ ok: false, reason: String(e?.message || e) }, { status: 500 })
  }
}
