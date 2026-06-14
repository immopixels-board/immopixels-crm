import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req) {
  try {
    const { cardTitle, driveLink, clientName, staffName, cardDate, extraEmail } = await req.json()

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_IMAP_HOST,
      port: 465,
      secure: true,
      auth: { user: process.env.EMAIL_IMAP_USER, pass: process.env.EMAIL_IMAP_PASS }
    })

    const subject = `✅ Fotos fertig: ${cardTitle}`
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
        <div style="background:#6b6b6e;padding:16px 20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:16px">📸 Fotos hochgeladen</h2>
        </div>
        <div style="background:#f9f7f4;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e4e0d9">
          <p style="margin:0 0 12px;font-size:14px;color:#1c1a16">Die Fotos für <strong>${cardTitle}</strong> wurden erfolgreich hochgeladen.</p>
          ${clientName ? `<p style="margin:0 0 8px;font-size:13px;color:#666">Kunde: <strong>${clientName}</strong></p>` : ''}
          ${cardDate ? `<p style="margin:0 0 8px;font-size:13px;color:#666">Datum: <strong>${cardDate}</strong></p>` : ''}
          ${staffName ? `<p style="margin:0 0 12px;font-size:13px;color:#666">Bearbeitet von: <strong>${staffName}</strong></p>` : ''}
          <a href="${driveLink}" style="display:inline-block;background:#6b6b6e;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px">📁 Drive-Link öffnen</a>
          <p style="margin:16px 0 0;font-size:11px;color:#aaa">Automatische Benachrichtigung vom ImmoPixels CRM</p>
        </div>
      </div>`

    // Send to main + extra email
    const toList = [process.env.EMAIL_IMAP_USER]
    if (extraEmail && extraEmail !== process.env.EMAIL_IMAP_USER) toList.push(extraEmail)

    await transporter.sendMail({
      from: `"ImmoPixels CRM" <${process.env.EMAIL_IMAP_USER}>`,
      to: toList.join(', '),
      subject,
      html
    })

    return NextResponse.json({ ok: true })
  } catch(e) {
    console.error('Drive notify error:', e)
    return NextResponse.json({ ok: false, error: e.message })
  }
}
