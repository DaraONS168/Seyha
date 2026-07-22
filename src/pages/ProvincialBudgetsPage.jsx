import { useCallback, useEffect, useState } from 'react'
import { History, Lock, LockOpen, Pencil, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import EmptyState from '../components/common/EmptyState'
import LoadingState from '../components/common/LoadingState'
import Modal from '../components/common/Modal'
import { useAuth } from '../contexts/AuthContext'
import { expenseService } from '../services/expenseService'
import { money } from '../utils/expenseConstants'

const empty = { fiscal_year: new Date().getFullYear(), province_id: '', project_id: '', expense_category_id: '', approved_amount: '', revised_amount: 0, status: 'active' }

export default function ProvincialBudgetsPage() {
  const { hasPermission } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [lookups, setLookups] = useState({ provinces: [], projects: [], categories: [] })
  const [form, setForm] = useState(null)
  const [revision, setRevision] = useState(null)
  const [history, setHistory] = useState(null)
  const [fiscal, setFiscal] = useState({ year: new Date().getFullYear(), status: 'open', reason: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const result = await expenseService.budgets({ pageSize: 100 })
    if (result.error) toast.error(result.error.message)
    setRows(result.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load(); expenseService.lookups().then(setLookups) }, [load])
  const options = items => items.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)
  const save = async event => {
    event.preventDefault()
    const result = form.id ? await expenseService.updateBudget(form.id, form) : await expenseService.createBudget(form)
    if (result.error) return toast.error(result.error.message)
    toast.success('បានរក្សាទុកថវិកា'); setForm(null); load()
  }
  const revise = async event => {
    event.preventDefault()
    const result = await expenseService.reviseBudget(revision.budget.id, revision)
    if (result.error) return toast.error(result.error.message)
    toast.success('បានកត់ត្រាការកែសម្រួលថវិកា'); setRevision(null); load()
  }
  const showHistory = async budget => {
    const { data, error } = await expenseService.budgetRevisions(budget.id)
    if (error) return toast.error(error.message)
    setHistory({ budget, rows: data || [] })
  }
  const changeFiscal = async () => {
    const status = fiscal.status === 'open' ? 'closed' : 'open'
    if (status === 'closed' && fiscal.reason.trim().length < 5) return toast.error('សូមបញ្ចូលមូលហេតុបិទឆ្នាំថវិកា')
    const result = await expenseService.setFiscalYear(Number(fiscal.year), status, fiscal.reason)
    if (result.error) return toast.error(result.error.message)
    toast.success(status === 'closed' ? 'បានបិទឆ្នាំថវិកា' : 'បានបើកឆ្នាំថវិកាឡើងវិញ')
    setFiscal({ ...fiscal, status, reason: '' })
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">ថវិកាតាមខេត្ត</h1><p className="text-sm text-slate-500">កំណត់ តាមដាន និងរក្សាប្រវត្តិកែសម្រួលថវិកា</p></div>
      <div className="flex flex-wrap gap-2">
        {hasPermission('expenses.fiscal_lock') && <div className="flex items-center gap-1 rounded-xl border bg-white p-1"><input className="w-24 bg-transparent px-2 text-sm outline-none" type="number" value={fiscal.year} onChange={event => setFiscal({ ...fiscal, year: event.target.value })}/>{fiscal.status === 'open' && <input className="w-40 bg-transparent px-2 text-sm outline-none" placeholder="មូលហេតុបិទឆ្នាំ..." value={fiscal.reason} onChange={event => setFiscal({ ...fiscal, reason: event.target.value })}/>}<button className={`rounded-lg px-3 py-2 text-sm font-semibold ${fiscal.status === 'open' ? 'text-red-700 hover:bg-red-50' : 'text-green-700 hover:bg-green-50'}`} onClick={changeFiscal}>{fiscal.status === 'open' ? <><Lock className="inline" size={16}/> បិទឆ្នាំ</> : <><LockOpen className="inline" size={16}/> បើកឆ្នាំ</>}</button></div>}
        {hasPermission('expenses.budgets.manage') && <button className="btn-primary" onClick={() => setForm(empty)}><Plus size={18}/>បន្ថែមថវិកា</button>}
      </div>
    </div>
    <div className="card overflow-hidden">{loading ? <LoadingState/> : rows.length === 0 ? <EmptyState title="មិនមានថវិកា"/> : <div className="overflow-x-auto"><table className="w-full min-w-[1300px]"><thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500"><tr>{['ល.រ','ខេត្ត','ឆ្នាំ','គម្រោង','ប្រភេទ','ថវិកា','កែសម្រួល','បានភ្ជាប់','ចំណាយ','នៅសល់','ប្រើប្រាស់','ស្ថានភាព','សកម្មភាព'].map(label => <th className="table-cell" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row, index) => {
      const total = Number(row.approved_amount) + Number(row.revised_amount)
      const usage = total ? (Number(row.committed_amount) + Number(row.actual_expense_amount)) / total * 100 : 0
      return <tr key={row.id}><td className="table-cell">{index + 1}</td><td className="table-cell font-semibold">{row.province?.name_kh}</td><td className="table-cell">{row.fiscal_year}</td><td className="table-cell">{row.project?.name_kh}</td><td className="table-cell">{row.category?.name_kh}</td><td className="table-cell">{money(row.approved_amount)}</td><td className="table-cell">{money(row.revised_amount)}</td><td className="table-cell">{money(row.committed_amount)}</td><td className="table-cell">{money(row.actual_expense_amount)}</td><td className="table-cell font-bold text-green-700">{money(row.remaining_amount)}</td><td className="table-cell">{usage.toFixed(1)}%</td><td className="table-cell">{row.status}</td><td className="table-cell"><div className="flex gap-1">{hasPermission('expenses.budgets.manage') && <button className="p-2" title="កែព័ត៌មាន" onClick={() => setForm({ ...row })}><Pencil size={17}/></button>}{hasPermission('expenses.budgets.revise') && <button className="p-2 text-blue-600" title="កែសម្រួលថវិកា" onClick={() => setRevision({ budget: row, amount: '', reason: '', reference_document: '' })}><RefreshCw size={17}/></button>}<button className="p-2 text-slate-600" title="ប្រវត្តិកែសម្រួល" onClick={() => showHistory(row)}><History size={17}/></button></div></td></tr>
    })}</tbody></table></div>}</div>
    <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? 'កែប្រែថវិកា' : 'បន្ថែមថវិកា'}><form className="grid gap-4 md:grid-cols-2" onSubmit={save}><div><label className="label">ឆ្នាំថវិកា</label><input className="field" type="number" value={form?.fiscal_year || ''} onChange={event => setForm({ ...form, fiscal_year: event.target.value })}/></div><div><label className="label">ខេត្ត</label><select className="field" value={form?.province_id || ''} onChange={event => setForm({ ...form, province_id: event.target.value })}><option value="">ជ្រើសរើស</option>{options(lookups.provinces)}</select></div><div><label className="label">គម្រោង</label><select className="field" value={form?.project_id || ''} onChange={event => setForm({ ...form, project_id: event.target.value })}><option value="">ជ្រើសរើស</option>{options(lookups.projects)}</select></div><div><label className="label">ប្រភេទចំណាយ</label><select className="field" value={form?.expense_category_id || ''} onChange={event => setForm({ ...form, expense_category_id: event.target.value })}><option value="">ជ្រើសរើស</option>{options(lookups.categories)}</select></div><div><label className="label">ថវិកាអនុម័ត</label><input className="field" type="number" min="0" step="0.01" value={form?.approved_amount || ''} onChange={event => setForm({ ...form, approved_amount: event.target.value })}/></div><div><label className="label">កែសម្រួលសរុប</label><input className="field bg-slate-50" readOnly value={form?.revised_amount || 0}/><p className="mt-1 text-xs text-slate-500">ត្រូវកែតាម Revision ដើម្បីរក្សាប្រវត្តិ។</p></div><div className="flex justify-end gap-2 border-t pt-4 md:col-span-2"><button type="button" className="btn-secondary" onClick={() => setForm(null)}>បោះបង់</button><button className="btn-primary">រក្សាទុក</button></div></form></Modal>
    <Modal open={Boolean(revision)} onClose={() => setRevision(null)} title="កែសម្រួលថវិកា"><form className="space-y-4" onSubmit={revise}><div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{revision?.budget.province?.name_kh} · នៅសល់ {money(revision?.budget.remaining_amount)}</div><div><label className="label">ចំនួន (+ បន្ថែម / - កាត់បន្ថយ)</label><input required className="field" type="number" step="0.01" value={revision?.amount || ''} onChange={event => setRevision({ ...revision, amount: event.target.value })}/></div><div><label className="label">មូលហេតុ</label><textarea required className="field" value={revision?.reason || ''} onChange={event => setRevision({ ...revision, reason: event.target.value })}/></div><div><label className="label">លេខឯកសារយោង</label><input required className="field" value={revision?.reference_document || ''} onChange={event => setRevision({ ...revision, reference_document: event.target.value })}/></div><button className="btn-primary ml-auto">បញ្ជាក់កែសម្រួល</button></form></Modal>
    <Modal open={Boolean(history)} onClose={() => setHistory(null)} title="ប្រវត្តិកែសម្រួលថវិកា"><div className="space-y-3">{history?.rows.length === 0 ? <p className="text-slate-500">មិនទាន់មានការកែសម្រួល</p> : history?.rows.map(row => <div key={row.id} className="rounded-xl border p-3"><div className="flex justify-between"><b className={Number(row.revision_amount) >= 0 ? 'text-green-700' : 'text-red-700'}>{Number(row.revision_amount) >= 0 ? '+' : ''}{money(row.revision_amount)}</b><span className="text-xs text-slate-500">{new Date(row.created_at).toLocaleDateString('km-KH')}</span></div><p className="text-sm">{row.reason}</p><p className="text-xs text-slate-500">យោង៖ {row.reference_document} · {row.approver?.full_name}</p></div>)}</div></Modal>
  </div>
}
