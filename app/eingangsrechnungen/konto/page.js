'use client'
import { useEffect, useState, useRef } from 'react'
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

const BASE_CATS = ['Personal', 'Ausrüstung', 'Bildbearbeiter', 'Software', 'Abo', 'Leasing', 'Fahrtkosten', 'Reisekosten', 'Material / Druck', 'Büro', 'Marketing', 'Versicherung', 'Finanzamt', 'Steuern', 'Miete', 'Bankgebühren', 'Privatentnahme', 'Arzt', 'Sonstiges']
const DEFAULT_SUBS = { 'Versicherung': ['Kfz', 'Kranken', 'Drohne', 'Betriebshaftpflicht', 'Rechtsschutz'], 'Abo': ['Internet', 'Telefon', 'Software-Abo', 'Streaming'], 'Leasing': ['Kfz', 'Technik'], 'Fahrtkosten': ['Tanken', 'Parken', 'Maut'] }
const SEP = ' › '
function flatCats(userCats) {
  const out = []
  for (const top of BASE_CATS) {
    out.push(top)
    for (const sub of (DEFAULT_SUBS[top] || [])) out.push(top + SEP + sub)
  }
  for (const u of (userCats || [])) { const v = u.parent ? (u.parent + SEP + u.name) : u.name; if (v && !out.includes(v)) out.push(v) }
  return out
}
const topOf = c => String(c || '').split(SEP)[0]
// --- Bildbearbeiter-Positionen: Monat + Kundenzuordnung aus der Beschreibung ---
function bbMonat(beschreibung, datum) {
  const m = String(beschreibung || '').match(/(\d{2})_(\d{2})_(\d{2})/)
  if (m) { const yy = Number(m[1]); const mo = m[2]; if (Number(mo) >= 1 && Number(mo) <= 12) return '20' + (yy < 10 ? '0' + yy : yy) + '-' + mo }
  if (datum && /^\d{4}-\d{2}/.test(datum)) return datum.slice(0, 7)
  return null
}
function bbClientKey(beschreibung) {
  let s = String(beschreibung || '').trim()
  s = s.replace(/^\d{2}_\d{2}_\d{2}_/, '').replace(/^(DROHNE|DRONE|DJI)[_ ]*/i, '')
  const m = s.match(/^[A-Za-zÄÖÜäöü&.\-]+/)
  return m ? m[0].replace(/[.\-]+$/, '') : ''
}
function bbMatch(beschreibung, client) {
  if (!client) return false
  const hay = String(beschreibung || '').toLowerCase()
  const cand = [client.short_name, client.name].filter(Boolean).map(x => String(x).toLowerCase().trim())
  return cand.some(c => c.length >= 2 && hay.includes(c))
}
const CAT_COLOR = { 'Personal': '#6b6b6e', 'Ausrüstung': '#b07d3a', 'Bildbearbeiter': '#1d9e75', 'Software': '#b3402f', 'Abo': '#c0517a', 'Leasing': '#7a6a3a', 'Fahrtkosten': '#a3672d', 'Reisekosten': '#3b6ea5', 'Material / Druck': '#8a6d3b', 'Büro': '#5f7d52', 'Marketing': '#c0517a', 'Versicherung': '#5f7d52', 'Finanzamt': '#185fa5', 'Steuern': '#2f6f8f', 'Miete': '#8a5cab', 'Bankgebühren': '#7a7a7a', 'Privatentnahme': '#9a8c6a', 'Arzt': '#b0584f', 'Sonstiges': '#b9b2a4' }
const CAT_ICON = { 'Personal': '👥', 'Ausrüstung': '📷', 'Bildbearbeiter': '🎨', 'Software': '💻', 'Abo': '🔄', 'Leasing': '🚗', 'Fahrtkosten': '⛽', 'Reisekosten': '✈️', 'Material / Druck': '🖨️', 'Büro': '🗂️', 'Marketing': '📣', 'Versicherung': '🛡️', 'Finanzamt': '🏛️', 'Steuern': '🧾', 'Miete': '🏠', 'Bankgebühren': '🏦', 'Privatentnahme': '↪️', 'Arzt': '⚕️', 'Sonstiges': '•' }
const colorOf = c => CAT_COLOR[topOf(c)] || '#b9b2a4'
const iconOf = c => CAT_ICON[topOf(c)] || '•'

