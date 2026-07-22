import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
const legacyPermissions = new Set(['dashboard', 'customers', 'follow_ups', 'visit_plans', 'calls', 'reports', 'sales_team', 'notifications', 'settings', 'user_management', 'vehicles.manage', 'expenses.budgets.manage', 'fuel.budgets.manage'])
const permissionModules = new Set(['dashboard', 'notifications', 'customers', 'follow_ups', 'visit_plans', 'calls', 'reports', 'sales_team', 'markets', 'expenses', 'expenses.budgets', 'fuel', 'fuel.budgets', 'vehicles', 'users', 'settings'])
const permissionActions = new Set(['view', 'create', 'update', 'delete', 'restore', 'import', 'export', 'view_audit', 'submit', 'approve', 'pay', 'actual', 'complete', 'reopen', 'override_limit', 'audit', 'reports', 'revise', 'fiscal_lock', 'verify'])
const permissionValid = (key: unknown) => {
  if (typeof key !== 'string') return false
  if (legacyPermissions.has(key)) return true
  const parts = key.split('.')
  const action = parts.pop() || ''
  return permissionModules.has(parts.join('.')) && permissionActions.has(action)
}
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
  const { data: actor } = await adminClient.from('profiles').select('role,is_active,permissions,app_role:app_roles!profiles_role_fkey(permissions)').eq('id', actorId).single()
  if (!actor?.is_active) return json({ error: 'Active account required' }, 403)

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return json({ error: 'Invalid request body' }, 400) }
  const action = String(body.action || 'create')
  const actorPermissions = ((actor.app_role as { permissions?: string[] } | null)?.permissions || actor.permissions || []) as string[]
  const requiredPermission = action === 'create' || action === 'create_role' ? 'users.create' : action === 'delete' || action === 'delete_role' ? 'users.delete' : 'users.update'
  if (actor.role !== 'admin' && !actorPermissions.includes(requiredPermission)) return json({ error: `Permission ${requiredPermission} required` }, 403)
  const targetId = String(body.user_id || '')
  const log = async (type: string, id: string | null, details: Record<string, unknown> = {}) => {
    await adminClient.from('user_audit_logs').insert({ actor_id: actorId, target_user_id: id, action: type, details })
  }
  if (targetId === actorId && ['delete', 'set_active'].includes(action)) return json({ error: 'អ្នកមិនអាចបិទ ឬលុបគណនីខ្លួនឯងបានទេ' }, 400)

  if (action === 'create_role') {
    const name = String(body.name || '').replace(/[<>]/g, '').trim()
    const permissions = [...new Set(Array.isArray(body.permissions) ? body.permissions.filter(permissionValid) : [])]
    if (name.length < 2 || name.length > 50) return json({ error: 'ឈ្មោះ Role ត្រូវមាន 2-50 តួ' }, 400)
    const key = `custom_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
    const { data, error } = await adminClient.from('app_roles').insert({ key, name, permissions }).select().single()
    if (error) return json({ error: error.code === '23505' ? 'ឈ្មោះ Role នេះមានរួចហើយ' : error.message }, 400)
    await log('role_created', null, { role_key: key, name, permissions })
    return json({ role: data }, 201)
  }
  if (action === 'update_role') {
    const roleKey = String(body.role_key || '')
    const name = String(body.name || '').replace(/[<>]/g, '').trim()
    const permissions = [...new Set(Array.isArray(body.permissions) ? body.permissions.filter(permissionValid) : [])]
    if (name.length < 2 || permissions.length === 0) return json({ error: 'Role និង Permissions មិនត្រឹមត្រូវ' }, 400)
    if (roleKey === 'admin') return json({ error: 'Administrator មានសិទ្ធិទាំងអស់ និងមិនអាចកែបាន' }, 400)
    const { data, error } = await adminClient.from('app_roles').update({ name, permissions }).eq('key', roleKey).select().single()
    if (error) return json({ error: error.message }, 400)
    await adminClient.from('profiles').update({ permissions }).eq('role', roleKey)
    await log('role_updated', null, { role_key: roleKey, name, permissions })
    return json({ role: data })
  }
  if (action === 'delete_role') {
    const roleKey = String(body.role_key || '')
    const { data: role } = await adminClient.from('app_roles').select('is_system').eq('key', roleKey).single()
    if (!role || role.is_system) return json({ error: 'System Role មិនអាចលុបបានទេ' }, 400)
    const { count } = await adminClient.from('profiles').select('id', { count: 'exact', head: true }).eq('role', roleKey)
    if (count) return json({ error: `Role នេះកំពុងប្រើដោយ User ${count} នាក់` }, 400)
    const { error } = await adminClient.from('app_roles').delete().eq('key', roleKey)
    if (error) return json({ error: error.message }, 400)
    await log('role_deleted', null, { role_key: roleKey })
    return json({ success: true })
  }

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
  const requestedRole = String(body.role || 'user')
  const { data: selectedRole } = await adminClient.from('app_roles').select('key,permissions').eq('key', requestedRole).single()
  if (!selectedRole) return json({ error: 'Role មិនត្រឹមត្រូវ' }, 400)
  const role = selectedRole.key
  const permissions = selectedRole.permissions
  const provinceId = body.province_id ? Number(body.province_id) : null
  const districtId = body.district_id ? Number(body.district_id) : null
  if (districtId) {
    const { data: district } = await adminClient.from('districts').select('province_id').eq('id', districtId).single()
    if (!district || district.province_id !== provinceId) return json({ error: 'District មិនស្ថិតក្នុង Province ដែលបានជ្រើស' }, 400)
  }
  if (!fullName) return json({ error: 'ឈ្មោះមិនត្រឹមត្រូវ' }, 400)
  if (action === 'update' && targetId === actorId && role !== actor.role) return json({ error: 'អ្នកមិនអាចប្ដូរ Role របស់ខ្លួនឯងបានទេ' }, 400)

  if (action === 'update') {
    const { error } = await adminClient.from('profiles').update({ full_name: fullName, phone, role, permissions, province_id: provinceId, district_id: districtId }).eq('id', targetId)
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
  const { error: profileError } = await adminClient.from('profiles').update({ full_name: fullName, username, phone, role, permissions, province_id: provinceId, district_id: districtId, is_active: true }).eq('id', data.user.id)
  if (profileError) { await adminClient.auth.admin.deleteUser(data.user.id); return json({ error: profileError.message }, 400) }
  await log('user_created', data.user.id, { username, role, permissions })
  return json({ user: { id: data.user.id, username, role, permissions } }, 201)
})
