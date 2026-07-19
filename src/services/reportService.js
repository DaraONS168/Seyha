import { supabase } from './supabase'

export const reportService = {
  customers: ({ from, to, status, priority, source, sales } = {}) => {
    let q = supabase.from('customers').select('name,phone,status,priority,source,interested_product,next_follow_up_at,created_at,assigned:profiles!customers_assigned_to_fkey(full_name)').order('created_at', { ascending: false })
    if (from) q = q.gte('created_at', `${from}T00:00:00`)
    if (to) q = q.lte('created_at', `${to}T23:59:59`)
    if (status) q = q.eq('status', status)
    if (priority) q = q.eq('priority', priority)
    if (source) q = q.eq('source', source)
    if (sales) q = q.eq('assigned_to', sales)
    return q
  },
}
