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

// GET /api/billomat/clients?staff_id=...
// Visszaadja a Billomat-ügyfeleket + jelzi, melyik van már a CRM-ben (név vagy billomat_client_id alapján).
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const staffId = searchParams.get('staff_id')
  if (!staffId) return NextResponse.json({ ok: false, error: 'staff_id required' }, { status: 400 })

  const supabase = sb()
  const { data: staff } = await supabase.from('staff').select('can_invoice').eq('id', staffId).maybeSingle()
  if (!staff || staff.can_invoice !== true) return NextResponse.json({ ok: false, error: 'forbidden — can_invoice szükséges' }, { status: 403 })
  if (!billomatConfigured()) return NextResponse.json({ ok: false, error: 'Billomat env nincs beállítva' }, { status: 500 })

  const res = await billomatGet('/clients?per_page=1000')
  if (!res.ok) return NextResponse.json({ ok: false, status: res.status, error: 'Billomat hiba', detail: (res.raw || '').slice(0, 300) }, { status: 502 })

  const bmClients = arr(res.data?.clients?.client)

  // CRM kliensek a párosításhoz
  const { data: crm } = await supabase.from('clients').select('id, name, billomat_client_id')
  const byBmId = new Map()
  const byName = new Map()
  for (const c of crm || []) {
    if (c.billomat_client_id) byBmId.set(String(c.billomat_client_id), c)
    byName.set(norm(c.name), c)
  }

  const list = bmClients.map(c => {
    const name = displayName(c)
    const imported = byBmId.has(String(c.id))
    const nameMatch = !imported ? (byName.get(norm(name)) || null) : null
    return {
      billomat_id: String(c.id),
      name,
      email: c.email || '',
      city: c.city || '',
      zip: c.zip || '',
      vat: c.vat_number || '',
      client_number: c.client_number || '',
      alreadyImported: imported,
      matchedCrmId: imported ? byBmId.get(String(c.id))?.id : (nameMatch?.id || null),
    }
  }).sort((a, b) => a.name.localeCompare(b.name, 'de'))

  return NextResponse.json({ ok: true, total: list.length, clients: list })
}
