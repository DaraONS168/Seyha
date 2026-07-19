import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authorization = request.headers.get('Authorization') || ''
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
  const adminClient = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401)
  const { data: profile } = await adminClient.from('profiles').select('role,is_active').eq('id', authData.user.id).single()
  if (profile?.role !== 'admin' || !profile.is_active) return json({ error: 'Admin access required' }, 403)

  let payload: { full_name?: string; email?: string; password?: string; phone?: string }
  try { payload = await request.json() } catch { return json({ error: 'Invalid request body' }, 400) }
  const fullName = String(payload.full_name || '').replace(/[<>]/g, '').trim()
  const email = String(payload.email || '').trim().toLowerCase()
  const password = String(payload.password || '')
  const phone = String(payload.phone || '').replace(/[<>]/g, '').trim() || null
  if (!fullName || !/^\S+@\S+\.\S+$/.test(email)) {
    return json({ error: 'ឈ្មោះ ឬអ៊ីមែលមិនត្រឹមត្រូវ' }, 400)
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    return json({ error: 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 8 តួ និងមានអក្សរធំ អក្សរតូច និងលេខ' }, 400)
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName },
  })
  if (error) {
    const message = error.message.toLowerCase().includes('already')
      ? 'អ៊ីមែលនេះមានគណនីរួចហើយ'
      : error.message.toLowerCase().includes('password')
        ? 'ពាក្យសម្ងាត់មិនមានសុវត្ថិភាពគ្រប់គ្រាន់'
        : error.message
    return json({ error: message }, error.status || 400)
  }
  const { error: profileError } = await adminClient.from('profiles').update({
    full_name: fullName, phone, role: 'sales', is_active: true,
  }).eq('id', data.user.id)
  if (profileError) {
    await adminClient.auth.admin.deleteUser(data.user.id)
    return json({ error: profileError.message }, 400)
  }
  return json({ user: { id: data.user.id, email, full_name: fullName, phone, role: 'sales' } }, 201)
})
