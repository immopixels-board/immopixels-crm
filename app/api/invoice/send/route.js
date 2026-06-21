import nodemailer from 'nodemailer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req) {
  let b
  try { b = await req.json() } catch { return Response.json({ ok: false, error: 'bad json' }, { status: 400 }) }
  const { to, subject, text, html, bcc, pdfBase64, filename, smtp } = b || {}
  if (!to || !/.+@.+\..+/.test(String(to))) return Response.json({ ok: false, error: 'Empfänger-E-Mail fehlt oder ungültig' })

  const cfg = smtp || {}
  const host = cfg.host || process.env.SMTP_HOST
  const port = Number(cfg.port || process.env.SMTP_PORT || 465)
  const user = cfg.user || process.env.SMTP_USER
  const pass = cfg.pass || process.env.SMTP_PASS
  if (!host || !user || !pass) return Response.json({ ok: false, error: 'SMTP nicht konfiguriert — Host/Benutzer/Passwort fehlen (in den Rechnungs-Einstellungen oder als Vercel-Env)' })
  const fromName = cfg.fromName || process.env.SMTP_FROM_NAME || 'ImmoPixels'
  const transporter = nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: { user, pass },
    tls: { minVersion: 'TLSv1.2' }
  })

  try {
    const attachments = pdfBase64 ? [{ filename: filename || 'Rechnung.pdf', content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }] : []
    const info = await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to,
      bcc: bcc || process.env.INVOICE_BCC || undefined,
      replyTo: user,
      subject: subject || 'Ihre Rechnung',
      text: text || '',
      html: html || undefined,
      attachments
    })
    return Response.json({ ok: true, id: info.messageId })
  } catch (e) {
    return Response.json({ ok: false, error: e?.message || 'SMTP-Fehler' })
  }
}
