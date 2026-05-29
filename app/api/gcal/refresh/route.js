import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST() {
  noStore()
  const supabase = getSupabase()
  const { data: tokens } = await supabase
    .from('gcal_tokens').select('*')
    .not('refresh_token', 'is', null)

  if (!tokens?.length) return NextResponse.json({ ok:false, reason:'no refresh tokens' })

  let refreshed = 0
  for (const t of tokens) {
    const exp = new Date(t.expires_at)
    if (exp > new Date(Date.now() + 5*60*1000)) continue // 5+ perc van még

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: t.refresh_token,
        grant_type: 'refresh_token',
      })
    })
    const data = await res.json()
    if (data.access_token) {
      const newExp = new Date(Date.now() + (data.expires_in||3600)*1000)
      await supabase.from('gcal_tokens').update({
        access_token: data.access_token,
        expires_at: newExp.toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', t.id)
      refreshed++
    }
  }
  return NextResponse.json({ ok:true, refreshed })
}
