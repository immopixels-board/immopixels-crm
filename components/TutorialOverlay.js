'use client'
import { useState, useEffect, useRef } from 'react'

const STEPS = [
  {
    id: 'welcome',
    title: '👋 Willkommen im ImmoPixels CRM!',
    content: 'Dieses Tutorial zeigt dir in 6 Schritten, wie du das CRM optimal nutzt.',
    target: null,
    position: 'center',
  },
  {
    id: 'card-basics',
    title: '🗂 Karten — dein Arbeitsbereich',
    content: 'Jede Karte steht für einen Auftrag. Sie zeigt Kategorie, Datum, Kunde, Adresse und Status auf einen Blick. Das orange leuchtende Karte bedeutet: Fotos noch nicht hochgeladen!',
    target: '.board-card',
    position: 'right',
    highlight: true,
  },
  {
    id: 'new-card',
    title: '➕ Neue Karte erstellen',
    content: 'Klicke auf "+ Karte" am Ende einer Spalte. Wähle Kategorie (z.B. Foto), trage Kunde, Adresse und Datum ein. Beispiel: Kunde "Bartz", Adresse "Hauptstraße 5, Mannheim", Datum heute 10:00 Uhr.',
    target: null,
    position: 'center',
    demo: 'new-card',
  },
  {
    id: 'warning-badge',
    title: '🟠 Noch nicht gesendet',
    content: 'Karten mit Datum und Adresse, aber ohne Drive-Link, werden mit einem orangefarbenen Rahmen und dem Badge "Noch nicht gesendet" markiert. So siehst du sofort, welche Fotos noch fehlen!',
    target: null,
    position: 'center',
    demo: 'warning',
  },
  {
    id: 'drag-drop',
    title: '↔ Karten verschieben',
    content: 'Halte das ⠿ Grip-Symbol links vom Kartentitel gedrückt und ziehe die Karte in eine andere Spalte. So bewegst du Aufträge durch den Workflow: Shootings → Bei Bearbeiter → Fertig.',
    target: null,
    position: 'center',
    demo: 'drag',
  },
  {
    id: 'chat',
    title: '💬 Chat & Kommentare',
    content: 'Öffne eine Karte und scrolle nach unten. Im Kommentarbereich kannst du Nachrichten hinterlassen und Kollegen mit @Name taggen — sie erhalten eine Benachrichtigung.',
    target: null,
    position: 'center',
    demo: 'chat',
  },
  {
    id: 'claude-chat',
    title: '🤖 Claude AI — dein Assistent',
    content: 'Im Chat-Tab findest du Claude AI. Du kannst natürliche Befehle eingeben:\n• "Erstelle eine neue Karte für Bartz, Hauptstraße 5, morgen 10 Uhr"\n• "Zeige alle überfälligen Karten"\n• "Was steht heute an?"\nClaude versteht deinen Workflow und hilft dir schneller zu arbeiten.',
    target: null,
    position: 'center',
    demo: 'claude',
  },
  {
    id: 'done',
    title: '✅ Du bist startklar!',
    content: 'Du kennst jetzt die wichtigsten Funktionen. Bei Fragen steht dir Claude AI im Chat jederzeit zur Verfügung. Viel Erfolg!',
    target: null,
    position: 'center',
  },
]

const DEMOS = {
  'new-card': [
    { text: 'Klicke "+ Karte" am Ende einer Spalte', icon: '👆' },
    { text: 'Wähle Kategorie "Foto"', icon: '📷' },
    { text: 'Trage Kunde ein: "Bartz"', icon: '🏢' },
    { text: 'Adresse: "Hauptstraße 5, Mannheim"', icon: '📍' },
    { text: 'Datum & Uhrzeit wählen', icon: '📅' },
    { text: '+ Erstellen klicken', icon: '✅' },
  ],
  'warning': [
    { text: 'Karte hat Datum + Adresse', icon: '📋' },
    { text: 'Aber kein Drive/Dropbox Link', icon: '❌' },
    { text: '→ Orangefarbener Rahmen erscheint', icon: '🟠' },
    { text: '"Noch nicht gesendet" Badge', icon: '⚠️' },
    { text: 'Nach ZIP-Upload verschwindet der Hinweis', icon: '✅' },
  ],
  'drag': [
    { text: 'Grip-Symbol ⠿ links vom Titel halten', icon: '↕' },
    { text: 'Karte gedrückt halten', icon: '✊' },
    { text: 'In Zielspalte ziehen', icon: '➡️' },
    { text: 'Loslassen — Karte ist verschoben!', icon: '✅' },
  ],
  'chat': [
    { text: 'Karte öffnen', icon: '🗂' },
    { text: 'Nach unten scrollen zu Kommentare', icon: '⬇️' },
    { text: '"@Cristian schau mal bitte" eintippen', icon: '✍️' },
    { text: 'Cristian erhält eine Benachrichtigung', icon: '🔔' },
  ],
  'claude': [
    { text: 'Chat-Tab öffnen', icon: '💬' },
    { text: '"Erstelle Karte für Bartz morgen 10 Uhr" eingeben', icon: '⌨️' },
    { text: 'Claude erstellt die Karte automatisch', icon: '🤖' },
    { text: '"Was steht heute an?" — Claude listet auf', icon: '📋' },
  ],
}

