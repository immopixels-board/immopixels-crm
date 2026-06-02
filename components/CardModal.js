'use client'
import React, { useState, useEffect, useRef } from 'react'

var CARD_COLORS = [
  { key: '', bg: '#fff', br: '#ccc8c0', label: 'Keine' },
  { key: 'peach', bg: '#FFBE98', br: '#FFBE98', label: 'Peach Fuzz', cardBg: 'rgba(255,190,152,.12)', cardBr: 'rgba(255,190,152,.4)' },
  { key: 'sage', bg: '#9CAF88', br: '#9CAF88', label: 'Sage', cardBg: 'rgba(156,175,136,.12)', cardBr: 'rgba(156,175,136,.4)' },
  { key: 'rose', bg: '#D4A5A5', br: '#D4A5A5', label: 'Mellow Rose', cardBg: 'rgba(212,165,165,.12)', cardBr: 'rgba(212,165,165,.4)' },
]

var DAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const day = DAYS_DE[d.getDay()]
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${day}. ${dd}.${mm}.${yyyy}`
}

function AutoSaveBadge({ show }) {
  if (!show) return null
  return (
    <span style={{ fontSize: 11, color: '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}>
      <i className="ti ti-check" style={{ fontSize: 11 }} />
      Gespeichert
    </span>
  )
}

var TYPES_LIST_DEFAULT = [
  { key:'foto',      label:'Foto',        c:'#b8892a', bg:'rgba(184,137,42,.12)', br:'rgba(184,137,42,.3)' },
  { key:'foto-reel', label:'Foto+Reel',   c:'#6d28d9', bg:'rgba(109,40,217,.12)', br:'rgba(109,40,217,.3)' },
  { key:'foto-dron', label:'Foto+Drohne', c:'#a16207', bg:'rgba(161,98,7,.12)',   br:'rgba(161,98,7,.3)' },
  { key:'dron',      label:'Drohne',      c:'#15803d', bg:'rgba(21,128,61,.12)',  br:'rgba(21,128,61,.3)' },
  { key:'reel',      label:'Reel',        c:'#6d28d9', bg:'rgba(109,40,217,.12)', br:'rgba(109,40,217,.3)' },
  { key:'360',       label:'360°',        c:'#0891b2', bg:'rgba(8,145,178,.12)',  br:'rgba(8,145,178,.3)' },
]

var EXTRA_TYPES_KEY = 'crm_extra_types'

function getTypesList() {
  try {
    const extra = JSON.parse(localStorage.getItem(EXTRA_TYPES_KEY) || '[]')
    return [...TYPES_LIST_DEFAULT, ...extra]
  } catch(e) { return TYPES_LIST_DEFAULT }
}

function saveExtraType(label, color) {
  try {
    const extra = JSON.parse(localStorage.getItem(EXTRA_TYPES_KEY) || '[]')
    const key = label.toLowerCase().replace(/[^a-z0-9]/g,'')
    if (!extra.find(x => x.key === key)) {
      const c = color || '#b8892a'
      extra.push({ key, label, c, bg: c+'22', br: c+'66' })
      localStorage.setItem(EXTRA_TYPES_KEY, JSON.stringify(extra))
    }
    return key
  } catch(e) { return label.toLowerCase().replace(/[^a-z0-9]/g,'') }
}

function CategoryPicker({ cardType, onChange }) {
  const [open, setOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#6d28d9')
  const [typesList, setTypesList] = useState(getTypesList)
  const t = typesList.find(x => x.key === cardType) || typesList[0]

  function addNew() {
    if (!newLabel.trim()) return
    const key = saveExtraType(newLabel.trim(), newColor)
    setTypesList(getTypesList())
    onChange(key)
    setNewLabel('')
    setNewColor('#6d28d9')
    setOpen(false)
  }

  return (
    <div style={{ position:'relative', display:'inline-block' }}>
      <span onClick={e => { e.stopPropagation(); setOpen(p=>!p) }}
        style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:4, background:t.bg, color:t.c, border:'0.5px solid '+t.br, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4, userSelect:'none' }}>
        {t.label.toUpperCase()}
        <i className="ti ti-chevron-down" style={{ fontSize:9 }} />
      </span>
      {open && <>
        <div onClick={e=>{e.stopPropagation();setOpen(false)}} style={{position:'fixed',inset:0,zIndex:9998}} />
        <div style={{ position:'absolute', top:'100%', left:0, marginTop:4, background:'#fff', border:'1px solid #ddd9d2', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,.12)', zIndex:9999, minWidth:150, overflow:'hidden' }}>
          {typesList.map(tp => (
            <div key={tp.key} onClick={e => { e.stopPropagation(); onChange(tp.key); setOpen(false) }}
              style={{ padding:'8px 12px', fontSize:12, fontWeight:600, cursor:'pointer', color: tp.key===cardType ? tp.c : '#1c1a16', background: tp.key===cardType ? tp.bg : 'none', display:'flex', alignItems:'center', gap:7 }}
              onMouseEnter={e => e.currentTarget.style.background=tp.bg}
              onMouseLeave={e => e.currentTarget.style.background=tp.key===cardType?tp.bg:'none'}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:tp.c, flexShrink:0 }} />
              {tp.label}
            </div>
          ))}
          <div style={{ borderTop:'0.5px solid #eeeae6', padding:'8px 10px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#aaa8a0', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:6 }}>+ Neue Kategorie</div>
            <div style={{ display:'flex', gap:5, alignItems:'center' }}>
              <input type="color" value={newColor} onChange={e=>setNewColor(e.target.value)}
                style={{ width:26, height:26, border:'0.5px solid #ddd9d2', borderRadius:5, cursor:'pointer', padding:2, flexShrink:0 }} />
              <input value={newLabel} onChange={e=>setNewLabel(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter')addNew()}}
                placeholder="Name..."
                style={{ flex:1, border:'0.5px solid #ddd9d2', borderRadius:5, padding:'4px 8px', fontSize:11, outline:'none', background:'#f4f2ef', color:'#1c1a16', minWidth:0 }} />
              <button onClick={e=>{e.stopPropagation();addNew()}}
                style={{ background:'#b8892a', color:'#fff', border:'none', borderRadius:5, padding:'4px 7px', fontSize:11, fontWeight:700, cursor:'pointer', flexShrink:0 }}>+</button>
            </div>
          </div>
        </div>
      </>}
    </div>
  )
}

function PlacesAddrField({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const ref = useRef(null)
  useEffect(() => { setVal(value || '') }, [value])
  useEffect(() => {
    if (!editing || !ref.current) return
    if (window.google?.maps?.places && !ref.current._ac) {
      ref.current._ac = true
      const ac = new window.google.maps.places.Autocomplete(ref.current, {
        types: ['address'], componentRestrictions: { country: 'de' }
      })
      ac.addListener('place_changed', () => {
        const p = ac.getPlace()
        if (p.formatted_address) {
          setVal(p.formatted_address)
          onSave(p.formatted_address)
          setEditing(false)
        }
      })
    }
    ref.current.focus()
  }, [editing])
  if (editing) return (
    <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
      onBlur={() => { setEditing(false); if(val !== value) onSave(val) }}
      onKeyDown={e => { if(e.key==='Escape'){setVal(value||'');setEditing(false)} }}
      placeholder="Adresse hinzufügen..." autoComplete="off"
      style={{ width:'100%', background:'#fff', border:'1.5px solid #b8892a', borderRadius:6, padding:'3px 8px', fontSize:12, color:'#8a8278', fontFamily:'Arial', outline:'none' }} />
  )
  return (
    <div onClick={()=>setEditing(true)} style={{ cursor:'pointer', fontSize:12, color:val?'#8a8278':'#bbb', display:'flex', alignItems:'center', gap:4 }}>
      {val || 'Adresse hinzufügen...'}
      <i className="ti ti-pencil" style={{ fontSize:10, color:'#ccc8c0' }} />
    </div>
  )
}

function NoteField({ value, onSave, staff }) {
  const [val, setVal] = useState(value || '')
  const [mention, setMention] = useState({ show: false, query: '', pos: 0 })
  const ref = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => { setVal(value || '') }, [value])

  function handleChange(e) {
    const v = e.target.value
    setVal(v)
    // debounced save
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onSave(v), 800)
    // @mention detection
    const pos = e.target.selectionStart
    const before = v.slice(0, pos)
    const atIdx = before.lastIndexOf('@')
    if (atIdx >= 0 && !before.slice(atIdx + 1).includes(' ')) {
      setMention({ show: true, query: before.slice(atIdx + 1), pos: atIdx })
    } else {
      setMention(p => ({ ...p, show: false }))
    }
  }

  function selectMention(s) {
    const ta = ref.current
    if (!ta) return
    const before = val.slice(0, mention.pos)
    const after = val.slice(ta.selectionStart)
    let insert
    if (s.id === '__all__') {
      insert = (staff||[]).map(x=>'@'+x.name.split(' ')[0]).join(' ') + ' '
    } else {
      insert = '@' + s.name + ' '
    }
    const newVal = before + insert + after
    setVal(newVal)
    clearTimeout(timerRef.current)
    onSave(newVal)
    setMention(p => ({ ...p, show: false }))
    setTimeout(() => ta.focus(), 0)
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={ref}
        value={val}
        onChange={handleChange}
        onKeyDown={e => { if (e.key === 'Escape') setMention(p => ({ ...p, show: false })) }}
        onBlur={() => setTimeout(() => setMention(p => ({ ...p, show: false })), 150)}
        placeholder="Notiz hinzufügen... (@name zum Taggen)"
        rows={3}
        style={{ width: '100%', background: '#f4f2ef', border: '1.5px solid #ddd9d2', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#4a4540', fontFamily: 'Arial', outline: 'none', resize: 'vertical', minHeight: 60, boxSizing: 'border-box' }}
        onFocus={e => e.currentTarget.style.borderColor = '#b8892a'}
      />
      {mention.show && (
        <div style={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 9999, background: '#fff', border: '1px solid #ddd9d2', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.12)', minWidth: 160, overflow: 'hidden' }}>
          {(staff || []).filter(s => s.name && s.name.toLowerCase().includes(mention.query.toLowerCase())).slice(0, 5).map(s => (
            <div key={s.id} onMouseDown={e => { e.preventDefault(); selectMention(s) }}
              style={{ padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = '#f4f2ef'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: s.color + '22', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
                {s.avatar_url ? <img src={s.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.init}
              </div>
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EditableField({ value, onSave, style, multiline, placeholder }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const ref = useRef(null)

  useEffect(() => { setVal(value || '') }, [value])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  function save() {
    setEditing(false)
    if (val !== value) onSave(val)
  }

  if (editing) {
    const props = {
      ref, value: val,
      onChange: e => setVal(e.target.value),
      onBlur: save,
      onKeyDown: e => { if (!multiline && e.key === 'Enter') { e.preventDefault(); save() } if (e.key === 'Escape') { setVal(value||''); setEditing(false) } },
      style: { width: '100%', background: '#fff', border: '1.5px solid #b8892a', borderRadius: 6, padding: '5px 8px', fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit', fontFamily: 'Arial', outline: 'none', resize: multiline ? 'vertical' : 'none', minHeight: multiline ? 60 : 'auto', ...style }
    }
    return multiline ? <textarea {...props} rows={3} /> : <input {...props} />
  }

  return (
    <div onClick={() => setEditing(true)} style={{ cursor: 'pointer', borderRadius: 5, padding: '3px 5px', margin: '-3px -5px', transition: 'background .12s', position: 'relative', ...style }}
      onMouseEnter={e => e.currentTarget.style.background = '#f4f2ef'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <span style={{ color: val ? 'inherit' : '#aaa8a0' }}>{val || placeholder || 'Klicken zum Bearbeiten...'}</span>
      <i className="ti ti-pencil" style={{ fontSize: 10, color: '#ccc8c0', marginLeft: 5, verticalAlign: 'middle' }} />
    </div>
  )
}

const MONTHS_CM = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

function CardDateTimePicker({ date, time, timeTo, onDateChange, onTimeChange, onTimeToChange }) {
  const [calOpen, setCalOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)
  const [cy, setCy] = useState(() => date ? parseInt(date.slice(0,4)) : new Date().getFullYear())
  const [cm, setCm] = useState(() => date ? parseInt(date.slice(5,7))-1 : new Date().getMonth())

  function pad(n){return String(n).padStart(2,'0')}
  function toMin(t){const[h,m]=(t||'00:00').split(':').map(Number);return h*60+m}
  function fromMin_(mn){return pad(Math.floor(mn/60))+':'+pad(mn%60)}
  function fmtD(s){if(!s)return'Datum wählen...';const d=new Date(s+'T00:00:00');const days=['So','Mo','Di','Mi','Do','Fr','Sa'];return days[d.getDay()]+'. '+pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+String(d.getFullYear()).slice(2)}

  const fromT = time||'10:00'
  const toT = timeTo||fromMin_(toMin(fromT)+120)
  const diff = Math.max(0, toMin(toT)-toMin(fromT))
  const durLabel = Math.floor(diff/60)+'h'+(diff%60?' '+diff%60+'min':'')

  const calDays = React.useMemo(()=>{
    const first=new Date(cy,cm,1),last=new Date(cy,cm+1,0)
    const startDow=(first.getDay()+6)%7,days=[]
    for(let i=0;i<startDow;i++){const d=new Date(cy,cm,1-startDow+i);days.push({date:d,cur:false})}
    for(let d=1;d<=last.getDate();d++)days.push({date:new Date(cy,cm,d),cur:true})
    return days
  },[cy,cm])

  const slots=[]
  for(let h=7;h<=20;h++)for(let m=0;m<60;m+=15)slots.push(pad(h)+':'+pad(m))

  function pickFrom(t){
    onTimeChange(t)
    const fm=toMin(t)
    if(toMin(toT)<=fm) onTimeToChange(fromMin_(Math.min(fm+120,toMin('20:00'))))
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:6 }}>
        <div onClick={()=>{setCalOpen(p=>!p);setTimeOpen(false)}} style={{ flex:'1.2', background:calOpen?'#b8892a14':'#f4f2ef', border:'1.5px solid '+(calOpen||date?'#b8892a':'#ddd9d2'), borderRadius:8, padding:'7px 10px', fontSize:13, fontWeight:700, color:date?'#b8892a':'#4a4540', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
          <i className="ti ti-calendar" style={{ fontSize:13 }} />
          <span style={{ flex:1 }}>{fmtD(date)}</span>
          <i className="ti ti-chevron-down" style={{ fontSize:10, transition:'.2s', transform:calOpen?'rotate(180deg)':'' }} />
        </div>
        <div onClick={()=>{setTimeOpen(p=>!p);setCalOpen(false)}} style={{ flex:1, background:timeOpen?'#b8892a14':'#f4f2ef', border:'1.5px solid '+(timeOpen||time?'#b8892a':'#ddd9d2'), borderRadius:8, padding:'7px 10px', fontSize:12, fontWeight:700, color:time?'#b8892a':'#4a4540', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
          <i className="ti ti-clock" style={{ fontSize:13 }} />
          <span style={{ flex:1 }}>{fromT} – {toT}</span>
          <i className="ti ti-chevron-down" style={{ fontSize:10, transition:'.2s', transform:timeOpen?'rotate(180deg)':'' }} />
        </div>
      </div>
      {calOpen && (
        <div style={{ background:'#fff', border:'0.5px solid #ddd9d2', borderRadius:12, padding:12, marginBottom:8, boxShadow:'0 4px 20px rgba(0,0,0,.08)', zIndex:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <button type="button" onClick={()=>setCm(m=>m===0?(setCy(y=>y-1),11):m-1)} style={{ background:'none', border:'none', cursor:'pointer', color:'#1c1a16', fontSize:18, padding:'0 8px' }}>‹</button>
            <span style={{ fontSize:13, fontWeight:700, color:'#1c1a16' }}>{MONTHS_CM[cm]} {cy}</span>
            <button type="button" onClick={()=>setCm(m=>m===11?(setCy(y=>y+1),0):m+1)} style={{ background:'none', border:'none', cursor:'pointer', color:'#1c1a16', fontSize:18, padding:'0 8px' }}>›</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', textAlign:'center', gap:2, marginBottom:6 }}>
            {['M','D','M','D','F','S'].map((d,i)=><div key={i} style={{ fontSize:9, fontWeight:700, color:'#4a4540' }}>{d}</div>)}
            <div style={{ fontSize:9, fontWeight:700, color:'#b91c1c' }}>S</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
            {calDays.map((day,i)=>{
              const ds=day.date.toISOString().slice(0,10)
              const isSel=ds===date,isSun=day.date.getDay()===0,isToday=ds===new Date().toISOString().slice(0,10)
              return <div key={i} onClick={()=>{onDateChange(ds);setCy(day.date.getFullYear());setCm(day.date.getMonth())}}
                style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%', fontSize:11, cursor:'pointer', margin:'0 auto', fontWeight:isSel?700:400, background:isSel?'#b8892a':'none', color:isSel?'#fff':!day.cur?'#aaa8a0':isSun?'#b91c1c':'#1c1a16', border:isToday&&!isSel?'1.5px solid #b8892a':'none' }}>{day.date.getDate()}</div>
            })}
          </div>
          {date && <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8, paddingTop:8, borderTop:'0.5px solid #eeeae6' }}>
            <button type="button" onClick={()=>{onDateChange(null);onTimeChange(null);setCalOpen(false)}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'#b91c1c', fontWeight:600, display:'flex', alignItems:'center', gap:3 }}>
              <i className="ti ti-trash" style={{ fontSize:10 }} /> Datum löschen
            </button>
          </div>}
        </div>
      )}
      {timeOpen && (
        <div style={{ background:'#fff', border:'0.5px solid #ddd9d2', borderRadius:12, padding:12, marginBottom:8, boxShadow:'0 4px 20px rgba(0,0,0,.08)', zIndex:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:'#4a4540', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:7 }}>Von</div>
              <div style={{ maxHeight:180, overflowY:'auto', display:'flex', flexDirection:'column', gap:3, scrollbarWidth:'none' }}>
                {slots.map(t=><div key={t} onClick={()=>pickFrom(t)} style={{ padding:'7px 6px', textAlign:'center', borderRadius:6, fontSize:12, cursor:'pointer', fontWeight:t===fromT?700:500, background:t===fromT?'#b8892a':'#f4f2ef', color:t===fromT?'#fff':'#1c1a16', border:'0.5px solid '+(t===fromT?'#b8892a':'#ddd9d2') }}>{t}</div>)}
              </div>
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:'#4a4540', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:7 }}>Bis</div>
              <div style={{ maxHeight:180, overflowY:'auto', display:'flex', flexDirection:'column', gap:3, scrollbarWidth:'none' }}>
                {slots.filter(t=>toMin(t)>toMin(fromT)).map(t=>{
                  const inRange=toMin(t)>toMin(fromT)&&toMin(t)<=toMin(toT)
                  return <div key={t} onClick={()=>onTimeToChange(t)} style={{ padding:'7px 6px', textAlign:'center', borderRadius:6, fontSize:12, cursor:'pointer', fontWeight:t===toT?700:500, background:t===toT?'#b8892a':inRange?'#b8892a18':'#f4f2ef', color:t===toT?'#fff':inRange?'#7a4a00':'#1c1a16', border:'0.5px solid '+(t===toT?'#b8892a':inRange?'#b8892a66':'#ddd9d2') }}>{t}</div>
                })}
              </div>
            </div>
          </div>
          <div style={{ marginTop:10, paddingTop:8, borderTop:'0.5px solid #eeeae6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, color:'#4a4540', fontWeight:600 }}>⏱ {durLabel} Aufnahmedauer</span>
            <button type="button" onClick={()=>setTimeOpen(false)} style={{ background:'#b8892a', color:'#fff', border:'none', borderRadius:6, padding:'5px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}>OK</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CardModal({ card, cols, staff, supabase, onClose, onUpdate, currentStaff, sendNotification, clients = [], phonebook = [], maklers = {}, onFertig, onSend }) {
  const [saved, setSaved] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(() => {
    const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }
  })

  const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
  const TIME_SLOTS = []
  for(let h=7;h<=18;h++) for(let mm=0;mm<60;mm+=15) TIME_SLOTS.push(String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0'))

  function getCalDays(y, m) {
    const first = new Date(y, m, 1)
    const last = new Date(y, m+1, 0)
    const startDow = (first.getDay()+6)%7
    const days = []
    for(let i=0;i<startDow;i++) {
      const d = new Date(y, m, 1-startDow+i)
      days.push({ date: d, cur: false })
    }
    for(let d=1;d<=last.getDate();d++) days.push({ date: new Date(y,m,d), cur: true })
    return days
  }

  function fmtDateCustom(dateStr) {
    if (!dateStr) return 'Datum wählen...'
    const d = new Date(dateStr + 'T00:00:00')
    const days = ['So','Mo','Di','Mi','Do','Fr','Sa']
    const dd = String(d.getDate()).padStart(2,'0')
    const mm = String(d.getMonth()+1).padStart(2,'0')
    const yy = String(d.getFullYear()).slice(2)
    return days[d.getDay()]+'. '+dd+'.'+mm+'.'+yy
  }
  const [localCard, setLocalCard] = useState(card)
  const [attachments, setAttachments] = useState([])
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [commentMentions, setCommentMentions] = useState([])
  const [commentMentionIdx, setCommentMentionIdx] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null) // null | 0-100
  const [uploadError, setUploadError] = useState(null)
  const [zipDragOver, setZipDragOver] = useState(false)
  const fileRef = useRef(null)
  const saveTimer = useRef(null)

  useEffect(() => { setLocalCard(card) }, [card])
  useEffect(() => { loadAttachments(); loadComments() }, [card.id])
  useEffect(() => {
    if (!card?.id) return
    const ch = supabase.channel('card-comments-' + card.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_comments', filter: `card_id=eq.${card.id}` }, loadComments)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [card.id])

  async function loadAttachments() {
    const { data } = await supabase.from('card_attachments').select('*').eq('card_id', card.id).order('created_at', { ascending: false })
    setAttachments(data || [])
  }

  async function loadComments() {
    const { data } = await supabase.from('card_comments').select('*').eq('card_id', card.id).order('created_at', { ascending: true })
    setComments(data || [])
  }

  function getMentionCandidates(value) {
    const match = value.match(/@([A-Za-zÀ-ž0-9_.-]*)$/)
    if (!match) return []
    const q = (match[1] || '').toLowerCase()
    return staff.filter(s => (s.name || '').toLowerCase().includes(q) || (s.init || '').toLowerCase().includes(q)).slice(0, 6)
  }

  function insertMention(person) {
    setCommentText(v => v.replace(/@([A-Za-zÀ-ž0-9_.-]*)$/, '@' + person.name.split(' ')[0] + ' '))
    setCommentMentions([])
    setCommentMentionIdx(0)
  }

  function parseMentionedStaffIds(text) {
    const ids = new Set()
    const lower = text.toLowerCase()
    staff.forEach(s => {
      const first = (s.name || '').split(' ')[0]
      if (first && lower.includes('@' + first.toLowerCase())) ids.add(s.id)
      if (s.init && lower.includes('@' + s.init.toLowerCase())) ids.add(s.id)
    })
    return [...ids]
  }

  async function addComment() {
    if (currentStaff?.role_level === 'demo') return
    const text = commentText.trim()
    if (!text || !currentStaff?.id) return
    const mentioned = parseMentionedStaffIds(text)
    const { error } = await supabase.from('card_comments').insert({ card_id: card.id, staff_id: currentStaff.id, message: text })
    if (error) { console.error('Kommentar Fehler:', JSON.stringify(error)); return }
    setCommentText('')
    setCommentMentions([])
    loadComments()
    for (const recipientId of mentioned) {
      await sendNotification?.(supabase, { recipientId, senderId: currentStaff.id, type: 'card_mention', cardId: card.id, message: text })
    }
  }

  function renderCommentText(text) {
    if (!text) return null
    const URL_RE = /https?:\/\/[^\s]+/g
    const parts = []
    let last = 0
    const matches = [...String(text).matchAll(URL_RE)]
    for (const m of matches) {
      if (m.index > last) parts.push({ type:'text', val: text.slice(last, m.index) })
      const url = m[0]
      const short = url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 28) + '…'
      parts.push({ type:'url', val: url, short })
      last = m.index + url.length
    }
    if (last < text.length) parts.push({ type:'text', val: text.slice(last) })
    if (parts.length === 0) parts.push({ type:'text', val: text })
    return parts.map((pt, i) => {
      if (pt.type === 'url') return <a key={i} href={pt.val} target="_blank" rel="noopener" style={{ color:'#b8892a', fontWeight:700, textDecoration:'none', wordBreak:'break-all', display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', verticalAlign:'bottom' }}>{pt.short}</a>
      const sub = pt.val.split(/(@[A-Za-zÀ-ž0-9_.-]+)/g)
      return sub.map((s, j) => s.startsWith('@') ? <span key={i+'-'+j} style={{ color:'#b8892a', fontWeight:700 }}>{s}</span> : s)
    })
  }

  async function gcalSyncCard(updatedCard) {
    if (!updatedCard?.addr || !updatedCard?.card_date) return
    if (updatedCard.is_gcal) return // GCal-ból importált kártyát nem írjuk vissza
    try {
      const teamData = await supabase.from('card_team').select('staff_id').eq('card_id', updatedCard.id)
      const staffInits = (teamData.data || []).map(t => {
        const s = (staff || []).find(x => x.id === t.staff_id)
        return s?.init
      }).filter(Boolean)
      await fetch('/api/gcal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card: updatedCard, staffInits })
      })
    } catch (e) { /* silent */ }
  }

  const GCAL_SYNC_FIELDS = ['addr', 'card_date', 'card_time', 'title', 'description', 'client_name']

  const DRIVE_FOLDER_ID = '1Khlf9n732ri4ucfWo9kYWX8Vf1i4m1S9'

  async function uploadZipToDrive(file) {
    if (!file) return
    setUploadProgress(0)
    setUploadError(null)
    try {
      // Get GCal/Drive token from localStorage
      const token = localStorage.getItem('gcal_token')
      if (!token) {
        setUploadError('Bitte zuerst Google verbinden (Kalender-Tab)')
        setUploadProgress(null)
        return
      }

      // 1. Initiate resumable upload
      const metadata = {
        name: file.name,
        parents: [DRIVE_FOLDER_ID],
        mimeType: file.type || 'application/zip',
      }
      const initRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': file.type || 'application/zip',
            'X-Upload-Content-Length': file.size,
          },
          body: JSON.stringify(metadata),
        }
      )
      if (!initRes.ok) {
        const err = await initRes.json()
        throw new Error(err.error?.message || 'Upload init fehlgeschlagen')
      }
      const uploadUrl = initRes.headers.get('Location')
      if (!uploadUrl) throw new Error('Kein Upload-URL erhalten')

      // 2. Upload file with progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/zip')
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
          else reject(new Error('Upload fehlgeschlagen: ' + xhr.status))
        }
        xhr.onerror = () => reject(new Error('Netzwerkfehler'))
        xhr.send(file)
      }).then(async (fileData) => {
        // 3. Make file shareable (anyone with link)
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`,
          {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'reader', type: 'anyone' }),
          }
        )
        // 4. Save link to card
        const link = `https://drive.google.com/file/d/${fileData.id}/view?usp=sharing`
        await save('drive_link', link)
        setUploadProgress(null)
        // 5. Send email notification
        try {
          const cl = clients.find(c => c.name === localCard.client_name || c.short_name === localCard.client_name)
          await fetch('/api/email/drive-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cardTitle: localCard.title,
              driveLink: link,
              clientName: localCard.client_name || '',
              staffName: currentStaff?.name || '',
              cardDate: localCard.card_date || '',
              extraEmail: cl?.email || ''
            })
          })
        } catch(e) { console.warn('Drive notify email failed', e) }
      })
    } catch(e) {
      setUploadError(e.message)
      setUploadProgress(null)
    }
  }

  async function save(field, value) {
    if (currentStaff?.role_level === 'demo') return
    const upd = { [field]: value }
    if (field !== 'card_color') upd.updated_at = new Date().toISOString()
    await supabase.from('cards').update(upd).eq('id', card.id)
    const updated = { ...localCard, [field]: value }
    setLocalCard(updated)
    onUpdate()
    setSaved(true)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaved(false), 2500)
    // Sync to GCal if relevant field changed
    if (GCAL_SYNC_FIELDS.includes(field) && updated.addr && updated.card_date) {
      gcalSyncCard(updated)
    }
  }

  async function addTeam(staffId) {
    await supabase.from('card_team').insert({ card_id: card.id, staff_id: staffId })
    await sendNotification?.(supabase, { recipientId: staffId, senderId: currentStaff?.id, type: 'card_assigned', cardId: card.id, message: localCard.title || 'Karte' })
    onUpdate()
    const { data } = await supabase.from('cards').select('*, card_team(*), checklist_items(*)').eq('id', card.id).single()
    if (data) setLocalCard(data)
  }

  async function removeTeam(staffId) {
    await supabase.from('card_team').delete().match({ card_id: card.id, staff_id: staffId })
    onUpdate()
    const { data } = await supabase.from('cards').select('*, card_team(*), checklist_items(*)').eq('id', card.id).single()
    if (data) setLocalCard(data)
  }

  async function toggleChecklist(item) {
    await supabase.from('checklist_items').update({ done: !item.done }).eq('id', item.id)
    setLocalCard(p => ({ ...p, checklist_items: p.checklist_items.map(i => i.id === item.id ? { ...i, done: !i.done } : i) }))
  }

  async function addChecklist(text) {
    if (!text.trim()) return
    await supabase.from('checklist_items').insert({ card_id: card.id, text: text.trim(), done: false })
    const { data } = await supabase.from('cards').select('*, card_team(*), checklist_items(*)').eq('id', card.id).single()
    if (data) setLocalCard(data)
  }

  async function uploadFile(file) {
    const path = `cards/${card.id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('card-attachments').upload(path, file)
    if (!error) {
      const { data: urlData } = supabase.storage.from('card-attachments').getPublicUrl(path)
      await supabase.from('card_attachments').insert({ card_id: card.id, name: file.name, url: urlData.publicUrl, size: file.size, type: file.type, path })
      loadAttachments()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  async function deleteAttachment(att) {
    if (!confirm('Anhang löschen?')) return
    await supabase.storage.from('card-attachments').remove([att.path])
    await supabase.from('card_attachments').delete().eq('id', att.id)
    loadAttachments()
  }

  const currentCol = cols.find(col => col.id === localCard.column_id)
  const cardTeamIds = (localCard.card_team || []).map(ct => ct.staff_id)
  const teamMembers = staff.filter(s => cardTeamIds.includes(s.id))
  const nonTeam = staff.filter(s => !cardTeamIds.includes(s.id))
  const IS = { background: '#f4f2ef', border: 'none', borderRadius: 8, padding: '10px 12px', fontSize: 12, fontFamily: 'Arial', outline: 'none', width: '100%' }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="card-modal-outer" style={{ position: 'fixed', inset: 0, background: 'rgba(28,26,22,.45)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn .15s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:scale(.97) } to { opacity:1; transform:scale(1) } }
        .card-modal-scroll::-webkit-scrollbar { width: 4px }
        .card-modal-scroll::-webkit-scrollbar-track { background: transparent }
        .card-modal-scroll::-webkit-scrollbar-thumb { background: #ddd9d2; border-radius: 2px }
      `}</style>
      <div className='modal-animate' style={{ background: '#fff', borderRadius: 16, width: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.18)' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '0.5px solid #eeeae6', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 5, marginBottom: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                {!localCard.is_todo && (
                  <CategoryPicker cardType={localCard.card_type || 'foto'} onChange={v => save('card_type', v)} />
                )}
                {localCard.is_gcal && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(29,94,199,.08)', color: '#1d5ec7', border: '0.5px solid rgba(29,94,199,.2)' }}>● GCal</span>}
                <AutoSaveBadge show={saved} />
                {/* Color picker */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {CARD_COLORS.map(col => (
                    <div key={col.key} onClick={() => save('card_color', col.key || null)}
                      title={col.label}
                      style={{ width: 14, height: 14, borderRadius: '50%', background: col.bg, border: '1.5px solid ' + ((localCard.card_color || '') === col.key ? col.br : 'transparent'), cursor: 'pointer', transition: 'transform .1s', flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1c1a16', lineHeight: 1.3, marginBottom: 4 }}>
                <EditableField value={localCard.title} onSave={v => save('title', v)} style={{ fontSize: 17, fontWeight: 700, color: '#1c1a16' }} />
              </div>
              <div style={{ fontSize: 12, color: '#8a8278', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-map-pin" style={{ fontSize: 11 }} />
                {localCard.is_gcal
                  ? <span style={{ color: '#8a8278' }}>{localCard.addr || '—'}</span>
                  : <PlacesAddrField value={localCard.addr} onSave={v => save('addr', v)} />
                }
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8278', fontSize: 16, padding: 4, flexShrink: 0 }}>
              <i className="ti ti-x" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="card-modal-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Status */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>Status</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {cols.map(col => (
                <div key={col.id} onClick={() => save('column_id', col.id)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: '0.5px solid ' + (localCard.column_id === col.id ? '#1c1a16' : '#ddd9d2'), background: localCard.column_id === col.id ? '#1c1a16' : '#fff', color: localCard.column_id === col.id ? '#fff' : '#4a4540', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .12s' }}>
                  {col.title}
                </div>
              ))}
            </div>
          </div>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: '#f4f2ef', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>Kunde</div>
              <EditableField value={localCard.client_name} onSave={v => save('client_name', v)} placeholder="Kunden eingeben..." style={{ fontSize: 13, fontWeight: 600, color: '#1c1a16' }} />
              {(() => { const cl = clients.find(c => c.short_name === localCard.client_name || c.name === localCard.client_name); return cl && cl.short_name && cl.name && cl.short_name !== cl.name ? <div style={{ fontSize:11, color:'#8a8278', marginTop:3 }}>{cl.name}</div> : null })()}
            </div>
            <div style={{ background: '#f4f2ef', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>Makler</div>
              {localCard.makler_name ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1c1a16' }}>{localCard.makler_name}</div>
                    {localCard.makler_tel && <div style={{ fontSize:11, color:'#8a8278' }}>{localCard.makler_tel}</div>}
                  </div>
                  <button onClick={()=>{save('makler_name','');save('makler_tel','');save('makler_email','')}}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#b91c1c', fontSize:13 }}>✕</button>
                </div>
              ) : (
                <div>
                  <select onChange={e=>{
                    if(!e.target.value) return
                    const [src,id] = e.target.value.split('::')
                    if(src==='phone') {
                      const pb = phonebook.find(x=>x.id===id)
                      if(pb){ save('makler_name',pb.name); save('makler_tel',pb.tel||''); save('makler_email',pb.email||'') }
                    } else {
                      const cl = clients.find(c=>c.id===id)
                      const ms = maklers[id]||[]
                      const m = ms[0]
                      if(m){ save('makler_name',m.name); save('makler_tel',m.tel||''); save('makler_email',m.email||'') }
                      else if(cl){ save('makler_name',cl.contact_name||cl.name); save('makler_tel',cl.contact_tel||cl.tel||''); save('makler_email',cl.contact_email||cl.email||'') }
                    }
                    e.target.value=''
                  }} defaultValue="" style={{ width:'100%', fontSize:12, background:'#fff', border:'0.5px solid #ddd9d2', borderRadius:6, padding:'5px 8px', color:'#1c1a16', outline:'none' }}>
                    <option value="">— Aus Telefonbuch wählen —</option>
                    {phonebook.length > 0 && <optgroup label="Telefonbuch">
                      {phonebook.map(pb=><option key={'pb_'+pb.id} value={'phone::'+pb.id}>{pb.name}{pb.company?' · '+pb.company:''}</option>)}
                    </optgroup>}
                    {clients.filter(c=>maklers[c.id]?.length||c.contact_name).map(c=>(
                      <optgroup key={c.id} label={c.short_name||c.name}>
                        {(maklers[c.id]||[{id:'c_'+c.id,name:c.contact_name,tel:c.contact_tel,email:c.contact_email}]).filter(m=>m.name).map(m=>(
                          <option key={m.id} value={'client::'+c.id}>{m.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div style={{ background: '#f4f2ef', borderRadius: 8, padding: '10px 12px', position: 'relative' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Termin</div>
              <CardDateTimePicker
                date={localCard.card_date||null}
                time={localCard.card_time?.slice(0,5)||null}
                timeTo={localCard.card_time_to?.slice(0,5)||null}
                onDateChange={v=>save('card_date',v)}
                onTimeChange={v=>save('card_time',v)}
                onTimeToChange={v=>save('card_time_to',v)}
              />
              {localCard.card_date && (
                <button onClick={()=>{save('card_date',null);save('card_time',null);save('card_time_to',null)}}
                  style={{ marginTop:6, background:'#fef2f2', color:'#b91c1c', border:'0.5px solid #fecaca', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:3 }}>
                  <i className="ti ti-trash" style={{ fontSize:10 }} /> Datum löschen
                </button>
              )}
            </div>
            <div
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
              onDragLeave={e => { e.preventDefault(); setDragOver(false) }}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); const files = Array.from(e.dataTransfer.files); if(files.length) files.forEach(uploadFile) }}
              style={{ background: dragOver ? 'rgba(184,137,42,.08)' : '#f4f2ef', borderRadius: 10, padding: '12px 14px', gridColumn: 'span 2', border: dragOver ? '1.5px dashed #b8892a' : '0.5px solid #e4e0d9', transition: 'all .15s', position: 'relative' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.5px' }}>Beschreibung</div>
                {dragOver && <div style={{ fontSize: 10, fontWeight: 700, color: '#b8892a' }}>📎 Datei hierher ziehen</div>}
              </div>
              {localCard.is_gcal && localCard.description?.includes('<') ? (
                <div style={{ fontSize: 13, color: '#1c1a16', lineHeight: 1.65, wordBreak: 'break-word' }}
                  dangerouslySetInnerHTML={{ __html: localCard.description }} />
              ) : (
                <EditableField value={localCard.description} onSave={v => save('description', v)} multiline placeholder="Beschreibung hinzufügen oder Datei hierher ziehen..." style={{ fontSize: 14, fontWeight: 500, color: '#1c1a16', lineHeight: 1.65, wordBreak: 'break-word', overflowWrap: 'break-word' }} renderValue={v => renderCommentText(v)} />
              )}
            </div>
          </div>

          {/* Team */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>Team</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {teamMembers.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f4f2ef', border: '0.5px solid #ddd9d2', borderRadius: 20, padding: '4px 10px 4px 5px', fontSize: 12, fontWeight: 600 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: s.color + '22', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
                    {s.avatar_url ? <img src={s.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.init}
                  </div>
                  {s.name.split(' ')[0]}
                  <span onClick={() => removeTeam(s.id)} style={{ color: '#ccc8c0', cursor: 'pointer', fontSize: 14, lineHeight: 1, marginLeft: 2 }}>×</span>
                </div>
              ))}
              {nonTeam.map(s => (
                <div key={s.id} onClick={() => addTeam(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, border: '0.5px dashed #ccc8c0', borderRadius: 20, padding: '4px 10px 4px 5px', fontSize: 12, color: '#8a8278', cursor: 'pointer', background: 'none' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: s.color + '11', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
                    {s.avatar_url ? <img src={s.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.init}
                  </div>
                  + {s.name.split(' ')[0]}
                </div>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>Checkliste</div>
            {(localCard.checklist_items || []).map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '0.5px solid #f0ede8' }}>
                <div onClick={() => toggleChecklist(item)} style={{ width: 16, height: 16, borderRadius: 4, border: item.done ? 'none' : '1.5px solid #ccc8c0', background: item.done ? '#15803d' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  {item.done && <i className="ti ti-check" style={{ fontSize: 10, color: '#fff' }} />}
                </div>
                <span style={{ fontSize: 13, color: item.done ? '#aaa8a0' : '#1c1a16', textDecoration: item.done ? 'line-through' : 'none', flex: 1 }}>{item.text}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input placeholder="+ Neuer Punkt..." onKeyDown={e => { if (e.key === 'Enter') { addChecklist(e.target.value); e.target.value = '' } }} style={{ ...IS, fontSize: 12, padding: '6px 10px' }} />
            </div>
          </div>

          {/* Drive / Dropbox Link */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Drive / Dropbox Link</div>
            <EditableField value={localCard.drive_link} onSave={v => save('drive_link', v)} placeholder="z.B. https://drive.google.com/drive/folders/... oder https://we.tl/t-..." style={{ fontSize: 12, color: '#8a8278' }} />
            {localCard.drive_link && (
              <div style={{ display:'flex', gap:6, marginTop:6 }}>
                <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(localCard.drive_link).then(()=>{ const b=e.currentTarget; b.style.background='#15803d22'; b.style.color='#15803d'; setTimeout(()=>{b.style.background='';b.style.color=''},1500) }) }}
                  style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:6, border:'0.5px solid #ddd9d2', background:'none', fontSize:11, fontWeight:600, color:'#4a4540', cursor:'pointer' }}>
                  <i className="ti ti-copy" style={{fontSize:11}}/> Kopieren
                </button>
                <a href={localCard.drive_link} target="_blank" rel="noopener noreferrer"
                  style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:6, border:'0.5px solid #ddd9d2', fontSize:11, fontWeight:600, color:'#1d5ec7', textDecoration:'none' }}>
                  <i className="ti ti-external-link" style={{fontSize:11}}/> Öffnen
                </a>
              </div>
            )}
          </div>

          {/* ZIP Upload */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>ZIP → Google Drive</div>
            <div
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setZipDragOver(true) }}
              onDragLeave={e => { e.stopPropagation(); setZipDragOver(false) }}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); setZipDragOver(false); const f = e.dataTransfer.files[0]; if(f) uploadZipToDrive(f) }}
              onClick={e => { e.stopPropagation(); if(uploadProgress!==null) return; const inp=document.createElement('input'); inp.type='file'; inp.accept='.zip,application/zip'; inp.onchange=ev=>{ev.stopPropagation();uploadZipToDrive(ev.target.files[0])}; inp.click() }}
              style={{ border: '1.5px dashed '+(zipDragOver?'#b8892a':'#ddd9d2'), borderRadius:8, padding:'14px 12px', textAlign:'center', cursor: uploadProgress!==null?'default':'pointer', background: zipDragOver?'#b8892a0a':'#f9f8f6', transition:'all .15s' }}>
              {uploadProgress === null ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                  <i className="ti ti-cloud-upload" style={{ fontSize:22, color:'#b8892a' }} />
                  <span style={{ fontSize:12, color:'#8a8278' }}>ZIP hierher ziehen oder <span style={{ color:'#b8892a', fontWeight:700 }}>klicken</span></span>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7 }}>
                  <div style={{ width:'100%', background:'#eeeae6', borderRadius:10, height:8 }}>
                    <div style={{ width: uploadProgress+'%', background:'#b8892a', height:8, borderRadius:10, transition:'width .3s' }} />
                  </div>
                  <span style={{ fontSize:11, color:'#b8892a', fontWeight:700 }}>{uploadProgress < 100 ? uploadProgress+'% wird hochgeladen...' : '✓ Fertig! Link wird gespeichert...'}</span>
                </div>
              )}
            </div>
            {uploadError && <div style={{ fontSize:11, color:'#b91c1c', marginTop:5, display:'flex', alignItems:'center', gap:4 }}><i className="ti ti-alert-circle" style={{fontSize:11}}/>{uploadError}</div>}
          </div>

          {/* Notiz */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>Notiz</div>
            <NoteField value={localCard.note} onSave={v => save('note', v)} staff={staff} fontSize={14} />
          </div>

          {/* Kommentare */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>Kommentare</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {comments.length === 0 && <div style={{ background:'#f4f2ef', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#8a8278' }}>Noch keine Kommentare. Mit @ kannst du Kollegen markieren.</div>}
              {comments.map(c => {
                const author = staff.find(s => s.id === c.staff_id) || { init:'?', name:'Unbekannt', color:'#999' }
                return (
                  <div key={c.id} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <div style={{ width:26, height:26, borderRadius:'50%', background:author.color + '22', color:author.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, overflow:'hidden', flexShrink:0 }}>
                      {author.avatar_url ? <img src={author.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : author.init}
                    </div>
                    <div style={{ flex:1, background:'#f4f2ef', borderRadius:9, padding:'8px 10px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'#1c1a16' }}>{author.name}</span>
                        <span style={{ fontSize:10, color:'#aaa8a0' }}>{new Date(c.created_at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                      <div style={{ fontSize:12, color:'#4a4540', lineHeight:1.45, whiteSpace:'pre-wrap' }}>{renderCommentText(c.message)}</div>
                    </div>
                  </div>
                )
              })}
              <div style={{ position:'relative', display:'flex', gap:8, alignItems:'flex-start' }}>
                <textarea value={commentText} placeholder='Kommentar schreiben... @Name' onChange={e => { const v=e.target.value; setCommentText(v); setCommentMentions(getMentionCandidates(v)); setCommentMentionIdx(0) }} onKeyDown={e => { if (commentMentions.length && (e.key==='ArrowDown' || e.key==='ArrowUp')) { e.preventDefault(); setCommentMentionIdx(i => e.key==='ArrowDown' ? (i+1)%commentMentions.length : (i-1+commentMentions.length)%commentMentions.length) } else if (commentMentions.length && e.key==='Enter' && !e.shiftKey) { e.preventDefault(); insertMention(commentMentions[commentMentionIdx]) } else if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); addComment() } }}
                  style={{ flex:1, minHeight:54, background:'#fff', border:'1px solid #ddd9d2', borderRadius:9, padding:'9px 11px', fontSize:12, color:'#1c1a16', fontFamily:'Arial', outline:'none', resize:'vertical' }} />
                <button onClick={addComment} disabled={!commentText.trim()} style={{ background:commentText.trim()?'#1c1a16':'#ddd9d2', color:'#fff', border:'none', borderRadius:8, padding:'9px 12px', fontSize:12, fontWeight:700, cursor:commentText.trim()?'pointer':'default' }}><i className='ti ti-send' /></button>
                {commentMentions.length > 0 && (
                  <div style={{ position:'absolute', left:0, bottom:'100%', marginBottom:6, width:230, background:'#fff', border:'0.5px solid #ddd9d2', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,.12)', overflow:'hidden', zIndex:20 }}>
                    {commentMentions.map((s,i) => (
                      <div key={s.id} onMouseDown={e=>{e.preventDefault(); insertMention(s)}} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:i===commentMentionIdx?'#f4f2ef':'#fff', cursor:'pointer' }}>
                        <div style={{ width:22, height:22, borderRadius:'50%', background:s.color+'22', color:s.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, overflow:'hidden', flexShrink:0 }}>{s.avatar_url ? <img src={s.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : s.init}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:'#1c1a16' }}>{s.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>Anhänge</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {attachments.map(att => {
                const isImg = att.type?.startsWith('image/')
                const isPdf = att.type?.includes('pdf')
                const isZip = att.type?.includes('zip')
                const ic = isImg ? 'ti-photo' : isPdf ? 'ti-file-text' : isZip ? 'ti-file-zip' : 'ti-file'
                const bg = isImg ? '#fef08a' : isPdf ? '#fecaca' : isZip ? '#fed7aa' : '#bfdbfe'
                const col = isImg ? '#ca8a04' : isPdf ? '#b91c1c' : isZip ? '#ea580c' : '#1d5ec7'
                return (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f4f2ef', borderRadius: 7, padding: '7px 10px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={'ti ' + ic} style={{ fontSize: 14, color: col }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1c1a16' }}>{att.name}</div>
                      <div style={{ fontSize: 10, color: '#8a8278' }}>{att.size ? (att.size / 1024 / 1024).toFixed(1) + ' MB' : ''}</div>
                    </div>
                    <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8278', fontSize: 14, padding: '3px 5px' }}><i className="ti ti-download" /></a>
                    <button onClick={() => deleteAttachment(att)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: 14, padding: '3px 5px' }}><i className="ti ti-trash" /></button>
                  </div>
                )
              })}
              <div onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); Array.from(e.dataTransfer.files).forEach(uploadFile) }}
                onClick={() => fileRef.current?.click()}
                style={{ border: '1.5px dashed ' + (dragOver ? '#b8892a' : '#ccc8c0'), borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: dragOver ? '#b8892a' : '#8a8278', fontSize: 12, background: dragOver ? 'rgba(184,137,42,.05)' : 'none', transition: 'all .15s' }}>
                <i className="ti ti-upload" style={{ fontSize: 15 }} />
                Datei hierher ziehen oder klicken
              </div>
              <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => Array.from(e.target.files).forEach(uploadFile)} />
            </div>
          </div>

        </div>

        {/* Dropbox gomb — footer felett */}
        {(() => {
          const cl = clients.find(c => c.name === card.client_name || c.short_name === card.client_name)
          return cl?.dropbox_link ? (
            <div style={{ padding: '8px 20px', borderTop: '0.5px solid #eeeae6', background: '#faf9f7' }}>
              <a href={cl.dropbox_link} target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', gap:10, background:'#e8f3ff', border:'1px solid #a8d0ff', borderRadius:8, padding:'9px 14px', textDecoration:'none', transition:'background .12s' }}
                onMouseEnter={e => e.currentTarget.style.background='#d0e8ff'}
                onMouseLeave={e => e.currentTarget.style.background='#e8f3ff'}>
                <div style={{ width:28, height:28, borderRadius:6, background:'#0061fe', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4zm-6 13l-6-4 6-4 6 4z"/></svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#0061fe' }}>Fotos hochladen → {cl.name}</div>
                  <div style={{ fontSize:10, color:'#3b82c4' }}>Dropbox öffnen</div>
                </div>
                <i className="ti ti-external-link" style={{ fontSize:13, color:'#0061fe' }} />
              </a>
            </div>
          ) : null
        })()}

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '0.5px solid #eeeae6', display: 'flex', gap: 8, alignItems: 'center', background: '#faf9f7', flexShrink: 0 }}>
          <button onClick={() => onSend && onSend(card)} style={{ background: '#c9a05a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-send" style={{ fontSize: 13 }} /> Senden
          </button>
          <button onClick={async () => {
            if (!onFertig) return
            const fertigCol = cols.find(c => c.title.toLowerCase().includes('fertig') || c.title.toLowerCase().includes('kész'))
            if (!fertigCol) { alert('Kein Fertig-Ordner gefunden'); return }
            await supabase.from('cards').update({ column_id: fertigCol.id, updated_at: new Date().toISOString() }).eq('id', card.id)
            onUpdate(); onClose()
          }} style={{ background: '#15803d', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-check" style={{ fontSize: 13 }} /> Fertig
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: saved ? '#15803d' : '#aaa8a0', gap: 4, transition: 'color .3s' }}>
            <i className={'ti ' + (saved ? 'ti-check' : 'ti-cloud')} style={{ fontSize: 12 }} />
            {saved ? 'Gespeichert' : 'Wird gespeichert...'}
          </div>
          <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
            title="Manuell speichern"
            style={{ background: 'none', border: '0.5px solid #ddd9d2', borderRadius: 8, padding: '8px 10px', color: '#8a8278', cursor: 'pointer', display: 'flex', alignItems: 'center', transition:'color .15s,border-color .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#b8892a'; e.currentTarget.style.color='#b8892a' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#ddd9d2'; e.currentTarget.style.color='#8a8278' }}>
            <i className="ti ti-device-floppy" style={{ fontSize: 14 }} />
          </button>
          <button onClick={async () => { if (!confirm('Karte wirklich löschen?')) return; await supabase.from('card_team').delete().eq('card_id', card.id); await supabase.from('checklist_items').delete().eq('card_id', card.id); await supabase.from('cards').delete().eq('id', card.id); onUpdate(); onClose() }}
            style={{ background: 'none', border: '0.5px solid #f5c4c4', borderRadius: 8, padding: '8px 10px', color: '#b91c1c', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <i className="ti ti-trash" style={{ fontSize: 14 }} />
          </button>
        </div>

      </div>
    </div>
  )
}
