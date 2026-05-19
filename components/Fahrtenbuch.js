'use client'
import { useState, useEffect, useMemo, useRef } from 'react'

function pad(n){return String(n).padStart(2,'0')}
function fmtDate(s){if(!s)return'—';const d=new Date(s+'T00:00:00');const days=['So','Mo','Di','Mi','Do','Fr','Sa'];return days[d.getDay()]+'. '+pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+String(d.getFullYear()).slice(2)}
function fmtKm(m){if(!m&&m!==0)return'—';return(m/1000).toFixed(1)+' km'}
function fmtMin(s){if(!s)return'—';const m=Math.round(s/60);return m>=60?Math.floor(m/60)+'h '+(m%60)+'min':m+' min'}
function toEuro(km){return((km/1000)*0.30).toFixed(2)+' €'} // 0.30€/km default

function getMonthDates(date){
  const d=new Date(date)
  return{from:new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10),to:new Date(d.getFullYear(),d.getMonth()+1,0).toISOString().slice(0,10)}
}
function getWeekDates(date){
  const d=new Date(date),day=d.getDay()||7
  const mon=new Date(d);mon.setDate(d.getDate()-day+1)
  const sun=new Date(mon);sun.setDate(mon.getDate()+6)
  return{from:mon.toISOString().slice(0,10),to:sun.toISOString().slice(0,10)}
}

// Address autocomplete hook
function useAddressAutocomplete(inputRef, onSelect) {
  useEffect(()=>{
    if(!inputRef.current||typeof window==='undefined'||!window.google?.maps?.places) return
    const ac=new window.google.maps.places.Autocomplete(inputRef.current,{types:['address'],componentRestrictions:{country:'de'}})
    ac.addListener('place_changed',()=>{
      const place=ac.getPlace()
      if(place?.formatted_address) onSelect(place.formatted_address)
    })
    return ()=>window.google.maps.event.clearInstanceListeners(ac)
  },[])
}

function AddressInput({value, onChange, placeholder, style}){
  const ref=useRef()
  useAddressAutocomplete(ref,(addr)=>onChange(addr))
  return <input ref={ref} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||'Adresse...'} style={style} />
}

