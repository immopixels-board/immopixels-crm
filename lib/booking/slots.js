// ════════════════════════════════════════════════════════════════════
// lib/booking/slots.js
// Slot-engine: szabad időpontok számítása — ÉLŐ Google Calendar olvasással.
//
// Logika:  munkaidő (provider_weekdays)
//        − a fotós Google naptárában lévő ÉLŐ események (valós idejű)
//        − statikus buffer (service.buffer_min)
//        → szabad slotok 15 perces lépésközzel, max 17:00 kezdés
//
// A foglaltság forrása MINDIG a Google naptár (nem a cards tábla),
// így mindig pontos, akkor is ha a naptárban módosítanak/törölnek.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

let _sb = null
function sb() {
  if (!_sb) _sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  return _sb
}

const SLOT_STEP_MIN = 15
const TRAVEL_BUFFER_MIN = 15 // ennyivel több szünet kell az útidőn felül, különben "knapp" jelzés
const TZ = 'Europe/Berlin'
const CD_STAFF_ID = 'af92ceb7-53cc-423c-b24d-b2d306326244'

// Fotós init → Google naptár ID
const GCAL_IDS = {
  CD: 'immopixels@gmail.com',
  DB: '66d96a2869c084e8e329d2905619613afbdbbe253fc72b1de8a83cb8a424f966@group.calendar.google.com',
}

function toMin(t) {
  const [h, m] = t.split(':')
  return parseInt(h, 10) * 60 + parseInt(m, 10)
}
function cityOf(loc) {
  const m = String(loc || '').match(/\d{5}\s*([^,]+)/)
  if (m) return m[1].trim()
  const parts = String(loc || '').split(',').map(x => x.trim()).filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 1].replace(/Deutschland|Germany/i, '').trim() || parts[0] : (parts[0] || '')
}
function toHHMM(min) {
  const h = Math.floor(min / 60), m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
function dayIndex(dateStr) {
  const js = new Date(dateStr + 'T12:00:00').getDay()
  return js === 0 ? 7 : js
}
function overlaps(s1, e1, s2, e2) { return s1 < e2 && s2 < e1 }

// ─── Friss Google access_token (refresh_token-ből, mindig) ──────────
let _tokenCache = { token: null, exp: 0 }
async function getGoogleToken() {
  // 50 mp-ig cache-eljük, hogy egy slots-hívás alatt ne kérjünk többször
  if (_tokenCache.token && Date.now() < _tokenCache.exp) return _tokenCache.token

  const { data } = await sb().from('gcal_tokens')
    .select('refresh_token').eq('staff_id', CD_STAFF_ID).maybeSingle()
  if (!data?.refresh_token) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: data.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const j = await res.json()
  if (!j.access_token) {
    console.error('[slots] token refresh failed', j.error, j.error_description)
    return null
  }
  _tokenCache = { token: j.access_token, exp: Date.now() + 50_000 }
  return j.access_token
}

// Berlin perc-offset egy adott ISO időpontnál (HH*60+MM Berlin-időben)
function berlinMinutes(iso) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(iso))
  const h = +parts.find(p => p.type === 'hour').value
  const m = +parts.find(p => p.type === 'minute').value
  return h * 60 + m
}
function berlinDateStr(iso) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso))
}

