import { supabase } from './supabase'

const reportSelect = `*,sales:profiles!daily_reports_sales_user_id_fkey(id,full_name),team:sales_teams(id,name),plan:visit_plans!daily_reports_visit_plan_id_fkey(id,title,start_date,end_date,province,district,assigned_to),province:provinces!daily_reports_province_id_fkey(id,name_kh),vehicle:vehicles!daily_reports_vehicle_id_fkey(id,plate_number,brand_model),approver:profiles!daily_reports_approved_by_fkey(id,full_name)`
const reportListSelect = `${reportSelect},invoices:daily_report_invoices(id,invoice_amount,collected_amount,returned_amount,credit_amount,status),expenses:daily_report_expenses(id,amount),markets:daily_report_markets(id)`
const clean = payload => Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, value === '' ? null : value]))
export const dailyReportService = {
  list: async ({ search='',status='',from='',to='',page=1,pageSize=10 }={}) => { let query=supabase.from('daily_reports').select(reportListSelect,{count:'exact'}).is('deleted_at',null).order('report_date',{ascending:false}).range((page-1)*pageSize,page*pageSize-1);if(search)query=query.or(`report_code.ilike.%${search}%,report_summary.ilike.%${search}%`);if(status)query=query.eq('status',status);if(from)query=query.gte('report_date',from);if(to)query=query.lte('report_date',to);return query },
  get: id => supabase.from('daily_reports').select(`${reportSelect},invoices:daily_report_invoices(*,market:markets(id,name_kh,market_code,province_id,district_id)),markets:daily_report_markets(*,market:markets(id,name_kh,market_code)),expenses:daily_report_expenses(*,category:expense_categories(id,name_kh,is_fuel),market:markets(id,name_kh)),fuel:fuel_expenses(*),approvals:daily_report_approvals(*,manager:profiles!daily_report_approvals_manager_id_fkey(id,full_name))`).eq('id',id).single(),
  findDraft: ({ salesUserId, visitPlanId, reportDate }) => supabase.from('daily_reports').select('id,status').eq('sales_user_id',salesUserId).eq('visit_plan_id',visitPlanId).eq('report_date',reportDate).is('deleted_at',null).order('created_at',{ascending:false}).limit(1),
  plans: () => supabase.from('visit_plans').select('id,title,start_date,end_date,province,district,assigned_to,assignee:profiles!visit_plans_assigned_to_fkey(id,full_name)').neq('status','cancelled').order('start_date',{ascending:false}),
  teams: () => supabase.from('sales_teams').select('id,name').eq('is_active',true).order('name'),
  vehicles: () => supabase.from('vehicles').select('id,plate_number,brand_model,current_odometer').eq('status','active').order('vehicle_code'),
  fuelForPlanDate: ({ visitPlanId, salesUserId, reportDate }) => {
    let query = supabase.from('fuel_expenses').select('id,expense_code,expense_date,visit_plan_id,sales_user_id,vehicle_id,start_odometer,end_odometer,distance_km,fuel_liters,price_per_liter,total_amount,currency,fuel_station,invoice_number,status').is('deleted_at',null).not('status','in','(rejected,cancelled)').order('expense_date',{ascending:false})
    if (visitPlanId) query = query.eq('visit_plan_id', visitPlanId)
    if (salesUserId) query = query.eq('sales_user_id', salesUserId)
    if (reportDate) query = query.eq('expense_date', reportDate)
    return query
  },
  provinces: () => supabase.from('provinces').select('id,name_kh').eq('is_active',true).order('name_kh'),
  districts: () => supabase.from('districts').select('id,name_kh,province_id').eq('is_active',true).order('name_kh'),
  markets: () => supabase.from('markets').select('id,name_kh,market_code,province_id,district_id').eq('status','active').is('deleted_at',null).order('name_kh').limit(500),
  categories: () => supabase.from('expense_categories').select('id,name_kh,name_en,requires_receipt,is_fuel').eq('is_active',true).order('name_kh'),
  create: payload => supabase.from('daily_reports').insert(payload).select().single(),
  update: (id,payload) => supabase.from('daily_reports').update(payload).eq('id',id).select().single(),
  replaceMarkets: async (id,items) => { const removed=await supabase.from('daily_report_markets').delete().eq('daily_report_id',id);if(removed.error)return removed;return items.length?supabase.from('daily_report_markets').insert(items.map(item=>({...item,daily_report_id:id}))):{error:null} },
  replaceInvoices: async (id,items) => { const removed=await supabase.from('daily_report_invoices').delete().eq('daily_report_id',id);if(removed.error)return removed;return items.length?supabase.from('daily_report_invoices').insert(items.map(item=>clean({...item,daily_report_id:id}))):{error:null} },
  replaceExpenses: async (id,items) => { const removed=await supabase.from('daily_report_expenses').delete().eq('daily_report_id',id);if(removed.error)return removed;return items.length?supabase.from('daily_report_expenses').insert(items.map(item=>({...item,daily_report_id:id}))):{error:null} },
  submit: id => supabase.rpc('submit_daily_report',{p_report:id}),
  review: (id,action,comment='') => supabase.rpc('review_daily_report',{p_report:id,p_action:action,p_comment:comment}),
  remove: id => supabase.from('daily_reports').delete().eq('id',id),
}
