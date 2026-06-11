'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { generateZugferdPdf } from '../../../lib/invoice/zugferd'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const GOLD = '#b8892a', DARK = '#2a2a28', MUT = '#8a8278', LINE = '#ece4d6', BG = '#f4f1ea'
const eur = n => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const num = v => { if (typeof v === 'number') return v; let s = String(v ?? '').trim(); if (!s) return 0; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); s = s.replace(/[^\d.\-]/g, ''); const n = parseFloat(s); return isNaN(n) ? 0 : n }
const round2 = n => Math.round((Number(n) || 0) * 100) / 100
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00'); if (isNaN(x)) return ''; x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }
const DEFAULT_SELLER = { name: 'ImmoPixels e.K.', street: 'Gartenstr. 2', zip: '67310', city: 'Hettenleidelheim', vatId: 'DE351098294', taxNo: '', iban: 'DE65672500201003013371', bic: 'SOLADES1HDB', bank: 'Sparkasse Heidelberg', phone: '+49 176 41576629', email: 'rechnung@immopixels.de', web: 'www.immopixels.de', kleinunternehmer: false }
const DEFAULT_TEMPLATE = { intro: 'Hiermit stellen wir Ihnen die folgenden Positionen in Rechnung.', closing: 'Vielen Dank für die Zusammenarbeit!', reviewText: '', reviewUrl: '', bookingUrl: 'https://immopixels.de/booking/', qrUrl: '', logoUrl: '', footerLinks: [] }
const emptyItem = vat => ({ title: '', desc: '', qty: 1, unit_price: '', discount: '', vat_rate: vat })

