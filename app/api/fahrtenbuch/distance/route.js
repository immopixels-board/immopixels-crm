export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  const { stops } = await req.json()
  if (!stops || stops.length < 2) return Response.json({ ok: false, reason: 'need at least 2 stops' })

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_KEY
  if (!key) return Response.json({ ok: false, reason: 'no api key' })

  const legs = []
  for (let i = 0; i < stops.length - 1; i++) {
    const addDE = (addr) => addr && !addr.toLowerCase().includes('germany') && !addr.toLowerCase().includes('deutschland') && !addr.includes(',DE') ? addr + ', Deutschland' : addr
    const origin = encodeURIComponent(addDE(stops[i]))
    const destination = encodeURIComponent(addDE(stops[i + 1]))
    try {
      const r = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=driving&language=de&key=${key}`
      )
      const d = await r.json()
      const el = d.rows?.[0]?.elements?.[0]
      if (el?.status === 'OK') {
        legs.push({ distance: el.distance.value, distanceText: el.distance.text, duration: el.duration.value, durationText: el.duration.text, status: 'OK' })
      } else {
        legs.push({ distance: null, distanceText: '—', duration: null, durationText: '—', status: el?.status || 'ERROR' })
      }
    } catch(e) {
      legs.push({ distance: 0, distanceText: '—', duration: 0, durationText: '—' })
    }
  }

  return Response.json({ ok: true, legs })
}
