import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 15

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

// GET ?origin=...&destination=... → Directions polyline a stílusozott Static Maps térképhez
const cache = new Map() // route-szintű memóriacache (meleg lambda)
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const origin = (searchParams.get('origin') || '').slice(0, 200)
  const destination = (searchParams.get('destination') || '').slice(0, 200)
  if (!origin || !destination) return NextResponse.json({ ok: false, error: 'origin/destination fehlt' }, { status: 400, headers: CORS })
  const key = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return NextResponse.json({ ok: false, error: 'kein Maps-Key' }, { status: 500, headers: CORS })
  const ck = origin + '→' + destination
  if (cache.has(ck)) return NextResponse.json(cache.get(ck), { headers: CORS })
  try {
    const u = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving&language=de&key=${key}`
    const r = await fetch(u)
    const j = await r.json()
    const route = j.routes?.[0]
    if (j.status !== 'OK' || !route) return NextResponse.json({ ok: false, error: j.error_message || j.status || 'keine Route' }, { status: 502, headers: CORS })
    const leg = route.legs?.[0]
    const out = {
      ok: true,
      polyline: route.overview_polyline?.points || null,
      km: leg ? Math.round((leg.distance?.value || 0) / 100) / 10 : null,
      min: leg ? Math.round((leg.duration?.value || 0) / 60) : null,
    }
    if (cache.size > 500) cache.clear()
    cache.set(ck, out)
    return NextResponse.json(out, { headers: CORS })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500, headers: CORS })
  }
}
