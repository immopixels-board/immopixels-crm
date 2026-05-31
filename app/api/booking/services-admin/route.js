import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// GET → összes szolgáltatás + összes fotós + hozzárendelések
export async function GET() {
  const supabase = sb()
  const { data: services } = await supabase.from('booking_services')
    .select('id, name, category, duration_min, buffer_min, position, active, image_url, description')
    .order('position')
  const { data: providers } = await supabase.from('booking_providers')
    .select('id, staff_init, name, active').order('staff_init')
  const { data: links } = await supabase.from('booking_provider_services').select('service_id, provider_id')

  const assignments = {}
  ;(links || []).forEach(l => { (assignments[l.service_id] ??= []).push(l.provider_id) })

  return NextResponse.json({ services: services || [], providers: providers || [], assignments })
}

// POST { action, ... }
export async function POST(req) {
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error:'bad json' }, { status:400 }) }
  const supabase = sb()
  const { action } = body

  if (action === 'update') {
    const { id } = body
    if (!id) return NextResponse.json({ error:'id required' }, { status:400 })
    const patch = {}
    for (const f of ['name','category','description']) if (f in body) patch[f] = body[f] || null
    if ('duration_min' in body) patch.duration_min = parseInt(body.duration_min,10) || 0
    if ('buffer_min' in body) patch.buffer_min = parseInt(body.buffer_min,10) || 0
    if ('active' in body) patch.active = !!body.active
    const { error } = await supabase.from('booking_services').update(patch).eq('id', id)
    if (error) return NextResponse.json({ error:error.message }, { status:500 })
    return NextResponse.json({ ok:true })
  }

  if (action === 'create') {
    const { name, category, duration_min, buffer_min } = body
    if (!name || !category) return NextResponse.json({ error:'name + category required' }, { status:400 })
    const { data: maxRow } = await supabase.from('booking_services').select('position').order('position',{ascending:false}).limit(1).maybeSingle()
    const pos = (maxRow?.position || 0) + 1
    const { data, error } = await supabase.from('booking_services').insert({
      name, category, duration_min: parseInt(duration_min,10)||30, buffer_min: parseInt(buffer_min,10)||0,
      active: true, position: pos,
    }).select('id').single()
    if (error) return NextResponse.json({ error:error.message }, { status:500 })
    return NextResponse.json({ ok:true, id:data.id })
  }

  if (action === 'assign' || action === 'unassign') {
    const { service_id, provider_id } = body
    if (!service_id || !provider_id) return NextResponse.json({ error:'service_id + provider_id required' }, { status:400 })
    if (action === 'assign') {
      // duplikátum elkerülése
      const { data: ex } = await supabase.from('booking_provider_services').select('service_id').eq('service_id',service_id).eq('provider_id',provider_id).maybeSingle()
      if (!ex) await supabase.from('booking_provider_services').insert({ service_id, provider_id })
    } else {
      await supabase.from('booking_provider_services').delete().eq('service_id',service_id).eq('provider_id',provider_id)
    }
    return NextResponse.json({ ok:true })
  }

  if (action === 'set_provider_active') {
    const { provider_id, active } = body
    if (!provider_id) return NextResponse.json({ error:'provider_id required' }, { status:400 })
    const { error } = await supabase.from('booking_providers').update({ active: !!active }).eq('id', provider_id)
    if (error) return NextResponse.json({ error:error.message }, { status:500 })
    return NextResponse.json({ ok:true })
  }

  if (action === 'delete') {
    const { id } = body
    if (!id) return NextResponse.json({ error:'id required' }, { status:400 })
    await supabase.from('booking_provider_services').delete().eq('service_id', id)
    const { error } = await supabase.from('booking_services').delete().eq('id', id)
    if (error) return NextResponse.json({ error:error.message }, { status:500 })
    return NextResponse.json({ ok:true })
  }

  return NextResponse.json({ error:'unknown action' }, { status:400 })
}
