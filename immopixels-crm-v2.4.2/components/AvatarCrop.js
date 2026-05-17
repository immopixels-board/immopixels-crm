'use client'
import React, { useState, useRef, useCallback, useEffect } from 'react'

export default function AvatarCrop({ onDone, onCancel, initialSrc }) {
  const [img, setImg] = useState(null)
  const [imgSrc, setImgSrc] = useState(initialSrc || null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const canvasRef = useRef(null)
  const SIZE = 280

  useEffect(() => {
    if (!imgSrc) return
    const i = new Image()
    i.onload = () => {
      setImg(i)
      // Auto-fit
      const s = Math.max(SIZE / i.width, SIZE / i.height)
      setScale(s)
      setPos({ x: (SIZE - i.width * s) / 2, y: (SIZE - i.height * s) / 2 })
    }
    i.src = imgSrc
  }, [imgSrc])

  useEffect(() => { draw() }, [img, pos, scale])

  function draw() {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, SIZE, SIZE)
    // Checkerboard bg
    ctx.fillStyle = '#f0eeeb'
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.drawImage(img, pos.x, pos.y, img.width * scale, img.height * scale)
    // Circle clip overlay
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath()
    ctx.rect(0, 0, SIZE, SIZE)
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2, true)
    ctx.fill()
    ctx.restore()
    // Circle border
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2)
    ctx.stroke()
  }

  function onMouseDown(e) {
    setDragging(true)
    setDragStart({ mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y })
  }
  function onMouseMove(e) {
    if (!dragging || !dragStart) return
    setPos({ x: dragStart.px + (e.clientX - dragStart.mx), y: dragStart.py + (e.clientY - dragStart.my) })
  }
  function onMouseUp() { setDragging(false) }

  // Touch support
  function onTouchStart(e) {
    const t = e.touches[0]
    setDragging(true)
    setDragStart({ mx: t.clientX, my: t.clientY, px: pos.x, py: pos.y })
  }
  function onTouchMove(e) {
    if (!dragging || !dragStart) return
    const t = e.touches[0]
    setPos({ x: dragStart.px + (t.clientX - dragStart.mx), y: dragStart.py + (t.clientY - dragStart.my) })
  }

  function crop() {
    const out = document.createElement('canvas')
    out.width = 280; out.height = 280
    const ctx = out.getContext('2d')
    ctx.beginPath()
    ctx.arc(140, 140, 140, 0, Math.PI * 2)
    ctx.clip()
    if (img) ctx.drawImage(img, pos.x, pos.y, img.width * scale, img.height * scale)
    onDone(out.toDataURL('image/jpeg', 0.9))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#1c1a16' }}>Profilkép beállítása</div>

        {!imgSrc ? (
          <label style={{ display: 'block', border: '2px dashed #ddd9d2', borderRadius: 12, padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
            <div style={{ fontSize: 13, color: '#8a8278' }}>Kattints vagy húzd ide a képet</div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
              const f = e.target.files[0]; if (!f) return
              const r = new FileReader(); r.onload = ev => setImgSrc(ev.target.result); r.readAsDataURL(f)
            }} />
          </label>
        ) : (
          <>
            {/* Canvas */}
            <div style={{ position: 'relative', width: SIZE, height: SIZE, margin: '0 auto 14px', borderRadius: '50%', overflow: 'hidden', cursor: dragging ? 'grabbing' : 'grab' }}>
              <canvas ref={canvasRef} width={SIZE} height={SIZE}
                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onMouseUp}
                style={{ display: 'block' }} />
            </div>

            {/* Scale slider */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: '#8a8278', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>Méret</span>
                <span style={{ fontSize: 11, color: '#8a8278' }}>{Math.round(scale * 100)}%</span>
              </div>
              <input type="range" min="0.3" max="3" step="0.01" value={scale}
                onChange={e => setScale(parseFloat(e.target.value))}
                style={{ width: '100%' }} />
            </div>

            <div style={{ fontSize: 11, color: '#8a8278', textAlign: 'center', marginBottom: 14 }}>
              Húzd a képet a megfelelő pozícióba
            </div>

            <button onClick={() => setImgSrc(null)} style={{ background: 'none', border: 'none', color: '#8a8278', fontSize: 12, cursor: 'pointer', marginBottom: 12, display: 'block' }}>
              ← Másik kép
            </button>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ background: 'none', border: '1.5px solid #c8c3ba', color: '#4a4640', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Mégsem</button>
          {imgSrc && <button onClick={crop} style={{ background: '#b8892a', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ Mentés</button>}
        </div>
      </div>
    </div>
  )
}
