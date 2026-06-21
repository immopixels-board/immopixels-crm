'use client'
import { useEffect, useState, Fragment } from 'react'
import { createClient } from '@supabase/supabase-js'
import { generateZugferdPdf } from '../../lib/invoice/zugferd'
import { generateMahnungPdf, defaultMahnungText } from '../../lib/invoice/mahnung'
import RechnungShell from '../../components/RechnungShell'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const GOLD = '#6b6b6e', DARK = '#2a2a28', MUT = '#8a8278', CREAM = '#faf7f1', LINE = '#ece4d6'
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const MONTHS_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const monthLabel = mk => { const [y, m] = String(mk || '').split('-'); const idx = (+m) - 1; return (MONTHS_FULL[idx] || '') + ' ' + (y || '') }
const eur = n => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const num = v => { if (typeof v === 'number') return v; let s = String(v ?? '').trim(); if (!s) return 0; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); s = s.replace(/[^\d.\-]/g, ''); const n = parseFloat(s); return isNaN(n) ? 0 : n }
const round2 = n => Math.round((Number(n) || 0) * 100) / 100
const addDays = (d, n) => { const p = String(d || '').split('-').map(Number); if (p.length < 3 || !p[0]) return ''; return new Date(Date.UTC(p[0], p[1] - 1, p[2] + (parseInt(n) || 0))).toISOString().slice(0, 10) }
const STATUS = { draft: { label: 'Entwurf', c: '#8a8278', bg: '#efece4' }, open: { label: 'Offen', c: '#54545a', bg: '#f6efe0' }, overdue: { label: 'Überfällig', c: '#b3402f', bg: '#fae7e2' }, paid: { label: 'Bezahlt', c: '#2f7a4f', bg: '#e6f3ec' }, storno: { label: 'Storniert', c: '#b3402f', bg: '#f3e9e7' } }

const DEFAULT_SELLER = { name: 'ImmoPixels e.K.', street: 'Gartenstr. 2', zip: '67310', city: 'Hettenleidelheim', vatId: 'DE351098294', taxNo: '', iban: 'DE65672500201003013371', bic: 'SOLADES1HDB', bank: 'Sparkasse Heidelberg', phone: '+49 176 41576629', email: 'rechnung@immopixels.de', web: 'www.immopixels.de', kleinunternehmer: false }
const DEFAULT_TEMPLATE = { intro: 'Hiermit stellen wir Ihnen die folgenden Positionen in Rechnung.', closing: 'Vielen Dank für die Zusammenarbeit!', reviewText: 'Zufrieden? Wir freuen uns über Ihre Google-Bewertung!', reviewUrl: '', bookingUrl: 'https://immopixels.de/booking/', qrUrl: '', logoUrl: '', footerLinks: [], startAddress: 'Gartenstr. 2, 67310 Hettenleidelheim', kmRate: 0.29 }
const DEFAULT_EMAIL = { host: '', port: 465, user: 'rechnung@immopixels.de', pass: '', fromName: 'ImmoPixels', bcc: '', subject: 'Rechnung {nr} – {firma}', body: 'Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihren Auftrag. Anbei erhalten Sie die Rechnung {nr} vom {datum} über {betrag} als PDF.\n\nBitte überweisen Sie den Betrag bis zum {faellig} auf das in der Rechnung angegebene Konto.\n\nBei Rückfragen stehen wir Ihnen gerne zur Verfügung.', signature: 'Mit freundlichen Grüßen\nImmoPixels e.K.\nGartenstr. 2, 67310 Hettenleidelheim\nrechnung@immopixels.de · www.immopixels.de', reminderSubject: 'Zahlungserinnerung zur Rechnung {nr}', reminderBody: 'Sehr geehrte Damen und Herren,\n\nsicher ist es nur ein Versehen: Unsere Rechnung {nr} vom {datum} über {betrag} war am {faellig} fällig und ist bei uns bisher noch nicht eingegangen.\n\nWir möchten Sie freundlich bitten, den offenen Betrag in den nächsten Tagen auf das in der Rechnung angegebene Konto zu überweisen. Die Rechnung finden Sie zur Erinnerung nochmals im Anhang.\n\nSollte sich Ihre Zahlung mit dieser E-Mail überschnitten haben, betrachten Sie diese bitte als gegenstandslos.\n\nVielen Dank!' }

