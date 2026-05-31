import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// POST { id, ...fields } → frissíti a szolgáltatás engedélyezett mezőit
// engedélyezett: name, description, duration_min, buffer_min, active, image_url
export async function POST(req) {
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error:'invalid json' }, { status:400 }) }
  const { id } = body
  if (!id) return NextResponse.json({ error:'id required' }, { status:400 })
  if (body.image_url && body.image_url.length > 1500000) return NextResponse.json({ error:'image too large (max ~1MB)' }, { status:400 })

  const patch = {}
  if ('name' in body) patch.name = body.name
  if ('description' in body) patch.description = body.description || null
  if ('duration_min' in body) patch.duration_min = parseInt(body.duration_min, 10) || 0
  if ('buffer_min' in body) patch.buffer_min = parseInt(body.buffer_min, 10) || 0
  if ('active' in body) patch.active = !!body.active
  if ('image_url' in body) patch.image_url = body.image_url || null

  if (!Object.keys(patch).length) return NextResponse.json({ error:'no fields' }, { status:400 })

  const { error } = await sb().from('booking_services').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status:500 })
  return NextResponse.json({ ok:true })
}
