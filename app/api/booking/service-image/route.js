import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// POST { id, image_url(base64 data URI) } → frissíti a szolgáltatás képét
export async function POST(req) {
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error:'invalid json' }, { status:400 }) }
  const { id, image_url } = body
  if (!id) return NextResponse.json({ error:'id required' }, { status:400 })
  if (image_url && image_url.length > 1500000) return NextResponse.json({ error:'image too large (max ~1MB)' }, { status:400 })

  const { error } = await sb().from('booking_services').update({ image_url: image_url || null }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status:500 })
  return NextResponse.json({ ok:true })
}
