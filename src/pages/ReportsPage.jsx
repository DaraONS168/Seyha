import { useCallback, useEffect, useState } from 'react'
import { Download, FileSpreadsheet, Printer, Search } from 'lucide-react'
import { toast } from 'sonner'
import { reportService } from '../services/reportService'
import { customerService } from '../services/customerService'
import { PRIORITIES, SOURCES, STATUSES, labelOf } from '../utils/constants'
import { formatDate } from '../utils/formatters'
import EmptyState from '../components/common/EmptyState'

const downloadBlob = (content, type, filename) => {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([content], { type }))
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

const escapeCsv = value => `"${String(value ?? '').replaceAll('"', '""')}"`
const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

export default function ReportsPage() {
  const [filters, setFilters] = useState({ from: '', to: '', sales: '', status: '', priority: '', source: '' })
  const [rows, setRows] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { customerService.sales().then(({ data }) => setSales(data || [])) }, [])
  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await reportService.customers(filters)
    setLoading(false)
    if (error) toast.error(error.message)
    else setRows(data || [])
  }, [filters])
  useEffect(() => { load() }, [load])

  const normalized = rows.map(r => ({
    'ឈ្មោះ': r.name, 'ទូរស័ព្ទ': r.phone, 'ស្ថានភាព': labelOf(STATUSES, r.status),
    'អាទិភាព': labelOf(PRIORITIES, r.priority), 'ប្រភព': labelOf(SOURCES, r.source),
    'Sales': r.assigned?.full_name || '', 'ផលិតផល': r.interested_product || '', 'ថ្ងៃបង្កើត': formatDate(r.created_at),
  }))
  const headers = normalized.length ? Object.keys(normalized[0]) : []
  const exportCsv = () => downloadBlob('\uFEFF' + [headers, ...normalized.map(Object.values)].map(row => row.map(escapeCsv).join(',')).join('\r\n'), 'text/csv;charset=utf-8', 'customer-report.csv')
  const exportExcel = () => {
    const table = `<table><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${normalized.map(row => `<tr>${Object.values(row).map(v => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    downloadBlob(`\uFEFF<html><head><meta charset="UTF-8"></head><body>${table}</body></html>`, 'application/vnd.ms-excel;charset=utf-8', 'customer-report.xls')
  }
  const update = e => setFilters(f => ({ ...f, [e.target.name]: e.target.value }))

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">របាយការណ៍</h1><p className="mt-1 text-sm text-slate-500">Customer, Follow Up, Call, Sales, Conversion និង Source reporting</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" disabled={!rows.length} onClick={exportCsv}><Download size={17}/>CSV</button><button className="btn-secondary" disabled={!rows.length} onClick={exportExcel}><FileSpreadsheet size={17}/>Excel</button><button className="btn-secondary" disabled={!rows.length} onClick={() => window.print()}><Printer size={17}/>Print</button></div></div>
    <div className="card p-4 print:hidden"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      <input type="date" name="from" className="field" value={filters.from} onChange={update}/><input type="date" name="to" className="field" value={filters.to} onChange={update}/>
      <select className="field" name="sales" value={filters.sales} onChange={update}><option value="">Sales ទាំងអស់</option>{sales.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>
      <select className="field" name="status" value={filters.status} onChange={update}><option value="">ស្ថានភាព</option>{STATUSES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select className="field" name="priority" value={filters.priority} onChange={update}><option value="">អាទិភាព</option>{PRIORITIES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select className="field" name="source" value={filters.source} onChange={update}><option value="">ប្រភព</option>{SOURCES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
      <button className="btn-primary" onClick={load} disabled={loading}><Search size={17}/>{loading ? 'កំពុងស្វែងរក' : 'បង្ហាញ'}</button>
    </div></div>
    <div className="card overflow-hidden"><div className="border-b p-5"><h2 className="font-bold">Customer Report</h2><p className="text-xs text-slate-500">លទ្ធផល {rows.length} records</p></div>{rows.length === 0 ? <EmptyState title="មិនមានទិន្នន័យរបាយការណ៍"/> : <div className="overflow-x-auto"><table className="w-full min-w-[900px]"><thead className="bg-slate-50 text-left text-xs"><tr>{['ឈ្មោះ','ទូរស័ព្ទ','ស្ថានភាព','អាទិភាព','ប្រភព','Sales','ថ្ងៃបង្កើត'].map(h => <th className="table-cell" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y">{rows.map((r,i) => <tr key={i}><td className="table-cell font-semibold">{r.name}</td><td className="table-cell">{r.phone}</td><td className="table-cell">{labelOf(STATUSES,r.status)}</td><td className="table-cell">{labelOf(PRIORITIES,r.priority)}</td><td className="table-cell">{labelOf(SOURCES,r.source)}</td><td className="table-cell">{r.assigned?.full_name||'—'}</td><td className="table-cell">{formatDate(r.created_at)}</td></tr>)}</tbody></table></div>}</div>
  </div>
}
