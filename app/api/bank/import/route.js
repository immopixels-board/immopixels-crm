import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function sb() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) }
const nrm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const deNum = s => { let t = String(s || '').trim().replace(/\s/g, ''); if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); return Number(t.replace(/[^\d.\-]/g, '')) || 0 }
function deDate(s) {
  s = String(s || '').trim()
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/)
  if (m) { let y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}
function splitLine(line, sep) {
  const out = []; let cur = '', q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++ } else q = !q }
    else if (c === sep && !q) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur); return out.map(x => x.trim())
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return []
  const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ','
  const head = splitLine(lines[0], sep).map(h => nrm(h))
  const col = (...keys) => head.findIndex(h => keys.some(k => h.includes(k)))
  const iDate = col('buchungstag', 'buchungsdatum', 'datum')
  const iAmt = col('betrag')
  const iName = col('beguenstigter', 'zahlungspflichtiger', 'name', 'empfaenger', 'auftraggeber')
  const iVz = col('verwendungszweck', 'verwendung')
  const iIban = col('iban', 'kontonummer')
  if (iDate < 0 || iAmt < 0) return []
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const c = splitLine(lines[i], sep)
    const date = deDate(c[iDate]); if (!date) continue
    const amount = deNum(c[iAmt])
    rows.push({ booking_date: date, amount, counterparty: iName >= 0 ? c[iName] : '', purpose: iVz >= 0 ? c[iVz] : '', counterparty_iban: iIban >= 0 ? c[iIban] : '' })
  }
  return rows
}

function tag(block, name) { const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return m ? m[1].trim() : '' }
function parseCAMT(xml) {
  const rows = []
  const entries = xml.split(/<Ntry>/).slice(1)
  for (const raw of entries) {
    const block = raw.split(/<\/Ntry>/)[0]
    const amt = Number(tag(block, 'Amt').replace(/[^\d.\-]/g, '')) || 0
    const cd = tag(block, 'CdtDbtInd')
    const bookg = tag(block.match(/<BookgDt>[\s\S]*?<\/BookgDt>/)?.[0] || '', 'Dt') || tag(block, 'Dt')
    const date = deDate(bookg); if (!date) continue
    const sign = cd === 'DBIT' ? -1 : 1
    const ustrd = (block.match(/<Ustrd>([\s\S]*?)<\/Ustrd>/g) || []).map(x => x.replace(/<\/?Ustrd>/g, '')).join(' ').trim()
    let nm = ''
    const partyBlock = sign > 0 ? (block.match(/<Dbtr>[\s\S]*?<\/Dbtr>/)?.[0]) : (block.match(/<Cdtr>[\s\S]*?<\/Cdtr>/)?.[0])
    if (partyBlock) nm = tag(partyBlock, 'Nm')
    const iban = sign > 0 ? tag(block.match(/<DbtrAcct>[\s\S]*?<\/DbtrAcct>/)?.[0] || '', 'IBAN') : tag(block.match(/<CdtrAcct>[\s\S]*?<\/CdtrAcct>/)?.[0] || '', 'IBAN')
    rows.push({ booking_date: date, amount: sign * Math.abs(amt), counterparty: nm, purpose: ustrd, counterparty_iban: iban })
  }
  return rows
}

async function autoMatch(supabase) {
  // nyitott számlák
  const { data: inv } = await supabase.from('invoices').select('id, invoice_number, client_name, total_gross, status, paid_at').in('status', ['open', 'overdue']).gt('total_gross', 0)
  const open = inv || []
  // párosítatlan jóváírások
  const { data: txs } = await supabase.from('bank_transactions').select('id, booking_date, amount, counterparty, purpose').gt('amount', 0).order('booking_date', { ascending: false }).limit(400)
  const { data: existing } = await supabase.from('payment_matches').select('tx_id, invoice_id, status')
  const matchedTx = new Set((existing || []).filter(m => m.status !== 'dismissed').map(m => m.tx_id))
  const paidInv = new Set((existing || []).filter(m => m.status === 'auto' || m.status === 'confirmed').map(m => m.invoice_id))

  let autoN = 0, suggN = 0
  const toInsert = []
  for (const tx of (txs || [])) {
    if (matchedTx.has(tx.id)) continue
    const purpose = nrm(tx.purpose)
    const cp = nrm(tx.counterparty)
    let strong = null, weak = null
    for (const v of open) {
      if (paidInv.has(v.id)) continue
      const amtOk = Math.abs(Number(tx.amount) - Number(v.total_gross)) < 0.01
      const nrOk = v.invoice_number && purpose.includes(nrm(v.invoice_number))
      const cpOk = v.client_name && cp && (cp.includes(nrm(v.client_name)) || nrm(v.client_name).includes(cp))
      if (nrOk && amtOk) { strong = v; break }
      if (!weak && amtOk && cpOk) weak = v
    }
    if (strong) {
      toInsert.push({ tx_id: tx.id, invoice_id: strong.id, status: 'auto', amount: tx.amount })
      paidInv.add(strong.id)
      await supabase.from('invoices').update({ status: 'paid', paid_at: tx.booking_date }).eq('id', strong.id)
      autoN++
    } else if (weak) {
      toInsert.push({ tx_id: tx.id, invoice_id: weak.id, status: 'suggested', amount: tx.amount })
      suggN++
    }
  }
  if (toInsert.length) { try { await supabase.from('payment_matches').upsert(toInsert, { onConflict: 'tx_id,invoice_id' }) } catch {} }
  return { auto: autoN, suggested: suggN }
}

export async function POST(req) {
  let body = {}
  try { body = await req.json() } catch {}
  const supabase = sb()
  if (body.rematch) { const m = await autoMatch(supabase); return Response.json({ ok: true, parsed: 0, imported: 0, ...m }) }
  let text = body.text || ''
  if (!text && body.data) { try { text = Buffer.from(body.data, 'base64').toString('utf8') } catch {} }
  if (!text) return Response.json({ ok: false, reason: 'kein Inhalt' })

  const isXml = /<Document[\s>]/i.test(text) || /<Ntry>/.test(text)
  const rows = isXml ? parseCAMT(text) : parseCSV(text)
  if (!rows.length) return Response.json({ ok: false, reason: 'keine Umsätze erkannt (Format?)' })

  const withHash = rows.map(r => ({ ...r, dedup_hash: nrm(r.booking_date + '|' + r.amount + '|' + (r.purpose || '').slice(0, 60) + '|' + (r.counterparty || '').slice(0, 40)) }))
  let imported = 0
  try {
    const { data, error } = await supabase.from('bank_transactions').upsert(withHash, { onConflict: 'dedup_hash', ignoreDuplicates: true }).select('id')
    if (!error && data) imported = data.length
  } catch (e) { return Response.json({ ok: false, reason: e.message }) }

  const m = await autoMatch(supabase)
  return Response.json({ ok: true, parsed: rows.length, imported, ...m })
}