const KEYRULES = [
  [/michael ?photo|michaelphoto|retusche|bildbearbeitung/, 'Bildbearbeiter'],
  [/leasing|leasingrate|santander|alphabet leasing|sixt leasing|vw leasing|ald automotive/, 'Leasing'],
  [/surfshark|\bvpn\b|netflix|spotify|disney|streaming/, 'Abo' + SEP + 'Streaming'],
  [/mawacon|telekom|vodafone|\bo2\b|1&1|1und1|internet|dsl|glasfaser/, 'Abo' + SEP + 'Internet'],
  [/mobilfunk|prepaid|congstar|aldi talk|handyvertrag/, 'Abo' + SEP + 'Telefon'],
  [/apple ?services|apple\.com\/bill|google one|icloud/, 'Abo' + SEP + 'Software-Abo'],
  [/\bdkv\b|euro service|tankkarte|tankstelle|kraftstoff|\baral\b|\bshell\b|\besso\b|total ?energies|\bjet\b|sprit|tanken/, 'Fahrtkosten' + SEP + 'Tanken'],
  [/easypark|parkster|parken|parkhaus|\bpark\b/, 'Fahrtkosten' + SEP + 'Parken'],
  [/adobe|vercel|supabase|\bgoogle\b|microsoft|openai|anthropic|figma|canva|dropbox|notion|\babo\b|software|lizenz/, 'Software'],
  [/gehalt|lohn|\bpersonal\b|minijob|sozialvers|krankenkasse|\belias\b|\bdaniel\b|bene|kutscha/, 'Personal'],
  [/finanzamt|steuerkasse/, 'Finanzamt'],
  [/umsatzsteuer|\bsteuer\b|vorauszahlung|ust-/, 'Steuern'],
  [/kfz.?versicherung|kfz.?vers|auto.?versicherung/, 'Versicherung' + SEP + 'Kfz'],
  [/kranken.?versicherung|kranken.?vers|\bkv\b.?beitrag/, 'Versicherung' + SEP + 'Kranken'],
  [/drohn|drohnenversicherung|haftpflicht.?drohne/, 'Versicherung' + SEP + 'Drohne'],
  [/betriebshaftpflicht|betriebs.?vers/, 'Versicherung' + SEP + 'Betriebshaftpflicht'],
  [/rechtsschutz/, 'Versicherung' + SEP + 'Rechtsschutz'],
  [/versicherung|allianz|\bhuk\b|\baxa\b|ergo|gothaer|provinzial|signal iduna|generali/, 'Versicherung'],
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
const DEFAULT_PARAMS = { pricePerImage: 0.70, kmSelf: 0.20, kmMitarbeiter: 0.30, hebesatz: 400, estPct: 42 }

export default function KontoPage() {
  const [loading, setLoading] = useState(true)
  const [tx, setTx] = useState([])
  const [belege, setBelege] = useState([])
  const [rules, setRules] = useState([])
  const [recur, setRecur] = useState([])
  const [bbpos, setBbpos] = useState([])
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [userCats, setUserCats] = useState([])
  const [catModal, setCatModal] = useState(false)
  const [sec, setSec] = useState('konto')
  const [mon, setMon] = useState(() => new Date().toISOString().slice(0, 7))
  const [openCat, setOpenCat] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data: t } = await supabase.from('bank_transactions').select('id, booking_date, amount, counterparty, purpose, category').order('booking_date', { ascending: false }).limit(4000)
    setTx(t || [])
    const { data: bg } = await supabase.from('eingangsrechnungen').select('id, lieferant, brutto, datum, kategorie, bank_tx_id, datei_url, typ, rechnungsnr').limit(3000)
    setBelege(bg || [])
    try { const { data: rl } = await supabase.from('category_rules').select('*'); setRules(rl || []) } catch {}
    try { const { data: rc } = await supabase.from('recurring_costs').select('*').order('amount', { ascending: false }); setRecur(rc || []) } catch {}
    try { const { data: bb } = await supabase.from('bildbearbeiter_positionen').select('*').limit(20000); setBbpos(bb || []) } catch {}
    const { data: inv } = await supabase.from('invoices').select('id, invoice_number, client_id, client_name, invoice_date, total_net, total_gross, status').neq('status', 'storno').order('invoice_date', { ascending: false }).limit(4000)
    setInvoices(inv || [])
    const { data: cl } = await supabase.from('clients').select('id, name, short_name').order('name')
    setClients(cl || [])
    const { data: ps } = await supabase.from('settings').select('value').eq('key', 'kosten_params').maybeSingle()
    if (ps?.value) { try { setParams({ ...DEFAULT_PARAMS, ...JSON.parse(ps.value) }) } catch {} }
    const { data: cs } = await supabase.from('settings').select('value').eq('key', 'expense_categories').maybeSingle()
    if (cs?.value) { try { setUserCats(JSON.parse(cs.value) || []) } catch {} }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function saveParams(p) { setParams(p); try { await supabase.from('settings').upsert({ key: 'kosten_params', value: JSON.stringify(p) }, { onConflict: 'key' }) } catch {} }
  async function addCat(name, parent) {
    const n = (name || '').trim(); if (!n) return
    const next = [...userCats, { name: n, parent: parent || null }]
    setUserCats(next)
    try { await supabase.from('settings').upsert({ key: 'expense_categories', value: JSON.stringify(next) }, { onConflict: 'key' }) } catch {}
  }
  async function delCat(idx) {
    const next = userCats.filter((_, i) => i !== idx)
    setUserCats(next)
    try { await supabase.from('settings').upsert({ key: 'expense_categories', value: JSON.stringify(next) }, { onConflict: 'key' }) } catch {}
  }

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
  const catList = flatCats(userCats)
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
  let acc = 0; const segs = cats.map(([c, g]) => { const from = acc / (ausgaben || 1) * 100; acc += g.sum; const to = acc / (ausgaben || 1) * 100; return colorOf(c) + ' ' + from.toFixed(2) + '% ' + to.toFixed(2) + '%' })
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
          <button onClick={() => setSec('abgleich')} style={subtab(sec === 'abgleich')}>🧾 Abgleich</button>
          <button onClick={() => setSec('fix')} style={subtab(sec === 'fix')}>🔁 Fixkosten</button>
          <button onClick={() => setSec('rent')} style={subtab(sec === 'rent')}>📈 Rentabilität</button>
          <div style={{ flex: 1 }} />
          <button onClick={() => setCatModal(true)} style={{ ...subtab(false), border: '1px solid ' + LINE }}>🏷️ Kategorien</button>
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
              {uncategorized.slice(0, 20).map(x => <UncatRow key={x.id} x={x} busy={busy} onSet={setCategory} catList={catList} />)}
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
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: colorOf(c) + '22', color: colorOf(c), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{iconOf(c)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{c}</div>
                        <div style={{ height: 6, background: '#f0eada', borderRadius: 4, marginTop: 5 }}><div style={{ height: '100%', width: Math.max(3, g.sum / (ausgaben || 1) * 100) + '%', background: colorOf(c), borderRadius: 4 }} /></div>
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
                        <select value={it.category || c} onChange={e => setCategory(it, e.target.value, false)} style={{ ...selStyle, fontSize: 11, padding: '3px 6px' }}>{catList.map(k => <option key={k}>{k}</option>)}</select>
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

        {sec === 'fix' && <FixSection recur={recur} reload={load} monthlyFix={monthlyFix} avgIst={avgIst} debits={debits} catList={catList} />}

        {sec === 'abgleich' && <AbgleichSection tx={tx} belege={belege} reload={load} catList={catList} />}

        {sec === 'rent' && <RentSection clients={clients} invoices={invoices} params={params} saveParams={saveParams} recur={recur} tx={tx} rules={rules} bbpos={bbpos} reload={load} />}

        {catModal && <CatModal userCats={userCats} onAdd={addCat} onDel={delCat} onClose={() => setCatModal(false)} />}
      </div>
    </RechnungShell>
  )
}

