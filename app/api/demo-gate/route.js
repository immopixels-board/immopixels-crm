import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  const gatePw = process.env.DEMO_GATE_PASSWORD
  if (!gatePw) return NextResponse.json({ ok: false, error: 'gate disabled' }, { status: 400 })
  let body = {}
  try { body = await req.json() } catch {}
  if ((body.password || '') !== gatePw) return NextResponse.json({ ok: false, error: 'falsches Passwort' }, { status: 401 })
  const res = NextResponse.json({ ok: true })
  res.cookies.set('demo_gate', gatePw, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
  return res
}
