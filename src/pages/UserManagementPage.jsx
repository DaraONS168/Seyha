import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Eye, EyeOff, KeyRound, Pencil, Plus, Power, Search, Settings2, ShieldCheck, Trash2, UserCog } from 'lucide-react'
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
  const { user: currentUser, hasPermission } = useAuth()
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
  const [roleManagerOpen, setRoleManagerOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [roleForm, setRoleForm] = useState({ name: '', permissions: [] })
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [permissionSearch, setPermissionSearch] = useState('')
  const [collapsedPermissionGroups, setCollapsedPermissionGroups] = useState(() => new Set())
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
  const functionError = async (error, data) => {
    if (data?.error) return data.error
    if (error?.context) {
      const detail = await error.context.clone().json().catch(() => null)
      if (detail?.error) return detail.error
    }
    return error?.message || 'មានបញ្ហាក្នុងការភ្ជាប់ Edge Function'
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
  const closeRoleModal = () => { setRoleOpen(false); setEditingRole(null); setSelectedPreset(null); setPermissionSearch(''); setCollapsedPermissionGroups(new Set()); setRoleForm({ name: '', permissions: [] }) }
  const openRoleCreate = () => { setEditingRole(null); setRoleForm({ name: '', permissions: [] }); setSelectedPreset(null); setRoleOpen(true) }
  const openRoleEdit = role => { const knownPermissions = new Set(PERMISSIONS.map(permission => permission.key)); const permissions = role.key === 'admin' ? PERMISSIONS.map(permission => permission.key) : [...new Set(role.permissions || [])].filter(key => knownPermissions.has(key)); setEditingRole(role); setRoleForm({ name: role.name, permissions }); setSelectedPreset(null); setRoleManagerOpen(false); setRoleOpen(true) }
  const togglePermissionGroup = group => { setSelectedPreset(null); const keys = PERMISSIONS.filter(permission => permission.group === group).map(permission => permission.key); const allSelected = keys.every(key => roleForm.permissions.includes(key)); setRoleForm(current => ({ ...current, permissions: allSelected ? current.permissions.filter(key => !keys.includes(key)) : [...new Set([...current.permissions, ...keys])] })) }
  const togglePermissionGroupVisibility = group => setCollapsedPermissionGroups(current => { const next = new Set(current); if (next.has(group)) next.delete(group); else next.add(group); return next })
  const selectedRole = roles.find(role => role.key === form.role)
  const selfRoleLocked = editing?.id === currentUser?.id

  const createRole = async event => {
    event.preventDefault(); setSaving(true)
    const { data, error } = await invoke({ action: editingRole ? 'update_role' : 'create_role', role_key: editingRole?.key, ...roleForm })
    setSaving(false)
    if (error || data?.error) return toast.error(await functionError(error, data))
    toast.success(editingRole ? 'បានកែប្រែ Role' : 'បានបង្កើត Role ថ្មី'); closeRoleModal(); load()
  }
  const deleteRole = async role => {
    if (role.is_system) return toast.error('System Role មិនអាចលុបបានទេ')
    if (!window.confirm(`តើអ្នកចង់លុប Role ${role.name} មែនទេ?`)) return
    const { data, error } = await invoke({ action: 'delete_role', role_key: role.key })
    if (error || data?.error) return toast.error(await functionError(error, data))
    toast.success('បានលុប Role'); load()
  }

  const saveUser = async event => {
    event.preventDefault()
    if (!editing && !/^[a-zA-Z0-9._-]{3,30}$/.test(form.username)) return toast.error('Username មិនត្រឹមត្រូវ')
    if (!editing && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) return toast.error('Password ត្រូវមានអក្សរធំ អក្សរតូច លេខ និងយ៉ាងតិច 8 តួ')
    setSaving(true)
    const payload = { action: editing ? 'update' : 'create', user_id: editing?.id, ...form, full_name: sanitizeText(form.full_name), phone: sanitizeText(form.phone) }
    const { data, error } = await invoke(payload)
    setSaving(false)
    if (error || data?.error) return toast.error(await functionError(error, data))
    toast.success(editing ? 'បានកែប្រែ User' : 'បានបង្កើត User')
    setFormOpen(false); load()
  }
  const runConfirmed = async () => {
    setSaving(true)
    const { data, error } = await invoke({ action: confirm.action, user_id: confirm.user.id, is_active: confirm.value })
    setSaving(false)
    if (error || data?.error) return toast.error(await functionError(error, data))
    toast.success(confirm.action === 'delete' ? 'បានលុប User' : 'បានកែស្ថានភាព User')
    setConfirm(null); load()
  }
  const resetPassword = async event => {
    event.preventDefault()
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) return toast.error('Password មិនមានសុវត្ថិភាពគ្រប់គ្រាន់')
    setSaving(true)
    const { data, error } = await invoke({ action: 'reset_password', user_id: resetUser.id, password: newPassword })
    setSaving(false)
    if (error || data?.error) return toast.error(await functionError(error, data))
    toast.success('បានកំណត់ Password ថ្មី'); setResetUser(null); setNewPassword('')
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">គ្រប់គ្រងអ្នកប្រើប្រាស់</h1><p className="mt-1 text-sm text-slate-500">គ្រប់គ្រង Users, Roles និង Permissions នៅកន្លែងតែមួយ</p></div><div className="flex gap-2">{hasPermission('users.update') && <button className="btn-secondary" onClick={() => setRoleManagerOpen(true)}><Settings2 size={18}/>គ្រប់គ្រង Roles</button>}{hasPermission('users.create') && <button className="btn-primary" onClick={openCreate}><Plus size={18}/>បង្កើត User</button>}</div></div>
    <div className="card grid gap-3 p-4 md:grid-cols-[1fr_180px_180px]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="field pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="ស្វែងរកឈ្មោះ ឬ Username..."/></div><select className="field" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="all">Role ទាំងអស់</option>{roles.map(role => <option key={role.key} value={role.key}>{role.name}</option>)}</select><select className="field" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">ស្ថានភាពទាំងអស់</option><option value="true">សកម្ម</option><option value="false">បានបិទ</option></select></div>
    {loading ? <LoadingState/> : filtered.length === 0 ? <div className="card"><EmptyState title="រកមិនឃើញ User"/></div> : <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="table-cell">អ្នកប្រើប្រាស់</th><th className="table-cell">Role</th><th className="table-cell">សិទ្ធិ</th><th className="table-cell">ស្ថានភាព</th><th className="table-cell text-right">សកម្មភាព</th></tr></thead><tbody className="divide-y">{filtered.map(item => <tr key={item.id}><td className="table-cell"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-blue-100 font-bold text-blue-700">{item.full_name?.[0]?.toUpperCase() || 'U'}</div><div><p className="font-semibold">{item.full_name}</p><p className="text-xs text-slate-500">@{item.username || item.email?.split('@')[0]}</p></div></div></td><td className="table-cell"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{roleLabels[item.role]}</span></td><td className="table-cell"><div className="flex max-w-sm flex-wrap gap-1">{item.role === 'admin' ? <span className="text-sm">សិទ្ធិទាំងអស់</span> : item.permissions?.slice(0, 3).map(key => <span key={key} className="rounded bg-slate-100 px-2 py-1 text-[11px]">{PERMISSIONS.find(p => p.key === key)?.label || key}</span>)}{item.role !== 'admin' && item.permissions?.length > 3 && <span className="px-1 py-1 text-xs text-slate-500">+{item.permissions.length - 3}</span>}</div></td><td className="table-cell"><span className={item.is_active ? 'text-sm font-medium text-green-600' : 'text-sm font-medium text-slate-400'}>{item.is_active ? 'សកម្ម' : 'បានបិទ'}</span></td><td className="table-cell"><div className="flex justify-end gap-1">{hasPermission('users.update') && <><button className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="កែប្រែ" onClick={() => openEdit(item)}><Pencil size={17}/></button><button className="rounded-lg p-2 text-amber-600 hover:bg-amber-50" title="Reset Password" onClick={() => setResetUser(item)}><KeyRound size={17}/></button><button disabled={item.id === currentUser?.id} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30" title={item.is_active ? 'បិទគណនី' : 'បើកគណនី'} onClick={() => setConfirm({ action: 'set_active', user: item, value: !item.is_active })}><Power size={17}/></button></>}{hasPermission('users.delete') && <button disabled={item.id === currentUser?.id} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-30" title="លុប" onClick={() => setConfirm({ action: 'delete', user: item })}><Trash2 size={17}/></button>}</div></td></tr>)}</tbody></table></div></div>}
    <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'កែប្រែអ្នកប្រើប្រាស់' : 'បង្កើតអ្នកប្រើប្រាស់ថ្មី'} size="max-w-3xl">
      <form className="space-y-4" onSubmit={saveUser}>
        <section className="rounded-2xl border p-4"><div className="mb-4 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600"><UserCog size={19}/></span><div><h3 className="font-bold">ព័ត៌មានគណនី</h3><p className="text-xs text-slate-500">ព័ត៌មានសម្គាល់ និងទំនាក់ទំនងរបស់អ្នកប្រើប្រាស់</p></div></div><div className="grid gap-4 md:grid-cols-2"><div><label className="label">ឈ្មោះពេញ *</label><input className="field" required value={form.full_name} onChange={event => setForm({...form, full_name:event.target.value})}/></div><div><label className="label">Username *</label><input className="field disabled:bg-slate-100" required disabled={Boolean(editing)} value={form.username} onChange={event => setForm({...form, username:event.target.value})}/></div><div><label className="label">លេខទូរស័ព្ទ</label><input className="field" value={form.phone} onChange={event => setForm({...form, phone:event.target.value})} placeholder="ឧ. 012 345 678"/></div>{!editing && <div><label className="label">Password *</label><input className="field" required type="password" value={form.password} onChange={event => setForm({...form,password:event.target.value})}/><p className="mt-1 text-xs text-slate-500">អក្សរធំ តូច លេខ និងយ៉ាងតិច 8 តួ</p></div>}</div></section>
        <section className="rounded-2xl border p-4"><div className="mb-4 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600"><ShieldCheck size={19}/></span><div><h3 className="font-bold">Role និងវិសាលភាព</h3><p className="text-xs text-slate-500">កំណត់តួនាទី និងតំបន់ដែលអាចចូលមើលបាន</p></div></div><div className="grid gap-4 md:grid-cols-3"><div><label className="label">Role *</label><select className="field" disabled={selfRoleLocked} value={form.role} onChange={event => setForm({...form, role:event.target.value})}>{roles.map(role => <option key={role.key} value={role.key}>{role.name}</option>)}</select></div>{!selfRoleLocked && <><div><label className="label">ខេត្ត</label><select className="field" value={form.province_id || ''} onChange={changeScopeProvince}><option value="">ទូទាំងប្រទេស</option>{provinces.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)}</select></div><div><label className="label">ស្រុក/ខណ្ឌ</label><select className="field disabled:bg-slate-100" disabled={!form.province_id} value={form.district_id || ''} onChange={event => setForm({...form,district_id:event.target.value})}><option value="">ទូទាំងខេត្ត</option>{districts.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)}</select></div></>}</div>{selfRoleLocked && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-700">ដើម្បីសុវត្ថិភាព អ្នកមិនអាចប្ដូរ Role របស់ខ្លួនឯងបានទេ។</p>}</section>
        {selectedRole && <section className="rounded-2xl border bg-slate-50 p-4"><div className="flex items-center justify-between"><div><p className="font-bold">សិទ្ធិរបស់ {selectedRole.name}</p><p className="text-xs text-slate-500">Permissions ត្រូវបានគ្រប់គ្រងតាម Role</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{selectedRole.key === 'admin' ? 'សិទ្ធិទាំងអស់' : `${selectedRole.permissions?.length || 0} សិទ្ធិ`}</span></div><div className="mt-3 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">{(selectedRole.permissions || []).map(key => <span key={key} className="rounded-lg border bg-white px-2.5 py-1 text-[11px] text-slate-600">{PERMISSIONS.find(permission => permission.key === key)?.label || key}</span>)}</div></section>}
        <div className="flex justify-end gap-3 border-t pt-4"><button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>បោះបង់</button><button className="btn-primary" disabled={saving}><UserCog size={18}/>{saving ? 'កំពុងរក្សាទុក...' : editing ? 'រក្សាទុកការកែប្រែ' : 'បង្កើត User'}</button></div>
      </form>
    </Modal>
    <Modal open={roleManagerOpen} onClose={() => setRoleManagerOpen(false)} title="គ្រប់គ្រង Roles" size="max-w-4xl"><div className="space-y-4"><div className="flex items-center justify-between rounded-2xl bg-blue-50 p-4"><div><h3 className="font-bold text-blue-950">Roles និង Permissions</h3><p className="text-xs text-blue-700">កែសិទ្ធិ View, Create, Edit, Delete សម្រាប់ Role នីមួយៗ</p></div><button className="btn-primary" onClick={openRoleCreate}><Plus size={17}/>បង្កើត Role</button></div><div className="overflow-hidden rounded-2xl border"><table className="w-full"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="table-cell">Role</th><th className="table-cell">ប្រភេទ</th><th className="table-cell">Permissions</th><th className="table-cell text-right">សកម្មភាព</th></tr></thead><tbody className="divide-y">{roles.map(role => <tr key={role.key}><td className="table-cell"><p className="font-bold">{role.name}</p><p className="text-[11px] text-slate-400">{role.key}</p></td><td className="table-cell"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${role.is_system?'bg-violet-50 text-violet-700':'bg-slate-100 text-slate-600'}`}>{role.is_system?'System':'Custom'}</span></td><td className="table-cell"><span className="font-bold text-blue-700">{role.key==='admin'?'All':role.permissions?.length||0}</span><span className="ml-1 text-xs text-slate-500">សិទ្ធិ</span></td><td className="table-cell"><div className="flex justify-end gap-1"><button className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="កែ Role" onClick={() => openRoleEdit(role)}><Pencil size={17}/></button><button disabled={role.is_system} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-25" title={role.is_system?'System Role មិនអាចលុបបាន':'លុប Role'} onClick={() => deleteRole(role)}><Trash2 size={17}/></button></div></td></tr>)}</tbody></table></div></div></Modal>
    <Modal open={roleOpen} onClose={closeRoleModal} title={editingRole ? `កែ Role: ${editingRole.name}` : 'បង្កើត Role និង Permissions'} size="max-w-6xl">
      <form className="-m-5 flex max-h-[calc(92vh-74px)] flex-col" onSubmit={createRole}>
        <div className="grid min-h-0 flex-1 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-5 border-b bg-slate-50/80 p-5 lg:border-b-0 lg:border-r">
            <div><span className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600"><ShieldCheck size={16}/>Role Identity</span><label className="label">ឈ្មោះ Role *</label><input className="field bg-white" required minLength="2" maxLength="50" value={roleForm.name} onChange={event => { setSelectedPreset(null); setRoleForm({...roleForm, name:event.target.value}) }} placeholder="ឧ. Finance Reviewer"/><p className="mt-1.5 text-xs text-slate-500">ប្រើឈ្មោះខ្លី និងបញ្ជាក់មុខងារច្បាស់លាស់។</p></div>
            <div><div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold">Quick Presets</p>{selectedPreset && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">ACTIVE</span>}</div><div className="space-y-2">{rolePresets.map(preset => <button type="button" key={preset.key} onClick={() => applyRolePreset(preset)} className={`w-full rounded-xl border p-3 text-left transition ${selectedPreset === preset.key ? 'border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-100' : 'bg-white hover:border-blue-300'}`}><span className="flex items-center justify-between text-sm font-bold">{preset.label}{selectedPreset === preset.key && <Check size={17} className="text-blue-600"/>}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{preset.description}</span></button>)}</div></div>
            <div className="rounded-2xl border bg-white p-4"><div className="flex items-end justify-between"><div><p className="text-xs text-slate-500">Permissions បានជ្រើស</p><p className="mt-1 text-3xl font-bold text-blue-700">{roleForm.permissions.length}</p></div><p className="text-sm font-semibold text-slate-400">/ {PERMISSIONS.length}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:`${roleForm.permissions.length/PERMISSIONS.length*100}%`}}/></div></div>
            {roleForm.permissions.some(key => key.startsWith('settings.') || key.startsWith('users.')) && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium leading-5 text-amber-700">Role នេះមានសិទ្ធិគ្រប់គ្រងប្រព័ន្ធ។ សូមផ្តល់តែអ្នកទទួលខុសត្រូវប៉ុណ្ណោះ។</div>}
          </aside>
          <section className="flex min-h-0 flex-col bg-white">
            <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><Settings2 size={16}/></span><div><h3 className="font-bold text-slate-900">Permission Matrix</h3><p className="text-xs text-slate-500">កំណត់សិទ្ធិមើល បង្កើត កែប្រែ និងលុបតាម Module</p></div></div></div><div className="flex gap-2"><button type="button" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100" onClick={() => { setSelectedPreset(null); setRoleForm(current => ({ ...current, permissions: PERMISSIONS.map(permission => permission.key) })) }}>ជ្រើសទាំងអស់</button><button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100" onClick={() => { setSelectedPreset(null); setRoleForm(current => ({ ...current, permissions: [] })) }}>សម្អាត</button></div></div><div className="relative mt-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input className="field bg-slate-50 pl-9 focus:bg-white" value={permissionSearch} onChange={event => setPermissionSearch(event.target.value)} placeholder="ស្វែងរកតាមឈ្មោះ Module ឬ Permission..."/></div></div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-950 text-left text-xs font-semibold text-slate-200 shadow-sm">
                    <tr><th className="px-4 py-3.5">Module / Permission</th><th className="px-4 py-3.5">Description</th><th className="w-24 px-3 py-3.5 text-center">មើល</th><th className="w-24 px-3 py-3.5 text-center">បង្កើត</th><th className="w-24 px-3 py-3.5 text-center">កែប្រែ</th><th className="w-24 px-3 py-3.5 text-center">លុប</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {permissionGroups.map(group => {
                      const term = permissionSearch.trim().toLowerCase()
                      const items = PERMISSIONS.filter(permission => permission.group === group && (!term || permission.label.toLowerCase().includes(term) || permission.key.toLowerCase().includes(term)))
                      if (!items.length) return null
                      const groupKeys = PERMISSIONS.filter(permission => permission.group === group).map(permission => permission.key)
                      const selectedCount = groupKeys.filter(key => roleForm.permissions.includes(key)).length
                      return <PermissionMatrixGroup key={group} group={group} items={items} collapsed={collapsedPermissionGroups.has(group) && !term} selectedCount={selectedCount} total={groupKeys.length} selectedPermissions={roleForm.permissions} onTogglePermission={toggleRolePermission} onToggleGroup={() => togglePermissionGroup(group)} onToggleVisibility={() => togglePermissionGroupVisibility(group)}/>
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </section>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-white px-5 py-4 shadow-[0_-8px_20px_rgba(15,23,42,0.04)]"><p className="text-xs text-slate-500"><b className="text-slate-700">{roleForm.name || 'Role ថ្មី'}</b> · {roleForm.permissions.length} permissions</p><div className="flex gap-3"><button type="button" className="btn-secondary" onClick={closeRoleModal}>បោះបង់</button><button className="btn-primary" disabled={saving || roleForm.name.trim().length < 2 || roleForm.permissions.length === 0}><ShieldCheck size={18}/>{saving ? 'កំពុងរក្សាទុក...' : editingRole ? 'រក្សាទុកការកែប្រែ' : 'បង្កើត Role'}</button></div></div>
      </form>
    </Modal>
    <Modal open={Boolean(resetUser)} onClose={() => setResetUser(null)} title={`Reset Password: ${resetUser?.full_name}`} size="max-w-md"><form className="space-y-4" onSubmit={resetPassword}><div><label className="label">Password ថ្មី</label><div className="relative"><input className="field pr-10" required minLength="8" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={event => setNewPassword(event.target.value)}/><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div><p className="mt-1 text-xs text-slate-500">យ៉ាងតិច 8 តួ មានអក្សរធំ អក្សរតូច និងលេខ</p></div><div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setResetUser(null)}>បោះបង់</button><button className="btn-primary" disabled={saving}>កំណត់ Password</button></div></form></Modal>
    <ConfirmDialog open={Boolean(confirm)} onClose={() => setConfirm(null)} onConfirm={runConfirmed} loading={saving} title={confirm?.action === 'delete' ? 'លុបអ្នកប្រើប្រាស់' : 'បញ្ជាក់ការកែស្ថានភាព'} message={confirm?.action === 'delete' ? `តើអ្នកពិតជាចង់លុប ${confirm?.user.full_name} មែនទេ? ទិន្នន័យនេះមិនអាចយកត្រឡប់បានទេ។` : `តើអ្នកចង់${confirm?.value ? 'បើក' : 'បិទ'}គណនី ${confirm?.user.full_name} មែនទេ?`}/>
  </div>
}

function PermissionMatrixGroup({ group, items, collapsed, selectedCount, total, selectedPermissions, onTogglePermission, onToggleGroup, onToggleVisibility }) {
  return <>
    <tr className="border-y border-slate-800 bg-slate-800 text-white">
      <td className="px-4 py-3" colSpan="2"><button type="button" className="flex w-full items-center gap-3 text-left" onClick={onToggleVisibility}><span className="grid size-8 place-items-center rounded-lg bg-blue-500/15 text-blue-300"><ShieldCheck size={17}/></span><div className="flex-1"><p className="text-sm font-bold">{group}</p><p className="text-[10px] text-slate-400">{selectedCount}/{total} permissions</p></div>{collapsed ? <ChevronRight size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}</button></td>
      <td className="px-3 py-3 text-right" colSpan="4"><div className="flex items-center justify-end gap-2"><button type="button" className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white" onClick={onToggleVisibility}>{collapsed ? 'បើកមើល' : 'បិទបាំង'}</button><button type="button" className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-blue-400 hover:text-blue-300" onClick={onToggleGroup}>{selectedCount === total ? 'ដកសិទ្ធិក្រុម' : 'ជ្រើសសិទ្ធិក្រុម'}</button></div></td>
    </tr>
    {!collapsed && permissionMatrixRows(items, group).map(row => {
      const enabled = Boolean(row.special ? selectedPermissions.includes(row.special.key) : Object.values(row.permissions).some(permission => permission && selectedPermissions.includes(permission.key)))
      return <tr key={row.id} className={`transition hover:bg-slate-50 ${enabled ? 'bg-blue-50/40' : ''}`}>
        <td className="px-4 py-3"><p className="text-sm font-semibold text-slate-800">{row.label}</p><p className="mt-0.5 font-mono text-[10px] text-slate-400">{row.keyLabel}</p></td>
        <td className="px-4 py-3 text-xs text-slate-500">{row.description}</td>
        {row.special ? <td className="px-3 py-3" colSpan="4"><div className="flex items-center justify-end gap-3"><span className="text-xs font-semibold text-slate-500">សិទ្ធិពិសេស</span><PermissionSwitch checked={selectedPermissions.includes(row.special.key)} label={row.label} onChange={() => onTogglePermission(row.special.key)}/></div></td> : ['view', 'create', 'edit', 'delete'].map(column => { const permission = row.permissions[column]; return <td key={column} className="px-3 py-3 text-center">{permission ? <PermissionSwitch checked={selectedPermissions.includes(permission.key)} label={`${row.label} - ${column}`} onChange={() => onTogglePermission(permission.key)}/> : <span className="text-slate-300">—</span>}</td> })}
      </tr>
    })}
  </>
}

function PermissionSwitch({ checked, label, onChange }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={`relative inline-flex h-6 w-11 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}><span className={`inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}/></button>
}

function permissionMatrixRows(items, group) {
  const canonicalActions = { view: 'view', create: 'create', update: 'edit', delete: 'delete' }
  const grouped = new Map()
  const consumed = new Set()

  items.forEach(permission => {
    const parts = permission.key.split('.')
    const suffix = parts.at(-1)
    const action = canonicalActions[suffix]
    if (!action || parts.length < 2) return
    const resource = parts.slice(0, -1).join('.')
    if (!grouped.has(resource)) grouped.set(resource, [])
    grouped.get(resource).push({ permission, action })
  })

  const rows = []
  grouped.forEach((entries, resource) => {
    if (entries.length < 2) return
    const permissions = {}
    entries.forEach(({ permission, action }) => { permissions[action] = permission; consumed.add(permission.key) })
    rows.push({
      id: `${resource}.crud`,
      label: resourceLabel(resource, group),
      keyLabel: `${resource}.*`,
      description: 'កំណត់សិទ្ធិមើល បង្កើត កែប្រែ និងលុបសម្រាប់ Module នេះ',
      permissions,
    })
  })

  items.filter(permission => !consumed.has(permission.key)).forEach(permission => {
    rows.push({
      id: permission.key,
      label: permission.label,
      keyLabel: permission.key,
      description: permission.description || `អនុញ្ញាតឱ្យប្រើមុខងារ ${permission.label}`,
      permissions: {},
      special: permission,
    })
  })
  return rows
}

function resourceLabel(resource, fallback) {
  const labels = {
    markets: 'គ្រប់គ្រងព័ត៌មានផ្សារ',
    expenses: 'គ្រប់គ្រងសំណើចំណាយ',
    'expenses.budgets': 'គ្រប់គ្រងថវិកាខេត្ត',
    fuel: 'គ្រប់គ្រងចំណាយសាំង',
    'fuel.budgets': 'គ្រប់គ្រងថវិកាសាំង',
  }
  return labels[resource] || fallback
}
