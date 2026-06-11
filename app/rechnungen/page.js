'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const GOLD = '#b8892a', DARK = '#2a2a28', MUT = '#8a8278', CREAM = '#faf7f1', LINE = '#ece4d6'
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const eur = n => (n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const STATUS = {
  draft: { label: 'Entwurf', c: '#8a8278', bg: '#efece4' },
  open: { label: 'Offen', c: '#9a6a12', bg: '#f6efe0' },
  overdue: { label: 'Überfällig', c: '#b3402f', bg: '#fae7e2' },
  paid: { label: 'Bezahlt', c: '#2f7a4f', bg: '#e6f3ec' },
  storno: { label: 'Storniert', c: '#b3402f', bg: '#f3e9e7' },
}

export default function RechnungenPage() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('umsatz')
  const [brutto, setBrutto] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [invoices, setInvoices] = useState([])
  const [hasTable, setHasTable] = useState(true)

  useEffect(() => { init() }, [])
  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: staff } = await supabase.from('staff').select('*').eq('email', user.email).single()
    if (!staff || (staff.role_level !== 'admin' && !staff.can_invoice)) { window.location.href = '/'; return }
    try {
      const { data, error } = await supabase.from('invoices')
        .select('id,invoice_number,client_id,client_name,invoice_date,status,total_net,total_gross,storno_of')
        .order('invoice_date', { ascending: false })
      if (error) setHasTable(false)
      else setInvoices(data || [])
    } catch { setHasTable(false) }
    setLoading(false)
  }

  if (loading) return <Shell><div style={{ padding: 60, textAlign: 'center', color: MUT }}>Lädt…</div></Shell>

  const val = i => brutto ? (i.total_gross || 0) : (i.total_net || 0)
  const issued = invoices.filter(i => i.status !== 'draft')
  const now = new Date(), curY = now.getFullYear(), curM = now.getMonth()
  const years = [...new Set(issued.map(i => +(i.invoice_date || '').slice(0, 4)).filter(Boolean))].sort((a, b) => b - a)
  const sum = arr => arr.reduce((s, i) => s + val(i), 0)
  const inYear = y => issued.filter(i => (i.invoice_date || '').slice(0, 4) === String(y))
  const kpiMonth = sum(issued.filter(i => { const d = i.invoice_date || ''; return d.slice(0, 4) === String(curY) && +d.slice(5, 7) === curM + 1 }))
  const kpiYear = sum(inYear(curY))
  const kpiAll = sum(issued)
  const kpiOpen = invoices.filter(i => i.status === 'open' || i.status === 'overdue').reduce((s, i) => s + (i.total_gross || 0), 0)

  // havi diagram a kiválasztott évre
  const monthVals = MONTHS.map((_, m) => sum(inYear(year).filter(i => +(i.invoice_date || '').slice(5, 7) === m + 1)))
  const maxMonth = Math.max(1, ...monthVals)
  // kunde szerint (kiválasztott év)
  const byClient = {}
  inYear(year).forEach(i => { const k = i.client_name || '—'; byClient[k] = (byClient[k] || 0) + val(i) })
  const clientRows = Object.entries(byClient).sort((a, b) => b[1] - a[1])
  const maxClient = Math.max(1, ...clientRows.map(r => r[1]))

  return (
    <Shell>
      {/* fejléc */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Abrechnung</h1>
        <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, background: '#f6efe0', border: '1px solid #ecdfc4', borderRadius: 20, padding: '3px 10px' }}>🔒 nur du</span>
        <div style={{ flex: 1 }} />
        <a href="/" style={{ fontSize: 12, color: MUT, textDecoration: 'none' }}>← zurück zum Board</a>
      </div>
      <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap' }}>
        {[['umsatz', '📊 Umsatz'], ['rechnungen', '🧾 Rechnungen'], ['import', '⬇️ Import']].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={tabBtn(tab === id)}>{lbl}</button>
        ))}
        <div style={{ flex: 1 }} />
        {tab === 'umsatz' && (
          <div style={{ display: 'flex', border: '1px solid ' + LINE, borderRadius: 9, overflow: 'hidden' }}>
            <button onClick={() => setBrutto(false)} style={toggle(!brutto)}>Netto</button>
            <button onClick={() => setBrutto(true)} style={toggle(brutto)}>Brutto</button>
          </div>
        )}
      </div>

      {!hasTable && (
        <div style={{ background: '#fff7e6', border: '1px solid #f0d68a', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#7a5a10', marginBottom: 16 }}>
          ⚠ Die Rechnungs-Tabellen sind noch nicht angelegt. Führe das bereitgestellte SQL in Supabase aus, dann erscheinen hier deine Daten.
        </div>
      )}

      {tab === 'umsatz' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 18 }}>
            <Kpi label={'Dieser Monat'} value={kpiMonth} sub={MONTHS[curM] + ' ' + curY} />
            <Kpi label={'Dieses Jahr'} value={kpiYear} sub={String(curY)} />
            <Kpi label={'Gesamt'} value={kpiAll} sub={years.length ? years[years.length - 1] + '–' + years[0] : '—'} />
            <Kpi label={'Offen (brutto)'} value={kpiOpen} sub={'unbezahlt'} accent />
          </div>

          <Card title={'Umsatz pro Monat'} right={
            <select value={year} onChange={e => setYear(+e.target.value)} style={selS}>
              {(years.length ? years : [curY]).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          }>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, padding: '8px 0' }}>
              {monthVals.map((v, m) => {
                const isCur = year === curY && m === curM
                return (
                  <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 9, color: MUT, whiteSpace: 'nowrap' }}>{v ? Math.round(v / 1000) + 'k' : ''}</div>
                    <div title={eur(v)} style={{ width: '100%', height: Math.max(2, (v / maxMonth) * 120), background: isCur ? 'repeating-linear-gradient(45deg,' + GOLD + ',' + GOLD + ' 4px,#d4ab5e 4px,#d4ab5e 8px)' : GOLD, borderRadius: '4px 4px 0 0', opacity: v ? 1 : .25 }} />
                    <div style={{ fontSize: 10, color: DARK, fontWeight: isCur ? 800 : 500 }}>{MONTHS[m]}</div>
                  </div>
                )
              })}
            </div>
          </Card>

          {years.length > 1 && (
            <Card title={'Mehrjahresvergleich'}>
              {years.slice().reverse().map(y => {
                const t = sum(inYear(y)); const mx = Math.max(1, ...years.map(yy => sum(inYear(yy))))
                return (
                  <div key={y} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 42, fontSize: 12, fontWeight: 700 }}>{y}</span>
                    <div style={{ flex: 1, background: '#f3eee2', borderRadius: 6, height: 16, overflow: 'hidden' }}>
                      <div style={{ width: (t / mx * 100) + '%', height: '100%', background: y === curY ? GOLD : '#cdb27e' }} />
                    </div>
                    <span style={{ width: 110, textAlign: 'right', fontSize: 12, fontWeight: 700 }}>{eur(t)}</span>
                  </div>
                )
              })}
            </Card>
          )}

          <Card title={'Umsatz nach Kunde · ' + year}>
            {clientRows.length === 0 && <div style={{ color: MUT, fontSize: 13, padding: '8px 0' }}>Keine Daten für {year}.</div>}
            {clientRows.map(([name, t]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                <span style={{ width: 150, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                <div style={{ flex: 1, background: '#f3eee2', borderRadius: 6, height: 14, overflow: 'hidden' }}>
                  <div style={{ width: (t / maxClient * 100) + '%', height: '100%', background: GOLD }} />
                </div>
                <span style={{ width: 100, textAlign: 'right', fontSize: 12, fontWeight: 700 }}>{eur(t)}</span>
              </div>
            ))}
          </Card>
          {brutto && <div style={{ fontSize: 11, color: MUT, marginTop: 8 }}>Brutto inkl. MwSt. · Netto-Werte ohne MwSt.</div>}
        </>
      )}

      {tab === 'rechnungen' && (
        <Card title={'Rechnungen (' + invoices.length + ')'} right={<span style={{ fontSize: 11, color: MUT }}>Erstellen / PDF / Storno: nächster Schritt</span>}>
          {invoices.length === 0 && <div style={{ color: MUT, fontSize: 13, padding: '12px 0' }}>Noch keine Rechnungen. Über „Import" lassen sich bestehende Kunden/Rechnungen übernehmen.</div>}
          {invoices.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ textAlign: 'left', color: MUT }}>
                  {['Nr.', 'Datum', 'Kunde', 'Status', 'Netto', 'Brutto'].map(h => <th key={h} style={{ padding: '6px 8px', borderBottom: '1px solid ' + LINE, whiteSpace: 'nowrap' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {invoices.map(i => {
                    const st = STATUS[i.status] || STATUS.open
                    return (
                      <tr key={i.id} style={{ borderBottom: '0.5px solid ' + LINE }}>
                        <td style={{ padding: '7px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>{i.invoice_number || '—'}</td>
                        <td style={{ padding: '7px 8px', whiteSpace: 'nowrap' }}>{i.invoice_date}</td>
                        <td style={{ padding: '7px 8px' }}>{i.client_name}</td>
                        <td style={{ padding: '7px 8px' }}><span style={{ fontSize: 11, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' }}>{st.label}</span></td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{eur(i.total_net)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>{eur(i.total_gross)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'import' && (
        <Card title={'Import'}>
          <div style={{ color: MUT, fontSize: 13, lineHeight: 1.6 }}>
            Hier kommt der <b style={{ color: DARK }}>Billomat-Import</b> hin: bestehende Kunden werden mit „✓ vorhanden" markiert, nur neue werden übernommen.
            <br />Vor dem Bau brauche ich nur deine Entscheidung: <b style={{ color: DARK }}>einmaliger CSV-Import</b> oder <b style={{ color: DARK }}>laufende Billomat-API-Synchronisation</b>.
          </div>
        </Card>
      )}
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100dvh', background: CREAM, fontFamily: 'Arial, sans-serif', color: DARK }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 80px' }}>{children}</div>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css" />
    </div>
  )
}
function Kpi({ label, value, sub, accent }) {
  return (
    <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: MUT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ? '#9a6a12' : DARK, marginTop: 4 }}>{(value || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
      <div style={{ fontSize: 11, color: MUT, marginTop: 2 }}>{sub}</div>
    </div>
  )
}
function Card({ title, right, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  )
}
const tabBtn = a => ({ padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (a ? GOLD : LINE), background: a ? GOLD : '#fff', color: a ? '#fff' : MUT })
const toggle = a => ({ padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: a ? GOLD : '#fff', color: a ? '#fff' : MUT })
const selS = { border: '1px solid ' + LINE, borderRadius: 7, padding: '5px 8px', fontSize: 12, background: '#fff', color: DARK, fontWeight: 700 }
