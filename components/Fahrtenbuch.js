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

  async function recalcKm(rowsToCalc, opts={}){
    const announce = !!opts.announce
    if(!rowsToCalc || rowsToCalc.length===0){ if(announce) alert('Keine Zeilen mit Von- und Bis-Adresse zum Berechnen.'); return }
    setCalcLoading(true)
    let updated=0, failed=0, noKey=false
    for(const row of rowsToCalc){
      try{
        const res = await fetch('/api/fahrtenbuch/distance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stops:[row.from_addr,row.to_addr]})})
        const d = await res.json()
        if(d.ok===false && d.reason==='no api key'){ noKey=true; break }
        if(d.ok&&d.legs&&d.legs[0]&&d.legs[0].distance){
          const km = parseFloat((d.legs[0].distance/1000).toFixed(1))
          if(row.id) await supabase.from('fahrtenbuch_rows').update({km}).eq('id',row.id)
          setRows(prev=>prev.map(r=>r.id===row.id?{...r,km}:r))
          updated++
        } else { failed++ }
      }catch(e){ failed++ }
    }
    setCalcLoading(false)
    if(announce){
      if(noKey) alert('Google Maps API-Key fehlt. Bitte NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in Vercel setzen.')
      else if(updated===0 && failed>0) alert('Keine Strecke konnte berechnet werden ('+failed+' Adresse(n) nicht gefunden).')
      else if(failed>0) alert(updated+' km neu berechnet, '+failed+' Adresse(n) nicht gefunden.')
    }
  }
  const recalcMissingKm = (r)=>recalcKm(r)

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
    // Fill missing to_addr from cards
    const fixedRows = existingRows.map(r => {
      if(!r.to_addr && r.source_card_id) {
        const card = cards.find(c => c.id === r.source_card_id)
        if(card?.addr) return {...r, to_addr: card.addr}
      }
      if(!r.from_addr && currentStaff?.address) {
        return {...r, from_addr: currentStaff.address}
      }
      return r
    })
    // Save fixed addresses back to DB
    for(const r of fixedRows) {
      if(existingRows.find(er => er.id === r.id && (!er.to_addr || !er.from_addr))) {
        await supabase.from('fahrtenbuch_rows').update({
          to_addr: r.to_addr||null,
          from_addr: r.from_addr||null
        }).eq('id', r.id)
      }
    }
    // Recalc km for rows missing it
    const needsKm = fixedRows.filter(r=>(r.km===null||r.km===0)&&r.from_addr&&r.to_addr)
    if(needsKm.length>0) recalcMissingKm(needsKm)

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
      setRows(fixedRows.map(r=>({...r,_saved:true})))
      return
    }

    // Group by date, then chain stops with 3h gap = home return
    const byDate = {}
    for(const c of staffCards){
      if(!byDate[c.card_date]) byDate[c.card_date] = []
      byDate[c.card_date].push(c)
    }
    const newRows = []
    for(const [date, dayCards] of Object.entries(byDate)){
      dayCards.sort((a,b)=>(a.card_time||'').localeCompare(b.card_time||''))
      // Build legs: chain stops, reset to home if gap > 3h
      let prevAddr = home
      let prevEndTime = null
      for(let i=0;i<dayCards.length;i++){
        const c = dayCards[i]
        const startTime = c.card_time ? c.card_time.slice(0,5) : null
        // Check gap from previous END time (card_time_to) to current START
        let fromAddr = prevAddr
        if(prevEndTime && startTime){
          const [ph,pm] = prevEndTime.split(':').map(Number)
          const [sh,sm] = startTime.split(':').map(Number)
          const gapMins = (sh*60+sm) - (ph*60+pm)
          // Only reset to home if gap >= 3h AND previous had an end time
          if(gapMins >= 180) fromAddr = home
        } else if(!prevEndTime && prevAddr !== home) {
          // Previous had no end time — can't determine gap, stay chained
          fromAddr = prevAddr
        }
        const shortFrom = fromAddr.split(',')[0]
        const shortTo = (c.addr||'').split(',')[0]
        newRows.push({
          id: 'new_'+c.id+'_'+Date.now(),
          staff_id: currentStaff.id,
          date: c.card_date,
          time_from: startTime||'08:00',
          time_to: c.card_time_to?.slice(0,5)||'',
          shooting: c.title||'—',
          fahrstrecke: fromAddr && c.addr ? shortFrom+' → '+shortTo : c.addr||'',
          from_addr: fromAddr,
          to_addr: c.addr||'',
          kunde: c.client_name||'',
          zweck: 'Fotoshooting',
          km_start: null, km_end: null, km: null,
          _saved: false, source_card_id: c.id,
        })
        prevAddr = c.addr||prevAddr
        // Use card_time_to if available, otherwise estimate end = start (no gap calc possible)
        prevEndTime = c.card_time_to?.slice(0,5) || null
      }
      // Last leg: home return
      const lastCard = dayCards[dayCards.length-1]
      if(lastCard?.addr && home){
        newRows.push({
          id: 'new_home_'+date+'_'+Date.now(),
          staff_id: currentStaff.id,
          date,
          time_from: lastCard.card_time_to?.slice(0,5)||'',
          time_to: '',
          shooting: 'Heimfahrt',
          fahrstrecke: lastCard.addr.split(',')[0]+' → '+home.split(',')[0],
          from_addr: lastCard.addr,
          to_addr: home,
          kunde: '',
          zweck: 'Heimfahrt',
          km_start: null, km_end: null, km: null,
          _saved: false, source_card_id: null,
        })
      }
    }
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

  function getExportData() {
    const headers = ['Datum','Von','Bis','Shooting','Fahrstrecke','Kunde','Zweck','km Anfang','km Ende','km','Kosten (€)']
    const rowData = rows.map(r => [
      r.date||'',
      r.time_from||'',
      r.time_to||'',
      r.shooting||'',
      r.fahrstrecke||'',
      r.kunde||'',
      r.zweck||'',
      r.km_start||'',
      r.km_end||'',
      r.km||'',
      r.km ? (parseFloat(r.km)*RATE).toFixed(2) : ''
    ])
    return { headers, rowData }
  }

  function exportCSV() {
    const { headers, rowData } = getExportData()
    const csv = [headers, ...rowData].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `Fahrtenbuch_${currentStaff?.name||''}_${monthLabel}.csv`; a.click()
  }

  function exportExcel() {
    const { headers, rowData } = getExportData()
    // Build simple XML spreadsheet
    const xml = ['<?xml version="1.0"?>',
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
      '<Worksheet ss:Name="Fahrtenbuch"><Table>',
      '<Row>'+headers.map(h=>`<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')+'</Row>',
      ...rowData.map(row => '<Row>'+row.map(v=>`<Cell><Data ss:Type="String">${String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`).join('')+'</Row>'),
      '</Table></Worksheet></Workbook>'
    ].join('')
    const blob = new Blob([xml], {type:'application/vnd.ms-excel'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `Fahrtenbuch_${currentStaff?.name||''}_${monthLabel}.xls`; a.click()
  }

  function exportPDF() {
    const { headers, rowData } = getExportData()
    const totalKmVal = rows.reduce((s,r)=>s+(parseFloat(r.km)||0),0)
    const totalCostVal = (totalKmVal*RATE).toFixed(2)
    const style = 'body{font-family:Arial,sans-serif;font-size:11px;margin:20px}h2{font-size:14px;margin-bottom:4px}.meta{font-size:11px;color:#666;margin-bottom:12px}table{width:100%;border-collapse:collapse}th{background:#f4f2ef;font-size:9px;text-transform:uppercase;padding:5px 6px;border:0.5px solid #ddd;text-align:left}td{padding:5px 6px;border:0.5px solid #ddd;font-size:10px}tr:nth-child(even){background:#fafafa}.total{font-weight:bold;background:#f4f2ef}'
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'+style+'</style></head><body>'
      +'<h2>Fahrtenbuch — '+(currentStaff?.name||'')+'</h2>'
      +'<div class="meta">'+monthLabel+' · Kennzeichen: '+(licensePlate||'—')+' · Heimadresse: '+(currentStaff?.address||'—')+'</div>'
      +'<table><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'
      +rowData.map(row=>'<tr>'+row.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')
      +'<tr class="total"><td colspan="9">Gesamt</td><td>'+totalKmVal.toFixed(1)+'</td><td>'+totalCostVal+'</td></tr>'
      +'</tbody></table></body></html>'
    const w = window.open('','_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

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
        <div style={{display:'flex',gap:5}}>
          <button onClick={exportCSV} style={{background:'none',border:'0.5px solid var(--border)',borderRadius:6,padding:'3px 8px',fontSize:11,cursor:'pointer',color:'var(--t3)',display:'flex',alignItems:'center',gap:4}}>
            <i className="ti ti-file-spreadsheet" style={{fontSize:11}}/> CSV
          </button>
          <button onClick={exportExcel} style={{background:'none',border:'0.5px solid var(--border)',borderRadius:6,padding:'3px 8px',fontSize:11,cursor:'pointer',color:'var(--t3)',display:'flex',alignItems:'center',gap:4}}>
            <i className="ti ti-file-excel" style={{fontSize:11}}/> Excel
          </button>
          <button onClick={exportPDF} style={{background:'none',border:'0.5px solid var(--border)',borderRadius:6,padding:'3px 8px',fontSize:11,cursor:'pointer',color:'var(--t3)',display:'flex',alignItems:'center',gap:4}}>
            <i className="ti ti-file-type-pdf" style={{fontSize:11}}/> PDF
          </button>
        </div>
        {calcLoading
          ? <span style={{fontSize:11,color:'#b8892a'}}>⟳ km wird berechnet...</span>
          : <button onClick={()=>recalcKm(rows.filter(r=>r.id&&r.from_addr&&r.to_addr),{announce:true})}
              style={{background:'none',border:'0.5px solid var(--border)',borderRadius:6,padding:'3px 8px',fontSize:11,cursor:'pointer',color:'var(--t3)',display:'flex',alignItems:'center',gap:4}}>
              <i className="ti ti-refresh" style={{fontSize:11}}/> km neu
            </button>
        }
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
