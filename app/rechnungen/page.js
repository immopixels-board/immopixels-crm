'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { generateZugferdPdf } from '../../lib/invoice/zugferd'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const GOLD = '#b8892a', DARK = '#2a2a28', MUT = '#8a8278', CREAM = '#faf7f1', LINE = '#ece4d6'
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const eur = n => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const num = v => { const s = String(v ?? '').trim().replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''); const n = parseFloat(s); return isNaN(n) ? 0 : n }
const round2 = n => Math.round((Number(n) || 0) * 100) / 100
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00'); if (isNaN(x)) return ''; x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }
const STATUS = { draft: { label: 'Entwurf', c: '#8a8278', bg: '#efece4' }, open: { label: 'Offen', c: '#9a6a12', bg: '#f6efe0' }, overdue: { label: 'Überfällig', c: '#b3402f', bg: '#fae7e2' }, paid: { label: 'Bezahlt', c: '#2f7a4f', bg: '#e6f3ec' }, storno: { label: 'Storniert', c: '#b3402f', bg: '#f3e9e7' } }

const DEFAULT_SELLER = { name: 'ImmoPixels e.K.', street: 'Gartenstr. 2', zip: '67310', city: 'Hettenleidelheim', vatId: 'DE351098294', taxNo: '', iban: 'DE65672500201003013371', bic: 'SOLADES1HDB', bank: 'Sparkasse Heidelberg', phone: '+49 176 41576629', email: 'rechnung@immopixels.de', web: 'www.immopixels.de', kleinunternehmer: false }
const DEFAULT_TEMPLATE = { intro: 'Hiermit stellen wir Ihnen die folgenden Positionen in Rechnung.', closing: 'Vielen Dank für die Zusammenarbeit!', reviewText: 'Zufrieden? Wir freuen uns über Ihre Google-Bewertung!', reviewUrl: '', bookingUrl: 'https://immopixels.de/booking/', qrUrl: '', logoUrl: '', footerLinks: [] }

