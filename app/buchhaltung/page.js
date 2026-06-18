'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import RechnungShell from '../../components/RechnungShell'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const ACC = '#6b6b6e', DARK = '#2a2a28', MUT = '#8a8278', LINE = '#ece4d6'
const GREEN = '#1d9e75', GREENBG = '#e1f5ee', GREENTX = '#0f6e56'
const RED = '#a32d2d', REDBG = '#fcebeb'
const AMBER = '#ba7517', BLUE = '#185fa5', BLUEBG = '#e6f1fb', BLUETX = '#0c447c'
const eur0 = n => Math.round(Number(n) || 0).toLocaleString('de-DE') + ' €'
const eur2 = n => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const signEur0 = n => (Number(n) > 0 ? '+' : '') + eur0(n)

const ART = { 'BWA': { label: 'BWA', c: '#185fa5', bg: '#e6f1fb' }, 'SuSa': { label: 'Summen & Salden', c: '#5f5e5a', bg: '#f1efe8' }, 'USt-VA': { label: 'USt-Voranmeldung', c: '#0f6e56', bg: '#e1f5ee' }, 'Lohn': { label: 'Lohn', c: '#854f0b', bg: '#faeeda' } }
const KENN = { ust_vorauszahlung: { label: 'USt-Vorauszahlung', eur: true }, faelligkeit: { label: 'Fälligkeit', date: true }, ergebnis_monat: { label: 'Ergebnis Monat', eur: true }, ergebnis_kumuliert: { label: 'Ergebnis kumuliert', eur: true }, erloese_monat: { label: 'Erlöse Monat', eur: true } }
function kiOf(r) { const x = r && r.ki_raw; if (!x) return {}; if (typeof x === 'string') { try { return JSON.parse(x) } catch { return {} } } return x }
function fmtKenn(k, v) { const def = KENN[k]; if (v == null || v === '') return null; if (def && def.eur && !isNaN(Number(v))) return eur2(v); if (def && def.date) { const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString('de-DE') } return String(v) }
function labelKenn(k) { return (KENN[k] && KENN[k].label) || k.replace(/_/g, ' ') }

const MONTHS_DE = { januar: 1, februar: 2, märz: 3, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12, jan: 1, feb: 2, mär: 3, mae: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dez: 12 }
function num(v) { if (v == null || v === '') return null; const n = Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, '')); return isNaN(n) ? (isNaN(Number(v)) ? null : Number(v)) : Number(v) }
function rowDate(r) { const ki = kiOf(r); if (r.datum) return r.datum; const z = String(ki.zeitraum || ''); const ym = z.match(/(20\d\d)/); const mm = (z.toLowerCase().match(/[a-zäöü]+/) || [])[0]; const mo = mm && MONTHS_DE[mm] ? MONTHS_DE[mm] : 1; return ym ? ym[1] + '-' + String(mo).padStart(2, '0') + '-01' : '1900-01-01' }
// utolsó hónap (kumulált időszak vége) a zeitraum vagy a kulcsok alapján
function monthsElapsed(rows, year) {
  let mx = 0
  for (const r of rows) {
    const ki = kiOf(r); if (ki.belegart !== 'BWA') continue
    const keys = Object.keys(ki.kennzahlen || {}).join(' ').toLowerCase() + ' ' + String(ki.zeitraum || '').toLowerCase()
    if (!keys.includes(String(year))) continue
    for (const mname of Object.keys(MONTHS_DE)) { if (keys.includes(mname) && MONTHS_DE[mname] > mx) mx = MONTHS_DE[mname] }
  }
  return mx || 0
}

// kulcs-illesztő: rows (legfrissebb elöl), regex a NORMALIZÁLT kulcson, opcionális év-szűrő
function findKenn(rows, re, opts) {
  opts = opts || {}
  for (const r of rows) {
    const kenn = (kiOf(r).kennzahlen) || {}
    for (const [k, v] of Object.entries(kenn)) {
      if (v == null || v === '') continue
      const kk = String(k).toLowerCase()
      if (!re.test(kk)) continue
      if (opts.year && !kk.includes(String(opts.year))) continue
      if (opts.notYear && kk.includes(String(opts.notYear))) continue
      const n = num(v); if (n == null) continue
      return n
    }
  }
  return null
}

