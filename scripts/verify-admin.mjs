import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean).map(line => {
  const index = line.indexOf('=')
  return [line.slice(0, index), line.slice(index + 1)]
}))
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { data: auth, error: authError } = await client.auth.signInWithPassword({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
if (authError) { console.error(JSON.stringify({ ok: false, stage: 'login', message: authError.message })); process.exit(1) }
const { data: profile, error: profileError } = await client.from('profiles').select('id,email,full_name,role,is_active').eq('id', auth.user.id).single()
await client.auth.signOut()
if (profileError) { console.error(JSON.stringify({ ok: false, stage: 'profile', message: profileError.message })); process.exit(1) }
console.log(JSON.stringify({ ok: profile.role === 'admin' && profile.is_active, email: profile.email, full_name: profile.full_name, role: profile.role, is_active: profile.is_active }))