function UncatRow({ x, busy, onSet, catList }) {
  const [cat, setCat] = useState('Sonstiges')
  const [all, setAll] = useState(true)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #f0e3c5', fontSize: 12.5, flexWrap: 'wrap' }}>
      <span style={{ color: MUT, minWidth: 60 }}>{dDE(x.booking_date)}</span>
      <span style={{ fontWeight: 700, minWidth: 140 }}>{x.counterparty || '—'}</span>
      <span style={{ color: MUT, flex: 1, minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(x.purpose || '').slice(0, 60)}</span>
      <b style={{ minWidth: 80, textAlign: 'right' }}>− {eur(Math.abs(x.amount))}</b>
      <select value={cat} onChange={e => setCat(e.target.value)} style={selStyle}>{catList.map(k => <option key={k}>{k}</option>)}</select>
      <label style={{ fontSize: 11, color: MUT, display: 'flex', alignItems: 'center', gap: 4 }}><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> alle „{(x.counterparty || '').slice(0, 14)}"</label>
      <button disabled={busy} onClick={() => onSet(x, cat, all)} style={{ ...primary, padding: '5px 10px', fontSize: 12 }}>OK</button>
    </div>
  )
}

function FixSection({ recur, reload, monthlyFix, avgIst, debits, catList }) {
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
      const r = await fetch('/api/kosten-classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendors, categories: catList }) })
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
                <select value={r.category} onChange={e => upd(i, { category: e.target.value })} style={{ ...selStyle, fontSize: 11 }}>{catList.map(k => <option key={k}>{k}</option>)}</select>
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
          <div><label style={lbl}>Kategorie</label><select value={nf.category} onChange={e => setNf({ ...nf, category: e.target.value })} style={inp}>{catList.map(k => <option key={k}>{k}</option>)}</select></div>
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

function RentSection({ clients, invoices, params, saveParams, recur, tx, rules, bbpos, reload }) {
  const [clientId, setClientId] = useState('')
  const [invId, setInvId] = useState('')
  const [kmS, setKmS] = useState(0)
  const [kmM, setKmM] = useState(0)
  const [kmAuto, setKmAuto] = useState(true)
  const [kostenMon, setKostenMon] = useState('')
  const [p, setP] = useState(params)
  const [imp, setImp] = useState(false)
  useEffect(() => { setP(params) }, [params])

  const cinv = invoices.filter(i => !clientId || i.client_id === clientId)
  const inv = invoices.find(i => i.id === invId) || null
  const client = clients.find(c => c.id === (inv ? inv.client_id : clientId)) || null
  const invMonth = inv ? (inv.invoice_date || '').slice(0, 7) : ''

  useEffect(() => {
    if (!invId || !inv) { setKmS(0); setKmM(0); setKmAuto(true); setKostenMon(''); return }
    const [y, m] = (inv.invoice_date || '').slice(0, 7).split('-').map(Number)
    setKostenMon(new Date(y, m - 2, 1).toISOString().slice(0, 7))
    setKmAuto(true); setKmM(0)
    ;(async () => {
      try {
        const { data: its } = await supabase.from('invoice_items').select('qty, unit, description').eq('invoice_id', invId)
        let k = 0
        for (const it of (its || [])) { const u = (it.unit || '').toLowerCase(); const d = (it.description || '').toLowerCase(); if (u === 'km' || /\bkm\b/.test(d)) k += Number(String(it.qty).replace(',', '.')) || 0 }
        setKmS(Math.round(k))
      } catch { setKmS(0) }
    })()
  }, [invId])

  const pf = patch => saveParams({ ...p, ...patch })
  const shiftKM = d => { if (!kostenMon) return; const [y, m] = kostenMon.split('-').map(Number); setKostenMon(new Date(y, m - 1 + d, 1).toISOString().slice(0, 7)) }

  const monthlyFix = recur.reduce((s, r) => s + (Number(r.amount) || 0) / (DIV[r.interval] || 12), 0)
  const recurCats = new Set(recur.map(r => topOf(r.category)).filter(Boolean))
  const monthDebits = (tx || []).filter(x => Number(x.amount) < 0 && (x.booking_date || '').slice(0, 7) === kostenMon)
  const catTop = x => topOf(catOf(x, rules))
  const personal = monthDebits.filter(x => catTop(x) === 'Personal').reduce((s, x) => s + Math.abs(x.amount), 0)
  const EXCL = new Set(['Personal', 'Bildbearbeiter', 'Fahrtkosten', 'Privatentnahme', 'Steuern', 'Finanzamt', ...recurCats])
  const sonstige = monthDebits.filter(x => !EXCL.has(catTop(x))).reduce((s, x) => s + Math.abs(x.amount), 0)
  const overheadPool = monthlyFix + personal + sonstige

  const monthInvNet = invoices.filter(i => (i.invoice_date || '').slice(0, 7) === invMonth).reduce((s, i) => s + (Number(i.total_net) || 0), 0)
  const netto = inv ? (Number(inv.total_net) || 0) : 0
  const anteil = monthInvNet > 0 ? netto / monthInvNet : 0

  const bildPos = (bbpos || []).filter(x => bbMatch(x.beschreibung, client) && ((x.monat || bbMonat(x.beschreibung, x.datum)) === kostenMon))
  const bildBilder = bildPos.reduce((s, x) => s + (Number(x.menge) || 0), 0)
  const bild = bildPos.reduce((s, x) => s + (Number(x.betrag) || (Number(x.menge) || 0) * (Number(x.einzelpreis) || 0)), 0)

  const fahrtS = (Number(kmS) || 0) * (Number(p.kmSelf) || 0)
  const fahrtM = (Number(kmM) || 0) * (Number(p.kmMitarbeiter) || 0)
  const fahrt = fahrtS + fahrtM
  const direkt = fahrt + bild
  const overheadClient = overheadPool * anteil
  const ergebnis = netto - direkt - overheadClient

  const base = Math.max(0, ergebnis)
  const messbetrag = base * 0.035
  const gewSt = messbetrag * ((Number(p.hebesatz) || 0) / 100)
  const estBrutto = base * ((Number(p.estPct) || 0) / 100)
  const anrechnung = Math.min(gewSt, messbetrag * 3.8)
  const est = Math.max(0, estBrutto - anrechnung)
  const steuer = gewSt + est
  const gewinn = ergebnis - steuer
  const positiv = gewinn >= 0

  const sLab = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0 4px', fontSize: 14, fontWeight: 800, borderTop: '1px solid #f1ead9', marginTop: 2 }
  const miniS = { fontSize: 11, color: MUT, fontWeight: 600 }
  const subItem = { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#52504b', padding: '3px 0 3px 18px' }

  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>Rentabilität pro Fotoshooting</div>
      <div style={{ fontSize: 13, color: MUT, marginBottom: 16 }}>Kunde &amp; Monatsrechnung wählen — alles netto. Direkte Kosten (Fahrt + Bildbearbeitung) treffen den Kunden direkt; alle übrigen Kosten (Personal, Fixkosten, Sonstiges) werden nach Umsatzanteil umgelegt. Danach Gewerbe- und Einkommensteuer.</div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={h3}>Parameter</div>
          <button onClick={() => setImp(true)} style={{ ...mini, borderColor: GOLD, color: GOLD }}>🎨 Bildbearbeiter-Rechnung importieren</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
          <div><label style={lbl}>km-Satz ich €</label><input value={p.kmSelf} onChange={e => setP({ ...p, kmSelf: e.target.value })} onBlur={() => pf({ kmSelf: p.kmSelf })} style={{ ...inp, textAlign: 'right' }} /></div>
          <div><label style={lbl}>km-Satz Mitarbeiter €</label><input value={p.kmMitarbeiter} onChange={e => setP({ ...p, kmMitarbeiter: e.target.value })} onBlur={() => pf({ kmMitarbeiter: p.kmMitarbeiter })} style={{ ...inp, textAlign: 'right' }} /></div>
          <div><label style={lbl}>Preis / Bild € (Info)</label><input value={p.pricePerImage} onChange={e => setP({ ...p, pricePerImage: e.target.value })} onBlur={() => pf({ pricePerImage: p.pricePerImage })} style={{ ...inp, textAlign: 'right' }} /></div>
          <div><label style={lbl}>GewSt-Hebesatz %</label><input value={p.hebesatz} onChange={e => setP({ ...p, hebesatz: e.target.value })} onBlur={() => pf({ hebesatz: p.hebesatz })} style={{ ...inp, textAlign: 'right' }} /></div>
          <div><label style={lbl}>ESt-Satz (Grenz) %</label><input value={p.estPct} onChange={e => setP({ ...p, estPct: e.target.value })} onBlur={() => pf({ estPct: p.estPct })} style={{ ...inp, textAlign: 'right' }} /></div>
        </div>
        <div style={{ fontSize: 11, color: MUT, marginTop: 8 }}>Bildbearbeitung kommt aus der importierten Bildbearbeiter-Rechnung (Positionen mit dem Kundennamen). GewSt = 3,5 % × Hebesatz; ESt = Grenzsatz abzgl. GewSt-Anrechnung (§35 EStG). Näherung, kein Steuerbescheid.</div>
      </div>

      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}><label style={lbl}>Kunde</label><select value={clientId} onChange={e => { setClientId(e.target.value); setInvId('') }} style={inp}><option value="">— alle Kunden —</option>{clients.map(c => <option key={c.id} value={c.id}>{c.short_name || c.name}</option>)}</select></div>
          <div style={{ flex: 2, minWidth: 240 }}><label style={lbl}>Rechnung / Monat</label><select value={invId} onChange={e => setInvId(e.target.value)} style={inp}><option value="">— auswählen —</option>{cinv.slice(0, 300).map(i => <option key={i.id} value={i.id}>{(i.invoice_number || '\u2014') + ' \u00b7 ' + dDE(i.invoice_date) + ' \u00b7 ' + i.client_name + ' \u00b7 ' + eur(i.total_net) + ' netto'}</option>)}</select></div>
        </div>
      </div>

      {inv && (
        <div style={{ ...card, marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{inv.invoice_number} \u00b7 {inv.client_name} <span style={{ color: MUT, fontWeight: 400, fontSize: 12 }}>(Rechnung {dDE(inv.invoice_date)})</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ color: MUT }}>Kostenmonat:</span>
              <button onClick={() => shiftKM(-1)} style={navBtn}>\u2039</button>
              <span style={{ fontWeight: 700, minWidth: 96, textAlign: 'center' }}>{kostenMon ? MONN[Number(kostenMon.split('-')[1]) - 1] + ' ' + kostenMon.split('-')[0] : '\u2014'}</span>
              <button onClick={() => shiftKM(1)} style={navBtn}>\u203a</button>
            </div>
          </div>

          <Row l="Umsatz netto" v={eur(netto)} bold />

          <div style={sLab}><span>\u2212 Fahrtkosten <span style={miniS}>\u00b7 {(Number(kmS) || 0) + (Number(kmM) || 0)} km \u00b7 aus Fahrtenbuch</span></span><span style={{ color: RED }}>\u2212 {eur(fahrt)}</span></div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '4px 0 4px 18px', fontSize: 12.5, color: MUT, flexWrap: 'wrap' }}>
            <span>ich</span><input value={kmS} onChange={e => { setKmS(e.target.value); setKmAuto(false) }} style={{ ...inp, width: 64, padding: '4px 7px', textAlign: 'right' }} /><span>\u00d7 {Number(p.kmSelf).toFixed(2)} = {eur(fahrtS)}</span>{kmAuto && <span style={{ fontSize: 10, color: GREEN }}>auto</span>}
            <span style={{ marginLeft: 10 }}>Mitarb.</span><input value={kmM} onChange={e => setKmM(e.target.value)} style={{ ...inp, width: 64, padding: '4px 7px', textAlign: 'right' }} /><span>\u00d7 {Number(p.kmMitarbeiter).toFixed(2)} = {eur(fahrtM)}</span>
          </div>

          <div style={sLab}><span>\u2212 Bildbearbeitung <span style={miniS}>\u00b7 {bildBilder} Bilder \u00b7 {bildPos.length} Pos.{client ? ' \u00b7 ' + (client.short_name || client.name) : ''}</span></span><span style={{ color: RED }}>\u2212 {eur(bild)}</span></div>
          {inv && bildPos.length === 0 && <div style={{ fontSize: 12, color: AMBER, padding: '2px 0 2px 18px' }}>Keine Bildbearbeiter-Positionen f\u00fcr {client ? (client.short_name || client.name) : 'diesen Kunden'} im Kostenmonat \u2014 oben „Bildbearbeiter-Rechnung importieren".</div>}
          {bildPos.slice(0, 14).map((x, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MUT, padding: '1px 0 1px 18px' }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '72%' }}>{x.beschreibung}</span><span>{x.menge}</span></div>)}

          <Row l="= Deckungsbeitrag (Umsatz \u2212 direkte Kosten)" v={eur(netto - direkt)} bold />

          <div style={sLab}><span>\u2212 Anteilige Gemeinkosten <span style={miniS}>\u00b7 {(anteil * 100).toFixed(1)} % Umsatzanteil</span></span><span style={{ color: RED }}>\u2212 {eur(overheadClient)}</span></div>
          <div style={subItem}><span>Personal (Bank) <span style={miniS}>{eur0(personal)}/M</span></span><span>\u2212 {eur(personal * anteil)}</span></div>
          <div style={subItem}><span>Fixkosten amortisiert <span style={miniS}>{eur0(monthlyFix)}/M</span></span><span>\u2212 {eur(monthlyFix * anteil)}</span></div>
          <div style={subItem}><span>Sonstige Betriebskosten (Bank) <span style={miniS}>{eur0(sonstige)}/M</span></span><span>\u2212 {eur(sonstige * anteil)}</span></div>
          <div style={{ fontSize: 11, color: MUT, padding: '3px 0 0 18px' }}>Pool {eur0(overheadPool)}/Monat (ohne Bildbearbeiter, Kraftstoff/Fahrt, Privatentnahme, Steuern). Posten siehe Reiter „Fixkosten".</div>

          <Row l="= Ergebnis vor Steuer" v={eur(ergebnis)} bold />
          <Row l={'\u2212 Gewerbesteuer (3,5 % \u00d7 ' + (p.hebesatz || 0) + ' % = ' + (3.5 * (Number(p.hebesatz) || 0) / 100).toFixed(1) + ' %)'} v={'\u2212 ' + eur(gewSt)} />
          <Row l={'\u2212 Einkommensteuer (' + (p.estPct || 0) + ' % Grenz, abzgl. Anrechnung ' + eur(anrechnung) + ')'} v={'\u2212 ' + eur(est)} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '12px 14px', borderRadius: 10, background: positiv ? GREENBG : '#fbe9e9' }}>
            <b style={{ color: positiv ? GREENTX : RED }}>= Gewinn nach Steuer</b><b style={{ fontSize: 19, color: positiv ? GREENTX : RED }}>{eur(gewinn)}</b>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 14 }}>
            <Kpi l="Direkte Kosten" v={eur(direkt)} />
            <Kpi l="Gemeinkosten-Anteil" v={eur(overheadClient)} />
            <Kpi l="Steuer gesamt" v={eur(steuer)} c={RED} />
            <Kpi l="Netto-Marge" v={netto > 0 ? Math.round(gewinn / netto * 100) + ' %' : '\u2014'} c={positiv ? GREENTX : RED} />
          </div>

          <div style={{ fontSize: 11, color: MUT, marginTop: 12, lineHeight: 1.6 }}>km pro Fahrer aufteilbar (Quelle Fahrtenbuch/Rechnung). Bildbearbeitung = Bildbearbeiter-Positionen mit dem Kundennamen im Kostenmonat. Gemeinkosten = (Personal + Fixkosten amortisiert + sonstige Betriebskosten) \u00d7 Umsatzanteil. Steuern N\u00e4herung \u2014 endg\u00fcltig beim Steuerberater.</div>
        </div>
      )}

      {imp && <BildImportModal invMonth={invMonth} onClose={() => setImp(false)} reload={reload} clients={clients} />}
    </>
  )
}

