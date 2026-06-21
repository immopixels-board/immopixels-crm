import { NextResponse } from 'next/server'

const KATEGORIEN = ['Ausrüstung', 'Software', 'Bildbearbeiter', 'Fahrtkosten', 'Reisekosten', 'Material / Druck', 'Büro', 'Marketing', 'Versicherung', 'Finanzamt', 'Arzt', 'Sonstiges']

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 })

  let body
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 }) }
  const { data, mediaType } = body || {}
  if (!data || !mediaType) return NextResponse.json({ ok: false, error: 'data + mediaType required' }, { status: 400 })

  const isPdf = mediaType === 'application/pdf'
  const fileBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data } }

  const prompt = `Du bist ein Buchhaltungs-Assistent für ImmoPixels e.K. (Immobilienfotografie). Analysiere das hochgeladene Dokument und gib AUSSCHLIESSLICH ein JSON-Objekt zurück (ohne Markdown, ohne Erklärung).

Bestimme zuerst den Dokumenttyp ("typ"):
- "eingangsrechnung" = eine echte Lieferantenrechnung, die ImmoPixels bezahlen muss (Ausgabe). Auch Tankkarten-Sammelrechnungen (z.B. DKV, UTA) gehören hierher.
- "sammelbeleg" = ein Begleit-/Zahlungsbeleg OHNE Vorsteuerabzug (z.B. DKV "E-Zusammenstellung", auf dem steht "berechtigt nicht zum Vorsteuerabzug" oder "gilt nicht als Umsatzsteuererstattungsbeleg"). KEINE eigene Ausgabe — nur Begleitpapier.
- "buchhaltung" = Auswertung/Unterlage vom Steuerberater, KEINE Ausgabe. Dazu zählen: BWA (Betriebswirtschaftliche Auswertung), SuSa (Summen und Salden), USt-Voranmeldung / Übermittlungsprotokoll, Lohnauswertungen.

Format:
{
  "typ": "eingangsrechnung" | "sammelbeleg" | "buchhaltung",

  // bei typ "eingangsrechnung" oder "sammelbeleg":
  "lieferant": "Name des Absenders (NICHT ImmoPixels)",
  "rechnungsnr": "Rechnungsnummer",
  "datum": "YYYY-MM-DD (Rechnungsdatum)",
  "netto": Zahl, "ust": Zahl, "brutto": Zahl, "ust_satz": Zahl (19 oder 7),
  "kategorie": "eine aus: ${KATEGORIEN.join(', ')}",
  "sammelrechnung": true|false,   // true bei Tankkarten o.ä. mit mehreren Positionen
  "positionen": Zahl,             // Anzahl Einzelposten (sonst 1)

  // bei typ "buchhaltung":
  "belegart": "BWA" | "SuSa" | "USt-VA" | "Lohn" | "Sonstiges",
  "zeitraum": "z.B. April 2026",
  "kennzahlen": { ... die wichtigsten Werte als Key-Value, siehe unten ... },

  "zusammenfassung": "ein kurzer, lesbarer deutscher Satz, was das Dokument ist",
  "konfidenz": "hoch" | "mittel" | "niedrig"
}

Regeln:
- TANKKARTEN-SAMMELRECHNUNG (z.B. DKV): typ="eingangsrechnung", kategorie="Fahrtkosten", sammelrechnung=true. WICHTIG: netto/ust/brutto NICHT aus einzelnen Tankvorgängen rechnen, sondern aus der GESAMTSUMME unten (Felder "TOTAL", "Gesamtwert", "Umsatzsteuerstatistik" / "Gesamtsumme"). positionen = Anzahl der Tankvorgänge.
- "lieferant" ist der Absender (z.B. DKV Euro Service, Adobe, Calumet) — niemals ImmoPixels.
- Kategorie sinnvoll wählen: Software (Adobe/Abos), Bildbearbeiter (externe Bildbearbeitung/Retusche, z.B. „Michael Photo"), Ausrüstung (Kameras/Technik), Fahrtkosten (Tanken/Sprit/Tankkarte), Material / Druck, Büro, Marketing, Versicherung, Reisekosten (Hotel/Bahn), Finanzamt (Steuer/Finanzamt), Arzt (Praxis/Arzt), sonst Sonstiges.
- USt-Voranmeldung/Übermittlungsprotokoll: belegart="USt-VA", kennzahlen z.B. {"ust_vorauszahlung": Zahl, "faelligkeit": "YYYY-MM-DD"}.
- BWA: belegart="BWA", kennzahlen z.B. {"ergebnis_monat": Zahl, "ergebnis_kumuliert": Zahl, "erloese_monat": Zahl}.
- SuSa: belegart="SuSa", kennzahlen kann leer sein {}.
- Bei typ "buchhaltung" sind netto/ust/brutto NICHT relevant — gib sie als 0 zurück.
- Unlesbare Werte: null (bei Zahlen 0). "konfidenz" niedrig bei schlechter Lesbarkeit.`

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
    if (!parsed.typ) parsed.typ = 'eingangsrechnung'
    // Determinisztikus felülírás: DKV / tankkártya → mindig Fahrtkosten (útiköltség)
    try {
      const blob = (String(parsed.lieferant || '') + ' ' + JSON.stringify(parsed)).toLowerCase()
      if (/\bdkv\b|euro service|tankkarte|tankkarten|tankstelle|kraftstoff|treibstoff|\baral\b|\bshell\b|\besso\b|total energies|\bjet\b/.test(blob)) {
        parsed.kategorie = 'Fahrtkosten'
        if (/\bdkv\b|euro service|tankkarte/.test(blob)) parsed.sammelrechnung = true
      }
      else if (/michael ?photo|michaelphoto/.test(blob)) parsed.kategorie = 'Bildbearbeiter'
      else if (/finanzamt|steuerkasse|steuernummer.*finanzamt|bundeszentralamt für steuern/.test(blob)) parsed.kategorie = 'Finanzamt'
      else if (/\barzt\b|zahnarzt|hausarzt|facharzt|ärztlich|dr\.? med|\bpraxis\b|\bklinik\b|medizinisch/.test(blob)) parsed.kategorie = 'Arzt'
    } catch {}
    return NextResponse.json({ ok: true, data: parsed, raw: parsed })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'fetch error' }, { status: 500 })
  }
}
