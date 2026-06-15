'use client'
// Buchhaltung — a könyvelő havi anyagai (USt-Voranmeldung, BWA, Summen und Salden).
// Külön szekció: NEM számít bele a kiadásokba. A tartalmi feldolgozás (AI-kiolvasás +
// olvasható kivonatok) a következő lépésben épül; ez most a hely + a struktúra.

import RechnungShell from '../../components/RechnungShell'

const MUT = '#8a8278', DARK = '#2a2a28', LINE = '#ece4d6'

const PLANNED = [
  { icon: 'ti-receipt-tax', title: 'USt-Voranmeldung', desc: 'Übermittlungsprotokoll → USt-Vorauszahlung + Fälligkeit' },
  { icon: 'ti-chart-bar', title: 'BWA', desc: 'Ergebnis (Monat + kumuliert), Erlöse, Kosten' },
  { icon: 'ti-table', title: 'Summen und Salden', desc: 'Gespeichert, mit Original-Link' },
]

export default function BuchhaltungPage() {
  return (
    <RechnungShell active="buchhaltung">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: DARK }}>Buchhaltung — Auswertungen</div>
        <div style={{ fontSize: 13, color: MUT, marginTop: 2, marginBottom: 16 }}>Unterlagen vom Steuerberater · zählen <b>nicht</b> zu den Ausgaben</div>

        <div style={{ background: '#fff8e6', border: '1px solid #f0d98a', color: '#8a6d1a', borderRadius: 10, padding: '12px 14px', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-tools" style={{ fontSize: 17 }} />In Vorbereitung — BWA, SuSa und USt-VA werden hier automatisch erkannt und übersichtlich aufbereitet.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PLANNED.map(p => (
            <div key={p.title} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: '14px 16px', opacity: 0.75 }}>
              <i className={'ti ' + p.icon} style={{ fontSize: 22, color: '#6b6b6e' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{p.title}</div>
                <div style={{ fontSize: 12, color: MUT, marginTop: 1 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RechnungShell>
  )
}