function BildImportModal({ invMonth, onClose, reload, clients }) {
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState(null)
  const [rechMon, setRechMon] = useState(invMonth || new Date().toISOString().slice(0, 7))
  const fileRef = useRef(null)
  async function onFile(e) {
    const f = e.target.files && e.target.files[0]; e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f) })
      const r = await fetch('/api/bildbearbeiter-parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: b64, mediaType: f.type || 'application/pdf' }) })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'Parse fehlgeschlagen')
      const parsed = (j.positionen || []).map(x => { const mon = bbMonat(x.beschreibung, x.datum); const key = bbClientKey(x.beschreibung); const cl = clients.find(c => bbMatch(x.beschreibung, c)); return { ...x, monat: mon, client_key: key, client_name: cl ? (cl.short_name || cl.name) : key } })
      setRows(parsed)
    } catch (e) { alert('Fehler: ' + (e.message || e)) }
    setBusy(false)
  }
  async function save() {
    if (!rows || !rows.length) return
    setBusy(true)
    try {
      const payload = rows.map(x => ({ monat: x.monat, rechnung_monat: rechMon, datum: (x.datum && /^\d{4}-\d{2}-\d{2}/.test(x.datum)) ? x.datum.slice(0, 10) : null, beschreibung: x.beschreibung, menge: Number(x.menge) || 0, einzelpreis: Number(x.einzelpreis) || 0, betrag: Number(x.betrag) || 0, client_key: x.client_key || null }))
      await supabase.from('bildbearbeiter_positionen').delete().eq('rechnung_monat', rechMon)
      const { error } = await supabase.from('bildbearbeiter_positionen').insert(payload); if (error) throw error
      onClose(); await reload()
    } catch (e) { alert('Speichern-Fehler: ' + (e.message || e)) }
    setBusy(false)
  }
  const total = rows ? rows.reduce((s, x) => s + (Number(x.betrag) || 0), 0) : 0
  const bilder = rows ? rows.reduce((s, x) => s + (Number(x.menge) || 0), 0) : 0
  const byClient = {}
  if (rows) for (const x of rows) { const k = x.client_name || '\u2014'; byClient[k] = (byClient[k] || 0) + (Number(x.menge) || 0) }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', zIndex: 200, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 22, width: '100%', maxWidth: 760 }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Bildbearbeiter-Rechnung importieren</div>
        <div style={{ fontSize: 12, color: MUT, marginBottom: 14 }}>PDF/Bild der Monatsrechnung hochladen \u2014 die Positionen werden ausgelesen, der Kunde aus dem Positionstext erkannt und der Shooting-Monat aus dem Namen (z.B. 26_05_09 = Mai). Re-Import desselben Rechnungsmonats \u00fcberschreibt.</div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={onFile} style={{ display: 'none' }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'end', marginBottom: 14, flexWrap: 'wrap' }}>
          <div><label style={lbl}>Rechnungsmonat</label><input type="month" value={rechMon} onChange={e => setRechMon(e.target.value)} style={{ ...inp, width: 160 }} /></div>
          <button onClick={() => fileRef.current && fileRef.current.click()} disabled={busy} style={primary}>{busy ? 'Lese\u2026' : (rows ? 'Andere Datei' : '\u2b06 Datei w\u00e4hlen')}</button>
        </div>

        {rows && <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, background: '#f3eee3', borderRadius: 999, padding: '4px 10px' }}>{rows.length} Positionen</span>
            <span style={{ fontSize: 12, fontWeight: 700, background: '#f3eee3', borderRadius: 999, padding: '4px 10px' }}>{bilder} Bilder</span>
            <span style={{ fontSize: 12, fontWeight: 700, background: '#f3eee3', borderRadius: 999, padding: '4px 10px' }}>{eur(total)}</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUT, textTransform: 'uppercase', marginBottom: 6 }}>Pro Kunde erkannt</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {Object.entries(byClient).sort((a, b) => b[1] - a[1]).map(([k, v]) => <span key={k} style={{ fontSize: 12, background: '#faf7f1', border: '1px solid ' + LINE, borderRadius: 8, padding: '3px 9px' }}>{k}: <b>{v}</b></span>)}
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid ' + LINE, borderRadius: 8 }}>
            {rows.map((x, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 60px 70px', gap: 8, alignItems: 'center', padding: '5px 9px', borderTop: i ? '1px solid #f1ead9' : 'none', fontSize: 12 }}>
                <span style={{ color: MUT }}>{x.monat || '?'}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.beschreibung} <span style={{ color: GOLD }}>\u2192 {x.client_name}</span></span>
                <span style={{ textAlign: 'right' }}>{x.menge}</span>
                <span style={{ textAlign: 'right', color: MUT }}>{eur(x.betrag)}</span>
              </div>
            ))}
          </div>
        </>}
        {!rows && <div style={{ fontSize: 13, color: MUT, padding: '8px 0' }}>Noch keine Datei geladen.</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={mini}>Abbrechen</button>
          <button onClick={save} disabled={busy || !rows || !rows.length} style={primary}>{busy ? '\u2026' : 'Speichern (' + (rows ? rows.length : 0) + ')'}</button>
        </div>
      </div>
    </div>
  )
}

