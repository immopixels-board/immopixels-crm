import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30
const MAIN_CAL = 'immopixels@gmail.com'
const BOOKING_EMAIL = 'booking@immopixels.de'

export async function POST(req) {
  const { createClient } = await import('@supabase/supabase-js')
  const { getGoogleToken, GCAL_IDS } = await import('@/lib/booking/slots')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  let body; try { body = await req.json() } catch { return NextResponse.json({error:'bad json'},{status:400}) }
  const { token } = body
  if (!token) return NextResponse.json({ error:'token required' }, { status:400 })

  const { data: card } = await supabase.from('cards').select('*').eq('booking_token', token).maybeSingle()
  if (!card) return NextResponse.json({ error:'not found' }, { status:404 })
  if (card.booking_status === 'cancelled') return NextResponse.json({ ok:true, already:true })

  const cancelUpd = { booking_status:'cancelled', cancelled_at: new Date().toISOString() }
  if (body.cancelledByStaffId) cancelUpd.cancelled_by = body.cancelledByStaffId
  await supabase.from('cards').update(cancelUpd).eq('id', card.id)

  // melyik naptárban van az esemény = a hozzárendelt fotós naptára
  const { data: teamRow } = await supabase.from('card_team').select('staff:staff_id(init)').eq('card_id', card.id).maybeSingle()
  const CAL = GCAL_IDS[teamRow?.staff?.init] || MAIN_CAL

  // GCal esemény törlése
  try {
    const gToken = await getGoogleToken()
    if (gToken && card.gcal_id) {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CAL)}/events/${card.gcal_id}`, {
        method:'DELETE', headers:{Authorization:'Bearer '+gToken}
      })
    }
  } catch(e) { console.error('[cancel] gcal', e.message) }

  // Értesítés a csapatnak
  try {
    const nodemailer = await import('nodemailer')
    const t = nodemailer.default.createTransport({ host:process.env.EMAIL_IMAP_HOST, port:465, secure:true, auth:{user:process.env.EMAIL_IMAP_USER,pass:process.env.EMAIL_IMAP_PASS} })
    const dateFmt = new Date(card.card_date+'T12:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})
    await t.sendMail({
      from:`"ImmoPixels Buchung" <${process.env.EMAIL_IMAP_USER}>`, to:BOOKING_EMAIL,
      subject:`Storniert: ${card.title} (${dateFmt})`,
      html:`<div style="font-family:Arial,sans-serif"><p>Ein Termin wurde storniert:</p>
        <p><strong>${card.title}</strong><br>${dateFmt} ${String(card.card_time).slice(0,5)}<br>${card.client_name} · ${card.customer_email}</p></div>`
    })
  } catch(e) { console.error('[cancel] email', e.message) }

  return NextResponse.json({ ok:true })
}
