'use client'
import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const BG_IMAGE_OPTIONS = [
  { key:'bg_lv_green', label:'Green', src:'/bg/bg_lv_green.png' },
  { key:'bg_lv_cream', label:'Cream', src:'/bg/bg_lv_cream.png' },
  { key:'bg_lv_blue',  label:'Blue',  src:'/bg/bg_lv_blue.png' },
  { key:'bg_lv_pink',  label:'Pink',  src:'/bg/bg_lv_pink.png' },
]
const BG_OPTIONS = [
  { key:'linen', color:'#f4f2ef' }, { key:'bluegray', color:'#f0f4f8' },
  { key:'sand', color:'#f5f0eb' }, { key:'sage', color:'#eef4ee' },
  { key:'lavender', color:'#f8f0f5' }, { key:'dark', color:'#1c1a16' }, { key:'white', color:'#ffffff' },
]


function BgImageUploader({ staffId, supabase, currentBgImage, onUploaded, onRemoved }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setSuccess(false)

    // Max 1.5MB
    if (file.size > 1.5 * 1024 * 1024) {
      setError('Bild zu groß! Maximal 1,5 MB erlaubt.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Nur Bilddateien erlaubt (JPG, PNG, WebP).')
      return
    }

    setUploading(true)
    try {
      const path = `bg/${staffId}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('user-backgrounds').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('user-backgrounds').getPublicUrl(path)
      onUploaded(data.publicUrl)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Upload fehlgeschlagen: ' + (err.message || 'Unbekannter Fehler'))
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      {currentBgImage && (
        <div style={{ marginBottom:8, position:'relative', display:'inline-block' }}>
          <img src={currentBgImage} style={{ width:80, height:50, objectFit:'cover', borderRadius:6, border:'1px solid var(--border)' }} />
          <button onClick={onRemoved} style={{ position:'absolute', top:-6, right:-6, width:18, height:18, borderRadius:'50%', background:'var(--red)', color:'#fff', border:'none', cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} id="bg-img-input" />
      <label htmlFor="bg-img-input" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', background:'var(--bg3)', border:'1.5px dashed var(--border)', borderRadius:7, fontSize:12, fontWeight:600, color:'var(--t2)', cursor:'pointer' }}>
        <i className="ti ti-photo-up" style={{ fontSize:14 }} />
        {uploading ? 'Wird hochgeladen...' : currentBgImage ? 'Bild ändern' : 'Bild hochladen'}
      </label>
      <div style={{ fontSize:10, color:'var(--t3)', marginTop:4 }}>Max. 1,5 MB · JPG, PNG, WebP</div>
      {error && <div style={{ fontSize:11, color:'var(--red)', marginTop:4, display:'flex', alignItems:'center', gap:4 }}><i className="ti ti-alert-circle" style={{ fontSize:12 }}/>{error}</div>}
      {success && <div style={{ fontSize:11, color:'var(--green)', marginTop:4, display:'flex', alignItems:'center', gap:4 }}><i className="ti ti-check" style={{ fontSize:12 }}/>✓ Bild gespeichert!</div>}
    </div>
  )
}

export default function ProfilPage() {
  const [me, setMe] = useState(null)
  const [activeNav, setActiveNav] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [gehaltszettel, setGehaltszettel] = useState([])
  const [gzUploading, setGzUploading] = useState(false)
  const [gzError, setGzError] = useState(null)
  const [gzSuccess, setGzSuccess] = useState(null)
  const [fahrten, setFahrten] = useState([])
  const [userSettings, setUserSettings] = useState({ bg_color:'linen', font_size:'md', card_size:'standard' })
  const [saved, setSaved] = useState(false)
  const [servicePrices, setServicePrices] = useState([])
  const [clients, setClients] = useState([])
  const [priceData, setPriceData] = useState({})
  const [priceSaving, setPriceSaving] = useState(false)
  const [fahrtModal, setFahrtModal] = useState(false)
  const [uploadModal, setUploadModal] = useState(false)
  const [allStaff, setAllStaff] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const fileRef = useRef(null)
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = '/login'
    })
    loadMe()
  }, [])

  async function loadMe() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('staff').select('*').eq('email', session.user.email).single()
    if (data) {
      setMe(data)
      loadData(data)
      if (data.role_level === 'admin' || data.role_level === 'subadmin') {
        const { data: staffList } = await supabase.from('staff').select('*').order('name')
        setAllStaff(staffList || [])
      }
      setSelectedStaff(data)
    }
    setLoading(false)
  }

  async function updateClientPrice(clientId, serviceId, value) {
    const next = { ...priceData, [clientId]: { ...(priceData[clientId]||{}), [serviceId]: value } }
    setPriceData(next)
    setPriceSaving(true)
    clearTimeout(window._priceSaveTimer)
    window._priceSaveTimer = setTimeout(async () => {
      await supabase.from('clients').update({ service_prices: next[clientId] }).eq('id', clientId)
      setPriceSaving(false)
    }, 800)
  }
  async function updateGrundpreis(serviceId, value) {
    const next = servicePrices.map(s => s.id===serviceId ? {...s, grundpreis:value} : s)
    setServicePrices(next)
    clearTimeout(window._gpSaveTimer)
    window._gpSaveTimer = setTimeout(async () => {
      await supabase.from('settings').upsert({ key:'service_prices', value:JSON.stringify(next) },{ onConflict:'key' })
    }, 800)
  }
  function exportCSV() {
    const headers = ['Kunde', ...servicePrices.map(s=>s.label), 'Ø Preis']
    const rows = clients.map(cl => {
      const prices = servicePrices.map(s => priceData[cl.id]?.[s.id] || s.grundpreis || '')
      const nums = prices.map(p=>parseFloat(p)).filter(n=>!isNaN(n))
      const avg = nums.length ? (nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(2) : ''
      return [cl.name, ...prices, avg]
    })
    const csv = [headers, ...rows].map(r=>r.join(';')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv)
    a.download = 'ImmoPixels_Preistabelle.csv'
    a.click()
  }

  async function loadData(staffMember) {
    const sid = staffMember?.id
    if (!sid) return
    const [gz, fb, us] = await Promise.all([
      supabase.from('gehaltszettel').select('*').eq('staff_id', sid).order('month', { ascending: false }),
      supabase.from('fahrtenbuch').select('*').eq('staff_id', sid).order('date', { ascending: false }),
      supabase.from('user_settings').select('*').eq('staff_id', sid).single()
    ])
    setGehaltszettel(gz.data || [])
    setFahrten(fb.data || [])
    // Load price data
    const [spRes, clRes] = await Promise.all([
      supabase.from('settings').select('value').eq('key','service_prices').maybeSingle(),
      supabase.from('clients').select('id,name,color,service_prices').order('name'),
    ])
    if (spRes.data?.value) { try { setServicePrices(JSON.parse(spRes.data.value)) } catch(e){} }
    else setServicePrices([
      { id:'foto', label:'Fotoshooting', grundpreis:'199.00' },
      { id:'fotodron', label:'Foto + Drohne', grundpreis:'349.00' },
      { id:'dron', label:'Drohne', grundpreis:'179.00' },
      { id:'reel', label:'Reel', grundpreis:'249.00' },
    ])
    setClients(clRes.data || [])
    const pd = {}
    for (const cl of clRes.data || []) pd[cl.id] = cl.service_prices || {}
    setPriceData(pd)
    if (us.data) { setUserSettings(us.data); applySettings(us.data) }
  }

  async function saveUserSetting(key, value) {
    const sid = me?.id
    if (!sid) return
    const next = { ...userSettings, [key]: value }
    // bg_image: apply immediately
    if (key === 'bg_image') {
      document.body.style.backgroundImage = value ? 'url(' + value + ')' : 'none'
      document.body.style.backgroundSize = 'cover'
      document.body.style.backgroundAttachment = 'fixed'
    }
    setUserSettings(next)
    await supabase.from('user_settings').upsert({ staff_id: sid, ...next }, { onConflict: 'staff_id' })
    applySettings(next)
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  function applySettings(s) {
    const bgMap = { linen:'#f4f2ef', bluegray:'#f0f4f8', sand:'#f5f0eb', sage:'#eef4ee', lavender:'#f8f0f5', dark:'#1c1a16', white:'#fff' }
    const fsMap = { sm:'13px', md:'14px', lg:'16px' }
    document.documentElement.style.setProperty('--bg', bgMap[s.bg_color] || '#f4f2ef')
    document.body.style.fontSize = fsMap[s.font_size] || '14px'
  }

  async function saveProfile(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    await supabase.from('staff').update({ name: fd.get('name'), email: fd.get('email'), tel: fd.get('tel'), role: fd.get('role') }).eq('id', me.id)
    loadMe(); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function addFahrt(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    await supabase.from('fahrtenbuch').insert({ staff_id: me.id, date: fd.get('date'), von: fd.get('von'), nach: fd.get('nach'), km: parseInt(fd.get('km')), zweck: fd.get('zweck') || null })
    setFahrtModal(false); loadData(me)
  }

  async function uploadGehaltszettel(file, month, staffId) {
    if (!file) return
    setGzUploading(true)
    setGzError(null)
    try {
      const path = `${staffId}/${month}_${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('gehaltszettel').upload(path, file, { upsert: true })
      if (upErr) {
        // Bucket nem létezik? Próbálkozunk a profiles buckettel
        const { error: upErr2 } = await supabase.storage.from('avatars').upload('gz/'+path, file, { upsert: true })
        if (upErr2) throw new Error('Storage Fehler: ' + (upErr.message || upErr2.message))
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl('gz/'+path)
        await supabase.from('gehaltszettel').insert({ staff_id: staffId, month, file_url: urlData.publicUrl, file_name: file.name, file_size: file.size, uploaded_by: me.id })
      } else {
        const { data: urlData } = supabase.storage.from('gehaltszettel').getPublicUrl(path)
        await supabase.from('gehaltszettel').insert({ staff_id: staffId, month, file_url: urlData.publicUrl, file_name: file.name, file_size: file.size, uploaded_by: me.id })
      }
      setUploadModal(false)
      setGzSuccess(staffId)
      setTimeout(() => setGzSuccess(null), 4000)
      // Frissítés annak a staffnak akihez feltöltöttük
      const targetStaff = allStaff?.find(s => s.id === staffId)
      loadData(targetStaff || selectedStaff || me)
    } catch(err) {
      setGzError(err.message || 'Upload fehlgeschlagen')
    }
    setGzUploading(false)
  }

  const IS = { background:'var(--bg3)', border:'0.5px solid var(--border)', borderRadius:8, padding:'8px 11px', fontSize:13, fontFamily:'Arial', outline:'none', width:'100%', color:'var(--t1)' }
  const LS = { fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:5, display:'block' }
  const NAV = [
    { key:'dashboard', label:'Dashboard', icon:'ti-layout-dashboard' },
    { key:'profil', label:'Mein Profil', icon:'ti-user' },
    { key:'gehaltszettel', label:'Gehaltszettel', icon:'ti-file-invoice' },
    { key:'fahrtenbuch', label:'Fahrtenbuch', icon:'ti-car' },
    { key:'aussehen', label:'Aussehen', icon:'ti-palette' },
    ...(me?.role_level === 'admin' || me?.role_level === 'subadmin' ? [{ key:'preistabelle', label:'Preistabelle', icon:'ti-table' }] : []),
  ]
  const thisMonthFahrten = fahrten.filter(f => f.date?.startsWith(currentMonth))
  const totalKm = thisMonthFahrten.reduce((a,b) => a + (b.km||0), 0)
  const viewStaff = selectedStaff || me

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f4f2ef',fontFamily:'Arial',color:'#8a8278'}}>Wird geladen...</div>

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg,#f4f2ef)', fontFamily:'Arial,sans-serif', display:'flex', flexDirection:'column' }}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css" />
      <style>{`
        :root{--bg:#f4f2ef;--bg2:#fff;--bg3:#eeeae6;--border:#ddd9d2;--gold:#b8892a;--t1:#1c1a16;--t2:#4a4540;--t3:#8a8278;--gdbg:rgba(184,137,42,.1);--gdbr:rgba(184,137,42,.3)}
        @keyframes modal-in{0%{opacity:0;transform:scale(.92)}60%{transform:scale(1.02)}100%{opacity:1;transform:scale(1)}}
        .modal-animate{animation:modal-in .22s cubic-bezier(.34,1.56,.64,1) forwards}
      `}</style>
      <div style={{ height:48, background:'var(--bg2)', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', padding:'0 16px', gap:10, flexShrink:0 }}>
        <a href="/" style={{ display:'flex', alignItems:'center', gap:5, color:'var(--t3)', textDecoration:'none', fontSize:13 }}>
          <i className="ti ti-arrow-left" style={{ fontSize:14 }} /> Board
        </a>
        <span style={{ color:'var(--border)' }}>|</span>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>Mein Bereich</span>
        {saved && <span style={{ background:'rgba(156,175,136,.15)', color:'#3a6030', border:'0.5px solid rgba(156,175,136,.4)', borderRadius:6, padding:'2px 9px', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><i className="ti ti-check" style={{fontSize:10}} /> Gespeichert</span>}
        {(me?.role_level === 'admin' || me?.role_level === 'subadmin') && allStaff.length > 0 && (
          <select value={viewStaff?.id || ''} onChange={e => { const s = allStaff.find(x=>x.id===e.target.value); setSelectedStaff(s); loadData(s) }}
            style={{ marginLeft:'auto', ...IS, width:'auto', padding:'4px 9px', fontSize:12 }}>
            {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}{s.id===me.id?' (Ich)':''}</option>)}
          </select>
        )}
      </div>
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <div style={{ width:200, background:'var(--bg2)', borderRight:'0.5px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0 }}>
          <div style={{ padding:'16px 14px 12px', borderBottom:'0.5px solid var(--border)', textAlign:'center' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:(viewStaff?.color||'#b8892a')+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color:viewStaff?.color||'var(--gold)', margin:'0 auto 8px', border:'2px solid var(--border)', overflow:'hidden' }}>
              {viewStaff?.avatar_url ? <img src={viewStaff.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : (viewStaff?.init || '?')}
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{viewStaff?.name}</div>
            <div style={{ fontSize:10, color:'var(--t3)', background:'var(--gdbg)', borderRadius:20, padding:'2px 9px', display:'inline-block', marginTop:3 }}>{viewStaff?.role || 'Mitarbeiter'}</div>
          </div>
          <div style={{ flex:1, padding:'6px 0' }}>
            {NAV.map(n => (
              <div key={n.key} onClick={() => setActiveNav(n.key)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', cursor:'pointer', fontSize:12, fontWeight:600, color:activeNav===n.key?'var(--gold)':'var(--t2)', borderLeft:activeNav===n.key?'2.5px solid var(--gold)':'2.5px solid transparent', background:activeNav===n.key?'var(--gdbg)':'none', transition:'all .15s' }}
                onMouseEnter={e=>{ if(activeNav!==n.key){e.currentTarget.style.background='rgba(184,137,42,.05)';e.currentTarget.style.paddingLeft='18px'} }}
                onMouseLeave={e=>{ if(activeNav!==n.key){e.currentTarget.style.background='none';e.currentTarget.style.paddingLeft='14px'} }}>
                <i className={'ti '+n.icon} style={{ fontSize:14, flexShrink:0 }} />
                {n.label}
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex:1, padding:20, overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
          {activeNav === 'dashboard' && <>
            <div style={{ background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:11, padding:'14px 16px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
                <i className="ti ti-chart-bar" style={{ fontSize:15, color:'var(--gold)' }} /> {MONTHS_DE[now.getMonth()]} {now.getFullYear()}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {[{label:'Gehaltszettel',val:gehaltszettel.length,color:'var(--gold)'},{label:'Fahrten (Monat)',val:thisMonthFahrten.length,color:'#2a6a7a'},{label:'km (Monat)',val:totalKm,color:'#3a6030'}].map(s => (
                  <div key={s.label} style={{ background:'var(--bg3)', borderRadius:9, padding:'10px 14px', flex:1 }}>
                    <div style={{ fontSize:20, fontWeight:700, color:s.color }}>{s.val}</div>
                    <div style={{ fontSize:10, color:'var(--t3)', marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:11, padding:'14px 16px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                <i className="ti ti-file-invoice" style={{ fontSize:15, color:'var(--gold)' }} /> Letzter Gehaltszettel
              </div>
              {gehaltszettel.length === 0 ? <div style={{ color:'var(--t3)', fontSize:12 }}>Noch keine Gehaltszettel</div> : (
                <a href={gehaltszettel[0].file_url} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', background:'var(--bg3)', borderRadius:8, textDecoration:'none' }}>
                  <div style={{ width:32, height:32, borderRadius:7, background:'rgba(185,28,28,.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <i className="ti ti-file-text" style={{ fontSize:15, color:'#b91c1c' }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)' }}>{gehaltszettel[0].file_name}</div>
                    <div style={{ fontSize:10, color:'var(--t3)' }}>{gehaltszettel[0].month}</div>
                  </div>
                  <i className="ti ti-download" style={{ fontSize:14, color:'var(--gold)' }} />
                </a>
              )}
            </div>
          </>}
          {activeNav === 'profil' && (
            <form onSubmit={saveProfile}>
              <div style={{ background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:11, padding:'14px 16px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
                  <i className="ti ti-user" style={{ fontSize:15, color:'var(--gold)' }} /> Mein Profil
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  <div><label style={LS}>Name</label><input name="name" defaultValue={me?.name} style={IS} /></div>
                  <div><label style={LS}>Rolle</label><input name="role" defaultValue={me?.role} style={IS} /></div>
                  <div><label style={LS}>E-Mail</label><input name="email" defaultValue={me?.email} style={IS} /></div>
                  <div><label style={LS}>Telefon</label><input name="tel" defaultValue={me?.tel} style={IS} /></div>
                </div>
                <button type="submit" style={{ background:'var(--gold)', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                  <i className="ti ti-check" style={{ fontSize:13 }} /> Speichern
                </button>
              </div>
            </form>
          )}
          {activeNav === 'gehaltszettel' && (
            <div style={{ background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:11, padding:'14px 16px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
                <i className="ti ti-file-invoice" style={{ fontSize:15, color:'var(--gold)' }} /> Gehaltszettel
                {me?.role_level === 'admin' && (
                  <button onClick={() => setUploadModal(true)} style={{ marginLeft:'auto', background:'var(--gold)', color:'#fff', border:'none', borderRadius:7, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                    <i className="ti ti-upload" style={{ fontSize:11 }} /> Hochladen
                  </button>
                )}
              </div>
              {gehaltszettel.length === 0 ? (
                <div style={{ color:'var(--t3)', fontSize:12, textAlign:'center', padding:24 }}>
                  <i className="ti ti-file-off" style={{ fontSize:28, display:'block', marginBottom:8, opacity:.3 }} />
                  Noch keine Gehaltszettel
                </div>
              ) : gehaltszettel.map(gz => {
                const [y,m] = gz.month.split('-')
                return (
                  <div key={gz.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', background:'var(--bg3)', borderRadius:9, marginBottom:6 }}>
                    <div style={{ width:32, height:32, borderRadius:7, background:'rgba(185,28,28,.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <i className="ti ti-file-text" style={{ fontSize:15, color:'#b91c1c' }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)' }}>{MONTHS_DE[parseInt(m)-1]} {y}</div>
                      <div style={{ fontSize:10, color:'var(--t3)' }}>{gz.file_name}</div>
                    </div>
                    <a href={gz.file_url} target="_blank" rel="noopener noreferrer" style={{ background:'var(--gdbg)', color:'var(--gold)', border:'0.5px solid var(--gdbr)', borderRadius:6, padding:'4px 9px', fontSize:11, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                      <i className="ti ti-download" style={{ fontSize:11 }} /> PDF
                    </a>
                  </div>
                )
              })}
            </div>
          )}
          {activeNav === 'fahrtenbuch' && (
            <div style={{ background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:11, padding:'14px 16px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
                <i className="ti ti-car" style={{ fontSize:15, color:'var(--gold)' }} /> Fahrtenbuch
                <button onClick={() => setFahrtModal(true)} style={{ marginLeft:'auto', background:'var(--gold)', color:'#fff', border:'none', borderRadius:7, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                  <i className="ti ti-plus" style={{ fontSize:11 }} /> Fahrt
                </button>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg3)', borderRadius:8, padding:'9px 12px', marginBottom:12 }}>
                <div style={{ fontSize:18, fontWeight:700, color:'var(--gold)' }}>{totalKm} km</div>
                <div style={{ fontSize:11, color:'var(--t3)' }}>diesen Monat · {thisMonthFahrten.length} Fahrten</div>
              </div>
              {fahrten.length === 0 ? (
                <div style={{ color:'var(--t3)', fontSize:12, textAlign:'center', padding:24 }}>
                  <i className="ti ti-car-off" style={{ fontSize:28, display:'block', marginBottom:8, opacity:.3 }} />
                  Noch keine Fahrten
                </div>
              ) : fahrten.map(f => (
                <div key={f.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 0', borderBottom:'0.5px solid var(--bg3)' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:'#7BBFCB', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--t1)' }}>{f.von} → {f.nach}</div>
                    <div style={{ fontSize:10, color:'var(--t3)' }}>{new Date(f.date).toLocaleDateString('de-DE')}{f.zweck?' · '+f.zweck:''}</div>
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--t2)' }}>{f.km} km</div>
                  <button onClick={async()=>{await supabase.from('fahrtenbuch').delete().eq('id',f.id);loadData(viewStaff||me)}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t3)', fontSize:13, padding:'2px 4px' }}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {activeNav === 'preistabelle' && (me?.role_level === 'admin' || me?.role_level === 'subadmin') && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <div style={{ fontSize:16, fontWeight:700 }}>Preistabelle</div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  {priceSaving && <span style={{ fontSize:10, color:'var(--t3)' }}>Speichert...</span>}
                  {!priceSaving && <span style={{ fontSize:10, color:'var(--green)', display:'flex', alignItems:'center', gap:4 }}><i className="ti ti-cloud-check" style={{ fontSize:11 }} />Gespeichert</span>}
                  <button onClick={exportCSV} style={{ background:'var(--gdbg)', border:'0.5px solid var(--gdbr)', color:'var(--gold)', borderRadius:7, padding:'5px 11px', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                    <i className="ti ti-download" style={{ fontSize:11 }} />CSV
                  </button>
                </div>
              </div>
              <div style={{ overflowX:'auto', borderRadius:10, border:'0.5px solid var(--border)' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'var(--t1)' }}>
                      <th style={{ padding:'9px 14px', textAlign:'left', color:'var(--bg2)', fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'.4px', whiteSpace:'nowrap' }}>Kunde</th>
                      {servicePrices.map(s => (
                        <th key={s.id} style={{ padding:'9px 10px', textAlign:'right', color:'var(--bg2)', fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'.4px', whiteSpace:'nowrap' }}>{s.label}</th>
                      ))}
                      <th style={{ padding:'9px 10px', textAlign:'right', color:'#b8892a', fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'.4px', whiteSpace:'nowrap' }}>Ø Preis</th>
                    </tr>
                    <tr style={{ background:'#fef3c7', borderBottom:'1px solid #fcd34d' }}>
                      <td style={{ padding:'7px 14px', fontWeight:700, color:'#92400e', fontSize:11, whiteSpace:'nowrap' }}>⭐ Grundpreis</td>
                      {servicePrices.map(s => (
                        <td key={s.id} style={{ padding:'5px 8px', textAlign:'right' }}>
                          <input type="number" step="0.01" value={s.grundpreis||''} onChange={e=>updateGrundpreis(s.id,e.target.value)}
                            style={{ width:75, background:'rgba(255,255,255,.7)', border:'1px solid #fcd34d', borderRadius:4, padding:'3px 6px', fontSize:11, fontWeight:700, textAlign:'right', outline:'none', color:'#92400e' }} />
                        </td>
                      ))}
                      <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:700, color:'#92400e', fontSize:11 }}>
                        {servicePrices.length ? (servicePrices.reduce((a,s)=>a+(parseFloat(s.grundpreis)||0),0)/servicePrices.length).toFixed(2)+' €' : '—'}
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((cl,ci) => {
                      const cp = priceData[cl.id] || {}
                      const vals = servicePrices.map(s=>parseFloat(cp[s.id]||s.grundpreis||0)).filter(n=>n>0)
                      const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : '—'
                      return (
                        <tr key={cl.id} style={{ background:ci%2===0?'var(--bg2)':'var(--bg3)', borderBottom:'0.5px solid var(--border)' }}>
                          <td style={{ padding:'7px 14px', fontWeight:700, whiteSpace:'nowrap' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                              {cl.color && <div style={{ width:8, height:8, borderRadius:'50%', background:{'peach':'#FFBE98','sage':'#9CAF88','rose':'#D4A5A5','mocha':'#A67B5B','ciel':'#7BBFCB'}[cl.color]||'#ccc', flexShrink:0 }} />}
                              {cl.name}
                            </div>
                          </td>
                          {servicePrices.map(s => (
                            <td key={s.id} style={{ padding:'5px 8px', textAlign:'right' }}>
                              <input type="number" step="0.01" value={cp[s.id]||''} placeholder={s.grundpreis}
                                onChange={e=>updateClientPrice(cl.id,s.id,e.target.value)}
                                onKeyDown={e=>{ if(e.key==='Tab'||e.key==='Enter'){ e.preventDefault(); const inputs=document.querySelectorAll('.price-cell'); const idx=Array.from(inputs).indexOf(e.target); if(inputs[idx+1]) inputs[idx+1].focus() } }}
                                className="price-cell"
                                style={{ width:75, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:4, padding:'3px 6px', fontSize:11, fontWeight:600, textAlign:'right', outline:'none', color:'var(--t1)' }}
                                onFocus={e=>e.currentTarget.style.borderColor='var(--gold)'}
                                onBlur={e=>e.currentTarget.style.borderColor='var(--border)'} />
                            </td>
                          ))}
                          <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:700, fontSize:11 }}>{avg !== '—' ? avg+' €' : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop:10, fontSize:10, color:'var(--t3)', fontStyle:'italic' }}>Tab / Enter → nächste Zelle · Änderungen werden automatisch gespeichert</div>
            </div>
          )}
          {activeNav === 'aussehen' && (
            <div style={{ background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:11, padding:'14px 16px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
                <i className="ti ti-palette" style={{ fontSize:15, color:'var(--gold)' }} /> Mein Aussehen
              </div>
              <div style={{ fontSize:11, color:'var(--t3)', marginBottom:14, background:'var(--bg3)', borderRadius:7, padding:'7px 10px', display:'flex', alignItems:'center', gap:6 }}>
                <i className="ti ti-info-circle" style={{ fontSize:13, color:'#2a6a7a' }} />
                Nur für dich sichtbar
              </div>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:8 }}>Hintergrundfarbe</div>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                  {BG_OPTIONS.map(bg => (
                    <div key={bg.key} onClick={() => saveUserSetting('bg_color', bg.key)}
                      style={{ width:36, height:36, borderRadius:9, background:bg.color, cursor:'pointer', border: userSettings.bg_color===bg.key?'2px solid var(--gold)':'1px solid var(--border)', boxShadow: userSettings.bg_color===bg.key?'0 0 0 3px rgba(184,137,42,.2)':'none', transition:'all .15s' }}
                      onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'} onMouseLeave={e=>e.currentTarget.style.transform='none'} />
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:8 }}>Kartengröße</div>
                <div style={{ display:'flex', gap:7 }}>
                  {['compact','standard','large'].map(k => (
                    <button key={k} onClick={() => saveUserSetting('card_size', k)} style={{ padding:'6px 14px', borderRadius:7, border: userSettings.card_size===k?'1.5px solid var(--gold)':'0.5px solid var(--border)', background: userSettings.card_size===k?'var(--gdbg)':'var(--bg2)', color: userSettings.card_size===k?'var(--gold)':'var(--t2)', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s' }}>
                      {k==='compact'?'Kompakt':k==='standard'?'Standard':'Groß'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:8 }}>Schriftgröße</div>
                <div style={{ display:'flex', gap:7 }}>
                  {['sm','md','lg'].map(k => (
                    <button key={k} onClick={() => saveUserSetting('font_size', k)} style={{ padding:'6px 14px', borderRadius:7, border: userSettings.font_size===k?'1.5px solid var(--gold)':'0.5px solid var(--border)', background: userSettings.font_size===k?'var(--gdbg)':'var(--bg2)', color: userSettings.font_size===k?'var(--gold)':'var(--t2)', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s' }}>
                      {k==='sm'?'Klein':k==='md'?'Standard':'Groß'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:8 }}>Hintergrundbilder</div>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:8 }}>
                  <div onClick={()=>saveUserSetting('bg_image',null)}
                    style={{ width:52, height:36, borderRadius:7, background:'var(--bg3)', border: !userSettings.bg_image?'2px solid var(--gold)':'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'var(--t3)', transition:'all .15s' }}>
                    Keine
                  </div>
                  {BG_IMAGE_OPTIONS.map(bg => (
                    <div key={bg.key} onClick={()=>saveUserSetting('bg_image', bg.src)}
                      style={{ width:52, height:36, borderRadius:7, backgroundImage:'url('+bg.src+')', backgroundSize:'cover', cursor:'pointer', border: userSettings.bg_image===bg.src?'2px solid var(--gold)':'1px solid var(--border)', transition:'all .15s', position:'relative' }}
                      title={bg.label}>
                      {userSettings.bg_image===bg.src && <div style={{ position:'absolute', top:2, right:2, width:12, height:12, borderRadius:'50%', background:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center' }}><i className="ti ti-check" style={{fontSize:8,color:'#fff'}}/></div>}
                    </div>
                  ))}
                </div>
                <BgImageUploader staffId={me?.id} supabase={supabase} currentBgImage={userSettings.bg_image?.startsWith('/bg/')?null:userSettings.bg_image}
                  onUploaded={url => saveUserSetting('bg_image', url)}
                  onRemoved={() => saveUserSetting('bg_image', null)} />
              </div>
            </div>
          )}
        </div>
      </div>
      {fahrtModal && (
        <div onClick={e=>{if(e.target===e.currentTarget)setFahrtModal(false)}} style={{ position:'fixed', inset:0, background:'rgba(28,26,22,.45)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <form onSubmit={addFahrt} className="modal-animate" style={{ background:'var(--bg2)', borderRadius:13, padding:22, width:400, boxShadow:'0 20px 60px rgba(0,0,0,.16)' }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <i className="ti ti-car" style={{ color:'var(--gold)' }} /> Neue Fahrt
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:9 }}>
              <div><label style={LS}>Datum</label><input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} style={IS} required /></div>
              <div><label style={LS}>km</label><input name="km" type="number" min="1" placeholder="42" style={IS} required /></div>
              <div><label style={LS}>Von</label><input name="von" placeholder="Mannheim" style={IS} required /></div>
              <div><label style={LS}>Nach</label><input name="nach" placeholder="Weisenheim" style={IS} required /></div>
            </div>
            <div style={{ marginBottom:12 }}><label style={LS}>Zweck (optional)</label><input name="zweck" placeholder="Bartz Shooting" style={IS} /></div>
            <div style={{ display:'flex', gap:8 }}>
              <button type="button" onClick={()=>setFahrtModal(false)} style={{ flex:1, background:'none', border:'0.5px solid var(--border)', borderRadius:8, padding:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>Abbrechen</button>
              <button type="submit" style={{ flex:2, background:'var(--gold)', color:'#fff', border:'none', borderRadius:8, padding:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>Speichern</button>
            </div>
          </form>
        </div>
      )}
      {uploadModal && me?.role_level === 'admin' && (
        <div onClick={e=>{if(e.target===e.currentTarget)setUploadModal(false)}} style={{ position:'fixed', inset:0, background:'rgba(28,26,22,.45)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="modal-animate" style={{ background:'var(--bg2)', borderRadius:13, padding:22, width:420, boxShadow:'0 20px 60px rgba(0,0,0,.16)' }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <i className="ti ti-file-invoice" style={{ color:'var(--gold)' }} /> Gehaltszettel hochladen
            </div>
            <div style={{ marginBottom:10 }}><label style={LS}>Mitarbeiter</label>
              <select style={IS} id="gz-staff">{allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </div>
            <div style={{ marginBottom:10 }}><label style={LS}>Monat</label>
              <input id="gz-month" type="month" defaultValue={currentMonth} style={IS} />
            </div>
            <div style={{ marginBottom:14 }}><label style={LS}>PDF-Datei</label>
              <input ref={fileRef} type="file" accept=".pdf" style={{ ...IS, padding:'5px 10px' }} />
            </div>
            {gzError && <div style={{ fontSize:11, color:'var(--red)', marginBottom:8, padding:'6px 10px', background:'#fee2e2', borderRadius:6, display:'flex', alignItems:'center', gap:5 }}><i className="ti ti-alert-circle" style={{fontSize:12}}/>{gzError}</div>}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>{setUploadModal(false);setGzError(null)}} style={{ flex:1, background:'none', border:'0.5px solid var(--border)', borderRadius:8, padding:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>Abbrechen</button>
              <button onClick={async()=>{
                const file = fileRef.current?.files?.[0]
                const staffId = document.getElementById('gz-staff')?.value
                const month = document.getElementById('gz-month')?.value
                if (file && staffId && month) await uploadGehaltszettel(file, month, staffId)
                else setGzError('Bitte alle Felder ausfüllen und eine Datei wählen.')
              }} disabled={gzUploading} style={{ flex:2, background: gzUploading ? '#ccc' : 'var(--gold)', color:'#fff', border:'none', borderRadius:8, padding:8, fontSize:13, fontWeight:700, cursor: gzUploading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                <i className={'ti ' + (gzUploading ? 'ti-loader' : 'ti-upload')} style={{ fontSize:13 }} />
                {gzUploading ? 'Wird hochgeladen...' : 'Hochladen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
