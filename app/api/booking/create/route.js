// ════════════════════════════════════════════════════════════════════
// app/api/booking/create/route.js
// POST /api/booking/create
// 1. auto-assign legkevésbé terhelt fotós
// 2. dinamikus buffer: Google Routes API a szomszéd foglalások címei közt
// 3. status döntés: approved (befér) | pending (szoros/ütközik)
// 4. cards insert (CRM board) + card_team + Resend email
// ════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getDaySlots, pickLeastBusyProvider } from '@/lib/booking/slots'
import { getTravelMinutes } from '@/lib/booking/travel'

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

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const SLACK = 10 // perc ráhagyás az útidőre (jövőbeli forgalom bizonytalanság)

function toMin(t){const[h,m]=t.split(':');return +h*60+ +m}
function toHHMM(min){const h=Math.floor(min/60),m=min%60;return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`}

export async function POST(req) {
  const supabase = getSupabase()
  let body
  try { body = await req.json() } catch { return bad('érvénytelen JSON') }

  const { serviceId, date, time, address, plz, lat, lng,
          customerName, customerEmail, customerPhone, note } = body

  if (!serviceId || !date || !time || !address || !customerName || !customerEmail)
    return bad('hiányzó kötelező mező')

  // ── 1. slot még szabad? + jelölt fotósok ──────────────────────────
  const slots = await getDaySlots(serviceId, date)
  const slot = slots.find(s => s.time === time)
  if (!slot) return bad('ez az időpont időközben elkelt', 409)

  const staffInit = await pickLeastBusyProvider(slot.providers, date)

  // ── 2. service adatok ─────────────────────────────────────────────
  const { data: svc } = await supabase
    .from('booking_services').select('*').eq('id', serviceId).single()
  const startMin = toMin(time)
  const endMin = startMin + svc.duration_min
  const endTime = toHHMM(endMin)

  // ── 3. dinamikus buffer: szomszéd foglalások az adott fotósnál ─────
  const { data: neighbors } = await supabase
    .from('cards')
    .select('time, booking_end_time, booking_address, booking_lat, booking_lng, card_team!inner(staff_init)')
    .eq('date', date)
    .eq('card_team.staff_init', staffInit)
    .not('time', 'is', null)

  const departISO = new Date(`${date}T${time}:00`).toISOString()
  let status = 'approved'
  let conflictNote = null

  const prev = (neighbors||[])
    .filter(n => n.booking_end_time && toMin(n.booking_end_time) <= startMin)
    .sort((a,b)=>toMin(b.booking_end_time)-toMin(a.booking_end_time))[0]
  const next = (neighbors||[])
    .filter(n => n.time && toMin(n.time) >= endMin)
    .sort((a,b)=>toMin(a.time)-toMin(b.time))[0]

  // előző shooting → ide elérek-e időben?
  if (prev) {
    const tm = await safeTravel(
      { lat: prev.booking_lat, lng: prev.booking_lng, address: prev.booking_address },
      { lat, lng, address }, departISO)
    if (tm != null) {
      const gap = startMin - toMin(prev.booking_end_time)
      if (gap < tm + SLACK) {
        status = 'pending'
        conflictNote = `Előző helyszínről ~${tm} perc út, csak ${gap} perc a rés`
      }
    }
  }
  // innen → következő shootinghoz odaérek-e?
  if (next && status === 'approved') {
    const tm = await safeTravel(
      { lat, lng, address },
      { lat: next.booking_lat, lng: next.booking_lng, address: next.booking_address }, departISO)
    if (tm != null) {
      const gap = toMin(next.time) - endMin
      if (gap < tm + SLACK) {
        status = 'pending'
        conflictNote = `Következő helyszínre ~${tm} perc út, csak ${gap} perc a rés`
      }
    }
  }

  // ── 4. cards insert ───────────────────────────────────────────────
  // a board "Beérkező" oszlopába; column_id-t igazítsd a CRM-edhez
  const { data: col } = await supabase
    .from('columns').select('id').ilike('name', '%booking%').limit(1).maybeSingle()

  const cardTitle = `${svc.name} — ${address.split(',')[0]}`
  const { data: card, error: cardErr } = await supabase
    .from('cards')
    .insert({
      title: cardTitle,
      type: svc.category.includes('video') ? 'reel' : 'foto',
      date, time,
      column_id: col?.id ?? null,
      status,
      client: customerName,
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
      created_at: new Date().toISOString(),
    })
    .select('id').single()

  if (cardErr) { console.error(cardErr); return bad('mentési hiba', 500) }

  // fotós hozzárendelés
  await supabase.from('card_team').insert({ card_id: card.id, staff_init: staffInit })

  // ügyfél domain matching → client_name auto-fill
  if (customerEmail) {
    const domain = customerEmail.split('@')[1]
    // Check booking_customers exact match
    const { data: bc } = await supabase
      .from('booking_customers')
      .select('name, company, client_id')
      .eq('email', customerEmail)
      .maybeSingle()
    
    if (bc) {
      // Known customer — update card with client info
      await supabase.from('booking_customers')
        .update({ amelia_id: null }) // touch to update
        .eq('email', customerEmail)
      
      // Find client by domain if not directly linked
      let clientName = bc.company || bc.name
      if (!bc.client_id && domain) {
        const { data: cl } = await supabase
          .from('clients')
          .select('id, short_name, name')
          .eq('email_domain', domain)
          .maybeSingle()
        if (cl) clientName = cl.short_name || cl.name
      }
      if (clientName) {
        await supabase.from('cards').update({ client_name: clientName }).eq('id', card.id)
      }
    } else if (domain) {
      // Unknown customer — try domain match
      const { data: cl } = await supabase
        .from('clients')
        .select('id, short_name, name')
        .eq('email_domain', domain)
        .maybeSingle()
      if (cl) {
        await supabase.from('cards').update({ client_name: cl.short_name || cl.name }).eq('id', card.id)
      }
      // Save as new booking_customer
      await supabase.from('booking_customers').upsert({
        name: customerName,
        email: customerEmail,
        phone: customerPhone || '',
        email_domain: domain,
        client_id: cl?.id || null
      }, { onConflict: 'email' })
    }
  }

  // konfliktus-jegyzet a boardra (ha pending)
  if (conflictNote) {
    await supabase.from('cards').update({
      description: [note, `⚠️ ${conflictNote}`].filter(Boolean).join('\n')
    }).eq('id', card.id)
  }

  // ── 5. visszaigazoló email (Resend) ───────────────────────────────
  await sendEmails({ customerName, customerEmail, svc, date, time, address, staffInit, status })

  return NextResponse.json(
    { ok: true, cardId: card.id, status, assignedTo: staffInit },
    { headers: CORS }
  )
}

// ── helper-ek ────────────────────────────────────────────────────────
function bad(msg, code=400){ return NextResponse.json({ error: msg }, { status: code, headers: CORS }) }

async function safeTravel(a, b, depart) {
  try { return await getTravelMinutes(a, b, depart) }
  catch (e) { console.warn('travel fail', e); return null } // hiba → ne blokkolja a foglalást
}

async function sendEmails({ customerName, customerEmail, svc, date, time, address, staffInit, status }) {
  try {
    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_IMAP_HOST,
      port: 465, secure: true,
      auth: { user: process.env.EMAIL_IMAP_USER, pass: process.env.EMAIL_IMAP_PASS }
    })
    const dt = new Date(`${date}T${time}:00`).toLocaleString('de-DE', {
      weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit'
    })
    const confirmed = status === 'approved'
    const from = `"ImmoPixels" <${process.env.EMAIL_IMAP_USER}>`

    // Ügyfélnek
    await transporter.sendMail({
      from, to: customerEmail,
      subject: confirmed ? 'Ihr Termin bei ImmoPixels ist bestätigt' : 'Ihre Terminanfrage bei ImmoPixels',
      html: `<div style="font-family:Arial,sans-serif;max-width:520px">
        <h2 style="color:#c8a84b">${confirmed?'Termin bestätigt ✓':'Anfrage erhalten'}</h2>
        <p>Hallo ${customerName},</p>
        <p>${confirmed ? 'Ihr Termin wurde erfolgreich gebucht:' : 'wir haben Ihre Anfrage erhalten und melden uns in Kürze:'}</p>
        <table style="font-size:14px;line-height:1.8">
          <tr><td><b>Leistung:</b></td><td>${svc.name}</td></tr>
          <tr><td><b>Termin:</b></td><td>${dt} Uhr</td></tr>
          <tr><td><b>Adresse:</b></td><td>${address}</td></tr>
        </table>
        <p style="color:#888;font-size:12px;margin-top:20px">ImmoPixels · Immobilienfotografie Mannheim · immopixels.de</p>
      </div>`
    })

    // Belső értesítés
    await transporter.sendMail({
      from, to: process.env.EMAIL_IMAP_USER,
      subject: `${confirmed?'✅ Neue Buchung':'⚠️ Buchung PRÜFEN'}: ${svc.name} — ${address.split(',')[0]}`,
      html: `<p>Fotograf: <b>${staffInit}</b> · Status: <b>${status}</b></p>
        <p>${dt} · ${svc.name}</p>
        <p>Adresse: ${address}</p>
        <p>Kunde: ${customerName} · ${customerEmail}</p>`
    })
  } catch(e) { console.warn('email send failed', e.message) }
}
