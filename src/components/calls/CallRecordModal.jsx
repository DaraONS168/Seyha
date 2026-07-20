import { useState } from 'react'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import { callService } from '../../services/callService'
import { CALL_RESULTS, STATUSES } from '../../utils/constants'
import { sanitizeText } from '../../utils/formatters'

export default function CallRecordModal({ open, onClose, customer, onSaved }) {
  const [form, setForm] = useState({ call_result:'answered', call_duration:'', notes:'', next_follow_up_at:'', customer_status: customer?.status || 'contacted' })
  const [busy, setBusy] = useState(false)
  const update = e => setForm({...form,[e.target.name]:e.target.value})
  const submit = async e => { e.preventDefault(); setBusy(true); const { error } = await callService.create({...form, notes:sanitizeText(form.notes), customer_id:customer.id}); setBusy(false); if (error) toast.error(error.message); else { toast.success('បានកត់ត្រាការហៅ'); onSaved(); onClose() } }
  return <Modal open={open} onClose={onClose} title="កត់ត្រាការហៅ"><form onSubmit={submit} className="space-y-4"><div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">អតិថិជន៖ <b>{customer?.name}</b> · {customer?.phone}</div><div className="grid gap-4 md:grid-cols-2"><div><label className="label">លទ្ធផលការហៅ *</label><select className="field" name="call_result" value={form.call_result} onChange={update}>{CALL_RESULTS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div><div><label className="label">រយៈពេល (វិនាទី)</label><input type="number" min="0" className="field" name="call_duration" value={form.call_duration} onChange={update}/></div><div><label className="label">Update ស្ថានភាពអតិថិជន</label><select className="field" name="customer_status" value={form.customer_status} onChange={update}>{STATUSES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div><div><label className="label">Follow Up បន្ទាប់</label><input type="datetime-local" className="field" name="next_follow_up_at" value={form.next_follow_up_at} onChange={update}/></div><div className="md:col-span-2"><label className="label">កំណត់ចំណាំ</label><textarea className="field min-h-24" name="notes" value={form.notes} onChange={update}/></div></div><div className="flex justify-end gap-3 border-t pt-4"><button type="button" className="btn-secondary" onClick={onClose}>បោះបង់</button><button className="btn-primary" disabled={busy}>{busy ? 'កំពុងរក្សា...' : 'រក្សាទុកការហៅ'}</button></div></form></Modal>
}
