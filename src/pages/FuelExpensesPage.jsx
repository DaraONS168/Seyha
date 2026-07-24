import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Crosshair, Fuel, Gauge, Pencil, Plus, Route, Search, Send, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import EmptyState from '../components/common/EmptyState'
import LoadingState from '../components/common/LoadingState'
import Modal from '../components/common/Modal'
import { useAuth } from '../contexts/AuthContext'
import { fuelExpenseService } from '../services/fuelExpenseService'
import { calculateFuelMetrics, FUEL_STATUS } from '../utils/fuelExpense'

const emptyForm = { sales_user_id: '', visit_plan_id: '', visit_expense_id: '', province_id: '', district_id: '', expense_date: '', latitude: '', longitude: '', vehicle_id: '', driver_id: '', start_odometer: '', end_odometer: '', fuel_liters: '', price_per_liter: '', currency: 'KHR', fuel_station: '', invoice_number: '', note: '' }
const number = value => new Intl.NumberFormat('km-KH', { maximumFractionDigits: 2 }).format(Number(value) || 0)

export default function FuelExpensesPage() {
  const { hasPermission } = useAuth()
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', status: '', vehicleId: '', salesId: '' })
  const [lookups, setLookups] = useState({ plans: [], vehicles: [], drivers: [], requests: [], provinces: [], districts: [] })
  const [form, setForm] = useState(null)
  const [files, setFiles] = useState({})
  const [saving, setSaving] = useState(false)
  const [vehicleForm, setVehicleForm] = useState(null)
  const [odometerLoading, setOdometerLoading] = useState(false)
  const [odometerSource, setOdometerSource] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [listResult, dashboardResult] = await Promise.all([fuelExpenseService.list(filters), fuelExpenseService.dashboard()])
    if (listResult.error) toast.error(listResult.error.message)
    setRows(listResult.data || []); setStats(dashboardResult.data || {}); setLoading(false)
  }, [filters])

  useEffect(() => { load() }, [load])
  useEffect(() => { Promise.all([fuelExpenseService.plans(), fuelExpenseService.vehicles(), fuelExpenseService.drivers(), fuelExpenseService.provinces()]).then(([plans, vehicles, drivers, provinces]) => setLookups(current => ({ ...current, plans: plans.data || [], vehicles: vehicles.data || [], drivers: drivers.data || [], provinces: provinces.data || [] }))) }, [])

  const metrics = useMemo(() => calculateFuelMetrics(form || {}), [form])
  const salesOptions = useMemo(() => {
    const people = new Map()
    lookups.plans.forEach(plan => { if (plan.assignee) people.set(plan.assignee.id, plan.assignee) })
    return [...people.values()].sort((a, b) => a.full_name.localeCompare(b.full_name))
  }, [lookups.plans])
  const filteredPlans = useMemo(() => lookups.plans.filter(plan => plan.assigned_to === form?.sales_user_id), [lookups.plans, form?.sales_user_id])
  const selectedPlan = useMemo(() => lookups.plans.find(plan => plan.id === form?.visit_plan_id), [lookups.plans, form?.visit_plan_id])
  const selectSales = salesUserId => {
    setLookups(current => ({ ...current, requests: [], districts: [] }))
    setOdometerSource(null)
    setForm(current => ({ ...current, sales_user_id: salesUserId, visit_plan_id: '', visit_expense_id: '', province_id: '', district_id: '', expense_date: '', vehicle_id: '', driver_id: '', start_odometer: '', end_odometer: '' }))
  }
  const selectPlan = async visitPlanId => {
    const plan = lookups.plans.find(item => item.id === visitPlanId)
    const requests = await fuelExpenseService.requests(visitPlanId)
    const request = requests.data?.[0]
    const districts = request?.province_id ? await fuelExpenseService.districts(request.province_id) : { data: [] }
    setLookups(current => ({ ...current, requests: requests.data || [], districts: districts.data || [] }))
    setForm(current => ({ ...current, visit_plan_id: visitPlanId, visit_expense_id: request?.id || '', province_id: request?.province_id || '', district_id: '', expense_date: plan?.start_date || '' }))
    if (visitPlanId && !request) toast.error('ផែនការនេះមិនទាន់មានសំណើចំណាយដែលអាចភ្ជាប់បានទេ')
  }
  const selectRequest = async requestId => {
    const request = lookups.requests.find(item => item.id === requestId)
    const districts = request?.province_id ? await fuelExpenseService.districts(request.province_id) : { data: [] }
    setLookups(current => ({ ...current, districts: districts.data || [] }))
    setForm(current => ({ ...current, visit_expense_id: requestId, province_id: request?.province_id || '', district_id: '' }))
  }
  const selectProvince = async provinceId => { const districts = await fuelExpenseService.districts(provinceId); setLookups(current => ({ ...current, districts: districts.data || [] })); setForm(current => ({ ...current, province_id: provinceId, district_id: '' })) }
  const selectVehicle = async vehicleId => {
    const vehicle = lookups.vehicles.find(item => item.id === vehicleId)
    const salesUserId = form?.sales_user_id
    setOdometerSource(null)
    setForm(current => ({ ...current, vehicle_id: vehicleId, start_odometer: vehicle?.current_odometer || '', end_odometer: '', driver_id: vehicle?.default_driver_id || current.driver_id }))
    if (!vehicleId || !salesUserId) return
    setOdometerLoading(true)
    const latest = await fuelExpenseService.latestOdometer(salesUserId, vehicleId)
    setOdometerLoading(false)
    if (latest.error) return toast.error(`មិនអាចទាញគីឡូម៉ែត្រចុងក្រោយ៖ ${latest.error.message}`)
    const vehicleOdometer = Number(vehicle?.current_odometer) || 0
    const previousEnd = Number(latest.data?.end_odometer) || 0
    const nextStart = Math.max(vehicleOdometer, previousEnd)
    setForm(current => current?.vehicle_id === vehicleId && current?.sales_user_id === salesUserId ? ({ ...current, start_odometer: nextStart || '' }) : current)
    setOdometerSource(latest.data ? { code: latest.data.expense_code, date: latest.data.expense_date, value: previousEnd } : { value: vehicleOdometer })
  }
  const useCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error('Browser នេះមិនគាំទ្រ GPS')
    toast.info('កំពុងស្វែងរកទីតាំងបច្ចុប្បន្ន...')
    navigator.geolocation.getCurrentPosition(position => {
      setForm(current => ({ ...current, latitude: position.coords.latitude.toFixed(7), longitude: position.coords.longitude.toFixed(7) }))
      toast.success('បានទទួលទីតាំង GPS')
    }, error => toast.error(error.code === 1 ? 'សូមអនុញ្ញាត Location ក្នុង Browser' : 'មិនអាចទទួលទីតាំង GPS បាន'), { enableHighAccuracy: true, timeout: 10000 })
  }
  const save = async event => {
    event.preventDefault()
    if (Number(form.end_odometer) <= Number(form.start_odometer)) return toast.error('គីឡូម៉ែត្របញ្ចប់ត្រូវធំជាងគីឡូម៉ែត្រចាប់ផ្តើម')
    if (!form.visit_plan_id) return toast.error('សូមជ្រើសផែនការចុះមុនរក្សាទុក')
    const expenseDate = selectedPlan ? clampDate(form.expense_date, selectedPlan.start_date, selectedPlan.end_date) : form.expense_date
    if (!form.id && (!files.startPhoto || !files.endPhoto || !files.receipt)) return toast.error('សូមភ្ជាប់រូបកុងទ័រទាំងពីរ និងវិក្កយបត្រ')
    setSaving(true)
    const payload = { ...form, expense_date: expenseDate }
    const result = form.id ? await fuelExpenseService.update(form.id, payload, files).catch(error => ({ error })) : await fuelExpenseService.create(payload, files).catch(error => ({ error }))
    setSaving(false)
    if (result.error) return toast.error(result.error.message)
    toast.success(form.id ? 'បានកែប្រែចំណាយសាំង' : 'បានរក្សាទុកចំណាយសាំង'); setForm(null); setFiles({}); load()
  }
  const edit = async row => {
    setFiles({})
    setOdometerSource(null)
    const [requests, districts] = await Promise.all([
      fuelExpenseService.requests(row.visit_plan_id),
      row.province_id ? fuelExpenseService.districts(row.province_id) : { data: [] },
    ])
    setLookups(current => ({ ...current, requests: requests.data || [], districts: districts.data || [] }))
    setForm({
      id: row.id,
      sales_user_id: row.sales_user_id || '',
      visit_plan_id: row.visit_plan_id || '',
      visit_expense_id: row.visit_expense_id || '',
      province_id: row.province_id || '',
      district_id: row.district_id || '',
      expense_date: row.expense_date || '',
      latitude: row.latitude || '',
      longitude: row.longitude || '',
      vehicle_id: row.vehicle_id || '',
      driver_id: row.driver_id || '',
      start_odometer: row.start_odometer || '',
      end_odometer: row.end_odometer || '',
      fuel_liters: row.fuel_liters || '',
      price_per_liter: row.price_per_liter || '',
      currency: row.currency || 'KHR',
      fuel_station: row.fuel_station || '',
      invoice_number: row.invoice_number || '',
      note: row.note || '',
      status: row.status,
    })
  }
  const submit = async id => { const result = await fuelExpenseService.submit(id); result.error ? toast.error(result.error.message) : (toast.success('បានដាក់ស្នើអនុម័ត'), load()) }
  const decide = async (id, decision) => {
    const comment = decision === 'rejected' ? window.prompt('មូលហេតុបដិសេធ៖') : ''
    if (decision === 'rejected' && !comment) return
    const result = await fuelExpenseService.decide(id, decision, comment)
    result.error ? toast.error(result.error.message) : (toast.success(decision === 'approved' ? 'បានអនុម័ត' : 'បានបដិសេធ'), load())
  }
  const saveVehicle = async event => {
    event.preventDefault(); const result = await fuelExpenseService.createVehicle(vehicleForm)
    if (result.error) return toast.error(result.error.message)
    toast.success('បានបន្ថែមយានយន្ត'); setVehicleForm(null); const vehicles = await fuelExpenseService.vehicles(); setLookups(current => ({ ...current, vehicles: vehicles.data || [] }))
  }

  const cards = [
    ['ចំណាយសាំងអនុម័ត', `${number(stats.total_fuel_expense)} រៀល`, Fuel, 'text-blue-600 bg-blue-50'],
    ['ចម្ងាយសរុប', `${number(stats.total_distance_km)} km`, Route, 'text-violet-600 bg-violet-50'],
    ['សាំងសរុប', `${number(stats.total_liters)} L`, Gauge, 'text-green-600 bg-green-50'],
    ['រង់ចាំអនុម័ត', number(stats.pending_count), Send, 'text-amber-600 bg-amber-50'],
  ]
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">ចំណាយសាំង</h1><p className="text-sm text-slate-500">កត់ត្រាចម្ងាយ បរិមាណសាំង និងវិក្កយបត្រតាមផែនការចុះទីតាំង</p></div><div className="flex gap-2">{hasPermission('vehicles.create') && <button className="btn-secondary" onClick={() => setVehicleForm({ vehicle_code: '', vehicle_type: 'car', brand_model: '', plate_number: '', current_odometer: 0, status: 'active' })}>បន្ថែមយានយន្ត</button>}{hasPermission('fuel.create') && <button className="btn-primary" onClick={() => { setOdometerSource(null); setForm({ ...emptyForm }) }}><Plus size={18}/>កត់ត្រាចំណាយសាំង</button>}</div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon, color]) => <div className="card flex items-center gap-3 p-4" key={label}><div className={`grid size-11 place-items-center rounded-xl ${color}`}><Icon size={22}/></div><div><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold">{value}</p></div></div>)}</div>
    <div className="card grid gap-3 p-4 md:grid-cols-4"><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input className="field pl-10" placeholder="លេខបញ្ជី / វិក្កយបត្រ..." value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })}/></div><select className="field" value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })}><option value="">ស្ថានភាពទាំងអស់</option>{Object.entries(FUEL_STATUS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select><select className="field" value={filters.vehicleId} onChange={event => setFilters({ ...filters, vehicleId: event.target.value })}><option value="">យានយន្តទាំងអស់</option>{lookups.vehicles.map(item => <option key={item.id} value={item.id}>{item.plate_number} · {item.brand_model}</option>)}</select><select className="field" value={filters.salesId} onChange={event => setFilters({ ...filters, salesId: event.target.value })}><option value="">Sales ទាំងអស់</option>{lookups.drivers.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></div>
    <div className="card overflow-hidden">{loading ? <LoadingState/> : rows.length === 0 ? <EmptyState title="មិនទាន់មានចំណាយសាំង"/> : <div className="overflow-x-auto"><table className="w-full min-w-[1200px]"><thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500"><tr>{['លេខបញ្ជី','កាលបរិច្ឆេទ','Sales / Plan','យានយន្ត','ចម្ងាយ','សាំង','តម្លៃសរុប','ប្រសិទ្ធភាព','ស្ថានភាព','សកម្មភាព'].map(item => <th className="table-cell" key={item}>{item}</th>)}</tr></thead><tbody className="divide-y">{rows.map(row => { const status = FUEL_STATUS[row.status] || FUEL_STATUS.draft; return <tr key={row.id}><td className="table-cell font-semibold text-blue-700">{row.expense_code}</td><td className="table-cell">{new Date(row.expense_date).toLocaleDateString('km-KH')}</td><td className="table-cell"><b>{row.sales?.full_name}</b><p className="max-w-52 truncate text-xs text-slate-500">{row.plan?.title}</p></td><td className="table-cell">{row.vehicle?.plate_number}<p className="text-xs text-slate-500">{row.driver?.full_name}</p></td><td className="table-cell">{number(row.distance_km)} km</td><td className="table-cell">{number(row.fuel_liters)} L</td><td className="table-cell font-bold">{number(row.total_amount)} {row.currency}</td><td className="table-cell">{number(row.fuel_efficiency)} km/L</td><td className="table-cell"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span></td><td className="table-cell"><div className="flex gap-1">{['draft','rejected','submitted'].includes(row.status) && hasPermission('fuel.update') && <button title="កែប្រែ" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" onClick={() => edit(row)}><Pencil size={17}/></button>}{['draft','rejected'].includes(row.status) && hasPermission('fuel.submit') && <button title="ដាក់ស្នើ" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" onClick={() => submit(row.id)}><Send size={17}/></button>}{row.status === 'submitted' && hasPermission('fuel.approve') && <><button title="អនុម័ត" className="rounded-lg p-2 text-green-600 hover:bg-green-50" onClick={() => decide(row.id, 'approved')}><Check size={18}/></button><button title="បដិសេធ" className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => decide(row.id, 'rejected')}><XCircle size={18}/></button></>}</div></td></tr> })}</tbody></table></div>}</div>
    <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? 'កែចំណាយសាំង' : 'កត់ត្រាចំណាយសាំង'} size="max-w-4xl"><form className="space-y-5" onSubmit={save}>
      <FormSection number="1" title="បុគ្គលិក និងផែនការចុះទីតាំង" description="ជ្រើស Sales ជាមុន ដើម្បីបង្ហាញតែផែនការរបស់បុគ្គលិកនោះ។"><div className="grid gap-4 md:grid-cols-3">
        <Field label="ឈ្មោះ Sales *"><select required className="field" value={form?.sales_user_id || ''} onChange={event => selectSales(event.target.value)}><option value="">ជ្រើសរើស Sales</option>{salesOptions.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></Field>
        <Field label="ផែនការចុះទីតាំង *"><select required disabled={!form?.sales_user_id} className="field disabled:cursor-not-allowed disabled:bg-slate-100" value={form?.visit_plan_id || ''} onChange={event => selectPlan(event.target.value)}><option value="">{form?.sales_user_id ? 'ជ្រើសរើស Plan' : 'សូមជ្រើស Sales ជាមុន'}</option>{filteredPlans.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select><p className="mt-1 text-xs text-slate-500">មាន {filteredPlans.length} ផែនការ</p></Field>
        <Field label="សំណើចំណាយ"><select disabled={!form?.visit_plan_id || lookups.requests.length === 0} className="field disabled:cursor-not-allowed disabled:bg-slate-100" value={form?.visit_expense_id || ''} onChange={event => selectRequest(event.target.value)}><option value="">{form?.visit_plan_id ? 'មិនភ្ជាប់សំណើចំណាយ' : 'ជ្រើស Plan ជាមុន'}</option>{lookups.requests.map(item => <option key={item.id} value={item.id}>{item.request_code} · {item.purpose}</option>)}</select><p className="mt-1 text-xs text-slate-500">{form?.visit_plan_id && lookups.requests.length === 0 ? 'នឹងកាត់ពីថវិកា Sales/Plan ដោយផ្ទាល់' : `មាន ${lookups.requests.length} សំណើ`}</p></Field>
      </div></FormSection>
      <FormSection number="2" title="ទីតាំង និងកាលបរិច្ឆេទ" description="កំណត់តំបន់ដែលបានចុះបំពេញការងារ។"><div className="grid gap-4 md:grid-cols-2">
        <Field label="រាជធានី / ខេត្ត *"><select required className="field" value={form?.province_id || ''} onChange={event => selectProvince(event.target.value)}><option value="">ជ្រើសរើសខេត្ត</option>{lookups.provinces.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)}</select></Field>
        <Field label="ក្រុង / ស្រុក / ខណ្ឌ *"><select required disabled={!form?.province_id} className="field disabled:bg-slate-100" value={form?.district_id || ''} onChange={event => setForm({ ...form, district_id: event.target.value })}><option value="">ជ្រើសរើសស្រុក/ខណ្ឌ</option>{lookups.districts.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)}</select></Field>
        <Field label="កាលបរិច្ឆេទ *"><input required type="date" className="field" min={selectedPlan?.start_date || ''} max={selectedPlan?.end_date || ''} value={form?.expense_date || ''} onChange={event => setForm({ ...form, expense_date: event.target.value })}/>{selectedPlan && <p className="mt-1 text-xs text-slate-500">ចន្លោះ {formatDate(selectedPlan.start_date)} ដល់ {formatDate(selectedPlan.end_date)}</p>}</Field>
        <div className="flex items-end"><button type="button" onClick={useCurrentLocation} className="btn-secondary w-full"><Crosshair size={18}/>យកទីតាំង GPS បច្ចុប្បន្ន</button></div>
        <Field label="Latitude *"><input required min="-90" max="90" step="0.0000001" type="number" className="field" placeholder="ឧ. 11.5563740" value={form?.latitude || ''} onChange={event => setForm({ ...form, latitude: event.target.value })}/></Field>
        <Field label="Longitude *"><input required min="-180" max="180" step="0.0000001" type="number" className="field" placeholder="ឧ. 104.9282090" value={form?.longitude || ''} onChange={event => setForm({ ...form, longitude: event.target.value })}/></Field>
      </div></FormSection>
      <FormSection number="3" title="យានយន្ត និងចម្ងាយ" description="កត់លេខកុងទ័រដើម្បីគណនាចម្ងាយដោយស្វ័យប្រវត្តិ។"><div className="grid gap-4 md:grid-cols-2">
        <Field label="យានយន្ត *"><select required className="field" value={form?.vehicle_id || ''} onChange={event => selectVehicle(event.target.value)}><option value="">ជ្រើសរើសយានយន្ត</option>{lookups.vehicles.map(item => <option key={item.id} value={item.id}>{item.plate_number} · {item.brand_model}</option>)}</select></Field>
        <Field label="អ្នកបើកបរ *"><select required className="field" value={form?.driver_id || ''} onChange={event => setForm({ ...form, driver_id: event.target.value })}><option value="">ជ្រើសរើសអ្នកបើកបរ</option>{lookups.drivers.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></Field>
      <Field label="គីឡូម៉ែត្រចាប់ផ្តើម *"><input required readOnly min="0" step="0.01" type="number" className="field bg-slate-50 font-semibold text-blue-700" value={form?.start_odometer || ''}/>{odometerLoading ? <p className="mt-1 text-xs text-blue-600">កំពុងទាញគីឡូម៉ែត្រចុងក្រោយ...</p> : odometerSource?.code ? <p className="mt-1 text-xs text-emerald-700">បន្តពី {number(odometerSource.value)} km · {odometerSource.code} · {new Date(odometerSource.date).toLocaleDateString('km-KH')}</p> : form?.vehicle_id && <p className="mt-1 text-xs text-slate-500">យកពីគីឡូម៉ែត្របច្ចុប្បន្នរបស់យានយន្ត</p>}</Field>
      <Field label="គីឡូម៉ែត្របញ្ចប់ *"><input required min="0" step="0.01" type="number" className="field" value={form?.end_odometer || ''} onChange={event => setForm({ ...form, end_odometer: event.target.value })}/></Field>
      </div></FormSection>
      <FormSection number="4" title="ព័ត៌មានចាក់សាំង" description="បញ្ចូលបរិមាណ តម្លៃ និងឯកសារបញ្ជាក់។"><div className="grid gap-4 md:grid-cols-2">
      <Field label="បរិមាណសាំង (លីត្រ) *"><input required min="0.01" step="0.01" type="number" className="field" value={form?.fuel_liters || ''} onChange={event => setForm({ ...form, fuel_liters: event.target.value })}/></Field>
      <Field label="តម្លៃក្នុងមួយលីត្រ *"><div className="flex gap-2"><input required min="0.01" step="0.01" type="number" className="field" value={form?.price_per_liter || ''} onChange={event => setForm({ ...form, price_per_liter: event.target.value })}/><select className="field w-28" value={form?.currency || 'KHR'} onChange={event => setForm({ ...form, currency: event.target.value })}><option>KHR</option><option>USD</option></select></div></Field>
      <Field label="ស្ថានីយប្រេង *"><input required className="field" value={form?.fuel_station || ''} onChange={event => setForm({ ...form, fuel_station: event.target.value })}/></Field>
      <Field label="លេខវិក្កយបត្រ *"><input required className="field" value={form?.invoice_number || ''} onChange={event => setForm({ ...form, invoice_number: event.target.value })}/></Field>
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-blue-50 p-4 md:col-span-2"><Metric label="ចម្ងាយ" value={`${number(metrics.distance_km)} km`}/><Metric label="តម្លៃសរុប" value={`${number(metrics.total_amount)} ${form?.currency || 'KHR'}`}/><Metric label="ប្រសិទ្ធភាព" value={`${number(metrics.fuel_efficiency)} km/L`}/><Metric label="ចំណាយក្នុង 1 km" value={`${number(metrics.cost_per_km)} ${form?.currency || 'KHR'}`}/></div>
      <FileField required={!form?.id} label={`រូបកុងទ័រចាប់ផ្តើម${form?.id ? '' : ' *'}`} onChange={file => setFiles({ ...files, startPhoto: file })}/><FileField required={!form?.id} label={`រូបកុងទ័របញ្ចប់${form?.id ? '' : ' *'}`} onChange={file => setFiles({ ...files, endPhoto: file })}/><FileField required={!form?.id} label={`វិក្កយបត្រ/បង្កាន់ដៃ${form?.id ? '' : ' *'}`} onChange={file => setFiles({ ...files, receipt: file })}/>
      <Field label="កំណត់សម្គាល់"><input className="field" value={form?.note || ''} onChange={event => setForm({ ...form, note: event.target.value })}/></Field>
      </div></FormSection>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white py-4"><button type="button" className="btn-secondary" onClick={() => setForm(null)}>បោះបង់</button><button disabled={saving} className="btn-primary">{saving ? 'កំពុងរក្សាទុក...' : form?.id ? 'រក្សាទុកការកែប្រែ' : 'រក្សាទុកព្រាង'}</button></div>
    </form></Modal>
    <Modal open={Boolean(vehicleForm)} onClose={() => setVehicleForm(null)} title="បន្ថែមយានយន្ត"><form className="grid gap-4 md:grid-cols-2" onSubmit={saveVehicle}><Field label="លេខកូដ *"><input required className="field" value={vehicleForm?.vehicle_code || ''} onChange={event => setVehicleForm({ ...vehicleForm, vehicle_code: event.target.value })}/></Field><Field label="ស្លាកលេខ *"><input required className="field" value={vehicleForm?.plate_number || ''} onChange={event => setVehicleForm({ ...vehicleForm, plate_number: event.target.value })}/></Field><Field label="ម៉ាក / ម៉ូដែល *"><input required className="field" value={vehicleForm?.brand_model || ''} onChange={event => setVehicleForm({ ...vehicleForm, brand_model: event.target.value })}/></Field><Field label="ប្រភេទ *"><select className="field" value={vehicleForm?.vehicle_type || 'car'} onChange={event => setVehicleForm({ ...vehicleForm, vehicle_type: event.target.value })}><option value="car">រថយន្ត</option><option value="motorcycle">ម៉ូតូ</option><option value="truck">រថយន្តដឹកទំនិញ</option></select></Field><Field label="គីឡូម៉ែត្របច្ចុប្បន្ន"><input min="0" type="number" className="field" value={vehicleForm?.current_odometer || 0} onChange={event => setVehicleForm({ ...vehicleForm, current_odometer: event.target.value })}/></Field><div className="flex items-end"><button className="btn-primary w-full">រក្សាទុក</button></div></form></Modal>
  </div>
}

function Field({ label, children }) { return <div><label className="label">{label}</label>{children}</div> }
function FileField({ label, required = true, onChange }) { return <Field label={label}><input required={required} accept="image/jpeg,image/png,image/webp,application/pdf" type="file" className="field p-2" onChange={event => onChange(event.target.files[0])}/></Field> }
function Metric({ label, value }) { return <div><p className="text-xs text-blue-700">{label}</p><p className="font-bold text-blue-950">{value}</p></div> }
function FormSection({ number, title, description, children }) { return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">{number}</span><div><h3 className="font-bold text-slate-900">{title}</h3><p className="text-xs text-slate-500">{description}</p></div></div>{children}</section> }
function formatDate(value) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString('km-KH') : '' }
function clampDate(value, start, end) { if (!value || value < start) return start; if (value > end) return end; return value }
