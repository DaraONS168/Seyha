import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean).map(line => {
  const index = line.indexOf('=')
  return [line.slice(0, index), line.slice(index + 1)]
}))
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { data: auth, error: loginError } = await client.auth.signInWithPassword({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
if (loginError) { console.error(JSON.stringify({ ok:false, stage:'login', message:loginError.message })); process.exit(1) }
const now = new Date().toISOString()
const [{ data: due, error: dueError }, { data: syncCount, error: syncError }, { data: notifications, error: notificationError }] = await Promise.all([
  client.from('follow_ups').select('id,assigned_to,follow_up_at,status,customer:customers(name,status)').eq('status','pending').lte('follow_up_at',now),
  client.rpc('sync_due_notifications'),
  client.from('notifications').select('id,user_id,customer_id,is_read,notified_at,notification_type').order('created_at',{ ascending:false }).limit(100),
])
await client.auth.signOut()
const error = dueError || syncError || notificationError
if (error) { console.error(JSON.stringify({ ok:false, stage:'query', message:error.message })); process.exit(1) }
console.log(JSON.stringify({
  ok:true,
  current_user_id:auth.user.id,
  pending_due_total:(due || []).filter(item => !['converted','cancelled'].includes(item.customer?.status)).length,
  pending_due_assigned_to_current:(due || []).filter(item => item.assigned_to === auth.user.id && !['converted','cancelled'].includes(item.customer?.status)).length,
  notification_rows_visible:notifications?.length || 0,
  unread_visible:(notifications || []).filter(item => !item.is_read).length,
  browser_unsent_visible:(notifications || []).filter(item => !item.notified_at).length,
  sync_inserted:syncCount || 0,
}))
