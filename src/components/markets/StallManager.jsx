import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '../common/ConfirmDialog'
import EmptyState from '../common/EmptyState'
import Modal from '../common/Modal'
import { marketService } from '../../services/marketService'

const empty = { stall_code: '', zone: '', building: '', floor: '', status: 'available', trader_name: '', trader_phone: '', rental_fee: '', contract_start: '', contract_end: '', payment_status: 'unpaid', notes: '' }
const stallStatuses = [['available','ទំនេរ'],['occupied','មានអ្នកជួល'],['reserved','បានកក់'],['closed','បានបិទ']]
const paymentStatuses = [['unpaid','មិនទាន់បង់'],['partial','បង់ខ្លះ'],['paid','បានបង់'],['overdue','ហួសកំណត់']]
const label = (items,value) => items.find(([key]) => key === value)?.[1] || value

export default function StallManager({ marketId, canManage }) {
  const [rows, setRows] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => { const { data, error } = await marketService.stalls(marketId); if (error) toast.error(error.message); setRows(data || []) }, [marketId])
  useEffect(() => { load() }, [load])
  const open = row => { setEditing(row || {}); setForm(row ? { ...empty, ...row, contract_start: row.contract_start || '', contract_end: row.contract_end || '', rental_fee: row.rental_fee || '' } : empty) }
  const submit = async event => {
    event.preventDefault(); setBusy(true)
    const payload = { ...form, market_id: marketId, rental_fee: form.rental_fee || null, contract_start: form.contract_start || null, contract_end: form.contract_end || null }
    const result = editing?.id ? await marketService.updateStall(editing.id,payload) : await marketService.createStall(payload)
    setBusy(false)
    if (result.error) return toast.error(result.error.message)
    toast.success(editing?.id ? 'បានកែប្រែតូប' : 'បានបង្កើតតូប'); setEditing(null); load()
  }
  const remove = async () => { const { error } = await marketService.removeStall(deleting.id); if (error) return toast.error(error.message); toast.success('បានលុបតូប'); setDeleting(null); load() }
  return <section className="card p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-bold">ការគ្រប់គ្រងតូប</h2><p className="mt-1 text-xs text-slate-500">សរុប {rows.length} តូប · មានអ្នកជួល {rows.filter(row => row.status === 'occupied').length}</p></div>{canManage && <button className="btn-primary" onClick={() => open(null)}><Plus size={17}/>បន្ថែមតូប</button>}</div>{rows.length === 0 ? <EmptyState title="មិនទាន់មានតូប"/> : <div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead className="bg-slate-50 text-left text-xs"><tr><th className="table-cell">លេខតូប</th><th className="table-cell">តំបន់</th><th className="table-cell">ស្ថានភាព</th><th className="table-cell">អាជីវករ</th><th className="table-cell">ថ្លៃជួល</th><th className="table-cell">ការបង់ប្រាក់</th>{canManage && <th className="table-cell text-right">សកម្មភាព</th>}</tr></thead><tbody className="divide-y">{rows.map(row => <tr key={row.id}><td className="table-cell font-semibold">{row.stall_code}</td><td className="table-cell">{[row.zone,row.building,row.floor].filter(Boolean).join(' / ') || '—'}</td><td className="table-cell">{label(stallStatuses,row.status)}</td><td className="table-cell">{row.trader_name || '—'}</td><td className="table-cell">{row.rental_fee ? `$${row.rental_fee}` : '—'}</td><td className="table-cell">{label(paymentStatuses,row.payment_status)}</td>{canManage && <td className="table-cell"><div className="flex justify-end gap-1"><button className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" onClick={() => open(row)}><Pencil size={16}/></button><button className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => setDeleting(row)}><Trash2 size={16}/></button></div></td>}</tr>)}</tbody></table></div>}
    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'កែប្រែព័ត៌មានតូប' : 'បន្ថែមតូប'}><form className="space-y-4" onSubmit={submit}><div className="grid gap-4 md:grid-cols-2"><div><label className="label">លេខតូប *</label><input className="field" required value={form.stall_code} onChange={event => setForm({...form,stall_code:event.target.value})}/></div><div><label className="label">ស្ថានភាព</label><select className="field" value={form.status} onChange={event => setForm({...form,status:event.target.value})}>{stallStatuses.map(([value,text]) => <option key={value} value={value}>{text}</option>)}</select></div><div><label className="label">Zone</label><input className="field" value={form.zone || ''} onChange={event => setForm({...form,zone:event.target.value})}/></div><div><label className="label">អគារ/ជាន់</label><input className="field" value={form.building || ''} onChange={event => setForm({...form,building:event.target.value})}/></div><div><label className="label">ឈ្មោះអាជីវករ</label><input className="field" value={form.trader_name || ''} onChange={event => setForm({...form,trader_name:event.target.value})}/></div><div><label className="label">ទូរស័ព្ទ</label><input className="field" value={form.trader_phone || ''} onChange={event => setForm({...form,trader_phone:event.target.value})}/></div><div><label className="label">ថ្លៃជួល</label><input type="number" min="0" className="field" value={form.rental_fee || ''} onChange={event => setForm({...form,rental_fee:event.target.value})}/></div><div><label className="label">ការបង់ប្រាក់</label><select className="field" value={form.payment_status} onChange={event => setForm({...form,payment_status:event.target.value})}>{paymentStatuses.map(([value,text]) => <option key={value} value={value}>{text}</option>)}</select></div><div><label className="label">ចាប់ផ្ដើមកិច្ចសន្យា</label><input type="date" className="field" value={form.contract_start || ''} onChange={event => setForm({...form,contract_start:event.target.value})}/></div><div><label className="label">បញ្ចប់កិច្ចសន្យា</label><input type="date" className="field" value={form.contract_end || ''} onChange={event => setForm({...form,contract_end:event.target.value})}/></div></div><div className="flex justify-end gap-2 border-t pt-4"><button type="button" className="btn-secondary" onClick={() => setEditing(null)}>បោះបង់</button><button className="btn-primary" disabled={busy}>{busy ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}</button></div></form></Modal>
    <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} title="លុបតូប" message={`តើអ្នកចង់លុបតូប ${deleting?.stall_code || ''} មែនទេ?`}/>
  </section>
}
