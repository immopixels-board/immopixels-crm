import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { billomatConfigured, billomatGet } from '@/lib/billomat'

export const dynamic = 'force-dynamic'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}
function arr(x) { return Array.isArray(x) ? x : (x ? [x] : []) }

// GET /api/billomat/invoice/history?staff_id=...&clientId=<crm-uuid>
// A kliens utolsó ~15 Billomat-számlájának tételeiből összegyűjti a distinct
// pozíciókat (megnevezés + legutóbbi ár + dátum + hányszor fordult elő).
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const staffId = searchParams.get('staff_id')
  const clientId = searchParams.get('clientId')
  if (!staffId || !clientId) return NextResponse.json({ ok: false, error: 'staff_id és clientId kell' }, { status: 400 })

  const supabase = sb()
  const { data: staff } = await supabase.from('staff').select('can_invoice').eq('id', staffId).maybeSingle()
  if (!staff || staff.can_invoice !== true) return NextResponse.json({ ok: false, error: 'forbidden — can_invoice szükséges' }, { status: 403 })
  if (!billomatConfigured()) return NextResponse.json({ ok: false, error: 'Billomat env nincs beállítva' }, { status: 500 })

  const { data: client } = await supabase.from('clients').select('billomat_client_id').eq('id', clientId).maybeSingle()
  if (!client?.billomat_client_id) return NextResponse.json({ ok: true, items: [] })

  const bmId = client.billomat_client_id
  const invRes = await billomatGet(`/invoices?client_id=${encodeURIComponent(bmId)}&per_page=15&order_by=date+DESC`)
  if (!invRes.ok) return NextResponse.json({ ok: false, status: invRes.status, error: 'Billomat hiba', detail: (invRes.raw || '').slice(0, 300) }, { status: 502 })
  const invoices = arr(invRes.data?.invoices?.invoice).slice(0, 15)

  const agg = new Map() // title -> { title, unit_price, unit, last_date, count }
  for (const inv of invoices) {
    const itRes = await billomatGet(`/invoice-items?invoice_id=${encodeURIComponent(inv.id)}`)
    if (!itRes.ok) continue
    const its = arr(itRes.data?.['invoice-items']?.['invoice-item'])
    for (const it of its) {
      const title = (it.title || '').trim()
      if (!title) continue
      const date = inv.date || ''
      const prev = agg.get(title)
      if (!prev) {
        agg.set(title, { title, unit_price: it.unit_price, unit: it.unit || 'Stück', last_date: date, count: 1 })
      } else {
        prev.count++
        if (date > (prev.last_date || '')) { prev.last_date = date; prev.unit_price = it.unit_price; prev.unit = it.unit || prev.unit }
      }
    }
  }

  const items = [...agg.values()].sort((a, b) => (b.last_date || '').localeCompare(a.last_date || '') || b.count - a.count)
  return NextResponse.json({ ok: true, items, invoicesScanned: invoices.length })
}
