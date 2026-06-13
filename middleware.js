import { NextResponse } from 'next/server'

// Közös jelszókapu az egész oldal elé — CSAK akkor aktív, ha a DEMO_GATE_PASSWORD
// env be van állítva (azaz a demo-deployon). Élesben (nincs env) semmi nem változik.
// A buchen/buchung/termin-bestaetigen publikus útvonalak kimaradnak, hogy a
// nyilvános foglalás a demón is működjön bemutatáshoz.
const PUBLIC_PREFIXES = ['/demo-gate', '/api/demo-gate', '/buchen', '/buchung', '/termin-bestaetigen', '/api/booking', '/favicon']

export function middleware(request) {
  const gatePw = process.env.DEMO_GATE_PASSWORD
  if (!gatePw) return NextResponse.next() // élesben kikapcsolva

  const { pathname } = request.nextUrl
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()

  const cookie = request.cookies.get('demo_gate')?.value
  if (cookie && cookie === gatePw) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = '/demo-gate'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = { matcher: '/((?!_next/static|_next/image|favicon.ico).*)' }
