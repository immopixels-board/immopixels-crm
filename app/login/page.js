'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function login(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Hibás email vagy jelszó'); setLoading(false) }
    else window.location.href = '/'
  }

  return (
    <div style={{minHeight:'100vh',background:'#f4f2ef',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Arial,sans-serif'}}>
      <div style={{background:'#fff',borderRadius:16,padding:'40px 36px',width:380,boxShadow:'0 4px 32px rgba(0,0,0,.08)',border:'1px solid #ddd9d2'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'#1c1a16',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
            <svg width="36" height="36" viewBox="0 0 20 20" fill="none">
              <path d="M3 17V8.5l7-4 7 4V17" stroke="#b8892a" strokeWidth="1.6" strokeLinejoin="round"/>
              <path d="M7.5 17v-5h5v5" stroke="#b8892a" strokeWidth="1.4" strokeLinejoin="round"/>
              <circle cx="10" cy="6" r="1.4" fill="#b8892a"/>
            </svg>
          </div>
          <div style={{fontSize:22,fontWeight:700,color:'#1c1a16',marginBottom:4}}>ImmoPixels</div>
          <div style={{fontSize:13,color:'#8a8278'}}>CRM Bejelentkezés</div>
        </div>
        <form onSubmit={login}>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:'#8a8278',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:5}}>Email</label>
            <input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="c.dina@immopixels.de"
              style={{width:'100%',background:'#f4f2ef',border:'1.5px solid #ddd9d2',borderRadius:8,padding:'10px 13px',fontSize:14,color:'#1c1a16',outline:'none',fontFamily:'Arial'}}/>
          </div>
          <div style={{marginBottom:22}}>
            <label style={{fontSize:11,fontWeight:700,color:'#8a8278',textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:5}}>Jelszó</label>
            <input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"
              style={{width:'100%',background:'#f4f2ef',border:'1.5px solid #ddd9d2',borderRadius:8,padding:'10px 13px',fontSize:14,color:'#1c1a16',outline:'none',fontFamily:'Arial'}}/>
          </div>
          {error&&<div style={{background:'#b91c1c12',border:'1px solid #b91c1c30',borderRadius:7,padding:'9px 13px',fontSize:13,color:'#b91c1c',marginBottom:14}}>{error}</div>}
          <button type="submit" disabled={loading} style={{width:'100%',background:'#b8892a',color:'#fff',border:'none',borderRadius:9,padding:'12px',fontSize:14,fontWeight:700,cursor:'pointer',opacity:loading?'.7':'1'}}>
            {loading?'Bejelentkezés...':'Bejelentkezés →'}
          </button>
        </form>
        <div style={{textAlign:'center',marginTop:20,fontSize:12,color:'#8a8278'}}>ImmoPixels CRM · {new Date().getFullYear()}</div>
      </div>
    </div>
  )
}
