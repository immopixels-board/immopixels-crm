'use client'
import React, { useEffect, useState } from 'react'

const GOLD = '#b8892a', DARK = '#2a2a28', MUT = '#8a8278', CREAM = '#faf7f1', LINE = '#ece4d6'

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
  const [view, setView] = useState('list')        // 'list' | 'month'
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
  const inner = { maxWidth: 620, margin: '0 auto', padding: '0 16px' }

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

  const fmtDay = d => {
    const dt = new Date(d + 'T00:00:00')
    return { wd: dt.toLocaleDateString('de-DE', { weekday: 'long' }), dm: dt.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) }
  }

  function ShootCard(s) {
    return (
      <div key={s.id} style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: s.address ? 8 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: DARK, minWidth: 46 }}>{s.time || '—'}{s.timeTo ? '–' + s.timeTo : ''}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: DARK, wordBreak: 'break-word' }}>{s.title || 'Termin'}</div>
            {s.type && TYPE_LABEL[s.type] && <div style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>{TYPE_LABEL[s.type]}</div>}
          </div>
        </div>
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

  // ── LISTE ──
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

  // ── MONAT ──
  function renderMonth() {
    const [y, m] = month.split('-').map(Number)
    const label = new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    const daysInMonth = new Date(y, m, 0).getDate()
    const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7 // hétfő = 0
    const cells = []
    for (let i = 0; i < firstDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    const todayStr = ymd(today.getFullYear(), today.getMonth() + 1, today.getDate())
    const shift = delta => { let nm = m + delta, ny = y; if (nm < 1) { nm = 12; ny-- } if (nm > 12) { nm = 1; ny++ } setMonth(ymd(ny, nm, 1).slice(0, 7)); setSelDay(null) }
    const selShoots = selDay ? (byDate[selDay] || []) : []
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button onClick={() => shift(-1)} style={navBtn}>‹</button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 800, textTransform: 'capitalize' }}>{label}</div>
          <button onClick={() => shift(1)} style={navBtn}>›</button>
        </div>
        <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: MUT }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const ds = ymd(y, m, d)
              const has = (byDate[ds] || []).length
              const isToday = ds === todayStr
              const isSel = ds === selDay
              return (
                <button key={i} onClick={() => setSelDay(has ? ds : null)} disabled={!has}
                  style={{
                    aspectRatio: '1', borderRadius: 8, border: isSel ? '2px solid ' + GOLD : '1px solid ' + (isToday ? GOLD : 'transparent'),
                    background: isSel ? GOLD : has ? '#f6efe0' : 'transparent', color: isSel ? '#fff' : DARK,
                    cursor: has ? 'pointer' : 'default', fontSize: 12, fontWeight: 700, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {d}
                  {has > 0 && <span style={{ position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: '50%', background: isSel ? '#fff' : GOLD }} />}
                </button>
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
            <div style={{ textAlign: 'center', color: MUT, fontSize: 12, padding: '20px 0' }}>Tag mit Punkt antippen für Details.</div>
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
