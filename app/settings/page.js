'use client'
export const dynamic = 'force-dynamic'
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const DEFAULTS = {

  client_categories: ['Maklerunternehmen','Privat','Bauträger','Bank','Home Designer','Sonstige'],
  staff_roles: ['Fotograf','Videograf / Cutter','Drohnen Pilot','Backoffice','Social Media','Leiter / Fotograf'],
}

const BG_IMAGE_OPTIONS = [
  { key:'bg_wa_cream',     label:'Cream',     src:'/bg/bg_wa_cream.png' },
  { key:'bg_wa_mint',      label:'Mint',      src:'/bg/bg_wa_mint.png' },
  { key:'bg_wa_lightgray', label:'Gray',      src:'/bg/bg_wa_lightgray.png' },
  { key:'bg_blue',         label:'Blue',      src:'/bg/bg_blue.png' },
]

const BG_OPTIONS = [
  { key:'linen', color:'#f4f2ef', label:'Linen' },
  { key:'bluegray', color:'#f0f4f8', label:'Blaugrau' },
  { key:'sand', color:'#f5f0eb', label:'Sand' },
  { key:'sage', color:'#eef4ee', label:'Sage' },
  { key:'lavender', color:'#f8f0f5', label:'Lavendel' },
  { key:'dark', color:'#1c1a16', label:'Dark' },
  { key:'white', color:'#ffffff', label:'Weiß' },
]

const FONT_SIZES = [
  { key:'sm', label:'Klein', size:'13px' },
  { key:'md', label:'Standard', size:'14px' },
  { key:'lg', label:'Groß', size:'16px' },
]

const CARD_SIZES = [
  { key:'compact', label:'Kompakt', w:80, desc:'Weniger Details' },
  { key:'standard', label:'Standard', w:95, desc:'Ausgeglichen' },
  { key:'large', label:'Groß', w:115, desc:'Mehr Details' },
]

