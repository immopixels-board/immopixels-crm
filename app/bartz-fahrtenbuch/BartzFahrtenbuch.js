'use client'
import React, { useEffect, useMemo, useState } from 'react'

const GOLD = '#6b6b6e', DARK = '#2a2a28', MUT = '#8a8278', CREAM = '#faf7f1', LINE = '#ece4d6'
const STORE_KEY = 'bartz-fahrtenbuch-v1'
const BUERO = 'Maximilianstraße 37, 67433 Neustadt an der Weinstraße'
const RATE = 0.30
const uid = () => Math.random().toString(36).slice(2, 10)
const pad = n => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
const todayStr = () => { const n = new Date(); return ymd(n.getFullYear(), n.getMonth() + 1, n.getDate()) }
const shortAddr = a => String(a || '').replace(/,?\s*Deutschland$/i, '').replace(/,?\s*\b\d{5}\b/, m => m).trim()

function load() {
  if (typeof window === 'undefined') return { profiles: [], rows: {} }
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '') || { profiles: [], rows: {} } }
  catch { return { profiles: [], rows: {} } }
}

export default function BartzFahrtenbuch() {
  const [store, setStore] = useState({ profiles: [], rows: {} })
  const [selId, setSelId] = useState(null)
  const [month, setMonth] = useState(() => { const n = new Date(); return ymd(n.getFullYear(), n.getMonth() + 1, 1).slice(0, 7) })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [profModal, setProfModal] = useState(null) // {id?, name, home}
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const s = load(); setStore(s)
    setSelId(s.profiles[0]?.id || null)
    setLoaded(true)
  }, [])

  function persist(next) { setStore(next); try { localStorage.setItem(STORE_KEY, JSON.stringify(next)) } catch {} }

  const profiles = store.profiles
  const profile = profiles.find(p => p.id === selId) || null
  const allRows = (selId && store.rows[selId]) || []
  const rows = useMemo(() => allRows.filter(r => (r.date || '').slice(0, 7) === month)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.timeFrom || '').localeCompare(b.timeFrom || '')), [allRows, month])

  const monthLabel = (() => { const [y, m] = month.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) })()
  const shiftMonth = delta => { let [y, m] = month.split('-').map(Number); m += delta; if (m < 1) { m = 12; y-- } if (m > 12) { m = 1; y++ } setMonth(ymd(y, m, 1).slice(0, 7)) }

  const totalKm = rows.reduce((s, r) => s + (parseFloat(r.km) || 0), 0)
  const totalKosten = totalKm * RATE

  // ── profil műveletek ──
  function saveProfile() {
    const f = profModal; if (!f.name.trim()) return
    let next
    if (f.id) {
      next = { ...store, profiles: profiles.map(p => p.id === f.id ? { ...p, name: f.name.trim(), home: f.home.trim() } : p) }
    } else {
      const np = { id: uid(), name: f.name.trim(), home: f.home.trim() }
      next = { ...store, profiles: [...profiles, np], rows: { ...store.rows, [np.id]: [] } }
      setSelId(np.id)
    }
    persist(next); setProfModal(null)
  }
  function deleteProfile(id) {
    if (!confirm('Profil und alle Fahrten löschen?')) return
    const nrows = { ...store.rows }; delete nrows[id]
    const nprofiles = profiles.filter(p => p.id !== id)
    persist({ ...store, profiles: nprofiles, rows: nrows })
    if (selId === id) setSelId(nprofiles[0]?.id || null)
  }

  // ── sor műveletek ──
  function setRows(updater) {
    const cur = (store.rows[selId]) || []
    const next = typeof updater === 'function' ? updater(cur) : updater
    persist({ ...store, rows: { ...store.rows, [selId]: next } })
  }
  function addRow() {
    if (!selId) return
    const d = month === todayStr().slice(0, 7) ? todayStr() : month + '-01'
    setRows(cur => [...cur, { id: uid(), date: d, von: '', bis: '', zweck: '', timeFrom: '', timeTo: '', km: '' }])
  }
  function updRow(id, patch) { setRows(cur => cur.map(r => r.id === id ? { ...r, ...patch } : r)) }
  function delRow(id) { setRows(cur => cur.filter(r => r.id !== id)) }

  async function calcKm(r) {
    if (!r.von || !r.bis) return
    setBusy(true)
    try {
      const res = await fetch('/api/fahrtenbuch/distance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stops: [r.von, r.bis] }) })
      const d = await res.json()
      if (d?.ok && d.legs?.[0]?.distance) updRow(r.id, { km: (d.legs[0].distance / 1000).toFixed(1) })
      else alert('km konnte nicht berechnet werden' + (d?.reason ? ' (' + d.reason + ')' : ''))
    } catch { alert('km-Berechnung fehlgeschlagen') }
    setBusy(false)
  }
  async function calcAllKm() {
    setBusy(true)
    for (const r of rows) {
      if (r.von && r.bis && !r.km) {
        try {
          const res = await fetch('/api/fahrtenbuch/distance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stops: [r.von, r.bis] }) })
          const d = await res.json()
          if (d?.ok && d.legs?.[0]?.distance) updRow(r.id, { km: (d.legs[0].distance / 1000).toFixed(1) })
        } catch {}
      }
    }
    setBusy(false)
  }

  // ── export (mint nálunk) ──
  const expName = () => `Fahrtenbuch - ${profile?.name || 'Profil'} - ${monthLabel}`
  const expData = () => rows.map(r => [r.date, r.timeFrom + (r.timeTo ? '–' + r.timeTo : ''), shortAddr(r.von), shortAddr(r.bis), r.zweck || '', (parseFloat(r.km) || 0).toFixed(1), ((parseFloat(r.km) || 0) * RATE).toFixed(2)])
  const HEAD = ['Datum', 'Zeit', 'Von', 'Bis', 'Zweck', 'km', 'Kosten (€)']

  function exportCSV() {
    const lines = [HEAD, ...expData(), ['', '', '', '', 'Summe', totalKm.toFixed(1), totalKosten.toFixed(2)]]
    const csv = lines.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    dl(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), expName() + '.csv')
  }
  function exportExcel() {
    const th = HEAD.map(h => `<th style="background:#6b6b6e;color:#fff;padding:6px;border:1px solid #ccc">${h}</th>`).join('')
    const trs = expData().map(r => '<tr>' + r.map(c => `<td style="padding:5px;border:1px solid #ccc">${c}</td>`).join('') + '</tr>').join('')
    const sum = `<tr><td colspan="5" style="text-align:right;font-weight:bold;padding:5px;border:1px solid #ccc">Summe</td><td style="font-weight:bold;padding:5px;border:1px solid #ccc">${totalKm.toFixed(1)}</td><td style="font-weight:bold;padding:5px;border:1px solid #ccc">${totalKosten.toFixed(2)}</td></tr>`
    const html = `<html><head><meta charset="utf-8"></head><body><h3>${expName()}</h3><table style="border-collapse:collapse"><tr>${th}</tr>${trs}${sum}</table></body></html>`
    dl(new Blob([html], { type: 'application/vnd.ms-excel' }), expName() + '.xls')
  }
  function exportPDF() {
    const th = HEAD.map(h => `<th>${h}</th>`).join('')
    const trs = expData().map(r => '<tr>' + r.map((c, i) => `<td class="${i >= 5 ? 'num' : ''}">${c}</td>`).join('') + '</tr>').join('')
    const w = window.open('', '_blank'); if (!w) return
    w.document.write(`<html><head><title>${expName()}</title><style>
      @page{size:A4 landscape;margin:14mm}
      body{font-family:Arial;color:#2a2a28}
      h2{margin:0 0 10px}
      .sub{color:#8a8278;font-size:12px;margin-bottom:14px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#6b6b6e;color:#fff;padding:6px 7px;text-align:left;white-space:nowrap}
      td{padding:5px 7px;border-bottom:1px solid #e2dccd}
      td.num,th:nth-child(6),th:nth-child(7){text-align:right;white-space:nowrap}
      th:nth-child(1),td:nth-child(1){white-space:nowrap}
      tfoot td{font-weight:bold;border-top:2px solid #6b6b6e}
    </style></head><body>
      <h2>Fahrtenbuch — ${profile?.name || ''}</h2>
      <div class="sub">${monthLabel} · Pauschale ${RATE.toFixed(2).replace('.', ',')} €/km</div>
      <table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody>
      <tfoot><tr><td colspan="5" style="text-align:right">Summe</td><td class="num">${totalKm.toFixed(1)}</td><td class="num">${totalKosten.toFixed(2)} €</td></tr></tfoot>
      </table>
      <script>window.onload=()=>{window.print()}<\/script>
    </body></html>`)
    w.document.close()
  }
  function dl(blob, name) { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 2000) }

  // ── UI ──
  const wrap = { minHeight: '100dvh', background: CREAM, fontFamily: 'Arial, sans-serif', color: DARK, padding: '0 0 80px' }
  const inner = { maxWidth: 820, margin: '0 auto', padding: '0 16px' }
  const btn = (bg, fg, br) => ({ background: bg, color: fg, border: br || 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' })

  if (!loaded) return <div style={wrap}><div style={{ ...inner, paddingTop: 80, textAlign: 'center', color: MUT }}>Lädt…</div></div>

  return (
    <div style={wrap}>
      {/* fejléc */}
      <div style={{ background: '#fff', borderBottom: '1px solid ' + LINE, position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ ...inner, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: GOLD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>B</div>
            <div style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>Bartz · Fahrtenbuch</div>
          </div>

          {/* profilváltó + hónap */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setPickerOpen(o => !o)} style={{ ...btn('#fff', DARK, '1px solid ' + LINE), display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
                <i className="ti ti-user" style={{ color: GOLD }} />
                <span style={{ flex: 1, textAlign: 'left' }}>{profile ? profile.name : 'Profil wählen'}</span>
                <i className="ti ti-chevron-down" style={{ fontSize: 13, color: MUT }} />
              </button>
              {pickerOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 40, background: '#fff', border: '1px solid ' + LINE, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)', width: 240, maxHeight: 280, overflowY: 'auto' }}>
                  {profiles.length === 0 && <div style={{ padding: 12, fontSize: 12, color: MUT }}>Noch kein Profil.</div>}
                  {profiles.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '0.5px solid ' + LINE, background: p.id === selId ? '#faf6ec' : '#fff' }}>
                      <div onClick={() => { setSelId(p.id); setPickerOpen(false) }} style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                        {p.home && <div style={{ fontSize: 10, color: MUT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🏠 {shortAddr(p.home)}</div>}
                      </div>
                      <button onClick={() => { setProfModal({ id: p.id, name: p.name, home: p.home || '' }); setPickerOpen(false) }} title="Bearbeiten" style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUT, padding: 3 }}><i className="ti ti-pencil" /></button>
                      <button onClick={() => deleteProfile(p.id)} title="Löschen" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d27', padding: 3 }}><i className="ti ti-trash" /></button>
                    </div>
                  ))}
                  <button onClick={() => { setProfModal({ name: '', home: '' }); setPickerOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '9px 10px', background: 'none', border: 'none', cursor: 'pointer', color: GOLD, fontWeight: 700, fontSize: 12 }}>
                    <i className="ti ti-plus" style={{ marginRight: 6 }} />Neues Profil
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => shiftMonth(-1)} style={btn('#fff', DARK, '1px solid ' + LINE)}>‹</button>
              <div style={{ fontSize: 13, fontWeight: 800, minWidth: 130, textAlign: 'center', textTransform: 'capitalize' }}>{monthLabel}</div>
              <button onClick={() => shiftMonth(1)} style={btn('#fff', DARK, '1px solid ' + LINE)}>›</button>
            </div>

            <div style={{ flex: 1 }} />
            {profile && rows.length > 0 && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={exportPDF} style={btn(GOLD, '#fff')}><i className="ti ti-file-type-pdf" style={{ marginRight: 5 }} />PDF</button>
                <button onClick={exportExcel} style={btn('#fff', DARK, '1px solid ' + LINE)}>Excel</button>
                <button onClick={exportCSV} style={btn('#fff', DARK, '1px solid ' + LINE)}>CSV</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...inner, paddingTop: 16 }}>
        {!profile ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: MUT }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚗</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 6 }}>Noch kein Profil</div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>Lege ein Profil mit Heimatadresse an.</div>
            <button onClick={() => setProfModal({ name: '', home: '' })} style={btn(GOLD, '#fff')}><i className="ti ti-plus" style={{ marginRight: 5 }} />Profil hinzufügen</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 12, color: MUT }}>🏠 {profile.home ? shortAddr(profile.home) : '— keine Heimatadresse —'} &nbsp;·&nbsp; 🏢 Büro: {shortAddr(BUERO)}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={calcAllKm} disabled={busy} style={btn('#fff', GOLD, '1px solid ' + GOLD)}>{busy ? '…' : 'Alle km berechnen'}</button>
                <button onClick={addRow} style={btn(GOLD, '#fff')}><i className="ti ti-plus" style={{ marginRight: 5 }} />Fahrt</button>
              </div>
            </div>

            {rows.length === 0 && <div style={{ textAlign: 'center', color: MUT, fontSize: 13, padding: '40px 0' }}>Keine Fahrten in diesem Monat. Mit „Fahrt" hinzufügen.</div>}

            {rows.map(r => (
              <div key={r.id} style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <input type="date" value={r.date} onChange={e => updRow(r.id, { date: e.target.value })} style={fieldS(130)} />
                  <input type="time" value={r.timeFrom} onChange={e => updRow(r.id, { timeFrom: e.target.value })} title="von" style={fieldS(100)} />
                  <input type="time" value={r.timeTo} onChange={e => updRow(r.id, { timeTo: e.target.value })} title="bis" style={fieldS(100)} />
                  <input value={r.zweck} onChange={e => updRow(r.id, { zweck: e.target.value })} placeholder="Zweck (z. B. Shooting)" style={{ ...fieldS(0), flex: 1, minWidth: 120 }} />
                  <button onClick={() => delRow(r.id)} title="Löschen" style={{ ...btn('#fff', '#d27', '1px solid ' + LINE), padding: '6px 9px' }}><i className="ti ti-trash" /></button>
                </div>
                <AddrRow label="Von" value={r.von} onChange={v => updRow(r.id, { von: v })} home={profile.home} />
                <AddrRow label="Bis" value={r.bis} onChange={v => updRow(r.id, { bis: v })} home={profile.home} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <button onClick={() => calcKm(r)} disabled={busy} style={btn('#fff', GOLD, '1px solid ' + GOLD)}><i className="ti ti-route" style={{ marginRight: 5 }} />km berechnen</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <input value={r.km} onChange={e => updRow(r.id, { km: e.target.value.replace(',', '.') })} placeholder="km" style={{ ...fieldS(70), textAlign: 'right' }} />
                    <span style={{ fontSize: 12, color: MUT }}>km</span>
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ fontSize: 13, fontWeight: 800, color: GOLD }}>{((parseFloat(r.km) || 0) * RATE).toFixed(2)} €</div>
                </div>
              </div>
            ))}

            {rows.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 18, marginTop: 8, padding: '12px 14px', background: '#fff', border: '1px solid ' + LINE, borderRadius: 12 }}>
                <div style={{ fontSize: 13 }}><span style={{ color: MUT }}>Summe km:</span> <b>{totalKm.toFixed(1)}</b></div>
                <div style={{ fontSize: 13 }}><span style={{ color: MUT }}>Kosten:</span> <b style={{ color: GOLD }}>{totalKosten.toFixed(2)} €</b></div>
              </div>
            )}
          </>
        )}
      </div>

      {/* profil modal */}
      {profModal && (
        <div onClick={() => setProfModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 18, width: '100%', maxWidth: 420 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>{profModal.id ? 'Profil bearbeiten' : 'Neues Profil'}</div>
            <label style={LBL}>Name *</label>
            <input value={profModal.name} onChange={e => setProfModal(p => ({ ...p, name: e.target.value }))} placeholder="z. B. Max Mustermann" style={{ ...fieldS(0), width: '100%', marginBottom: 12 }} />
            <label style={LBL}>Heimatadresse (🏠 Home)</label>
            <input value={profModal.home} onChange={e => setProfModal(p => ({ ...p, home: e.target.value }))} placeholder="Straße Nr, PLZ Ort" style={{ ...fieldS(0), width: '100%', marginBottom: 4 }} />
            <div style={{ fontSize: 10, color: MUT, marginBottom: 16 }}>Google-Maps-Adresse — wird als „Home"-Schnellauswahl genutzt.</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {profModal.id ? <button onClick={() => { deleteProfile(profModal.id); setProfModal(null) }} style={btn('#fff', '#d27', '1px solid ' + LINE)}>Löschen</button> : <span />}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setProfModal(null)} style={btn('#fff', MUT, '1px solid ' + LINE)}>Abbrechen</button>
                <button onClick={saveProfile} style={btn(GOLD, '#fff')}>Speichern</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css" />
    </div>
  )
}

function AddrRow({ label, value, onChange, home }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: MUT, width: 28 }}>{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="Google-Maps-Adresse eingeben…" style={{ ...fieldS(0), flex: 1, minWidth: 0 }} />
      <button onClick={() => onChange(home || '')} disabled={!home} title="Heimatadresse" style={chip(!!home)}>🏠</button>
      <button onClick={() => onChange(BUERO)} title="Büro" style={chip(true)}>🏢</button>
    </div>
  )
}

const fieldS = w => ({ background: '#fff', border: '1.5px solid ' + LINE, borderRadius: 7, padding: '6px 9px', fontSize: 12, color: DARK, fontFamily: 'Arial', outline: 'none', ...(w ? { width: w } : {}) })
const LBL = { fontSize: 10, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4, display: 'block' }
function chip(on) { return { background: on ? '#f6efe0' : '#f3f1ec', border: '1px solid ' + LINE, borderRadius: 7, padding: '5px 8px', fontSize: 13, cursor: on ? 'pointer' : 'not-allowed', opacity: on ? 1 : 0.5, whiteSpace: 'nowrap' } }
