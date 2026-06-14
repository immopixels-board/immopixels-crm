'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'

function ChatWindowContent({ chat, staff, me, supabase, partner }) {
  const [messages, setMessages] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    loadMessages()
    const ch = supabase.channel('fw-'+(chat.type==='team'?'team':chat.staffId))
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'chat_messages' }, () => loadMessages())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages])

  const loadMessages = React.useCallback(async () => {
    let q = supabase.from('chat_messages').select('*').order('created_at').limit(50)
    if (chat.type==='team') q = q.eq('channel','team')
    else q = q.or(`and(sender_id.eq.${me?.id},recipient_id.eq.${chat.staffId}),and(sender_id.eq.${chat.staffId},recipient_id.eq.${me?.id})`)
    const { data } = await q
    setMessages(data || [])
  }, [chat.type, chat.staffId, me?.id])

  return (
    <div>
      {messages.map(msg => {
        const isMine = msg.sender_id === me?.id
        const hasLink = msg.text && (msg.text.includes('http') || msg.text.includes('www.'))
        const linkMatch = msg.text?.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/)?.[0]
        return (
          <div key={msg.id} style={{ display:'flex', gap:6, marginBottom:8, flexDirection:isMine?'row-reverse':'row' }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:(msg.sender_color||'#1f4d3f')+'22', color:msg.sender_color||'#1f4d3f', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, flexShrink:0, overflow:'hidden' }}>
              {msg.sender_avatar?<img src={msg.sender_avatar} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:msg.sender_init}
            </div>
            <div style={{ maxWidth:'75%' }}>
              {!isMine && <div style={{ fontSize:9, color:'var(--t3)', marginBottom:2 }}>{msg.sender_name} · {new Date(msg.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}</div>}
              <div style={{ background:isMine?'var(--gold)':'var(--bg3)', borderRadius:isMine?'8px 0 8px 8px':'0 8px 8px 8px', padding:'6px 9px', fontSize:11, color:isMine?'#fff':'var(--t1)', wordBreak:'break-word' }}>
                {msg.text?.includes('@All') ? (
                  <span>{msg.text.replace('@All', '')}<b style={{color:isMine?'#fef3c7':'var(--gold)',fontStyle:'italic'}}>@All</b></span>
                ) : msg.text}
              </div>
              {hasLink && linkMatch && (
                <a href={linkMatch.startsWith('www.')?'https://'+linkMatch:linkMatch} target="_blank" rel="noopener noreferrer"
                  style={{ display:'block', marginTop:4, background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:7, borderLeft:'3px solid var(--blue)', overflow:'hidden', textDecoration:'none', maxWidth:200 }}>
                  <div style={{ padding:'5px 8px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--t1)' }}><i className="ti ti-world" style={{fontSize:10,marginRight:4}}/>  {linkMatch.replace('https://','').replace('http://','').replace('www.','').split('/')[0]}</div>
                    <div style={{ fontSize:9, color:'var(--blue)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{linkMatch}</div>
                  </div>
                </a>
              )}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef}/>
    </div>
  )
}

function ChatWindowInput({ chat, me, supabase, partner }) {
  const [text, setText] = useState('')

  async function send() {
    if (!text.trim()) return
    await supabase.from('chat_messages').insert({
      text: text.trim(),
      sender_name: me?.name||'?',
      sender_init: me?.init||'?',
      sender_avatar: me?.avatar_url||null,
      sender_color: me?.color||'#1f4d3f',
      sender_id: me?.id||null,
      channel: chat.type==='team'?'team':'private',
      recipient_id: chat.type==='private'?chat.staffId:null,
    })
    setText('')
  }

  return (
    <div style={{ padding:'7px', borderTop:'0.5px solid var(--border)', display:'flex', gap:5, flexShrink:0 }}>
      <input value={text} onChange={e=>setText(e.target.value)}
        onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}
        placeholder="Nachricht... (Enter)"
        style={{ flex:1, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 8px', fontSize:11, outline:'none', color:'var(--t1)', fontFamily:'Arial' }} />
      <button onClick={send} style={{ background:'var(--gold)', color:'#fff', border:'none', borderRadius:7, padding:'5px 10px', fontSize:11, fontWeight:700, cursor:'pointer' }}>↑</button>
    </div>
  )
}

function FloatingChatWindows({ openChats, setOpenChats, staff, me, supabase, onlineUsers, unreadChat, setUnreadChat }) {
  const WINDOW_WIDTH = 300
  const WINDOW_GAP = 10

  function closeChat(idx) {
    setOpenChats(p => p.filter((_,i)=>i!==idx))
  }

  function getStatusColor(staffId) {
    const s = onlineUsers?.[staffId]
    return s==='online'?'#15803d':s==='away'?'#f59e0b':'#8a8278'
  }

  if (!openChats?.length) return null

  return (
    <div style={{ position:'fixed', bottom:0, right:10, display:'flex', gap:WINDOW_GAP, alignItems:'flex-end', zIndex:290, pointerEvents:'none' }}>
      {openChats.map((chat, idx) => {
        const isTeam = chat.type==='team'
        const partner = !isTeam ? staff.find(s=>s.id===chat.staffId) : null
        const windowRight = (openChats.length-1-idx)*(WINDOW_WIDTH+WINDOW_GAP)
        return (
          <div key={isTeam?'team':chat.staffId}
            style={{ width:WINDOW_WIDTH, height:320, background:'#fff', border:'0.5px solid var(--border)', borderRadius:'12px 12px 0 0', boxShadow:'0 -4px 24px rgba(0,0,0,.10)', display:'flex', flexDirection:'column', pointerEvents:'all', position:'relative' }}>
            {/* Header */}
            <div style={{ padding:'9px 12px', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', gap:8, background: isTeam?'rgba(156,175,136,.08)':'rgba(123,191,203,.06)', borderRadius:'12px 12px 0 0', cursor:'move', userSelect:'none', flexShrink:0 }}>
              {isTeam ? (
                <img src="/ip-logo.png" style={{ width:22, height:22, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} alt="IP" />
              ) : (
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:partner?.color+'22', color:partner?.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, overflow:'hidden' }}>
                    {partner?.avatar_url?<img src={partner.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:partner?.init}
                  </div>
                  <div style={{ position:'absolute', bottom:-1, right:-1, width:8, height:8, borderRadius:'50%', background:getStatusColor(chat.staffId), border:'1.5px solid #fff' }} />
                </div>
              )}
              <span style={{ fontSize:12, fontWeight:700, flex:1, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {isTeam ? 'Team-Chat' : partner?.name}
              </span>
              {!isTeam && (
                <span style={{ fontSize:10, fontWeight:600, color:getStatusColor(chat.staffId) }}>
                  {onlineUsers?.[chat.staffId]==='online'?'Online':onlineUsers?.[chat.staffId]==='away'?'Inaktiv':'Offline'}
                </span>
              )}
              <button onClick={()=>closeChat(idx)} style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 5px', fontSize:16, color:'var(--t3)', lineHeight:1 }} title="Schließen">×</button>
            </div>
            {/* Chat content */}
            <div style={{ flex:1, overflowY:'auto', padding:10, background: isTeam?'rgba(156,175,136,.04)':'rgba(123,191,203,.03)' }}>
              <ChatWindowContent chat={chat} staff={staff} me={me} supabase={supabase} partner={partner} />
            </div>
            {/* Input */}
            <ChatWindowInput chat={chat} me={me} supabase={supabase} partner={partner} />
          </div>
        )
      })}
    </div>
  )
}
