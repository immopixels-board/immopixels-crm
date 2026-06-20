import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { billomatConfigured, billomatGet } from '@/lib/billomat'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function sb() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) }
function arr(x) { return Array.isArray(x) ? x : (x ? [x] : []) }
const numf = v => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0 }
const r2 = n => Math.round((Number(n) || 0) * 100) / 100
function pct(v) { const s = String(v == null ? '' : v).trim(); if (!s) return 0; if (s.endsWith('%')) return numf(s.slice(0, -1)); const n = numf(s); return n < 1 && n > 0 ? n * 100 : 0 }

const STATUS = { DRAFT: 'draft', OPEN: 'open', OVERDUE: 'overdue', PAID: 'paid', CANCELED: 'storno', CANCELLED: 'storno' }

// POST { staff_id, year }  — Billomat-Rechnungen eines Jahres importieren (bezahlt + Entwürfe)
export async function POST(req) {
  let body; try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
  const staffId = body.staff_id
  const year = String(body.year || new Date().getFullYear())
  if (!staffId) return NextResponse.json({ ok: false, error: 'staff_id required' }, { status: 400 })

  const supabase = sb()
  const { data: staff } = await supabase.from('staff').select('id, can_invoice, role_level').eq('id', staffId).maybeSingle()
  if (!staff || (staff.role_level !== 'admin' && staff.can_invoice !== true)) return NextResponse.json({ ok: false, error: 'forbidden — can_invoice szükséges' }, { status: 403 })
  if (!billomatConfigured()) return NextResponse.json({ ok: false, error: 'Billomat env nincs beállítva (BILLOMAT_ID / BILLOMAT_API_KEY)' }, { status: 500 })

  // seller (settings)
  const { data: sSeller } = await supabase.from('settings').select('value').eq('key', 'invoice_seller').maybeSingle()
  const seller = sSeller?.value || {}

  // CRM-ügyfelek (billomat_client_id → CRM)
  const { data: crm } = await supabase.from('clients').select('id, name, short_name, billomat_client_id')
  const crmByBm = new Map((crm || []).filter(c => c.billomat_client_id).map(c => [String(c.billomat_client_id), c]))

  // Billomat-ügyfelek (id → név, ha nincs CRM-párosítás)
  const bmCl = await billomatGet('/clients?per_page=1000')
  const bmNameById = new Map(arr(bmCl.data?.clients?.client).map(c => [String(c.id), (c.name || `${c.first_name || ''} ${c.last_name || ''}`).trim()]))

  // már importált billomat_id-k (idempotencia)
  const { data: existing } = await supabase.from('invoices').select('billomat_id').not('billomat_id', 'is', null)
  const done = new Set((existing || []).map(r => String(r.billomat_id)))

  // számlák lapozva
  let invs = [], page = 1
  for (; page <= 25; page++) {
    const res = await billomatGet(`/invoices?per_page=200&page=${page}`)
    if (!res.ok) { if (page === 1) return NextResponse.json({ ok: false, status: res.status, error: 'Billomat /invoices hiba', detail: (res.raw || '').slice(0, 300) }, { status: 502 }); break }
    const batch = arr(res.data?.invoices?.invoice)
    invs = invs.concat(batch)
    const total = Number(res.data?.invoices?.['@total'] || 0)
    if (!batch.length || invs.length >= total) break
  }

  // csak az adott év
  const yInvs = invs.filter(iv => {
    const d = String(iv.date || iv.created || '')
    if (d) return d.slice(0, 4) === year
    return (iv.status === 'DRAFT') // dátum nélküli draft = aktuális
  })

  let imported = 0, skipped = 0, failed = 0
  const byStatus = {}
  const errors = []

  for (const iv of yInvs) {
    const bmId = String(iv.id)
    if (done.has(bmId)) { skipped++; continue }
    const status = STATUS[String(iv.status || '').toUpperCase()] || 'open'

    // ügyfél
    const cliBm = String(iv.client_id || '')
    const crmC = crmByBm.get(cliBm)
    const clientName = crmC ? (crmC.short_name || crmC.name) : (bmNameById.get(cliBm) || iv.label || 'Unbekannt')

    // összegek
    let net = numf(iv.total_net), gross = numf(iv.total_gross)
    const vat = r2(gross - net)

    // paid_at (csak bezahlt)
    let paidAt = null
    if (status === 'paid') {
      const pr = await billomatGet(`/invoice-payments?invoice_id=${bmId}&per_page=200`)
      const pays = arr(pr.data?.['invoice-payments']?.['invoice-payment'])
      const dates = pays.map(p => String(p.date || '').slice(0, 10)).filter(Boolean).sort()
      paidAt = dates.length ? dates[dates.length - 1] : (iv.date || null)
    }

    // beszúrás
    const row = {
      billomat_id: bmId,
      invoice_number: (iv.invoice_number || '').trim() || null,
      client_id: crmC?.id || null,
      client_name: clientName,
      invoice_date: (iv.date || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
      due_date: (iv.due_date || '').slice(0, 10) || null,
      status,
      total_net: r2(net), vat_amount: vat, total_gross: r2(gross),
      seller, buyer: { company: clientName },
      created_by: staffId,
      notes: 'Import aus Billomat ' + year,
      paid_at: paidAt,
      finalized_at: status === 'draft' ? null : (iv.created || new Date().toISOString())
    }
    const { data: insInv, error: ie } = await supabase.from('invoices').insert(row).select('id').single()
    if (ie || !insInv) { failed++; errors.push(bmId + ': ' + (ie?.message || 'insert')); continue }

    // tételek
    const itr = await billomatGet(`/invoice-items?invoice_id=${bmId}&per_page=200`)
    const items = arr(itr.data?.['invoice-items']?.['invoice-item']).sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
    if (items.length) {
      const rows = items.map((it, i) => {
        const desc = [it.title, it.description].map(x => (x || '').trim()).filter(Boolean).join('\n')
        const qty = numf(it.quantity) || 1
        const up = numf(it.unit_price)
        const rate = numf(it.tax_rate)
        const ln = numf(it.total_net) || r2(qty * up)
        const lg = numf(it.total_gross) || r2(ln * (1 + rate / 100))
        return { invoice_id: insInv.id, position: Number(it.position) || (i + 1), description: desc || '—', qty, unit_price: up, discount: pct(it.reduction), vat_rate: rate, line_net: r2(ln), line_gross: r2(lg) }
      })
      const { error: itemErr } = await supabase.from('invoice_items').insert(rows)
      if (itemErr) errors.push(bmId + ' items: ' + itemErr.message)
    } else if ((net || gross)) {
      // nincs tétel-bontás → egy összevont sor, hogy a PDF/összeg stimmeljen
      await supabase.from('invoice_items').insert([{ invoice_id: insInv.id, position: 1, description: iv.label || ('Rechnung ' + (iv.invoice_number || '')), qty: 1, unit_price: r2(net), discount: 0, vat_rate: net ? r2((vat / net) * 100) : 0, line_net: r2(net), line_gross: r2(gross) }])
    }

    done.add(bmId); imported++
    byStatus[status] = (byStatus[status] || 0) + 1
  }

  return NextResponse.json({ ok: true, year, found: yInvs.length, imported, skipped, failed, byStatus, errors: errors.slice(0, 8) })
}
