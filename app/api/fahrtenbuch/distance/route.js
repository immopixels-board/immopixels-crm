export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  const { stops } = await req.json()
  if (!stops || stops.length < 2) return Response.json({ ok: false, reason: 'need at least 2 stops' })

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_KEY
  if (!key) return Response.json({ ok: false, reason: 'no api key' })

  const legs = []
  for (let i = 0; i < stops.length - 1; i++) {
    const origin = encodeURIComponent(stops[i])
    const destination = encodeURIComponent(stops[i + 1])
    try {
      const r = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=driving&language=de&key=${key}`
      )
      const d = await r.json()
      const el = d.rows?.[0]?.elements?.[0]
      if (el?.status === 'OK') {
        legs.push({ distance: el.distance.value, distanceText: el.distance.text, duration: el.duration.value, durationText: el.duration.text })
      } else {
        legs.push({ distance: 0, distanceText: '—', duration: 0, durationText: '—' })
      }
    } catch(e) {
      legs.push({ distance: 0, distanceText: '—', duration: 0, durationText: '—' })
    }
  }

  return Response.json({ ok: true, legs })
}
