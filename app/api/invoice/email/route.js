import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req) {
  let body
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
  const { to, subject, body: text, greeting, pdfBase64, filename, seller } = body || {}
  if (!to || !pdfBase64) return NextResponse.json({ ok: false, error: 'Empfänger oder PDF fehlt' }, { status: 400 })
  const host = process.env.EMAIL_IMAP_HOST
  const user = process.env.EMAIL_INVOICE_USER || process.env.EMAIL_IMAP_USER
  const pass = process.env.EMAIL_INVOICE_PASS || process.env.EMAIL_IMAP_PASS
  if (!host || !user || !pass) return NextResponse.json({ ok: false, error: 'E-Mail-Versand nicht konfiguriert (EMAIL_IMAP_HOST/USER/PASS)' }, { status: 500 })
  const from = process.env.EMAIL_INVOICE_FROM || 'rechnung@immopixels.de'
  const s = seller || {}
  const esc = x => String(x || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const footerLines = [
    [s.name || 'ImmoPixels e.K.', s.street, [s.zip, s.city].filter(Boolean).join(' '), s.vatId ? 'USt-IdNr: ' + s.vatId : ''].filter(Boolean).join(' · '),
    [s.phone, s.email || 'rechnung@immopixels.de', s.web || 'www.immopixels.de'].filter(Boolean).join(' · '),
    [s.bank, s.bic ? 'BIC: ' + s.bic : '', s.iban ? 'IBAN: ' + s.iban : ''].filter(Boolean).join(' · ')
  ].filter(Boolean)
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;color:#2a2a28;line-height:1.6;font-size:14px">
    <p>${esc(greeting || 'Sehr geehrte Damen und Herren,')}</p>
    <p style="white-space:pre-wrap">${esc(text || '')}</p>
    <p style="margin-top:18px">Freundliche Grüße<br><strong>ImmoPixels</strong></p>
    <hr style="border:none;border-top:1px solid #e6ddc9;margin:16px 0">
    <div style="font-size:12px;color:#8a8278">${footerLines.map(l => esc(l)).join('<br>')}</div>
  </div>`
  const plain = (greeting || 'Sehr geehrte Damen und Herren,') + '\n\n' + (text || '') + '\n\nFreundliche Grüße\nImmoPixels\n\n' + footerLines.join('\n')
  try {
    const nodemailer = await import('nodemailer')
    const t = nodemailer.default.createTransport({ host, port: 465, secure: true, auth: { user, pass } })
    await t.sendMail({
      from: `"ImmoPixels" <${from}>`, sender: user, replyTo: from, to,
      subject: subject || 'Ihre Rechnung von ImmoPixels',
      text: plain, html,
      attachments: [{ filename: filename || 'Rechnung.pdf', content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }]
    })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 }) }
}
