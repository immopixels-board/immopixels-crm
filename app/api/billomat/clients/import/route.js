import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { billomatConfigured, billomatGet } from '@/lib/billomat'

export const dynamic = 'force-dynamic'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}
function arr(x) { return Array.isArray(x) ? x : (x ? [x] : []) }
function displayName(c) {
  const n = (c.name || '').trim()
  if (n) return n
  return `${c.first_name || ''} ${c.last_name || ''}`.trim() || ('Kunde ' + c.id)
}
function norm(s) { return (s || '').toString().trim().toLowerCase() }
function addrOf(c) {
  return [c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

// POST /api/billomat/clients/import  { staff_id, ids: [billomat_id, ...] }
// A kiválasztott Billomat-ügyfeleket beemeli: névre párosítja a meglévő CRM-Kundéhoz
// (billomat_client_id beírása), vagy újként létrehozza.
export async function POST(req) {
  let body; try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
  const staffId = body.staff_id
  const ids = (body.ids || []).map(String)
  if (!staffId) return NextResponse.json({ ok: false, error: 'staff_id required' }, { status: 400 })
  if (!ids.length) return NextResponse.json({ ok: false, error: 'nincs kiválasztott ügyfél' }, { status: 400 })

  const supabase = sb()
  const { data: staff } = await supabase.from('staff').select('can_invoice').eq('id', staffId).maybeSingle()
  if (!staff || staff.can_invoice !== true) return NextResponse.json({ ok: false, error: 'forbidden — can_invoice szükséges' }, { status: 403 })
  if (!billomatConfigured()) return NextResponse.json({ ok: false, error: 'Billomat env nincs beállítva' }, { status: 500 })

  const res = await billomatGet('/clients?per_page=1000')
  if (!res.ok) return NextResponse.json({ ok: false, status: res.status, error: 'Billomat hiba', detail: (res.raw || '').slice(0, 300) }, { status: 502 })
  const bmById = new Map(arr(res.data?.clients?.client).map(c => [String(c.id), c]))

  const { data: crm } = await supabase.from('clients').select('id, name, addr, email, tel, vat, billomat_client_id')
  const byBmId = new Map((crm || []).filter(c => c.billomat_client_id).map(c => [String(c.billomat_client_id), c]))
  const byName = new Map((crm || []).map(c => [norm(c.name), c]))

  let created = 0, matched = 0, skipped = 0
  const errors = []

  for (const id of ids) {
    const c = bmById.get(id)
    if (!c) { skipped++; continue }
    if (byBmId.has(id)) { skipped++; continue } // már be van kötve

    const name = displayName(c)
    const fields = {
      addr: addrOf(c) || null,
      email: c.email || null,
      tel: c.phone || c.mobile || null,
      vat: c.vat_number || null,
      billomat_client_id: id,
    }

    const existing = byName.get(norm(name))
    if (existing) {
      // párosítás: csak a hiányzó mezőket töltjük, a billomat_client_id-t beírjuk
      const upd = { billomat_client_id: id }
      if (!existing.addr && fields.addr) upd.addr = fields.addr
      if (!existing.email && fields.email) upd.email = fields.email
      if (!existing.tel && fields.tel) upd.tel = fields.tel
      if (!existing.vat && fields.vat) upd.vat = fields.vat
      const { error } = await supabase.from('clients').update(upd).eq('id', existing.id)
      if (error) { errors.push(name + ': ' + error.message); continue }
      matched++
    } else {
      const { error } = await supabase.from('clients').insert({
        name,
        category: 'Maklerunternehmen',
        contact_name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || null,
        ...fields,
      })
      if (error) { errors.push(name + ': ' + error.message); continue }
      created++
    }
  }

  return NextResponse.json({ ok: true, created, matched, skipped, errors })
}
