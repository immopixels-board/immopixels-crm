'use client'
export const dynamic = 'force-dynamic'
import React, { useState } from 'react'

export default function DemoGate() {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const r = await fetch('/api/demo-gate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
      if (r.ok) {
        const next = new URLSearchParams(window.location.search).get('next') || '/'
        window.location.href = next
      } else { const j = await r.json().catch(() => ({})); setErr(j.error || 'Falsches Passwort'); setBusy(false) }
    } catch { setErr('Fehler — bitte erneut versuchen'); setBusy(false) }
  }
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f0e4', fontFamily: 'system-ui,sans-serif' }}>
      <form onSubmit={submit} style={{ background: '#fff', border: '0.5px solid #e6ddc9', borderRadius: 16, padding: '34px 30px', width: '100%', maxWidth: 360, boxShadow: '0 10px 40px rgba(0,0,0,.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '.5px', color: '#b8892a', background: '#b8892a18', borderRadius: 20, padding: '4px 12px', marginBottom: 14 }}>DEMO-BEREICH</div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, margin: 0, color: '#2c2719' }}>ImmoPixels CRM</h1>
          <p style={{ fontSize: 13, color: '#8a8278', marginTop: 6 }}>Bitte das Demo-Passwort eingeben.</p>
        </div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Passwort" autoFocus
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 15, border: '1px solid #e6ddc9', borderRadius: 9, outline: 'none', marginBottom: 12 }} />
        {err && <div style={{ fontSize: 12.5, color: '#b3402f', marginBottom: 10 }}>{err}</div>}
        <button type="submit" disabled={busy || !pw} style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 700, color: '#fff', background: '#b8892a', border: 'none', borderRadius: 9, cursor: 'pointer', opacity: (busy || !pw) ? .6 : 1 }}>
          {busy ? 'Prüfe…' : 'Weiter zur Demo'}
        </button>
      </form>
    </div>
  )
}
