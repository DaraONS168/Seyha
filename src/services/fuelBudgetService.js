import { supabase } from './supabase'

export const fuelBudgetService = {
  list: () => supabase.from('fuel_budget_balances').select('*').order('fiscal_year', { ascending: false }).order('fiscal_month'),
  save: payload => supabase.from('fuel_budgets').insert(payload).select('id').single(),
  update: (id, payload) => supabase.from('fuel_budgets').update(payload).eq('id', id).select('id').single(),
  provinces: () => supabase.from('provinces').select('id,name_kh,name_en').eq('is_active', true).order('name_kh'),
  sales: () => supabase.from('profiles').select('id,full_name').eq('role', 'sales').eq('is_active', true).order('full_name'),
  visitPlans: salesUserId => supabase.rpc('fuel_budget_visit_plan_locations', { p_sales_user_id: salesUserId }),
  visitPlanLocations: salesUserId => supabase.rpc('fuel_budget_visit_plan_options', { p_sales_user_id: salesUserId }),
}
