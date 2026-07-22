import { supabase } from './supabase'

const requestSelect = `*,province:provinces(id,code,name_kh),project:projects(id,code,name_kh),category:expense_categories(id,code,name_kh),requester:profiles!expense_requests_requested_by_fkey(id,full_name),sales:profiles!expense_requests_sales_id_fkey(id,full_name),visit_plan:visit_plans(id,title,start_date,end_date,province,district,assigned_to,planned_distance_km,status)`
const clean = payload => Object.fromEntries(Object.entries(payload).map(([key,value]) => [key,value === '' ? null : value]))
const searchTerm = value => value.trim().replace(/[,%()]/g,' ')

export const validateExpenseRequest = payload => {
  const errors = {}
  if (!payload.request_date) errors.request_date = 'សូមជ្រើសកាលបរិច្ឆេទ'
  if (!payload.province_id) errors.province_id = 'សូមជ្រើសខេត្ត'
  if (!payload.project_id) errors.project_id = 'សូមជ្រើសគម្រោង'
  if (!payload.expense_category_id) errors.expense_category_id = 'សូមជ្រើសប្រភេទចំណាយ'
  if ((payload.purpose || '').trim().length < 5) errors.purpose = 'សូមបញ្ចូលគោលបំណងយ៉ាងតិច ៥ តួអក្សរ'
  if (Number(payload.requested_amount) <= 0) errors.requested_amount = 'ចំនួនទឹកប្រាក់ត្រូវធំជាងសូន្យ'
  return errors
}

