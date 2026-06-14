'use client'
import React, { useState } from 'react'

export var PANTONE = [
  { key:'peach',    color:'#FFBE98', bg:'rgba(255,190,152,.08)', br:'rgba(255,190,152,.35)', text:'#a05a20', label:'Peach Fuzz' },
  { key:'mocha',    color:'#A67B5B', bg:'rgba(166,123,91,.08)',  br:'rgba(166,123,91,.35)',  text:'#6a3a20', label:'Mocha' },
  { key:'ciel',     color:'#7BBFCB', bg:'rgba(123,191,203,.08)', br:'rgba(123,191,203,.35)', text:'#2a6a7a', label:'Ciel' },
  { key:'apricot',  color:'#E8A87C', bg:'rgba(232,168,124,.08)', br:'rgba(232,168,124,.35)', text:'#8a4a10', label:'Apricot' },
  { key:'sage',     color:'#9CAF88', bg:'rgba(156,175,136,.08)', br:'rgba(156,175,136,.35)', text:'#3a6030', label:'Sage' },
  { key:'artgold',  color:'#C9A96E', bg:'rgba(201,169,110,.08)', br:'rgba(201,169,110,.35)', text:'#6a4a10', label:'Artisan Gold' },
  { key:'granite',  color:'#B5C4B1', bg:'rgba(181,196,177,.08)', br:'rgba(181,196,177,.35)', text:'#3a5535', label:'Granite' },
  { key:'rose',     color:'#D4A5A5', bg:'rgba(212,165,165,.08)', br:'rgba(212,165,165,.35)', text:'#703535', label:'Mellow Rose' },
  { key:'cerulean', color:'#A8C5DA', bg:'rgba(168,197,218,.08)', br:'rgba(168,197,218,.35)', text:'#1a5070', label:'Cerulean' },
  { key:'slate',    color:'#6B7C93', bg:'rgba(107,124,147,.08)', br:'rgba(107,124,147,.35)', text:'#2a3a55', label:'Blue Slate' },
  { key:'sand',     color:'#E8D5B7', bg:'rgba(232,213,183,.08)', br:'rgba(232,213,183,.35)', text:'#6a4a20', label:'Sand' },
  { key:'caramel',  color:'#C4956A', bg:'rgba(196,149,106,.08)', br:'rgba(196,149,106,.35)', text:'#6a3010', label:'Caramel' },
  { key:'laurel',   color:'#8FA68E', bg:'rgba(143,166,142,.08)', br:'rgba(143,166,142,.35)', text:'#2a5028', label:'Laurel' },
  { key:'flamingo', color:'#D4869B', bg:'rgba(212,134,155,.08)', br:'rgba(212,134,155,.35)', text:'#7a2045', label:'Flamingo' },
  { key:'steel',    color:'#7B9EA6', bg:'rgba(123,158,166,.08)', br:'rgba(123,158,166,.35)', text:'#1a4a55', label:'Steel Blue' },
]

export function getColStyle(colorKey) {
  if (!colorKey) return { bg: 'var(--bg3)', br: 'var(--border)', text: 'var(--t1)', dot: '#8a8278' }
  const p = PANTONE.find(c => c.key === colorKey)
  return p ? { bg: p.bg, br: p.br, text: p.text, dot: p.color } : { bg: 'var(--bg3)', br: 'var(--border)', text: 'var(--t1)', dot: '#8a8278' }
}

