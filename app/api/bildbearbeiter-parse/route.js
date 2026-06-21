import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY fehlt' }, { status: 500 })
  let body; try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
  const { data, mediaType } = body
  if (!data) return NextResponse.json({ ok: false, error: 'data required' }, { status: 400 })
  const isPdf = (mediaType || '') === 'application/pdf'
  const fileBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data } }

  const prompt = `Dies ist eine Rechnung des externen Bildbearbeiters (Foto-Retusche). Extrahiere ALLE Positionszeilen der Tabelle.
Jede Zeile hat: DATE (Datum), ITEM DESCRIPTION (Beschreibung, enthält den Shooting-/Kundennamen, z.B. "26_05_09_Riegel#55 - Remlingstraße 43, Speyer"), QUANTITY (Stückzahl bearbeiteter Bilder), UNIT PRICE (Einzelpreis), AMOUNT (Betrag).
Wichtig:
- Manche Beschreibungen gehen über zwei Zeilen — fasse sie zu EINER Position zusammen.
- QUANTITY ist eine ganze Zahl (Anzahl Bilder). UNIT PRICE/AMOUNT sind Geldbeträge (Punkt als Dezimaltrenner).
- Ignoriere Kopf-/Fußzeilen, Summen ("TOTAL"), Adressen, Notizen.

Gib NUR JSON zurück (ein Array, kein Markdown, keine Erklärung):
[{ "datum": "YYYY-MM-DD" oder null, "beschreibung": "<Originaltext>", "menge": <zahl>, "einzelpreis": <zahl>, "betrag": <zahl> }]`

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 8192, messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: prompt }] }] })
    })
    const j = await r.json()
    if (j.error) return NextResponse.json({ ok: false, error: j.error.message || 'API error' }, { status: 502 })
    const txt = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim().replace(/```json|```/g, '').trim()
    let parsed; try { parsed = JSON.parse(txt) } catch { return NextResponse.json({ ok: false, error: 'parse', raw: txt.slice(0, 500) }, { status: 200 }) }
    const positionen = (Array.isArray(parsed) ? parsed : []).map(x => {
      const menge = Number(x.menge) || 0, einzelpreis = Number(x.einzelpreis) || 0
      return { datum: x.datum || null, beschreibung: String(x.beschreibung || '').slice(0, 220), menge, einzelpreis, betrag: Number(x.betrag) || (menge * einzelpreis) }
    }).filter(p => p.beschreibung)
    return NextResponse.json({ ok: true, positionen })
  } catch (e) { return NextResponse.json({ ok: false, error: e.message || 'fetch error' }, { status: 500 }) }
}
