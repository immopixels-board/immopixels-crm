'use client'
import { useState, useEffect, useRef } from 'react'

const CARD_COLORS = [
  { key: '', bg: '#fff', br: '#ccc8c0', label: 'Keine' },
  { key: 'peach', bg: '#FFBE98', br: '#FFBE98', label: 'Peach Fuzz', cardBg: 'rgba(255,190,152,.12)', cardBr: 'rgba(255,190,152,.4)' },
  { key: 'sage', bg: '#9CAF88', br: '#9CAF88', label: 'Sage', cardBg: 'rgba(156,175,136,.12)', cardBr: 'rgba(156,175,136,.4)' },
  { key: 'rose', bg: '#D4A5A5', br: '#D4A5A5', label: 'Mellow Rose', cardBg: 'rgba(212,165,165,.12)', cardBr: 'rgba(212,165,165,.4)' },
]

const DAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

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

export default function CardModal({ card, cols, staff, supabase, onClose, onUpdate, currentStaff, sendNotification }) {
  const [saved, setSaved] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [localCard, setLocalCard] = useState(card)
  const [attachments, setAttachments] = useState([])
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [commentMentions, setCommentMentions] = useState([])
  const [commentMentionIdx, setCommentMentionIdx] = useState(0)
  const [dragOver, setDragOver] = useState(false)
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
    const text = commentText.trim()
    if (!text || !currentStaff?.id) return
    const mentioned = parseMentionedStaffIds(text)
    const { error } = await supabase.from('card_comments').insert({ card_id: card.id, staff_id: currentStaff.id, message: text, mentioned_staff_ids: mentioned })
    if (error) { alert('Kommentar konnte nicht gespeichert werden. Bitte card_comments SQL ausführen.'); return }
    setCommentText('')
    setCommentMentions([])
    loadComments()
    for (const recipientId of mentioned) {
      await sendNotification?.(supabase, { recipientId, senderId: currentStaff.id, type: 'card_mention', cardId: card.id, message: text })
    }
  }

  function renderCommentText(text) {
    const parts = String(text || '').split(/(@[A-Za-zÀ-ž0-9_.-]+)/g)
    return parts.map((part, idx) => part.startsWith('@') ? <span key={idx} style={{ color:'#b8892a', fontWeight:700 }}>{part}</span> : part)
  }

  async function save(field, value) {
    const upd = { [field]: value }
    if (field !== 'card_color') upd.updated_at = new Date().toISOString()
    await supabase.from('cards').update(upd).eq('id', card.id)
    setLocalCard(p => ({ ...p, [field]: value }))
    onUpdate()
    setSaved(true)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaved(false), 2500)
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,26,22,.45)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn .15s ease' }}>
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
                {!localCard.is_todo && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(184,137,42,.12)', color: '#7a5a18', border: '0.5px solid rgba(184,137,42,.3)' }}>{localCard.card_type?.toUpperCase() || 'FOTO'}</span>}
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
                <EditableField value={localCard.addr} onSave={v => save('addr', v)} placeholder="Adresse hinzufügen..." style={{ fontSize: 12, color: '#8a8278' }} />
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
            </div>
            <div style={{ background: '#f4f2ef', borderRadius: 8, padding: '10px 12px', position: 'relative' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>Termin</div>
              <div onClick={() => setDatePickerOpen(p => !p)} style={{ fontSize: 13, fontWeight: 600, color: '#b8892a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="ti ti-calendar-event" style={{ fontSize: 12 }} />
                {localCard.card_date ? fmtDate(localCard.card_date) + (localCard.card_time ? ' ' + localCard.card_time.slice(0,5) : '') : 'Datum wählen...'}
              </div>
              {datePickerOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '0.5px solid #ddd9d2', borderRadius: 10, padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,.1)', zIndex: 10, marginTop: 4 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="date" value={localCard.card_date || ''} onChange={e => { save('card_date', e.target.value) }}
                      style={{ flex: 1, background: '#f4f2ef', border: '0.5px solid #ddd9d2', borderRadius: 6, padding: '6px 10px', fontSize: 13, fontWeight: 600, outline: 'none' }} />
                    <input type="time" value={localCard.card_time?.slice(0,5) || ''} onChange={e => { save('card_time', e.target.value) }}
                      style={{ width: 90, background: '#f4f2ef', border: '0.5px solid #ddd9d2', borderRadius: 6, padding: '6px 10px', fontSize: 13, fontWeight: 600, outline: 'none' }} />
                  </div>
                  <button onClick={() => setDatePickerOpen(false)} style={{ marginTop: 8, background: '#1c1a16', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', width: '100%' }}>Schließen</button>
                </div>
              )}
            </div>
            <div style={{ background: '#f4f2ef', borderRadius: 8, padding: '10px 12px', gridColumn: 'span 2' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>Beschreibung</div>
              <EditableField value={localCard.description} onSave={v => save('description', v)} multiline placeholder="Beschreibung hinzufügen..." style={{ fontSize: 12, color: '#4a4540' }} />
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

          {/* Notiz */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>Notiz</div>
            <EditableField value={localCard.note} onSave={v => save('note', v)} multiline placeholder="Notiz hinzufügen..." style={{ fontSize: 12, color: '#4a4540', background: '#f4f2ef', borderRadius: 8, padding: '10px 12px', minHeight: 60, display: 'block', width: '100%' }} />
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

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '0.5px solid #eeeae6', display: 'flex', gap: 8, alignItems: 'center', background: '#faf9f7', flexShrink: 0 }}>
          <button onClick={() => { /* open send modal */ }} style={{ background: '#c9a05a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-send" style={{ fontSize: 13 }} /> Senden
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: saved ? '#15803d' : '#aaa8a0', gap: 4, transition: 'color .3s' }}>
            <i className={'ti ' + (saved ? 'ti-check' : 'ti-cloud')} style={{ fontSize: 12 }} />
            {saved ? 'Automatisch gespeichert' : 'Änderungen werden automatisch gespeichert'}
          </div>
          <button onClick={async () => { if (!confirm('Karte wirklich löschen?')) return; await supabase.from('card_team').delete().eq('card_id', card.id); await supabase.from('checklist_items').delete().eq('card_id', card.id); await supabase.from('cards').delete().eq('id', card.id); onUpdate(); onClose() }}
            style={{ background: 'none', border: '0.5px solid #f5c4c4', borderRadius: 8, padding: '8px 12px', color: '#b91c1c', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <i className="ti ti-trash" style={{ fontSize: 14 }} />
          </button>
        </div>

      </div>
    </div>
  )
}
