'use client'
import { useState, useEffect, useRef } from 'react'

const GOLD = '#b8892a', DARK = '#2a2a28'

export default function AdminLeistungen() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [savedMsg, setSavedMsg] = useState(null)
  const fileRefs = useRef({})

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/booking/config')
      const d = await r.json()
      setServices((d.services || []).map(s => ({ ...s, _dirty:false })))
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function setField(id, field, val) {
    setServices(s => s.map(x => x.id===id ? { ...x, [field]:val, _dirty:true } : x))
  }

  function resizeToDataURL(file, cb) {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const size = Math.min(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = 300; canvas.height = 300
        const ctx = canvas.getContext('2d')
        const sx = (img.width - size)/2, sy = (img.height - size)/2
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 300, 300)
        cb(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  function onPick(svc, file) {
    if (!file) return
    resizeToDataURL(file, async dataUrl => {
      setSaving(svc.id)
      try {
        const r = await fetch('/api/booking/service-image', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id: svc.id, image_url: dataUrl })
        })
        if (!r.ok) { const d=await r.json(); throw new Error(d.error||'Fehler') }
        setServices(s => s.map(x => x.id===svc.id ? {...x, image_url:dataUrl} : x))
      } catch(e) { alert(e.message) }
      setSaving(null)
    })
  }

  async function saveService(svc) {
    setSaving(svc.id)
    try {
      const r = await fetch('/api/booking/service-image', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          id: svc.id, name: svc.name, description: svc.description,
          duration_min: svc.duration_min, buffer_min: svc.buffer_min, active: svc.active,
        })
      })
      if (!r.ok) { const d=await r.json(); throw new Error(d.error||'Fehler') }
      setServices(s => s.map(x => x.id===svc.id ? {...x, _dirty:false} : x))
      setSavedMsg(svc.id); setTimeout(()=>setSavedMsg(null), 1800)
    } catch(e) { alert(e.message) }
    setSaving(null)
  }

  const inp = { width:'100%', padding:'9px 11px', fontSize:13, border:'0.5px solid #e6ddc9', borderRadius:7, boxSizing:'border-box', fontFamily:'inherit', outline:'none', background:'#fff', color:DARK }
  const lbl = { fontSize:10, fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:4, display:'block' }

  return (
    <div style={{minHeight:'100vh',background:'#f4f2ef',fontFamily:'Arial,sans-serif',padding:'28px 20px'}}>
      <div style={{maxWidth:780,margin:'0 auto'}}>
        <h1 style={{fontSize:22,fontWeight:700,color:DARK,marginBottom:6}}>Leistungen verwalten</h1>
        <p style={{fontSize:13,color:'#8a8278',marginBottom:24}}>Name, Beschreibung, Dauer und Bild für die Buchungsseite bearbeiten.</p>

        {loading ? <div style={{color:'#8a8278'}}>Wird geladen…</div> : (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {services.map(svc => (
              <div key={svc.id} style={{background:'#fff',border:'1px solid #e6ddc9',borderRadius:12,padding:16,opacity:svc.active?1:0.6}}>
                <div style={{display:'flex',gap:16}}>
                  {/* Bild */}
                  <div style={{flexShrink:0,textAlign:'center'}}>
                    <div style={{width:80,height:80,borderRadius:'50%',overflow:'hidden',background:'#f0ece4',border:'2px solid #e6ddc9',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}>
                      {svc.image_url ? <img src={svc.image_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                        : <span style={{fontSize:30}}>{svc.category==='Immobilienvideo'?'🎬':svc.category==='Gespräch'?'💬':'📷'}</span>}
                    </div>
                    <input type="file" accept="image/*" style={{display:'none'}} ref={el=>fileRefs.current[svc.id]=el} onChange={e=>onPick(svc, e.target.files?.[0])} />
                    <button onClick={()=>fileRefs.current[svc.id]?.click()} disabled={saving===svc.id}
                      style={{padding:'5px 10px',fontSize:11,fontWeight:700,background:'#f0ece4',color:GOLD,border:'none',borderRadius:6,cursor:'pointer'}}>
                      {svc.image_url?'Bild ändern':'Bild +'}
                    </button>
                  </div>
                  {/* Felder */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:10,marginBottom:10}}>
                      <div>
                        <label style={lbl}>Name</label>
                        <input value={svc.name||''} onChange={e=>setField(svc.id,'name',e.target.value)} style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>Kategorie</label>
                        <input value={svc.category||''} disabled style={{...inp,background:'#f5f3ee',color:'#999'}} />
                      </div>
                    </div>
                    <div style={{marginBottom:10}}>
                      <label style={lbl}>Kurzbeschreibung (auf der Buchungsseite sichtbar)</label>
                      <textarea value={svc.description||''} onChange={e=>setField(svc.id,'description',e.target.value)} placeholder="z.B. Professionelle Innen- und Außenaufnahmen, ca. 25 bearbeitete Bilder…" style={{...inp,minHeight:54,resize:'vertical'}} />
                    </div>
                    <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
                      <div style={{width:110}}>
                        <label style={lbl}>Dauer (Min.)</label>
                        <input type="number" value={svc.duration_min||0} onChange={e=>setField(svc.id,'duration_min',e.target.value)} style={inp} />
                      </div>
                      <div style={{width:110}}>
                        <label style={lbl}>Puffer (Min.)</label>
                        <input type="number" value={svc.buffer_min||0} onChange={e=>setField(svc.id,'buffer_min',e.target.value)} style={inp} />
                      </div>
                      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:DARK,cursor:'pointer',paddingBottom:8}}>
                        <input type="checkbox" checked={!!svc.active} onChange={e=>setField(svc.id,'active',e.target.checked)} /> Aktiv
                      </label>
                      <div style={{marginLeft:'auto',paddingBottom:2}}>
                        {savedMsg===svc.id && <span style={{fontSize:12,color:'#15803d',marginRight:10}}>✓ Gespeichert</span>}
                        <button onClick={()=>saveService(svc)} disabled={saving===svc.id||!svc._dirty}
                          style={{padding:'8px 18px',fontSize:13,fontWeight:700,background:svc._dirty?GOLD:'#ddd',color:'#fff',border:'none',borderRadius:7,cursor:svc._dirty?'pointer':'default'}}>
                          {saving===svc.id?'…':'Speichern'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
