import { NextResponse } from 'next/server'

const KATEGORIEN = ['Ausrüstung', 'Software', 'Fahrtkosten', 'Material / Druck', 'Büro', 'Marketing', 'Versicherung', 'Reisekosten', 'Sonstiges']

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 })

  let body
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 }) }
  const { data, mediaType } = body || {}
  if (!data || !mediaType) return NextResponse.json({ ok: false, error: 'data + mediaType required' }, { status: 400 })

  // a fájl típusa: PDF → document blokk, kép → image blokk
  const isPdf = mediaType === 'application/pdf'
  const fileBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data } }

  const prompt = `Du bist ein Buchhaltungs-Assistent. Analysiere diese EINGANGSRECHNUNG (eine Rechnung, die ImmoPixels e.K. von einem Lieferanten erhalten hat) und extrahiere die Daten.

Gib AUSSCHLIESSLICH ein JSON-Objekt zurück, ohne Markdown, ohne Erklärung, in genau diesem Format:
{
  "lieferant": "Name des Lieferanten/Absenders der Rechnung",
  "rechnungsnr": "Rechnungsnummer des Lieferanten",
  "datum": "YYYY-MM-DD (Rechnungsdatum)",
  "netto": Zahl (Nettobetrag, Punkt als Dezimaltrennzeichen),
  "ust": Zahl (USt-/MwSt-Betrag),
  "brutto": Zahl (Bruttobetrag/Gesamtbetrag),
  "ust_satz": Zahl (USt-Satz in Prozent, meist 19 oder 7),
  "kategorie": "eine aus dieser Liste: ${KATEGORIEN.join(', ')}",
  "konfidenz": "hoch" | "mittel" | "niedrig"
}

Regeln:
- "lieferant" ist NICHT ImmoPixels, sondern der ABSENDER der Rechnung (z.B. Adobe, Aral, Calumet).
- Wähle die "kategorie" sinnvoll: Software (Adobe, Abos), Ausrüstung (Kameras, Technik), Fahrtkosten (Tankstelle, Sprit), Material / Druck (Drucke, Prints), Büro (Bürobedarf), Marketing (Werbung, Ads), Versicherung, Reisekosten (Hotel, Bahn), sonst Sonstiges.
- Wenn ein Wert nicht lesbar ist, nutze null (bei Zahlen 0).
- "konfidenz" niedrig, wenn der Beleg schlecht lesbar oder unklar ist.`

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: prompt }] }]
      })
    })
    const j = await r.json()
    if (j.error) return NextResponse.json({ ok: false, error: j.error.message || 'API error' }, { status: 502 })
    const txt = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim()
    const clean = txt.replace(/```json|```/g, '').trim()
    let parsed
    try { parsed = JSON.parse(clean) } catch { return NextResponse.json({ ok: false, error: 'parse', raw: txt }, { status: 200 }) }
    return NextResponse.json({ ok: true, data: parsed, raw: parsed })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'fetch error' }, { status: 500 })
  }
}
