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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
  // card_team köti a staffot a kártyához; a foglalás time + booking_end_time + service buffer
  const { data } = await supabase
    .from('cards')
    .select('id, time, booking_end_time, booking_service_id, date, ' +
            'card_team!inner(staff_init)')
    .eq('date', dateStr)
    .eq('card_team.staff_init', staffInit)
    .not('time', 'is', null)

  // service bufferek betöltése egyszer
  const svcIds = [...new Set((data || []).map(c => c.booking_service_id).filter(Boolean))]
  let bufMap = {}
  if (svcIds.length) {
    const { data: svc } = await supabase
      .from('booking_services').select('id, buffer_min').in('id', svcIds)
    bufMap = Object.fromEntries((svc || []).map(s => [s.id, s.buffer_min]))
  }

  return (data || []).map(c => {
    const start = toMin(c.time)
    const end = c.booking_end_time ? toMin(c.booking_end_time) : start + 60
    const buf = bufMap[c.booking_service_id] ?? 0
    return { start, end: end + buf } // buffer a végéhez adva
  })
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
