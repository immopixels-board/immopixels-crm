'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const GOLD = '#6b6b6e', DARK = '#2a2a28', CREAM = '#faf6ef', GREEN = '#15803d', RED = '#b91c1c'

function fmtDuration(ms){
  if (ms < 0) ms = 0
  const s = Math.floor(ms/1000)
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
  return { h, m, sec, str: `${h}h ${String(m).padStart(2,'0')}m`, full: `${h}h ${String(m).padStart(2,'0')}m ${String(sec).padStart(2,'0')}s` }
}
function fmtTime(d){ return new Date(d).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}) }

export default function CheckinPage(){
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState(null)
  const [session, setSession] = useState(null) // aktív work_session (vagy null)
  const [todayList, setTodayList] = useState([])
  const [weekList, setWeekList] = useState([])
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginErr, setLoginErr] = useState('')
  const [showLog, setShowLog] = useState(false)
  const [allStaff, setAllStaff] = useState([])         // admin: minden mitarbeiter
  const [adminView, setAdminView] = useState(false)    // admin: csapat-áttekintés mód

  // 1s tick élő számláló
  useEffect(()=>{ const t = setInterval(()=>setNow(Date.now()), 1000); return ()=>clearInterval(t) }, [])

  async function loadAll(){
    setLoading(true)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) { setShowLogin(true); setLoading(false); return }
      const { data: staff } = await supabase.from('staff').select('*').eq('email', authSession.user.email).single()
      if (!staff) { setLoginErr('Kein Mitarbeiter mit dieser E-Mail.'); setShowLogin(true); setLoading(false); return }
      setMe(staff)

      // aktív session
      const { data: active } = await supabase.from('work_sessions').select('*').eq('staff_id', staff.id).is('check_out', null).order('check_in', {ascending:false}).limit(1).maybeSingle()
      setSession(active || null)

      // ma + heti
      const today = new Date(); today.setHours(0,0,0,0)
      const weekAgo = new Date(today); weekAgo.setDate(today.getDate()-7)
      const { data: all } = await supabase.from('work_sessions').select('*').eq('staff_id', staff.id).gte('check_in', weekAgo.toISOString()).order('check_in', {ascending:false})
      const isToday = (s)=>{ const d=new Date(s.check_in); d.setHours(0,0,0,0); return d.getTime()===today.getTime() }
      setTodayList((all||[]).filter(isToday))
      setWeekList((all||[]).filter(s=>!isToday(s)))

      // ADMIN: töltsük be a többieket is + azok aktív session-jeit
      if (staff.role_level === 'admin' || staff.role_level === 'subadmin') {
        const { data: others } = await supabase.from('staff').select('id,name,init,color,avatar_url').order('name')
        const { data: activeSessions } = await supabase.from('work_sessions').select('*').is('check_out', null)
        const { data: weekSessions } = await supabase.from('work_sessions').select('*').gte('check_in', weekAgo.toISOString())
        const enriched = (others||[]).map(o => ({
          ...o,
          activeSession: (activeSessions||[]).find(s => s.staff_id === o.id) || null,
          todaySessions: (weekSessions||[]).filter(s => s.staff_id === o.id && isToday(s)),
          weekSessions: (weekSessions||[]).filter(s => s.staff_id === o.id),
        }))
        setAllStaff(enriched)
      }
    } catch(e){ console.error(e) }
    setLoading(false)
  }
  useEffect(()=>{ loadAll() }, [])

  async function doLogin(e){
    e?.preventDefault?.()
    setLoginErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPass })
    if (error) { setLoginErr('Login fehlgeschlagen: ' + error.message); return }
    setShowLogin(false); setLoginEmail(''); setLoginPass(''); await loadAll()
  }
  async function doLogout(){
    await supabase.auth.signOut(); setMe(null); setSession(null); setShowLogin(true)
  }

  async function checkIn(){
    if (!me || busy) return
    setBusy(true)
    try {
      const { data, error } = await supabase.from('work_sessions').insert({ staff_id: me.id, check_in: new Date().toISOString(), break_minutes: 0 }).select('*').single()
      if (error) throw error
      setSession(data)
    } catch(e){ alert('Fehler beim Check-in: '+e.message) }
    setBusy(false)
  }

  async function checkOut(){
    if (!session || busy) return
    if (!confirm('Wirklich auschecken?')) return
    setBusy(true)
    try {
      // ha még megy a pause, zárjuk le előbb
      let breakMin = session.break_minutes || 0
      if (session.current_pause_start_at) {
        const extra = Math.floor((Date.now() - new Date(session.current_pause_start_at).getTime()) / 60000)
        breakMin += Math.max(0, extra)
      }
      const { error } = await supabase.from('work_sessions').update({
        check_out: new Date().toISOString(),
        break_minutes: breakMin,
        current_pause_start_at: null,
      }).eq('id', session.id)
      if (error) throw error
      setSession(null)
      await loadAll()
    } catch(e){ alert('Fehler beim Check-out: '+e.message) }
    setBusy(false)
  }

  async function togglePause(){
    if (!session || busy) return
    setBusy(true)
    try {
      if (session.current_pause_start_at) {
        // Pause beenden
        const extra = Math.floor((Date.now() - new Date(session.current_pause_start_at).getTime()) / 60000)
        const newBreak = (session.break_minutes||0) + Math.max(0, extra)
        const { data, error } = await supabase.from('work_sessions').update({
          break_minutes: newBreak, current_pause_start_at: null,
        }).eq('id', session.id).select('*').single()
        if (error) throw error
        setSession(data)
      } else {
        // Pause starten
        const { data, error } = await supabase.from('work_sessions').update({
          current_pause_start_at: new Date().toISOString(),
        }).eq('id', session.id).select('*').single()
        if (error) throw error
        setSession(data)
      }
    } catch(e){ alert('Fehler: '+e.message) }
    setBusy(false)
  }

  // számítások
  const isPaused = session && session.current_pause_start_at
  const sessionStart = session ? new Date(session.check_in).getTime() : 0
  const currentPauseMs = isPaused ? (now - new Date(session.current_pause_start_at).getTime()) : 0
  const totalElapsedMs = session ? (now - sessionStart) : 0
  const totalBreakMs = session ? ((session.break_minutes||0)*60000 + currentPauseMs) : 0
  const activeMs = session ? Math.max(0, totalElapsedMs - totalBreakMs) : 0
  const activeFmt = fmtDuration(activeMs)
  const pauseFmt = fmtDuration(currentPauseMs)

  const sumMs = (list)=>list.reduce((sum,s)=>{
    const start = new Date(s.check_in).getTime()
    const end = s.check_out ? new Date(s.check_out).getTime() : now
    return sum + Math.max(0, end-start - (s.break_minutes||0)*60000)
  }, 0)
  const todayMs = sumMs(todayList) + (session && todayList.every(s=>s.id!==session.id) ? activeMs : 0)
  const weekMs = sumMs(weekList)
  const todayFmt = fmtDuration(todayMs)
  const weekFmt = fmtDuration(weekMs)

  const nowStr = new Date(now).toLocaleString('de-DE',{weekday:'long',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})

  // STÍLUSOK
  const wrap = { minHeight:'100vh', background:'#ece7df', fontFamily:"'Open Sans','Lato',Arial,sans-serif", color:DARK, paddingTop:'env(safe-area-inset-top,0)' }
  const card = { maxWidth:400, margin:'0 auto', minHeight:'100vh', background:CREAM, display:'flex', flexDirection:'column' }

  if (loading) return <div style={wrap}><div style={{...card,alignItems:'center',justifyContent:'center'}}>Wird geladen…</div></div>

  if (showLogin || !me) return (
    <div style={wrap}><div style={card}>
      <div style={{padding:'60px 24px 40px',display:'flex',flexDirection:'column',height:'100vh',justifyContent:'center'}}>
        <div style={{fontFamily:"'Playfair Display',serif",color:GOLD,fontSize:30,fontWeight:600,textAlign:'center',marginBottom:8}}>ImmoPixels</div>
        <div style={{textAlign:'center',color:'#888',fontSize:13,marginBottom:36}}>Stempeluhr</div>
        <form onSubmit={doLogin}>
          <input type="email" autoComplete="username" placeholder="E-Mail" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} style={{width:'100%',padding:'14px 16px',border:'0.5px solid #e6ddc9',borderRadius:12,fontSize:16,marginBottom:12,outline:'none',background:'#fff',color:DARK,boxSizing:'border-box',fontFamily:'inherit'}} />
          <input type="password" autoComplete="current-password" placeholder="Passwort" value={loginPass} onChange={e=>setLoginPass(e.target.value)} style={{width:'100%',padding:'14px 16px',border:'0.5px solid #e6ddc9',borderRadius:12,fontSize:16,marginBottom:12,outline:'none',background:'#fff',color:DARK,boxSizing:'border-box',fontFamily:'inherit'}} />
          {loginErr && <div style={{color:RED,fontSize:12,marginBottom:8,textAlign:'center'}}>{loginErr}</div>}
          <button type="submit" style={{width:'100%',padding:14,border:'none',borderRadius:12,background:GOLD,color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',letterSpacing:'.04em'}}>EINLOGGEN</button>
        </form>
        <div style={{textAlign:'center',color:'#aaa',fontSize:11,marginTop:'auto',paddingTop:20}}>ImmoPixels Stempeluhr</div>
      </div>
    </div></div>
  )

  return (
    <div style={wrap}><div style={card}>
      {/* HEAD */}
      <div style={{padding:'18px 20px 14px',textAlign:'center',borderBottom:'0.5px solid #e6ddc9',background:'#fff'}}>
        <div style={{color:GOLD,fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:600,letterSpacing:'.04em'}}>ImmoPixels</div>
        <div style={{fontSize:12,color:'#888',marginTop:2}}>{nowStr}</div>
      </div>

      {/* AVATAR + NAME */}
      <div style={{padding:'20px 0 8px',textAlign:'center'}}>
        <div style={{width:90,height:90,borderRadius:'50%',margin:'0 auto 10px',display:'flex',alignItems:'center',justifyContent:'center',background:me.avatar_url?'transparent':`linear-gradient(135deg,#d4b375,${GOLD})`,color:'#fff',fontSize:30,fontWeight:700,boxShadow:'0 4px 14px rgba(184,137,42,.3)',overflow:'hidden'}}>
          {me.avatar_url ? <img src={me.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : (me.init || me.name?.[0])}
        </div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:2}}>{me.name}</div>
        <div style={{fontSize:12,color:'#888'}}>{me.role || 'Mitarbeiter'}</div>
      </div>

      {/* ÁLLAPOT-FÜGGŐ TARTALOM */}
      {!session ? (
        // IDLE
        <div style={{textAlign:'center',padding:'20px 20px 8px'}}>
          <div style={{fontSize:11,color:'#aaa',marginBottom:14,textTransform:'uppercase',letterSpacing:'.06em'}}>Bereit zum Einchecken</div>
          <button onClick={checkIn} disabled={busy} style={{width:200,height:200,borderRadius:'50%',background:`linear-gradient(135deg,#16a34a,${GREEN})`,color:'#fff',border:'none',fontSize:22,fontWeight:700,letterSpacing:'.04em',cursor:'pointer',boxShadow:`0 8px 24px rgba(22,163,74,.35),inset 0 -4px 12px rgba(0,0,0,.1)`,position:'relative'}}>
            CHECK-IN
          </button>
        </div>
      ) : (
        // ACTIVE / PAUSE
        <>
          <div style={{textAlign:'center',padding:'10px 20px 0'}}>
            {isPaused && (
              <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'#fffbeb',border:'1px solid #fde68a',color:GOLD,padding:'6px 12px',borderRadius:20,fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:14}}>
                ⏸ Pause läuft · {pauseFmt.str}
              </div>
            )}
            <div style={{fontSize:10,color:isPaused?'#aaa':GREEN,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
              {!isPaused && <span style={{width:8,height:8,borderRadius:'50%',background:GREEN,animation:'pulse 1.5s infinite'}} />}
              {isPaused ? 'AKTIVE ZEIT (PAUSIERT)' : 'AKTIV SEIT '+fmtTime(session.check_in)}
            </div>
            <div style={{fontFamily:'monospace',fontSize:42,fontWeight:900,color:isPaused?'#aaa':DARK,letterSpacing:'-1px',lineHeight:1}}>
              {activeFmt.h}h {String(activeFmt.m).padStart(2,'0')}m<span style={{fontSize:22,color:'#aaa',marginLeft:4}}>{String(activeFmt.sec).padStart(2,'0')}s</span>
            </div>
          </div>
          <div style={{display:'flex',gap:10,padding:'18px 20px 12px'}}>
            <button onClick={togglePause} disabled={busy} style={{flex:1,height:54,borderRadius:14,background: isPaused?`linear-gradient(135deg,#16a34a,${GREEN})`:'#fff',border: isPaused?'none':'1.5px solid #e0a82e',color:isPaused?'#fff':GOLD,fontWeight:700,fontSize:14,cursor:'pointer',boxShadow:isPaused?'0 4px 12px rgba(22,163,74,.25)':'none'}}>
              {isPaused ? '▶ Weiter' : '⏸ Pause'}
            </button>
            <button onClick={checkOut} disabled={busy} style={{flex:1,height:54,borderRadius:14,background:'#fef2f2',border:'1.5px solid #fecaca',color:RED,fontWeight:700,fontSize:14,cursor:'pointer'}}>
              ⏹ Check-out
            </button>
          </div>
        </>
      )}

      {/* SUMMARY */}
      <div style={{margin:'8px 20px 20px',padding:14,background:'#fff',border:'0.5px solid #e6ddc9',borderRadius:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
          <div>
            <div style={{fontSize:10,color:'#aaa',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700,marginBottom:4}}>Heute gesamt</div>
            <div style={{fontFamily:'monospace',fontSize:22,fontWeight:700}}>{todayFmt.str}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:9,color:'#aaa',textTransform:'uppercase',fontWeight:700}}>Letzte 7 Tage</div>
            <div style={{fontSize:13,color:'#888',fontWeight:700}}>{weekFmt.str}</div>
          </div>
        </div>
      </div>

      {/* LOG TOGGLE */}
      <div style={{padding:'0 20px 14px'}}>
        <button onClick={()=>setShowLog(v=>!v)} style={{width:'100%',padding:'10px 14px',background:'#fff',border:'0.5px solid #e6ddc9',borderRadius:10,fontSize:12,color:'#666',fontWeight:700,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>📋 Schicht-Protokoll</span>
          <span style={{color:GOLD}}>{showLog?'▲':'▼'}</span>
        </button>
        {showLog && (
          <div style={{marginTop:8,background:'#fff',border:'0.5px solid #e6ddc9',borderRadius:10,padding:'4px 0',maxHeight:300,overflowY:'auto'}}>
            {[...todayList,...weekList].length===0 ? (
              <div style={{padding:14,fontSize:12,color:'#aaa',textAlign:'center'}}>Noch keine Schichten</div>
            ) : [...todayList,...weekList].map(s=>{
              const start = new Date(s.check_in)
              const end = s.check_out ? new Date(s.check_out) : new Date()
              const ms = Math.max(0, end-start - (s.break_minutes||0)*60000)
              const f = fmtDuration(ms)
              return (
                <div key={s.id} style={{padding:'8px 14px',borderBottom:'0.5px solid #f0ece4',fontSize:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,color:DARK}}>{start.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})}</div>
                    <div style={{color:'#888',fontSize:11}}>{fmtTime(start)} – {s.check_out?fmtTime(end):'läuft'}{s.break_minutes?' · '+s.break_minutes+'m Pause':''}</div>
                  </div>
                  <div style={{fontFamily:'monospace',fontWeight:700,color:s.check_out?DARK:GREEN}}>{f.str}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ADMIN: Team Überblick */}
      {(me?.role_level === 'admin' || me?.role_level === 'subadmin') && allStaff.length > 0 && (
        <div style={{padding:'0 20px 14px'}}>
          <button onClick={()=>setAdminView(v=>!v)} style={{width:'100%',padding:'10px 14px',background:'#fff',border:'0.5px solid #e6ddc9',borderRadius:10,fontSize:12,color:'#666',fontWeight:700,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>👥 Team-Überblick</span>
            <span style={{color:GOLD}}>{adminView?'▲':'▼'}</span>
          </button>
          {adminView && (
            <div style={{marginTop:8,background:'#fff',border:'0.5px solid #e6ddc9',borderRadius:10,padding:'4px 0',maxHeight:380,overflowY:'auto'}}>
              {allStaff.map(s => {
                const isActive = s.activeSession && !s.activeSession.current_pause_start_at
                const isPaused = s.activeSession && s.activeSession.current_pause_start_at
                let todayMs2 = 0
                s.todaySessions.forEach(sess => {
                  const start = new Date(sess.check_in).getTime()
                  const end = sess.check_out ? new Date(sess.check_out).getTime() : now
                  todayMs2 += Math.max(0, end - start - (sess.break_minutes||0)*60000)
                })
                if (isActive) {
                  // ha aktív session-jét nem zárta még le, add hozzá a folyamatban lévő időt is
                  // de mivel a todaySessions tartalmazza az aktív session-jét is, már benne van
                }
                let weekMs2 = 0
                s.weekSessions.forEach(sess => {
                  const start = new Date(sess.check_in).getTime()
                  const end = sess.check_out ? new Date(sess.check_out).getTime() : now
                  weekMs2 += Math.max(0, end - start - (sess.break_minutes||0)*60000)
                })
                const tf = fmtDuration(todayMs2), wf = fmtDuration(weekMs2)
                const statusColor = isActive ? GREEN : (isPaused ? GOLD : '#aaa')
                const statusLabel = isActive ? 'Aktiv' : (isPaused ? 'Pause' : 'Offline')
                return (
                  <div key={s.id} style={{padding:'10px 14px',borderBottom:'0.5px solid #f0ece4',display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:s.avatar_url?'transparent':`linear-gradient(135deg,${s.color||'#ccc'},${s.color||'#888'})`,color:'#fff',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,position:'relative'}}>
                      {s.avatar_url ? <img src={s.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : s.init}
                      <div style={{position:'absolute',bottom:-1,right:-1,width:10,height:10,borderRadius:'50%',background:statusColor,border:'2px solid #fff'}} />
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:DARK,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
                      <div style={{fontSize:10,color:statusColor,fontWeight:700}}>{statusLabel}{s.activeSession && ' · seit '+fmtTime(s.activeSession.check_in)}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:12,fontWeight:700,color:DARK,fontFamily:'monospace'}}>{tf.str}</div>
                      <div style={{fontSize:9,color:'#aaa'}}>Heute · {wf.str} Woche</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* LOGOUT */}
      <div style={{marginTop:'auto',padding:'14px 20px 24px',textAlign:'center'}}>
        <button onClick={doLogout} style={{background:'none',border:'none',color:'#aaa',fontSize:11,cursor:'pointer',textDecoration:'underline'}}>Abmelden</button>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div></div>
  )
}
