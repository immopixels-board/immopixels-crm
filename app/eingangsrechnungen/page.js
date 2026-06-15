'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import RechnungShell from '../../components/RechnungShell'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const ACC = '#6b6b6e', DARK = '#2a2a28', MUT = '#8a8278', LINE = '#ece4d6', GREEN = '#2f7a4f', AMBER = '#a36a1f'
const eur = n => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const KATEGORIEN = ['Ausrüstung', 'Software', 'Fahrtkosten', 'Material / Druck', 'Büro', 'Marketing', 'Versicherung', 'Reisekosten', 'Sonstiges']
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const STATUS = { zu_pruefen: { label: 'Zu prüfen', c: AMBER, bg: '#fdf3e2' }, bestaetigt: { label: 'Bestätigt', c: GREEN, bg: '#eaf3de' }, exportiert: { label: 'Exportiert', c: '#185fa5', bg: '#e6f1fb' } }

export default function EingangsrechnungenPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [ym, setYm] = useState(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') })
  const [katFilter, setKatFilter] = useState('all')
  const [drag, setDrag] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { init() }, [])
  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    await load(); setLoading(false)
  }
  async function load() {
    const { data } = await supabase.from('eingangsrechnungen').select('*').order('datum', { ascending: false })
    setRows(data || [])
  }

  const [y, m] = ym.split('-').map(Number)
  const monthRows = useMemo(() => rows.filter(r => { if (!r.datum) return false; const d = new Date(r.datum); return d.getFullYear() === y && d.getMonth() + 1 === m }), [rows, y, m])
  const filtered = useMemo(() => katFilter === 'all' ? monthRows : monthRows.filter(r => r.kategorie === katFilter), [monthRows, katFilter])
  const sum = useMemo(() => ({
    brutto: monthRows.reduce((s, r) => s + (Number(r.brutto) || 0), 0),
    ust: monthRows.reduce((s, r) => s + (Number(r.ust) || 0), 0),
    pruefen: monthRows.filter(r => r.status === 'zu_pruefen').length,
    exportiert: monthRows.filter(r => r.status === 'exportiert').length
  }), [monthRows])

  function newBlank() {
    setEditRow({ lieferant: '', rechnungsnr: '', datum: new Date().toISOString().slice(0, 10), netto: '', ust: '', brutto: '', ust_satz: 19, kategorie: 'Sonstiges', status: 'zu_pruefen', notiz: '', _new: true })
  }
  async function saveRow() {
    if (!editRow) return
    setBusy(true)
    try {
      const payload = { lieferant: editRow.lieferant || null, rechnungsnr: editRow.rechnungsnr || null, datum: editRow.datum || null, netto: Number(editRow.netto) || 0, ust: Number(editRow.ust) || 0, brutto: Number(editRow.brutto) || 0, ust_satz: Number(editRow.ust_satz) || 19, kategorie: editRow.kategorie || 'Sonstiges', status: editRow.status || 'zu_pruefen', notiz: editRow.notiz || null, updated_at: new Date().toISOString() }
      if (editRow._new) { const { error } = await supabase.from('eingangsrechnungen').insert(payload); if (error) throw error }
      else { const { error } = await supabase.from('eingangsrechnungen').update(payload).eq('id', editRow.id); if (error) throw error }
      setEditRow(null); await load()
    } catch (e) { alert('Fehler: ' + (e.message || e)) }
    setBusy(false)
  }
  async function delRow(id) {
    if (!confirm('Beleg wirklich löschen?')) return
    await supabase.from('eingangsrechnungen').delete().eq('id', id); await load()
  }
  // auto-bruttó számítás nettó+ÁFA-kulcsból
  function recalc(f) {
    const n = Number(f.netto) || 0, s = Number(f.ust_satz) || 0
    if (n > 0) { const ust = Math.round(n * s) / 100; return { ...f, ust: ust.toFixed(2), brutto: (n + ust).toFixed(2) } }
    return f
  }

  const [aiBusy, setAiBusy] = useState(false)
  function fileToBase64(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file) })
  }
  const [bulk, setBulk] = useState(null) // {done, total, current}
  async function extractOne(f) {
    // méret-ellenőrzés: a base64 ~33%-kal nő, az API limitje miatt nagy fájl elbukhat
    if (f.size > 28 * 1024 * 1024) return { _err: 'Datei zu groß (' + Math.round(f.size / 1024 / 1024) + ' MB, max ~28 MB)' }
    const b64 = await fileToBase64(f)
    const r = await fetch('/api/eingangsrechnung-ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: b64, mediaType: f.type || 'application/pdf' }) })
    let j
    try { j = await r.json() } catch { return { _err: 'Server-Antwort ungültig (Status ' + r.status + ')' } }
    if (j.ok && j.data) return j.data
    return { _err: j.error || ('konnte nicht gelesen werden (Status ' + r.status + ')') }
  }
  // duplikátum-kulcs: szállító + számlaszám, vagy szállító + dátum + bruttó
  function dupKeyOf(o) {
    const lf = String(o.lieferant || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const nr = String(o.rechnungsnr || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const dt = o.datum || ''
    const br = Number(o.brutto || 0).toFixed(2)
    return nr ? lf + '|nr:' + nr : lf + '|dt:' + dt + '|br:' + br
  }
  function isDuplicate(o, existingKeys) {
    const k = dupKeyOf(o)
    return (k && existingKeys.has(k)) ? k : null
  }
  async function handleFiles(files) {
    if (!files || !files.length) return
    const arr = Array.from(files)
    // EGY fájl → megnyitja a szerkesztőt jóváhagyásra (mint eddig)
    if (arr.length === 1) { return handleSingle(arr[0]) }
    // TÖBB fájl → tömeges: mindegyiket kiolvassa az AI és menti "zu_pruefen"-ként
    setBulk({ done: 0, total: arr.length, current: '' })
    // meglévő duplikátum-kulcsok (a már mentett számlákból)
    const existingKeys = new Set((rows || []).map(dupKeyOf).filter(Boolean))
    let ok = 0
    const errors = [], dups = []
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i]
      setBulk({ done: i, total: arr.length, current: f.name })
      try {
        const d = await extractOne(f)
        if (!d || d._err) { errors.push(f.name + ' — ' + (d?._err || 'KI konnte nichts lesen')); continue }
        const payload = {
          lieferant: d.lieferant || null, rechnungsnr: d.rechnungsnr || null, datum: d.datum || new Date().toISOString().slice(0, 10),
          netto: Number(d.netto) || 0, ust: Number(d.ust) || 0, brutto: Number(d.brutto) || 0, ust_satz: Number(d.ust_satz) || 19,
          kategorie: KATEGORIEN.includes(d.kategorie) ? d.kategorie : 'Sonstiges', status: 'zu_pruefen', datei_name: f.name, ki_raw: d
        }
        // duplikátum-ellenőrzés (a már létezők ÉS a most feltöltöttek ellen)
        const dk = isDuplicate(payload, existingKeys)
        if (dk) { dups.push(f.name + ' (' + (payload.lieferant || '?') + ', ' + (payload.rechnungsnr || payload.brutto + ' €') + ')'); continue }
        const { error } = await supabase.from('eingangsrechnungen').insert(payload)
        if (error) { errors.push(f.name + ' — DB: ' + error.message); continue }
        existingKeys.add(dupKeyOf(payload)) // hogy a kötegen belüli duplikátum is kiszűrődjön
        ok++
      } catch (e) { errors.push(f.name + ' — ' + (e.message || 'Fehler')) }
    }
    setBulk(null)
    await load()
    let msg = '✓ ' + ok + ' Beleg(e) gespeichert (alle „Zu prüfen").'
    if (dups.length) msg += '\n\n⊘ ' + dups.length + ' Duplikat(e) übersprungen (nicht doppelt gezählt):\n• ' + dups.join('\n• ')
    if (errors.length) msg += '\n\n⚠️ ' + errors.length + ' fehlgeschlagen:\n• ' + errors.join('\n• ')
    alert(msg)
  }
  async function handleSingle(f) {
    const base = { lieferant: '', rechnungsnr: '', datum: new Date().toISOString().slice(0, 10), netto: '', ust: '', brutto: '', ust_satz: 19, kategorie: 'Sonstiges', status: 'zu_pruefen', notiz: '', datei_name: f.name, _new: true, _file: f }
    setEditRow(base)
    setAiBusy(true)
    try {
      const b64 = await fileToBase64(f)
      const r = await fetch('/api/eingangsrechnung-ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: b64, mediaType: f.type || 'application/pdf' }) })
      const j = await r.json()
      if (j.ok && j.data) {
        const d = j.data
        const cand = { lieferant: d.lieferant, rechnungsnr: d.rechnungsnr, datum: d.datum, brutto: d.brutto }
        const existingKeys = new Set((rows || []).map(dupKeyOf).filter(Boolean))
        const dk = isDuplicate(cand, existingKeys)
        setEditRow(cur => ({ ...cur, lieferant: d.lieferant || cur.lieferant, rechnungsnr: d.rechnungsnr || '', datum: d.datum || cur.datum, netto: d.netto != null ? String(d.netto) : '', ust: d.ust != null ? String(d.ust) : '', brutto: d.brutto != null ? String(d.brutto) : '', ust_satz: d.ust_satz || 19, kategorie: KATEGORIEN.includes(d.kategorie) ? d.kategorie : 'Sonstiges', _konfidenz: d.konfidenz || null, _dup: !!dk }))
      } else {
        setEditRow(cur => ({ ...cur, _aiError: j.error || 'Konnte nicht gelesen werden' }))
      }
    } catch (e) {
      setEditRow(cur => ({ ...cur, _aiError: e.message || 'Fehler' }))
    }
    setAiBusy(false)
  }

  if (loading) return <RechnungShell active="eingang"><div style={{ padding: 60, textAlign: 'center', color: MUT }}>Lädt…</div></RechnungShell>

  const inp = { width: '100%', padding: '8px 10px', border: '1px solid ' + LINE, borderRadius: 7, fontSize: 14, boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: MUT, marginBottom: 3, display: 'block', fontWeight: 600 }

  return (
    <RechnungShell active="eingang">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: DARK }}>Eingangsrechnungen</div>
            <div style={{ fontSize: 13, color: MUT, marginTop: 2 }}>{MONATE[m - 1]} {y} · {monthRows.length} Belege · {eur(sum.brutto)} Ausgaben</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="month" value={ym} onChange={e => setYm(e.target.value)} style={{ padding: '8px 10px', border: '1px solid ' + LINE, borderRadius: 8, fontSize: 13 }} />
            <button onClick={newBlank} style={{ background: ACC, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ Beleg erfassen</button>
          </div>
        </div>

        {/* drag & drop */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileRef.current?.click()}
          style={{ border: '2px dashed ' + (drag ? ACC : LINE), borderRadius: 12, padding: 22, textAlign: 'center', marginBottom: 18, background: drag ? '#f0ede7' : '#faf8f4', cursor: 'pointer', transition: 'all .15s' }}>
          <input ref={fileRef} type="file" accept=".pdf,image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
          <div style={{ fontSize: 14, color: MUT }}>☁️ PDF/Foto hierher ziehen oder klicken · auch mehrere auf einmal · vom Handy</div>
          <div style={{ fontSize: 11, color: MUT, marginTop: 4 }}>✨ Die KI liest Lieferant, Datum, Beträge & Kategorie automatisch aus — du prüfst nur noch. Mehrere Dateien = Massen-Upload.</div>
        </div>

        {/* összesítő */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
          <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: MUT }}>Ausgaben (Brutto)</div><div style={{ fontSize: 18, fontWeight: 800 }}>{eur(sum.brutto)}</div></div>
          <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: MUT }}>Vorsteuer (USt)</div><div style={{ fontSize: 18, fontWeight: 800 }}>{eur(sum.ust)}</div></div>
          <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: AMBER }}>Zu prüfen</div><div style={{ fontSize: 18, fontWeight: 800, color: AMBER }}>{sum.pruefen}</div></div>
          <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: GREEN }}>Exportiert</div><div style={{ fontSize: 18, fontWeight: 800, color: GREEN }}>{sum.exportiert}</div></div>
        </div>

        {/* kategória-szűrő */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <button onClick={() => setKatFilter('all')} style={pill(katFilter === 'all')}>Alle</button>
          {KATEGORIEN.map(k => <button key={k} onClick={() => setKatFilter(k)} style={pill(katFilter === k)}>{k}</button>)}
        </div>

        {/* lista */}
        <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 100px 100px 90px 1fr 120px 80px', gap: 8, padding: '11px 14px', background: '#faf8f4', fontSize: 11, fontWeight: 700, color: MUT, textTransform: 'uppercase' }}>
            <div>Lieferant</div><div>Datum</div><div style={{ textAlign: 'right' }}>Brutto</div><div style={{ textAlign: 'right' }}>USt</div><div>Kategorie</div><div>Status</div><div></div>
          </div>
          {filtered.length === 0 && <div style={{ padding: 36, textAlign: 'center', color: MUT, fontSize: 14 }}>Keine Belege in diesem Monat.</div>}
          {filtered.map(r => { const st = STATUS[r.status] || STATUS.zu_pruefen; return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 100px 100px 90px 1fr 120px 80px', gap: 8, padding: '11px 14px', borderTop: '1px solid ' + LINE, fontSize: 13, alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>{r.lieferant || '—'}{r.datei_url && <a href={r.datei_url} target="_blank" rel="noreferrer" style={{ marginLeft: 6, color: ACC, textDecoration: 'none' }} title="Original öffnen">↗</a>}</div>
              <div style={{ color: MUT }}>{r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '—'}</div>
              <div style={{ textAlign: 'right', fontWeight: 600 }}>{eur(r.brutto)}</div>
              <div style={{ textAlign: 'right', color: MUT }}>{eur(r.ust)}</div>
              <div><span style={{ background: '#f3f0ea', fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>{r.kategorie}</span></div>
              <div><span style={{ background: st.bg, color: st.c, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{st.label}</span></div>
              <div style={{ textAlign: 'right' }}>
                <button onClick={() => setEditRow({ ...r })} style={miniBtn} title="Bearbeiten">✎</button>
                <button onClick={() => delRow(r.id)} style={{ ...miniBtn, color: '#b3402f' }} title="Löschen">🗑</button>
              </div>
            </div>
          ) })}
        </div>
        <div style={{ fontSize: 12, color: MUT, marginTop: 10 }}>Das Original liegt später in Google Drive · „↗" öffnet den Beleg · DATEV-Export folgt.</div>
      </div>

      {bulk && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 250 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 360, maxWidth: '90vw', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>✨ KI verarbeitet Belege…</div>
            <div style={{ fontSize: 13, color: MUT, marginBottom: 14 }}>{bulk.done} / {bulk.total} · {bulk.current}</div>
            <div style={{ height: 8, background: '#eee', borderRadius: 5, overflow: 'hidden' }}><div style={{ height: '100%', width: (bulk.total ? Math.round(bulk.done / bulk.total * 100) : 0) + '%', background: ACC, transition: 'width .2s' }} /></div>
            <div style={{ fontSize: 11, color: MUT, marginTop: 12 }}>Bitte warten — nicht schließen.</div>
          </div>
        </div>
      )}

      {/* szerkesztő modal */}
      {editRow && (
        <div onClick={() => !busy && setEditRow(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 22, width: 560, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>{editRow._new ? 'Neuer Beleg' : 'Beleg bearbeiten'}{editRow.datei_name ? ' · ' + editRow.datei_name : ''}</div>
            {aiBusy && <div style={{ background: '#fdf3e2', border: '1px solid #e8cf9a', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13, color: AMBER, fontWeight: 600 }}>✨ KI liest den Beleg… einen Moment</div>}
            {!aiBusy && editRow._konfidenz && <div style={{ background: editRow._konfidenz === 'hoch' ? '#eaf3de' : '#fdf3e2', border: '1px solid ' + (editRow._konfidenz === 'hoch' ? '#bcd89a' : '#e8cf9a'), borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12, color: editRow._konfidenz === 'hoch' ? GREEN : AMBER }}>✨ KI-Erkennung: Konfidenz <b>{editRow._konfidenz}</b> — bitte Werte prüfen und ggf. korrigieren.</div>}
            {!aiBusy && editRow._dup && <div style={{ background: '#fbeeea', border: '1px solid #e6c4ba', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12, color: '#b3402f', fontWeight: 600 }}>⊘ Möglicher Doppel-Beleg! Lieferant + Rechnungsnr./Betrag stimmen mit einem bereits erfassten Beleg überein. Prüfe, ob du ihn wirklich nochmal speichern willst.</div>}
            {!aiBusy && editRow._aiError && <div style={{ background: '#fbeeea', border: '1px solid #e6c4ba', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12, color: '#b3402f' }}>⚠️ KI konnte den Beleg nicht automatisch lesen ({editRow._aiError}). Bitte manuell eintragen.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Lieferant</label><input value={editRow.lieferant} onChange={e => setEditRow({ ...editRow, lieferant: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Rechnungsnr.</label><input value={editRow.rechnungsnr} onChange={e => setEditRow({ ...editRow, rechnungsnr: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Datum</label><input type="date" value={editRow.datum} onChange={e => setEditRow({ ...editRow, datum: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Netto €</label><input value={editRow.netto} onChange={e => setEditRow(recalc({ ...editRow, netto: e.target.value }))} style={inp} /></div>
              <div><label style={lbl}>USt-Satz %</label><input value={editRow.ust_satz} onChange={e => setEditRow(recalc({ ...editRow, ust_satz: e.target.value }))} style={inp} /></div>
              <div><label style={lbl}>USt €</label><input value={editRow.ust} onChange={e => setEditRow({ ...editRow, ust: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Brutto €</label><input value={editRow.brutto} onChange={e => setEditRow({ ...editRow, brutto: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Kategorie</label><select value={editRow.kategorie} onChange={e => setEditRow({ ...editRow, kategorie: e.target.value })} style={inp}>{KATEGORIEN.map(k => <option key={k}>{k}</option>)}</select></div>
              <div><label style={lbl}>Status</label><select value={editRow.status} onChange={e => setEditRow({ ...editRow, status: e.target.value })} style={inp}><option value="zu_pruefen">Zu prüfen</option><option value="bestaetigt">Bestätigt</option><option value="exportiert">Exportiert</option></select></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Notiz</label><input value={editRow.notiz} onChange={e => setEditRow({ ...editRow, notiz: e.target.value })} style={inp} /></div>
            </div>
            {editRow._file && <div style={{ fontSize: 11, color: AMBER, marginTop: 8 }}>⚠️ Datei „{editRow.datei_name}" wird vorerst nicht hochgeladen (Google-Drive-Anbindung folgt im nächsten Schritt).</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setEditRow(null)} disabled={busy} style={{ border: '1px solid ' + LINE, borderRadius: 8, padding: '8px 14px', background: '#fff', cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={saveRow} disabled={busy} style={{ border: 'none', borderRadius: 8, padding: '8px 16px', background: ACC, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>{busy ? '…' : 'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </RechnungShell>
  )
}

const miniBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }
const pill = active => ({ borderRadius: 20, padding: '5px 12px', fontSize: 12, cursor: 'pointer', border: '1px solid ' + (active ? ACC : LINE), background: active ? ACC : '#fff', color: active ? '#fff' : DARK, fontWeight: active ? 600 : 400 })
