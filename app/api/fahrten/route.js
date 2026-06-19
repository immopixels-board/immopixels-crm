import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function sb() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) }
const KEY = () => process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_KEY
const addDE = (a) => a && !/germany|deutschland/i.test(a) && !a.includes(',DE') ? a + ', Deutschland' : a
const nrm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '')

function addrFromTitle(t) {
  const s = String(t || '').replace(/^\s*\[[^\]]+\]\s*/, '').trim()
  const i = s.indexOf(' - ')
  if (i < 0) return ''
  const cand = s.slice(i + 3).trim()
  return /[\d,]/.test(cand) ? cand : ''
}
function shootAddr(c) { return (c.booking_address || c.addr || addrFromTitle(c.title) || '').trim() }

// láncolt körút: home → s1 → … → sN → home, EGY Distance Matrix hívással (≤9 megálló)
async function dayRoute(home, addrs) {
  const key = KEY()
  if (!key || !home || !addrs.length) return { km: 0, min: 0 }
  const stops = [home, ...addrs]
  if (stops.length > 10) { // ritka: túl sok megálló → szakaszonként
    let m = 0, mn = 0
    for (let i = 0; i < stops.length; i++) {
      const a = stops[i], b = stops[(i + 1) % stops.length]
      const r = await leg(a, b, key); m += r.km; mn += r.min
    }
    return { km: Math.round(m), min: Math.round(mn) }
  }
  const enc = stops.map(a => encodeURIComponent(addDE(a))).join('%7C')
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${enc}&destinations=${enc}&mode=driving&language=de&key=${key}`)
    const d = await r.json()
    const rows = d.rows || []
    let m = 0, mn = 0
    const N = stops.length
    const seq = []
    for (let i = 0; i < N; i++) seq.push(i)
    // chain: 0→1→2→…→(N-1)→0
    for (let i = 0; i < N; i++) {
      const from = i, to = (i + 1) % N
      const el = rows[from]?.elements?.[to]
      if (el?.status === 'OK') { m += (el.distance?.value || 0); mn += (el.duration?.value || 0) }
    }
    return { km: Math.round(m / 1000), min: Math.round(mn / 60) }
  } catch { return { km: 0, min: 0 } }
}
async function leg(a, b, key) {
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(addDE(a))}&destinations=${encodeURIComponent(addDE(b))}&mode=driving&language=de&key=${key}`)
    const d = await r.json(); const el = d.rows?.[0]?.elements?.[0]
    return el?.status === 'OK' ? { km: (el.distance?.value || 0) / 1000, min: (el.duration?.value || 0) / 60 } : { km: 0, min: 0 }
  } catch { return { km: 0, min: 0 } }
}

export async function GET(req) {
  const u = new URL(req.url)
  const from = u.searchParams.get('from')
  const to = u.searchParams.get('to') || from
  if (!from) return Response.json({ ok: false, reason: 'from nötig' })
  const supabase = sb()

  // fotósok (init + start-cím + szín)
  const { data: staff } = await supabase.from('staff').select('id, init, name, address, color').not('init', 'is', null)
  const byId = Object.fromEntries((staff || []).map(s => [s.id, s]))
  const homeByInit = Object.fromEntries((staff || []).map(s => [s.init, s.address || null]))

  // fotózások a tartományban
  const { data: cards } = await supabase
    .from('cards')
    .select('id, card_date, card_time, booking_address, addr, title, client_name, is_todo, card_type, card_team!inner(staff_id)')
    .gte('card_date', from).lte('card_date', to)

  // csoportosítás: (init, nap) → megállók
  const groups = {} // key init|day → [{time, addr, name}]
  for (const c of (cards || [])) {
    if (c.is_todo || c.card_type === 'todo') continue
    const a = shootAddr(c); if (!a) continue
    const team = c.card_team || []
    for (const t of team) {
      const s = byId[t.staff_id]; if (!s || !s.init) continue
      const k = s.init + '|' + c.card_date
      ;(groups[k] = groups[k] || []).push({ time: c.card_time || '', addr: a, name: c.client_name || '' })
    }
  }

  // cache betöltése
  const { data: cached } = await supabase.from('fahrten_log').select('*').gte('day', from).lte('day', to)
  const cacheMap = Object.fromEntries((cached || []).map(r => [r.staff_init + '|' + r.day, r]))

  const days = {}
  const toUpsert = []
  for (const k of Object.keys(groups)) {
    const [init, day] = k.split('|')
    const stops = groups[k].sort((x, y) => String(x.time).localeCompare(String(y.time)))
    const addrs = stops.map(s => s.addr)
    const hash = nrm(addrs.join('>'))
    const cur = cacheMap[k]
    let km, min
    if (cur && cur.stops_hash === hash) { km = cur.km; min = cur.minutes }
    else {
      const home = homeByInit[init]
      const r = await dayRoute(home, addrs)
      km = r.km; min = r.min
      toUpsert.push({ staff_init: init, day, km, minutes: min, stops_hash: hash, stops: stops, updated_at: new Date().toISOString() })
    }
    ;(days[day] = days[day] || {})[init] = { km, min, stops }
  }
  if (toUpsert.length) { try { await supabase.from('fahrten_log').upsert(toUpsert, { onConflict: 'staff_init,day' }) } catch {} }

  // összegzés fotósonként
  const totals = {}
  for (const day of Object.keys(days)) for (const init of Object.keys(days[day])) {
    const t = (totals[init] = totals[init] || { km: 0, min: 0, days: 0 })
    t.km += days[day][init].km; t.min += days[day][init].min; if (days[day][init].km > 0) t.days++
  }

  const photographers = (staff || []).filter(s => totals[s.init]).map(s => ({ init: s.init, name: s.name, color: s.color || '#6b6b6e', home: s.address || '' }))
  return Response.json({ ok: true, from, to, days, totals, photographers })
}
