'use client'
import React, { useState, useEffect } from 'react'

const CHANGELOGS = [
  { ver: 'v5.1.18', date: '2026-06-17', items: ['Doppelte Karten bei Buchungen endgültig zusammengeführt: Wenn zu einer Buchungskarte eine GCal-Karte (gleiche Adresse + Kunde) existiert, wird die GCal-Kopie gelöscht und die Buchungskarte übernimmt Zeit + Event-ID — auch wenn die Buchungskarte gar keine GCal-Verknüpfung hatte. Dadurch wird beim nächsten Kalender-Ändern die ORIGINAL-Karte aktualisiert statt eine Kopie zu erzeugen'] },
  { ver: 'v5.1.17', date: '2026-06-16', items: ['Rechnungs-PDF zeigt jetzt die gefahrenen km als Info: „Für Ihre Aufträge gefahren (gesamt): X km" — berechnet aus den Adressen der berechneten Aufnahmen (Hin- und Rückfahrt ab Firmen-/Startadresse). Bisher blieb die Zeile leer, weil der Wert 0 war (Fahrtenbuch ohne Treffer)'] },
  { ver: 'v5.1.16', date: '2026-06-16', items: ['Rechnungs-Liste: Monats-Überschriften — die Rechnungen sind jetzt nach Monat gruppiert (z.B. „Juni 2026") mit Anzahl + Summe pro Monat, damit sofort sichtbar ist, in welchem Monat sie erstellt wurden'] },
  { ver: 'v5.1.15', date: '2026-06-16', items: ['Öffentlicher Kunden-Kalender (/cal): synchronisiert beim Laden selbst mit dem Google Kalender (max. 1×/Min.) — zeigt jetzt die tatsächlichen Termin-Zeiten, auch wenn das Board nicht geöffnet ist'] },
  { ver: 'v5.1.14', date: '2026-06-16', items: ['Keine doppelten Karten mehr bei Terminänderung: Wird ein Termin im Google Kalender verschoben/neu erstellt (neue Event-ID), erkennt der Sync über Adresse + Kunde, dass es dieselbe Aufnahme ist — die Buchungskarte wird auf die neue Zeit aktualisiert und die doppelte GCal-Karte entfernt', 'Board synchronisiert den Google Kalender jetzt automatisch (beim Öffnen + alle 5 Min), damit Kartenzeiten ohne Klick auf „GCal" aktuell bleiben'] },
  { ver: 'v5.1.13', date: '2026-06-16', items: ['Google-Kalender-Sync aktualisiert jetzt auch die Uhrzeit/Datum von ONLINE-Buchungskarten, wenn der Termin im Google Kalender verschoben wird (vorher wurden Buchungskarten übersprungen). Damit zeigt der öffentliche Kunden-Kalender (/cal) die tatsächlichen Termine. Titel/Adresse der Buchung bleiben unverändert'] },
  { ver: 'v5.1.12', date: '2026-06-16', items: ['Öffentlicher Kunden-Kalender (/cal): Termin-Titel wird jetzt serverseitig einheitlich als „Kunde - Adresse" aufgebaut — korrekt für ALLE Aufnahmen (auch ältere Karten), nicht nur neue Buchungen'] },
  { ver: 'v5.1.11', date: '2026-06-16', items: ['Online-Buchung: Karten- und Google-Kalender-Titel jetzt im Format „Kunde - Straße Hausnr., Ort" (z.B. „Bartz - Forlenweg 4, Heidelberg") statt „Büro — Leistung — Name" — saubere, einheitliche Titel und bessere Erkennung für die Abrechnung'] },
  { ver: 'v5.1.10', date: '2026-06-16', items: ['Karten-Beschreibung: HTML aus E-Mails/Buchungen (z.B. <blockquote>, <p>, <br>) wird jetzt sauber formatiert angezeigt statt als roher Code — auch bei Nicht-GCal-Karten, bleibt bearbeitbar'] },
  { ver: 'v5.1.9', date: '2026-06-16', items: ['Rechnungs-PDF: Schlusstext (Gefahrene Strecke, Dank, Zahlung, Online buchen) rutscht bei nicht voller letzter Seite ins untere Drittel', 'Mehr Abstand zwischen den Trennlinien und den Positionen', 'Kleiner Abstand nach der Spaltenüberschrift (Pos/Beschreibung…)', 'PDF-Download heißt jetzt immer „Rechnung <Nr>.pdf" (kein Zufallsname mehr) — auch der PDF-Button im Editor lädt direkt herunter'] },
  { ver: 'v5.1.8', date: '2026-06-16', items: ['Rechnung schreiben: neue Spalte „Betrag" pro Position — zeigt die Nettosumme der Zeile (inkl. km-Menge × Preis und Rabatt) direkt neben jeder Position'] },
  { ver: 'v5.1.7', date: '2026-06-16', items: ['Buchung: Bei einem Termin mit möglicher Verspätung (bis 5 Min wegen Anfahrt) erscheint vor der Buchung ein Bestätigungsdialog — der Makler muss die Verspätung aktiv akzeptieren', 'Akzeptierte Verspätung wird auf der Karte vermerkt'] },
  { ver: 'v5.1.6', date: '2026-06-16', items: ['Makler-Termine importieren: liest jetzt standardmäßig ALLE Kalender des immopixels-Kontos (nicht nur einen) — kein Fototermin wird mehr übersehen', 'Neue Option „⭐ Alle Kalender"; einzelne Kalender weiterhin wählbar; nicht erreichbare Kalender werden übersprungen'] },
  { ver: 'v5.1.5', date: '2026-06-16', items: ['Kunden: „Makler-Termine"-Button jetzt auch direkt neben „Duplikate prüfen" (zusätzlich zur bisherigen Stelle)'] },
  { ver: 'v5.1.4', date: '2026-06-16', items: ['Neue Rechnung: Kundenliste ist jetzt ein festes, scrollbares Listenfenster (kein Dropdown mehr) — Höhe 325px, nach unten ziehbar (größer)', 'Suchfeld filtert die Liste; ausgewählter Kunde wird hervorgehoben'] },
  { ver: 'v5.1.3', date: '2026-06-16', items: ['Neue Rechnung: Kunden-Vorschlagsliste wird wieder angezeigt (wurde durch overflow der Karte abgeschnitten)'] },
  { ver: 'v5.1.2', date: '2026-06-16', items: ['Rechnungs-PDF wird jetzt mit sinnvollem Dateinamen heruntergeladen: Rechnung_<Nr>_<Kürzel>.pdf (kein Umbenennen mehr nötig)', 'Lange Firmennamen brechen im PDF jetzt sauber auf mehrere Zeilen um (Rechnung & Mahnung)'] },
  { ver: 'v5.1.1', date: '2026-06-15', items: ['Neue Rechnung: Kundenauswahl als eigenes Suchfeld (kein Browser-Datalist mehr) — Kunde lässt sich jetzt problemlos löschen und wechseln', 'Kein „hängenbleibender" Kunde mehr beim Umschalten'] },
  { ver: 'v5.1.0', date: '2026-06-15', items: ['Eingangsrechnung-OCR erkennt jetzt den Dokumenttyp (Rechnung / Sammelbeleg / Buchhaltung)', 'DKV-Tankrechnung: als Ausgabe Fahrtkosten, Summe aus der Gesamtsumme (nicht aus Einzelposten)', 'DKV E-Zusammenstellung wird als Sammelbeleg erkannt — zählt nicht (kein Vorsteuerabzug)', 'BWA / SuSa / USt-VA landen automatisch in der Buchhaltung (nicht in den Ausgaben)', 'Buchhaltung-Bereich funktioniert: eigener Upload + lesbare Auszüge (USt-Vorauszahlung, Ergebnis…)', 'Hochgeladene Dateien werden gespeichert und per „↗" abrufbar', 'Neue Spalte typ in eingangsrechnungen (SQL separat)'] },
  { ver: 'v5.0.0', date: '2026-06-15', items: ['Rechnung als Hauptbereich mit linker Menüleiste', 'Untermenüs: Umsatz · Ausgangsrechnungen · Kunden · Eingangsrechnungen · Buchhaltung', '„Rechnung schreiben"-Button oben in der Leiste', 'Umsatz (Statistik) ist jetzt die Startseite des Bereichs', 'Kunden-Seite in den Rechnung-Bereich verschoben', 'Neuer Bereich Buchhaltung (BWA / SuSa / USt-VA — in Vorbereitung)', 'Mobil: Menüleiste wird zu horizontaler Leiste', 'Changelog im Board wieder aktuell geführt'] },
  { ver: 'v2.9.4', date: '2026-05-18', items: ['Noch nicht gesendet badge (addr+date, nincs drive link)', 'Datepicker: custom naptár + 15 perces időslotok'] },
  { ver: 'v2.8.9', date: '2026-05-18', items: ['ZIP feltöltés Google Drive-ra (drag & drop + kattintás)', 'Progress bar feltöltés közben', 'Feltöltés után link automatikusan a kártya Drive mezőjébe'] },
  { ver: 'v2.8.8', date: '2026-05-18', items: ['Narancssárga glow keret (mai nap + 18:00 után)', 'Email badge fejlécben (olvasatlan count, 5 percenként frissül)', 'Kattintásra webmail megnyílik'] },
  { ver: 'v2.8.7', date: '2026-05-18', items: ['Narancssárga keret: mai nap + 18:00 után + nem Beim Bearbeiter'] },
  { ver: 'v2.8.5', date: '2026-05-18', items: ['GCal Push Notification webhook (azonnali szinkron)', 'GCal → Board: dátum változás azonnali frissítés', 'Shootings oszlop: dátum szerinti rendezés', 'Heti watch megújítás (cron hétfőnként)'] },
  { ver: 'v2.7.7', date: '2026-05-18', items: ['Widgetek mindig nyitva indulnak', 'X gomb → minimize (összecsukás)', 'Minimize állapot mentve localStorage-be', 'Widget pozíció clamp (nem lóg ki a képből)'] },
  { ver: 'v2.6.9', date: '2026-05-18', items: ['Beschreibung: vastagabb betű, word-break, linkek rövidítve+arany', 'Drive/WeTransfer → Drive/Dropbox', 'Settings: Aufnahme-Kategorien szekció törölve', 'Duplikált kategóriák javítva (getTypes egyetlen forrás)', 'Dátum törlés gomb', 'Kompakt dátum: nap.hónap.év'] },
  { ver: 'v2.6.9', date: '2026-05-18', items: ['Dátum törlés gomb a CardModal Termin mezőnél', 'Kompakt kártya dátum: nap.hónap.év (pl. 17.05.26)', 'Új kategória hozzáadás a kártyán belül (szín + név)'] },
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

const INIT_COLORS = { 'CD': '#6b6b6e', 'DB': '#1d5ec7', 'EL': '#15803d', 'NS': '#6d28d9', 'CA': '#b91c1c' }

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
  const [allCards, setAllCards] = useState([])
  const [allCols, setAllCols] = useState([])
  const [selectedCards, setSelectedCards] = useState(new Set())
  const [kartenCol, setKartenCol] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [kartenSort, setKartenSort] = useState('date') // date | title | client | col
  const [showDupsOnly, setShowDupsOnly] = useState(false)

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
    if (tab === 'karten') loadKarten()
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

  async function loadKarten() {
    const [{ data: columns }, { data: cards }] = await Promise.all([
      supabase.from('columns').select('*').order('position'),
      supabase.from('cards').select('id,title,card_date,column_id,is_gcal,client_name').order('card_date', { ascending: false })
    ])
    setAllCols(columns || [])
    setAllCards(cards || [])
    setSelectedCards(new Set())
  }

  async function deleteSelectedCards() {
    if (selectedCards.size === 0) return
    setDeleting(true)
    const ids = [...selectedCards]
    await supabase.from('card_team').delete().in('card_id', ids)
    await supabase.from('checklist_items').delete().in('card_id', ids)
    await supabase.from('comments').delete().in('card_id', ids)
    await supabase.from('cards').delete().in('id', ids)
    setSelectedCards(new Set())
    await loadKarten()
    setDeleting(false)
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

  function getKartenFiltered() {
    // Find dup keys
    const seen = {}
    const dupIds = new Set()
    for(const c of allCards){
      const k=(c.card_date||'')+'_'+(c.addr||c.title||'').toLowerCase().trim()
      if(seen[k]) { dupIds.add(c.id); dupIds.add(seen[k]) }
      else seen[k]=c.id
    }
    let filtered = allCards.filter(c=>!kartenCol||c.column_id===kartenCol)
    if(showDupsOnly) filtered = filtered.filter(c=>dupIds.has(c.id))
    // Sort
    filtered = [...filtered].sort((a,b)=>{
      if(kartenSort==='dups') {
        const ad=dupIds.has(a.id)?0:1, bd=dupIds.has(b.id)?0:1
        if(ad!==bd) return ad-bd
        // Group dups by key
        const ka=(a.card_date||'')+'_'+(a.addr||a.title||'').toLowerCase().trim()
        const kb=(b.card_date||'')+'_'+(b.addr||b.title||'').toLowerCase().trim()
        return ka.localeCompare(kb)
      }
      if(kartenSort==='title') return (a.title||'').localeCompare(b.title||'')
      if(kartenSort==='client') return (a.client_name||'').localeCompare(b.client_name||'')
      if(kartenSort==='col') return (a.column_id||'').localeCompare(b.column_id||'')
      // default: date desc
      return (b.card_date||'').localeCompare(a.card_date||'')
    })
    return filtered
  }

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
        {[['logs', '📋 Log'], ['karten', '🗂 Karten'], ['deleted', '🗑 Törölt'], ['backup', '💾 Backup'], ['changelog', '📝 Changelog']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{l}</button>
        ))}
      </div>

      {/* KARTEN TAB */}
      {tab === 'karten' && (
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'8px 14px', borderBottom:'1px solid var(--border)', display:'flex', gap:7, flexShrink:0, flexWrap:'wrap', alignItems:'center' }}>
            <select value={kartenCol} onChange={e=>{ setKartenCol(e.target.value); setSelectedCards(new Set()) }}
              style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 7px', fontSize:11, outline:'none', color:'var(--t1)' }}>
              <option value="">Alle Spalten</option>
              {allCols.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select value={kartenSort} onChange={e=>setKartenSort(e.target.value)}
              style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 7px', fontSize:11, outline:'none', color:'var(--t1)' }}>
              <option value="date">📅 Datum</option>
              <option value="title">🔤 Titel</option>
              <option value="client">👤 Kunde</option>
              <option value="col">📋 Spalte</option>
              <option value="dups">🔴 Duplikate zuerst</option>
            </select>
            <label style={{ fontSize:11, color:'var(--t3)', display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}>
              <input type="checkbox" checked={showDupsOnly} onChange={e=>setShowDupsOnly(e.target.checked)} />
              Nur Duplikate
            </label>
            <label style={{ fontSize:11, color:'var(--t3)', display:'flex', alignItems:'center', gap:5, cursor:'pointer' }}>
              <input type="checkbox" onChange={e=>{
                if(!e.target.checked){ setSelectedCards(new Set()); return }
                const filtered = getKartenFiltered()
                // For duplicates: select only the copies (not the first/original)
                const seen = {}
                const toSelect = new Set()
                for(const c of filtered){
                  const k=(c.card_date||'')+'_'+(c.addr||c.title||'').toLowerCase().trim()
                  if(seen[k]) toSelect.add(c.id)
                  else seen[k]=c.id
                }
                // If no dups found, select all
                setSelectedCards(toSelect.size > 0 ? toSelect : new Set(filtered.map(c=>c.id)))
              }} /> Alle auswählen
            </label>
            {selectedCards.size > 0 && (
              <button onClick={deleteSelectedCards} disabled={deleting}
                style={{ background:'#b91c1c', color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer', marginLeft:'auto' }}>
                {deleting ? '...' : `${selectedCards.size} löschen`}
              </button>
            )}
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'8px 14px' }}>
            {(()=>{
              const cards = getKartenFiltered()
              // Find dup keys
              const seen = {}
              const dupIds = new Set()
              for(const c of allCards){
                const k=(c.card_date||'')+'_'+(c.addr||c.title||'').toLowerCase().trim()
                if(seen[k]) { dupIds.add(c.id); dupIds.add(seen[k]) }
                else seen[k]=c.id
              }
              return cards.map(c=>{
                const isDup = dupIds.has(c.id)
                return (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:6, background:selectedCards.has(c.id)?'#6b6b6e14':isDup?'#fef2f2':'var(--bg3)', border:'0.5px solid '+(selectedCards.has(c.id)?'#6b6b6e':isDup?'#fecaca':'var(--border)'), marginBottom:4, cursor:'pointer' }}
                    onClick={()=>setSelectedCards(prev=>{ const n=new Set(prev); n.has(c.id)?n.delete(c.id):n.add(c.id); return n })}>
                    <input type="checkbox" checked={selectedCards.has(c.id)} readOnly style={{ flexShrink:0 }} />
                    {isDup && <span style={{ fontSize:9, color:'#b91c1c', fontWeight:700, flexShrink:0 }}>DUP</span>}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:isDup?'#b91c1c':'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title||'—'}</div>
                      <div style={{ fontSize:10, color:'var(--t3)' }}>
                        {c.card_date} {c.client_name&&`· ${c.client_name}`} {c.is_gcal&&<span style={{color:'#6b6b6e'}}>· GCal</span>}
                      </div>
                    </div>
                    <div style={{ fontSize:10, color:'var(--t3)', flexShrink:0 }}>{allCols.find(col=>col.id===c.column_id)?.title||'?'}</div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

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
