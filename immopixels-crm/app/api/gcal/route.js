import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STAFF_CAL_MAP = {
  'CD': 'immopixels@gmail.com',
  'DB': '66d96a2869c084e8e329d2905619613afbdbbe253fc72b1de8a83cb8a424f966@group.calendar.google.com',
  'EL': '227726e59806a3556283ba31ed000c7c103f67932c55102f2659cd0c0c24b71b@group.calendar.google.com',
  'NS': '5281af37de6046e897661f80b40034e6e368a611e6514e09b8300c5068f22e61@group.calendar.google.com',
}

const CALS_PULL = [
  { id: 'immopixels@gmail.com', init: 'CD' },
  { id: '66d96a2869c084e8e329d2905619613afbdbbe253fc72b1de8a83cb8a424f966@group.calendar.google.com', init: 'DB' },
  { id: '227726e59806a3556283ba31ed000c7c103f67932c55102f2659cd0c0c24b71b@group.calendar.google.com', init: 'EL' },
  { id: '5281af37de6046e897661f80b40034e6e368a611e6514e09b8300c5068f22e61@group.calendar.google.com', init: 'NS' },
]

function detectCategory(description = '', title = '') {
  const text = (description + ' ' + title).toLowerCase()
  const hasDrone = text.includes('drohne') || text.includes('drone') || text.includes('drón')
  const hasReel = text.includes('reel')
  const hasFoto = text.includes('foto') || text.includes('photo')
  if (hasDrone && hasReel) return 'foto-reel' // prioritize reel if both
  if (hasDrone) return 'foto-dron'
  if (hasReel && hasFoto) return 'foto-reel'
  if (hasReel) return 'reel'
  return 'foto'
}

async function getToken(supabase) {
  const { data } = await supabase
    .from('gcal_tokens').select('*')
    .gt('expires_at', new Date().toISOString())
    .order('updated_at', { ascending: false })
    .limit(1).single()
  return data?.access_token || null
}

function buildEventBody(card) {
  const category = detectCategory(card.description || '', card.title || '')
  const isDateTime = !!card.card_time
  const startDT = isDateTime ? `${card.card_date}T${card.card_time}:00` : card.card_date
  const endDT = isDateTime
    ? (() => { const d = new Date(`${card.card_date}T${card.card_time}:00`); d.setHours(d.getHours() + 2); return d.toISOString().slice(0, 19) })()
    : card.card_date
  return {
    summary: `${category.toUpperCase()} - ${card.addr}${card.client_name ? ' · ' + card.client_name : ''}`,
    location: card.addr,
    description: card.description || '',
    status: 'confirmed',
    transparency: 'opaque',
    start: isDateTime ? { dateTime: startDT, timeZone: 'Europe/Berlin' } : { date: startDT },
    end: isDateTime ? { dateTime: endDT, timeZone: 'Europe/Berlin' } : { date: endDT },
  }
}

// POST: push card to GCal (create or update)
export async function POST(req) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const body = await req.json()
  const { card, staffInits = [] } = body

  if (!card?.addr || !card?.card_date) return Response.json({ ok: false, reason: 'no addr or date' })

  const token = await getToken(supabase)
  if (!token) return Response.json({ ok: false, reason: 'no token' })

  const primaryInit = staffInits[0] || 'CD'
  const calId = STAFF_CAL_MAP[primaryInit] || STAFF_CAL_MAP['CD']
  const calIdEnc = encodeURIComponent(calId)
  const eventBody = buildEventBody(card)

  let gcalId = card.gcal_id || null
  let result

  try {
    if (gcalId) {
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calIdEnc}/events/${gcalId}`,
        { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(eventBody) }
      )
      if (r.status === 404 || r.status === 410) { gcalId = null }
      else { result = await r.json() }
    }
    if (!gcalId) {
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calIdEnc}/events`,
        { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(eventBody) }
      )
      result = await r.json()
      gcalId = result.id
    }
    if (gcalId && card.id) {
      await supabase.from('cards').update({ gcal_id: gcalId, is_gcal: true }).eq('id', card.id)
    }
    return Response.json({ ok: true, gcal_id: gcalId })
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 })
  }
}

// GET: pull GCal → create cards (cron)
export async function GET(req) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const token = await getToken(supabase)
  if (!token) return Response.json({ ok: false, reason: 'no token' })

  const { data: cols } = await supabase.from('columns').select('*')
  const shootingsCol = (cols || []).find(c =>
    c.title.toLowerCase().includes('shooting') || c.title === 'GCal Import'
  ) || (cols || [])[0]
  if (!shootingsCol) return Response.json({ ok: false, reason: 'no shootings column' })

  const { data: staffList } = await supabase.from('staff').select('*')
  const { data: existingCards } = await supabase.from('cards').select('gcal_id').not('gcal_id', 'is', null)
  const existingIds = new Set((existingCards || []).map(c => c.gcal_id))

  const now = new Date()
  const start = now.toISOString() // only from now onwards — no past events
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

  let created = 0, skipped = 0

  for (const cal of CALS_PULL) {
    try {
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: 'Bearer ' + token } }
      )
      if (!r.ok) { skipped++; continue }
      const { items = [] } = await r.json()

      for (const ev of items) {
        const location = ev.location?.trim()
        if (!location) { skipped++; continue }
        if (existingIds.has(ev.id)) { skipped++; continue }

        const date = (ev.start?.dateTime || ev.start?.date || '').slice(0, 10)
        const time = ev.start?.dateTime
          ? new Date(ev.start.dateTime).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
          : null
        const category = detectCategory(ev.description || '', ev.summary || '')

        const { data: newCard } = await supabase.from('cards').insert({
          column_id: shootingsCol.id,
          title: ev.summary || location,
          addr: location,
          description: ev.description || '',
          card_date: date,
          card_time: time,
          card_type: category,
          is_gcal: true,
          is_todo: false,
          price: 0,
          position: 9999,
          note: '',
          gcal_id: ev.id,
        }).select().single()

        if (newCard?.id) {
          const staffMember = (staffList || []).find(s => s.init === cal.init)
          if (staffMember) await supabase.from('card_team').insert({ card_id: newCard.id, staff_id: staffMember.id })
          existingIds.add(ev.id)
          created++
        }
      }
    } catch (e) { /* skip */ }
  }

  return Response.json({ ok: true, created, skipped })
}
