import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Banknote, BellRing, CalendarClock, CheckCircle2, Download, Eye, FileSpreadsheet, History, MessageCircle, MoreHorizontal, PhoneCall, Plus, Printer, ReceiptText, Search, Send, ShieldAlert, Trash2, TrendingUp, Undo2, WalletCards, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '../components/common/Modal'

const initialDebts = [
  { id: 'DEBT-2026-0001', customer: 'សុខ ដារ៉ា', phone: '012 345 678', province: 'ភ្នំពេញ', invoice: 'INV-2026-00125', invoiceDate: '2026-07-12', dueDate: '2026-07-22', total: 1250, paid: 850, remaining: 400, sales: 'Van', method: 'ABA', paymentStatus: 'Partially Paid', debtStatus: 'Overdue', risk: 'High', lastFollowUp: 'បានសន្យាបង់ថ្ងៃ 25/07/2026' },
  { id: 'DEBT-2026-0002', customer: 'ចាន់ ស្រីនាង', phone: '098 765 432', province: 'កណ្ដាល', invoice: 'INV-2026-00126', invoiceDate: '2026-07-18', dueDate: '2026-07-30', total: 680, paid: 0, remaining: 680, sales: 'Phanha', method: 'Cash', paymentStatus: 'Unpaid', debtStatus: 'Due Today', risk: 'Medium', lastFollowUp: 'ទាក់ទងព្រឹកនេះ មិនទាន់ឆ្លើយ' },
  { id: 'DEBT-2026-0003', customer: 'ហេង វិសាល', phone: '011 222 333', province: 'តាកែវ', invoice: 'INV-2026-00131', invoiceDate: '2026-07-25', dueDate: '2026-08-02', total: 420, paid: 120, remaining: 300, sales: 'Van', method: 'Bank Transfer', paymentStatus: 'Partially Paid', debtStatus: 'Due Soon', risk: 'Low', lastFollowUp: 'សន្យាបង់នៅដើមខែ' },
  { id: 'DEBT-2026-0004', customer: 'លី សុភ័ក្រ', phone: '010 900 111', province: 'កំពង់ចាម', invoice: 'INV-2026-00134', invoiceDate: '2026-07-08', dueDate: '2026-07-20', total: 950, paid: 950, remaining: 0, sales: 'Pheak', method: 'Wing', paymentStatus: 'Paid', debtStatus: 'Fully Paid', risk: 'Low', lastFollowUp: 'បង់រួចរាល់' },
]

const DEBT_STORAGE_KEY = 'seyha_debt_management_rows'

const payments = [
  { receipt: 'RCPT-2026-00041', date: '2026-07-14', amount: 500, method: 'ABA', collector: 'Van' },
  { receipt: 'RCPT-2026-00048', date: '2026-07-18', amount: 350, method: 'Cash', collector: 'Van' },
]

const promises = [
  { date: '2026-07-20', amount: 400, status: 'Broken', note: 'អតិថិជនសុំបន្ថែម 3 ថ្ងៃ' },
  { date: '2026-07-25', amount: 400, status: 'Pending', note: 'នឹងបង់តាម ABA' },
]

