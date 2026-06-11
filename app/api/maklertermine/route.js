import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function svc() { const { createClient } = require('@supabase/supabase-js'); return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) }
function guessType(s) { const t = String(s || '').toLowerCase(); const foto = /foto/.test(t), reel = /reel/.test(t), dron = /drohne|drone|dron/.test(t); if (foto && reel) return 'foto-reel'; if (foto && dron) return 'foto-dron'; if (reel) return 'reel'; if (dron) return 'dron'; return 'foto' }

// GET → naptárak listája
export async function GET() {
  const { getGoogleToken } = await import('@/lib/booking/slots')
  const token = await getGoogleToken()
  if (!token) return NextResponse.json({ ok: false, error: 'Google nicht verbunden (kein Token)' }, { status: 500 })
  const r = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250&minAccessRole=reader', { headers: { Authorization: 'Bearer ' + token } })
  const j = await r.json()
  if (j.error) return NextResponse.json({ ok: false, error: j.error?.message || 'Calendar API Fehler' }, { status: 502 })
  const calendars = (j.items || []).map(c => ({ id: c.id, summary: c.summary, primary: !!c.primary })).sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0) || a.summary.localeCompare(b.summary))
  return NextResponse.json({ ok: true, calendars })
}

// POST → {calendarId, year, clientName, columnId, create} → events előnézet / import kártyaként
export async function POST(req) {
  let body; try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
  const { calendarId, year, clientName, columnId, create } = body || {}
  if (!calendarId) return NextResponse.json({ ok: false, error: 'calendarId fehlt' }, { status: 400 })
  const y = parseInt(year) || new Date().getFullYear()
  const { getGoogleToken } = await import('@/lib/booking/slots')
  const token = await getGoogleToken()
  if (!token) return NextResponse.json({ ok: false, error: 'Google nicht verbunden' }, { status: 500 })

  const timeMin = encodeURIComponent(y + '-01-01T00:00:00Z')
  const timeMax = encodeURIComponent(y + '-12-31T23:59:59Z')
  let items = [], pageToken = null, guard = 0
  do {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=true&orderBy=startTime&maxResults=2500&timeMin=${timeMin}&timeMax=${timeMax}` + (pageToken ? '&pageToken=' + pageToken : '')
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } })
    const j = await r.json()
    if (j.error) return NextResponse.json({ ok: false, error: j.error?.message || 'events Fehler' }, { status: 502 })
    items.push(...(j.items || []))
    pageToken = j.nextPageToken; guard++
  } while (pageToken && guard < 20)

  const events = items.filter(ev => ev.status !== 'cancelled' && (ev.start?.dateTime || ev.start?.date)).map(ev => {
    const dt = ev.start.dateTime || null
    return { gid: ev.id, date: dt ? dt.slice(0, 10) : ev.start.date, time: dt ? dt.slice(11, 16) : null, summary: ev.summary || '(ohne Titel)', location: ev.location || '', description: (ev.description || '').slice(0, 500) }
  })

  if (!create) return NextResponse.json({ ok: true, count: events.length, events: events.slice(0, 200) })

  if (!clientName || !columnId) return NextResponse.json({ ok: false, error: 'clientName/columnId fehlt' }, { status: 400 })
  const sb = svc()
  // meglévők (duplikátum-szűrés): client + dátum + cím
  const { data: existing } = await sb.from('cards').select('card_date,title').eq('client_name', clientName).gte('card_date', y + '-01-01').lte('card_date', y + '-12-31').is('deleted_at', null)
  const seen = new Set((existing || []).map(c => (c.card_date || '') + '|' + (c.title || '')))
  let created = 0, skipped = 0
  const rows = []
  for (const e of events) {
    const title = e.summary
    const key = e.date + '|' + title
    if (seen.has(key)) { skipped++; continue }
    seen.add(key)
    rows.push({ column_id: columnId, client_name: clientName, title, addr: e.location || '', booking_address: e.location || '', description: e.description || '', card_date: e.date, card_time: e.time, card_type: guessType(title + ' ' + e.description), position: 999 })
  }
  if (rows.length) { const { error } = await sb.from('cards').insert(rows); if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 }); created = rows.length }
  return NextResponse.json({ ok: true, created, skipped, total: events.length })
}