export default function RechnungenPage() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('rechnungen')
  const [brutto, setBrutto] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [hasTable, setHasTable] = useState(true)
  const [myId, setMyId] = useState(null)
  const [seller, setSeller] = useState(DEFAULT_SELLER)
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [emailCfg, setEmailCfg] = useState(DEFAULT_EMAIL)
  const [editor, setEditor] = useState(null)
  const [settingsModal, setSettingsModal] = useState(false)
  const [mahnModal, setMahnModal] = useState(null)
  const [sendModal, setSendModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [fSearch, setFSearch] = useState('')
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [fStatus, setFStatus] = useState('all')

  useEffect(() => { init() }, [])
  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: staff } = await supabase.from('staff').select('*').eq('email', user.email).single()
    if (!staff || (staff.role_level !== 'admin' && !staff.can_invoice)) { window.location.href = '/'; return }
    setMyId(staff.id)
    const { data: cls } = await supabase.from('clients').select('id,name,short_name,addr,email,tel,contact_firstname,contact_lastname,contact_tel,contact_email').order('name')
    setClients(cls || [])
    const { data: s1 } = await supabase.from('settings').select('value').eq('key', 'invoice_seller').maybeSingle()
    if (s1?.value) { try { setSeller({ ...DEFAULT_SELLER, ...JSON.parse(s1.value) }) } catch {} }
    const { data: s2 } = await supabase.from('settings').select('value').eq('key', 'invoice_template').maybeSingle()
    if (s2?.value) { try { setTemplate({ ...DEFAULT_TEMPLATE, ...JSON.parse(s2.value) }) } catch {} }
    const { data: s3 } = await supabase.from('settings').select('value').eq('key', 'invoice_email').maybeSingle()
    if (s3?.value) { try { setEmailCfg({ ...DEFAULT_EMAIL, ...JSON.parse(s3.value) }) } catch {} }
    await reload()
    // előtöltés kártyáról
    setLoading(false)
  }
  async function reload() {
    try {
      const { data, error } = await supabase.from('invoices').select('id,invoice_number,client_id,client_name,invoice_date,due_date,status,total_net,vat_amount,total_gross,storno_of,notes,buyer').order('invoice_date', { ascending: false }).order('invoice_number', { ascending: false })
      if (error) { setHasTable(false); return }
      setInvoices(data || [])
    } catch { setHasTable(false) }
  }
  async function saveSettings() {
    await supabase.from('settings').upsert({ key: 'invoice_seller', value: JSON.stringify(seller) }, { onConflict: 'key' })
    await supabase.from('settings').upsert({ key: 'invoice_template', value: JSON.stringify(template) }, { onConflict: 'key' })
    await supabase.from('settings').upsert({ key: 'invoice_email', value: JSON.stringify(emailCfg) }, { onConflict: 'key' })
    setSettingsModal(false)
  }

  function buyerFromClient(c) {
    if (!c) return {}
    return { company: c.name || '', contact: [c.contact_firstname, c.contact_lastname].filter(Boolean).join(' '), address: c.addr || '', email: c.contact_email || c.email || '', phone: c.contact_tel || c.tel || '', kundennr: c.kundennr || '' }
  }
  function newInvoice() { try { localStorage.removeItem('ip-invoice-prefill') } catch {} window.location.href = '/rechnungen/neu' }
  function openEditorPrefill(pf, cls) {
    const c = (cls || clients).find(x => x.id === pf.client_id || (x.short_name || x.name) === pf.client_name || x.name === pf.client_name)
    const d = pf.invoice_date || new Date().toISOString().slice(0, 10)
    setEditor({ items: pf.items && pf.items.length ? pf.items : [{ description: pf.description || '', qty: 1, unit_price: pf.price || '', discount: '', vat_rate: seller.kleinunternehmer ? 0 : 19 }], invoice_date: d, due_date: addDays(d, 14), client_name: pf.client_name || (c ? (c.short_name || c.name) : ''), client_id: c?.id || null, buyer: buyerFromClient(c), notes: '' })
    setTab('rechnungen')
  }
  function editInvoice(inv) { window.location.href = '/rechnungen/neu?id=' + inv.id }

  function calcTotals(items, klein) {
    let net = 0, vat = 0
    items.forEach(it => { const ln = num(it.qty) * num(it.unit_price) * (1 - num(it.discount) / 100); net += ln; vat += klein ? 0 : ln * num(it.vat_rate) / 100 })
    return { net: round2(net), vat: round2(vat), gross: round2(net + vat) }
  }
  async function persistInvoice(ed, finalize) {
    setBusy(true)
    try {
      const items = ed.items.filter(it => (it.description || '').trim() || num(it.unit_price))
      const t = calcTotals(items, seller.kleinunternehmer)
      const base = { client_id: ed.client_id || null, client_name: ed.client_name || '', invoice_date: ed.invoice_date, due_date: ed.due_date || null, total_net: t.net, vat_amount: t.vat, total_gross: t.gross, notes: ed.notes || null, seller, buyer: ed.buyer || {}, created_by: myId }
      let invId = ed.id
      if (invId) { const { error: ue } = await supabase.from('invoices').update(base).eq('id', invId); if (ue) throw ue; await supabase.from('invoice_items').delete().eq('invoice_id', invId) }
      else { const { data, error } = await supabase.from('invoices').insert({ ...base, status: 'draft' }).select('id').single(); if (error) throw error; invId = data.id }
      const rate = it => seller.kleinunternehmer ? 0 : num(it.vat_rate)
      const itemRows = items.map((it, i) => { const ln = round2(num(it.qty) * num(it.unit_price) * (1 - num(it.discount) / 100)); return { invoice_id: invId, position: i + 1, description: it.description || '', qty: num(it.qty), unit_price: num(it.unit_price), discount: num(it.discount), vat_rate: rate(it), line_net: ln, line_gross: round2(ln * (1 + rate(it) / 100)) } })
      if (itemRows.length) { const { error: ie } = await supabase.from('invoice_items').insert(itemRows); if (ie) throw ie }
      if (finalize) {
        const y = +(ed.invoice_date || '').slice(0, 4) || new Date().getFullYear()
        const { data: numData, error: nerr } = await supabase.rpc('commit_invoice_number')
        if (nerr) throw nerr
        await supabase.from('invoices').update({ invoice_number: numData, status: 'open', finalized_at: new Date().toISOString() }).eq('id', invId)
      }
      setEditor(null); await reload()
    } catch (e) { alert('Fehler: ' + (e.message || e)) }
    setBusy(false)
  }
  async function storno(inv) {
    if (!confirm('Rechnung ' + inv.invoice_number + ' stornieren? Es wird eine negative Stornorechnung erstellt.')) return
    setBusy(true)
    try {
      const { data: its } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id).order('position')
      const y = +(inv.invoice_date || '').slice(0, 4) || new Date().getFullYear()
      const { data: numData, error: nerr } = await supabase.rpc('commit_invoice_number'); if (nerr) throw nerr
      const { data: sRow, error } = await supabase.from('invoices').insert({ invoice_number: numData, client_id: inv.client_id, client_name: inv.client_name, invoice_date: new Date().toISOString().slice(0, 10), status: 'storno', storno_of: inv.id, total_net: -inv.total_net, vat_amount: -inv.vat_amount, total_gross: -inv.total_gross, notes: 'Storno zu ' + inv.invoice_number, seller, buyer: inv.buyer || {}, created_by: myId, finalized_at: new Date().toISOString() }).select('id').single()
      if (error) throw error
      if (its?.length) await supabase.from('invoice_items').insert(its.map((it, i) => ({ invoice_id: sRow.id, position: i + 1, description: it.description, qty: it.qty, unit_price: it.unit_price, discount: it.discount || 0, vat_rate: it.vat_rate, line_net: -it.line_net, line_gross: -it.line_gross })))
      await supabase.from('invoices').update({ status: 'storno' }).eq('id', inv.id)
      await reload()
    } catch (e) { alert('Fehler: ' + (e.message || e)) }
    setBusy(false)
  }
  async function delInvoices(ids) {
    if (!ids.length) return
    if (!confirm(ids.length + ' Rechnung(en) endgültig löschen? (Festgeschriebene können nicht gelöscht werden — dafür Storno.)')) return
    setBusy(true)
    let del = 0, blocked = 0
    try {
      for (const id of ids) {
        await supabase.from('invoice_items').delete().eq('invoice_id', id)
        const { data, error } = await supabase.from('invoices').delete().eq('id', id).select('id')
        if (error || !data || !data.length) blocked++; else del++
      }
      setSelected(new Set()); await reload()
      if (blocked) alert('✓ ' + del + ' gelöscht. ' + blocked + ' konnten nicht gelöscht werden (festgeschrieben → bitte stornieren).')
    } catch (e) { alert('Fehler beim Löschen: ' + (e.message || e)) }
    setBusy(false)
  }
  function toggleSel(id) { setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleSelAll() { setSelected(s => s.size === invoices.length ? new Set() : new Set(invoices.map(i => i.id))) }

  async function fahrtenbuchKmFor(inv) {
    const cl = (clients || []).find(x => x.id === inv.client_id)
    const keys = [cl?.short_name, cl?.name, inv.client_name, inv.buyer?.company].filter(Boolean).map(s => String(s).toLowerCase().trim()).filter(k => k.length >= 2)
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
  async function clientKmFromItems(its, inv) {
    const base = [seller.street, [seller.zip, seller.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    const items = (its || [])
      .filter(it => it.unit !== 'km' && !/fahrtkosten|übernachtung/i.test(it.description || ''))
      .map(it => {
        const first = String(it.description || '').split('\n')[0]
        const parts = first.split(' - ')
        const address = parts.length >= 3 ? parts.slice(2).join(' - ').trim() : ''
        const dm = first.match(/(\d{2})\.(\d{2})\.(\d{4})/)
        const date = dm ? dm[3] + '-' + dm[2] + '-' + dm[1] : ''
        return { address, date }
      })
      .filter(x => x.address && x.address.includes(','))
    if (!base || !items.length) return await fahrtenbuchKmFor(inv)
    try {
      const r = await fetch('/api/invoice/client-km', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base, items }) })
      const j = await r.json()
      const km = j.ok ? (j.km || 0) : 0
      return km || await fahrtenbuchKmFor(inv)
    } catch { return await fahrtenbuchKmFor(inv) }
  }
  async function downloadPdf(inv) {
    setBusy(true)
    try {
      const { data: its } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id).order('position')
      const clientKmTotal = await clientKmFromItems(its || [], inv)
      const cl0 = (clients || []).find(x => x.id === inv.client_id)
      const invForPdf = { ...inv, buyer: { ...(inv.buyer || {}), kundennr: (inv.buyer && inv.buyer.kundennr) || cl0?.kundennr || '' } }
      const bytes = await generateZugferdPdf({ inv: invForPdf, items: its || [], seller, template, clientKmTotal })
      const blob = new Blob([bytes], { type: 'application/pdf' }); const u = URL.createObjectURL(blob)
      const fname = 'Rechnung ' + (inv.invoice_number || 'Entwurf') + '.pdf'
      const a = document.createElement('a'); a.href = u; a.download = fname; a.click()
      setTimeout(() => URL.revokeObjectURL(u), 60000)
    } catch (e) { alert('PDF-Fehler: ' + (e.message || e)) }
    setBusy(false)
  }

  function buildSend(inv, kind) {
    const cl = (clients || []).find(x => x.id === inv.client_id)
    const to = cl?.email || (inv.buyer && inv.buyer.email) || ''
    const nr = inv.invoice_number || ''
    const firma = (seller && (seller.name || seller.company)) || emailCfg.fromName || 'ImmoPixels'
    const dF = s => s ? new Date(s).toLocaleDateString('de-DE') : ''
    const rep = s => String(s || '')
      .replace(/\{nr\}/g, nr).replace(/\{firma\}/g, firma).replace(/\{kunde\}/g, inv.client_name || '')
      .replace(/\{betrag\}/g, eur(inv.total_gross)).replace(/\{faellig\}/g, dF(inv.due_date)).replace(/\{datum\}/g, dF(inv.invoice_date))
    const subjTpl = kind === 'reminder' ? (emailCfg.reminderSubject || DEFAULT_EMAIL.reminderSubject) : (emailCfg.subject || DEFAULT_EMAIL.subject)
    const bodyTpl = kind === 'reminder' ? (emailCfg.reminderBody || DEFAULT_EMAIL.reminderBody) : (emailCfg.body || DEFAULT_EMAIL.body)
    const subject = rep(subjTpl)
    const body = rep(bodyTpl) + (emailCfg.signature ? '\n\n' + emailCfg.signature : '')
    setSendModal({ inv, kind, to, subject, body, bccSelf: true, sending: false })
  }
  function openSend(inv) { buildSend(inv, 'invoice') }
  function openReminder(inv) { buildSend(inv, 'reminder') }
  async function doSend() {
    if (!sendModal) return
    const { inv, to, subject, body, bccSelf, kind } = sendModal
    if (!to || !/.+@.+\..+/.test(to)) { alert('Bitte eine gültige Empfänger-E-Mail eingeben.'); return }
    setSendModal(s => ({ ...s, sending: true }))
    try {
      const { data: its } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id).order('position')
      const clientKmTotal = await clientKmFromItems(its || [], inv)
      const cl0 = (clients || []).find(x => x.id === inv.client_id)
      const invForPdf = { ...inv, buyer: { ...(inv.buyer || {}), kundennr: (inv.buyer && inv.buyer.kundennr) || cl0?.kundennr || '' } }
      const bytes = await generateZugferdPdf({ inv: invForPdf, items: its || [], seller, template, clientKmTotal })
      const u8 = new Uint8Array(bytes); let bin = ''; for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i])
      const pdfBase64 = btoa(bin)
      const filename = 'Rechnung ' + (inv.invoice_number || 'Entwurf') + '.pdf'
      const r = await fetch('/api/invoice/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject, text: body, bcc: bccSelf ? (emailCfg.bcc || seller?.email || undefined) : undefined, pdfBase64, filename, smtp: { host: emailCfg.host, port: emailCfg.port, user: emailCfg.user, pass: emailCfg.pass, fromName: emailCfg.fromName } }) })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'Senden fehlgeschlagen')
      const upd = kind === 'reminder' ? { reminded_at: new Date().toISOString() } : { sent_at: new Date().toISOString(), sent_to: to }
      try { await supabase.from('invoices').update(upd).eq('id', inv.id) } catch {}
      setSendModal(null); await load()
      alert((kind === 'reminder' ? '✓ Zahlungserinnerung zu ' + (inv.invoice_number || '') : '✓ Rechnung ' + (inv.invoice_number || '')) + ' wurde an ' + to + ' gesendet.')
    } catch (e) { alert('E-Mail-Fehler: ' + (e.message || e)); setSendModal(s => s && ({ ...s, sending: false })) }
  }

  function openMahnung(inv) {
    const stufe = 1
    const gebuehr = 5
    const iso = addDays(new Date().toISOString().slice(0, 10), 14)
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
    const frist = m ? `${m[3]}.${m[2]}.${m[1]}` : iso
    setMahnModal({ inv, stufe, gebuehr, frist, text: defaultMahnungText({ inv, stufe, gebuehr, frist }) })
  }
  async function downloadMahnung() {
    if (!mahnModal) return
    setBusy(true)
    try {
      const { inv, text, gebuehr, stufe } = mahnModal
      const bytes = await generateMahnungPdf({ inv, seller, template, text, gebuehr, stufe })
      const blob = new Blob([bytes], { type: 'application/pdf' }); const u = URL.createObjectURL(blob); const a = document.createElement('a')
      const cl = (clients || []).find(x => x.id === inv.client_id)
      const abk = (cl?.short_name || '').trim().replace(/[\/:*?"<>|]+/g, '').replace(/\s+/g, '-')
      const stLabel = stufe === 1 ? 'Zahlungserinnerung' : (stufe + '. Mahnung')
      a.href = u; a.download = stLabel + ' ' + (inv.invoice_number || '') + (abk ? '_' + abk : '') + '.pdf'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 3000)
      setMahnModal(null)
    } catch (e) { alert('Mahnung-PDF-Fehler: ' + (e.message || e)) }
    setBusy(false)
  }

  const val = i => brutto ? (i.total_gross || 0) : (i.total_net || 0)
  const issued = invoices.filter(i => i.status !== 'draft')
  const now = new Date(), curY = now.getFullYear(), curM = now.getMonth()
  const years = [...new Set(issued.map(i => +(i.invoice_date || '').slice(0, 4)).filter(Boolean))].sort((a, b) => b - a)
  const sum = arr => arr.reduce((s, i) => s + val(i), 0)
  const inYear = y => issued.filter(i => (i.invoice_date || '').slice(0, 4) === String(y))
  const kpiMonth = sum(issued.filter(i => { const d = i.invoice_date || ''; return d.slice(0, 4) === String(curY) && +d.slice(5, 7) === curM + 1 }))
  const kpiYear = sum(inYear(curY)), kpiAll = sum(issued)
  const kpiOpen = invoices.filter(i => i.status === 'open' || i.status === 'overdue').reduce((s, i) => s + (i.total_gross || 0), 0)
  const draftList = invoices.filter(i => i.status === 'draft'); const kpiDraft = draftList.reduce((s, i) => s + (i.total_gross || 0), 0)
  // Status-összesítők (db + összeg) a redesignhoz
  const statusSummary = ['draft', 'open', 'overdue', 'paid', 'storno'].map(s => { const list = invoices.filter(i => i.status === s); return { s, count: list.length, sum: list.reduce((a, i) => a + (i.total_gross || 0), 0) } })
  // Szűrt lista
  const filteredInvoices = invoices.filter(i => {
    if (fStatus !== 'all' && i.status !== fStatus) return false
    if (fFrom && (i.invoice_date || '') < fFrom) return false
    if (fTo && (i.invoice_date || '') > fTo) return false
    if (fSearch) { const t = fSearch.toLowerCase(); if (!String(i.client_name || '').toLowerCase().includes(t) && !String(i.invoice_number || '').toLowerCase().includes(t)) return false }
    return true
  })
  // havi összesítés a lista-fejlécekhez (a lista invoice_date szerint csökkenő sorrendben jön)
  const monthAgg = {}
  for (const i of filteredInvoices) { const mk = (i.invoice_date || '').slice(0, 7); if (!mk) continue; if (!monthAgg[mk]) monthAgg[mk] = { count: 0, sum: 0 }; monthAgg[mk].count++; monthAgg[mk].sum += (i.total_gross || 0) }
  const monthVals = MONTHS.map((_, m) => sum(inYear(year).filter(i => +(i.invoice_date || '').slice(5, 7) === m + 1)))
  const maxMonth = Math.max(1, ...monthVals)
  const byClient = {}; inYear(year).forEach(i => { const k = i.client_name || '—'; byClient[k] = (byClient[k] || 0) + val(i) })
  const clientRows = Object.entries(byClient).sort((a, b) => b[1] - a[1]); const maxClient = Math.max(1, ...clientRows.map(r => r[1]))

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Abrechnung</h1>
        <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, background: '#f6efe0', border: '1px solid #ecdfc4', borderRadius: 20, padding: '3px 10px' }}>🔒 nur du</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setSettingsModal(true)} style={ghost}>⚙ Vorlage & Absender</button>
      </div>
      <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap' }}>
        {[['umsatz', '📊 Umsatz'], ['rechnungen', '🧾 Rechnungen'], ['import', '⬇️ Import']].map(([id, lbl]) => <button key={id} onClick={() => setTab(id)} style={tabBtn(tab === id)}>{lbl}</button>)}
        <div style={{ flex: 1 }} />
        {tab === 'umsatz' && <div style={{ display: 'flex', border: '1px solid ' + LINE, borderRadius: 9, overflow: 'hidden' }}><button onClick={() => setBrutto(false)} style={toggle(!brutto)}>Netto</button><button onClick={() => setBrutto(true)} style={toggle(brutto)}>Brutto</button></div>}
      </div>
      {!hasTable && <div style={{ background: '#fff7e6', border: '1px solid #f0d68a', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#7a5a10', marginBottom: 16 }}>⚠ Rechnungs-Tabellen/Spalten fehlen. Bitte das SQL in Supabase ausführen.</div>}

      {tab === 'umsatz' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 18 }}>
          <Kpi label="Dieser Monat" value={kpiMonth} sub={MONTHS[curM] + ' ' + curY} />
          <Kpi label="Dieses Jahr" value={kpiYear} sub={String(curY)} />
          <Kpi label="Gesamt" value={kpiAll} sub={years.length ? years[years.length - 1] + '–' + years[0] : '—'} />
          <Kpi label="Offen (brutto)" value={kpiOpen} sub="unbezahlt" accent />
          <Kpi label="Entwürfe" value={kpiDraft} sub={draftList.length + ' Stück · ohne Nr.'} />
        </div>
        <Card title="Umsatz pro Monat" right={<select value={year} onChange={e => setYear(+e.target.value)} style={selS}>{(years.length ? years : [curY]).map(y => <option key={y} value={y}>{y}</option>)}</select>}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, padding: '8px 0' }}>
            {monthVals.map((v, m) => { const isCur = year === curY && m === curM; return <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><div style={{ fontSize: 9, color: MUT }}>{v ? Math.round(v / 1000) + 'k' : ''}</div><div title={eur(v)} style={{ width: '100%', height: Math.max(2, (v / maxMonth) * 120), background: isCur ? 'repeating-linear-gradient(45deg,' + GOLD + ',' + GOLD + ' 4px,#d4ab5e 4px,#d4ab5e 8px)' : GOLD, borderRadius: '4px 4px 0 0', opacity: v ? 1 : .25 }} /><div style={{ fontSize: 10, fontWeight: isCur ? 800 : 500 }}>{MONTHS[m]}</div></div> })}
          </div>
        </Card>
        {years.length > 1 && <Card title="Mehrjahresvergleich">{years.slice().reverse().map(y => { const t = sum(inYear(y)); const mx = Math.max(1, ...years.map(yy => sum(inYear(yy)))); return <div key={y} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}><span style={{ width: 42, fontSize: 12, fontWeight: 700 }}>{y}</span><div style={{ flex: 1, background: '#f3eee2', borderRadius: 6, height: 16, overflow: 'hidden' }}><div style={{ width: (t / mx * 100) + '%', height: '100%', background: y === curY ? GOLD : '#cdb27e' }} /></div><span style={{ width: 110, textAlign: 'right', fontSize: 12, fontWeight: 700 }}>{eur(t)}</span></div> })}</Card>}
        <Card title={'Umsatz nach Kunde · ' + year}>{clientRows.length === 0 && <div style={{ color: MUT, fontSize: 13 }}>Keine Daten für {year}.</div>}{clientRows.map(([name, t]) => <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}><span style={{ width: 150, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span><div style={{ flex: 1, background: '#f3eee2', borderRadius: 6, height: 14, overflow: 'hidden' }}><div style={{ width: (t / maxClient * 100) + '%', height: '100%', background: GOLD }} /></div><span style={{ width: 100, textAlign: 'right', fontSize: 12, fontWeight: 700 }}>{eur(t)}</span></div>)}</Card>
      </>}

      {tab === 'rechnungen' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
            {statusSummary.map(({ s, count, sum: sm }) => { const st = STATUS[s]; return (
              <div key={s} onClick={() => setFStatus(fStatus === s ? 'all' : s)} style={{ background: fStatus === s ? st.bg : '#fff', border: '1px solid ' + (fStatus === s ? st.c : LINE), borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all .12s' }}>
                <div style={{ fontSize: 12, color: st.c, fontWeight: 600 }}>{st.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: DARK, marginTop: 2 }}>{count}</div>
                <div style={{ fontSize: 12, color: MUT }}>{eur(sm)}</div>
              </div>
            ) })}
          </div>

          <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 11, top: 9, color: MUT }}>🔍</span>
                <input value={fSearch} onChange={e => setFSearch(e.target.value)} placeholder="Name oder Rechnungsnummer suchen…" style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid ' + LINE, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: MUT }}>Zeitraum</span>
                <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} style={{ padding: '7px 10px', border: '1px solid ' + LINE, borderRadius: 8, fontSize: 13 }} />
                <span style={{ color: MUT }}>–</span>
                <input type="date" value={fTo} onChange={e => setFTo(e.target.value)} style={{ padding: '7px 10px', border: '1px solid ' + LINE, borderRadius: 8, fontSize: 13 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              {[['all', 'Alle'], ['draft', 'Entwurf'], ['open', 'Offen'], ['paid', 'Bezahlt'], ['overdue', 'Überfällig'], ['storno', 'Storniert']].map(([v, l]) => (
                <button key={v} onClick={() => setFStatus(v)} style={{ borderRadius: 20, padding: '5px 14px', fontSize: 13, cursor: 'pointer', border: '1px solid ' + (fStatus === v ? GOLD : LINE), background: fStatus === v ? GOLD : '#fff', color: fStatus === v ? '#fff' : (v === 'overdue' ? '#b3402f' : DARK), fontWeight: fStatus === v ? 600 : 400 }}>{l}</button>
              ))}
              {(fSearch || fFrom || fTo || fStatus !== 'all') && <button onClick={() => { setFSearch(''); setFFrom(''); setFTo(''); setFStatus('all') }} style={{ borderRadius: 20, padding: '5px 12px', fontSize: 13, cursor: 'pointer', border: '1px solid ' + LINE, background: '#fff', color: MUT }}>✕ Zurücksetzen</button>}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: MUT }}>{filteredInvoices.length} von {invoices.length} Rechnungen</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {selected.size > 0 && <button onClick={() => delInvoices([...selected])} disabled={busy} style={{ ...primary, background: '#b3402f' }}>🗑 {selected.size} löschen</button>}
              <button onClick={newInvoice} style={primary}>+ Neue Rechnung</button>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '34px 120px 100px 120px 1fr 120px 270px', gap: 8, padding: '11px 16px', background: '#faf8f4', fontSize: 11, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '.03em' }}>
              <div><input type="checkbox" checked={selected.size === filteredInvoices.length && filteredInvoices.length > 0} onChange={() => setSelected(s => s.size === filteredInvoices.length ? new Set() : new Set(filteredInvoices.map(i => i.id)))} style={{ width: 15, height: 15, accentColor: GOLD, cursor: 'pointer' }} /></div>
              <div style={{ textAlign: 'center' }}>Status</div><div>Datum</div><div>Nummer</div><div>Kunde</div><div style={{ textAlign: 'right' }}>Betrag</div><div style={{ textAlign: 'right' }}>Aktion</div>
            </div>
            {filteredInvoices.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: MUT }}>Keine Rechnungen gefunden.</div>}
            {filteredInvoices.map((i, idx) => { const st = STATUS[i.status] || STATUS.open; const sel = selected.has(i.id); const clickable = i.status === 'draft'; const mk = (i.invoice_date || '').slice(0, 7); const prevMk = idx > 0 ? (filteredInvoices[idx - 1].invoice_date || '').slice(0, 7) : null; const showHead = mk && mk !== prevMk; const agg = monthAgg[mk] || { count: 0, sum: 0 }; return (
              <Fragment key={i.id}>
              {showHead && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, padding: '12px 16px 7px', borderTop: '1px solid ' + LINE, background: '#faf8f4' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: DARK, textTransform: 'uppercase', letterSpacing: '.4px' }}>{monthLabel(mk)}</span>
                  <span style={{ fontSize: 11, color: MUT, whiteSpace: 'nowrap' }}>{agg.count} {agg.count === 1 ? 'Rechnung' : 'Rechnungen'} · {eur(agg.sum)}</span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '34px 120px 100px 120px 1fr 120px 270px', gap: 8, padding: '11px 16px', borderTop: '1px solid ' + LINE, alignItems: 'center', fontSize: 14, background: sel ? '#faf8f4' : 'transparent' }}>
                <div><input type="checkbox" checked={sel} onChange={() => toggleSel(i.id)} style={{ width: 15, height: 15, accentColor: GOLD, cursor: 'pointer' }} /></div>
                <div style={{ textAlign: 'center' }}><span style={{ fontSize: 11, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>{st.label}</span></div>
                <div style={{ color: MUT, fontSize: 13, whiteSpace: 'nowrap' }}>{i.invoice_date}</div>
                <div onClick={() => editInvoice(i)} style={{ fontWeight: 700, cursor: 'pointer', color: clickable ? GOLD : DARK, whiteSpace: 'nowrap' }} title={clickable ? 'Entwurf bearbeiten' : 'Rechnung öffnen'}>{i.invoice_number || '—'}</div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.client_name}</div>
                <div style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{eur(i.total_gross)}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => downloadPdf(i)} disabled={busy} style={mini}>PDF</button>
                  {i.status !== 'draft' && i.status !== 'storno' && <button onClick={() => openSend(i)} disabled={busy} style={{ ...mini, color: i.sent_at ? '#1d9e75' : DARK }} title={i.sent_at ? ('Gesendet an ' + (i.sent_to || '') + ' — erneut senden') : 'Per E-Mail senden'}>{i.sent_at ? '✉ ✓' : '✉ Mail'}</button>}
                  {i.status === 'draft' && <button onClick={() => editInvoice(i)} style={mini}>Bearb.</button>}
                  {i.status === 'overdue' && <button onClick={() => openReminder(i)} disabled={busy} style={{ ...mini, color: i.reminded_at ? '#1d9e75' : '#ba7517' }} title={i.reminded_at ? ('Erinnerung gesendet' + (i.reminded_at ? '' : '') + ' — erneut senden') : 'Freundliche Zahlungserinnerung senden'}>{i.reminded_at ? 'Erinnert ✓' : 'Erinnerung'}</button>}
                  {(i.status === 'open' || i.status === 'overdue') && <button onClick={() => openMahnung(i)} disabled={busy} style={{ ...mini, color: '#54545a' }}>Mahnung</button>}
                  {i.status !== 'draft' && i.status !== 'storno' && !i.storno_of && <button onClick={() => storno(i)} disabled={busy} style={{ ...mini, color: '#b3402f' }}>Storno</button>}
                  <button onClick={() => delInvoices([i.id])} disabled={busy} style={{ ...mini, color: '#b3402f' }}>🗑</button>
                </div>
              </div>
              </Fragment>
            ) })}
          </div>
        </>
      )}

      {tab === 'import' && <ImportTab clients={clients} myId={myId} seller={seller} onDone={reload} />}

      {settingsModal && <SettingsModal seller={seller} setSeller={setSeller} template={template} setTemplate={setTemplate} emailCfg={emailCfg} setEmailCfg={setEmailCfg} onClose={() => setSettingsModal(false)} onSave={saveSettings} />}
      {mahnModal && <MahnungModal m={mahnModal} setM={setMahnModal} busy={busy} onDownload={downloadMahnung} />}
      {sendModal && (
        <Modal onClose={() => !sendModal.sending && setSendModal(null)}>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{sendModal.kind === 'reminder' ? 'Zahlungserinnerung senden' : 'Rechnung per E-Mail senden'}</div>
          <div style={{ fontSize: 12, color: MUT, marginBottom: 14 }}>{sendModal.inv.invoice_number} · {sendModal.inv.client_name} · Absender: rechnung@immopixels.de</div>
          <label style={{ fontSize: 12, fontWeight: 700, color: MUT }}>Empfänger</label>
          <input value={sendModal.to} onChange={e => setSendModal({ ...sendModal, to: e.target.value })} placeholder="kunde@example.de" style={{ width: '100%', padding: '8px 10px', border: '1px solid ' + LINE, borderRadius: 8, fontSize: 13, marginTop: 3, marginBottom: 10 }} />
          <label style={{ fontSize: 12, fontWeight: 700, color: MUT }}>Betreff</label>
          <input value={sendModal.subject} onChange={e => setSendModal({ ...sendModal, subject: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid ' + LINE, borderRadius: 8, fontSize: 13, marginTop: 3, marginBottom: 10 }} />
          <label style={{ fontSize: 12, fontWeight: 700, color: MUT }}>Nachricht</label>
          <textarea value={sendModal.body} onChange={e => setSendModal({ ...sendModal, body: e.target.value })} rows={8} style={{ width: '100%', padding: '8px 10px', border: '1px solid ' + LINE, borderRadius: 8, fontSize: 13, marginTop: 3, marginBottom: 10, fontFamily: 'inherit', resize: 'vertical' }} />
          <div style={{ fontSize: 12, color: MUT, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ background: '#f4efe5', borderRadius: 6, padding: '3px 8px' }}>📎 Rechnung {sendModal.inv.invoice_number || 'Entwurf'}.pdf</span> wird automatisch angehängt</div>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16, cursor: 'pointer' }}><input type="checkbox" checked={sendModal.bccSelf} onChange={e => setSendModal({ ...sendModal, bccSelf: e.target.checked })} style={{ accentColor: GOLD }} /> Kopie an mich (BCC)</label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setSendModal(null)} disabled={sendModal.sending} style={ghost}>Abbrechen</button>
            <button onClick={doSend} disabled={sendModal.sending} style={primary}>{sendModal.sending ? 'Sende…' : '✉ Senden'}</button>
          </div>
        </Modal>
      )}
    </Shell>
  )
}

