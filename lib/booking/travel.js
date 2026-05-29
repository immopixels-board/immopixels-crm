// ════════════════════════════════════════════════════════════════════
// lib/booking/travel.js
// Google Routes API (Compute Routes) + hibrid PLZ-cache (30 napos lejárat)
// Csak FOGLALÁSKOR hívódik, böngészéskor SOHA → Google költség ~0
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const CACHE_TTL_DAYS = 30
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes'

// német irányítószó kinyerése címből ("68159 Mannheim, ..." → "68159")
export function extractPlz(address) {
  const m = (address || '').match(/\b(\d{5})\b/)
  return m ? m[1] : null
}

// ─── Cache olvasás ──────────────────────────────────────────────────
async function readCache(originPlz, destPlz) {
  const { data } = await supabase
    .from('booking_travel_cache')
    .select('minutes, fetched_at')
    .eq('origin_plz', originPlz)
    .eq('dest_plz', destPlz)
    .maybeSingle()
  if (!data) return null
  const ageDays = (Date.now() - new Date(data.fetched_at).getTime()) / 86400000
  if (ageDays > CACHE_TTL_DAYS) return null // lejárt → friss hívás
  return data.minutes
}

async function writeCache(originPlz, destPlz, minutes) {
  await supabase
    .from('booking_travel_cache')
    .upsert(
      { origin_plz: originPlz, dest_plz: destPlz, minutes, fetched_at: new Date().toISOString() },
      { onConflict: 'origin_plz,dest_plz' }
    )
}

// ─── Google Routes API hívás ────────────────────────────────────────
// origin/dest lehet {lat,lng} VAGY {address}. departureTime: a shooting napja+ideje
async function fetchRoute(origin, dest, departureTime) {
  const body = {
    origin: toWaypoint(origin),
    destination: toWaypoint(dest),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE', // forgalom-becslés a jövőre
    ...(departureTime ? { departureTime } : {}),
  }
  const res = await fetch(ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_ROUTES_API_KEY,
      'X-Goog-FieldMask': 'routes.duration', // csak az időtartam → olcsóbb SKU
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.warn('Routes API error', res.status, await res.text())
    return null
  }
  const json = await res.json()
  const dur = json?.routes?.[0]?.duration // "1234s"
  if (!dur) return null
  return Math.ceil(parseInt(dur, 10) / 60) // mp → perc, felfelé
}

function toWaypoint(p) {
  if (p.lat != null && p.lng != null) {
    return { location: { latLng: { latitude: p.lat, longitude: p.lng } } }
  }
  return { address: p.address }
}

// ─── Fő belépési pont ───────────────────────────────────────────────
// Visszaadja az autós útidőt percben. Cache → ha lejárt/nincs → Google → cache-be ír.
// futureDepartureISO: opcionális, a shooting tervezett kezdete (jövőbeli forgalom)
export async function getTravelMinutes(origin, dest, futureDepartureISO = null) {
  const oPlz = extractPlz(origin.address)
  const dPlz = extractPlz(dest.address)

  // PLZ-szintű cache (csak ha mindkét PLZ ismert)
  if (oPlz && dPlz) {
    if (oPlz === dPlz) {
      // azonos irányítószám → városon belül, fix kis érték (nincs Google hívás)
      return 12
    }
    const cached = await readCache(oPlz, dPlz)
    if (cached != null) return cached
  }

  // friss Google hívás
  const minutes = await fetchRoute(origin, dest, futureDepartureISO)
  if (minutes == null) return null // hiba → a hívó dönt (fallback statikus buffer)

  if (oPlz && dPlz) await writeCache(oPlz, dPlz, minutes)
  return minutes
}
