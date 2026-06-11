import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

  const names = [client.short_name, client.name].filter(Boolean).map(clean)
  const orExpr = names.map(n => `client_name.ilike.${n}`).join(',')

  const { data: cards } = await supabase.from('cards')
    .select('id, title, card_date, card_time, card_time_to, booking_end_time, addr, booking_address, card_type')
    .is('deleted_at', null)
    .not('card_date', 'is', null)
    .or(orExpr)
    .order('card_date', { ascending: true })

  const shoots = (cards || [])
    .filter(c => c.card_type !== 'todo')
    .map(c => ({
      id: c.id,
      title: c.title || '',
      date: c.card_date,
      time: (c.card_time || '').slice(0, 5),
      timeTo: (c.card_time_to || c.booking_end_time || '').slice(0, 5),
      address: c.booking_address || c.addr || '',
      type: c.card_type || '',
    }))

  return NextResponse.json({ ok: true, client: { name: client.short_name || client.name }, shoots })
}
