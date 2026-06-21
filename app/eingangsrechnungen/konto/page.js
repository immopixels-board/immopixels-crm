'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import RechnungShell from '../../../components/RechnungShell'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const DARK = '#2a2a28', MUT = '#8a8278', LINE = '#e9e1d2', GOLD = '#6b6b6e'
const GREEN = '#1d9e75', GREENBG = '#e7f5ee', GREENTX = '#0f6e56'
const RED = '#a32d2d', AMBER = '#ba7517', AMBERBG = '#faf0dd', AMBERTX = '#7a4e0c'
const eur = n => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const eur0 = n => Math.round(Number(n) || 0).toLocaleString('de-DE') + ' €'
const dDE = s => s ? new Date(s).toLocaleDateString('de-DE') : '—'
const MONN = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

const KAT = ['Personal', 'Ausrüstung', 'Bildbearbeiter', 'Software', 'Fahrtkosten', 'Reisekosten', 'Material / Druck', 'Büro', 'Marketing', 'Versicherung', 'Finanzamt', 'Steuern', 'Miete', 'Bankgebühren', 'Privatentnahme', 'Arzt', 'Sonstiges']
const CAT_COLOR = { 'Personal': '#6b6b6e', 'Ausrüstung': '#b07d3a', 'Bildbearbeiter': '#1d9e75', 'Software': '#b3402f', 'Fahrtkosten': '#a3672d', 'Reisekosten': '#3b6ea5', 'Material / Druck': '#8a6d3b', 'Büro': '#5f7d52', 'Marketing': '#c0517a', 'Versicherung': '#5f7d52', 'Finanzamt': '#185fa5', 'Steuern': '#2f6f8f', 'Miete': '#8a5cab', 'Bankgebühren': '#7a7a7a', 'Privatentnahme': '#9a8c6a', 'Arzt': '#b0584f', 'Sonstiges': '#b9b2a4' }
const CAT_ICON = { 'Personal': '👥', 'Ausrüstung': '📷', 'Bildbearbeiter': '🎨', 'Software': '💻', 'Fahrtkosten': '⛽', 'Reisekosten': '✈️', 'Material / Druck': '🖨️', 'Büro': '🗂️', 'Marketing': '📣', 'Versicherung': '🛡️', 'Finanzamt': '🏛️', 'Steuern': '🧾', 'Miete': '🏠', 'Bankgebühren': '🏦', 'Privatentnahme': '↪️', 'Arzt': '⚕️', 'Sonstiges': '•' }

const KEYRULES = [
  [/michael ?photo|michaelphoto|retusche|bildbearbeitung/, 'Bildbearbeiter'],
  [/\bdkv\b|euro service|tankkarte|tankstelle|kraftstoff|\baral\b|\bshell\b|\besso\b|total ?energies|\bjet\b|sprit|tanken/, 'Fahrtkosten'],
  [/adobe|vercel|supabase|\bgoogle\b|microsoft|openai|anthropic|figma|canva|dropbox|notion|\babo\b|software|lizenz/, 'Software'],
  [/gehalt|lohn|\bpersonal\b|minijob|sozialvers|krankenkasse|\belias\b|\bdaniel\b|bene|kutscha/, 'Personal'],
  [/finanzamt|steuerkasse/, 'Finanzamt'],
  [/umsatzsteuer|\bsteuer\b|vorauszahlung|ust-/, 'Steuern'],
  [/versicherung|allianz|\bhuk\b|\baxa\b|ergo|gothaer|provinzial|signal iduna/, 'Versicherung'],
  [/miete|pacht|nebenkosten|stadtwerke|\bstrom\b|\bgas\b/, 'Miete'],
  [/gebühr|gebuehr|entgelt|kontoführ|kontofuehr|kartenpreis/, 'Bankgebühren'],
  [/dina cristian|übertrag|uebertrag|umbuchung|privatentnahme|\bprivat\b/, 'Privatentnahme'],
  [/\barzt\b|zahnarzt|hausarzt|facharzt|\bpraxis\b|\bklinik\b/, 'Arzt'],
  [/calumet|\bfoto\b|kamera|objektiv|saturn|mediamarkt|\bdji\b|drohne|technik/, 'Ausrüstung'],
  [/\bmeta\b|facebook|instagram|linkedin|google ads|\bads\b|werbung|marketing/, 'Marketing'],
  [/\bbahn\b|deutsche bahn|flixbus|booking|hotel|lufthansa|airbnb/, 'Reisekosten'],
  [/druckerei|\bdruck\b|\bprint\b|flyer|visitenkart|\bmaterial\b/, 'Material / Druck'],
]
function keywordCat(name, purpose) { const b = ((name || '') + ' ' + (purpose || '')).toLowerCase(); for (const [re, c] of KEYRULES) if (re.test(b)) return c; return 'Sonstiges' }
function catOf(tx, rules) {
  if (tx.category) return tx.category
  for (const r of rules) { const hay = ((r.match_type === 'purpose' ? tx.purpose : tx.counterparty) || '').toLowerCase(); if (r.pattern && hay.includes(String(r.pattern).toLowerCase())) return r.category }
  return keywordCat(tx.counterparty, tx.purpose)
}
const DIV = { yearly: 12, quarterly: 3, monthly: 1 }
const DEFAULT_PARAMS = { imagesAvg: 50, pricePerImage: 0.70, kmSelf: 0.20, kmMitarbeiter: 0.30, steuerPct: 22 }

