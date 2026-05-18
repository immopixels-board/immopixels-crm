'use client'
import React, { useState, useEffect } from 'react'

const CHANGELOGS = [
  { ver: 'v2.6.6', date: '2026-05-18', items: ['Oszlop szerkesztés: popup modal (mint új hozzáadásnál)', 'Szín választó oszlophoz szerkesztéskor is', 'dot_color mentés szerkesztéskor'] },
  { ver: 'v2.6.5', date: '2026-05-18', items: ['Beschreibung: nagyobb betű + link rendering', 'Aufnahme-Kategorien: szín picker + egyéni szín', 'Új kategóriák megjelennek a kártyákon (dinamikus TYPES)', 'PhotoCategorySection a settings oldalon'] },
  { ver: 'v2.6.4', date: '2026-05-18', items: ['Notiz: kártya mérete szöveghez igazodik', 'Description + komment: linkek felismerése + rövidítés', 'Client extra_link mező (pl. Trello)', 'Extra link megjelenik a kártyán'] },
  { ver: 'v2.6.3', date: '2026-05-18', items: ['2FA kikapcsolva — közvetlen jelszavas login', 'Staff form: jelszó mező (új és meglévő)', 'GCal nézet: új termin létrehozás', 'endyk.cristian naptár eltávolítva'] },
  { ver: 'v2.6.0', date: '2026-05-17', items: ['GCal kétirányú szinkron', 'Board→GCal auto push', 'GCal→Board 30 perc cron', 'Kategória felismerés'] },
  { ver: 'v2.5.9', date: '2026-05-17', items: ['GCal kétirányú szinkron', 'Board→GCal: kártya cím+dátum esetén auto push', 'GCal→Board: 30 percenként auto import (location alapján)', 'Kategória felismerés (Drohne/Reel/Foto)', 'OAuth scope: calendar.events (írás)', 'beschäftigt státusz (booking blokk)'] },
  { ver: 'v2.5.8', date: '2026-05-17', items: ['Kártya drag csak grip ikonon', 'Gombok/kattintás javítva a kártyán', 'Welcome modal konfettivel (első belépés)'] },
  { ver: 'v2.5.7', date: '2026-05-17', items: ['Kártya grip ikon (drag handle)', 'Hover menü: fel/le nyilak eltávolítva', 'GCal kártyák: addr megjelenítés fix'] },
  { ver: 'v2.5.6', date: '2026-05-17', items: ['Oszlop drag race condition fix (postgres_changes suppress)', 'moveColumnToIndex: suppress loadCols írás közben'] },
  { ver: 'v2.5.5', date: '2026-05-17', items: ['Oszlop drag: endColDrag placeholder-index fix (ghost helyett ph pozíció)'] },
  { ver: 'v2.5.0', date: '2026-05-17', items: ['Debug: minden változás rögzítve', 'Debug: Archiviert kártyák Törölt fülön', 'Debug: per-user filter javítva', 'Changelog frissítve minden verzióhoz'] },
  { ver: 'v2.4.9', date: '2026-05-17', items: ['Kártya törlés: Archiviert oszlopba kerül', 'Undo toast 5mp visszaszámlálóval', 'Naptár: nagyobb cellák, zoom 110%', 'Confirm dialóg saját design'] },
  { ver: 'v2.4.8', date: '2026-05-17', items: ['Kártya: piros keret 2+ nap lejárt', '5+ nap: piros háttér', 'Fertig/terminieren kizárva', 'Note broadcast javítva', 'Naptár header + zoom gombok'] },
  { ver: 'v2.4.7', date: '2026-05-17', items: ['Oszlop: Nur für mich sichtbar toggle', 'GCal: több naptár (CD/DB/EL/NS)', 'GCal: Dr./orvos/kávé szűrés', 'Importált kártyához fotós'] },
  { ver: 'v2.4.6b', date: '2026-05-17', items: ['GCal: Auf Board importieren gomb', 'GCal Import oszlop automatikus', 'Szülinapoknál import rejtve'] },
  { ver: 'v2.4.6', date: '2026-05-17', items: ['Stats: havi bontás 12 hónap', 'Stats: célkörök (Umsatz/Aufnahmen/Instagram)', 'Stats: Instagram manuális'] },
  { ver: 'v2.4.5', date: '2026-05-17', items: ['Stats: Umsatz Kundenkártyából (service_prices)', 'Stats: teljes német fordítás', 'Debug: per-user filter'] },
  { ver: 'v2.4.4', date: '2026-05-17', items: ['Stats auth fix (email alapú)', 'Háttérképek frissítve'] },
  { ver: 'v2.4.3', date: '2026-05-17', items: ['Per-user háttér izoláció fix', 'Kép/szín kizárás', 'Cron fix Hobby plan'] },
  { ver: 'v2.4.2', date: '2026-05-17', items: ['Soft-delete kártyák', 'Auto ügyfél felismerés', 'Napi backup', 'GCal token mentés', 'Statisztika oldal'] },
  { ver: 'v2.4.1', date: '2026-05-17', items: ['Dropbox gomb', 'Fertig gomb', 'Manuális mentés'] },
  { ver: 'v2.4.0', date: '2026-05-17', items: ['Telefonbuch', 'Board kereső', 'Dropbox badge', 'Kunde form bővítés'] },
  { ver: 'v2.3.9', date: '2026-05-16', items: ['Google Naptár integráció', 'Oszlop láthatóság', 'Drive link mező'] },
  { ver: 'v2.3.8', date: '2026-05-16', items: ['7 háttérkép', 'Online státusz', 'Chat némítás', 'Email OTP 2FA'] },
  { ver: 'v2.3.7', date: '2026-05-16', items: ['Team Chat újraépítés', 'Online státusz', '@All taggelés', 'Drag & Drop fix'] },
]

