import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30
const MAIN_CAL = 'immopixels@gmail.com'

export async function POST(req) {
  const { createClient } = await import('@supabase/supabase-js')
  const { getGoogleToken, GCAL_IDS } = await import('@/lib/booking/slots')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  let body; try { body = await req.json() } catch { return NextResponse.json({error:'bad json'},{status:400}) }
  const { token } = body
  if (!token) return NextResponse.json({ error:'token required' }, { status:400 })

  const { data: card } = await supabase.from('cards').select('*').eq('booking_token', token).maybeSingle()
  if (!card) return NextResponse.json({ error:'not found' }, { status:404 })

  // melyik naptárban van az esemény = a hozzárendelt fotós naptára
  const { data: teamRow } = await supabase.from('card_team').select('staff:staff_id(init)').eq('card_id', card.id).maybeSingle()
  const CAL = GCAL_IDS[teamRow?.staff?.init] || MAIN_CAL

  // GCal esemény törlése (ha még megvan)
  try {
    const gToken = await getGoogleToken()
    if (gToken && card.gcal_id) {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CAL)}/events/${card.gcal_id}`, {
        method:'DELETE', headers:{Authorization:'Bearer '+gToken}
      })
    }
  } catch(e) { console.error('[delete] gcal', e.message) }

  // Kártya soft-delete (kukába, visszaállítható) — a CRM konvenciója szerint
  const { error } = await supabase.from('cards')
    .update({ deleted_at: new Date().toISOString(), deleted_by: 'Buchung-Admin' })
    .eq('id', card.id)
  if (error) return NextResponse.json({ error: error.message }, { status:500 })

  return NextResponse.json({ ok:true })
}