export const expenseService = {
  lookups: async () => {
    const [provinces,projects,categories,visitPlans] = await Promise.all([
      supabase.from('provinces').select('id,code,name_kh').eq('is_active',true).order('name_kh'),
      supabase.from('projects').select('id,code,name_kh').eq('is_active',true).order('name_kh'),
      supabase.from('expense_categories').select('id,code,name_kh').eq('is_active',true).order('name_kh'),
      supabase.from('visit_plans').select('id,title,start_date,end_date,province,district,assigned_to,planned_distance_km,status,assignee:profiles!visit_plans_assigned_to_fkey(id,full_name)').neq('status','cancelled').order('start_date',{ascending:false}).limit(300),
    ])
    return { provinces:provinces.data||[],projects:projects.data||[],categories:categories.data||[],visitPlans:visitPlans.data||[] }
  },
  budgets({page=1,pageSize=10,fiscalYear='',provinceId='',projectId='',categoryId='',status=''}={}) {
    let query=supabase.from('provincial_budgets').select('*,province:provinces(id,name_kh),project:projects(id,name_kh),category:expense_categories(id,name_kh)',{count:'exact'})
    if(fiscalYear) query=query.eq('fiscal_year',fiscalYear); if(provinceId) query=query.eq('province_id',provinceId); if(projectId) query=query.eq('project_id',projectId); if(categoryId) query=query.eq('expense_category_id',categoryId); if(status) query=query.eq('status',status)
    const start=(page-1)*pageSize; return query.order('fiscal_year',{ascending:false}).range(start,start+pageSize-1)
  },
  createBudget(payload){return supabase.from('provincial_budgets').insert(clean(payload)).select().single()},
  updateBudget(id,payload){const protectedFields=new Set(['revised_amount','committed_amount','actual_expense_amount','remaining_amount']);const writable=Object.fromEntries(Object.entries(payload).filter(([key])=>!protectedFields.has(key)));return supabase.from('provincial_budgets').update(clean(writable)).eq('id',id).select().single()},
  reviseBudget(id,payload){return supabase.rpc('revise_provincial_budget',{p_budget_id:id,p_amount:payload.amount,p_reason:payload.reason,p_reference_document:payload.reference_document})},
  budgetRevisions(id){return supabase.from('budget_revisions').select('*,requester:profiles!budget_revisions_requested_by_fkey(full_name),approver:profiles!budget_revisions_approved_by_fkey(full_name)').eq('provincial_budget_id',id).order('created_at',{ascending:false})},
  fiscalYears(){return supabase.from('fiscal_year_controls').select('*').order('fiscal_year',{ascending:false})},
  setFiscalYear(year,status,reason=''){return supabase.rpc('set_fiscal_year_status',{p_year:year,p_status:status,p_reason:reason})},
  budgetAlerts(){return supabase.from('budget_usage_alerts').select('*').neq('alert_level','normal').order('usage_percentage',{ascending:false})},
  requests({page=1,pageSize=10,search='',provinceId='',projectId='',categoryId='',status='',dateFrom='',dateTo=''}={}) {
    let query=supabase.from('expense_requests').select(requestSelect,{count:'exact'}).is('deleted_at',null)
    if(search.trim()){const term=searchTerm(search);query=query.or(`request_code.ilike.%${term}%,purpose.ilike.%${term}%`)}
    if(provinceId)query=query.eq('province_id',provinceId);if(projectId)query=query.eq('project_id',projectId);if(categoryId)query=query.eq('expense_category_id',categoryId);if(status)query=query.eq('status',status);if(dateFrom)query=query.gte('request_date',dateFrom);if(dateTo)query=query.lte('request_date',dateTo)
    const start=(page-1)*pageSize;return query.order('created_at',{ascending:false}).range(start,start+pageSize-1)
  },
  getRequest(id){return supabase.from('expense_requests').select(`${requestSelect},approvals:expense_approvals(*,approver:profiles(id,full_name)),payments:expense_payments(*,payer:profiles!expense_payments_paid_by_fkey(id,full_name)),items:expense_items(*),documents:expense_documents(*),verification:expense_verifications(*)`).eq('id',id).single()},
  createRequest(payload){return supabase.from('expense_requests').insert(clean(payload)).select(requestSelect).single()},
  updateRequest(id,payload){return supabase.from('expense_requests').update(clean(payload)).eq('id',id).select(requestSelect).single()},
  availableBudget(payload){return supabase.rpc('available_budget',{p_province_id:payload.province_id,p_project_id:payload.project_id,p_category_id:payload.expense_category_id,p_fiscal_year:new Date(payload.request_date).getFullYear()})},
  estimateMission(visitPlanId,participantCount=1){return supabase.rpc('estimate_mission_expense',{p_visit_plan_id:visitPlanId,p_participant_count:participantCount})},
  missionSummary(){return supabase.from('sales_mission_expense_summary').select('*').order('actual_amount',{ascending:false})},
  submit(id){return supabase.rpc('submit_expense_request',{p_request_id:id})},
  decide(id,decision,comment='',approvedAmount=null){return supabase.rpc('decide_expense_request',{p_request_id:id,p_decision:decision,p_comment:comment,p_approved_amount:approvedAmount})},
  pay(id,payload){return supabase.rpc('create_expense_payment',{p_request_id:id,p_payment_date:payload.payment_date,p_method:payload.payment_method,p_amount:payload.amount,p_bank_name:payload.bank_name||'',p_reference:payload.transaction_reference||'',p_recipient:payload.recipient_name,p_attachment:payload.attachment})},
  addItem(payload){return supabase.from('expense_items').insert(clean(payload)).select().single()},
  removeItem(id){return supabase.from('expense_items').delete().eq('id',id)},
  complete(id){return supabase.rpc('complete_expense_request',{p_request_id:id})},
  verify(id,payload){return supabase.rpc('verify_expense_request',{p_request_id:id,p_receipts_complete:payload.receipts_complete,p_receipt_total_matches:payload.receipt_total_matches,p_returned_amount_correct:payload.returned_amount_correct,p_category_valid:payload.category_valid,p_within_approved_amount:payload.within_approved_amount,p_notes:payload.notes||''})},
  async upload(file,requestId,folder='documents'){
    if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type))return{error:new Error('ឯកសារត្រូវជា PDF, JPG, PNG ឬ WebP')}
    if(file.size>10*1024*1024)return{error:new Error('ឯកសារត្រូវតូចជាង 10 MB')}
    const path=`${requestId}/${folder}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
    const result=await supabase.storage.from('expense-documents').upload(path,file);return result.error?result:{data:{path},error:null}
  },
  addDocument(payload){return supabase.from('expense_documents').insert(payload).select().single()},
  async dashboard(filters={}){
    const [budgets,requests]=await Promise.all([this.budgets({...filters,pageSize:1000}),this.requests({...filters,pageSize:1000})])
    const budgetRows=budgets.data||[],requestRows=requests.data||[]
    return {budgets:budgetRows,requests:requestRows,stats:{totalBudget:budgetRows.reduce((sum,row)=>sum+Number(row.approved_amount)+Number(row.revised_amount),0),remaining:budgetRows.reduce((sum,row)=>sum+Number(row.remaining_amount),0),approved:requestRows.reduce((sum,row)=>sum+Number(row.approved_amount),0),paid:requestRows.reduce((sum,row)=>sum+Number(row.amount_received),0),actual:requestRows.reduce((sum,row)=>sum+Number(row.actual_amount),0),pending:requestRows.filter(row=>['submitted','under_review'].includes(row.status)).length,rejected:requestRows.filter(row=>row.status==='rejected').length,completed:requestRows.filter(row=>row.status==='completed').length}}
  },
}