export default function TutorialOverlay({ onClose }) {
  const [step, setStep] = useState(0)
  const [demoStep, setDemoStep] = useState(0)
  const [animating, setAnimating] = useState(false)
  const current = STEPS[step]
  const demo = current.demo ? DEMOS[current.demo] : null

  useEffect(() => {
    setDemoStep(0)
    if (demo) {
      const t = setInterval(() => {
        setDemoStep(p => {
          if (p >= demo.length - 1) { clearInterval(t); return p }
          return p + 1
        })
      }, 1200)
      return () => clearInterval(t)
    }
  }, [step])

  function go(dir) {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setStep(p => Math.max(0, Math.min(STEPS.length - 1, p + dir)))
      setAnimating(false)
    }, 200)
  }

  const isLast = step === STEPS.length - 1
  const progress = ((step) / (STEPS.length - 1)) * 100

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(28,26,22,.75)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}
      onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div style={{ background:'#fff', borderRadius:18, width:480, maxWidth:'94vw', boxShadow:'0 24px 80px rgba(0,0,0,.2)', overflow:'hidden', transform: animating?'scale(.97)':'scale(1)', transition:'transform .2s', fontFamily:'Arial,sans-serif' }}>

        {/* Progress bar */}
        <div style={{ height:3, background:'#f4f2ef' }}>
          <div style={{ height:'100%', background:'#b8892a', width:progress+'%', transition:'width .4s' }} />
        </div>

        {/* Header */}
        <div style={{ padding:'20px 24px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:6 }}>
            {STEPS.map((_,i) => (
              <div key={i} onClick={()=>setStep(i)} style={{ width: i===step?20:7, height:7, borderRadius:4, background: i<=step?'#b8892a':'#ddd9d2', transition:'all .3s', cursor:'pointer' }} />
            ))}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#8a8278', fontSize:13, fontWeight:600, padding:'4px 8px', borderRadius:6 }}>
            Überspringen ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding:'20px 24px' }}>
          <div style={{ fontSize:20, fontWeight:700, color:'#1c1a16', marginBottom:10, lineHeight:1.3 }}>{current.title}</div>
          <div style={{ fontSize:13, color:'#4a4540', lineHeight:1.7, whiteSpace:'pre-line', marginBottom: demo ? 16 : 0 }}>{current.content}</div>

          {/* Demo steps */}
          {demo && (
            <div style={{ background:'#f4f2ef', borderRadius:10, padding:14, marginTop:4 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#8a8278', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:10 }}>Schritt für Schritt</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {demo.map((d,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:8, background: i===demoStep?'#fff': i<demoStep?'#b8892a14':'transparent', border: i===demoStep?'1.5px solid #b8892a': i<demoStep?'1px solid #b8892a44':'1px solid transparent', transition:'all .3s' }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>{d.icon}</span>
                    <span style={{ fontSize:12, color: i===demoStep?'#b8892a': i<demoStep?'#8a8278':'#aaa', fontWeight: i===demoStep?700:400, transition:'all .3s' }}>{d.text}</span>
                    {i < demoStep && <span style={{ marginLeft:'auto', color:'#15803d', fontSize:14 }}>✓</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'0 24px 20px', display:'flex', gap:10, justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, color:'#aaa8a0' }}>{step + 1} / {STEPS.length}</span>
          <div style={{ display:'flex', gap:8 }}>
            {step > 0 && (
              <button onClick={()=>go(-1)} style={{ background:'#f4f2ef', color:'#4a4540', border:'none', borderRadius:8, padding:'9px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                ← Zurück
              </button>
            )}
            {isLast ? (
              <button onClick={onClose} style={{ background:'#b8892a', color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Los geht's! 🚀
              </button>
            ) : (
              <button onClick={()=>go(1)} style={{ background:'#b8892a', color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Weiter →
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
