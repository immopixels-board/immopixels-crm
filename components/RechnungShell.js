'use client'
// Közös keret a Rechnung-területhez: felső TopNav + bal oldali al-menüsáv + tartalom.
// A Rechnung főoldala az Umsatz (/stats). Az almenük ide gyűlnek (Kunden, Ausgangs-/
// Eingangsrechnungen, Buchhaltung), mert ide jönnek a további bővítések.
// Mobilon a bal sáv vízszintesen görgethető csíkká törik.

import TopNav from './TopNav'

const GOLD = '#6b6b6e', DARK = '#2a2a28', MUT = '#8a8278', LINE = '#ece4d6'
const ACT_BG = '#eceae3'

const SUB = [
  { id: 'umsatz', label: 'Umsatz', icon: 'ti-chart-bar', href: '/stats' },
  { id: 'ausgang', label: 'Ausgangsrechnungen', icon: 'ti-file-invoice', href: '/rechnungen' },
  { id: 'zahlungen', label: 'Zahlungseingänge', icon: 'ti-cash-banknote', href: '/rechnungen/zahlungen' },
  { id: 'kunden', label: 'Kunden', icon: 'ti-users', href: '/kunden' },
  { id: 'eingang', label: 'Eingangsrechnungen', icon: 'ti-file-download', href: '/eingangsrechnungen' },
  { id: 'buchhaltung', label: 'Buchhaltung', icon: 'ti-calculator', href: '/buchhaltung' },
]

export default function RechnungShell({ active, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f7f4ee', fontFamily: 'Arial, sans-serif', color: DARK }}>
      <style>{`
        .rs-wrap{display:flex;align-items:flex-start}
        .rs-side{width:206px;flex-shrink:0;border-right:1px solid ${LINE};background:#fff;position:sticky;top:52px;align-self:stretch;min-height:calc(100vh - 52px);padding:14px 10px}
        .rs-side .rs-create{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;background:${GOLD};color:#fff;border:none;border-radius:9px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;margin-bottom:12px;box-sizing:border-box}
        .rs-side .rs-lbl{font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:${MUT};padding:0 8px 8px}
        .rs-side .rs-item{display:flex;align-items:center;gap:9px;padding:9px 8px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;color:${MUT};border-left:3px solid transparent;margin-bottom:3px}
        .rs-side .rs-item.on{color:${DARK};background:${ACT_BG};border-left:3px solid ${GOLD}}
        .rs-main{flex:1;min-width:0;padding:20px 22px}
        @media(max-width:860px){
          .rs-wrap{display:block}
          .rs-side{width:auto;min-height:0;position:static;border-right:none;border-bottom:1px solid ${LINE};display:flex;align-items:center;gap:6px;overflow-x:auto;padding:10px 12px}
          .rs-side .rs-lbl{display:none}
          .rs-side .rs-create{width:auto;flex-shrink:0;margin-bottom:0;white-space:nowrap;padding:9px 12px}
          .rs-side .rs-item{flex-shrink:0;white-space:nowrap;border-left:none;border-bottom:2px solid transparent;border-radius:7px;margin-bottom:0;padding:7px 10px}
          .rs-side .rs-item.on{border-left:none;border-bottom:2px solid ${GOLD}}
          .rs-main{padding:16px 14px}
        }
      `}</style>

      <TopNav active="rechnung" />

      <div className="rs-wrap">
        <nav className="rs-side">
          <a href="/rechnungen/neu" className="rs-create"><i className="ti ti-plus" style={{ fontSize: 16 }} />Rechnung schreiben</a>
          <div className="rs-lbl">Rechnung</div>
          {SUB.map(s => (
            <a key={s.id} href={s.href} className={'rs-item' + (active === s.id ? ' on' : '')}>
              <i className={'ti ' + s.icon} style={{ fontSize: 17 }} />{s.label}
            </a>
          ))}
        </nav>
        <main className="rs-main">{children}</main>
      </div>
    </div>
  )
}
