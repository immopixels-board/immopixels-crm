import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function decodeJwt(t) {
  try { const p = String(t || '').split('.')[1]; if (!p) return {}; const b = Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); return JSON.parse(b) } catch { return {} }
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const urlRef = (url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i) || [])[1] || null
  const claims = decodeJwt(key)
  const keyRole = claims.role || null
  const keyRef = claims.ref || null

  const out = {
    ok: true,
    env: { url_present: !!url, key_present: !!key, anon_present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    url_ref: urlRef,
    key_role: keyRole,                 // 'service_role' = gut, 'anon' = FALSCH
    key_ref: keyRef,
    ref_match: urlRef && keyRef ? (urlRef === keyRef) : null,
    write_test: null
  }

  if (url && key) {
    try {
      const sb = createClient(url, key)
      const probe = { billomat_id: '__diag_probe__', invoice_number: null, client_name: '__diag__', invoice_date: new Date().toISOString().slice(0, 10), status: 'draft', total_net: 0, vat_amount: 0, total_gross: 0, paid_at: null }
      const { data, error } = await sb.from('invoices').insert(probe).select('id').single()
      if (error) out.write_test = { ok: false, error: error.message, hint: 'invoices-Insert blockiert (RLS → key nicht service_role, ODER fehlende Spalte paid_at/billomat_id)' }
      else { out.write_test = { ok: true }; await sb.from('invoices').delete().eq('id', data.id) }
    } catch (e) { out.write_test = { ok: false, error: String(e.message || e) } }
  }
  return NextResponse.json(out)
}