const INIT_COLORS = { 'CD': '#b8892a', 'DB': '#1d5ec7', 'EL': '#15803d', 'NS': '#6d28d9', 'CA': '#b91c1c' }

export default function DebugPanel({ supabase, localLog, me }) {
  const [tab, setTab] = useState('logs')
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('')
  const [staffFilter, setStaffFilter] = useState('')
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
    const [{ data: columns }] = await Promise.all([
      supabase.from('columns').select('*')
    ])
    setCols(columns || [])
    // Archiviert column cards
    const archCol = (columns || []).find(c => c.title === 'Archiviert')
    let allDeleted = []
    if (archCol) {
      const { data: archCards } = await supabase.from('cards').select('*').eq('column_id', archCol.id).order('updated_at', { ascending: false })
      allDeleted = [...(archCards || [])]
    }
    // Hard-deleted cards
    const { data: hardDeleted } = await supabase.from('cards').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
    allDeleted = [...allDeleted, ...(hardDeleted || [])]
    setDeleted(allDeleted)
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

  const filtered = logs.filter(l => {
    if (staffFilter && l.staff_init !== staffFilter) return false
    if (filter && !l.action?.toLowerCase().includes(filter.toLowerCase()) && !l.staff_name?.toLowerCase().includes(filter.toLowerCase())) return false
    return true
  })

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
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Suchen..." style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 9px', fontSize: 11, outline: 'none' }} />
            <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px', fontSize: 11, outline: 'none', cursor: 'pointer', color: 'var(--t1)' }}>
              <option value="">Alle</option>
              {[...new Set(logs.map(l => l.staff_init).filter(Boolean))].map(init => (
                <option key={init} value={init}>{init}</option>
              ))}
            </select>
            <button onClick={clearLogs} style={{ background: 'none', border: '1px solid var(--rdbr)', color: 'var(--red)', borderRadius: 6, padding: '4px 9px', fontSize: 11, cursor: 'pointer' }}>🗑</button>
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
