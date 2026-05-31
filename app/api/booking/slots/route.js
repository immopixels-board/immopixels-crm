// ════════════════════════════════════════════════════════════════════
// app/api/booking/slots/route.js
// GET /api/booking/slots?serviceId=1&date=2026-05-25
// Visszaadja az adott nap szabad időpontjait. Nincs Google hívás → gyors.
// ════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { getDaySlots } from '@/lib/booking/slots'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CORS = {
  'Access-Control-Allow-Origin': '*', // iframe immopixels.de-ről; szűkíthető domainre
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  noStore()
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req) {
  noStore()
  const { searchParams } = new URL(req.url)
  const serviceId = parseInt(searchParams.get('serviceId'), 10)
  const date = searchParams.get('date') // YYYY-MM-DD

  if (!serviceId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'serviceId és date kötelező' },
      { status: 400, headers: CORS })
  }

  const debug = searchParams.get('debug') === '1'
  const addon360 = searchParams.get('addon360') === '1'
  const addonDrone = searchParams.get('addonDrone') === '1'
  const addonMin = (addon360 ? 30 : 0) + (addonDrone ? 15 : 0)
  const address = searchParams.get('address') || null // utazás-tudatos slotokhoz
  try {
    const slots = await getDaySlots(serviceId, date, addonMin, null, address)
    const times = slots.map(s => s.time)
    const warnTimes = slots.filter(s => s.warn).map(s => s.time) // útidő miatt szoros
    return NextResponse.json({ date, times, warnTimes, slots_full: slots }, { headers: CORS })
  } catch (e) {
    console.error('slots error', e)
    return NextResponse.json({ error: e.message || 'szerver hiba' },
      { status: 500, headers: CORS })
  }
}
