'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import TopNav from '../../components/TopNav'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const ACC = '#6b6b6e', DARK = '#2a2a28', MUT = '#8a8278', LINE = '#ece4d6'
const eur = n => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const norm = s => String(s || '').toLowerCase().trim()
function cleanName(name) {
  if (!name) return ''
  let s = String(name).replace(/\s*(Herr|Frau|Dr\.?|Hr\.?|Fr\.?)\b.*$/i, '').replace(/(Herr|Frau)[A-ZÄÖÜ].*$/, '')
  return s.trim() || String(name).trim()
}
function initialsOf(name) {
  const c = cleanName(name) || name || ''
  const w = c.split(/\s+/).filter(Boolean)
  if (!w.length) return '?'
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase()
}
function faviconOf(c) {
  const m = String(c.www || c.website || c.extra_link || '').match(/^(?:https?:\/\/)?([^\/\s]+)/i)
  return m ? 'https://www.google.com/s2/favicons?domain=' + m[1] + '&sz=64' : null
}

function cityOf(addr) {
  // "Straße 1, 67310 Ort" → "Ort"
  const parts = String(addr || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!parts.length) return ''
  const last = parts[parts.length - 1]
  const m = last.match(/^\d{4,5}\s+(.+)$/)
  return m ? m[1] : last
}