export default function Fahrtenbuch({staff, cards, me, isAdmin, supabase}){
  const [view,setView]=useState('month')
  const [selDate,setSelDate]=useState(new Date().toISOString().slice(0,10))
  const [selStaffId,setSelStaffId]=useState(()=>me?.id||null)
  const [trips,setTrips]=useState([]) // [{id,date,legs:[{from,to,km,min,client,reason,editable}]}]
  const [loading,setLoading]=useState(false)
  const [calcLoading,setCalcLoading]=useState(false)
  const [editingLeg,setEditingLeg]=useState(null) // {tripIdx,legIdx}
  const [editForm,setEditForm]=useState({})
  const [ratePerKm,setRatePerKm]=useState(0.30)

  const currentStaff=staff.find(s=>s.id===selStaffId)||me

  const dateRange=useMemo(()=>{
    if(view==='day') return{from:selDate,to:selDate}
    if(view==='week') return getWeekDates(selDate)
    return getMonthDates(selDate)
  },[view,selDate])

  // Build trips from cards
  useEffect(()=>{
    if(!currentStaff) return
    buildTrips()
  },[cards,currentStaff,dateRange,selStaffId])

  function buildTrips(){
    // Get cards for this staff in date range
    const staffCards=cards.filter(c=>{
      if(!c.card_date||!c.addr) return false
      if(c.card_date<dateRange.from||c.card_date>dateRange.to) return false
      return true
    }).sort((a,b)=>{
      if(a.card_date!==b.card_date) return a.card_date.localeCompare(b.card_date)
      return (a.card_time||'').localeCompare(b.card_time||'')
    })

    // Group by date
    const byDate={}
    for(const c of staffCards){
      if(!byDate[c.card_date]) byDate[c.card_date]=[]
      byDate[c.card_date].push(c)
    }

    const home=currentStaff?.address||''
    const newTrips=[]

    for(const [date,dayCards] of Object.entries(byDate).sort()){
      const legs=[]
      const stops=[home,...dayCards.map(c=>c.addr),home]
      for(let i=0;i<stops.length-1;i++){
        legs.push({
          from:stops[i],
          to:stops[i+1],
          client:i===0?null:dayCards[i-1]?.client_name||null,
          reason:i===0?'Hinfahrt':i===stops.length-2?'Heimfahrt':'Zwischenstopp',
          cardId:i>0&&i<stops.length-1?dayCards[i-1]?.id:null,
          km:null,
          min:null,
          loading:true,
        })
      }
      newTrips.push({date,legs,dayCards})
    }
    setTrips(newTrips)
    calcAllDistances(newTrips)
  }

  async function calcAllDistances(tripsData){
    setCalcLoading(true)
    const updated=[...tripsData]
    for(let ti=0;ti<updated.length;ti++){
      const trip=updated[ti]
      const stops=[trip.legs[0].from,...trip.legs.map(l=>l.to)]
      try{
        const r=await fetch('/api/fahrtenbuch/distance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stops})})
        const d=await r.json()
        if(d.ok){
          for(let li=0;li<trip.legs.length;li++){
            trip.legs[li].km=d.legs[li]?.distance||0
            trip.legs[li].min=d.legs[li]?.duration||0
            trip.legs[li].loading=false
          }
        }
      }catch(e){
        for(const leg of trip.legs) leg.loading=false
      }
    }
    setTrips([...updated])
    setCalcLoading(false)
  }

  function navigate(dir){
    const d=new Date(selDate)
    if(view==='day') d.setDate(d.getDate()+dir)
    else if(view==='week') d.setDate(d.getDate()+dir*7)
    else d.setMonth(d.getMonth()+dir)
    setSelDate(d.toISOString().slice(0,10))
  }

  function periodLabel(){
    if(view==='day') return fmtDate(selDate)
    if(view==='week'){const{from,to}=dateRange;return`${new Date(from).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})} – ${new Date(to).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'})}`}
    return new Date(selDate).toLocaleDateString('de-DE',{month:'long',year:'numeric'})
  }

  function startEdit(ti,li){
    const leg=trips[ti].legs[li]
    setEditingLeg({ti,li})
    setEditForm({from:leg.from,to:leg.to,reason:leg.reason,client:leg.client||''})
  }

  async function saveEdit(){
    if(!editingLeg) return
    const{ti,li}=editingLeg
    const updated=[...trips]
    updated[ti].legs[li]={...updated[ti].legs[li],...editForm,loading:true}
    setTrips(updated)
    setEditingLeg(null)
    // Recalc this leg
    try{
      const r=await fetch('/api/fahrtenbuch/distance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stops:[editForm.from,editForm.to]})})
      const d=await r.json()
      if(d.ok){
        updated[ti].legs[li].km=d.legs[0]?.distance||0
        updated[ti].legs[li].min=d.legs[0]?.duration||0
        updated[ti].legs[li].loading=false
        setTrips([...updated])
      }
    }catch(e){updated[ti].legs[li].loading=false;setTrips([...updated])}
  }

  function deleteLeg(ti,li){
    const updated=[...trips]
    updated[ti].legs.splice(li,1)
    if(updated[ti].legs.length===0) updated.splice(ti,1)
    setTrips([...updated])
  }

  function addManualLeg(ti){
    const updated=[...trips]
    const home=currentStaff?.address||''
    updated[ti].legs.push({from:'',to:'',reason:'Fahrt',client:'',km:null,min:null,loading:false,manual:true})
    setTrips([...updated])
    setEditingLeg({ti,li:updated[ti].legs.length-1})
    setEditForm({from:home,to:'',reason:'Fahrt',client:''})
  }

  // Totals
  const totalKm=trips.reduce((s,t)=>s+t.legs.reduce((ls,l)=>ls+(l.km||0),0),0)
  const totalMin=trips.reduce((s,t)=>s+t.legs.reduce((ls,l)=>ls+(l.min||0),0),0)
  const totalEuro=(totalKm/1000*ratePerKm).toFixed(2)

  const IS={width:'100%',background:'var(--bg3)',border:'0.5px solid var(--border)',borderRadius:6,padding:'6px 9px',fontSize:12,color:'var(--t1)',outline:'none',boxSizing:'border-box'}

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:'var(--bg)',fontFamily:'Arial,sans-serif'}}>

      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:14,fontWeight:700,color:'var(--t1)',display:'flex',alignItems:'center',gap:6}}>
          <i className="ti ti-car" style={{fontSize:16,color:'#b8892a'}} /> Fahrtenbuch
        </span>

        {isAdmin&&(
          <select value={selStaffId||''} onChange={e=>setSelStaffId(e.target.value)}
            style={{border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',fontSize:12,background:'var(--bg3)',color:'var(--t1)',outline:'none'}}>
            {staff.filter(s=>s.address).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        <div style={{display:'flex',gap:4}}>
          {['day','week','month'].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:'4px 10px',borderRadius:6,border:'0.5px solid '+(view===v?'#b8892a':'var(--border)'),background:view===v?'#b8892a14':'var(--bg3)',color:view===v?'#b8892a':'var(--t2)',fontSize:11,fontWeight:view===v?700:400,cursor:'pointer'}}>
              {v==='day'?'Tag':v==='week'?'Woche':'Monat'}
            </button>
          ))}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
          <button onClick={()=>navigate(-1)} style={{background:'var(--bg3)',border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',cursor:'pointer',color:'var(--t2)',fontSize:14}}>‹</button>
          <span style={{fontSize:12,fontWeight:600,color:'var(--t1)',minWidth:130,textAlign:'center'}}>{periodLabel()}</span>
          <button onClick={()=>navigate(1)} style={{background:'var(--bg3)',border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',cursor:'pointer',color:'var(--t2)',fontSize:14}}>›</button>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:11,color:'var(--t3)'}}>€/km</span>
          <input type="number" step="0.01" value={ratePerKm} onChange={e=>setRatePerKm(parseFloat(e.target.value)||0.30)}
            style={{width:60,border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 7px',fontSize:12,background:'var(--bg3)',color:'var(--t1)',outline:'none'}} />
        </div>
      </div>

      {/* No address warning */}
      {!currentStaff?.address&&(
        <div style={{margin:14,padding:12,background:'#fffbeb',border:'0.5px solid #fde68a',borderRadius:9,fontSize:12,color:'#92400e',display:'flex',alignItems:'center',gap:7}}>
          <i className="ti ti-alert-triangle" style={{fontSize:14}} />
          Keine Heimadresse hinterlegt — bitte im Mitarbeiter-Profil eine Adresse eingeben.
        </div>
      )}

      {/* Table */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 16px'}}>
        {trips.length===0&&currentStaff?.address&&(
          <div style={{textAlign:'center',padding:40,color:'var(--t3)',fontSize:13}}>Keine Fahrten in diesem Zeitraum</div>
        )}

        {trips.map((trip,ti)=>(
          <div key={trip.date} style={{marginBottom:18}}>
            {/* Day header */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:7}}>
              <span style={{fontSize:12,fontWeight:700,color:'var(--t1)'}}>{fmtDate(trip.date)}</span>
              <span style={{fontSize:11,color:'#b8892a',fontWeight:600}}>
                {fmtKm(trip.legs.reduce((s,l)=>s+(l.km||0),0))}
              </span>
              <button onClick={()=>addManualLeg(ti)} style={{marginLeft:'auto',background:'none',border:'0.5px solid var(--border)',borderRadius:6,padding:'3px 8px',fontSize:10,cursor:'pointer',color:'var(--t3)',display:'flex',alignItems:'center',gap:3}}>
                <i className="ti ti-plus" style={{fontSize:10}} /> Fahrt hinzufügen
              </button>
            </div>

            {/* Legs table */}
            <div style={{background:'var(--bg2)',border:'0.5px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
              {/* Table header */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 80px 70px 80px 60px 70px',gap:0,background:'var(--bg3)',borderBottom:'0.5px solid var(--border)',padding:'6px 12px'}}>
                {['Von','Nach','Kunde','Grund','Distanz','Dauer',''].map((h,i)=>(
                  <div key={i} style={{fontSize:9,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.4px'}}>{h}</div>
                ))}
              </div>

              {trip.legs.map((leg,li)=>{
                const isEditing=editingLeg?.ti===ti&&editingLeg?.li===li
                return(
                  <div key={li} style={{borderBottom:li<trip.legs.length-1?'0.5px solid var(--border)':'none'}}>
                    {isEditing?(
                      <div style={{padding:'10px 12px',background:'var(--bg3)'}}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,color:'var(--t3)',marginBottom:4}}>Von</div>
                            <AddressInput value={editForm.from} onChange={v=>setEditForm(p=>({...p,from:v}))} placeholder="Startadresse" style={IS} />
                          </div>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,color:'var(--t3)',marginBottom:4}}>Nach</div>
                            <AddressInput value={editForm.to} onChange={v=>setEditForm(p=>({...p,to:v}))} placeholder="Zieladresse" style={IS} />
                          </div>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,color:'var(--t3)',marginBottom:4}}>Kunde</div>
                            <input value={editForm.client} onChange={e=>setEditForm(p=>({...p,client:e.target.value}))} placeholder="z.B. Bartz" style={IS} />
                          </div>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,color:'var(--t3)',marginBottom:4}}>Grund</div>
                            <input value={editForm.reason} onChange={e=>setEditForm(p=>({...p,reason:e.target.value}))} placeholder="Fotoshooting" style={IS} />
                          </div>
                        </div>
                        <div style={{display:'flex',gap:7}}>
                          <button onClick={saveEdit} style={{background:'#b8892a',color:'#fff',border:'none',borderRadius:6,padding:'5px 12px',fontSize:11,fontWeight:700,cursor:'pointer'}}>✓ Speichern</button>
                          <button onClick={()=>setEditingLeg(null)} style={{background:'var(--bg4)',border:'0.5px solid var(--border)',borderRadius:6,padding:'5px 10px',fontSize:11,cursor:'pointer',color:'var(--t2)'}}>Abbrechen</button>
                        </div>
                      </div>
                    ):(
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 80px 70px 80px 60px 70px',gap:0,padding:'8px 12px',alignItems:'center'}}>
                        <div style={{fontSize:11,color:'var(--t2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:6}}>{leg.from}</div>
                        <div style={{fontSize:11,color:'var(--t1)',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:6}}>{leg.to}</div>
                        <div style={{fontSize:11,color:'var(--t3)'}}>{leg.client||'—'}</div>
                        <div style={{fontSize:10,color:'var(--t3)'}}>{leg.reason||'—'}</div>
                        <div style={{fontSize:11,fontWeight:600,color:leg.km?'var(--gold)':'var(--t3)'}}>{leg.loading?<span style={{color:'var(--t3)',fontSize:10}}>⟳</span>:fmtKm(leg.km)}</div>
                        <div style={{fontSize:11,color:'var(--t3)'}}>{leg.loading?'':fmtMin(leg.min)}</div>
                        <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                          <button onClick={()=>startEdit(ti,li)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--t3)',padding:'2px 4px',fontSize:12}} title="Bearbeiten">
                            <i className="ti ti-pencil" style={{fontSize:11}} />
                          </button>
                          <button onClick={()=>deleteLeg(ti,li)} style={{background:'none',border:'none',cursor:'pointer',color:'#b91c1c',padding:'2px 4px',fontSize:12}} title="Löschen">
                            <i className="ti ti-trash" style={{fontSize:11}} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Monthly totals */}
        {view==='month'&&trips.length>0&&(
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 16px',marginTop:8}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>Monatsübersicht</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:700,color:'#b8892a'}}>{fmtKm(totalKm)}</div>
                <div style={{fontSize:11,color:'var(--t3)'}}>Gesamt km</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:700,color:'var(--t1)'}}>{fmtMin(totalMin)}</div>
                <div style={{fontSize:11,color:'var(--t3)'}}>Fahrzeit</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:700,color:'#15803d'}}>{totalEuro} €</div>
                <div style={{fontSize:11,color:'var(--t3)'}}>à {ratePerKm.toFixed(2)} €/km</div>
              </div>
            </div>
            {calcLoading&&<div style={{textAlign:'center',fontSize:11,color:'var(--t3)',marginTop:8}}>⟳ Entfernungen werden berechnet...</div>}
          </div>
        )}
      </div>
    </div>
  )
}
