'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const GOLD='#b8892a', CREAM='#faf7f0', DARK='#2a2a28'
const STATUS_LABEL = { pending:'In Prüfung', confirmed:'Bestätigt', cancelled:'Storniert' }
const STATUS_COLOR = { pending:'#b8892a', confirmed:'#15803d', cancelled:'#b91c1c' }

export default function ManagePage() {
  const params = useParams()
  const token = params.token
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/booking/manage?token=${token}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error||'not found')
      setBooking(d)
    } catch(e) { setError(e.message) }
    setLoading(false)
  }
  useEffect(() => { if(token) load() }, [token])

  async function doCancel() {
    if (!confirm('Möchten Sie diesen Termin wirklich stornieren?')) return
    setCancelling(true)
    try {
      const r = await fetch('/api/booking/cancel', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token}) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error||'Fehler')
      await load()
    } catch(e) { alert(e.message) }
    setCancelling(false)
  }

  const fmtDate = d => d ? new Date(d+'T12:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) : ''

  return (
    <div style={{minHeight:'100vh',background:CREAM,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Lato',Arial,sans-serif",padding:20}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Playfair+Display:wght@600&display=swap');`}</style>
      <div style={{background:'#fff',border:'1px solid #e6ddc9',borderRadius:16,padding:'36px 32px',maxWidth:480,width:'100%'}}>
        <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,fontWeight:600,color:DARK,marginBottom:20,textAlign:'center'}}>Ihr Termin</div>
        {loading ? <p style={{color:'#888',textAlign:'center'}}>Wird geladen…</p>
        : error ? <p style={{color:'#b91c1c',textAlign:'center'}}>Termin nicht gefunden.</p>
        : booking && <>
          <div style={{display:'inline-block',padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:700,color:'#fff',background:STATUS_COLOR[booking.booking_status],marginBottom:16}}>
            {STATUS_LABEL[booking.booking_status]||booking.booking_status}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'10px 16px',fontSize:14,color:'#444'}}>
            <span style={{color:'#888'}}>Leistung:</span><span style={{fontWeight:700,color:DARK}}>{booking.serviceName}</span>
            <span style={{color:'#888'}}>Datum:</span><span style={{fontWeight:700,color:GOLD}}>{fmtDate(booking.card_date)}</span>
            <span style={{color:'#888'}}>Uhrzeit:</span><span style={{fontWeight:700}}>{String(booking.card_time).slice(0,5)} Uhr</span>
            <span style={{color:'#888'}}>Adresse:</span><span>{booking.booking_address}</span>
            <span style={{color:'#888'}}>Name:</span><span>{booking.client_name}</span>
          </div>
          {booking.booking_status!=='cancelled' && (
            <button onClick={doCancel} disabled={cancelling}
              style={{marginTop:24,width:'100%',background:'#fff',color:'#b91c1c',border:'1px solid #e3b7b7',borderRadius:10,padding:'12px',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              {cancelling?'Wird storniert…':'Termin stornieren'}
            </button>
          )}
          <p style={{fontSize:12,color:'#aaa',textAlign:'center',marginTop:16}}>Für Änderungen kontaktieren Sie uns unter +49 176 41576629</p>
        </>}
      </div>
    </div>
  )
}
