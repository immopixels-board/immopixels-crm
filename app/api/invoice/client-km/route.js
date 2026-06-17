export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST { base, items: [{ address, date }] }   (vagy legacy { base, addresses: [..] })
// → { ok, km } : a TÉNYLEGESEN megtett km becslése.
// Az aznapi fotózásokat LÁNCOLVA számoljuk: otthon → termin1 → termin2 → … → otthon
// (nem külön oda-vissza mindegyikre). Napokra csoportosít, naponként egy körút.
// Ha nincs dátum, minden cím külön napnak (oda-vissza) számít — visszafelé kompatibilis.
export async function POST(req) {
  let body = {}
  try { body = await req.json() } catch { /* ignore */ }
  const base = String(body.base || '').trim()
  let items = Array.isArray(body.items) ? body.items : null
  if (!items) {
    const addrs = (body.addresses || []).map(a => String(a || '').trim()).filter(Boolean)
    items = addrs.map(a => ({ address: a, date: '' }))
  }
  items = items
    .map(it => ({ address: String(it.address || '').trim(), date: String(it.date || '').trim() }))
    .filter(it => it.address)
  if (!base || !items.length) return Response.json({ ok: false, reason: 'base + items nötig', km: 0 })

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_KEY
  if (!key) return Response.json({ ok: false, reason: 'no api key', km: 0 })

  const addDE = (a) => a && !a.toLowerCase().includes('germany') && !a.toLowerCase().includes('deutschland') && !a.includes(',DE') ? a + ', Deutschland' : a

  // napokra csoportosítás (dátum nélküli címek mind külön „napba" kerülnek, hogy oda-vissza legyenek)
  const days = {}
  let noDateIdx = 0
  for (const it of items) {
    const k = it.date || ('__nodate__' + (noDateIdx++))
    ;(days[k] = days[k] || []).push(it.address)
  }

  // minden naphoz a láncolt szakaszok: base→a1, a1→a2, …, aN→base
  const legPairs = []
  for (const k of Object.keys(days)) {
    const stops = [base, ...days[k], base]
    for (let i = 0; i < stops.length - 1; i++) legPairs.push([stops[i], stops[i + 1]])
  }

  // egy szakasz lekérdezése (Distance Matrix, 1 origin / 1 destination)
  async function legMeters([o, d]) {
    try {
      const r = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(addDE(o))}&destinations=${encodeURIComponent(addDE(d))}&mode=driving&language=de&key=${key}`
      )
      const j = await r.json()
      const el = j.rows?.[0]?.elements?.[0]
      return el?.status === 'OK' && el.distance?.value ? el.distance.value : 0
    } catch { return 0 }
  }

  // párhuzamosan, de kötegelve (max 12 egyszerre), hogy ne fusson ki az időből
  let meters = 0
  for (let i = 0; i < legPairs.length; i += 12) {
    const batch = legPairs.slice(i, i + 12)
    const res = await Promise.all(batch.map(legMeters))
    meters += res.reduce((s, m) => s + m, 0)
  }

  return Response.json({ ok: true, km: Math.round(meters / 1000) })
}
