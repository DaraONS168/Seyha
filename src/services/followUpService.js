import { supabase } from './supabase'

const select = '*, customer:customers(id,name,phone,status,priority), assignee:profiles!follow_ups_assigned_to_fkey(full_name)'
export const followUpService = {
  list: ({ status, from, to } = {}) => {
    let q = supabase.from('follow_ups').select(select).order('follow_up_at')
    if (status) q = q.eq('status', status)
    if (from) q = q.gte('follow_up_at', from)
    if (to) q = q.lte('follow_up_at', to)
    return q
  },
  complete: (id) => supabase.from('follow_ups').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id),
  reschedule: (id, followUpAt) => supabase.from('follow_ups').update({ follow_up_at: followUpAt, status: 'pending', completed_at: null }).eq('id', id),
}
