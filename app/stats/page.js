'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import RechnungShell from '../../components/RechnungShell'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

export default function StatsPage() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [cards, setCards] = useState([])
  const [goals, setGoals] = useState({ umsatz: 500000, aufnahmen: 300, instagram: 5000 })
  const [goalsInput, setGoalsInput] = useState({ umsatz: '', aufnahmen: '', instagram: '' })
  const [igFollowers, setIgFollowers] = useState(0)
  const [igInput, setIgInput] = useState('')
  const [savingGoals, setSavingGoals] = useState(false)
  const [year] = useState(new Date().getFullYear())
  const [bm, setBm] = useState({ on: false, byClient: {}, byMonth: Array(12).fill(0), total: 0 })

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: staff } = await supabase.from('staff').select('*').eq('email', user.email).single()
    if (!staff || staff.role_level !== 'admin') { window.location.href = '/'; return }

    const [{ data: cls }, { data: cds }, { data: gs }] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('cards').select('*').is('deleted_at', null),
      supabase.from('settings').select('value').eq('key', 'annual_goals').maybeSingle(),
    ])
    setClients(cls || [])
    setCards(cds || [])
    if (gs?.value) {
      try {
        const g = JSON.parse(gs.value)
        setGoals(g)
        setGoalsInput({ umsatz: g.umsatz || '', aufnahmen: g.aufnahmen || '', instagram: g.instagram || '' })
        setIgFollowers(g.ig_current || 0)
        setIgInput(g.ig_current || '')
      } catch(e) {}
    }
    // Billomat nettó bevétel (Umsatz) — ügyfelenként + havonta; minden más a CRM-ből marad
    try {
      const r = await fetch(`/api/billomat/revenue?staff_id=${staff.id}&year=${year}`)
      const d = await r.json()
      if (d?.ok && (d.total > 0 || Object.keys(d.byClient || {}).length > 0)) {
        setBm({ on: true, byClient: d.byClient || {}, byMonth: d.byMonth || Array(12).fill(0), total: d.total || 0 })
      }
    } catch(e) {}
    setLoading(false)
  }

  async function saveGoals() {
    setSavingGoals(true)
    const newGoals = {
      umsatz: parseFloat(goalsInput.umsatz) || goals.umsatz,
      aufnahmen: parseInt(goalsInput.aufnahmen) || goals.aufnahmen,
      instagram: parseInt(goalsInput.instagram) || goals.instagram,
      ig_current: parseInt(igInput) || igFollowers,
    }
    await supabase.from('settings').upsert({ key: 'annual_goals', value: JSON.stringify(newGoals) }, { onConflict: 'key' })
    setGoals(newGoals)
    setIgFollowers(newGoals.ig_current)
    setSavingGoals(false)
  }

  // Calculations
  const yearCards = cards.filter(c => c.card_date?.startsWith(year + ''))
  const totalAufnahmen = yearCards.length
  const totalUmsatz = bm.on ? bm.total : yearCards.reduce((s, c) => s + (parseFloat(c.price) || 0), 0)

  const monthlyData = MONTHS.map((m, i) => ({
    month: m,
    count: yearCards.filter(c => new Date(c.card_date).getMonth() === i).length
  }))
  const maxMonth = Math.max(...monthlyData.map(m => m.count), 1)
  const curMonth = new Date().getMonth()

  function clientMonthCount(client, monthIdx) {
    const name = client.short_name || client.name
    return yearCards.filter(c =>
      new Date(c.card_date).getMonth() === monthIdx &&
      c.client_name && (
        c.client_name.toLowerCase() === name.toLowerCase() ||
        c.client_name.toLowerCase() === (client.name || '').toLowerCase()
      )
    ).length
  }

  function clientTotal(client) {
    const name = client.short_name || client.name
    return yearCards.filter(c => c.client_name && (
      c.client_name.toLowerCase() === name.toLowerCase() ||
      c.client_name.toLowerCase() === (client.name || '').toLowerCase()
    )).length
  }

  function clientUmsatz(client) {
    // Billomat nettó, ha az ügyfél össze van kötve és van adat; egyébként CRM-becslés
    if (bm.on && client.billomat_client_id != null && client.billomat_client_id !== '') {
      return bm.byClient[String(client.billomat_client_id)] || 0
    }
    const name = client.short_name || client.name
    const clientCards = yearCards.filter(c => c.client_name && (
      c.client_name.toLowerCase() === name.toLowerCase() ||
      c.client_name.toLowerCase() === (client.name || '').toLowerCase()
    ))
    const fromCards = clientCards.reduce((s, c) => s + (parseFloat(c.price) || 0), 0)
    if (fromCards > 0) return fromCards
    // fallback: count × default service price
    const defaultPrice = Object.values(client.service_prices || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0)
    return clientCards.length * defaultPrice
  }

  function clientMonthUmsatz(client, monthIdx) {
    const name = client.short_name || client.name
    const monthCards = yearCards.filter(c =>
      new Date(c.card_date).getMonth() === monthIdx &&
      c.client_name && (
        c.client_name.toLowerCase() === name.toLowerCase() ||
        c.client_name.toLowerCase() === (client.name || '').toLowerCase()
      )
    )
    const fromCards = monthCards.reduce((s, c) => s + (parseFloat(c.price) || 0), 0)
    if (fromCards > 0) return fromCards
    const defaultPrice = Object.values(client.service_prices || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0)
    return monthCards.length * defaultPrice
  }

  function GoalCircle({ pct, color, gradient, label, current, target, unit, remaining }) {
    const r = 54, circ = 2 * Math.PI * r
    const offset = circ - (Math.min(pct, 100) / 100) * circ
    return (
      <div style={{ flex: 1, background: '#fff', border: '0.5px solid #ddd9d2', borderRadius: 12, padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#8a8278', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>{label}</div>
        <div style={{ position: 'relative', width: 130, height: 130, marginBottom: 12 }}>
          <svg width="130" height="130" viewBox="0 0 130 130">
            {gradient && (
              <defs>
                <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f09433"/>
                  <stop offset="50%" stopColor="#dc2743"/>
                  <stop offset="100%" stopColor="#bc1888"/>
                </linearGradient>
              </defs>
            )}
            <circle cx="65" cy="65" r={r} fill="none" stroke="#eeeae6" strokeWidth="11"/>
            <circle cx="65" cy="65" r={r} fill="none"
              stroke={gradient ? 'url(#ig)' : color}
              strokeWidth="11"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 65 65)"
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1c1a16' }}>{Math.round(pct)}%</div>
            <div style={{ fontSize: 10, color: '#8a8278' }}>erreicht</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: gradient ? '#dc2743' : color }}>{typeof current === 'number' ? current.toLocaleString('de-DE') : current}{unit}</div>
            <div style={{ fontSize: 10, color: '#8a8278' }}>erreicht</div>
          </div>
          <div style={{ width: 1, background: '#eeeae6' }}/>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1a16' }}>{typeof target === 'number' ? target.toLocaleString('de-DE') : target}{unit}</div>
            <div style={{ fontSize: 10, color: '#8a8278' }}>Ziel</div>
          </div>
        </div>
        <div style={{ width: '100%', background: '#f4f2ef', borderRadius: 6, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#8a8278' }}>Noch <span style={{ color: '#1c1a16', fontWeight: 700 }}>{remaining}</span></div>
        </div>
      </div>
    )
  }

  if (loading) return <RechnungShell active="umsatz"><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'Arial', color: '#8a8278' }}>Wird geladen...</div></RechnungShell>

  const umsatzPct = goals.umsatz ? (totalUmsatz / goals.umsatz) * 100 : 0
  const aufnahmenPct = goals.aufnahmen ? (totalAufnahmen / goals.aufnahmen) * 100 : 0
  const igPct = goals.instagram ? (igFollowers / goals.instagram) * 100 : 0

  return (
    <RechnungShell active="umsatz">
      <style>{`:root{--bg:#f4f2ef;--bg2:#fff;--border:#ddd9d2;--t1:#1c1a16;--t3:#8a8278;--gold:#6b6b6e}`}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Kunden', value: clients.length },
            { label: `Aufnahmen ${year}`, value: totalAufnahmen },
            { label: `Umsatz ${year}${bm.on ? ' · netto (Billomat)' : ''}`, value: totalUmsatz ? totalUmsatz.toLocaleString('de-DE') + ' €' : '—' },
            { label: 'Ø pro Aufnahme', value: totalAufnahmen && totalUmsatz ? Math.round(totalUmsatz / totalAufnahmen).toLocaleString('de-DE') + ' €' : '—' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '0.5px solid #ddd9d2', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: '#8a8278', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Goal circles + settings */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <GoalCircle
            pct={umsatzPct} color="#6b6b6e" label="Umsatz-Ziel"
            current={totalUmsatz} target={goals.umsatz} unit=" €"
            remaining={(goals.umsatz - totalUmsatz).toLocaleString('de-DE') + ' €'}
          />
          <GoalCircle
            pct={aufnahmenPct} color="#15803d" label="Aufnahmen-Ziel"
            current={totalAufnahmen} target={goals.aufnahmen} unit=""
            remaining={(goals.aufnahmen - totalAufnahmen) + ' Aufnahmen'}
          />
          <GoalCircle
            pct={igPct} color="#dc2743" gradient label="Instagram-Ziel"
            current={igFollowers} target={goals.instagram} unit=""
            remaining={(goals.instagram - igFollowers).toLocaleString('de-DE') + ' Follower'}
          />

          {/* Goals settings */}
          <div style={{ width: 170, background: '#fff', border: '0.5px solid #ddd9d2', borderRadius: 12, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8a8278', textTransform: 'uppercase', letterSpacing: '.5px' }}>Ziele setzen</div>
            {[
              { label: 'Umsatz (€)', key: 'umsatz' },
              { label: 'Aufnahmen', key: 'aufnahmen' },
              { label: 'Instagram Ziel', key: 'instagram' },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 10, color: '#8a8278', marginBottom: 4 }}>{f.label}</div>
                <input type="number" value={goalsInput[f.key]} onChange={e => setGoalsInput(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', background: '#f4f2ef', border: '1.5px solid #ddd9d2', borderRadius: 7, padding: '6px 10px', fontSize: 13, fontWeight: 700, color: '#1c1a16', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#6b6b6e'}
                  onBlur={e => e.currentTarget.style.borderColor = '#ddd9d2'}
                />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 10, color: '#8a8278', marginBottom: 4 }}>Instagram aktuell</div>
              <input type="number" value={igInput} onChange={e => setIgInput(e.target.value)}
                style={{ width: '100%', background: '#f4f2ef', border: '1.5px solid #ddd9d2', borderRadius: 7, padding: '6px 10px', fontSize: 13, fontWeight: 700, color: '#1c1a16', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.currentTarget.style.borderColor = '#6b6b6e'}
                onBlur={e => e.currentTarget.style.borderColor = '#ddd9d2'}
              />
            </div>
            <button onClick={saveGoals} disabled={savingGoals}
              style={{ background: '#6b6b6e', color: '#fff', border: 'none', borderRadius: 7, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 'auto' }}>
              {savingGoals ? '...' : 'Speichern'}
            </button>
          </div>
        </div>

        {/* Bar chart */}
        <div style={{ background: '#fff', border: '0.5px solid #ddd9d2', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Aufnahmen pro Monat — {year}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
            {monthlyData.map((m, i) => {
              const h = m.count ? Math.max(Math.round((m.count / maxMonth) * 70), 4) : 2
              const isCur = i === curMonth
              return (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ fontSize: 9, color: m.count ? (isCur ? '#6b6b6e' : '#8a8278') : 'transparent', fontWeight: isCur ? 700 : 400 }}>{m.count || 0}</div>
                  <div style={{ width: '100%', height: h, background: isCur ? '#6b6b6e' : (m.count ? '#e8e4de' : '#f4f2ef'), borderRadius: '3px 3px 0 0' }}/>
                  <div style={{ fontSize: 9, color: isCur ? '#6b6b6e' : (m.count ? '#8a8278' : '#ccc8c0'), fontWeight: isCur ? 700 : 400 }}>{m.month}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Client table */}
        <div style={{ background: '#fff', border: '0.5px solid #ddd9d2', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '170px repeat(12,1fr) 50px 80px 80px', padding: '9px 14px', background: '#f4f2ef', borderBottom: '0.5px solid #ddd9d2', fontSize: 10, fontWeight: 700, color: '#8a8278', textTransform: 'uppercase', letterSpacing: '.4px', gap: 2, alignItems: 'center' }}>
            <span>Kunde</span>
            {MONTHS.map(m => <span key={m} style={{ textAlign: 'center' }}>{m}</span>)}
            <span style={{ textAlign: 'right' }}>Ges.</span>
            <span style={{ textAlign: 'right' }}>Umsatz</span>
            <span style={{ textAlign: 'right', color:'#15803d', fontWeight:700 }}>Gesamt €</span>
          </div>
          {clients.filter(c => clientTotal(c) > 0).sort((a, b) => clientTotal(b) - clientTotal(a)).map((c, i, arr) => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '170px repeat(12,1fr) 50px 80px 80px', padding: '9px 14px', borderBottom: i < arr.length - 1 ? '0.5px solid #eeeae6' : 'none', alignItems: 'center', gap: 2 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</div>
                {c.short_name && c.short_name !== c.name && <div style={{ fontSize: 10, color: '#8a8278' }}>{c.short_name}</div>}
              </div>
              {MONTHS.map((m, mi) => {
                const cnt = clientMonthCount(c, mi)
                return <div key={m} style={{ textAlign: 'center', fontSize: 11, fontWeight: cnt ? 700 : 400, color: cnt ? (mi === curMonth ? '#6b6b6e' : '#1c1a16') : '#ccc9c2' }}>{cnt || '—'}</div>
              })}
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#6b6b6e' }}>{clientTotal(c)}</div>
              <div style={{ textAlign: 'right', fontSize: 11, color: '#4a4540' }}>{clientUmsatz(c) ? clientUmsatz(c).toLocaleString('de-DE') + ' €' : '—'}</div>
              <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 700, color:'#15803d' }}>{clientUmsatz(c) ? clientUmsatz(c).toLocaleString('de-DE') + ' €' : '—'}</div>
            </div>
          ))}
          {/* Totals */}
          <div style={{ display: 'grid', gridTemplateColumns: '170px repeat(12,1fr) 50px 80px 80px', padding: '9px 14px', background: '#faf9f7', borderTop: '1px solid #ddd9d2', alignItems: 'center', gap: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8a8278', textTransform: 'uppercase' }}>Gesamt</div>
            {MONTHS.map((m, mi) => {
              const cnt = monthlyData[mi].count
              const monthUmsatz = bm.on ? (bm.byMonth[mi] || 0) : yearCards.filter(c => new Date(c.card_date).getMonth() === mi).reduce((s, c) => s + (parseFloat(c.price)||0), 0)
              return <div key={m} style={{ textAlign: 'center', fontSize: 10 }}>
                <div style={{ fontWeight: cnt ? 700 : 400, color: cnt ? (mi === curMonth ? '#6b6b6e' : '#1c1a16') : '#ccc9c2' }}>{cnt || '—'}</div>
                {monthUmsatz > 0 && <div style={{ color:'#15803d', fontWeight:700, marginTop:2 }}>{monthUmsatz.toLocaleString('de-DE')}€</div>}
              </div>
            })}
            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#6b6b6e' }}>{totalAufnahmen}</div>
            <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 700 }}>{totalUmsatz ? totalUmsatz.toLocaleString('de-DE') + ' €' : '—'}</div>
            <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 700, color:'#15803d' }}>{totalUmsatz ? totalUmsatz.toLocaleString('de-DE') + ' €' : '—'}</div>
          </div>
        </div>

      </div>
    </RechnungShell>
  )
}
