import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean).map(line => {
  const index = line.indexOf('=')
  return [line.slice(0, index), line.slice(index + 1)]
}))
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { error: loginError } = await client.auth.signInWithPassword({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
if (loginError) { console.error(JSON.stringify({ ok: false, stage: 'login', message: loginError.message })); process.exit(1) }
const { data, error } = await client.functions.invoke('manage-sales', { body: { full_name: '', email: '', password: '' } })
await client.auth.signOut()
let errorBody = null
try { errorBody = error?.context ? await error.context.clone().json() : null } catch { /* response body is optional */ }
const expectedValidation = error?.context?.status === 400 && errorBody?.error?.includes('មិនត្រឹមត្រូវ')
console.log(JSON.stringify({ ok: expectedValidation, reachable: error?.context?.status === 400, admin_authorized: expectedValidation }))
if (!expectedValidation) process.exit(1)
