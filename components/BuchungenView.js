'use client'
import { useState, useEffect, useRef } from 'react'

const STATUS = {
  confirmed:{ label:'Bestätigt', color:'#15803d', bg:'#f0fdf4', border:'#bbf7d0' },
  pending:  { label:'In Prüfung', color:'#6b6b6e', bg:'#fffbeb', border:'#fde68a' },
  cancelled:{ label:'Storniert', color:'#b91c1c', bg:'#fef2f2', border:'#fecaca' },
}
const DAYS = ['Mo','Di','Mi','Do','Fr','Sa','So']

function mondayOf(d){ const x=new Date(d); const w=(x.getDay()+6)%7; x.setDate(x.getDate()-w); x.setHours(12,0,0,0); return x }
function iso(d){ return d.toISOString().slice(0,10) }

export default function BuchungenView({ supabase, staff, me }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState('list') // list | calendar
  const [weekStart, setWeekStart] = useState(()=>mondayOf(new Date()))
  const [updating, setUpdating] = useState(null)
  const [routeOpen, setRouteOpen] = useState(null) // booking id
  const editAddrRef = useRef(null)
  const [routeInfo, setRouteInfo] = useState({})   // id → {dist,dur,loading}
  const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const BASE_ADDR = 'Gartenstraße 2, 67310 Hettenleidelheim, Germany'

  function toggleRoute(b) {
    if (routeOpen === b.id) { setRouteOpen(null); return }
    setRouteOpen(b.id)
    if (!routeInfo[b.id]) {
      const origin = b.staff?.address || BASE_ADDR
      setRouteInfo(p => ({ ...p, [b.id]: { loading:true } }))
      fetch('/api/fahrtenbuch/distance', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ stops:[origin, b.booking_address] }) })
        .then(r=>r.json())
        .then(d=>{ const leg=d.legs?.[0]; setRouteInfo(p=>({ ...p, [b.id]: { dist:leg?.distanceText||'—', dur:leg?.durationText||'—', loading:false } })) })
        .catch(()=>setRouteInfo(p=>({ ...p, [b.id]: { dist:'—', dur:'—', loading:false } })))
    }
  }

  // edit modal
  const [editTok, setEditTok] = useState(null)
  const [ef, setEf] = useState(null)
  const [slots, setSlots] = useState([])
  const [warnTimes, setWarnTimes] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(()=>{ load() }, [filter])

  // v4.1.6: auto-frissítés — 30 mp polling + tab-fókuszra újratöltés,
  // hogy az új foglalások ne maradjanak láthatatlanok nyitott nézetnél
  useEffect(() => {
    const iv = setInterval(() => { if (document.visibilityState === 'visible') load() }, 30000)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis) }
  }, [filter])

  async function load() {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (filter!=='all') p.set('status', filter)
      p.set('_t', Date.now()) // cache busting
      const r = await fetch('/api/booking/list?'+p, { cache: 'no-store' })
      const d = await r.json()
      setBookings(d.ok ? d.bookings : [])
    } catch(e){ setBookings([]) }
    setLoading(false)
  }

  async function act(token, kind, bookingId) {
    console.log('[booking act]', kind, 'token=', token, 'cardId=', bookingId)
    if (kind==='cancel' && !confirm('Diesen Termin wirklich stornieren? Der Kunde wird per E-Mail informiert.')) return
    if (kind==='delete' && !confirm('Diesen Termin ENDGÜLTIG löschen? Die Karte und der Kalendereintrag werden entfernt. Dies kann nicht rückgängig gemacht werden.')) return
    setUpdating(bookingId)
    try {
      const body = { token, cardId: bookingId }
      if (kind === 'confirm' && me?.id) body.confirmedByStaffId = me.id
      if (kind === 'cancel' && me?.id) body.cancelledByStaffId = me.id
      const resp = await fetch(`/api/booking/${kind}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      let d = {}; try { d = await resp.json() } catch {}
      // v4.1.6: ha a szerver hibát ad, NE villantsunk hamis státuszt
      if (!resp.ok || d.ok === false) {
        alert('Fehler: ' + (d.error || ('HTTP '+resp.status)))
        setUpdating(null)
        return
      }
      // Optimistic local update — azonnal váltsuk a státuszt és tüntessük el ha a szűrés ezt diktálja
      if (bookingId) {
        const nowIso = new Date().toISOString()
        const meSlim = me ? { name: me.name, init: me.init } : null
        setBookings(prev => {
          const updated = prev.map(b => b.id !== bookingId ? b : (
            kind === 'confirm' ? { ...b, booking_status: 'confirmed', confirmed_at: nowIso, confirmed_by_staff: meSlim }
            : kind === 'cancel' ? { ...b, booking_status: 'cancelled', cancelled_at: nowIso, cancelled_by_staff: meSlim }
            : kind === 'delete' ? null
            : b
          )).filter(Boolean)
          // Ha a jelenlegi szűrés nem egyezik az új státusszal, távolítsuk el is a kártyát a listából
          if (filter !== 'all') {
            return updated.filter(b => b.booking_status === filter)
          }
          return updated
        })
      }
      // load() most NEM blokkolja — háttérben fut, de a UI már átállt
      load()
    }
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
        name: d.customer_name || d.client_name || '', immoOffice: d.client_name || '',
        email: d.customer_email||'', phone: d.customer_phone||'',
        address: d.booking_address||'', note: d.description||'',
        addon360: !!d.addon_360, addonDrone: !!d.addon_drone,
        serviceId: d.booking_service_id, serviceName: d.serviceName,
        category: d.serviceCategory, status: d.booking_status,
      })
    } catch(e){ alert('Konnte Termin nicht laden'); setEditTok(null) }
  }

  // Google Places autocomplete az edit-ablak cím-mezőjén (ugyanúgy mint a /buchen oldalon)
  useEffect(() => {
    if (!editTok || !ef) return
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) return
    function initAC() {
      const el = editAddrRef.current
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
        setEf(prev => prev ? { ...prev, address: a } : prev)
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
  }, [editTok, ef ? true : false])

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
          customerName: ef.name, customerEmail: ef.email, customerPhone: ef.phone, note: ef.note, immoOffice: ef.immoOffice,
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
  const staffColor = init => staff?.find(s=>s.init===init)?.color || '#6b6b6e'

  const _q = search.trim().toLowerCase()
  const visibleBookings = _q
    ? bookings.filter(b => `${b.client_name||''} ${b.customer_name||''} ${b.customer_email||''} ${b.customer_phone||''} ${b.serviceName||''} ${b.booking_address||''} ${b.title||''}`.toLowerCase().includes(_q))
    : bookings

  // calendar week data
  const weekDays = Array.from({length:7},(_,i)=>{ const d=new Date(weekStart); d.setDate(d.getDate()+i); return d })
  const byDay = {}
  visibleBookings.filter(b=>b.booking_status!=='cancelled').forEach(b=>{ (byDay[b.card_date] ??= []).push(b) })
  Object.values(byDay).forEach(arr=>arr.sort((a,b)=>String(a.card_time).localeCompare(String(b.card_time))))

  const ST = { fontSize:10, fontWeight:700, letterSpacing:'.4px', textTransform:'uppercase', padding:'2px 8px', borderRadius:10, display:'inline-block' }
  const inp = { width:'100%', padding:'9px 11px', fontSize:13, border:'0.5px solid var(--border)', borderRadius:7, boxSizing:'border-box', background:'var(--bg3)', color:'var(--t1)', outline:'none', fontFamily:'inherit' }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'var(--bg)', fontFamily:'Arial,sans-serif' }}>
      <style>{`.pac-container{z-index:99999 !important}`}</style>
      {/* Header */}
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:14, fontWeight:700, color:'var(--t1)', display:'flex', alignItems:'center', gap:6 }}>
          <i className="ti ti-calendar-plus" style={{ fontSize:16, color:'#6b6b6e' }} /> Buchungen
        </span>
        <div style={{ display:'flex', gap:4, background:'var(--bg3)', borderRadius:7, padding:2 }}>
          {['list','calendar'].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{ padding:'4px 12px', borderRadius:5, border:'none', background:mode===m?'#6b6b6e':'transparent', color:mode===m?'#fff':'var(--t3)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
              {m==='list'?'Liste':'Kalender'}
            </button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Suche: Kunde, Kontakt, Adresse, E-Mail…"
          style={{ flex:'1 1 220px', minWidth:160, maxWidth:360, padding:'6px 10px', borderRadius:7, border:'0.5px solid var(--border)', background:'var(--bg3)', color:'var(--t1)', fontSize:12, outline:'none' }} />
        <div style={{ marginLeft:'auto', display:'flex', gap:6, flexWrap:'wrap' }}>
          <button onClick={()=>load()} disabled={loading} title="Aktualisieren" style={{ padding:'4px 10px', borderRadius:6, border:'0.5px solid var(--border)', background:'var(--bg3)', color:'var(--t2)', fontSize:11, fontWeight:600, cursor:loading?'default':'pointer', display:'flex', alignItems:'center', gap:4, opacity:loading?.6:1 }}>
            <i className="ti ti-refresh" style={{fontSize:12}} /> Aktualisieren
          </button>
          <a href="/admin/leistungen" target="_blank" rel="noopener" style={{ padding:'4px 10px', borderRadius:6, border:'0.5px solid var(--border)', background:'var(--bg3)', color:'var(--t2)', fontSize:11, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
            <i className="ti ti-settings" style={{fontSize:12}} /> Leistungen
          </a>
          <a href="/buchen" target="_blank" rel="noopener" style={{ background:'#6b6b6e', color:'#fff', borderRadius:6, padding:'4px 12px', fontSize:11, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:5 }}>
            <i className="ti ti-external-link" style={{fontSize:11}} /> Buchungsseite
          </a>
        </div>
      </div>

      {/* Prominent status tabs */}
      <div style={{ padding:'8px 16px', background:'var(--bg2)', borderBottom:'0.5px solid var(--border)', display:'flex', gap:0, overflowX:'auto' }}>
        {[
          { key:'all',       label:'Alle',         color:'var(--gold)' },
          { key:'pending',   label:'In Prüfung',   color:'#6b6b6e' },
          { key:'confirmed', label:'Bestätigt',    color:'#15803d' },
          { key:'cancelled', label:'Storniert',    color:'#b91c1c' },
        ].map(t => {
          const active = filter === t.key
          // count: a teljes lista jelenleg load()-pal jön az adott szűréssel, így itt csak az aktuális listából tudunk pontosan
          // ha az 'all' filter van kiválasztva, akkor mindenkinél jó számot mutatunk
          const count = filter === 'all'
            ? (t.key === 'all' ? bookings.length : bookings.filter(b => b.booking_status === t.key).length)
            : (t.key === filter ? bookings.length : null)
          return (
            <button key={t.key} onClick={() => setFilter(t.key)}
              style={{
                padding:'9px 16px', border:'none',
                borderBottom: active ? '2.5px solid '+t.color : '2.5px solid transparent',
                background:'none', color: active?t.color:'var(--t3)',
                fontSize:13, fontWeight:active?700:500, cursor:'pointer',
                display:'flex', alignItems:'center', gap:7,
                transition:'border-color .12s, color .12s'
              }}>
              {t.label}
              {count !== null && (
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:10,
                  background: active ? t.color+'22' : 'var(--bg3)',
                  color: active ? t.color : 'var(--t3)' }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>
        {loading ? <div style={{ textAlign:'center', padding:40, color:'var(--t3)', fontSize:13 }}>Wird geladen...</div>
        : mode==='list' ? (
          visibleBookings.length===0 ? <div style={{ textAlign:'center', padding:40, color:'var(--t3)', fontSize:13 }}>{_q ? 'Keine Treffer für die Suche.' : 'Keine Buchungen gefunden'}</div>
          : visibleBookings.map(b=>{
            const st = STATUS[b.booking_status]||STATUS.pending
            const isUp = updating===b.id
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
                  <div><i className="ti ti-user" style={{fontSize:11}} /> {b.client_name}{b.customer_name ? ' · ' + b.customer_name : ''} · {b.customer_phone||'—'}</div>
                  <div><i className="ti ti-mail" style={{fontSize:11}} /> {b.customer_email}</div>
                  <div><i className="ti ti-map-pin" style={{fontSize:11}} /> {b.booking_address}</div>
                  {b.description && <div style={{whiteSpace:'pre-line',background:'var(--bg3)',borderRadius:6,padding:'6px 8px',marginTop:4,color:'var(--t3)'}}>{b.description}</div>}
                  {/* Lábnyom: ki + mikor confirm/cancel */}
                  {b.booking_status==='confirmed' && b.confirmed_at && (
                    <div style={{ marginTop:6, fontSize:10, color:'#15803d', display:'flex', alignItems:'center', gap:4 }}>
                      <i className="ti ti-check" style={{fontSize:11}} />
                      Bestätigt: {new Date(b.confirmed_at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                      {b.confirmed_by_staff && <> · von <strong>{b.confirmed_by_staff.name}</strong></>}
                    </div>
                  )}
                  {b.booking_status==='cancelled' && b.cancelled_at && (
                    <div style={{ marginTop:6, fontSize:10, color:'#b91c1c', display:'flex', alignItems:'center', gap:4 }}>
                      <i className="ti ti-x" style={{fontSize:11}} />
                      Storniert: {new Date(b.cancelled_at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                      {b.cancelled_by_staff && <> · von <strong>{b.cancelled_by_staff.name}</strong></>}
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', gap:6, marginTop:10 }}>
                  {b.booking_status==='pending' ? (
                    <button onClick={()=>act(b.booking_token,'confirm',b.id)} disabled={isUp} style={{ padding:'5px 12px', borderRadius:6, border:'none', background:'#15803d', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', opacity:isUp?.6:1 }}>
                      <i className="ti ti-check" style={{fontSize:11}} /> Bestätigen
                    </button>
                  ) : b.booking_status==='confirmed' && (
                    <button disabled style={{ padding:'5px 12px', borderRadius:6, border:'0.5px solid #bbf7d0', background:'#f0fdf4', color:'#15803d', fontSize:11, fontWeight:700, cursor:'default', opacity:.85 }}>
                      <i className="ti ti-check" style={{fontSize:11}} /> Bestätigt
                    </button>
                  )}
                  {b.booking_status!=='cancelled' && <>
                    <button onClick={()=>openEdit(b.booking_token)} disabled={isUp} style={{ padding:'5px 12px', borderRadius:6, border:'0.5px solid var(--border)', background:'var(--bg3)', color:'var(--t2)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                      <i className="ti ti-pencil" style={{fontSize:11}} /> Bearbeiten
                    </button>
                    <button onClick={()=>act(b.booking_token,'cancel',b.id)} disabled={isUp} style={{ padding:'5px 12px', borderRadius:6, border:'0.5px solid #fecaca', background:'#fef2f2', color:'#b91c1c', fontSize:11, fontWeight:700, cursor:'pointer', opacity:isUp?.6:1 }}>
                      <i className="ti ti-x" style={{fontSize:11}} /> Stornieren
                    </button>
                  </>}
                  <button onClick={()=>toggleRoute(b)} style={{ padding:'5px 12px', borderRadius:6, border:'0.5px solid '+(routeOpen===b.id?'#1d5ec7':'var(--border)'), background:routeOpen===b.id?'#1d5ec714':'var(--bg3)', color:routeOpen===b.id?'#1d5ec7':'var(--t2)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                    <i className={'ti '+(routeOpen===b.id?'ti-chevron-up':'ti-route')} style={{fontSize:11}} /> Route
                  </button>
                  <button onClick={()=>act(b.booking_token,'delete',b.id)} disabled={isUp} title="Endgültig löschen" style={{ padding:'5px 10px', borderRadius:6, border:'0.5px solid #fecaca', background:'#fff', color:'#b91c1c', fontSize:11, fontWeight:700, cursor:'pointer', opacity:isUp?.6:1 }}>
                    <i className="ti ti-trash" style={{fontSize:11}} />
                  </button>
                </div>

                {/* Route lenyíló: fotós címe → shooting cím */}
                {routeOpen===b.id && (
                  <div style={{ marginTop:10, border:'0.5px solid var(--border)', borderRadius:10, overflow:'hidden', background:'var(--bg3)' }}>
                    <div style={{ padding:'8px 12px', fontSize:11, color:'var(--t2)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', borderBottom:'0.5px solid var(--border)' }}>
                      <span><i className="ti ti-home" style={{fontSize:11,color:staffColor(b.staff?.init)}} /> {b.staff?.name||'Basis'}: <span style={{color:'var(--t3)'}}>{(b.staff?.address||BASE_ADDR).split(',')[0]}</span></span>
                      <span style={{color:'var(--t3)'}}>→</span>
                      <span><i className="ti ti-map-pin" style={{fontSize:11,color:'#b91c1c'}} /> {(b.booking_address||'').split(',')[0]}</span>
                      <span style={{ marginLeft:'auto', fontWeight:700, color:'#1d5ec7' }}>
                        {routeInfo[b.id]?.loading ? '⟳ …' : `${routeInfo[b.id]?.dist||'—'} · ${routeInfo[b.id]?.dur||'—'}`}
                      </span>
                    </div>
                    {MAPS_KEY ? (
                      <iframe
                        title={'route-'+b.id}
                        width="100%" height="260" style={{ border:0, display:'block' }}
                        loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/directions?key=${MAPS_KEY}&origin=${encodeURIComponent(b.staff?.address||BASE_ADDR)}&destination=${encodeURIComponent(b.booking_address||'')}&mode=driving`}
                      />
                    ) : <div style={{padding:12,fontSize:11,color:'var(--t3)'}}>Kein Maps-Key konfiguriert.</div>}
                    <div style={{ padding:'8px 12px', borderTop:'0.5px solid var(--border)' }}>
                      <a href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(b.staff?.address||BASE_ADDR)}&destination=${encodeURIComponent(b.booking_address||'')}&travelmode=driving`}
                        target="_blank" rel="noopener"
                        style={{ fontSize:11, fontWeight:700, color:'#1d5ec7', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
                        <i className="ti ti-external-link" style={{fontSize:12}} /> Route in Google Maps öffnen
                      </a>
                    </div>
                  </div>
                )}
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
                  <div key={ds} style={{ background:'var(--bg2)', border:'0.5px solid '+(isToday?'#6b6b6e':'var(--border)'), borderRadius:8, minHeight:120, padding:6 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:isToday?'#6b6b6e':'var(--t3)', textAlign:'center', marginBottom:6, textTransform:'uppercase' }}>{DAYS[i]} {d.getDate()}</div>
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
                      style={{padding:'7px 0',fontSize:12,borderRadius:6,cursor:'pointer',border:'0.5px solid '+(ef.time===t?'#6b6b6e':(warnTimes.includes(t)?'#e0a82e':'var(--border)')),background:ef.time===t?'#6b6b6e':(warnTimes.includes(t)?'#fffbf0':'var(--bg3)'),color:ef.time===t?'#fff':'var(--t2)',fontWeight:ef.time===t?700:400}}>
                      {t}{warnTimes.includes(t)?'⚠':''}
                    </button>
                  ))}
                </div>}
              <label style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase'}}>Immobilienbüro (Kunde)</label>
              <input value={ef.immoOffice||''} onChange={e=>setEf({...ef,immoOffice:e.target.value})} placeholder="z. B. Bartz Immobilien" style={{...inp,margin:'4px 0 8px'}} />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                <div><label style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase'}}>Ansprechpartner</label><input value={ef.name} onChange={e=>setEf({...ef,name:e.target.value})} style={{...inp,marginTop:4}} /></div>
                <div><label style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase'}}>Telefon</label><input value={ef.phone} onChange={e=>setEf({...ef,phone:e.target.value})} style={{...inp,marginTop:4}} /></div>
              </div>
              <label style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase'}}>E-Mail</label>
              <input value={ef.email} onChange={e=>setEf({...ef,email:e.target.value})} style={{...inp,margin:'4px 0 8px'}} />
              <label style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase'}}>Adresse</label>
              <input ref={editAddrRef} value={ef.address} onChange={e=>setEf({...ef,address:e.target.value})} placeholder="Adresse eingeben…" style={{...inp,margin:'4px 0 8px'}} />
              {(is360||isDrone) && <div style={{display:'flex',gap:14,margin:'2px 0 8px'}}>
                {is360 && <label style={{fontSize:12,display:'flex',gap:5,alignItems:'center',color:'var(--t2)',cursor:'pointer'}}><input type="checkbox" checked={ef.addon360} onChange={e=>setEf({...ef,addon360:e.target.checked,time:''})} /> 360° (+30m)</label>}
                {isDrone && <label style={{fontSize:12,display:'flex',gap:5,alignItems:'center',color:'var(--t2)',cursor:'pointer'}}><input type="checkbox" checked={ef.addonDrone} onChange={e=>setEf({...ef,addonDrone:e.target.checked,time:''})} /> Drohne (+15m)</label>}
              </div>}
              <label style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase'}}>Anmerkung</label>
              <textarea value={ef.note} onChange={e=>setEf({...ef,note:e.target.value})} style={{...inp,minHeight:60,resize:'vertical',margin:'4px 0 14px'}} />
              <div style={{display:'flex',gap:8}}>
                <button onClick={saveEdit} disabled={savingEdit||!ef.date||!ef.time} style={{flex:1,padding:'11px',background:(ef.date&&ef.time)?'#6b6b6e':'#ccc',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:(ef.date&&ef.time)?'pointer':'default'}}>
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