function AbgleichSection({ tx, belege, reload, catList }) {
  const [mon, setMon] = useState(() => new Date().toISOString().slice(0, 7))
  const [busy, setBusy] = useState(false)
  const [assignFor, setAssignFor] = useState(null)
  const [uploadFor, setUploadFor] = useState(null)
  const fileRef = useRef(null)

  const [yy, mm] = mon.split('-').map(Number)
  const shift = d => { const dt = new Date(yy, mm - 1 + d, 1); setMon(dt.toISOString().slice(0, 7)); setAssignFor(null) }
  const debits = (tx || []).filter(x => Number(x.amount) < 0 && (x.booking_date || '').slice(0, 7) === mon).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  const bel = (belege || []).filter(b => b.typ !== 'buchhaltung')
  const linkedBy = {}; for (const b of bel) if (b.bank_tx_id) linkedBy[b.bank_tx_id] = b
  const freeBelege = bel.filter(b => !b.bank_tx_id)
  const near = amt => freeBelege.filter(b => Math.abs((Math.abs(Number(b.brutto) || 0)) - (Math.abs(Number(amt) || 0))) < 0.01).sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))
  function st(d) { if (linkedBy[d.id]) return { k: 'linked', b: linkedBy[d.id] }; const m = near(d.amount); if (m.length) return { k: 'suggest', b: m[0] }; return { k: 'missing' } }
  const rows = debits.map(d => ({ d, s: st(d) }))
  const linkedCount = rows.filter(r => r.s.k === 'linked').length
  const total = debits.reduce((s, d) => s + Math.abs(d.amount), 0)
  const missingSum = rows.filter(r => r.s.k !== 'linked').reduce((s, r) => s + Math.abs(r.d.amount), 0)
  const orphans = freeBelege.filter(b => (b.datum || '').slice(0, 7) === mon)

  async function link(debit, belegId) { setBusy(true); try { await supabase.from('eingangsrechnungen').update({ bank_tx_id: debit.id }).eq('id', belegId); setAssignFor(null); await reload() } catch (e) { alert('Fehler: ' + (e.message || e)) } setBusy(false) }
  async function unlink(beleg) { setBusy(true); try { await supabase.from('eingangsrechnungen').update({ bank_tx_id: null }).eq('id', beleg.id); await reload() } catch {} setBusy(false) }
  function pickFile(debit) { setUploadFor(debit); setTimeout(() => fileRef.current && fileRef.current.click(), 0) }
  async function onFile(e) {
    const f = e.target.files && e.target.files[0]; const debit = uploadFor; e.target.value = ''
    if (!f || !debit) return
    setBusy(true)
    try {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f) })
      const up = await fetch('/api/beleg-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: b64, mediaType: f.type || 'application/pdf', name: f.name, folder: 'eingang' }) })
      const uj = await up.json(); if (!uj.ok) throw new Error(uj.error || 'Upload fehlgeschlagen')
      let kat = 'Sonstiges', lief = debit.counterparty || null
      try { const oc = await fetch('/api/eingangsrechnung-ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: b64, mediaType: f.type || 'application/pdf' }) }); const oj = await oc.json(); if (oj.ok && oj.data) { kat = oj.data.kategorie || kat; lief = oj.data.lieferant || lief } } catch {}
      const payload = { typ: 'eingangsrechnung', lieferant: lief, datum: debit.booking_date, brutto: Math.abs(Number(debit.amount) || 0), netto: 0, ust: 0, ust_satz: 19, kategorie: kat, status: 'zu_pruefen', datei_name: f.name, datei_url: uj.url, bank_tx_id: debit.id }
      const { error } = await supabase.from('eingangsrechnungen').insert(payload); if (error) throw error
      setUploadFor(null); await reload()
    } catch (e) { alert('Fehler: ' + (e.message || e)) }
    setBusy(false)
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={onFile} style={{ display: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Beleg-Abgleich</div>
          <div style={{ fontSize: 13, color: MUT }}>Jede Bank-Belastung mit dem passenden Beleg verknüpfen — fehlende hochladen oder zuordnen.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => shift(-1)} style={navBtn}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 700, minWidth: 120, textAlign: 'center' }}>{MONN[mm - 1]} {yy}</span>
          <button onClick={() => shift(1)} style={navBtn}>›</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        <Kpi l="Belege-Quote" v={debits.length ? Math.round(linkedCount / debits.length * 100) + ' %' : '—'} c={linkedCount === debits.length && debits.length ? GREEN : DARK} />
        <Kpi l="Mit Beleg" v={linkedCount + ' / ' + debits.length} />
        <Kpi l="Ohne Beleg (Betrag)" v={eur0(missingSum)} c={missingSum ? AMBER : GREEN} />
      </div>

      <div style={card}>
        {rows.length === 0 && <div style={{ color: MUT, fontSize: 13, padding: 8 }}>Keine Belastungen in diesem Monat. (Erst Sparkasse-Umsätze importieren.)</div>}
        {rows.map(({ d, s }) => (
          <div key={d.id} style={{ borderTop: '1px solid #f1ead9', padding: '10px 2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, flexWrap: 'wrap' }}>
              <span style={{ color: MUT, minWidth: 64 }}>{dDE(d.booking_date)}</span>
              <span style={{ fontWeight: 700, minWidth: 130, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.counterparty || '—'}</span>
              <span style={{ color: MUT, flex: 1, minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(d.purpose || '').slice(0, 50)}</span>
              <b style={{ minWidth: 90, textAlign: 'right' }}>− {eur(Math.abs(d.amount))}</b>
              {s.k === 'linked' && <span style={{ ...belegTag, color: GREENTX, background: GREENBG, display: 'inline-flex', gap: 5, alignItems: 'center' }}>Beleg ✓ {s.b.datei_url && <a href={s.b.datei_url} target="_blank" rel="noreferrer" style={{ color: GREENTX }}>↗</a>}<span onClick={() => unlink(s.b)} style={{ cursor: 'pointer', opacity: .6 }} title="Verknüpfung lösen">✕</span></span>}
              {s.k === 'suggest' && <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ ...belegTag, color: '#185fa5', background: '#e3edf6' }}>Vorschlag</span><button disabled={busy} onClick={() => link(d, s.b.id)} style={{ ...mini, color: GREENTX, borderColor: '#b6dcc4' }}>✓ {s.b.lieferant || s.b.rechnungsnr || 'Beleg'} übernehmen</button><button onClick={() => setAssignFor(assignFor === d.id ? null : d.id)} style={mini}>andere</button></span>}
              {s.k === 'missing' && <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ ...belegTag, color: AMBERTX, background: AMBERBG }}>Beleg fehlt</span>{near(d.amount).length > 0 && <button onClick={() => setAssignFor(assignFor === d.id ? null : d.id)} style={mini}>zuordnen</button>}<button disabled={busy} onClick={() => pickFile(d)} style={{ ...mini, color: GOLD }}>⬆ hochladen</button></span>}
            </div>
            {assignFor === d.id && (
              <div style={{ marginTop: 8, marginLeft: 74, padding: 10, background: '#faf7f1', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: MUT, fontWeight: 700, marginBottom: 6 }}>Vorhandenen Beleg zuordnen (gleicher Betrag zuerst):</div>
                {[...near(d.amount), ...freeBelege.filter(b => !near(d.amount).includes(b))].slice(0, 12).map(b => (
                  <div key={b.id} onClick={() => link(d, b.id)} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 4px', borderTop: '1px solid #efe7d6', fontSize: 12.5, cursor: 'pointer' }}>
                    <span style={{ color: MUT, minWidth: 64 }}>{dDE(b.datum)}</span>
                    <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.lieferant || b.rechnungsnr || 'Beleg'}</span>
                    <b>{eur(b.brutto)}</b>
                    {Math.abs((Math.abs(Number(b.brutto) || 0)) - Math.abs(d.amount)) < 0.01 && <span style={{ fontSize: 10, color: GREENTX }}>passt</span>}
                  </div>
                ))}
                {freeBelege.length === 0 && <div style={{ fontSize: 12, color: MUT }}>Keine freien Belege — bitte hochladen.</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {orphans.length > 0 && (
        <div style={{ ...card, marginTop: 14 }}>
          <div style={h3}>Belege ohne Buchung ({orphans.length}) — {MONN[mm - 1]}</div>
          <div style={{ fontSize: 12, color: MUT, marginBottom: 8 }}>Hochgeladene Belege, die noch keiner Bank-Belastung zugeordnet sind.</div>
          {orphans.slice(0, 20).map(b => (
            <div key={b.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 2px', borderTop: '1px solid #f1ead9', fontSize: 12.5 }}>
              <span style={{ color: MUT, minWidth: 64 }}>{dDE(b.datum)}</span>
              <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.lieferant || b.rechnungsnr || 'Beleg'}{b.datei_url && <a href={b.datei_url} target="_blank" rel="noreferrer" style={{ marginLeft: 6, color: GOLD }}>↗</a>}</span>
              <b>{eur(b.brutto)}</b>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: MUT, marginTop: 12, lineHeight: 1.6 }}>„Vorschlag" = ein vorhandener Beleg hat denselben Betrag. „Hochladen" legt den Beleg an und verknüpft ihn direkt mit dieser Buchung (mit KI-Kategorie). Quelle: Sparkasse-Umsätze + erfasste Eingangsrechnungen.</div>
    </>
  )
}

function CatModal({ userCats, onAdd, onDel, onClose }) {
  const [name, setName] = useState('')
  const [parent, setParent] = useState('')
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '50px 16px', zIndex: 200, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 22, width: '100%', maxWidth: 520 }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Kategorien verwalten</div>
        <div style={{ fontSize: 12, color: MUT, marginBottom: 16 }}>Eigene Kategorien oder Unterkategorien hinzufügen (z.B. Versicherung › Hausrat). Sie erscheinen überall in den Auswahllisten und werden von der KI berücksichtigt.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr auto', gap: 8, alignItems: 'end', marginBottom: 16 }}>
          <div><label style={lbl}>Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Hausrat" style={inp} /></div>
          <div><label style={lbl}>Übergeordnet (optional)</label><select value={parent} onChange={e => setParent(e.target.value)} style={inp}><option value="">— Hauptkategorie —</option>{BASE_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <button onClick={() => { onAdd(name, parent); setName('') }} style={primary}>+ Hinzufügen</button>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: MUT, textTransform: 'uppercase', marginBottom: 8 }}>Eigene Kategorien</div>
        {(!userCats || userCats.length === 0) && <div style={{ fontSize: 13, color: MUT }}>Noch keine eigenen Kategorien. Die Standard-Kategorien (inkl. Versicherung-Unterkategorien, Leasing, Abo) sind immer verfügbar.</div>}
        {(userCats || []).map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid #f1ead9', fontSize: 13 }}>
            <span style={{ flex: 1 }}>{c.parent ? <span><span style={{ color: MUT }}>{c.parent} › </span><b>{c.name}</b></span> : <b>{c.name}</b>}</span>
            <button onClick={() => onDel(i)} style={{ ...mini, color: RED }}>✕</button>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}><button onClick={onClose} style={primary}>Fertig</button></div>
      </div>
    </div>
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
