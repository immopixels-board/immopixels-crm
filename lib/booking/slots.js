// ════════════════════════════════════════════════════════════════════
// lib/booking/slots.js
// Slot-engine: minden szabad időpont kiszámítása egy szolgáltatáshoz/naphoz.
//
// Logika:  munkaidő (provider_weekdays)
//        − meglévő foglalások (cards, az adott fotóshoz)
//        − statikus buffer (service.buffer_min)  ← böngészéskor ez számít
//        → szabad slotok 15 perces lépésközzel
//
// FONTOS: itt SOHA nincs Google hívás. A dinamikus útidő-buffer csak a
// create route-ban, foglalás pillanatában fut le. Ez tartja gyorsan + ingyen.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
let _supabase = null
function sb() { if(!_supabase) _supabase = getSupabase(); return _supabase }

// GCal calendar IDs per staff init
const GCAL_IDS = {
  'CD': 'immopixels@gmail.com',
  'DB': '66d96a2869c084e8e329d2905619613afbdbbe253fc72b1de8a83cb8a424f966@group.calendar.google.com',
  'EL': '227726e59806a3556283ba31ed000c7c103f67932c55102f2659cd0c0c24b71b@group.calendar.google.com',
  'NS': '5281af37de6046e897661f80b40034e6e368a611e6514e09b8300c5068f22e61@group.calendar.google.com',
}

async function getGCalToken() {
  // Try valid token first
  const { data } = await supabase
    .from('gcal_tokens').select('id, access_token, expires_at, refresh_token')
    .order('updated_at', { ascending: false })
    .limit(1).maybeSingle()

  if (!data) return null

  const exp = new Date(data.expires_at)
  const now = new Date()

  // Token valid
  if (exp > new Date(now.getTime() + 2*60*1000)) return data.access_token

  // Expired — try refresh
  if (data.refresh_token) {
    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: data.refresh_token,
          grant_type: 'refresh_token',
        })
      })
      const refreshed = await res.json()
      if (refreshed.access_token) {
        const newExp = new Date(Date.now() + (refreshed.expires_in||3600)*1000)
        await sb().from('gcal_tokens').update({
          access_token: refreshed.access_token,
          expires_at: newExp.toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', data.id)
        console.log('[slots] token refreshed OK')
        return refreshed.access_token
      }
    } catch(e) { console.warn('[slots] token refresh failed', e.message) }
  }

  console.warn('[slots] token expired, no refresh_token available')
  return null
}

async function getGCalBusyIntervals(staffInit, dateStr) {
  const token = await getGCalToken()
  if (!token) {
    console.log('[slots] NO TOKEN for', staffInit)
    return [{ _debug: 'no_token' }].filter(()=>false)
  }
  const calId = GCAL_IDS[staffInit]
  if (!calId) {
    console.log('[slots] NO CAL ID for', staffInit)
    return []
  }

  const timeMin = `${dateStr}T00:00:00+02:00`
  const timeMax = `${dateStr}T23:59:59+02:00`
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()

    if (!res.ok) {
      console.log('[slots] GCal error', staffInit, res.status, data?.error?.message)
      return []
    }

    const events = (data.items || []).filter(ev => ev.status !== 'cancelled' && ev.start?.dateTime)
    console.log(`[slots] GCal ${staffInit}: ${events.length} events on ${dateStr}`)

    return events.map(ev => {
      const start = new Date(ev.start.dateTime)
      const end = new Date(ev.end.dateTime)
      const startMin = start.getHours() * 60 + start.getMinutes()
      const endMin = end.getHours() * 60 + end.getMinutes()
      return { start: startMin, end: endMin + 45 }
    })
  } catch(e) {
    console.warn('[slots] GCal fetch failed', staffInit, e.message)
    return []
  }
}

const SLOT_STEP_MIN = 15            // időpontok lépésköze
const TZ = 'Europe/Berlin'

