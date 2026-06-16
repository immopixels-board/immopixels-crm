export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST { base: "Startadresse", addresses: ["Adresse1", ...] }
// → { ok, km } : a bázisból MINDEN címhez oda-vissza megtett km összege (tájékoztató).
// Egy Distance Matrix hívás per max. 25 cél (kötegelve), origins=[base].
export async function POST(req) {
  let body = {}
  try { body = await req.json() } catch { /* ignore */ }
  const base = String(body.base || '').trim()
  const addresses = (body.addresses || []).map(a => String(a || '').trim()).filter(Boolean)
  if (!base || !addresses.length) return Response.json({ ok: false, reason: 'base + addresses nötig', km: 0 })

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_KEY
  if (!key) return Response.json({ ok: false, reason: 'no api key', km: 0 })

  const addDE = (a) => a && !a.toLowerCase().includes('germany') && !a.toLowerCase().includes('deutschland') && !a.includes(',DE') ? a + ', Deutschland' : a
  const origin = encodeURIComponent(addDE(base))

  let meters = 0
  // kötegelés: Distance Matrix max ~25 cél / kérés
  for (let i = 0; i < addresses.length; i += 25) {
    const batch = addresses.slice(i, i + 25)
    const dest = batch.map(a => encodeURIComponent(addDE(a))).join('%7C') // pipe
    try {
      const r = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&mode=driving&language=de&key=${key}`
      )
      const d = await r.json()
      const els = d.rows?.[0]?.elements || []
      for (const el of els) { if (el?.status === 'OK' && el.distance?.value) meters += el.distance.value }
    } catch (e) { /* részleges eredmény is jó */ }
  }

  // oda-vissza (Hin- und Rückfahrt) → ×2
  const km = Math.round(meters / 1000 * 2)
  return Response.json({ ok: true, km })
}
