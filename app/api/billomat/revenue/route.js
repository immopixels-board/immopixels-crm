import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { billomatConfigured, billomatGet } from '@/lib/billomat'

export const dynamic = 'force-dynamic'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}
function arr(x) { return Array.isArray(x) ? x : (x ? [x] : []) }
function num(v) { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n }

// Milyen státuszú számla számít BEVÉTELNEK (DRAFT és CANCELED kihagyva)
const REVENUE_STATUS = new Set(['OPEN', 'OVERDUE', 'PAID'])

// GET /api/billomat/revenue?staff_id=<uuid>&year=YYYY
// Visszaadja a Billomat nettó bevételt ügyfelenként (billomat_client_id szerint) és havonta.
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const staffId = searchParams.get('staff_id')
  const year = parseInt(searchParams.get('year') || '', 10) || new Date().getFullYear()
  if (!staffId) return NextResponse.json({ ok: false, error: 'staff_id kell' }, { status: 400 })

  const supabase = sb()
  const { data: staff } = await supabase.from('staff').select('can_invoice, role_level').eq('id', staffId).maybeSingle()
  if (!staff || !(staff.can_invoice === true || staff.role_level === 'admin')) {
    return NextResponse.json({ ok: false, error: 'forbidden — admin vagy can_invoice szükséges' }, { status: 403 })
  }
  if (!billomatConfigured()) return NextResponse.json({ ok: false, error: 'Billomat env nincs beállítva' }, { status: 500 })

  const from = `${year}-01-01`, to = `${year}-12-31`
  const byClient = {}            // billomat_client_id -> nettó összeg
  const byMonth = Array(12).fill(0)
  let total = 0
  let scanned = 0, counted = 0, pages = 0, stop = false, page = 1

  // date DESC sorrend: a legújabbtól megyünk visszafelé, és ha az évnél régebbire érünk, megállunk.
  while (!stop && pages < 50) {
    const res = await billomatGet(`/invoices?per_page=100&page=${page}&order_by=date+DESC`)
    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, error: 'Billomat hiba', detail: (res.raw || '').slice(0, 300) }, { status: 502 })
    }
    const node = res.data?.invoices || {}
    const list = arr(node.invoice)
    if (list.length === 0) break
    for (const inv of list) {
      scanned++
      const date = String(inv.date || '')
      if (date && date < from) { stop = true; continue }   // régebbi mint az év → DESC miatt itt megállhatunk
      if (date && date > to) continue                       // jövőbeli / következő év → kihagy
      if (!date.startsWith(String(year))) continue
      const status = String(inv.status || '').toUpperCase()
      if (!REVENUE_STATUS.has(status)) continue
      const net = num(inv.total_net != null ? inv.total_net : (inv.net_total != null ? inv.net_total : inv.total_net_amount))
      const cid = String(inv.client_id || '')
      byClient[cid] = (byClient[cid] || 0) + net
      total += net
      const m = parseInt(date.slice(5, 7), 10) - 1
      if (m >= 0 && m < 12) byMonth[m] += net
      counted++
    }
    pages++; page++
    if (list.length < 100) break
  }

  return NextResponse.json({
    ok: true, year, byClient, byMonth, total,
    statusCounted: [...REVENUE_STATUS], invoicesScanned: scanned, invoicesCounted: counted,
  })
}
