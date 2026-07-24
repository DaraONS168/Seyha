import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Eye, FileText, Pencil, Search, Send, Trash2, WalletCards } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import EmptyState from '../components/common/EmptyState'
import LoadingState from '../components/common/LoadingState'
import { useAuth } from '../contexts/AuthContext'
import { dailyReportService } from '../services/dailyReportService'

const labels = { draft: 'ព្រាង', submitted: 'រង់ចាំអនុម័ត', returned: 'បានបញ្ជូនត្រឡប់', approved: 'បានអនុម័ត', rejected: 'បានបដិសេធ' }
const colors = { draft: 'bg-slate-100 text-slate-700', submitted: 'bg-amber-50 text-amber-700', returned: 'bg-orange-50 text-orange-700', approved: 'bg-green-50 text-green-700', rejected: 'bg-red-50 text-red-700' }

export default function DailyReportsPage() {
  const { hasPermission, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') || ''
  const [filters, setFilters] = useState({ search: '', status: initialStatus, from: '', to: '', page: 1, pageSize: 10 })
  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await dailyReportService.list(filters)
    if (result.error) toast.error(result.error.message)
    setRows(result.data || [])
    setCount(result.count || 0)
    setLoading(false)
  }, [filters])

  useEffect(() => { load() }, [load])

  const managerStats = useMemo(() => rows.reduce((sum, row) => {
    const data = workspaceSummary(row)
    return {
      pending: sum.pending + (row.status === 'submitted' ? 1 : 0),
      sales: sum.sales + data.salesAmount,
      collected: sum.collected + data.collected,
      credit: sum.credit + data.credit,
      expense: sum.expense + data.expense,
    }
  }, { pending: 0, sales: 0, collected: 0, credit: 0, expense: 0 }), [rows])

  const submit = async row => {
    if (!confirm(`ដាក់ស្នើ ${row.report_code} ទៅអ្នកគ្រប់គ្រង?`)) return
    const result = await dailyReportService.submit(row.id)
    result.error ? toast.error(result.error.message) : (toast.success('បានដាក់ស្នើ'), load())
  }

  const remove = async row => {
    if (!confirm(`លុប ${row.report_code}?`)) return
    const result = await dailyReportService.remove(row.id)
    result.error ? toast.error(result.error.message) : (toast.success('បានលុប'), load())
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">របាយការណ៍ប្រចាំថ្ងៃ</h1>
        <p className="text-sm text-slate-500">{filters.status === 'submitted' ? 'បញ្ជីរបាយការណ៍ដែលកំពុងរង់ចាំអនុម័ត' : 'ទាញពី Workspace និងបង្ហាញចំណុចសំខាន់ៗសម្រាប់ Manager ពិនិត្យ'}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link className="btn-secondary" to="/daily-reports/workspace">Workspace លម្អិត</Link>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <ManagerCard icon={AlertTriangle} label="ត្រូវពិនិត្យ" value={managerStats.pending} tone="amber"/>
      <ManagerCard icon={FileText} label="លក់សរុប" value={money(managerStats.sales)} tone="green"/>
      <ManagerCard icon={WalletCards} label="ប្រមូលបាន" value={money(managerStats.collected)} tone="blue"/>
      <ManagerCard icon={AlertTriangle} label="ជំពាក់" value={money(managerStats.credit)} tone="orange"/>
      <ManagerCard icon={WalletCards} label="ចំណាយ" value={money(managerStats.expense)} tone="red"/>
    </div>

    <div className="card grid gap-3 p-4 md:grid-cols-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
        <input className="field pl-10" placeholder="លេខរបាយការណ៍..." value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value, page: 1 })}/>
      </div>
      <select className="field" value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value, page: 1 })}>
        <option value="">ស្ថានភាពទាំងអស់</option>
        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <input className="field" type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value, page: 1 })}/>
      <input className="field" type="date" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value, page: 1 })}/>
    </div>

    <div className="card overflow-hidden">
      {loading ? <LoadingState/> : !rows.length ? <EmptyState title="មិនទាន់មានរបាយការណ៍"/> : <div className="overflow-x-auto">
        <table className="w-full min-w-[1320px]">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>{['លេខរាយការណ៍','កាលបរិច្ឆេទ','Sales / Plan','Invoice','លក់','ប្រមូល','ជំពាក់','ចំណាយ','ចម្ងាយ','ស្ថានភាព','សកម្មភាព'].map(item => <th className="table-cell" key={item}>{item}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(row => {
              const data = workspaceSummary(row)
              return <tr key={row.id}>
                <td className="table-cell font-bold text-blue-700">{row.report_code}</td>
                <td className="table-cell">{new Date(row.report_date).toLocaleDateString('km-KH')}</td>
                <td className="table-cell"><b>{row.sales?.full_name}</b><p className="text-xs text-slate-500">{row.plan?.title}</p></td>
                <td className="table-cell font-semibold">{data.invoiceCount}</td>
                <td className="table-cell font-semibold text-green-700">{money(data.salesAmount)}</td>
                <td className="table-cell font-semibold text-blue-700">{money(data.collected)}</td>
                <td className={`table-cell font-semibold ${data.credit > 0 ? 'text-orange-700' : 'text-slate-500'}`}>{money(data.credit)}</td>
                <td className="table-cell font-semibold text-red-700">{money(data.expense)}</td>
                <td className="table-cell font-semibold">{data.distance} km</td>
                <td className="table-cell"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${colors[row.status]}`}>{labels[row.status]}</span></td>
                <td className="table-cell"><Actions row={row} navigate={navigate} submit={submit} remove={remove} hasPermission={hasPermission} isAdmin={isAdmin}/></td>
              </tr>
            })}
          </tbody>
        </table>
        <div className="flex justify-between border-t p-3 text-sm">
          <span>សរុប {count}</span>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={filters.page === 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>មុន</button>
            <button className="btn-secondary" disabled={filters.page * filters.pageSize >= count} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>បន្ទាប់</button>
          </div>
        </div>
      </div>}
    </div>
  </div>
}

function Actions({ row, navigate, submit, remove, hasPermission, isAdmin }) {
  return <div className="flex gap-1">
    <button className="p-2 text-blue-600" onClick={() => navigate(`/daily-reports/${row.id}`)}><Eye size={17}/></button>
    {(isAdmin || ['draft','returned'].includes(row.status)) && hasPermission('daily_reports.update') && <Link className="p-2" to={`/daily-reports/workspace?report=${row.id}`}><Pencil size={17}/></Link>}
    {['draft','returned'].includes(row.status) && <button className="p-2 text-green-600" onClick={() => submit(row)}><Send size={17}/></button>}
    {(isAdmin || row.status === 'draft') && hasPermission('daily_reports.delete') && <button className="p-2 text-red-600" onClick={() => remove(row)}><Trash2 size={17}/></button>}
  </div>
}

function ManagerCard({ icon: Icon, label, value, tone }) {
  const tones = { amber: 'border-amber-100 bg-amber-50 text-amber-700', green: 'border-green-100 bg-green-50 text-green-700', blue: 'border-blue-100 bg-blue-50 text-blue-700', orange: 'border-orange-100 bg-orange-50 text-orange-700', red: 'border-red-100 bg-red-50 text-red-700' }
  return <div className={`rounded-lg border p-4 ${tones[tone]}`}>
    <div className="flex items-center gap-3"><Icon size={22}/><div><p className="text-xs font-semibold">{label}</p><p className="text-xl font-bold text-slate-950">{value}</p></div></div>
  </div>
}

function workspaceSummary(row) {
  const invoices = row.invoices || []
  const expenses = row.expenses || []
  const invoiceCount = invoices.filter(item => item.status !== 'cancelled').length || Number(row.total_markets_visited || 0)
  const salesAmount = sum(invoices, 'invoice_amount') || Number(row.total_sales_amount || 0)
  const collected = sum(invoices, 'collected_amount') || Number(row.total_collection_amount || 0)
  const credit = sum(invoices, 'credit_amount') || Number(row.total_credit_amount || 0)
  const otherExpense = expenses.length ? sum(expenses, 'amount') : Number(row.total_other_expense || 0)
  const fuelExpense = Number(row.total_fuel_expense || 0) || Number(row.fuel_liters || 0) * Number(row.fuel_unit_price || 0)
  const expense = otherExpense + fuelExpense
  const distance = Number(row.total_distance_km || Math.max(Number(row.odometer_end || 0) - Number(row.odometer_start || 0), 0))
  return { invoiceCount, salesAmount, collected, credit, expense, distance }
}

function sum(rows, key) { return rows.reduce((total, row) => total + Number(row[key] || 0), 0) }
function money(value) { return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
