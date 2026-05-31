import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const sp = new URL(req.url).searchParams
  const status = sp.get('status') // pending | confirmed | cancelled | all
  const dateFrom = sp.get('date_from')

  let q = supabase.from('cards')
    .select('id, title, client_name, customer_email, customer_phone, card_date, card_time, booking_end_time, booking_address, description, booking_status, booking_token, booking_service_id, addon_360, addon_drone, card_team(staff_id, staff:staff_id(init,name,avatar_url,color,address))')
    .eq('booking_source', 'online')
    .is('deleted_at', null)
    .order('card_date', { ascending: true })
    .limit(200)

  if (status && status !== 'all') q = q.eq('booking_status', status)
  if (dateFrom) q = q.gte('card_date', dateFrom)

  const { data, error } = await q
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 })

  // service names
  const svcIds = [...new Set((data||[]).map(c=>c.booking_service_id).filter(Boolean))]
  let svcMap = {}
  if (svcIds.length) {
    const { data: svcs } = await supabase.from('booking_services').select('id,name').in('id', svcIds)
    svcMap = Object.fromEntries((svcs||[]).map(s=>[s.id,s.name]))
  }

  const bookings = (data||[]).map(c => ({
    ...c,
    serviceName: svcMap[c.booking_service_id] || c.title,
    staff: c.card_team?.[0]?.staff || null,
  }))
  return NextResponse.json({ ok:true, bookings })
}
