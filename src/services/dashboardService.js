import { supabase } from './supabase'

export async function getDashboardData() {
  const [customers, calls, followUps, sales] = await Promise.all([
    supabase.from('customers').select('id,name,phone,status,source,priority,next_follow_up_at,created_at,assigned:profiles!customers_assigned_to_fkey(full_name)').order('created_at', { ascending: false }),
    supabase.from('call_histories').select('id,call_result,called_at,caller:profiles!call_histories_called_by_fkey(full_name),customer:customers(name)').order('called_at', { ascending: false }).limit(8),
    supabase.from('follow_ups').select('id,follow_up_at,status,customer:customers(id,name,phone,status,priority)').eq('status', 'pending').order('follow_up_at'),
    supabase.from('profiles').select('id,full_name,customers:customers!customers_assigned_to_fkey(id,status),calls:call_histories!call_histories_called_by_fkey(id)').eq('role', 'sales'),
  ])
  const error = customers.error || calls.error || followUps.error || sales.error
  if (error) throw error
  return { customers: customers.data || [], calls: calls.data || [], followUps: followUps.data || [], sales: sales.data || [] }
}
