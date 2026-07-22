import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Eye, EyeOff, KeyRound, Pencil, Plus, Power, Search, ShieldCheck, Trash2, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/common/Modal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import LoadingState from '../components/common/LoadingState'
import EmptyState from '../components/common/EmptyState'
import { PERMISSIONS, ROLE_DEFAULTS } from '../utils/permissions'
import { sanitizeText } from '../utils/formatters'
import { marketLookupService } from '../services/marketLookupService'

const blank = { full_name: '', username: '', phone: '', password: '', role: 'user', province_id: '', district_id: '' }
const roleLabels = { admin: 'Administrator', manager: 'Manager', sales: 'Sales', user: 'User' }
const rolePresets = [
  { key: 'manager', label: 'Manager', description: 'មើលក្រុមលក់ និងរបាយការណ៍', permissions: ROLE_DEFAULTS.manager },
  { key: 'sales', label: 'Sales', description: 'ធ្វើការជាមួយអតិថិជន និង Follow Up', permissions: ROLE_DEFAULTS.sales },
  { key: 'user', label: 'Viewer', description: 'មើលតែផ្ទាំងគ្រប់គ្រង និងការជូនដំណឹង', permissions: ROLE_DEFAULTS.user },
]
const permissionGroups = [...new Set(PERMISSIONS.map(permission => permission.group))]

