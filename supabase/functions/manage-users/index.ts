import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
const allowedPermissions = new Set(['dashboard', 'customers', 'follow_ups', 'visit_plans', 'calls', 'reports', 'sales_team', 'notifications', 'settings', 'user_management'])
const passwordValid = (value: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value)

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('Authorization') || '' } } })
  const adminClient = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: authData } = await userClient.auth.getUser()
  if (!authData.user) return json({ error: 'Unauthorized' }, 401)
  const actorId = authData.user.id
  const { data: actor } = await adminClient.from('profiles').select('role,is_active').eq('id', actorId).single()
  if (actor?.role !== 'admin' || !actor.is_active) return json({ error: 'Admin access required' }, 403)

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return json({ error: 'Invalid request body' }, 400) }
  const action = String(body.action || 'create')
  const targetId = String(body.user_id || '')
  const log = async (type: string, id: string | null, details: Record<string, unknown> = {}) => {
    await adminClient.from('user_audit_logs').insert({ actor_id: actorId, target_user_id: id, action: type, details })
  }
  if (targetId === actorId && ['delete', 'set_active'].includes(action)) return json({ error: 'អ្នកមិនអាចបិទ ឬលុបគណនីខ្លួនឯងបានទេ' }, 400)

  if (action === 'delete') {
    const { error } = await adminClient.auth.admin.deleteUser(targetId)
    if (error) return json({ error: error.message }, error.status || 400)
    await log('user_deleted', null, { deleted_user_id: targetId })
    return json({ success: true })
  }
  if (action === 'set_active') {
    const isActive = Boolean(body.is_active)
    const { error } = await adminClient.from('profiles').update({ is_active: isActive }).eq('id', targetId)
    if (error) return json({ error: error.message }, 400)
    await log(isActive ? 'user_activated' : 'user_deactivated', targetId)
    return json({ success: true })
  }
  if (action === 'reset_password') {
    const password = String(body.password || '')
    if (!passwordValid(password)) return json({ error: 'Password មិនមានសុវត្ថិភាពគ្រប់គ្រាន់' }, 400)
    const { error } = await adminClient.auth.admin.updateUserById(targetId, { password })
    if (error) return json({ error: error.message }, error.status || 400)
    await log('password_reset', targetId)
    return json({ success: true })
  }

  const fullName = String(body.full_name || '').replace(/[<>]/g, '').trim()
  const phone = String(body.phone || '').replace(/[<>]/g, '').trim() || null
  const role = ['admin', 'manager', 'sales', 'user'].includes(String(body.role)) ? String(body.role) : 'user'
  const permissions = role === 'admin' ? [...allowedPermissions] : [...new Set(Array.isArray(body.permissions) ? body.permissions.filter(key => typeof key === 'string' && allowedPermissions.has(key)) : [])]
  if (!fullName) return json({ error: 'ឈ្មោះមិនត្រឹមត្រូវ' }, 400)

  if (action === 'update') {
    const { error } = await adminClient.from('profiles').update({ full_name: fullName, phone, role, permissions }).eq('id', targetId)
    if (error) return json({ error: error.message }, 400)
    await adminClient.auth.admin.updateUserById(targetId, { user_metadata: { full_name: fullName } })
    await log('user_updated', targetId, { role, permissions })
    return json({ success: true })
  }

  const username = String(body.username || '').trim().toLowerCase()
  const password = String(body.password || '')
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return json({ error: 'Username មិនត្រឹមត្រូវ' }, 400)
  if (!passwordValid(password)) return json({ error: 'Password មិនមានសុវត្ថិភាពគ្រប់គ្រាន់' }, 400)
  const email = `${username}@users.crm.local`
  const { data, error } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, username } })
  if (error) return json({ error: error.message.toLowerCase().includes('already') ? 'Username នេះមានរួចហើយ' : error.message }, error.status || 400)
  const { error: profileError } = await adminClient.from('profiles').update({ full_name: fullName, username, phone, role, permissions, is_active: true }).eq('id', data.user.id)
  if (profileError) { await adminClient.auth.admin.deleteUser(data.user.id); return json({ error: profileError.message }, 400) }
  await log('user_created', data.user.id, { username, role, permissions })
  return json({ user: { id: data.user.id, username, role, permissions } }, 201)
})
