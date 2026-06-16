import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'belege'
function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) }

export async function GET(req) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ ok: false, error: 'service key fehlt' }, { status: 500 })
  const path = new URL(req.url).searchParams.get('path')
  if (!path) return NextResponse.json({ ok: false, error: 'path required' }, { status: 400 })
  const sb = db()
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error || !data?.signedUrl) return NextResponse.json({ ok: false, error: error?.message || 'not found' }, { status: 404 })
  return NextResponse.redirect(data.signedUrl)
}
