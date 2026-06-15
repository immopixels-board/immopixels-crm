'use client'
// Közös felső fejléc a Rechnungen / Kunden oldalakhoz — vizuálisan azonos a
// board fejlécével. A board-menüpontok átnavigálnak a főoldalra (?tab=…),
// a Kunden/Rechnungen az önálló oldalakra. Az active prop jelzi a kiemelést.

const MENU = [
  { id: 'board', label: 'Board', icon: 'ti-layout-kanban', href: '/?tab=board' },
  { id: 'calendar', label: 'Kalender', icon: 'ti-calendar', href: '/?tab=calendar' },
  { id: 'buchen', label: 'Buchungen', icon: 'ti-calendar-plus', href: '/?tab=buchen' },
  { id: 'clients', label: 'Kunden', icon: 'ti-users', href: '/?tab=clients' },
  { id: 'phonebook', label: 'Telefonbuch', icon: 'ti-address-book', href: '/?tab=phonebook' },
  { id: 'staff', label: 'Mitarbeiter', icon: 'ti-id-badge', href: '/?tab=staff' },
  { id: 'fahrtenbuch', label: 'Fahrtenbuch', icon: 'ti-car', href: '/?tab=fahrtenbuch' },
  { id: 'kunden-liste', label: 'Kunden', icon: 'ti-users', href: '/kunden' },
  { id: 'rechnungen', label: 'Rechnungen', icon: 'ti-file-invoice', href: '/rechnungen' },
  { id: 'eingangsrechnungen', label: 'Eingangsrechnungen', icon: 'ti-file-download', href: '/eingangsrechnungen' },
]

export default function TopNav({ active, children }) {
  const GOLD = 'var(--gold, #6b6b6e)', LINE = 'var(--gdbr, #ece4d6)', MUT = 'var(--t3, #8a8278)'
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #ece4d6', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 52, padding: '0 16px', gap: 6, overflowX: 'auto' }}>
        <div onClick={() => { window.location.href = '/' }} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingRight: 8, flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid ' + GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: GOLD }}>IP</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#2a2a28' }}>ImmoPixels</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '.4px', border: '1px solid ' + LINE, borderRadius: 4, padding: '1px 5px' }}>CRM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 0 }}>
          {MENU.map(m => (
            <a key={m.id} href={m.href} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 11px', height: 52, fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', color: active === m.id ? GOLD : MUT, borderBottom: active === m.id ? '2px solid ' + GOLD : '2px solid transparent' }}>
              <i className={'ti ' + m.icon} style={{ fontSize: 13 }}></i>{m.label}
            </a>
          ))}
        </div>
      </div>
      {children && <div style={{ borderTop: '1px solid #f0ece4', padding: '0 16px', minHeight: 44, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#fbfaf7' }}>{children}</div>}
    </div>
  )
}
