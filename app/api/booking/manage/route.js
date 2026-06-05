import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error:'token required' }, { status:400 })

  const { data: card } = await supabase.from('cards')
    .select('client_name, customer_name, customer_email, customer_phone, card_date, card_time, booking_end_time, booking_address, booking_plz, booking_lat, booking_lng, addon_360, addon_drone, description, booking_status, booking_service_id')
    .eq('booking_token', token).maybeSingle()
  if (!card) return NextResponse.json({ error:'not found' }, { status:404 })

  let serviceName = '', serviceCategory = '', serviceDuration = 0
  if (card.booking_service_id) {
    const { data: svc } = await supabase.from('booking_services').select('name, category, duration_min').eq('id', card.booking_service_id).maybeSingle()
    serviceName = svc?.name || ''
    serviceCategory = svc?.category || ''
    serviceDuration = svc?.duration_min || 0
  }
  return NextResponse.json({ ...card, serviceName, serviceCategory, serviceDuration })
}
