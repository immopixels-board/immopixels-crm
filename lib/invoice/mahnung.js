import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const eur = v => (Number(v) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
function fmtDate(d) { if (!d) return ''; const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}.${m[2]}.${m[1]}` : d }
async function fetchImgBytes(url) { try { const r = await fetch(url); if (!r.ok) return null; const b = await r.arrayBuffer(); return new Uint8Array(b) } catch { return null } }

// Alapértelmezett Mahnung-sablon (kézzel szerkeszthető a modalban)
export function defaultMahnungText({ inv, stufe = 1, gebuehr = 5, frist }) {
  const nr = inv.invoice_number || ''
  const datum = fmtDate(inv.invoice_date)
  const betrag = eur(inv.total_gross)
  const titel = stufe === 1 ? 'Zahlungserinnerung' : (stufe === 2 ? '1. Mahnung' : (stufe + '. Mahnung'))
  const ton = stufe === 1
    ? 'sicher haben Sie es nur übersehen. Unsere Rechnung ' + nr + ' vom ' + datum + ' über ' + betrag + ' ist bisher noch nicht beglichen.'
    : 'trotz unserer bisherigen Erinnerung ist die Rechnung ' + nr + ' vom ' + datum + ' über ' + betrag + ' weiterhin offen.'
  const geb = (Number(gebuehr) || 0) > 0
    ? '\n\nFür diese ' + titel.toLowerCase() + ' berechnen wir eine Mahngebühr von ' + eur(gebuehr) + '.'
    : ''
  return 'Betreff: ' + titel + ' zur Rechnung ' + nr + '\n\n'
    + 'Sehr geehrte Damen und Herren,\n\n'
    + ton + geb + '\n\n'
    + 'Wir bitten Sie, den offenen Betrag bis zum ' + (frist || '____') + ' auf unser unten genanntes Konto zu überweisen.\n\n'
    + 'Sollten Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben als gegenstandslos.\n\n'
    + 'Mit freundlichen Grüßen'
}

export async function generateMahnungPdf({ inv, seller, template = {}, text, gebuehr = 5, stufe = 1 }) {
  const pdf = await PDFDocument.create()
  const F = await pdf.embedFont(StandardFonts.Helvetica)
  const B = await pdf.embedFont(StandardFonts.HelveticaBold)
  const gold = rgb(0.72, 0.54, 0.16), dark = rgb(0.17, 0.16, 0.14), mut = rgb(0.54, 0.51, 0.47), hair = rgb(0.9, 0.88, 0.84)
  const PW = 595.28, PH = 841.89, L = 42, R = PW - 42
  const b = inv.buyer || {}
  const page = pdf.addPage([PW, PH])
  let y = PH - 46

  const T = (t, x, yy, s = 9, f = F, c = dark) => page.drawText(String(t ?? ''), { x, y: yy, size: s, font: f, color: c })
  const RT = (t, xr, yy, s = 9, f = F, c = dark) => page.drawText(String(t ?? ''), { x: xr - f.widthOfTextAtSize(String(t ?? ''), s), y: yy, size: s, font: f, color: c })

  // logó
  let logoImg = null
  { const by = await fetchImgBytes(template.logoUrl || '/ip-logo.png'); if (by) { try { logoImg = await pdf.embedPng(by) } catch { try { logoImg = await pdf.embedJpg(by) } catch {} } } }
  if (logoImg) { const lw = 132, lh = lw * logoImg.height / logoImg.width; page.drawImage(logoImg, { x: L, y: y - lh + 8, width: lw, height: lh }); y -= (lh + 6) } else { y -= 6 }
  T(seller.name + ' | ' + seller.street + ' | ' + seller.zip + ' ' + seller.city, L, y, 7, F, mut); y -= 22

  // címzett
  T(b.company || inv.client_name || '', L, y, 11, B, dark); y -= 13
  if (b.contact) { T(b.contact, L, y, 9, F, dark); y -= 12 }
  ;(b.address || '').split(',').map(s => s.trim()).filter(Boolean).forEach(line => { T(line, L, y, 9, F, dark); y -= 12 })
  y -= 16

  // cím-sáv
  const titel = stufe === 1 ? 'Zahlungserinnerung' : (stufe === 2 ? '1. Mahnung' : (stufe + '. Mahnung'))
  page.drawLine({ start: { x: L, y: y + 6 }, end: { x: R, y: y + 6 }, color: hair })
  T(titel, L, y - 4, 12, B, dark)
  RT('Datum: ' + fmtDate(new Date().toISOString().slice(0, 10)), R, y - 2, 9, F, mut)
  y -= 18
  page.drawLine({ start: { x: L, y: y + 6 }, end: { x: R, y: y + 6 }, color: hair }); y -= 18

  // szabad szöveg (kézzel szerkesztett), sortöréssel
  const maxW = R - L
  function wrap(line, font, size) {
    const words = line.split(' '); const out = []; let cur = ''
    for (const w of words) { const test = cur ? cur + ' ' + w : w; if (font.widthOfTextAtSize(test, size) > maxW) { if (cur) out.push(cur); cur = w } else cur = test }
    if (cur) out.push(cur); return out.length ? out : ['']
  }
  String(text || '').split('\n').forEach(raw => {
    if (raw.trim() === '') { y -= 8; return }
    wrap(raw, F, 9.5).forEach(ln => { T(ln, L, y, 9.5, F, dark); y -= 13 })
  })
  y -= 8

  // összeg-blokk
  const gross = Number(inv.total_gross) || 0
  const geb = Number(gebuehr) || 0
  const ges = gross + geb
  const lblX = R - 200
  page.drawLine({ start: { x: lblX - 10, y: y + 6 }, end: { x: R, y: y + 6 }, color: hair }); y -= 6
  RT('Offener Rechnungsbetrag:', lblX, y, 9, F, mut); RT(eur(gross), R, y, 9, F, dark); y -= 14
  if (geb > 0) { RT('Mahngebühr:', lblX, y, 9, F, mut); RT(eur(geb), R, y, 9, F, dark); y -= 14 }
  page.drawLine({ start: { x: lblX - 10, y: y + 4 }, end: { x: R, y: y + 4 }, color: gold }); y -= 13
  RT('Zu zahlender Betrag:', lblX, y, 11, B, dark); RT(eur(ges), R, y, 11, B, gold); y -= 28

  // banki adatok lábléc
  const iban = seller.iban || ''
  const bic = seller.bic || ''
  const bank = seller.bank || ''
  if (iban) { T('Bankverbindung: ' + (bank ? bank + ' · ' : '') + 'IBAN ' + iban + (bic ? ' · BIC ' + bic : ''), L, 60, 8, F, mut) }
  T(seller.name + ' · ' + seller.street + ' · ' + seller.zip + ' ' + seller.city, L, 46, 7.5, F, mut)

  return await pdf.save()
}
