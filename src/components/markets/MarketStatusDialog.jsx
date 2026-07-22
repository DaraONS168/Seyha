import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import { marketService } from '../../services/marketService'
import { MARKET_STATUSES } from '../../utils/marketConstants'

export default function MarketStatusDialog({ market, open, onClose, onSaved }) {
  const [form, setForm] = useState({ status: market?.status || 'active', reason: '', effectiveDate: new Date().toISOString().slice(0,10), referenceDocument: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (market) setForm(current => ({ ...current, status: market.status, reason: '', referenceDocument: '' })) }, [market, open])
  const submit = async event => {
    event.preventDefault()
    if (['inactive','closed'].includes(form.status) && form.reason.trim().length < 3) return toast.error('សូមបញ្ចូលមូលហេតុប្ដូរស្ថានភាព')
    setBusy(true)
    const { error } = await marketService.changeStatus(market.id, form)
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('បានប្ដូរស្ថានភាពផ្សារ'); onSaved()
  }
  return <Modal open={open} onClose={onClose} title="ប្ដូរស្ថានភាពផ្សារ" size="max-w-lg"><form className="space-y-4" onSubmit={submit}><div><label className="label">ស្ថានភាពថ្មី *</label><select className="field" value={form.status} onChange={event => setForm({...form,status:event.target.value})}>{MARKET_STATUSES.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label className="label">ថ្ងៃមានប្រសិទ្ធភាព *</label><input type="date" className="field" required value={form.effectiveDate} onChange={event => setForm({...form,effectiveDate:event.target.value})}/></div><div><label className="label">មូលហេតុ {['inactive','closed'].includes(form.status) ? '*' : ''}</label><textarea className="field min-h-24" required={['inactive','closed'].includes(form.status)} value={form.reason} onChange={event => setForm({...form,reason:event.target.value})}/></div><div><label className="label">ឯកសារយោង</label><input className="field" value={form.referenceDocument} onChange={event => setForm({...form,referenceDocument:event.target.value})} placeholder="លេខលិខិត ឬ URL"/></div><div className="flex justify-end gap-2 border-t pt-4"><button type="button" className="btn-secondary" onClick={onClose}>បោះបង់</button><button className="btn-primary" disabled={busy || form.status === market?.status}>{busy ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកស្ថានភាព'}</button></div></form></Modal>
}
