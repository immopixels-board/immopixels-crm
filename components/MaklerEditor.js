'use client'
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

const IS = { background:'var(--bg3)', border:'1.5px solid var(--border)', borderRadius:7, padding:'6px 9px', fontSize:12, color:'var(--t1)', fontFamily:'Arial', outline:'none', width:'100%' }
const LS = { fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3, display:'block' }

const MF_IS = { background:'var(--bg3)', border:'1.5px solid var(--border)', borderRadius:7, padding:'6px 9px', fontSize:12, color:'var(--t1)', fontFamily:'Arial', outline:'none', width:'100%' }
const MF_LS = { fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3, display:'block' }

function MaklerForm({ form, setForm, onSave, onCancel }) {
  return (
    <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:12, marginTop:6 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
        <div><label style={MF_LS}>Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Max Mustermann" style={MF_IS}/></div>
        <div><label style={MF_LS}>Position</label><input value={form.position} onChange={e=>setForm(p=>({...p,position:e.target.value}))} placeholder="Makler" style={MF_IS}/></div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
        <div><label style={MF_LS}>Email</label><input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} style={MF_IS}/></div>
        <div><label style={MF_LS}>Telefon</label><input value={form.tel} onChange={e=>setForm(p=>({...p,tel:e.target.value}))} style={MF_IS}/></div>
      </div>
      <div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
        <button onClick={onCancel} style={{ background:'none', border:'1.5px solid var(--brd2)', color:'var(--t2)', borderRadius:7, padding:'5px 12px', fontSize:12, fontWeight:700, cursor:'pointer' }}>Abbrechen</button>
        <button onClick={onSave} style={{ background:'var(--gold)', color:'#fff', border:'none', borderRadius:7, padding:'5px 12px', fontSize:12, fontWeight:700, cursor:'pointer' }}><i className="ti ti-device-floppy" style={{fontSize:12,marginRight:4}}/> Speichern</button>
      </div>
    </div>
  )
}

export default function MaklerEditor({ clientId, maklers, onReload }) {
  const list = (clientId && maklers[clientId]) || []
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name:'', email:'', tel:'', position:'' })

  function startEdit(m) {
    setEditingId(m.id)
    setForm({ name:m.name||'', email:m.email||'', tel:m.tel||'', position:m.position||'' })
    setAdding(false)
  }

  async function saveMakler(id) {
    if (!form.name.trim()) return
    await supabase.from('client_maklers').update({
      name: form.name.trim(), email: form.email.trim(),
      tel: form.tel.trim(), position: form.position.trim(),
    }).eq('id', id)
    setEditingId(null)
    onReload()
  }

  async function addMakler() {
    if (!form.name.trim() || !clientId) return
    await supabase.from('client_maklers').insert({
      client_id: clientId, name: form.name.trim(),
      email: form.email.trim(), tel: form.tel.trim(), position: form.position.trim(),
    })
    setForm({ name:'', email:'', tel:'', position:'' })
    setAdding(false)
    onReload()
  }

  async function deleteMakler(id) {
    if (!confirm('Diesen Makler wirklich löschen?')) return
    await supabase.from('client_maklers').delete().eq('id', id)
    onReload()
  }



  return (
    <div style={{ marginBottom: 14 }}>
      {list.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>Noch kein Makler hinzugefügt</div>
      )}
      {list.map(m => (
        <div key={m.id}>
          {editingId === m.id ? (
            <MaklerForm
              form={form} setForm={setForm}
              onSave={() => saveMakler(m.id)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'var(--bg3)', borderRadius:8, marginBottom:6, border:'1px solid var(--border)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700 }}>{m.name}{m.position && <span style={{ fontSize:11, color:'var(--t3)', fontWeight:400 }}> · {m.position}</span>}</div>
                {m.email && <div style={{ fontSize:11, color:'var(--blue)' }}>📧 {m.email}</div>}
                {m.tel && <div style={{ fontSize:11, color:'var(--t2)' }}>📞 {m.tel}</div>}
              </div>
              <button onClick={() => startEdit(m)} title="Bearbeiten" style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', padding:'4px 5px', borderRadius:5, display:'flex', alignItems:'center', transition:'color .12s' }} onMouseEnter={e=>e.currentTarget.style.color='var(--gold)'} onMouseLeave={e=>e.currentTarget.style.color='var(--t3)'}><i className="ti ti-pencil" style={{fontSize:13}}/></button>
              <button onClick={() => deleteMakler(m.id)} title="Löschen" style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', padding:'4px 5px', borderRadius:5, display:'flex', alignItems:'center', transition:'color .12s' }} onMouseEnter={e=>e.currentTarget.style.color='var(--red)'} onMouseLeave={e=>e.currentTarget.style.color='var(--t3)'}><i className="ti ti-x" style={{fontSize:13}}/></button>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <MaklerForm
          form={form} setForm={setForm}
          onSave={addMakler}
          onCancel={() => { setAdding(false); setForm({ name:'', email:'', tel:'', position:'' }) }}
        />
      ) : (
        <button onClick={() => { if(!clientId){alert('Bitte zuerst den Kunden speichern.');return}; setAdding(true); setEditingId(null); setForm({ name:'', email:'', tel:'', position:'' }) }}
          style={{ background:'none', border:'1.5px dashed var(--brd2)', color:'var(--t3)', borderRadius:7, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer', width:'100%', marginTop:4 }}>
          <i className="ti ti-plus" style={{fontSize:11,marginRight:5}}/> Makler hinzufügen
        </button>
      )}
    </div>
  )
}
