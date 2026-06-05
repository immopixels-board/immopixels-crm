import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { billomatConfigured, billomatPostXml, billomatXmlEscape } from '@/lib/billomat'

export const dynamic = 'force-dynamic'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}
function today() { return new Date().toISOString().slice(0, 10) }
function num(v) { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0 }

// POST /api/billomat/invoice/create
// { staff_id, clientId (CRM uuid), items:[{title,description,quantity,unit_price,unit}], note }
// DRAFT számlát hoz létre Billomatban (NEM véglegesíti). Visszaadja az invoice id-t.
export async function POST(req) {
  let body; try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
  const { staff_id, clientId, items, note, cardIds } = body
  if (!staff_id) return NextResponse.json({ ok: false, error: 'staff_id required' }, { status: 400 })
  if (!clientId) return NextResponse.json({ ok: false, error: 'clientId required' }, { status: 400 })
  if (!Array.isArray(items) || !items.length) return NextResponse.json({ ok: false, error: 'mindestens eine Position nötig' }, { status: 400 })

  const supabase = sb()
  const { data: staff } = await supabase.from('staff').select('can_invoice').eq('id', staff_id).maybeSingle()
  if (!staff || staff.can_invoice !== true) return NextResponse.json({ ok: false, error: 'forbidden — can_invoice szükséges' }, { status: 403 })
  if (!billomatConfigured()) return NextResponse.json({ ok: false, error: 'Billomat env nincs beállítva' }, { status: 500 })

  const { data: client } = await supabase.from('clients').select('id, name, billomat_client_id').eq('id', clientId).maybeSingle()
  if (!client) return NextResponse.json({ ok: false, error: 'Kunde nicht gefunden' }, { status: 404 })
  if (!client.billomat_client_id) return NextResponse.json({ ok: false, error: 'Dieser Kunde ist nicht mit Billomat verknüpft' }, { status: 400 })

  const itemsXml = items.map(it => {
    const title = billomatXmlEscape(it.title || 'Position')
    const desc = it.description ? `<description>${billomatXmlEscape(it.description)}</description>` : ''
    const unit = billomatXmlEscape(it.unit || 'Stück')
    const qty = num(it.quantity) || 1
    const price = num(it.unit_price)
    return `<invoice-item><unit>${unit}</unit><quantity>${qty}</quantity><unit_price>${price}</unit_price><title>${title}</title>${desc}</invoice-item>`
  }).join('')

  const noteXml = note ? `<note>${billomatXmlEscape(note)}</note>` : ''
  const xml =
    `<invoice>` +
    `<client_id>${billomatXmlEscape(client.billomat_client_id)}</client_id>` +
    `<date>${today()}</date>` +
    noteXml +
    `<invoice-items>${itemsXml}</invoice-items>` +
    `</invoice>`

  const res = await billomatPostXml('/invoices', xml)
  if (!res.ok) {
    console.error('[invoice create] billomat', res.status, (res.raw || '').slice(0, 300))
    return NextResponse.json({ ok: false, status: res.status, error: 'Billomat hiba', detail: (res.raw || '').slice(0, 400) }, { status: 502 })
  }
  const inv = res.data?.invoice || {}
  // a számlára tett kártyák jelölése "számlázott"-ként
  let billed = 0
  if (Array.isArray(cardIds) && cardIds.length) {
    const { error: bErr, count } = await supabase.from('cards')
      .update({ billed_at: new Date().toISOString(), billed_invoice_id: inv.id ? String(inv.id) : null }, { count: 'exact' })
      .in('id', cardIds.map(String))
    if (!bErr) billed = count || cardIds.length
  }
  return NextResponse.json({
    ok: true,
    draft: true,
    invoice_id: inv.id || null,
    customerportal_url: inv.customerportal_url || null,
    client: client.name,
    billed,
  })
}
