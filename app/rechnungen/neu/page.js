'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { generateZugferdPdf } from '../../../lib/invoice/zugferd'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const GOLD = '#6b6b6e', DARK = '#2a2a28', MUT = '#8a8278', LINE = '#ece4d6', BG = '#f4f1ea'
const MONNAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const eur = n => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const num = v => { if (typeof v === 'number') return v; let s = String(v ?? '').trim(); if (!s) return 0; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); s = s.replace(/[^\d.\-]/g, ''); const n = parseFloat(s); return isNaN(n) ? 0 : n }
const round2 = n => Math.round((Number(n) || 0) * 100) / 100
// TZ-biztos: tisztán UTC dátum-matek (nincs -1 nap csúszás)
const addDays = (d, n) => { const p = String(d || '').split('-').map(Number); if (p.length < 3 || !p[0]) return ''; return new Date(Date.UTC(p[0], p[1] - 1, p[2] + (parseInt(n) || 0))).toISOString().slice(0, 10) }
const dueDays = (inv) => { const a = String(inv.invoice_date || '').split('-').map(Number), d = String(inv.due_date || '').split('-').map(Number); if (a.length < 3 || d.length < 3 || !a[0] || !d[0]) return 14; return Math.round((Date.UTC(d[0], d[1] - 1, d[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000) }
const DEFAULT_SELLER = { name: 'ImmoPixels e.K.', street: 'Gartenstr. 2', zip: '67310', city: 'Hettenleidelheim', vatId: 'DE351098294', taxNo: '', iban: 'DE65672500201003013371', bic: 'SOLADES1HDB', bank: 'Sparkasse Heidelberg', phone: '+49 176 41576629', email: 'rechnung@immopixels.de', web: 'www.immopixels.de', kleinunternehmer: false }
const DEFAULT_TEMPLATE = { intro: 'Hiermit stellen wir Ihnen die folgenden Positionen in Rechnung.', closing: 'Vielen Dank für die Zusammenarbeit!', reviewText: '', reviewUrl: '', bookingUrl: 'https://immopixels.de/booking/', qrUrl: '', logoUrl: '', footerLinks: [], startAddress: 'Gartenstr. 2, 67310 Hettenleidelheim', kmRate: 0.29 }
const SCHABLONEN = {
  rechnung: { label: 'Rechnung anbei', subject: 'Ihre Rechnung von ImmoPixels', body: 'anbei erhalten Sie Ihre Rechnung als PDF. Bei Fragen stehen wir Ihnen gerne zur Verfügung.\n\nVielen Dank für die gute Zusammenarbeit!' },
  erinnerung: { label: 'Zahlungserinnerung', subject: 'Zahlungserinnerung — Ihre Rechnung', body: 'wir möchten Sie freundlich an die noch offene Rechnung (im Anhang) erinnern. Sollten Sie den Betrag bereits überwiesen haben, betrachten Sie diese Nachricht als gegenstandslos.' },
  danke: { label: 'Danke + Bewertung', subject: 'Vielen Dank — Ihre Rechnung', body: 'vielen Dank für Ihren Auftrag! Im Anhang finden Sie Ihre Rechnung.\n\nWenn Sie zufrieden waren, freuen wir uns sehr über eine kurze Google-Bewertung.' }
}
const emptyItem = vat => ({ title: '', desc: '', qty: 1, unit_price: '', discount: '', vat_rate: vat, unit: '' })
const SERVICE_CATALOG = [
  { id: 'foto', label: 'Fotoshooting', grundpreis: '199.00' },
  { id: 'fotodron', label: 'Foto + Drohne', grundpreis: '349.00' },
  { id: 'dron', label: 'Drohne', grundpreis: '179.00' },
  { id: 'reel', label: 'Reel', grundpreis: '249.00' },
  { id: 'reelmakler', label: 'Reel mit Makler', grundpreis: '' },
  { id: 'fotoreel', label: 'Foto + Reel', grundpreis: '' },
  { id: 'fotoreelmakler', label: 'Foto + Reel mit Makler', grundpreis: '' },
  { id: 'aussen', label: 'Aussenaufnahmen', grundpreis: '' },
  { id: 'kibild', label: 'KI Bildbearbeitung', grundpreis: '29.99' },
]
function serviceIdFor(tt) {
  const s = String(tt || '').toLowerCase()
  const hasFoto = /foto/.test(s), hasReel = /reel/.test(s), hasDrohne = /drohne|drone|dron/.test(s), hasMakler = /makler/.test(s), hasAussen = /aussen|außen/.test(s), hasKI = /\bki\b|künstlich|\bai\b/.test(s)
  if (hasKI && !hasFoto && !hasReel) return 'kibild'
  if (hasAussen && !hasFoto && !hasReel) return 'aussen'
  if (hasFoto && hasReel && hasMakler) return 'fotoreelmakler'
  if (hasReel && hasMakler && !hasFoto) return 'reelmakler'
  if (hasFoto && hasReel) return 'fotoreel'
  if (hasFoto && hasDrohne) return 'fotodron'
  if (hasReel && !hasFoto) return 'reel'
  if (hasDrohne && !hasFoto) return 'dron'
  if (hasFoto) return 'foto'
  return null
}

export default function NeueRechnungPage() {
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState(null)
  const [clients, setClients] = useState([])
  const [seller, setSeller] = useState(DEFAULT_SELLER)
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [inv, setInv] = useState(null)
  const [busy, setBusy] = useState(false)
  const [numberPreview, setNumberPreview] = useState('')
  const [shoots, setShoots] = useState(null)     // {YYYY-MM: [cards]}
  const [shootsOpen, setShootsOpen] = useState({})
  const [emailModal, setEmailModal] = useState(false)
  const [fahrt, setFahrt] = useState({ start: DEFAULT_TEMPLATE.startAddress, rate: DEFAULT_TEMPLATE.kmRate })
  const [svcPrices, setSvcPrices] = useState(SERVICE_CATALOG)

  useEffect(() => { init() }, [])
  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: staff } = await supabase.from('staff').select('*').eq('email', user.email).single()
    if (!staff || (staff.role_level !== 'admin' && !staff.can_invoice)) { window.location.href = '/'; return }
    setMyId(staff.id)
    const { data: cls } = await supabase.from('clients').select('id,name,short_name,addr,email,tel,contact_firstname,contact_lastname,contact_tel,contact_email,service_prices').order('name')
    setClients(cls || [])
    const { data: sp } = await supabase.from('settings').select('value').eq('key', 'service_prices').maybeSingle()
    let savedSp = []; if (sp?.value) { try { savedSp = JSON.parse(sp.value) } catch {} }
    const spById = {}; (savedSp || []).forEach(s => { if (s && s.id) spById[s.id] = s })
    setSvcPrices(SERVICE_CATALOG.map(c => spById[c.id] ? { ...c, grundpreis: spById[c.id].grundpreis ?? c.grundpreis } : c))
    const { data: s1 } = await supabase.from('settings').select('value').eq('key', 'invoice_seller').maybeSingle(); let sl = DEFAULT_SELLER
    if (s1?.value) { try { sl = { ...DEFAULT_SELLER, ...JSON.parse(s1.value) }; setSeller(sl) } catch {} }
    const { data: s2 } = await supabase.from('settings').select('value').eq('key', 'invoice_template').maybeSingle()
    if (s2?.value) { try { const tpl = { ...DEFAULT_TEMPLATE, ...JSON.parse(s2.value) }; setTemplate(tpl); setFahrt({ start: tpl.startAddress || DEFAULT_TEMPLATE.startAddress, rate: tpl.kmRate || DEFAULT_TEMPLATE.kmRate }) } catch {} }

    const id = new URLSearchParams(window.location.search).get('id')
    const clientParam = new URLSearchParams(window.location.search).get('client')
    const today = new Date().toISOString().slice(0, 10)
    if (id) {
      const { data: row } = await supabase.from('invoices').select('*').eq('id', id).single()
      const { data: its } = await supabase.from('invoice_items').select('*').eq('invoice_id', id).order('position')
      if (row) { setInv({ ...row, buyer: row.buyer || {}, items: (its && its.length ? its : [emptyItem(19)]).map(splitItem) }); loadShoots(row.client_id, row.client_name, cls || []) }
      else newBlank(today, sl)
    } else {
      let pf = null; try { pf = JSON.parse(localStorage.getItem('ip-invoice-prefill') || 'null') } catch {}
      if (pf) localStorage.removeItem('ip-invoice-prefill')
      if (pf) {
        const c = (cls || []).find(x => x.id === pf.client_id || x.name === pf.client_name || x.short_name === pf.client_name)
        setInv({ invoice_date: pf.invoice_date || today, due_date: addDays(pf.invoice_date || today, 14), client_id: c?.id || null, client_name: c?.name || pf.client_name || '', buyer: c ? buyerFromClient(c) : {}, notes: '', invoice_number: '', items: (pf.items && pf.items.length ? pf.items : [emptyItem(sl.kleinunternehmer ? 0 : 19)]).map(splitItem) })
        if (c) loadShoots(c.id, c.name, cls || [])
      } else if (clientParam) {
        const c = (cls || []).find(x => x.id === clientParam)
        if (c) { setInv({ invoice_date: today, due_date: addDays(today, 14), client_id: c.id, client_name: c.name, buyer: buyerFromClient(c), notes: '', invoice_number: '', items: [emptyItem(sl.kleinunternehmer ? 0 : 19)] }); loadShoots(c.id, c.name, cls || []) }
        else newBlank(today, sl)
      } else newBlank(today, sl)
    }
    setLoading(false)
    // Rechnungsnummer: Vorschau per peek (zählt NICHT hoch). Die Nummer wird
    // NICHT automatisch ins Feld gesetzt — der Nutzer übernimmt sie per Button
    // (wie in Billomat). So bleibt sie vorläufig, bis sie übernommen wird.
    try {
      const { data: nd } = await supabase.rpc('peek_invoice_number')
      if (nd) setNumberPreview(nd)
    } catch {}
  }
  function splitItem(it) { const [tt, ...d] = String(it.description || '').split('\n'); return { title: tt || '', desc: d.join('\n'), qty: it.qty ?? 1, unit_price: (it.unit_price === 0 || it.unit_price) ? it.unit_price : '', discount: it.discount || '', vat_rate: it.vat_rate ?? 19, unit: it.unit || '', _card: it._card } }
  function newBlank(today, sl) { setInv({ invoice_date: today, due_date: addDays(today, 14), client_id: null, client_name: '', buyer: {}, notes: '', invoice_number: '', items: [emptyItem(sl.kleinunternehmer ? 0 : 19)] }); setShoots(null) }
  function buyerFromClient(c) { if (!c) return {}; return { company: c.name || '', contact: [c.contact_firstname, c.contact_lastname].filter(Boolean).join(' '), address: c.addr || '', email: c.contact_email || c.email || '', phone: c.contact_tel || c.tel || '', kundennr: c.kundennr || '' } }

  async function loadShoots(clientId, clientName, cls) {
    const c = (cls || clients).find(x => x.id === clientId || x.name === clientName || x.short_name === clientName)
    const keys = [c?.short_name, c?.name, clientName].filter(Boolean)
    if (!keys.length) { setShoots(null); return }
    const { data } = await supabase.from('cards').select('id,title,addr,description,card_date,card_type,client_name,booking_address,price,billed_at').in('client_name', keys).not('card_date', 'is', null).order('card_date', { ascending: false })
    const groups = {}
    ;(data || []).forEach(cd => { const mk = (cd.card_date || '').slice(0, 7); if (!mk) return; (groups[mk] = groups[mk] || []).push(cd) })
    setShoots(groups)
    const first = Object.keys(groups).sort().reverse()[0]; if (first) setShootsOpen({ [first]: true })
  }
  // Pontosan mint a Billomat-folyamatban (buildInvoiceItem): cím = "DD.MM.YYYY. - Kürzel - Adresse",
  // Beschreibung = Immobilienfotografie [+ Drohne] [+ Reel] + Postproduktion
  function buildFromCard(cd) {
    const client = clients.find(x => x.id === inv?.client_id)
    const clientShort = client?.short_name || (client?.name || '').trim().split(/\s+/)[0] || cd.client_name || ''
    const dd = cd.card_date ? cd.card_date.split('-').reverse().join('.') + '.' : ''
    let addr = (cd.booking_address || cd.title || '').trim()
    for (const p of [clientShort, client?.name, cd.client_name].filter(Boolean)) {
      const esc = String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp('^' + esc + '\\s*[-–—]\\s*', 'i')
      if (re.test(addr)) { addr = addr.replace(re, '').trim(); break }
    }
    addr = addr.replace(/\s*[-–—]?\s*(foto\s*\+\s*reel|foto-?reel|foto-?dron\w*|reel|drohne|drone)\s*$/i, '').trim()
    if (!cd.booking_address && cd.addr && !addr.toLowerCase().includes(String(cd.addr).toLowerCase())) addr = [addr, cd.addr].filter(Boolean).join(', ')
    const title = [dd, clientShort, addr].filter(Boolean).join(' - ')
    const tt = ((cd.card_type || '') + ' ' + (cd.title || '')).toLowerCase()
    const hasReel = /reel/.test(tt), hasDrohne = /drohne|drone|dron/.test(tt), hasMakler = /makler/.test(tt)
    const isEditing = /edit|bearbeitung|postpro/.test(tt) && !/foto/.test(cd.card_type || '')
    let parts
    if (isEditing) parts = ['Postproduktion']
    else { parts = ['Immobilienfotografie']; if (hasDrohne) parts.push('Drohne'); if (hasReel) parts.push(hasMakler ? 'Reel mit Makler' : 'Reel'); parts.push('Postproduktion') }
    // Ár: ügyfél service_prices[felismert típus] -> globális grundpreis -> kártya ára
    const svcId = serviceIdFor(tt)
    const cp = client?.service_prices || {}
    let price = ''
    if (svcId) {
      if (cp[svcId] != null && parseFloat(cp[svcId]) > 0) price = parseFloat(cp[svcId])
      else { const g = svcPrices.find(s => s.id === svcId); if (g && parseFloat(g.grundpreis) > 0) price = parseFloat(g.grundpreis) }
    }
    if (!price && cd.price) price = cd.price
    return { title, desc: parts.join(' + '), price, addr }
  }

  const set = patch => setInv(p => ({ ...p, ...patch }))
  const setBuyer = patch => setInv(p => ({ ...p, buyer: { ...(p.buyer || {}), ...patch } }))
  const setItem = (i, patch) => setInv(p => ({ ...p, items: p.items.map((it, j) => j === i ? { ...it, ...patch } : it) }))
  const addItem = () => setInv(p => ({ ...p, items: [...p.items, emptyItem(seller.kleinunternehmer ? 0 : 19)] }))
  const dupItem = i => setInv(p => { const a = [...p.items]; a.splice(i + 1, 0, { ...a[i], _card: undefined }); return { ...p, items: a } })
  const delItem = i => setInv(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }))
  const moveItem = (i, dir) => setInv(p => { const a = [...p.items]; const j = i + dir; if (j < 0 || j >= a.length) return p; const t = a[i]; a[i] = a[j]; a[j] = t; return { ...p, items: a } })
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const dropItem = to => { setInv(p => { if (dragIdx === null || dragIdx === to) return p; const a = [...p.items]; const [m] = a.splice(dragIdx, 1); a.splice(to, 0, m); return { ...p, items: a } }); setDragIdx(null); setDragOver(null) }
  function addrOf(it) { if (it._addr) return it._addr; const parts = String(it.title || '').split(' - '); if (parts.length >= 3) return parts.slice(2).join(' - ').trim(); return (parts[parts.length - 1] || '').trim() }
  // Cím-rövidítés a Titelhez: PLZ (5 számjegy) és ország eltávolítása, csak utca + város marad
  function shortAddr(a) {
    let x = String(a || '').replace(/,?\s*(Deutschland|Germany)\s*$/i, '')
    x = x.replace(/\b\d{5}\b\s*/g, '') // PLZ ki
    x = x.replace(/\s*,\s*,/g, ',').replace(/,\s*$/,'').replace(/\s{2,}/g, ' ').trim()
    return x
  }
  async function addFahrt(i) {
    const it = inv.items[i]; const addr = addrOf(it)
    if (!fahrt.start) { alert('Startadresse fehlt (rechts im Fahrtkosten-Feld eintragen).'); return }
    if (!addr) { alert('Keine Adresse in dieser Position erkannt. Bitte Titel als „… - … - Adresse" oder Adresse manuell.'); return }
    setBusy(true)
    try {
      const r = await fetch('/api/fahrtenbuch/distance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stops: [fahrt.start, addr, fahrt.start] }) })
      const j = await r.json()
      if (!j.ok || !j.legs) throw new Error(j.reason || 'Distanz nicht verfügbar')
      const meters = j.legs.reduce((s, l) => s + (l.distance || 0), 0)
      if (!meters) throw new Error('Keine Strecke gefunden — Adresse prüfen')
      const km = Math.round(meters / 1000 * 10) / 10
      const rate = num(fahrt.rate) || 0.29
      const ort = addr.split(',')[0]
      const srcTitle = shortAddr(it.title) || ('Fahrtkosten — ' + ort)
      setInv(p => { const a = [...p.items]; a.splice(i + 1, 0, { title: srcTitle, desc: 'Fahrtkosten (Hin- und Rückfahrt)', qty: km, unit_price: rate, unit: 'km', discount: '', vat_rate: seller.kleinunternehmer ? 0 : 19, _km: km }); return { ...p, items: a } })
    } catch (e) { alert('Fahrtkosten-Fehler: ' + (e.message || e)) }
    setBusy(false)
  }
  const onDate = v => set({ invoice_date: v, due_date: addDays(v, 14) })
  const onClient = name => { const c = clients.find(x => x.name === name || x.short_name === name); set({ client_name: c?.name || name, client_id: c?.id || null, buyer: c ? buyerFromClient(c) : (inv.buyer || {}) }); if (c) loadShoots(c.id, c.name, clients); else setShoots(null) }

  function shootChecked(cardId) { return (inv?.items || []).some(it => it._card === cardId) }
  function toggleShoot(cd, on) {
    setInv(p => {
      if (on) {
        const b = buildFromCard(cd)
        const items = p.items.filter(it => it.title || it.desc || num(it.unit_price) || it._card)
        return { ...p, items: [...items, { title: b.title, desc: b.desc, qty: 1, unit_price: b.price, discount: '', vat_rate: seller.kleinunternehmer ? 0 : 19, _card: cd.id, _addr: b.addr }] }
      }
      return { ...p, items: p.items.filter(it => it._card !== cd.id) }
    })
  }

  function totals() { let net = 0, vat = 0; (inv?.items || []).forEach(it => { const ln = num(it.qty) * num(it.unit_price) * (1 - num(it.discount) / 100); net += ln; vat += seller.kleinunternehmer ? 0 : ln * num(it.vat_rate) / 100 }); return { net: round2(net), vat: round2(vat), gross: round2(net + vat) } }
  function itemsForDb(invId) { const rate = it => seller.kleinunternehmer ? 0 : num(it.vat_rate); return inv.items.filter(it => (it.title || '').trim() || (it.desc || '').trim() || num(it.unit_price)).map((it, i) => { const ln = round2(num(it.qty) * num(it.unit_price) * (1 - num(it.discount) / 100)); const row = { invoice_id: invId, position: i + 1, description: [it.title, it.desc].filter(Boolean).join('\n'), qty: num(it.qty), unit_price: num(it.unit_price), discount: num(it.discount), vat_rate: rate(it), line_net: ln, line_gross: round2(ln * (1 + rate(it) / 100)) }; if (it.unit) row.unit = it.unit; return row } ) }
  function toInvoiceObj() { const t = totals(); const c = clients.find(x => x.id === inv.client_id); const buyer = { ...(inv.buyer || {}) }; if (!buyer.kundennr && c?.kundennr) buyer.kundennr = c.kundennr; return { invoice_number: inv.invoice_number || null, client_name: inv.client_name, invoice_date: inv.invoice_date, due_date: inv.due_date, total_net: t.net, vat_amount: t.vat, total_gross: t.gross, notes: inv.notes, buyer, storno_of: inv.storno_of || null } }

  async function save(finalize, redirect = true) {
    setBusy(true)
    try {
      const t = totals()
      const base = { client_id: inv.client_id || null, client_name: inv.client_name || '', invoice_date: inv.invoice_date, due_date: inv.due_date || null, total_net: t.net, vat_amount: t.vat, total_gross: t.gross, notes: inv.notes || null, seller, buyer: inv.buyer || {}, created_by: myId }
      // Duplikat-Warnung (falls die Nummer bereits auf einer anderen Rechnung existiert)
      if (inv.invoice_number) {
        const { data: dup } = await supabase.from('invoices').select('id').eq('invoice_number', inv.invoice_number).neq('id', inv.id || '00000000-0000-0000-0000-000000000000').maybeSingle()
        if (dup) {
          const ok = confirm('⚠ Achtung: Die Rechnungsnummer ' + inv.invoice_number + ' existiert bereits!\n\nTrotzdem mit dieser Nummer speichern? (Doppelte Nummern können bei der Buchhaltung Probleme verursachen.)')
          if (!ok) { setBusy(false); return false }
        }
      }
      let invId = inv.id
      // Entwurf BEHÄLT die (übernommene) Nummer — wird nicht mehr auf null gesetzt
      if (invId) { const { error } = await supabase.from('invoices').update({ ...base, invoice_number: inv.invoice_number || null }).eq('id', invId); if (error) throw error; await supabase.from('invoice_items').delete().eq('invoice_id', invId) }
      else { const { data, error } = await supabase.from('invoices').insert({ ...base, invoice_number: inv.invoice_number || null, status: 'draft' }).select('id').single(); if (error) throw error; invId = data.id; setInv(p => ({ ...p, id: invId })) }
      const rows = itemsForDb(invId)
      if (rows.length) { const { error: ie } = await supabase.from('invoice_items').insert(rows); if (ie) throw ie }
      if (finalize) {
        let numberStr = inv.invoice_number
        // Falls noch keine Nummer übernommen wurde, jetzt real reservieren (commit)
        if (!numberStr) {
          const { data: nd, error: nerr } = await supabase.rpc('commit_invoice_number'); if (nerr) throw nerr; numberStr = nd; setInv(p => ({ ...p, invoice_number: nd }))
        }
        const { error: ferr } = await supabase.from('invoices').update({ invoice_number: numberStr, status: 'open', finalized_at: new Date().toISOString() }).eq('id', invId)
        if (ferr) throw ferr
      }
      if (redirect) { window.location.href = '/rechnungen'; return true }
      return invId
    } catch (e) { alert('Fehler beim Speichern: ' + (e.message || e) + (String(e.message || '').includes('duplicate') ? '\n→ Diese Rechnungsnummer existiert bereits.' : '')); setBusy(false); return false }
  }

  async function fahrtenbuchKmForClient() {
    // A Fahrtenbuch a localStorage-ban van (bartz-fahrtenbuch-v1), nem Supabase-ben.
    // Összes profil (te + Dani + bárki) összes sora, ahol a zweck/von/bis illeszkedik az ügyfélre.
    const c = clients.find(x => x.id === inv.client_id)
    const keys = [c?.short_name, c?.name, inv.client_name, inv.buyer?.company].filter(Boolean).map(s => String(s).toLowerCase().trim()).filter(k => k.length >= 2)
    if (!keys.length) return 0
    try {
      const store = JSON.parse(localStorage.getItem('bartz-fahrtenbuch-v1') || '{}')
      const rowsByProfile = store.rows || {}
      let sum = 0
      for (const pid of Object.keys(rowsByProfile)) {
        for (const r of (rowsByProfile[pid] || [])) {
          const hay = ((r.zweck || '') + ' ' + (r.von || '') + ' ' + (r.bis || '')).toLowerCase()
          if (keys.some(k => hay.includes(k))) sum += (parseFloat(r.km) || 0)
        }
      }
      return Math.round(sum)
    } catch { return 0 }
  }
  async function makePdfBytes() {
    const clientKmTotal = await fahrtenbuchKmForClient()
    return await generateZugferdPdf({ inv: toInvoiceObj(), items: itemsForDb('x'), seller, template, clientKmTotal })
  }
  async function delInvoice() {
    if (!inv.id) { window.location.href = '/rechnungen'; return }
    if (!confirm('Diese Rechnung endgültig löschen?' + (finalized ? '\n(Festgeschrieben — Löschen evtl. blockiert, ggf. stornieren.)' : ''))) return
    setBusy(true)
    try {
      await supabase.from('invoice_items').delete().eq('invoice_id', inv.id)
      const { data, error } = await supabase.from('invoices').delete().eq('id', inv.id).select('id')
      if (error) throw error
      if (!data || !data.length) throw new Error('keine Berechtigung oder festgeschrieben')
      window.location.href = '/rechnungen'
    } catch (e) { alert('Löschen nicht möglich: ' + (e.message || e) + '\n(Festgeschriebene Rechnungen bitte stornieren.)'); setBusy(false) }
  }
  async function pdf() {
    setBusy(true)
    try { const bytes = await makePdfBytes(); const blob = new Blob([bytes], { type: 'application/pdf' }); const u = URL.createObjectURL(blob); window.open(u, '_blank'); setTimeout(() => URL.revokeObjectURL(u), 60000) }
    catch (e) { alert('PDF-Fehler: ' + (e.message || e)) }
    setBusy(false)
  }

  if (loading || !inv) return <div style={{ minHeight: '100dvh', background: BG, fontFamily: 'Arial', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUT }}>Lädt…</div>
  const t = totals()
  const totalKm = Math.round((inv.items || []).reduce((s, it) => s + (it.unit === 'km' ? num(it.qty) : (it._km || parseKm(it.desc))), 0) * 10) / 10
  const finalized = inv.id && inv.status && inv.status !== 'draft'
  const monthKeys = shoots ? Object.keys(shoots).sort().reverse() : []

  return (
    <div style={{ minHeight: '100dvh', background: BG, fontFamily: 'Arial, sans-serif', color: DARK }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', borderBottom: '1px solid ' + LINE, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>{finalized ? 'Rechnung ' + inv.invoice_number : (inv.id ? 'Entwurf bearbeiten' : 'Neue Rechnung')}</div>
        <button onClick={() => setEmailModal(true)} disabled={busy} style={ghost}>📧 Per E-Mail</button>
        <button onClick={pdf} disabled={busy} style={ghost}>PDF (neuer Tab)</button>
        {!finalized && <button onClick={() => save(false)} disabled={busy} style={ghost}>Als Entwurf speichern</button>}
        {!finalized && <button onClick={() => { if (confirm('Festschreiben? Danach unveränderlich + Nummer.')) save(true) }} disabled={busy} style={primary}>{busy ? '…' : 'Festschreiben'}</button>}
        {inv.id && <button onClick={delInvoice} disabled={busy} style={{ ...ghost, color: '#b3402f', borderColor: '#e9c9c2' }}>🗑 Löschen</button>}
        <button onClick={() => { window.location.href = '/rechnungen' }} style={ghost}>Schließen</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16, maxWidth: 1200, margin: '0 auto', padding: 18, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><Lbl>Rechnungsnummer (änderbar)</Lbl>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={inv.invoice_number || ''} onChange={e => set({ invoice_number: e.target.value })} placeholder={numberPreview ? ('vorläufig: ' + numberPreview) : 'Nr. wird vorbereitet…'} disabled={finalized} style={{ ...box, flex: 1 }} />
                {!finalized && !inv.invoice_number && numberPreview && <button onClick={() => set({ invoice_number: numberPreview })} style={{ ...ghost, whiteSpace: 'nowrap' }}>Übernehmen</button>}
              </div>
              {!finalized && !inv.invoice_number && numberPreview && <div style={{ fontSize: 10, color: MUT, marginTop: 2 }}>Nächste freie Nr.: <b>{numberPreview}</b> — „Übernehmen" reserviert sie für diesen Entwurf. Wird der Entwurf gelöscht, ist die Nr. wieder frei.</div>}
              {!finalized && inv.invoice_number && <div style={{ fontSize: 10, color: '#2f7a4f', marginTop: 2 }}>✓ Nr. {inv.invoice_number} für diesen Entwurf reserviert.</div>}
            </div>
            <div><Lbl>Datum</Lbl><input type="date" value={inv.invoice_date} onChange={e => onDate(e.target.value)} style={{ ...box, width: '100%' }} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Lbl>Anschrift (auf dieser Rechnung änderbar)</Lbl>
            <input value={inv.buyer?.company || ''} onChange={e => setBuyer({ company: e.target.value })} placeholder="Firma" style={{ ...box, width: '100%', marginBottom: 6 }} />
            <input value={inv.buyer?.contact || ''} onChange={e => setBuyer({ contact: e.target.value })} placeholder="Ansprechpartner (optional)" style={{ ...box, width: '100%', marginBottom: 6 }} />
            <textarea value={inv.buyer?.address || ''} onChange={e => setBuyer({ address: e.target.value })} rows={2} placeholder="Straße, PLZ Ort" style={{ ...box, width: '100%', resize: 'vertical', fontFamily: 'Arial' }} />
            <div style={{ fontSize: 11, color: MUT, marginTop: 4 }}>Änderungen gelten nur für diese Rechnung — die Kundendaten bleiben unverändert.</div>
          </div>
          <div style={{ marginTop: 12 }}><Lbl>Einleitungstext</Lbl><textarea value={inv.intro ?? template.intro} onChange={e => set({ intro: e.target.value })} rows={2} style={{ ...box, width: '100%', resize: 'vertical', fontFamily: 'Arial' }} /></div>

          {/* HAVI FOTÓZÁSOK — pipálással pozícióvá */}
          {shoots && monthKeys.length > 0 && (
            <div style={{ border: '1.5px dashed ' + GOLD, background: '#fdfaf3', borderRadius: 10, padding: 12, marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: DARK, marginBottom: 4 }}>📸 Aufnahmen von „{inv.client_name}" <span style={{ fontWeight: 400, color: MUT }}>— abhaken → wird Position</span></div>
              {monthKeys.map(mk => {
                const [yy, mm] = mk.split('-'); const open = !!shootsOpen[mk]
                return (
                  <div key={mk}>
                    <div onClick={() => setShootsOpen(s => ({ ...s, [mk]: !open }))} style={{ fontSize: 12, fontWeight: 800, color: GOLD, margin: '10px 0 4px', cursor: 'pointer' }}>{open ? '▾' : '▸'} {MONNAMES[+mm - 1]} {yy} <span style={{ color: MUT, fontWeight: 400 }}>({shoots[mk].length})</span></div>
                    {open && shoots[mk].map(cd => (
                      <label key={cd.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 4px', borderBottom: '.5px solid ' + LINE, fontSize: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={shootChecked(cd.id)} onChange={e => toggleShoot(cd, e.target.checked)} style={{ width: 16, height: 16, accentColor: GOLD }} />
                        <span><b>{fmt(cd.card_date)}</b> · {cd.addr || cd.title}{cd.billed_at ? <span style={{ color: '#b3402f', marginLeft: 6 }}>• berechnet</span> : ''}<br /><span style={{ color: MUT, fontSize: 11 }}>{cd.description || cd.card_type || ''}</span></span>
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: 18, marginBottom: 8, fontSize: 13, fontWeight: 800 }}>Positionen</div>
          <div style={{ display: 'grid', gridTemplateColumns: '34px 56px 84px 56px 64px 52px 1fr', gap: 6, fontSize: 9, fontWeight: 700, color: MUT, textTransform: 'uppercase', marginBottom: 4, padding: '0 2px' }}>
            <span></span><span>Anzahl</span><span>Preis</span><span>Einheit</span><span>Steuer</span><span>Rabatt%</span><span>Titel / Beschreibung</span>
          </div>
          {inv.items.map((it, i) => (
            <div key={i}
              onDragOver={e => { if (dragIdx === null) return; e.preventDefault(); if (dragOver !== i) setDragOver(i) }}
              onDrop={e => { if (dragIdx === null) return; e.preventDefault(); dropItem(i) }}
              style={{ display: 'grid', gridTemplateColumns: '34px 56px 84px 56px 64px 52px 1fr', gap: 6, marginBottom: 8, alignItems: 'start', background: it._card ? '#fdfaf3' : '#fbfaf7', border: '1px solid ' + (dragOver === i && dragIdx !== null && dragIdx !== i ? GOLD : LINE), borderRadius: 8, padding: '8px 6px', opacity: dragIdx === i ? 0.4 : 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <div
                  draggable
                  onDragStart={e => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move' }}
                  onDragEnd={() => { setDragIdx(null); setDragOver(null) }}
                  title="Zum Verschieben ziehen" style={{ cursor: 'grab', color: '#c9c2b2', textAlign: 'center', paddingTop: 5, fontSize: 15, lineHeight: 1, userSelect: 'none' }}>⠿</div>
                <button title="Fahrtkosten berechnen (Hin- und Rückfahrt)" onClick={() => addFahrt(i)} disabled={busy} style={{ ...icon, color: GOLD }}>🚗</button>
                <button title="Duplizieren" onClick={() => dupItem(i)} style={icon}>⎘</button>
                <button title="Löschen" onClick={() => delItem(i)} style={{ ...icon, color: '#b3402f' }}>✕</button>
              </div>
              <input value={it.qty} onChange={e => setItem(i, { qty: e.target.value })} style={{ ...box, textAlign: 'right' }} />
              <input value={it.unit_price} onChange={e => setItem(i, { unit_price: e.target.value })} placeholder="0,00" style={{ ...box, textAlign: 'right' }} />
              <input value={it.unit || ''} onChange={e => setItem(i, { unit: e.target.value })} list="unitopts" placeholder="—" style={{ ...box, textAlign: 'center' }} />
              <select value={it.vat_rate} onChange={e => setItem(i, { vat_rate: e.target.value })} disabled={seller.kleinunternehmer} style={box}><option value="19">19%</option><option value="7">7%</option><option value="0">0%</option></select>
              <input value={it.discount} onChange={e => setItem(i, { discount: e.target.value })} placeholder="0" style={{ ...box, textAlign: 'right' }} />
              <div>
                <input value={it.title} onChange={e => setItem(i, { title: e.target.value })} placeholder="z.B. 01.06.2026 - EV-Da - Adresse" style={{ ...box, width: '100%', marginBottom: 4, fontWeight: 600 }} />
                <textarea value={it.desc} onChange={e => setItem(i, { desc: e.target.value })} placeholder="Leistung" rows={2} style={{ ...box, width: '100%', resize: 'vertical', fontFamily: 'Arial' }} />
              </div>
            </div>
          ))}
          <datalist id="unitopts"><option value="km" /><option value="St." /><option value="Std" /><option value="Datum" /></datalist>
          <button onClick={addItem} style={ghost}>+ Position</button>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 22, marginTop: 16, paddingTop: 12, borderTop: '1px solid ' + LINE, fontSize: 13 }}>
            {totalKm > 0 && <span style={{ color: MUT, marginRight: 'auto' }}>🚗 gefahren: <b style={{ color: DARK }}>{totalKm.toLocaleString('de-DE')} km</b></span>}
            <span style={{ color: MUT }}>Netto <b style={{ color: DARK }}>{eur(t.net)}</b></span>
            <span style={{ color: MUT }}>USt <b style={{ color: DARK }}>{eur(t.vat)}</b></span>
            <span style={{ color: MUT }}>Gesamt <b style={{ color: GOLD, fontSize: 15 }}>{eur(t.gross)}</b></span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Side title="Kunde">
            <input list="clf" value={inv.client_name} onChange={e => onClient(e.target.value)} placeholder="Kunde suchen (voller Name)…" style={{ ...box, width: '100%' }} />
            <datalist id="clf">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
            {inv.buyer?.company && (
              <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5 }}>
                {inv.buyer.kundennr && <div style={{ color: GOLD, fontWeight: 700 }}>[{inv.buyer.kundennr}]</div>}
                <div style={{ fontWeight: 700 }}>{inv.buyer.company}</div>
                {inv.buyer.contact && <div>{inv.buyer.contact}</div>}
                {inv.buyer.address && <div style={{ color: MUT }}>{inv.buyer.address}</div>}
                {inv.buyer.email && <div style={{ color: MUT }}>{inv.buyer.email}</div>}
                {inv.buyer.phone && <div style={{ color: MUT }}>{inv.buyer.phone}</div>}
              </div>
            )}
          </Side>
          <Side title="Fälligkeit">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>In <input value={dueDays(inv)} onChange={e => set({ due_date: addDays(inv.invoice_date, e.target.value) })} style={{ ...box, width: 46, textAlign: 'center' }} /> Tagen =
              <input type="date" value={inv.due_date || ''} onChange={e => set({ due_date: e.target.value })} style={{ ...box, flex: 1 }} /></div>
          </Side>
          <Side title="Fahrtkosten">
            <Lbl>Startadresse (Zuhause / Büro)</Lbl>
            <input value={fahrt.start} onChange={e => setFahrt(f => ({ ...f, start: e.target.value }))} style={{ ...box, width: '100%', marginBottom: 8 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>€ / km <input value={fahrt.rate} onChange={e => setFahrt(f => ({ ...f, rate: e.target.value }))} style={{ ...box, width: 64, textAlign: 'right' }} /></div>
            <div style={{ fontSize: 11, color: MUT, marginTop: 8 }}>Pro Position auf 🚗 tippen → Hin- und Rückfahrt (Google Maps) als eigene Position.</div>
            {totalKm > 0 && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700 }}>Gefahren gesamt: <span style={{ color: GOLD }}>{totalKm.toLocaleString('de-DE')} km</span></div>}
          </Side>
          <Side title="Kundendaten">
            <Field label="Firmenname" v={inv.buyer?.company} on={v => setBuyer({ company: v })} />
            <Field label="Ansprechpartner" v={inv.buyer?.contact} on={v => setBuyer({ contact: v })} />
            <Field label="Adresse" v={inv.buyer?.address} on={v => setBuyer({ address: v })} />
            <Field label="Telefon" v={inv.buyer?.phone} on={v => setBuyer({ phone: v })} />
            <Field label="E-Mail" v={inv.buyer?.email} on={v => setBuyer({ email: v })} />
            <Field label="Kundennummer" v={inv.buyer?.kundennr} on={v => setBuyer({ kundennr: v })} />
          </Side>
        </div>
      </div>

      {emailModal && <EmailModal inv={inv} seller={seller} template={template} makePdfBytes={makePdfBytes} ensureSaved={() => save(false, false)} onClose={() => setEmailModal(false)} />}
    </div>
  )
}

function EmailModal({ inv, seller, template, makePdfBytes, ensureSaved, onClose }) {
  const [to, setTo] = useState(inv.buyer?.email || '')
  const [tpl, setTpl] = useState('rechnung')
  const [subject, setSubject] = useState(SCHABLONEN.rechnung.subject)
  const [body, setBody] = useState(SCHABLONEN.rechnung.body)
  const [sending, setSending] = useState(false)
  const pick = k => { setTpl(k); setSubject(SCHABLONEN[k].subject); setBody(SCHABLONEN[k].body) }
  async function send() {
    if (!to) { alert('Empfänger-E-Mail fehlt.'); return }
    setSending(true)
    try {
      await ensureSaved()
      const bytes = await makePdfBytes()
      let bin = ''; const arr = new Uint8Array(bytes); for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]); const b64 = btoa(bin)
      const r = await fetch('/api/invoice/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject, body, greeting: 'Sehr geehrte Damen und Herren,', pdfBase64: b64, filename: 'Rechnung-' + (inv.invoice_number || 'Entwurf') + '.pdf', seller }) })
      const j = await r.json()
      if (!r.ok || !j.ok) throw new Error(j.error || 'Senden fehlgeschlagen')
      alert('✓ E-Mail gesendet an ' + to); onClose()
    } catch (e) { alert('E-Mail-Fehler: ' + (e.message || e)) }
    setSending(false)
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '50px 16px', zIndex: 50, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 20, width: '100%', maxWidth: 520 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>Rechnung per E-Mail senden</h2>
        <div style={{ fontSize: 12, color: MUT, marginBottom: 14 }}>Absender: <b style={{ color: DARK }}>rechnung@immopixels.de</b> · PDF im Anhang · auch im Entwurf möglich</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>{Object.entries(SCHABLONEN).map(([k, v]) => <button key={k} onClick={() => pick(k)} style={{ ...(tpl === k ? primary : ghost), padding: '6px 10px', fontSize: 11 }}>{v.label}</button>)}</div>
        <Lbl>An</Lbl><input value={to} onChange={e => setTo(e.target.value)} style={{ ...box, width: '100%', marginBottom: 10 }} />
        <Lbl>Betreff</Lbl><input value={subject} onChange={e => setSubject(e.target.value)} style={{ ...box, width: '100%', marginBottom: 10 }} />
        <Lbl>Text</Lbl><textarea value={body} onChange={e => setBody(e.target.value)} rows={6} style={{ ...box, width: '100%', resize: 'vertical', fontFamily: 'Arial' }} />
        <div style={{ fontSize: 11, color: MUT, marginTop: 6 }}>Footer (ImmoPixels e.K. + Bankdaten) wird automatisch angehängt.</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={ghost}>Abbrechen</button>
          <button onClick={send} disabled={sending} style={primary}>{sending ? 'Sende…' : 'Senden'}</button>
        </div>
      </div>
    </div>
  )
}

function parseKm(desc) { const m = String(desc || '').match(/([\d.,]+)\s*km/i); if (!m) return 0; const n = parseFloat(m[1].replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : n }
function fmt(d) { const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}.${m[2]}.${m[1]}` : (d || '') }
function Lbl({ children }) { return <div style={{ fontSize: 10, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>{children}</div> }
function Side({ title, children }) { return <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, overflow: 'hidden' }}><div style={{ background: DARK, color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '.5px', padding: '8px 12px', textTransform: 'uppercase' }}>{title}</div><div style={{ padding: 12 }}>{children}</div></div> }
function Field({ label, v, on }) { return <div style={{ marginBottom: 8 }}><Lbl>{label}</Lbl><input value={v || ''} onChange={e => on(e.target.value)} style={{ ...box, width: '100%' }} /></div> }
const box = { border: '1.5px solid ' + LINE, borderRadius: 6, padding: '7px 8px', fontSize: 12, color: DARK, fontFamily: 'Arial', outline: 'none', boxSizing: 'border-box', background: '#fff' }
const primary = { background: GOLD, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const ghost = { background: '#fff', color: DARK, border: '1px solid ' + LINE, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const icon = { background: 'none', border: 'none', cursor: 'pointer', color: MUT, fontSize: 17, padding: 2, lineHeight: 1 }
