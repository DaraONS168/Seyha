import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
const allowedPermissions = new Set(['dashboard', 'customers', 'follow_ups', 'visit_plans', 'calls', 'reports', 'sales_team', 'notifications', 'settings', 'user_management'])

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('Authorization') || '' } } })
  const adminClient = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: authData } = await userClient.auth.getUser()
  if (!authData.user) return json({ error: 'Unauthorized' }, 401)
  const { data: actor } = await adminClient.from('profiles').select('role,is_active').eq('id', authData.user.id).single()
  if (actor?.role !== 'admin' || !actor.is_active) return json({ error: 'Admin access required' }, 403)

  const body = await request.json()
  const fullName = String(body.full_name || '').replace(/[<>]/g, '').trim()
  const username = String(body.username || '').trim().toLowerCase()
  const password = String(body.password || '')
  const phone = String(body.phone || '').replace(/[<>]/g, '').trim() || null
  const role = ['admin', 'manager', 'sales'].includes(body.role) ? body.role : 'sales'
  const permissions = role === 'admin' ? [...allowedPermissions] : [...new Set(Array.isArray(body.permissions) ? body.permissions.filter((key: string) => allowedPermissions.has(key)) : [])]
  if (!fullName || !/^[a-z0-9._-]{3,30}$/.test(username)) return json({ error: 'ឈ្មោះ ឬ Username មិនត្រឹមត្រូវ' }, 400)
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) return json({ error: 'Password មិនមានសុវត្ថិភាពគ្រប់គ្រាន់' }, 400)

  const email = `${username}@users.crm.local`
  const { data, error } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, username } })
  if (error) return json({ error: error.message.toLowerCase().includes('already') ? 'Username នេះមានរួចហើយ' : error.message }, error.status || 400)
  const { error: profileError } = await adminClient.from('profiles').update({ full_name: fullName, username, phone, role, permissions, is_active: true }).eq('id', data.user.id)
  if (profileError) { await adminClient.auth.admin.deleteUser(data.user.id); return json({ error: profileError.message }, 400) }
  return json({ user: { id: data.user.id, username, role, permissions } }, 201)
})