export default function NeueRechnungPage() {
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState(null)
  const [clients, setClients] = useState([])
  const [seller, setSeller] = useState(DEFAULT_SELLER)
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [inv, setInv] = useState(null)
  const [busy, setBusy] = useState(false)
  const [savedNo, setSavedNo] = useState(null)

  useEffect(() => { init() }, [])
  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: staff } = await supabase.from('staff').select('*').eq('email', user.email).single()
    if (!staff || (staff.role_level !== 'admin' && !staff.can_invoice)) { window.location.href = '/'; return }
    setMyId(staff.id)
    const { data: cls } = await supabase.from('clients').select('id,name,short_name,addr,email,tel,contact_firstname,contact_lastname,contact_tel,contact_email').order('name')
    setClients(cls || [])
    const { data: s1 } = await supabase.from('settings').select('value').eq('key', 'invoice_seller').maybeSingle(); let sl = DEFAULT_SELLER
    if (s1?.value) { try { sl = { ...DEFAULT_SELLER, ...JSON.parse(s1.value) }; setSeller(sl) } catch {} }
    const { data: s2 } = await supabase.from('settings').select('value').eq('key', 'invoice_template').maybeSingle()
    if (s2?.value) { try { setTemplate({ ...DEFAULT_TEMPLATE, ...JSON.parse(s2.value) }) } catch {} }

    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    const today = new Date().toISOString().slice(0, 10)
    if (id) {
      const { data: row } = await supabase.from('invoices').select('*').eq('id', id).single()
      const { data: its } = await supabase.from('invoice_items').select('*').eq('invoice_id', id).order('position')
      if (row) setInv({ ...row, buyer: row.buyer || {}, items: (its && its.length ? its : [emptyItem(19)]).map(it => { const [tt, ...d] = String(it.description || '').split('\n'); return { title: tt || '', desc: d.join('\n'), qty: it.qty ?? 1, unit_price: it.unit_price ?? '', discount: it.discount || '', vat_rate: it.vat_rate ?? 19 } }) })
      else newBlank(today, sl)
    } else {
      let pf = null; try { pf = JSON.parse(localStorage.getItem('ip-invoice-prefill') || 'null') } catch {}
      if (pf) localStorage.removeItem('ip-invoice-prefill')
      if (pf) {
        const c = (cls || []).find(x => x.id === pf.client_id || x.name === pf.client_name || x.short_name === pf.client_name)
        setInv({ invoice_date: pf.invoice_date || today, due_date: addDays(pf.invoice_date || today, 14), client_id: c?.id || null, client_name: c?.name || pf.client_name || '', buyer: c ? buyerFromClient(c) : {}, notes: '', items: (pf.items && pf.items.length ? pf.items : [emptyItem(sl.kleinunternehmer ? 0 : 19)]).map(it => { const [tt, ...d] = String(it.description || '').split('\n'); return { title: tt || '', desc: d.join('\n'), qty: it.qty ?? 1, unit_price: it.unit_price ?? '', discount: it.discount || '', vat_rate: it.vat_rate ?? (sl.kleinunternehmer ? 0 : 19) } }) })
      } else newBlank(today, sl)
    }
    setLoading(false)
  }
  function newBlank(today, sl) { setInv({ invoice_date: today, due_date: addDays(today, 14), client_id: null, client_name: '', buyer: {}, notes: '', items: [emptyItem(sl.kleinunternehmer ? 0 : 19)] }) }
  function buyerFromClient(c) { if (!c) return {}; return { company: c.name || '', contact: [c.contact_firstname, c.contact_lastname].filter(Boolean).join(' '), address: c.addr || '', email: c.contact_email || c.email || '', phone: c.contact_tel || c.tel || '', kundennr: c.kundennr || '' } }

  const set = patch => setInv(p => ({ ...p, ...patch }))
  const setBuyer = patch => setInv(p => ({ ...p, buyer: { ...(p.buyer || {}), ...patch } }))
  const setItem = (i, patch) => setInv(p => ({ ...p, items: p.items.map((it, j) => j === i ? { ...it, ...patch } : it) }))
  const addItem = () => setInv(p => ({ ...p, items: [...p.items, emptyItem(seller.kleinunternehmer ? 0 : 19)] }))
  const delItem = i => setInv(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }))
  const moveItem = (i, dir) => setInv(p => { const a = [...p.items]; const j = i + dir; if (j < 0 || j >= a.length) return p; const tmp = a[i]; a[i] = a[j]; a[j] = tmp; return { ...p, items: a } })
  const onDate = v => set({ invoice_date: v, due_date: addDays(v, 14) })
  const onClient = name => { const c = clients.find(x => x.name === name || x.short_name === name); set({ client_name: c?.name || name, client_id: c?.id || null, buyer: c ? buyerFromClient(c) : (inv.buyer || {}) }) }

  function totals() { let net = 0, vat = 0; (inv?.items || []).forEach(it => { const ln = num(it.qty) * num(it.unit_price) * (1 - num(it.discount) / 100); net += ln; vat += seller.kleinunternehmer ? 0 : ln * num(it.vat_rate) / 100 }); return { net: round2(net), vat: round2(vat), gross: round2(net + vat) } }
  function toInvoiceObj(numberStr) { const t = totals(); return { invoice_number: numberStr || inv.invoice_number || null, client_name: inv.client_name, invoice_date: inv.invoice_date, due_date: inv.due_date, total_net: t.net, vat_amount: t.vat, total_gross: t.gross, notes: inv.notes, buyer: inv.buyer || {}, storno_of: inv.storno_of || null } }
  function itemsForDb(invId) { const rate = it => seller.kleinunternehmer ? 0 : num(it.vat_rate); return inv.items.filter(it => (it.title || '').trim() || (it.desc || '').trim() || num(it.unit_price)).map((it, i) => { const ln = round2(num(it.qty) * num(it.unit_price) * (1 - num(it.discount) / 100)); return { invoice_id: invId, position: i + 1, description: [it.title, it.desc].filter(Boolean).join('\n'), qty: num(it.qty), unit_price: num(it.unit_price), discount: num(it.discount), vat_rate: rate(it), line_net: ln, line_gross: round2(ln * (1 + rate(it) / 100)) } }) }

  async function save(finalize) {
    setBusy(true)
    try {
      const t = totals()
      const base = { client_id: inv.client_id || null, client_name: inv.client_name || '', invoice_date: inv.invoice_date, due_date: inv.due_date || null, total_net: t.net, vat_amount: t.vat, total_gross: t.gross, notes: inv.notes || null, seller, buyer: inv.buyer || {}, created_by: myId }
      let invId = inv.id
      if (invId) { const { error } = await supabase.from('invoices').update(base).eq('id', invId); if (error) throw error; await supabase.from('invoice_items').delete().eq('invoice_id', invId) }
      else { const { data, error } = await supabase.from('invoices').insert({ ...base, status: 'draft' }).select('id').single(); if (error) throw error; invId = data.id; setInv(p => ({ ...p, id: invId })) }
      const rows = itemsForDb(invId)
      if (rows.length) { const { error: ie } = await supabase.from('invoice_items').insert(rows); if (ie) throw ie }
      if (finalize) {
        const y = +(inv.invoice_date || '').slice(0, 4) || new Date().getFullYear()
        const { data: numData, error: nerr } = await supabase.rpc('next_invoice_number', { p_year: y }); if (nerr) throw nerr
        await supabase.from('invoices').update({ invoice_number: numData, status: 'open', finalized_at: new Date().toISOString() }).eq('id', invId)
        setInv(p => ({ ...p, invoice_number: numData, status: 'open' })); setSavedNo(numData)
      } else { setSavedNo('Entwurf gespeichert') }
    } catch (e) { alert('Fehler beim Speichern: ' + (e.message || e)) }
    setBusy(false)
  }
  async function pdf() {
    setBusy(true)
    try { const obj = toInvoiceObj(); const items = itemsForDb('x'); const bytes = await generateZugferdPdf({ inv: obj, items, seller, template }); const blob = new Blob([bytes], { type: 'application/pdf' }); const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = 'Rechnung-' + (obj.invoice_number || 'Entwurf') + '.pdf'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 3000) } catch (e) { alert('PDF-Fehler: ' + (e.message || e)) }
    setBusy(false)
  }

  if (loading || !inv) return <div style={{ minHeight: '100dvh', background: BG, fontFamily: 'Arial', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUT }}>Lädt…</div>
  const t = totals()
  const finalized = inv.id && inv.status && inv.status !== 'draft'

  return (
    <div style={{ minHeight: '100dvh', background: BG, fontFamily: 'Arial, sans-serif', color: DARK }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', borderBottom: '1px solid ' + LINE, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>{finalized ? 'Rechnung ' + inv.invoice_number : (inv.id ? 'Entwurf bearbeiten' : 'Neue Rechnung')}{savedNo && <span style={{ color: '#2f7a4f', fontSize: 12, marginLeft: 10 }}>✓ {savedNo}</span>}</div>
        <button onClick={pdf} disabled={busy} style={ghost}>PDF</button>
        {!finalized && <button onClick={() => save(false)} disabled={busy} style={ghost}>Als Entwurf speichern</button>}
        {!finalized && <button onClick={() => { if (confirm('Festschreiben? Danach unveränderlich + fortlaufende Nummer.')) save(true) }} disabled={busy} style={primary}>{busy ? '…' : 'Festschreiben'}</button>}
        <button onClick={() => window.close()} style={ghost}>Schließen</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16, maxWidth: 1200, margin: '0 auto', padding: 18, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: 18 }}>
          <Lbl>Anschrift</Lbl>
          <textarea value={[inv.buyer?.company, inv.buyer?.contact, inv.buyer?.address].filter(Boolean).join('\n')} readOnly rows={4} style={{ ...box, width: '100%', resize: 'vertical', fontFamily: 'Arial', color: MUT, background: '#f9f7f2' }} placeholder="(über Kunde rechts wählen)" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div><Lbl>Datum</Lbl><input type="date" value={inv.invoice_date} onChange={e => onDate(e.target.value)} style={{ ...box, width: '100%' }} /></div>
            <div><Lbl>Rechnungsnummer</Lbl><input value={inv.invoice_number || 'Entwurf · vorläufig'} disabled style={{ ...box, width: '100%', color: MUT, background: '#f6f4ef' }} /></div>
          </div>
          <div style={{ marginTop: 12 }}><Lbl>Einleitungstext</Lbl><textarea value={inv.intro ?? template.intro} onChange={e => set({ intro: e.target.value })} rows={2} style={{ ...box, width: '100%', resize: 'vertical', fontFamily: 'Arial' }} /></div>

          <div style={{ marginTop: 18, marginBottom: 8, fontSize: 13, fontWeight: 800 }}>Positionen</div>
          <div style={{ display: 'grid', gridTemplateColumns: '22px 52px 86px 70px 56px 1fr 26px', gap: 6, fontSize: 9, fontWeight: 700, color: MUT, textTransform: 'uppercase', marginBottom: 4, padding: '0 2px' }}>
            <span>Pos</span><span>Anzahl</span><span>Preis</span><span>Steuer</span><span>Rabatt</span><span>Titel / Beschreibung</span><span></span>
          </div>
          {inv.items.map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '22px 52px 86px 70px 56px 1fr 26px', gap: 6, marginBottom: 8, alignItems: 'start', background: '#fbfaf7', border: '1px solid ' + LINE, borderRadius: 8, padding: '8px 6px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: MUT, textAlign: 'center', paddingTop: 8 }}>{i + 1}</div>
              <input value={it.qty} onChange={e => setItem(i, { qty: e.target.value })} style={{ ...box, textAlign: 'right' }} />
              <input value={it.unit_price} onChange={e => setItem(i, { unit_price: e.target.value })} placeholder="0,00" style={{ ...box, textAlign: 'right' }} />
              <select value={it.vat_rate} onChange={e => setItem(i, { vat_rate: e.target.value })} disabled={seller.kleinunternehmer} style={box}><option value="19">19%</option><option value="7">7%</option><option value="0">0%</option></select>
              <input value={it.discount} onChange={e => setItem(i, { discount: e.target.value })} placeholder="0%" style={{ ...box, textAlign: 'right' }} />
              <div>
                <input value={it.title} onChange={e => setItem(i, { title: e.target.value })} placeholder="z.B. 01.06.2026 - EV-Da - Adresse" style={{ ...box, width: '100%', marginBottom: 4, fontWeight: 600 }} />
                <textarea value={it.desc} onChange={e => setItem(i, { desc: e.target.value })} placeholder="Leistung (z.B. Immobilienfotografie + Postproduktion)" rows={2} style={{ ...box, width: '100%', resize: 'vertical', fontFamily: 'Arial' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', paddingTop: 4 }}>
                <button onClick={() => moveItem(i, -1)} style={icon}>↑</button>
                <button onClick={() => moveItem(i, 1)} style={icon}>↓</button>
                <button onClick={() => delItem(i)} style={{ ...icon, color: '#b3402f' }}>✕</button>
              </div>
            </div>
          ))}
          <button onClick={addItem} style={ghost}>+ Position</button>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 22, marginTop: 16, paddingTop: 12, borderTop: '1px solid ' + LINE, fontSize: 13 }}>
            <span style={{ color: MUT }}>Netto <b style={{ color: DARK }}>{eur(t.net)}</b></span>
            <span style={{ color: MUT }}>USt <b style={{ color: DARK }}>{eur(t.vat)}</b></span>
            <span style={{ color: MUT }}>Gesamt <b style={{ color: GOLD, fontSize: 15 }}>{eur(t.gross)}</b></span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Side title="Kunde">
            <input list="clf" value={inv.client_name} onChange={e => onClient(e.target.value)} placeholder="Kunde suchen (voller Name)…" style={{ ...box, width: '100%' }} />
            <datalist id="clf">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
            {inv.buyer?.company && (
              <div style={{ marginTop: 10, fontSize: 12, color: DARK, lineHeight: 1.5 }}>
                {inv.buyer.kundennr && <div style={{ color: GOLD, fontWeight: 700 }}>[{inv.buyer.kundennr}]</div>}
                <div style={{ fontWeight: 700 }}>{inv.buyer.company}</div>
                {inv.buyer.contact && <div>{inv.buyer.contact}</div>}
                {inv.buyer.address && <div style={{ color: MUT }}>{inv.buyer.address}</div>}
                {inv.buyer.email && <div style={{ color: MUT }}>{inv.buyer.email}</div>}
                {inv.buyer.phone && <div style={{ color: MUT }}>{inv.buyer.phone}</div>}
              </div>
            )}
          </Side>
          <Side title="Fälligkeit">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>In <input value={dueDays(inv)} onChange={e => set({ due_date: addDays(inv.invoice_date, parseInt(e.target.value) || 0) })} style={{ ...box, width: 44, textAlign: 'center' }} /> Tagen =
              <input type="date" value={inv.due_date || ''} onChange={e => set({ due_date: e.target.value })} style={{ ...box, flex: 1 }} /></div>
          </Side>
          <Side title="Kundendaten">
            <Field label="Firmenname" v={inv.buyer?.company} on={v => setBuyer({ company: v })} />
            <Field label="Ansprechpartner" v={inv.buyer?.contact} on={v => setBuyer({ contact: v })} />
            <Field label="Adresse" v={inv.buyer?.address} on={v => setBuyer({ address: v })} />
            <Field label="Telefon" v={inv.buyer?.phone} on={v => setBuyer({ phone: v })} />
            <Field label="E-Mail" v={inv.buyer?.email} on={v => setBuyer({ email: v })} />
            <Field label="Kundennummer" v={inv.buyer?.kundennr} on={v => setBuyer({ kundennr: v })} />
          </Side>
        </div>
      </div>
    </div>
  )
}

