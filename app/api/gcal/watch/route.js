import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CALS_PULL = [
  { id: 'immopixels@gmail.com', init: 'CD' },
  { id: '66d96a2869c084e8e329d2905619613afbdbbe253fc72b1de8a83cb8a424f966@group.calendar.google.com', init: 'DB' },
  { id: '227726e59806a3556283ba31ed000c7c103f67932c55102f2659cd0c0c24b71b@group.calendar.google.com', init: 'EL' },
  { id: '5281af37de6046e897661f80b40034e6e368a611e6514e09b8300c5068f22e61@group.calendar.google.com', init: 'NS' },
]

async function getToken(supabase) {
  const { data } = await supabase.from('gcal_tokens').select('*')
    .order('updated_at', { ascending: false }).limit(1).single()
  return data?.access_token || null
}

export async function GET(req) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const token = await getToken(supabase)
  if (!token) return Response.json({ ok: false, reason: 'no token' })

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://immopixels-crm.vercel.app'}/api/gcal/webhook`
  const results = []

  for (const cal of CALS_PULL) {
    try {
      const channelId = `ip-crm-${cal.init.toLowerCase()}-${Date.now()}`
      const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days

      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events/watch`,
        {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: channelId,
            type: 'web_hook',
            address: webhookUrl,
            expiration: expiry.toString(),
          })
        }
      )
      const data = await r.json()
      results.push({ cal: cal.init, ok: r.ok, channelId: data.id, resourceId: data.resourceId })

      // Save channel info for later stop/renew
      if (r.ok && data.id) {
        await supabase.from('settings').upsert({
          key: `gcal_watch_${cal.init}`,
          value: JSON.stringify({ channelId: data.id, resourceId: data.resourceId, expiry })
        }, { onConflict: 'key' })
      }
    } catch (e) {
      results.push({ cal: cal.init, ok: false, error: e.message })
    }
  }

  return Response.json({ ok: true, results })
}
