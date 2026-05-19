'use client'
import { useState, useEffect, useRef } from 'react'

function pad(n){return String(n).padStart(2,'0')}
function fmtDate(s){if(!s)return'—';const d=new Date(s+'T00:00:00');return pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+String(d.getFullYear()).slice(2)}
function getMonthDates(date){const d=new Date(date);return{from:new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10),to:new Date(d.getFullYear(),d.getMonth()+1,0).toISOString().slice(0,10)}}

const RATE = 0.30

export default function Fahrtenbuch({staff, cards, me, isAdmin, supabase}){
  const [selStaffId, setSelStaffId] = useState(()=>me?.id||null)
  const [selDate, setSelDate] = useState(new Date().toISOString().slice(0,10))
  const [rows, setRows] = useState([])
  const [calcLoading, setCalcLoading] = useState(false)
  const [licensePlate, setLicensePlate] = useState('')
  const lpTimer = useRef(null)
  const [saving, setSaving] = useState({})
  const saveTimers = useRef({})

  const currentStaff = staff.find(s=>s.id===selStaffId)||me
  const {from,to} = getMonthDates(selDate)

  useEffect(()=>{
    if(!currentStaff) return
    setLicensePlate(currentStaff.license_plate||'')
    loadRows()
  },[currentStaff?.id, from, to])

  async function loadRows(){
    if(!currentStaff?.id) return
    const { data } = await supabase.from('fahrtenbuch_rows')
      .select('*')
      .eq('staff_id', currentStaff.id)
      .gte('date', from).lte('date', to)
      .order('date', {ascending:true}).order('time_from', {ascending:true})
    
    // Get existing rows from DB
    const existingRows = data || []
    const existingCardIds = new Set(existingRows.filter(r=>r.source_card_id).map(r=>r.source_card_id))

    // Find new cards not yet in DB
    const home = currentStaff.address||''
    const staffCards = cards.filter(c=>{
      if(!c.card_date||!c.addr) return false
      if(c.card_date<from||c.card_date>to) return false
      if(existingCardIds.has(c.id)) return false // already saved
      if(c.card_team && c.card_team.length > 0){
        return c.card_team.some(t=>t.staff_id===currentStaff.id)
      }
      return false
    }).sort((a,b)=>{
      if(a.card_date!==b.card_date) return a.card_date.localeCompare(b.card_date)
      return (a.card_time||''). localeCompare(b.card_time||'')
    })

    if(staffCards.length === 0){
      setRows(existingRows.map(r=>({...r,_saved:true})))
      return
    }

    const newRows = staffCards.map(c=>({
      id: 'new_'+c.id+'_'+Date.now(),
      staff_id: currentStaff.id,
      date: c.card_date,
      time_from: c.card_time?.slice(0,5)||'08:00',
      time_to: c.card_time_to?.slice(0,5)||'',
      shooting: c.title||'—',
      fahrstrecke: home && c.addr ? home.split(',')[0]+' → '+c.addr.split(',')[0] : c.addr||'',
      from_addr: home,
      to_addr: c.addr||'',
      kunde: c.client_name||'',
      zweck: 'Fotoshooting',
      km_start: null, km_end: null, km: null,
      _saved: false, source_card_id: c.id,
    }))
    const allRows = [...existingRows.map(r=>({...r,_saved:true})), ...newRows]
    setRows(allRows)
    if(home) calcAndSave(newRows, home)
  }

  async function calcAndSave(rowsData, home){
    setCalcLoading(true)
    const updated = [...rowsData]
    for(let i=0;i<updated.length;i++){
      const r = updated[i]
      if(!r.from_addr||!r.to_addr){ continue }
      try{
        const res = await fetch('/api/fahrtenbuch/distance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stops:[r.from_addr,r.to_addr]})})
        const d = await res.json()
        if(d.ok&&d.legs[0]) r.km = parseFloat((d.legs[0].distance/1000).toFixed(1))
      }catch(e){}
    }
    setRows([...updated])
    setCalcLoading(false)
    // Save all
    for(const r of updated) await saveRow(r, true)
  }

  async function saveRow(row, immediate=false){
    if(row.id?.startsWith('new_')){
      const { data } = await supabase.from('fahrtenbuch_rows').insert({
        staff_id: currentStaff.id,
        date: row.date, time_from: row.time_from, time_to: row.time_to,
        shooting: row.shooting, fahrstrecke: row.fahrstrecke,
        from_addr: row.from_addr, to_addr: row.to_addr,
        kunde: row.kunde, zweck: row.zweck,
        km_start: row.km_start||null, km_end: row.km_end||null, km: row.km||null,
        source_card_id: row.source_card_id||null,
      }).select().single()
      if(data){
        setRows(prev=>prev.map(r=>r.id===row.id ? {...data,_saved:true} : r))
      }
    } else if(row.id && !row.id.startsWith('new_')){
      await supabase.from('fahrtenbuch_rows').update({
        date: row.date, time_from: row.time_from, time_to: row.time_to,
        shooting: row.shooting, fahrstrecke: row.fahrstrecke,
        from_addr: row.from_addr, to_addr: row.to_addr,
        kunde: row.kunde, zweck: row.zweck,
        km_start: row.km_start||null, km_end: row.km_end||null, km: row.km||null,
      }).eq('id', row.id)
      setRows(prev=>prev.map(r=>r.id===row.id ? {...r,_saved:true} : r))
    }
    setSaving(p=>({...p,[row.id]:false}))
  }

  function updateRow(idx, key, val){
    setRows(prev=>{
      const n=[...prev]; n[idx]={...n[idx],[key]:val,_saved:false}; return n
    })
    const row = rows[idx]
    if(!row) return
    // Debounce save 1.5s
    clearTimeout(saveTimers.current[row.id])
    setSaving(p=>({...p,[row.id]:true}))
    saveTimers.current[row.id] = setTimeout(()=>{
      setRows(cur=>{
        const r=cur[idx]
        if(r) saveRow({...r,[key]:val})
        return cur
      })
    }, 1500)
  }

  async function addRow(){
    const newRow = {
      id:'new_'+Date.now(), staff_id:currentStaff?.id,
      date:selDate, time_from:'', time_to:'',
      shooting:'', fahrstrecke:'', from_addr:currentStaff?.address||'', to_addr:'',
      kunde:'', zweck:'Fotoshooting', km_start:null, km_end:null, km:null, _saved:false
    }
    setRows(prev=>[...prev, newRow])
  }

  async function deleteRow(idx){
    const row = rows[idx]
    if(row.id && !row.id.startsWith('new_')){
      await supabase.from('fahrtenbuch_rows').delete().eq('id', row.id)
    }
    setRows(prev=>prev.filter((_,i)=>i!==idx))
  }

  const totalKm = rows.reduce((s,r)=>s+(parseFloat(r.km)||0),0)
  const totalCost = (totalKm*RATE).toFixed(2)
  const monthLabel = new Date(selDate).toLocaleDateString('de-DE',{month:'long',year:'numeric'})
  const clientNames = [...new Set(cards.filter(c=>c.client_name).map(c=>c.client_name))].sort()

  const IS = {background:'transparent',border:'none',outline:'none',fontSize:11,color:'var(--t1)',width:'100%',fontFamily:'Arial',padding:0}

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:'var(--bg)',fontFamily:'Arial,sans-serif'}}>

      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:14,fontWeight:700,color:'var(--t1)',display:'flex',alignItems:'center',gap:6}}>
          <i className="ti ti-car" style={{fontSize:16,color:'#b8892a'}} /> Fahrtenbuch
        </span>
        {isAdmin && (
          <select value={selStaffId||''} onChange={e=>setSelStaffId(e.target.value)}
            style={{border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',fontSize:12,background:'var(--bg3)',color:'var(--t1)',outline:'none'}}>
            {staff.filter(s=>s.address).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
          <button onClick={()=>{const d=new Date(selDate);d.setMonth(d.getMonth()-1);setSelDate(d.toISOString().slice(0,10))}}
            style={{background:'var(--bg3)',border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',cursor:'pointer',color:'var(--t2)',fontSize:14}}>‹</button>
          <span style={{fontSize:12,fontWeight:700,color:'var(--t1)',minWidth:130,textAlign:'center'}}>{monthLabel}</span>
          <button onClick={()=>{const d=new Date(selDate);d.setMonth(d.getMonth()+1);setSelDate(d.toISOString().slice(0,10))}}
            style={{background:'var(--bg3)',border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',cursor:'pointer',color:'var(--t2)',fontSize:14}}>›</button>
        </div>
        {calcLoading && <span style={{fontSize:11,color:'#b8892a'}}>⟳ km wird berechnet...</span>}
      </div>

      {/* Staff info */}
      {currentStaff && (
        <div style={{padding:'8px 16px',borderBottom:'0.5px solid var(--border)',background:'var(--bg2)',display:'flex',gap:20,flexWrap:'wrap'}}>
          <div><span style={{fontSize:9,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.4px'}}>Name</span><div style={{fontSize:12,fontWeight:700,color:'var(--t1)',marginTop:2}}>{currentStaff.name}</div></div>
          <div><span style={{fontSize:9,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.4px'}}>Adresse</span><div style={{fontSize:12,color:'var(--t2)',marginTop:2}}>{currentStaff.address||'—'}</div></div>
          <div>
            <span style={{fontSize:9,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.4px'}}>Kennzeichen</span>
            <input value={licensePlate} onChange={e=>{
              const v=e.target.value; setLicensePlate(v)
              clearTimeout(lpTimer.current)
              lpTimer.current=setTimeout(async()=>{
                await supabase.from('staff').update({license_plate:v}).eq('id',currentStaff.id)
              },1200)
            }} placeholder="z.B. MA-DB 123"
              style={{display:'block',marginTop:2,background:'var(--bg3)',border:'0.5px solid var(--border)',borderRadius:5,padding:'3px 7px',fontSize:12,color:'var(--t1)',outline:'none',width:120}} />
          </div>
        </div>
      )}

      {!currentStaff?.address && (
        <div style={{margin:14,padding:12,background:'#fffbeb',border:'0.5px solid #fde68a',borderRadius:9,fontSize:12,color:'#92400e'}}>
          <i className="ti ti-alert-triangle" style={{fontSize:13}} /> Keine Heimadresse — bitte im Mitarbeiter-Profil eintragen.
        </div>
      )}

      {/* Table */}
      <div style={{flex:1,overflowY:'auto',overflowX:'auto',padding:'12px 16px'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:920,tableLayout:'fixed'}}>
          <colgroup>
            <col style={{width:80}} /><col style={{width:135}} /><col style={{width:120}} />
            <col style={{width:130}} /><col style={{width:100}} /><col style={{width:110}} />
            <col style={{width:70}} /><col style={{width:70}} /><col style={{width:55}} />
            <col style={{width:65}} /><col style={{width:32}} />
          </colgroup>
          <thead>
            <tr style={{background:'var(--bg3)'}}>
              {['Datum','Von – Bis','Shooting','Fahrstrecke','Kunde','Zweck','km Anf.','km Ende','km','Kosten',''].map((h,i)=>(
                <th key={i} style={{fontSize:9,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.4px',padding:'7px 8px',borderBottom:'0.5px solid var(--border)',textAlign:i>=6&&i<=9?'right':'left'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row,i)=>(
              <tr key={row.id} style={{borderBottom:'0.5px solid var(--border)',opacity:saving[row.id]?0.7:1}}>
                <td style={{padding:'6px 8px'}}><input type="date" value={row.date||''} onChange={e=>updateRow(i,'date',e.target.value)} style={IS} /></td>
                <td style={{padding:'6px 8px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:3}}>
                    <input type="time" value={row.time_from||''} onChange={e=>updateRow(i,'time_from',e.target.value)} style={{...IS,width:58}} />
                    <span style={{color:'var(--t3)',fontSize:10,flexShrink:0}}>–</span>
                    <input type="time" value={row.time_to||''} onChange={e=>updateRow(i,'time_to',e.target.value)} style={{...IS,width:58}} />
                  </div>
                </td>
                <td style={{padding:'6px 8px'}}><input value={row.shooting||''} onChange={e=>updateRow(i,'shooting',e.target.value)} style={IS} placeholder="—" /></td>
                <td style={{padding:'6px 8px'}}><input value={row.fahrstrecke||''} onChange={e=>updateRow(i,'fahrstrecke',e.target.value)} style={IS} placeholder="Von → Nach" /></td>
                <td style={{padding:'6px 8px'}}>
                  <input list={`cl-${i}`} value={row.kunde||''} onChange={e=>updateRow(i,'kunde',e.target.value)} style={IS} placeholder="Kunde..." />
                  <datalist id={`cl-${i}`}>{clientNames.map(n=><option key={n} value={n}/>)}</datalist>
                </td>
                <td style={{padding:'6px 8px'}}><input value={row.zweck||''} onChange={e=>updateRow(i,'zweck',e.target.value)} style={IS} placeholder="Zweck" /></td>
                <td style={{padding:'6px 8px'}}><input type="number" value={row.km_start||''} onChange={e=>updateRow(i,'km_start',e.target.value?parseFloat(e.target.value):null)} style={{...IS,textAlign:'right'}} placeholder="—" /></td>
                <td style={{padding:'6px 8px'}}><input type="number" value={row.km_end||''} onChange={e=>updateRow(i,'km_end',e.target.value?parseFloat(e.target.value):null)} style={{...IS,textAlign:'right'}} placeholder="—" /></td>
                <td style={{padding:'6px 8px',textAlign:'right'}}>
                  <input type="number" value={row.km||''} onChange={e=>updateRow(i,'km',e.target.value?parseFloat(e.target.value):null)} style={{...IS,textAlign:'right',color:'#b8892a',fontWeight:700}} placeholder="—" />
                  {saving[row.id] && <span style={{fontSize:8,color:'var(--t3)',display:'block'}}>💾</span>}
                </td>
                <td style={{padding:'6px 8px',textAlign:'right',fontSize:11,fontWeight:700,color:'#15803d'}}>{row.km ? (parseFloat(row.km)*RATE).toFixed(2)+' €' : '—'}</td>
                <td style={{padding:'6px 4px',textAlign:'center'}}>
                  <button onClick={()=>deleteRow(i)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--t3)',fontSize:13,padding:'2px'}}>
                    <i className="ti ti-trash" style={{fontSize:11}} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length>0 && (
            <tfoot>
              <tr style={{background:'var(--bg3)',borderTop:'1px solid var(--border)'}}>
                <td colSpan={8} style={{padding:'8px',fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.4px'}}>{monthLabel} — Gesamt</td>
                <td style={{padding:'8px',textAlign:'right',fontSize:13,fontWeight:700,color:'#b8892a'}}>{totalKm.toFixed(1)}</td>
                <td style={{padding:'8px',textAlign:'right',fontSize:13,fontWeight:700,color:'#15803d'}}>{totalCost} €</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>

        {rows.length===0 && currentStaff?.address && (
          <div style={{textAlign:'center',padding:40,color:'var(--t3)',fontSize:13}}>Keine Fahrten in diesem Zeitraum</div>
        )}

        <div onClick={addRow} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 10px',cursor:'pointer',color:'var(--t3)',fontSize:11,marginTop:4,borderRadius:7,border:'0.5px dashed var(--border)'}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>
          <i className="ti ti-plus" style={{fontSize:12}} /> Manuelle Fahrt hinzufügen
        </div>
      </div>
    </div>
  )
}
