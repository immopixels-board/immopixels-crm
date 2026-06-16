import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { doSync } from '../../gcal/sync/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'
export const maxDuration = 30

// Throttle: a publikus /cal max. percenként indít GCal-syncet (warm instance-onként)
let lastPublicSync = 0

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}
// PostgREST .or() értékekben a vessző/zárójel elválasztó — ezeket kiszűrjük a kulcsból
function clean(s) { return String(s || '').replace(/[(),%*]/g, ' ').trim() }

// GET /api/public-cal/<kulcs>  — nyilvános, CSAK az adott ügyfél (Kürzel/Név) fotózásai.
// Csak olvasás, csak biztonságos mezők (dátum, idő, cím, típus, cím). Semmilyen írás.
export async function GET(req, { params }) {
  const key = clean(decodeURIComponent(params.key || ''))
  if (!key) return NextResponse.json({ ok: false, error: 'no key' }, { status: 400 })

  const supabase = sb()
  const { data: clients } = await supabase.from('clients')
    .select('id, name, short_name')
    .or(`short_name.ilike.${key},name.ilike.${key}`)
    .limit(1)
  const client = clients && clients[0]
  if (!client) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 })

  // Élő frissítés a Google Naptárból betöltéskor (throttle: max 60 mp), hogy a /cal a TÉNYLEGES
  // naptári időpontokat mutassa akkor is, ha a board nincs nyitva. Hiba nem törheti el az oldalt.
  try {
    if (Date.now() - lastPublicSync > 60000) {
      lastPublicSync = Date.now()
      await doSync()
    }
  } catch (e) { console.error('[public-cal] sync skip:', e?.message) }

  const names = [client.short_name, client.name].filter(Boolean).map(clean)
  const orExpr = names.map(n => `client_name.ilike.${n}`).join(',')

  const { data: cards } = await supabase.from('cards')
    .select('id, title, card_date, card_time, card_time_to, booking_end_time, addr, booking_address, card_type, card_team(staff_id)')
    .is('deleted_at', null)
    .not('card_date', 'is', null)
    .or(orExpr)
    .order('card_date', { ascending: true })

  // fotós(ok) feloldása a card_team-ből (kivel van a fotózás)
  const { data: staff } = await supabase.from('staff').select('id, name, init')
  const staffById = Object.fromEntries((staff || []).map(s => [s.id, s]))

  const clientLabel = client.short_name || client.name || ''
  const shoots = (cards || [])
    .filter(c => c.card_type !== 'todo')
    .map(c => {
      const people = (c.card_team || []).map(t => staffById[t.staff_id]).filter(Boolean)
      const photographer = people.map(p => p.name || p.init).join(', ')
      const addr = c.booking_address || c.addr || ''
      // egységes, helyes cím MINDEN fotózásra (régi és új kártya is): "Kunde - Adresse"
      const cleanTitle = addr ? (clientLabel ? `${clientLabel} - ${addr}` : addr) : (c.title || '')
      return {
        id: c.id,
        title: cleanTitle,
        date: c.card_date,
        time: (c.card_time || '').slice(0, 5),
        timeTo: (c.card_time_to || c.booking_end_time || '').slice(0, 5),
        address: addr,
        type: c.card_type || '',
        photographer,
        photographerShort: people.map(p => (p.name || p.init || '').split(' ')[0]).join(', '),
      }
    })

  return NextResponse.json({ ok: true, client: { name: client.short_name || client.name }, shoots })
}
