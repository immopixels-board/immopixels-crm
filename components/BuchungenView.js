'use client'
import { useState, useEffect } from 'react'

const STATUS = {
  confirmed:{ label:'Bestätigt', color:'#15803d', bg:'#f0fdf4', border:'#bbf7d0' },
  pending:  { label:'In Prüfung', color:'#b8892a', bg:'#fffbeb', border:'#fde68a' },
  cancelled:{ label:'Storniert', color:'#b91c1c', bg:'#fef2f2', border:'#fecaca' },
}
const DAYS = ['Mo','Di','Mi','Do','Fr','Sa','So']

function mondayOf(d){ const x=new Date(d); const w=(x.getDay()+6)%7; x.setDate(x.getDate()-w); x.setHours(12,0,0,0); return x }
function iso(d){ return d.toISOString().slice(0,10) }

export default function BuchungenView({ supabase, staff }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [mode, setMode] = useState('list') // list | calendar
  const [weekStart, setWeekStart] = useState(()=>mondayOf(new Date()))
  const [updating, setUpdating] = useState(null)

  // edit modal
  const [editTok, setEditTok] = useState(null)
  const [ef, setEf] = useState(null)
  const [slots, setSlots] = useState([])
  const [warnTimes, setWarnTimes] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(()=>{ load() }, [filter])

  async function load() {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (filter!=='all') p.set('status', filter)
      const r = await fetch('/api/booking/list?'+p)
      const d = await r.json()
      setBookings(d.ok ? d.bookings : [])
    } catch(e){ setBookings([]) }
    setLoading(false)
  }

  async function act(token, kind) {
    if (kind==='cancel' && !confirm('Diesen Termin wirklich stornieren? Der Kunde wird per E-Mail informiert.')) return
    setUpdating(token)
    try { await fetch(`/api/booking/${kind}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token}) }); await load() }
    catch(e){ alert('Fehler') }
    setUpdating(null)
  }

  async function openEdit(token) {
    setEditTok(token); setEf(null); setSlots([]); setWarnTimes([])
    try {
      const r = await fetch(`/api/booking/manage?token=${token}`)
      const d = await r.json()
      if (!r.ok) throw new Error()
      setEf({
        date: d.card_date, time: String(d.card_time||'').slice(0,5),
        name: d.client_name||'', email: d.customer_email||'', phone: d.customer_phone||'',
        address: d.booking_address||'', note: d.description||'',
        addon360: !!d.addon_360, addonDrone: !!d.addon_drone,
        serviceId: d.booking_service_id, serviceName: d.serviceName,
        category: d.serviceCategory, status: d.booking_status,
      })
    } catch(e){ alert('Konnte Termin nicht laden'); setEditTok(null) }
  }

  const is360 = ef && ef.category!=='Gespräch'
  const isDrone = ef && ef.category==='Immobilienfotografie' && (ef.serviceName||'').toLowerCase().indexOf('drohne')===-1

  useEffect(()=>{
    if (!ef || !editTok || !ef.date) return
    setLoadingSlots(true)
    const a360=(is360&&ef.addon360)?1:0, aD=(isDrone&&ef.addonDrone)?1:0
    const ad = ef.address?`&address=${encodeURIComponent(ef.address)}`:''
    fetch(`/api/booking/slots?serviceId=${ef.serviceId}&date=${ef.date}&addon360=${a360}&addonDrone=${aD}${ad}`)
      .then(r=>r.json()).then(d=>{setSlots(d.times||[]);setWarnTimes(d.warnTimes||[])}).catch(()=>setSlots([])).finally(()=>setLoadingSlots(false))
  }, [ef?.date, ef?.addon360, ef?.addonDrone, editTok])

  async function saveEdit() {
    setSavingEdit(true)
    try {
      const r = await fetch('/api/booking/update', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          token: editTok, date: ef.date, time: ef.time, address: ef.address,
          customerName: ef.name, customerEmail: ef.email, customerPhone: ef.phone, note: ef.note,
          addon360: is360&&ef.addon360, addonDrone: isDrone&&ef.addonDrone,
        })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error==='slot_unavailable'?'Zeitpunkt nicht mehr verfügbar.':(d.error||'Fehler'))
      setEditTok(null); setEf(null); await load()
    } catch(e){ alert(e.message) }
    setSavingEdit(false)
  }

  function fmt(d,t){ if(!d) return '—'; return new Date(d+'T12:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})+' · '+String(t).slice(0,5) }
  const staffColor = init => staff?.find(s=>s.init===init)?.color || '#b8892a'

  // calendar week data
  const weekDays = Array.from({length:7},(_,i)=>{ const d=new Date(weekStart); d.setDate(d.getDate()+i); return d })
  const byDay = {}
  bookings.filter(b=>b.booking_status!=='cancelled').forEach(b=>{ (byDay[b.card_date] ??= []).push(b) })
  Object.values(byDay).forEach(arr=>arr.sort((a,b)=>String(a.card_time).localeCompare(String(b.card_time))))

  const ST = { fontSize:10, fontWeight:700, letterSpacing:'.4px', textTransform:'uppercase', padding:'2px 8px', borderRadius:10, display:'inline-block' }
  const inp = { width:'100%', padding:'9px 11px', fontSize:13, border:'0.5px solid var(--border)', borderRadius:7, boxSizing:'border-box', background:'var(--bg3)', color:'var(--t1)', outline:'none', fontFamily:'inherit' }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'var(--bg)', fontFamily:'Arial,sans-serif' }}>
      {/* Header */}
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:14, fontWeight:700, color:'var(--t1)', display:'flex', alignItems:'center', gap:6 }}>
          <i className="ti ti-calendar-plus" style={{ fontSize:16, color:'#b8892a' }} /> Buchungen
        </span>
        <div style={{ display:'flex', gap:4, background:'var(--bg3)', borderRadius:7, padding:2 }}>
          {['list','calendar'].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{ padding:'4px 12px', borderRadius:5, border:'none', background:mode===m?'#b8892a':'transparent', color:mode===m?'#fff':'var(--t3)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
              {m==='list'?'Liste':'Kalender'}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:6, marginLeft:'auto', flexWrap:'wrap' }}>
          {['all','pending','confirmed','cancelled'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)} style={{ padding:'4px 10px', borderRadius:6, border:'0.5px solid '+(filter===s?'#b8892a':'var(--border)'), background:filter===s?'#b8892a14':'var(--bg3)', color:filter===s?'#b8892a':'var(--t2)', fontSize:11, fontWeight:filter===s?700:400, cursor:'pointer' }}>
              {s==='all'?'Alle':STATUS[s]?.label||s}
            </button>
          ))}
          <a href="/admin/leistungen" target="_blank" rel="noopener" style={{ padding:'4px 10px', borderRadius:6, border:'0.5px solid var(--border)', background:'var(--bg3)', color:'var(--t2)', fontSize:11, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
            <i className="ti ti-settings" style={{fontSize:12}} /> Leistungen
          </a>
          <a href="/buchen" target="_blank" rel="noopener" style={{ background:'#b8892a', color:'#fff', borderRadius:6, padding:'4px 12px', fontSize:11, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:5 }}>
            <i className="ti ti-external-link" style={{fontSize:11}} /> Buchungsseite
          </a>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>
        {loading ? <div style={{ textAlign:'center', padding:40, color:'var(--t3)', fontSize:13 }}>Wird geladen...</div>
        : mode==='list' ? (
          bookings.length===0 ? <div style={{ textAlign:'center', padding:40, color:'var(--t3)', fontSize:13 }}>Keine Buchungen gefunden</div>
          : bookings.map(b=>{
            const st = STATUS[b.booking_status]||STATUS.pending
            const isUp = updating===b.booking_token
            return (
              <div key={b.id} style={{ background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:10, padding:'12px 14px', marginBottom:8, borderLeft:`3px solid ${staffColor(b.staff?.init)}` }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:8 }}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{b.serviceName}</div>
                    <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}><i className="ti ti-calendar" style={{fontSize:11}} /> {fmt(b.card_date,b.card_time)} Uhr {b.staff && <>· <span style={{color:staffColor(b.staff.init),fontWeight:700}}>{b.staff.name}</span></>}</div>
                  </div>
                  <span style={{ ...ST, background:st.bg, color:st.color, border:'0.5px solid '+st.border }}>{st.label}</span>
                </div>
                <div style={{ fontSize:11, color:'var(--t2)', lineHeight:1.7 }}>
                  <div><i className="ti ti-user" style={{fontSize:11}} /> {b.client_name} · {b.customer_phone||'—'}</div>
                  <div><i className="ti ti-mail" style={{fontSize:11}} /> {b.customer_email}</div>
                  <div><i className="ti ti-map-pin" style={{fontSize:11}} /> {b.booking_address}</div>
                  {b.description && <div style={{whiteSpace:'pre-line',background:'var(--bg3)',borderRadius:6,padding:'6px 8px',marginTop:4,color:'var(--t3)'}}>{b.description}</div>}
                </div>
                <div style={{ display:'flex', gap:6, marginTop:10 }}>
                  {b.booking_status==='pending' && (
                    <button onClick={()=>act(b.booking_token,'confirm')} disabled={isUp} style={{ padding:'5px 12px', borderRadius:6, border:'none', background:'#15803d', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', opacity:isUp?.6:1 }}>
                      <i className="ti ti-check" style={{fontSize:11}} /> Bestätigen
                    </button>
                  )}
                  {b.booking_status!=='cancelled' && <>
                    <button onClick={()=>openEdit(b.booking_token)} disabled={isUp} style={{ padding:'5px 12px', borderRadius:6, border:'0.5px solid var(--border)', background:'var(--bg3)', color:'var(--t2)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                      <i className="ti ti-pencil" style={{fontSize:11}} /> Bearbeiten
                    </button>
                    <button onClick={()=>act(b.booking_token,'cancel')} disabled={isUp} style={{ padding:'5px 12px', borderRadius:6, border:'0.5px solid #fecaca', background:'#fef2f2', color:'#b91c1c', fontSize:11, fontWeight:700, cursor:'pointer', opacity:isUp?.6:1 }}>
                      <i className="ti ti-x" style={{fontSize:11}} /> Stornieren
                    </button>
                  </>}
                </div>
              </div>
            )
          })
        ) : (
          // CALENDAR (week) view
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14, marginBottom:12 }}>
              <button onClick={()=>{const d=new Date(weekStart);d.setDate(d.getDate()-7);setWeekStart(d)}} style={{ background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:6, padding:'4px 10px', cursor:'pointer', color:'var(--t2)' }}>‹</button>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{weekDays[0].toLocaleDateString('de-DE',{day:'2-digit',month:'short'})} – {weekDays[6].toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'})}</span>
              <button onClick={()=>{const d=new Date(weekStart);d.setDate(d.getDate()+7);setWeekStart(d)}} style={{ background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:6, padding:'4px 10px', cursor:'pointer', color:'var(--t2)' }}>›</button>
              <button onClick={()=>setWeekStart(mondayOf(new Date()))} style={{ background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:6, padding:'4px 10px', cursor:'pointer', color:'var(--t3)', fontSize:11 }}>Heute</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6 }}>
              {weekDays.map((d,i)=>{
                const ds = iso(d)
                const items = byDay[ds]||[]
                const isToday = ds===iso(new Date())
                return (
                  <div key={ds} style={{ background:'var(--bg2)', border:'0.5px solid '+(isToday?'#b8892a':'var(--border)'), borderRadius:8, minHeight:120, padding:6 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:isToday?'#b8892a':'var(--t3)', textAlign:'center', marginBottom:6, textTransform:'uppercase' }}>{DAYS[i]} {d.getDate()}</div>
                    {items.map(b=>{
                      const st = STATUS[b.booking_status]||STATUS.pending
                      return (
                        <div key={b.id} onClick={()=>openEdit(b.booking_token)} title={`${b.client_name} · ${b.serviceName}`}
                          style={{ background:st.bg, borderLeft:`3px solid ${staffColor(b.staff?.init)}`, borderRadius:5, padding:'4px 6px', marginBottom:4, cursor:'pointer' }}>
                          <div style={{ fontSize:10, fontWeight:700, color:st.color }}>{String(b.card_time).slice(0,5)}</div>
                          <div style={{ fontSize:10, color:'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.client_name}</div>
                          <div style={{ fontSize:9, color:'var(--t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.serviceName}</div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editTok && (
        <div onClick={()=>{setEditTok(null);setEf(null)}} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg2)', borderRadius:14, padding:24, maxWidth:480, width:'100%', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--t1)', marginBottom:4 }}>Termin bearbeiten</div>
            {!ef ? <div style={{color:'var(--t3)',padding:20}}>Wird geladen…</div> : <>
              <div style={{ fontSize:12, color:'var(--t3)', marginBottom:14 }}>{ef.serviceName} · Änderungen werden an Kunde + Team gemailt und im Kalender aktualisiert.</div>
              <label style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase'}}>Datum</label>
              <input type="date" value={ef.date} onChange={e=>setEf({...ef,date:e.target.value,time:''})} style={{...inp,margin:'4px 0 10px'}} />
              <label style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase'}}>Uhrzeit</label>
              {loadingSlots ? <div style={{fontSize:12,color:'var(--t3)',padding:8}}>Lädt…</div> :
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:5,margin:'4px 0 10px'}}>
                  {slots.length===0 ? <div style={{gridColumn:'1/-1',fontSize:11,color:'#b91c1c'}}>Keine freien Zeiten</div>
                  : slots.map(t=>(
                    <button key={t} onClick={()=>setEf({...ef,time:t})} title={warnTimes.includes(t)?'Knapp wegen Anfahrt':''}
                      style={{padding:'7px 0',fontSize:12,borderRadius:6,cursor:'pointer',border:'0.5px solid '+(ef.time===t?'#b8892a':(warnTimes.includes(t)?'#e0a82e':'var(--border)')),background:ef.time===t?'#b8892a':(warnTimes.includes(t)?'#fffbf0':'var(--bg3)'),color:ef.time===t?'#fff':'var(--t2)',fontWeight:ef.time===t?700:400}}>
                      {t}{warnTimes.includes(t)?'⚠':''}
                    </button>
                  ))}
                </div>}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                <div><label style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase'}}>Name</label><input value={ef.name} onChange={e=>setEf({...ef,name:e.target.value})} style={{...inp,marginTop:4}} /></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase'}}>Telefon</label><input value={ef.phone} onChange={e=>setEf({...ef,phone:e.target.value})} style={{...inp,marginTop:4}} /></div>
              </div>
              <label style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase'}}>E-Mail</label>
              <input value={ef.email} onChange={e=>setEf({...ef,email:e.target.value})} style={{...inp,margin:'4px 0 8px'}} />
              <label style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase'}}>Adresse</label>
              <input value={ef.address} onChange={e=>setEf({...ef,address:e.target.value})} style={{...inp,margin:'4px 0 8px'}} />
              {(is360||isDrone) && <div style={{display:'flex',gap:14,margin:'2px 0 8px'}}>
                {is360 && <label style={{fontSize:12,display:'flex',gap:5,alignItems:'center',color:'var(--t2)',cursor:'pointer'}}><input type="checkbox" checked={ef.addon360} onChange={e=>setEf({...ef,addon360:e.target.checked,time:''})} /> 360° (+30m)</label>}
                {isDrone && <label style={{fontSize:12,display:'flex',gap:5,alignItems:'center',color:'var(--t2)',cursor:'pointer'}}><input type="checkbox" checked={ef.addonDrone} onChange={e=>setEf({...ef,addonDrone:e.target.checked,time:''})} /> Drohne (+15m)</label>}
              </div>}
              <label style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase'}}>Anmerkung</label>
              <textarea value={ef.note} onChange={e=>setEf({...ef,note:e.target.value})} style={{...inp,minHeight:60,resize:'vertical',margin:'4px 0 14px'}} />
              <div style={{display:'flex',gap:8}}>
                <button onClick={saveEdit} disabled={savingEdit||!ef.date||!ef.time} style={{flex:1,padding:'11px',background:(ef.date&&ef.time)?'#b8892a':'#ccc',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:(ef.date&&ef.time)?'pointer':'default'}}>
                  {savingEdit?'Wird gespeichert…':'Speichern & benachrichtigen'}
                </button>
                <button onClick={()=>{setEditTok(null);setEf(null)}} style={{padding:'11px 18px',background:'none',border:'0.5px solid var(--border)',borderRadius:8,color:'var(--t3)',fontSize:13,cursor:'pointer'}}>Abbrechen</button>
              </div>
            </>}
          </div>
        </div>
      )}
    </div>
  )
}