export function ConfirmDialog({ title, message, confirmLabel = 'Löschen', confirmColor = '#b91c1c', icon = 'ti-trash', iconBg = '#fecaca', iconColor = '#b91c1c', onConfirm, onCancel }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,26,22,.45)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className='modal-animate' style={{ background: '#fff', borderRadius: 14, width: 340, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.16)', animation: 'fadeIn .15s ease' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <i className={'ti ' + icon} style={{ fontSize: 22, color: iconColor }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1c1a16', textAlign: 'center', marginBottom: 7 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#8a8278', textAlign: 'center', marginBottom: 20, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: message }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, background: 'none', border: '0.5px solid #ddd9d2', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 600, color: '#4a4540', cursor: 'pointer' }}>Abbrechen</button>
          <button onClick={onConfirm} style={{ flex: 2, background: confirmColor, color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <i className={'ti ' + icon} style={{ fontSize: 13 }} /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ColumnModal({ col, onSave, onClose, isAdmin }) {
  const [name, setName] = useState(col?.title || '')
  const [colorKey, setColorKey] = useState(col?.color || '')
  const [privateCol, setPrivateCol] = useState((col?.visible_to_roles||[]).length > 0)
  const preview = PANTONE.find(c => c.key === colorKey)

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(28,26,22,.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}`}</style>
      <div className='modal-animate' style={{ background: '#fff', borderRadius: 14, width: 380, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.16)', animation: 'fadeIn .15s ease' }}>

        {/* Header */}
        <div style={{ padding: '15px 18px 12px', borderBottom: '0.5px solid #eeeae6', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: preview ? preview.bg : '#f4f2ef', border: '0.5px solid ' + (preview ? preview.br : '#ddd9d2'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-columns" style={{ fontSize: 16, color: preview ? preview.text : '#8a8278' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1c1a16', flex: 1 }}>{col?.id ? 'Spalte bearbeiten' : 'Neue Spalte'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8278', fontSize: 15 }}><i className="ti ti-x" /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Name */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>Name</div>
            <input value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name, colorKey, privateCol)}
              placeholder="Spaltenname..."
              style={{ width: '100%', background: '#f4f2ef', border: '1.5px solid ' + (name ? '#1f4d3f' : '#ddd9d2'), borderRadius: 8, padding: '9px 12px', fontSize: 14, fontWeight: 600, color: '#1c1a16', outline: 'none', fontFamily: 'Arial' }} />
          </div>

          {/* Color */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 9 }}>Farbe</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
              {/* No color */}
              <div onClick={() => setColorKey('')} title="Keine Farbe"
                style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', border: '1.5px solid ' + (colorKey === '' ? '#888' : '#d1cdc7'), cursor: 'pointer', position: 'relative', boxShadow: colorKey === '' ? '0 0 0 2.5px #fff, 0 0 0 4px #888' : 'none', transition: 'transform .1s' }}
                onMouseEnter={e => e.currentTarget.style.transform='scale(1.12)'}
                onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '130%', height: '1.5px', background: '#e74c3c', transform: 'translate(-50%,-50%) rotate(-45deg)', borderRadius: 1 }} />
              </div>
              {PANTONE.map(p => (
                <div key={p.key} onClick={() => setColorKey(p.key)} title={p.label}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: p.color, cursor: 'pointer', boxShadow: colorKey === p.key ? `0 0 0 2.5px #fff, 0 0 0 4.5px ${p.color}` : 'none', transition: 'transform .1s, box-shadow .1s' }}
                  onMouseEnter={e => e.currentTarget.style.transform='scale(1.12)'}
                  onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa8a0', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>Vorschau</div>
            <div style={{ background: preview ? preview.bg : '#f4f2ef', border: '0.5px solid ' + (preview ? preview.br : '#ddd9d2'), borderRadius: 9, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: preview ? preview.color : '#8a8278', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: preview ? preview.text : '#4a4540', flex: 1 }}>{name || 'Spaltenname'}</span>
              <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,.5)', borderRadius: 10, padding: '1px 8px', color: preview ? preview.text : '#8a8278' }}>3</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 18px', borderTop: '0.5px solid #eeeae6', background: '#faf9f7' }}>
          {isAdmin && (
            <div onClick={() => setPrivateCol(p => !p)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background: privateCol ? 'rgba(184,137,42,.08)' : '#f4f2ef', border: '0.5px solid ' + (privateCol ? '#1f4d3f' : '#ddd9d2'), borderRadius:8, marginBottom:10, cursor:'pointer', transition:'all .15s' }}>
              <div style={{ width:18, height:18, borderRadius:4, border:'1.5px solid ' + (privateCol ? '#1f4d3f' : '#ccc'), background: privateCol ? '#1f4d3f' : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .15s' }}>
                {privateCol && <i className="ti ti-check" style={{ fontSize:11, color:'#fff' }} />}
              </div>
              <i className="ti ti-eye-off" style={{ fontSize:13, color: privateCol ? '#1f4d3f' : '#8a8278' }} />
              <span style={{ fontSize:12, fontWeight:600, color: privateCol ? '#1f4d3f' : '#4a4540' }}>Nur für mich sichtbar</span>
            </div>
          )}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} style={{ flex:1, background:'none', border:'0.5px solid #ddd9d2', borderRadius:8, padding:'8px', fontSize:13, fontWeight:600, color:'#4a4540', cursor:'pointer' }}>Abbrechen</button>
            <button onClick={() => name.trim() && onSave(name, colorKey, privateCol)}
              disabled={!name.trim()}
              style={{ flex:2, background: name.trim() ? '#1c1a16' : '#ccc', color:'#fff', border:'none', borderRadius:8, padding:'8px', fontSize:13, fontWeight:700, cursor: name.trim() ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
              <i className="ti ti-check" style={{ fontSize:13 }} /> Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
