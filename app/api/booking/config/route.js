import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function OPTIONS() {
  noStore()
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET() {
  noStore()
  const supabase = sb()

  const { data: services } = await supabase
    .from('booking_services')
    .select('id, name, category, duration_min, buffer_min, position, active, image_url, description')
    .eq('active', true)
    .order('position')

  // providers (active booking providers) + avatar from staff
  const { data: provs } = await supabase
    .from('booking_providers')
    .select('staff_init, name, active')
    .eq('active', true)

  const inits = (provs || []).map(p => p.staff_init)
  let avatarByInit = {}
  if (inits.length) {
    const { data: staff } = await supabase.from('staff').select('init, name, avatar_url, color').in('init', inits)
    avatarByInit = Object.fromEntries((staff || []).map(s => [s.init, s]))
  }

  const providers = (provs || []).map(p => ({
    init: p.staff_init,
    name: avatarByInit[p.staff_init]?.name || p.name,
    avatar_url: avatarByInit[p.staff_init]?.avatar_url || null,
    color: avatarByInit[p.staff_init]?.color || '#1f4d3f',
  }))

  return NextResponse.json({ services: services || [], providers }, { headers: CORS })
}
