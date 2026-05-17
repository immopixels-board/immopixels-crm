'use client'
import React, { useState, useEffect, useRef } from 'react'

var STAFF_COLORS_MAP = {
  '#b8892a': '#b8892a', '#7BBFCB': '#7BBFCB',
  '#D4869B': '#D4869B', '#9CAF88': '#9CAF88',
  '#A67B5B': '#A67B5B',
}

function getStatusColor(status) {
  return status==='online'?'#15803d':status==='away'?'#f59e0b':'#8a8278'
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('de', { hour:'2-digit', minute:'2-digit' })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('de', { weekday:'short', day:'2-digit', month:'2-digit' })
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1 // Monday = 0
}

function WeekView({ currentDate, getEventsForDate, today, onEventClick }) {
  const startOfWeek = new Date(currentDate)
  const day = startOfWeek.getDay()
  startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1))
  const days = Array.from({length: 7}, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(d.getDate() + i)
    return d
  })
  const hours = Array.from({length: 12}, (_, i) => i + 8) // 8-19

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7, 1fr)', minWidth: 600 }}>
      <div style={{ borderRight: '0.5px solid var(--border)' }} />
      {days.map(d => {
        const dateStr = d.toISOString().slice(0, 10)
        const isToday = dateStr === today
        const isWeekend = d.getDay() === 0 || d.getDay() === 6
        return (
          <div key={dateStr} style={{ padding: '6px 4px', textAlign: 'center', borderRight: '0.5px solid var(--border)', borderBottom: '1px solid var(--border)', background: isToday ? 'rgba(184,137,42,.06)' : 'var(--bg3)' }}>
            <div style={{ fontSize: 9, color: isWeekend ? 'var(--red)' : 'var(--t3)', fontWeight: 700, textTransform: 'uppercase' }}>
              {d.toLocaleDateString('de', { weekday: 'short' })}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: isToday ? 'var(--gold)' : isWeekend ? 'var(--red)' : 'var(--t1)' }}>
              {d.getDate()}
            </div>
          </div>
        )
      })}
      {hours.map(h => (
        <React.Fragment key={h}>
          <div style={{ borderRight: '0.5px solid var(--border)', padding: '4px 4px 0', fontSize: 9, color: 'var(--t3)', textAlign: 'right', height: 40, borderBottom: '0.5px solid var(--border)' }}>
            {String(h).padStart(2,'0')}:00
          </div>
          {days.map(d => {
            const dateStr = d.toISOString().slice(0, 10)
            const evs = getEventsForDate(dateStr).filter(e => {
              if (!e.time) return h === 8
              const evH = parseInt(e.time.slice(0, 2))
              return evH === h
            })
            return (
              <div key={dateStr + h} style={{ height: 40, borderRight: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)', padding: 2, position: 'relative' }}>
                {evs.map(ev => (
                  <div key={ev.id} onClick={() => onEventClick(ev)}
                    style={{ background: ev.color, color: '#fff', borderRadius: 3, padding: '1px 4px', fontSize: 9, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', marginBottom: 1 }}>
                    {ev.time && ev.time.slice(0,5) + ' '}{ev.title}
                  </div>
                ))}
              </div>
            )
          })}
        </React.Fragment>
      ))}
    </div>
  )
}


function DayView({ currentDate, getEventsForDate, today, onEventClick }) {
  const dateStr = currentDate.toISOString().slice(0, 10)
  const dayEvents = getEventsForDate(dateStr)
  const hours = Array.from({length: 14}, (_, i) => i + 7) // 7-20

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
      {dayEvents.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--t3)', fontSize: 13, padding: 40 }}>
          <i className="ti ti-calendar-off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
          Keine Termine
        </div>
      )}
      {hours.map(h => {
        const evs = dayEvents.filter(e => {
          if (!e.time) return h === 8
          return parseInt(e.time.slice(0, 2)) === h
        })
        return (
          <div key={h} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 0, borderBottom: '0.5px solid var(--border)', minHeight: 48 }}>
            <div style={{ padding: '6px 8px 0 0', fontSize: 10, color: 'var(--t3)', textAlign: 'right', fontWeight: 600 }}>
              {String(h).padStart(2,'0')}:00
            </div>
            <div style={{ padding: '4px 0 4px 12px', borderLeft: '2px solid var(--border)' }}>
              {evs.map(ev => (
                <div key={ev.id} onClick={() => onEventClick(ev)}
                  style={{ background: ev.color+'18', borderLeft: '3px solid ' + ev.color, borderRadius: '0 8px 8px 0', padding: '6px 10px', marginBottom: 4, cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background=ev.color+'28'}
                  onMouseLeave={e => e.currentTarget.style.background=ev.color+'18'}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>
                    {ev.time && <span style={{ color: ev.color, marginRight: 6 }}>{ev.time.slice(0,5)}</span>}
                    {ev.title}
                  </div>
                  {ev.staffList?.length > 0 && (
                    <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                      {ev.staffList.map(s => (
                        <div key={s.id} style={{ width: 16, height: 16, borderRadius: '50%', background: s.color+'22', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, overflow: 'hidden' }}>
                          {s.avatar_url?<img src={s.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:s.init}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function GoogleCalendarView({ staff, me, supabase, cols, onImported }) {
  const [view, setView] = useState('month') // 'month' | 'week' | 'day'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [gcalConnected, setGcalConnected] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [filterStaff, setFilterStaff] = useState([]) // empty = show all

  useEffect(() => {
    // Check if Google Calendar is connected
    const token = localStorage.getItem('gcal_token')
    if (token) {
      setGcalConnected(true)
      loadEvents(token)
    }
    // Also load cards as events
    loadCardEvents()
  }, [currentDate])

  async function loadCardEvents() {
    setLoading(true)
    const { data } = await supabase
      .from('cards')
      .select('*, card_team(staff_id)')
      .not('card_date', 'is', null)
    if (data) {
      const cardEvents = data.map(card => {
        const assignedStaff = card.card_team?.map(ct => staff.find(s => s.id === ct.staff_id)).filter(Boolean) || []
        const primaryStaff = assignedStaff[0]
        return {
          id: 'card-' + card.id,
          title: card.title,
          date: card.card_date,
          time: card.card_time,
          type: card.card_type,
          color: primaryStaff?.color || '#b8892a',
          staffList: assignedStaff,
          source: 'card',
          card,
        }
      })
      setEvents(cardEvents)
    }
    setLoading(false)
  }

  async function loadEvents(token) {
    try {
      const now = new Date(currentDate)
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
      const resp = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: 'Bearer ' + token } }
      )
      if (resp.status === 401) {
        localStorage.removeItem('gcal_token')
        setGcalConnected(false)
        return
      }
      const data = await resp.json()
      const gcalEvents = (data.items || []).map(ev => ({
        id: 'gcal-' + ev.id,
        title: ev.summary || '(Kein Titel)',
        date: (ev.start.dateTime || ev.start.date || '').slice(0, 10),
        time: ev.start.dateTime ? new Date(ev.start.dateTime).toTimeString().slice(0, 5) : null,
        color: me?.color || '#b8892a',
        staffList: [me].filter(Boolean),
        source: 'gcal',
        gcalEvent: ev,
      }))
      setEvents(prev => {
        const cardEvts = prev.filter(e => e.source === 'card')
        return [...cardEvts, ...gcalEvents]
      })
    } catch(e) { console.warn('GCal load error:', e) }
  }

  function connectGoogle() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const redirect = window.location.origin + '/auth/google/callback'
    const scope = 'https://www.googleapis.com/auth/calendar.readonly'
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&scope=${encodeURIComponent(scope)}`
    window.open(url, '_blank', 'width=500,height=600')
    // Listen for token from popup
    const handler = (e) => {
      if (e.data?.type === 'gcal_token') {
        localStorage.setItem('gcal_token', e.data.token)
        setGcalConnected(true)
        loadEvents(e.data.token)
        window.removeEventListener('message', handler)
        // Save token to Supabase for cron jobs
        if (me?.id) {
          const exp = new Date(); exp.setHours(exp.getHours() + 1)
          supabase.from('gcal_tokens').upsert({
            staff_id: me.id,
            access_token: e.data.token,
            expires_at: exp.toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'staff_id' }).then(() => {})
        }
      }
    }
    window.addEventListener('message', handler)
  }

  function navigate(dir) {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setDate(d.getDate() + dir)
    setCurrentDate(d)
  }

  function getEventsForDate(dateStr) {
    return events.filter(e => {
      if (e.date !== dateStr) return false
      if (filterStaff.length > 0) {
        return e.staffList?.some(s => filterStaff.includes(s.id))
      }
      return true
    }).sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'))
  }

  const today = new Date().toISOString().slice(0, 10)
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const monthLabel = currentDate.toLocaleDateString('de', { month: 'long', year: 'numeric' })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: 18, padding: '0 6px' }}>‹</button>
        <div style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>{monthLabel}</div>
        <button onClick={() => setCurrentDate(new Date())} style={{ background: 'var(--gdbg)', border: '0.5px solid var(--gdbr)', color: 'var(--gold)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Heute</button>
        <button onClick={() => navigate(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: 18, padding: '0 6px' }}>›</button>
        {/* View switcher */}
        <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 8, padding: 2, gap: 2 }}>
          {['month','week','day'].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ background: view===v ? 'var(--bg2)' : 'none', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: view===v ? 'var(--t1)' : 'var(--t3)', cursor: 'pointer', boxShadow: view===v ? 'var(--sh)' : 'none' }}>
              {v==='month'?'Monat':v==='week'?'Woche':'Tag'}
            </button>
          ))}
        </div>
        {/* Google Calendar connect */}
        {!gcalConnected ? (
          <button onClick={connectGoogle}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '1px solid #ddd9d2', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#4a4640' }}>
            <i className="ti ti-brand-google" style={{ fontSize: 13, color: '#4285F4' }} />
            Google verbinden
          </button>
        ) : (
          <span style={{ fontSize: 10, color: '#15803d', display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-brand-google" style={{ fontSize: 12 }} /> Verbunden
          </span>
        )}
      </div>

      {/* Staff filter */}
      <div style={{ padding: '6px 16px', display: 'flex', gap: 6, alignItems: 'center', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)', flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Filter:</span>
        {staff.map(s => (
          <div key={s.id} onClick={() => setFilterStaff(p => p.includes(s.id) ? p.filter(x=>x!==s.id) : [...p, s.id])}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, border: '1px solid ' + (filterStaff.includes(s.id) || filterStaff.length===0 ? s.color : 'var(--border)'), background: filterStaff.includes(s.id) ? s.color+'22' : 'none', cursor: 'pointer', transition: 'all .15s' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: s.color+'22', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
              {s.avatar_url ? <img src={s.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : s.init}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: filterStaff.includes(s.id) ? s.color : 'var(--t2)' }}>{s.name.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        {view === 'month' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, minWidth: 600 }}>
            {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => (
              <div key={d} style={{ padding: '6px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: (d==='Sa'||d==='So') ? 'var(--red)' : 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.4px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', borderRight: '0.5px solid var(--border)' }}>{d}</div>
            ))}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={'empty-' + i} style={{ minHeight: 80, background: 'var(--bg3)', borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', opacity: 0.5 }} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const dayEvents = getEventsForDate(dateStr)
              const isToday = dateStr === today
              const isWeekend = (new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6)
              return (
                <div key={day} style={{ minHeight: 80, padding: '4px 5px', background: isToday ? 'rgba(184,137,42,.04)' : isWeekend ? 'rgba(185,28,28,.02)' : 'var(--bg2)', borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', position: 'relative' }}>
                  <div style={{ width: isToday ? 22 : 'auto', height: isToday ? 22 : 'auto', borderRadius: isToday ? '50%' : 0, background: isToday ? 'var(--gold)' : 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: isToday ? 700 : 600, color: isToday ? '#fff' : isWeekend ? 'var(--red)' : 'var(--t1)', marginBottom: 3 }}>{day}</div>
                  {dayEvents.slice(0, 3).map(ev => (
                    <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                      style={{ background: ev.color, color: '#fff', borderRadius: 3, padding: '1px 5px', fontSize: 9, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {ev.time && <span style={{ opacity: 0.8 }}>{ev.time.slice(0,5)}</span>}
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 600 }}>+{dayEvents.length - 3} mehr</div>}
                </div>
              )
            })}
          </div>
        )}

        {view === 'week' && (
          <WeekView currentDate={currentDate} getEventsForDate={getEventsForDate} today={today} onEventClick={setSelectedEvent} />
        )}

        {view === 'day' && (
          <DayView currentDate={currentDate} getEventsForDate={getEventsForDate} today={today} onEventClick={setSelectedEvent} />
        )}
      </div>

      {/* Event detail popup */}
      {selectedEvent && (
        <div onClick={()=>setSelectedEvent(null)} style={{ position:'fixed', inset:0, background:'rgba(28,26,22,.4)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg2)', borderRadius:13, padding:22, width:400, maxWidth:'95vw', boxShadow:'0 20px 60px rgba(0,0,0,.16)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:12, height:12, borderRadius:'50%', background:selectedEvent.color, flexShrink:0 }} />
              <div style={{ fontSize:15, fontWeight:700, flex:1 }}>{selectedEvent.title}</div>
              <button onClick={()=>setSelectedEvent(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'var(--t3)' }}>×</button>
            </div>
            <div style={{ fontSize:13, color:'var(--t2)', marginBottom:8 }}>
              <i className="ti ti-calendar" style={{fontSize:12,marginRight:6}}/>
              {formatDate(selectedEvent.date)}{selectedEvent.time && ' · ' + selectedEvent.time}
            </div>
            {selectedEvent.staffList?.length > 0 && (
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:8 }}>
                {selectedEvent.staffList.map(s => (
                  <span key={s.id} style={{ display:'flex', alignItems:'center', gap:4, background:s.color+'22', color:s.color, borderRadius:20, padding:'3px 9px', fontSize:11, fontWeight:600 }}>
                    <div style={{ width:16, height:16, borderRadius:'50%', background:s.color+'33', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, fontWeight:700 }}>
                      {s.avatar_url?<img src={s.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:s.init}
                    </div>
                    {s.name}
                  </span>
                ))}
              </div>
            )}
            {selectedEvent.source === 'gcal' && selectedEvent.gcalEvent?.htmlLink && (
              <a href={selectedEvent.gcalEvent.htmlLink} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:12, fontSize:12, color:'#4285F4', textDecoration:'none' }}>
                <i className="ti ti-brand-google" style={{fontSize:12}}/>
                In Google Calendar öffnen
              </a>
            )}
            {selectedEvent.source === 'gcal' && (
              <button onClick={async () => {
                setImporting(true)
                const importCol = cols?.find(c => c.title === 'GCal Import' && c.visible_to?.includes(me?.id))
                  || cols?.find(c => c.title === 'GCal Import')
                if (!importCol) { alert('Kein "GCal Import" Spalte gefunden. Bitte erst erstellen.'); setImporting(false); return }
                const ev = selectedEvent.gcalEvent
                const title = ev.summary || ''
                const date = (ev.start?.dateTime || ev.start?.date || '').slice(0,10)
                const time = ev.start?.dateTime ? new Date(ev.start.dateTime).toTimeString().slice(0,5) : null
                const desc = ev.description || ''
                await supabase.from('cards').insert({
                  column_id: importCol.id,
                  title,
                  addr: ev.location || '',
                  description: desc,
                  card_date: date,
                  card_time: time,
                  is_gcal: true,
                  card_type: 'foto',
                  is_todo: false,
                  price: 0,
                  position: 9999,
                  note: '',
                })
                setImporting(false)
                setImported(true)
                setTimeout(() => setImported(false), 2000)
                setSelectedEvent(null)
                if (onImported) onImported()
              }} disabled={importing} style={{ display:'flex', alignItems:'center', gap:6, marginTop:10, background: imported ? '#15803d' : '#b8892a', color:'#fff', border:'none', borderRadius:7, padding:'8px 14px', fontSize:12, fontWeight:700, cursor:'pointer', width:'100%', justifyContent:'center' }}>
                <i className="ti ti-download" style={{fontSize:12}}/>
                {importing ? 'Wird importiert...' : imported ? '✓ Importiert' : 'Auf Board importieren'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