// ─── Egy fotós aznapi foglalt intervallumai — ÉLŐ NAPTÁRBÓL ─────────
async function busyIntervals(staffInit, dateStr, token, excludeGcalId = null) {
  const calId = GCAL_IDS[staffInit]
  if (!calId || !token) return []

  // a nap [00:00, 24:00) Berlin-időben, tág lekérdezéssel (±1 nap a tz-szélek miatt)
  const timeMin = new Date(dateStr + 'T00:00:00+02:00')
  timeMin.setDate(timeMin.getDate() - 1)
  const timeMax = new Date(dateStr + 'T00:00:00+02:00')
  timeMax.setDate(timeMax.getDate() + 2)

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events` +
    `?timeMin=${encodeURIComponent(timeMin.toISOString())}` +
    `&timeMax=${encodeURIComponent(timeMax.toISOString())}` +
    `&singleEvents=true&orderBy=startTime&maxResults=2500`

  let items = []
  try {
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } })
    if (!r.ok) {
      console.error('[slots] GCal busy fetch failed', staffInit, r.status)
      return []
    }
    items = (await r.json()).items || []
  } catch (e) {
    console.error('[slots] GCal busy error', staffInit, e.message)
    return []
  }

  const intervals = []
  for (const ev of items) {
    if (ev.status === 'cancelled') continue
    if (excludeGcalId && ev.id === excludeGcalId) continue // a saját foglalás eseménye
    // egész napos esemény (date, nem dateTime) → teljes nap blokk
    if (ev.start?.date && !ev.start?.dateTime) {
      if (ev.start.date <= dateStr && dateStr < ev.end.date) {
        intervals.push({ start: 0, end: 24 * 60, location: null })
      }
      continue
    }
    if (!ev.start?.dateTime || !ev.end?.dateTime) continue

    // csak ami érinti az adott Berlin-napot
    const sDate = berlinDateStr(ev.start.dateTime)
    const eDate = berlinDateStr(ev.end.dateTime)
    if (sDate > dateStr || eDate < dateStr) continue

    let startMin = (sDate < dateStr) ? 0 : berlinMinutes(ev.start.dateTime)
    let endMin = (eDate > dateStr) ? 24 * 60 : berlinMinutes(ev.end.dateTime)
    if (endMin <= startMin) endMin = startMin + 30 // védő minimum
    intervals.push({ start: startMin, end: endMin, location: ev.location || null })
  }
  return intervals
}

async function providersForService(serviceId) {
  const { data } = await sb()
    .from('booking_provider_services')
    .select('provider_id, booking_providers!inner(id, staff_init, name, active)')
    .eq('service_id', serviceId)
  return (data || [])
    .filter(r => r.booking_providers?.active)
    .map(r => r.booking_providers)
}

// ─── FŐ FÜGGVÉNY: szabad slotok egy napra ───────────────────────────
// shootAddress megadva → minden slothoz utazás-tudatos `warn` jelzés
export async function getDaySlots(serviceId, dateStr, addonMin = 0, excludeGcalId = null, shootAddress = null) {
  const { data: svc } = await sb()
    .from('booking_services').select('*').eq('id', serviceId).single()
  if (!svc) return []

  const buffer = svc.buffer_min ?? 45
  const total = svc.duration_min + addonMin + buffer // lefoglalt ablak
  const dur = svc.duration_min + addonMin            // tényleges munka
  const di = dayIndex(dateStr)
  const providers = await providersForService(serviceId)
  if (!providers.length) return []

  const now = new Date()
  const isToday = berlinDateStr(now.toISOString()) === dateStr
  const nowMin = berlinMinutes(now.toISOString())
  const LAST_SLOT = 17 * 60

  const token = await getGoogleToken()

  // utazási idő segéd: csak ha van shootAddress
  let travelMod = null
  if (shootAddress) {
    try { travelMod = await import('./travel.js') } catch {}
  }
  // helyszín → {to: shoot felé perc, from: shoot-ból perc} cache egy híváson belül
  const travelCache = {}
  async function travelPair(eventLoc) {
    if (!travelMod || !eventLoc) return { to: null, from: null }
    if (travelCache[eventLoc]) return travelCache[eventLoc]
    const to = await travelMod.getTravelMinutes(eventLoc, shootAddress)   // event → shoot
    const from = await travelMod.getTravelMinutes(shootAddress, eventLoc) // shoot → event
    const res = { to, from }
    travelCache[eventLoc] = res
    return res
  }

  // Fotós lakcíme → shoot menetidő (egyszer fotósonként) — az "auto" választáshoz (legközelebbi)
  const homeTravel = {}
  let homeAddrByInit = {}
  if (shootAddress && travelMod) {
    const { data: stAddr } = await sb().from('staff').select('init,address').in('init', providers.map(p => p.staff_init))
    homeAddrByInit = Object.fromEntries((stAddr || []).map(s => [s.init, s.address || null]))
    for (const p of providers) {
      const ha = homeAddrByInit[p.staff_init]
      if (ha) { try { const m = await travelMod.getTravelMinutes(ha, shootAddress); if (m != null) homeTravel[p.staff_init] = m } catch {} }
    }
  }

  // slot → { providers:Set, warn:bool (minden szabad fotósnál szoros az útidő) }
  const slotMap = {}

  for (const p of providers) {
    const { data: wd } = await sb()
      .from('booking_provider_weekdays')
      .select('start_time, end_time')
      .eq('provider_id', p.id).eq('day_index', di)
    if (!wd?.length) continue

    const { data: off } = await sb()
      .from('booking_provider_daysoff')
      .select('id').eq('provider_id', p.id)
      .lte('date_from', dateStr).gte('date_to', dateStr)
    if (off?.length) continue

    const busy = await busyIntervals(p.staff_init, dateStr, token, excludeGcalId)
    // időrendben, hogy a szomszédos eseményeket megtaláljuk
    const sorted = [...busy].sort((a, b) => a.start - b.start)

    for (const w of wd) {
      const wStart = toMin(w.start_time), wEnd = toMin(w.end_time)
      for (let t = wStart; t + dur <= wEnd && t <= LAST_SLOT; t += SLOT_STEP_MIN) {
        if (isToday && t <= nowMin + 60) continue
        const free = !busy.some(b => overlaps(t, t + total, b.start, b.end))
        if (!free) continue

        // Utazás-tudatosság (aszimmetrikus):
        //  - KÖVETKEZŐ fix termin: ha az új termin után nem érnénk oda időben → TILTÁS
        //    (a meglévő terminről késni nem lehet, nulla tolerancia).
        //  - ELŐZŐ fix termin: ha az ÚJ terminre érkeznénk késve, max +15 percig
        //    figyelmeztetéssel foglalható; e fölött tiltás.
        let tight = false, blocked = false, delayMin = 0, info = null
        if (shootAddress) {
          let prev = null, next = null
          for (const ev of sorted) {
            if (ev.end <= t && (!prev || ev.end > prev.end)) prev = ev
            if (ev.start >= t + dur && (!next || ev.start < next.start)) next = ev
          }
          if (prev?.location) {
            const { to } = await travelPair(prev.location)
            if (to != null) {
              const late = (prev.end + to) - t // ennyit késnénk az ÚJ terminre
              if (late > 15) blocked = true
              else if (late > 0) { tight = true; delayMin = late }
              else if ((t - prev.end) < to + TRAVEL_BUFFER_MIN) tight = true
              if (!blocked) info = { from: cityOf(prev.location), home: false, prevEnd: toHHMM(prev.end), travelMin: to, eta: toHHMM(Math.max(t, prev.end + to)), delayMin, originQuery: cityOf(prev.location) + ', Deutschland' }
            }
          } else if (!prev) {
            const hm = homeTravel[p.staff_init]
            const ha = homeAddrByInit[p.staff_init]
            if (hm != null) info = { from: cityOf(ha) || 'Zuhause', home: true, prevEnd: null, travelMin: hm, eta: toHHMM(t), delayMin: 0, originQuery: (cityOf(ha) ? cityOf(ha) + ', Deutschland' : null) }
          }
          if (!blocked && next?.location) {
            const { from } = await travelPair(next.location)
            if (from != null) {
              const gap = next.start - (t + dur)
              if (gap < from) blocked = true
              else if (gap < from + TRAVEL_BUFFER_MIN) tight = true
            }
          }
          if (blocked) continue
        }

        const hhmm = toHHMM(t)
        if (!slotMap[hhmm]) slotMap[hhmm] = { providers: new Set(), tightAll: true, byInit: {} }
        slotMap[hhmm].providers.add(p.staff_init)
        if (info) slotMap[hhmm].byInit[p.staff_init] = info
        if (!tight) slotMap[hhmm].tightAll = false // legalább egy fotós kényelmesen ráér
      }
    }
  }

  return Object.keys(slotMap).sort().map(time => {
    const freeInits = [...slotMap[time].providers]
    let auto = freeInits[0] || null
    const withT = freeInits.filter(i => homeTravel[i] != null)
    if (withT.length) auto = withT.sort((a, b) => homeTravel[a] - homeTravel[b])[0]
    return {
      time,
      providers: freeInits,
      warn: shootAddress ? slotMap[time].tightAll : false,
      auto,
      info: (slotMap[time].byInit && auto && slotMap[time].byInit[auto]) || null,
      empfohlen: (() => { const i = slotMap[time].byInit && auto && slotMap[time].byInit[auto]; return !!(i && i.travelMin != null && i.travelMin <= 20 && !slotMap[time].tightAll && !(i.delayMin > 0)) })(),
    }
  })
}

// ─── Auto-assign: legkevésbé terhelt szabad fotós (élő naptár alapján) ─
export async function pickLeastBusyProvider(candidateInits, dateStr) {
  if (candidateInits.length === 1) return candidateInits[0]
  const token = await getGoogleToken()
  const counts = {}
  for (const init of candidateInits) {
    const busy = await busyIntervals(init, dateStr, token)
    counts[init] = busy.length
  }
  return candidateInits.sort((a, b) => counts[a] - counts[b])[0]
}

// ─── Auto-assign: a szabad fotósok közül a lakcíméhez LEGKÖZELEBBI a shoot-helyszínhez ─
// Ha nincs cím / Maps-kulcs / táv → visszaesik a legkevésbé terhelt logikára.
export async function pickClosestProvider(candidateInits, dateStr, shootAddress) {
  if (!candidateInits || candidateInits.length === 0) return null
  if (candidateInits.length === 1) return candidateInits[0]
  if (shootAddress) {
    try {
      const travelMod = await import('./travel.js')
      const { data } = await sb().from('staff').select('init,address').in('init', candidateInits)
      const addrByInit = Object.fromEntries((data || []).map(s => [s.init, s.address || null]))
      const t = {}
      for (const init of candidateInits) {
        const ha = addrByInit[init]
        if (ha) { const m = await travelMod.getTravelMinutes(ha, shootAddress); if (m != null) t[init] = m }
      }
      const withT = candidateInits.filter(i => t[i] != null)
      if (withT.length) return withT.sort((a, b) => t[a] - t[b])[0]
    } catch (e) { /* fall through to least-busy */ }
  }
  return await pickLeastBusyProvider(candidateInits, dateStr)
}

export { getGoogleToken, GCAL_IDS }