function InvoiceEditor({ ed, setEd, clients, seller, busy, buyerFromClient, onClose, onDraft, onFinalize }) {
  const isNew = !ed.id || ed.status === 'draft'
  const set = patch => setEd(p => ({ ...p, ...patch }))
  const setBuyer = patch => setEd(p => ({ ...p, buyer: { ...(p.buyer || {}), ...patch } }))
  const setItem = (i, patch) => setEd(p => ({ ...p, items: p.items.map((it, j) => j === i ? { ...it, ...patch } : it) }))
  const addItem = () => setEd(p => ({ ...p, items: [...p.items, { description: '', qty: 1, unit_price: '', discount: '', vat_rate: seller.kleinunternehmer ? 0 : 19 }] }))
  const delItem = i => setEd(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }))
  const onDate = v => set({ invoice_date: v, due_date: addDays(v, 14) })
  const onClient = v => { const c = clients.find(x => (x.short_name || x.name) === v || x.name === v); set({ client_name: v, client_id: c?.id || null, buyer: c ? buyerFromClient(c) : (ed.buyer || {}) }) }
  const nm = v => num(v)
  let net = 0, vat = 0; ed.items.forEach(it => { const ln = nm(it.qty) * nm(it.unit_price) * (1 - nm(it.discount) / 100); net += ln; vat += seller.kleinunternehmer ? 0 : ln * nm(it.vat_rate) / 100 })
  const b = ed.buyer || {}
  return (
    <Modal onClose={onClose} wide>
      <h2 style={{ margin: '0 0 14px', fontSize: 17 }}>{ed.id ? (ed.status === 'draft' ? 'Entwurf bearbeiten' : 'Rechnung') : 'Neue Rechnung'}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div><label style={LBL}>Kunde</label><input list="cl" value={ed.client_name} onChange={e => onClient(e.target.value)} style={inp} placeholder="Kunde…" /><datalist id="cl">{clients.map(c => <option key={c.id} value={c.short_name || c.name} />)}</datalist></div>
        <div><label style={LBL}>Datum</label><input type="date" value={ed.invoice_date} onChange={e => onDate(e.target.value)} style={inp} /></div>
        <div><label style={LBL}>Fällig (auto +14)</label><input type="date" value={ed.due_date || ''} onChange={e => set({ due_date: e.target.value })} style={inp} /></div>
      </div>
      {/* Kunde infóblokk */}
      <div style={{ background: '#fbf8f1', border: '1px solid ' + LINE, borderRadius: 9, padding: 10, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><label style={LBL}>Firmenname</label><input value={b.company || ''} onChange={e => setBuyer({ company: e.target.value })} style={inp} /></div>
          <div><label style={LBL}>Ansprechpartner</label><input value={b.contact || ''} onChange={e => setBuyer({ contact: e.target.value })} style={inp} /></div>
          <div style={{ gridColumn: '1/-1' }}><label style={LBL}>Adresse</label><input value={b.address || ''} onChange={e => setBuyer({ address: e.target.value })} style={inp} placeholder="Straße, PLZ Ort" /></div>
          <div><label style={LBL}>Telefon</label><input value={b.phone || ''} onChange={e => setBuyer({ phone: e.target.value })} style={inp} /></div>
          <div><label style={LBL}>E-Mail</label><input value={b.email || ''} onChange={e => setBuyer({ email: e.target.value })} style={inp} /></div>
          <div><label style={LBL}>Kundennummer</label><input value={b.kundennr || ''} onChange={e => setBuyer({ kundennr: e.target.value })} style={inp} placeholder="KD…" /></div>
        </div>
      </div>
      <label style={LBL}>Positionen</label>
      {ed.items.map((it, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 52px 80px 56px 64px 26px', gap: 6, marginBottom: 6, alignItems: 'start' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: MUT, paddingTop: 8, textAlign: 'center' }}>{i + 1}</div>
          <textarea value={it.description} onChange={e => setItem(i, { description: e.target.value })} placeholder="Zeile 1: Datum - Kunde - Adresse&#10;Zeile 2: Leistung" rows={2} style={{ ...inp, resize: 'vertical', fontFamily: 'Arial' }} />
          <input value={it.qty} onChange={e => setItem(i, { qty: e.target.value })} placeholder="Anz." style={{ ...inp, textAlign: 'right' }} />
          <input value={it.unit_price} onChange={e => setItem(i, { unit_price: e.target.value })} placeholder="Preis €" style={{ ...inp, textAlign: 'right' }} />
          <input value={it.discount} onChange={e => setItem(i, { discount: e.target.value })} placeholder="Rab.%" style={{ ...inp, textAlign: 'right' }} />
          <select value={it.vat_rate} onChange={e => setItem(i, { vat_rate: e.target.value })} disabled={seller.kleinunternehmer} style={inp}><option value="19">19%</option><option value="7">7%</option><option value="0">0%</option></select>
          <button onClick={() => delItem(i)} style={{ ...mini, color: '#b3402f', marginTop: 4 }}>✕</button>
        </div>
      ))}
      <button onClick={addItem} style={{ ...ghost, marginTop: 2 }}>+ Position</button>
      <div style={{ marginTop: 12 }}><label style={LBL}>Notiz</label><input value={ed.notes || ''} onChange={e => set({ notes: e.target.value })} style={inp} placeholder="optional" /></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 18, marginTop: 14, fontSize: 13 }}>
        <span style={{ color: MUT }}>Netto: <b style={{ color: DARK }}>{eur(net)}</b></span>
        <span style={{ color: MUT }}>MwSt: <b style={{ color: DARK }}>{eur(vat)}</b></span>
        <span style={{ color: MUT }}>Gesamt: <b style={{ color: GOLD }}>{eur(net + vat)}</b></span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
        <button onClick={onClose} style={ghost}>Abbrechen</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {isNew && <button onClick={onDraft} disabled={busy} style={ghost}>Als Entwurf speichern</button>}
          {isNew && <button onClick={() => { if (confirm('Festschreiben? Danach unveränderlich + fortlaufende Nummer.')) onFinalize() }} disabled={busy} style={primary}>{busy ? '…' : 'Festschreiben & Nr. vergeben'}</button>}
        </div>
      </div>
    </Modal>
  )
}

