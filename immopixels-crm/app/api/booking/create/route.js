import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req) {
  // Lazy imports to avoid build-time execution
  const { createClient } = await import('@supabase/supabase-js')
  const { getDaySlots, pickLeastBusyProvider } = await import('@/lib/booking/slots')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400, headers: CORS }) }

  const { serviceId, date, time, address, plz, lat, lng,
          customerName, customerEmail, customerPhone, note } = body

  if (!serviceId || !date || !time || !address || !customerName || !customerEmail)
    return NextResponse.json({ error: 'missing required fields' }, { status: 400, headers: CORS })

  const slots = await getDaySlots(serviceId, date)
  const slot = slots.find(s => s.time === time)
  if (!slot) return NextResponse.json({ error: 'slot unavailable' }, { status: 409, headers: CORS })

  const staffInit = await pickLeastBusyProvider(slot.providers, date)

  const { data: svc } = await supabase.from('booking_services').select('*').eq('id', serviceId).single()
  if (!svc) return NextResponse.json({ error: 'service not found' }, { status: 404, headers: CORS })

  const startMin = toMin(time)
  const endMin = startMin + svc.duration_min
  const endTime = toHHMM(endMin)

  const { data: col } = await supabase.from('columns').select('id').ilike('title', '%shooting%').limit(1).maybeSingle()

  const { data: card, error: cardErr } = await supabase.from('cards').insert({
    title: `${svc.name} — ${address.split(',')[0]}`,
    card_type: svc.category?.includes('video') ? 'reel' : 'foto',
    card_date: date,
    card_time: time,
    column_id: col?.id ?? null,
    client_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone || null,
    description: note || null,
    booking_service_id: serviceId,
    booking_address: address,
    booking_plz: plz || null,
    booking_lat: lat || null,
    booking_lng: lng || null,
    booking_end_time: endTime,
    booking_source: 'online',
    addr: address,
    is_gcal: false,
    is_todo: false,
    price: svc.price || 0,
    position: 9999,
  }).select('id').single()

  if (cardErr) return NextResponse.json({ error: 'save error' }, { status: 500, headers: CORS })

  await supabase.from('card_team').insert({ card_id: card.id, staff_init: staffInit })

  // Email
  try {
    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_IMAP_HOST,
      port: 465, secure: true,
      auth: { user: process.env.EMAIL_IMAP_USER, pass: process.env.EMAIL_IMAP_PASS }
    })
    const from = `"ImmoPixels" <${process.env.EMAIL_IMAP_USER}>`
    await transporter.sendMail({
      from, to: customerEmail,
      subject: 'Ihr Termin bei ImmoPixels ist bestätigt',
      html: `<p>Hallo ${customerName},</p><p>Ihr Termin am ${date} um ${time} Uhr wurde gebucht.</p><p>Adresse: ${address}</p><p>Leistung: ${svc.name}</p>`
    })
    await transporter.sendMail({
      from, to: process.env.EMAIL_IMAP_USER,
      subject: `Neue Buchung: ${svc.name} — ${address.split(',')[0]}`,
      html: `<p>Fotograf: ${staffInit}</p><p>${date} ${time} · ${svc.name}</p><p>${address}</p><p>Kunde: ${customerName} · ${customerEmail}</p>`
    })
  } catch(e) { console.warn('email failed', e.message) }

  return NextResponse.json({ ok: true, cardId: card.id, status: 'approved', assignedTo: staffInit }, { headers: CORS })
}

function toMin(t) { const [h,m] = t.split(':'); return +h*60 + +m }
function toHHMM(min) { return `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}` }