export default function RechnungenPage() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('rechnungen')
  const [brutto, setBrutto] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [hasTable, setHasTable] = useState(true)
  const [myId, setMyId] = useState(null)
  const [seller, setSeller] = useState(DEFAULT_SELLER)
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [editor, setEditor] = useState(null)
  const [settingsModal, setSettingsModal] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { init() }, [])
  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: staff } = await supabase.from('staff').select('*').eq('email', user.email).single()
    if (!staff || (staff.role_level !== 'admin' && !staff.can_invoice)) { window.location.href = '/'; return }
    setMyId(staff.id)
    const { data: cls } = await supabase.from('clients').select('id,name,short_name,addr,email,tel,contact_firstname,contact_lastname,contact_tel,contact_email').order('name')
    setClients(cls || [])
    const { data: s1 } = await supabase.from('settings').select('value').eq('key', 'invoice_seller').maybeSingle()
    if (s1?.value) { try { setSeller({ ...DEFAULT_SELLER, ...JSON.parse(s1.value) }) } catch {} }
    const { data: s2 } = await supabase.from('settings').select('value').eq('key', 'invoice_template').maybeSingle()
    if (s2?.value) { try { setTemplate({ ...DEFAULT_TEMPLATE, ...JSON.parse(s2.value) }) } catch {} }
    await reload()
    // előtöltés kártyáról
    try {
      const pf = JSON.parse(localStorage.getItem('ip-invoice-prefill') || 'null')
      if (pf) { localStorage.removeItem('ip-invoice-prefill'); openEditorPrefill(pf, cls || []) }
    } catch {}
    setLoading(false)
  }
  async function reload() {
    try {
      const { data, error } = await supabase.from('invoices').select('id,invoice_number,client_id,client_name,invoice_date,due_date,status,total_net,vat_amount,total_gross,storno_of,notes,buyer').order('invoice_date', { ascending: false }).order('invoice_number', { ascending: false })
      if (error) { setHasTable(false); return }
      setInvoices(data || [])
    } catch { setHasTable(false) }
  }
  async function saveSettings() {
    await supabase.from('settings').upsert({ key: 'invoice_seller', value: JSON.stringify(seller) }, { onConflict: 'key' })
    await supabase.from('settings').upsert({ key: 'invoice_template', value: JSON.stringify(template) }, { onConflict: 'key' })
    setSettingsModal(false)
  }

  function buyerFromClient(c) {
    if (!c) return {}
    return { company: c.name || '', contact: [c.contact_firstname, c.contact_lastname].filter(Boolean).join(' '), address: c.addr || '', email: c.contact_email || c.email || '', phone: c.contact_tel || c.tel || '', kundennr: c.kundennr || '' }
  }
  function newInvoice() {
    const d = new Date().toISOString().slice(0, 10)
    setEditor({ items: [{ description: '', qty: 1, unit_price: '', discount: '', vat_rate: seller.kleinunternehmer ? 0 : 19 }], invoice_date: d, due_date: addDays(d, 14), client_name: '', client_id: null, buyer: {}, notes: '' })
    setTab('rechnungen')
  }
  function openEditorPrefill(pf, cls) {
    const c = (cls || clients).find(x => x.id === pf.client_id || (x.short_name || x.name) === pf.client_name || x.name === pf.client_name)
    const d = pf.invoice_date || new Date().toISOString().slice(0, 10)
    setEditor({ items: pf.items && pf.items.length ? pf.items : [{ description: pf.description || '', qty: 1, unit_price: pf.price || '', discount: '', vat_rate: seller.kleinunternehmer ? 0 : 19 }], invoice_date: d, due_date: addDays(d, 14), client_name: pf.client_name || (c ? (c.short_name || c.name) : ''), client_id: c?.id || null, buyer: buyerFromClient(c), notes: '' })
    setTab('rechnungen')
  }
  async function editInvoice(inv) {
    const { data: its } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id).order('position')
    setEditor({ ...inv, buyer: inv.buyer || {}, items: (its && its.length) ? its.map(it => ({ ...it, discount: it.discount || '' })) : [{ description: '', qty: 1, unit_price: '', discount: '', vat_rate: 19 }] })
  }

  function calcTotals(items, klein) {
    let net = 0, vat = 0
    items.forEach(it => { const ln = num(it.qty) * num(it.unit_price) * (1 - num(it.discount) / 100); net += ln; vat += klein ? 0 : ln * num(it.vat_rate) / 100 })
    return { net: round2(net), vat: round2(vat), gross: round2(net + vat) }
  }
  async function persistInvoice(ed, finalize) {
    setBusy(true)
    try {
      const items = ed.items.filter(it => (it.description || '').trim() || num(it.unit_price))
      const t = calcTotals(items, seller.kleinunternehmer)
      const base = { client_id: ed.client_id || null, client_name: ed.client_name || '', invoice_date: ed.invoice_date, due_date: ed.due_date || null, total_net: t.net, vat_amount: t.vat, total_gross: t.gross, notes: ed.notes || null, seller, buyer: ed.buyer || {}, created_by: myId }
      let invId = ed.id
      if (invId) { await supabase.from('invoices').update(base).eq('id', invId); await supabase.from('invoice_items').delete().eq('invoice_id', invId) }
      else { const { data, error } = await supabase.from('invoices').insert({ ...base, status: 'draft' }).select('id').single(); if (error) throw error; invId = data.id }
      const rate = it => seller.kleinunternehmer ? 0 : num(it.vat_rate)
      const itemRows = items.map((it, i) => { const ln = round2(num(it.qty) * num(it.unit_price) * (1 - num(it.discount) / 100)); return { invoice_id: invId, position: i + 1, description: it.description || '', qty: num(it.qty), unit_price: num(it.unit_price), discount: num(it.discount), vat_rate: rate(it), line_net: ln, line_gross: round2(ln * (1 + rate(it) / 100)) } })
      if (itemRows.length) await supabase.from('invoice_items').insert(itemRows)
      if (finalize) {
        const y = +(ed.invoice_date || '').slice(0, 4) || new Date().getFullYear()
        const { data: numData, error: nerr } = await supabase.rpc('next_invoice_number', { p_year: y })
        if (nerr) throw nerr
        await supabase.from('invoices').update({ invoice_number: numData, status: 'open', finalized_at: new Date().toISOString() }).eq('id', invId)
      }
      setEditor(null); await reload()
    } catch (e) { alert('Fehler: ' + (e.message || e)) }
    setBusy(false)
  }
  async function storno(inv) {
    if (!confirm('Rechnung ' + inv.invoice_number + ' stornieren? Es wird eine negative Stornorechnung erstellt.')) return
    setBusy(true)
    try {
      const { data: its } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id).order('position')
      const y = +(inv.invoice_date || '').slice(0, 4) || new Date().getFullYear()
      const { data: numData, error: nerr } = await supabase.rpc('next_invoice_number', { p_year: y }); if (nerr) throw nerr
      const { data: sRow, error } = await supabase.from('invoices').insert({ invoice_number: numData, client_id: inv.client_id, client_name: inv.client_name, invoice_date: new Date().toISOString().slice(0, 10), status: 'storno', storno_of: inv.id, total_net: -inv.total_net, vat_amount: -inv.vat_amount, total_gross: -inv.total_gross, notes: 'Storno zu ' + inv.invoice_number, seller, buyer: inv.buyer || {}, created_by: myId, finalized_at: new Date().toISOString() }).select('id').single()
      if (error) throw error
      if (its?.length) await supabase.from('invoice_items').insert(its.map((it, i) => ({ invoice_id: sRow.id, position: i + 1, description: it.description, qty: it.qty, unit_price: it.unit_price, discount: it.discount || 0, vat_rate: it.vat_rate, line_net: -it.line_net, line_gross: -it.line_gross })))
      await supabase.from('invoices').update({ status: 'storno' }).eq('id', inv.id)
      await reload()
    } catch (e) { alert('Fehler: ' + (e.message || e)) }
    setBusy(false)
  }
  async function downloadPdf(inv) {
    setBusy(true)
    try {
      const { data: its } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id).order('position')
      const bytes = await generateZugferdPdf({ inv, items: its || [], seller, template })
      const blob = new Blob([bytes], { type: 'application/pdf' }); const u = URL.createObjectURL(blob); const a = document.createElement('a')
      a.href = u; a.download = 'Rechnung-' + (inv.invoice_number || 'Entwurf') + '.pdf'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 3000)
    } catch (e) { alert('PDF-Fehler: ' + (e.message || e)) }
    setBusy(false)
  }

  if (loading) return <Shell><div style={{ padding: 60, textAlign: 'center', color: MUT }}>Lädt…</div></Shell>

  const val = i => brutto ? (i.total_gross || 0) : (i.total_net || 0)
  const issued = invoices.filter(i => i.status !== 'draft')
  const now = new Date(), curY = now.getFullYear(), curM = now.getMonth()
  const years = [...new Set(issued.map(i => +(i.invoice_date || '').slice(0, 4)).filter(Boolean))].sort((a, b) => b - a)
  const sum = arr => arr.reduce((s, i) => s + val(i), 0)
  const inYear = y => issued.filter(i => (i.invoice_date || '').slice(0, 4) === String(y))
  const kpiMonth = sum(issued.filter(i => { const d = i.invoice_date || ''; return d.slice(0, 4) === String(curY) && +d.slice(5, 7) === curM + 1 }))
  const kpiYear = sum(inYear(curY)), kpiAll = sum(issued)
  const kpiOpen = invoices.filter(i => i.status === 'open' || i.status === 'overdue').reduce((s, i) => s + (i.total_gross || 0), 0)
  const monthVals = MONTHS.map((_, m) => sum(inYear(year).filter(i => +(i.invoice_date || '').slice(5, 7) === m + 1)))
  const maxMonth = Math.max(1, ...monthVals)
  const byClient = {}; inYear(year).forEach(i => { const k = i.client_name || '—'; byClient[k] = (byClient[k] || 0) + val(i) })
  const clientRows = Object.entries(byClient).sort((a, b) => b[1] - a[1]); const maxClient = Math.max(1, ...clientRows.map(r => r[1]))

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Abrechnung</h1>
        <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, background: '#f6efe0', border: '1px solid #ecdfc4', borderRadius: 20, padding: '3px 10px' }}>🔒 nur du</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setSettingsModal(true)} style={ghost}>⚙ Vorlage & Absender</button>
        <a href="/" style={{ fontSize: 12, color: MUT, textDecoration: 'none' }}>← Board</a>
      </div>
      <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap' }}>
        {[['umsatz', '📊 Umsatz'], ['rechnungen', '🧾 Rechnungen'], ['import', '⬇️ Import']].map(([id, lbl]) => <button key={id} onClick={() => setTab(id)} style={tabBtn(tab === id)}>{lbl}</button>)}
        <div style={{ flex: 1 }} />
        {tab === 'umsatz' && <div style={{ display: 'flex', border: '1px solid ' + LINE, borderRadius: 9, overflow: 'hidden' }}><button onClick={() => setBrutto(false)} style={toggle(!brutto)}>Netto</button><button onClick={() => setBrutto(true)} style={toggle(brutto)}>Brutto</button></div>}
      </div>
      {!hasTable && <div style={{ background: '#fff7e6', border: '1px solid #f0d68a', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#7a5a10', marginBottom: 16 }}>⚠ Rechnungs-Tabellen/Spalten fehlen. Bitte das SQL in Supabase ausführen.</div>}

      {tab === 'umsatz' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 18 }}>
          <Kpi label="Dieser Monat" value={kpiMonth} sub={MONTHS[curM] + ' ' + curY} />
          <Kpi label="Dieses Jahr" value={kpiYear} sub={String(curY)} />
          <Kpi label="Gesamt" value={kpiAll} sub={years.length ? years[years.length - 1] + '–' + years[0] : '—'} />
          <Kpi label="Offen (brutto)" value={kpiOpen} sub="unbezahlt" accent />
        </div>
        <Card title="Umsatz pro Monat" right={<select value={year} onChange={e => setYear(+e.target.value)} style={selS}>{(years.length ? years : [curY]).map(y => <option key={y} value={y}>{y}</option>)}</select>}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, padding: '8px 0' }}>
            {monthVals.map((v, m) => { const isCur = year === curY && m === curM; return <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><div style={{ fontSize: 9, color: MUT }}>{v ? Math.round(v / 1000) + 'k' : ''}</div><div title={eur(v)} style={{ width: '100%', height: Math.max(2, (v / maxMonth) * 120), background: isCur ? 'repeating-linear-gradient(45deg,' + GOLD + ',' + GOLD + ' 4px,#d4ab5e 4px,#d4ab5e 8px)' : GOLD, borderRadius: '4px 4px 0 0', opacity: v ? 1 : .25 }} /><div style={{ fontSize: 10, fontWeight: isCur ? 800 : 500 }}>{MONTHS[m]}</div></div> })}
          </div>
        </Card>
        {years.length > 1 && <Card title="Mehrjahresvergleich">{years.slice().reverse().map(y => { const t = sum(inYear(y)); const mx = Math.max(1, ...years.map(yy => sum(inYear(yy)))); return <div key={y} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}><span style={{ width: 42, fontSize: 12, fontWeight: 700 }}>{y}</span><div style={{ flex: 1, background: '#f3eee2', borderRadius: 6, height: 16, overflow: 'hidden' }}><div style={{ width: (t / mx * 100) + '%', height: '100%', background: y === curY ? GOLD : '#cdb27e' }} /></div><span style={{ width: 110, textAlign: 'right', fontSize: 12, fontWeight: 700 }}>{eur(t)}</span></div> })}</Card>}
        <Card title={'Umsatz nach Kunde · ' + year}>{clientRows.length === 0 && <div style={{ color: MUT, fontSize: 13 }}>Keine Daten für {year}.</div>}{clientRows.map(([name, t]) => <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}><span style={{ width: 150, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span><div style={{ flex: 1, background: '#f3eee2', borderRadius: 6, height: 14, overflow: 'hidden' }}><div style={{ width: (t / maxClient * 100) + '%', height: '100%', background: GOLD }} /></div><span style={{ width: 100, textAlign: 'right', fontSize: 12, fontWeight: 700 }}>{eur(t)}</span></div>)}</Card>
      </>}

      {tab === 'rechnungen' && (
        <Card title={'Rechnungen (' + invoices.length + ')'} right={<button onClick={newInvoice} style={primary}>+ Neue Rechnung</button>}>
          {invoices.length === 0 && <div style={{ color: MUT, fontSize: 13, padding: '12px 0' }}>Noch keine Rechnungen.</div>}
          {invoices.length > 0 && <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ textAlign: 'left', color: MUT }}>{['Nr.', 'Datum', 'Kunde', 'Status', 'Brutto', ''].map((h, i) => <th key={i} style={{ padding: '6px 8px', borderBottom: '1px solid ' + LINE, whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
            <tbody>{invoices.map(i => { const st = STATUS[i.status] || STATUS.open; return <tr key={i.id} style={{ borderBottom: '0.5px solid ' + LINE }}>
              <td style={{ padding: '7px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>{i.invoice_number || '—'}</td>
              <td style={{ padding: '7px 8px', whiteSpace: 'nowrap' }}>{i.invoice_date}</td>
              <td style={{ padding: '7px 8px' }}>{i.client_name}</td>
              <td style={{ padding: '7px 8px' }}><span style={{ fontSize: 11, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' }}>{st.label}</span></td>
              <td style={{ padding: '7px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>{eur(i.total_gross)}</td>
              <td style={{ padding: '7px 8px', whiteSpace: 'nowrap', textAlign: 'right' }}><button onClick={() => downloadPdf(i)} disabled={busy} style={mini}>PDF</button>{i.status === 'draft' && <button onClick={() => editInvoice(i)} style={mini}>Bearb.</button>}{i.status !== 'draft' && i.status !== 'storno' && !i.storno_of && <button onClick={() => storno(i)} disabled={busy} style={{ ...mini, color: '#b3402f' }}>Storno</button>}</td>
            </tr> })}</tbody></table></div>}
        </Card>
      )}

      {tab === 'import' && <ImportTab clients={clients} myId={myId} seller={seller} onDone={reload} />}

      {editor && <InvoiceEditor ed={editor} setEd={setEditor} clients={clients} seller={seller} busy={busy} buyerFromClient={buyerFromClient} onClose={() => setEditor(null)} onDraft={() => persistInvoice(editor, false)} onFinalize={() => persistInvoice(editor, true)} />}
      {settingsModal && <SettingsModal seller={seller} setSeller={setSeller} template={template} setTemplate={setTemplate} onClose={() => setSettingsModal(false)} onSave={saveSettings} />}
    </Shell>
  )
}

function InvoiceEditor({ ed, setEd, clients, seller, busy, buyerFromClient, onClose, onDraft, onFinalize }) {
  const isNew = !ed.id || ed.status === 'draft'
  const set = patch => setEd(p => ({ ...p, ...patch }))
  const setBuyer = patch => setEd(p => ({ ...p, buyer: { ...(p.buyer || {}), ...patch } }))
  const setItem = (i, patch) => setEd(p => ({ ...p, items: p.items.map((it, j) => j === i ? { ...it, ...patch } : it) }))
  const addItem = () => setEd(p => ({ ...p, items: [...p.items, { description: '', qty: 1, unit_price: '', discount: '', vat_rate: seller.kleinunternehmer ? 0 : 19 }] }))
  const delItem = i => setEd(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }))
  const onDate = v => set({ invoice_date: v, due_date: addDays(v, 14) })
  const onClient = v => { const c = clients.find(x => (x.short_name || x.name) === v || x.name === v); set({ client_name: v, client_id: c?.id || null, buyer: c ? buyerFromClient(c) : (ed.buyer || {}) }) }
  const nm = v => num(v)
  let net = 0, vat = 0; ed.items.forEach(it => { const ln = nm(it.qty) * nm(it.unit_price) * (1 - nm(it.discount) / 100); net += ln; vat += seller.kleinunternehmer ? 0 : ln * nm(it.vat_rate) / 100 })
  const b = ed.buyer || {}
  return (
    <Modal onClose={onClose} wide>
      <h2 style={{ margin: '0 0 14px', fontSize: 17 }}>{ed.id ? (ed.status === 'draft' ? 'Entwurf bearbeiten' : 'Rechnung') : 'Neue Rechnung'}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div><label style={LBL}>Kunde</label><input list="cl" value={ed.client_name} onChange={e => onClient(e.target.value)} style={inp} placeholder="Kunde…" /><datalist id="cl">{clients.map(c => <option key={c.id} value={c.short_name || c.name} />)}</datalist></div>
        <div><label style={LBL}>Datum</label><input type="date" value={ed.invoice_date} onChange={e => onDate(e.target.value)} style={inp} /></div>
        <div><label style={LBL}>Fällig (auto +14)</label><input type="date" value={ed.due_date || ''} onChange={e => set({ due_date: e.target.value })} style={inp} /></div>
      </div>
      {/* Kunde infóblokk */}
      <div style={{ background: '#fbf8f1', border: '1px solid ' + LINE, borderRadius: 9, padding: 10, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><label style={LBL}>Firmenname</label><input value={b.company || ''} onChange={e => setBuyer({ company: e.target.value })} style={inp} /></div>
          <div><label style={LBL}>Ansprechpartner</label><input value={b.contact || ''} onChange={e => setBuyer({ contact: e.target.value })} style={inp} /></div>
          <div style={{ gridColumn: '1/-1' }}><label style={LBL}>Adresse</label><input value={b.address || ''} onChange={e => setBuyer({ address: e.target.value })} style={inp} placeholder="Straße, PLZ Ort" /></div>
          <div><label style={LBL}>Telefon</label><input value={b.phone || ''} onChange={e => setBuyer({ phone: e.target.value })} style={inp} /></div>
          <div><label style={LBL}>E-Mail</label><input value={b.email || ''} onChange={e => setBuyer({ email: e.target.value })} style={inp} /></div>
          <div><label style={LBL}>Kundennummer</label><input value={b.kundennr || ''} onChange={e => setBuyer({ kundennr: e.target.value })} style={inp} placeholder="KD…" /></div>
        </div>
      </div>
      <label style={LBL}>Positionen</label>
      {ed.items.map((it, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 52px 80px 56px 64px 26px', gap: 6, marginBottom: 6, alignItems: 'start' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: MUT, paddingTop: 8, textAlign: 'center' }}>{i + 1}</div>
          <textarea value={it.description} onChange={e => setItem(i, { description: e.target.value })} placeholder="Zeile 1: Datum - Kunde - Adresse&#10;Zeile 2: Leistung" rows={2} style={{ ...inp, resize: 'vertical', fontFamily: 'Arial' }} />
          <input value={it.qty} onChange={e => setItem(i, { qty: e.target.value })} placeholder="Anz." style={{ ...inp, textAlign: 'right' }} />
          <input value={it.unit_price} onChange={e => setItem(i, { unit_price: e.target.value })} placeholder="Preis €" style={{ ...inp, textAlign: 'right' }} />
          <input value={it.discount} onChange={e => setItem(i, { discount: e.target.value })} placeholder="Rab.%" style={{ ...inp, textAlign: 'right' }} />
          <select value={it.vat_rate} onChange={e => setItem(i, { vat_rate: e.target.value })} disabled={seller.kleinunternehmer} style={inp}><option value="19">19%</option><option value="7">7%</option><option value="0">0%</option></select>
          <button onClick={() => delItem(i)} style={{ ...mini, color: '#b3402f', marginTop: 4 }}>✕</button>
        </div>
      ))}
      <button onClick={addItem} style={{ ...ghost, marginTop: 2 }}>+ Position</button>
      <div style={{ marginTop: 12 }}><label style={LBL}>Notiz</label><input value={ed.notes || ''} onChange={e => set({ notes: e.target.value })} style={inp} placeholder="optional" /></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 18, marginTop: 14, fontSize: 13 }}>
        <span style={{ color: MUT }}>Netto: <b style={{ color: DARK }}>{eur(net)}</b></span>
        <span style={{ color: MUT }}>MwSt: <b style={{ color: DARK }}>{eur(vat)}</b></span>
        <span style={{ color: MUT }}>Gesamt: <b style={{ color: GOLD }}>{eur(net + vat)}</b></span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
        <button onClick={onClose} style={ghost}>Abbrechen</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {isNew && <button onClick={onDraft} disabled={busy} style={ghost}>Als Entwurf speichern</button>}
          {isNew && <button onClick={() => { if (confirm('Festschreiben? Danach unveränderlich + fortlaufende Nummer.')) onFinalize() }} disabled={busy} style={primary}>{busy ? '…' : 'Festschreiben & Nr. vergeben'}</button>}
        </div>
      </div>
    </Modal>
  )
}

function SettingsModal({ seller, setSeller, template, setTemplate, onClose, onSave }) {
  const [t, setT] = useState('absender')
  const ss = patch => setSeller(p => ({ ...p, ...patch }))
  const st = patch => setTemplate(p => ({ ...p, ...patch }))
  const sf = (k, lbl, ph) => <div><label style={LBL}>{lbl}</label><input value={seller[k] || ''} onChange={e => ss({ [k]: e.target.value })} style={inp} placeholder={ph} /></div>
  const tf = (k, lbl, ph) => <div><label style={LBL}>{lbl}</label><input value={template[k] || ''} onChange={e => st({ [k]: e.target.value })} style={inp} placeholder={ph} /></div>
  const links = template.footerLinks || []
  return (
    <Modal onClose={onClose} wide>
      <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Vorlage & Absender</h2>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button onClick={() => setT('absender')} style={tabBtn(t === 'absender')}>Absender</button>
        <button onClick={() => setT('vorlage')} style={tabBtn(t === 'vorlage')}>Vorlage / Werbung</button>
      </div>
      {t === 'absender' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1/-1' }}>{sf('name', 'Firmenname', 'ImmoPixels e.K.')}</div>
            <div style={{ gridColumn: '1/-1' }}>{sf('street', 'Straße & Nr.')}</div>
            {sf('zip', 'PLZ')}{sf('city', 'Stadt')}
            {sf('vatId', 'USt-IdNr.')}{sf('taxNo', 'Steuernummer')}
            {sf('phone', 'Telefon')}{sf('email', 'E-Mail')}
            {sf('web', 'Web')}{sf('bank', 'Bank')}
            {sf('iban', 'IBAN')}{sf('bic', 'BIC')}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={!!seller.kleinunternehmer} onChange={e => ss({ kleinunternehmer: e.target.checked })} />Kleinunternehmer (§ 19 UStG)</label>
        </>
      ) : (
        <>
          {tf('logoUrl', 'Logo-URL (PNG/JPG)', 'https://…/logo.png')}
          <div style={{ marginTop: 10 }}>{tf('intro', 'Einleitungstext')}</div>
          <div style={{ marginTop: 10 }}>{tf('closing', 'Schlusstext')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            {tf('reviewText', 'Bewertungstext')}{tf('reviewUrl', 'Bewertungs-Link')}
            {tf('bookingUrl', 'Buchungs-Link')}{tf('qrUrl', 'QR-Code Ziel-URL')}
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={LBL}>Werbe-Links (Rechnungsende)</label>
            {links.map((l, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 26px', gap: 6, marginBottom: 6 }}>
                <input value={l.label || ''} onChange={e => st({ footerLinks: links.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} placeholder="Text" style={inp} />
                <input value={l.url || ''} onChange={e => st({ footerLinks: links.map((x, j) => j === i ? { ...x, url: e.target.value } : x) })} placeholder="https://…" style={inp} />
                <button onClick={() => st({ footerLinks: links.filter((_, j) => j !== i) })} style={{ ...mini, color: '#b3402f' }}>✕</button>
              </div>
            ))}
            <button onClick={() => st({ footerLinks: [...links, { label: '', url: '' }] })} style={ghost}>+ Link</button>
          </div>
          <div style={{ fontSize: 11, color: MUT, marginTop: 10 }}>Die QR-Code Ziel-URL wird automatisch als QR-Code am Rechnungsende eingebettet (Werbefläche).</div>
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button onClick={onClose} style={ghost}>Abbrechen</button>
        <button onClick={onSave} style={primary}>Speichern</button>
      </div>
    </Modal>
  )
}

function ImportTab({ clients, myId, seller, onDone }) {
  const [rows, setRows] = useState(null); const [head, setHead] = useState([]); const [map, setMap] = useState({}); const [busy, setBusy] = useState(false); const [done, setDone] = useState(null)
  function parseCSV(text) { const fl = text.split('\n')[0]; const delim = (fl.split(';').length > fl.split(',').length) ? ';' : ','; const out = []; let row = [], cur = '', q = false; for (let i = 0; i < text.length; i++) { const ch = text[i]; if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += ch } else { if (ch === '"') q = true; else if (ch === delim) { row.push(cur); cur = '' } else if (ch === '\n') { row.push(cur); out.push(row); row = []; cur = '' } else if (ch !== '\r') cur += ch } } if (cur || row.length) { row.push(cur); out.push(row) } return out.filter(r => r.some(c => (c || '').trim() !== '')) }
  function guess(h) { const find = ks => h.findIndex(x => ks.some(k => x.toLowerCase().includes(k))); return { number: find(['nummer', 'rechnungsnr', 'invoice', 'beleg']), date: find(['datum', 'date']), client: find(['kunde', 'name', 'firma', 'client']), net: find(['netto', 'net']), gross: find(['brutto', 'gesamt', 'total', 'gross']), status: find(['status', 'bezahlt', 'paid']) } }
  function onFile(e) { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const all = parseCSV(String(r.result)); if (all.length < 2) { alert('Leere CSV'); return } setHead(all[0]); setRows(all.slice(1)); setMap(guess(all[0])) }; r.readAsText(f, 'utf-8') }
  const norm = s => (s || '').trim().toLowerCase()
  const existsClient = name => clients.find(c => norm(c.short_name) === norm(name) || norm(c.name) === norm(name))
  function statusOf(v) { const s = norm(v); if (s.includes('storn')) return 'storno'; if (s.includes('bezahlt') || s.includes('paid') || s === 'ja' || s === '1') return 'paid'; if (s.includes('überf') || s.includes('overdue')) return 'overdue'; return 'open' }
  function mapDate(v) { const s = (v || '').trim(); let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/); if (m) return m[3] + '-' + m[2] + '-' + m[1]; m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0].slice(0, 10); return new Date().toISOString().slice(0, 10) }
  async function doImport() { if (map.client < 0) { alert('Kunden-Spalte zuordnen.'); return } setBusy(true); let created = 0, imported = 0, skipped = 0; try { const cache = {}; for (const r of rows) { const name = (r[map.client] || '').trim(); if (!name) { skipped++; continue } let cid = existsClient(name)?.id || cache[norm(name)]; if (!cid) { const { data: nc } = await supabase.from('clients').insert({ name }).select('id').single(); if (nc) { cid = nc.id; cache[norm(name)] = cid; created++ } } const numv = map.number >= 0 ? (r[map.number] || '').trim() : null; if (numv) { const { data: ex } = await supabase.from('invoices').select('id').eq('invoice_number', numv).maybeSingle(); if (ex) { skipped++; continue } } const gross = map.gross >= 0 ? num(r[map.gross]) : 0; const net = map.net >= 0 ? num(r[map.net]) : round2(gross / 1.19); const { error } = await supabase.from('invoices').insert({ invoice_number: numv, client_id: cid, client_name: name, invoice_date: map.date >= 0 ? mapDate(r[map.date]) : new Date().toISOString().slice(0, 10), status: map.status >= 0 ? statusOf(r[map.status]) : 'paid', total_net: net, vat_amount: round2(gross - net), total_gross: gross, seller, buyer: { company: name }, created_by: myId, finalized_at: new Date().toISOString(), notes: 'Import (Billomat)' }); if (!error) imported++; else skipped++ } setDone({ created, imported, skipped }); setRows(null); onDone && onDone() } catch (e) { alert('Import-Fehler: ' + (e.message || e)) } setBusy(false) }
  return (
    <Card title="Billomat-Import (CSV, einmalig)">
      <div style={{ fontSize: 13, color: MUT, marginBottom: 12, lineHeight: 1.6 }}>Rechnungen aus Billomat als CSV exportieren und hochladen. Bestehende Kunden = <b style={{ color: '#2f7a4f' }}>✓ vorhanden</b>, nur fehlende neu. Bereits importierte Nummern werden übersprungen.</div>
      {done && <div style={{ background: '#e6f3ec', border: '1px solid #b6dcc4', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#2f7a4f', marginBottom: 12 }}>✓ Fertig: {done.imported} Rechnungen, {done.created} neue Kunden, {done.skipped} übersprungen.</div>}
      <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ fontSize: 13, marginBottom: 14 }} />
      {rows && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 14 }}>{[['number', 'Rechnungsnr.'], ['date', 'Datum'], ['client', 'Kunde *'], ['net', 'Netto'], ['gross', 'Brutto'], ['status', 'Status']].map(([k, lbl]) => <div key={k}><label style={LBL}>{lbl}</label><select value={map[k] ?? -1} onChange={e => setMap(m => ({ ...m, [k]: +e.target.value }))} style={inp}><option value={-1}>— ignorieren —</option>{head.map((h, i) => <option key={i} value={i}>{h || ('Spalte ' + (i + 1))}</option>)}</select></div>)}</div>
        <div style={{ fontSize: 12, color: MUT, marginBottom: 8 }}>{rows.length} Zeilen. Vorschau:</div>
        <div style={{ overflowX: 'auto', marginBottom: 12 }}><table style={{ fontSize: 11, borderCollapse: 'collapse', width: '100%' }}><thead><tr style={{ color: MUT, textAlign: 'left' }}>{['Nr.', 'Datum', 'Kunde', 'Brutto', ''].map((h, i) => <th key={i} style={{ padding: '4px 6px', borderBottom: '1px solid ' + LINE }}>{h}</th>)}</tr></thead><tbody>{rows.slice(0, 4).map((r, i) => { const nm2 = (r[map.client] || '').trim(); const ex = existsClient(nm2); return <tr key={i}><td style={td}>{map.number >= 0 ? r[map.number] : '—'}</td><td style={td}>{map.date >= 0 ? r[map.date] : '—'}</td><td style={td}>{nm2}</td><td style={td}>{map.gross >= 0 ? r[map.gross] : '—'}</td><td style={td}>{ex ? <span style={{ color: '#2f7a4f' }}>✓ vorhanden</span> : <span style={{ color: GOLD }}>neu</span>}</td></tr> })}</tbody></table></div>
        <button onClick={doImport} disabled={busy} style={primary}>{busy ? 'Importiere…' : 'Import starten (' + rows.length + ')'}</button>
      </>}
    </Card>
  )
}

function Shell({ children }) { return <div style={{ minHeight: '100dvh', background: CREAM, fontFamily: 'Arial, sans-serif', color: DARK }}><div style={{ maxWidth: 920, margin: '0 auto', padding: '24px 16px 90px' }}>{children}</div></div> }
function Kpi({ label, value, sub, accent }) { return <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: '14px 16px' }}><div style={{ fontSize: 11, color: MUT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div><div style={{ fontSize: 22, fontWeight: 800, color: accent ? '#9a6a12' : DARK, marginTop: 4 }}>{eur(value)}</div><div style={{ fontSize: 11, color: MUT, marginTop: 2 }}>{sub}</div></div> }
function Card({ title, right, children }) { return <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 14, padding: 16, marginBottom: 16 }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}><div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>{right}</div>{children}</div> }
function Modal({ children, onClose, wide }) { return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', zIndex: 100, overflowY: 'auto' }}><div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 20, width: '100%', maxWidth: wide ? 660 : 460, fontFamily: 'Arial' }}>{children}</div></div> }
const tabBtn = a => ({ padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (a ? GOLD : LINE), background: a ? GOLD : '#fff', color: a ? '#fff' : MUT })
const toggle = a => ({ padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: a ? GOLD : '#fff', color: a ? '#fff' : MUT })
const selS = { border: '1px solid ' + LINE, borderRadius: 7, padding: '5px 8px', fontSize: 12, background: '#fff', color: DARK, fontWeight: 700 }
const primary = { background: GOLD, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const ghost = { background: '#fff', color: DARK, border: '1px solid ' + LINE, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const mini = { background: 'none', border: '1px solid ' + LINE, borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: DARK, marginLeft: 4 }
const inp = { width: '100%', border: '1.5px solid ' + LINE, borderRadius: 7, padding: '7px 9px', fontSize: 12, color: DARK, fontFamily: 'Arial', outline: 'none', boxSizing: 'border-box' }
const LBL = { fontSize: 10, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4, display: 'block' }
const td = { padding: '4px 6px', borderBottom: '0.5px solid ' + LINE, whiteSpace: 'nowrap' }
