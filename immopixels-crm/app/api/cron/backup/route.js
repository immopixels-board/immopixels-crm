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
    const [cards, columns, clients, phone_book] = await Promise.all([
      supabase.from('cards').select('*'),
      supabase.from('columns').select('*'),
      supabase.from('clients').select('*'),
      supabase.from('phone_book').select('*'),
    ])

    const payload = {
      cards: cards.data || [],
      columns: columns.data || [],
      clients: clients.data || [],
      phone_book: phone_book.data || [],
    }

    // Save backup
    await supabase.from('backups').insert({
      created_at: new Date().toISOString(),
      data: payload,
      cards_count: payload.cards.length,
      clients_count: payload.clients.length,
    })

    // Delete backups older than 30 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    await supabase.from('backups').delete().lt('created_at', cutoff.toISOString())

    return Response.json({ ok: true, cards: payload.cards.length, clients: payload.clients.length })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
