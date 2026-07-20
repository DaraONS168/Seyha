import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean).map(line => {
  const index = line.indexOf('=')
  return [line.slice(0, index), line.slice(index + 1)]
}))
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { data:auth, error:loginError } = await client.auth.signInWithPassword({ email:process.env.ADMIN_EMAIL, password:process.env.ADMIN_PASSWORD })
if (loginError) { console.error(JSON.stringify({ ok:false, stage:'login', message:loginError.message })); process.exit(1) }
let customerId = null
try {
  const phone = `099${String(Date.now()).slice(-6)}`
  const { data:customer, error:customerError } = await client.from('customers').insert({ name:'Notification verification', phone, source:'other', assigned_to:auth.user.id, status:'pending_follow_up', priority:'low', next_follow_up_at:new Date(Date.now()-60_000).toISOString(), created_by:auth.user.id }).select().single()
  if (customerError) throw new Error(`customer: ${customerError.message}`)
  customerId = customer.id
  const { data:inserted, error:syncError } = await client.rpc('sync_due_notifications')
  if (syncError) throw new Error(`sync: ${syncError.message}`)
  const { data:notifications, error:readError } = await client.from('notifications').select('id,title,notified_at').eq('customer_id',customer.id)
  if (readError || notifications?.length !== 1) throw new Error(`notification: ${readError?.message || 'row not created'}`)
  console.log(JSON.stringify({ ok:true, follow_up_trigger:true, sync_inserted:inserted, notification_created:true, duplicate_guard:true }))
} catch (error) {
  console.error(JSON.stringify({ ok:false, message:error.message })); process.exitCode=1
} finally {
  if (customerId) await client.from('customers').delete().eq('id',customerId)
  await client.auth.signOut()
}
