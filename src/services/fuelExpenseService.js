import { supabase } from './supabase'

const fuelSelect = `*, plan:visit_plans!fuel_expenses_visit_plan_id_fkey(id,title,start_date,end_date,province,district),
  request:expense_requests!fuel_expenses_visit_expense_id_fkey(id,request_code,purpose,approved_amount),
  sales:profiles!fuel_expenses_sales_user_id_fkey(id,full_name), driver:profiles!fuel_expenses_driver_id_fkey(id,full_name),
  province:provinces!fuel_expenses_province_id_fkey(id,name_kh), vehicle:vehicles!fuel_expenses_vehicle_id_fkey(id,vehicle_code,plate_number,brand_model,current_odometer),
  market:markets!fuel_expenses_market_id_fkey(id,market_code,name_kh,name_en), district:districts!fuel_expenses_district_id_fkey(id,name_kh)`

const upload = async (file, folder) => {
  const extension = file.name.split('.').pop()
  const path = `fuel/${folder}/${crypto.randomUUID()}.${extension}`
  const result = await supabase.storage.from('expense-documents').upload(path, file)
  if (result.error) throw result.error
  return path
}

export const fuelExpenseService = {
  async list({ search = '', status = '', vehicleId = '', salesId = '' } = {}) {
    let query = supabase.from('fuel_expenses').select(fuelSelect).is('deleted_at', null).order('expense_date', { ascending: false })
    if (search) query = query.or(`expense_code.ilike.%${search}%,invoice_number.ilike.%${search}%,fuel_station.ilike.%${search}%`)
    if (status) query = query.eq('status', status)
    if (vehicleId) query = query.eq('vehicle_id', vehicleId)
    if (salesId) query = query.eq('sales_user_id', salesId)
    return query
  },
  dashboard: () => supabase.from('fuel_expense_dashboard').select('*').single(),
  vehicles: () => supabase.from('vehicles').select('*,driver:profiles!vehicles_default_driver_id_fkey(id,full_name)').order('vehicle_code'),
  plans: () => supabase.from('visit_plans').select('id,title,start_date,end_date,assigned_to,assignee:profiles!visit_plans_assigned_to_fkey(id,full_name)').order('start_date', { ascending: false }).limit(200),
  requests: planId => supabase.from('expense_requests').select('id,request_code,purpose,approved_amount,province_id,status').eq('visit_plan_id', planId).not('status', 'in', '(rejected,cancelled,completed)').is('deleted_at', null),
  provinces: () => supabase.from('provinces').select('id,name_kh').eq('is_active', true).order('name_kh'),
  districts: provinceId => supabase.from('districts').select('id,name_kh').eq('province_id', provinceId).eq('is_active', true).order('name_kh'),
  markets: (provinceId, districtId) => supabase.from('markets').select('id,market_code,name_kh,name_en,province_id,district_id').eq('province_id', provinceId).eq('district_id', districtId).eq('status', 'active').is('deleted_at', null).order('name_kh'),
  drivers: () => supabase.from('profiles').select('id,full_name').order('full_name'),
  latestOdometer: (salesUserId, vehicleId) => supabase.from('fuel_expenses')
    .select('id,expense_code,expense_date,end_odometer,sales_user_id,vehicle_id')
    .eq('sales_user_id', salesUserId)
    .eq('vehicle_id', vehicleId)
    .is('deleted_at', null)
    .not('status', 'in', '(rejected,cancelled)')
    .order('end_odometer', { ascending: false })
    .limit(1)
    .maybeSingle(),
  async create(payload, files) {
    const [startPhoto, endPhoto, receipt] = await Promise.all([
      upload(files.startPhoto, 'odometer-start'), upload(files.endPhoto, 'odometer-end'), upload(files.receipt, 'receipts'),
    ])
    return supabase.from('fuel_expenses').insert({ ...payload, start_odometer_photo: startPhoto, end_odometer_photo: endPhoto, receipt_file: receipt }).select(fuelSelect).single()
  },
  submit: id => supabase.rpc('submit_fuel_expense', { p_fuel_expense_id: id }),
  decide: (id, decision, comment = '') => supabase.rpc('decide_fuel_expense', { p_fuel_expense_id: id, p_decision: decision, p_comment: comment }),
  createVehicle: payload => supabase.from('vehicles').insert(payload).select().single(),
}
