'use client'
import React, { useState, useEffect } from 'react'

export default function DebugPanel({ supabase, localLog }) {
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLogs()
    // Realtime
    const ch = supabase.channel('debug-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'debug_log' }, payload => {
        setLogs(prev => [payload.new, ...prev].slice(0, 500))
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function loadLogs() {
    const { data } = await supabase
      .from('debug_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    setLogs(data || [])
    setLoading(false)
  }

  async function clearLogs() {
    if (!confirm('Törlöd az összes debug log-ot?')) return
    await supabase.from('debug_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setLogs([])
  }

  const filtered = filter ? logs.filter(l => 
    l.action?.toLowerCase().includes(filter.toLowerCase()) ||
    l.staff_name?.toLowerCase().includes(filter.toLowerCase())
  ) : logs

  const INIT_COLORS = {
    'CD': '#b8892a', 'DB': '#1d5ec7', 'EL': '#15803d',
    'NS': '#6d28d9', 'CA': '#b91c1c',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 7, flexShrink: 0 }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Szűrés..." style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 9px', fontSize: 11, outline: 'none' }} />
        <button onClick={clearLogs} style={{ background: 'none', border: '1px solid var(--rdbr)', color: 'var(--red)', borderRadius: 6, padding: '4px 9px', fontSize: 11, cursor: 'pointer' }}>🗑 Törlés</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }}>
        {loading && <div style={{ color: 'var(--t3)', fontSize: 12 }}>Betöltés...</div>}
        {!loading && filtered.length === 0 && <div style={{ color: 'var(--t3)', fontSize: 12 }}>Nincs esemény</div>}
        {filtered.map((log, i) => {
          const time = new Date(log.created_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          const color = INIT_COLORS[log.staff_init] || '#999'
          return (
            <div key={log.id || i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: color + '22', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                {log.staff_init || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--t1)', lineHeight: 1.4, wordBreak: 'break-word' }}>{log.action}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 1 }}>{log.staff_name} · {time}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
