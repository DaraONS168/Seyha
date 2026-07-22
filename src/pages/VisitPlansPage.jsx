import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, Edit3, MapPin, Navigation, Plus, Route, Search, Trash2, UserRound } from 'lucide-react'
import { format, isAfter, isBefore, isToday, parseISO, startOfDay } from 'date-fns'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { customerService } from '../services/customerService'
import { visitPlanService } from '../services/visitPlanService'
import { PROVINCES } from '../utils/constants'
import { formatDate, sanitizeText, toLocalInput } from '../utils/formatters'
import Badge from '../components/common/Badge'
import EmptyState from '../components/common/EmptyState'
import LoadingState from '../components/common/LoadingState'
import Modal from '../components/common/Modal'

const PLAN_STATUSES = [['draft','ព្រាង'],['planned','បានរៀបចំ'],['in_progress','កំពុងចុះ'],['completed','បានបញ្ចប់'],['cancelled','បានបោះបង់']]
const STOP_STATUSES = [['pending','រង់ចាំ'],['visited','បានជួប'],['rescheduled','ប្ដូរពេល'],['missed','ខកខាន'],['cancelled','បានបោះបង់']]
const PLAN_COLORS = { draft:'bg-slate-100 text-slate-700', planned:'bg-blue-100 text-blue-700', in_progress:'bg-orange-100 text-orange-700', completed:'bg-green-100 text-green-700', cancelled:'bg-red-100 text-red-700' }
const STOP_COLORS = { pending:'bg-blue-50 text-blue-700', visited:'bg-green-50 text-green-700', rescheduled:'bg-orange-50 text-orange-700', missed:'bg-red-50 text-red-700', cancelled:'bg-slate-100 text-slate-600' }
const labelOf = (items, value) => items.find(([key]) => key === value)?.[1] || value
const today = format(new Date(), 'yyyy-MM-dd')
const emptyPlan = { title:'', start_date:today, end_date:today, province:'', district:'', assigned_to:'', purpose:'', transport:'', planned_distance_km:'', status:'planned', notes:'' }
const emptyStop = { customer_id:'', commune:'', village:'', address:'', visit_at:'', stop_order:1, purpose:'', result:'', status:'pending', latitude:'', longitude:'', notes:'' }
const planFields = ['title', 'start_date', 'end_date', 'province', 'district', 'assigned_to', 'purpose', 'transport', 'planned_distance_km', 'status', 'notes']
const stopFields = ['customer_id', 'commune', 'village', 'address', 'visit_at', 'stop_order', 'purpose', 'result', 'status', 'latitude', 'longitude', 'notes']
const pickFields = (source, fields) => Object.fromEntries(fields.map(field => [field, source[field]]))

const planTiming = plan => {
  if (plan.status === 'completed') return { label:'បានបញ្ចប់', border:'border-l-green-500', text:'text-green-700' }
  if (plan.status === 'cancelled') return { label:'បានបោះបង់', border:'border-l-slate-400', text:'text-slate-500' }
  const now = startOfDay(new Date()), start = parseISO(plan.start_date), end = parseISO(plan.end_date)
  if (isBefore(end, now)) return { label:'ហួសថ្ងៃ', border:'border-l-red-500', text:'text-red-600' }
  if (isToday(start) || (!isBefore(now, start) && !isAfter(now, end))) return { label:'ថ្ងៃនេះ', border:'border-l-orange-500', text:'text-orange-600' }
  return { label:'ពេលក្រោយ', border:'border-l-blue-500', text:'text-blue-600' }
}

