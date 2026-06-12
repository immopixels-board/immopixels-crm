import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const runtime = 'nodejs'
export const maxDuration = 15

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// GET ?init=XX&sel=1 → 76×76 kör alakú, keretes marker-PNG a fotós avatarjából
// (a Static Maps "icon:" paraméteréhez). Avatar nélkül: betűs kör.
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const init = (searchParams.get('init') || '').slice(0, 8)
  const sel = searchParams.get('sel') === '1'
  if (!init) return new NextResponse('init fehlt', { status: 400 })
  const ring = sel ? '#b8892a' : '#8d8478'
  try {
    const sharp = (await import('sharp')).default
    let avatarTag = null
    try {
      const { data: st } = await sb().from('staff').select('avatar_url').eq('init', init).maybeSingle()
      if (st?.avatar_url) {
        const r = await fetch(st.avatar_url)
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer())
          const small = await sharp(buf).resize(60, 60, { fit: 'cover' }).png().toBuffer()
          avatarTag = `<image x="8" y="8" width="60" height="60" clip-path="url(#c)" href="data:image/png;base64,${small.toString('base64')}"/>`
        }
      }
    } catch {}
    const inner = avatarTag ||
      `<circle cx="38" cy="38" r="30" fill="#f0ece4"/><text x="38" y="38" text-anchor="middle" dominant-baseline="central" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="bold" fill="${ring}">${init[0].toUpperCase()}</text>`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="76" height="76">
      <defs><clipPath id="c"><circle cx="38" cy="38" r="30"/></clipPath></defs>
      <circle cx="38" cy="38" r="36" fill="${ring}"/>
      <circle cx="38" cy="38" r="32.5" fill="#ffffff"/>
      ${inner}
    </svg>`
    const png = await sharp(Buffer.from(svg)).png().toBuffer()
    return new NextResponse(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400, s-maxage=86400' } })
  } catch (e) {
    return new NextResponse('marker error: ' + String(e?.message || e), { status: 500 })
  }
}
