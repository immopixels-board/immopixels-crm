import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const runtime = 'nodejs'
function autoChecklist(ct) { const b = ['Fotografiert', 'Für Bearbeitung gesendet', 'In Bearbeitung', 'Reel in Bearbeitung']; return String(ct || '').includes('reel') ? [...b, 'Reel Fertig'] : b }
async function insCl(supabase, cardId, ct) { const rows = autoChecklist(ct).map(text => ({ card_id: cardId, text, done: false })); await supabase.from('checklist_items').insert(rows) }
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Csak az aktív foglalós fotósok naptárai (CD, DB). EL inaktív.
const CALS = [
  { id: 'immopixels@gmail.com', init: 'CD' },
  { id: '66d96a2869c084e8e329d2905619613afbdbbe253fc72b1de8a83cb8a424f966@group.calendar.google.com', init: 'DB' },
]

const CD_STAFF_ID = 'af92ceb7-53cc-423c-b24d-b2d306326244'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// Berlin-ido "HH:MM" egy ISO datetime-bol (a szerver UTC, ezert explicit tz kell)
function berlinHHMM(iso) {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso))
}
// Berlin-datum "YYYY-MM-DD" egy ISO datetime-bol
function berlinDate(iso) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso))
}

// Mindig friss access_token a refresh_token-bol (nem bizunk a tarolt access_token-ben)
async function getFreshToken(supabase) {
  const { data } = await supabase.from('gcal_tokens')
    .select('id, refresh_token')
    .eq('staff_id', CD_STAFF_ID)
    .maybeSingle()
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
    console.error('[sync] token refresh failed', j.error, j.error_description)
    return null
  }
  await supabase.from('gcal_tokens').update({
    access_token: j.access_token,
    expires_at: new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', data.id)
  return j.access_token
}

async function doSync(opts = {}) {
  const supabase = sb()
  const token = await getFreshToken(supabase)
  if (!token) return { ok: false, reason: 'token refresh failed' }

  const { data: staffList } = await supabase.from('staff').select('id, init')
  const { data: cols } = await supabase.from('columns').select('id, title')
  const shootingsCol =
    (cols || []).find(c => c.title && c.title.toLowerCase().includes('shooting')) || (cols || [])[0]
  if (!shootingsCol) return { ok: false, reason: 'no column' }

  // Ügyfél-párosító (mint a kliens-oldali guessClientName): #szám levágás, szó-egyezés
  // a short_name-re, majd a név első (márka)szavára, végül tartalmazás.
  const { data: clientList } = await supabase.from('clients').select('name, short_name')
  const guessClient = (title) => {
    const raw = (title || '').toLowerCase()
    if (!raw.trim()) return ''
    const words = raw.replace(/#\s*\d+/g, ' ').split(/[^a-z0-9äöüß-]+/).filter(Boolean).map(w => w.replace(/^-+|-+$/g, ''))
    let m = (clientList || []).find(c => { const sn = (c.short_name || '').toLowerCase(); return sn && words.includes(sn) })
    if (!m) m = (clientList || []).find(c => { const fw = (c.name || '').trim().split(/\s+/)[0].toLowerCase(); return fw && fw.length >= 3 && words.includes(fw) })
    if (!m) m = (clientList || []).find(c => (c.short_name && c.short_name.length >= 3 && raw.includes(c.short_name.toLowerCase())) || (c.name && raw.includes(c.name.toLowerCase())))
    return m ? (m.short_name || m.name) : ''
  }

  const now = new Date()
  // v4.1.5 fix: -30 nap, hogy a múltbeli/átnevezett GCal események is benne legyenek a fetchben,
  // különben a lenti cleanup (activeIds) cancelled-ként törli a régi kártyákat (deleted:9 incidens)
  // v4.3.5: opcionális ?since=YYYY-MM-DD egyszeri visszamenőleges behíváshoz (a normál cron marad -30 nap).
  const sinceValid = opts.since && /^\d{4}-\d{2}-\d{2}$/.test(opts.since)
  const timeMin = sinceValid
    ? new Date(opts.since + 'T00:00:00Z').toISOString()
    : new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString()
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

  let created = 0, updated = 0, deleted = 0

  for (const cal of CALS) {
    const staffMember = (staffList || []).find(s => s.init === cal.init)
    if (!staffMember) continue

    const r = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(cal.id) + '/events' +
      '?timeMin=' + encodeURIComponent(timeMin) + '&timeMax=' + encodeURIComponent(timeMax) +
      '&singleEvents=true&orderBy=startTime&maxResults=2500',
      { headers: { Authorization: 'Bearer ' + token } }
    )
    if (!r.ok) {
      const err = await r.text()
      console.error('[sync] GCal error', cal.init, r.status, err.slice(0, 200))
      continue
    }
    const body = await r.json()
    const items = body.items || []

    // FONTOS: csak EHHEZ A FOTOSHOZ tartozo GCal kartyakat nezzuk,
    // kulonben a masik fotos kartyait kitorolnenk.
    const { data: existingRows } = await supabase
      .from('cards')
      .select('id, gcal_id, card_date, card_time, booking_end_time, title, addr, client_name, card_team!inner(staff_id)')
      .eq('is_gcal', true)
      .not('gcal_id', 'is', null)
      .eq('card_team.staff_id', staffMember.id)

    const existingMap = {}
    for (const c of existingRows || []) existingMap[c.gcal_id] = c

    // v4.1.6 dedup: a /api/booking/create által felvitt foglalás-kártyák is_gcal=FALSE-szal
    // jönnek létre, de van gcal_id-juk. A fenti existingMap csak is_gcal=true-t néz, ezért a
    // sync nem ismerné fel őket és DUPLIKÁLNA. Ezért külön lekérjük az ÖSSZES gcal_id-t
    // (is_gcal-tól függetlenül) ehhez a fotóshoz, és insert előtt ellenőrizzük.
    const { data: anyRows } = await supabase
      .from('cards')
      .select('id, gcal_id, is_gcal, card_date, card_time, booking_end_time, booking_address, addr, client_name, card_team!inner(staff_id)')
      .not('gcal_id', 'is', null)
      .eq('card_team.staff_id', staffMember.id)
    const knownGcalIds = new Set((anyRows || []).map(r => r.gcal_id))
    const knownMap = {}
    for (const r of anyRows || []) knownMap[r.gcal_id] = r

    const activeIds = new Set()
    const activeEvents = {}
    const nrm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

    for (const ev of items) {
      if (ev.status === 'cancelled') continue
      if (!ev.start || !ev.start.dateTime) continue // csak idopontos esemenyek

      const gcal_id = ev.id
      const date = berlinDate(ev.start.dateTime)
      const time = berlinHHMM(ev.start.dateTime)
      const endTime = ev.end && ev.end.dateTime ? berlinHHMM(ev.end.dateTime) : null
      activeIds.add(gcal_id)
      activeEvents[gcal_id] = { gcal_id, date, time, endTime, location: ev.location || '', client: guessClient(ev.summary || '') || '' }

      const ex = existingMap[gcal_id]
      if (ex) {
        const exTime = (ex.card_time || '').slice(0, 5)
        const exEndTime = (ex.booking_end_time || '').slice(0, 5)
        const newTitle = ev.summary || date
        const newAddr = ev.location || ''
        const newClient = guessClient(ev.summary || '')
        // client_name csak akkor frissül, ha találtunk és változott (üreset nem írunk felül)
        const clientChanged = newClient && newClient !== (ex.client_name || '')
        // Frissítés, ha BÁRMELYIK mező változott (dátum, idő, név, cím, vég-idő, ügyfél)
        if (
          ex.card_date !== date ||
          exTime !== time ||
          exEndTime !== (endTime || '').slice(0, 5) ||
          (ex.title || '') !== newTitle ||
          (ex.addr || '') !== newAddr ||
          clientChanged
        ) {
          const upd = {
            card_date: date, card_time: time, booking_end_time: endTime,
            title: newTitle, addr: newAddr,
            updated_at: new Date().toISOString(),
          }
          if (clientChanged) upd.client_name = newClient
          await supabase.from('cards').update(upd).eq('id', ex.id)
          updated++
        }
      } else {
        // v4.1.6: ha ezt a gcal_id-t már egy (pl. is_gcal=false foglalás-) kártya hordozza,
        // NE hozzunk létre duplikátot — DE az időpontot szinkronizáljuk a naptárból
        // (a foglalás címét/ügyfelét NEM írjuk felül, csak a dátum/idő/vég-időt).
        if (knownGcalIds.has(gcal_id)) {
          const bk = knownMap[gcal_id]
          if (bk && !bk.is_gcal) {
            const bkTime = (bk.card_time || '').slice(0, 5)
            const bkEnd = (bk.booking_end_time || '').slice(0, 5)
            if (bk.card_date !== date || bkTime !== time || bkEnd !== (endTime || '').slice(0, 5)) {
              await supabase.from('cards').update({
                card_date: date, card_time: time, booking_end_time: endTime,
                updated_at: new Date().toISOString(),
              }).eq('id', bk.id)
              updated++
            }
          }
          continue
        }
        const ins = await supabase.from('cards').insert({
          column_id: shootingsCol.id,
          title: ev.summary || date,
          addr: ev.location || '',
          card_date: date,
          card_time: time,
          booking_end_time: endTime,
          client_name: guessClient(ev.summary || '') || null,
          is_gcal: true, is_todo: false, price: 0, position: 9999, note: '', gcal_id,
        }).select('id').single()
        if (ins.data && ins.data.id) {
          await insCl(supabase, ins.data.id, '')
          await supabase.from('card_team').insert({ card_id: ins.data.id, staff_id: staffMember.id })
          created++
        }
      }
    }

    // Tartalom-alapú dedup: árva foglalás-kártya (is_gcal=false, de a gcal_id-ja már nem él,
    // mert a naptári esemény id-je megváltozott — pl. törlés+újra létrehozás vagy másik naptárba
    // húzás) + ugyanarra a CÍMRE+ÜGYFÉLRE egy AKTÍV esemény → ez ugyanaz a fotózás. A foglalás-
    // kártyát rálinkeljük az új eseményre (új időpont + új gcal_id), és a duplikált GCal-kártyát
    // (ha létrejött erre az eseményre) töröljük. Így egy kártya marad, a HELYES idővel.
    const usedEv = new Set()
    for (const bk of (anyRows || [])) {
      if (bk.is_gcal || !bk.gcal_id) continue        // csak foglalás-kártya (is_gcal=false)
      if (activeIds.has(bk.gcal_id)) continue          // még él az eseménye → rendben, nem árva
      const bkAddr = nrm(bk.booking_address || bk.addr)
      if (!bkAddr) continue
      const bkClient = nrm(bk.client_name)
      const ev2 = Object.values(activeEvents).find(e =>
        !usedEv.has(e.gcal_id) &&
        nrm(e.location) === bkAddr &&
        (!bkClient || !e.client || nrm(e.client) === bkClient))
      if (!ev2) continue
      usedEv.add(ev2.gcal_id)
      await supabase.from('cards').update({
        card_date: ev2.date, card_time: ev2.time, booking_end_time: ev2.endTime,
        gcal_id: ev2.gcal_id, updated_at: new Date().toISOString(),
      }).eq('id', bk.id)
      // a duplikált is_gcal kártyát erre az eseményre töröljük (a foglalás-kártya viszi tovább)
      await supabase.from('cards').delete().eq('gcal_id', ev2.gcal_id).eq('is_gcal', true).neq('id', bk.id)
      updated++; deleted++
    }

    for (const gcal_id of Object.keys(existingMap)) {
      if (!activeIds.has(gcal_id)) {
        await supabase.from('cards').delete().eq('id', existingMap[gcal_id].id)
        deleted++
      }
    }
  }

  return { ok: true, created, updated, deleted }
}

function readSince(req) {
  try { return new URL(req.url).searchParams.get('since') || undefined } catch { return undefined }
}
export async function POST(req) { return NextResponse.json(await doSync({ since: readSince(req) })) }
export async function GET(req) { return NextResponse.json(await doSync({ since: readSince(req) })) }