export default function VisitPlansPage() {
  const { user, isAdmin } = useAuth()
  const [plans, setPlans] = useState([]), [sales, setSales] = useState([]), [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true), [filters, setFilters] = useState({ search:'', status:'', assignedTo:'', date:'' })
  const [planOpen, setPlanOpen] = useState(false), [planForm, setPlanForm] = useState(emptyPlan), [editing, setEditing] = useState(null), [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null), [stops, setStops] = useState([]), [stopsLoading, setStopsLoading] = useState(false)
  const [stopOpen, setStopOpen] = useState(false), [stopForm, setStopForm] = useState(emptyStop), [editingStop, setEditingStop] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await visitPlanService.list(filters)
    if (error) toast.error(error.message)
    setPlans(data || []); setLoading(false)
  }, [filters])
  useEffect(() => { const timer = setTimeout(load, 200); return () => clearTimeout(timer) }, [load])
  useEffect(() => { Promise.all([customerService.sales(), visitPlanService.customers()]).then(([salesResult, customerResult]) => { setSales(salesResult.data || []); setCustomers(customerResult.data || []) }) }, [])

  const loadStops = useCallback(async plan => {
    setSelected(plan); setStopsLoading(true)
    const { data, error } = await visitPlanService.stops(plan.id)
    if (error) toast.error(error.message)
    setStops(data || []); setStopsLoading(false)
  }, [])
  const openPlan = plan => { setEditing(plan || null); setPlanForm(plan ? { ...emptyPlan, ...plan } : { ...emptyPlan, assigned_to:isAdmin ? '' : user.id }); setPlanOpen(true) }
  const updatePlanForm = event => setPlanForm(current => ({ ...current, [event.target.name]:event.target.value }))
  const savePlan = async event => {
    event.preventDefault()
    if (planForm.end_date < planForm.start_date) { toast.error('ថ្ងៃបញ្ចប់ត្រូវនៅក្រោយថ្ងៃចាប់ផ្ដើម'); return }
    if (!planForm.assigned_to) { toast.error('សូមជ្រើសរើស Sales'); return }
    setSaving(true)
    const payload = { ...pickFields(planForm, planFields), title:sanitizeText(planForm.title), district:sanitizeText(planForm.district), purpose:sanitizeText(planForm.purpose), transport:sanitizeText(planForm.transport), planned_distance_km:planForm.planned_distance_km ? Number(planForm.planned_distance_km) : null, notes:sanitizeText(planForm.notes) }
    const { data, error } = editing ? await visitPlanService.update(editing.id, payload) : await visitPlanService.create({ ...payload, created_by:user.id })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(editing ? 'បានកែប្រែ Plan' : 'បានបង្កើត Plan'); setPlanOpen(false); load()
    if (selected?.id === data.id) { setSelected({ ...selected, ...data }) }
  }
  const updatePlanStatus = async status => {
    const { data, error } = await visitPlanService.update(selected.id, { status })
    if (error) toast.error(error.message); else { toast.success('បានកែស្ថានភាព Plan'); setSelected({ ...selected, ...data }); load() }
  }
  const deletePlan = async () => {
    if (!window.confirm(`តើអ្នកចង់លុប Plan “${selected.title}” និងទីតាំងទាំងអស់មែនទេ?`)) return
    const { error } = await visitPlanService.remove(selected.id)
    if (error) toast.error(error.message); else { toast.success('បានលុប Plan'); setSelected(null); load() }
  }
  const openStop = stop => {
    setEditingStop(stop || null)
    setStopForm(stop ? { ...emptyStop, ...stop, customer_id:stop.customer_id || '', visit_at:toLocalInput(stop.visit_at), latitude:stop.latitude || '', longitude:stop.longitude || '' } : { ...emptyStop, visit_at:`${selected.start_date}T08:00`, stop_order:stops.length + 1 })
    setStopOpen(true)
  }
  const updateStopForm = event => setStopForm(current => ({ ...current, [event.target.name]:event.target.value }))
  const saveStop = async event => {
    event.preventDefault(); setSaving(true)
    const payload = { ...pickFields(stopForm, stopFields), visit_plan_id:selected.id, customer_id:stopForm.customer_id || null, visit_at:new Date(stopForm.visit_at).toISOString(), stop_order:Number(stopForm.stop_order), latitude:stopForm.latitude ? Number(stopForm.latitude) : null, longitude:stopForm.longitude ? Number(stopForm.longitude) : null, commune:sanitizeText(stopForm.commune), village:sanitizeText(stopForm.village), address:sanitizeText(stopForm.address), purpose:sanitizeText(stopForm.purpose), result:sanitizeText(stopForm.result), notes:sanitizeText(stopForm.notes) }
    const { error } = editingStop ? await visitPlanService.updateStop(editingStop.id, payload) : await visitPlanService.createStop({ ...payload, created_by:user.id })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(editingStop ? 'បានកែទីតាំង' : 'បានបន្ថែមទីតាំង'); setStopOpen(false); loadStops(selected); load()
  }
  const setStopStatus = async (stop, status) => { const { error } = await visitPlanService.updateStop(stop.id, { status }); if (error) toast.error(error.message); else { toast.success('បានកែស្ថានភាព'); loadStops(selected) } }
  const deleteStop = async stop => { if (!window.confirm('តើអ្នកចង់លុបទីតាំងនេះមែនទេ?')) return; const { error } = await visitPlanService.removeStop(stop.id); if (error) toast.error(error.message); else { toast.success('បានលុបទីតាំង'); loadStops(selected); load() } }
  const mapUrl = stop => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.latitude && stop.longitude ? `${stop.latitude},${stop.longitude}` : [stop.address,stop.village,stop.commune,selected.district,selected.province].filter(Boolean).join(', '))}`

  const summary = useMemo(() => ({ total:plans.length, today:plans.filter(plan => planTiming(plan).label === 'ថ្ងៃនេះ').length, overdue:plans.filter(plan => planTiming(plan).label === 'ហួសថ្ងៃ').length, completed:plans.filter(plan => plan.status === 'completed').length }), [plans])
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">ផែនការចុះតាមស្រុក</h1><p className="mt-1 text-sm text-slate-500">រៀបចំថ្ងៃ ទីតាំង Sales និងអតិថិជនដែលត្រូវចុះជួប</p></div><button className="btn-primary" onClick={() => openPlan()}><Plus size={18}/>បង្កើត Plan</button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[[Route,summary.total,'Plan សរុប','text-blue-600 bg-blue-50'],[CalendarDays,summary.today,'ថ្ងៃនេះ','text-orange-600 bg-orange-50'],[Clock3,summary.overdue,'ហួសថ្ងៃ','text-red-600 bg-red-50'],[CheckCircle2,summary.completed,'បានបញ្ចប់','text-green-600 bg-green-50']].map(([Icon,value,label,tone]) => <div className="card flex items-center gap-3 p-4" key={label}><div className={`rounded-xl p-3 ${tone}`}><Icon size={20}/></div><div><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p></div></div>)}</div>
    <div className="card p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><div className="relative xl:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input className="field pl-10" placeholder="ស្វែងរក Plan ខេត្ត ឬស្រុក" value={filters.search} onChange={event => setFilters(current => ({ ...current, search:event.target.value }))}/></div><select className="field" value={filters.status} onChange={event => setFilters(current => ({ ...current, status:event.target.value }))}><option value="">ស្ថានភាពទាំងអស់</option>{PLAN_STATUSES.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>{isAdmin && <select className="field" value={filters.assignedTo} onChange={event => setFilters(current => ({ ...current, assignedTo:event.target.value }))}><option value="">Sales ទាំងអស់</option>{sales.map(person => <option key={person.id} value={person.id}>{person.full_name}</option>)}</select>}<input type="date" className="field" value={filters.date} onChange={event => setFilters(current => ({ ...current, date:event.target.value }))}/></div></div>
    {loading ? <LoadingState/> : plans.length === 0 ? <div className="card"><EmptyState title="មិនទាន់មាន Plan" description="បង្កើតផែនការចុះតាមស្រុកដំបូងរបស់អ្នក។"/></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{plans.map(plan => { const timing=planTiming(plan); return <button key={plan.id} onClick={() => loadStops(plan)} className={`card border-l-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${timing.border}`}><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{plan.title}</h2><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14}/>{plan.district}, {plan.province}</p></div><Badge className={PLAN_COLORS[plan.status]}>{labelOf(PLAN_STATUSES,plan.status)}</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm"><div><p className="text-xs text-slate-400">ថ្ងៃចាប់ផ្ដើម</p><p className="font-semibold">{formatDate(plan.start_date,'dd MMM yyyy')}</p></div><div><p className="text-xs text-slate-400">ថ្ងៃបញ្ចប់</p><p className="font-semibold">{formatDate(plan.end_date,'dd MMM yyyy')}</p></div></div><div className="mt-4 flex items-center gap-2 text-sm"><UserRound size={15} className="text-blue-600"/><span className="flex-1">{plan.assignee?.full_name}</span><span className={`font-semibold ${timing.text}`}>{timing.label}</span></div><p className="mt-3 text-xs text-slate-500">{plan.stops?.[0]?.count || 0} ទីតាំង/អតិថិជន</p></button> })}</div>}

    <Modal open={planOpen} onClose={() => setPlanOpen(false)} title={editing ? 'កែប្រែផែនការ' : 'បង្កើតផែនការចុះតាមស្រុក'}><form onSubmit={savePlan} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><label className="label">ឈ្មោះ Plan *</label><input required className="field" name="title" value={planForm.title} onChange={updatePlanForm} placeholder="ឧ. ចុះជួបអតិថិជនស្រុកអង្គស្នួល"/></div><div><label className="label">ថ្ងៃចាប់ផ្ដើម *</label><input required type="date" className="field" name="start_date" value={planForm.start_date} onChange={updatePlanForm}/></div><div><label className="label">ថ្ងៃបញ្ចប់ *</label><input required type="date" min={planForm.start_date} className="field" name="end_date" value={planForm.end_date} onChange={updatePlanForm}/></div><div><label className="label">ខេត្ត *</label><select required className="field" name="province" value={planForm.province} onChange={updatePlanForm}><option value="">ជ្រើសរើសខេត្ត</option>{PROVINCES.filter(item => item !== 'ផ្សេងៗ').map(item => <option key={item}>{item}</option>)}</select></div><div><label className="label">ស្រុក/ខណ្ឌ *</label><input required className="field" name="district" value={planForm.district} onChange={updatePlanForm}/></div><div><label className="label">Sales *</label><select required disabled={!isAdmin} className="field" name="assigned_to" value={planForm.assigned_to} onChange={updatePlanForm}><option value="">ជ្រើសរើស Sales</option>{sales.map(person => <option key={person.id} value={person.id}>{person.full_name}</option>)}</select></div><div><label className="label">ស្ថានភាព</label><select className="field" name="status" value={planForm.status} onChange={updatePlanForm}>{PLAN_STATUSES.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><label className="label mt-4">មធ្យោបាយធ្វើដំណើរ</label><input className="field" name="transport" value={planForm.transport || ''} onChange={updatePlanForm} placeholder="ឡាន ម៉ូតូ..."/></div><div><label className="label">គោលបំណង</label><textarea className="field min-h-28" name="purpose" value={planForm.purpose || ''} onChange={updatePlanForm}/></div><div><label className="label">កំណត់ចំណាំ</label><textarea className="field min-h-28" name="notes" value={planForm.notes || ''} onChange={updatePlanForm}/></div></div><div className="flex justify-end gap-3 border-t pt-4"><button type="button" className="btn-secondary" onClick={() => setPlanOpen(false)}>បោះបង់</button><button className="btn-primary" disabled={saving}>{saving ? 'កំពុងរក្សា...' : 'រក្សាទុក Plan'}</button></div></form></Modal>

    <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || 'ព័ត៌មាន Plan'} size="max-w-4xl">{selected && <div className="space-y-5"><div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-slate-400">ទីតាំង</p><p className="font-semibold">{selected.district}, {selected.province}</p></div><div><p className="text-xs text-slate-400">កាលបរិច្ឆេទ</p><p className="font-semibold">{formatDate(selected.start_date,'dd MMM')} – {formatDate(selected.end_date,'dd MMM yyyy')}</p></div><div><p className="text-xs text-slate-400">Sales</p><p className="font-semibold">{selected.assignee?.full_name}</p></div><div><p className="text-xs text-slate-400">ស្ថានភាព</p><select className="mt-1 rounded-lg border bg-white px-2 py-1 text-sm" value={selected.status} onChange={event => updatePlanStatus(event.target.value)}>{PLAN_STATUSES.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div></div><div className="flex flex-wrap gap-2"><button className="btn-primary" onClick={() => openStop()}><Plus size={17}/>បន្ថែមទីតាំង</button><button className="btn-secondary" onClick={() => openPlan(selected)}><Edit3 size={17}/>កែ Plan</button>{isAdmin && <button className="btn-danger" onClick={deletePlan}><Trash2 size={17}/>លុប Plan</button>}</div><div><div className="mb-3 flex items-center justify-between"><h3 className="font-bold">ទីតាំង និងអតិថិជនត្រូវចុះជួប</h3><span className="text-sm text-slate-500">{stops.length} ទីតាំង</span></div>{stopsLoading ? <LoadingState/> : stops.length === 0 ? <EmptyState title="មិនទាន់មានទីតាំង" description="បន្ថែមអតិថិជន ឬទីតាំងដែលត្រូវចុះជួប។"/> : <div className="relative ml-3 border-l-2 border-slate-200 pl-6">{stops.map(stop => <div className="relative mb-5 rounded-xl border p-4 last:mb-0" key={stop.id}><span className="absolute -left-[34px] top-4 grid size-5 place-items-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-4 ring-white">{stop.stop_order}</span><div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-bold">{stop.customer?.name || stop.address || `ទីតាំងទី ${stop.stop_order}`}</h4>{stop.customer?.phone && <a href={`tel:${stop.customer.phone}`} className="text-sm text-blue-600">{stop.customer.phone}</a>}<p className="mt-1 text-sm text-slate-500">{[stop.village,stop.commune,stop.address].filter(Boolean).join(', ') || 'មិនមានអាសយដ្ឋាន'}</p></div><Badge className={STOP_COLORS[stop.status]}>{labelOf(STOP_STATUSES,stop.status)}</Badge></div><div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><span className="flex items-center gap-1"><Clock3 size={15}/>{formatDate(stop.visit_at)}</span><a className="inline-flex items-center gap-1 font-semibold text-blue-600" href={mapUrl(stop)} target="_blank" rel="noreferrer"><Navigation size={15}/>បើកផែនទី</a></div>{stop.purpose && <p className="mt-2 text-sm">គោលបំណង៖ {stop.purpose}</p>}<div className="mt-3 flex flex-wrap gap-2 border-t pt-3"><select className="rounded-lg border px-2 py-1.5 text-xs" value={stop.status} onChange={event => setStopStatus(stop,event.target.value)}>{STOP_STATUSES.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" onClick={() => openStop(stop)}><Edit3 size={15}/></button><button className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => deleteStop(stop)}><Trash2 size={15}/></button></div></div>)}</div>}</div></div>}</Modal>

    <Modal open={stopOpen} onClose={() => setStopOpen(false)} title={editingStop ? 'កែទីតាំងចុះជួប' : 'បន្ថែមទីតាំងចុះជួប'}><form onSubmit={saveStop} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><label className="label">អតិថិជន</label><select className="field" name="customer_id" value={stopForm.customer_id} onChange={updateStopForm}><option value="">ទីតាំងទូទៅ (មិនភ្ជាប់អតិថិជន)</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select></div><div><label className="label">ថ្ងៃ និងម៉ោងជួប *</label><input required type="datetime-local" className="field" name="visit_at" value={stopForm.visit_at} onChange={updateStopForm}/></div><div><label className="label">លំដាប់ទីតាំង *</label><input required min="1" type="number" className="field" name="stop_order" value={stopForm.stop_order} onChange={updateStopForm}/></div><div><label className="label">ឃុំ/សង្កាត់</label><input className="field" name="commune" value={stopForm.commune || ''} onChange={updateStopForm}/></div><div><label className="label">ភូមិ</label><input className="field" name="village" value={stopForm.village || ''} onChange={updateStopForm}/></div><div className="md:col-span-2"><label className="label">អាសយដ្ឋាន/ទីតាំង</label><input className="field" name="address" value={stopForm.address || ''} onChange={updateStopForm}/></div><div><label className="label">Latitude</label><input step="any" type="number" className="field" name="latitude" value={stopForm.latitude} onChange={updateStopForm} placeholder="11.5564"/></div><div><label className="label">Longitude</label><input step="any" type="number" className="field" name="longitude" value={stopForm.longitude} onChange={updateStopForm} placeholder="104.9282"/></div><div><label className="label">ស្ថានភាព</label><select className="field" name="status" value={stopForm.status} onChange={updateStopForm}>{STOP_STATUSES.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label className="label">គោលបំណង</label><input className="field" name="purpose" value={stopForm.purpose || ''} onChange={updateStopForm}/></div><div><label className="label">លទ្ធផល</label><textarea className="field min-h-24" name="result" value={stopForm.result || ''} onChange={updateStopForm}/></div><div><label className="label">កំណត់ចំណាំ</label><textarea className="field min-h-24" name="notes" value={stopForm.notes || ''} onChange={updateStopForm}/></div></div><div className="flex justify-end gap-3 border-t pt-4"><button type="button" className="btn-secondary" onClick={() => setStopOpen(false)}>បោះបង់</button><button className="btn-primary" disabled={saving}>{saving ? 'កំពុងរក្សា...' : 'រក្សាទុកទីតាំង'}</button></div></form></Modal>
  </div>
}