export default function KundenPage() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [invoices, setInvoices] = useState([])
  const [q, setQ] = useState('')
  const [myId, setMyId] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { init() }, [])
  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: staff } = await supabase.from('staff').select('*').eq('email', user.email).single()
    if (staff) setMyId(staff.id)
    await load()
    setLoading(false)
  }
  async function load() {
    const [{ data: cls }, { data: invs }] = await Promise.all([
      supabase.from('clients').select('id,name,short_name,kundennr,addr,email,tel,vat_number,extra_link,color').order('name'),
      supabase.from('invoices').select('id,client_id,status,total_gross,storno_of')
    ])
    setClients(cls || [])
    setInvoices(invs || [])
  }

  // ügyfelenkénti összesítés
  const stats = useMemo(() => {
    const m = {}
    for (const inv of invoices) {
      if (!inv.client_id || inv.storno_of) continue
      if (inv.status === 'draft' || inv.status === 'storno') {
        // vázlatot/sztornót nem számoljuk a kiállítottba
        if (inv.status === 'draft') continue
      }
      const s = m[inv.client_id] || (m[inv.client_id] = { count: 0, paid: 0, total: 0 })
      s.count++
      s.total += Number(inv.total_gross) || 0
      if (inv.status === 'paid') s.paid += Number(inv.total_gross) || 0
    }
    return m
  }, [invoices])

  const rows = useMemo(() => {
    const term = norm(q)
    return clients
      .map(c => ({ ...c, ort: cityOf(c.addr), s: stats[c.id] || { count: 0, paid: 0, total: 0 } }))
      .filter(c => !term || norm(c.name).includes(term) || norm(c.kundennr).includes(term) || norm(c.ort).includes(term))
      .sort((a, b) => b.s.total - a.s.total || a.name.localeCompare(b.name))
  }, [clients, stats, q])

  const totalUmsatz = useMemo(() => rows.reduce((s, c) => s + c.s.paid, 0), [rows])

  function exportCsv() {
    const head = ['Kundennummer', 'Firmenname', 'Kürzel', 'Adresse', 'Ort', 'E-Mail', 'Telefon', 'USt-ID', 'Rechnungen', 'Bezahlt', 'Gesamt']
    const lines = [head]
    for (const c of rows) lines.push([c.kundennr || '', c.name || '', c.short_name || '', c.addr || '', c.ort || '', c.email || '', c.tel || '', c.vat_number || '', c.s.count, c.s.paid.toFixed(2), c.s.total.toFixed(2)])
    const csv = lines.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\ufeff' + csv)
    a.download = 'kunden_export.csv'; a.click()
  }

  async function importCsv(e) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true)
    try {
      const text = await file.text()
      const lines = text.replace(/^\ufeff/, '').split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) { alert('Leere oder ungültige CSV.'); setBusy(false); e.target.value = ''; return }
      const parse = l => { const out = []; let cur = '', inq = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') { if (inq && l[i + 1] === '"') { cur += '"'; i++ } else inq = !inq } else if (ch === ',' && !inq) { out.push(cur); cur = '' } else cur += ch } out.push(cur); return out }
      const head = parse(lines[0]).map(h => norm(h))
      const col = (...names) => { for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i } return -1 }
      const ci = { knr: col('kundennummer', 'kundennr', 'client_number'), name: col('firmenname', 'name'), addr: col('adresse', 'address'), email: col('e-mail', 'email'), tel: col('telefon', 'phone', 'tel'), vat: col('ust-id', 'vat_number', 'ust') }
      if (ci.name < 0) { alert('CSV braucht mindestens eine Spalte „Firmenname" oder „Name".'); setBusy(false); e.target.value = ''; return }
      let created = 0, updated = 0, skipped = 0
      const existing = {}; for (const c of clients) existing[norm(c.name)] = c
      for (let i = 1; i < lines.length; i++) {
        const r = parse(lines[i]); const name = (r[ci.name] || '').split(/[\r\n]/)[0].trim(); if (!name) { skipped++; continue }
        const row = {}
        if (ci.knr >= 0 && r[ci.knr]) row.kundennr = r[ci.knr].trim()
        if (ci.addr >= 0 && r[ci.addr]) row.addr = r[ci.addr].trim()
        if (ci.email >= 0 && r[ci.email]) row.email = r[ci.email].trim()
        if (ci.tel >= 0 && r[ci.tel]) row.tel = r[ci.tel].trim()
        if (ci.vat >= 0 && r[ci.vat]) row.vat_number = r[ci.vat].trim()
        const ex = existing[norm(name)]
        if (ex) { const { error } = await supabase.from('clients').update(row).eq('id', ex.id); error ? skipped++ : updated++ }
        else { const { error } = await supabase.from('clients').insert({ name, ...row }); error ? skipped++ : created++ }
      }
      alert(`Import fertig: ${created} neu, ${updated} aktualisiert, ${skipped} übersprungen.`)
      await load()
    } catch (err) { alert('Import-Fehler: ' + (err.message || err)) }
    setBusy(false); e.target.value = ''
  }

  if (loading) return <Shell><div style={{ padding: 60, textAlign: 'center', color: MUT }}>Lädt…</div></Shell>

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: DARK }}>Kunden</div>
          <div style={{ fontSize: 13, color: MUT, marginTop: 2 }}>{rows.length} Kunden · {eur(totalUmsatz)} bezahlt gesamt</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCsv} style={btnGhost}><i className="ti ti-download" style={{ fontSize: 15 }}></i> Export</button>
          <label style={{ ...btnGhost, cursor: 'pointer' }}><i className="ti ti-upload" style={{ fontSize: 15 }}></i> Import<input type="file" accept=".csv" onChange={importCsv} style={{ display: 'none' }} /></label>
          <button onClick={() => { window.location.href = '/?newclient=1' }} style={btnPrimary}><i className="ti ti-plus" style={{ fontSize: 15 }}></i> Neuer Kunde</button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 11, top: 10, fontSize: 16, color: MUT }}></i>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Name, Kundennummer oder Ort suchen…" style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid ' + LINE, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 150px 90px 180px 130px', gap: 10, padding: '11px 16px', background: '#faf8f4', fontSize: 11, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '.03em' }}>
          <div>Kd-Nr.</div><div>Name</div><div>Ort</div><div style={{ textAlign: 'center' }}>Rechn.</div><div style={{ textAlign: 'right' }}>Bezahlt / Gesamt</div><div style={{ textAlign: 'right' }}>Aktion</div>
        </div>
        {rows.map(c => (
          <div key={c.id} onClick={() => { window.location.href = '/kunden/' + c.id }} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 150px 90px 180px 130px', gap: 10, padding: '13px 16px', borderTop: '1px solid ' + LINE, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#faf8f4'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ fontWeight: 600, color: ACC }}>{c.kundennr || '—'}</div>
            <div style={{ fontWeight: 500, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 9 }}>
              <KAvatar c={c} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{cleanName(c.name)}</span>
            </div>
            <div style={{ color: MUT, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ort || '—'}</div>
            <div style={{ textAlign: 'center' }}>{c.s.count}</div>
            <div style={{ textAlign: 'right' }}><span style={{ fontWeight: 600, color: '#2f7a4f' }}>{eur(c.s.paid)}</span> <span style={{ color: MUT, fontSize: 12 }}>/ {eur(c.s.total)}</span></div>
            <div style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => { window.location.href = '/rechnungen/neu?client=' + c.id }} style={{ fontSize: 12, padding: '5px 10px', border: '1px solid ' + LINE, borderRadius: 7, background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, color: DARK }}><i className="ti ti-file-plus" style={{ fontSize: 14 }}></i> Rechnung</button>
            </div>
          </div>
        ))}
        {!rows.length && <div style={{ padding: 40, textAlign: 'center', color: MUT }}>Keine Kunden gefunden.</div>}
      </div>
      <div style={{ fontSize: 12, color: MUT, marginTop: 10, textAlign: 'center' }}>„Bezahlt" = tatsächlich bezahlte Rechnungen · „Gesamt" = alle gestellten Rechnungen</div>
    </Shell>
  )
}

const btnGhost = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', fontSize: 14, fontWeight: 500, border: '1px solid ' + LINE, borderRadius: 8, background: '#fff', cursor: 'pointer', color: DARK }

function KAvatar({ c }) {
  const [err, setErr] = useState(false)
  const fav = faviconOf(c)
  if (fav && !err) return <img src={fav} onError={() => setErr(true)} style={{ width: 26, height: 26, borderRadius: 6, objectFit: 'contain', background: '#fff', border: '1px solid ' + LINE, flexShrink: 0 }} alt="" />
  return <div style={{ width: 26, height: 26, borderRadius: 6, background: ACC + '1f', color: ACC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0, border: '1px solid ' + ACC + '33' }}>{initialsOf(c.name)}</div>
}
const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 8, background: ACC, color: '#fff', cursor: 'pointer' }

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f7f4ee' }}>
      <TopNav active="kunden-liste" />
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>{children}</div>
    </div>
  )
}
