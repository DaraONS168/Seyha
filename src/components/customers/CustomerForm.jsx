import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { customerService } from '../../services/customerService'
import { useAuth } from '../../contexts/AuthContext'
import { PRIORITIES, PROVINCES, SOURCES, STATUSES } from '../../utils/constants'
import { isValidPhone, normalizePhone, sanitizeText, toLocalInput } from '../../utils/formatters'

const empty = { name:'', phone:'', alternative_phone:'', gender:'', province:'', source:'facebook', interested_product:'', assigned_to:'', status:'new_lead', priority:'medium', next_follow_up_at:'', notes:'' }
export default function CustomerForm({ customer, onSaved, onCancel }) {
  const { user, isAdmin } = useAuth()
  const [form, setForm] = useState(empty)
  const [sales, setSales] = useState([])
  const [busy, setBusy] = useState(false)
  const [duplicate, setDuplicate] = useState(null)
  useEffect(() => { customerService.sales().then(({data}) => setSales(data || [])) }, [])
  useEffect(() => { if (customer) setForm({ ...empty, ...customer, assigned_to: customer.assigned_to || '', next_follow_up_at: toLocalInput(customer.next_follow_up_at) }) }, [customer])
  const update = e => setForm(f => ({...f, [e.target.name]: e.target.value}))
  const checkDuplicate = async () => { const phone = normalizePhone(form.phone); if (!isValidPhone(phone)) return; const { data } = await customerService.checkPhone(phone, customer?.id); setDuplicate(data) }
  const submit = async e => {
    e.preventDefault(); setDuplicate(null)
    if (!isValidPhone(form.phone)) { toast.error('លេខទូរស័ព្ទមិនត្រឹមត្រូវ'); return }
    if (form.alternative_phone && !isValidPhone(form.alternative_phone)) { toast.error('លេខទូរស័ព្ទបន្ថែមមិនត្រឹមត្រូវ'); return }
    const { data: same } = await customerService.checkPhone(normalizePhone(form.phone), customer?.id)
    if (same) { setDuplicate(same); return }
    setBusy(true)
    const payload = { ...form, name:sanitizeText(form.name), phone:normalizePhone(form.phone), alternative_phone:form.alternative_phone ? normalizePhone(form.alternative_phone) : null, interested_product:sanitizeText(form.interested_product), notes:sanitizeText(form.notes), assigned_to:form.assigned_to || (isAdmin ? null : user.id), next_follow_up_at:form.next_follow_up_at ? new Date(form.next_follow_up_at).toISOString() : null }
    const result = customer ? await customerService.update(customer.id, payload) : await customerService.create({...payload, created_by:user.id})
    setBusy(false)
    if (result.error) toast.error(result.error.message); else { toast.success(customer ? 'បានកែប្រែអតិថិជន' : 'បានបង្កើតអតិថិជន'); onSaved(result.data) }
  }
  const options = (items) => items.map(([v,l]) => <option key={v} value={v}>{l}</option>)
  return <form onSubmit={submit} className="space-y-5">{duplicate && <div className="flex gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800"><AlertTriangle className="shrink-0" size={20}/><span>លេខនេះមានរួចហើយសម្រាប់ <b>{duplicate.name}</b>។ សូមប្រើលេខផ្សេង។</span></div>}<div className="grid gap-4 md:grid-cols-2"><div><label className="label">ឈ្មោះអតិថិជន *</label><input className="field" required name="name" value={form.name} onChange={update}/></div><div><label className="label">លេខទូរស័ព្ទ *</label><input className="field" required name="phone" inputMode="tel" placeholder="012345678" value={form.phone} onChange={update} onBlur={checkDuplicate}/></div><div><label className="label">លេខទូរស័ព្ទបន្ថែម</label><input className="field" name="alternative_phone" inputMode="tel" value={form.alternative_phone || ''} onChange={update}/></div><div><label className="label">ភេទ</label><select className="field" name="gender" value={form.gender || ''} onChange={update}><option value="">មិនបញ្ជាក់</option><option value="male">ប្រុស</option><option value="female">ស្រី</option><option value="other">ផ្សេងៗ</option></select></div><div><label className="label">ខេត្ត/ក្រុង</label><select className="field" name="province" value={form.province || ''} onChange={update}><option value="">ជ្រើសរើស</option>{PROVINCES.map(p => <option key={p}>{p}</option>)}</select></div><div><label className="label">ប្រភពអតិថិជន</label><select className="field" name="source" value={form.source} onChange={update}>{options(SOURCES)}</select></div><div className="md:col-span-2"><label className="label">ផលិតផល ឬសេវាកម្មដែលចាប់អារម្មណ៍</label><input className="field" name="interested_product" value={form.interested_product || ''} onChange={update}/></div><div><label className="label">ស្ថានភាព</label><select className="field" name="status" value={form.status} onChange={update}>{options(STATUSES)}</select></div><div><label className="label">អាទិភាព</label><select className="field" name="priority" value={form.priority} onChange={update}>{options(PRIORITIES)}</select></div><div><label className="label">Sales ដែលទទួលខុសត្រូវ</label><select className="field" disabled={!isAdmin} name="assigned_to" value={form.assigned_to || ''} onChange={update}><option value="">មិនទាន់ Assign</option>{sales.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div><div><label className="label">ថ្ងៃ Follow Up បន្ទាប់</label><input type="datetime-local" className="field" name="next_follow_up_at" value={form.next_follow_up_at || ''} onChange={update}/></div><div className="md:col-span-2"><label className="label">កំណត់ចំណាំ</label><textarea className="field min-h-24" name="notes" value={form.notes || ''} onChange={update}/></div></div><div className="flex justify-end gap-3 border-t pt-4"><button type="button" className="btn-secondary" onClick={onCancel}>បោះបង់</button><button className="btn-primary" disabled={busy}>{busy ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}</button></div></form>
}
