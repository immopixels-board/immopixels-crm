'use client'
import { useState, useEffect } from 'react'

export default function BirthdayOverlay({ person, staff, me, onClose }) {
  const [opened, setOpened] = useState(false)
  const [giftOpened, setGiftOpened] = useState(false)

  const isDani = person?.init === 'DB'
  const colleagues = staff.filter(s => s.id !== person?.id && s.id !== me?.id)

  useEffect(() => {
    // auto-apply Dani's bg
    if (isDani && giftOpened) {
      document.body.style.backgroundImage = 'url(/dani-bg.png)'
      document.body.style.backgroundSize = 'cover'
      document.body.style.backgroundAttachment = 'fixed'
      document.body.style.backgroundRepeat = 'no-repeat'
    }
  }, [giftOpened])

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(28,26,22,.7)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:'var(--bg2)', borderRadius:20, padding:36, maxWidth:380, width:'90vw', textAlign:'center', position:'relative', overflow:'hidden',
          animation:'bdPop .6s cubic-bezier(.34,1.56,.64,1) forwards' }}>

        <style>{`
          @keyframes bdPop{0%{opacity:0;transform:scale(.8) rotate(-3deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
          @keyframes bdFall{0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(500px) rotate(720deg);opacity:0}}
          @keyframes bdFlame{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.2)}}
          @keyframes bdPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
          @keyframes bdFadeUp{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:none}}
          .bd-confetti{position:absolute;width:7px;height:7px;border-radius:2px;animation:bdFall linear infinite;pointer-events:none}
          .bd-flame{animation:bdFlame .7s ease-in-out infinite;transform-origin:50% 100%}
          .bd-pulse{animation:bdPulse 2s ease-in-out infinite}
          .bd-fadeup{animation:bdFadeUp .6s ease forwards}
        `}</style>

        {/* Confetti */}
        {['#b8892a','#e24b4a','#1d9e75','#1d5ec7','#7c3aed','#f97316'].map((c,i)=>(
          Array.from({length:4}).map((_,j)=>(
            <div key={c+j} className="bd-confetti" style={{
              left:Math.floor(Math.random()*100)+'%', top:-8,
              background:c, borderRadius:j%2?'50%':'2px',
              animationDuration:(2.2+Math.random()*2)+'s',
              animationDelay:(Math.random()*2.5)+'s'
            }} />
          ))
        ))}

        {/* Cake SVG */}
        <svg width="80" height="88" viewBox="0 0 80 88" style={{display:'block',margin:'0 auto 16px'}}>
          <rect x="8" y="46" width="64" height="38" rx="7" fill={person?.color||'#b8892a'} opacity=".18" stroke={person?.color||'#b8892a'} strokeWidth="1.2"/>
          <rect x="16" y="46" width="20" height="38" rx="3" fill={person?.color||'#b8892a'} opacity=".22"/>
          <rect x="44" y="46" width="20" height="38" rx="3" fill={person?.color||'#b8892a'} opacity=".22"/>
          <rect x="8" y="36" width="64" height="14" rx="5" fill={person?.color||'#b8892a'} opacity=".28" stroke={person?.color||'#b8892a'} strokeWidth="1"/>
          <line x1="40" y1="36" x2="40" y2="26" stroke={person?.color||'#b8892a'} strokeWidth="2" strokeLinecap="round"/>
          <g className="bd-flame" style={{transformOrigin:'40px 26px'}}>
            <ellipse cx="40" cy="20" rx="3.5" ry="7" fill="#f97316" opacity=".95"/>
            <ellipse cx="40" cy="18" rx="1.8" ry="4" fill="#fde68a"/>
          </g>
          {[20,30,50,60].map((x,i)=>(
            <circle key={i} cx={x} cy="42" r="2.2" fill={['#b8892a','#e24b4a','#1d9e75','#1d5ec7'][i]} opacity=".5"/>
          ))}
        </svg>

        <div className="bd-pulse" style={{ fontSize:22, fontWeight:700, color:person?.color||'var(--t1)', marginBottom:6 }}>
          Alles Gute, {person?.name?.split(' ')[0]}! 🎂
        </div>
        <div style={{ fontSize:12, color:'var(--t2)', marginBottom:18, lineHeight:1.5 }}>
          Das ganze ImmoPixels-Team wünscht dir einen wunderschönen Geburtstag!
        </div>

        {/* Colleague badges */}
        <div style={{ display:'flex', justifyContent:'center', gap:7, flexWrap:'wrap', marginBottom:20 }}>
          {colleagues.map(s=>(
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:5, background:(s.color||'#888')+'14', border:'0.5px solid '+(s.color||'#888')+'44', borderRadius:20, padding:'4px 10px' }}>
              <div style={{ width:18, height:18, borderRadius:'50%', background:(s.color||'#888')+'22', color:s.color||'#888', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, border:'1.5px solid '+(s.color||'#888') }}>
                {s.init}
              </div>
              <span style={{ fontSize:10, fontWeight:600, color:'var(--t2)' }}>{s.name?.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        {/* Gift */}
        <div style={{ borderTop:'0.5px solid var(--border)', paddingTop:16 }}>
          {!giftOpened ? (
            <>
              <div style={{ fontSize:11, color:'var(--t3)', marginBottom:8 }}>
                {isDani ? 'Und natürlich dein Geburtstagsgeschenk 🎁' : 'Ein kleines Geburtstagsgeschenk wartet!'}
              </div>
              <button onClick={()=>setGiftOpened(true)}
                style={{ background:person?.color||'#b8892a', color:'#fff', border:'none', borderRadius:8, padding:'8px 20px', fontSize:13, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
                <i className="ti ti-gift" style={{fontSize:14}} /> Geschenk öffnen
              </button>
            </>
          ) : (
            <div className="bd-fadeup">
              {isDani ? (
                <>
                  <div style={{ fontSize:20, fontWeight:700, color:'#ec4899', marginBottom:4 }}>Surprise! 🎀</div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>Dein Hintergrund wurde aktiviert...</div>
                  <div style={{ fontSize:10, color:'var(--t3)', marginTop:4 }}>Du weißt schon welche 😉</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:20, fontWeight:700, color:person?.color||'#b8892a', marginBottom:4 }}>Herzlichen Glückwunsch!</div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>Wir freuen uns, mit dir zu arbeiten!</div>
                </>
              )}
            </div>
          )}
        </div>

        <button onClick={onClose} style={{ marginTop:16, background:'none', border:'none', cursor:'pointer', fontSize:11, color:'var(--t3)' }}>
          Schließen
        </button>
      </div>
    </div>
  )
}
