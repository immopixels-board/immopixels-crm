import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const KAT = ['Personal', 'Ausrüstung', 'Bildbearbeiter', 'Software', 'Fahrtkosten', 'Reisekosten', 'Material / Druck', 'Büro', 'Marketing', 'Versicherung', 'Finanzamt', 'Steuern', 'Miete', 'Bankgebühren', 'Privatentnahme', 'Arzt', 'Sonstiges']

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY fehlt' }, { status: 500 })
  let body; try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
  const vendors = Array.isArray(body.vendors) ? body.vendors.slice(0, 120) : []
  if (!vendors.length) return NextResponse.json({ ok: true, results: [] })

  const prompt = `Du bist Buchhaltungs-Assistent eines Immobilienfotografie-Unternehmens (e.K., Deutschland).
Klassifiziere jede Bank-Belastung. Gib NUR JSON zurück (Array, keine Erklärung, kein Markdown).

Eingabe = Liste von Empfängern mit Verwendungszwecken, Anzahl Buchungen, Monatsspanne und typischem Betrag.

Für jeden Empfänger liefere:
{ "name": <exakt der Eingabe-name>,
  "category": <eine aus: ${KAT.join(', ')}>,
  "recurring": <true wenn es eine wiederkehrende Fixkostenzahlung ist (Abo/Versicherung/Miete/Beitrag/Steuer-Vorauszahlung), sonst false>,
  "interval": <"monthly" | "quarterly" | "yearly"> (nur sinnvoll wenn recurring),
  "amount": <typischer Betrag pro Intervall als Zahl> }

Regeln & Beispiele:
- "Generali Krankenversicherung" / "... Kfz Versicherung" → Versicherung, recurring. Kranken meist monatlich, Kfz oft jährlich.
- "PayPal - Apple Services", "PayPal - Surfshark", "Adobe", "Vercel" → Software, recurring monthly (Abo).
- Einmalige, nicht wiederholte Software/Technik-Käufe → Software bzw. Ausrüstung, recurring=false.
- "AMAZON BUSINESS" → meist Ausrüstung/Material, recurring=false (variabel).
- "EasyPark" → Fahrtkosten (Parken), recurring=false.
- "Mawacon" / Telekom / Vodafone / 1&1 → Büro (Telefon/Internet), recurring monthly.
- "Dina, Cristian - Lebens privat" oder Übertrag auf eigenes Konto → Privatentnahme, recurring=false (variabel).
- ARD/ZDF/Rundfunkbeitrag → Büro/Sonstiges, recurring quarterly.
- Finanzamt → Steuern/Finanzamt, recurring quarterly (Vorauszahlung).
- DKV/Tankkarte/Tanken/Aral/Shell → Fahrtkosten, recurring=false.
- Wenn count>=3 über mehrere Monate mit ähnlichem Betrag → eher recurring.

Empfänger:
${vendors.map(v => `- name="${String(v.name).slice(0, 60)}" | zwecke="${(v.purposes || []).join(' / ').slice(0, 120)}" | count=${v.count} | monate=${v.monthsSpan} | betrag≈${v.medAmount}`).join('\n')}`

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] })
    })
    const j = await r.json()
    if (j.error) return NextResponse.json({ ok: false, error: j.error.message || 'API error' }, { status: 502 })
    const txt = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim()
    const clean = txt.replace(/```json|```/g, '').trim()
    let parsed; try { parsed = JSON.parse(clean) } catch { return NextResponse.json({ ok: false, error: 'parse', raw: txt.slice(0, 400) }, { status: 200 }) }
    const results = (Array.isArray(parsed) ? parsed : []).map(x => ({ name: x.name, category: KAT.includes(x.category) ? x.category : 'Sonstiges', recurring: !!x.recurring, interval: ['monthly', 'quarterly', 'yearly'].includes(x.interval) ? x.interval : 'monthly', amount: Number(x.amount) || 0 }))
    return NextResponse.json({ ok: true, results })
  } catch (e) { return NextResponse.json({ ok: false, error: e.message || 'fetch error' }, { status: 500 }) }
}
