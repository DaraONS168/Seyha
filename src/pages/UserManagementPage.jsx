import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, KeyRound, Pencil, Plus, Power, Search, ShieldCheck, Trash2, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import LoadingState from '../components/common/LoadingState'
import EmptyState from '../components/common/EmptyState'
import { PERMISSIONS, ROLE_DEFAULTS } from '../utils/permissions'
import { sanitizeText } from '../utils/formatters'

const blank = { full_name: '', username: '', phone: '', password: '', role: 'sales', permissions: ROLE_DEFAULTS.sales }
const roleLabels = { admin: 'Administrator', manager: 'Manager', sales: 'Sales', user: 'User' }

export default function UserManagementPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank)
  const [showPassword, setShowPassword] = useState(false)
  const [resetUser, setResetUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('id,full_name,username,email,phone,role,permissions,is_active,created_at').order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    setUsers(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const invoke = async body => {
    const { data: sessionData } = await supabase.auth.refreshSession()
    return supabase.functions.invoke('manage-users', { body, headers: { Authorization: `Bearer ${sessionData.session?.access_token}` } })
  }
  const filtered = useMemo(() => users.filter(item => {
    const term = search.trim().toLowerCase()
    const matchesText = !term || item.full_name?.toLowerCase().includes(term) || item.username?.toLowerCase().includes(term)
    return matchesText && (roleFilter === 'all' || item.role === roleFilter) && (statusFilter === 'all' || String(item.is_active) === statusFilter)
  }), [users, search, roleFilter, statusFilter])

  const openCreate = () => { setEditing(null); setForm({ ...blank, permissions: [...ROLE_DEFAULTS.sales] }); setFormOpen(true) }
  const openEdit = item => { setEditing(item); setForm({ full_name: item.full_name, username: item.username || '', phone: item.phone || '', password: '', role: item.role, permissions: item.permissions || [] }); setFormOpen(true) }
  const changeRole = event => { const role = event.target.value; setForm(current => ({ ...current, role, permissions: [...ROLE_DEFAULTS[role]] })) }
  const togglePermission = key => setForm(current => ({ ...current, permissions: current.permissions.includes(key) ? current.permissions.filter(item => item !== key) : [...current.permissions, key] }))

  const saveUser = async event => {
    event.preventDefault()
    if (!editing && !/^[a-zA-Z0-9._-]{3,30}$/.test(form.username)) return toast.error('Username មិនត្រឹមត្រូវ')
    if (!editing && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) return toast.error('Password ត្រូវមានអក្សរធំ អក្សរតូច លេខ និងយ៉ាងតិច 8 តួ')
    setSaving(true)
    const payload = { action: editing ? 'update' : 'create', user_id: editing?.id, ...form, full_name: sanitizeText(form.full_name), phone: sanitizeText(form.phone) }
    const { data, error } = await invoke(payload)
    setSaving(false)
    if (error || data?.error) return toast.error(data?.error || error?.message)
    toast.success(editing ? 'បានកែប្រែ User' : 'បានបង្កើត User')
    setFormOpen(false); load()
  }
  const runConfirmed = async () => {
    setSaving(true)
    const { data, error } = await invoke({ action: confirm.action, user_id: confirm.user.id, is_active: confirm.value })
    setSaving(false)
    if (error || data?.error) return toast.error(data?.error || error?.message)
    toast.success(confirm.action === 'delete' ? 'បានលុប User' : 'បានកែស្ថានភាព User')
    setConfirm(null); load()
  }
  const resetPassword = async event => {
    event.preventDefault()
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) return toast.error('Password មិនមានសុវត្ថិភាពគ្រប់គ្រាន់')
    setSaving(true)
    const { data, error } = await invoke({ action: 'reset_password', user_id: resetUser.id, password: newPassword })
    setSaving(false)
    if (error || data?.error) return toast.error(data?.error || error?.message)
    toast.success('បានកំណត់ Password ថ្មី'); setResetUser(null); setNewPassword('')
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">គ្រប់គ្រងអ្នកប្រើប្រាស់</h1><p className="mt-1 text-sm text-slate-500">បង្កើតគណនី កំណត់ Role និងសិទ្ធិប្រើប្រាស់មុខងារ</p></div><button className="btn-primary" onClick={openCreate}><Plus size={18}/>បង្កើត User</button></div>
    <div className="card grid gap-3 p-4 md:grid-cols-[1fr_180px_180px]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="field pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="ស្វែងរកឈ្មោះ ឬ Username..."/></div><select className="field" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="all">Role ទាំងអស់</option><option value="admin">Administrator</option><option value="manager">Manager</option><option value="sales">Sales</option><option value="user">User</option></select><select className="field" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">ស្ថានភាពទាំងអស់</option><option value="true">សកម្ម</option><option value="false">បានបិទ</option></select></div>
    {loading ? <LoadingState/> : filtered.length === 0 ? <div className="card"><EmptyState title="រកមិនឃើញ User"/></div> : <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="table-cell">អ្នកប្រើប្រាស់</th><th className="table-cell">Role</th><th className="table-cell">សិទ្ធិ</th><th className="table-cell">ស្ថានភាព</th><th className="table-cell text-right">សកម្មភាព</th></tr></thead><tbody className="divide-y">{filtered.map(item => <tr key={item.id}><td className="table-cell"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-blue-100 font-bold text-blue-700">{item.full_name?.[0]?.toUpperCase() || 'U'}</div><div><p className="font-semibold">{item.full_name}</p><p className="text-xs text-slate-500">@{item.username || item.email?.split('@')[0]}</p></div></div></td><td className="table-cell"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{roleLabels[item.role]}</span></td><td className="table-cell"><div className="flex max-w-sm flex-wrap gap-1">{item.role === 'admin' ? <span className="text-sm">សិទ្ធិទាំងអស់</span> : item.permissions?.slice(0, 3).map(key => <span key={key} className="rounded bg-slate-100 px-2 py-1 text-[11px]">{PERMISSIONS.find(p => p.key === key)?.label}</span>)}{item.role !== 'admin' && item.permissions?.length > 3 && <span className="px-1 py-1 text-xs text-slate-500">+{item.permissions.length - 3}</span>}</div></td><td className="table-cell"><span className={item.is_active ? 'text-sm font-medium text-green-600' : 'text-sm font-medium text-slate-400'}>{item.is_active ? 'សកម្ម' : 'បានបិទ'}</span></td><td className="table-cell"><div className="flex justify-end gap-1"><button className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="កែប្រែ" onClick={() => openEdit(item)}><Pencil size={17}/></button><button className="rounded-lg p-2 text-amber-600 hover:bg-amber-50" title="Reset Password" onClick={() => setResetUser(item)}><KeyRound size={17}/></button><button disabled={item.id === currentUser?.id} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30" title={item.is_active ? 'បិទគណនី' : 'បើកគណនី'} onClick={() => setConfirm({ action: 'set_active', user: item, value: !item.is_active })}><Power size={17}/></button><button disabled={item.id === currentUser?.id} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-30" title="លុប" onClick={() => setConfirm({ action: 'delete', user: item })}><Trash2 size={17}/></button></div></td></tr>)}</tbody></table></div></div>}
    <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'កែប្រែអ្នកប្រើប្រាស់' : 'បង្កើតអ្នកប្រើប្រាស់ថ្មី'} size="max-w-2xl"><form className="space-y-5" onSubmit={saveUser}><div className="grid gap-4 sm:grid-cols-2"><div><label className="label">ឈ្មោះពេញ *</label><input className="field" required value={form.full_name} onChange={event => setForm({...form, full_name:event.target.value})}/></div><div><label className="label">Username *</label><input className="field" required disabled={Boolean(editing)} value={form.username} onChange={event => setForm({...form, username:event.target.value})}/></div><div><label className="label">លេខទូរស័ព្ទ</label><input className="field" value={form.phone} onChange={event => setForm({...form, phone:event.target.value})}/></div><div><label className="label">Role *</label><select className="field" value={form.role} onChange={changeRole}><option value="user">User</option><option value="sales">Sales</option><option value="manager">Manager</option><option value="admin">Administrator</option></select></div></div>{!editing && <div><label className="label">Password *</label><input className="field" required type="password" value={form.password} onChange={event => setForm({...form,password:event.target.value})}/></div>}<div><div className="mb-3 flex items-center gap-2"><ShieldCheck size={19} className="text-blue-600"/><p className="font-semibold">សិទ្ធិប្រើប្រាស់</p></div><div className="grid gap-2 sm:grid-cols-2">{PERMISSIONS.map(permission => <label key={permission.key} className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${form.permissions.includes(permission.key) ? 'border-blue-300 bg-blue-50' : ''}`}><input type="checkbox" checked={form.permissions.includes(permission.key)} disabled={form.role === 'admin'} onChange={() => togglePermission(permission.key)}/>{permission.label}</label>)}</div></div><div className="flex justify-end gap-3 border-t pt-4"><button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>បោះបង់</button><button className="btn-primary" disabled={saving}><UserCog size={18}/>{saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}</button></div></form></Modal>
    <Modal open={Boolean(resetUser)} onClose={() => setResetUser(null)} title={`Reset Password: ${resetUser?.full_name}`} size="max-w-md"><form className="space-y-4" onSubmit={resetPassword}><div><label className="label">Password ថ្មី</label><div className="relative"><input className="field pr-10" required minLength="8" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={event => setNewPassword(event.target.value)}/><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div><p className="mt-1 text-xs text-slate-500">យ៉ាងតិច 8 តួ មានអក្សរធំ អក្សរតូច និងលេខ</p></div><div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setResetUser(null)}>បោះបង់</button><button className="btn-primary" disabled={saving}>កំណត់ Password</button></div></form></Modal>
    <ConfirmDialog open={Boolean(confirm)} onClose={() => setConfirm(null)} onConfirm={runConfirmed} loading={saving} title={confirm?.action === 'delete' ? 'លុបអ្នកប្រើប្រាស់' : 'បញ្ជាក់ការកែស្ថានភាព'} message={confirm?.action === 'delete' ? `តើអ្នកពិតជាចង់លុប ${confirm?.user.full_name} មែនទេ? ទិន្នន័យនេះមិនអាចយកត្រឡប់បានទេ។` : `តើអ្នកចង់${confirm?.value ? 'បើក' : 'បិទ'}គណនី ${confirm?.user.full_name} មែនទេ?`}/>
  </div>
}
