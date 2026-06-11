import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const n2 = v => (Number(v) || 0).toFixed(2)
const eur = v => (Number(v) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const lineNet = it => (Number(it.qty) || 0) * (Number(it.unit_price) || 0) * (1 - (Number(it.discount) || 0) / 100)

// EN16931 (CII / Factur-X) XML
export function buildCiiXml({ inv, items, seller }) {
  const kleinunt = !!seller.kleinunternehmer
  const isStorno = !!inv.storno_of || (Number(inv.total_net) < 0)
  const typeCode = isStorno ? '384' : '380'
  const dt = (inv.invoice_date || '').replace(/-/g, '')
  const groups = {}
  ;(items || []).forEach(it => {
    const rate = kleinunt ? 0 : (Number(it.vat_rate) || 0)
    const net = Number(it.line_net != null ? it.line_net : lineNet(it)) || 0
    const g = groups[rate] || { rate, basis: 0, tax: 0 }
    g.basis += net; g.tax += kleinunt ? 0 : net * rate / 100; groups[rate] = g
  })
  const taxXml = Object.values(groups).map(g => `
    <ram:ApplicableTradeTax>
      <ram:CalculatedAmount>${n2(g.tax)}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode>
      ${kleinunt ? '<ram:ExemptionReason>Kleinunternehmer gemäß § 19 UStG</ram:ExemptionReason>' : ''}
      <ram:BasisAmount>${n2(g.basis)}</ram:BasisAmount>
      <ram:CategoryCode>${kleinunt ? 'E' : (g.rate > 0 ? 'S' : 'Z')}</ram:CategoryCode>
      <ram:RateApplicablePercent>${n2(g.rate)}</ram:RateApplicablePercent>
    </ram:ApplicableTradeTax>`).join('')
  const lineXml = (items || []).map((it, i) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${i + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>${esc((it.description || '').replace(/\n/g, ' '))}</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${n2(it.unit_price)}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="C62">${n2(it.qty)}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${kleinunt ? 'E' : ((Number(it.vat_rate) || 0) > 0 ? 'S' : 'Z')}</ram:CategoryCode><ram:RateApplicablePercent>${n2(kleinunt ? 0 : it.vat_rate)}</ram:RateApplicablePercent></ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${n2(it.line_net != null ? it.line_net : lineNet(it))}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join('')
  const b = inv.buyer || {}
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument><ram:ID>${esc(inv.invoice_number || 'ENTWURF')}</ram:ID><ram:TypeCode>${typeCode}</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">${dt}</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${lineXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty><ram:Name>${esc(seller.name)}</ram:Name>
        <ram:PostalTradeAddress><ram:PostcodeCode>${esc(seller.zip)}</ram:PostcodeCode><ram:LineOne>${esc(seller.street)}</ram:LineOne><ram:CityName>${esc(seller.city)}</ram:CityName><ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress>
        ${seller.vatId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(seller.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
        ${seller.taxNo ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">${esc(seller.taxNo)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty><ram:Name>${esc(b.company || inv.client_name)}</ram:Name>
        ${(b.address) ? `<ram:PostalTradeAddress><ram:LineOne>${esc(b.address)}</ram:LineOne><ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress>` : ''}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement><ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>${taxXml}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${n2(inv.total_net)}</ram:LineTotalAmount><ram:TaxBasisTotalAmount>${n2(inv.total_net)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${n2(inv.vat_amount)}</ram:TaxTotalAmount><ram:GrandTotalAmount>${n2(inv.total_gross)}</ram:GrandTotalAmount><ram:DuePayableAmount>${n2(inv.total_gross)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`
}

async function fetchImgBytes(url) { try { const r = await fetch(url); if (!r.ok) return null; const b = await r.arrayBuffer(); return new Uint8Array(b) } catch { return null } }

export async function generateZugferdPdf({ inv, items, seller, template = {} }) {
  const xml = buildCiiXml({ inv, items, seller })
  const pdf = await PDFDocument.create()
  const F = await pdf.embedFont(StandardFonts.Helvetica)
  const B = await pdf.embedFont(StandardFonts.HelveticaBold)
  const gold = rgb(0.72, 0.54, 0.16), dark = rgb(0.17, 0.16, 0.14), mut = rgb(0.54, 0.51, 0.47), hair = rgb(0.9, 0.88, 0.84)
  const PW = 595.28, PH = 841.89, L = 42, R = PW - 42
  const b = inv.buyer || {}
  const isStorno = !!inv.storno_of || Number(inv.total_net) < 0

  // logó / QR előtöltés (best effort)
  let logoImg = null
  if (template.logoUrl) { const by = await fetchImgBytes(template.logoUrl); if (by) { try { logoImg = await pdf.embedPng(by) } catch { try { logoImg = await pdf.embedJpg(by) } catch {} } } }
  let qrImg = null
  if (template.qrUrl) { const q = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=' + encodeURIComponent(template.qrUrl); const by = await fetchImgBytes(q); if (by) { try { qrImg = await pdf.embedPng(by) } catch {} } }

  let page, y
  const T = (t, x, yy, s = 9, f = F, c = dark) => page.drawText(String(t ?? ''), { x, y: yy, size: s, font: f, color: c })
  const RT = (t, xr, yy, s = 9, f = F, c = dark) => page.drawText(String(t ?? ''), { x: xr - f.widthOfTextAtSize(String(t ?? ''), s), y: yy, size: s, font: f, color: c })
  const cols = { pos: L, desc: L + 24, qty: 330, price: 372, rab: 425, tax: 470, net: R }

  function colHeader() {
    page.drawRectangle({ x: L, y: y - 5, width: R - L, height: 16, color: rgb(0.97, 0.95, 0.91) })
    T('Pos', cols.pos, y, 8, B, mut); T('Beschreibung', cols.desc, y, 8, B, mut)
    RT('Anzahl', cols.price - 8, y, 8, B, mut); RT('Preis', cols.rab - 6, y, 8, B, mut)
    RT('Rabatt', cols.tax - 6, y, 8, B, mut); RT('Steuer', cols.tax + 30, y, 8, B, mut); RT('Netto', cols.net, y, 8, B, mut)
    y -= 20
  }
  function newPage(withColHeader) {
    page = pdf.addPage([PW, PH]); y = PH - 50
    if (withColHeader) colHeader()
  }

  // ── 1. oldal fejléc (csak itt) ──
  page = pdf.addPage([PW, PH]); y = PH - 50
  if (logoImg) { const lw = 120, lh = Math.min(70, lw * logoImg.height / logoImg.width); page.drawImage(logoImg, { x: L, y: PH - 44 - lh, width: lw, height: lh }); y = PH - 44 - lh - 8 }
  T(`${seller.name} | ${seller.street} | ${seller.zip} ${seller.city}`, L, y, 7, F, mut); y -= 22
  T(b.company || inv.client_name || '', L, y, 11, B, dark); y -= 13
  ;(b.address || '').split(',').map(s => s.trim()).filter(Boolean).forEach(line => { T(line, L, y, 9, F, dark); y -= 12 })
  // jobb felső: Rechnung + Kundennummer + Datum
  let ry = PH - 72
  RT((isStorno ? 'Stornorechnung ' : 'Rechnung ') + (inv.invoice_number || 'Entwurf'), R, ry, 13, B, dark); ry -= 16
  if (b.kundennr) { RT('Kundennummer: ' + b.kundennr, R, ry, 9, F, mut); ry -= 12 }
  RT('Datum: ' + fmtDate(inv.invoice_date), R, ry, 9, F, mut)
  y = Math.min(y, ry) - 16
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, color: hair }); y -= 16
  T(template.intro || 'Hiermit stellen wir Ihnen die folgenden Positionen in Rechnung.', L, y, 9, F, dark); y -= 18
  colHeader()

  // ── tételek ──
  ;(items || []).forEach((it, i) => {
    const descLines = String(it.description || '').split('\n').filter(s => s.trim().length)
    const rowH = Math.max(16, descLines.length * 11 + 6)
    if (y - rowH < 130) { newPage(true) }
    const net = it.line_net != null ? it.line_net : lineNet(it)
    T(String(i + 1), cols.pos, y, 9, F, dark)
    descLines.forEach((dl, k) => T(dl.slice(0, 70), cols.desc, y - k * 11, k === 0 ? 9 : 8, k === 0 ? B : F, k === 0 ? dark : mut))
    RT(n2(it.qty), cols.price - 8, y, 9); RT(eur(it.unit_price), cols.rab - 6, y, 9)
    RT((Number(it.discount) || 0) ? (Number(it.discount)) + ' %' : '', cols.tax - 6, y, 9)
    RT((Number(it.vat_rate) || 0) + ' %', cols.tax + 30, y, 9); RT(eur(net), cols.net, y, 9, B, dark)
    y -= rowH
    page.drawLine({ start: { x: L, y: y + 4 }, end: { x: R, y: y + 4 }, color: rgb(0.95, 0.93, 0.89) })
  })

  // ── összegek ──
  if (y < 170) newPage(false)
  y -= 8
  RT('Zwischensumme netto:', cols.net - 90, y, 9, F, mut); RT(eur(inv.total_net), cols.net, y, 9, F, dark); y -= 14
  RT('USt 19 % (' + eur(inv.total_net) + '):', cols.net - 90, y, 9, F, mut); RT(eur(inv.vat_amount), cols.net, y, 9, F, dark); y -= 16
  page.drawLine({ start: { x: cols.net - 200, y: y + 6 }, end: { x: R, y: y + 6 }, color: gold })
  RT('Gesamt brutto:', cols.net - 90, y, 11, B, dark); RT(eur(inv.total_gross), cols.net, y, 11, B, gold); y -= 26

  if (seller.kleinunternehmer) { T('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', L, y, 8, F, mut); y -= 14 }
  T(template.closing || 'Vielen Dank für die Zusammenarbeit!', L, y, 9, B, dark); y -= 14
  const due = inv.due_date ? fmtDate(inv.due_date) : ''
  T('Bitte überweisen Sie den Rechnungsbetrag' + (due ? ' bis zum ' + due : '') + ' auf unser Konto.', L, y, 9, F, dark); y -= 18

  // ── reklám / linkek / QR ──
  const links = (template.footerLinks || []).filter(l => l && l.url)
  if (template.reviewUrl) links.unshift({ label: template.reviewText || 'Jetzt bewerten', url: template.reviewUrl })
  if (template.bookingUrl) links.push({ label: 'Online buchen', url: template.bookingUrl })
  if (links.length || qrImg) {
    const blockTop = y
    if (qrImg) { const qs = 64; page.drawImage(qrImg, { x: R - qs, y: blockTop - qs + 6, width: qs, height: qs }) }
    links.forEach(l => { T(l.label, L, y, 9, B, gold); y -= 11; T(l.url, L, y, 7, F, mut); y -= 14 })
    if (qrImg && y > blockTop - 70) y = blockTop - 74
  }

  // ── footer CSAK az utolsó oldal alján ──
  drawFooter(page)
  function drawFooter(pg) {
    const fy = 70
    pg.drawLine({ start: { x: L, y: fy + 12 }, end: { x: R, y: fy + 12 }, color: hair })
    const c1 = L, c2 = L + 200, c3 = L + 360
    const put = (lines, x) => lines.forEach((ln, i) => pg.drawText(String(ln), { x, y: fy - i * 9, size: 7, font: F, color: mut }))
    put([seller.name, seller.street, seller.zip + ' ' + seller.city, seller.vatId ? 'Ust-ID-Nummer: ' + seller.vatId : ''].filter(Boolean), c1)
    put([seller.phone, seller.email, seller.web].filter(Boolean), c2)
    put([seller.bank, seller.bic ? 'BIC: ' + seller.bic : '', seller.iban ? 'IBAN: ' + seller.iban : ''].filter(Boolean), c3)
  }

  await pdf.attach(new TextEncoder().encode(xml), 'factur-x.xml', { mimeType: 'application/xml', description: 'Factur-X/ZUGFeRD Rechnungsdaten', afRelationship: 'Alternative' })
  pdf.setTitle('Rechnung ' + (inv.invoice_number || ''))
  pdf.setProducer('ImmoPixels CRM — ZUGFeRD'); pdf.setCreator('ImmoPixels CRM')
  return await pdf.save()
}

function fmtDate(d) { if (!d) return ''; const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}.${m[2]}.${m[1]}` : d }
