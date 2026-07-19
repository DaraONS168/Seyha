import { supabase } from './supabase'

const planSelect = '*, assignee:profiles!visit_plans_assigned_to_fkey(id,full_name,email), stops:visit_plan_stops(count)'
const stopSelect = '*, customer:customers(id,name,phone,priority,status)'

export const visitPlanService = {
  list: ({ search = '', status = '', assignedTo = '', date = '' } = {}) => {
    let query = supabase.from('visit_plans').select(planSelect).order('start_date').order('created_at', { ascending: false })
    if (search) query = query.or(`title.ilike.%${search}%,province.ilike.%${search}%,district.ilike.%${search}%`)
    if (status) query = query.eq('status', status)
    if (assignedTo) query = query.eq('assigned_to', assignedTo)
    if (date) query = query.lte('start_date', date).gte('end_date', date)
    return query
  },
  get: (id) => supabase.from('visit_plans').select(planSelect).eq('id', id).single(),
  create: payload => supabase.from('visit_plans').insert(payload).select().single(),
  update: (id, payload) => supabase.from('visit_plans').update(payload).eq('id', id).select().single(),
  remove: id => supabase.from('visit_plans').delete().eq('id', id),
  stops: planId => supabase.from('visit_plan_stops').select(stopSelect).eq('visit_plan_id', planId).order('stop_order').order('visit_at'),
  createStop: payload => supabase.from('visit_plan_stops').insert(payload).select(stopSelect).single(),
  updateStop: (id, payload) => supabase.from('visit_plan_stops').update(payload).eq('id', id).select(stopSelect).single(),
  removeStop: id => supabase.from('visit_plan_stops').delete().eq('id', id),
  customers: () => supabase.from('customers').select('id,name,phone,province,status').order('name').limit(300),
}