const fmt = value => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const daysBetween = date => Math.ceil((new Date(date) - new Date('2026-07-30')) / 86400000)
const paymentStatusFor = (paid, remaining) => remaining <= 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid'
const debtStatusFor = (remaining, dueDate) => {
  if (remaining <= 0) return 'Fully Paid'
  const days = daysBetween(dueDate)
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Due Today'
  if (days <= 3) return 'Due Soon'
  return 'Active'
}
const extractMoney = value => Number(String(value || '').match(/\$?([\d,.]+)/)?.[1]?.replaceAll(',', '') || 0)
const normalizeDebt = debt => {
  const total = Number(debt.total || 0)
  const paid = Number(debt.paid || 0)
  const noteRefund = String(debt.lastFollowUp || '').includes('សងលុយ') || String(debt.lastFollowUp || '').includes('ដក/')
  const refundAmount = Number(debt.refunded || 0) || (noteRefund ? extractMoney(debt.lastFollowUp) : 0)
  const refundHistory = debt.refundHistory || (refundAmount ? [{ creditNote: `CN-${new Date().getFullYear()}-LEGACY`, date: new Date().toISOString().slice(0, 10), amount: refundAmount, method: 'Unknown', account: 'Unknown', reference: 'LEGACY', operator: debt.sales, reason: 'ទិន្នន័យចាស់', note: debt.lastFollowUp || '', approvalStatus: 'Approved', cashFlowType: 'Cash Out' }] : [])
  const expectedRemaining = Math.max(0, total - paid)
  if (!noteRefund || Number(debt.remaining || 0) <= expectedRemaining) return { ...debt, refunded: refundAmount, refundHistory }
  const updatedTotal = Math.max(0, total - refundAmount)
  const updatedPaid = Math.min(paid, updatedTotal)
  const updatedRemaining = Math.max(0, updatedTotal - updatedPaid)
  return {
    ...debt,
    total: updatedTotal,
    paid: updatedPaid,
    refunded: refundAmount,
    refundHistory,
    remaining: updatedRemaining,
    paymentStatus: paymentStatusFor(updatedPaid, updatedRemaining),
    debtStatus: debtStatusFor(updatedRemaining, debt.dueDate),
  }
}
const loadStoredDebts = () => {
  try {
    const stored = window.localStorage.getItem(DEBT_STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : null
    return Array.isArray(parsed) ? parsed.map(normalizeDebt) : initialDebts
  } catch {
    return initialDebts
  }
}
const downloadCsv = rows => {
  const headers = ['Debt ID', 'Customer', 'Phone', 'Invoice', 'Due Date', 'Total', 'Paid', 'Refunded', 'Latest Credit Note', 'Refund Reason', 'Refund Approval', 'Remaining', 'Sales', 'Debt Status']
  const lines = rows.map(row => {
    const refund = row.refundHistory?.[0] || {}
    return [row.id, row.customer, row.phone, row.invoice, row.dueDate, row.total, row.paid, row.refunded || 0, refund.creditNote || '', refund.reason || '', refund.approvalStatus || '', row.remaining, row.sales, row.debtStatus]
  })
  const csv = [headers, ...lines].map(line => line.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `debt-report-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function StatusBadge({ status }) {
  const styles = {
    Active: 'bg-blue-50 text-blue-700',
    'Due Soon': 'bg-amber-50 text-amber-700',
    'Due Today': 'bg-orange-50 text-orange-700',
    Overdue: 'bg-red-50 text-red-700',
    'Fully Paid': 'bg-green-50 text-green-700',
    Paid: 'bg-green-50 text-green-700',
    Unpaid: 'bg-red-50 text-red-700',
    'Partially Paid': 'bg-blue-50 text-blue-700',
    High: 'bg-red-50 text-red-700',
    Medium: 'bg-amber-50 text-amber-700',
    Low: 'bg-green-50 text-green-700',
    Broken: 'bg-red-50 text-red-700',
    Pending: 'bg-amber-50 text-amber-700',
    Approved: 'bg-green-50 text-green-700',
    'Pending Approval': 'bg-amber-50 text-amber-700',
  }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>
}

function SummaryCard({ icon: Icon, label, value, tone = 'blue', helper }) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50/40 text-blue-600',
    red: 'border-red-100 bg-red-50/50 text-red-600',
    amber: 'border-amber-100 bg-amber-50/50 text-amber-600',
    green: 'border-green-100 bg-green-50/50 text-green-600',
    violet: 'border-violet-100 bg-violet-50/50 text-violet-600',
  }
  return <div className={`rounded-2xl border bg-white p-4 shadow-sm ${tones[tone]}`}>
    <div className="flex items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/80"><Icon size={22}/></span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold">{label}</p>
        <p className="text-2xl font-extrabold text-slate-950">{value}</p>
        {helper && <p className="mt-0.5 truncate text-xs text-slate-500">{helper}</p>}
      </div>
    </div>
  </div>
}

function PaymentModal({ debt, onClose, onSave }) {
  const [amount, setAmount] = useState(debt?.remaining || 0)
  const save = event => {
    event.preventDefault()
    const paidAmount = Number(amount)
    if (!paidAmount || paidAmount <= 0) return toast.error('សូមបញ្ចូលចំនួនបង់ឲ្យត្រឹមត្រូវ')
    if (paidAmount > Number(debt.remaining)) return toast.error('ចំនួនបង់មិនអាចធំជាងប្រាក់នៅសល់បានទេ')
    onSave(debt, paidAmount)
  }
  return <Modal open={Boolean(debt)} onClose={onClose} title="កត់ត្រាការបង់ប្រាក់" size="max-w-3xl">
    <form onSubmit={save} className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border bg-slate-50 p-4 md:col-span-3">
        <p className="text-sm font-bold">{debt?.customer}</p>
        <p className="text-xs text-slate-500">{debt?.invoice} · ប្រាក់នៅសល់ {fmt(debt?.remaining)}</p>
      </div>
      <div><label className="label">ថ្ងៃបង់ប្រាក់ *</label><input className="field" type="date" defaultValue="2026-07-30"/></div>
      <div><label className="label">ចំនួនបង់ *</label><input className="field" type="number" value={amount} min="0.01" step="0.01" onChange={event => setAmount(event.target.value)}/></div>
      <div><label className="label">វិធីបង់ប្រាក់ *</label><select className="field" defaultValue="ABA"><option>Cash</option><option>ABA</option><option>Bank Transfer</option><option>Wing</option><option>Other</option></select></div>
      <div><label className="label">Cash Account *</label><select className="field"><option>ABA Main Account</option><option>Cash Box</option><option>Wing Account</option></select></div>
      <div><label className="label">Reference Number</label><input className="field" placeholder="ឧ. ABA-29391"/></div>
      <div><label className="label">អ្នកប្រមូលប្រាក់ *</label><select className="field" defaultValue={debt?.sales}><option>Van</option><option>Phanha</option><option>Pheak</option></select></div>
      <div className="md:col-span-3"><label className="label">ភ្ជាប់បង្កាន់ដៃ</label><input className="field" type="file"/></div>
      <div className="md:col-span-3"><label className="label">កំណត់សម្គាល់</label><textarea className="field min-h-24" placeholder="កំណត់ត្រាពីការបង់ប្រាក់..."/></div>
      <div className="rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700 md:col-span-3">ពេលរក្សាទុក៖ កាត់ balance, បង្កើត Receipt, បង្កើត Income ក្នុង Cash Flow និងរក្សា Audit Log។</div>
      <div className="mt-1 flex justify-end gap-3 border-t pt-4 md:col-span-3"><button type="button" className="btn-secondary" onClick={onClose}>បោះបង់</button><button className="btn-primary"><ReceiptText size={17}/>រក្សាទុកការបង់ប្រាក់</button></div>
    </form>
  </Modal>
}

function RefundModal({ debt, onClose, onSave }) {
  const [amount, setAmount] = useState('')
  const save = event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const refundAmount = Number(amount)
    if (!refundAmount || refundAmount <= 0) return toast.error('សូមបញ្ចូលចំនួនសងឲ្យត្រឹមត្រូវ')
    onSave(debt, {
      amount: refundAmount,
      date: form.get('date'),
      method: form.get('method'),
      account: form.get('account'),
      reference: form.get('reference'),
      operator: form.get('operator'),
      reason: form.get('reason'),
      note: form.get('note'),
    })
  }
  return <Modal open={Boolean(debt)} onClose={onClose} title="សងលុយទៅអតិថិជន" size="max-w-3xl">
    <form onSubmit={save} className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border bg-red-50 p-4 md:col-span-3">
        <p className="text-sm font-bold">{debt?.customer}</p>
        <p className="text-xs text-slate-600">{debt?.invoice} · បានបង់រួច {fmt(debt?.paid)} · នៅសល់ {fmt(debt?.remaining)}</p>
      </div>
      <div><label className="label">ថ្ងៃសងលុយ *</label><input className="field" name="date" type="date" defaultValue="2026-07-30"/></div>
      <div><label className="label">ចំនួនសង *</label><input className="field" type="number" value={amount} min="0.01" step="0.01" placeholder="0.00" onChange={event => setAmount(event.target.value)}/></div>
      <div><label className="label">មូលហេតុ *</label><select className="field" name="reason" defaultValue="ប្តូរឥវ៉ាន់"><option>ប្តូរឥវ៉ាន់</option><option>បង់លើស</option><option>កែតម្លៃ</option><option>ទំនិញខូច</option><option>ផ្សេងៗ</option></select></div>
      <div><label className="label">វិធីសងលុយ *</label><select className="field" name="method" defaultValue="ABA"><option>Cash</option><option>ABA</option><option>Bank Transfer</option><option>Wing</option><option>Other</option></select></div>
      <div><label className="label">Cash Account *</label><select className="field" name="account"><option>ABA Main Account</option><option>Cash Box</option><option>Wing Account</option></select></div>
      <div><label className="label">Reference Number</label><input className="field" name="reference" placeholder="ឧ. REFUND-29391"/></div>
      <div><label className="label">អ្នកធ្វើប្រតិបត្តិការ *</label><select className="field" name="operator" defaultValue={debt?.sales}><option>Van</option><option>Phanha</option><option>Pheak</option></select></div>
      <div className="md:col-span-3"><label className="label">ភ្ជាប់បង្កាន់ដៃសងលុយ</label><input className="field" type="file"/></div>
      <div className="md:col-span-3"><label className="label">កំណត់សម្គាល់</label><textarea className="field min-h-24" name="note" placeholder="ឧ. អតិថិជនប្តូរឥវ៉ាន់វិញ / កែតម្លៃ / បង់លើស..."/></div>
      <div className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700 md:col-span-3">ពេលរក្សាទុក៖ កត់ត្រា Cash Out/Credit Note, ដកចេញពី Total និង Balance សម្រាប់ audit។</div>
      <div className="mt-1 flex justify-end gap-3 border-t pt-4 md:col-span-3"><button type="button" className="btn-secondary" onClick={onClose}>បោះបង់</button><button className="btn-primary bg-red-600 hover:bg-red-700"><Undo2 size={17}/>រក្សាទុកការសងលុយ</button></div>
    </form>
  </Modal>
}

function PromiseModal({ debt, onClose, onSave }) {
  const save = event => {
    event.preventDefault()
    onSave(debt)
  }
  return <Modal open={Boolean(debt)} onClose={onClose} title="កត់ត្រាសន្យាបង់ប្រាក់" size="max-w-2xl">
    <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
      <div><label className="label">អតិថិជន</label><input className="field bg-slate-50" readOnly value={debt?.customer || ''}/></div>
      <div><label className="label">ចំនួនសន្យាបង់ *</label><input className="field" type="number" defaultValue={debt?.remaining}/></div>
      <div><label className="label">ថ្ងៃសន្យាបង់ *</label><input className="field" type="date" defaultValue="2026-08-01"/></div>
      <div><label className="label">អ្នកទាក់ទង *</label><select className="field" defaultValue={debt?.sales}><option>Van</option><option>Phanha</option><option>Pheak</option></select></div>
      <div className="md:col-span-2"><label className="label">ចំណាំ</label><textarea className="field min-h-28" placeholder="សង្ខេបចម្លើយអតិថិជន និង action បន្ទាប់..."/></div>
      <div className="mt-1 flex justify-end gap-3 border-t pt-4 md:col-span-2"><button type="button" className="btn-secondary" onClick={onClose}>បោះបង់</button><button className="btn-primary"><CalendarClock size={17}/>រក្សាទុកសន្យា</button></div>
    </form>
  </Modal>
}

function DebtFormModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ customer: '', phone: '', province: 'ភ្នំពេញ', invoice: '', invoiceDate: '2026-07-30', dueDate: '2026-08-02', total: '', paid: '0', sales: 'Van', notes: '' })
  const save = event => {
    event.preventDefault()
    const total = Number(form.total)
    const paid = Number(form.paid || 0)
    if (!form.customer.trim()) return toast.error('សូមបញ្ចូលឈ្មោះអតិថិជន')
    if (!form.invoice.trim()) return toast.error('សូមបញ្ចូលលេខវិក្កយបត្រ')
    if (!total || total <= 0) return toast.error('Total Amount ត្រូវធំជាង 0')
    if (paid < 0 || paid > total) return toast.error('Paid Amount មិនត្រឹមត្រូវ')
    onSave({ ...form, total, paid })
    setForm({ customer: '', phone: '', province: 'ភ្នំពេញ', invoice: '', invoiceDate: '2026-07-30', dueDate: '2026-08-02', total: '', paid: '0', sales: 'Van', notes: '' })
  }
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }))
  return <Modal open={open} onClose={onClose} title="បន្ថែម Debt ថ្មី" size="max-w-3xl">
    <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
      <div><label className="label">អតិថិជន *</label><input className="field" value={form.customer} onChange={set('customer')} placeholder="ឧ. សុខ ដារ៉ា"/></div>
      <div><label className="label">លេខទូរស័ព្ទ</label><input className="field" value={form.phone} onChange={set('phone')} placeholder="ឧ. 012 345 678"/></div>
      <div><label className="label">ខេត្ត</label><select className="field" value={form.province} onChange={set('province')}><option>ភ្នំពេញ</option><option>កណ្ដាល</option><option>តាកែវ</option><option>កំពង់ចាម</option></select></div>
      <div><label className="label">លេខវិក្កយបត្រ *</label><input className="field" value={form.invoice} onChange={set('invoice')} placeholder="INV-2026-00135"/></div>
      <div><label className="label">ថ្ងៃវិក្កយបត្រ *</label><input className="field" type="date" value={form.invoiceDate} onChange={set('invoiceDate')}/></div>
      <div><label className="label">ថ្ងៃត្រូវបង់ *</label><input className="field" type="date" value={form.dueDate} onChange={set('dueDate')}/></div>
      <div><label className="label">Total Amount *</label><input className="field" type="number" min="0.01" step="0.01" value={form.total} onChange={set('total')}/></div>
      <div><label className="label">Paid Amount</label><input className="field" type="number" min="0" step="0.01" value={form.paid} onChange={set('paid')}/></div>
      <div><label className="label">Assigned Sales</label><select className="field" value={form.sales} onChange={set('sales')}><option>Van</option><option>Phanha</option><option>Pheak</option></select></div>
      <div><label className="label">Risk Level</label><select className="field" defaultValue="Medium"><option>Low</option><option>Medium</option><option>High</option></select></div>
      <div className="md:col-span-2"><label className="label">Notes</label><textarea className="field min-h-24" value={form.notes} onChange={set('notes')}/></div>
      <div className="flex justify-end gap-3 border-t pt-4 md:col-span-2"><button type="button" className="btn-secondary" onClick={onClose}>បោះបង់</button><button className="btn-primary"><Plus size={17}/>រក្សាទុក Debt</button></div>
    </form>
  </Modal>
}

function ReportModal({ open, onClose, rows }) {
  return <Modal open={open} onClose={onClose} title="របាយការណ៍បំណុលសង្ខេប" size="max-w-4xl">
    <div className="grid gap-3 md:grid-cols-5">
      <SummaryCard icon={WalletCards} label="Debt Count" value={rows.length} tone="blue"/>
      <SummaryCard icon={ShieldAlert} label="Overdue" value={rows.filter(item => item.debtStatus === 'Overdue').length} tone="red"/>
      <SummaryCard icon={Banknote} label="ប្រាក់នៅសល់" value={fmt(rows.reduce((sum, item) => sum + item.remaining, 0))} tone="amber"/>
      <SummaryCard icon={Undo2} label="សងលុយសរុប" value={fmt(rows.reduce((sum, item) => sum + Number(item.refunded || 0), 0))} tone="red"/>
      <SummaryCard icon={CheckCircle2} label="Fully Paid" value={rows.filter(item => item.debtStatus === 'Fully Paid').length} tone="green"/>
    </div>
    <div className="mt-5 overflow-hidden rounded-xl border"><table className="w-full"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="table-cell">អតិថិជន</th><th className="table-cell">វិក្កយបត្រ</th><th className="table-cell text-right">សរុប</th><th className="table-cell text-right">សងលុយ</th><th className="table-cell text-right">ប្រាក់នៅសល់</th><th className="table-cell">ស្ថានភាព</th></tr></thead><tbody className="divide-y">{rows.map(item => { const refund = item.refundHistory?.[0]; return <tr key={item.id}><td className="table-cell font-bold">{item.customer}</td><td className="table-cell">{item.invoice}</td><td className="table-cell text-right">{fmt(item.total)}</td><td className="table-cell text-right"><p className="font-bold text-red-600">{fmt(item.refunded || 0)}</p>{refund && <p className="text-xs text-slate-500">{refund.creditNote} · {refund.reason}</p>}</td><td className="table-cell text-right font-bold">{fmt(item.remaining)}</td><td className="table-cell"><StatusBadge status={refund?.approvalStatus || item.debtStatus}/></td></tr> })}</tbody></table></div>
    <div className="mt-5 flex justify-end gap-3 border-t pt-4"><button className="btn-secondary" onClick={onClose}>បិទ</button><button className="btn-primary" onClick={() => downloadCsv(rows)}><Download size={17}/>Download CSV</button></div>
  </Modal>
}

function MoreActionsModal({ debt, onClose, onPay, onPromise, onRefund }) {
  return <Modal open={Boolean(debt)} onClose={onClose} title="សកម្មភាពបន្ថែម" size="max-w-md">
    <div className="space-y-2">
      <button className="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-green-50" onClick={() => { onClose(); onPay(debt) }}><Banknote className="text-green-600" size={18}/>កត់ត្រាការបង់ប្រាក់</button>
      <button className="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-red-50" onClick={() => { onClose(); onRefund(debt) }}><Undo2 className="text-red-600" size={18}/>សងលុយទៅអតិថិជន</button>
      <button className="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-amber-50" onClick={() => { onClose(); onPromise(debt) }}><BellRing className="text-amber-600" size={18}/>សន្យាបង់ប្រាក់</button>
      <button className="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-blue-50" onClick={() => toast.info(`កំពុងរៀបចំ Statement សម្រាប់ ${debt?.customer}`)}><Printer className="text-blue-600" size={18}/>បោះពុម្ព Statement</button>
      <button className="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-red-50" onClick={() => toast.warning('ការកាត់ចោលបំណុលត្រូវការ Admin approval និង reason') }><ShieldAlert className="text-red-600" size={18}/>កាត់ចោលបំណុល</button>
    </div>
  </Modal>
}

function DebtDetail({ debt, onPay, onPromise, onRefund }) {
  if (!debt) return <aside className="card p-5 text-center text-sm text-slate-500">ជ្រើសបំណុលមួយ ដើម្បីមើលព័ត៌មានលម្អិត ប្រវត្តិបង់ប្រាក់ និង Follow Up Timeline។</aside>
  const days = daysBetween(debt.dueDate)
  return <aside className="card overflow-hidden">
    <div className="border-b bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-blue-600">{debt.id}</p>
          <h2 className="mt-1 text-xl font-extrabold">{debt.customer}</h2>
          <p className="text-sm text-slate-500">{debt.phone} · {debt.province}</p>
        </div>
        <StatusBadge status={debt.debtStatus}/>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Total</p><p className="font-extrabold">{fmt(debt.total)}</p></div>
        <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Paid</p><p className="font-extrabold text-green-600">{fmt(debt.paid)}</p></div>
        <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Refund</p><p className="font-extrabold text-red-600">{fmt(debt.refunded || 0)}</p></div>
        <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Balance</p><p className="font-extrabold text-red-600">{fmt(debt.remaining)}</p></div>
      </div>
    </div>
    <div className="space-y-5 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <button className="btn-primary" onClick={() => onPay(debt)}><Banknote size={17}/>កត់ត្រាការបង់ប្រាក់</button>
        <button className="btn-secondary text-red-600 hover:bg-red-50" onClick={() => onRefund(debt)}><Undo2 size={17}/>សងលុយ</button>
        <button className="btn-secondary" onClick={() => onPromise(debt)}><BellRing size={17}/>សន្យាបង់ប្រាក់</button>
        <a className="btn-secondary" href={`tel:${debt.phone.replaceAll(' ', '')}`}><PhoneCall size={17}/>ហៅអតិថិជន</a>
        <button className="btn-secondary" onClick={() => window.print()}><Printer size={17}/>បោះពុម្ព Statement</button>
      </div>
      <section>
        <h3 className="mb-2 font-bold">ព័ត៌មានវិក្កយបត្រ</h3>
        <div className="grid gap-2 text-sm">
          <p className="flex justify-between"><span className="text-slate-500">លេខវិក្កយបត្រ</span><b>{debt.invoice}</b></p>
          <p className="flex justify-between"><span className="text-slate-500">ថ្ងៃវិក្កយបត្រ</span><b>{debt.invoiceDate}</b></p>
          <p className="flex justify-between"><span className="text-slate-500">ថ្ងៃត្រូវបង់</span><b>{debt.dueDate}</b></p>
          <p className="flex justify-between"><span className="text-slate-500">ថ្ងៃនៅសល់/ហួស</span><b className={days < 0 ? 'text-red-600' : 'text-slate-900'}>{days < 0 ? `${Math.abs(days)} days overdue` : `${days} days left`}</b></p>
        </div>
      </section>
      <section>
        <h3 className="mb-2 font-bold">ប្រវត្តិបង់ប្រាក់</h3>
        <div className="space-y-2">{payments.map(item => <div key={item.receipt} className="rounded-xl border p-3 text-sm"><div className="flex justify-between"><b>{item.receipt}</b><span className="font-bold text-green-600">{fmt(item.amount)}</span></div><p className="mt-1 text-xs text-slate-500">{item.date} · {item.method} · {item.collector}</p></div>)}</div>
      </section>
      <section>
        <h3 className="mb-2 font-bold">ប្រវត្តិសងលុយ / Credit Note</h3>
        <div className="space-y-2">{(debt.refundHistory || []).length ? debt.refundHistory.map(item => <div key={item.creditNote} className="rounded-xl border border-red-100 bg-red-50/40 p-3 text-sm"><div className="flex justify-between gap-3"><b>{item.creditNote}</b><span className="font-bold text-red-600">{fmt(item.amount)}</span></div><p className="mt-1 text-xs text-slate-600">{item.date} · {item.reason} · {item.method} · {item.cashFlowType}</p><div className="mt-2 flex items-center justify-between gap-3 text-xs"><span className="text-slate-500">{item.reference}</span><StatusBadge status={item.approvalStatus}/></div></div>) : <p className="rounded-xl border border-dashed p-3 text-sm text-slate-500">មិនទាន់មានការសងលុយ</p>}</div>
      </section>
      <section>
        <h3 className="mb-2 font-bold">ប្រវត្តិសន្យាបង់ប្រាក់</h3>
        <div className="space-y-2">{promises.map(item => <div key={item.date} className="rounded-xl border p-3 text-sm"><div className="flex justify-between"><b>{item.date}</b><StatusBadge status={item.status}/></div><p className="mt-1 text-xs text-slate-500">{fmt(item.amount)} · {item.note}</p></div>)}</div>
      </section>
    </div>
  </aside>
}

export default function DebtManagementPage() {
  const [rows, setRows] = useState(loadStoredDebts)
  const [selected, setSelected] = useState(() => rows[0] || null)
  const [paymentDebt, setPaymentDebt] = useState(null)
  const [refundDebt, setRefundDebt] = useState(null)
  const [promiseDebt, setPromiseDebt] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [moreDebt, setMoreDebt] = useState(null)
  const [status, setStatus] = useState('all')
  useEffect(() => {
    window.localStorage.setItem(DEBT_STORAGE_KEY, JSON.stringify(rows))
  }, [rows])
  const filtered = useMemo(() => rows.filter(item => status === 'all' || item.debtStatus === status), [rows, status])
  const totalOutstanding = rows.filter(item => item.debtStatus !== 'Fully Paid').reduce((sum, item) => sum + item.remaining, 0)
  const overdue = rows.filter(item => item.debtStatus === 'Overdue').reduce((sum, item) => sum + item.remaining, 0)
  const dueToday = rows.filter(item => item.debtStatus === 'Due Today').reduce((sum, item) => sum + item.remaining, 0)
  const collected = rows.reduce((sum, item) => sum + item.paid, 0)
  const refunded = rows.reduce((sum, item) => sum + Number(item.refunded || 0), 0)
  const saveDebt = form => {
    const remaining = form.total - form.paid
    const debt = {
      id: `DEBT-2026-${String(rows.length + 1).padStart(4, '0')}`,
      customer: form.customer,
      phone: form.phone || 'មិនមានលេខ',
      province: form.province,
      invoice: form.invoice,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate,
      total: form.total,
      paid: form.paid,
      refunded: 0,
      remaining,
      sales: form.sales,
      method: 'Cash',
      paymentStatus: paymentStatusFor(form.paid, remaining),
      debtStatus: debtStatusFor(remaining, form.dueDate),
      risk: remaining > 500 ? 'High' : remaining > 0 ? 'Medium' : 'Low',
      lastFollowUp: form.notes || 'Debt ថ្មី មិនទាន់មាន follow up',
    }
    setRows(current => [debt, ...current])
    setSelected(debt)
    setFormOpen(false)
    toast.success('បានបន្ថែម Debt ថ្មីសម្រាប់ test')
  }
  const savePayment = (debt, amount) => {
    const updatedPaid = Number(debt.paid) + amount
    const updatedRemaining = Math.max(0, Number(debt.total) - updatedPaid)
    const next = { ...debt, paid: updatedPaid, remaining: updatedRemaining, paymentStatus: paymentStatusFor(updatedPaid, updatedRemaining), debtStatus: debtStatusFor(updatedRemaining, debt.dueDate), lastFollowUp: `បានកត់ត្រាការបង់ប្រាក់ ${fmt(amount)}` }
    setRows(current => current.map(item => item.id === debt.id ? next : item))
    setSelected(next)
    setPaymentDebt(null)
    toast.success('បានកាត់ប្រាក់ និង update balance ក្នុង prototype')
  }
  const saveRefund = (debt, refund) => {
    const amount = Number(refund.amount)
    const updatedTotal = Math.max(0, Number(debt.total) - amount)
    const updatedPaid = Math.min(Number(debt.paid), updatedTotal)
    const updatedRemaining = Math.max(0, updatedTotal - updatedPaid)
    const updatedRefunded = Number(debt.refunded || 0) + amount
    const creditNote = `CN-${new Date().getFullYear()}-${String((debt.refundHistory || []).length + 1).padStart(5, '0')}`
    const refundRecord = {
      creditNote,
      date: refund.date || new Date().toISOString().slice(0, 10),
      amount,
      method: refund.method || 'Cash',
      account: refund.account || 'Cash Box',
      reference: refund.reference || creditNote,
      operator: refund.operator || debt.sales,
      reason: refund.reason || 'ផ្សេងៗ',
      note: refund.note || '',
      approvalStatus: amount >= 100 ? 'Pending Approval' : 'Approved',
      cashFlowType: 'Cash Out',
    }
    const next = { ...debt, total: updatedTotal, paid: updatedPaid, refunded: updatedRefunded, refundHistory: [refundRecord, ...(debt.refundHistory || [])], remaining: updatedRemaining, paymentStatus: paymentStatusFor(updatedPaid, updatedRemaining), debtStatus: debtStatusFor(updatedRemaining, debt.dueDate), lastFollowUp: `បានដក/សងលុយទៅអតិថិជន ${fmt(amount)} · ${creditNote}` }
    setRows(current => current.map(item => item.id === debt.id ? next : item))
    setSelected(next)
    setRefundDebt(null)
    toast.success('បានកត់ត្រាការសងលុយទៅអតិថិជន')
  }
  const savePromise = debt => {
    setPromiseDebt(null)
    toast.success(`បានកត់ត្រាសន្យាបង់ប្រាក់សម្រាប់ ${debt.customer}`)
  }
  const deleteDebt = debt => {
    if (!window.confirm(`តើអ្នកចង់លុបបំណុល ${debt.invoice} របស់ ${debt.customer} មែនទេ?`)) return
    setRows(current => {
      const nextRows = current.filter(item => item.id !== debt.id)
      setSelected(currentSelected => currentSelected?.id === debt.id ? nextRows[0] || null : currentSelected)
      return nextRows
    })
    toast.success('បានលុបបំណុលចេញពីបញ្ជី')
  }
  const callSelected = () => {
    if (!selected) return toast.error('សូមជ្រើស Debt មួយសិន')
    window.location.href = `tel:${selected.phone.replaceAll(' ', '')}`
  }

  return <div className="space-y-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-bold text-blue-600">គ្រប់គ្រងបំណុល</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">គ្រប់គ្រងបំណុលអតិថិជន</h1>
        <p className="mt-1 text-sm text-slate-500">តាមដានបំណុល, ការបង់ប្រាក់, រំលឹកបំណុល, សន្យាបង់ប្រាក់ និង Cash Flow</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={() => downloadCsv(filtered)}><Download size={17}/>Export</button>
        <button className="btn-secondary" onClick={() => window.print()}><Printer size={17}/>Print</button>
        <button className="btn-primary" onClick={() => setFormOpen(true)}><Plus size={18}/>បន្ថែម Debt</button>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <SummaryCard icon={WalletCards} label="ប្រាក់នៅសល់សរុប" value={fmt(totalOutstanding)} helper="មិនរាប់បង់រួច" tone="blue"/>
      <SummaryCard icon={ShieldAlert} label="បំណុលហួសថ្ងៃ" value={fmt(overdue)} helper="ត្រូវ follow up បន្ទាន់" tone="red"/>
      <SummaryCard icon={CalendarClock} label="ត្រូវបង់ថ្ងៃនេះ" value={fmt(dueToday)} helper="ត្រូវទារថ្ងៃនេះ" tone="amber"/>
      <SummaryCard icon={Undo2} label="សងលុយសរុប" value={fmt(refunded)} helper="Credit/Refund" tone="red"/>
      <SummaryCard icon={TrendingUp} label="បានប្រមូលសរុប" value={fmt(collected)} helper="ពីប្រវត្តិបង់ប្រាក់" tone="green"/>
    </div>

    <section className="card p-4">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="field pl-10" placeholder="ស្វែងរកអតិថិជន / វិក្កយបត្រ / លេខទូរស័ព្ទ..."/></div>
        <select className="field" defaultValue="all"><option value="all">Sales ទាំងអស់</option><option>Van</option><option>Phanha</option><option>Pheak</option></select>
        <select className="field" value={status} onChange={event => setStatus(event.target.value)}><option value="all">Debt Status ទាំងអស់</option><option>Overdue</option><option>Due Today</option><option>Due Soon</option><option>Fully Paid</option></select>
        <select className="field" defaultValue="all"><option value="all">Province ទាំងអស់</option><option>ភ្នំពេញ</option><option>កណ្ដាល</option><option>តាកែវ</option></select>
        <select className="field" defaultValue="all"><option value="all">Risk ទាំងអស់</option><option>High</option><option>Medium</option><option>Low</option></select>
      </div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.7fr)]">
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b bg-slate-50 px-5 py-4">
          <div><h2 className="font-extrabold">បញ្ជីបំណុល</h2><p className="text-xs text-slate-500">ចុច row ដើម្បីមើល detail និង action បន្ទាប់</p></div>
          <button className="btn-secondary" onClick={() => setReportOpen(true)}><FileSpreadsheet size={17}/>របាយការណ៍</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px]">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr><th className="table-cell">អតិថិជន</th><th className="table-cell">វិក្កយបត្រ</th><th className="table-cell">ថ្ងៃត្រូវបង់</th><th className="table-cell text-right">សរុប</th><th className="table-cell text-right">បានបង់</th><th className="table-cell text-right">សងលុយ</th><th className="table-cell text-right">នៅសល់</th><th className="table-cell">ស្ថានភាព</th><th className="table-cell">ហានិភ័យ</th><th className="table-cell text-right">សកម្មភាព</th></tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(item => <tr key={item.id} onClick={() => setSelected(item)} className={`cursor-pointer hover:bg-blue-50/40 ${selected?.id === item.id ? 'bg-blue-50' : ''}`}>
                <td className="table-cell"><p className="font-bold">{item.customer}</p><p className="text-xs text-slate-500">{item.phone} · {item.sales}</p></td>
                <td className="table-cell"><p className="font-bold text-blue-700">{item.invoice}</p><p className="text-xs text-slate-500">{item.invoiceDate}</p></td>
                <td className="table-cell"><p className="font-bold">{item.dueDate}</p><p className="text-xs text-slate-500">{item.lastFollowUp}</p></td>
                <td className="table-cell text-right font-bold">{fmt(item.total)}</td>
                <td className="table-cell text-right font-bold text-green-600">{fmt(item.paid)}</td>
                <td className="table-cell text-right font-bold text-red-600">{fmt(item.refunded || 0)}</td>
                <td className="table-cell text-right font-extrabold text-red-600">{fmt(item.remaining)}</td>
                <td className="table-cell"><StatusBadge status={item.debtStatus}/></td>
                <td className="table-cell"><StatusBadge status={item.risk}/></td>
                <td className="table-cell"><div className="flex justify-end gap-1" onClick={event => event.stopPropagation()}>
                  <button className="rounded-lg p-2 text-blue-600 hover:bg-blue-100" title="មើលលម្អិត" onClick={() => setSelected(item)}><Eye size={17}/></button>
                  <button className="rounded-lg p-2 text-green-600 hover:bg-green-100" title="កត់ត្រាការបង់ប្រាក់" onClick={() => setPaymentDebt(item)}><Banknote size={17}/></button>
                  <button className="rounded-lg p-2 text-red-600 hover:bg-red-100" title="សងលុយទៅអតិថិជន" onClick={() => setRefundDebt(item)}><Undo2 size={17}/></button>
                  <button className="rounded-lg p-2 text-red-600 hover:bg-red-100" title="លុបបំណុល" onClick={() => deleteDebt(item)}><Trash2 size={17}/></button>
                  <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" title="សកម្មភាពបន្ថែម" onClick={() => setMoreDebt(item)}><MoreHorizontal size={17}/></button>
                </div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <DebtDetail debt={selected} onPay={setPaymentDebt} onPromise={setPromiseDebt} onRefund={setRefundDebt}/>
    </div>

    <section className="grid gap-5 xl:grid-cols-3">
      <div className="card p-5 xl:col-span-2">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-extrabold">របាយការណ៍សម្រាប់ Manager</h2><button className="btn-secondary" onClick={() => toast.success('បានសាកល្បងបញ្ជូន Report ទៅ Manager')}><Send size={17}/>បញ្ជូន Report</button></div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border p-4"><AlertTriangle className="mb-3 text-red-500"/><p className="text-sm text-slate-500">អតិថិជនហានិភ័យខ្ពស់</p><p className="text-2xl font-extrabold">1</p></div>
          <div className="rounded-xl border p-4"><XCircle className="mb-3 text-red-500"/><p className="text-sm text-slate-500">សន្យាបង់ខកខាន</p><p className="text-2xl font-extrabold">1</p></div>
          <div className="rounded-xl border p-4"><CheckCircle2 className="mb-3 text-green-500"/><p className="text-sm text-slate-500">អត្រាប្រមូលប្រាក់</p><p className="text-2xl font-extrabold">59%</p></div>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="mb-4 font-extrabold">សកម្មភាពបន្ទាប់</h2>
        <div className="space-y-3 text-sm">
          <button className="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-slate-50" onClick={callSelected}><PhoneCall className="text-blue-600" size={18}/><span>Call overdue customer</span></button>
          <button className="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-slate-50" onClick={() => toast.info('Reminder message ត្រូវបានរៀបចំសម្រាប់ test')}><MessageCircle className="text-amber-600" size={18}/><span>ផ្ញើសាររំលឹក</span></button>
          <button className="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-slate-50" onClick={() => toast.info('Audit trail នឹងភ្ជាប់ទៅ database នៅជំហានបន្ទាប់')}><History className="text-slate-600" size={18}/><span>មើល Audit Trail</span></button>
        </div>
      </div>
    </section>

    <DebtFormModal open={formOpen} onClose={() => setFormOpen(false)} onSave={saveDebt}/>
    <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} rows={filtered}/>
    <MoreActionsModal debt={moreDebt} onClose={() => setMoreDebt(null)} onPay={setPaymentDebt} onPromise={setPromiseDebt} onRefund={setRefundDebt}/>
    <PaymentModal debt={paymentDebt} onClose={() => setPaymentDebt(null)} onSave={savePayment}/>
    <RefundModal debt={refundDebt} onClose={() => setRefundDebt(null)} onSave={saveRefund}/>
    <PromiseModal debt={promiseDebt} onClose={() => setPromiseDebt(null)} onSave={savePromise}/>
  </div>
}
