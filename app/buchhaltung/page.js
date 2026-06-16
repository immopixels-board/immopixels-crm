'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import RechnungShell from '../../components/RechnungShell'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const ACC = '#6b6b6e', DARK = '#2a2a28', MUT = '#8a8278', LINE = '#ece4d6'
const eur = n => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

const ART = { 'BWA': { label: 'BWA', c: '#185fa5', bg: '#e6f1fb' }, 'SuSa': { label: 'Summen & Salden', c: '#5f5e5a', bg: '#f1efe8' }, 'USt-VA': { label: 'USt-Voranmeldung', c: '#0f6e56', bg: '#e1f5ee' }, 'Lohn': { label: 'Lohn', c: '#854f0b', bg: '#faeeda' } }
const KENN = {
  ust_vorauszahlung: { label: 'USt-Vorauszahlung', eur: true },
  faelligkeit: { label: 'Fälligkeit', date: true },
  ergebnis_monat: { label: 'Ergebnis Monat', eur: true },
  ergebnis_kumuliert: { label: 'Ergebnis kumuliert', eur: true },
  erloese_monat: { label: 'Erlöse Monat', eur: true },
}
function kiOf(r) { const x = r && r.ki_raw; if (!x) return {}; if (typeof x === 'string') { try { return JSON.parse(x) } catch { return {} } } return x }
function fmtKenn(k, v) { const def = KENN[k]; if (v == null || v === '') return null; if (def && def.eur && !isNaN(Number(v))) return eur(v); if (def && def.date) { const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString('de-DE') } return String(v) }
function labelKenn(k) { return (KENN[k] && KENN[k].label) || k.replace(/_/g, ' ') }

export default function BuchhaltungPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [drag, setDrag] = useState(false)
  const [bulk, setBulk] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => { init() }, [])
  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    await load(); setLoading(false)
  }
  async function load() {
    const { data } = await supabase.from('eingangsrechnungen').select('*').eq('typ', 'buchhaltung').order('datum', { ascending: false })
    setRows(data || [])
  }

  function fileToBase64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file) }) }
  async function uploadFile(f) { try { const b64 = await fileToBase64(f); const r = await fetch('/api/beleg-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: b64, mediaType: f.type || 'application/pdf', name: f.name, folder: 'buchhaltung' }) }); const j = await r.json(); return (j && j.ok) ? j.url : null } catch { return null } }

  async function handleFiles(files) {
    const arr = Array.from(files || [])
    if (!arr.length) return
    setBulk({ done: 0, total: arr.length, current: '' })
    const existing = new Set(rows.map(r => { const k = kiOf(r); return (k.belegart || r.lieferant || '') + '|' + (k.zeitraum || r.datum || '') }))
    let ok = 0; const errors = []
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i]
      setBulk({ done: i, total: arr.length, current: f.name })
      try {
        if (f.size > 28 * 1024 * 1024) { errors.push(f.name + ' — zu groß'); continue }
        const b64 = await fileToBase64(f)
        const r = await fetch('/api/eingangsrechnung-ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: b64, mediaType: f.type || 'application/pdf' }) })
        const j = await r.json()
        const d = (j && j.ok && j.data) ? j.data : {}
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

  return (
    <RechnungShell active="buchhaltung">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: DARK }}>Buchhaltung — Auswertungen</div>
        <div style={{ fontSize: 13, color: MUT, marginTop: 2, marginBottom: 16 }}>Unterlagen vom Steuerberater (BWA, SuSa, USt-VA) · zählen <b>nicht</b> zu den Ausgaben</div>

        <div onClick={() => fileRef.current && fileRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
          style={{ border: '2px dashed ' + (drag ? ACC : LINE), borderRadius: 12, padding: '22px 16px', textAlign: 'center', cursor: 'pointer', background: drag ? '#f6f3ec' : '#fff', marginBottom: 18 }}>
          <input ref={fileRef} type="file" accept=".pdf,image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
          <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}><i className="ti ti-upload" style={{ fontSize: 17, marginRight: 6 }} />BWA / SuSa / USt-VA hochladen</div>
          <div style={{ fontSize: 11, color: MUT, marginTop: 4 }}>✨ Die KI erkennt Belegart, Zeitraum & Kennzahlen automatisch. Mehrere Dateien möglich.</div>
        </div>

        {!rows.length && <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: 24, textAlign: 'center', color: MUT, fontSize: 13 }}>Noch keine Dokumente. Lade die monatlichen Unterlagen vom Steuerberater hoch.</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(r => { const ki = kiOf(r); const art = ART[ki.belegart] || { label: ki.belegart || 'Dokument', c: '#5f5e5a', bg: '#f1efe8' }; const kenn = ki.kennzahlen || {}; const hasKenn = Object.keys(kenn).length > 0; return (
            <div key={r.id} style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: hasKenn ? 10 : 0 }}>
                <span style={{ background: art.bg, color: art.c, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{art.label}</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{ki.zeitraum || (r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '—')}</div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {r.datei_url && <a href={r.datei_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: ACC, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }} title="Original öffnen"><i className="ti ti-external-link" style={{ fontSize: 15 }} />Original</a>}
                  <button onClick={() => delRow(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b3402f', fontSize: 14 }} title="Löschen">🗑</button>
                </div>
              </div>
              {ki.zusammenfassung && <div style={{ fontSize: 12, color: MUT, marginBottom: hasKenn ? 10 : 0 }}>{ki.zusammenfassung}</div>}
              {hasKenn && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22 }}>
                  {Object.entries(kenn).map(([k, v]) => { const fv = fmtKenn(k, v); if (fv == null) return null; const neg = !isNaN(Number(v)) && Number(v) < 0; return (
                    <div key={k}><div style={{ fontSize: 11, color: MUT }}>{labelKenn(k)}</div><div style={{ fontSize: 16, fontWeight: 700, color: neg ? '#a32d2d' : DARK }}>{fv}</div></div>
                  ) })}
                </div>
              )}
              {r.datei_name && <div style={{ fontSize: 11, color: '#b8b2a6', marginTop: 8 }}>{r.datei_name}</div>}
            </div>
          ) })}
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
