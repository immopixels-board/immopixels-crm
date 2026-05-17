import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Get all valid gcal tokens from staff table
    const { data: tokens } = await supabase
      .from('gcal_tokens')
      .select('*')
      .gt('expires_at', new Date().toISOString())

    if (!tokens || tokens.length === 0) {
      return Response.json({ ok: true, message: 'No valid tokens' })
    }

    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const end = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

    let totalEvents = 0
    for (const t of tokens) {
      try {
        const resp = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: 'Bearer ' + t.access_token } }
        )
        if (!resp.ok) continue
        const data = await resp.json()
        const events = data.items || []
        totalEvents += events.length

        await supabase.from('gcal_snapshots').insert({
          staff_id: t.staff_id,
          snapshot_at: new Date().toISOString(),
          events: events,
          events_count: events.length,
        })
      } catch (e) { /* skip this token */ }
    }

    // Delete snapshots older than 30 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    await supabase.from('gcal_snapshots').delete().lt('snapshot_at', cutoff.toISOString())

    return Response.json({ ok: true, tokens: tokens.length, events: totalEvents })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
