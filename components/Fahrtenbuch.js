'use client'
import { useState, useEffect, useMemo } from 'react'

function pad(n){return String(n).padStart(2,'0')}
function fmtDate(s){if(!s)return'—';const d=new Date(s+'T00:00:00');return pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+String(d.getFullYear()).slice(2)}
function fmtKm(m){if(!m&&m!==0)return'—';return(m/1000).toFixed(1)}
function getMonthDates(date){const d=new Date(date);return{from:new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10),to:new Date(d.getFullYear(),d.getMonth()+1,0).toISOString().slice(0,10)}}

const RATE = 0.30

export default function Fahrtenbuch({staff, cards, me, isAdmin, supabase}){
  const [selStaffId, setSelStaffId] = useState(()=>me?.id||null)
  const [selDate, setSelDate] = useState(new Date().toISOString().slice(0,10))
  const [rows, setRows] = useState([]) // manual rows
  const [calcLoading, setCalcLoading] = useState(false)
  const [licensePlate, setLicensePlate] = useState('')

  const currentStaff = staff.find(s=>s.id===selStaffId)||me
  const {from,to} = getMonthDates(selDate)

  // Build rows from cards in date range
  useEffect(()=>{
    if(!currentStaff) return
    const home = currentStaff.address||''
    const staffCards = cards.filter(c=>{
      if(!c.card_date||!c.addr) return false
      if(c.card_date<from||c.card_date>to) return false
      return true
    }).sort((a,b)=>{
      if(a.card_date!==b.card_date) return a.card_date.localeCompare(b.card_date)
      return (a.card_time||'').localeCompare(b.card_time||'')
    })

    const newRows = staffCards.map(c=>({
      id: c.id,
      date: c.card_date,
      timeFrom: c.card_time?.slice(0,5)||'',
      timeTo: c.card_time_to?.slice(0,5)||'',
      fahrstrecke: home && c.addr ? home.split(',')[0]+' → '+c.addr.split(',')[0] : c.addr||'',
      from: home,
      to: c.addr||'',
      fotoing: c.title||'',
      kunde: c.client_name||'',
      zweck: 'Fotoshooting',
      kmStart: '',
      kmEnd: '',
      km: null,
      loading: true,
      cardId: c.id,
    }))
    setRows(newRows)
    if(newRows.length>0 && home) calcDistances(newRows, home)
  },[cards, currentStaff, from, to])

  async function calcDistances(rowsData, home){
    setCalcLoading(true)
    const updated = [...rowsData]
    for(let i=0;i<updated.length;i++){
      const r = updated[i]
      if(!r.from||!r.to) { r.loading=false; continue }
      try{
        const res = await fetch('/api/fahrtenbuch/distance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stops:[r.from,r.to]})})
        const d = await res.json()
        if(d.ok&&d.legs[0]){
          r.km = (d.legs[0].distance/1000).toFixed(1)
          r.loading=false
        }
      }catch(e){r.loading=false}
    }
    setRows([...updated])
    setCalcLoading(false)
  }

  function updateRow(idx, key, val){
    setRows(prev=>{const n=[...prev];n[idx]={...n[idx],[key]:val};return n})
  }

  function addRow(){
    setRows(prev=>[...prev,{
      id:'manual_'+Date.now(), date:selDate, timeFrom:'', timeTo:'',
      fahrstrecke:'', from:currentStaff?.address||'', to:'',
      fotoing:'', kunde:'', zweck:'Fotoshooting',
      kmStart:'', kmEnd:'', km:null, loading:false, manual:true
    }])
  }

  function deleteRow(idx){ setRows(prev=>prev.filter((_,i)=>i!==idx)) }

  const totalKm = rows.reduce((s,r)=>s+(parseFloat(r.km)||0),0)
  const totalCost = (totalKm*RATE).toFixed(2)
  const monthLabel = new Date(selDate).toLocaleDateString('de-DE',{month:'long',year:'numeric'})

  const clientNames = [...new Set(cards.filter(c=>c.client_name).map(c=>c.client_name))].sort()

  const IS = {background:'transparent',border:'none',outline:'none',fontSize:11,color:'var(--t1)',width:'100%',fontFamily:'Arial',padding:0}
  const IS_FOCUS = 'background:var(--bg3);border-radius:4px;padding:2px 4px'

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

      {/* Staff info row */}
      {currentStaff && (
        <div style={{padding:'8px 16px',borderBottom:'0.5px solid var(--border)',background:'var(--bg2)',display:'flex',gap:20,flexWrap:'wrap'}}>
          <div>
            <span style={{fontSize:9,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.4px'}}>Name</span>
            <div style={{fontSize:12,fontWeight:700,color:'var(--t1)',marginTop:2}}>{currentStaff.name}</div>
          </div>
          <div>
            <span style={{fontSize:9,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.4px'}}>Adresse</span>
            <div style={{fontSize:12,color:'var(--t2)',marginTop:2}}>{currentStaff.address||<span style={{color:'var(--t3)',fontStyle:'italic'}}>Keine Adresse hinterlegt</span>}</div>
          </div>
          <div>
            <span style={{fontSize:9,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.4px'}}>Kennzeichen</span>
            <input value={licensePlate} onChange={e=>setLicensePlate(e.target.value)} placeholder="z.B. MA-DB 123"
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
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:900,tableLayout:'fixed'}}>
          <colgroup>
            <col style={{width:80}} />
            <col style={{width:100}} />
            <col style={{width:120}} />
            <col style={{width:130}} />
            <col style={{width:100}} />
            <col style={{width:110}} />
            <col style={{width:70}} />
            <col style={{width:70}} />
            <col style={{width:55}} />
            <col style={{width:65}} />
            <col style={{width:32}} />
          </colgroup>
          <thead>
            <tr style={{background:'var(--bg3)'}}>
              {['Datum','Von – Bis','Fotózás','Fahrstrecke','Kunde','Zweck','km Anf.','km Ende','km','Kosten',''].map((h,i)=>(
                <th key={i} style={{fontSize:9,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.4px',padding:'7px 8px',borderBottom:'0.5px solid var(--border)',textAlign:i>=6&&i<=9?'right':'left'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row,i)=>(
              <tr key={row.id} style={{borderBottom:'0.5px solid var(--border)'}}>
                <td style={{padding:'6px 8px'}}>
                  <input type="date" value={row.date} onChange={e=>updateRow(i,'date',e.target.value)} style={IS} />
                </td>
                <td style={{padding:'6px 8px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:3}}>
                    <input type="time" value={row.timeFrom} onChange={e=>updateRow(i,'timeFrom',e.target.value)} style={{...IS,width:50}} />
                    <span style={{color:'var(--t3)',fontSize:10,flexShrink:0}}>–</span>
                    <input type="time" value={row.timeTo} onChange={e=>updateRow(i,'timeTo',e.target.value)} style={{...IS,width:50}} />
                  </div>
                </td>
                <td style={{padding:'6px 8px'}}>
                  <input value={row.fotoing} onChange={e=>updateRow(i,'fotoing',e.target.value)} style={IS} placeholder="—" />
                </td>
                <td style={{padding:'6px 8px'}}>
                  <input value={row.fahrstrecke} onChange={e=>updateRow(i,'fahrstrecke',e.target.value)} style={IS} placeholder="Von → Nach" />
                </td>
                <td style={{padding:'6px 8px'}}>
                  {row.manual ? (
                    <input list={`cl-${i}`} value={row.kunde} onChange={e=>updateRow(i,'kunde',e.target.value)} style={IS} placeholder="Kunde..." />
                  ) : (
                    <select value={row.kunde} onChange={e=>updateRow(i,'kunde',e.target.value)}
                      style={{...IS,cursor:'pointer'}}>
                      {clientNames.map(n=><option key={n} value={n}>{n}</option>)}
                      <option value="">— Leer —</option>
                    </select>
                  )}
                  <datalist id={`cl-${i}`}>
                    {clientNames.map(n=><option key={n} value={n}/>)}
                  </datalist>
                </td>
                <td style={{padding:'6px 8px'}}>
                  <input value={row.zweck} onChange={e=>updateRow(i,'zweck',e.target.value)} style={IS} placeholder="Zweck" />
                </td>
                <td style={{padding:'6px 8px'}}>
                  <input type="number" value={row.kmStart} onChange={e=>updateRow(i,'kmStart',e.target.value)} style={{...IS,textAlign:'right'}} placeholder="—" />
                </td>
                <td style={{padding:'6px 8px'}}>
                  <input type="number" value={row.kmEnd} onChange={e=>updateRow(i,'kmEnd',e.target.value)} style={{...IS,textAlign:'right'}} placeholder="—" />
                </td>
                <td style={{padding:'6px 8px',textAlign:'right'}}>
                  {row.loading ? <span style={{color:'var(--t3)',fontSize:10}}>⟳</span> :
                    <input type="number" value={row.km||''} onChange={e=>updateRow(i,'km',e.target.value)} style={{...IS,textAlign:'right',color:'#b8892a',fontWeight:700}} placeholder="—" />
                  }
                </td>
                <td style={{padding:'6px 8px',textAlign:'right',fontSize:11,fontWeight:700,color:'#15803d'}}>
                  {row.km ? (parseFloat(row.km)*RATE).toFixed(2)+' €' : '—'}
                </td>
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
