// ════════════════════════════════════════════════════════════════════
// app/api/cron/reminders/route.js
// Napi 1x futás (Vercel cron vagy külső scheduler).
// - holnapi shootingok emlékeztetője az ügyfeleknek + fotósoknak
// - opcionálisan: aznapi tényleges útidők újraszámítása (friss forgalom)
// Vercel cron beállítás a vercel.json-ban: "0 7 * * *" (minden reggel 7:00)
// ════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getDb() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) }

export async function GET(req) {
  // védelem: csak a Vercel cron / titkos kulccsal hívható
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  const { data: cards } = await supabase
    .from('cards')
    .select('id, title, time, booking_address, client, customer_email, ' +
            'booking_service_id, card_team(staff_init)')
    .eq('date', tomorrow)
    .eq('booking_source', 'online')
    .not('time', 'is', null)

  if (!cards?.length) return NextResponse.json({ sent: 0, date: tomorrow })

  const key = process.env.RESEND_API_KEY
  let sent = 0
  for (const c of cards) {
    if (!key || !c.customer_email) continue
    const time = c.time?.slice(0, 5)
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ImmoPixels <termin@immopixels.de>',
        to: c.customer_email,
        subject: 'Erinnerung: Ihr Fototermin morgen',
        html: `<div style="font-family:Arial,sans-serif;max-width:520px">
          <h2 style="color:#c8a84b">Terminerinnerung</h2>
          <p>Hallo ${c.client || ''},</p>
          <p>wir möchten Sie an Ihren morgigen Termin erinnern:</p>
          <p><b>${time} Uhr</b><br>${c.booking_address || ''}</p>
          <p>Bitte sorgen Sie dafür, dass die Immobilie aufgeräumt und gut beleuchtet ist.</p>
          <p style="color:#888;font-size:12px">ImmoPixels · Immobilienfotografie Mannheim</p>
        </div>`,
      }),
    }).catch(e => console.warn('reminder', e))
    sent++
  }

  return NextResponse.json({ sent, date: tomorrow })
}
