'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import RechnungShell from '../../../components/RechnungShell'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const DARK = '#2a2a28', MUT = '#8a8278', LINE = '#e9e1d2', GOLD = '#6b6b6e'
const GREEN = '#1d9e75', GREENBG = '#e3f5ee', GREENTX = '#0f6e56'
const RED = '#a32d2d', REDBG = '#fbe9e9', AMBER = '#ba7517', AMBERBG = '#faf0dd', AMBERTX = '#7a4e0c'
const eur = n => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const eur0 = n => Math.round(Number(n) || 0).toLocaleString('de-DE') + ' €'
const dDE = s => s ? new Date(s).toLocaleDateString('de-DE') : '—'
const today = () => new Date().toISOString().slice(0, 10)
const MONN = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const CATRULES = [
  [/\bdkv\b|euro service|tankkarte|tankstelle|kraftstoff|treibstoff|\baral\b|\bshell\b|\besso\b|total ?energies|\bjet\b|sprit|tanken/, 'Fahrtkosten (Reisekosten)'],
  [/\bbahn\b|deutsche bahn|flixbus|booking|hotel|lufthansa|\bflug\b|airbnb/, 'Reisekosten'],
  [/adobe|surfshark|google|microsoft|dropbox|openai|anthropic|vercel|supabase|figma|canva|notion|slack|\bzoom\b|apple\.com|spotify|\babo\b|software|lizenz/, 'Software / Abos'],
  [/telekom|vodafone|\bo2\b|1&1|1und1|telefon|internet|mobilfunk/, 'Telefon / Internet'],
  [/versicherung|allianz|\bhuk\b|\baxa\b|ergo|gothaer|provinzial|signal iduna/, 'Versicherung'],
  [/finanzamt|steuer|umsatzsteuer|vorauszahlung|ust-/, 'Steuern / Finanzamt'],
  [/calumet|foto|kamera|objektiv|saturn|mediamarkt|technik|gravur|drohne|dji/, 'Ausrüstung'],
  [/druckerei|\bdruck\b|print|flyer|visitenkart|\bmaterial\b/, 'Material / Druck'],
  [/\bmeta\b|facebook|instagram|linkedin|werbung|\bads\b|marketing|google ads/, 'Marketing'],
  [/gehalt|lohn|\bpersonal\b|sozialvers|krankenkasse|minijob/, 'Personal / Gehälter'],
  [/dina cristian|übertrag|uebertrag|umbuchung|privatentnahme|\bprivat\b/, 'Privatentnahme / Übertrag'],
  [/gebühr|gebuehr|entgelt|kontoführ|kontofuehr|kartenpreis/, 'Bankgebühren'],
  [/miete|pacht|nebenkosten|strom|gas\b|stadtwerke/, 'Miete / Nebenkosten'],
]
function categorize(name, purpose) { const b = ((name || '') + ' ' + (purpose || '')).toLowerCase(); for (const [re, cat] of CATRULES) if (re.test(b)) return cat; return 'Sonstiges' }
const CAT_ICON = { 'Fahrtkosten (Reisekosten)': '⛽', 'Reisekosten': '✈️', 'Software / Abos': '💻', 'Telefon / Internet': '📶', 'Versicherung': '🛡️', 'Steuern / Finanzamt': '🏛️', 'Ausrüstung': '📷', 'Material / Druck': '🖨️', 'Marketing': '📣', 'Personal / Gehälter': '👥', 'Privatentnahme / Übertrag': '↪️', 'Bankgebühren': '🏦', 'Miete / Nebenkosten': '🏠', 'Sonstiges': '•' }

