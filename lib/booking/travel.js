// ════════════════════════════════════════════════════════════════════
// lib/booking/travel.js
// Google Distance Matrix API + PLZ-cache (30 napos lejárat)
// Autós útidő percben két cím között. PLZ-párokra cache-el → Google költség ~0
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

let _db = null
function db() {
  if (!_db) _db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  return _db
}

const CACHE_TTL_DAYS = 30
const DM_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json'

// német irányítószó kinyerése címből
export function extractPlz(address) {
  const m = (address || '').match(/\b(\d{5})\b/)
  return m ? m[1] : null
}

async function readCache(o, d) {
  const { data } = await db().from('booking_travel_cache')
    .select('minutes, fetched_at').eq('origin_plz', o).eq('dest_plz', d).maybeSingle()
  if (!data) return null
  const ageDays = (Date.now() - new Date(data.fetched_at).getTime()) / 86400000
  if (ageDays > CACHE_TTL_DAYS) return null
  return data.minutes
}

async function writeCache(o, d, minutes) {
  await db().from('booking_travel_cache')
    .upsert({ origin_plz:o, dest_plz:d, minutes, fetched_at:new Date().toISOString() }, { onConflict:'origin_plz,dest_plz' })
}

function addDE(addr) {
  if (!addr) return addr
  const low = addr.toLowerCase()
  return (low.includes('germany') || low.includes('deutschland')) ? addr : addr + ', Deutschland'
}

async function fetchDistanceMatrix(originAddr, destAddr) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_KEY
  if (!key) return null
  const url = `${DM_URL}?origins=${encodeURIComponent(addDE(originAddr))}&destinations=${encodeURIComponent(addDE(destAddr))}&mode=driving&language=de&key=${key}`
  try {
    const r = await fetch(url)
    const d = await r.json()
    const el = d.rows?.[0]?.elements?.[0]
    if (el?.status === 'OK' && el.duration?.value != null) {
      return Math.ceil(el.duration.value / 60) // mp → perc
    }
  } catch(e) { console.error('[travel] DM error', e.message) }
  return null
}

// Fő belépési pont: autós útidő percben. origin/dest = {address}
export async function getTravelMinutes(originAddr, destAddr) {
  if (!originAddr || !destAddr) return null
  const o = extractPlz(originAddr), d = extractPlz(destAddr)
  if (o && d) {
    if (o === d) return 12 // azonos PLZ → városon belül, fix kis érték
    const cached = await readCache(o, d)
    if (cached != null) return cached
  }
  const minutes = await fetchDistanceMatrix(originAddr, destAddr)
  if (minutes == null) return null
  if (o && d) await writeCache(o, d, minutes)
  return minutes
}