// --- Einkommensteuer §32a (2026) ---
function estG(zvE) {
  const x = Math.floor(Number(zvE) || 0)
  if (x <= 12348) return 0
  if (x <= 17799) { const y = (x - 12348) / 10000; return (914.51 * y + 1400) * y }
  if (x <= 69878) { const z = (x - 17799) / 10000; return (173.10 * z + 2397) * z + 1034.87 }
  if (x <= 277825) return 0.42 * x - 11135.63
  return 0.45 * x - 19470.38
}

function buildSnapshot(rows) {
  const sorted = [...rows].sort((a, b) => rowDate(b).localeCompare(rowDate(a)))
  const bwas = sorted.filter(r => kiOf(r).belegart === 'BWA')
  const susas = sorted.filter(r => kiOf(r).belegart === 'SuSa')
  // aktuális év = a BWA kulcsokban talált legnagyobb év, különben az idei
  const years = new Set()
  for (const r of bwas) { const s = (Object.keys(kiOf(r).kennzahlen || {}).join(' ') + ' ' + (kiOf(r).zeitraum || '')); (s.match(/20\d\d/g) || []).forEach(y => years.add(+y)) }
  const curYear = years.size ? Math.max(...years) : new Date().getFullYear()
  const prevYear = curYear - 1
  const months = monthsElapsed(rows, curYear)
  const erl = /erl(oe|ö)se.*kumuliert/, erg = /ergebnis.*kumuliert/
  return {
    curYear, prevYear, months,
    ergebnisKum: findKenn(bwas, erg, { year: curYear, notYear: prevYear }),
    ergebnisKumPrev: findKenn(bwas, erg, { year: prevYear }),
    erloeseKum: findKenn(bwas, erl, { year: curYear, notYear: prevYear }),
    erloeseKumPrev: findKenn(bwas, erl, { year: prevYear }),
    einnahmenKum: findKenn(bwas, /betriebseinnahmen.*kumuliert/, { year: curYear, notYear: prevYear }),
    ausgabenKum: findKenn(bwas, /betriebsausgaben.*kumuliert/, { year: curYear, notYear: prevYear }),
    personalKum: findKenn(bwas, /personalkosten.*kumuliert/, { year: curYear, notYear: prevYear }),
    ergebnisMonat: findKenn(bwas, /ergebnis.*monat/, { year: curYear, notYear: prevYear }),
    bank: findKenn(susas.concat(bwas), /bank.?saldo/),
    forderungen: findKenn(susas, /forderung/),
    verbind: findKenn(susas, /verbindlichkeit/),
    ustSchuld: findKenn(sorted, /umsatzsteuer.*verbindlich|ust.*zahllast|umsatzsteuer.*schuld/),
    hasBwa: bwas.length > 0,
  }
}

function Metric({ label, value, color, hint }) {
  return (
    <div style={{ background: '#faf7f1', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 12, color: MUT }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || DARK, marginTop: 2 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: MUT, marginTop: 2 }}>{hint}</div>}
    </div>
  )
}

function YoyBars({ label, a, b, yearA, yearB }) {
  const mx = Math.max(Math.abs(a || 0), Math.abs(b || 0), 1)
  const Bar = ({ v, year, col }) => {
    const neg = (v || 0) < 0
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
        <div style={{ width: 38, fontSize: 12, color: MUT }}>{year}</div>
        <div style={{ flex: 1, height: 22, background: '#f1efe8', borderRadius: 4, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: Math.max(2, Math.abs(v || 0) / mx * 100) + '%', background: col, borderRadius: 4 }} />
        </div>
        <div style={{ width: 90, textAlign: 'right', fontSize: 13, fontWeight: 700, color: neg ? RED : DARK }}>{signEur0(v || 0)}</div>
      </div>
    )
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: MUT, marginBottom: 4 }}>{label}</div>
      <Bar v={a} year={yearA} col="#b4b2a9" />
      <Bar v={b} year={yearB} col={(b || 0) < 0 ? RED : GREEN} />
    </div>
  )
}