export default function ZahlungenPage() {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [invoices, setInvoices] = useState([])
  const [matches, setMatches] = useState([])
  const [view, setView] = useState('eingang')
  const [debits, setDebits] = useState([])
  const [belege, setBelege] = useState([])
  const [openCat, setOpenCat] = useState(null)
  const [monAnchor, setMonAnchor] = useState(() => new Date().toISOString().slice(0, 7))
  const [drag, setDrag] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { init() }, [])
  async function init() { const { data: { user } } = await supabase.auth.getUser(); if (!user) { window.location.href = '/login'; return } await load(); setLoading(false) }
  async function load() {
    const { data: inv } = await supabase.from('invoices').select('id, invoice_number, client_name, invoice_date, due_date, status, total_gross, paid_at').not('status', 'eq', 'draft').order('invoice_date', { ascending: false })
    const { data: m } = await supabase.from('payment_matches').select('id, status, amount, tx_id, invoice_id, bank_transactions(booking_date, amount, counterparty, purpose), invoices(invoice_number, client_name, total_gross)').order('created_at', { ascending: false })
    setInvoices(inv || []); setMatches(m || [])
    const { data: dz } = await supabase.from('bank_transactions').select('id, booking_date, amount, counterparty, purpose').lt('amount', 0).order('booking_date', { ascending: false }).limit(2000)
    setDebits(dz || [])
    const { data: bg } = await supabase.from('eingangsrechnungen').select('id, lieferant, brutto, datum').eq('typ', 'eingangsrechnung').limit(2000)
    setBelege(bg || [])
  }

  function fileToB64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => { const b = String(r.result); res(b.slice(b.indexOf(',') + 1)) }; r.onerror = rej; r.readAsDataURL(file) }) }
  async function handleFiles(files) {
    const arr = Array.from(files || []); if (!arr.length) return
    setBusy(true); let imp = 0, auto = 0, sugg = 0, errs = []
    for (const f of arr) {
      try {
        const data = await fileToB64(f)
        const r = await fetch('/api/bank/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) })
        const j = await r.json()
        if (j.ok) { imp += j.imported || 0; auto += j.auto || 0; sugg += j.suggested || 0 } else errs.push(f.name + ' — ' + (j.reason || 'Fehler'))
      } catch (e) { errs.push(f.name + ' — ' + (e.message || 'Fehler')) }
    }
    setBusy(false); await load()
    let msg = `✓ ${imp} neue Umsätze importiert · ${auto} automatisch zugeordnet · ${sugg} Vorschläge.`
    if (errs.length) msg += '\n\n⚠️\n• ' + errs.join('\n• ')
    alert(msg)
  }
  async function rematch() { setBusy(true); await fetch('/api/bank/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rematch: true }) }); setBusy(false); await load() }

  async function confirmMatch(m) {
    setBusy(true)
    await supabase.from('payment_matches').update({ status: 'confirmed' }).eq('id', m.id)
    const pd = m.bank_transactions?.booking_date || today()
    await supabase.from('invoices').update({ status: 'paid', paid_at: pd }).eq('id', m.invoice_id)
    setBusy(false); await load()
  }
  async function dismissMatch(m) { setBusy(true); await supabase.from('payment_matches').update({ status: 'dismissed' }).eq('id', m.id); setBusy(false); await load() }

  if (loading) return <RechnungShell active="zahlungen"><div style={{ padding: 60, textAlign: 'center', color: MUT }}>Lädt…</div></RechnungShell>

  const Toggle = () => (
    <div style={{ display: 'flex', gap: 2, background: '#ece5d7', borderRadius: 10, padding: 3, marginBottom: 16, width: 'fit-content' }}>
      {[['eingang', 'Zahlungseingänge'], ['ausgaben', 'Ausgaben']].map(([k, l]) => (
        <button key={k} onClick={() => setView(k)} style={{ padding: '6px 16px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 8, background: view === k ? '#fff' : 'transparent', color: view === k ? DARK : MUT }}>{l}</button>
      ))}
    </div>
  )

  if (view === 'ausgaben') {
    const md = debits.filter(d => (d.booking_date || '').slice(0, 7) === monAnchor)
    const groups = {}
    for (const d of md) { const cat = categorize(d.counterparty, d.purpose); (groups[cat] = groups[cat] || { sum: 0, items: [] }); groups[cat].sum += Math.abs(Number(d.amount) || 0); groups[cat].items.push(d) }
    const cats = Object.entries(groups).sort((a, b) => b[1].sum - a[1].sum)
    const total = md.reduce((s, d) => s + Math.abs(Number(d.amount) || 0), 0)
    const hasBeleg = amt => belege.some(b => Math.abs((Math.abs(Number(b.brutto) || 0)) - Math.abs(Number(amt) || 0)) < 0.01)
    const [yy, mm] = monAnchor.split('-').map(Number)
    const shiftMon = dir => { const dt = new Date(yy, mm - 1 + dir, 1); setMonAnchor(dt.toISOString().slice(0, 7)); setOpenCat(null) }
    return (
      <RechnungShell active="zahlungen">
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <Toggle />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>Ausgaben</div>
              <div style={{ fontSize: 13, color: MUT, marginTop: 2 }}>Bank-Belastungen nach Kategorie · aus denselben importierten Umsätzen (DKV/Tanken = Fahrtkosten)</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => shiftMon(-1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid ' + LINE, background: '#fff', cursor: 'pointer', color: GOLD }}>‹</button>
              <span style={{ fontSize: 14, fontWeight: 700, minWidth: 120, textAlign: 'center' }}>{MONN[mm - 1]} {yy}</span>
              <button onClick={() => shiftMon(1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid ' + LINE, background: '#fff', cursor: 'pointer', color: GOLD }}>›</button>
            </div>
          </div>
          <div style={{ background: '#faf7f1', borderRadius: 11, padding: '13px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, color: MUT }}>Ausgaben gesamt ({md.length} Buchungen)</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: RED }}>− {eur0(total)}</span>
          </div>
          {cats.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: MUT, fontSize: 13, background: '#fff', border: '1px solid ' + LINE, borderRadius: 12 }}>Keine Ausgaben in diesem Monat. Erst eine Sparkasse-Umsatzdatei unter „Zahlungseingänge" importieren.</div>}
          {cats.map(([cat, g]) => {
            const isOpen = openCat === cat
            return (
              <div key={cat} style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                <div onClick={() => setOpenCat(isOpen ? null : cat)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 15px', cursor: 'pointer' }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{CAT_ICON[cat] || '•'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{cat}</div>
                    <div style={{ height: 5, background: '#f0eada', borderRadius: 3, marginTop: 5 }}><div style={{ height: '100%', width: Math.max(3, (g.sum / total) * 100) + '%', background: GOLD, borderRadius: 3 }} /></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>− {eur0(g.sum)}</div>
                    <div style={{ fontSize: 11, color: MUT }}>{g.items.length} · {Math.round((g.sum / total) * 100)}%</div>
                  </div>
                  <span style={{ color: MUT, fontSize: 13 }}>{isOpen ? '▾' : '▸'}</span>
                </div>
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f1ead9' }}>
                    {g.items.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).map((d, i) => (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 15px 8px 50px', borderTop: i ? '1px solid #f6f1e6' : 'none', fontSize: 12.5 }}>
                        <span style={{ color: MUT, minWidth: 74 }}>{dDE(d.booking_date)}</span>
                        <span style={{ fontWeight: 600, minWidth: 0, flex: '0 0 auto', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.counterparty || '—'}</span>
                        <span style={{ color: MUT, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(d.purpose || '').slice(0, 60)}</span>
                        {hasBeleg(d.amount) ? <span style={{ fontSize: 10, fontWeight: 700, color: GREENTX, background: GREENBG, borderRadius: 6, padding: '1px 7px' }}>Beleg ✓</span> : <span style={{ fontSize: 10, fontWeight: 700, color: AMBERTX, background: AMBERBG, borderRadius: 6, padding: '1px 7px' }}>Beleg fehlt</span>}
                        <b style={{ minWidth: 84, textAlign: 'right' }}>− {eur(Math.abs(d.amount))}</b>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ fontSize: 11.5, color: MUT, marginTop: 14, lineHeight: 1.6 }}>Kategorien werden automatisch aus Empfänger/Verwendungszweck erkannt (Regeln). „Beleg ✓" = es gibt eine Eingangsrechnung mit gleichem Betrag. DKV / Tanken zählt zu Fahrtkosten (Reisekosten).</div>
        </div>
      </RechnungShell>
    )
  }

  const isOverdue = i => i.status !== 'paid' && i.status !== 'storno' && i.due_date && i.due_date < today()
  const openInv = invoices.filter(i => (i.status === 'open' || i.status === 'overdue') && Number(i.total_gross) > 0)
  const offenSum = openInv.reduce((s, i) => s + Number(i.total_gross || 0), 0)
  const ueberSum = openInv.filter(isOverdue).reduce((s, i) => s + Number(i.total_gross || 0), 0)
  const monStart = today().slice(0, 7)
  const paidMon = invoices.filter(i => i.status === 'paid' && (i.paid_at || '').slice(0, 7) === monStart).reduce((s, i) => s + Number(i.total_gross || 0), 0)
  const suggested = matches.filter(m => m.status === 'suggested')
  const autoPaid = matches.filter(m => m.status === 'auto' || m.status === 'confirmed').slice(0, 12)

  const Kpi = ({ l, v, c }) => <div style={{ background: '#faf7f1', borderRadius: 11, padding: '13px 15px' }}><div style={{ fontSize: 12, color: MUT }}>{l}</div><div style={{ fontSize: 22, fontWeight: 800, color: c || DARK, marginTop: 2 }}>{v}</div></div>
  const Badge = ({ i }) => isOverdue(i)
    ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 7, background: REDBG, color: RED }}>überfällig</span>
    : <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 7, background: '#eef1f4', color: '#52606e' }}>offen</span>

  return (
    <RechnungShell active="zahlungen">
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <Toggle />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Zahlungseingänge</div>
            <div style={{ fontSize: 13, color: MUT, marginTop: 2 }}>Offene Posten mit Bank-Umsätzen abgleichen · Sparkasse-Datei (CAMT/CSV) importieren</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={rematch} disabled={busy} style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>↻ Neu abgleichen</button>
            <button onClick={() => fileRef.current && fileRef.current.click()} style={{ background: DARK, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><i className="ti ti-upload" style={{ fontSize: 15, marginRight: 6 }} />Umsätze importieren</button>
            <input ref={fileRef} type="file" accept=".csv,.xml,.camt,text/csv,application/xml" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
          </div>
        </div>

        <div onClick={() => fileRef.current && fileRef.current.click()} onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
          style={{ border: '2px dashed ' + (drag ? GOLD : LINE), borderRadius: 12, padding: '16px', textAlign: 'center', cursor: 'pointer', background: drag ? '#f6f3ec' : '#fff', marginBottom: 16, fontSize: 12.5, color: MUT }}>
          <b style={{ color: DARK }}>Sparkasse-Umsatzdatei hierher ziehen</b> — CAMT.053 (XML) oder CSV. Aus dem Online-Banking herunterladen. Kein Drittanbieter, keine Zugangsdaten gespeichert.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
          <Kpi l="Offen gesamt" v={eur0(offenSum)} />
          <Kpi l="davon überfällig" v={eur0(ueberSum)} c={ueberSum > 0 ? RED : DARK} />
          <Kpi l="Bezahlt diesen Monat" v={eur0(paidMon)} c={GREENTX} />
          <Kpi l="Zu prüfen" v={suggested.length} c={suggested.length ? AMBER : DARK} />
        </div>

        {suggested.length > 0 && (
          <>
            <div style={{ fontSize: 14, fontWeight: 800, margin: '4px 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: AMBERBG, color: AMBERTX }}>Zu prüfen</span> mögliche Zuordnungen</div>
            {suggested.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid ' + LINE, borderRadius: 11, padding: '11px 13px', marginBottom: 8, background: '#fffdf9' }}>
                <span style={{ fontSize: 18 }}>🔎</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13 }}><b>+ {eur(m.bank_transactions?.amount)}</b> von <b>{m.bank_transactions?.counterparty || '—'}</b> · {dDE(m.bank_transactions?.booking_date)}</div>
                  <div style={{ fontSize: 12, color: MUT, marginTop: 3 }}>Verwendungszweck: <span style={{ background: '#f4efe5', borderRadius: 6, padding: '1px 7px' }}>{(m.bank_transactions?.purpose || '').slice(0, 80) || '—'}</span> → passt evtl. zu <b>{m.invoices?.invoice_number}</b> ({m.invoices?.client_name} · {eur(m.invoices?.total_gross)})</div>
                </div>
                <button onClick={() => confirmMatch(m)} disabled={busy} style={{ background: GREEN, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Zuordnen ✓</button>
                <button onClick={() => dismissMatch(m)} disabled={busy} style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 8, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Ignorieren</button>
              </div>
            ))}
          </>
        )}

        <div style={{ fontSize: 14, fontWeight: 800, margin: '20px 0 8px' }}>Offene Posten <span style={{ color: '#b8b2a6', fontWeight: 400 }}>{openInv.length}</span></div>
        <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, overflow: 'hidden' }}>
          {openInv.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: MUT, fontSize: 13 }}>Keine offenen Rechnungen 🎉</div>}
          {openInv.map((i, idx) => (
            <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderTop: idx ? '1px solid #f1ead9' : 'none' }}>
              <b style={{ fontSize: 13, minWidth: 96 }}>{i.invoice_number || '—'}</b>
              <span style={{ fontSize: 13, flex: 1 }}>{i.client_name}</span>
              <span style={{ fontSize: 12, color: MUT, minWidth: 90 }}>fällig {dDE(i.due_date)}</span>
              <Badge i={i} />
              <b style={{ fontSize: 13, minWidth: 96, textAlign: 'right' }}>{eur(i.total_gross)}</b>
            </div>
          ))}
        </div>

        {autoPaid.length > 0 && (
          <>
            <div style={{ fontSize: 14, fontWeight: 800, margin: '20px 0 8px', display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: GREENBG, color: GREENTX }}>Bezahlt</span> zugeordnete Zahlungen</div>
            <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, overflow: 'hidden' }}>
              {autoPaid.map((m, idx) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: idx ? '1px solid #f1ead9' : 'none' }}>
                  <b style={{ fontSize: 13, minWidth: 96 }}>{m.invoices?.invoice_number || '—'}</b>
                  <span style={{ fontSize: 13, flex: 1 }}>{m.invoices?.client_name}</span>
                  <span style={{ fontSize: 12, color: MUT, minWidth: 110 }}>bezahlt {dDE(m.bank_transactions?.booking_date)}</span>
                  <span style={{ fontSize: 11, color: m.status === 'auto' ? GREENTX : GOLD }}>{m.status === 'auto' ? 'automatisch' : 'bestätigt'}</span>
                  <b style={{ fontSize: 13, minWidth: 96, textAlign: 'right' }}>{eur(m.bank_transactions?.amount)}</b>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ fontSize: 11.5, color: MUT, marginTop: 16, lineHeight: 1.6 }}>So läuft der Abgleich: Rechnungs-Nr. im Verwendungszweck + Betrag → automatisch „bezahlt"; nur Betrag + Absender passend → Vorschlag in „Zu prüfen"; Rest bleibt offen.</div>
      </div>

      {busy && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 250 }}><div style={{ background: '#fff', borderRadius: 12, padding: '16px 22px', fontSize: 13, fontWeight: 700 }}>Verarbeite…</div></div>}
    </RechnungShell>
  )
}
