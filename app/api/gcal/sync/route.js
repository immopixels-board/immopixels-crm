import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CALS = [
  { id: 'immopixels@gmail.com', init: 'CD' },
  { id: '66d96a2869c084e8e329d2905619613afbdbbe253fc72b1de8a83cb8a424f966@group.calendar.google.com', init: 'DB' },
]

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function getToken(supabase) {
  const { data } = await supabase.from('gcal_tokens')
    .select('access_token, refresh_token, expires_at, id')
    .eq('staff_id', 'af92ceb7-53cc-423c-b24d-b2d306326244')
    .maybeSingle()
  if (!data) return null
  const exp = new Date(data.expires_at)
  if (exp < new Date(Date.now() + 2*60*1000) && data.refresh_token) {
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
      await supabase.from('gcal_tokens').update({
        access_token: refreshed.access_token,
        expires_at: new Date(Date.now() + (refreshed.expires_in||3600)*1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', data.id)
      return refreshed.access_token
    }
  }
  return data.access_token
}

async function doSync() {
  const supabase = sb()
  const token = await getToken(supabase)
  if (!token) return { ok: false, reason: 'no token' }

  const { data: staffList } = await supabase.from('staff').select('id, init')
  const { data: cols } = await supabase.from('columns').select('id, title')
  const shootingsCol = (cols||[]).find(c => c.title?.toLowerCase().includes('shooting')) || (cols||[])[0]
  if (!shootingsCol) return { ok: false, reason: 'no column' }

  const now = new Date()
  const timeMin = now.toISOString()
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

  let totalCreated = 0, totalUpdated = 0, totalDeleted = 0

  for (const cal of CALS) {
    const r = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: 'Bearer ' + token } }
    )
    if (!r.ok) continue
    const { items = [] } = await r.json()

    const staffMember = (staffList||[]).find(s => s.init === cal.init)
    if (!staffMember) continue

    const { data: existing } = await supabase.from('cards')
      .select('id, gcal_id, card_date, card_time')
      .eq('is_gcal', true)
      .not('gcal_id', 'is', null)

    const existingMap = {}
    for (const c of existing||[]) existingMap[c.gcal_id] = c

    const activeIds = new Set()

    for (const ev of items) {
      if (ev.status === 'cancelled') continue
      if (!ev.start?.dateTime && !ev.start?.date) continue
      const gcal_id = ev.id
      const date = (ev.start.dateTime || ev.start.date).slice(0, 10)
      const time = ev.start.dateTime
        ? new Date(ev.start.dateTime).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
        : '08:00'
      const endTime = ev.end?.dateTime
        ? new Date(ev.end.dateTime).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
        : null
      activeIds.add(gcal_id)
      const ex = existingMap[gcal_id]
      if (ex) {
        if (ex.card_date !== date || (ex.card_time?.slice(0,5)||'') !== (time||'')) {
          await supabase.from('cards').update({
            card_date: date, card_time: time, booking_end_time: endTime,
            title: ev.summary || date, addr: ev.location || '',
            updated_at: new Date().toISOString()
          }).eq('id', ex.id)
          totalUpdated++
        }
      } else {
        const { data: newCard } = await supabase.from('cards').insert({
          column_id: shootingsCol.id,
          title: ev.summary || date,
          addr: ev.location || '',
          card_date: date, card_time: time, booking_end_time: endTime,
          is_gcal: true, is_todo: false, price: 0, position: 9999, note: '', gcal_id,
        }).select().single()
        if (newCard?.id) {
          await supabase.from('card_team').insert({ card_id: newCard.id, staff_id: staffMember.id })
          totalCreated++
        }
      }
    }
    for (const [gcal_id, card] of Object.entries(existingMap)) {
      if (!activeIds.has(gcal_id)) {
        await supabase.from('cards').delete().eq('id', card.id)
        totalDeleted++
      }
    }
  }
  return { ok: true, created: totalCreated, updated: totalUpdated, deleted: totalDeleted }
}

export async function POST() { return NextResponse.json(await doSync()) }
export async function GET() { return NextResponse.json(await doSync()) }
