import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30
const MAIN_CAL = 'immopixels@gmail.com'
const BOOKING_EMAIL = 'booking@immopixels.de'
const CRM_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://immopixels-crm.vercel.app'

function toMin(t){const[h,m]=t.split(':');return +h*60+ +m}
function toHHMM(m){return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}

export async function POST(req) {
  const { createClient } = await import('@supabase/supabase-js')
  const { getDaySlots, getGoogleToken, GCAL_IDS } = await import('@/lib/booking/slots')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  let body; try { body = await req.json() } catch { return NextResponse.json({error:'bad json'},{status:400}) }
  const { token, date, time, address, plz, lat, lng, customerName, customerEmail, customerPhone, note, immoOffice, addon360, addonDrone } = body
  if (!token) return NextResponse.json({ error:'token required' }, { status:400 })

  const { data: card } = await supabase.from('cards').select('*').eq('booking_token', token).maybeSingle()
  if (!card) return NextResponse.json({ error:'not found' }, { status:404 })
  if (card.booking_status === 'cancelled') return NextResponse.json({ error:'cancelled' }, { status:409 })

  const { data: svc } = await supabase.from('booking_services').select('*').eq('id', card.booking_service_id).single()
  if (!svc) return NextResponse.json({ error:'service missing' }, { status:404 })

  // melyik naptárban van az esemény = a hozzárendelt fotós naptára
  const { data: teamRow } = await supabase.from('card_team').select('staff:staff_id(init)').eq('card_id', card.id).maybeSingle()
  const CAL = GCAL_IDS[teamRow?.staff?.init] || MAIN_CAL

  const newDate = date || card.card_date
  const newTime = time || String(card.card_time).slice(0,5)
  const a360 = addon360 ?? card.addon_360
  const aDrone = addonDrone ?? card.addon_drone
  const addonMin = (a360?30:0) + (aDrone?15:0)

  // Élő ellenőrzés — a saját esemény kizárásával
  const slots = await getDaySlots(card.booking_service_id, newDate, addonMin, card.gcal_id)
  if (!slots.find(s => s.time === newTime))
    return NextResponse.json({ error:'slot_unavailable' }, { status:409 })

  const endTime = toHHMM(toMin(newTime) + svc.duration_min + addonMin)
  const addrNew = address ?? card.booking_address
  // Kunde = Immobilienbüro (client_name); Ansprechpartner = Kontakt (customer_name)
  const officeNew = immoOffice || card.client_name
  const contactNew = customerName || card.customer_name || card.client_name
  const nameNew = contactNew
  const emailNew = customerEmail || card.customer_email
  const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(addrNew||'')}`

  const addons = []
  if (a360) addons.push('360°-Tour (+30 Min.)')
  if (aDrone) addons.push('Drohnenaufnahmen (+15 Min.)')

  // Kártya frissítés
  await supabase.from('cards').update({
    card_date: newDate, card_time: newTime, booking_end_time: endTime,
    client_name: officeNew, customer_name: contactNew, customer_email: emailNew,
    customer_phone: customerPhone ?? card.customer_phone,
    booking_address: addrNew, addr: addrNew,
    booking_plz: plz ?? card.booking_plz, booking_lat: lat ?? card.booking_lat, booking_lng: lng ?? card.booking_lng,
    addon_360: !!a360, addon_drone: !!aDrone,
    description: note ?? card.description,
    title: (officeNew && officeNew !== contactNew) ? `${officeNew} — ${svc.name} — ${contactNew}` : `${svc.name} — ${contactNew}`,
    updated_at: new Date().toISOString(),
  }).eq('id', card.id)

  // GCal esemény frissítés (PATCH, ugyanaz az ID)
  try {
    const gToken = await getGoogleToken()
    if (gToken && card.gcal_id) {
      const statusTag = card.booking_status === 'confirmed' ? '[BESTÄTIGT]' : '[AUSSTEHEND]'
      const desc = [
        `Immobilienbüro: ${immoOffice || '—'}`,
        `Name: ${nameNew}`, `Email: ${emailNew}`, `Telefon: ${customerPhone ?? card.customer_phone ?? '—'}`,
        `Leistung: ${svc.name}`, addons.length?`Zusätzliche Leistungen: ${addons.join(', ')}`:'',
        ``, `Zusätzliche Info:`, note ?? card.description ?? '—',
        ``, `— Online-Buchung (geändert) —`,
      ].join('\n')
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CAL)}/events/${card.gcal_id}`, {
        method:'PATCH', headers:{Authorization:'Bearer '+gToken,'Content-Type':'application/json'},
        body: JSON.stringify({
          summary:`${statusTag} ${(officeNew && officeNew !== contactNew) ? officeNew + ' — ' : ''}${svc.name} — ${contactNew}`,
          location: addrNew,
          description: desc,
          start:{ dateTime:`${newDate}T${newTime}:00`, timeZone:'Europe/Berlin' },
          end:{ dateTime:`${newDate}T${endTime}:00`, timeZone:'Europe/Berlin' },
        })
      })
    }
  } catch(e) { console.error('[update] gcal', e.message) }

  // Emailek mindkét félnek
  try {
    const nodemailer = await import('nodemailer')
    const t = nodemailer.default.createTransport({ host:process.env.EMAIL_IMAP_HOST, port:465, secure:true, auth:{user:process.env.EMAIL_IMAP_USER,pass:process.env.EMAIL_IMAP_PASS} })
    const from = `"ImmoPixels Buchung" <${process.env.EMAIL_IMAP_USER}>`
    const dateFmt = new Date(newDate+'T12:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})
    const manageUrl = `${CRM_URL}/buchung/${token}`

    await t.sendMail({ from, to: emailNew, subject:'Ihr Termin bei ImmoPixels wurde geändert',
      html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#2a2a28;line-height:1.6">
        <p>Hallo ${nameNew},</p>
        <p>Ihr Termin wurde aktualisiert:</p>
        <p><strong>${svc.name}</strong><br>${dateFmt} ${newTime} Uhr<br><a href="${mapsLink}">${addrNew}</a></p>
        <p>Termin verwalten: <a href="${manageUrl}">${manageUrl}</a></p>
        <p style="margin-top:16px">Freundliche Grüße<br><strong>ImmoPixels</strong></p></div>`
    })
    await t.sendMail({ from, to: BOOKING_EMAIL, replyTo: emailNew, subject:`Geändert: ${svc.name} — ${nameNew} (${dateFmt} ${newTime})`,
      html:`<div style="font-family:Arial,sans-serif"><p>Ein Termin wurde vom Kunden geändert:</p>
        <p><strong>${svc.name}</strong><br>${dateFmt} ${newTime}<br>${nameNew} · ${emailNew} · ${customerPhone??card.customer_phone??'—'}<br>${addrNew}</p>
        <p>Info: ${(note??card.description??'—')}</p></div>`
    })
  } catch(e) { console.error('[update] email', e.message) }

  return NextResponse.json({ ok:true })
}
