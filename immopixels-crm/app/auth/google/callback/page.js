'use client'
import { useEffect } from 'react'

export default function GoogleCallback() {
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const token = params.get('access_token')
    if (token && window.opener) {
      window.opener.postMessage({ type: 'gcal_token', token }, window.location.origin)
      window.close()
    } else {
      window.location.href = '/'
    }
  }, [])
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily:'Arial', color:'#4a4640' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:8 }}>✓</div>
        Google Calendar verbunden. Fenster schließt sich...
      </div>
    </div>
  )
}
