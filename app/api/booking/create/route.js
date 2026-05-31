import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
const MAIN_CAL = 'immopixels@gmail.com'
const CRM_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://immopixels-crm.vercel.app'
const BOOKING_EMAIL = 'booking@immopixels.de'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

function toMin(t) { const [h,m] = t.split(':'); return +h*60 + +m }
function toHHMM(min) { return `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}` }
function token() { return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) }

const PHOTOG_NAME = { CD: 'Cristian Dina', DB: 'Daniel Bene' }

export async function POST(req) {
  const { createClient } = await import('@supabase/supabase-js')
  const { getDaySlots, pickLeastBusyProvider, getGoogleToken } = await import('@/lib/booking/slots')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400, headers: CORS }) }

  const { serviceId, date, time, address, plz, lat, lng,
          customerName, customerEmail, customerPhone, note,
          immoOffice, addon360, addonDrone } = body

  if (!serviceId || !date || !time || !address || !customerName || !customerEmail)
    return NextResponse.json({ error: 'missing required fields' }, { status: 400, headers: CORS })

  const addonMin = (addon360 ? 30 : 0) + (addonDrone ? 15 : 0)

  // Élő ellenőrzés: tényleg szabad-e még a slot (+ utazás-tudatos warn)
  const slots = await getDaySlots(serviceId, date, addonMin, null, address)
  const slot = slots.find(s => s.time === time)
  if (!slot) return NextResponse.json({ error: 'slot unavailable' }, { status: 409, headers: CORS })
  const travelTight = !!slot.warn

  const staffInit = await pickLeastBusyProvider(slot.providers, date)
  const photographer = PHOTOG_NAME[staffInit] || staffInit

  const { data: svc } = await supabase.from('booking_services').select('*').eq('id', serviceId).single()
  if (!svc) return NextResponse.json({ error: 'service not found' }, { status: 404, headers: CORS })

  const startMin = toMin(time)
  const endTime = toHHMM(startMin + svc.duration_min + addonMin)
  const bookingToken = token()

  const addons = []
  if (addon360) addons.push('360°-Tour (+30 Min.)')
  if (addonDrone) addons.push('Drohnenaufnahmen (+15 Min.)')

  const noteFull = [
    note || '',
    immoOffice ? `Immobilienbüro: ${immoOffice}` : '',
    addons.length ? `Zusätzliche Leistungen: ${addons.join(', ')}` : '',
  ].filter(Boolean).join('\n')

  const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(address)}`

  // ── Google Calendar esemény a FŐ naptárba ──
  let gcalId = null
  try {
    const gToken = await getGoogleToken()
    if (gToken) {
      const startISO = `${date}T${time}:00`
      const endISO = `${date}T${endTime}:00`
      const desc = [
        `Immobilienbüro: ${immoOffice || '—'}`,
        `Name: ${customerName}`,
        `Email: ${customerEmail}`,
        `Telefon: ${customerPhone || '—'}`,
        `Leistung: ${svc.name}`,
        addons.length ? `Zusätzliche Leistungen: ${addons.join(', ')}` : '',
        ``,
        `Zusätzliche Info:`,
        note || '—',
        ``,
        `— Online-Buchung (Status: ausstehend) —`,
      ].filter(x => x !== undefined).join('\n')

      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(MAIN_CAL)}/events`,
        {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + gToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: `[AUSSTEHEND] ${svc.name} — ${customerName}${immoOffice ? ' / ' + immoOffice : ''}`,
            location: address,
            description: desc,
            start: { dateTime: startISO, timeZone: 'Europe/Berlin' },
            end: { dateTime: endISO, timeZone: 'Europe/Berlin' },
          }),
        }
      )
      if (r.ok) { gcalId = (await r.json()).id }
      else console.error('[create] gcal insert failed', r.status, (await r.text()).slice(0,200))
    }
  } catch (e) { console.error('[create] gcal error', e.message) }

  // ── CRM kártya (pending) ──
  // Új online foglalás a "Booking" oszlopba kerül; megerősítés után megy a Shootings-ba
  const { data: col } = await supabase.from('columns').select('id').ilike('title', 'booking').limit(1).maybeSingle()
  const { data: card, error: cardErr } = await supabase.from('cards').insert({
    title: `${svc.name} — ${customerName}`,
    card_type: (svc.category || '').toLowerCase().includes('video') ? 'reel' : 'foto',
    card_date: date,
    card_time: time,
    column_id: col?.id ?? null,
    client_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone || null,
    description: noteFull || null,
    booking_service_id: serviceId,
    addon_360: !!addon360,
    addon_drone: !!addonDrone,
    booking_address: address,
    booking_plz: plz || null,
    booking_lat: lat || null,
    booking_lng: lng || null,
    booking_end_time: endTime,
    booking_source: 'online',
    booking_status: 'pending',
    booking_token: bookingToken,
    gcal_id: gcalId,
    addr: address,
    is_gcal: false,
    is_todo: false,
    price: 0,
    position: 9999,
  }).select('id').single()

  if (cardErr) { console.error('[create] card insert', cardErr.message); return NextResponse.json({ error: 'save error' }, { status: 500, headers: CORS }) }

  const { data: staffRow } = await supabase.from('staff').select('id').eq('init', staffInit).maybeSingle()
  if (staffRow?.id) await supabase.from('card_team').insert({ card_id: card.id, staff_id: staffRow.id })

  // ── Emailek ──
  try {
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport({
      host: process.env.EMAIL_IMAP_HOST, port: 465, secure: true,
      auth: { user: process.env.EMAIL_IMAP_USER, pass: process.env.EMAIL_IMAP_PASS }
    })
    const fromTeam = `"ImmoPixels Buchung" <${process.env.EMAIL_IMAP_USER}>`
    const dateFmt = new Date(date+'T12:00').toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
    const confirmUrl = `${CRM_URL}/termin-bestaetigen?token=${bookingToken}`
    const manageUrl = `${CRM_URL}/buchung/${bookingToken}`

    // 1) Csapatnak (booking@)
    await transporter.sendMail({
      from: fromTeam, to: BOOKING_EMAIL, replyTo: customerEmail,
      subject: `Neuer Termin: ${svc.name} — ${customerName} (${dateFmt} ${time})`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#2a2a28">
          <p>Hallo ${photographer},</p>
          <p>du hast einen neuen Termin für <strong>${svc.name}</strong>.</p>
          <p><strong>Datum:</strong> ${dateFmt} ${time}<br>
          <strong>Immobilienbüro:</strong> ${immoOffice || '—'}<br>
          <strong>Name:</strong> ${customerName}<br>
          <strong>Email:</strong> <a href="mailto:${customerEmail}">${customerEmail}</a><br>
          <strong>Telefon:</strong> ${customerPhone || '—'}<br>
          <strong>Shooting Ort:</strong> <a href="${mapsLink}">${address}</a></p>
          <p><strong>Zusätzliche Info:</strong><br>${(note||'—').replace(/\n/g,'<br>')}</p>
          <p><strong>Zusätzliche Leistungen:</strong> ${addons.length?addons.join(', '):'—'}</p>
          ${travelTight ? '<p style="background:#fffbf0;border:1px solid #f0d9a8;border-radius:8px;padding:10px;color:#b8892a"><strong>⚠ Hinweis:</strong> Dieser Termin ist wegen der Anfahrt zwischen anderen Terminen knapp. Bitte Machbarkeit prüfen.</p>' : ''}
          <p style="margin-top:24px">
            <a href="${confirmUrl}" style="display:inline-block;background:#b8892a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">Termin bestätigen</a>
          </p>
        </div>`
    })

    // 2) Ügyfélnek (in Prüfung)
    await transporter.sendMail({
      from: fromTeam, to: customerEmail,
      subject: `Ihre Terminanfrage bei ImmoPixels — ${svc.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#2a2a28;line-height:1.6">
          <p>Hallo ${customerName},</p>
          <p>vielen Dank für Ihre Terminanfrage.</p>
          <p>Der Termin für <strong>${svc.name}</strong> mit ${photographer} am <strong>${dateFmt} ${time}</strong> an der Adresse
          <a href="${mapsLink}">${address}</a> befindet sich derzeit in Prüfung.</p>
          <p>Wir überprüfen die Verfügbarkeit und senden Ihnen im Anschluss eine Bestätigung per E-Mail.</p>
          <p>Bei Fragen erreichen Sie uns jederzeit per WhatsApp oder telefonisch unter<br>+49 176 41676629.</p>
          <p>Ihren Termin können Sie hier einsehen oder stornieren:<br>
          <a href="${manageUrl}">${manageUrl}</a></p>
          <p style="margin-top:20px">Freundliche Grüße<br><strong>ImmoPixels</strong><br>für die perfekte Vermarktung</p>
          <hr style="border:none;border-top:1px solid #e6ddc9;margin:16px 0">
          <p style="font-size:12px;color:#888">
            <a href="https://www.immopixels.de">www.immopixels.de</a><br>
            Tel: +49 176 415 76629 · <a href="mailto:info@immopixels.de">info@immopixels.de</a>
          </p>
        </div>`
    })
  } catch(e) { console.error('[create] email failed', e.message) }

  return NextResponse.json({ ok: true, cardId: card.id, status: 'pending', assignedTo: staffInit, token: bookingToken }, { headers: CORS })
}
