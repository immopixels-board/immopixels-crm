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
  const { token, cardId } = body
  if (!token && !cardId) return NextResponse.json({ error:'token or cardId required' }, { status:400 })

  const { data: card } = await (token
    ? supabase.from('cards').select('*').eq('booking_token', token).maybeSingle()
    : supabase.from('cards').select('*').eq('id', cardId).maybeSingle())
  if (!card) return NextResponse.json({ error:'not found' }, { status:404 })
  if (card.booking_status === 'confirmed') return NextResponse.json({ ok:true, already:true })

  // melyik naptárban van az esemény = a hozzárendelt fotós naptára
  const { data: teamRow } = await supabase.from('card_team').select('staff:staff_id(init)').eq('card_id', card.id).maybeSingle()
  const CAL = GCAL_IDS[teamRow?.staff?.init] || MAIN_CAL

  // Megerősítéskor: státusz + áthelyezés a Shootings oszlopba + lábnyom
  // v4.1.6: a KRITIKUS státusz-írás külön, ellenőrzött lépés. Korábban a
  // booking_status+confirmed_by+column_id egy kötegben ment, és ha bármelyik
  // mező hibázott, az EGÉSZ update némán elbukott → a status pending maradt.
  const { error: stErr } = await supabase.from('cards')
    .update({ booking_status:'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', card.id)
  if (stErr) {
    console.error('[confirm] status update FAILED', stErr.message)
    return NextResponse.json({ ok:false, error:'status update failed: '+stErr.message }, { status:500 })
  }
  // Opcionális mezők best-effort (ne blokkolják a státuszt, ha hibáznak)
  try {
    const { data: shootCol } = await supabase.from('columns').select('id').ilike('title', '%shooting%').limit(1).maybeSingle()
    const extra = {}
    if (body.confirmedByStaffId) extra.confirmed_by = body.confirmedByStaffId
    if (shootCol?.id) extra.column_id = shootCol.id
    if (Object.keys(extra).length) {
      const { error: exErr } = await supabase.from('cards').update(extra).eq('id', card.id)
      if (exErr) console.error('[confirm] optional update failed (status OK)', exErr.message)
    }
  } catch(e) { console.error('[confirm] optional update threw', e.message) }

  // GCal: [AUSSTEHEND] → [BESTÄTIGT] cím frissítés
  try {
    const gToken = await getGoogleToken()
    if (gToken && card.gcal_id) {
      const getR = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CAL)}/events/${card.gcal_id}`, { headers:{Authorization:'Bearer '+gToken} })
      if (getR.ok) {
        const ev = await getR.json()
        const newSummary = (ev.summary||'').replace('[AUSSTEHEND]','[BESTÄTIGT]')
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CAL)}/events/${card.gcal_id}`, {
          method:'PATCH', headers:{Authorization:'Bearer '+gToken,'Content-Type':'application/json'},
          body: JSON.stringify({ summary:newSummary })
        })
      }
    }
  } catch(e) { console.error('[confirm] gcal', e.message) }

  // Ügyfél megerősítő email
  try {
    const nodemailer = await import('nodemailer')
    const t = nodemailer.default.createTransport({ host:process.env.EMAIL_IMAP_HOST, port:465, secure:true, auth:{user:process.env.EMAIL_IMAP_USER,pass:process.env.EMAIL_IMAP_PASS} })
    const dateFmt = new Date(card.card_date+'T12:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})
    await t.sendMail({
      from:`"ImmoPixels" <${process.env.EMAIL_IMAP_USER}>`, to:card.customer_email,
      subject:'Ihr Termin bei ImmoPixels ist bestätigt',
      html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#2a2a28;line-height:1.6">
        <p>Hallo ${card.client_name},</p>
        <p>Ihr Termin am <strong>${dateFmt} ${String(card.card_time).slice(0,5)} Uhr</strong> an der Adresse
        <a href="https://maps.google.com/?q=${encodeURIComponent(card.booking_address||'')}">${card.booking_address||''}</a> wurde <strong>bestätigt</strong>.</p>
        <p>Wir freuen uns auf den Termin!</p>
        <p style="margin-top:20px">Freundliche Grüße<br><strong>ImmoPixels</strong></p>
        <hr style="border:none;border-top:1px solid #e6ddc9;margin:16px 0">
        <p style="font-size:12px;color:#888"><a href="https://www.immopixels.de">www.immopixels.de</a> · Tel: +49 176 415 76629</p>
      </div>`
    })
  } catch(e) { console.error('[confirm] email', e.message) }

  return NextResponse.json({ ok:true })
}
