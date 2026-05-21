'use client'
// ════════════════════════════════════════════════════════════════════
// app/buchen/page.js
// Nyilvános foglalási felület — ImmoPixels design.
// Lépések: Leistung → Datum → Uhrzeit → Adresse → Kontakt → fertig
// Iframe: <iframe src="https://immopixels-board.vercel.app/buchen" .../>
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'

const GOLD = '#c8a84b'
const CREAM = '#faf7f0'
const DARK = '#2a2a28'

const SERVICES = [
  { id: 1, name: 'Foto: Haus / Wohnung',           cat: 'Fotografie', dur: 30 },
  { id: 2, name: 'Foto: Villa / Mehrfamilienhaus',  cat: 'Fotografie', dur: 60 },
  { id: 5, name: 'Drohnenaufnahmen',                cat: 'Fotografie', dur: 15 },
  { id: 3, name: 'Immobilien Reel',                 cat: 'Video',      dur: 45 },
  { id: 4, name: 'Foto + Reel',                     cat: 'Video',      dur: 120 },
  { id: 6, name: 'Gesprächstermin',                 cat: 'Beratung',   dur: 30 },
]

export default function Buchen() {
  const [step, setStep] = useState(1)
  const [service, setService] = useState(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState(null)
  const [times, setTimes] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [addr, setAddr] = useState({ address: '', plz: '', lat: null, lng: null })
  const [contact, setContact] = useState({ name: '', email: '', phone: '', note: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)
  const addrRef = useRef(null)

  // ── Google Places autocomplete (a meglévő API kulccsal) ───────────
  useEffect(() => {
    if (step !== 3 || !addrRef.current) return
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    function init() {
      const ac = new window.google.maps.places.Autocomplete(addrRef.current, {
        componentRestrictions: { country: 'de' },
        fields: ['formatted_address', 'geometry', 'address_components'],
      })
      ac.addListener('place_changed', () => {
        const p = ac.getPlace()
        const plz = p.address_components?.find(c => c.types.includes('postal_code'))?.long_name || ''
        setAddr({
          address: p.formatted_address || '',
          plz,
          lat: p.geometry?.location?.lat() ?? null,
          lng: p.geometry?.location?.lng() ?? null,
        })
      })
    }
    if (window.google?.maps?.places) { init(); return }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`
    s.async = true; s.onload = init; document.head.appendChild(s)
  }, [step])

  // ── slotok betöltése ha date+service megvan ───────────────────────
  useEffect(() => {
    if (!service || !date) return
    setLoadingSlots(true); setTime(null)
    fetch(`/api/booking/slots?serviceId=${service.id}&date=${date}`)
      .then(r => r.json())
      .then(d => setTimes(d.times || []))
      .catch(() => setTimes([]))
      .finally(() => setLoadingSlots(false))
  }, [service, date])

  async function submit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/booking/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id, date, time,
          address: addr.address, plz: addr.plz, lat: addr.lat, lng: addr.lng,
          customerName: contact.name, customerEmail: contact.email,
          customerPhone: contact.phone, note: contact.note,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Fehler')
      setDone(d)
    } catch (e) {
      alert(e.message || 'Ein Fehler ist aufgetreten')
    } finally { setSubmitting(false) }
  }

  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const can = {
    2: !!service, 3: !!date && !!time, 4: !!addr.address && !!addr.plz,
    5: !!contact.name && /\S+@\S+/.test(contact.email),
  }

  return (
    <div style={S.wrap}>
      <style>{CSS}</style>

      {!done && (
        <div style={S.steps}>
          {['Leistung','Termin','Adresse','Kontakt'].map((l,i)=>(
            <div key={i} style={{...S.stepDot, ...(step>=i+1?S.stepActive:{})}}>
              <span>{i+1}</span><label>{l}</label>
            </div>
          ))}
        </div>
      )}

      {/* ── 1. LEISTUNG ── */}
      {step===1 && !done && (
        <div className="ip-fade">
          <h2 style={S.h2}>Welche Leistung benötigen Sie?</h2>
          <div style={S.grid}>
            {SERVICES.map(s=>(
              <button key={s.id} onClick={()=>{setService(s);setStep(2)}}
                style={{...S.card, ...(service?.id===s.id?S.cardSel:{})}}>
                <span style={S.cat}>{s.cat}</span>
                <span style={S.cardName}>{s.name}</span>
                <span style={S.dur}>ca. {s.dur} Min.</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. DATUM + UHRZEIT ── */}
      {step===2 && !done && (
        <div className="ip-fade">
          <h2 style={S.h2}>Wählen Sie Datum & Uhrzeit</h2>
          <input type="date" min={minDate} value={date}
            onChange={e=>setDate(e.target.value)} style={S.input}/>
          {date && (
            <div style={{marginTop:20}}>
              {loadingSlots ? <p style={S.muted}>Verfügbarkeit wird geladen…</p>
               : times.length===0 ? <p style={S.muted}>Keine freien Termine an diesem Tag. Bitte anderen Tag wählen.</p>
               : <div style={S.slotGrid}>
                   {times.map(t=>(
                     <button key={t} onClick={()=>setTime(t)}
                       style={{...S.slot, ...(time===t?S.slotSel:{})}}>{t}</button>
                   ))}
                 </div>}
            </div>
          )}
          <Nav onBack={()=>setStep(1)} onNext={()=>setStep(3)} canNext={can[3]}/>
        </div>
      )}

      {/* ── 3. ADRESSE ── */}
      {step===3 && !done && (
        <div className="ip-fade">
          <h2 style={S.h2}>Wo findet das Shooting statt?</h2>
          <input ref={addrRef} type="text" placeholder="Straße, PLZ, Ort eingeben…"
            defaultValue={addr.address} style={S.input}/>
          {addr.plz && <p style={S.muted}>✓ {addr.address}</p>}
          <p style={{...S.muted,fontSize:12}}>Bitte eine Adresse aus den Vorschlägen auswählen.</p>
          <Nav onBack={()=>setStep(2)} onNext={()=>setStep(4)} canNext={can[4]}/>
        </div>
      )}

      {/* ── 4. KONTAKT ── */}
      {step===4 && !done && (
        <div className="ip-fade">
          <h2 style={S.h2}>Ihre Kontaktdaten</h2>
          <input placeholder="Name *" value={contact.name}
            onChange={e=>setContact({...contact,name:e.target.value})} style={S.input}/>
          <input placeholder="E-Mail *" type="email" value={contact.email}
            onChange={e=>setContact({...contact,email:e.target.value})} style={S.input}/>
          <input placeholder="Telefon" value={contact.phone}
            onChange={e=>setContact({...contact,phone:e.target.value})} style={S.input}/>
          <textarea placeholder="Anmerkungen (z.B. Luftaufnahmen gewünscht)" value={contact.note}
            onChange={e=>setContact({...contact,note:e.target.value})} style={{...S.input,minHeight:80,resize:'vertical'}}/>
          <Summary {...{service,date,time,addr}}/>
          <Nav onBack={()=>setStep(3)} onNext={submit} canNext={can[5]&&!submitting}
            nextLabel={submitting?'Wird gebucht…':'Verbindlich buchen'}/>
        </div>
      )}

      {/* ── FERTIG ── */}
      {done && (
        <div className="ip-fade" style={{textAlign:'center',padding:'40px 0'}}>
          <div style={S.checkCircle}>✓</div>
          <h2 style={S.h2}>{done.status==='approved'?'Termin bestätigt!':'Anfrage erhalten!'}</h2>
          <p style={S.muted}>
            {done.status==='approved'
              ? 'Ihr Termin wurde gebucht. Sie erhalten eine Bestätigung per E-Mail.'
              : 'Wir prüfen Ihre Anfrage und melden uns in Kürze zur Bestätigung.'}
          </p>
        </div>
      )}
    </div>
  )
}

function Nav({onBack,onNext,canNext,nextLabel='Weiter'}){
  return (
    <div style={S.nav}>
      <button onClick={onBack} style={S.btnGhost}>Zurück</button>
      <button onClick={onNext} disabled={!canNext}
        style={{...S.btn,...(canNext?{}:S.btnOff)}}>{nextLabel}</button>
    </div>
  )
}

function Summary({service,date,time,addr}){
  if(!service)return null
  const dt = date && time
    ? new Date(`${date}T${time}:00`).toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})
    : ''
  return (
    <div style={S.summary}>
      <div><b>{service.name}</b></div>
      {dt && <div style={S.muted}>{dt} · {time} Uhr</div>}
      {addr.address && <div style={S.muted}>{addr.address}</div>}
    </div>
  )
}

// ── Inline stílusok (WordPress CSS-től védve) ─────────────────────────
const S = {
  wrap:{maxWidth:560,margin:'0 auto',padding:'24px 20px',fontFamily:"'Lato',Arial,sans-serif",color:DARK,background:CREAM},
  steps:{display:'flex',justifyContent:'space-between',marginBottom:28,gap:4},
  stepDot:{flex:1,textAlign:'center',opacity:.4,fontSize:11,textTransform:'uppercase',letterSpacing:'.08em'},
  stepActive:{opacity:1,color:GOLD},
  h2:{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:600,marginBottom:20,color:DARK},
  grid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10},
  card:{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:4,padding:'16px 14px',background:'#fff',border:'1px solid #e6ddc9',borderRadius:8,cursor:'pointer',textAlign:'left',transition:'all .15s'},
  cardSel:{borderColor:GOLD,boxShadow:`0 0 0 2px ${GOLD}33`},
  cat:{fontSize:10,textTransform:'uppercase',letterSpacing:'.1em',color:GOLD,fontWeight:700},
  cardName:{fontSize:14,fontWeight:600,lineHeight:1.3},
  dur:{fontSize:12,color:'#999'},
  input:{width:'100%',padding:'12px 14px',fontSize:15,border:'1px solid #e6ddc9',borderRadius:8,marginBottom:10,boxSizing:'border-box',background:'#fff',color:DARK,fontFamily:'inherit'},
  slotGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(72px,1fr))',gap:8},
  slot:{padding:'10px 0',fontSize:14,border:'1px solid #e6ddc9',borderRadius:6,background:'#fff',cursor:'pointer',color:DARK},
  slotSel:{background:GOLD,borderColor:GOLD,color:'#fff',fontWeight:700},
  nav:{display:'flex',justifyContent:'space-between',marginTop:28,gap:12},
  btn:{padding:'12px 28px',fontSize:14,fontWeight:700,letterSpacing:'.04em',textTransform:'uppercase',background:GOLD,color:'#fff',border:'none',borderRadius:8,cursor:'pointer'},
  btnOff:{opacity:.4,cursor:'not-allowed'},
  btnGhost:{padding:'12px 24px',fontSize:14,background:'none',border:'1px solid #ccc',borderRadius:8,cursor:'pointer',color:'#666'},
  muted:{color:'#888',fontSize:14,margin:'8px 0'},
  summary:{background:'#fff',border:'1px solid #e6ddc9',borderRadius:8,padding:14,margin:'16px 0',fontSize:14,lineHeight:1.6},
  checkCircle:{width:64,height:64,borderRadius:'50%',background:GOLD,color:'#fff',fontSize:32,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'},
}
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Playfair+Display:wght@600&display=swap');
.ip-fade{animation:ipf .3s ease}
@keyframes ipf{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.pac-container{z-index:99999!important;font-family:'Lato',sans-serif!important;border-radius:8px!important}
`
