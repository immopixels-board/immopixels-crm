'use client'
import dynamic from 'next/dynamic'

const BoardApp = dynamic(() => import('./BoardApp'), { 
  ssr: false,
  loading: () => (
    <div style={{ minHeight:'100vh', background:'#f4f2ef', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Arial' }}>
      <div style={{ textAlign:'center', color:'#6b6b6e' }}>
        <div style={{ fontSize:32, marginBottom:8 }}>⟳</div>
        <div style={{ fontWeight:700 }}>ImmoPixels CRM wird geladen...</div>
      </div>
    </div>
  )
})

export default function Page() {
  return <BoardApp />
}
