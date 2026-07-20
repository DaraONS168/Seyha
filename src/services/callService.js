import { supabase } from './supabase'

export const callService = {
  list: (customerId) => {
    let q = supabase.from('call_histories').select('*, caller:profiles!call_histories_called_by_fkey(full_name), customer:customers(id,name,phone)').order('called_at', { ascending: false })
    return customerId ? q.eq('customer_id', customerId) : q.limit(100)
  },
  create: (payload) => supabase.rpc('record_customer_call', { p_customer_id: payload.customer_id, p_result: payload.call_result, p_duration: Number(payload.call_duration || 0), p_notes: payload.notes || null, p_next_follow_up_at: payload.next_follow_up_at || null, p_customer_status: payload.customer_status || null }),
}
