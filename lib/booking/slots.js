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
        intervals.push({ start: 0, end: 24 * 60 })
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
    intervals.push({ start: startMin, end: endMin })
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
export async function getDaySlots(serviceId, dateStr, addonMin = 0, excludeGcalId = null) {
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

    for (const w of wd) {
      const wStart = toMin(w.start_time), wEnd = toMin(w.end_time)
      for (let t = wStart; t + dur <= wEnd && t <= LAST_SLOT; t += SLOT_STEP_MIN) {
        if (isToday && t <= nowMin + 60) continue
        const free = !busy.some(b => overlaps(t, t + total, b.start, b.end))
        if (!free) continue
        const hhmm = toHHMM(t)
        ;(slotMap[hhmm] ??= new Set()).add(p.staff_init)
      }
    }
  }

  return Object.keys(slotMap).sort().map(time => ({ time, providers: [...slotMap[time]] }))
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

export { getGoogleToken, GCAL_IDS }
