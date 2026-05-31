'use client'
import { useState, useEffect, useRef } from 'react'

const GOLD = '#b8892a'
const CREAM = '#faf7f0'
const DARK = '#2a2a28'

const SERVICES = [
  { id:1, name:'Foto: Haus / Wohnung',          cat:'Fotografie', dur:30,  desc:'Innen- & Außenaufnahmen, bis zu 15 Fotos' },
  { id:2, name:'Foto: Villa / Mehrfamilienhaus', cat:'Fotografie', dur:60,  desc:'Großobjekte, individuelle Beratung' },
  { id:5, name:'Drohnenaufnahmen',               cat:'Fotografie', dur:15,  desc:'Luftaufnahmen, EU-konform' },
  { id:3, name:'Immobilien Reel',                cat:'Video',      dur:45,  desc:'30-90 Sek., Full HD, lizenzfreie Musik' },
  { id:4, name:'Foto + Reel',                    cat:'Video',      dur:120, desc:'Komplettpaket Foto & Video' },
  { id:6, name:'Gesprächstermin',                cat:'Beratung',   dur:30,  desc:'Kostenlose Erstberatung' },
]

const PROVIDERS = [
  { init:'CD', name:'Cristian', color:'#b8892a' },
  { init:'DB', name:'Daniel',   color:'#1d5ec7' },
]

