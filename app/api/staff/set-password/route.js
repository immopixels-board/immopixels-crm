import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  const { email, password } = await req.json()
  if (!email || !password || password.length < 6) {
    return Response.json({ ok: false, reason: 'invalid' }, { status: 400 })
  }
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  // Find user by email
  const { data: users } = await admin.auth.admin.listUsers()
  const user = (users?.users || []).find(u => u.email === email)
  if (!user) {
    // Create auth user if not exists
    const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password })
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true })
}
