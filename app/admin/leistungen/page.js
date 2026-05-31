'use client'
import { useState, useEffect, useRef } from 'react'

const GOLD = '#b8892a'

export default function AdminLeistungen() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const fileRefs = useRef({})

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/booking/config')
      const d = await r.json()
      setServices(d.services || [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Kép kicsinyítése kör-méretre (max 300px), base64-re alakítva
  function resizeToDataURL(file, cb) {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const size = Math.min(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = 300; canvas.height = 300
        const ctx = canvas.getContext('2d')
        // középre vágás négyzetre
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
        const d = await r.json()
        if (!r.ok) throw new Error(d.error||'Fehler')
        setServices(s => s.map(x => x.id===svc.id ? {...x, image_url:dataUrl} : x))
      } catch(e) { alert(e.message) }
      setSaving(null)
    })
  }

  async function remove(svc) {
    setSaving(svc.id)
    try {
      await fetch('/api/booking/service-image', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id: svc.id, image_url: null })
      })
      setServices(s => s.map(x => x.id===svc.id ? {...x, image_url:null} : x))
    } catch(e) { alert(e.message) }
    setSaving(null)
  }

  return (
    <div style={{minHeight:'100vh',background:'#f4f2ef',fontFamily:'Arial,sans-serif',padding:'28px 20px'}}>
      <div style={{maxWidth:720,margin:'0 auto'}}>
        <h1 style={{fontSize:22,fontWeight:700,color:'#2a2a28',marginBottom:6}}>Leistungs-Bilder</h1>
        <p style={{fontSize:13,color:'#8a8278',marginBottom:24}}>Lade runde Kategorie-Bilder für die Buchungsseite hoch. Bilder werden automatisch quadratisch zugeschnitten.</p>

        {loading ? <div style={{color:'#8a8278'}}>Wird geladen…</div> : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {services.map(svc => (
              <div key={svc.id} style={{display:'flex',alignItems:'center',gap:14,background:'#fff',border:'1px solid #e6ddc9',borderRadius:12,padding:'12px 16px'}}>
                <div style={{width:60,height:60,borderRadius:'50%',overflow:'hidden',flexShrink:0,background:'#f0ece4',border:'2px solid #e6ddc9',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {svc.image_url
                    ? <img src={svc.image_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                    : <span style={{fontSize:24}}>{svc.category==='Immobilienvideo'?'🎬':svc.category==='Gespräch'?'💬':'📷'}</span>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#2a2a28'}}>{svc.name}</div>
                  <div style={{fontSize:12,color:'#8a8278'}}>{svc.category} · {svc.duration_min} Min.</div>
                </div>
                <input type="file" accept="image/*" style={{display:'none'}}
                  ref={el => fileRefs.current[svc.id]=el}
                  onChange={e => onPick(svc, e.target.files?.[0])} />
                <button onClick={()=>fileRefs.current[svc.id]?.click()} disabled={saving===svc.id}
                  style={{padding:'8px 16px',fontSize:13,fontWeight:700,background:GOLD,color:'#fff',border:'none',borderRadius:8,cursor:'pointer'}}>
                  {saving===svc.id?'…':svc.image_url?'Ändern':'Hochladen'}
                </button>
                {svc.image_url && (
                  <button onClick={()=>remove(svc)} disabled={saving===svc.id}
                    style={{padding:'8px 12px',fontSize:13,background:'none',color:'#b91c1c',border:'1px solid #e3b7b7',borderRadius:8,cursor:'pointer'}}>
                    Entfernen
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