export default function BuchenClient() {
  const [step, setStep] = useState(1)
  const [service, setService] = useState(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState(null)
  const [slots, setSlots] = useState([])
  const [slotsFull, setSlotsFull] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [addr, setAddr] = useState({ address:'', plz:'', lat:null, lng:null })
  const [contact, setContact] = useState({ name:'', email:'', phone:'', note:'' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)
  const addrRef = useRef(null)

  // Google Places autocomplete
  useEffect(() => {
    if (step !== 3) return
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) return
    function initAC() {
      const el = addrRef.current
      if (!el || el._acDone) return
      if (!window.google?.maps?.places?.Autocomplete) return
      el._acDone = true
      const ac = new window.google.maps.places.Autocomplete(el, {
        componentRestrictions: { country:'de' },
        fields: ['formatted_address','geometry','address_components'],
      })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        const plz = place.address_components?.find(c=>c.types.includes('postal_code'))?.long_name||''
        setAddr({ address:place.formatted_address||'', plz, lat:place.geometry?.location?.lat()??null, lng:place.geometry?.location?.lng()??null })
      })
    }
    if (window.google?.maps?.places?.Autocomplete) { setTimeout(initAC,50); return }
    if (!document.getElementById('gmap-buchen')) {
      const s = document.createElement('script')
      s.id = 'gmap-buchen'
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
      s.async = true; s.onload = ()=>setTimeout(initAC,100); document.head.appendChild(s)
    } else {
      const t = setInterval(()=>{ if(window.google?.maps?.places?.Autocomplete){clearInterval(t);initAC()} },200)
      return ()=>clearInterval(t)
    }
  }, [step])

  // Load slots
  useEffect(() => {
    if (!service || !date) return
    setLoadingSlots(true); setTime(null); setSlots([]); setSlotsFull([])
    fetch(`/api/booking/slots?serviceId=${service.id}&date=${date}&debug=1`)
      .then(r=>r.json())
      .then(d=>{ setSlots(d.times||[]); setSlotsFull(d.slots_full||[]) })
      .catch(()=>setSlots([]))
      .finally(()=>setLoadingSlots(false))
  }, [service, date])

  async function submit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/booking/create', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ serviceId:service.id, date, time, address:addr.address, plz:addr.plz, lat:addr.lat, lng:addr.lng, customerName:contact.name, customerEmail:contact.email, customerPhone:contact.phone, note:contact.note })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error||'Fehler')
      setDone(d)
    } catch(e) { alert(e.message) }
    finally { setSubmitting(false) }
  }

  const minDate = new Date(Date.now()+86400000).toISOString().slice(0,10)
  const fmtDate = (d, opts) => {
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return ''
    const dt = new Date(d+'T12:00')
    return isNaN(dt) ? '' : dt.toLocaleDateString('de-DE', opts)
  }
  const can = { 2:!!service, 3:!!date&&!!time, 4:!!addr.address&&!!addr.plz, 5:contact.name&&/\S+@\S+/.test(contact.email) }

  // Provider availability for selected date
  const providerSlots = PROVIDERS.map(pr => {
    const freeCount = slotsFull.filter(s=>s.providers?.includes(pr.init)).length
    return { ...pr, free:freeCount, busy: date && !loadingSlots && freeCount===0 }
  })

  return (
    <div style={{maxWidth:640,margin:'0 auto',padding:'24px 20px',fontFamily:"'Lato',Arial,sans-serif",color:DARK,background:CREAM,minHeight:'100vh'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Playfair+Display:wght@600&display=swap');
        .ip-fade{animation:ipf .25s ease}
        @keyframes ipf{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .ip-slot{padding:9px 0;font-size:13px;border:0.5px solid #e6ddc9;border-radius:7px;background:#fff;cursor:pointer;color:${DARK};text-align:center;transition:all .12s}
        .ip-slot:hover{border-color:${GOLD};color:${GOLD}}
        .ip-slot.sel{background:${GOLD};border-color:${GOLD};color:#fff;font-weight:700}
        .ip-slot.busy{background:#f9f9f9;color:#bbb;cursor:not-allowed;text-decoration:line-through}
        .ip-svc{display:flex;flex-direction:column;gap:4px;padding:14px 16px;background:#fff;border:0.5px solid #e6ddc9;border-radius:10px;cursor:pointer;transition:all .12s;text-align:left}
        .ip-svc:hover{border-color:${GOLD}}
        .ip-svc.sel{border-color:${GOLD};border-width:1.5px;background:#b8892a08}
        input,textarea{width:100%;padding:11px 14px;font-size:14px;border:0.5px solid #e6ddc9;border-radius:8px;margin-bottom:10px;box-sizing:border-box;background:#fff;color:${DARK};font-family:inherit;outline:none}
        input:focus,textarea:focus{border-color:${GOLD}}
        .pac-container{z-index:99999!important;font-family:'Lato',sans-serif!important;border-radius:8px!important}
      `}</style>

      {/* Logo */}
      <div style={{textAlign:'center',marginBottom:20}}>
        <img src="/ip_logo.png" alt="ImmoPixels" style={{height:40,objectFit:'contain'}} onError={e=>e.target.style.display='none'} />
        <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:22,fontWeight:600,color:DARK,marginTop:6}}>Termin buchen</div>
      </div>

      {/* Steps */}
      {!done && (
        <div style={{display:'flex',alignItems:'center',marginBottom:24,background:'#f0ece4',borderRadius:10,padding:'10px 14px',gap:4}}>
          {[['Leistung',1],['Termin',2],['Adresse',3],['Kontakt',4]].map(([label,n],i,arr)=>(
            <>
              <div key={n} style={{display:'flex',alignItems:'center',gap:5,flex:1}}>
                <div style={{width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0,
                  background: step>n?GOLD:step===n?GOLD:'transparent',
                  color: step>=n?'#fff':'#aaa',
                  border: step>=n?'none':`1.5px solid #ccc`}}>
                  {step>n?'✓':n}
                </div>
                <span style={{fontSize:11,fontWeight:step===n?700:400,color:step>=n?GOLD:'#aaa',textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</span>
              </div>
              {i<arr.length-1 && <div style={{width:20,height:1,background:'#ddd',flexShrink:0}} />}
            </>
          ))}
        </div>
      )}

      {/* STEP 1 — Service */}
      {step===1 && !done && (
        <div className="ip-fade">
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:600,marginBottom:16}}>Welche Leistung benötigen Sie?</h2>
          {['Fotografie','Video','Beratung'].map(cat=>(
            <div key={cat} style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:GOLD,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:7}}>{cat}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {SERVICES.filter(s=>s.cat===cat).map(s=>(
                  <button key={s.id} className={`ip-svc${service?.id===s.id?' sel':''}`} onClick={()=>{setService(s);setStep(2)}}>
                    <span style={{fontSize:13,fontWeight:700,color:DARK}}>{s.name}</span>
                    <span style={{fontSize:11,color:'#888'}}>{s.desc}</span>
                    <span style={{fontSize:11,color:GOLD,marginTop:2}}>ca. {s.dur} Min.</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 2 — Date + Time */}
      {step===2 && !done && (
        <div className="ip-fade">
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:600,marginBottom:16}}>Datum & Uhrzeit wählen</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

            {/* Left: date + availability */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Datum</div>
              <input type="date" min={minDate} value={date} onChange={e=>setDate(e.target.value)} style={{marginBottom:12}} />

              {date && (
                <>
                  <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Verfügbarkeit</div>
                  <div style={{background:'#f0ece4',borderRadius:10,padding:10,display:'flex',flexDirection:'column',gap:6}}>
                    {loadingSlots ? (
                      <div style={{fontSize:12,color:'#888',padding:8}}>⟳ Wird geladen...</div>
                    ) : providerSlots.map(pr=>(
                      <div key={pr.init} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,background:pr.busy?'#fef2f2':'#f0fdf4'}}>
                        <div style={{width:28,height:28,borderRadius:'50%',background:pr.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff',flexShrink:0}}>{pr.init}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:700,color:DARK}}>{pr.name}</div>
                          <div style={{fontSize:10,color:pr.busy?'#b91c1c':'#15803d'}}>{pr.busy?'Ausgebucht':`${pr.free} freie Termine`}</div>
                        </div>
                        <span style={{fontSize:16}}>{pr.busy?'✗':'✓'}</span>
                      </div>
                    ))}
                    {!loadingSlots && slots.length===0 && date && (
                      <div style={{fontSize:11,color:'#b91c1c',padding:'4px 8px'}}>Keine freien Termine — bitte anderen Tag wählen</div>
                    )}
                  </div>
                </>
              )}

              {/* Summary */}
              {service && (
                <div style={{marginTop:12,padding:'10px 12px',background:'#fff',border:'0.5px solid #e6ddc9',borderRadius:8,fontSize:12}}>
                  <div style={{fontWeight:700,color:DARK}}>{service.name}</div>
                  <div style={{color:'#888',marginTop:2}}>ca. {service.dur} Min.</div>
                  {time && <div style={{color:GOLD,fontWeight:700,marginTop:4}}>✓ {fmtDate(date,{weekday:'short',day:'2-digit',month:'short'})} · {time} Uhr</div>}
                </div>
              )}
            </div>

            {/* Right: time slots */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Uhrzeit</div>
              {!date ? (
                <div style={{fontSize:12,color:'#aaa',padding:16,textAlign:'center'}}>Bitte zuerst Datum wählen</div>
              ) : loadingSlots ? (
                <div style={{fontSize:12,color:'#888',padding:16,textAlign:'center'}}>⟳ Lädt...</div>
              ) : slots.length===0 ? (
                <div style={{fontSize:12,color:'#b91c1c',padding:16,textAlign:'center',background:'#fef2f2',borderRadius:8}}>Keine freien Termine</div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,maxHeight:340,overflowY:'auto',paddingRight:2}}>
                  {/* Show all working hours, mark busy */}
                  {Array.from({length:36},(_,i)=>{
                    const h = Math.floor(i/4)+9
                    const m = (i%4)*15
                    if(h>17||(h===17&&m>30)) return null
                    const t = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
                    const isFree = slots.includes(t)
                    return (
                      <button key={t} className={`ip-slot${time===t?' sel':''}${!isFree?' busy':''}`}
                        onClick={()=>isFree&&setTime(t)} disabled={!isFree}>
                        {t}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <Nav onBack={()=>setStep(1)} onNext={()=>setStep(3)} canNext={can[3]} />
        </div>
      )}

      {/* STEP 3 — Address */}
      {step===3 && !done && (
        <div className="ip-fade">
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:600,marginBottom:16}}>Wo findet das Shooting statt?</h2>
          <input ref={addrRef} type="text" placeholder="Straße, PLZ, Ort eingeben…" defaultValue={addr.address} />
          {addr.plz && <p style={{fontSize:12,color:'#15803d',margin:'-4px 0 10px'}}>✓ {addr.address}</p>}
          <p style={{fontSize:11,color:'#aaa',margin:'0 0 16px'}}>Bitte eine Adresse aus den Vorschlägen wählen.</p>
          <Nav onBack={()=>setStep(2)} onNext={()=>setStep(4)} canNext={can[4]} />
        </div>
      )}

      {/* STEP 4 — Contact */}
      {step===4 && !done && (
        <div className="ip-fade">
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:600,marginBottom:16}}>Ihre Kontaktdaten</h2>
          <input placeholder="Name *" value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})} />
          <input placeholder="E-Mail *" type="email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})} />
          <input placeholder="Telefon" value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})} />
          <textarea placeholder="Anmerkungen (z.B. Luftaufnahmen gewünscht, Schlüsselübergabe...)" value={contact.note} onChange={e=>setContact({...contact,note:e.target.value})} style={{minHeight:80,resize:'vertical'}} />
          
          {/* Summary */}
          <div style={{background:'#fff',border:'0.5px solid #e6ddc9',borderRadius:10,padding:'12px 14px',marginBottom:16,fontSize:13}}>
            <div style={{fontWeight:700,color:DARK,marginBottom:6}}>Zusammenfassung</div>
            <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'4px 12px',fontSize:12,color:'#555'}}>
              <span>Leistung:</span><span style={{fontWeight:700,color:DARK}}>{service?.name}</span>
              <span>Termin:</span><span style={{fontWeight:700,color:GOLD}}>{fmtDate(date,{weekday:'long',day:'2-digit',month:'long'})} · {time} Uhr</span>
              <span>Adresse:</span><span>{addr.address}</span>
            </div>
          </div>

          <Nav onBack={()=>setStep(3)} onNext={submit} canNext={can[5]&&!submitting} nextLabel={submitting?'Wird gebucht…':'Verbindlich buchen'} />
        </div>
      )}

      {/* DONE */}
      {done && (
        <div className="ip-fade" style={{textAlign:'center',padding:'48px 0'}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:GOLD,color:'#fff',fontSize:28,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>✓</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:600,marginBottom:10}}>
            {done.status==='approved'?'Termin bestätigt!':'Anfrage erhalten!'}
          </h2>
          <p style={{fontSize:14,color:'#666',maxWidth:360,margin:'0 auto'}}>
            {done.status==='approved'
              ? 'Sie erhalten eine Bestätigung per E-Mail. Wir freuen uns auf den Termin!'
              : 'Wir prüfen Ihre Anfrage und melden uns in Kürze zur Bestätigung.'}
          </p>
        </div>
      )}
    </div>
  )
}

function Nav({onBack,onNext,canNext,nextLabel='Weiter →'}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',marginTop:20,gap:12}}>
      <button onClick={onBack} style={{padding:'11px 22px',fontSize:13,background:'none',border:'0.5px solid #ccc',borderRadius:8,cursor:'pointer',color:'#666'}}>← Zurück</button>
      <button onClick={onNext} disabled={!canNext}
        style={{padding:'11px 28px',fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em',background:canNext?GOLD:'#ddd',color:canNext?'#fff':'#999',border:'none',borderRadius:8,cursor:canNext?'pointer':'not-allowed',transition:'background .15s'}}>
        {nextLabel}
      </button>
    </div>
  )
}