export default function UserManagementPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
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
  const [roleOpen, setRoleOpen] = useState(false)
  const [roleForm, setRoleForm] = useState({ name: '', permissions: [] })
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data, error }, { data: roleRows, error: roleError }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,username,email,phone,role,permissions,province_id,district_id,is_active,created_at,app_role:app_roles!profiles_role_fkey(name,permissions)').order('created_at', { ascending: false }),
      supabase.from('app_roles').select('key,name,permissions,is_system').order('is_system', { ascending: false }).order('name'),
    ])
    if (error) toast.error(error.message)
    if (roleError) toast.error(roleError.message)
    ;(roleRows || []).forEach(role => { roleLabels[role.key] = role.name })
    setUsers((data || []).map(item => ({ ...item, permissions: item.app_role?.permissions || item.permissions })))
    setRoles(roleRows || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { marketLookupService.provinces().then(({data}) => setProvinces(data || [])) }, [])

  const invoke = async body => {
    const { data: sessionData } = await supabase.auth.refreshSession()
    return supabase.functions.invoke('manage-users', { body, headers: { Authorization: `Bearer ${sessionData.session?.access_token}` } })
  }
  const filtered = useMemo(() => users.filter(item => {
    const term = search.trim().toLowerCase()
    const matchesText = !term || item.full_name?.toLowerCase().includes(term) || item.username?.toLowerCase().includes(term)
    return matchesText && (roleFilter === 'all' || item.role === roleFilter) && (statusFilter === 'all' || String(item.is_active) === statusFilter)
  }), [users, search, roleFilter, statusFilter])

  const openCreate = () => { setEditing(null); setDistricts([]); setForm({ ...blank, role: roles.find(role => role.key === 'user')?.key || roles[0]?.key || 'user' }); setFormOpen(true) }
  const openEdit = async item => { setEditing(item); setForm({ full_name: item.full_name, username: item.username || '', phone: item.phone || '', password: '', role: item.role, province_id: item.province_id || '', district_id: item.district_id || '' }); const { data } = item.province_id ? await marketLookupService.districts(item.province_id) : { data: [] }; setDistricts(data || []); setFormOpen(true) }
  const changeScopeProvince = async event => { const provinceId = event.target.value; setForm(current => ({ ...current, province_id: provinceId, district_id: '' })); const { data } = provinceId ? await marketLookupService.districts(provinceId) : { data: [] }; setDistricts(data || []) }
  const toggleRolePermission = key => { setSelectedPreset(null); setRoleForm(current => ({ ...current, permissions: current.permissions.includes(key) ? current.permissions.filter(item => item !== key) : [...current.permissions, key] })) }
  const applyRolePreset = preset => { setSelectedPreset(preset.key); setRoleForm({ name: preset.label, permissions: [...preset.permissions] }) }
  const closeRoleModal = () => { setRoleOpen(false); setSelectedPreset(null); setRoleForm({ name: '', permissions: [] }) }
  const selectedRole = roles.find(role => role.key === form.role)
  const selfRoleLocked = editing?.id === currentUser?.id

  const createRole = async event => {
    event.preventDefault(); setSaving(true)
    const { data, error } = await invoke({ action: 'create_role', ...roleForm })
    setSaving(false)
    if (error || data?.error) return toast.error(data?.error || error?.message)
    toast.success('បានបង្កើត Role ថ្មី'); closeRoleModal(); load()
  }

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
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">គ្រប់គ្រងអ្នកប្រើប្រាស់</h1><p className="mt-1 text-sm text-slate-500">បង្កើត Role និង Permissions មុន រួចជ្រើស Role ពេលបង្កើត User</p></div><div className="flex gap-2"><button className="btn-secondary" onClick={() => setRoleOpen(true)}><ShieldCheck size={18}/>បង្កើត Role</button><button className="btn-primary" onClick={openCreate}><Plus size={18}/>បង្កើត User</button></div></div>
    <div className="card grid gap-3 p-4 md:grid-cols-[1fr_180px_180px]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="field pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="ស្វែងរកឈ្មោះ ឬ Username..."/></div><select className="field" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="all">Role ទាំងអស់</option>{roles.map(role => <option key={role.key} value={role.key}>{role.name}</option>)}</select><select className="field" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">ស្ថានភាពទាំងអស់</option><option value="true">សកម្ម</option><option value="false">បានបិទ</option></select></div>
    {loading ? <LoadingState/> : filtered.length === 0 ? <div className="card"><EmptyState title="រកមិនឃើញ User"/></div> : <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="table-cell">អ្នកប្រើប្រាស់</th><th className="table-cell">Role</th><th className="table-cell">សិទ្ធិ</th><th className="table-cell">ស្ថានភាព</th><th className="table-cell text-right">សកម្មភាព</th></tr></thead><tbody className="divide-y">{filtered.map(item => <tr key={item.id}><td className="table-cell"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-blue-100 font-bold text-blue-700">{item.full_name?.[0]?.toUpperCase() || 'U'}</div><div><p className="font-semibold">{item.full_name}</p><p className="text-xs text-slate-500">@{item.username || item.email?.split('@')[0]}</p></div></div></td><td className="table-cell"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{roleLabels[item.role]}</span></td><td className="table-cell"><div className="flex max-w-sm flex-wrap gap-1">{item.role === 'admin' ? <span className="text-sm">សិទ្ធិទាំងអស់</span> : item.permissions?.slice(0, 3).map(key => <span key={key} className="rounded bg-slate-100 px-2 py-1 text-[11px]">{PERMISSIONS.find(p => p.key === key)?.label}</span>)}{item.role !== 'admin' && item.permissions?.length > 3 && <span className="px-1 py-1 text-xs text-slate-500">+{item.permissions.length - 3}</span>}</div></td><td className="table-cell"><span className={item.is_active ? 'text-sm font-medium text-green-600' : 'text-sm font-medium text-slate-400'}>{item.is_active ? 'សកម្ម' : 'បានបិទ'}</span></td><td className="table-cell"><div className="flex justify-end gap-1"><button className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="កែប្រែ" onClick={() => openEdit(item)}><Pencil size={17}/></button><button className="rounded-lg p-2 text-amber-600 hover:bg-amber-50" title="Reset Password" onClick={() => setResetUser(item)}><KeyRound size={17}/></button><button disabled={item.id === currentUser?.id} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30" title={item.is_active ? 'បិទគណនី' : 'បើកគណនី'} onClick={() => setConfirm({ action: 'set_active', user: item, value: !item.is_active })}><Power size={17}/></button><button disabled={item.id === currentUser?.id} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-30" title="លុប" onClick={() => setConfirm({ action: 'delete', user: item })}><Trash2 size={17}/></button></div></td></tr>)}</tbody></table></div></div>}
    <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'កែប្រែអ្នកប្រើប្រាស់' : 'បង្កើតអ្នកប្រើប្រាស់ថ្មី'} size="max-w-lg">
      <form className="space-y-5" onSubmit={saveUser}>
        <div><label className="label">ឈ្មោះពេញ *</label><input className="field" required value={form.full_name} onChange={event => setForm({...form, full_name:event.target.value})}/></div>
        <div><label className="label">Username *</label><input className="field" required disabled={Boolean(editing)} value={form.username} onChange={event => setForm({...form, username:event.target.value})}/></div>
        <div><label className="label">លេខទូរស័ព្ទ</label><input className="field" value={form.phone} onChange={event => setForm({...form, phone:event.target.value})}/></div>
        <div><label className="label">Role *</label><select className="field" disabled={selfRoleLocked} value={form.role} onChange={event => setForm({...form, role:event.target.value})}>{roles.map(role => <option key={role.key} value={role.key}>{role.name}</option>)}</select>{selfRoleLocked ? <p className="mt-1 text-xs font-medium text-amber-600">ដើម្បីសុវត្ថិភាព អ្នកមិនអាចប្ដូរ Role របស់ខ្លួនឯងបានទេ។</p> : <p className="mt-1 text-xs text-slate-500">Permissions នឹងយកតាម Role ដែលបានជ្រើស។</p>}</div>
        {!selfRoleLocked && <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">កំណត់ត្រឹមខេត្ត</label><select className="field" value={form.province_id || ''} onChange={changeScopeProvince}><option value="">ទូទាំងប្រទេស</option>{provinces.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)}</select></div><div><label className="label">កំណត់ត្រឹមស្រុក/ខណ្ឌ</label><select className="field" disabled={!form.province_id} value={form.district_id || ''} onChange={event => setForm({...form,district_id:event.target.value})}><option value="">ទូទាំងខេត្ត</option>{districts.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)}</select></div></div>}
        {selectedRole && <div className="rounded-xl border bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">សិទ្ធិរបស់ {selectedRole.name}</p><span className="text-xs font-medium text-blue-600">{selectedRole.key === 'admin' ? 'សិទ្ធិទាំងអស់' : `${selectedRole.permissions?.length || 0} សិទ្ធិ`}</span></div><div className="mt-2 flex flex-wrap gap-1.5">{(selectedRole.permissions || []).map(key => <span key={key} className="rounded-md bg-white px-2 py-1 text-[11px] text-slate-600 shadow-sm">{PERMISSIONS.find(permission => permission.key === key)?.label || key}</span>)}</div>{selectedRole.permissions?.some(key => ['settings', 'user_management'].includes(key)) && <p className="mt-2 text-xs font-medium text-amber-600">Role នេះអាចចូលកាន់ផ្នែកគ្រប់គ្រងប្រព័ន្ធ។</p>}</div>}
        {!editing && <div><label className="label">Password *</label><input className="field" required type="password" value={form.password} onChange={event => setForm({...form,password:event.target.value})}/></div>}
        <div className="flex justify-end gap-3 border-t pt-4"><button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>បោះបង់</button><button className="btn-primary" disabled={saving}><UserCog size={18}/>{saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}</button></div>
      </form>
    </Modal>
    <Modal open={roleOpen} onClose={closeRoleModal} title="បង្កើត Role និង Permissions" size="max-w-2xl">
      <form className="space-y-5" onSubmit={createRole}>
        <div><label className="label">ឈ្មោះ Role *</label><input className="field" required minLength="2" maxLength="50" value={roleForm.name} onChange={event => { setSelectedPreset(null); setRoleForm({...roleForm, name:event.target.value}) }} placeholder="ឧ. Supervisor"/></div>
        <div>
          <div className="mb-3 flex items-center gap-2"><ShieldCheck size={19} className="text-blue-600"/><p className="font-semibold">Role Presets</p></div>
          <div className="grid gap-2 sm:grid-cols-3">
            {rolePresets.map(preset => <button type="button" key={preset.key} onClick={() => applyRolePreset(preset)} className={`relative rounded-xl border p-3 text-left transition ${selectedPreset === preset.key ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'hover:border-blue-300 hover:bg-blue-50'}`}>
              <span className="flex items-center justify-between gap-2 text-sm font-semibold">{preset.label}{selectedPreset === preset.key && <Check size={17} className="text-blue-600"/>}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{preset.description}</span>
            </button>)}
          </div>
          <p className="mt-2 text-xs text-slate-500">ចុច preset ដើម្បីបំពេញឈ្មោះ និង permissions ដោយស្វ័យប្រវត្តិ។ ការកែដោយដៃនឹងប្ដូរទៅ Custom Role។</p>
          {selectedPreset && <p className="mt-2 text-xs font-semibold text-blue-600">កំពុងប្រើ {rolePresets.find(preset => preset.key === selectedPreset)?.label} Preset</p>}
        </div>
        <div><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><ShieldCheck size={19} className="text-blue-600"/><p className="font-semibold">ជ្រើស Permissions សម្រាប់ Role</p><span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{roleForm.permissions.length}/{PERMISSIONS.length}</span></div><div className="flex gap-2"><button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-700" onClick={() => { setSelectedPreset(null); setRoleForm(current => ({ ...current, permissions: PERMISSIONS.map(permission => permission.key) })) }}>ជ្រើសទាំងអស់</button><span className="text-slate-300">|</span><button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-700" onClick={() => { setSelectedPreset(null); setRoleForm(current => ({ ...current, permissions: [] })) }}>ដកទាំងអស់</button></div></div><div className="space-y-4">{permissionGroups.map(group => <fieldset key={group}><legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{group}</legend><div className="grid gap-2 sm:grid-cols-2">{PERMISSIONS.filter(permission => permission.group === group).map(permission => <label key={permission.key} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${roleForm.permissions.includes(permission.key) ? 'border-blue-300 bg-blue-50' : 'hover:bg-slate-50'}`}><input type="checkbox" checked={roleForm.permissions.includes(permission.key)} onChange={() => toggleRolePermission(permission.key)}/>{permission.label}</label>)}</div></fieldset>)}</div>{roleForm.permissions.some(key => ['settings', 'user_management'].includes(key)) && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-700">សូមប្រុងប្រយ័ត្ន៖ Role នេះមានសិទ្ធិចូលកាន់ផ្នែកគ្រប់គ្រងប្រព័ន្ធ។</div>}</div>
        <div className="flex justify-end gap-3 border-t pt-4"><button type="button" className="btn-secondary" onClick={closeRoleModal}>បោះបង់</button><button className="btn-primary" disabled={saving || roleForm.name.trim().length < 2 || roleForm.permissions.length === 0}><ShieldCheck size={18}/>{saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក Role'}</button></div>
      </form>
    </Modal>
    <Modal open={Boolean(resetUser)} onClose={() => setResetUser(null)} title={`Reset Password: ${resetUser?.full_name}`} size="max-w-md"><form className="space-y-4" onSubmit={resetPassword}><div><label className="label">Password ថ្មី</label><div className="relative"><input className="field pr-10" required minLength="8" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={event => setNewPassword(event.target.value)}/><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div><p className="mt-1 text-xs text-slate-500">យ៉ាងតិច 8 តួ មានអក្សរធំ អក្សរតូច និងលេខ</p></div><div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setResetUser(null)}>បោះបង់</button><button className="btn-primary" disabled={saving}>កំណត់ Password</button></div></form></Modal>
    <ConfirmDialog open={Boolean(confirm)} onClose={() => setConfirm(null)} onConfirm={runConfirmed} loading={saving} title={confirm?.action === 'delete' ? 'លុបអ្នកប្រើប្រាស់' : 'បញ្ជាក់ការកែស្ថានភាព'} message={confirm?.action === 'delete' ? `តើអ្នកពិតជាចង់លុប ${confirm?.user.full_name} មែនទេ? ទិន្នន័យនេះមិនអាចយកត្រឡប់បានទេ។` : `តើអ្នកចង់${confirm?.value ? 'បើក' : 'បិទ'}គណនី ${confirm?.user.full_name} មែនទេ?`}/>
  </div>
}