export default function BuchhaltungPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [drag, setDrag] = useState(false)
  const [bulk, setBulk] = useState(null)
  const [open, setOpen] = useState({})
  const fileRef = useRef(null)

  useEffect(() => { init() }, [])
  async function init() { const { data: { user } } = await supabase.auth.getUser(); if (!user) { window.location.href = '/login'; return } await load(); setLoading(false) }
  async function load() { const { data } = await supabase.from('eingangsrechnungen').select('*').eq('typ', 'buchhaltung').order('datum', { ascending: false }); setRows(data || []) }

  function fileToBase64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file) }) }
  async function uploadFile(f) { try { const b64 = await fileToBase64(f); const r = await fetch('/api/beleg-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: b64, mediaType: f.type || 'application/pdf', name: f.name, folder: 'buchhaltung' }) }); const j = await r.json(); return (j && j.ok) ? j.url : null } catch { return null } }

  async function handleFiles(files) {
    const arr = Array.from(files || []); if (!arr.length) return
    setBulk({ done: 0, total: arr.length, current: '' })
    const existing = new Set(rows.map(r => { const k = kiOf(r); return (k.belegart || r.lieferant || '') + '|' + (k.zeitraum || r.datum || '') }))
    let ok = 0; const errors = []
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i]; setBulk({ done: i, total: arr.length, current: f.name })
      try {
        if (f.size > 28 * 1024 * 1024) { errors.push(f.name + ' — zu groß'); continue }
        const b64 = await fileToBase64(f)
        const r = await fetch('/api/eingangsrechnung-ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: b64, mediaType: f.type || 'application/pdf' }) })
        const j = await r.json(); const d = (j && j.ok && j.data) ? j.data : {}
        const key = (d.belegart || 'Buchhaltung') + '|' + (d.zeitraum || d.datum || '')
        if (existing.has(key)) { errors.push(f.name + ' — Duplikat übersprungen'); continue }
        const url = await uploadFile(f)
        const payload = { typ: 'buchhaltung', lieferant: d.belegart || 'Buchhaltung', rechnungsnr: null, datum: d.datum || new Date().toISOString().slice(0, 10), netto: 0, ust: 0, brutto: 0, ust_satz: 0, kategorie: null, status: 'zu_pruefen', datei_name: f.name, ki_raw: d, datei_url: url }
        const { error } = await supabase.from('eingangsrechnungen').insert(payload)
        if (error) { errors.push(f.name + ' — DB: ' + error.message); continue }
        existing.add(key); ok++
      } catch (e) { errors.push(f.name + ' — ' + (e.message || 'Fehler')) }
    }
    setBulk(null); await load()
    let msg = '✓ ' + ok + ' Dokument(e) in der Buchhaltung gespeichert.'
    if (errors.length) msg += '\n\n⚠️ ' + errors.length + ':\n• ' + errors.join('\n• ')
    alert(msg)
  }
  async function delRow(id) { if (!confirm('Dokument wirklich löschen?')) return; await supabase.from('eingangsrechnungen').delete().eq('id', id); await load() }

  if (loading) return <RechnungShell active="buchhaltung"><div style={{ padding: 60, textAlign: 'center', color: MUT }}>Lädt…</div></RechnungShell>

  const s = buildSnapshot(rows)
  const months = s.months || 0
  const gewinnYTD = s.ergebnisKum
  const annual = (gewinnYTD != null && months > 0) ? gewinnYTD / months * 12 : null
  const estJahr = (annual != null && annual > 0) ? estG(annual) : (annual != null ? 0 : null)
  const ruecklageBisHeute = (estJahr != null && months > 0) ? estJahr * months / 12 : null
  const effRate = (estJahr && annual) ? estJahr / annual * 100 : 0
  const plus = (gewinnYTD || 0) >= 0
  const periodLbl = months ? 'Jan–' + (['', 'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][months]) + ' ' + s.curYear : String(s.curYear)

  return (
    <RechnungShell active="buchhaltung">
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: DARK }}>Buchhaltung</div>
            <div style={{ fontSize: 13, color: MUT, marginTop: 2 }}>Auswertung · {periodLbl} · Unterlagen vom Steuerberater (zählen <b>nicht</b> zu den Ausgaben)</div>
          </div>
          <button onClick={() => fileRef.current && fileRef.current.click()} style={{ background: DARK, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-upload" style={{ fontSize: 16 }} />BWA / SuSa hochladen</button>
          <input ref={fileRef} type="file" accept=".pdf,image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        </div>

        {!rows.length && (
          <div onClick={() => fileRef.current && fileRef.current.click()} onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
            style={{ border: '2px dashed ' + (drag ? ACC : LINE), borderRadius: 12, padding: '40px 16px', textAlign: 'center', cursor: 'pointer', background: drag ? '#f6f3ec' : '#fff' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}><i className="ti ti-upload" style={{ fontSize: 17, marginRight: 6 }} />BWA / SuSa / USt-VA hochladen</div>
            <div style={{ fontSize: 12, color: MUT, marginTop: 6 }}>Lade die monatlichen Unterlagen vom Steuerberater hoch. Die KI erkennt Belegart, Zeitraum & Kennzahlen automatisch.</div>
          </div>
        )}

        {s.hasBwa && (
          <>
            <div style={{ background: plus ? GREENBG : REDBG, borderRadius: 14, padding: '20px 24px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: plus ? GREENTX : RED }}>Ergebnis kumuliert · {periodLbl}</div>
                <div style={{ fontSize: 34, fontWeight: 800, color: plus ? GREENTX : RED, lineHeight: 1.15 }}>{signEur0(gewinnYTD)}</div>
                <div style={{ fontSize: 13, color: plus ? GREENTX : RED }}><i className={plus ? 'ti ti-trending-up' : 'ti ti-trending-down'} style={{ marginRight: 4 }} />{plus ? 'Du bist im Plus' : 'Du bist im Minus'}</div>
              </div>
              {s.ergebnisKumPrev != null && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: MUT }}>gegenüber Vorjahr</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: (gewinnYTD - s.ergebnisKumPrev) >= 0 ? GREENTX : RED }}>{signEur0(gewinnYTD - s.ergebnisKumPrev)}</div>
                  <div style={{ fontSize: 12, color: MUT }}>{s.prevYear}: {signEur0(s.ergebnisKumPrev)}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
              {s.einnahmenKum != null && <Metric label="Einnahmen (kum.)" value={eur0(s.einnahmenKum)} />}
              {s.ausgabenKum != null && <Metric label="Ausgaben (kum.)" value={eur0(s.ausgabenKum)} />}
              {s.bank != null && <Metric label="Bank-Saldo" value={eur0(s.bank)} color={s.bank < 5000 ? AMBER : DARK} hint={s.bank < 5000 ? 'niedrig' : null} />}
              {s.forderungen != null && <Metric label="Offene Forderungen" value={eur0(s.forderungen)} hint="dir geschuldet" />}
              {s.verbind != null && <Metric label="Verbindlichkeiten" value={eur0(s.verbind)} hint="du schuldest" />}
              {s.personalKum != null && <Metric label="Personalkosten (kum.)" value={eur0(s.personalKum)} />}
              {s.ustSchuld != null && <Metric label="USt-Schuld" value={eur0(s.ustSchuld)} />}
              {s.ergebnisMonat != null && <Metric label="Ergebnis (letzter Monat)" value={signEur0(s.ergebnisMonat)} color={s.ergebnisMonat < 0 ? RED : GREEN} />}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, marginBottom: 16 }}>
              {(s.erloeseKumPrev != null || s.ergebnisKumPrev != null) && (
                <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 10 }}>Vergleich {s.prevYear} vs {s.curYear}</div>
                  {s.erloeseKum != null && s.erloeseKumPrev != null && <YoyBars label="Erlöse" a={s.erloeseKumPrev} b={s.erloeseKum} yearA={s.prevYear} yearB={s.curYear} />}
                  {s.ergebnisKum != null && s.ergebnisKumPrev != null && <YoyBars label="Ergebnis" a={s.ergebnisKumPrev} b={s.ergebnisKum} yearA={s.prevYear} yearB={s.curYear} />}
                </div>
              )}

              <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <i className="ti ti-calculator" style={{ fontSize: 17, color: BLUE }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>Steuer-Rücklage <span style={{ fontWeight: 400, color: MUT }}>(Schätzung)</span></div>
                </div>
                {gewinnYTD == null || gewinnYTD <= 0 ? (
                  <div style={{ fontSize: 13, color: MUT }}>Bisher kein zu versteuernder Gewinn — keine Einkommensteuer-Rücklage nötig.</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: DARK }}><span style={{ color: MUT }}>Hochgerechneter Jahresgewinn</span><b>{eur0(annual)}</b></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: DARK }}><span style={{ color: MUT }}>Geschätzte Einkommensteuer (Jahr)</span><b>{eur0(estJahr)}</b></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: DARK }}><span style={{ color: MUT }}>effektiver Steuersatz</span><b>{Math.round(effRate)} %</b></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, padding: '8px 0 4px', marginTop: 4, borderTop: '1px solid ' + LINE, color: BLUETX }}><span style={{ fontWeight: 700 }}>Rücklage bis {periodLbl.split('–')[1] || periodLbl}</span><b style={{ fontWeight: 800 }}>{eur0(ruecklageBisHeute)}</b></div>
                    <div style={{ fontSize: 11, color: MUT, marginTop: 8, lineHeight: 1.5 }}>Grobe Schätzung der Einkommensteuer (e.K., §32a EStG 2026) auf den Gewinn — ohne Splitting, Sonderausgaben (KV/PV, Vorsorge), weitere Einkünfte, bereits geleistete Vorauszahlungen und ohne Gewerbesteuer (wird größtenteils auf die ESt angerechnet). Kein Steuerbescheid — die genaue Berechnung macht dein Steuerberater.</div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 8, marginTop: 4 }}>Hochgeladene Unterlagen <span style={{ color: '#b8b2a6', fontWeight: 400 }}>{rows.length}</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(r => {
            const ki = kiOf(r); const art = ART[ki.belegart] || { label: ki.belegart || 'Dokument', c: '#5f5e5a', bg: '#f1efe8' }
            const kenn = ki.kennzahlen || {}; const hasKenn = Object.keys(kenn).length > 0; const isOpen = !!open[r.id]
            return (
              <div key={r.id} style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: hasKenn ? 'pointer' : 'default' }} onClick={() => hasKenn && setOpen(o => ({ ...o, [r.id]: !o[r.id] }))}>
                  <span style={{ background: art.bg, color: art.c, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{art.label}</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: DARK, minWidth: 110 }}>{ki.zeitraum || (r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '—')}</div>
                  <div style={{ fontSize: 12, color: MUT, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ki.zusammenfassung || r.datei_name || ''}</div>
                  {r.datei_url && <a href={r.datei_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: ACC, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }} title="Original öffnen"><i className="ti ti-external-link" style={{ fontSize: 15 }} /></a>}
                  <button onClick={e => { e.stopPropagation(); delRow(r.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b3402f', fontSize: 14 }} title="Löschen">🗑</button>
                  {hasKenn && <i className={isOpen ? 'ti ti-chevron-up' : 'ti ti-chevron-down'} style={{ color: '#b8b2a6' }} />}
                </div>
                {isOpen && hasKenn && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, marginTop: 12, paddingTop: 12, borderTop: '1px solid ' + LINE }}>
                    {Object.entries(kenn).map(([k, v]) => { const fv = fmtKenn(k, v); if (fv == null) return null; const neg = !isNaN(Number(v)) && Number(v) < 0; return (
                      <div key={k}><div style={{ fontSize: 11, color: MUT }}>{labelKenn(k)}</div><div style={{ fontSize: 16, fontWeight: 700, color: neg ? RED : DARK }}>{fv}</div></div>
                    ) })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {bulk && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 250 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 320, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>KI liest Dokumente…</div>
            <div style={{ fontSize: 12, color: MUT, marginBottom: 12 }}>{bulk.done} / {bulk.total} · {bulk.current}</div>
            <div style={{ height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: (bulk.total ? Math.round(bulk.done / bulk.total * 100) : 0) + '%', background: ACC }} /></div>
          </div>
        </div>
      )}
    </RechnungShell>
  )
}
