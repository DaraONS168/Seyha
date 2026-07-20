import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean).map(line => {
    const index = line.indexOf('=')
    return [line.slice(0, index), line.slice(index + 1)]
  }),
)
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY || !email || !password) {
  console.error(JSON.stringify({ ok: false, message: 'Missing required configuration' }))
  process.exit(1)
}
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: 'ShadowPV Administrator' } } })
if (error) {
  console.error(JSON.stringify({ ok: false, message: error.message, status: error.status }))
  process.exit(1)
}
console.log(JSON.stringify({ ok: true, user_id: data.user?.id, email: data.user?.email, has_session: Boolean(data.session) }))
