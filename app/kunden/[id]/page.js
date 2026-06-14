'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'
import TopNav from '../../../components/TopNav'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const ACC = '#6b6b6e', DARK = '#2a2a28', MUT = '#8a8278', LINE = '#ece4d6', GREEN = '#2f7a4f', RED = '#b3402f'
const eur = n => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const nrm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const STATUS = { draft: { label: 'Entwurf', c: '#8a8278', bg: '#f0ece4' }, open: { label: 'Offen', c: '#185fa5', bg: '#e6f1fb' }, overdue: { label: 'Überfällig', c: '#b3402f', bg: '#fcebeb' }, paid: { label: 'Bezahlt', c: '#3b6d11', bg: '#eaf3de' }, storno: { label: 'Storniert', c: '#8a8278', bg: '#f0ece4' } }

export default function KundeProfil() {
  const params = useParams()
  const id = params?.id
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState(null)
  const [allClients, setAllClients] = useState([])
  const [invoices, setInvoices] = useState([])
  const [cards, setCards] = useState([])
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (id) load() }, [id])
  async function load() {
    const [{ data: c }, { data: cls }, { data: invs }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('clients').select('id,name,short_name,kundennr'),
      supabase.from('invoices').select('id,client_id,invoice_number,invoice_date,status,total_gross,storno_of').eq('client_id', id)
    ])
    setClient(c); setForm(c || {}); setAllClients(cls || [])
    setInvoices((invs || []).sort((a, b) => (b.invoice_date || '').localeCompare(a.invoice_date || '')))
    // kapcsolódó kártyák: a client_name feloldása erre az ügyfélre
    if (c) {
      const { data: cd } = await supabase.from('cards').select('id,title,client_name,card_date,card_type,booking_address').is('deleted_at', null)
      const mine = (cd || []).filter(card => {
        if (card.card_type === 'todo') return false
        const cn = card.client_name
        if (!cn) return false
        if (cn === c.name || cn === c.short_name) return true
        const n = nrm(cn)
        return n && (nrm(c.name) === n || (c.short_name && nrm(c.short_name) === n))
      })
      setCards(mine)
    }
    setLoading(false)
  }

  const stats = useMemo(() => {
    let count = 0, paid = 0, open = 0
    for (const i of invoices) {
      if (i.storno_of || i.status === 'draft' || i.status === 'storno') continue
      count++
      if (i.status === 'paid') paid += Number(i.total_gross) || 0
      else open += Number(i.total_gross) || 0
    }
    return { count, paid, open }
  }, [invoices])

  // lehetséges duplikátumok: hasonló nevű más ügyfelek
  const dupes = useMemo(() => {
    if (!client) return []
    const n = nrm(client.name)
    if (!n) return []
    return allClients.filter(c => c.id !== client.id && c.name && (nrm(c.name).includes(n) || n.includes(nrm(c.name))) && nrm(c.name).length > 2)
  }, [client, allClients])

  async function save() {
    setBusy(true)
    try {
      const upd = { name: form.name, kundennr: form.kundennr || null, addr: form.addr || null, email: form.email || null, tel: form.tel || null, vat_number: form.vat_number || null, short_name: form.short_name || null, contact_firstname: form.contact_firstname || null, contact_lastname: form.contact_lastname || null }
      const { error } = await supabase.from('clients').update(upd).eq('id', id)
      if (error) throw error
      setEdit(false); await load()
    } catch (e) { alert('Fehler: ' + (e.message || e)) }
    setBusy(false)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f7f4ee' }}><TopNav active="kunden-liste" /><div style={{ padding: 60, textAlign: 'center', color: MUT }}>Lädt…</div></div>
  if (!client) return <div style={{ minHeight: '100vh', background: '#f7f4ee' }}><TopNav active="kunden-liste" /><div style={{ padding: 60, textAlign: 'center', color: MUT }}>Kunde nicht gefunden. <a href="/kunden" style={{ color: ACC }}>← Zur Liste</a></div></div>

  const inp = { width: '100%', padding: '8px 10px', border: '1px solid ' + LINE, borderRadius: 7, fontSize: 14, boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: MUT, marginBottom: 3, display: 'block', fontWeight: 600 }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f4ee' }}>
      <TopNav active="kunden-liste" />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        <a href="/kunden" style={{ fontSize: 13, color: MUT, textDecoration: 'none' }}>← Zur Kundenliste</a>

        {/* fejléc */}
        <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: 18, marginTop: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              {!edit ? (
                <>
                  <div style={{ fontSize: 20, fontWeight: 800, color: DARK }}>{client.name}</div>
                  <div style={{ fontSize: 13, color: MUT, marginTop: 3 }}><b style={{ color: ACC }}>{client.kundennr || 'keine Kd-Nr.'}</b>{client.short_name ? ' · Kürzel: ' + client.short_name : ''}</div>
                  <div style={{ fontSize: 13, color: MUT, marginTop: 6, lineHeight: 1.6 }}>
                    {client.addr && <div>{client.addr}</div>}
                    {client.email && <div>✉ {client.email}</div>}
                    {client.tel && <div>☎ {client.tel}</div>}
                    {client.vat_number && <div>USt-ID: {client.vat_number}</div>}
                  </div>
                </>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={lbl}>Firmenname</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></div>
                  <div><label style={lbl}>Kundennummer</label><input value={form.kundennr || ''} onChange={e => setForm({ ...form, kundennr: e.target.value })} style={inp} /></div>
                  <div><label style={lbl}>Kürzel</label><input value={form.short_name || ''} onChange={e => setForm({ ...form, short_name: e.target.value })} style={inp} /></div>
                  <div><label style={lbl}>USt-ID</label><input value={form.vat_number || ''} onChange={e => setForm({ ...form, vat_number: e.target.value })} style={inp} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Adresse</label><input value={form.addr || ''} onChange={e => setForm({ ...form, addr: e.target.value })} style={inp} /></div>
                  <div><label style={lbl}>E-Mail</label><input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} /></div>
                  <div><label style={lbl}>Telefon</label><input value={form.tel || ''} onChange={e => setForm({ ...form, tel: e.target.value })} style={inp} /></div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {!edit ? (
                <>
                  <button onClick={() => { window.location.href = '/rechnungen/neu?client=' + client.id }} style={btnPrimary}>+ Rechnung</button>
                  <button onClick={() => setEdit(true)} style={btnGhost}>Bearbeiten</button>
                </>
              ) : (
                <>
                  <button onClick={save} disabled={busy} style={btnPrimary}>{busy ? '…' : 'Speichern'}</button>
                  <button onClick={() => { setEdit(false); setForm(client) }} style={btnGhost}>Abbrechen</button>
                </>
              )}
            </div>
          </div>

          {/* összesítő */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: LINE, borderRadius: 8, overflow: 'hidden', marginTop: 16 }}>
            <div style={{ background: '#fff', padding: 12 }}><div style={{ fontSize: 11, color: MUT }}>Rechnungen</div><div style={{ fontSize: 18, fontWeight: 800 }}>{stats.count}</div></div>
            <div style={{ background: '#fff', padding: 12 }}><div style={{ fontSize: 11, color: MUT }}>Bezahlt</div><div style={{ fontSize: 18, fontWeight: 800, color: GREEN }}>{eur(stats.paid)}</div></div>
            <div style={{ background: '#fff', padding: 12 }}><div style={{ fontSize: 11, color: MUT }}>Offen</div><div style={{ fontSize: 18, fontWeight: 800, color: stats.open > 0 ? RED : DARK }}>{eur(stats.open)}</div></div>
          </div>
        </div>

        {/* duplikátum-figyelmeztetés */}
        {dupes.length > 0 && (
          <div style={{ background: '#fbeeea', border: '1px solid #e6c4ba', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div style={{ flex: 1, fontSize: 13, color: DARK }}>
              Möglicher Doppel-Kunde: {dupes.map(d => <b key={d.id} style={{ marginRight: 8 }}>{d.name}{d.kundennr ? ' (' + d.kundennr + ')' : ''}</b>)}
              <div style={{ fontSize: 11, color: MUT, marginTop: 2 }}>Zusammenführen folgt in einem nächsten Schritt — vorerst nur Hinweis.</div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* számlák */}
          <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid ' + LINE, fontSize: 13, fontWeight: 700 }}>Rechnungen ({invoices.length})</div>
            {invoices.length === 0 && <div style={{ padding: 20, color: MUT, fontSize: 13, textAlign: 'center' }}>Noch keine Rechnungen.</div>}
            {invoices.map(i => { const st = STATUS[i.status] || STATUS.open; return (
              <div key={i.id} onClick={() => { window.location.href = '/rechnungen/neu?id=' + i.id }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderTop: '1px solid ' + LINE, fontSize: 13, cursor: 'pointer' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>{st.label}</span>
                <span style={{ color: MUT, whiteSpace: 'nowrap' }}>{i.invoice_date}</span>
                <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{i.invoice_number || '—'}</span>
                <span style={{ flex: 1, textAlign: 'right', fontWeight: 700 }}>{eur(i.total_gross)}</span>
              </div>
            ) })}
          </div>

          {/* kapcsolódó kártyák */}
          <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid ' + LINE, fontSize: 13, fontWeight: 700 }}>Verknüpfte Karten / Shootings ({cards.length})</div>
            {cards.length === 0 && <div style={{ padding: 20, color: MUT, fontSize: 13, textAlign: 'center' }}>Keine verknüpften Karten gefunden.<div style={{ fontSize: 11, marginTop: 4 }}>Tipp: Kartennamen müssen mit „{client.name}" oder Kürzel „{client.short_name || '—'}" übereinstimmen.</div></div>}
            {cards.map(c => { const exact = c.client_name === client.name || c.client_name === client.short_name; return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderTop: '1px solid ' + LINE, fontSize: 13 }}>
                <span style={{ color: MUT, whiteSpace: 'nowrap' }}>{c.card_date || '—'}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.booking_address || c.title}</span>
                {exact
                  ? <span style={{ color: GREEN, fontSize: 12, whiteSpace: 'nowrap' }}>🔗 verknüpft</span>
                  : <span style={{ color: '#c98a3c', fontSize: 12, whiteSpace: 'nowrap' }} title={'Karte heißt „' + c.client_name + '"'}>⚠️ abw. Schreibweise</span>}
              </div>
            ) })}
          </div>
        </div>
      </div>
    </div>
  )
}

const btnGhost = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, fontWeight: 500, border: '1px solid ' + LINE, borderRadius: 8, background: '#fff', cursor: 'pointer', color: DARK }
const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, background: ACC, color: '#fff', cursor: 'pointer' }
