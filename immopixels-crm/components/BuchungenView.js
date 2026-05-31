'use client'
import { useState, useEffect } from 'react'

const SERVICES = [
  { id:1, name:'Foto: Haus/Wohnung' },
  { id:2, name:'Foto: Villa/MFH' },
  { id:3, name:'Immobilien Reel' },
  { id:4, name:'Foto + Reel' },
  { id:5, name:'Drohnenaufnahmen' },
  { id:6, name:'Gesprächstermin' },
]

const PROVIDERS = [
  { init:'CD', name:'Cristian', color:'#b8892a' },
  { init:'DB', name:'Daniel',   color:'#1d5ec7' },
  { init:'EL', name:'Elias',    color:'#15803d' },
]

export default function BuchungenView({ supabase, staff }) {
  const [selDate, setSelDate] = useState(new Date().toISOString().slice(0,10))
  const [selService, setSelService] = useState(1)
  const [slots, setSlots] = useState([])
  const [debugInfo, setDebugInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [bookings, setBookings] = useState([])
  const [view, setView] = useState('availability') // availability | bookings | debug

  useEffect(() => { loadSlots() }, [selDate, selService])
  useEffect(() => { loadBookings() }, [selDate])

  async function loadSlots() {
    setLoading(true)
    try {
      const r = await fetch(`/api/booking/slots?serviceId=${selService}&date=${selDate}&debug=1`)
      const d = await r.json()
      setSlots(d.times || [])
      setDebugInfo(d)
    } catch(e) { setSlots([]) }
    setLoading(false)
  }

  async function loadBookings() {
    const { data } = await supabase.from('cards')
      .select('id,title,card_date,card_time,card_time_to,booking_source,customer_email,booking_service_id,card_team(staff_init)')
      .eq('card_date', selDate)
      .not('card_time','is',null)
      .order('card_time')
    setBookings(data||[])
  }

  function navigate(dir) {
    const d = new Date(selDate)
    d.setDate(d.getDate()+dir)
    setSelDate(d.toISOString().slice(0,10))
  }

  const dayLabel = new Date(selDate).toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})
  const hours = Array.from({length:10},(_,i)=>`${String(i+9).padStart(2,'0')}:00`)

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:'var(--bg)'}}>

      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <i className="ti ti-calendar-plus" style={{fontSize:15,color:'#b8892a'}} />
        <span style={{fontSize:14,fontWeight:700,color:'var(--t1)'}}>Buchungen</span>

        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <button onClick={()=>navigate(-1)} style={{background:'var(--bg3)',border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',cursor:'pointer',color:'var(--t2)',fontSize:14}}>‹</button>
          <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)}
            style={{border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',fontSize:12,background:'var(--bg3)',color:'var(--t1)',outline:'none'}} />
          <button onClick={()=>navigate(1)} style={{background:'var(--bg3)',border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',cursor:'pointer',color:'var(--t2)',fontSize:14}}>›</button>
        </div>

        <select value={selService} onChange={e=>setSelService(parseInt(e.target.value))}
          style={{border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',fontSize:12,background:'var(--bg3)',color:'var(--t1)',outline:'none'}}>
          {SERVICES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <div style={{display:'flex',gap:4,marginLeft:'auto'}}>
          {['availability','bookings','debug'].map(v=>(
            <button key={v} onClick={()=>setView(v)}
              style={{padding:'4px 10px',borderRadius:6,border:'0.5px solid '+(view===v?'#b8892a':'var(--border)'),background:view===v?'#b8892a14':'var(--bg3)',color:view===v?'#b8892a':'var(--t3)',fontSize:11,fontWeight:view===v?700:400,cursor:'pointer'}}>
              {v==='availability'?'Verfügbarkeit':v==='bookings'?'Termine':'Debug'}
            </button>
          ))}
        </div>

        <a href="/buchen" target="_blank" rel="noopener"
          style={{background:'#b8892a',color:'#fff',borderRadius:7,padding:'5px 12px',fontSize:11,fontWeight:700,textDecoration:'none',display:'flex',alignItems:'center',gap:5}}>
          <i className="ti ti-external-link" style={{fontSize:11}} /> Buchungsseite
        </a>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:'var(--t1)',marginBottom:12}}>{dayLabel}</div>

        {/* AVAILABILITY VIEW */}
        {view==='availability' && (
          <div>
            {loading ? <div style={{color:'var(--t3)',fontSize:12}}>⟳ Wird geladen...</div> : (
              <div>
                {/* Provider grid */}
                <div style={{display:'grid',gridTemplateColumns:'80px repeat(3,1fr)',gap:1,background:'var(--border)',borderRadius:8,overflow:'hidden',marginBottom:16}}>
                  {/* Header */}
                  <div style={{background:'var(--bg3)',padding:'8px',fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase'}}></div>
                  {PROVIDERS.map(pr=>(
                    <div key={pr.init} style={{background:'var(--bg3)',padding:'8px',fontSize:11,fontWeight:700,color:pr.color,textAlign:'center'}}>
                      {pr.name}
                    </div>
                  ))}
                  {/* Time slots */}
                  {hours.map(h=>(
                    <>
                      <div key={h+'_t'} style={{background:'var(--bg2)',padding:'6px 8px',fontSize:11,color:'var(--t3)',borderTop:'0.5px solid var(--border)'}}>{h}</div>
                      {PROVIDERS.map(pr=>{
                        // Check if this hour has available slots for this provider
                        const hasSlot = slots.some(s => s.startsWith(h.slice(0,2)))
                        const isBooked = bookings.some(b => b.card_time?.startsWith(h.slice(0,2)) && b.card_team?.some(t=>t.staff_init===pr.init))
                        return (
                          <div key={h+pr.init} style={{background: isBooked?'#fef2f2':hasSlot?'#f0fdf4':'var(--bg2)',padding:'6px',textAlign:'center',borderTop:'0.5px solid var(--border)',fontSize:10}}>
                            {isBooked ? <span style={{color:'#b91c1c'}}>●</span> : hasSlot ? <span style={{color:'#15803d'}}>✓</span> : <span style={{color:'var(--t3)'}}>—</span>}
                          </div>
                        )
                      })}
                    </>
                  ))}
                </div>

                {/* Free slots */}
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:8}}>
                    Freie Zeitfenster ({slots.length})
                  </div>
                  {slots.length===0 ? (
                    <div style={{padding:16,background:'#fef2f2',border:'0.5px solid #fecaca',borderRadius:8,fontSize:12,color:'#b91c1c'}}>
                      Keine freien Termine an diesem Tag
                    </div>
                  ) : (
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {slots.map(t=>(
                        <div key={t} style={{background:'#f0fdf4',border:'0.5px solid #86efac',borderRadius:6,padding:'4px 10px',fontSize:11,fontWeight:600,color:'#15803d'}}>{t}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BOOKINGS VIEW */}
        {view==='bookings' && (
          <div>
            {bookings.length===0 ? (
              <div style={{padding:20,textAlign:'center',color:'var(--t3)',fontSize:12}}>Keine Termine an diesem Tag</div>
            ) : bookings.map(b=>(
              <div key={b.id} style={{background:'var(--bg2)',border:'0.5px solid var(--border)',borderRadius:8,padding:'10px 12px',marginBottom:8,display:'flex',gap:10,alignItems:'center'}}>
                <div style={{fontSize:13,fontWeight:700,color:'var(--t1)',flex:1,minWidth:0}}>
                  <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.title}</div>
                  <div style={{fontSize:10,color:'var(--t3)',marginTop:2,display:'flex',gap:8}}>
                    <span>{b.card_time?.slice(0,5)}{b.card_time_to?' – '+b.card_time_to.slice(0,5):''}</span>
                    {b.booking_source==='online'&&<span style={{background:'#b8892a22',color:'#b8892a',padding:'1px 5px',borderRadius:4}}>Online</span>}
                    {b.card_team?.map(t=><span key={t.staff_init} style={{background:'#e8f4e8',color:'#15803d',padding:'1px 5px',borderRadius:4}}>{t.staff_init}</span>)}
                  </div>
                </div>
                {b.customer_email&&<div style={{fontSize:10,color:'var(--t3)'}}>{b.customer_email}</div>}
              </div>
            ))}
          </div>
        )}

        {/* DEBUG VIEW */}
        {view==='debug' && (
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:8}}>API Response</div>
            <pre style={{background:'var(--bg3)',border:'0.5px solid var(--border)',borderRadius:8,padding:12,fontSize:10,color:'var(--t2)',overflow:'auto',maxHeight:400}}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
            <div style={{fontSize:11,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.4px',margin:'12px 0 8px'}}>URL testen</div>
            <a href={`/api/booking/slots?serviceId=${selService}&date=${selDate}&debug=1`} target="_blank"
              style={{fontSize:11,color:'#b8892a',wordBreak:'break-all'}}
              rel="noopener">
              /api/booking/slots?serviceId={selService}&date={selDate}&debug=1
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
