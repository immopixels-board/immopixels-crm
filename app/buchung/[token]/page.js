'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

const GOLD='#b8892a', CREAM='#faf7f0', DARK='#2a2a28'
const STATUS_LABEL = { pending:'In Prüfung', confirmed:'Bestätigt', cancelled:'Storniert' }
const STATUS_COLOR = { pending:'#b8892a', confirmed:'#15803d', cancelled:'#b91c1c' }

export default function ManagePage() {
  const params = useParams()
  const token = params.token
  const [b, setB] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const mgAddrRef = useRef(null)

  // szerkesztő mezők
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [slots, setSlots] = useState([])
  const [warnTimes, setWarnTimes] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [form, setForm] = useState({ vorname:'', nachname:'', email:'', phone:'', address:'', note:'', addon360:false, addonDrone:false })

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/booking/manage?token=${token}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error||'not found')
      setB(d)
      const [vn, ...rest] = (d.client_name||'').split(' ')
      setDate(d.card_date||'')
      setTime(String(d.card_time||'').slice(0,5))
      setForm({
        vorname: vn||'', nachname: rest.join(' ')||'',
        email: d.customer_email||'', phone: d.customer_phone||'',
        address: d.booking_address||'', note: d.description||'',
        addon360: !!d.addon_360, addonDrone: !!d.addon_drone,
      })
    } catch(e) { setError(e.message) }
    setLoading(false)
  }
  useEffect(() => { if(token) load() }, [token])

  // Google Places autocomplete a cím-mezőn (csak szerkesztés-módban)
  useEffect(() => {
    if (!editing) return
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) return
    function initAC() {
      const el = mgAddrRef.current
      if (!el || el._acDone) return
      if (!window.google?.maps?.places?.Autocomplete) return
      el._acDone = true
      const ac = new window.google.maps.places.Autocomplete(el, {
        componentRestrictions: { country:'de' },
        fields: ['formatted_address'],
      })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        const a = place.formatted_address || el.value
        setForm(prev => ({ ...prev, address: a }))
      })
    }
    if (window.google?.maps?.places?.Autocomplete) { setTimeout(initAC, 60) }
    else if (!document.getElementById('gmap-buchen')) {
      const s = document.createElement('script')
      s.id = 'gmap-buchen'
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
      s.async = true; s.onload = () => setTimeout(initAC, 100); document.head.appendChild(s)
    } else {
      const t = setInterval(() => { if (window.google?.maps?.places?.Autocomplete) { clearInterval(t); initAC() } }, 200)
      return () => clearInterval(t)
    }
  }, [editing])

  const is360 = b && b.serviceCategory !== 'Gespräch'
  const isDrone = b && b.serviceCategory === 'Immobilienfotografie' && (b.serviceName||'').toLowerCase().indexOf('drohne')===-1

  // slotok betöltése szerkesztéskor
  useEffect(() => {
    if (!editing || !b || !date) return
    setLoadingSlots(true)
    const a360 = (is360 && form.addon360) ? 1 : 0
    const aDrone = (isDrone && form.addonDrone) ? 1 : 0
    const addrParam = form.address ? `&address=${encodeURIComponent(form.address)}` : ''
    fetch(`/api/booking/slots?serviceId=${b.booking_service_id}&date=${date}&addon360=${a360}&addonDrone=${aDrone}${addrParam}`)
      .then(r=>r.json()).then(d=>{setSlots(d.times||[]); setWarnTimes(d.warnTimes||[])}).catch(()=>setSlots([])).finally(()=>setLoadingSlots(false))
  }, [editing, date, b, form.addon360, form.addonDrone])

  async function save() {
    setSaving(true)
    try {
      const r = await fetch('/api/booking/update', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          token, date, time, address: form.address,
          customerName: `${form.vorname} ${form.nachname}`.trim(),
          customerEmail: form.email, customerPhone: form.phone, note: form.note,
          addon360: is360 && form.addon360, addonDrone: isDrone && form.addonDrone,
        })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error==='slot_unavailable' ? 'Dieser Zeitpunkt ist leider nicht mehr verfügbar.' : (d.error||'Fehler'))
      setEditing(false); await load()
    } catch(e) { alert(e.message) }
    setSaving(false)
  }

  async function doCancel() {
    if (!confirm('Möchten Sie diesen Termin wirklich stornieren?')) return
    setCancelling(true)
    try {
      const r = await fetch('/api/booking/cancel', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token}) })
      if (!r.ok) { const d=await r.json(); throw new Error(d.error||'Fehler') }
      await load()
    } catch(e) { alert(e.message) }
    setCancelling(false)
  }

  const fmtDate = d => d ? new Date(d+'T12:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) : ''
  const minDate = new Date(Date.now()+86400000).toISOString().slice(0,10)
  const inp = { width:'100%', padding:'10px 12px', fontSize:14, border:'0.5px solid #e6ddc9', borderRadius:8, boxSizing:'border-box', marginBottom:10, fontFamily:'inherit', outline:'none', background:'#fff', color:DARK }

  return (
    <div style={{minHeight:'100vh',background:CREAM,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Lato',Arial,sans-serif",padding:20}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Playfair+Display:wght@600&display=swap'); .pac-container{z-index:99999 !important;font-family:'Lato',sans-serif !important;border-radius:8px !important}`}</style>
      <div style={{background:'#fff',border:'1px solid #e6ddc9',borderRadius:16,padding:'36px 32px',maxWidth:520,width:'100%'}}>
        <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:600,color:DARK,marginBottom:20,textAlign:'center'}}>Ihr Termin</div>
        {loading ? <p style={{color:'#888',textAlign:'center'}}>Wird geladen…</p>
        : error ? <p style={{color:'#b91c1c',textAlign:'center'}}>Termin nicht gefunden.</p>
        : b && <>
          <div style={{display:'inline-block',padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:700,color:'#fff',background:STATUS_COLOR[b.booking_status],marginBottom:16}}>
            {STATUS_LABEL[b.booking_status]||b.booking_status}
          </div>

          {!editing ? <>
            <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'10px 16px',fontSize:14,color:'#444'}}>
              <span style={{color:'#888'}}>Leistung:</span><span style={{fontWeight:700,color:DARK}}>{b.serviceName}</span>
              <span style={{color:'#888'}}>Datum:</span><span style={{fontWeight:700,color:GOLD}}>{fmtDate(b.card_date)}</span>
              <span style={{color:'#888'}}>Uhrzeit:</span><span style={{fontWeight:700}}>{String(b.card_time).slice(0,5)} Uhr</span>
              <span style={{color:'#888'}}>Adresse:</span><span>{b.booking_address}</span>
              <span style={{color:'#888'}}>Name:</span><span>{b.client_name}</span>
              <span style={{color:'#888'}}>E-Mail:</span><span>{b.customer_email}</span>
              <span style={{color:'#888'}}>Telefon:</span><span>{b.customer_phone||'—'}</span>
            </div>
            {b.booking_status!=='cancelled' && <>
              <button onClick={()=>setEditing(true)} style={{marginTop:24,width:'100%',background:GOLD,color:'#fff',border:'none',borderRadius:10,padding:'12px',fontSize:14,fontWeight:700,cursor:'pointer'}}>Termin ändern</button>
              <button onClick={doCancel} disabled={cancelling} style={{marginTop:10,width:'100%',background:'#fff',color:'#b91c1c',border:'1px solid #e3b7b7',borderRadius:10,padding:'12px',fontSize:14,fontWeight:700,cursor:'pointer'}}>
                {cancelling?'Wird storniert…':'Termin stornieren'}
              </button>
            </>}
          </> : <>
            <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Datum</div>
            <input type="date" min={minDate} value={date} onChange={e=>{setDate(e.target.value);setTime('')}} style={inp} />
            {date && <>
              <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',margin:'6px 0'}}>Uhrzeit</div>
              {loadingSlots ? <p style={{fontSize:13,color:'#888'}}>Lädt…</p> :
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6,marginBottom:12}}>
                  {slots.length===0 ? <p style={{fontSize:12,color:'#b91c1c',gridColumn:'1/-1'}}>Keine freien Zeiten an diesem Tag</p>
                  : slots.map(t=>(
                    <button key={t} onClick={()=>setTime(t)} title={warnTimes.includes(t)?'Knapp wegen Anfahrt':''} style={{padding:'8px 0',fontSize:13,borderRadius:7,cursor:'pointer',border:'0.5px solid '+(time===t?GOLD:(warnTimes.includes(t)?'#e0a82e':'#e6ddc9')),background:time===t?GOLD:(warnTimes.includes(t)?'#fffbf0':'#fff'),color:time===t?'#fff':DARK,fontWeight:time===t?700:400}}>{t}{warnTimes.includes(t)?' ⚠':''}</button>
                  ))}
                </div>}
            </>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <input placeholder="Vorname" value={form.vorname} onChange={e=>setForm({...form,vorname:e.target.value})} style={{...inp,marginBottom:0}} />
              <input placeholder="Nachname" value={form.nachname} onChange={e=>setForm({...form,nachname:e.target.value})} style={{...inp,marginBottom:0}} />
            </div>
            <input placeholder="E-Mail" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={{...inp,marginTop:10}} />
            <input placeholder="Telefon" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} style={inp} />
            <input ref={mgAddrRef} placeholder="Adresse" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} style={inp} />
            {(is360||isDrone) && <div style={{display:'flex',gap:14,margin:'4px 0 10px'}}>
              {is360 && <label style={{fontSize:13,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={form.addon360} onChange={e=>{setForm({...form,addon360:e.target.checked});setTime('')}} /> 360° (+30m)</label>}
              {isDrone && <label style={{fontSize:13,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={form.addonDrone} onChange={e=>{setForm({...form,addonDrone:e.target.checked});setTime('')}} /> Drohne (+15m)</label>}
            </div>}
            <textarea placeholder="Anmerkung" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} style={{...inp,minHeight:70,resize:'vertical'}} />
            <button onClick={save} disabled={saving||!date||!time} style={{width:'100%',background:(date&&time)?GOLD:'#ddd',color:'#fff',border:'none',borderRadius:10,padding:'12px',fontSize:14,fontWeight:700,cursor:(date&&time)?'pointer':'not-allowed'}}>
              {saving?'Wird gespeichert…':'Änderungen speichern'}
            </button>
            <button onClick={()=>{setEditing(false);load()}} style={{marginTop:10,width:'100%',background:'none',color:'#666',border:'0.5px solid #ccc',borderRadius:10,padding:'10px',fontSize:13,cursor:'pointer'}}>Abbrechen</button>
          </>}
          <p style={{fontSize:12,color:'#aaa',textAlign:'center',marginTop:16}}>Fragen? +49 176 41576629</p>
        </>}
      </div>
    </div>
  )
}
