'use client'
import { useState, useEffect, useRef } from 'react'

const GOLD = '#6b6b6e'
const CREAM = '#faf7f0'
const DARK = '#2a2a28'

const CAT_ORDER = ['Immobilienfotografie', 'Immobilienvideo', 'Gespräch']
const CAT_LABEL = { 'Immobilienfotografie':'Fotografie', 'Immobilienvideo':'Video', 'Gespräch':'Beratung' }

export default function BuchenClient() {
  const [step, setStep] = useState(1)
  const [services, setServices] = useState([])
  const [providers, setProviders] = useState([])
  const [service, setService] = useState(null)
  const [addon360, setAddon360] = useState(false)
  const [addonDrone, setAddonDrone] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState(null)
  const [provider, setProvider] = useState(null) // null = automatikus (mint eddig)
  const [slots, setSlots] = useState([])
  const [slotsFull, setSlotsFull] = useState([])
  const [warnTimes, setWarnTimes] = useState([])
  const [recoTimes, setRecoTimes] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [addr, setAddr] = useState({ address:'', plz:'', lat:null, lng:null })
  const [contact, setContact] = useState({ vorname:'', nachname:'', email:'', phone:'', office:'', note:'' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)
  const [delayModal, setDelayModal] = useState(false)
  const [delayAck, setDelayAck] = useState(false)
  const [inIframe] = useState(() => typeof window !== 'undefined' && window.parent !== window)
  const addrRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    fetch('/api/booking/config').then(r=>r.json())
      .then(d=>{ setServices(d.services||[]); setProviders(d.providers||[]) }).catch(()=>{})
  }, [])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ip_booking_contact') || 'null')
      if (saved && typeof saved === 'object') setContact(c => ({ ...c, ...saved, note:'' }))
    } catch {}
  }, [])

  // iframe auto-magasság: a tényleges tartalom magasságát jelzi a szülő oldalnak,
  // csak valódi változáskor (a 100vh visszacsatolás elkerülésére)
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return
    let lastH = 0
    const report = () => {
      const el = document.getElementById('ip-booking-root')
      const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0
      if (h > 0 && Math.abs(h - lastH) > 3) {
        lastH = h
        window.parent.postMessage({ type: 'ip-booking-height', height: h }, '*')
      }
    }
    report()
    const el = document.getElementById('ip-booking-root')
    const ro = new ResizeObserver(report)
    if (el) ro.observe(el)
    window.addEventListener('load', report)
    return () => { ro.disconnect(); window.removeEventListener('load', report) }
  }, [])

  const is360Available = service && service.category !== 'Gespräch'
  const isDroneAvailable = service && service.category === 'Immobilienfotografie' && service.name.toLowerCase().indexOf('drohne')===-1
  const addonMin = (is360Available && addon360 ? 30 : 0) + (isDroneAvailable && addonDrone ? 15 : 0)

  // Google Places autocomplete + térkép — STEP 2 (Adresse)
  useEffect(() => {
    if (step !== 2) return
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
        const lat = place.geometry?.location?.lat()??null
        const lng = place.geometry?.location?.lng()??null
        setAddr({ address:place.formatted_address||'', plz, lat, lng })
        renderMap(lat, lng)
      })
    }
    if (window.google?.maps?.places?.Autocomplete) { setTimeout(initAC,50) }
    else if (!document.getElementById('gmap-buchen')) {
      const s = document.createElement('script')
      s.id = 'gmap-buchen'
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
      s.async = true; s.onload = ()=>setTimeout(initAC,100); document.head.appendChild(s)
    } else {
      const t = setInterval(()=>{ if(window.google?.maps?.places?.Autocomplete){clearInterval(t);initAC()} },200)
      return ()=>clearInterval(t)
    }
  }, [step])

  function renderMap(lat, lng) {
    if (lat==null || lng==null || !mapRef.current || !window.google?.maps) return
    const pos = { lat, lng }
    const map = new window.google.maps.Map(mapRef.current, { center:pos, zoom:15, disableDefaultUI:true, zoomControl:true })
    new window.google.maps.Marker({ position:pos, map })
  }

  // Slots betöltése — STEP 3 (Termin), az ADDRESS-szel együtt → utazás-tudatos
  useEffect(() => {
    if (step !== 3 || !service || !date) return
    setLoadingSlots(true); setTime(null); setProvider(null); setSlots([]); setSlotsFull([]); setWarnTimes([])
    const a360 = (is360Available && addon360) ? 1 : 0
    const aDrone = (isDroneAvailable && addonDrone) ? 1 : 0
    const addrParam = addr.address ? `&address=${encodeURIComponent(addr.address)}` : ''
    fetch(`/api/booking/slots?serviceId=${service.id}&date=${date}&debug=1&addon360=${a360}&addonDrone=${aDrone}${addrParam}`)
      .then(r=>r.json())
      .then(d=>{ setSlots(d.times||[]); setSlotsFull(d.slots_full||[]); setWarnTimes(d.warnTimes||[]); setRecoTimes(d.recoTimes||[]) })
      .catch(()=>setSlots([]))
      .finally(()=>setLoadingSlots(false))
  }, [step, service, date, addon360, addonDrone])

  // 16 napos előrejelzés a naptár-napok hover-ikonjaihoz
  const [wxDays, setWxDays] = useState({})
  useEffect(() => {
    if (!addr.lat || !addr.lng) return
    const start = new Date().toISOString().slice(0, 10)
    const end = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
    let alive = true
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${addr.lat}&longitude=${addr.lng}&daily=weather_code,temperature_2m_max&timezone=Europe%2FBerlin&start_date=${start}&end_date=${end}`)
      .then(r => r.json())
      .then(j => { if (!alive || !j?.daily?.time) return; const m = {}; j.daily.time.forEach((d, i) => { m[d] = { c: j.daily.weather_code[i], t: Math.round(j.daily.temperature_2m_max?.[i]) } }); setWxDays(m) })
      .catch(() => {})
    return () => { alive = false }
  }, [addr.lat, addr.lng])

  // Wetter + Sonnenuntergang a választott napra (Open-Meteo, kulcs nélkül; max 16 nap előre)
  const [wx, setWx] = useState(null)
  useEffect(() => {
    setWx(null)
    if (!date || !addr.lat || !addr.lng) return
    const diff = (new Date(date + 'T12:00') - new Date()) / 86400000
    if (diff < -1 || diff > 15.5) return
    let alive = true
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${addr.lat}&longitude=${addr.lng}&daily=weather_code,temperature_2m_max,precipitation_probability_max,wind_speed_10m_max,sunset&timezone=Europe%2FBerlin&start_date=${date}&end_date=${date}`)
      .then(r => r.json())
      .then(j => {
        if (!alive || !j?.daily?.time?.length) return
        const sunsetRaw = j.daily.sunset?.[0] || null
        setWx({
          code: j.daily.weather_code?.[0],
          tmax: Math.round(j.daily.temperature_2m_max?.[0]),
          rain: j.daily.precipitation_probability_max?.[0],
          wind: Math.round(j.daily.wind_speed_10m_max?.[0]),
          sunset: sunsetRaw ? sunsetRaw.slice(11, 16) : null,
          golden: sunsetRaw ? (() => { const [h, m] = sunsetRaw.slice(11, 16).split(':').map(Number); const t = h * 60 + m - 60; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` })() : null,
        })
      }).catch(() => {})
    return () => { alive = false }
  }, [date, addr.lat, addr.lng])
  const wxIcon = c => c === 0 ? ['☀️', 'sonnig'] : c <= 2 ? ['🌤', 'heiter'] : c === 3 ? ['☁️', 'bewölkt'] : c <= 48 ? ['🌫', 'Nebel'] : c <= 57 ? ['🌦', 'Nieselregen'] : c <= 67 ? ['🌧', 'Regen'] : c <= 77 ? ['🌨', 'Schnee'] : c <= 82 ? ['🌦', 'Schauer'] : ['⛈', 'Gewitter']

  // Anfahrt-útvonal a Static Maps térképhez (Directions polyline)
  const [routeMaps, setRouteMaps] = useState({})
  useEffect(() => {
    setRouteMaps({})
    const sf = slotsFull.find(s => s.time === time)
    const infos = sf?.infos && Object.keys(sf.infos).length ? sf.infos : (sf?.info && sf?.auto ? { [sf.auto]: sf.info } : null)
    if (!time || !infos || !addr.address) return
    let alive = true
    const fetchOne = (init, originQuery) => {
      const apply = (poly, km, min) => { if (alive && poly) setRouteMaps(prev => ({ ...prev, [init]: { polyline: poly, km, min } })) }
      const viaServer = () => fetch(`/api/booking/routemap?origin=${encodeURIComponent(originQuery)}&destination=${encodeURIComponent(addr.address)}`)
        .then(r => r.json()).then(j => { if (j.ok) apply(j.polyline, j.km, j.min) }).catch(() => {})
      if (typeof window !== 'undefined' && window.google?.maps?.DirectionsService) {
        try {
          new window.google.maps.DirectionsService().route(
            { origin: originQuery, destination: addr.address, travelMode: 'DRIVING' },
            (res, status) => {
              const rt = status === 'OK' ? res?.routes?.[0] : null
              const poly = rt ? (typeof rt.overview_polyline === 'string' ? rt.overview_polyline : rt.overview_polyline?.points) : null
              if (poly) { const leg = rt.legs?.[0]; apply(poly, leg ? Math.round((leg.distance?.value || 0) / 100) / 10 : null, leg ? Math.round((leg.duration?.value || 0) / 60) : null) }
              else viaServer()
            }
          )
        } catch { viaServer() }
      } else viaServer()
    }
    Object.entries(infos).forEach(([init, inf]) => { if (inf?.originQuery) fetchOne(init, inf.originQuery) })
    return () => { alive = false }
  }, [time, slotsFull, addr.address])

  function delayInfo() {
    if (!time) return { delay: 0 }
    const sf = slotsFull.find(s => s.time === time)
    const infos = sf?.infos && Object.keys(sf.infos).length ? sf.infos : (sf?.info && sf?.auto ? { [sf.auto]: sf.info } : null)
    if (!infos) return { delay: 0 }
    const inits = Object.keys(infos)
    const acting = (provider && infos[provider]) ? provider : (sf?.auto && infos[sf.auto] ? sf.auto : inits[0])
    const inf = infos[acting]
    const delay = inf?.delayMin || 0
    const actName = (providers.find(p => p.init === acting)?.name || acting || '').split(' ')[0]
    return { delay, inf, actName }
  }

  async function submit() {
    const di = delayInfo()
    setSubmitting(true)
    try {
      const res = await fetch('/api/booking/create', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          serviceId:service.id, date, time,
          address:addr.address, plz:addr.plz, lat:addr.lat, lng:addr.lng,
          customerName:`${contact.vorname} ${contact.nachname}`.trim(),
          customerEmail:contact.email, customerPhone:contact.phone,
          immoOffice:contact.office, note:contact.note,
          addon360: is360Available && addon360, addonDrone: isDroneAvailable && addonDrone,
          provider: provider || undefined,
          delayAccepted: di.delay > 0, delayMin: di.delay || undefined,
        })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error||'Fehler')
      try {
        localStorage.setItem('ip_booking_contact', JSON.stringify({
          vorname:contact.vorname, nachname:contact.nachname, email:contact.email, phone:contact.phone, office:contact.office,
        }))
      } catch {}
      setDone(d); setDelayModal(false)
    } catch(e) { alert(e.message) }
    finally { setSubmitting(false) }
  }

  const minDate = new Date(Date.now()+86400000).toISOString().slice(0,10)
  const fmtDate = (d, opts) => {
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return ''
    const dt = new Date(d+'T12:00')
    return isNaN(dt) ? '' : dt.toLocaleDateString('de-DE', opts)
  }
  const isDemo = process.env.NEXT_PUBLIC_IS_DEMO === '1'
  const contactOk = isDemo
    ? /\S+@\S+\.\S+/.test(contact.email)
    : (contact.vorname.trim() && contact.nachname.trim() && /\S+@\S+\.\S+/.test(contact.email) && contact.phone.trim() && contact.note.trim())
  const can = { 2:!!service, 3:(isDemo ? (!!addr.address && contactOk) : (!!addr.address && contactOk)), submit:!!date && !!time }

  const providerSlots = providers.map(pr => {
    const freeCount = slotsFull.filter(s=>s.providers?.includes(pr.init)).length
    return { ...pr, free:freeCount, busy: date && !loadingSlots && freeCount===0 }
  })
  const slotForTime = time ? slotsFull.find(s=>s.time===time) : null
  const freeInitsAtTime = slotForTime ? slotForTime.providers : null

  const Avatar = ({ p, size=32, dim=false }) => (
    <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, overflow:'hidden', background:p.color,
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.36, fontWeight:700, color:'#fff',
      opacity: dim?0.3:1, filter: dim?'grayscale(1)':'none', transition:'all .2s' }}>
      {p.avatar_url ? <img src={p.avatar_url} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : p.init}
    </div>
  )
  const CatCircle = ({ svc, selected }) => (
    <div className="ip-mob-cat-circle" style={{ width:54, height:54, borderRadius:'50%', flexShrink:0, overflow:'hidden',
      border: selected?`2px solid ${GOLD}`:'2px solid #e6ddc9', background:'#fff',
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      {svc.image_url ? <img src={svc.image_url} alt={svc.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
        : <span style={{fontSize:22}}>{svc.category==='Immobilienvideo'?'🎬':svc.category==='Gespräch'?'💬':'📷'}</span>}
    </div>
  )

  // Custom ImmoPixels date picker
  const DatePicker = ({ value, min, onChange, inline = false }) => {
    const [open, setOpen] = useState(false)
    const [view, setView] = useState(() => value ? new Date(value+'T12:00') : new Date())
    const today = new Date(); today.setHours(0,0,0,0)
    const minD = min ? new Date(min+'T12:00') : null; if (minD) minD.setHours(0,0,0,0)
    const sel = value ? new Date(value+'T12:00') : null
    if (sel) sel.setHours(0,0,0,0)
    const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
    const dayNames = ['Mo','Di','Mi','Do','Fr','Sa','So']
    const year = view.getFullYear(), month = view.getMonth()
    const first = new Date(year, month, 1)
    const firstWeekday = (first.getDay() + 6) % 7  // Mo=0
    const daysInMonth = new Date(year, month+1, 0).getDate()
    const cells = []
    for (let i=0; i<firstWeekday; i++) cells.push(null)
    for (let d=1; d<=daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    const fmtDisplay = sel ? sel.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) : 'Datum wählen'
    return (
      <div style={{position:'relative',marginBottom:12}}>
        {!inline && <button type="button" onClick={()=>setOpen(o=>!o)} style={{
          width:'100%',padding:'11px 14px',fontSize:14,border:'0.5px solid #e6ddc9',borderRadius:8,
          background:'#fff',color:sel?DARK:'#999',cursor:'pointer',textAlign:'left',
          display:'flex',alignItems:'center',justifyContent:'space-between',fontFamily:'inherit',
        }}>
          <span>{fmtDisplay}</span>
          <span style={{color:GOLD,fontSize:16}}>📅</span>
        </button>}
        {(inline || open) && (
          <div className="ip-datepicker-pop" style={inline
            ? {background:'#fff',border:'0.5px solid #e6ddc9',borderRadius:12,padding:14}
            : {position:'absolute',top:'calc(100% + 6px)',left:0,zIndex:100,background:'#fff',
               border:'0.5px solid #e6ddc9',borderRadius:12,padding:14,width:286,
               boxShadow:'0 8px 28px rgba(0,0,0,.12)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <button type="button" onClick={()=>setView(new Date(year,month-1,1))} style={{background:'none',border:'none',color:GOLD,fontSize:18,cursor:'pointer',padding:'2px 8px',borderRadius:6}}>‹</button>
              <span style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:600}}>{monthNames[month]} {year}</span>
              <button type="button" onClick={()=>setView(new Date(year,month+1,1))} style={{background:'none',border:'none',color:GOLD,fontSize:18,cursor:'pointer',padding:'2px 8px',borderRadius:6}}>›</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
              {dayNames.map(d=><div key={d} style={{textAlign:'center',fontSize:10,fontWeight:700,color:'#999',letterSpacing:'.05em',padding:'4px 0'}}>{d.toUpperCase()}</div>)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
              {cells.map((d,i)=>{
                if (d===null) return <div key={i} />
                const dt = new Date(year,month,d); dt.setHours(0,0,0,0)
                const isSel = sel && dt.getTime()===sel.getTime()
                const isToday = dt.getTime()===today.getTime()
                const isDisabled = minD && dt<minD
                const isWeekend = i%7>=5
                const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                const wxc = !isDisabled ? wxDays[iso] : undefined
                return (
                  <button key={i} type="button" disabled={isDisabled} className="ip-dpd"
                    onClick={()=>{
                      onChange(iso); setOpen(false)
                    }}
                    style={{
                      position:'relative',padding:'8px 0',fontSize:12,border:'none',borderRadius:6,cursor:isDisabled?'not-allowed':'pointer',
                      background: isSel?GOLD:'transparent',
                      color: isSel?'#fff':(isDisabled?'#ddd':(isWeekend?'#bbb':DARK)),
                      fontWeight: isSel?700:400,
                      outline: isToday&&!isSel?`1px solid ${GOLD}`:'none',
                      transition:'background .12s',
                    }}
                    onMouseEnter={e=>{ if(!isSel&&!isDisabled) e.currentTarget.style.background='#f0ece4' }}
                    onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.background='transparent' }}>
                    {d}
                    {wxc != null && <span className="ip-dpd-wx">{wxIcon(wxc.c)[0]} {wxc.t}°C<br/><span style={{fontWeight:400,color:'#8a8278'}}>{wxIcon(wxc.c)[1]}</span></span>}
                  </button>
                )
              })}
            </div>
            <div style={{marginTop:10,paddingTop:8,borderTop:'0.5px solid #e6ddc9',display:'flex',justifyContent:'space-between',fontSize:10,color:'#888'}}>
              <span><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:GOLD,verticalAlign:'middle',marginRight:4}} />Gewählt</span>
              <span><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',border:'1px solid '+GOLD,verticalAlign:'middle',marginRight:4}} />Heute</span>
              {!inline && <button type="button" onClick={()=>setOpen(false)} style={{background:'none',border:'none',color:GOLD,fontSize:10,fontWeight:700,cursor:'pointer'}}>Schließen</button>}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div id="ip-booking-root" style={{maxWidth:860,margin:'0 auto',padding:'24px 20px',fontFamily:"'Open Sans','Lato',Arial,sans-serif",color:DARK,background:CREAM,minHeight: inIframe ? 'auto' : '100vh'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&family=Playfair+Display:wght@600&display=swap');
        .ip-fade{animation:ipf .25s ease}
        @keyframes ipf{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .ip-slot{padding:9px 0;font-size:13px;border:0.5px solid #e6ddc9;border-radius:7px;background:#fff;cursor:pointer;color:${DARK};text-align:center;transition:all .12s;position:relative}
        .ip-slot:hover{border-color:${GOLD};color:${GOLD}}
        .ip-slot.warn{border-color:#e0a82e;background:#fffbf0}
        .ip-slot.reco{border-color:#9bc18c;background:#f3f9ef;color:#2f6e3f;font-weight:600}
        .ip-dpd .ip-dpd-wx{position:absolute;bottom:calc(100% + 5px);left:50%;transform:translateX(-50%) translateY(3px);background:#fff;border:0.5px solid #e6ddc9;border-radius:9px;padding:5px 10px;font-size:12px;font-weight:700;color:#3a352c;line-height:1.45;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .14s,transform .14s;box-shadow:0 6px 18px rgba(0,0,0,.14);z-index:60;text-decoration:none}
        .ip-dpd:hover .ip-dpd-wx{opacity:1;transform:translateX(-50%) translateY(0)}
        .ip-slot.reco.sel{background:${GOLD};border-color:${GOLD};color:#fff}
        .ip-slot.sel{background:${GOLD};border-color:${GOLD};color:#fff;font-weight:700}
        .ip-slot.warn.sel{background:${GOLD};border-color:${GOLD};color:#fff;font-weight:700}
        .ip-slot.busy{background:#f9f9f9;color:#bbb;cursor:not-allowed;text-decoration:line-through}
        .ip-svc{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#fff;border:0.5px solid #e6ddc9;border-radius:12px;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;text-align:left;width:100%;position:relative}
        .ip-svc:hover{border-color:${GOLD};transform:scale(1.025);box-shadow:0 6px 18px rgba(0,0,0,.08);z-index:2}
        .ip-svc.sel{border-color:${GOLD};border-width:1.5px;background:#6b6b6e08;transform:scale(1.025);box-shadow:0 6px 18px rgba(184,137,42,.18);z-index:1}
        input,textarea{width:100%;padding:11px 14px;font-size:14px;border:0.5px solid #e6ddc9;border-radius:8px;margin-bottom:10px;box-sizing:border-box;background:#fff;color:${DARK};font-family:inherit;outline:none}
        input:focus,textarea:focus{border-color:${GOLD}}
        input.req-empty{border-color:#e3b7b7}
        .pac-container{z-index:99999!important;font-family:'Lato',sans-serif!important;border-radius:8px!important}
        .ip-addon{display:flex;align-items:center;gap:10px;padding:11px 14px;border:0.5px solid #e6ddc9;border-radius:10px;background:#fff;cursor:pointer;margin-bottom:8px;transition:all .12s}
        .ip-addon.on{border-color:${GOLD};background:#6b6b6e0a}
        .ip-addon input{width:auto;margin:0}
        /* MOBIL OPTIMALIZÁLÁS (<560px) */
        @media (max-width:560px){
          #ip-booking-root{padding:14px 12px!important}
          .ip-mob-h2{font-size:17px!important}
          .ip-mob-h1{font-size:20px!important}
          .ip-mob-grid-2{grid-template-columns:1fr!important;gap:6px!important}
          .ip-mob-grid-svc{grid-template-columns:1fr!important;gap:8px!important}
          .ip-mob-grid-3step{grid-template-columns:1fr!important;gap:14px!important}
          .ip-mob-grid-slots{grid-template-columns:repeat(3,1fr)!important;max-height:none!important}
          .ip-svc{padding:10px 12px!important}
          .ip-svc:hover{transform:none!important;box-shadow:none!important}
          .ip-svc.sel{transform:none!important;box-shadow:none!important}
          .ip-mob-step{font-size:10px!important;padding:6px 0!important}
          .ip-mob-step-label{display:none!important}
          .ip-mob-stepper-active{font-size:11px!important;display:inline!important}
          .ip-mob-stepper-num{width:22px!important;height:22px!important;font-size:11px!important}
          .ip-mob-cat-circle{width:46px!important;height:46px!important}
          .ip-mob-cat-circle img,.ip-mob-cat-circle span{font-size:20px}
          .ip-datepicker-pop{width:calc(100vw - 36px)!important;max-width:300px!important;left:0!important}
          input,textarea{font-size:16px!important;padding:10px 12px!important}
          .ip-summary{padding:12px!important;font-size:13px!important}
          .ip-nav-btn{padding:10px 18px!important;font-size:13px!important}
        }
      `}</style>

      {!done && (
        <div style={{display:'flex',alignItems:'center',marginBottom:24,background:'#f0ece4',borderRadius:10,padding:'10px 14px',gap:4}}>
          {[['Leistung',1],['Daten',2],['Termin',3]].map(([label,n],i,arr)=>(
            <div key={n} style={{display:'contents'}}>
              <div onClick={()=>{ if(n<step) setStep(n) }} style={{display:'flex',alignItems:'center',gap:5,flex:1,cursor:n<step?'pointer':'default'}} title={n<step?'Zurück zu '+label:''}>
                <div style={{width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0,
                  background: step>=n?GOLD:'transparent', color: step>=n?'#fff':'#aaa', border: step>=n?'none':`1.5px solid #ccc`}}>
                  {step>n?'✓':n}
                </div>
                <span className={step===n?'ip-mob-stepper-active':'ip-mob-step-label'} style={{fontSize:11,fontWeight:step===n?700:400,color:step>=n?GOLD:'#aaa',textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</span>
              </div>
              {i<arr.length-1 && <div style={{width:20,height:1,background:'#ddd',flexShrink:0}} />}
            </div>
          ))}
        </div>
      )}

      {/* STEP 1 — Leistung + Zusätze */}
      {step===1 && !done && (
        <div className="ip-fade">
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:600,marginBottom:16}}>Welche Leistung benötigen Sie?</h2>
          {[...CAT_ORDER, ...[...new Set(services.map(s=>s.category).filter(Boolean))].filter(c=>!CAT_ORDER.includes(c))].map(cat=>{
            const list = services.filter(s=>s.category===cat)
            if(!list.length) return null
            return (
              <div key={cat} style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:GOLD,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:7}}>{CAT_LABEL[cat]||cat}</div>
                <div className="ip-mob-grid-svc" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {list.map(s=>(
                    <button key={s.id} className={`ip-svc${service?.id===s.id?' sel':''}`} onClick={()=>{setService(s);setAddon360(false);setAddonDrone(false)}}>
                      <CatCircle svc={s} selected={service?.id===s.id} />
                      <span style={{display:'flex',flexDirection:'column'}}>
                        <span style={{fontSize:15,fontWeight:700,color:DARK,marginBottom:6}}>{s.name}</span>
                        {s.description && <span style={{fontSize:11,color:'#888',lineHeight:1.4,marginBottom:4}} dangerouslySetInnerHTML={{__html:s.description}} />}
                        <span style={{fontSize:11,color:GOLD,fontWeight:700}}>ca. {s.duration_min} Min.</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {service && (is360Available || isDroneAvailable) && (
            <div style={{marginTop:8}}>
              <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Optionale Zusätze</div>
              {isDroneAvailable && (
                <label className={`ip-addon${addonDrone?' on':''}`}>
                  <input type="checkbox" checked={addonDrone} onChange={e=>setAddonDrone(e.target.checked)} />
                  <span style={{flex:1,fontSize:13,fontWeight:700}}>Drohnenaufnahmen</span>
                  <span style={{fontSize:12,color:GOLD,fontWeight:700}}>+15 Min.</span>
                </label>
              )}
              {is360Available && (
                <label className={`ip-addon${addon360?' on':''}`}>
                  <input type="checkbox" checked={addon360} onChange={e=>setAddon360(e.target.checked)} />
                  <span style={{flex:1,fontSize:13,fontWeight:700}}>360°-Tour</span>
                  <span style={{fontSize:12,color:GOLD,fontWeight:700}}>+30 Min.</span>
                </label>
              )}
            </div>
          )}

          {service && <Nav onNext={()=>setStep(2)} canNext={can[2]} />}
        </div>
      )}

      {/* STEP 2 — Adresse & Kontaktdaten */}
      {step===2 && !done && (
        <div className="ip-fade">
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:600,marginBottom:16}}>Adresse & Kontaktdaten</h2>
          <div style={{display:'flex',flexDirection:'column',gap:24}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Shooting-Adresse</div>
              <input ref={addrRef} type="text" placeholder="Straße, PLZ, Ort eingeben…" defaultValue={addr.address} onChange={e=>setAddr(a=>({...a, address:e.target.value}))} className={!addr.address?'req-empty':''} />
              {addr.plz && <p style={{fontSize:12,color:'#15803d',margin:'-4px 0 10px'}}>✓ {addr.address}</p>}
              <div ref={mapRef} style={{width:'100%',height:220,borderRadius:10,background:'#eee',border:'0.5px solid #e6ddc9',display: addr.lat?'block':'none'}} />
              {!addr.lat && !isDemo && <p style={{fontSize:11,color:'#aaa',margin:'0'}}>Bitte eine Adresse aus den Vorschlägen wählen — die Karte erscheint automatisch.</p>}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Ihre Kontaktdaten</div>
              <div className="ip-mob-grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <input placeholder="Vorname *" value={contact.vorname} onChange={e=>setContact({...contact,vorname:e.target.value})} className={!contact.vorname.trim()?'req-empty':''} style={{marginBottom:0}} />
                <input placeholder="Nachname *" value={contact.nachname} onChange={e=>setContact({...contact,nachname:e.target.value})} className={!contact.nachname.trim()?'req-empty':''} style={{marginBottom:0}} />
              </div>
              <div className="ip-mob-grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:10}}>
                <input placeholder="E-Mail *" type="email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})} className={!/\S+@\S+\.\S+/.test(contact.email)?'req-empty':''} style={{marginBottom:0}} />
                <input placeholder="Handy *" value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})} className={!contact.phone.trim()?'req-empty':''} style={{marginBottom:0}} />
              </div>
              <input placeholder="Immobilienbüro (optional)" value={contact.office} onChange={e=>setContact({...contact,office:e.target.value})} style={{marginTop:10}} />
              <textarea placeholder="Anmerkung * (z.B. Schlüsselübergabe, Wünsche…)" value={contact.note} onChange={e=>setContact({...contact,note:e.target.value})} className={!contact.note.trim()?'req-empty':''} style={{minHeight:80,resize:'vertical'}} />
            </div>
          </div>
          <Nav onBack={()=>setStep(1)} onNext={()=>setStep(3)} canNext={can[3]} />
        </div>
      )}

      {/* STEP 3 — Termin (utazás-tudatos) */}
      {step===3 && !done && (
        <div className="ip-fade">
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:600,marginBottom:16}}>Datum & Uhrzeit wählen</h2>
          <div className="ip-mob-grid-3step" style={{display:'grid',gridTemplateColumns:'1fr 1.2fr',gap:20}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Datum</div>
              <DatePicker value={date} min={minDate} onChange={setDate} inline />

              {date && (
                <>
                  <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Verfügbarkeit</div>
                  <div style={{background:'#f0ece4',borderRadius:10,padding:10,display:'flex',flexDirection:'column',gap:6}}>
                    {loadingSlots ? <div style={{fontSize:12,color:'#888',padding:8}}>⟳ Wird geladen...</div>
                    : providerSlots.map(pr=>(
                      <div key={pr.init} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,background:pr.busy?'#fef2f2':'#f0fdf4'}}>
                        <Avatar p={pr} size={28} dim={pr.busy} />
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:700,color:DARK}}>{pr.name}</div>
                          <div style={{fontSize:10,color:pr.busy?'#b91c1c':'#15803d'}}>{pr.busy?'Ausgebucht':`${pr.free} freie Termine`}</div>
                        </div>
                        <span style={{fontSize:16}}>{pr.busy?'✗':'✓'}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

            </div>

            <div>
              <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Uhrzeit</div>
              {!date ? <div style={{fontSize:12,color:'#aaa',padding:16,textAlign:'center'}}>Bitte zuerst Datum wählen</div>
              : loadingSlots ? <div style={{fontSize:12,color:'#888',padding:16,textAlign:'center'}}>⟳ Lädt...</div>
              : slots.length===0 ? <div style={{fontSize:12,color:'#b91c1c',padding:16,textAlign:'center',background:'#fef2f2',borderRadius:8}}>Keine freien Termine</div>
              : (
                <>
                  <div className="ip-mob-grid-slots" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                    {Array.from({length:33},(_,i)=>{
                      const h = Math.floor(i/4)+9, m = (i%4)*15
                      if(h>17||(h===17&&m>0)) return null
                      const t = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
                      const isFree = slots.includes(t)
                      const isWarn = warnTimes.includes(t)
                      const isReco = recoTimes.includes(t)
                      return (
                        <button key={t} className={`ip-slot${time===t?' sel':''}${!isFree?' busy':''}${isFree&&isWarn?' warn':''}${isFree&&isReco&&!isWarn?' reco':''}`}
                          onClick={()=>{ if(isFree){ setTime(t); setProvider(null) } }} disabled={!isFree} title={isWarn?'Knapp wegen Anfahrt':(isReco?'Empfohlen: Fotograf in der Nähe':'')}>
                          {isFree&&isReco&&!isWarn?'✦ ':''}{t}{isFree&&isWarn?' ⚠':''}
                        </button>
                      )
                    })}
                  </div>
                  {recoTimes.length>0 && (
                    <div style={{marginTop:10,fontSize:11,color:'#2f6e3f',background:'#f3f9ef',border:'0.5px solid #cde3c6',borderRadius:8,padding:'8px 10px'}}>
                      ✦ Empfohlene Zeiten: Ihr Fotograf ist dann bereits in Ihrer Nähe — kurze Anfahrt.
                    </div>
                  )}
                  {warnTimes.length>0 && (
                    <div style={{marginTop:10,fontSize:11,color:'#6b6b6e',background:'#fffbf0',border:'0.5px solid #f0d9a8',borderRadius:8,padding:'8px 10px'}}>
                      ⚠ Markierte Zeiten: Ankunft kann sich wegen der Anfahrt um bis zu 15 Min verschieben.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="ip-mob-grid-3step" style={{display:'grid',gridTemplateColumns:wx?'1fr 1fr':'1fr',gap:14,marginTop:14,alignItems:'stretch'}}>
            <div style={{padding:'12px 14px',background:'#fff',border:'0.5px solid #e6ddc9',borderRadius:10,fontSize:12.5}}>
              <div style={{fontWeight:700,color:DARK}}>{service?.name}</div>
              <div style={{color:'#888',marginTop:2}}>ca. {(service?.duration_min||0) + addonMin} Min.{addonMin?' (inkl. Zusätze)':''}</div>
              <div style={{color:'#888',marginTop:2}}>📍 {addr.address}</div>
              {time && (
                <div style={{color:GOLD,fontWeight:700,marginTop:4}}>✓ {fmtDate(date,{weekday:'short',day:'2-digit',month:'short'})} · {time} Uhr</div>
              )}
              {(isDroneAvailable || is360Available) && (
                <div style={{marginTop:9,paddingTop:9,borderTop:'0.5px solid #efe9dc'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#aaa',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:5}}>Zusätze (auch nachträglich wählbar)</div>
                  {isDroneAvailable && (
                    <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',padding:'3px 0'}}>
                      <input type="checkbox" checked={addonDrone} onChange={e=>setAddonDrone(e.target.checked)} style={{accentColor:GOLD,width:15,height:15}} />
                      <span style={{flex:1,fontSize:12.5,fontWeight:addonDrone?700:400,color:addonDrone?GOLD:DARK}}>Drohnenaufnahmen <span style={{color:'#aaa',fontWeight:400}}>+15 Min.</span></span>
                      {addonDrone && <span style={{color:GOLD,fontWeight:700}}>✓ gewählt</span>}
                    </label>
                  )}
                  {is360Available && (
                    <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',padding:'3px 0'}}>
                      <input type="checkbox" checked={addon360} onChange={e=>setAddon360(e.target.checked)} style={{accentColor:GOLD,width:15,height:15}} />
                      <span style={{flex:1,fontSize:12.5,fontWeight:addon360?700:400,color:addon360?GOLD:DARK}}>360°-Tour <span style={{color:'#aaa',fontWeight:400}}>+30 Min.</span></span>
                      {addon360 && <span style={{color:GOLD,fontWeight:700}}>✓ gewählt</span>}
                    </label>
                  )}
                  <div style={{fontSize:10.5,color:'#a39b89',marginTop:3}}>Bei Änderung werden die freien Zeiten neu berechnet.</div>
                </div>
              )}
            </div>
            {wx && (
              <div style={{padding:'12px 14px',background:'#fff',border:'0.5px solid #e6ddc9',borderRadius:10,fontSize:12.5}}>
                <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:5}}>Wetter am Termintag</div>
                <div style={{color:DARK,fontWeight:700}}>{wxIcon(wx.code)[0]} {wx.tmax}°C, {wxIcon(wx.code)[1]}{wx.rain != null ? ` · ☔ ${wx.rain}%` : ''}</div>
                <div style={{color:'#888',marginTop:3}}>💨 Wind max {wx.wind} km/h{wx.sunset ? ` · 🌇 Sonnenuntergang ${wx.sunset}` : ''}</div>
                {wx.golden && <div style={{color:GOLD,marginTop:3,fontWeight:700}}>✨ Goldene Stunde ab ca. {wx.golden} Uhr</div>}
                {isDroneAvailable && addonDrone && wx.wind > 30 && <div style={{marginTop:5,color:'#8a6a1f',background:'#fdf6e3',border:'0.5px solid #ecd9a8',borderRadius:6,padding:'5px 8px'}}>⚠ Starker Wind erwartet — Drohnenaufnahmen evtl. eingeschränkt.</div>}
              </div>
            )}
          </div>

          {time && (() => {
            const sf = slotsFull.find(s => s.time === time)
            const infos = sf?.infos && Object.keys(sf.infos).length ? sf.infos : (sf?.info && sf?.auto ? { [sf.auto]: sf.info } : null)
            if (!infos || !addr.address) return null
            const inits = Object.keys(infos)
            const acting = (provider && infos[provider]) ? provider : (sf.auto && infos[sf.auto] ? sf.auto : inits[0])
            const inf = infos[acting]
            const isW = warnTimes.includes(time)
            const delay = inf?.delayMin || 0
            const warnState = delay > 0 || isW
            const actName = (providers.find(p => p.init === acting)?.name || acting).split(' ')[0]
            const headTxt = !inf ? '' : inf.home
              ? `${actName} startet von zu Hause — pünktliche Ankunft um ${time} Uhr.`
              : delay > 0
                ? `${actName} kommt von einem Termin in ${inf.from} (bis ${inf.prevEnd} Uhr) — Ankunft evtl. bis zu ${delay} Min später.`
                : `${actName} kommt von einem Termin in ${inf.from} — pünktliche Ankunft um ${time} Uhr.`
            const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            const MAP_STYLE = [
              'feature:landscape|color:0xf3ecdc',
              'feature:landscape.natural|element:geometry|color:0xeae6d2',
              'feature:water|color:0xdde7d8',
              'feature:poi|visibility:off',
              'feature:transit|visibility:off',
              'feature:road|element:geometry|color:0xe4dac2',
              'feature:road.highway|element:geometry|color:0xdccfae',
              'feature:road|element:labels|visibility:off',
              'feature:administrative|element:geometry|visibility:off',
              'feature:administrative.locality|element:labels.text.fill|color:0x8a8278',
              'feature:administrative.locality|element:labels.text.stroke|color:0xf3ecdc',
            ].map(st => '&style=' + encodeURIComponent(st)).join('')
            let mapSrc = null
            if (key && routeMaps[acting]?.polyline) {
              let parts = ''
              inits.forEach(init => {
                const rm = routeMaps[init]
                if (!rm?.polyline) return
                const selP = init === acting
                parts += `&path=${encodeURIComponent((selP ? 'weight:5|color:0xb8892aff' : 'weight:3|color:0x9a9387aa') + '|enc:' + rm.polyline)}`
              })
              const mOrigin = typeof window !== 'undefined' && window.location.origin.indexOf('https://') === 0 ? window.location.origin : null
              inits.forEach(init => {
                const io = infos[init]
                if (!io?.originQuery) return
                const selP = init === acting
                const prM = providers.find(p => p.init === init)
                if (mOrigin && prM?.avatar_url) {
                  parts += `&markers=${encodeURIComponent(`anchor:center|icon:${mOrigin}/api/booking/avatarmarker?init=${encodeURIComponent(init)}&sel=${selP ? 1 : 0}|` + io.originQuery)}`
                } else {
                  parts += `&markers=${encodeURIComponent(`size:mid|color:${selP ? '0xb8892a' : '0x8d8478'}|label:${(init || '?')[0].toUpperCase()}|` + io.originQuery)}`
                }
              })
              parts += `&markers=${encodeURIComponent('color:0xb8892a|' + addr.address)}`
              mapSrc = `https://maps.googleapis.com/maps/api/staticmap?size=640x240&scale=2&language=de${MAP_STYLE}${parts}&key=${key}`
            }
            const minKm = Math.min(...inits.map(i => routeMaps[i]?.km ?? infos[i]?.travelMin ?? Infinity))
            return (
              <div style={{marginTop:16,border:'0.5px solid #e6ddc9',borderRadius:14,overflow:'hidden',background:'#fff'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:7,padding:'10px 16px',fontSize:13,fontWeight:600,background:warnState?'#fdf6e3':'#eef5ea',borderBottom:'0.5px solid '+(warnState?'#ecd9a8':'#cde3c6'),color:warnState?'#8a6a1f':'#27500a'}}>
                  <span>{warnState?'⚠':'✓'}</span><span>{headTxt}</span>
                </div>
                {mapSrc
                  ? <img src={mapSrc} alt="Anfahrt" style={{width:'100%',height:'auto',display:'block'}} />
                  : <div style={{height:120,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#a39b89',background:'#f6f0e4'}}>Karte wird geladen…</div>}
                <div style={{borderTop:'0.5px solid #e6ddc9'}}>
                  {inits.map(init => {
                    const io = infos[init]
                    const pr = providers.find(p => p.init === init)
                    const rm = routeMaps[init]
                    const selP = init === acting
                    const km = rm?.km
                    const best = inits.length > 1 && ((km ?? io?.travelMin ?? Infinity) === minKm) && isFinite(minKm)
                    return (
                      <div key={init} onClick={() => setProvider(init)} title="Diesen Fotografen wählen"
                        style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',cursor:'pointer',background:selP?'#fdf6e3':'transparent',borderBottom:'0.5px solid #efe9dc'}}>
                        {pr ? <Avatar p={pr} size={28} /> : <span style={{width:28,height:28,borderRadius:'50%',background:'#f0ece4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#8a8278'}}>{(init||'?')[0]}</span>}
                        <div style={{flex:1,minWidth:0}}>
                          <span style={{fontSize:12.5,fontWeight:700,color:DARK}}>{pr?.name || init}</span>
                          <span style={{fontSize:11.5,color:'#8a8278',marginLeft:8}}>{io?.home ? `startet von Zuhause (${io.from})` : `kommt aus ${io?.from || '?'}${io?.prevEnd ? ' · Termin bis ' + io.prevEnd : ''}`}</span>
                        </div>
                        {best && <span style={{fontSize:10.5,fontWeight:700,color:'#2f6e3f',background:'#f3f9ef',border:'0.5px solid #cde3c6',borderRadius:20,padding:'2px 9px',whiteSpace:'nowrap'}}>🌱 Kürzeste Anfahrt</span>}
                        <span style={{fontSize:12,color:'#6b6459',whiteSpace:'nowrap'}}>🚗 ca. {rm?.min ?? io?.travelMin} Min{km ? ` · ${km} km` : ''}</span>
                        <span style={{fontSize:14,color:selP?GOLD:'#d8d2c4'}}>{selP?'●':'○'}</span>
                      </div>
                    )
                  })}
                  <div style={{padding:'7px 14px',fontSize:11,color:'#a39b89'}}>🏠 Ankunft ca. {delay > 0 ? `${inf?.eta} (+${delay} Min)` : time} · Tippen Sie auf einen Fotografen, um ihn auszuwählen.</div>
                </div>
              </div>
            )
          })()}

          {time && freeInitsAtTime && freeInitsAtTime.length>0 && (
                    <div style={{marginTop:14}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Fotograf (optional)</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                        <button type="button" onClick={()=>setProvider(null)}
                          style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:9,cursor:'pointer',
                            border:'1px solid '+(provider===null?GOLD:'#e6ddc9'),background:provider===null?GOLD:'#fff',color:provider===null?'#fff':DARK,fontSize:12,fontWeight:700}}>
                          ✨ Automatisch
                        </button>
                        {providers.filter(pr=>freeInitsAtTime.includes(pr.init)).map(pr=>{
                          const sel = provider===pr.init
                          return (
                            <button type="button" key={pr.init} onClick={()=>setProvider(pr.init)}
                              style={{display:'flex',alignItems:'center',gap:7,padding:'5px 12px 5px 6px',borderRadius:9,cursor:'pointer',
                                border:'1px solid '+(sel?GOLD:'#e6ddc9'),background:sel?GOLD:'#fff',color:sel?'#fff':DARK,fontSize:12,fontWeight:700}}>
                              <Avatar p={pr} size={24} />
                              {pr.name}
                            </button>
                          )
                        })}
                      </div>
                      {provider===null && slotForTime?.auto && (
                        <div style={{marginTop:8,fontSize:12,color:GOLD,fontWeight:700}}>
                          ✨ Automatisch: {(providers.find(p=>p.init===slotForTime.auto)?.name)||slotForTime.auto}
                        </div>
                      )}
                    </div>
                  )}

          <Nav onBack={()=>setStep(2)} onNext={()=>{ const di=delayInfo(); if(di.delay>0){ setDelayAck(false); setDelayModal(true) } else submit() }} canNext={can.submit&&!submitting} nextLabel={submitting?'Wird gebucht…':'Verbindlich buchen'} />

          {delayModal && (() => {
            const di = delayInfo(); const inf = di.inf || {}
            return (
              <div onClick={()=>!submitting&&setDelayModal(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 16px',zIndex:1000}}>
                <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:14,maxWidth:420,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,.25)',overflow:'hidden'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,padding:'18px 20px 14px'}}>
                    <div style={{width:40,height:40,borderRadius:'50%',background:'#FAEEDA',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:22}}>⏱</div>
                    <div style={{fontSize:18,fontWeight:700,lineHeight:1.3,color:DARK}}>Start evtl. bis zu {di.delay} Min später</div>
                  </div>
                  <div style={{padding:'0 20px 14px',fontSize:14,color:'#6b6b66',lineHeight:1.6}}>Direkt vor diesem Termin hat {di.actName||'unser Fotograf'} einen Einsatz in der Nähe. Durch die Anfahrt kann der Beginn ein paar Minuten später als gebucht sein.</div>
                  {inf.prevEnd && <div style={{margin:'0 20px 14px',background:'#FAEEDA',borderRadius:8,padding:'10px 12px',fontSize:13,color:'#633806',display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:16}}>🚗</span><span>Voriger Termin{inf.from?(' in '+inf.from):''} endet {inf.prevEnd}{inf.travelMin!=null?(' · Anfahrt ~'+inf.travelMin+' Min'):''}{inf.eta?(' · Ankunft ca. '):''}{inf.eta?<b>{inf.eta}</b>:null}</span></div>}
                  <div style={{margin:'0 20px 14px',border:'1px solid #ece4d6',borderRadius:8,padding:'12px 14px',fontSize:13,color:'#6b6b66',lineHeight:1.7}}>
                    <div style={{fontWeight:700,color:DARK}}>{fmtDate(date,{weekday:'short',day:'numeric',month:'long',year:'numeric'})} · {time} Uhr</div>
                    {service&&<div>{service.name}</div>}
                    {addr.address&&<div>{addr.address}{addr.plz?(', '+addr.plz):''}</div>}
                  </div>
                  <label style={{display:'flex',alignItems:'flex-start',gap:10,margin:'0 20px 16px',cursor:'pointer'}}>
                    <input type="checkbox" checked={delayAck} onChange={e=>setDelayAck(e.target.checked)} style={{width:18,height:18,marginTop:1,accentColor:GOLD,flexShrink:0}} />
                    <span style={{fontSize:13,color:DARK,lineHeight:1.5}}>Ich akzeptiere eine mögliche Verspätung von bis zu {di.delay} Minuten.</span>
                  </label>
                  <div style={{display:'flex',gap:10,padding:'0 20px 20px'}}>
                    <button onClick={()=>{ setDelayModal(false); setStep(2) }} disabled={submitting} style={{flex:1,height:42,fontSize:13,fontWeight:700,background:'#fff',color:DARK,border:'1px solid #ddd6c9',borderRadius:8,cursor:'pointer'}}>Anderen Termin wählen</button>
                    <button onClick={()=>submit()} disabled={!delayAck||submitting} style={{flex:1,height:42,fontSize:13,fontWeight:700,background:(!delayAck||submitting)?'#c7c7c4':GOLD,color:'#fff',border:'none',borderRadius:8,cursor:(!delayAck||submitting)?'default':'pointer'}}>{submitting?'Wird gebucht…':'Termin bestätigen'}</button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {done && (
        <div className="ip-fade" style={{textAlign:'center',padding:'48px 0'}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:GOLD,color:'#fff',fontSize:28,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>✓</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:600,marginBottom:10}}>Anfrage erhalten!</h2>
          <p style={{fontSize:14,color:'#666',maxWidth:380,margin:'0 auto'}}>
            Wir prüfen Ihre Anfrage und melden uns in Kürze zur Bestätigung. Sie erhalten eine E-Mail mit allen Details.
          </p>
          {date && time && (() => {
            const durMin = (service?.duration_min || 60) + addonMin
            const pad = n => String(n).padStart(2, '0')
            const [hh, mm] = time.split(':').map(Number)
            const d0 = date.replace(/-/g, '')
            const endT = hh * 60 + mm + durMin
            const dtStart = `${d0}T${pad(hh)}${pad(mm)}00`
            const dtEnd = `${d0}T${pad(Math.floor(endT / 60))}${pad(endT % 60)}00`
            const title = `ImmoPixels Fotoshooting — ${service?.name || ''}`
            const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dtStart}/${dtEnd}&ctz=Europe/Berlin&location=${encodeURIComponent(addr.address || '')}&details=${encodeURIComponent('Gebucht über immopixels.de')}`
            const downloadIcs = () => {
              const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ImmoPixels//Buchung//DE','BEGIN:VEVENT',
                `UID:${Date.now()}@immopixels.de`,`DTSTART;TZID=Europe/Berlin:${dtStart}`,`DTEND;TZID=Europe/Berlin:${dtEnd}`,
                `SUMMARY:${title}`,`LOCATION:${(addr.address || '').replace(/,/g, '\\,')}`,'DESCRIPTION:Gebucht über immopixels.de','END:VEVENT','END:VCALENDAR'].join('\r\n')
              const u = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
              const a = document.createElement('a'); a.href = u; a.download = 'immopixels-termin.ics'; a.click()
              setTimeout(() => URL.revokeObjectURL(u), 5000)
            }
            return (
              <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginTop:22}}>
                <button onClick={downloadIcs} style={{padding:'10px 18px',fontSize:13,fontWeight:700,background:'#fff',border:'1px solid '+GOLD,color:GOLD,borderRadius:9,cursor:'pointer'}}>📅 Termin speichern (.ics)</button>
                <a href={gcal} target="_blank" rel="noreferrer" style={{padding:'10px 18px',fontSize:13,fontWeight:700,background:GOLD,border:'1px solid '+GOLD,color:'#fff',borderRadius:9,textDecoration:'none'}}>📆 Zu Google Kalender</a>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function Nav({onBack,onNext,canNext,nextLabel='Weiter →'}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',marginTop:20,gap:12}}>
      {onBack ? <button onClick={onBack} style={{padding:'11px 22px',fontSize:13,background:'none',border:'0.5px solid #ccc',borderRadius:8,cursor:'pointer',color:'#666'}}>← Zurück</button> : <span/>}
      <button onClick={onNext} disabled={!canNext}
        style={{padding:'11px 28px',fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em',background:canNext?GOLD:'#ddd',color:canNext?'#fff':'#999',border:'none',borderRadius:8,cursor:canNext?'pointer':'not-allowed',transition:'background .15s'}}>
        {nextLabel}
      </button>
    </div>
  )
}
