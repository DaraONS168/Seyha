import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Route, Save } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { expenseService, validateExpenseRequest } from '../services/expenseService'
import { money } from '../utils/expenseConstants'

const empty = { request_date: new Date().toISOString().slice(0, 10), province_id: '', project_id: '', expense_category_id: '', purpose: '', requested_amount: '', visit_plan_id: '', participant_count: 1, estimated_distance_km: 0, estimated_transport_amount: 0, estimated_meal_amount: 0, estimated_lodging_amount: 0, estimated_other_amount: 0, advance_requested: false }
const writableFields = ['request_date','province_id','project_id','expense_category_id','purpose','requested_amount','visit_plan_id','participant_count','estimated_distance_km','estimated_transport_amount','estimated_meal_amount','estimated_lodging_amount','estimated_other_amount','advance_requested']
const normalizeLocation = value => String(value || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()

export default function ExpenseRequestFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [lookups, setLookups] = useState({ provinces: [], projects: [], categories: [], visitPlans: [] })
  const [estimate, setEstimate] = useState(null)
  const [step, setStep] = useState(0)
  const [available, setAvailable] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const { province_id, project_id, expense_category_id, request_date } = form

  useEffect(() => {
    expenseService.lookups().then(result => {
      setLookups(result)
      const planId = searchParams.get('visitPlanId')
      if (planId && !id) selectPlan(planId, result)
    })
    if (id) expenseService.getRequest(id).then(({ data }) => data && setForm({ ...empty, ...data }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, searchParams])
  useEffect(() => {
    if (province_id && project_id && expense_category_id && request_date) expenseService.availableBudget({ province_id, project_id, expense_category_id, request_date }).then(({ data }) => setAvailable(Number(data || 0)))
  }, [province_id, project_id, expense_category_id, request_date])

  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
  const options = items => items.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)
  const selectPlan = async (planId, sourceLookups = lookups) => {
    const plan = sourceLookups.visitPlans.find(item => item.id === planId)
    if (!plan) { setForm(current => ({ ...current, visit_plan_id: '' })); setEstimate(null); return }
    const province = sourceLookups.provinces.find(item => normalizeLocation(item.name_kh) === normalizeLocation(plan.province))
    const participantCount = Number(form.participant_count || 1)
    const { data, error } = await expenseService.estimateMission(plan.id, participantCount)
    if (error) return toast.error(error.message)
    setEstimate(data)
    setForm(current => ({ ...current, visit_plan_id: plan.id, request_date: plan.start_date, province_id: province?.id || current.province_id, purpose: current.purpose || `ចំណាយបេសកកម្ម៖ ${plan.title} (${plan.district}, ${plan.province})`, participant_count: participantCount, estimated_distance_km: data.distance_km, estimated_transport_amount: data.transport, estimated_meal_amount: data.meals, estimated_lodging_amount: data.lodging, estimated_other_amount: data.other, requested_amount: data.total }))
  }
  const recalculate = () => form.visit_plan_id && selectPlan(form.visit_plan_id)
  const save = async submit => {
    const validation = validateExpenseRequest(form); setErrors(validation)
    if (Object.keys(validation).length) return toast.error('សូមបំពេញព័ត៌មានចាំបាច់')
    if (submit && Number(form.requested_amount) > available) return toast.error(`លើសថវិកា ${money(Number(form.requested_amount) - available)}`)
    setSaving(true)
    const payload = Object.fromEntries(writableFields.map(key => [key, form[key] === '' ? null : form[key]]))
    const result = id ? await expenseService.updateRequest(id, payload) : await expenseService.createRequest(payload)
    if (result.error) { setSaving(false); return toast.error(result.error.message) }
    if (submit) { const submitted = await expenseService.submit(result.data.id); if (submitted.error) { setSaving(false); return toast.error(submitted.error.message) } }
    toast.success(submit ? 'បានដាក់ស្នើ' : 'បានរក្សាទុកព្រាង'); navigate(`/expenses/requests/${result.data.id}`)
  }

  const tabs = ['ព័ត៌មានទូទៅ', 'បេសកកម្ម និងថវិកា', 'ឯកសារគាំទ្រ', 'ពិនិត្យ និងដាក់ស្នើ']
  return <div className="mx-auto max-w-5xl space-y-5">
    <div className="flex items-center gap-3"><Link to="/expenses/requests" className="rounded-xl border bg-white p-2"><ArrowLeft/></Link><div><h1 className="text-2xl font-bold">{id ? 'កែសំណើចំណាយ' : 'បង្កើតសំណើចំណាយ'}</h1><p className="text-sm text-slate-500">ភ្ជាប់ Visit Plan ដើម្បីគណនាចំណាយបេសកកម្មស្វ័យប្រវត្តិ</p></div></div>
    <div className="card p-5"><div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">{tabs.map((label, index) => <button key={label} onClick={() => setStep(index)} className={`min-w-max flex-1 rounded-lg px-3 py-2 text-sm ${step === index ? 'bg-white font-bold text-blue-700 shadow' : 'text-slate-500'}`}>{index + 1}. {label}</button>)}</div>
      {step === 0 && <div className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><label className="label">ភ្ជាប់ផែនការចុះទីតាំង</label><select className="field" value={form.visit_plan_id || ''} onChange={event => selectPlan(event.target.value)}><option value="">ចំណាយទូទៅ (មិនភ្ជាប់ Plan)</option>{lookups.visitPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.title} · {plan.assignee?.full_name} · {plan.start_date}</option>)}</select></div><div><label className="label">លេខកូដ</label><input className="field bg-slate-50" readOnly value={form.request_code || 'បង្កើតដោយស្វ័យប្រវត្តិ'}/></div><div><label className="label">កាលបរិច្ឆេទ *</label><input type="date" className="field" name="request_date" value={form.request_date} onChange={update}/></div><div><label className="label">ខេត្ត *</label><select className="field" name="province_id" value={form.province_id} onChange={update}><option value="">ជ្រើសរើស</option>{options(lookups.provinces)}</select><small className="text-red-600">{errors.province_id}</small></div><div><label className="label">គម្រោង *</label><select className="field" name="project_id" value={form.project_id} onChange={update}><option value="">ជ្រើសរើស</option>{options(lookups.projects)}</select></div><div><label className="label">ប្រភេទចំណាយ *</label><select className="field" name="expense_category_id" value={form.expense_category_id} onChange={update}><option value="">ជ្រើសរើស</option>{options(lookups.categories)}</select></div><div><label className="label">ចំនួនស្នើសុំ *</label><input type="number" min="0.01" step="0.01" className="field" name="requested_amount" value={form.requested_amount} onChange={update}/></div><div className="md:col-span-2"><label className="label">គោលបំណង *</label><textarea className="field min-h-28" name="purpose" value={form.purpose} onChange={update}/></div></div>}
      {step === 1 && <div className="space-y-4">{form.visit_plan_id && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 font-bold text-blue-800"><Route size={19}/>ការប៉ាន់ស្មានបេសកកម្ម</div><button className="text-sm font-semibold text-blue-700" onClick={recalculate}>គណនាឡើងវិញ</button></div><div className="grid gap-3 md:grid-cols-3"><div><label className="label">ចំនួនអ្នកចូលរួម</label><input className="field" type="number" min="1" name="participant_count" value={form.participant_count} onChange={update}/></div><div><label className="label">ចម្ងាយ (គ.ម.)</label><input className="field bg-white/70" readOnly value={estimate?.distance_km || 0}/></div><label className="flex items-center gap-2 self-end rounded-xl bg-white p-3 font-medium"><input type="checkbox" name="advance_requested" checked={form.advance_requested} onChange={update}/>ស្នើបុរេប្រទានមុនចុះ</label></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['ធ្វើដំណើរ',estimate?.transport],['អាហារ',estimate?.meals],['ស្នាក់នៅ',estimate?.lodging],['ផ្សេងៗ',estimate?.other]].map(([label,value]) => <div className="rounded-xl bg-white p-3" key={label}><p className="text-xs text-slate-500">{label}</p><p className="font-bold">{money(value)}</p></div>)}</div></div>}<div className="grid gap-4 md:grid-cols-3"><div className="rounded-xl bg-blue-50 p-5"><p className="text-sm text-blue-700">ថវិកាអាចប្រើបាន</p><p className="text-2xl font-bold text-blue-800">{money(available)}</p></div><div className="rounded-xl bg-slate-50 p-5"><p className="text-sm text-slate-500">ចំនួនស្នើសុំ</p><p className="text-2xl font-bold">{money(form.requested_amount)}</p></div><div className={`rounded-xl p-5 ${available - Number(form.requested_amount) >= 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}><p className="text-sm">នៅសល់ក្រោយស្នើ</p><p className="text-2xl font-bold">{money(available - Number(form.requested_amount || 0))}</p></div></div></div>}
      {step === 2 && <div className="rounded-xl border-2 border-dashed p-10 text-center text-slate-500">រក្សាទុកសំណើសិន បន្ទាប់មកបញ្ចូលលិខិតបេសកកម្ម បញ្ជីអ្នកចូលរួម និងឯកសារគាំទ្រនៅទំព័រលម្អិត។</div>}
      {step === 3 && <div className="space-y-3 rounded-xl bg-slate-50 p-5"><p><b>ប្រភេទ៖</b> {form.visit_plan_id ? 'ចំណាយបេសកកម្ម Sales' : 'ចំណាយទូទៅ'}</p><p><b>គោលបំណង៖</b> {form.purpose}</p><p><b>ទឹកប្រាក់៖</b> {money(form.requested_amount)}</p><p><b>បុរេប្រទាន៖</b> {form.advance_requested ? 'ស្នើ' : 'មិនស្នើ'}</p></div>}
      <div className="mt-6 flex flex-wrap justify-between border-t pt-4"><div><button className="btn-secondary" disabled={step === 0} onClick={() => setStep(current => current - 1)}>ថយក្រោយ</button>{step < 3 && <button className="btn-secondary ml-2" onClick={() => setStep(current => current + 1)}>បន្ទាប់</button>}</div><div className="flex gap-2"><button disabled={saving} className="btn-secondary" onClick={() => save(false)}><Save size={17}/>រក្សាព្រាង</button><button disabled={saving} className="btn-primary" onClick={() => save(true)}><CheckCircle2 size={17}/>ដាក់ស្នើ</button></div></div>
    </div>
  </div>
}
