import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'belege'
function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) }
function safe(name) { return String(name || 'datei').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) }

export async function POST(req) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ ok: false, error: 'service key fehlt' }, { status: 500 })
  let body
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 }) }
  const { data, mediaType, name, folder } = body || {}
  if (!data) return NextResponse.json({ ok: false, error: 'data required' }, { status: 400 })

  const sb = db()
  // privát bucket — létrehozás ha hiányzik (már létezőnél hibát elnyeljük)
  try { await sb.storage.createBucket(BUCKET, { public: false }) } catch (e) {}

  const buf = Buffer.from(data, 'base64')
  const dir = (folder === 'buchhaltung') ? 'buchhaltung' : 'eingang'
  const path = `${dir}/${Date.now()}_${safe(name)}`
  const { error } = await sb.storage.from(BUCKET).upload(path, buf, { contentType: mediaType || 'application/octet-stream', upsert: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, path, url: `/api/beleg-file?path=${encodeURIComponent(path)}` })
}
