export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const host = process.env.EMAIL_IMAP_HOST
  const user = process.env.EMAIL_IMAP_USER
  const pass = process.env.EMAIL_IMAP_PASS
  const port = parseInt(process.env.EMAIL_IMAP_PORT || '993')
  if (!host || !user || !pass) return Response.json({ ok: false, reason: 'not configured' })
  try {
    const { ImapFlow } = await import('imapflow')
    const client = new ImapFlow({ host, port, secure: true, auth: { user, pass }, logger: false, tls: { rejectUnauthorized: false } })
    await client.connect()
    const status = await client.status('INBOX', { unseen: true })
    await client.logout()
    return Response.json({ ok: true, unread: status.unseen || 0 })
  } catch(e) {
    return Response.json({ ok: false, reason: e.message })
  }
}
