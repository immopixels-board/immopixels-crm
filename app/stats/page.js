'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function StatsPage() {
  const [me, setMe] = useState(null)
  const [clients, setClients] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('aufnahmen')

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: staff } = await supabase.from('staff').select('*').eq('email', user.email).single()
    if (!staff || staff.role_level !== 'admin') { window.location.href = '/'; return }
    setMe(staff)

    const [{ data: cls }, { data: cds }] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('cards').select('*').is('deleted_at', null),
    ])
    setClients(cls || [])
    setCards(cds || [])
    setLoading(false)
  }

  function getStats(client) {
    const name = client.short_name || client.name
    const clientCards = cards.filter(c =>
      c.client_name && (
        c.client_name.toLowerCase() === name.toLowerCase() ||
        c.client_name.toLowerCase() === client.name.toLowerCase()
      )
    )
    // Revenue from client.service_prices (sum of all entered prices)
    const sp = client.service_prices || {}
    const revenue = Object.values(sp).reduce((s, v) => s + (parseFloat(v) || 0), 0)
    const last = clientCards.filter(c => c.card_date).sort((a, b) => b.card_date.localeCompare(a.card_date))[0]
    return { count: clientCards.length, revenue, lastDate: last?.card_date || null }
  }

  const statsData = clients.map(c => ({ ...c, ...getStats(c) }))
  const filtered = statsData.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.short_name || '').toLowerCase().includes(search.toLowerCase())
  )
  const sorted = [...filtered].sort((a, b) =>
    sortBy === 'aufnahmen' ? b.count - a.count :
    sortBy === 'umsatz' ? b.revenue - a.revenue :
    a.name.localeCompare(b.name)
  )

  const totalCards = cards.length
  const totalRevenue = clients.reduce((s, c) => s + Object.values(c.service_prices || {}).reduce((a, v) => a + (parseFloat(v) || 0), 0), 0)
  const totalClients = clients.length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial', color: '#8a8278' }}>
      Wird geladen...
    </div>
  )

  return (
    <div style={{ fontFamily: 'Arial', background: 'var(--bg)', minHeight: '100vh', color: 'var(--t1)' }}>
      <style>{`
        :root { --bg:#f4f2ef; --bg2:#fff; --bg3:#eeeae6; --border:#ddd9d2; --t1:#1c1a16; --t2:#4a4540; --t3:#8a8278; --gold:#b8892a; --gdbg:rgba(184,137,42,.08); --gdbr:rgba(184,137,42,.25); }
      `}</style>

      {/* Header */}
      <div style={{ height: 52, background: '#fff', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--t1)' }}>
          <span style={{ fontSize: 18 }}>←</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>ImmoPixels</span>
          <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>CRM</span>
        </a>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>📊 Kunde Statistik</span>
        <span style={{ fontSize: 11, color: 'var(--t3)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', marginLeft: 'auto' }}>Nur Admin</span>
      </div>

      <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Kunden gesamt', value: totalClients, icon: '👥' },
            { label: 'Aufnahmen gesamt', value: totalCards, icon: '📸' },
            { label: 'Umsatz gesamt', value: totalRevenue ? totalRevenue.toLocaleString('de-DE') + ' €' : '—', icon: '💶' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 5 }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kunde suchen..." style={{ flex: 1, background: '#fff', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 11px', fontSize: 13, outline: 'none' }} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 11px', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            <option value="fotok">↓ Aufnahmen</option>
            <option value="bevetel">↓ Umsatz</option>
            <option value="nev">A–Z Name</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '0.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 110px', padding: '10px 16px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
            <span>Kunde</span>
            <span style={{ textAlign: 'right' }}>Aufnahmen</span>
            <span style={{ textAlign: 'right' }}>Umsatz</span>
            <span style={{ textAlign: 'right' }}>Letzter</span>
          </div>
          {sorted.length === 0 && (
            <div style={{ padding: '20px 16px', color: 'var(--t3)', fontSize: 13 }}>Keine Ergebnisse</div>
          )}
          {sorted.map((c, i) => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 110px', padding: '10px 16px', borderBottom: i < sorted.length - 1 ? '0.5px solid var(--border)' : 'none', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{c.name}</div>
                {c.short_name && c.short_name !== c.name && (
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{c.short_name}</div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                {c.count > 0 ? (
                  <span style={{ fontSize: 13, fontWeight: 700, color: c.count >= 10 ? 'var(--gold)' : 'var(--t1)' }}>{c.count}</span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--t3)' }}>—</span>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                {c.revenue > 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--t2)' }}>{c.revenue.toLocaleString('de-DE')} €</span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--t3)' }}>—</span>
                )}
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--t3)' }}>
                {c.lastDate ? new Date(c.lastDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
