import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, ClipboardList, FileText, Gauge, Pencil, RotateCcw, ShoppingCart, WalletCards, X, XCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import Modal from '../components/common/Modal'
import LoadingState from '../components/common/LoadingState'
import { useAuth } from '../contexts/AuthContext'
import { dailyReportService } from '../services/dailyReportService'

const labels = { draft: 'ព្រាង', submitted: 'រង់ចាំអនុម័ត', returned: 'បានបញ្ជូនត្រឡប់', approved: 'បានអនុម័ត', rejected: 'បានបដិសេធ' }
const statusClasses = { draft: 'bg-slate-100 text-slate-700', submitted: 'bg-amber-50 text-amber-700', returned: 'bg-orange-50 text-orange-700', approved: 'bg-green-50 text-green-700', rejected: 'bg-red-50 text-red-700' }
const actionLabels = { submitted: 'បានដាក់ស្នើ', resubmitted: 'បានដាក់ស្នើម្ដងទៀត', approved: 'បានអនុម័ត', returned: 'បានបញ្ជូនត្រឡប់', rejected: 'បានបដិសេធ' }

export default function DailyReportDetailPage() {
  const { id } = useParams()
  const { profile, hasPermission } = useAuth()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewDialog, setReviewDialog] = useState(null)
  const [reviewComment, setReviewComment] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await dailyReportService.get(id)
    result.error ? toast.error(result.error.message) : setReport(result.data)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const summary = useMemo(() => {
    if (!report) return {}
    const invoices = report.invoices || []
    const expenses = report.expenses || []
    const sales = sum(invoices, 'invoice_amount') || Number(report.total_sales_amount || 0)
    const collected = sum(invoices, 'collected_amount') || Number(report.total_collection_amount || 0)
    const credit = sum(invoices, 'credit_amount') || Number(report.total_credit_amount || 0)
    const returned = sum(invoices, 'returned_amount')
    const otherExpense = expenses.length ? sum(expenses, 'amount') : Number(report.total_other_expense || 0)
    const fuelExpense = Number(report.total_fuel_expense || 0) || Number(report.fuel_liters || 0) * Number(report.fuel_unit_price || 0)
    const distance = Number(report.total_distance_km || Math.max(Number(report.odometer_end || 0) - Number(report.odometer_start || 0), 0))
    const afterHours = Math.max(Number(report.odometer_night || report.odometer_end || 0) - Number(report.odometer_end || 0), 0)
    return { invoices: invoices.filter(item => item.status !== 'cancelled').length, sales, collected, returned, credit, otherExpense, fuelExpense, totalExpense: otherExpense + fuelExpense, distance, afterHours }
  }, [report])

  const own = report?.sales_user_id === profile?.id
  const canReview = report?.status === 'submitted' && hasPermission('daily_reports.review')

  const review = async action => {
    if (action !== 'approved') { setReviewDialog(action); setReviewComment(''); return }
    if (!confirm(`អនុម័ត ${report.report_code}?`)) return
    await runReview('approved', '')
  }

  const runReview = async (action, comment) => {
    if (['returned', 'rejected'].includes(action) && !comment.trim()) return toast.error('សូមបញ្ចូលមូលហេតុ')
    setBusy(true)
    const result = await dailyReportService.review(id, action, comment.trim())
    setBusy(false)
    if (result.error) return toast.error(result.error.message)
    toast.success('បានកែស្ថានភាពរបាយការណ៍')
    setReviewDialog(null)
    setReviewComment('')
    load()
  }

  if (loading) return <LoadingState/>
  if (!report) return null

  return <div className="space-y-5">
    <div className="sticky top-[72px] z-20 rounded-2xl border bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link className="rounded-xl border bg-white p-2 hover:bg-slate-50" to="/daily-reports?status=submitted"><ArrowLeft size={20}/></Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{report.report_code}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[report.status]}`}>{labels[report.status]}</span>
            </div>
            <p className="text-sm text-slate-500">{report.sales?.full_name || '—'} · {report.plan?.title || '—'} · {new Date(report.report_date).toLocaleDateString('km-KH')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {own && ['draft', 'returned'].includes(report.status) && <Link className="btn-secondary" to={`/daily-reports/workspace?report=${id}`}><Pencil size={17}/>កែប្រែ</Link>}
          {canReview && <>
            <button className="btn-secondary text-orange-700" disabled={busy} onClick={() => review('returned')}><RotateCcw size={17}/>បញ្ជូនត្រឡប់</button>
            <button className="btn-secondary text-red-700" disabled={busy} onClick={() => review('rejected')}><XCircle size={17}/>បដិសេធ</button>
            <button className="btn-primary" disabled={busy} onClick={() => review('approved')}><CheckCircle2 size={17}/>អនុម័ត</button>
          </>}
        </div>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <Metric icon={FileText} label="Invoice" value={summary.invoices} tone="blue"/>
      <Metric icon={WalletCards} label="លក់សរុប" value={money(summary.sales)} tone="green"/>
      <Metric icon={WalletCards} label="ប្រមូលបាន" value={money(summary.collected)} tone="violet"/>
      <Metric icon={RotateCcw} label="ប្តូរឥវ៉ាន់" value={money(summary.returned)} tone="red"/>
      <Metric icon={ShoppingCart} label="ចំណាយ" value={money(summary.totalExpense)} tone="orange"/>
      <Metric icon={Gauge} label="ចម្ងាយ" value={`${number(summary.distance)} km`} tone={summary.afterHours > 0 ? 'red' : 'teal'}/>
    </div>

    {summary.afterHours > 0 && <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-800">មានចម្ងាយក្រៅម៉ោង {number(summary.afterHours)} km សូមពិនិត្យមុនអនុម័ត។</div>}

    <section className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-bold"><ClipboardList size={18} className="text-blue-600"/>ព័ត៌មានសំខាន់សម្រាប់ពិនិត្យ</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Info label="Sales" value={report.sales?.full_name}/>
        <Info label="ក្រុម" value={report.team?.name}/>
        <Info label="ផែនការចុះ" value={report.plan?.title}/>
        <Info label="ខេត្ត" value={report.province?.name_kh || report.plan?.province}/>
        <Info label="យានយន្ត" value={report.vehicle ? `${report.vehicle.brand_model || ''} ${report.vehicle.plate_number || ''}`.trim() : ''}/>
        <Info label="សាំង" value={`${number(report.fuel_liters)} L · ${money(report.total_fuel_expense)}`}/>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <NoteBlock title="សេចក្ដីសង្ខេប" value={report.report_summary}/>
        <NoteBlock title="បញ្ហាប្រឈម" value={report.problems}/>
        <NoteBlock title="ផែនការបន្ទាប់" value={report.next_plan}/>
      </div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
      <DataTable title="បញ្ជី Invoice" headers={['លេខ Invoice', 'អតិថិជន', 'ផ្សារ', 'លក់', 'ប្រមូល', 'ប្តូរ', 'ជំពាក់']}>
        {(report.invoices || []).map(row => <tr key={row.id}>
          <td className="table-cell font-semibold">{row.invoice_number}</td>
          <td className="table-cell">{row.customer_name}</td>
          <td className="table-cell">{row.market?.name_kh || row.market_name || '—'}</td>
          <td className="table-cell font-semibold text-green-700">{money(row.invoice_amount)}</td>
          <td className="table-cell font-semibold text-blue-700">{money(row.collected_amount)}</td>
          <td className="table-cell font-semibold text-red-700">{money(row.returned_amount)}</td>
          <td className="table-cell font-semibold text-orange-700">{money(row.credit_amount)}</td>
        </tr>)}
      </DataTable>

      <DataTable title="ចំណាយប្រចាំថ្ងៃ" headers={['ប្រភេទ', 'ទីតាំង/ហាង', 'ចំនួន']}>
        {(report.expenses || []).map(row => <tr key={row.id}>
          <td className="table-cell font-medium">{row.category?.name_kh || row.description || '—'}</td>
          <td className="table-cell">{row.market?.name_kh || row.vendor_name || '—'}</td>
          <td className="table-cell font-semibold text-red-700">{money(row.amount)}</td>
        </tr>)}
      </DataTable>
    </div>

    <section className="card p-5">
      <h2 className="mb-4 font-bold">ប្រវត្តិអនុម័ត</h2>
      <div className="space-y-3">
        {(report.approvals || []).length === 0 && <p className="text-sm text-slate-500">មិនទាន់មានប្រវត្តិ</p>}
        {(report.approvals || []).map(item => <div className="rounded-xl border p-3" key={item.id}>
          <div className="flex flex-wrap justify-between gap-2">
            <b>{actionLabels[item.action] || item.action}</b>
            <span className="text-xs text-slate-400">{new Date(item.action_at).toLocaleString('km-KH')}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{item.manager?.full_name || '—'}{item.comment ? ` · ${item.comment}` : ''}</p>
        </div>)}
      </div>
    </section>

    <Modal open={Boolean(reviewDialog)} onClose={() => setReviewDialog(null)} title={reviewDialog === 'returned' ? 'បញ្ជូនត្រឡប់របាយការណ៍' : 'បដិសេធរបាយការណ៍'} size="max-w-lg">
      <div className="space-y-4">
        <div>
          <label className="label">មូលហេតុ *</label>
          <textarea className="field min-h-28" value={reviewComment} onChange={event => setReviewComment(event.target.value)} placeholder="សរសេរមូលហេតុឲ្យ Sales ដឹងត្រូវកែអ្វី..."/>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <button className="btn-secondary" onClick={() => setReviewDialog(null)}><X size={17}/>បោះបង់</button>
          <button className={reviewDialog === 'returned' ? 'btn-secondary text-orange-700' : 'btn-secondary text-red-700'} disabled={busy} onClick={() => runReview(reviewDialog, reviewComment)}>{reviewDialog === 'returned' ? 'បញ្ជូនត្រឡប់' : 'បដិសេធ'}</button>
        </div>
      </div>
    </Modal>
  </div>
}

function Metric({ icon: Icon, label, value, tone }) {
  const tones = { blue: 'border-blue-100 bg-blue-50 text-blue-700', green: 'border-green-100 bg-green-50 text-green-700', violet: 'border-violet-100 bg-violet-50 text-violet-700', orange: 'border-orange-100 bg-orange-50 text-orange-700', red: 'border-red-100 bg-red-50 text-red-700', teal: 'border-teal-100 bg-teal-50 text-teal-700' }
  return <div className={`rounded-lg border p-4 ${tones[tone]}`}><div className="flex items-center gap-3"><Icon size={22}/><div><p className="text-xs font-semibold">{label}</p><p className="text-xl font-bold text-slate-950">{value}</p></div></div></div>
}

function Info({ label, value }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="font-semibold">{value || '—'}</p></div> }
function NoteBlock({ title, value }) { return <div className="rounded-xl border bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{title}</p><p className="mt-1 whitespace-pre-line text-sm font-medium">{value || '—'}</p></div> }
function DataTable({ title, headers, children }) { return <section className="card overflow-hidden"><h2 className="border-b p-4 font-bold">{title}</h2><div className="overflow-x-auto"><table className="w-full min-w-[680px]"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>{headers.map(header => <th className="table-cell" key={header}>{header}</th>)}</tr></thead><tbody className="divide-y">{children}</tbody></table></div></section> }
function sum(rows, key) { return rows.reduce((total, row) => total + Number(row[key] || 0), 0) }
function number(value) { return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }) }
function money(value) { return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