function CategorySection({ title, icon, items, onAdd, onRename, onRemove }) {
  const [newVal, setNewVal] = useState('')
  const [editIdx, setEditIdx] = useState(null)
  const [editVal, setEditVal] = useState('')
  const label = typeof items[0] === 'object' ? items.map(i=>i.l||i) : items
  return (
    <div style={{ background:'#fff', border:'0.5px solid #eeeae6', borderRadius:12, padding:18, marginBottom:14 }}>
      <div style={{ fontSize:14, fontWeight:700, color:'#1c1a16', display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <i className={'ti ' + icon} style={{ fontSize:16, color:'#b8892a' }} />{title}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
        {items.map((item, idx) => {
          const lbl = typeof item === 'object' ? item.l : item
          return (
            <div key={idx} style={{ display:'flex', alignItems:'center', gap:4, background:'#f4f2ef', border:'0.5px solid #eeeae6', borderRadius:20, padding:'5px 8px 5px 12px', fontSize:12, fontWeight:600, color:'#1c1a16' }}>
              {editIdx===idx ? (
                <input value={editVal} onChange={e=>setEditVal(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'){onRename(idx,editVal);setEditIdx(null)}if(e.key==='Escape')setEditIdx(null)}}
                  autoFocus style={{ border:'none', outline:'none', background:'transparent', fontSize:12, fontWeight:600, width:80, color:'#1c1a16' }}/>
              ) : <span>{lbl}</span>}
              <button onClick={()=>{setEditIdx(idx);setEditVal(lbl)}} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa8a0', padding:'0 3px', display:'flex', alignItems:'center' }}
                onMouseEnter={e=>e.currentTarget.style.color='#b8892a'} onMouseLeave={e=>e.currentTarget.style.color='#aaa8a0'}>
                <i className="ti ti-pencil" style={{ fontSize:11 }} />
              </button>
              <button onClick={()=>onRemove(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa8a0', padding:'0 3px', display:'flex', alignItems:'center' }}
                onMouseEnter={e=>e.currentTarget.style.color='#b91c1c'} onMouseLeave={e=>e.currentTarget.style.color='#aaa8a0'}>
                <i className="ti ti-x" style={{ fontSize:12 }} />
              </button>
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', gap:7 }}>
        <input value={newVal} onChange={e=>setNewVal(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&newVal.trim()){onAdd(newVal.trim());setNewVal('')}}}
          placeholder="Neu hinzufügen..."
          style={{ flex:1, background:'#f4f2ef', border:'0.5px solid #ddd9d2', borderRadius:8, padding:'8px 12px', fontSize:12, outline:'none', color:'#1c1a16' }}
          onFocus={e=>e.target.style.borderColor='#b8892a'} onBlur={e=>e.target.style.borderColor='#ddd9d2'}/>
        <button onClick={()=>{if(newVal.trim()){onAdd(newVal.trim());setNewVal('')}}}
          style={{ background:'#b8892a', color:'#fff', border:'none', borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
          <i className="ti ti-plus" style={{ fontSize:12 }} /> Hinzufügen
        </button>
      </div>
    </div>
  )
}


function WatchActivateButton() {
  const [status, setStatus] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  async function activate() {
    setLoading(true); setStatus(null)
    try {
      const r = await fetch('/api/gcal/watch-ui')
      const data = await r.json()
      if (data.ok) {
        const ok = (data.results||[]).filter(x=>x.ok).length
        const fail = (data.results||[]).filter(x=>!x.ok).length
        setStatus({ ok:true, msg: ok+' Kalender verbunden'+(fail>0?', '+fail+' fehlgeschlagen':'') })
      } else { setStatus({ ok:false, msg:'Fehler: '+(data.reason||'Unbekannt') }) }
    } catch(e) { setStatus({ ok:false, msg:'Netzwerkfehler' }) }
    setLoading(false)
  }
  return (
    <div>
      <button onClick={activate} disabled={loading}
        style={{ background:'#b8892a', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, opacity:loading?0.7:1 }}>
        <i className="ti ti-refresh" style={{ fontSize:14 }} />
        {loading ? 'Wird verbunden...' : 'Watch aktivieren'}
      </button>
      {status && <div style={{ marginTop:10, fontSize:12, color:status.ok?'#15803d':'#b91c1c', display:'flex', alignItems:'center', gap:5 }}>
        <i className={'ti '+(status.ok?'ti-check':'ti-alert-circle')} style={{ fontSize:13 }} />
        {status.msg}
      </div>}
    </div>
  )
}



export default function Settings() {
  const [activeNav, setActiveNav] = useState('appearance')
  const [cats, setCats] = useState(DEFAULTS)
  const [colWidgetOn, setColWidgetOn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [bgColor, setBgColor] = useState('linen')
  const [bgImage, setBgImage] = useState(null)
  const [fontSize, setFontSize] = useState('md')
  const [cardSize, setCardSize] = useState('standard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) window.location.href = '/login'
    })
    load()
  }, [])

  async function load() {
    const { data } = await supabase.from('settings').select('*')
    const s = {...DEFAULTS}
    for (const row of (data||[])) {
      try { s[row.key] = JSON.parse(row.value) } catch(e) {}
    }
    setCats(s)
    setLoading(false)
    // Load per-user settings
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: st } = await supabase.from('staff').select('id').eq('email', user.email).single()
    if (!st?.id) return
    const { data: us } = await supabase.from('user_settings').select('*').eq('staff_id', st.id).single()
    if (us) {
      if (us.bg_color) setBgColor(us.bg_color)
      if (us.bg_image) setBgImage(us.bg_image)
      if (us.font_size) setFontSize(us.font_size)
      if (us.card_size) setCardSize(us.card_size)
      setColWidgetOn(!!us.col_widget_header)
    }
    // Load admin role — reuse existing user/st from above
    if (st?.id) {
      const { data: stRole } = await supabase.from('staff').select('role_level').eq('id', st.id).single()
      setIsAdmin(stRole?.role_level === 'admin')
    }
  }

  async function getStaffId() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: st } = await supabase.from('staff').select('id').eq('email', user.email).single()
    return st?.id || null
  }

  async function saveUserSetting(key, value) {
    const sid = await getStaffId()
    if (!sid) return
    await supabase.from('user_settings').upsert({ staff_id: sid, [key]: value }, { onConflict: 'staff_id' })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function saveBgImage(src) {
    setBgImage(src)
    const sid = await getStaffId()
    if (!sid) return
    await supabase.from('user_settings').upsert({ staff_id: sid, bg_image: src }, { onConflict: 'staff_id' })
    // Apply immediately
    if (src) {
      document.body.style.backgroundImage = 'url(' + src + ')'
      document.body.style.backgroundSize = 'cover'
      document.body.style.backgroundAttachment = 'fixed'
    } else {
      document.body.style.backgroundImage = 'none'
    }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
    // Log to debug
    try {
      const sid = await getStaffId()
      if (sid) {
        const { data: st } = await supabase.from('staff').select('init,name').eq('id', sid).single()
        if (st) await supabase.from('debug_log').insert({ action: src ? 'Hintergrund Bild: ' + src.split('/').pop() : 'Hintergrund Bild: entfernt', staff_init: st.init, staff_name: st.name, staff_id: sid })
      }
    } catch(e) {}
  }

  async function saveSetting(key, value) {
    await supabase.from('settings').upsert({ key, value: JSON.stringify(value) }, { onConflict: 'key' })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function saveCat(key, value) {
    setCats(p => ({...p, [key]: value}))
    await saveSetting(key, value)
  }

  const NAV = [
    { key:'appearance', label:'Aussehen', icon:'ti-palette', color:'#b8892a', bg:'rgba(184,137,42,.12)' },
    { key:'categories', label:'Kategorien', icon:'ti-camera', color:'#1d5ec7', bg:'rgba(29,94,199,.10)' },
    { key:'staff', label:'Mitarbeiter', icon:'ti-id-badge', color:'#15803d', bg:'rgba(21,128,61,.10)' },
    ...(isAdmin ? [{ key:'integrations', label:'Integrationen', icon:'ti-plug', color:'#6d28d9', bg:'rgba(109,40,217,.10)' }] : []),
  ]

  if (loading) return <div style={{padding:40,fontFamily:'Arial',color:'#8a8278',display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f4f2ef'}}>Wird geladen...</div>

  return (
    <div style={{ minHeight:'100vh', background:'#f4f2ef', fontFamily:'Arial,sans-serif' }}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css" />
      <div style={{ maxWidth:860, margin:'0 auto', padding:'28px 20px' }}>
        
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <a href="/" style={{ color:'#8a8278', textDecoration:'none', fontSize:13, display:'flex', alignItems:'center', gap:5 }}>
            <i className="ti ti-arrow-left" style={{ fontSize:14 }} /> Zurück
          </a>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0, color:'#1c1a16' }}>Einstellungen</h1>
          {saved && (
            <span style={{ background:'rgba(156,175,136,.15)', color:'#3a6030', border:'0.5px solid rgba(156,175,136,.4)', borderRadius:6, padding:'3px 10px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
              <i className="ti ti-check" style={{ fontSize:11 }} /> Gespeichert
            </span>
          )}
        </div>

        <div style={{ display:'flex', gap:18 }}>
          
          {/* Sidebar */}
          <div style={{ width:190, flexShrink:0 }}>
            <div style={{ background:'#fff', border:'0.5px solid #eeeae6', borderRadius:12, padding:8, overflow:'hidden' }}>
              {NAV.map(n => (
                <div key={n.key} onClick={() => setActiveNav(n.key)}
                  style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 11px', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:600, color: activeNav===n.key ? n.color : '#4a4540', background: activeNav===n.key ? n.bg : 'none', marginBottom:3, transition:'all .15s' }}
                  onMouseEnter={e=>{ if(activeNav!==n.key){e.currentTarget.style.background='rgba(184,137,42,.06)';e.currentTarget.style.paddingLeft='15px'} }}
                  onMouseLeave={e=>{ if(activeNav!==n.key){e.currentTarget.style.background='none';e.currentTarget.style.paddingLeft='11px'} }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:n.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <i className={'ti ' + n.icon} style={{ fontSize:15, color:n.color }} />
                  </div>
                  {n.label}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex:1 }}>

            {activeNav === 'appearance' && (
              <>
                {/* Font size */}
                <div style={{ background:'#fff', border:'0.5px solid #eeeae6', borderRadius:12, padding:18, marginBottom:14 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#1c1a16', display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                    <i className="ti ti-text-size" style={{ fontSize:16, color:'#b8892a' }} /> Schriftgröße
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    {FONT_SIZES.map(f => (
                      <div key={f.key} onClick={() => { setFontSize(f.key); saveUserSetting('font_size', f.key) }}
                        style={{ flex:1, background: fontSize===f.key ? 'rgba(184,137,42,.08)' : '#f4f2ef', border: fontSize===f.key ? '1.5px solid #b8892a' : '0.5px solid #eeeae6', borderRadius:9, padding:'12px', textAlign:'center', cursor:'pointer', transition:'all .15s' }}>
                        <div style={{ fontSize: f.key==='sm'?'13px':f.key==='lg'?'18px':'15px', fontWeight:700, color: fontSize===f.key ? '#b8892a' : '#1c1a16', marginBottom:4 }}>Aa</div>
                        <div style={{ fontSize:11, color: fontSize===f.key ? '#b8892a' : '#8a8278', fontWeight:600 }}>{f.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card size */}
                <div style={{ background:'#fff', border:'0.5px solid #eeeae6', borderRadius:12, padding:18, marginBottom:14 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#1c1a16', display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                    <i className="ti ti-layout-cards" style={{ fontSize:16, color:'#b8892a' }} /> Kartengröße
                  </div>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
                    {CARD_SIZES.map(cs => (
                      <div key={cs.key} onClick={() => { setCardSize(cs.key); saveUserSetting('card_size', cs.key) }} style={{ cursor:'pointer', textAlign:'center' }}>
                        <div style={{ width:cs.w, border: cardSize===cs.key ? '1.5px solid #b8892a' : '0.5px solid #ddd9d2', borderRadius:9, padding: cs.key==='compact'?'7px 9px':cs.key==='standard'?'9px 10px':'12px', background: cardSize===cs.key ? 'rgba(184,137,42,.05)' : '#fff', boxShadow: cardSize===cs.key ? '0 0 0 3px rgba(184,137,42,.1)' : 'none', transition:'all .15s' }}>
                          <div style={{ height:cs.key==='compact'?6:cs.key==='standard'?7:8, background:'#FFBE98', borderRadius:3, marginBottom:cs.key==='compact'?4:5, width:'55%' }} />
                          <div style={{ height:cs.key==='compact'?8:cs.key==='standard'?9:10, background:'#eeeae6', borderRadius:2, marginBottom:3 }} />
                          <div style={{ height:cs.key==='compact'?6:cs.key==='standard'?7:8, background:'#f4f2ef', borderRadius:2, width:'70%' }} />
                          {cs.key==='large' && <div style={{ height:22, background:'#f4f2ef', borderRadius:5, marginTop:7 }} />}
                        </div>
                        <div style={{ fontSize:11, fontWeight:700, color: cardSize===cs.key ? '#b8892a' : '#4a4540', marginTop:6 }}>{cs.label}</div>
                        <div style={{ fontSize:10, color:'#aaa8a0' }}>{cs.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hintergrund - szín + kép egy helyen */}
                <div style={{ background:'#fff', border:'0.5px solid #eeeae6', borderRadius:12, padding:18 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#1c1a16', display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                    <i className="ti ti-paint" style={{ fontSize:16, color:'#b8892a' }} /> Hintergrund
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#8a8278', marginBottom:8, textTransform:'uppercase', letterSpacing:'.5px' }}>Farbe</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
                    {BG_OPTIONS.map(bg => (
                      <div key={bg.key}
                        onClick={async () => { setBgColor(bg.key); setBgImage(null); saveBgImage(null); saveUserSetting('bg_color', bg.key); try { const sid = await getStaffId(); if(sid){const {data:st}=await supabase.from('staff').select('init,name').eq('id',sid).single(); if(st)await supabase.from('debug_log').insert({action:'Hintergrundfarbe: '+bg.label,staff_init:st.init,staff_name:st.name,staff_id:sid})}} catch(e){} }}
                        title={bg.label}
                        style={{ width:40, height:40, borderRadius:9, background:bg.color, cursor:'pointer', border: bgColor===bg.key && !bgImage ? '2px solid #b8892a' : '1px solid #ddd9d2', boxShadow: bgColor===bg.key && !bgImage ? '0 0 0 3px rgba(184,137,42,.2)' : 'none', transition:'all .15s', opacity: bgImage ? 0.45 : 1 }}
                        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
                        onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#8a8278', marginBottom:8, textTransform:'uppercase', letterSpacing:'.5px' }}>
                    Bild <span style={{ fontWeight:400, color:'#bbb8b0', textTransform:'none' }}>– überschreibt Farbe</span>
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <div onClick={()=>{ setBgImage(null); saveBgImage(null) }}
                      style={{ width:56, height:40, borderRadius:7, background:'var(--bg3)', border: !bgImage?'2px solid #b8892a':'1px solid #ddd9d2', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#8a8278', transition:'all .15s' }}>
                      Keine
                    </div>
                    {BG_IMAGE_OPTIONS.map(bg => (
                      <div key={bg.key} onClick={()=>saveBgImage(bg.src)} title={bg.label}
                        style={{ width:56, height:40, borderRadius:7, backgroundImage:'url('+bg.src+')', backgroundSize:'cover', cursor:'pointer', border: bgImage===bg.src?'2px solid #b8892a':'1px solid #ddd9d2', boxShadow: bgImage===bg.src?'0 0 0 3px rgba(184,137,42,.2)':'none', transition:'all .15s', position:'relative' }}
                        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'}
                        onMouseLeave={e=>e.currentTarget.style.transform='none'}>
                        {bgImage===bg.src && <div style={{ position:'absolute', top:2, right:2, width:14, height:14, borderRadius:'50%', background:'#b8892a', display:'flex', alignItems:'center', justifyContent:'center' }}><i className="ti ti-check" style={{fontSize:9,color:'#fff'}}/></div>}
                        <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,.35)', borderRadius:'0 0 6px 6px', padding:'2px 4px', fontSize:8, color:'#fff', fontWeight:700, textAlign:'center' }}>{bg.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:11, color:'#aaa8a0', marginTop:10 }}>Wird nur für dich gespeichert.</div>
                </div>
              </>
            )}

            {activeNav === 'appearance' && (
              <div style={{ background:'#fff', border:'0.5px solid #eeeae6', borderRadius:12, padding:18, marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#1c1a16', display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                  <i className="ti ti-columns" style={{ fontSize:16, color:'#b8892a' }} />
                  Spalten-Header Stil
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:13, color:'#1c1a16', fontWeight:600 }}>Widget-Header</div>
                    <div style={{ fontSize:11, color:'#8a8278', marginTop:2 }}>Farbiger Header wie bei Widgets</div>
                  </div>
                  <div onClick={()=>{ const nv=!colWidgetOn; setColWidgetOn(nv); saveUserSetting('col_widget_header',nv) }}
                    style={{ width:44, height:24, borderRadius:12, background:colWidgetOn?'#b8892a':'#ddd9d2', cursor:'pointer', position:'relative', transition:'background .2s', flexShrink:0 }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:colWidgetOn?22:2, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }} />
                  </div>
                </div>
              </div>
            )}

            {activeNav === 'categories' && (
              <>

                <CategorySection title="Kunden-Kategorien" icon="ti-users"
                  items={cats.client_categories}
                  onAdd={v => saveCat('client_categories', [...cats.client_categories, v])}
                  onRename={(i,v) => { if(!v.trim()) return; const a=[...cats.client_categories]; a[i]=v.trim(); saveCat('client_categories',a) }}
                  onRemove={i => saveCat('client_categories', cats.client_categories.filter((_,j)=>j!==i))}
                />
              </>
            )}

            {activeNav === 'staff' && (
              <CategorySection title="Mitarbeiter-Rollen" icon="ti-id-badge"
                items={cats.staff_roles}
                onAdd={v => saveCat('staff_roles', [...cats.staff_roles, v])}
                onRename={(i,v) => { if(!v.trim()) return; const a=[...cats.staff_roles]; a[i]=v.trim(); saveCat('staff_roles',a) }}
                onRemove={i => saveCat('staff_roles', cats.staff_roles.filter((_,j)=>j!==i))}
              />
            )}

          {activeNav === 'integrations' && (
            <div>
              <div style={{ background:'#fff', border:'0.5px solid #eeeae6', borderRadius:12, padding:18, marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#1c1a16', display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <i className="ti ti-brand-google" style={{ fontSize:16, color:'#b8892a' }} />
                  Google Calendar Sync
                </div>
                <div style={{ fontSize:12, color:'#8a8278', marginBottom:14, lineHeight:1.6 }}>
                  Aktiviert die sofortige Synchronisation zwischen Google Kalender und dem Board.<br/>
                  Die Watch-Verbindung ist 7 Tage gültig und wird jeden Montag automatisch erneuert.
                </div>
                <WatchActivateButton />
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
