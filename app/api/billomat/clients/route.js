import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const v = x => (x && typeof x === 'object') ? '' : (x == null ? '' : String(x))

export async function GET() {
  const { billomatGet, billomatConfigured } = await import('@/lib/billomat')
  if (!billomatConfigured()) return NextResponse.json({ ok: false, error: 'Billomat env hiányzik (BILLOMAT_ID / BILLOMAT_API_KEY)' }, { status: 500 })
  const all = []
  let page = 1
  while (page < 60) {
    const r = await billomatGet('/clients?per_page=100&page=' + page)
    if (!r.ok) return NextResponse.json({ ok: false, error: 'Billomat ' + r.status + ': ' + String(r.raw || '').slice(0, 200) }, { status: 502 })
    const cl = r.data?.clients || {}
    let arr = cl.client
    if (!arr) break
    if (!Array.isArray(arr)) arr = [arr]
    if (arr.length === 0) break
    all.push(...arr)
    if (arr.length < 100) break
    page++
  }
  const clients = all.map(b => ({
    billomat_id: v(b.id), kundennr: v(b.client_number), name: v(b.name) || [v(b.first_name), v(b.last_name)].filter(Boolean).join(' '),
    first_name: v(b.first_name), last_name: v(b.last_name), street: v(b.street), zip: v(b.zip), city: v(b.city),
    email: v(b.email), phone: v(b.phone) || v(b.mobile), vat: v(b.vat_number)
  })).filter(c => c.name)
  return NextResponse.json({ ok: true, count: clients.length, clients })
}
