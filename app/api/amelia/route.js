export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BASE = process.env.AMELIA_WP_URL || 'https://immopixels.de'
const KEY = process.env.AMELIA_API_KEY || ''

async function ameliaFetch(path, options = {}) {
  const url = `${BASE}/wp-json/ipcrm/v1${path}`
  const res = await fetch(url, {
    ...options,
    headers: { 'X-IPCRM-Key': KEY, 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  return res.json()
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'appointments'
  const params = Object.fromEntries(searchParams.entries())
  delete params.action

  const query = new URLSearchParams(params).toString()
  const data = await ameliaFetch(`/${action}${query ? '?' + query : ''}`)
  return Response.json(data)
}

export async function POST(req) {
  const body = await req.json()
  const { action, id, ...rest } = body

  if (action === 'update_status') {
    const data = await ameliaFetch(`/appointments/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(rest)
    })
    return Response.json(data)
  }

  return Response.json({ ok: false, reason: 'unknown action' })
}
