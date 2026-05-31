'use client'
import { useState, useEffect } from 'react'

const STATUS_LABELS = {
  approved: { label: 'Bestätigt', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  pending:  { label: 'Ausstehend', color: '#b8892a', bg: '#fffbeb', border: '#fde68a' },
  canceled: { label: 'Storniert', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  rejected: { label: 'Abgelehnt', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
  'no-show':{ label: 'Nicht erschienen', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
}

export default function AmeliaView({ staff, me }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all | pending | approved
  const [empFilter, setEmpFilter] = useState('mine')
  const [employees, setEmployees] = useState([])
  const [updating, setUpdating] = useState(null)
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0,10))

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    loadAppointments()
  }, [filter, empFilter, dateFrom])

  async function loadEmployees() {
    try {
      const r = await fetch('/api/amelia?action=employees')
      const d = await r.json()
      if (d.ok) setEmployees(d.employees || [])
    } catch(e) {}
  }

  async function loadAppointments() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ action: 'appointments', date_from: dateFrom, limit: '100' })
      if (filter !== 'all') params.set('status', filter)

      // Filter by employee
      if (empFilter === 'mine' && me?.email) {
        const myEmp = employees.find(e => e.email === me.email)
        if (myEmp) params.set('employee_id', myEmp.id)
      }

      const r = await fetch('/api/amelia?' + params)
      const d = await r.json()
      if (d.ok) setAppointments(d.appointments || [])
      else setError(d.reason || 'Fehler beim Laden')
    } catch(e) {
      setError('Verbindungsfehler — ist das WordPress Plugin aktiv?')
    }
    setLoading(false)
  }

  async function updateStatus(id, status) {
    setUpdating(id)
    try {
      await fetch('/api/amelia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', id, status })
      })
      setAppointments(p => p.map(a => a.id == id ? {...a, status} : a))
    } catch(e) {}
    setUpdating(null)
  }

  function fmtDate(s) {
    if (!s) return '—'
    const d = new Date(s)
    return d.toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'2-digit', year:'2-digit' }) + ' ' + d.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' })
  }

  const ST = { fontSize:10, fontWeight:700, letterSpacing:'.4px', textTransform:'uppercase', padding:'2px 8px', borderRadius:10, display:'inline-block' }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'var(--bg)', fontFamily:'Arial,sans-serif' }}>
      {/* Header */}
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:14, fontWeight:700, color:'var(--t1)', display:'flex', alignItems:'center', gap:6 }}>
          <i className="ti ti-calendar-check" style={{ fontSize:16, color:'#b8892a' }} /> Amelia Termine
        </span>
        <div style={{ display:'flex', gap:6, marginLeft:'auto', flexWrap:'wrap' }}>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            style={{ border:'0.5px solid var(--border)', borderRadius:6, padding:'4px 8px', fontSize:11, background:'var(--bg3)', color:'var(--t1)', outline:'none' }} />
          {['all','pending','approved','canceled'].map(s => (
            <button key={s} onClick={()=>setFilter(s)}
              style={{ padding:'4px 10px', borderRadius:6, border:'0.5px solid '+(filter===s?'#b8892a':'var(--border)'), background:filter===s?'#b8892a14':'var(--bg3)', color:filter===s?'#b8892a':'var(--t2)', fontSize:11, fontWeight:filter===s?700:400, cursor:'pointer' }}>
              {s === 'all' ? 'Alle' : STATUS_LABELS[s]?.label || s}
            </button>
          ))}
          <button onClick={()=>setEmpFilter(p=>p==='mine'?'all':'mine')}
            style={{ padding:'4px 10px', borderRadius:6, border:'0.5px solid '+(empFilter==='mine'?'#b8892a':'var(--border)'), background:empFilter==='mine'?'#b8892a14':'var(--bg3)', color:empFilter==='mine'?'#b8892a':'var(--t2)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
            {empFilter === 'mine' ? '👤 Meine' : '👥 Alle'}
          </button>
          <button onClick={loadAppointments} style={{ padding:'4px 8px', borderRadius:6, border:'0.5px solid var(--border)', background:'var(--bg3)', color:'var(--t3)', fontSize:11, cursor:'pointer' }}>
            <i className="ti ti-refresh" style={{ fontSize:12 }} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>
        {loading && <div style={{ textAlign:'center', padding:40, color:'var(--t3)', fontSize:13 }}>Wird geladen...</div>}
        {error && (
          <div style={{ background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:10, padding:16, color:'#b91c1c', fontSize:13 }}>
            <i className="ti ti-alert-circle" style={{ fontSize:14 }} /> {error}
            <div style={{ marginTop:8, fontSize:11, color:'#8a8278' }}>
              Stelle sicher dass das WordPress Plugin aktiv ist und AMELIA_WP_URL + AMELIA_API_KEY in Vercel konfiguriert sind.
            </div>
          </div>
        )}
        {!loading && !error && appointments.length === 0 && (
          <div style={{ textAlign:'center', padding:40, color:'var(--t3)', fontSize:13 }}>Keine Termine gefunden</div>
        )}
        {!loading && !error && appointments.map(a => {
          const st = STATUS_LABELS[a.status] || STATUS_LABELS.pending
          const isUpdating = updating == a.id
          return (
            <div key={a.id} style={{ background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:10, padding:'12px 14px', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', marginBottom:3 }}>{a.service_name || 'Service'}</div>
                  <div style={{ fontSize:11, color:'var(--t3)', display:'flex', alignItems:'center', gap:4 }}>
                    <i className="ti ti-calendar" style={{ fontSize:11 }} /> {fmtDate(a.bookingStart)}
                    {a.bookingEnd && <> – {new Date(a.bookingEnd).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</>}
                  </div>
                </div>
                <span style={{ ...ST, background:st.bg, color:st.color, border:'0.5px solid '+st.border }}>{st.label}</span>
              </div>

              {a.customer_names && (
                <div style={{ fontSize:11, color:'var(--t2)', marginBottom:4, display:'flex', alignItems:'center', gap:4 }}>
                  <i className="ti ti-user" style={{ fontSize:11 }} /> {a.customer_names}
                  {a.customer_phones && <span style={{ color:'var(--t3)' }}> · {a.customer_phones}</span>}
                </div>
              )}
              {a.employee_name && (
                <div style={{ fontSize:11, color:'var(--t3)', marginBottom:8, display:'flex', alignItems:'center', gap:4 }}>
                  <i className="ti ti-id-badge" style={{ fontSize:11 }} /> {a.employee_name}
                </div>
              )}

              {a.status === 'pending' && (
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>updateStatus(a.id,'approved')} disabled={isUpdating}
                    style={{ padding:'5px 12px', borderRadius:6, border:'none', background:'#15803d', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', opacity:isUpdating?.6:1 }}>
                    <i className="ti ti-check" style={{ fontSize:11 }} /> Bestätigen
                  </button>
                  <button onClick={()=>updateStatus(a.id,'canceled')} disabled={isUpdating}
                    style={{ padding:'5px 12px', borderRadius:6, border:'0.5px solid #fecaca', background:'#fef2f2', color:'#b91c1c', fontSize:11, fontWeight:700, cursor:'pointer', opacity:isUpdating?.6:1 }}>
                    <i className="ti ti-x" style={{ fontSize:11 }} /> Stornieren
                  </button>
                </div>
              )}
              {a.status === 'approved' && (
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>updateStatus(a.id,'no-show')} disabled={isUpdating}
                    style={{ padding:'5px 12px', borderRadius:6, border:'0.5px solid #ddd6fe', background:'#f5f3ff', color:'#7c3aed', fontSize:11, fontWeight:600, cursor:'pointer', opacity:isUpdating?.6:1 }}>
                    Nicht erschienen
                  </button>
                  <button onClick={()=>updateStatus(a.id,'canceled')} disabled={isUpdating}
                    style={{ padding:'5px 12px', borderRadius:6, border:'0.5px solid #fecaca', background:'#fef2f2', color:'#b91c1c', fontSize:11, fontWeight:600, cursor:'pointer', opacity:isUpdating?.6:1 }}>
                    Stornieren
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
