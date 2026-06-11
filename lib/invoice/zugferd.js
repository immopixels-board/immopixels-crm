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

  let logoImg = null
  const logoSrc = template.logoUrl || '/ip-logo.png'
  { const by = await fetchImgBytes(logoSrc); if (by) { try { logoImg = await pdf.embedPng(by) } catch { try { logoImg = await pdf.embedJpg(by) } catch {} } } }
  let qrImg = null
  if (template.qrUrl) { const q = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=' + encodeURIComponent(template.qrUrl); const by = await fetchImgBytes(q); if (by) { try { qrImg = await pdf.embedPng(by) } catch {} } }

  let page, y
  const T = (t, x, yy, s = 9, f = F, c = dark) => page.drawText(String(t ?? ''), { x, y: yy, size: s, font: f, color: c })
  const RT = (t, xr, yy, s = 9, f = F, c = dark) => page.drawText(String(t ?? ''), { x: xr - f.widthOfTextAtSize(String(t ?? ''), s), y: yy, size: s, font: f, color: c })
  const trunc = (txt, f, size, maxW) => { let t = String(txt ?? ''); while (t.length && f.widthOfTextAtSize(t, size) > maxW) t = t.slice(0, -1); return t }

  // oszlop-horgonyok (jobbra zárt számok)
  const C = { pos: L, desc: L + 22, descMaxW: 250, anzahl: 350, preis: 414, rabatt: 460, steuer: 502, netto: R }

  function colHeader() {
    page.drawRectangle({ x: L, y: y - 5, width: R - L, height: 15, color: rgb(0.97, 0.95, 0.91) })
    T('Pos', C.pos, y, 8, B, mut); T('Beschreibung', C.desc, y, 8, B, mut)
    RT('Anzahl', C.anzahl, y, 8, B, mut); RT('Preis', C.preis, y, 8, B, mut)
    RT('Rabatt', C.rabatt, y, 8, B, mut); RT('Steuer', C.steuer, y, 8, B, mut); RT('Netto', C.netto, y, 8, B, mut)
    y -= 18
  }
  function newPage(withCol) { page = pdf.addPage([PW, PH]); y = PH - 50; if (withCol) colHeader() }

  // 1. oldal fejléc (csak itt)
  page = pdf.addPage([PW, PH]); y = PH - 46
  if (logoImg) { const lw = 132, lh = lw * logoImg.height / logoImg.width; page.drawImage(logoImg, { x: L, y: y - lh + 8, width: lw, height: lh }); y -= (lh + 6) }
  T(seller.name + ' | ' + seller.street + ' | ' + seller.zip + ' ' + seller.city, L, y, 7, F, mut); y -= 20
  T(b.company || inv.client_name || '', L, y, 11, B, dark); y -= 13
  ;(b.address || '').split(',').map(s2 => s2.trim()).filter(Boolean).forEach(line => { T(line, L, y, 9, F, dark); y -= 12 })
  let ry = PH - 70
  RT((isStorno ? 'Stornorechnung ' : 'Rechnung ') + (inv.invoice_number || 'Entwurf'), R, ry, 13, B, dark); ry -= 16
  if (b.kundennr) { RT('Kundennummer: ' + b.kundennr, R, ry, 9, F, mut); ry -= 12 }
  RT('Datum: ' + fmtDate(inv.invoice_date), R, ry, 9, F, mut)
  y = Math.min(y, ry) - 16
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, color: hair }); y -= 16
  T(template.intro || 'Hiermit stellen wir Ihnen die folgenden Positionen in Rechnung.', L, y, 9, F, dark); y -= 18
  colHeader()

  ;(items || []).forEach((it, i) => {
    const descLines = String(it.description || '').split('\n').map(s2 => s2.trim()).filter(Boolean)
    const rowH = Math.max(18, descLines.length * 11 + 7)
    if (y - rowH < 130) newPage(true)
    const net = it.line_net != null ? it.line_net : lineNet(it)
    T(String(i + 1), C.pos, y, 9, F, dark)
    descLines.forEach((dl, k) => T(trunc(dl, k === 0 ? B : F, k === 0 ? 9 : 8, C.descMaxW), C.desc, y - k * 11, k === 0 ? 9 : 8, k === 0 ? B : F, k === 0 ? dark : mut))
    RT(n2(it.qty), C.anzahl, y, 9); RT(eur(it.unit_price), C.preis, y, 9)
    RT((Number(it.discount) || 0) ? Number(it.discount) + ' %' : '–', C.rabatt, y, 9)
    RT((Number(it.vat_rate) || 0) + ' %', C.steuer, y, 9); RT(eur(net), C.netto, y, 9, B, dark)
    y -= rowH
    page.drawLine({ start: { x: L, y: y + 5 }, end: { x: R, y: y + 5 }, color: rgb(0.95, 0.93, 0.89) })
  })

  if (y < 175) newPage(false)
  y -= 10
  const lblX = C.netto - 110
  RT('Zwischensumme netto:', lblX, y, 9, F, mut); RT(eur(inv.total_net), C.netto, y, 9, F, dark); y -= 14
  RT('USt 19 % (' + eur(inv.total_net) + '):', lblX, y, 9, F, mut); RT(eur(inv.vat_amount), C.netto, y, 9, F, dark); y -= 16
  page.drawLine({ start: { x: lblX - 10, y: y + 6 }, end: { x: R, y: y + 6 }, color: gold })
  RT('Gesamt brutto:', lblX, y, 11, B, dark); RT(eur(inv.total_gross), C.netto, y, 11, B, gold); y -= 26

  if (seller.kleinunternehmer) { T('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', L, y, 8, F, mut); y -= 14 }
  T(template.closing || 'Vielen Dank für die Zusammenarbeit!', L, y, 9, B, dark); y -= 14
  const due = inv.due_date ? fmtDate(inv.due_date) : ''
  T('Bitte überweisen Sie den Rechnungsbetrag' + (due ? ' bis zum ' + due : '') + ' auf unser Konto.', L, y, 9, F, dark); y -= 18

  const links = (template.footerLinks || []).filter(l => l && l.url)
  if (template.reviewUrl) links.unshift({ label: template.reviewText || 'Jetzt bewerten', url: template.reviewUrl })
  if (template.bookingUrl) links.push({ label: 'Online buchen', url: template.bookingUrl })
  if (links.length || qrImg) {
    if (y < 150) newPage(false)
    const blockTop = y
    if (qrImg) page.drawImage(qrImg, { x: R - 64, y: blockTop - 58, width: 64, height: 64 })
    links.forEach(l => { T(l.label, L, y, 9, B, gold); y -= 11; T(l.url, L, y, 7, F, mut); y -= 14 })
    if (qrImg && y > blockTop - 70) y = blockTop - 74
  }

  drawFooter(page)
  function drawFooter(pg) {
    const fy = 66
    pg.drawLine({ start: { x: L, y: fy + 12 }, end: { x: R, y: fy + 12 }, color: hair })
    const put = (lines, x) => lines.forEach((ln, i) => pg.drawText(String(ln), { x, y: fy - i * 9, size: 7, font: F, color: mut }))
    put([seller.name, seller.street, seller.zip + ' ' + seller.city, seller.vatId ? 'Ust-ID-Nummer: ' + seller.vatId : ''].filter(Boolean), L)
    put([seller.phone, seller.email, seller.web].filter(Boolean), L + 200)
    put([seller.bank, seller.bic ? 'BIC: ' + seller.bic : '', seller.iban ? 'IBAN: ' + seller.iban : ''].filter(Boolean), L + 360)
  }

  await pdf.attach(new TextEncoder().encode(xml), 'factur-x.xml', { mimeType: 'application/xml', description: 'Factur-X/ZUGFeRD Rechnungsdaten', afRelationship: 'Alternative' })
  pdf.setTitle('Rechnung ' + (inv.invoice_number || '')); pdf.setProducer('ImmoPixels CRM'); pdf.setCreator('ImmoPixels CRM')
  return await pdf.save()
}

function fmtDate(d) { if (!d) return ''; const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}.${m[2]}.${m[1]}` : d }
