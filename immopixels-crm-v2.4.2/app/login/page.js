'use client'
export const dynamic = 'force-dynamic'
import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('login') // 'login' | 'otp'
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)

  // Magic link + OTP token auto-login (Supabase redirect)
  React.useEffect(() => {
    async function handleRedirect() {
      // Hash-alapú token (implicit flow)
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) { window.location.href = '/'; return }
      }
      // URL param alapú token (PKCE flow)
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
      // Login sikeres — OTP küldése
      await sendOTP()
    }
  }

  async function sendOTP() {
    setLoading(true)
    setError('')
    // Kijelentkeztetjük (session törléssel) — OTP megerősítés után lép be ténylegesen
    await supabase.auth.signOut()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: undefined,
      }
    })
    if (error) {
      setError('OTP küldési hiba: ' + error.message)
      setLoading(false)
    } else {
      setStep('otp')
      setLoading(false)
    }
  }

  async function verifyOTP(e) {
    e.preventDefault()
    setOtpLoading(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    })
    if (error) {
      setError('Ungültiger oder abgelaufener Code. Bitte nochmal versuchen.')
      setOtpLoading(false)
    } else {
      // Login értesítő küldése
      await sendLoginNotification()
      window.location.href = '/'
    }
  }

  async function sendLoginNotification() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Keressük meg a staff rekordot
      const { data: staff } = await supabase.from('staff').select('name,email').eq('email', user.email).single()
      if (!staff?.email) return
      // Login log mentése
      await supabase.from('debug_log').insert({
        user_id: user.id,
        action: 'LOGIN|' + (navigator.userAgent || 'unknown') + '|' + new Date().toISOString()
      })
      // Supabase nem tud emailt küldeni közvetlenül JS-ből —
      // de a next login-nél megmutatjuk az utolsó belépést
    } catch(e) { /* silent */ }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f4f2ef', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Arial,sans-serif' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'40px 36px', width:380, boxShadow:'0 4px 32px rgba(0,0,0,.08)', border:'1px solid #ddd9d2' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ margin:'0 auto 14px', width:72, height:72, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <img src="/ip-logo.png" style={{ width:72, height:72, objectFit:'contain', borderRadius:'50%' }} alt="ImmoPixels" />
          </div>
          <div style={{ fontSize:22, fontWeight:700, color:'#1c1a16', marginBottom:4 }}>ImmoPixels</div>
          <div style={{ fontSize:13, color:'#8a8278' }}>
            {step === 'login' ? 'CRM Anmeldung' : '2-Faktor-Verifizierung'}
          </div>
        </div>

        {step === 'login' ? (
          <form onSubmit={login}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#8a8278', textTransform:'uppercase', letterSpacing:'.5px', display:'block', marginBottom:5 }}>E-Mail</label>
              <input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="E-Mail-Adresse"
                style={{ width:'100%', background:'#f4f2ef', border:'1.5px solid #ddd9d2', borderRadius:8, padding:'10px 13px', fontSize:14, color:'#1c1a16', outline:'none', fontFamily:'Arial', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='#b8892a'} onBlur={e=>e.target.style.borderColor='#ddd9d2'} />
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#8a8278', textTransform:'uppercase', letterSpacing:'.5px', display:'block', marginBottom:5 }}>Passwort</label>
              <input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width:'100%', background:'#f4f2ef', border:'1.5px solid #ddd9d2', borderRadius:8, padding:'10px 13px', fontSize:14, color:'#1c1a16', outline:'none', fontFamily:'Arial', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='#b8892a'} onBlur={e=>e.target.style.borderColor='#ddd9d2'} />
            </div>
            {error && <div style={{ background:'#b91c1c12', border:'1px solid #b91c1c30', borderRadius:7, padding:'9px 13px', fontSize:13, color:'#b91c1c', marginBottom:14 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width:'100%', background:'#b8892a', color:'#fff', border:'none', borderRadius:9, padding:'12px', fontSize:14, fontWeight:700, cursor:'pointer', opacity:loading?.7:1 }}>
              {loading ? 'Bitte warten...' : 'Anmelden →'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOTP}>
            <div style={{ background:'#f0f9f0', border:'1px solid #86efac', borderRadius:8, padding:'10px 13px', fontSize:13, color:'#166534', marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:18 }}>📧</span>
              <span>Ein 6-stelliger Code wurde an <b>{email}</b> gesendet.</span>
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#8a8278', textTransform:'uppercase', letterSpacing:'.5px', display:'block', marginBottom:5 }}>Bestätigungscode</label>
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required
                value={otp} onChange={e=>setOtp(e.target.value.replace(/[^0-9]/g,''))}
                placeholder="000000"
                style={{ width:'100%', background:'#f4f2ef', border:'1.5px solid #ddd9d2', borderRadius:8, padding:'14px 13px', fontSize:22, fontWeight:700, color:'#1c1a16', outline:'none', fontFamily:'Arial', letterSpacing:8, textAlign:'center', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='#b8892a'} onBlur={e=>e.target.style.borderColor='#ddd9d2'} autoFocus />
              <div style={{ fontSize:11, color:'#8a8278', marginTop:5, textAlign:'center' }}>Code ist 10 Minuten gültig</div>
            </div>
            {error && <div style={{ background:'#b91c1c12', border:'1px solid #b91c1c30', borderRadius:7, padding:'9px 13px', fontSize:13, color:'#b91c1c', marginBottom:14 }}>{error}</div>}
            <button type="submit" disabled={otpLoading} style={{ width:'100%', background:'#b8892a', color:'#fff', border:'none', borderRadius:9, padding:'12px', fontSize:14, fontWeight:700, cursor:'pointer', opacity:otpLoading?.7:1 }}>
              {otpLoading ? 'Wird überprüft...' : 'Bestätigen →'}
            </button>
            <button type="button" onClick={()=>{setStep('login');setOtp('');setError('')}} style={{ width:'100%', background:'none', border:'none', color:'#8a8278', fontSize:13, cursor:'pointer', marginTop:10, padding:8 }}>
              ← Zurück zur Anmeldung
            </button>
          </form>
        )}
        <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:'#8a8278' }}>ImmoPixels CRM · {new Date().getFullYear()}</div>
      </div>
    </div>
  )
}