export default function KontoPage() {
  const [loading, setLoading] = useState(true)
  const [tx, setTx] = useState([])
  const [belege, setBelege] = useState([])
  const [rules, setRules] = useState([])
  const [recur, setRecur] = useState([])
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [sec, setSec] = useState('konto')
  const [mon, setMon] = useState(() => new Date().toISOString().slice(0, 7))
  const [openCat, setOpenCat] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data: t } = await supabase.from('bank_transactions').select('id, booking_date, amount, counterparty, purpose, category').order('booking_date', { ascending: false }).limit(4000)
    setTx(t || [])
    const { data: bg } = await supabase.from('eingangsrechnungen').select('id, lieferant, brutto, datum, kategorie').limit(3000)
    setBelege(bg || [])
    try { const { data: rl } = await supabase.from('category_rules').select('*'); setRules(rl || []) } catch {}
    try { const { data: rc } = await supabase.from('recurring_costs').select('*').order('amount', { ascending: false }); setRecur(rc || []) } catch {}
    const { data: inv } = await supabase.from('invoices').select('id, invoice_number, client_id, client_name, invoice_date, total_net, total_gross, status').neq('status', 'storno').order('invoice_date', { ascending: false }).limit(4000)
    setInvoices(inv || [])
    const { data: cl } = await supabase.from('clients').select('id, name, short_name').order('name')
    setClients(cl || [])
    const { data: ps } = await supabase.from('settings').select('value').eq('key', 'kosten_params').maybeSingle()
    if (ps?.value) { try { setParams({ ...DEFAULT_PARAMS, ...JSON.parse(ps.value) }) } catch {} }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function saveParams(p) { setParams(p); try { await supabase.from('settings').upsert({ key: 'kosten_params', value: JSON.stringify(p) }, { onConflict: 'key' }) } catch {} }

  async function setCategory(row, cat, applyAll) {
    setBusy(true)
    try {
      if (applyAll && row.counterparty) { await supabase.from('category_rules').insert({ match_type: 'counterparty', pattern: row.counterparty, category: cat }) }
      else { await supabase.from('bank_transactions').update({ category: cat }).eq('id', row.id) }
      await load()
    } catch (e) { alert('Speichern fehlgeschlagen: ' + (e.message || e)) }
    setBusy(false)
  }
  async function delRule(id) { setBusy(true); try { await supabase.from('category_rules').delete().eq('id', id); await load() } catch {} setBusy(false) }

  const hasBeleg = amt => belege.some(b => Math.abs((Math.abs(Number(b.brutto) || 0)) - Math.abs(Number(amt) || 0)) < 0.01)

  if (loading) return <RechnungShell active="eingang"><div style={{ padding: 60, textAlign: 'center', color: MUT }}>Lädt…</div></RechnungShell>

  const [yy, mm] = mon.split('-').map(Number)
  const shiftMon = d => { const dt = new Date(yy, mm - 1 + d, 1); setMon(dt.toISOString().slice(0, 7)); setOpenCat(null) }
  const debits = tx.filter(x => Number(x.amount) < 0)
  const credits = tx.filter(x => Number(x.amount) > 0)
  const monDebits = debits.filter(x => (x.booking_date || '').slice(0, 7) === mon)
  const monCredits = credits.filter(x => (x.booking_date || '').slice(0, 7) === mon)
  const ausgaben = monDebits.reduce((s, x) => s + Math.abs(x.amount), 0)
  const einnahmen = monCredits.reduce((s, x) => s + Math.abs(x.amount), 0)

  // Kategória-csoportok a hónapra
  const groups = {}
  for (const x of monDebits) { const c = catOf(x, rules); (groups[c] = groups[c] || { sum: 0, items: [] }); groups[c].sum += Math.abs(x.amount); groups[c].items.push(x) }
  const cats = Object.entries(groups).sort((a, b) => b[1].sum - a[1].sum)
  // donut conic-gradient
  let acc = 0; const segs = cats.map(([c, g]) => { const from = acc / (ausgaben || 1) * 100; acc += g.sum; const to = acc / (ausgaben || 1) * 100; return (CAT_COLOR[c] || '#b9b2a4') + ' ' + from.toFixed(2) + '% ' + to.toFixed(2) + '%' })
  const conic = 'conic-gradient(' + (segs.length ? segs.join(',') : '#eee 0 100%') + ')'
  // bizonytalanok: amik kulcsszó-fallbackből Sonstiges-be esnek ÉS nincs kézi/szabály
  const uncategorized = monDebits.filter(x => !x.category && catOf(x, rules) === 'Sonstiges')

  // Fixkosten amortizáció
  const monthlyFix = recur.reduce((s, r) => s + (Number(r.amount) || 0) / (DIV[r.interval] || 12), 0)
  // valós havi átlag (az összes hónapból)
  const monthsSet = new Set(debits.map(x => (x.booking_date || '').slice(0, 7)).filter(Boolean))
  const nMonths = Math.max(1, monthsSet.size)
  const avgIst = debits.reduce((s, x) => s + Math.abs(x.amount), 0) / nMonths

  return (
    <RechnungShell active="eingang">
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <a href="/eingangsrechnungen" style={subtab(false)}>📥 Belege</a>
          <button onClick={() => setSec('konto')} style={subtab(sec === 'konto')}>🏦 Sparkasse-Konto</button>
          <button onClick={() => setSec('fix')} style={subtab(sec === 'fix')}>🔁 Fixkosten</button>
          <button onClick={() => setSec('rent')} style={subtab(sec === 'rent')}>📈 Rentabilität</button>
        </div>

        {sec === 'konto' && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>Sparkasse-Konto</div>
              <div style={{ fontSize: 13, color: MUT }}>Wohin geht das Geld? — alle Buchungen kategorisiert</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => shiftMon(-1)} style={navBtn}>‹</button>
              <span style={{ fontSize: 14, fontWeight: 700, minWidth: 120, textAlign: 'center' }}>{MONN[mm - 1]} {yy}</span>
              <button onClick={() => shiftMon(1)} style={navBtn}>›</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
            <Kpi l="Ausgaben" v={'− ' + eur0(ausgaben)} c={RED} />
            <Kpi l="Einnahmen" v={'+ ' + eur0(einnahmen)} c={GREEN} />
            <Kpi l="Saldo Monat" v={(einnahmen - ausgaben >= 0 ? '+ ' : '− ') + eur0(Math.abs(einnahmen - ausgaben))} />
            <Kpi l="Buchungen" v={String(monDebits.length + monCredits.length)} />
          </div>

          {uncategorized.length > 0 && (
            <div style={{ background: '#fff8ec', border: '1px solid #f0d68a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#7a5a10', marginBottom: 4 }}>⚠ Zu kategorisieren ({uncategorized.length})</div>
              <div style={{ fontSize: 12, color: '#7a5a10', marginBottom: 12 }}>Kategorie wählen — optional als Regel für alle gleichen Empfänger speichern, dann landen ähnliche automatisch dort.</div>
              {uncategorized.slice(0, 20).map(x => <UncatRow key={x.id} x={x} busy={busy} onSet={setCategory} />)}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
            <div style={card}>
              <div style={h3}>Verteilung</div>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 14px' }}>
                <div style={{ width: 180, height: 180, borderRadius: '50%', background: conic, position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 30, background: '#fff', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 10, color: MUT, fontWeight: 700 }}>GESAMT</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: RED }}>{eur0(ausgaben)}</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={card}>
              <div style={h3}>Kategorien — {MONN[mm - 1]} {yy}</div>
              {cats.length === 0 && <div style={{ color: MUT, fontSize: 13, padding: 10 }}>Keine Ausgaben in diesem Monat. (Erst Sparkasse-Umsätze importieren.)</div>}
              {cats.map(([c, g]) => {
                const open = openCat === c
                return (
                  <div key={c} style={{ borderTop: '1px solid #f1ead9', padding: '11px 2px' }}>
                    <div onClick={() => setOpenCat(open ? null : c)} style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' }}>
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: (CAT_COLOR[c] || '#ccc') + '22', color: CAT_COLOR[c] || '#777', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{CAT_ICON[c] || '•'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{c}</div>
                        <div style={{ height: 6, background: '#f0eada', borderRadius: 4, marginTop: 5 }}><div style={{ height: '100%', width: Math.max(3, g.sum / (ausgaben || 1) * 100) + '%', background: CAT_COLOR[c] || GOLD, borderRadius: 4 }} /></div>
                      </div>
                      {hasBeleg(g.items[0]?.amount) ? <span style={{ ...belegTag, color: GREENTX, background: GREENBG }}>Beleg ✓</span> : <span style={{ ...belegTag, color: AMBERTX, background: AMBERBG }}>Beleg?</span>}
                      <div style={{ textAlign: 'right' }}><div style={{ fontSize: 15, fontWeight: 800 }}>− {eur(g.sum)}</div><div style={{ fontSize: 11, color: MUT }}>{g.items.length} · {Math.round(g.sum / (ausgaben || 1) * 100)}%</div></div>
                      <span style={{ color: MUT, fontSize: 12, width: 14 }}>{open ? '▾' : '▸'}</span>
                    </div>
                    {open && <div style={{ marginTop: 6 }}>{g.items.slice().sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).map(it => (
                      <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px 6px 41px', borderTop: '1px solid #f6f1e6', fontSize: 12.5 }}>
                        <span style={{ color: MUT, minWidth: 64 }}>{dDE(it.booking_date)}</span>
                        <span style={{ fontWeight: 600, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.counterparty || '—'}</span>
                        <span style={{ color: MUT, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(it.purpose || '').slice(0, 50)}</span>
                        <select value={it.category || c} onChange={e => setCategory(it, e.target.value, false)} style={{ ...selStyle, fontSize: 11, padding: '3px 6px' }}>{KAT.map(k => <option key={k}>{k}</option>)}</select>
                        <b style={{ minWidth: 78, textAlign: 'right' }}>− {eur(Math.abs(it.amount))}</b>
                      </div>
                    ))}</div>}
                  </div>
                )
              })}
            </div>
          </div>

          {rules.length > 0 && (
            <div style={{ ...card, marginTop: 16 }}>
              <div style={h3}>Gelernte Regeln ({rules.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {rules.map(r => <span key={r.id} style={{ fontSize: 12, background: '#f4efe5', borderRadius: 20, padding: '4px 10px', display: 'inline-flex', gap: 6, alignItems: 'center' }}>„{r.pattern}" → <b>{r.category}</b> <span onClick={() => delRule(r.id)} style={{ cursor: 'pointer', color: RED }}>✕</span></span>)}
              </div>
            </div>
          )}
        </>}

        {sec === 'fix' && <FixSection recur={recur} reload={load} monthlyFix={monthlyFix} avgIst={avgIst} debits={debits} />}

        {sec === 'rent' && <RentSection clients={clients} invoices={invoices} params={params} saveParams={saveParams} monthlyFix={monthlyFix} />}
      </div>
    </RechnungShell>
  )
}

function UncatRow({ x, busy, onSet }) {
  const [cat, setCat] = useState('Sonstiges')
  const [all, setAll] = useState(true)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #f0e3c5', fontSize: 12.5, flexWrap: 'wrap' }}>
      <span style={{ color: MUT, minWidth: 60 }}>{dDE(x.booking_date)}</span>
      <span style={{ fontWeight: 700, minWidth: 140 }}>{x.counterparty || '—'}</span>
      <span style={{ color: MUT, flex: 1, minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(x.purpose || '').slice(0, 60)}</span>
      <b style={{ minWidth: 80, textAlign: 'right' }}>− {eur(Math.abs(x.amount))}</b>
      <select value={cat} onChange={e => setCat(e.target.value)} style={selStyle}>{KAT.map(k => <option key={k}>{k}</option>)}</select>
      <label style={{ fontSize: 11, color: MUT, display: 'flex', alignItems: 'center', gap: 4 }}><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> alle „{(x.counterparty || '').slice(0, 14)}"</label>
      <button disabled={busy} onClick={() => onSet(x, cat, all)} style={{ ...primary, padding: '5px 10px', fontSize: 12 }}>OK</button>
    </div>
  )
}

function FixSection({ recur, reload, monthlyFix, avgIst, debits }) {
  const [nf, setNf] = useState({ label: '', amount: '', interval: 'yearly', category: 'Versicherung' })
  const [busy, setBusy] = useState(false)
  const [scan, setScan] = useState(null)
  const [scanning, setScanning] = useState(false)

  async function detect() {
    setScanning(true); setScan(null)
    try {
      const groups = {}
      for (const x of (debits || [])) {
        const key = (x.counterparty || 'Unbekannt').trim()
        if (!key) continue
        const g = groups[key] || (groups[key] = { name: key, amounts: [], months: new Set(), purposes: new Set() })
        g.amounts.push(Math.abs(Number(x.amount) || 0)); g.months.add((x.booking_date || '').slice(0, 7))
        if (x.purpose) g.purposes.add(String(x.purpose).slice(0, 40))
      }
      const vendors = Object.values(groups).filter(g => g.amounts.length >= 2).map(g => {
        const a = g.amounts.slice().sort((x, y) => x - y); const med = a[Math.floor(a.length / 2)]
        return { name: g.name, count: g.amounts.length, monthsSpan: g.months.size, medAmount: Math.round(med * 100) / 100, purposes: [...g.purposes].slice(0, 4) }
      }).sort((x, y) => y.count - x.count).slice(0, 80)
      if (!vendors.length) { alert('Zu wenig wiederkehrende Buchungen erkannt. (Erst Sparkasse-Umsätze importieren.)'); setScanning(false); return }
      const r = await fetch('/api/kosten-classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendors }) })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'KI-Fehler')
      const byName = Object.fromEntries((j.results || []).map(x => [x.name, x]))
      const rows = vendors.map(v => { const ai = byName[v.name] || {}; return { name: v.name, count: v.count, monthsSpan: v.monthsSpan, take: true, fix: !!ai.recurring, category: ai.category || 'Sonstiges', interval: ai.interval || 'monthly', amount: ai.amount || v.medAmount } })
      rows.sort((a, b) => (b.fix - a.fix) || (b.count - a.count))
      setScan(rows)
    } catch (e) { alert('Erkennung fehlgeschlagen: ' + (e.message || e)) }
    setScanning(false)
  }
  function upd(i, patch) { setScan(s => s.map((r, j) => j === i ? { ...r, ...patch } : r)) }
  async function applyScan() {
    const take = (scan || []).filter(r => r.take)
    if (!take.length) { alert('Nichts ausgewählt.'); return }
    setBusy(true); let rules = 0, fix = 0
    try {
      for (const r of take) {
        try { await supabase.from('category_rules').insert({ match_type: 'counterparty', pattern: r.name, category: r.category }); rules++ } catch {}
        if (r.fix) { try { await supabase.from('recurring_costs').insert({ label: r.name, amount: Number(r.amount) || 0, interval: r.interval, category: r.category }); fix++ } catch {} }
      }
      setScan(null); await reload()
      alert('✓ ' + rules + ' Kategorie-Regeln gespeichert, ' + fix + ' als Fixkosten übernommen.')
    } catch (e) { alert('Fehler: ' + (e.message || e)) }
    setBusy(false)
  }

  async function add() {
    if (!nf.label || !Number(nf.amount)) { alert('Bezeichnung und Betrag erforderlich'); return }
    setBusy(true)
    try { await supabase.from('recurring_costs').insert({ label: nf.label, amount: Number(nf.amount), interval: nf.interval, category: nf.category }); setNf({ label: '', amount: '', interval: 'yearly', category: 'Versicherung' }); await reload() } catch (e) { alert('Fehler: ' + (e.message || e)) }
    setBusy(false)
  }
  async function del(id) { setBusy(true); try { await supabase.from('recurring_costs').delete().eq('id', id); await reload() } catch {} setBusy(false) }
  const INTV = { yearly: 'jährlich', quarterly: 'vierteljährlich', monthly: 'monatlich' }
  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>Fixkosten (wiederkehrend)</div>
      <div style={{ fontSize: 13, color: MUT, marginBottom: 16 }}>Jährliche / vierteljährliche Kosten werden auf den Monat umgerechnet — für realistische Ø-Ausgaben und die Kalkulation.</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
        <Kpi l="Fixkosten / Monat (anteilig)" v={eur(monthlyFix)} c={GOLD} />
        <Kpi l="Ø Ausgaben / Monat (Ist)" v={eur(avgIst)} />
        <Kpi l="Fixkosten / Jahr" v={eur(recur.reduce((s, r) => s + (Number(r.amount) || 0) * (12 / ({ yearly: 12, quarterly: 3, monthly: 1 }[r.interval] || 12)), 0))} />
      </div>

      <div style={{ ...card, borderColor: '#d9c79a', background: '#fdfaf2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>🔍 Aus Kontoauszug erkennen (KI)</div>
            <div style={{ fontSize: 12, color: MUT, marginTop: 2 }}>Liest die wiederkehrenden Empfänger aus den Sparkasse-Umsätzen, schlägt Kategorie + Abo/Versicherung + Intervall vor (z.B. Generali, PayPal-Surfshark, Mawacon …).</div>
          </div>
          {!scan && <button onClick={detect} disabled={scanning} style={primary}>{scanning ? 'Analysiere…' : 'Analysieren'}</button>}
        </div>

        {scan && <div style={{ marginTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 70px 1.3fr 56px 1.2fr 90px', gap: 6, padding: '0 4px 6px', fontSize: 10, fontWeight: 700, color: MUT, textTransform: 'uppercase' }}>
            <div></div><div>Empfänger</div><div style={{ textAlign: 'center' }}>Anz.</div><div>Kategorie</div><div style={{ textAlign: 'center' }}>Fix?</div><div>Intervall</div><div style={{ textAlign: 'right' }}>Betrag</div>
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {scan.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 70px 1.3fr 56px 1.2fr 90px', gap: 6, alignItems: 'center', padding: '6px 4px', borderTop: '1px solid #f1ead9', fontSize: 12.5, opacity: r.take ? 1 : .45 }}>
                <input type="checkbox" checked={r.take} onChange={e => upd(i, { take: e.target.checked })} style={{ accentColor: GOLD }} />
                <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                <span style={{ textAlign: 'center', color: MUT }}>{r.count}× / {r.monthsSpan}M</span>
                <select value={r.category} onChange={e => upd(i, { category: e.target.value })} style={{ ...selStyle, fontSize: 11 }}>{KAT.map(k => <option key={k}>{k}</option>)}</select>
                <input type="checkbox" checked={r.fix} onChange={e => upd(i, { fix: e.target.checked })} style={{ accentColor: GREEN, justifySelf: 'center' }} title="Als wiederkehrende Fixkosten übernehmen" />
                <select value={r.interval} disabled={!r.fix} onChange={e => upd(i, { interval: e.target.value })} style={{ ...selStyle, fontSize: 11, opacity: r.fix ? 1 : .4 }}><option value="monthly">monatlich</option><option value="quarterly">vierteljährlich</option><option value="yearly">jährlich</option></select>
                <input value={r.amount} disabled={!r.fix} onChange={e => upd(i, { amount: e.target.value })} style={{ ...selStyle, textAlign: 'right', fontSize: 11, opacity: r.fix ? 1 : .4 }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <button onClick={() => setScan(null)} style={mini}>Abbrechen</button>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: MUT }}>„Fix?" = als Fixkosten · sonst nur Kategorie-Regel fürs Konto</span>
            <button onClick={applyScan} disabled={busy} style={primary}>{busy ? '…' : 'Übernehmen'}</button>
          </div>
        </div>}
      </div>

      <div style={{ ...card, marginTop: 14 }}>
        <div style={h3}>Neue wiederkehrende Kosten (manuell)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.4fr auto', gap: 8, alignItems: 'end' }}>
          <div><label style={lbl}>Bezeichnung</label><input value={nf.label} onChange={e => setNf({ ...nf, label: e.target.value })} placeholder="z.B. Kfz-Versicherung" style={inp} /></div>
          <div><label style={lbl}>Betrag €</label><input value={nf.amount} onChange={e => setNf({ ...nf, amount: e.target.value })} placeholder="0,00" style={{ ...inp, textAlign: 'right' }} /></div>
          <div><label style={lbl}>Intervall</label><select value={nf.interval} onChange={e => setNf({ ...nf, interval: e.target.value })} style={inp}><option value="yearly">jährlich</option><option value="quarterly">vierteljährlich</option><option value="monthly">monatlich</option></select></div>
          <div><label style={lbl}>Kategorie</label><select value={nf.category} onChange={e => setNf({ ...nf, category: e.target.value })} style={inp}>{KAT.map(k => <option key={k}>{k}</option>)}</select></div>
          <button disabled={busy} onClick={add} style={primary}>+ Hinzufügen</button>
        </div>
      </div>

      <div style={{ ...card, marginTop: 14 }}>
        <div style={h3}>Liste</div>
        {recur.length === 0 && <div style={{ color: MUT, fontSize: 13 }}>Noch keine Einträge. Tipp: oben „Analysieren" nutzt die KI, um Abos/Versicherungen aus dem Kontoauszug zu finden.</div>}
        {recur.map(r => (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr 1fr 26px', gap: 8, alignItems: 'center', padding: '9px 0', borderTop: '1px solid #f1ead9', fontSize: 13 }}>
            <span style={{ fontWeight: 700 }}>{r.label}</span>
            <span style={{ textAlign: 'right' }}>{eur(r.amount)}</span>
            <span style={{ color: MUT }}>{INTV[r.interval] || r.interval}</span>
            <span style={{ color: MUT }}>{r.category || '—'}</span>
            <span style={{ textAlign: 'right', fontWeight: 700, color: GOLD }}>{eur((Number(r.amount) || 0) / ({ yearly: 12, quarterly: 3, monthly: 1 }[r.interval] || 12))}/M</span>
            <button onClick={() => del(r.id)} style={{ ...mini, color: RED }}>✕</button>
          </div>
        ))}
      </div>
    </>
  )
}

function RentSection({ clients, invoices, params, saveParams, monthlyFix }) {
  const [clientId, setClientId] = useState('')
  const [invId, setInvId] = useState('')
  const [driver, setDriver] = useState('self')
  const [km, setKm] = useState(0)
  const [kmAuto, setKmAuto] = useState(true)
  const [p, setP] = useState(params)
  useEffect(() => { setP(params) }, [params])

  const cinv = invoices.filter(i => !clientId || i.client_id === clientId)
  const inv = invoices.find(i => i.id === invId) || null

  useEffect(() => {
    if (!invId) { setKm(0); setKmAuto(true); return }
    setKmAuto(true)
    ;(async () => {
      try {
        const { data: its } = await supabase.from('invoice_items').select('qty, unit, description').eq('invoice_id', invId)
        let k = 0
        for (const it of (its || [])) { const u = (it.unit || '').toLowerCase(); const d = (it.description || '').toLowerCase(); if (u === 'km' || /\bkm\b/.test(d)) k += Number(String(it.qty).replace(',', '.')) || 0 }
        setKm(k)
      } catch { setKm(0) }
    })()
  }, [invId])

  function monthNetOf(i) { const mk = (i.invoice_date || '').slice(0, 7); return invoices.filter(x => (x.invoice_date || '').slice(0, 7) === mk).reduce((s, x) => s + (Number(x.total_net) || 0), 0) }
  const pf = patch => saveParams({ ...p, ...patch })

  let calc = null
  if (inv) {
    const netto = Number(inv.total_net) || 0
    const rate = driver === 'mitarbeiter' ? Number(p.kmMitarbeiter) : Number(p.kmSelf)
    const fahrt = (Number(km) || 0) * rate
    const bild = (Number(p.imagesAvg) || 0) * (Number(p.pricePerImage) || 0)
    const mNet = monthNetOf(inv) || netto
    const fix = mNet > 0 ? monthlyFix * (netto / mNet) : 0
    const vorSteuer = netto - fahrt - bild - fix
    const steuer = Math.max(0, vorSteuer) * (Number(p.steuerPct) || 0) / 100
    calc = { netto, rate, fahrt, bild, fix, vorSteuer, steuer, gewinn: vorSteuer - steuer }
  }
  const pos = calc && calc.gewinn >= 0

  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>Rentabilität pro Fotoshooting</div>
      <div style={{ fontSize: 13, color: MUT, marginBottom: 16 }}>Kunde &amp; Rechnung wählen — die Kalkulation läuft automatisch: Netto-Umsatz minus Fahrtkosten (km × Satz je Fahrer), Bildbearbeitung (Ø Bilder × Preis), anteilige Fixkosten und Steuer-Rückstellung.</div>

      <div style={card}>
        <div style={h3}>Parameter</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
          <div><label style={lbl}>Ø Bilder / Shooting</label><input value={p.imagesAvg} onChange={e => setP({ ...p, imagesAvg: e.target.value })} onBlur={() => pf({ imagesAvg: p.imagesAvg })} style={{ ...inp, textAlign: 'right' }} /></div>
          <div><label style={lbl}>€ / Bild</label><input value={p.pricePerImage} onChange={e => setP({ ...p, pricePerImage: e.target.value })} onBlur={() => pf({ pricePerImage: p.pricePerImage })} style={{ ...inp, textAlign: 'right' }} /></div>
          <div><label style={lbl}>km-Satz ich €</label><input value={p.kmSelf} onChange={e => setP({ ...p, kmSelf: e.target.value })} onBlur={() => pf({ kmSelf: p.kmSelf })} style={{ ...inp, textAlign: 'right' }} /></div>
          <div><label style={lbl}>km-Satz Mitarbeiter €</label><input value={p.kmMitarbeiter} onChange={e => setP({ ...p, kmMitarbeiter: e.target.value })} onBlur={() => pf({ kmMitarbeiter: p.kmMitarbeiter })} style={{ ...inp, textAlign: 'right' }} /></div>
          <div><label style={lbl}>Steuer-Rückstellung %</label><input value={p.steuerPct} onChange={e => setP({ ...p, steuerPct: e.target.value })} onBlur={() => pf({ steuerPct: p.steuerPct })} style={{ ...inp, textAlign: 'right' }} /></div>
        </div>
        <div style={{ fontSize: 11, color: MUT, marginTop: 8 }}>Bildbearbeitung = {p.imagesAvg || 0} Bilder × {eur(Number(p.pricePerImage) || 0)} = <b>{eur((Number(p.imagesAvg) || 0) * (Number(p.pricePerImage) || 0))}</b> / Shooting (Ø, nicht immer exakt).</div>
      </div>

      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}><label style={lbl}>Kunde</label><select value={clientId} onChange={e => { setClientId(e.target.value); setInvId('') }} style={inp}><option value="">— alle Kunden —</option>{clients.map(c => <option key={c.id} value={c.id}>{c.short_name || c.name}</option>)}</select></div>
          <div style={{ flex: 2, minWidth: 240 }}><label style={lbl}>Rechnung / Shooting</label><select value={invId} onChange={e => setInvId(e.target.value)} style={inp}><option value="">— auswählen —</option>{cinv.slice(0, 300).map(i => <option key={i.id} value={i.id}>{(i.invoice_number || '—') + ' · ' + dDE(i.invoice_date) + ' · ' + i.client_name + ' · ' + eur(i.total_net) + ' netto'}</option>)}</select></div>
        </div>
      </div>

      {calc && (
        <div style={{ ...card, marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{inv.invoice_number} · {inv.client_name} <span style={{ color: MUT, fontWeight: 400, fontSize: 12 }}>({dDE(inv.invoice_date)})</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ color: MUT }}>km:</span>
              <input value={km} onChange={e => { setKm(e.target.value); setKmAuto(false) }} style={{ ...inp, width: 70, marginTop: 0, padding: '5px 8px', textAlign: 'right' }} />
              {kmAuto && <span style={{ fontSize: 10, color: GREEN }}>auto</span>}
              <div style={{ display: 'flex', border: '1px solid ' + LINE, borderRadius: 8, overflow: 'hidden' }}>
                <button onClick={() => setDriver('self')} style={drv(driver === 'self')}>ich ({Number(p.kmSelf).toFixed(2)})</button>
                <button onClick={() => setDriver('mitarbeiter')} style={drv(driver === 'mitarbeiter')}>Mitarbeiter ({Number(p.kmMitarbeiter).toFixed(2)})</button>
              </div>
            </div>
          </div>
          <Row l="Umsatz netto" v={eur(calc.netto)} bold />
          <Row l={'\u2212 Fahrtkosten (' + (Number(km) || 0) + ' km \u00d7 ' + Number(calc.rate).toFixed(2) + ')'} v={'\u2212 ' + eur(calc.fahrt)} />
          <Row l={'\u2212 Bildbearbeitung (' + (p.imagesAvg || 0) + ' \u00d7 ' + eur(Number(p.pricePerImage) || 0) + ')'} v={'\u2212 ' + eur(calc.bild)} />
          <Row l="\u2212 anteilige Fixkosten" v={'\u2212 ' + eur(calc.fix)} />
          <Row l="= Ergebnis vor Steuer" v={eur(calc.vorSteuer)} bold />
          <Row l={'\u2212 Steuer-R\u00fcckstellung (' + p.steuerPct + '%)'} v={'\u2212 ' + eur(calc.steuer)} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '10px 12px', borderRadius: 8, background: pos ? GREENBG : '#fbe9e9' }}>
            <b style={{ color: pos ? GREENTX : RED }}>= Gewinn nach Steuer</b><b style={{ fontSize: 18, color: pos ? GREENTX : RED }}>{eur(calc.gewinn)}</b>
          </div>
          <div style={{ fontSize: 11, color: MUT, marginTop: 12, lineHeight: 1.6 }}>km wird aus den Fahrtkosten-Positionen der Rechnung gelesen (Quelle Fahrtenbuch/Maps) \u2014 oben \u00fcberschreibbar. „Fahrer" bestimmt den km-Satz. N\u00e4herung, kein Steuerbescheid.</div>
        </div>
      )}
    </>
  )
}

function Kpi({ l, v, c }) { return <div style={card}><div style={{ fontSize: 11, color: MUT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em' }}>{l}</div><div style={{ fontSize: 21, fontWeight: 800, marginTop: 3, color: c || DARK }}>{v}</div></div> }
function Row({ l, v, bold }) { return <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', fontWeight: bold ? 800 : 400 }}><span style={{ color: bold ? DARK : MUT }}>{l}</span><span>{v}</span></div> }

const card = { background: '#fff', border: '1px solid ' + LINE, borderRadius: 14, padding: 18, marginBottom: 0 }
const h3 = { fontSize: 13, fontWeight: 800, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.03em', color: MUT }
const navBtn = { width: 32, height: 32, borderRadius: 9, border: '1px solid ' + LINE, background: '#fff', cursor: 'pointer', color: GOLD }
const belegTag = { fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }
const inp = { width: '100%', padding: '8px 10px', border: '1px solid ' + LINE, borderRadius: 8, fontSize: 13, marginTop: 3, background: '#fff' }
const selStyle = { padding: '5px 8px', border: '1px solid ' + LINE, borderRadius: 7, fontSize: 12, background: '#fff' }
const lbl = { fontSize: 11, fontWeight: 700, color: MUT }
const primary = { background: DARK, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const mini = { background: 'none', border: '1px solid ' + LINE, borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: DARK }
const subtab = on => ({ padding: '8px 15px', borderRadius: 9, border: '1px solid ' + (on ? DARK : LINE), background: on ? DARK : '#fff', color: on ? '#fff' : MUT, fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' })
const drv = on => ({ padding: '4px 9px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: on ? GOLD : '#fff', color: on ? '#fff' : MUT })
const toggle = on => drv(on)
