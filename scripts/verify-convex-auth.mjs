import fs from 'node:fs'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const CLERK_KEY = env.CLERK_SECRET_KEY
const CONVEX_URL = env.NEXT_PUBLIC_CONVEX_URL
if (!CLERK_KEY || !CONVEX_URL) { console.error('missing env'); process.exit(1) }

const clerkApi = async (path, opts = {}) => {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${CLERK_KEY}`, 'Content-Type': 'application/json' },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(body).slice(0, 300)}`)
  return body
}

// 1. usuario admin
const users = await clerkApi('/users?email_address=juanfranbrv@gmail.com')
const userId = users[0]?.id
console.log('[1] clerk user:', userId)

// 2. sesión + token con template convex
const session = await clerkApi('/sessions', { method: 'POST', body: JSON.stringify({ user_id: userId }) })
console.log('[2] session created:', session.id)
let jwt
try {
  const tokenRes = await clerkApi(`/sessions/${session.id}/tokens/convex`, { method: 'POST', body: JSON.stringify({}) })
  jwt = tokenRes.jwt
  console.log('[2] JWT template "convex": OK (token emitido)')
} catch (e) {
  console.error('[2] FALLO emitiendo token con template "convex" — ¿existe el template en el dashboard de Clerk?')
  console.error('    ', e.message)
  process.exit(2)
}

// 3. negativo: sin token → debe rechazar
const anon = new ConvexHttpClient(CONVEX_URL)
try {
  await anon.query(api.users.getCredits, { clerk_id: userId })
  console.error('[3] FALLO: la query sin token NO fue rechazada')
} catch (e) {
  console.log('[3] sin token -> rechazada ✔ (', String(e.message).split('\n')[0].slice(0, 110), ')')
}

// 4. positivo: con token e id propio → debe funcionar
const authed = new ConvexHttpClient(CONVEX_URL)
authed.setAuth(jwt)
try {
  const credits = await authed.query(api.users.getCredits, { clerk_id: userId })
  console.log('[4] con token + id propio -> OK ✔ credits:', credits?.credits, 'status:', credits?.status)
} catch (e) {
  console.error('[4] FALLO: query autenticada rechazada:', String(e.message).split('\n')[0].slice(0, 200))
}

// 5. negativo: con token pero id ajeno → debe rechazar
try {
  await authed.query(api.users.getCredits, { clerk_id: 'user_fake_attacker_id' })
  console.error('[5] FALLO: id ajeno NO fue rechazado')
} catch (e) {
  console.log('[5] con token + id ajeno -> rechazada ✔ (', String(e.message).split('\n')[0].slice(0, 110), ')')
}

// 6. negativo admin: brands.debugBrandDNAStats sin token → rechazada; con token admin → OK
try {
  await anon.query(api.brands.debugBrandDNAStats, {})
  console.error('[6a] FALLO: debugBrandDNAStats sin token NO fue rechazada')
} catch {
  console.log('[6a] admin query sin token -> rechazada ✔')
}
try {
  const stats = await authed.query(api.brands.debugBrandDNAStats, {})
  console.log('[6b] admin query con token admin -> OK ✔ total kits:', stats?.total)
} catch (e) {
  console.error('[6b] FALLO: admin query con token admin rechazada:', String(e.message).split('\n')[0].slice(0, 200))
}

// limpieza: revocar sesión creada
await clerkApi(`/sessions/${session.id}/revoke`, { method: 'POST' }).catch(() => {})
console.log('[7] sesión de prueba revocada')
