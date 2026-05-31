import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1)
  const midnight = new Date(yesterday.getFullYear(),yesterday.getMonth(),yesterday.getDate(),23,59,0)
  const { data: open } = await supabase.from('work_sessions').select('id').is('check_out',null).lt('check_in',midnight.toISOString())
  if (open?.length) {
    await supabase.from('work_sessions').update({ check_out:midnight.toISOString(), auto_checkout:true, note:'Automatischer Checkout um Mitternacht' }).in('id',open.map(s=>s.id))
  }
  return NextResponse.json({ ok:true, closed:open?.length||0 })
}
