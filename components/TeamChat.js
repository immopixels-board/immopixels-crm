'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

const CLAUDE_SVG = 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI1MDAiIHZpZXdCb3g9IjAgLS4wMSAzOS41IDM5LjUzIiB3aWR0aD0iMjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJtNy43NSAyNi4yNyA3Ljc3LTQuMzYuMTMtLjM4LS4xMy0uMjFoLS4zOGwtMS4zLS4wOC00LjQ0LS4xMi0zLjg1LS4xNi0zLjczLS4yLS45NC0uMi0uODgtMS4xNi4wOS0uNTguNzktLjUzIDEuMTMuMSAyLjUuMTcgMy43NS4yNiAyLjcyLjE2IDQuMDMuNDJoLjY0bC4wOS0uMjYtLjIyLS4xNi0uMTctLjE2LTMuODgtMi42My00LjItMi43OC0yLjItMS42LTEuMTktLjgxLS42LS43Ni0uMjYtMS42NiAxLjA4LTEuMTkgMS40NS4xLjM3LjEgMS40NyAxLjEzIDMuMTQgMi40MyA0LjEgMy4wMi42LjUuMjQtLjE3LjAzLS4xMi0uMjctLjQ1LTIuMjMtNC4wMy0yLjM4LTQuMS0xLjA2LTEuNy0uMjgtMS4wMmMtLjEtLjQyLS4xNy0uNzctLjE3LTEuMmwxLjIzLTEuNjcuNjgtLjIyIDEuNjQuMjIuNjkuNiAxLjAyIDIuMzMgMS42NSAzLjY3IDIuNTYgNC45OS43NSAxLjQ4LjQgMS4zNy4xNS40MmguMjZ2LS4yNGwuMjEtMi44MS4zOS0zLjQ1LjM4LTQuNDQuMTMtMS4yNS42Mi0xLjUgMS4yMy0uODEuOTYuNDYuNzkgMS4xMy0uMTEuNzMtLjQ3IDMuMDUtLjkyIDQuNzgtLjYgMy4yaC4zNWwuNC0uNCAxLjYyLTIuMTUgMi43Mi0zLjQgMS4yLTEuMzUgMS40LTEuNDkuOS0uNzFoMS43bDEuMjUgMS44Ni0uNTYgMS45Mi0xLjc1IDIuMjItMS40NSAxLjg4LTIuMDggMi44LTEuMyAyLjI0LjEyLjE4LjMxLS4wMyA0LjctMSAyLjU0LS40NiAzLjAzLS41MiAxLjM3LjY0LjE1LjY1LS41NCAxLjMzLTMuMjQuOC0zLjguNzYtNS42NiAxLjM0LS4wNy4wNS4wOC4xIDIuNTUuMjQgMS4wOS4wNmgyLjY3bDQuOTcuMzcgMS4zLjg2Ljc4IDEuMDUtLjEzLjgtMiAxLjAyLTIuNy0uNjQtNi4zLTEuNS0yLjE2LS41NGgtLjN2LjE4bDEuOCAxLjc2IDMuMyAyLjk4IDQuMTMgMy44NC4yMS45NS0uNTMuNzUtLjU2LS4wOC0zLjYzLTIuNzMtMS40LTEuMjMtMy4xNy0yLjY3aC0uMjF2LjI4bC43MyAxLjA3IDMuODYgNS44LjIgMS43OC0uMjguNTgtMSAuMzUtMS4xLS4yLTIuMjYtMy4xNy0yLjMzLTMuNTctMS44OC0zLjItLjIzLjEzLTEuMTEgMTEuOTUtLjUyLjYxLTEuMi40Ni0xLS43Ni0uNTMtMS4yMy41My0yLjQzLjY0LTMuMTcuNTItMi41Mi40Ny0zLjEzLjI4LTEuMDQtLjAyLS4wNy0uMjMuMDMtMi4zNiAzLjI0LTMuNTkgNC44NS0yLjg0IDMuMDQtLjY4LjI3LTEuMTgtLjYxLjExLTEuMDkuNjYtLjk3IDMuOTMtNSAyLjM3LTMuMSAxLjUzLTEuNzktLjAxLS4yNmgtLjA5bC0xMC40NCA2Ljc4LTEuODYuMjQtLjgtLjc1LjEtMS4yMy4zOC0uNCAzLjE0LTIuMTZ6IiBmaWxsPSIjZDk3NzU3Ii8+PC9zdmc+'

