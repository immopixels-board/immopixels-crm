import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const n2 = v => (Number(v) || 0).toFixed(2)
const eur = v => (Number(v) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

// EN16931 (CII / Factur-X) XML a beágyazáshoz
export function buildCiiXml({ inv, items, seller }) {
  const kleinunt = !!seller.kleinunternehmer
  const isStorno = !!inv.storno_of || (Number(inv.total_net) < 0)
  const typeCode = isStorno ? '384' : '380'
  const dt = (inv.invoice_date || '').replace(/-/g, '')

  // adócsoportok kulcsa szerint
  const groups = {}
  ;(items || []).forEach(it => {
    const rate = kleinunt ? 0 : (Number(it.vat_rate) || 0)
    const net = Number(it.line_net) || 0
    const g = groups[rate] || { rate, basis: 0, tax: 0 }
    g.basis += net; g.tax += kleinunt ? 0 : net * rate / 100
    groups[rate] = g
  })
  const taxXml = Object.values(groups).map(g => `
    <ram:ApplicableTradeTax>
      <ram:CalculatedAmount>${n2(g.tax)}</ram:CalculatedAmount>
      <ram:TypeCode>VAT</ram:TypeCode>
      ${kleinunt ? '<ram:ExemptionReason>Kleinunternehmer gemäß § 19 UStG</ram:ExemptionReason>' : ''}
      <ram:BasisAmount>${n2(g.basis)}</ram:BasisAmount>
      <ram:CategoryCode>${kleinunt ? 'E' : (g.rate > 0 ? 'S' : 'Z')}</ram:CategoryCode>
      <ram:RateApplicablePercent>${n2(g.rate)}</ram:RateApplicablePercent>
    </ram:ApplicableTradeTax>`).join('')

  const lineXml = (items || []).map((it, i) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${i + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>${esc(it.description)}</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice><ram:ChargeAmount>${n2(it.unit_price)}</ram:ChargeAmount></ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="C62">${n2(it.qty)}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${kleinunt ? 'E' : ((Number(it.vat_rate) || 0) > 0 ? 'S' : 'Z')}</ram:CategoryCode>
          <ram:RateApplicablePercent>${n2(kleinunt ? 0 : it.vat_rate)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${n2(it.line_net)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(inv.invoice_number || 'ENTWURF')}</ram:ID>
    <ram:TypeCode>${typeCode}</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${dt}</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${lineXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${esc(seller.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${esc(seller.zip)}</ram:PostcodeCode>
          <ram:LineOne>${esc(seller.street)}</ram:LineOne>
          <ram:CityName>${esc(seller.city)}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
        ${seller.vatId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(seller.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
        ${seller.taxNo ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">${esc(seller.taxNo)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty><ram:Name>${esc(inv.client_name)}</ram:Name></ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>${taxXml}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${n2(inv.total_net)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${n2(inv.total_net)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${n2(inv.vat_amount)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${n2(inv.total_gross)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${n2(inv.total_gross)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`
}

// Hibrid PDF: látható számla + beágyazott factur-x.xml (ZUGFeRD)
export async function generateZugferdPdf({ inv, items, seller }) {
  const xml = buildCiiXml({ inv, items, seller })
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595.28, 841.89])
  const F = await pdf.embedFont(StandardFonts.Helvetica)
  const B = await pdf.embedFont(StandardFonts.HelveticaBold)
  const gold = rgb(0.72, 0.54, 0.16), dark = rgb(0.16, 0.16, 0.16), mut = rgb(0.54, 0.51, 0.47)
  const W = 595.28; let y = 800
  const T = (t, x, yy, s = 9, f = F, c = dark) => page.drawText(String(t ?? ''), { x, y: yy, size: s, font: f, color: c })
  const R = (t, xr, yy, s = 9, f = F, c = dark) => page.drawText(String(t ?? ''), { x: xr - f.widthOfTextAtSize(String(t ?? ''), s), y: yy, size: s, font: f, color: c })

  T(seller.name || 'ImmoPixels', 40, y, 16, B, gold); y -= 16
  T([seller.street, [seller.zip, seller.city].filter(Boolean).join(' ')].filter(Boolean).join(', '), 40, y, 8, F, mut); y -= 10
  T([seller.vatId ? 'USt-IdNr: ' + seller.vatId : '', seller.taxNo ? 'St-Nr: ' + seller.taxNo : ''].filter(Boolean).join('  ·  '), 40, y, 8, F, mut)

  const isStorno = !!inv.storno_of || Number(inv.total_net) < 0
  R(isStorno ? 'STORNORECHNUNG' : 'RECHNUNG', W - 40, 800, 18, B, dark)
  R('Nr. ' + (inv.invoice_number || 'Entwurf'), W - 40, 782, 10, F, dark)
  R('Datum: ' + (inv.invoice_date || ''), W - 40, 768, 9, F, mut)
  if (inv.due_date) R('Fällig: ' + inv.due_date, W - 40, 756, 9, F, mut)

  y = 700
  T('Rechnung an', 40, y, 8, B, mut); y -= 14
  T(inv.client_name || '', 40, y, 11, B, dark); y -= 30

  // tételfej
  const cols = { pos: 40, desc: 70, qty: 330, price: 390, vat: 460, sum: W - 40 }
  page.drawRectangle({ x: 40, y: y - 4, width: W - 80, height: 18, color: gold })
  T('#', cols.pos, y, 8, B, rgb(1, 1, 1)); T('Beschreibung', cols.desc, y, 8, B, rgb(1, 1, 1))
  R('Menge', cols.price - 10, y, 8, B, rgb(1, 1, 1)); R('Preis', cols.vat - 5, y, 8, B, rgb(1, 1, 1))
  R('MwSt', cols.vat + 35, y, 8, B, rgb(1, 1, 1)); R('Summe', cols.sum, y, 8, B, rgb(1, 1, 1))
  y -= 22
  ;(items || []).forEach((it, i) => {
    T(i + 1, cols.pos, y, 9); T((it.description || '').slice(0, 50), cols.desc, y, 9)
    R(n2(it.qty), cols.price - 10, y, 9); R(eur(it.unit_price), cols.vat - 5, y, 9)
    R((Number(it.vat_rate) || 0) + '%', cols.vat + 35, y, 9); R(eur(it.line_net), cols.sum, y, 9)
    y -= 16
  })
  y -= 6; page.drawLine({ start: { x: 330, y }, end: { x: W - 40, y }, color: rgb(0.9, 0.88, 0.84) }); y -= 16
  R('Netto', cols.vat + 35, y, 9, F, mut); R(eur(inv.total_net), cols.sum, y, 9); y -= 14
  R('MwSt', cols.vat + 35, y, 9, F, mut); R(eur(inv.vat_amount), cols.sum, y, 9); y -= 16
  R('Gesamt', cols.vat + 35, y, 11, B, dark); R(eur(inv.total_gross), cols.sum, y, 11, B, gold)

  if (seller.kleinunternehmer) { y -= 26; T('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', 40, y, 8, F, mut) }
  if (seller.iban) { y -= 26; T('Zahlbar auf: ' + seller.iban + (seller.bic ? '  ·  ' + seller.bic : ''), 40, y, 8, F, mut) }
  if (inv.notes) { y -= 16; T(String(inv.notes).slice(0, 110), 40, y, 8, F, mut) }

  T('Dieses Dokument enthält eine eingebettete E-Rechnung (ZUGFeRD / Factur-X, EN 16931).', 40, 40, 7, F, mut)

  await pdf.attach(new TextEncoder().encode(xml), 'factur-x.xml', {
    mimeType: 'application/xml',
    description: 'Factur-X/ZUGFeRD Rechnungsdaten',
    afRelationship: 'Alternative',
  })
  pdf.setTitle('Rechnung ' + (inv.invoice_number || ''))
  pdf.setProducer('ImmoPixels CRM — ZUGFeRD')
  pdf.setCreator('ImmoPixels CRM')
  return await pdf.save()
}
