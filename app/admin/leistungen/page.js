'use client'
import { useState, useEffect, useRef } from 'react'

const GOLD = '#b8892a', DARK = '#2a2a28'

export default function AdminLeistungen() {
  const [services, setServices] = useState([])
  const [providers, setProviders] = useState([])
  const [assignments, setAssignments] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [savedMsg, setSavedMsg] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [nf, setNf] = useState({ name:'', category:'', duration_min:30, buffer_min:0 })
  const fileRefs = useRef({})

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/booking/services-admin')
      const d = await r.json()
      setServices((d.services||[]).map(s=>({ ...s, _dirty:false })))
      setProviders(d.providers||[])
      setAssignments(d.assignments||{})
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const categories = [...new Set(services.map(s=>s.category).filter(Boolean))]
  function setField(id, field, val) { setServices(s=>s.map(x=>x.id===id?{...x,[field]:val,_dirty:true}:x)) }

  async function api(payload) {
    const r = await fetch('/api/booking/services-admin', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
    if (!r.ok) { const d=await r.json().catch(()=>({})); throw new Error(d.error||'Fehler') }
    return r.json()
  }

  async function saveService(svc) {
    setSaving(svc.id)
    try {
      await api({ action:'update', id:svc.id, name:svc.name, category:svc.category, description:svc.description, duration_min:svc.duration_min, buffer_min:svc.buffer_min, active:svc.active })
      setServices(s=>s.map(x=>x.id===svc.id?{...x,_dirty:false}:x))
      setSavedMsg(svc.id); setTimeout(()=>setSavedMsg(null),1800)
    } catch(e){ alert(e.message) }
    setSaving(null)
  }

  async function toggleProvider(svc, provId, on) {
    // optimista frissítés
    setAssignments(a => {
      const list = new Set(a[svc.id]||[])
      on ? list.add(provId) : list.delete(provId)
      return { ...a, [svc.id]:[...list] }
    })
    try { await api({ action: on?'assign':'unassign', service_id:svc.id, provider_id:provId }) }
    catch(e){ alert(e.message); load() }
  }

  async function toggleProviderActive(prov) {
    setProviders(ps=>ps.map(p=>p.id===prov.id?{...p,active:!p.active}:p))
    try { await api({ action:'set_provider_active', provider_id:prov.id, active:!prov.active }) }
    catch(e){ alert(e.message); load() }
  }

  async function createService() {
    if (!nf.name || !nf.category) { alert('Name und Kategorie erforderlich'); return }
    setSaving('new')
    try { await api({ action:'create', ...nf }); setShowNew(false); setNf({name:'',category:'',duration_min:30,buffer_min:0}); await load() }
    catch(e){ alert(e.message) }
    setSaving(null)
  }

  async function deleteService(svc) {
    if (!confirm(`Leistung "${svc.name}" wirklich löschen?`)) return
    setSaving(svc.id)
    try { await api({ action:'delete', id:svc.id }); await load() }
    catch(e){ alert(e.message) }
    setSaving(null)
  }

  function resizeToDataURL(file, cb) {
    const reader = new FileReader()
    reader.onload = e => { const img=new Image(); img.onload=()=>{ const size=Math.min(img.width,img.height); const c=document.createElement('canvas'); c.width=300;c.height=300; const x=c.getContext('2d'); x.drawImage(img,(img.width-size)/2,(img.height-size)/2,size,size,0,0,300,300); cb(c.toDataURL('image/jpeg',0.8)) }; img.src=e.target.result }
    reader.readAsDataURL(file)
  }
  function onPick(svc, file) {
    if (!file) return
    resizeToDataURL(file, async dataUrl => {
      setSaving(svc.id)
      try { const r=await fetch('/api/booking/service-image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:svc.id,image_url:dataUrl})}); if(!r.ok)throw new Error(); setServices(s=>s.map(x=>x.id===svc.id?{...x,image_url:dataUrl}:x)) }
      catch(e){ alert('Bild-Fehler') }
      setSaving(null)
    })
  }

  const inp = { width:'100%', padding:'9px 11px', fontSize:13, border:'0.5px solid #e6ddc9', borderRadius:7, boxSizing:'border-box', fontFamily:'inherit', outline:'none', background:'#fff', color:DARK }
  const lbl = { fontSize:10, fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:4, display:'block' }

  return (
    <div style={{minHeight:'100vh',background:'#f4f2ef',fontFamily:'Arial,sans-serif',padding:'28px 20px'}}>
      <datalist id="ip-cats">{categories.map(c=><option key={c} value={c} />)}</datalist>
      <div style={{maxWidth:820,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6,flexWrap:'wrap',gap:10}}>
          <h1 style={{fontSize:22,fontWeight:700,color:DARK,margin:0}}>Leistungen verwalten</h1>
          <button onClick={()=>setShowNew(v=>!v)} style={{padding:'8px 16px',fontSize:13,fontWeight:700,background:GOLD,color:'#fff',border:'none',borderRadius:8,cursor:'pointer'}}>+ Neue Leistung</button>
        </div>
        <p style={{fontSize:13,color:'#8a8278',marginBottom:20}}>Name, Kategorie, Beschreibung, Dauer, Bild und zugeordnete Mitarbeiter bearbeiten.</p>

        {/* Mitarbeiter aktiv-kapcsolók */}
        <div style={{background:'#fff',border:'1px solid #e6ddc9',borderRadius:12,padding:'12px 16px',marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:700,color:'#999',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:8}}>Mitarbeiter (für Buchungen aktiv)</div>
          <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
            {providers.map(p=>(
              <label key={p.id} style={{display:'flex',alignItems:'center',gap:7,fontSize:13,color:DARK,cursor:'pointer'}}>
                <input type="checkbox" checked={!!p.active} onChange={()=>toggleProviderActive(p)} />
                <span style={{fontWeight:700}}>{p.name}</span>
                <span style={{fontSize:11,color:p.active?'#15803d':'#b91c1c'}}>{p.active?'aktiv':'inaktiv'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Neue Leistung űrlap */}
        {showNew && (
          <div style={{background:'#fff',border:'1.5px solid '+GOLD,borderRadius:12,padding:16,marginBottom:18}}>
            <div style={{fontSize:13,fontWeight:700,color:DARK,marginBottom:10}}>Neue Leistung anlegen</div>
            <div style={{display:'grid',gridTemplateColumns:'2fr 2fr 1fr 1fr',gap:10,alignItems:'flex-end'}}>
              <div><label style={lbl}>Name</label><input value={nf.name} onChange={e=>setNf({...nf,name:e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Kategorie</label><input list="ip-cats" value={nf.category} onChange={e=>setNf({...nf,category:e.target.value})} placeholder="bestehend wählen oder neu" style={inp} /></div>
              <div><label style={lbl}>Dauer</label><input type="number" value={nf.duration_min} onChange={e=>setNf({...nf,duration_min:e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Puffer</label><input type="number" value={nf.buffer_min} onChange={e=>setNf({...nf,buffer_min:e.target.value})} style={inp} /></div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={createService} disabled={saving==='new'} style={{padding:'8px 18px',fontSize:13,fontWeight:700,background:GOLD,color:'#fff',border:'none',borderRadius:7,cursor:'pointer'}}>{saving==='new'?'…':'Anlegen'}</button>
              <button onClick={()=>setShowNew(false)} style={{padding:'8px 16px',fontSize:13,background:'none',border:'0.5px solid #ccc',borderRadius:7,color:'#666',cursor:'pointer'}}>Abbrechen</button>
            </div>
          </div>
        )}

        {loading ? <div style={{color:'#8a8278'}}>Wird geladen…</div> : (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {services.map(svc => (
              <div key={svc.id} style={{background:'#fff',border:'1px solid #e6ddc9',borderRadius:12,padding:16,opacity:svc.active?1:0.6}}>
                <div style={{display:'flex',gap:16}}>
                  <div style={{flexShrink:0,textAlign:'center'}}>
                    <div style={{width:80,height:80,borderRadius:'50%',overflow:'hidden',background:'#f0ece4',border:'2px solid #e6ddc9',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}>
                      {svc.image_url ? <img src={svc.image_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : <span style={{fontSize:30}}>{svc.category==='Immobilienvideo'?'🎬':svc.category==='Gespräch'?'💬':'📷'}</span>}
                    </div>
                    <input type="file" accept="image/*" style={{display:'none'}} ref={el=>fileRefs.current[svc.id]=el} onChange={e=>onPick(svc,e.target.files?.[0])} />
                    <button onClick={()=>fileRefs.current[svc.id]?.click()} disabled={saving===svc.id} style={{padding:'5px 10px',fontSize:11,fontWeight:700,background:'#f0ece4',color:GOLD,border:'none',borderRadius:6,cursor:'pointer'}}>{svc.image_url?'Bild ändern':'Bild +'}</button>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'grid',gridTemplateColumns:'2fr 1.4fr',gap:10,marginBottom:10}}>
                      <div><label style={lbl}>Name</label><input value={svc.name||''} onChange={e=>setField(svc.id,'name',e.target.value)} style={inp} /></div>
                      <div><label style={lbl}>Kategorie</label><input list="ip-cats" value={svc.category||''} onChange={e=>setField(svc.id,'category',e.target.value)} style={inp} /></div>
                    </div>
                    <div style={{marginBottom:10}}><label style={lbl}>Kurzbeschreibung (auf der Buchungsseite sichtbar)</label>
                      <textarea value={svc.description||''} onChange={e=>setField(svc.id,'description',e.target.value)} placeholder="z.B. Professionelle Innen- und Außenaufnahmen…" style={{...inp,minHeight:50,resize:'vertical'}} /></div>

                    <div style={{marginBottom:10}}>
                      <label style={lbl}>Mitarbeiter zugeordnet</label>
                      <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
                        {providers.map(p=>{
                          const on = (assignments[svc.id]||[]).includes(p.id)
                          return (
                            <label key={p.id} style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:DARK,cursor:'pointer'}}>
                              <input type="checkbox" checked={on} onChange={e=>toggleProvider(svc,p.id,e.target.checked)} />
                              {p.name}{!p.active && <span style={{fontSize:10,color:'#b91c1c'}}>(inaktiv)</span>}
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
                      <div style={{width:100}}><label style={lbl}>Dauer (Min.)</label><input type="number" value={svc.duration_min||0} onChange={e=>setField(svc.id,'duration_min',e.target.value)} style={inp} /></div>
                      <div style={{width:100}}><label style={lbl}>Puffer (Min.)</label><input type="number" value={svc.buffer_min||0} onChange={e=>setField(svc.id,'buffer_min',e.target.value)} style={inp} /></div>
                      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:DARK,cursor:'pointer',paddingBottom:8}}>
                        <input type="checkbox" checked={!!svc.active} onChange={e=>setField(svc.id,'active',e.target.checked)} /> Aktiv
                      </label>
                      <div style={{marginLeft:'auto',paddingBottom:2,display:'flex',alignItems:'center',gap:10}}>
                        {savedMsg===svc.id && <span style={{fontSize:12,color:'#15803d'}}>✓ Gespeichert</span>}
                        <button onClick={()=>deleteService(svc)} disabled={saving===svc.id} title="Löschen" style={{padding:'8px 10px',fontSize:13,background:'#fff',color:'#b91c1c',border:'0.5px solid #e3b7b7',borderRadius:7,cursor:'pointer'}}>🗑</button>
                        <button onClick={()=>saveService(svc)} disabled={saving===svc.id||!svc._dirty} style={{padding:'8px 18px',fontSize:13,fontWeight:700,background:svc._dirty?GOLD:'#ddd',color:'#fff',border:'none',borderRadius:7,cursor:svc._dirty?'pointer':'default'}}>{saving===svc.id?'…':'Speichern'}</button>
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
