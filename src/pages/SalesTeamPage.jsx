import { useCallback, useEffect, useState } from 'react'
import { Eye, EyeOff, PhoneCall, Plus, Target, TrendingUp, Users } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../services/supabase'
import LoadingState from '../components/common/LoadingState'
import EmptyState from '../components/common/EmptyState'
import Modal from '../components/common/Modal'
import { sanitizeText } from '../utils/formatters'

const emptyForm = { full_name: '', email: '', phone: '', password: '' }

export default function SalesTeamPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select(
      'id,full_name,email,phone,is_active,customers:customers!customers_assigned_to_fkey(id,status),calls:call_histories!call_histories_called_by_fkey(id),follow_ups:follow_ups!follow_ups_assigned_to_fkey(id,status)',
    ).eq('role', 'sales').order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    setRows(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const createSales = async event => {
    event.preventDefault()
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
      toast.error('ពាក្យសម្ងាត់ត្រូវមានអក្សរធំ អក្សរតូច លេខ និងយ៉ាងតិច 8 តួ')
      return
    }
    setSaving(true)
    const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession()
    const accessToken = sessionData.session?.access_token
    if (sessionError || !accessToken) {
      setSaving(false)
      toast.error('Session បានផុតកំណត់។ សូមចាកចេញ ហើយ Login ម្ដងទៀត')
      return
    }
    const { data, error } = await supabase.functions.invoke('manage-sales', {
      body: { ...form, full_name: sanitizeText(form.full_name), phone: sanitizeText(form.phone) },
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    setSaving(false)
    if (error || data?.error) {
      let serverMessage = data?.error
      if (!serverMessage && error?.context) {
        try { serverMessage = (await error.context.clone().json())?.error } catch { /* use fallback */ }
      }
      if (error?.context?.status === 401 || serverMessage === 'Unauthorized') {
        serverMessage = 'Session មិនត្រឹមត្រូវ។ សូមចាកចេញ ហើយ Login ម្ដងទៀត'
      }
      toast.error(serverMessage || 'មិនអាចបង្កើត Sales user បាន')
      return
    }
    toast.success('បានបង្កើត Sales user')
    setForm(emptyForm)
    setOpen(false)
    load()
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">ក្រុម Sales</h1><p className="mt-1 text-sm text-slate-500">បង្កើតគណនី និងតាមដានសមិទ្ធផលរបស់ក្រុមលក់</p></div>
      <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18}/>បន្ថែម Sales</button>
    </div>
    {loading ? <LoadingState/> : rows.length === 0 ? <div className="card"><EmptyState title="មិនមាន Sales User" description="ចុចប៊ូតុង បន្ថែម Sales ដើម្បីបង្កើតគណនីថ្មី។"/></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map(sales => {
        const total = sales.customers?.length || 0
        const converted = sales.customers?.filter(customer => customer.status === 'converted').length || 0
        const calls = sales.calls?.length || 0
        const followUps = sales.follow_ups?.length || 0
        const rate = total ? Math.round(converted / total * 100) : 0
        return <div className="card p-5" key={sales.id}>
          <div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">{sales.full_name?.[0]?.toUpperCase()}</div><div className="min-w-0"><h2 className="truncate font-bold">{sales.full_name}</h2><p className="truncate text-sm text-slate-500">{sales.email}</p><p className="text-xs text-slate-400">{sales.phone || 'មិនមានលេខទូរស័ព្ទ'}</p></div><span className={`ml-auto size-2 shrink-0 rounded-full ${sales.is_active ? 'bg-green-500' : 'bg-slate-300'}`}/></div>
          <div className="mt-5 grid grid-cols-2 gap-3">{[[Users,total,'អតិថិជន'],[PhoneCall,calls,'ការហៅ'],[Target,followUps,'Follow Up'],[TrendingUp,`${rate}%`,'Conversion']].map(([Icon,value,label]) => <div className="rounded-xl bg-slate-50 p-3" key={label}><Icon size={17} className="text-blue-600"/><p className="mt-2 text-xl font-bold">{value}</p><p className="text-xs text-slate-500">{label}</p></div>)}</div>
          <p className="mt-4 text-sm text-green-600">Converted: <b>{converted}</b></p>
        </div>
      })}
    </div>}
    <Modal open={open} onClose={() => setOpen(false)} title="បន្ថែម Sales User" size="max-w-lg">
      <form className="space-y-4" onSubmit={createSales}>
        <div><label className="label">ឈ្មោះពេញ *</label><input className="field" required name="full_name" value={form.full_name} onChange={update} placeholder="ឈ្មោះ Sales"/></div>
        <div><label className="label">អ៊ីមែល *</label><input className="field" required type="email" name="email" value={form.email} onChange={update} placeholder="sales@company.com"/></div>
        <div><label className="label">លេខទូរស័ព្ទ</label><input className="field" inputMode="tel" name="phone" value={form.phone} onChange={update} placeholder="012345678"/></div>
        <div><label className="label">ពាក្យសម្ងាត់ *</label><div className="relative"><input className="field pr-10" required minLength="8" type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={update} placeholder="ឧ. Sales@2026"/><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div><p className="mt-1 text-xs text-slate-500">យ៉ាងតិច 8 តួ និងត្រូវមានអក្សរធំ អក្សរតូច និងលេខ</p></div>
        <div className="flex justify-end gap-3 border-t pt-4"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>បោះបង់</button><button className="btn-primary" disabled={saving}>{saving ? 'កំពុងបង្កើត...' : 'បង្កើត Sales'}</button></div>
      </form>
    </Modal>
  </div>
}
