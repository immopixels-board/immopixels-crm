'use client'
import React, { useState, useEffect, useRef } from 'react'

export function NotificationBell({ supabase, currentStaff, onClick, count }) {
  return (
    <div onClick={onClick} style={{ position:'relative', width:32, height:32, borderRadius:8, background:'var(--bg3)', border:'0.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--t2)', transition:'all .15s' }}
      onMouseEnter={e=>{e.currentTarget.style.background='var(--bg2)';e.currentTarget.style.color='var(--gold)';e.currentTarget.style.borderColor='var(--gold)'}}
      onMouseLeave={e=>{e.currentTarget.style.background='var(--bg3)';e.currentTarget.style.color='var(--t2)';e.currentTarget.style.borderColor='var(--border)'}}>
      <i className="ti ti-bell" style={{ fontSize:15 }} />
      {count > 0 && (
        <div style={{ position:'absolute', top:-5, right:-5, minWidth:17, height:17, borderRadius:'50%', background:'#b91c1c', color:'#fff', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--bg2)', padding:'0 3px', animation:'bell-bounce .4s cubic-bezier(.34,1.56,.64,1)' }}>
          {count > 99 ? '99+' : count}
        </div>
      )}
    </div>
  )
}

export function NotificationDropdown({ notifications, onRead, onReadAll, onClose, staff }) {
  function getStaff(id) { return staff?.find(s => s.id === id) }

  return (
    <div className="modal-animate" style={{ position:'absolute', top:40, right:0, width:340, background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,.14)', zIndex:500, overflow:'hidden' }}>
      <div style={{ padding:'11px 14px', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
        <i className="ti ti-bell" style={{ fontSize:14, color:'var(--gold)' }} />
        <span style={{ fontSize:13, fontWeight:700, color:'var(--t1)', flex:1 }}>Benachrichtigungen</span>
        {notifications.filter(n=>!n.read).length > 0 && (
          <span style={{ background:'#b91c1c', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:700 }}>
            {notifications.filter(n=>!n.read).length}
          </span>
        )}
        <span onClick={onReadAll} style={{ fontSize:11, color:'var(--t3)', cursor:'pointer', marginLeft:6 }}
          onMouseEnter={e=>e.currentTarget.style.color='#b91c1c'} onMouseLeave={e=>e.currentTarget.style.color='var(--t3)'}>
          Alle lesen
        </span>
      </div>
      <div style={{ maxHeight:360, overflowY:'auto' }}>
        {notifications.length === 0 && (
          <div style={{ padding:'24px', textAlign:'center', color:'var(--t3)', fontSize:12 }}>
            <i className="ti ti-bell-off" style={{ fontSize:24, display:'block', marginBottom:8, opacity:.4 }} />
            Keine Benachrichtigungen
          </div>
        )}
        {notifications.map(n => {
          const sender = getStaff(n.sender_id)
          return (
            <div key={n.id} onClick={() => onRead(n)} style={{ padding:'10px 14px', display:'flex', gap:9, alignItems:'flex-start', borderBottom:'0.5px solid var(--border)', cursor:'pointer', background: n.read ? 'none' : 'rgba(184,137,42,.04)', transition:'background .12s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
              onMouseLeave={e=>e.currentTarget.style.background=n.read?'none':'rgba(184,137,42,.04)'}>
              <div style={{ width:30, height:30, borderRadius:'50%', background:(sender?.color||'#1f4d3f')+'22', color:sender?.color||'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0, overflow:'hidden' }}>
                {sender?.avatar_url ? <img src={sender.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : (sender?.init || '?')}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:'var(--t1)', lineHeight:1.4 }}>
                  <strong>{sender?.name || 'Unbekannt'}</strong> {n.type === 'card_assigned' ? 'hat dich der Karte zugewiesen' : 'hat dich in einem Kommentar erwähnt'}
                </div>
                {n.message && <div style={{ fontSize:11, color:'var(--t3)', marginTop:2, fontStyle:'italic' }}>„{n.message.slice(0,60)}{n.message.length>60?'...':''}"</div>}
                <div style={{ fontSize:10, color:'var(--t3)', marginTop:3 }}>{new Date(n.created_at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
              </div>
              <div style={{ width:7, height:7, borderRadius:'50%', background: n.read ? 'transparent' : '#b91c1c', flexShrink:0, marginTop:4 }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function NotificationToast({ notification, staff, onClose }) {
  const sender = staff?.find(s => s.id === notification.sender_id)
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ width:300, background:'var(--bg2)', borderRadius:12, border:'0.5px solid var(--border)', padding:'12px 14px', boxShadow:'0 8px 32px rgba(0,0,0,.14)', display:'flex', gap:10, alignItems:'flex-start', animation:'slideInRight .3s cubic-bezier(.34,1.56,.64,1)', pointerEvents:'all' }}>
      <div style={{ width:36, height:36, borderRadius:9, background: notification.type==='card_assigned' ? 'rgba(123,191,203,.15)' : 'rgba(212,134,155,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <i className={'ti ' + (notification.type==='card_assigned'?'ti-user-plus':'ti-at')} style={{ fontSize:16, color: notification.type==='card_assigned'?'#2a6a7a':'#7a2045' }} />
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:9, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:2 }}>ImmoPixels CRM</div>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)', marginBottom:2 }}>
          {notification.type === 'card_assigned' ? 'Du wurdest zugewiesen' : '@mention im Kommentar'}
        </div>
        <div style={{ fontSize:11, color:'var(--t2)' }}>
          {sender?.name}: {notification.message?.slice(0,60)}{notification.message?.length>60?'...':''}
        </div>
      </div>
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t3)', fontSize:14, padding:0, flexShrink:0, display:'flex', alignItems:'center', transition:'color .12s' }}
        onMouseEnter={e=>e.currentTarget.style.color='#b91c1c'} onMouseLeave={e=>e.currentTarget.style.color='var(--t3)'}>
        <i className="ti ti-x" style={{ fontSize:12 }} />
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, staff, onClose }) {
  if (!toasts.length) return null
  return (
    <div style={{ position:'fixed', top:16, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
      {toasts.map(t => <NotificationToast key={t.id} notification={t} staff={staff} onClose={() => onClose(t.id)} />)}
    </div>
  )
}

export async function sendNotification(supabase, { recipientId, senderId, type, cardId, message }) {
  if (recipientId === senderId) return
  await supabase.from('notifications').insert({ recipient_id: recipientId, sender_id: senderId, type, card_id: cardId, message, read: false })
}
