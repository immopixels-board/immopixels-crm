'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const GOLD='#1f4d3f', CREAM='#faf7f0', DARK='#2a2a28'

function Confirm() {
  const sp = useSearchParams()
  const token = sp.get('token')
  const [state, setState] = useState('confirm') // confirm | loading | done | error
  const [msg, setMsg] = useState('')

  async function doConfirm() {
    setState('loading')
    try {
      const r = await fetch('/api/booking/confirm', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token}) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error||'Fehler')
      setState('done')
    } catch(e) { setMsg(e.message); setState('error') }
  }

  return (
    <div style={{minHeight:'100vh',background:CREAM,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Lato',Arial,sans-serif",padding:20}}>
      <div style={{background:'#fff',border:'1px solid #e6ddc9',borderRadius:16,padding:'40px 36px',maxWidth:440,textAlign:'center'}}>
        <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:600,color:DARK,marginBottom:20}}>Termin bestätigen</div>
        {state==='confirm' && <>
          <p style={{fontSize:14,color:'#666',marginBottom:24}}>Möchtest du diesen Termin bestätigen? Der Kunde erhält danach eine Bestätigungs-E-Mail.</p>
          <button onClick={doConfirm} style={{background:GOLD,color:'#fff',border:'none',borderRadius:10,padding:'13px 32px',fontSize:14,fontWeight:700,cursor:'pointer'}}>Jetzt bestätigen</button>
        </>}
        {state==='loading' && <p style={{color:'#888'}}>Wird bestätigt…</p>}
        {state==='done' && <>
          <div style={{width:60,height:60,borderRadius:'50%',background:GOLD,color:'#fff',fontSize:28,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>✓</div>
          <p style={{fontSize:15,color:DARK,fontWeight:700}}>Termin bestätigt!</p>
          <p style={{fontSize:13,color:'#888',marginTop:6}}>Der Kunde wurde per E-Mail informiert.</p>
        </>}
        {state==='error' && <p style={{color:'#b91c1c',fontSize:14}}>Fehler: {msg}</p>}
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<div/>}><Confirm/></Suspense>
}
