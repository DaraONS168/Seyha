import { supabase } from './supabase'

const columns = '*, assigned:profiles!customers_assigned_to_fkey(id, full_name, email)'
export const customerService = {
  async list({ page = 1, pageSize = 10, search = '', status = '', priority = '', assignedTo = '', sort = 'newest' } = {}) {
    let query = supabase.from('customers').select(columns, { count: 'exact' })
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,alternative_phone.ilike.%${search}%`)
    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (assignedTo) query = query.eq('assigned_to', assignedTo)
    const sortMap = { newest: ['created_at', false], oldest: ['created_at', true], follow_up: ['next_follow_up_at', true] }
    const [field, ascending] = sortMap[sort] || sortMap.newest
    return query.order(field, { ascending, nullsFirst: false }).range((page - 1) * pageSize, page * pageSize - 1)
  },
  get: (id) => supabase.from('customers').select(columns).eq('id', id).single(),
  create: (payload) => supabase.from('customers').insert(payload).select().single(),
  update: (id, payload) => supabase.from('customers').update(payload).eq('id', id).select().single(),
  remove: (id) => supabase.from('customers').delete().eq('id', id),
  checkPhone: (phone, excludeId) => {
    let q = supabase.from('customers').select('id,name').eq('phone', phone)
    if (excludeId) q = q.neq('id', excludeId)
    return q.maybeSingle()
  },
  sales: () => supabase.from('profiles').select('id,full_name,email,phone,is_active').eq('role', 'sales').eq('is_active', true).order('full_name'),
}
