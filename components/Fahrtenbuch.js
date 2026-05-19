'use client'
import { useState, useEffect, useMemo } from 'react'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''

async function getDistanceMatrix(origins, destinations) {
  try {
    const r = await fetch(`/api/fahrtenbuch/distance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origins, destinations })
    })
    return await r.json()
  } catch(e) { return null }
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'2-digit', year:'2-digit' })
}

function fmtKm(m) {
  if (!m) return '—'
  return (m / 1000).toFixed(1) + ' km'
}

function fmtMin(s) {
  if (!s) return '—'
  const m = Math.round(s / 60)
  return m >= 60 ? Math.floor(m/60) + 'h ' + (m%60) + 'min' : m + ' min'
}

function getWeekDates(date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  const mon = new Date(d); mon.setDate(d.getDate() - day + 1)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { from: mon.toISOString().slice(0,10), to: sun.toISOString().slice(0,10) }
}

function getMonthDates(date) {
  const d = new Date(date)
  return {
    from: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10),
    to: new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().slice(0,10)
  }
}

export default function Fahrtenbuch({ staff, cards, me, isAdmin }) {
  const [view, setView] = useState('week') // day | week | month
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0,10))
  const [selectedStaff, setSelectedStaff] = useState(me?.id || null)
  const [distances, setDistances] = useState({}) // key: "date_idx" → {distance, duration}
  const [loading, setLoading] = useState(false)

  const currentStaff = staff.find(s => s.id === selectedStaff) || me

  // Date range based on view
  const dateRange = useMemo(() => {
    if (view === 'day') return { from: selectedDate, to: selectedDate }
    if (view === 'week') return getWeekDates(selectedDate)
    return getMonthDates(selectedDate)
  }, [view, selectedDate])

  // Get trips for current staff in date range
  const trips = useMemo(() => {
    if (!currentStaff) return []
    const staffCards = cards.filter(c => {
      if (!c.card_date || !c.addr) return false
      if (c.card_date < dateRange.from || c.card_date > dateRange.to) return false
      // Check if staff is assigned to this card — simplified: filter by client or all for now
      return true
    })
    // Group by date
    const byDate = {}
    for (const c of staffCards) {
      if (!byDate[c.card_date]) byDate[c.card_date] = []
      byDate[c.card_date].push(c)
    }
    // Sort within each day by time
    for (const date of Object.keys(byDate)) {
      byDate[date].sort((a,b) => (a.card_time||'').localeCompare(b.card_time||''))
    }
    return Object.entries(byDate).sort(([a],[b]) => a.localeCompare(b))
  }, [cards, currentStaff, dateRange])

  // Calculate distances
  useEffect(() => {
    if (!currentStaff?.address || trips.length === 0) return
    calcDistances()
  }, [trips, currentStaff])

  async function calcDistances() {
    setLoading(true)
    const newDistances = {}

    for (const [date, dayCards] of trips) {
      const stops = [currentStaff.address, ...dayCards.map(c => c.addr), currentStaff.address]
      try {
        const r = await fetch('/api/fahrtenbuch/distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stops })
        })
        const d = await r.json()
        if (d.ok) newDistances[date] = d.legs
      } catch(e) {}
    }
    setDistances(newDistances)
    setLoading(false)
  }

  function navigate(dir) {
    const d = new Date(selectedDate)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setSelectedDate(d.toISOString().slice(0,10))
  }

  function formatPeriodLabel() {
    if (view === 'day') return fmtDate(selectedDate)
    if (view === 'week') {
      const { from, to } = dateRange
      return `${new Date(from).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})} – ${new Date(to).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'})}`
    }
    return new Date(selectedDate).toLocaleDateString('de-DE', { month:'long', year:'numeric' })
  }

  const totalKm = Object.values(distances).reduce((s, legs) => s + legs.reduce((ls, l) => ls + (l.distance||0), 0), 0)
  const totalMin = Object.values(distances).reduce((s, legs) => s + legs.reduce((ls, l) => ls + (l.duration||0), 0), 0)

  const IS = { width:'100%', background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:7, padding:'7px 10px', fontSize:13, color:'var(--t1)', outline:'none', boxSizing:'border-box' }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'var(--bg)', fontFamily:'Arial,sans-serif' }}>

      {/* Header */}
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:14, fontWeight:700, color:'var(--t1)', display:'flex', alignItems:'center', gap:6 }}>
          <i className="ti ti-car" style={{ fontSize:16, color:'#b8892a' }} /> Fahrtenbuch
        </span>

        {/* Staff selector (admin only) */}
        {isAdmin && (
          <select value={selectedStaff} onChange={e=>setSelectedStaff(e.target.value)}
            style={{ border:'0.5px solid var(--border)', borderRadius:6, padding:'4px 8px', fontSize:12, background:'var(--bg3)', color:'var(--t1)', outline:'none' }}>
            {staff.filter(s=>s.address).map(s=>(
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {/* View toggle */}
        <div style={{ display:'flex', gap:4, marginLeft:'auto' }}>
          {['day','week','month'].map(v => (
            <button key={v} onClick={()=>setView(v)}
              style={{ padding:'4px 10px', borderRadius:6, border:'0.5px solid '+(view===v?'#b8892a':'var(--border)'), background:view===v?'#b8892a14':'var(--bg3)', color:view===v?'#b8892a':'var(--t2)', fontSize:11, fontWeight:view===v?700:400, cursor:'pointer' }}>
              {v==='day'?'Tag':v==='week'?'Woche':'Monat'}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={()=>navigate(-1)} style={{ background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:6, padding:'4px 8px', cursor:'pointer', color:'var(--t2)', fontSize:13 }}>‹</button>
          <span style={{ fontSize:12, fontWeight:600, color:'var(--t1)', minWidth:120, textAlign:'center' }}>{formatPeriodLabel()}</span>
          <button onClick={()=>navigate(1)} style={{ background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:6, padding:'4px 8px', cursor:'pointer', color:'var(--t2)', fontSize:13 }}>›</button>
        </div>
      </div>

      {/* No address warning */}
      {!currentStaff?.address && (
        <div style={{ margin:16, padding:14, background:'#fffbeb', border:'0.5px solid #fde68a', borderRadius:10, fontSize:13, color:'#b8892a' }}>
          <i className="ti ti-alert-triangle" style={{ fontSize:14 }} /> Keine Heimadresse hinterlegt. Bitte in den Mitarbeiter-Einstellungen eine Adresse angeben.
        </div>
      )}

      {/* Summary bar */}
      {(totalKm > 0 || loading) && (
        <div style={{ display:'flex', gap:20, padding:'10px 16px', background:'var(--bg2)', borderBottom:'0.5px solid var(--border)', flexWrap:'wrap' }}>
          <div style={{ fontSize:12, color:'var(--t3)' }}>Gesamt: <span style={{ fontWeight:700, color:'var(--t1)', fontSize:14 }}>{fmtKm(totalKm)}</span></div>
          <div style={{ fontSize:12, color:'var(--t3)' }}>Fahrzeit: <span style={{ fontWeight:700, color:'var(--t1)' }}>{fmtMin(totalMin)}</span></div>
          <div style={{ fontSize:12, color:'var(--t3)' }}>Termine: <span style={{ fontWeight:700, color:'var(--t1)' }}>{trips.reduce((s,[,c])=>s+c.length,0)}</span></div>
          {loading && <span style={{ fontSize:11, color:'#b8892a' }}>⟳ Entfernung wird berechnet...</span>}
        </div>
      )}

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>
        {trips.length === 0 && (
          <div style={{ textAlign:'center', padding:40, color:'var(--t3)', fontSize:13 }}>Keine Termine in diesem Zeitraum</div>
        )}
        {trips.map(([date, dayCards]) => {
          const legs = distances[date] || []
          let totalDayKm = legs.reduce((s,l)=>s+(l.distance||0),0)
          return (
            <div key={date} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--t1)' }}>{fmtDate(date)}</span>
                {totalDayKm > 0 && <span style={{ fontSize:11, color:'#b8892a', fontWeight:600 }}>{fmtKm(totalDayKm)}</span>}
              </div>

              {/* Route */}
              <div style={{ background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                {/* Start: home */}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'0.5px solid var(--border)' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'#15803d22', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <i className="ti ti-home" style={{ fontSize:13, color:'#15803d' }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#15803d' }}>Start</div>
                    <div style={{ fontSize:12, color:'var(--t2)' }}>{currentStaff?.address || '—'}</div>
                  </div>
                </div>

                {/* Stops */}
                {dayCards.map((card, idx) => {
                  const leg = legs[idx]
                  return (
                    <div key={card.id}>
                      {leg && (
                        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 14px 4px 52px', background:'var(--bg3)', borderBottom:'0.5px solid var(--border)' }}>
                          <i className="ti ti-arrow-down" style={{ fontSize:10, color:'var(--t3)' }} />
                          <span style={{ fontSize:10, color:'var(--t3)' }}>{fmtKm(leg.distance)} · {fmtMin(leg.duration)}</span>
                        </div>
                      )}
                      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'0.5px solid var(--border)' }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:'#b8892a22', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:700, color:'#b8892a' }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)' }}>{card.title || card.addr}</div>
                          <div style={{ fontSize:11, color:'var(--t3)', display:'flex', gap:8 }}>
                            {card.card_time && <span><i className="ti ti-clock" style={{ fontSize:10 }} /> {card.card_time.slice(0,5)}</span>}
                            {card.client_name && <span><i className="ti ti-building" style={{ fontSize:10 }} /> {card.client_name}</span>}
                          </div>
                        </div>
                        {card.addr && (
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(card.addr)}`} target="_blank" rel="noopener"
                            style={{ color:'#b8892a', fontSize:11, textDecoration:'none', display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
                            <i className="ti ti-map-pin" style={{ fontSize:12 }} />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* End: home */}
                {legs[dayCards.length] && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 14px 4px 52px', background:'var(--bg3)', borderBottom:'0.5px solid var(--border)' }}>
                    <i className="ti ti-arrow-down" style={{ fontSize:10, color:'var(--t3)' }} />
                    <span style={{ fontSize:10, color:'var(--t3)' }}>{fmtKm(legs[dayCards.length].distance)} · {fmtMin(legs[dayCards.length].duration)}</span>
                  </div>
                )}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'#15803d22', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <i className="ti ti-home" style={{ fontSize:13, color:'#15803d' }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#15803d' }}>Heimkehr</div>
                    <div style={{ fontSize:12, color:'var(--t2)' }}>{currentStaff?.address || '—'}</div>
                  </div>
                  {totalDayKm > 0 && <span style={{ fontSize:12, fontWeight:700, color:'#b8892a' }}>{fmtKm(totalDayKm)} gesamt</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
