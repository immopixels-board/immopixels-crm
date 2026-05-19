import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CALS_PULL = [
  { id: 'immopixels@gmail.com', init: 'CD' },
  { id: '66d96a2869c084e8e329d2905619613afbdbbe253fc72b1de8a83cb8a424f966@group.calendar.google.com', init: 'DB' },
  { id: '227726e59806a3556283ba31ed000c7c103f67932c55102f2659cd0c0c24b71b@group.calendar.google.com', init: 'EL' },
  { id: '5281af37de6046e897661f80b40034e6e368a611e6514e09b8300c5068f22e61@group.calendar.google.com', init: 'NS' },
]

function detectCategory(description = '', title = '') {
  const text = (description + ' ' + title).toLowerCase()
  if (text.includes('drohne') || text.includes('drone')) return 'foto+drohne'
  if (text.includes('reel') && (text.includes('foto') || text.includes('photo'))) return 'foto+reel'
  if (text.includes('reel')) return 'reel'
  return 'foto'
}

async function getToken(supabase) {
  const { data } = await supabase.from('gcal_tokens').select('*')
    .order('updated_at', { ascending: false }).limit(1).single()
  return data?.access_token || null
}

async function syncCalendar(supabase, token, cal, staffList) {
  const now = new Date()
  const start = now.toISOString() // only future events
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: 'Bearer ' + token } }
  )
  if (!r.ok) return { created: 0, updated: 0 }
  const { items = [] } = await r.json()

  const { data: cols } = await supabase.from('columns').select('*')
  const shootingsCol = (cols || []).find(c =>
    c.title.toLowerCase().includes('shooting') || c.title === 'GCal Import'
  ) || (cols || [])[0]
  if (!shootingsCol) return { created: 0, updated: 0 }

  const { data: existingCards } = await supabase.from('cards').select('id, gcal_id, card_date, card_time').not('gcal_id', 'is', null)
  const existingMap = {}
  for (const c of existingCards || []) { if (c.gcal_id) existingMap[c.gcal_id] = c }

  let created = 0, updated = 0

  for (const ev of items) {
    const location = ev.location?.trim()
    if (!location) continue

    const date = (ev.start?.dateTime || ev.start?.date || '').slice(0, 10)
    const time = ev.start?.dateTime
      ? new Date(ev.start.dateTime).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
      : null
    const category = detectCategory(ev.description || '', ev.summary || '')

    const existing = existingMap[ev.id]

    if (existing) {
      // Update if date/time changed
      const dateChanged = existing.card_date !== date
      const timeChanged = (existing.card_time?.slice(0,5) || '') !== (time || '')
      if (dateChanged || timeChanged) {
        await supabase.from('cards').update({ card_date: date, card_time: time, addr: location, updated_at: new Date().toISOString() }).eq('id', existing.id)
        updated++
      }
    } else {
      // Create new card
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
        created++
      }
    }
  }

  return { created, updated }
}

// Google sends POST when calendar changes
export async function POST(req) {
  // Google sends headers: x-goog-channel-id, x-goog-resource-state
  const state = req.headers.get('x-goog-resource-state')
  const channelId = req.headers.get('x-goog-channel-id') || ''

  // 'sync' is the initial verification ping — just acknowledge
  if (state === 'sync') return new Response('OK', { status: 200 })

  // Only process 'exists' events (calendar changed)
  if (state !== 'exists') return new Response('OK', { status: 200 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const token = await getToken(supabase)
  if (!token) return new Response('no token', { status: 200 })

  const { data: staffList } = await supabase.from('staff').select('*')

  // Determine which calendar changed from channelId (format: ip-crm-cd-timestamp)
  let totalCreated = 0, totalUpdated = 0
  const initMatch = channelId.match(/ip-crm-([a-z]+)-/)
  const targetInit = initMatch ? initMatch[1].toUpperCase() : null

  const calsToSync = targetInit
    ? CALS_PULL.filter(c => c.init === targetInit)
    : CALS_PULL

  for (const cal of calsToSync) {
    try {
      const { created, updated } = await syncCalendar(supabase, token, cal, staffList)
      totalCreated += created
      totalUpdated += updated
    } catch (e) { /* skip */ }
  }

  return new Response('OK', { status: 200 })
}
