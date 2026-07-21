import { useCallback, useEffect, useState } from 'react'
import { Eye, EyeOff, Plus, ShieldCheck, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../services/supabase'
import Modal from '../components/common/Modal'
import LoadingState from '../components/common/LoadingState'
import EmptyState from '../components/common/EmptyState'
import { PERMISSIONS, ROLE_DEFAULTS } from '../utils/permissions'
import { sanitizeText } from '../utils/formatters'

const emptyForm = { full_name: '', username: '', phone: '', password: '', role: 'sales', permissions: ROLE_DEFAULTS.sales }
const roleLabels = { admin: 'Administrator', manager: 'Manager', sales: 'Sales' }

export default function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('profiles')
      .select('id,full_name,username,email,phone,role,permissions,is_active,created_at')
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    setUsers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const changeRole = event => {
    const role = event.target.value
    setForm(current => ({ ...current, role, permissions: [...ROLE_DEFAULTS[role]] }))
  }
  const togglePermission = key => setForm(current => ({
    ...current,
    permissions: current.permissions.includes(key)
      ? current.permissions.filter(item => item !== key)
      : [...current.permissions, key],
  }))

  const createUser = async event => {
    event.preventDefault()
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(form.username)) return toast.error('Username មិនត្រឹមត្រូវ')
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) return toast.error('Password ត្រូវមានអក្សរធំ អក្សរតូច លេខ និងយ៉ាងតិច 8 តួ')
    setSaving(true)
    const { data: sessionData } = await supabase.auth.refreshSession()
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { ...form, full_name: sanitizeText(form.full_name), phone: sanitizeText(form.phone) },
      headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
    })
    setSaving(false)
    if (error || data?.error) return toast.error(data?.error || error?.message || 'មិនអាចបង្កើត User បាន')
    toast.success('បានបង្កើត User ថ្មី')
    setForm(emptyForm)
    setOpen(false)
    load()
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">គ្រប់គ្រងអ្នកប្រើប្រាស់</h1><p className="mt-1 text-sm text-slate-500">បង្កើតគណនី កំណត់ Role និងសិទ្ធិប្រើប្រាស់មុខងារ</p></div><button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18}/>បង្កើត User</button></div>
    {loading ? <LoadingState/> : users.length === 0 ? <div className="card"><EmptyState title="មិនទាន់មាន User"/></div> : <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="table-cell">អ្នកប្រើប្រាស់</th><th className="table-cell">Role</th><th className="table-cell">សិទ្ធិ</th><th className="table-cell">ស្ថានភាព</th></tr></thead><tbody className="divide-y">{users.map(user => <tr key={user.id}><td className="table-cell"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-blue-100 font-bold text-blue-700">{user.full_name?.[0]?.toUpperCase() || 'U'}</div><div><p className="font-semibold">{user.full_name}</p><p className="text-xs text-slate-500">@{user.username || user.email?.split('@')[0]}</p></div></div></td><td className="table-cell"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{roleLabels[user.role] || user.role}</span></td><td className="table-cell"><span className="text-sm text-slate-600">{user.role === 'admin' ? 'សិទ្ធិទាំងអស់' : `${user.permissions?.length || 0} មុខងារ`}</span></td><td className="table-cell"><span className={`text-sm font-medium ${user.is_active ? 'text-green-600' : 'text-slate-400'}`}>{user.is_active ? 'សកម្ម' : 'បានបិទ'}</span></td></tr>)}</tbody></table></div></div>}
    <Modal open={open} onClose={() => setOpen(false)} title="បង្កើតអ្នកប្រើប្រាស់ថ្មី" size="max-w-2xl"><form className="space-y-5" onSubmit={createUser}>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">ឈ្មោះពេញ *</label><input className="field" required name="full_name" value={form.full_name} onChange={update}/></div><div><label className="label">Username *</label><input className="field" required minLength="3" maxLength="30" name="username" autoCapitalize="none" value={form.username} onChange={update} placeholder="ឧ. seyha01"/></div><div><label className="label">លេខទូរស័ព្ទ</label><input className="field" name="phone" inputMode="tel" value={form.phone} onChange={update}/></div><div><label className="label">Role *</label><select className="field" name="role" value={form.role} onChange={changeRole}><option value="sales">Sales</option><option value="manager">Manager</option><option value="admin">Administrator</option></select></div></div>
      <div><label className="label">ពាក្យសម្ងាត់ *</label><div className="relative"><input className="field pr-10" required minLength="8" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={update} placeholder="ឧ. User@2026"/><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div>
      <div><div className="mb-3 flex items-center gap-2"><ShieldCheck size={19} className="text-blue-600"/><p className="font-semibold">សិទ្ធិប្រើប្រាស់មុខងារ</p></div><div className="grid gap-2 sm:grid-cols-2">{PERMISSIONS.map(permission => <label key={permission.key} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${form.permissions.includes(permission.key) ? 'border-blue-300 bg-blue-50 text-blue-800' : 'bg-white'}`}><input type="checkbox" className="size-4 accent-blue-600" checked={form.permissions.includes(permission.key)} disabled={form.role === 'admin'} onChange={() => togglePermission(permission.key)}/><span>{permission.label}</span></label>)}</div></div>
      <div className="flex justify-end gap-3 border-t pt-4"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>បោះបង់</button><button className="btn-primary" disabled={saving}><UserCog size={18}/>{saving ? 'កំពុងបង្កើត...' : 'បង្កើត User'}</button></div>
    </form></Modal>
  </div>
}
