'use client'
import { useState } from 'react'

const G = '#1f4d3f'

function Card({ accent, badge, title, sub, warn }) {
  return (
    <div style={{ width:150, background:'#fff', border:'1.5px solid '+(warn?'#e0973a':'#e6ddc9'), borderRadius:9, padding:'9px 10px', boxShadow: warn?'0 0 0 3px rgba(224,151,58,.15)':'0 2px 8px rgba(120,90,30,.08)', textAlign:'left' }}>
      <div style={{ display:'flex', gap:5, alignItems:'center', marginBottom:6 }}>
        <span style={{ fontSize:9, fontWeight:700, color:'#fff', background:accent||G, borderRadius:4, padding:'2px 6px' }}>{title}</span>
      </div>
      <div style={{ fontSize:10, fontWeight:600, color:'#2c2719', lineHeight:1.3 }}>{sub}</div>
      {badge && <div style={{ marginTop:6, fontSize:8.5, fontWeight:700, color:'#1f4d3f', background:'#fbe9d8', borderRadius:4, padding:'2px 6px', display:'inline-block' }}>{badge}</div>}
    </div>
  )
}

const ILLUS = {
  welcome: (
    <div style={{ display:'flex', justifyContent:'center', padding:'8px 0' }}>
      <div style={{ width:64, height:64, borderRadius:'50%', background:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>👋</div>
    </div>
  ),
  board: (
    <div style={{ display:'flex', gap:8, justifyContent:'center', padding:'4px 0' }}>
      {['Shootings','Bearbeiter','Fertig'].map((t,i)=>(
        <div key={i} style={{ flex:1, background:'#faf8f4', border:'0.5px solid #e6ddc9', borderRadius:8, padding:'7px 5px' }}>
          <div style={{ fontSize:8.5, fontWeight:700, color:'#8a8278', marginBottom:5, textAlign:'center' }}>{t}</div>
          <div style={{ height:22, background:'#fff', border:'0.5px solid #e6ddc9', borderRadius:5, marginBottom:4 }} />
          {i===0 && <div style={{ height:22, background:'#fff', border:'1px solid #e0973a', borderRadius:5 }} />}
        </div>
      ))}
    </div>
  ),
  status: (
    <div style={{ display:'flex', gap:10, justifyContent:'center', padding:'4px 0' }}>
      <Card title="FOTO" sub="Muster · Mannheim" warn badge="⚠ Noch nicht gesendet" />
      <Card title="FOTO" accent="#15803d" sub="Beispiel · Speyer" badge="✓ Geliefert" />
    </div>
  ),
  move: (
    <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center', padding:'4px 0' }}>
      <Card title="FOTO" sub="Muster" />
      <div style={{ fontSize:22, color:G }}>→</div>
      <div style={{ width:120, height:60, border:'1.5px dashed '+G, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', color:G, fontSize:11, fontWeight:600 }}>Fertig</div>
    </div>
  ),
  kunden: (
    <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'center', padding:'4px 0' }}>
      {[['Muster Immobilien','Muster'],['Beispiel Wohnbau','Beispiel']].map(([n,k],i)=>(
        <div key={i} style={{ width:230, display:'flex', alignItems:'center', gap:9, background:'#faf8f4', border:'0.5px solid #e6ddc9', borderRadius:8, padding:'7px 10px' }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:'#e9dcc0', color:'#2e6b56', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700 }}>{k.slice(0,2)}</div>
          <div style={{ flex:1, fontSize:11, fontWeight:600, color:'#2c2719' }}>{n}</div>
          <span style={{ fontSize:9, fontWeight:700, color:'#2e6b56', background:'#f0e6d2', borderRadius:4, padding:'2px 7px' }}>{k}</span>
        </div>
      ))}
    </div>
  ),
  kalender: (
    <div style={{ display:'flex', justifyContent:'center', padding:'4px 0' }}>
      <div style={{ width:210, background:'#fff', border:'0.5px solid #e6ddc9', borderRadius:10, padding:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontSize:10, fontWeight:700, color:'#2c2719' }}>Juni 2026</span>
          <span style={{ fontSize:9, fontWeight:700, color:'#15803d', background:'#e8f3e9', borderRadius:10, padding:'2px 8px' }}>● Google verbunden</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
          {Array.from({length:21}).map((_,i)=>(
            <div key={i} style={{ height:15, borderRadius:3, background: [3,9,14].includes(i)?G:'#f4f0e8' }} />
          ))}
        </div>
      </div>
    </div>
  ),
  import: (
    <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center', padding:'4px 0' }}>
      <div style={{ width:110, background:'#fff', border:'0.5px solid #e6ddc9', borderRadius:8, padding:'8px', fontSize:8.5, color:'#4a4540', lineHeight:1.5 }}>
        <div style={{ fontWeight:700, marginBottom:3 }}>📅 GCal-Termin</div>
        Immobilienbüro: Muster<br/>Foto + Drohne<br/>Q7, Mannheim
      </div>
      <div style={{ fontSize:20, color:G }}>→</div>
      <Card title="FOTO+DROHNE" accent="#a16207" sub="Muster · Mannheim" />
    </div>
  ),
  fahrtenbuch: (
    <div style={{ display:'flex', justifyContent:'center', padding:'4px 0' }}>
      <div style={{ width:250, background:'#fff', border:'0.5px solid #e6ddc9', borderRadius:9, overflow:'hidden' }}>
        <div style={{ display:'flex', fontSize:8.5, fontWeight:700, color:'#8a8278', background:'#faf8f4', padding:'6px 8px', gap:6 }}>
          <span style={{ flex:2 }}>Datum</span><span style={{ flex:3 }}>Strecke</span><span style={{ flex:1 }}>km</span>
        </div>
        {[['13.06','Büro → Mannheim','24'],['13.06','Mannheim → Speyer','31']].map((r,i)=>(
          <div key={i} style={{ display:'flex', fontSize:9, color:'#2c2719', padding:'6px 8px', gap:6, borderTop:'0.5px solid #f0e6d2' }}>
            <span style={{ flex:2 }}>{r[0]}</span><span style={{ flex:3 }}>{r[1]}</span><span style={{ flex:1, fontWeight:700 }}>{r[2]}</span>
          </div>
        ))}
      </div>
    </div>
  ),
  rechnung: (
    <div style={{ display:'flex', justifyContent:'center', padding:'4px 0' }}>
      <div style={{ width:200, background:'#fff', border:'0.5px solid #e6ddc9', borderRadius:9, padding:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'#2c2719' }}>Rechnung</span>
          <span style={{ fontSize:9, color:'#8a8278' }}>Nr. 26-0001</span>
        </div>
        {[['Foto-Shooting','1 St.','120 €'],['Fahrtkosten','24 km','12 €']].map((r,i)=>(
          <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#4a4540', padding:'4px 0', borderTop:'0.5px solid #f0e6d2' }}>
            <span>{r[0]}</span><span style={{ color:'#8a8278' }}>{r[1]}</span><span style={{ fontWeight:700 }}>{r[2]}</span>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, fontWeight:700, color:G, borderTop:'1px solid '+G, marginTop:4, paddingTop:5 }}>
          <span>Summe</span><span>132 €</span>
        </div>
      </div>
    </div>
  ),
  fahrtkosten: (
    <div style={{ display:'flex', justifyContent:'center', padding:'4px 0' }}>
      <div style={{ width:260, background:'#fff', border:'0.5px solid #e6ddc9', borderRadius:9, overflow:'hidden' }}>
        <div style={{ display:'flex', fontSize:8.5, fontWeight:700, color:'#8a8278', background:'#faf8f4', padding:'6px 8px', gap:6 }}>
          <span style={{ flex:3 }}>Position</span><span style={{ flex:1 }}>Menge</span><span style={{ flex:1 }}>Einheit</span><span style={{ flex:1 }}>Preis</span>
        </div>
        <div style={{ display:'flex', fontSize:9, color:'#2c2719', padding:'7px 8px', gap:6 }}>
          <span style={{ flex:3, fontWeight:600 }}>Fahrtkosten</span><span style={{ flex:1 }}>24</span><span style={{ flex:1, color:G, fontWeight:700 }}>km</span><span style={{ flex:1 }}>0,50 €</span>
        </div>
      </div>
    </div>
  ),
  mitarbeiter: (
    <div style={{ display:'flex', gap:8, justifyContent:'center', padding:'4px 0' }}>
      {[['Joe Doe','Admin','#1f4d3f'],['Jane Doe','Video','#6d28d9']].map(([n,r,c],i)=>(
        <div key={i} style={{ width:100, background:'#faf8f4', border:'0.5px solid #e6ddc9', borderRadius:8, padding:'9px 7px', textAlign:'center' }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:c, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, margin:'0 auto 6px' }}>{n.split(' ').map(x=>x[0]).join('')}</div>
          <div style={{ fontSize:10, fontWeight:600, color:'#2c2719' }}>{n}</div>
          <div style={{ fontSize:8.5, color:'#8a8278' }}>{r}</div>
          <div style={{ fontSize:8, color:'#15803d', marginTop:4 }}>● 7,5 Std heute</div>
        </div>
      ))}
    </div>
  ),
  widgets: (
    <div style={{ display:'flex', gap:7, justifyContent:'center', padding:'4px 0', flexWrap:'wrap' }}>
      {[['✓ To-Do','#1f4d3f'],['☀ Wetter','#7BBFCB'],['📅 Termin','#9CAF88'],['📊 Statistik','#FFBE98']].map(([t,c],i)=>(
        <div key={i} style={{ width:95, background:'#fff', border:'0.5px solid #e6ddc9', borderRadius:8, overflow:'hidden' }}>
          <div style={{ fontSize:9, fontWeight:700, color:'#fff', background:c, padding:'5px 8px' }}>{t}</div>
          <div style={{ height:18 }} />
        </div>
      ))}
    </div>
  ),
  claude: (
    <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'center', padding:'4px 0' }}>
      <div style={{ alignSelf:'flex-start', maxWidth:'80%', background:'#f1ede4', borderRadius:'12px 12px 12px 3px', padding:'7px 11px', fontSize:10, color:'#4a4540' }}>„Erstelle Karte für Muster, morgen 10 Uhr"</div>
      <div style={{ alignSelf:'flex-end', maxWidth:'80%', background:'#1a1a1a', borderRadius:'12px 12px 3px 12px', padding:'7px 11px', fontSize:10, color:'#fff' }}>✓ Karte erstellt für Muster, 14.06. 10:00</div>
    </div>
  ),
  done: (
    <div style={{ display:'flex', justifyContent:'center', padding:'8px 0' }}>
      <div style={{ width:64, height:64, borderRadius:'50%', background:'#15803d', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>✅</div>
    </div>
  ),
}

const STEPS = [
  { illus:'welcome', title:'👋 Willkommen in deinem CRM!', content:'Schön, dass du da bist — sieh dich um, als wäre es schon deins. Diese kurze Tour zeigt dir alle wichtigen Funktionen: Karten, Kalender, Kunden, Fahrtenbuch, Rechnungen, Mitarbeiter und mehr. Du kannst sie jederzeit oben rechts über das ?-Symbol erneut öffnen.' },
  { illus:'board', title:'🗂 Das Board — dein Arbeitsbereich', content:'Jede Karte ist ein Auftrag. Die Spalten bilden deinen Workflow ab: Shootings → Beim Bearbeiter → In Bearbeitung → Fertig. Eine Karte zeigt Kategorie, Datum, Kunde, Adresse und Status auf einen Blick.' },
  { illus:'status', title:'🟠 Status-Markierungen', content:'Orangefarbener Rahmen + „Noch nicht gesendet" = die Fotos sind noch nicht ausgeliefert. Sobald ein Drive-/Dropbox-Link auf der Karte ist, gilt der Auftrag als geliefert und der Hinweis verschwindet. Überfällige Termine werden rot markiert.' },
  { illus:'move', title:'↔ Karten verschieben & sortieren', content:'Halte das ⠿ Grip-Symbol links vom Titel gedrückt und ziehe die Karte in eine andere Spalte. Über das ↕-Symbol im Spaltenkopf wählst du die Sortierung: nach Termin, Neueste zuerst oder manuell.' },
  { illus:'kunden', title:'👥 Kunden & ihre Kürzel', content:'Im Tab „Kunden" verwaltest du die Maklerunternehmen mit Kontaktdaten, Preisen und Kürzeln. Das Kürzel (z.B. „Muster") erscheint auf Rechnungen und im Dateinamen. Neue Makler aus Buchungen oder Terminen importierst du mit einem Klick.' },
  { illus:'kalender', title:'📅 Kalender & Google-Verbindung', content:'Ist Google verbunden (Tab „Kalender" → „Mit Google verbinden"), erscheinen die Termine automatisch und werden synchronisiert. Ohne Verbindung bleibt der Kalender leer — dann zuerst verbinden.' },
  { illus:'import', title:'🔄 Karten aus dem Kalender erkennen', content:'Google-Termine werden automatisch als Karten übernommen. Aus dem Termin-Text liest das System Kunde, Adresse, Leistung und Zusätze (Drohne, 360°) heraus und legt die passende Kategorie an.' },
  { illus:'fahrtenbuch', title:'🚗 Fahrtenbuch', content:'Aus den Terminen (Adresse + Datum) werden Fahrten automatisch vorgeschlagen: Datum, Strecke, Kilometer, Kunde und Zweck. So entsteht eine saubere Aufstellung für die Steuer — ohne alles von Hand einzutragen.' },
  { illus:'rechnung', title:'🧾 Rechnungen für Kunden', content:'Im Tab „Rechnungen" erstellst du Rechnungen direkt aus dem CRM. Die Rechnungsnummer wird automatisch vergeben, Kundendaten übernommen. Positionen mit Menge, Einheit, Preis und MwSt. sind frei bearbeitbar — fertige Rechnung als PDF.' },
  { illus:'fahrtkosten', title:'🛣 Fahrtkosten in die Rechnung', content:'Fahrtkosten als Position: Kilometer in die Menge, Satz pro km in den Preis (Einheit „km"). Die Summe wird automatisch berechnet und erscheint sauber auf der PDF-Rechnung.' },
  { illus:'mitarbeiter', title:'🧑‍💼 Mitarbeiter, Arbeitszeit & Gehaltszettel', content:'Im Tab „Mitarbeiter" verwaltest du das Team: Rollen, Farben, Board-Zugriff. Die Arbeitszeit wird per Check-in/Check-out erfasst (Stunden, Pausen). Gehaltszettel werden pro Monat hochgeladen und bereitgestellt.' },
  { illus:'widgets', title:'🧩 Widgets', content:'Auf dem Board nutzt du Widgets: To-Do, Wetter, nächster Termin, Statistik. Sie lassen sich frei verschieben und einklappen — dein eigenes Dashboard.' },
  { illus:'claude', title:'🤖 Claude AI — dein Assistent', content:'Im Chat gibst du natürliche Befehle ein: „Erstelle eine Karte für Muster, morgen 10 Uhr", „Zeige alle überfälligen Karten", „Was steht heute an?". Claude kennt deine Karten, Kunden und Statistiken.' },
  { illus:'done', title:'✅ Du bist startklar!', content:'Das waren die wichtigsten Funktionen. Probiere alles in Ruhe aus — du kannst hier nichts kaputt machen. Bei Fragen hilft dir Claude AI jederzeit im Chat.\n\nℹ️ Hinweis: Diese Demo wird alle 24 Stunden automatisch zurückgesetzt — deine Änderungen werden also wieder gelöscht. Viel Spaß beim Ausprobieren!' },
]

export default function TutorialOverlay({ onClose }) {
  const [step, setStep] = useState(0)
  const [animating, setAnimating] = useState(false)
  const current = STEPS[step]

  function go(dir) {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setStep(p => Math.max(0, Math.min(STEPS.length - 1, p + dir)))
      setAnimating(false)
    }, 180)
  }

  const isLast = step === STEPS.length - 1
  const progress = (step / (STEPS.length - 1)) * 100

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(28,26,22,.75)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)', padding:16 }}
      onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div style={{ background:'#fff', borderRadius:18, width:520, maxWidth:'96vw', boxShadow:'0 24px 80px rgba(0,0,0,.2)', overflow:'hidden', transition:'transform .18s', transform: animating?'scale(.98)':'scale(1)', fontFamily:'Arial,sans-serif' }}>

        <div style={{ height:3, background:'#f4f2ef' }}>
          <div style={{ height:'100%', background:G, width:progress+'%', transition:'width .4s' }} />
        </div>

        <div style={{ padding:'16px 22px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {STEPS.map((_,i) => (
              <div key={i} onClick={()=>setStep(i)} style={{ width: i===step?18:7, height:7, borderRadius:4, background: i<=step?G:'#ddd9d2', transition:'all .3s', cursor:'pointer' }} />
            ))}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#8a8278', fontSize:13, fontWeight:600, padding:'4px 8px' }}>Überspringen ✕</button>
        </div>

        <div style={{ padding:'18px 22px 4px' }}>
          <div style={{ background:'#faf8f4', border:'0.5px solid #f0e6d2', borderRadius:12, padding:'16px 12px', marginBottom:16, minHeight:90, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {ILLUS[current.illus]}
          </div>
          <div style={{ fontSize:19, fontWeight:700, color:'#1c1a16', marginBottom:9, lineHeight:1.3 }}>{current.title}</div>
          <div style={{ fontSize:13, color:'#4a4540', lineHeight:1.65, whiteSpace:'pre-line' }}>{current.content}</div>
        </div>

        <div style={{ padding:'14px 22px 20px', display:'flex', gap:10, justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, color:'#aaa8a0' }}>{step + 1} / {STEPS.length}</span>
          <div style={{ display:'flex', gap:8 }}>
            {step > 0 && <button onClick={()=>go(-1)} style={{ background:'#f4f2ef', color:'#4a4540', border:'none', borderRadius:8, padding:'9px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>← Zurück</button>}
            {isLast
              ? <button onClick={onClose} style={{ background:G, color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontSize:13, fontWeight:700, cursor:'pointer' }}>Los geht's! 🚀</button>
              : <button onClick={()=>go(1)} style={{ background:G, color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontSize:13, fontWeight:700, cursor:'pointer' }}>Weiter →</button>}
          </div>
        </div>

      </div>
    </div>
  )
}
