// Billomat REST API helper — SZERVER OLDAL ONLY (env-kulcsokat használ).
// Soha ne importáld kliens-komponensből.
const BILLOMAT_ID = process.env.BILLOMAT_ID
const API_KEY = process.env.BILLOMAT_API_KEY
const APP_ID = process.env.BILLOMAT_APP_ID
const APP_SECRET = process.env.BILLOMAT_APP_SECRET

function base() {
  return `https://${BILLOMAT_ID}.billomat.net/api`
}

function buildHeaders() {
  const h = {
    'X-BillomatApiKey': API_KEY || '',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
  if (APP_ID) h['X-AppId'] = APP_ID
  if (APP_SECRET) h['X-AppSecret'] = APP_SECRET
  return h
}

export function billomatConfigured() {
  return !!(BILLOMAT_ID && API_KEY)
}

async function call(method, path, body) {
  if (!billomatConfigured()) {
    return { ok: false, status: 0, data: null, raw: 'Billomat env hiányzik (BILLOMAT_ID / BILLOMAT_API_KEY)' }
  }
  let r
  try {
    r = await fetch(base() + path, {
      method,
      headers: buildHeaders(),
      body: body == null ? undefined : JSON.stringify(body),
      cache: 'no-store',
    })
  } catch (e) {
    return { ok: false, status: 0, data: null, raw: 'fetch error: ' + (e?.message || e) }
  }
  const text = await r.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* nem JSON */ }
  return { ok: r.ok, status: r.status, data, raw: text }
}

export function billomatGet(path) { return call('GET', path) }
export function billomatPost(path, body) { return call('POST', path, body) }
export function billomatPut(path, body) { return call('PUT', path, body) }
