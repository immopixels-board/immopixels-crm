'use client'
import React, { useEffect, useState } from 'react'

const GOLD = '#b8892a', DARK = '#2a2a28', MUT = '#8a8278', CREAM = '#faf7f1', LINE = '#ece4d6'
const PALETTE = ['#b8892a', '#7BBFCB', '#9CAF88', '#A67B5B', '#d4537e', '#6d28d9', '#378add', '#e2914b']

const TYPE_LABEL = {
  foto: 'Foto', 'foto-reel': 'Foto + Reel', fotoreel: 'Foto + Reel',
  'foto-dron': 'Foto + Drohne', fotodrohne: 'Foto + Drohne', 'foto-drohne': 'Foto + Drohne',
  drohne: 'Drohne', dron: 'Drohne', reel: 'Reel', '360': '360°', editing: 'Editing',
}
const pad = n => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`

export default function CalClient({ ckey }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)
  const [view, setView] = useState('list')
  const [showPast, setShowPast] = useState(false)
  const [copied, setCopied] = useState(null)
  const [month, setMonth] = useState(() => { const n = new Date(); return ymd(n.getFullYear(), n.getMonth() + 1, 1).slice(0, 7) })
  const [selDay, setSelDay] = useState(null)

  useEffect(() => {
    let on = true
    fetch('/api/public-cal/' + encodeURIComponent(ckey))
      .then(r => r.json())
      .then(d => { if (on) { if (d?.ok) setData(d); else setErr(true) } })
      .catch(() => on && setErr(true))
    return () => { on = false }
  }, [ckey])

  function copyAddr(addr, id) {
    try { navigator.clipboard.writeText(addr); setCopied(id); setTimeout(() => setCopied(null), 1500) } catch (e) {}
  }

  const wrap = { minHeight: '100dvh', background: CREAM, fontFamily: 'Arial, sans-serif', color: DARK, padding: '0 0 60px' }
  const inner = { maxWidth: 640, margin: '0 auto', padding: '0 16px' }

  if (err) return (
    <div style={wrap}><div style={{ ...inner, paddingTop: 80, textAlign: 'center', color: MUT }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: DARK }}>Kalender nicht gefunden</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>Bitte überprüfe den Link.</div>
    </div></div>
  )
  if (!data) return (
    <div style={wrap}><div style={{ ...inner, paddingTop: 80, textAlign: 'center', color: MUT, fontSize: 14 }}>Lädt…</div></div>
  )

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const all = data.shoots || []
  const byDate = {}
  all.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s) })

  // fotós -> szín (kivel van a fotózás)
  const pNames = [...new Set(all.map(s => s.photographer).filter(Boolean))]
  const pColor = name => name ? PALETTE[pNames.indexOf(name) % PALETTE.length] : MUT
  const shortName = s => s.photographerShort || s.photographer || ''

  const fmtDay = d => {
    const dt = new Date(d + 'T00:00:00')
    return { wd: dt.toLocaleDateString('de-DE', { weekday: 'long' }), dm: dt.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) }
  }

  function PersonTag(s) {
    if (!s.photographer) return null
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: pColor(s.photographer) }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: pColor(s.photographer) }} />
        mit {s.photographer}
      </span>
    )
  }

  function ShootCard(s) {
    return (
      <div key={s.id} style={{ background: '#fff', border: '1px solid ' + LINE, borderLeft: '3px solid ' + pColor(s.photographer), borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: DARK, minWidth: 46 }}>{s.time || '—'}{s.timeTo ? '–' + s.timeTo : ''}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: DARK, wordBreak: 'break-word' }}>{s.title || 'Termin'}</div>
            {s.type && TYPE_LABEL[s.type] && <div style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>{TYPE_LABEL[s.type]}</div>}
          </div>
        </div>
        {s.photographer && <div style={{ marginBottom: s.address ? 8 : 0 }}>{PersonTag(s)}</div>}
        {s.address && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: CREAM, borderRadius: 8, padding: '8px 10px' }}>
            <i className="ti ti-map-pin" style={{ fontSize: 14, color: GOLD }} />
            <a href={'https://maps.google.com/?q=' + encodeURIComponent(s.address)} target="_blank" rel="noreferrer"
              style={{ flex: 1, fontSize: 12, color: DARK, textDecoration: 'none', wordBreak: 'break-word' }}>{s.address}</a>
            <button onClick={() => copyAddr(s.address, s.id)} title="Adresse kopieren"
              style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 7, padding: '5px 9px', fontSize: 11, fontWeight: 700, color: copied === s.id ? '#3b8b5e' : GOLD, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {copied === s.id ? '✓ Kopiert' : 'Kopieren'}
            </button>
          </div>
        )}
      </div>
    )
  }

  function Legend() {
    if (pNames.length === 0) return null
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12, padding: '8px 12px', background: '#fff', border: '1px solid ' + LINE, borderRadius: 10 }}>
        {pNames.map(n => (
          <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: DARK }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: pColor(n) }} /> {n}
          </span>
        ))}
      </div>
    )
  }

  function renderList() {
    const upcoming = all.filter(s => new Date(s.date + 'T00:00:00') >= today)
    const past = all.filter(s => new Date(s.date + 'T00:00:00') < today).reverse()
    const list = showPast ? past : upcoming
    const groups = []
    let last = null
    list.forEach(s => { if (s.date !== last) { groups.push({ date: s.date, items: [] }); last = s.date } groups[groups.length - 1].items.push(s) })
    return (
      <>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={() => setShowPast(false)} style={tab(!showPast)}>Kommende ({upcoming.length})</button>
          <button onClick={() => setShowPast(true)} style={tab(showPast)}>Vergangene ({past.length})</button>
        </div>
        {pNames.length > 1 && Legend()}
        {groups.length === 0 && <div style={{ textAlign: 'center', color: MUT, fontSize: 14, padding: '50px 0' }}>{showPast ? 'Keine vergangenen Termine.' : 'Keine kommenden Termine.'}</div>}
        {groups.map(g => {
          const f = fmtDay(g.date)
          return (
            <div key={g.date} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: GOLD, textTransform: 'capitalize' }}>{f.wd}</span>
                <span style={{ fontSize: 12, color: MUT }}>{f.dm}</span>
              </div>
              {g.items.map(ShootCard)}
            </div>
          )
        })}
      </>
    )
  }

  function renderMonth() {
    const [y, m] = month.split('-').map(Number)
    const label = new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    const daysInMonth = new Date(y, m, 0).getDate()
    const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7
    const cells = []
    for (let i = 0; i < firstDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    const todayStr = ymd(today.getFullYear(), today.getMonth() + 1, today.getDate())
    const shift = delta => { let nm = m + delta, ny = y; if (nm < 1) { nm = 12; ny-- } if (nm > 12) { nm = 1; ny++ } setMonth(ymd(ny, nm, 1).slice(0, 7)); setSelDay(null) }
    const selShoots = selDay ? (byDate[selDay] || []) : []
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button onClick={() => shift(-1)} style={navBtn}>‹</button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 800, textTransform: 'capitalize' }}>{label}</div>
          <button onClick={() => shift(1)} style={navBtn}>›</button>
        </div>
        {pNames.length > 0 && Legend()}
        <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#fbf8f1', borderBottom: '1px solid ' + LINE }}>
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: MUT, padding: '6px 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {cells.map((d, i) => {
              const ds = d ? ymd(y, m, d) : null
              const items = ds ? (byDate[ds] || []) : []
              const isToday = ds === todayStr
              const isSel = ds === selDay
              return (
                <div key={i} onClick={() => ds && items.length && setSelDay(ds)}
                  style={{
                    minHeight: 70, borderRight: (i % 7 !== 6) ? '1px solid ' + LINE : 'none', borderBottom: '1px solid ' + LINE,
                    padding: 3, background: isSel ? '#f6efe0' : '#fff', cursor: items.length ? 'pointer' : 'default', overflow: 'hidden',
                  }}>
                  {d && (
                    <div style={{ textAlign: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isToday ? '#fff' : DARK, background: isToday ? GOLD : 'transparent', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{d}</span>
                    </div>
                  )}
                  {items.slice(0, 3).map(s => (
                    <div key={s.id} style={{ background: pColor(s.photographer), color: '#fff', borderRadius: 4, padding: '1px 4px', marginBottom: 2, fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.time && <span>{s.time} </span>}{shortName(s) || (TYPE_LABEL[s.type] || 'Termin')}
                    </div>
                  ))}
                  {items.length > 3 && <div style={{ fontSize: 9, color: MUT, fontWeight: 700, paddingLeft: 2 }}>+{items.length - 3}</div>}
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          {selDay ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 800, color: GOLD, marginBottom: 8, textTransform: 'capitalize' }}>{fmtDay(selDay).wd}, {fmtDay(selDay).dm}</div>
              {selShoots.map(ShootCard)}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: MUT, fontSize: 12, padding: '20px 0' }}>Tag mit Termin antippen für Details.</div>
          )}
        </div>
      </>
    )
  }

  return (
    <div style={wrap}>
      <div style={{ background: '#fff', borderBottom: '1px solid ' + LINE }}>
        <div style={{ ...inner, padding: '18px 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: GOLD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15 }}>IP</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{data.client?.name} — Termine</div>
              <div style={{ fontSize: 11, color: MUT }}>ImmoPixels · nur Ansicht</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => setView('list')} style={tab(view === 'list')}><i className="ti ti-list" style={{ marginRight: 5 }} />Liste</button>
            <button onClick={() => setView('month')} style={tab(view === 'month')}><i className="ti ti-calendar-month" style={{ marginRight: 5 }} />Monat</button>
          </div>
        </div>
      </div>

      <div style={{ ...inner, paddingTop: 14 }}>
        {view === 'list' ? renderList() : renderMonth()}
        <div style={{ textAlign: 'center', fontSize: 11, color: MUT, marginTop: 24 }}>
          Schreibgeschützter Kalender · Änderungen nicht möglich
        </div>
      </div>

      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css" />
    </div>
  )
}

function tab(active) {
  return {
    flex: 1, padding: '8px 10px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
    border: '1px solid ' + (active ? GOLD : LINE), background: active ? GOLD : '#fff', color: active ? '#fff' : MUT,
  }
}
const navBtn = { width: 34, height: 34, borderRadius: 8, border: '1px solid ' + LINE, background: '#fff', color: DARK, fontSize: 18, cursor: 'pointer', lineHeight: 1 }
