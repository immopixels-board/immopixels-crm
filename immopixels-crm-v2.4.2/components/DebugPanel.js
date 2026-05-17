'use client'
import React, { useState, useEffect } from 'react'

const CHANGELOGS = [
  { ver: 'v2.4.2', date: '2026-05-17', items: ['Soft-delete kártyák (visszaállítható)', 'Auto ügyfél felismerés kártya névből', 'Napi automatikus backup (Supabase)', 'Óránkénti GCal snapshot', 'Debug panel: Changelog + Backup + Törölt kártyák fül', 'GCal token mentés Supabase-be (cron)', 'Ügyfél statisztika oldal (admin)'] },
  { ver: 'v2.4.1', date: '2026-05-17', items: ['Dropbox gomb CardModal footer felett', 'Fertig gomb a Senden mellett', 'Manuális mentés gomb (floppy)', 'GCal kártyákon addr nem jelenik meg külön'] },
  { ver: 'v2.4.0', date: '2026-05-17', items: ['Telefonbuch fül', 'Board kereső', 'Dropbox badge kártyákon', 'Kunde form bővítés (Vorname/Nachname/Tel2/Dropbox)', 'Drag: egész kártya húzható', 'Claude gomb törölve'] },
  { ver: 'v2.3.9', date: '2026-05-16', items: ['Google Naptár integráció (OAuth)', 'Oszlop láthatóság (Nur für mich)', 'Drive/WeTransfer link mező', 'Build fix: page.js → BoardApp.js'] },
  { ver: 'v2.3.8', date: '2026-05-16', items: ['7 háttérkép Settings-ben', 'Online státusz pötty avatarokon', 'Chat némítás gomb', 'Email OTP 2FA login', 'React #423 fix'] },
  { ver: 'v2.3.7', date: '2026-05-16', items: ['Team Chat újraépítés', 'Online státusz (zöld/narancs/szürke)', 'Link előnézet chatben', '@All taggelés javítás', '4 háttérkép', 'Drag & Drop fix'] },
]

const INIT_COLORS = { 'CD': '#b8892a', 'DB': '#1d5ec7', 'EL': '#15803d', 'NS': '#6d28d9', 'CA': '#b91c1c' }

export default function DebugPanel({ supabase, localLog, me }) {
  const [tab, setTab] = useState('logs')
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleted, setDeleted] = useState([])
  const [cols, setCols] = useState([])
  const [backups, setBackups] = useState([])
  const [restoring, setRestoring] = useState(null)

  useEffect(() => {
    loadLogs()
    const ch = supabase.channel('debug-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'debug_log' }, payload => {
        setLogs(prev => [payload.new, ...prev].slice(0, 500))
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  useEffect(() => {
    if (tab === 'deleted') loadDeleted()
    if (tab === 'backup') loadBackups()
  }, [tab])

  async function loadLogs() {
    const { data } = await supabase.from('debug_log').select('*').order('created_at', { ascending: false }).limit(500)
    setLogs(data || [])
    setLoading(false)
  }

  async function loadDeleted() {
    const [{ data: cards }, { data: columns }] = await Promise.all([
      supabase.from('cards').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
      supabase.from('columns').select('*')
    ])
    setDeleted(cards || [])
    setCols(columns || [])
  }

  async function loadBackups() {
    const { data } = await supabase.from('backups').select('id, created_at, cards_count, clients_count').order('created_at', { ascending: false }).limit(30)
    setBackups(data || [])
  }

  async function restoreCard(card) {
    setRestoring(card.id)
    // Check if original column still exists
    const colExists = cols.find(c => c.id === card.column_id)
    let targetColId = card.column_id
    if (!colExists) {
      // Put in first column
      targetColId = cols[0]?.id
      if (!targetColId) { setRestoring(null); return }
    }
    await supabase.from('cards').update({ deleted_at: null, deleted_by: null, column_id: targetColId }).eq('id', card.id)
    setDeleted(prev => prev.filter(c => c.id !== card.id))
    setRestoring(null)
  }

  async function downloadBackup(backup) {
    const { data } = await supabase.from('backups').select('data').eq('id', backup.id).single()
    if (!data?.data) return
    const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup_${backup.created_at.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
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

  const tabStyle = (t) => ({
    padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
    borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
    color: tab === t ? 'var(--gold)' : 'var(--t3)', background: 'none', border: 'none',
    borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
  })

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, padding: '6px 14px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {[['logs', '📋 Log'], ['deleted', '🗑 Törölt'], ['backup', '💾 Backup'], ['changelog', '📝 Changelog']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{l}</button>
        ))}
      </div>

      {/* LOGS TAB */}
      {tab === 'logs' && (
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
      )}

      {/* DELETED TAB */}
      {tab === 'deleted' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {deleted.length === 0 && <div style={{ color: 'var(--t3)', fontSize: 12 }}>Nincs törölt kártya</div>}
          {deleted.map(card => {
            const col = cols.find(c => c.id === card.column_id)
            const time = card.deleted_at ? new Date(card.deleted_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
            return (
              <div key={card.id} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>{card.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>
                    {col ? col.title : 'Törölt oszlop'} · {card.deleted_by || '?'} · {time}
                  </div>
                </div>
                <button
                  onClick={() => restoreCard(card)}
                  disabled={restoring === card.id}
                  style={{ background: 'var(--grbg)', border: '1px solid var(--grbr)', color: 'var(--green)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  {restoring === card.id ? '...' : '↩ Vissza'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* BACKUP TAB */}
      {tab === 'backup' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 10 }}>Automatikus napi mentés — 30 napig megőrizve</div>
          {backups.length === 0 && <div style={{ color: 'var(--t3)', fontSize: 12 }}>Még nincs backup</div>}
          {backups.map(b => {
            const time = new Date(b.created_at).toLocaleString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            return (
              <div key={b.id} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)' }}>{time}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 1 }}>{b.cards_count} kártya · {b.clients_count} ügyfél</div>
                </div>
                <button onClick={() => downloadBackup(b)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--t2)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                  ⬇ JSON
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* CHANGELOG TAB */}
      {tab === 'changelog' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {CHANGELOGS.map(cl => (
            <div key={cl.ver} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', background: 'var(--gdbg)', border: '1px solid var(--gdbr)', borderRadius: 5, padding: '2px 8px', fontFamily: 'monospace' }}>{cl.ver}</span>
                <span style={{ fontSize: 10, color: 'var(--t3)' }}>{cl.date}</span>
              </div>
              {cl.items.map((item, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--t2)', padding: '2px 0 2px 10px', borderLeft: '2px solid var(--border)', marginBottom: 2 }}>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
