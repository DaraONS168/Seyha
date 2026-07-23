import { supabase } from './supabase'

const reportSelect = `*,sales:profiles!daily_reports_sales_user_id_fkey(id,full_name),plan:visit_plans!daily_reports_visit_plan_id_fkey(id,title,start_date,end_date,province,district),province:provinces!daily_reports_province_id_fkey(id,name_kh),vehicle:vehicles!daily_reports_vehicle_id_fkey(id,plate_number,brand_model),approver:profiles!daily_reports_approved_by_fkey(id,full_name)`
export const dailyReportService = {
  list: async ({ search='',status='',from='',to='',page=1,pageSize=10 }={}) => { let query=supabase.from('daily_reports').select(reportSelect,{count:'exact'}).is('deleted_at',null).order('report_date',{ascending:false}).range((page-1)*pageSize,page*pageSize-1);if(search)query=query.or(`report_code.ilike.%${search}%,report_summary.ilike.%${search}%`);if(status)query=query.eq('status',status);if(from)query=query.gte('report_date',from);if(to)query=query.lte('report_date',to);return query },
  get: id => supabase.from('daily_reports').select(`${reportSelect},markets:daily_report_markets(*,market:markets(id,name_kh,market_code)),expenses:daily_report_expenses(*,category:expense_categories(id,name_kh,is_fuel),market:markets(id,name_kh)),fuel:fuel_expenses(*),approvals:daily_report_approvals(*,manager:profiles!daily_report_approvals_manager_id_fkey(id,full_name))`).eq('id',id).single(),
  plans: () => supabase.from('visit_plans').select('id,title,start_date,end_date,province,district,assigned_to,assignee:profiles!visit_plans_assigned_to_fkey(id,full_name)').neq('status','cancelled').order('start_date',{ascending:false}),
  markets: () => supabase.from('markets').select('id,name_kh,market_code,province_id').eq('status','active').is('deleted_at',null).order('name_kh').limit(500),
  categories: () => supabase.from('expense_categories').select('id,name_kh,name_en,requires_receipt,is_fuel').eq('is_active',true).order('name_kh'),
  create: payload => supabase.from('daily_reports').insert(payload).select().single(),
  update: (id,payload) => supabase.from('daily_reports').update(payload).eq('id',id).select().single(),
  replaceMarkets: async (id,items) => { const removed=await supabase.from('daily_report_markets').delete().eq('daily_report_id',id);if(removed.error)return removed;return items.length?supabase.from('daily_report_markets').insert(items.map(item=>({...item,daily_report_id:id}))):{error:null} },
  replaceExpenses: async (id,items) => { const removed=await supabase.from('daily_report_expenses').delete().eq('daily_report_id',id);if(removed.error)return removed;return items.length?supabase.from('daily_report_expenses').insert(items.map(item=>({...item,daily_report_id:id}))):{error:null} },
  submit: id => supabase.rpc('submit_daily_report',{p_report:id}),
  review: (id,action,comment='') => supabase.rpc('review_daily_report',{p_report:id,p_action:action,p_comment:comment}),
  remove: id => supabase.from('daily_reports').delete().eq('id',id),
}
