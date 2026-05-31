import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req) {
  const state = req.headers.get('x-goog-resource-state')
  if (state === 'sync') return new Response('OK', { status: 200 })
  if (state !== 'exists') return new Response('OK', { status: 200 })

  // Trigger sync
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://immopixels-crm.vercel.app'
  fetch(`${baseUrl}/api/gcal/sync`, { method: 'POST' }).catch(() => {})

  return new Response('OK', { status: 200 })
}