function SettingsModal({ seller, setSeller, template, setTemplate, emailCfg, setEmailCfg, onClose, onSave }) {
  const [t, setT] = useState('absender')
  const ss = patch => setSeller(p => ({ ...p, ...patch }))
  const st = patch => setTemplate(p => ({ ...p, ...patch }))
  const ec = patch => setEmailCfg(p => ({ ...p, ...patch }))
  const sf = (k, lbl, ph) => <div><label style={LBL}>{lbl}</label><input value={seller[k] || ''} onChange={e => ss({ [k]: e.target.value })} style={inp} placeholder={ph} /></div>
  const tf = (k, lbl, ph) => <div><label style={LBL}>{lbl}</label><input value={template[k] || ''} onChange={e => st({ [k]: e.target.value })} style={inp} placeholder={ph} /></div>
  const links = template.footerLinks || []
  return (
    <Modal onClose={onClose} wide>
      <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Vorlage & Absender</h2>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button onClick={() => setT('absender')} style={tabBtn(t === 'absender')}>Absender</button>
        <button onClick={() => setT('vorlage')} style={tabBtn(t === 'vorlage')}>Vorlage / Werbung</button>
        <button onClick={() => setT('email')} style={tabBtn(t === 'email')}>E-Mail / Versand</button>
      </div>
      {t === 'absender' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1/-1' }}>{sf('name', 'Firmenname', 'ImmoPixels e.K.')}</div>
            <div style={{ gridColumn: '1/-1' }}>{sf('street', 'Straße & Nr.')}</div>
            {sf('zip', 'PLZ')}{sf('city', 'Stadt')}
            {sf('vatId', 'USt-IdNr.')}{sf('taxNo', 'Steuernummer')}
            {sf('phone', 'Telefon')}{sf('email', 'E-Mail')}
            {sf('web', 'Web')}{sf('bank', 'Bank')}
            {sf('iban', 'IBAN')}{sf('bic', 'BIC')}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={!!seller.kleinunternehmer} onChange={e => ss({ kleinunternehmer: e.target.checked })} />Kleinunternehmer (§ 19 UStG)</label>
        </>
      )}
      {t === 'vorlage' && (
        <>
          {tf('logoUrl', 'Logo-URL (PNG/JPG)', 'https://…/logo.png')}
          <div style={{ marginTop: 10 }}>{tf('intro', 'Einleitungstext')}</div>
          <div style={{ marginTop: 10 }}>{tf('closing', 'Schlusstext')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            {tf('reviewText', 'Bewertungstext')}{tf('reviewUrl', 'Bewertungs-Link')}
            {tf('bookingUrl', 'Buchungs-Link')}{tf('qrUrl', 'QR-Code Ziel-URL')}
            {tf('startAddress', 'Fahrtkosten: Startadresse')}{tf('kmRate', 'Fahrtkosten: € / km')}
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={LBL}>Werbe-Links (Rechnungsende)</label>
            {links.map((l, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 26px', gap: 6, marginBottom: 6 }}>
                <input value={l.label || ''} onChange={e => st({ footerLinks: links.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} placeholder="Text" style={inp} />
                <input value={l.url || ''} onChange={e => st({ footerLinks: links.map((x, j) => j === i ? { ...x, url: e.target.value } : x) })} placeholder="https://…" style={inp} />
                <button onClick={() => st({ footerLinks: links.filter((_, j) => j !== i) })} style={{ ...mini, color: '#b3402f' }}>✕</button>
              </div>
            ))}
            <button onClick={() => st({ footerLinks: [...links, { label: '', url: '' }] })} style={ghost}>+ Link</button>
          </div>
          <div style={{ fontSize: 11, color: MUT, marginTop: 10 }}>Die QR-Code Ziel-URL wird automatisch als QR-Code am Rechnungsende eingebettet (Werbefläche).</div>
        </>
      )}
      {t === 'email' && (
        <>
          <div style={{ fontSize: 12, color: MUT, marginBottom: 12, lineHeight: 1.6 }}>SMTP-Zugang deines Postfachs (Alfahosting). Server findest du im Alfahosting-Kundencenter → Tarifübersicht → Server-Info (z.&nbsp;B. alfa30XX.alfahosting-server.de). Diese Angaben werden im CRM gespeichert.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div><label style={LBL}>SMTP-Server (Host)</label><input value={emailCfg.host || ''} onChange={e => ec({ host: e.target.value })} placeholder="alfa30XX.alfahosting-server.de" style={inp} /></div>
            <div><label style={LBL}>Port</label><input value={emailCfg.port || 465} onChange={e => ec({ port: Number(e.target.value) || 465 })} placeholder="465" style={inp} /></div>
            <div><label style={LBL}>Benutzer (E-Mail)</label><input value={emailCfg.user || ''} onChange={e => ec({ user: e.target.value })} placeholder="rechnung@immopixels.de" style={inp} /></div>
            <div><label style={LBL}>Passwort</label><input type="password" value={emailCfg.pass || ''} onChange={e => ec({ pass: e.target.value })} placeholder="Postfach-Passwort" style={inp} /></div>
            <div><label style={LBL}>Absendername</label><input value={emailCfg.fromName || ''} onChange={e => ec({ fromName: e.target.value })} placeholder="ImmoPixels" style={inp} /></div>
            <div><label style={LBL}>Kopie an (BCC)</label><input value={emailCfg.bcc || ''} onChange={e => ec({ bcc: e.target.value })} placeholder="rechnung@immopixels.de" style={inp} /></div>
          </div>
          <div style={{ marginTop: 12 }}><label style={LBL}>Betreff-Vorlage</label><input value={emailCfg.subject || ''} onChange={e => ec({ subject: e.target.value })} placeholder="Rechnung {nr} – {firma}" style={inp} /></div>
          <div style={{ marginTop: 10 }}><label style={LBL}>Nachricht-Vorlage</label><textarea value={emailCfg.body || ''} onChange={e => ec({ body: e.target.value })} rows={4} style={{ ...inp, fontFamily: 'inherit', resize: 'vertical' }} /></div>
          <div style={{ marginTop: 10 }}><label style={LBL}>Signatur / Footer</label><textarea value={emailCfg.signature || ''} onChange={e => ec({ signature: e.target.value })} rows={4} style={{ ...inp, fontFamily: 'inherit', resize: 'vertical' }} /></div>
          <div style={{ borderTop: '1px solid ' + LINE, margin: '14px 0 10px', paddingTop: 10, fontSize: 12, fontWeight: 800, color: '#9a6a1a' }}>Zahlungserinnerung (vor der Mahnung)</div>
          <div><label style={LBL}>Betreff-Vorlage (Erinnerung)</label><input value={emailCfg.reminderSubject || ''} onChange={e => ec({ reminderSubject: e.target.value })} placeholder="Zahlungserinnerung zur Rechnung {nr}" style={inp} /></div>
          <div style={{ marginTop: 10 }}><label style={LBL}>Nachricht-Vorlage (Erinnerung)</label><textarea value={emailCfg.reminderBody || ''} onChange={e => ec({ reminderBody: e.target.value })} rows={5} style={{ ...inp, fontFamily: 'inherit', resize: 'vertical' }} /></div>
          <div style={{ fontSize: 11, color: MUT, marginTop: 8 }}>Platzhalter: <b>{'{nr}'}</b> Rechnungsnummer · <b>{'{firma}'}</b> Firmenname · <b>{'{kunde}'}</b> Kundenname · <b>{'{betrag}'}</b> Bruttobetrag · <b>{'{faellig}'}</b> Fälligkeitsdatum · <b>{'{datum}'}</b> Rechnungsdatum. Die Signatur wird unter die Nachricht gesetzt.</div>
          <div style={{ fontSize: 11, color: '#9a6a1a', background: '#faf0dd', borderRadius: 8, padding: '8px 11px', marginTop: 10 }}>Hinweis: Das Passwort wird in den CRM-Einstellungen gespeichert. Wenn du das lieber vermeidest, lass das Feld leer und hinterlege SMTP_PASS (und ggf. Host/User) als Environment-Variable in Vercel.</div>
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button onClick={onClose} style={ghost}>Abbrechen</button>
        <button onClick={onSave} style={primary}>Speichern</button>
      </div>
    </Modal>
  )
}

function ImportTab({ clients, myId, seller, onDone }) {
  const [rows, setRows] = useState(null); const [head, setHead] = useState([]); const [map, setMap] = useState({}); const [busy, setBusy] = useState(false); const [done, setDone] = useState(null)
  const [bz, setBz] = useState(false); const [bdone, setBdone] = useState(null)
  const [iz, setIz] = useState(false); const [idone, setIdone] = useState(null)
  const [blist, setBlist] = useState(null); const [bsel, setBsel] = useState(new Set())
  const YEAR = new Date().getFullYear()
  async function loadBillomat() {
    setIz(true); setIdone(null)
    try {
      const r = await fetch('/api/billomat/invoices/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'list', staff_id: myId, year: YEAR }) })
      const j = await r.json()
      if (!j.ok) { alert('Laden fehlgeschlagen:\n' + (j.error || j.detail || JSON.stringify(j))); setIz(false); return }
      setBlist(j.invoices || [])
      setBsel(new Set((j.invoices || []).filter(x => !x.imported).map(x => x.billomat_id)))
      if (!(j.invoices || []).length) alert('Billomat hat 0 Rechnungen für ' + YEAR + ' geliefert.')
    } catch (e) { alert('Laden-Fehler: ' + (e.message || e)) }
    setIz(false)
  }
  function toggleSelOne(id) { setBsel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  async function importSelected() {
    const ids = blist.filter(x => bsel.has(x.billomat_id) && !x.imported).map(x => x.billomat_id)
    if (!ids.length) { alert('Nichts ausgewählt.'); return }
    if (!confirm(ids.length + ' Rechnung(en) aus ' + YEAR + ' importieren? Rechnungsnummern bleiben erhalten.')) return
    setIz(true); setIdone(null)
    try {
      const r = await fetch('/api/billomat/invoices/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff_id: myId, year: YEAR, ids, seller }) })
      const j = await r.json()
      if (!j.ok) { alert('Import-Fehler:\n' + (j.error || j.detail || JSON.stringify(j))); setIz(false); return }
      setIdone(j); onDone && onDone()
      let msg = `Ergebnis: ${j.imported} importiert · ${j.skipped} übersprungen · ${j.failed || 0} Fehler.`
      if (j.errors && j.errors.length) msg += '\n\nFehler:\n• ' + j.errors.join('\n• ')
      if (!j.imported && !j.skipped) msg += '\n\n⚠️ Es wurde NICHTS geschrieben — meist: Migration (paid_at / billomat_id) fehlt ODER SUPABASE_SERVICE_ROLE_KEY in Vercel ist nicht der echte service_role-Key (RLS blockt).'
      alert(msg)
      await loadBillomat()
    } catch (e) { alert('Import-Fehler: ' + (e.message || e)) }
    setIz(false)
  }
  async function billomatImport() {
    if (!confirm('Kunden aus Billomat per API importieren (inkl. Kundennummer)?')) return
    setBz(true); setBdone(null)
    try {
      const r = await fetch('/api/billomat/clients'); const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'API-Fehler')
      let created = 0, updated = 0, failed = 0
      for (const b of j.clients) {
        if (!b.name) continue
        const addr = [b.street, [b.zip, b.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
        const row = { name: b.name, addr: addr || null, email: b.email || null, tel: b.phone || null, contact_firstname: b.first_name || null, contact_lastname: b.last_name || null, kundennr: b.kundennr || null, billomat_client_id: b.billomat_id || null }
        let ex = null
        if (b.billomat_id) { const { data } = await supabase.from('clients').select('id').eq('billomat_client_id', b.billomat_id).maybeSingle(); ex = data }
        if (!ex) { const { data } = await supabase.from('clients').select('id').ilike('name', b.name).maybeSingle(); ex = data }
        if (ex) { const { error } = await supabase.from('clients').update(row).eq('id', ex.id); error ? failed++ : updated++ }
        else { const { error } = await supabase.from('clients').insert(row); error ? failed++ : created++ }
      }
      setBdone({ total: j.clients.length, created, updated, failed })
      onDone && onDone()
      if (failed && (created + updated) === 0) alert('Alle fehlgeschlagen — fehlt evtl. die Spalte „kundennr"/"billomat_client_id" in der Tabelle clients (SQL ausführen).')
    } catch (e) { alert('Billomat-Import-Fehler: ' + (e.message || e)) }
    setBz(false)
  }
  function parseCSV(text) { const fl = text.split('\n')[0]; const delim = (fl.split(';').length > fl.split(',').length) ? ';' : ','; const out = []; let row = [], cur = '', q = false; for (let i = 0; i < text.length; i++) { const ch = text[i]; if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += ch } else { if (ch === '"') q = true; else if (ch === delim) { row.push(cur); cur = '' } else if (ch === '\n') { row.push(cur); out.push(row); row = []; cur = '' } else if (ch !== '\r') cur += ch } } if (cur || row.length) { row.push(cur); out.push(row) } return out.filter(r => r.some(c => (c || '').trim() !== '')) }
  function guess(h) { const find = ks => h.findIndex(x => ks.some(k => x.toLowerCase().includes(k))); return { number: find(['nummer', 'rechnungsnr', 'invoice', 'beleg']), date: find(['datum', 'date']), client: find(['kunde', 'name', 'firma', 'client']), net: find(['netto', 'net']), gross: find(['brutto', 'gesamt', 'total', 'gross']), status: find(['status', 'bezahlt', 'paid']) } }
  function onFile(e) { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const all = parseCSV(String(r.result)); if (all.length < 2) { alert('Leere CSV'); return } setHead(all[0]); setRows(all.slice(1)); setMap(guess(all[0])) }; r.readAsText(f, 'utf-8') }
  const norm = s => (s || '').trim().toLowerCase()
  const existsClient = name => clients.find(c => norm(c.short_name) === norm(name) || norm(c.name) === norm(name))
  function statusOf(v) { const s = norm(v); if (s.includes('storn')) return 'storno'; if (s.includes('bezahlt') || s.includes('paid') || s === 'ja' || s === '1') return 'paid'; if (s.includes('überf') || s.includes('overdue')) return 'overdue'; return 'open' }
  function mapDate(v) { const s = (v || '').trim(); let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/); if (m) return m[3] + '-' + m[2] + '-' + m[1]; m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0].slice(0, 10); return new Date().toISOString().slice(0, 10) }
  async function doImport() { if (map.client < 0) { alert('Kunden-Spalte zuordnen.'); return } setBusy(true); let created = 0, imported = 0, skipped = 0; try { const cache = {}; for (const r of rows) { const name = (r[map.client] || '').trim(); if (!name) { skipped++; continue } let cid = existsClient(name)?.id || cache[norm(name)]; if (!cid) { const { data: nc } = await supabase.from('clients').insert({ name }).select('id').single(); if (nc) { cid = nc.id; cache[norm(name)] = cid; created++ } } const numv = map.number >= 0 ? (r[map.number] || '').trim() : null; if (numv) { const { data: ex } = await supabase.from('invoices').select('id').eq('invoice_number', numv).maybeSingle(); if (ex) { skipped++; continue } } const gross = map.gross >= 0 ? num(r[map.gross]) : 0; const net = map.net >= 0 ? num(r[map.net]) : round2(gross / 1.19); const { error } = await supabase.from('invoices').insert({ invoice_number: numv, client_id: cid, client_name: name, invoice_date: map.date >= 0 ? mapDate(r[map.date]) : new Date().toISOString().slice(0, 10), status: map.status >= 0 ? statusOf(r[map.status]) : 'paid', total_net: net, vat_amount: round2(gross - net), total_gross: gross, seller, buyer: { company: name }, created_by: myId, finalized_at: new Date().toISOString(), notes: 'Import (Billomat)' }); if (!error) imported++; else skipped++ } setDone({ created, imported, skipped }); setRows(null); onDone && onDone() } catch (e) { alert('Import-Fehler: ' + (e.message || e)) } setBusy(false) }
  return (
    <Card title="Kunden & Rechnungen importieren">
      <div style={{ border: '1.5px solid ' + GOLD, background: '#fdfaf3', borderRadius: 10, padding: 14, marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>① Kunden aus Billomat (API) — empfohlen</div>
        <div style={{ fontSize: 12, color: MUT, marginBottom: 10, lineHeight: 1.6 }}>Holt alle Kunden direkt aus Billomat — <b>inkl. Kundennummer</b>, Adresse, E-Mail, Telefon. Bestehende werden aktualisiert, fehlende neu angelegt. Kein CSV nötig.</div>
        {bdone && <div style={{ background: '#e6f3ec', border: '1px solid #b6dcc4', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#2f7a4f', marginBottom: 10 }}>✓ {bdone.total} Kunden: {bdone.created} neu, {bdone.updated} aktualisiert{bdone.failed ? ', ' + bdone.failed + ' Fehler' : ''}.</div>}
        <button onClick={billomatImport} disabled={bz} style={primary}>{bz ? 'Importiere…' : '⬇ Aus Billomat importieren (API)'}</button>
      </div>
      <div style={{ border: '1.5px solid ' + GOLD, background: '#fdfaf3', borderRadius: 10, padding: 14, marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>② Rechnungen aus Billomat (API) — {YEAR}</div>
        <div style={{ fontSize: 12, color: MUT, marginBottom: 10, lineHeight: 1.6 }}>Lädt die Rechnungen des Jahres aus Billomat zur <b>Auswahl</b> — du entscheidest, welche importiert werden (bezahlte & Entwürfe, inkl. Positionen). <b>Rechnungsnummern bleiben erhalten</b>. Bereits importierte sind markiert und werden übersprungen.</div>
        {idone && <div style={{ background: '#e6f3ec', border: '1px solid #b6dcc4', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#2f7a4f', marginBottom: 10 }}>✓ {idone.imported} importiert · {idone.skipped} übersprungen{idone.failed ? ' · ' + idone.failed + ' Fehler' : ''}{idone.byStatus ? ' (' + Object.entries(idone.byStatus).map(([k, v]) => v + '× ' + k).join(', ') + ')' : ''}.{idone.errors && idone.errors.length ? ' — ' + idone.errors.join(' | ') : ''}</div>}
        {!blist && <button onClick={loadBillomat} disabled={iz} style={primary}>{iz ? 'Lädt…' : '⬇ Billomat-Rechnungen laden (' + YEAR + ')'}</button>}
        {!blist && <button onClick={async () => { try { const r = await fetch('/api/_diag'); const j = await r.json(); alert('Diagnose:\n\n• service_role-Key Rolle: ' + (j.key_role || '?') + (j.key_role === 'service_role' ? ' ✓' : ' ✗ (sollte service_role sein!)') + '\n• Projekt-Ref passt: ' + (j.ref_match === true ? 'ja ✓' : j.ref_match === false ? 'NEIN ✗ (Key gehört zu anderem Projekt!)' : '?') + '\n• Schreibtest (invoices): ' + (j.write_test?.ok ? 'OK ✓' : 'FEHLER ✗ — ' + (j.write_test?.error || '') )) } catch (e) { alert('Diagnose-Fehler: ' + e.message) } }} style={{ ...ghostBtn, marginLeft: 8 }}>🔧 Diagnose</button>}
        {blist && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <button onClick={() => setBsel(new Set(blist.filter(x => !x.imported).map(x => x.billomat_id)))} style={{ ...ghostBtn }}>Alle</button>
              <button onClick={() => setBsel(new Set())} style={{ ...ghostBtn }}>Keine</button>
              {['draft', 'open', 'overdue', 'paid'].map(st => <button key={st} onClick={() => setBsel(s => { const n = new Set(s); blist.filter(x => !x.imported && x.status === st).forEach(x => n.add(x.billomat_id)); return n })} style={{ ...ghostBtn }}>+ {st}</button>)}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: MUT }}>{blist.length} gefunden · {bsel.size} gewählt</span>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid ' + LINE, borderRadius: 8, background: '#fff' }}>
              {blist.map((x, i) => {
                const st = STATUS[x.status] || STATUS.open
                return (
                  <label key={x.billomat_id} style={{ display: 'grid', gridTemplateColumns: '26px 96px 86px 1fr 90px 96px', gap: 8, alignItems: 'center', padding: '7px 10px', borderTop: i ? '1px solid #f1ead9' : 'none', fontSize: 13, opacity: x.imported ? .5 : 1, cursor: x.imported ? 'default' : 'pointer' }}>
                    <input type="checkbox" disabled={x.imported} checked={x.imported || bsel.has(x.billomat_id)} onChange={() => toggleSelOne(x.billomat_id)} style={{ width: 15, height: 15, accentColor: GOLD }} />
                    <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{x.number || '—'}</span>
                    <span style={{ color: MUT }}>{x.date || '—'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.client}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: st.c, background: st.bg, borderRadius: 20, padding: '2px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>{st.label}</span>
                    <span style={{ textAlign: 'right', fontWeight: 700 }}>{eur(x.gross)}{x.imported ? ' ✓' : ''}</span>
                  </label>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={importSelected} disabled={iz || bsel.size === 0} style={primary}>{iz ? 'Importiere…' : 'Ausgewählte importieren (' + bsel.size + ')'}</button>
              <button onClick={() => { setBlist(null); setBsel(new Set()) }} style={ghostBtn}>Schließen</button>
            </div>
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>③ Rechnungen aus Billomat (CSV, einmalig)</div>
      <div style={{ fontSize: 13, color: MUT, marginBottom: 12, lineHeight: 1.6 }}>Rechnungen aus Billomat als CSV exportieren und hochladen. Bestehende Kunden = <b style={{ color: '#2f7a4f' }}>✓ vorhanden</b>, nur fehlende neu. Bereits importierte Nummern werden übersprungen.</div>
      {done && <div style={{ background: '#e6f3ec', border: '1px solid #b6dcc4', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#2f7a4f', marginBottom: 12 }}>✓ Fertig: {done.imported} Rechnungen, {done.created} neue Kunden, {done.skipped} übersprungen.</div>}
      <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ fontSize: 13, marginBottom: 14 }} />
      {rows && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 14 }}>{[['number', 'Rechnungsnr.'], ['date', 'Datum'], ['client', 'Kunde *'], ['net', 'Netto'], ['gross', 'Brutto'], ['status', 'Status']].map(([k, lbl]) => <div key={k}><label style={LBL}>{lbl}</label><select value={map[k] ?? -1} onChange={e => setMap(m => ({ ...m, [k]: +e.target.value }))} style={inp}><option value={-1}>— ignorieren —</option>{head.map((h, i) => <option key={i} value={i}>{h || ('Spalte ' + (i + 1))}</option>)}</select></div>)}</div>
        <div style={{ fontSize: 12, color: MUT, marginBottom: 8 }}>{rows.length} Zeilen. Vorschau:</div>
        <div style={{ overflowX: 'auto', marginBottom: 12 }}><table style={{ fontSize: 11, borderCollapse: 'collapse', width: '100%' }}><thead><tr style={{ color: MUT, textAlign: 'left' }}>{['Nr.', 'Datum', 'Kunde', 'Brutto', ''].map((h, i) => <th key={i} style={{ padding: '4px 6px', borderBottom: '1px solid ' + LINE }}>{h}</th>)}</tr></thead><tbody>{rows.slice(0, 4).map((r, i) => { const nm2 = (r[map.client] || '').trim(); const ex = existsClient(nm2); return <tr key={i}><td style={td}>{map.number >= 0 ? r[map.number] : '—'}</td><td style={td}>{map.date >= 0 ? r[map.date] : '—'}</td><td style={td}>{nm2}</td><td style={td}>{map.gross >= 0 ? r[map.gross] : '—'}</td><td style={td}>{ex ? <span style={{ color: '#2f7a4f' }}>✓ vorhanden</span> : <span style={{ color: GOLD }}>neu</span>}</td></tr> })}</tbody></table></div>
        <button onClick={doImport} disabled={busy} style={primary}>{busy ? 'Importiere…' : 'Import starten (' + rows.length + ')'}</button>
      </>}
    </Card>
  )
}

function Shell({ children }) {
  return <RechnungShell active="ausgang">{children}</RechnungShell>
}
function Kpi({ label, value, sub, accent }) { return <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: '14px 16px' }}><div style={{ fontSize: 11, color: MUT, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div><div style={{ fontSize: 22, fontWeight: 800, color: accent ? '#54545a' : DARK, marginTop: 4 }}>{eur(value)}</div><div style={{ fontSize: 11, color: MUT, marginTop: 2 }}>{sub}</div></div> }
function Card({ title, right, children }) { return <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 14, padding: 16, marginBottom: 16 }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}><div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>{right}</div>{children}</div> }
function Modal({ children, onClose, wide }) { return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', zIndex: 100, overflowY: 'auto' }}><div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 20, width: '100%', maxWidth: wide ? 660 : 460, fontFamily: 'Arial' }}>{children}</div></div> }

function MahnungModal({ m, setM, busy, onDownload }) {
  const { inv } = m
  function regen(stufe, gebuehr, frist) {
    setM({ ...m, stufe, gebuehr, frist, text: defaultMahnungText({ inv, stufe, gebuehr, frist }) })
  }
  return (
    <Modal onClose={() => setM(null)} wide>
      <div style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 4 }}>Mahnung / Zahlungserinnerung</div>
      <div style={{ fontSize: 12, color: MUT, marginBottom: 16 }}>Rechnung {inv.invoice_number} · {inv.client_name} · offen: {eur(inv.total_gross)}</div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={LBL}>Stufe</label>
          <select value={m.stufe} onChange={e => regen(Number(e.target.value), m.gebuehr, m.frist)} style={inp}>
            <option value={1}>Zahlungserinnerung (freundlich)</option>
            <option value={2}>1. Mahnung</option>
            <option value={3}>2. Mahnung</option>
          </select>
        </div>
        <div style={{ width: 130 }}>
          <label style={LBL}>Mahngebühr (€)</label>
          <input type="number" step="0.5" min="0" value={m.gebuehr} onChange={e => regen(m.stufe, e.target.value === '' ? 0 : Number(e.target.value), m.frist)} style={inp} />
        </div>
        <div style={{ width: 130 }}>
          <label style={LBL}>Frist</label>
          <input type="text" value={m.frist} onChange={e => regen(m.stufe, m.gebuehr, e.target.value)} style={inp} />
        </div>
      </div>
      <label style={LBL}>Text (frei bearbeitbar)</label>
      <textarea value={m.text} onChange={e => setM({ ...m, text: e.target.value })} style={{ ...inp, minHeight: 220, lineHeight: 1.5, fontFamily: 'Arial', resize: 'vertical' }} />
      <div style={{ fontSize: 11, color: MUT, marginTop: 6 }}>Tipp: Stufe oder Gebühr ändern setzt den Text neu auf die Vorlage. Eigene Änderungen danach bleiben erhalten, bis du wieder Stufe/Gebühr wechselst.</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={() => setM(null)} style={ghost}>Abbrechen</button>
        <button onClick={onDownload} disabled={busy} style={primary}>{busy ? '…' : 'Mahnung als PDF'}</button>
      </div>
    </Modal>
  )
}
const tabBtn = a => ({ padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (a ? GOLD : LINE), background: a ? GOLD : '#fff', color: a ? '#fff' : MUT })
const toggle = a => ({ padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: a ? GOLD : '#fff', color: a ? '#fff' : MUT })
const selS = { border: '1px solid ' + LINE, borderRadius: 7, padding: '5px 8px', fontSize: 12, background: '#fff', color: DARK, fontWeight: 700 }
const primary = { background: GOLD, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const ghostBtn = { background: '#fff', border: '1px solid ' + LINE, borderRadius: 8, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: DARK }
const ghost = { background: '#fff', color: DARK, border: '1px solid ' + LINE, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const mini = { background: 'none', border: '1px solid ' + LINE, borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: DARK, marginLeft: 4 }
const inp = { width: '100%', border: '1.5px solid ' + LINE, borderRadius: 7, padding: '7px 9px', fontSize: 12, color: DARK, fontFamily: 'Arial', outline: 'none', boxSizing: 'border-box' }
const LBL = { fontSize: 10, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4, display: 'block' }
const td = { padding: '4px 6px', borderBottom: '0.5px solid ' + LINE, whiteSpace: 'nowrap' }
