'use client'
import React, { useState, useEffect } from 'react'

const pad = n => String(n).padStart(2, '0')
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const DOW = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const km0 = n => Math.round(Number(n) || 0).toLocaleString('de-DE')
function hhmm(min) { const h = Math.floor((min || 0) / 60), m = Math.round((min || 0) % 60); return h ? `${h} h ${pad(m)}` : `${m} min` }
function mondayOf(d) { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x }

export default function FahrtenWidget() {
  const [mode, setMode] = useState('tag') // tag | woche | monat
  const [anchor, setAnchor] = useState(() => new Date())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [openP, setOpenP] = useState(null)

  const range = (() => {
    if (mode === 'tag') return { from: iso(anchor), to: iso(anchor) }
    if (mode === 'woche') { const mo = mondayOf(anchor); const su = new Date(mo); su.setDate(mo.getDate() + 6); return { from: iso(mo), to: iso(su) } }
    const f = new Date(anchor.getFullYear(), anchor.getMonth(), 1); const t = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0); return { from: iso(f), to: iso(t) }
  })()

  useEffect(() => {
    let alive = true; setLoading(true)
    fetch(`/api/fahrten?from=${range.from}&to=${range.to}`)
      .then(r => r.json()).then(d => { if (alive) { setData(d); setLoading(false) } })
      .catch(() => { if (alive) { setData({ ok: false }); setLoading(false) } })
    return () => { alive = false }
  }, [range.from, range.to])

  function shift(dir) {
    const d = new Date(anchor)
    if (mode === 'tag') d.setDate(d.getDate() + dir)
    else if (mode === 'woche') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setAnchor(d); setOpenP(null)
  }

  const photographers = (data && data.photographers) || []
  const totals = (data && data.totals) || {}
  const grand = Object.values(totals).reduce((s, t) => s + (t.km || 0), 0)
  const maxKm = Math.max(1, ...Object.values(totals).map(t => t.km || 0))
  const dayData = (data && data.days && data.days[range.from]) || {}

  const label = mode === 'tag'
    ? `${DOW[anchor.getDay()]}, ${pad(anchor.getDate())}.${pad(anchor.getMonth() + 1)}.${anchor.getFullYear()}`
    : mode === 'woche'
      ? (() => { const mo = mondayOf(anchor); const su = new Date(mo); su.setDate(mo.getDate() + 6); return `${pad(mo.getDate())}.${pad(mo.getMonth() + 1)}.–${pad(su.getDate())}.${pad(su.getMonth() + 1)}.` })()
      : `${MON[anchor.getMonth()]} ${anchor.getFullYear()}`

  const TAB = (id, t) => (
    <button onClick={() => { setMode(id); setOpenP(null) }} style={{ flex: 1, padding: '4px 0', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 7, background: mode === id ? 'var(--bg2)' : 'transparent', color: mode === id ? 'var(--t1)' : 'var(--t3)', boxShadow: mode === id ? '0 1px 2px rgba(0,0,0,.08)' : 'none' }}>{t}</button>
  )

  return (
    <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--t1)' }}>
      <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 9, padding: 3, marginBottom: 8 }}>
        {TAB('tag', 'Tag')}{TAB('woche', 'Woche')}{TAB('monat', 'Monat')}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button onClick={() => shift(-1)} style={navBtn}>‹</button>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
        <button onClick={() => shift(1)} style={navBtn}>›</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 2px 8px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--t3)' }}>{mode === 'tag' ? 'gefahren heute' : 'gefahren gesamt'}</span>
        <span style={{ fontSize: 17, fontWeight: 800 }}>{km0(grand)} km</span>
      </div>

      {loading && <div style={{ padding: 16, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Lädt…</div>}

      {!loading && data && data.ok === false && (
        <div style={{ padding: 14, textAlign: 'center', color: 'var(--t3)', fontSize: 11.5 }}>Noch keine Daten. Lege Start-Adressen der Fotografen an (Team) und Aufnahmen mit Adresse.</div>
      )}

      {!loading && data && data.ok !== false && photographers.length === 0 && (
        <div style={{ padding: 14, textAlign: 'center', color: 'var(--t3)', fontSize: 11.5 }}>Keine Fahrten in diesem Zeitraum.</div>
      )}

      {!loading && photographers.map(p => {
        const t = totals[p.init] || { km: 0, min: 0 }
        const stops = (dayData[p.init] && dayData[p.init].stops) || []
        const isOpen = openP === p.init
        return (
          <div key={p.init} style={{ marginBottom: 8 }}>
            <div onClick={() => mode === 'tag' && stops.length && setOpenP(isOpen ? null : p.init)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: (mode === 'tag' && stops.length) ? 'pointer' : 'default' }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: p.color, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{p.init}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || p.init}</div>
                {mode !== 'tag' && <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, marginTop: 3 }}><div style={{ height: '100%', width: Math.max(3, (t.km / maxKm) * 100) + '%', background: p.color, borderRadius: 3 }} /></div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{km0(t.km)} km</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>{mode === 'tag' ? (stops.length ? hhmm(t.min) : '–') : `${t.days} ${t.days === 1 ? 'Tag' : 'Tage'}`}</div>
              </div>
            </div>

            {isOpen && stops.length > 0 && (
              <div style={{ margin: '6px 0 4px 34px', paddingLeft: 10, borderLeft: '2px solid var(--border)' }}>
                <div style={{ fontSize: 10.5, color: 'var(--t3)', marginBottom: 3 }}>🏠 Zuhause</div>
                {stops.map((s, i) => (
                  <div key={i} style={{ fontSize: 11, padding: '2px 0' }}>
                    <span style={{ fontWeight: 700, marginRight: 5 }}>{(s.time || '').slice(0, 5)}</span>
                    <span style={{ color: 'var(--t2,#666)' }}>{s.name ? s.name + ' · ' : ''}{s.addr}</span>
                  </div>
                ))}
                <div style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 3 }}>🏠 Zuhause</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const navBtn = { width: 24, height: 24, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg2)', cursor: 'pointer', fontSize: 13, color: 'var(--gold)', lineHeight: 1 }
