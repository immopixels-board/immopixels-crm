'use client'
import { useState, useEffect } from 'react'

const STATUS = {
  confirmed:{ label:'Bestätigt', color:'#15803d', bg:'#f0fdf4', border:'#bbf7d0' },
  pending:  { label:'In Prüfung', color:'#6b6b6e', bg:'#fffbeb', border:'#fde68a' },
  cancelled:{ label:'Storniert', color:'#b91c1c', bg:'#fef2f2', border:'#fecaca' },
}

export default function AmeliaView({ staff, me }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [updating, setUpdating] = useState(null)
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0,10))

  useEffect(() => { load() }, [filter, dateFrom])

  async function load() {
    setLoading(true)
    try {
      const p = new URLSearchParams({ date_from: dateFrom })
      if (filter !== 'all') p.set('status', filter)
      const r = await fetch('/api/booking/list?' + p)
      const d = await r.json()
      setBookings(d.ok ? d.bookings : [])
    } catch(e) { setBookings([]) }
    setLoading(false)
  }

  async function act(token, kind) {
    if (kind==='cancel' && !confirm('Diesen Termin wirklich stornieren?')) return
    setUpdating(token)
    try {
      await fetch(`/api/booking/${kind==='confirm'?'confirm':'cancel'}`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token})
      })
      await load()
    } catch(e) { alert('Fehler') }
    setUpdating(null)
  }

  function fmt(d,t) {
    if(!d) return '—'
    const dt = new Date(d+'T12:00')
    return dt.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'}) + ' · ' + String(t).slice(0,5) + ' Uhr'
  }

  const ST = { fontSize:10, fontWeight:700, letterSpacing:'.4px', textTransform:'uppercase', padding:'2px 8px', borderRadius:10, display:'inline-block' }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'var(--bg)', fontFamily:'Arial,sans-serif' }}>
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:14, fontWeight:700, color:'var(--t1)', display:'flex', alignItems:'center', gap:6 }}>
          <i className="ti ti-calendar-check" style={{ fontSize:16, color:'#6b6b6e' }} /> Online-Buchungen
        </span>
        <div style={{ display:'flex', gap:6, marginLeft:'auto', flexWrap:'wrap' }}>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            style={{ border:'0.5px solid var(--border)', borderRadius:6, padding:'4px 8px', fontSize:11, background:'var(--bg3)', color:'var(--t1)', outline:'none' }} />
          {['all','pending','confirmed','cancelled'].map(s => (
            <button key={s} onClick={()=>setFilter(s)}
              style={{ padding:'4px 10px', borderRadius:6, border:'0.5px solid '+(filter===s?'#6b6b6e':'var(--border)'), background:filter===s?'#6b6b6e14':'var(--bg3)', color:filter===s?'#6b6b6e':'var(--t2)', fontSize:11, fontWeight:filter===s?700:400, cursor:'pointer' }}>
              {s==='all'?'Alle':STATUS[s]?.label||s}
            </button>
          ))}
          <button onClick={load} style={{ padding:'4px 8px', borderRadius:6, border:'0.5px solid var(--border)', background:'var(--bg3)', color:'var(--t3)', fontSize:11, cursor:'pointer' }}>
            <i className="ti ti-refresh" style={{ fontSize:12 }} />
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>
        {loading && <div style={{ textAlign:'center', padding:40, color:'var(--t3)', fontSize:13 }}>Wird geladen...</div>}
        {!loading && bookings.length===0 && <div style={{ textAlign:'center', padding:40, color:'var(--t3)', fontSize:13 }}>Keine Buchungen gefunden</div>}
        {!loading && bookings.map(b => {
          const st = STATUS[b.booking_status] || STATUS.pending
          const isUp = updating===b.booking_token
          return (
            <div key={b.id} style={{ background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:10, padding:'12px 14px', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:8 }}>
                <div style={{flex:1}}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', marginBottom:3 }}>{b.serviceName}</div>
                  <div style={{ fontSize:11, color:'var(--t3)', display:'flex', alignItems:'center', gap:4 }}>
                    <i className="ti ti-calendar" style={{ fontSize:11 }} /> {fmt(b.card_date, b.card_time)}
                  </div>
                </div>
                <span style={{ ...ST, background:st.bg, color:st.color, border:'0.5px solid '+st.border }}>{st.label}</span>
              </div>
              <div style={{ fontSize:11, color:'var(--t2)', marginBottom:3 }}><i className="ti ti-user" style={{ fontSize:11 }} /> {b.client_name} · {b.customer_phone||'—'}</div>
              <div style={{ fontSize:11, color:'var(--t2)', marginBottom:3 }}><i className="ti ti-mail" style={{ fontSize:11 }} /> {b.customer_email}</div>
              <div style={{ fontSize:11, color:'var(--t2)', marginBottom:3 }}><i className="ti ti-map-pin" style={{ fontSize:11 }} /> {b.booking_address}</div>
              {b.staff && <div style={{ fontSize:11, color:'var(--t3)', marginBottom:8 }}><i className="ti ti-camera" style={{ fontSize:11 }} /> {b.staff.name}</div>}
              {b.description && <div style={{ fontSize:11, color:'var(--t3)', marginBottom:8, whiteSpace:'pre-line', background:'var(--bg3)', borderRadius:6, padding:'6px 8px' }}>{b.description}</div>}

              {b.booking_status==='pending' && (
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>act(b.booking_token,'confirm')} disabled={isUp}
                    style={{ padding:'5px 12px', borderRadius:6, border:'none', background:'#15803d', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', opacity:isUp?.6:1 }}>
                    <i className="ti ti-check" style={{ fontSize:11 }} /> Bestätigen
                  </button>
                  <button onClick={()=>act(b.booking_token,'cancel')} disabled={isUp}
                    style={{ padding:'5px 12px', borderRadius:6, border:'0.5px solid #fecaca', background:'#fef2f2', color:'#b91c1c', fontSize:11, fontWeight:700, cursor:'pointer', opacity:isUp?.6:1 }}>
                    <i className="ti ti-x" style={{ fontSize:11 }} /> Stornieren
                  </button>
                </div>
              )}
              {b.booking_status==='confirmed' && (
                <button onClick={()=>act(b.booking_token,'cancel')} disabled={isUp}
                  style={{ padding:'5px 12px', borderRadius:6, border:'0.5px solid #fecaca', background:'#fef2f2', color:'#b91c1c', fontSize:11, fontWeight:600, cursor:'pointer', opacity:isUp?.6:1 }}>
                  Stornieren
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
