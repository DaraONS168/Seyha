import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean).map(line => {
  const index = line.indexOf('=')
  return [line.slice(0, index), line.slice(index + 1)]
}))
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { error: loginError } = await client.auth.signInWithPassword({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
if (loginError) { console.error(JSON.stringify({ ok: false, stage: 'login', message: loginError.message })); process.exit(1) }
const { data, error } = await client.functions.invoke('manage-sales', { body: {
  full_name: process.env.SALES_NAME, email: process.env.SALES_EMAIL,
  phone: process.env.SALES_PHONE, password: process.env.SALES_PASSWORD,
} })
if (error) {
  let body = null
  try { body = await error.context.clone().json() } catch { /* no body */ }
  console.error(JSON.stringify({ ok: false, stage: 'function', status: error.context?.status, message: body?.error || error.message }))
  await client.auth.signOut()
  process.exit(1)
}
await client.auth.signOut()
console.log(JSON.stringify({ ok: true, user: data.user }))
