'use client'
export const dynamic = 'force-dynamic'
import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    async function handleRedirect() {
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) { window.location.href = '/'; return }
      }
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash') || params.get('token')
      const type = params.get('type')
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        if (!error) { window.location.href = '/'; return }
      }
    }
    handleRedirect()
  }, [])

  async function login(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Falsches E-Mail oder Passwort')
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f4f2ef', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Arial,sans-serif' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'40px 36px', width:380, boxShadow:'0 4px 32px rgba(0,0,0,.08)', border:'1px solid #ddd9d2' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ margin:'0 auto 14px', width:72, height:72, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <img src="/ip-logo.png" style={{ width:72, height:72, objectFit:'contain', borderRadius:'50%' }} alt="ImmoPixels" />
          </div>
          <div style={{ fontSize:22, fontWeight:700, color:'#1c1a16', marginBottom:4 }}>ImmoPixels</div>
          <div style={{ fontSize:13, color:'#8a8278' }}>CRM Anmeldung</div>
        </div>
        <form onSubmit={login}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#8a8278', textTransform:'uppercase', letterSpacing:'.5px', display:'block', marginBottom:5 }}>E-Mail</label>
            <input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="E-Mail-Adresse"
              style={{ width:'100%', background:'#f4f2ef', border:'1.5px solid #ddd9d2', borderRadius:8, padding:'10px 13px', fontSize:14, color:'#1c1a16', outline:'none', fontFamily:'Arial', boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor='#1f4d3f'} onBlur={e=>e.target.style.borderColor='#ddd9d2'} />
          </div>
          <div style={{ marginBottom:22 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#8a8278', textTransform:'uppercase', letterSpacing:'.5px', display:'block', marginBottom:5 }}>Passwort</label>
            <input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width:'100%', background:'#f4f2ef', border:'1.5px solid #ddd9d2', borderRadius:8, padding:'10px 13px', fontSize:14, color:'#1c1a16', outline:'none', fontFamily:'Arial', boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor='#1f4d3f'} onBlur={e=>e.target.style.borderColor='#ddd9d2'} />
          </div>
          {error && <div style={{ background:'#b91c1c12', border:'1px solid #b91c1c30', borderRadius:7, padding:'9px 13px', fontSize:13, color:'#b91c1c', marginBottom:14 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width:'100%', background:'#1f4d3f', color:'#fff', border:'none', borderRadius:9, padding:'12px', fontSize:14, fontWeight:700, cursor:'pointer', opacity:loading?.7:1 }}>
            {loading ? 'Bitte warten...' : 'Anmelden →'}
          </button>
        </form>
        <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:'#8a8278' }}>ImmoPixels CRM · {new Date().getFullYear()}</div>
      </div>
    </div>
  )
}