// "HH:MM[:SS]" → perc éjféltől
function toMin(t) {
  const [h, m] = t.split(':')
  return parseInt(h, 10) * 60 + parseInt(m, 10)
}
// perc → "HH:MM"
function toHHMM(min) {
  const h = Math.floor(min / 60), m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
// JS day (0=vasárnap) → Amelia day_index (1=hétfő..7=vasárnap)
function dayIndex(dateStr) {
  const js = new Date(dateStr + 'T12:00:00').getDay()
  return js === 0 ? 7 : js
}

// ─── Egy szolgáltatáshoz tartozó fotósok ────────────────────────────
async function providersForService(serviceId) {
  const { data } = await supabase
    .from('booking_provider_services')
    .select('provider_id, booking_providers!inner(id, staff_init, name, active)')
    .eq('service_id', serviceId)
  return (data || [])
    .filter(r => r.booking_providers?.active)
    .map(r => r.booking_providers)
}

// ─── Egy fotós aznapi foglalt intervallumai (cards-ból) ─────────────
// Minden foglaltság: [kezdés_perc, vége_perc + buffer]
async function busyIntervals(staffInit, dateStr) {
  // PRIMARY: Google Calendar direct (real-time, sees ALL events)
  const gcalBusy = await getGCalBusyIntervals(staffInit, dateStr)
  
  // FALLBACK: CRM cards (for manually created non-GCal cards)
  const { data } = await supabase
    .from('cards')
    .select('id, card_time, booking_end_time, booking_service_id, card_date, ' +
            'card_team!inner(staff_init)')
    .eq('card_date', dateStr)
    .eq('card_team.staff_init', staffInit)
    .not('card_time', 'is', null)
    .eq('is_gcal', false) // GCal cards already covered above

  const svcIds = [...new Set((data || []).map(c => c.booking_service_id).filter(Boolean))]
  let bufMap = {}
  if (svcIds.length) {
    const { data: svc } = await supabase
      .from('booking_services').select('id, buffer_min').in('id', svcIds)
    bufMap = Object.fromEntries((svc || []).map(s => [s.id, s.buffer_min]))
  }

  const crmBusy = (data || []).map(c => {
    const start = toMin(c.card_time)
    const end = c.booking_end_time ? toMin(c.booking_end_time) : start + 60
    const buf = bufMap[c.booking_service_id] ?? 0
    return { start, end: end + buf }
  })

  return [...gcalBusy, ...crmBusy]
}

function overlaps(s1, e1, s2, e2) { return s1 < e2 && s2 < e1 }

// ─── FŐ FÜGGVÉNY: szabad slotok egy napra ───────────────────────────
// Visszaad: [{ time:'09:00', providers:['CD','DB'] }, ...]
// auto-assign szempont: minden időponthoz felsoroljuk MELYIK fotós szabad
export async function getDaySlots(serviceId, dateStr) {
  const { data: svc } = await supabase
    .from('booking_services').select('*').eq('id', serviceId).single()
  if (!svc) return []

  const total = svc.duration_min + svc.buffer_min // a slot ennyit foglal le
  const di = dayIndex(dateStr)
  const providers = await providersForService(serviceId)
  if (!providers.length) return []

  // múltbeli idő kiszűrése ha a kiválasztott nap MA van
  const now = new Date()
  const isToday = new Date(dateStr + 'T00:00:00').toDateString() === now.toDateString()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  const slotMap = {} // 'HH:MM' → Set(staff_init)

  for (const p of providers) {
    // munkaidő az adott napra
    const { data: wd } = await supabase
      .from('booking_provider_weekdays')
      .select('start_time, end_time')
      .eq('provider_id', p.id).eq('day_index', di)
    if (!wd?.length) continue

    // szabadnap check
    const { data: off } = await supabase
      .from('booking_provider_daysoff')
      .select('id').eq('provider_id', p.id)
      .lte('date_from', dateStr).gte('date_to', dateStr)
    if (off?.length) continue

    const busy = await busyIntervals(p.staff_init, dateStr)

    for (const w of wd) {
      const wStart = toMin(w.start_time), wEnd = toMin(w.end_time)
      for (let t = wStart; t + svc.duration_min <= wEnd; t += SLOT_STEP_MIN) {
        if (isToday && t <= nowMin + 60) continue // legalább 1 órával előre
        // ütközés-e bármelyik meglévő foglalással? (a teljes total ablakra)
        const free = !busy.some(b => overlaps(t, t + total, b.start, b.end))
        if (!free) continue
        const hhmm = toHHMM(t)
        ;(slotMap[hhmm] ??= new Set()).add(p.staff_init)
      }
    }
  }

  return Object.keys(slotMap)
    .sort()
    .map(time => ({ time, providers: [...slotMap[time]] }))
}

// ─── Auto-assign: a legkevésbé terhelt szabad fotós kiválasztása ────
// A megadott napon ki dolgozik a legkevesebbet → az kapja a melót
export async function pickLeastBusyProvider(candidateInits, dateStr) {
  if (candidateInits.length === 1) return candidateInits[0]
  const counts = {}
  for (const init of candidateInits) {
    const { count } = await supabase
      .from('cards')
      .select('id, card_team!inner(staff_init)', { count: 'exact', head: true })
      .eq('date', dateStr)
      .eq('card_team.staff_init', init)
    counts[init] = count || 0
  }
  return candidateInits.sort((a, b) => counts[a] - counts[b])[0]
}
