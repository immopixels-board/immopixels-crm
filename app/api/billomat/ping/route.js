import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { billomatConfigured, billomatGet } from '@/lib/billomat'

export const dynamic = 'force-dynamic'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// GET /api/billomat/ping?staff_id=...
// Jogosultság: csak az a staff hívhatja, akinél can_invoice = true.
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const staffId = searchParams.get('staff_id')
  if (!staffId) return NextResponse.json({ ok: false, error: 'staff_id required' }, { status: 400 })

  const supabase = sb()
  const { data: staff } = await supabase.from('staff').select('can_invoice, role_level, init').eq('id', staffId).maybeSingle()
  if (!staff || staff.can_invoice !== true) {
    return NextResponse.json({ ok: false, error: 'forbidden — can_invoice szükséges' }, { status: 403 })
  }

  if (!billomatConfigured()) {
    return NextResponse.json({ ok: false, error: 'Billomat env nincs beállítva (BILLOMAT_ID / BILLOMAT_API_KEY)' }, { status: 500 })
  }

  const res = await billomatGet('/clients?per_page=1')
  if (!res.ok) {
    return NextResponse.json({ ok: false, status: res.status, error: 'Billomat hiba', detail: (res.raw || '').slice(0, 400) }, { status: 502 })
  }

  // Billomat JSON lista: { clients: { "@total": "...", client: [...] } }
  const c = res.data?.clients || {}
  const total = c['@total'] ?? c.total ?? null
  return NextResponse.json({ ok: true, message: 'Billomat kapcsolat OK', clientsTotal: total })
}