function dueDays(inv) { if (!inv.due_date || !inv.invoice_date) return 14; const a = new Date(inv.invoice_date + 'T00:00:00'), d = new Date(inv.due_date + 'T00:00:00'); return Math.round((d - a) / 86400000) }
function Lbl({ children }) { return <div style={{ fontSize: 10, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>{children}</div> }
function Side({ title, children }) { return <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, overflow: 'hidden' }}><div style={{ background: DARK, color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '.5px', padding: '8px 12px', textTransform: 'uppercase' }}>{title}</div><div style={{ padding: 12 }}>{children}</div></div> }
function Field({ label, v, on }) { return <div style={{ marginBottom: 8 }}><Lbl>{label}</Lbl><input value={v || ''} onChange={e => on(e.target.value)} style={{ ...box, width: '100%' }} /></div> }
const box = { border: '1.5px solid ' + LINE, borderRadius: 6, padding: '7px 8px', fontSize: 12, color: DARK, fontFamily: 'Arial', outline: 'none', boxSizing: 'border-box', background: '#fff' }
const primary = { background: GOLD, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const ghost = { background: '#fff', color: DARK, border: '1px solid ' + LINE, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const icon = { background: 'none', border: 'none', cursor: 'pointer', color: MUT, fontSize: 12, padding: 1, lineHeight: 1 }