const EMOJI_SHORTCUTS = {
  ':)': '😊', ':-)': '😊', '=)': '😊',
  ':D': '😄', ':-D': '😄', '=D': '😄',
  ':(': '😢', ':-(': '😢',
  ';)': '😉', ';-)': '😉',
  ':P': '😛', ':-P': '😛',
  ':thumbs': '👍', ':+1': '👍',
  ':heart': '❤️', '<3': '❤️',
  ':fire': '🔥', ':check': '✅',
  ':wave': '👋', ':clap': '👏',
}

function applyEmojiShortcuts(text) {
  let result = text
  for (const [key, val] of Object.entries(EMOJI_SHORTCUTS)) {
    result = result.replaceAll(key, val)
  }
  return result
}

function FileIcon({ type, size = 28 }) {
  const isImage = type?.startsWith('image/')
  const isZip = type?.includes('zip') || type?.includes('compressed')
  const isPdf = type?.includes('pdf')
  const color = isImage ? '#ca8a04' : isZip ? '#ea580c' : isPdf ? '#b91c1c' : '#1d5ec7'
  const bg = isImage ? '#fef08a' : isZip ? '#fed7aa' : isPdf ? '#fecaca' : '#bfdbfe'
  const icon = isImage ? 'ti-photo' : isZip ? 'ti-file-zip' : isPdf ? 'ti-file-text' : 'ti-file'
  return (
    <div style={{ width: size, height: size, borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <i className={'ti ' + icon} style={{ fontSize: size * 0.55, color }} />
    </div>
  )
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export default function TeamChat({ supabase, currentUser, staff, onClose }) {
  const [activeChannel, setActiveChannel] = useState('team')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [mentionList, setMentionList] = useState([])
  const [mentionIdx, setMentionIdx] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [presence, setPresence] = useState({})
  const endRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  const me = staff.find(s => s.email === currentUser?.email)
  const privatePartner = activeChannel !== 'team' ? staff.find(s => s.id === activeChannel) : null

  // Load messages
  const loadMessages = useCallback(async () => {
    let q = supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(200)
    if (activeChannel === 'team') {
      q = q.eq('channel', 'team')
    } else {
      q = q.or(
        `and(channel.eq.private,sender_id.eq.${me?.id},recipient_id.eq.${activeChannel}),and(channel.eq.private,sender_id.eq.${activeChannel},recipient_id.eq.${me?.id})`
      )
    }
    const { data } = await q
    setMessages(data || [])
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [activeChannel, me?.id])

  useEffect(() => { loadMessages() }, [loadMessages])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('chat-v2-' + activeChannel)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => loadMessages())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [activeChannel, loadMessages])

  // Presence
  useEffect(() => {
    if (!me) return
    // Set online
    supabase.from('user_presence').upsert({ staff_id: me.id, online: true, last_seen: new Date().toISOString() })
    // Load presence
    loadPresence()
    const interval = setInterval(() => {
      supabase.from('user_presence').upsert({ staff_id: me.id, online: true, last_seen: new Date().toISOString() })
      loadPresence()
    }, 30000)
    // Set offline on unmount
    return () => {
      clearInterval(interval)
      supabase.from('user_presence').upsert({ staff_id: me.id, online: false, last_seen: new Date().toISOString() })
    }
  }, [me?.id])

  // Realtime presence
  useEffect(() => {
    const ch = supabase.channel('presence-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, () => loadPresence())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function loadPresence() {
    const { data } = await supabase.from('user_presence').select('*')
    const map = {}
    for (const p of data || []) map[p.staff_id] = p.online
    setPresence(map)
  }

  // Unread count per private channel
  function getUnread(staffId) {
    return messages.filter(m => m.channel === 'private' && m.sender_id === staffId && m.recipient_id === me?.id).length
  }

  async function sendMessage() {
    if (!input.trim() && pendingFiles.length === 0) return
    if (uploading) return

    const text = applyEmojiShortcuts(input.trim())

    if (pendingFiles.length > 0) {
      setUploading(true)
      for (const pf of pendingFiles) {
        const path = `${me?.id}/${Date.now()}_${pf.file.name}`
        const { data: uploaded, error } = await supabase.storage.from('chat-attachments').upload(path, pf.file)
        if (!error) {
          const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(path)
          await supabase.from('chat_messages').insert({
            text: text || pf.file.name,
            sender_name: me?.name || '?',
            sender_init: me?.init || '?',
            sender_avatar: me?.avatar_url || null,
            sender_color: me?.color || '#b8892a',
            sender_id: me?.id || null,
            channel: activeChannel === 'team' ? 'team' : 'private',
            recipient_id: activeChannel !== 'team' ? activeChannel : null,
            attachment_url: urlData?.publicUrl,
            attachment_name: pf.file.name,
            attachment_size: pf.file.size,
            attachment_type: pf.file.type,
            reply_to_text: replyTo?.text?.slice(0, 60) || null,
            reply_to_sender: replyTo?.sender_name || null,
          })
        }
      }
      setUploading(false)
      setPendingFiles([])
    } else {
      await supabase.from('chat_messages').insert({
        text,
        sender_name: me?.name || '?',
        sender_init: me?.init || '?',
        sender_avatar: me?.avatar_url || null,
        sender_color: me?.color || '#b8892a',
        sender_id: me?.id || null,
        channel: activeChannel === 'team' ? 'team' : 'private',
        recipient_id: activeChannel !== 'team' ? activeChannel : null,
        reply_to_text: replyTo?.text?.slice(0, 60) || null,
        reply_to_sender: replyTo?.sender_name || null,
      })
    }
    setInput('')
    setReplyTo(null)
    setMentionList([])
  }

  async function deleteMessage(msg) {
    if (!confirm('Nachricht löschen?')) return
    if (msg.attachment_url) {
      const path = msg.attachment_url.split('/chat-attachments/')[1]
      if (path) await supabase.storage.from('chat-attachments').remove([path])
    }
    await supabase.from('chat_messages').delete().eq('id', msg.id)
    loadMessages()
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    setPendingFiles(prev => [...prev, ...files.map(f => ({ file: f, id: Math.random() }))])
  }

  function handleFileInput(e) {
    const files = Array.from(e.target.files)
    setPendingFiles(prev => [...prev, ...files.map(f => ({ file: f, id: Math.random() }))])
  }

  const IS = { background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '7px 10px', fontSize: 12, color: 'var(--t1)', fontFamily: 'Arial', outline: 'none' }
  const BTN = { background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: 'var(--t2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }

  return (
    <div style={{ position: 'fixed', bottom: 0, right: 0, width: 560, height: '70vh', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px 0 0 0', boxShadow: '0 -4px 24px rgba(0,0,0,.10)', zIndex: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', flexShrink: 0 }}>
        <img src={CLAUDE_SVG} style={{ width:18, height:18, objectFit:'contain' }} alt='Claude' />
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>
          {activeChannel === 'team' ? 'Team-Chat' : (privatePartner?.name + ' · Privat')}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 16 }}>✕</button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 140, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg3)', flexShrink: 0, overflowY: 'auto' }}>
          <div style={{ padding: '8px 8px 3px', fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Kanal</div>
          <div onClick={() => setActiveChannel('team')} className='sidebar-item-anim' style={{ padding: '7px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 7, margin: '0 4px 2px', background: activeChannel === 'team' ? 'var(--gdbg)' : 'none', color: activeChannel === 'team' ? 'var(--gold)' : 'var(--t2)', fontSize: 12, fontWeight: 600 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-users" style={{ fontSize: 13, color: activeChannel === 'team' ? 'var(--gold)' : 'var(--t3)' }} />
            </div>
            Team
          </div>

          <div style={{ padding: '8px 8px 3px', fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 4 }}>Privat</div>
          {staff.filter(s => s.id !== me?.id).map(s => {
            const isActive = activeChannel === s.id
            const isOnline = presence[s.id]
            return (
              <div key={s.id} onClick={() => setActiveChannel(s.id)} style={{ padding: '6px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 7, margin: '0 4px 2px', background: isActive ? 'var(--gdbg)' : 'none' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: s.color + '22', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, overflow: 'hidden' }}>
                    {s.avatar_url ? <img src={s.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.init}
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: isOnline ? '#15803d' : '#bbb', border: '1.5px solid var(--bg3)' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1, color: isActive ? 'var(--gold)' : 'var(--t2)' }}>{s.name.split(' ')[0]}</span>
              </div>
            )
          })}
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}>

          {/* Drag overlay */}
          {dragOver && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(184,137,42,.08)', border: '2px dashed var(--gold)', borderRadius: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gdbg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-upload" style={{ fontSize: 22, color: 'var(--gold)' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>Dateien hier ablegen</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>Fotos, ZIP, PDF...</div>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ color: 'var(--t3)', fontSize: 12, textAlign: 'center', marginTop: 40 }}>
                {activeChannel === 'team' ? 'Noch keine Nachrichten im Team-Chat' : 'Privater Chat mit ' + privatePartner?.name}
              </div>
            )}
            {messages.map(msg => {
              const isMe = msg.sender_id === me?.id
              const timeStr = new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
              const canDelete = isMe || me?.role?.includes('Leiter')
              return (
                <div key={msg.id} className="chat-msg" style={{ display: 'flex', gap: 7, alignItems: 'flex-end', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  {!isMe && (
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: msg.sender_color + '22', color: msg.sender_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                      {msg.sender_avatar ? <img src={msg.sender_avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : msg.sender_init}
                    </div>
                  )}
                  <div style={{ maxWidth: '75%' }}>
                    {!isMe && <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 2 }}>{msg.sender_name} · {timeStr}</div>}
                    {msg.reply_to_text && (
                      <div style={{ background: isMe ? 'rgba(255,255,255,.15)' : 'var(--bg3)', borderLeft: '2.5px solid ' + (isMe ? 'rgba(255,255,255,.5)' : 'var(--gold)'), padding: '3px 8px', borderRadius: '0 4px 4px 0', marginBottom: 3, fontSize: 10, color: isMe ? 'rgba(255,255,255,.8)' : 'var(--t3)' }}>
                        <strong>{msg.reply_to_sender}</strong>: {msg.reply_to_text}
                      </div>
                    )}
                    <div style={{ background: isMe ? '#c9a05a' : 'var(--bg3)', color: isMe ? '#fff' : 'var(--t1)', borderRadius: isMe ? '10px 3px 10px 10px' : '3px 10px 10px 10px', padding: '7px 10px', fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.text && msg.text !== msg.attachment_name && <div>{msg.text}</div>}
                      {msg.attachment_url && (
                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: msg.text && msg.text !== msg.attachment_name ? 6 : 0, textDecoration: 'none', background: isMe ? 'rgba(255,255,255,.15)' : 'var(--bg2)', borderRadius: 7, padding: '6px 8px', border: '0.5px solid ' + (isMe ? 'rgba(255,255,255,.2)' : 'var(--border)') }}>
                          <FileIcon type={msg.attachment_type} size={28} />
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: isMe ? '#fff' : 'var(--t1)' }}>{msg.attachment_name}</div>
                            <div style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,.7)' : 'var(--t3)' }}>{formatSize(msg.attachment_size)}</div>
                          </div>
                          <i className="ti ti-download" style={{ marginLeft: 'auto', fontSize: 14, color: isMe ? 'rgba(255,255,255,.8)' : 'var(--t3)' }} />
                        </a>
                      )}
                    </div>
                    {isMe && <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2, textAlign: 'right' }}>{timeStr}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignSelf: 'center' }}>
                    <button onClick={() => { setReplyTo(msg); inputRef.current?.focus() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 13, padding: '2px 4px' }}>↩</button>
                    {canDelete && <button onClick={() => deleteMessage(msg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 13, padding: '2px 4px' }}>🗑</button>}
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>

          {/* Pending files */}
          {pendingFiles.length > 0 && (
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg3)', flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 5 }}>{pendingFiles.length} Datei(en) bereit</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {pendingFiles.map(pf => (
                  <div key={pf.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 7, padding: '4px 8px' }}>
                    <FileIcon type={pf.file.type} size={20} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{pf.file.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--t3)' }}>{formatSize(pf.file.size)}</div>
                    </div>
                    <button onClick={() => setPendingFiles(p => p.filter(f => f.id !== pf.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 14 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reply preview */}
          {replyTo && (
            <div style={{ padding: '5px 12px', background: 'var(--gdbg)', borderTop: '1px solid var(--gdbr)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ borderLeft: '2.5px solid var(--gold)', paddingLeft: 8, flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)' }}>{replyTo.sender_name}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.text?.slice(0, 60)}</div>
              </div>
              <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 16 }}>×</button>
            </div>
          )}

          {/* Mention list */}
          {mentionList.length > 0 && (
            <div style={{ padding: '4px 8px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
              {mentionList.map((s, idx) => (
                <div key={s.id} onClick={() => { setInput(i => i.replace(/@\w*$/, '@' + s.name.split(' ')[0] + ' ')); setMentionList([]); setMentionIdx(0) }}
                  style={{ padding: '5px 8px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 7, borderRadius: 5, background: idx === mentionIdx ? 'var(--gdbg)' : 'none' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: s.color + '22', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
                    {s.avatar_url ? <img src={s.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.init}
                  </div>
                  <span style={{ fontWeight: idx === mentionIdx ? 700 : 400 }}>{s.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 'auto' }}>{s.role}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'var(--t3)', padding: '3px 8px', borderTop: '0.5px solid var(--border)' }}>↑↓ navigieren · Enter auswählen · Esc schließen</div>
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
              <button onClick={() => fileInputRef.current?.click()} style={{ ...BTN }}>
                <i className="ti ti-paperclip" style={{ fontSize: 12 }} /> Anhang
              </button>
              {activeChannel !== 'team' && (
                <span style={{ fontSize: 11, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                  <i className="ti ti-lock" style={{ color: '#7c3aed', fontSize: 11 }} />
                  Privat an {privatePartner?.name?.split(' ')[0]}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input ref={inputRef} value={input}
                onChange={e => {
                  setInput(e.target.value)
                  const match = e.target.value.match(/@(\w*)$/)
                  if (match) { const q = match[1].toLowerCase(); setMentionList(staff.filter(s => s.name.toLowerCase().includes(q) || s.init.toLowerCase().includes(q))); setMentionIdx(0) }
                  else setMentionList([])
                }}
                onKeyDown={e => {
                  if (mentionList.length > 0) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i+1, mentionList.length-1)) }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => Math.max(i-1, 0)) }
                    else if (e.key === 'Enter') { e.preventDefault(); const s = mentionList[mentionIdx]; setInput(i => i.replace(/@\w*$/, '@' + s.name.split(' ')[0] + ' ')); setMentionList([]); setMentionIdx(0) }
                    else if (e.key === 'Escape') { setMentionList([]); setMentionIdx(0) }
                    return
                  }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                }}
                placeholder={activeChannel === 'team' ? 'Nachricht ans Team... @mention 😊' : 'Privat an ' + (privatePartner?.name?.split(' ')[0] || '') + '...'}
                className="chat-input"
                style={{ flex: 1, background: 'var(--bg3)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none' }}
              />
              <button onClick={sendMessage} disabled={uploading} style={{ background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
                <i className="ti ti-send" style={{ fontSize: 14 }} />
              </button>
            </div>
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileInput} />
          </div>
        </div>
      </div>
    </div>
  )
}
