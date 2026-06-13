import { NextResponse } from 'next/server'

// A demo jelszókapu (DEMO_GATE_PASSWORD / /demo-gate) el lett távolítva.
// A demón nincs külön "első login" — csak a sima CRM-login marad.
export function middleware() {
  return NextResponse.next()
}

export const config = { matcher: '/((?!_next/static|_next/image|favicon.ico).*)' }
