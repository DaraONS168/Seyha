import { useCallback, useEffect, useState } from 'react'
import { Building2, ChevronLeft, ChevronRight, Download, Eye, FileText, Pencil, Plus, RotateCcw, Search, Store, Trash2, Upload, Warehouse } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Badge from '../components/common/Badge'
import ConfirmDialog from '../components/common/ConfirmDialog'
import EmptyState from '../components/common/EmptyState'
import LoadingState from '../components/common/LoadingState'
import MarketImportDialog from '../components/markets/MarketImportDialog'
import { marketLookupService } from '../services/marketLookupService'
import { marketService } from '../services/marketService'
import { formatDate } from '../utils/formatters'
import { MARKET_STATUSES, MARKET_STATUS_COLORS } from '../utils/marketConstants'
import { marketImportExport } from '../utils/marketImportExport'
import { useAuth } from '../contexts/AuthContext'

const statusLabel = value => MARKET_STATUSES.find(([key]) => key === value)?.[1] || value

export default function MarketsPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [filters, setFilters] = useState({ search: '', provinceId: '', districtId: '', marketTypeId: '', status: '', deleted: 'active', page: 1, pageSize: 10 })
  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [statistics, setStatistics] = useState({})
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data, count: total, error }, stats] = await Promise.all([marketService.list(filters), marketService.statistics()])
    if (error) toast.error(error.message)
    setRows(data || []); setCount(total || 0); setStatistics(stats.data || {})
    setLoading(false)
  }, [filters])

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer) }, [load])
  useEffect(() => { Promise.all([marketLookupService.provinces(), marketLookupService.marketTypes()]).then(([provinceResult, typeResult]) => { setProvinces(provinceResult.data || []); setTypes(typeResult.data || []) }) }, [])
  const change = event => setFilters(current => ({ ...current, [event.target.name]: event.target.value, page: 1 }))
  const changeProvince = async event => {
    const provinceId = event.target.value
    setFilters(current => ({ ...current, provinceId, districtId: '', page: 1 }))
    const { data } = provinceId ? await marketLookupService.districts(provinceId) : { data: [] }
    setDistricts(data || [])
  }
  const remove = async () => {
    const { error } = await marketService.remove(deleting.id)
    if (error) return toast.error(error.message)
    toast.success('បានលុបផ្សារ'); setDeleting(null); load()
  }
  const restore = async market => { const { error } = await marketService.restore(market.id); if (error) return toast.error(error.message); toast.success('បាន Restore ផ្សារ'); load() }
  const pages = Math.max(1, Math.ceil(count / filters.pageSize))
  const runExport = async type => {
    setExporting(type)
    try {
      if (type === 'excel') await marketImportExport.exportExcel(filters)
      else await marketImportExport.exportPdf(filters)
      toast.success(`បាន Export ${type === 'excel' ? 'Excel' : 'PDF'}`)
    } catch (error) { toast.error(error.message) }
    setExporting('')
  }
  const cards = [
    ['ផ្សារសរុប', statistics.total || 0, Store, 'bg-blue-50 text-blue-700'],
    ['កំពុងដំណើរការ', statistics.active || 0, Building2, 'bg-green-50 text-green-700'],
    ['បានបិទ', statistics.closed || 0, Warehouse, 'bg-red-50 text-red-700'],
    ['ផ្សារសាធារណៈ', statistics.public_markets || 0, Store, 'bg-violet-50 text-violet-700'],
  ]

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">គ្រប់គ្រងផ្សារ</h1><p className="mt-1 text-sm text-slate-500">ព័ត៌មានផ្សារ ទីតាំង អ្នកគ្រប់គ្រង និងតូបអាជីវកម្ម</p></div><div className="flex flex-wrap gap-2">{hasPermission('markets.import') && <button className="btn-secondary" onClick={() => setImportOpen(true)}><Upload size={17}/>Import</button>}{hasPermission('markets.export') && <><button className="btn-secondary" disabled={Boolean(exporting)} onClick={() => runExport('excel')}><Download size={17}/>{exporting === 'excel' ? 'កំពុង Export...' : 'Excel'}</button><button className="btn-secondary" disabled={Boolean(exporting)} onClick={() => runExport('pdf')}><FileText size={17}/>{exporting === 'pdf' ? 'កំពុង Export...' : 'PDF'}</button></>}{hasPermission('markets.create') && <button className="btn-primary" onClick={() => navigate('/markets/new')}><Plus size={18}/>បន្ថែមផ្សារ</button>}</div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,Icon,tone]) => <div key={label} className="card flex items-center gap-4 p-4"><div className={`grid size-11 place-items-center rounded-xl ${tone}`}><Icon size={21}/></div><div><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p></div></div>)}</div>
    <div className="card p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7"><div className="relative xl:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="field pl-10" name="search" value={filters.search} onChange={change} placeholder="ឈ្មោះផ្សារ ឬលេខកូដ..."/></div><select className="field" value={filters.provinceId} onChange={changeProvince}><option value="">ខេត្តទាំងអស់</option>{provinces.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)}</select><select className="field" name="districtId" value={filters.districtId} onChange={change} disabled={!filters.provinceId}><option value="">ស្រុក/ខណ្ឌទាំងអស់</option>{districts.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)}</select><select className="field" name="marketTypeId" value={filters.marketTypeId} onChange={change}><option value="">ប្រភេទទាំងអស់</option>{types.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)}</select><select className="field" name="status" value={filters.status} onChange={change}><option value="">ស្ថានភាពទាំងអស់</option>{MARKET_STATUSES.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><select className="field" name="deleted" value={filters.deleted} onChange={change}><option value="active">កំពុងប្រើ</option><option value="deleted">បានលុប</option><option value="all">ទាំងអស់</option></select></div></div>
    <div className="card overflow-hidden">{loading ? <LoadingState/> : rows.length === 0 ? <EmptyState title="មិនមានទិន្នន័យផ្សារ" description="សូមបន្ថែមផ្សារថ្មី ឬកែតម្រូវ Filter។"/> : <><div className="overflow-x-auto"><table className="w-full min-w-[1200px]"><thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="table-cell">ល.រ</th><th className="table-cell">លេខកូដ</th><th className="table-cell">ឈ្មោះផ្សារ</th><th className="table-cell">ខេត្ត</th><th className="table-cell">ស្រុក/ខណ្ឌ</th><th className="table-cell">ប្រភេទ</th><th className="table-cell">ស្ថានភាព</th><th className="table-cell">អ្នកគ្រប់គ្រង</th><th className="table-cell">ទូរស័ព្ទ</th><th className="table-cell">ថ្ងៃបង្កើត</th><th className="table-cell text-right">សកម្មភាព</th></tr></thead><tbody className="divide-y">{rows.map((market,index) => <tr key={market.id} className={`hover:bg-slate-50 ${market.deleted_at ? 'opacity-60' : ''}`}><td className="table-cell text-slate-500">{(filters.page - 1) * filters.pageSize + index + 1}</td><td className="table-cell font-mono text-xs font-semibold text-blue-700">{market.market_code}</td><td className="table-cell"><p className="font-semibold">{market.name_kh}</p><p className="text-xs text-slate-500">{market.name_en || '—'}</p></td><td className="table-cell">{market.province?.name_kh}</td><td className="table-cell">{market.district?.name_kh}</td><td className="table-cell">{market.market_type?.name_kh}</td><td className="table-cell"><Badge className={MARKET_STATUS_COLORS[market.status]}>{market.deleted_at ? 'បានលុប' : statusLabel(market.status)}</Badge></td><td className="table-cell">{market.manager_name || '—'}</td><td className="table-cell">{market.phone || '—'}</td><td className="table-cell">{formatDate(market.created_at, 'dd MMM yyyy')}</td><td className="table-cell"><div className="flex justify-end gap-1"><Link to={`/markets/${market.id}`} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="មើល"><Eye size={17}/></Link>{!market.deleted_at && hasPermission('markets.update') && <Link to={`/markets/${market.id}/edit`} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" title="កែប្រែ"><Pencil size={17}/></Link>}{!market.deleted_at && hasPermission('markets.delete') && <button className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="លុប" onClick={() => setDeleting(market)}><Trash2 size={17}/></button>}{market.deleted_at && hasPermission('markets.restore') && <button className="rounded-lg p-2 text-green-600 hover:bg-green-50" title="Restore" onClick={() => restore(market)}><RotateCcw size={17}/></button>}</div></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t px-4 py-3 text-sm"><span>ទំព័រ {filters.page} នៃ {pages} · សរុប {count}</span><div className="flex gap-2"><button className="btn-secondary px-3" disabled={filters.page <= 1} onClick={() => setFilters(current => ({ ...current, page: current.page - 1 }))}><ChevronLeft size={17}/></button><button className="btn-secondary px-3" disabled={filters.page >= pages} onClick={() => setFilters(current => ({ ...current, page: current.page + 1 }))}><ChevronRight size={17}/></button></div></div></>}</div>
    <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} title="លុបផ្សារ" message={`តើអ្នកពិតជាចង់លុប ${deleting?.name_kh || ''} មែនទេ? អ្នកអាច Restore វានៅពេលក្រោយ។`}/>
    <MarketImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={load}/>
  </div>
}
