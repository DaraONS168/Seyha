import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, Clock3, Edit3, History, Mail, MapPin, RefreshCw, Phone, Store, UserRound } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import Badge from '../components/common/Badge'
import EmptyState from '../components/common/EmptyState'
import LoadingState from '../components/common/LoadingState'
import MarketStatusDialog from '../components/markets/MarketStatusDialog'
import StallManager from '../components/markets/StallManager'
import { useAuth } from '../contexts/AuthContext'
import { marketService } from '../services/marketService'
import { formatDate } from '../utils/formatters'
import { MARKET_STATUSES, MARKET_STATUS_COLORS } from '../utils/marketConstants'

const statusLabel = value => MARKET_STATUSES.find(([key]) => key === value)?.[1] || value
const auditLabels = { created: 'បានបង្កើតផ្សារ', updated: 'បានកែប្រែព័ត៌មាន', deleted: 'បានលុបផ្សារ', restored: 'បាន Restore ផ្សារ' }

export default function MarketDetailPage() {
  const { id } = useParams()
  const { hasPermission } = useAuth()
  const [market, setMarket] = useState(null)
  const [logs, setLogs] = useState([])
  const [statusHistory, setStatusHistory] = useState([])
  const [statusOpen, setStatusOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    const [marketResult, logResult, statusResult] = await Promise.all([marketService.get(id), hasPermission('markets.view_audit') ? marketService.auditLogs(id) : Promise.resolve({ data: [] }), marketService.statusHistory(id)])
    if (marketResult.error) toast.error(marketResult.error.message)
    setMarket(marketResult.data); setLogs(logResult.data || []); setStatusHistory(statusResult.data || []); setLoading(false)
  }, [id, hasPermission])
  useEffect(() => { load() }, [load])
  if (loading) return <LoadingState/>
  if (!market) return <EmptyState title="រកមិនឃើញផ្សារ"/>
  const imageUrl = marketService.imageUrl(market.image)
  const availableStalls = Math.max(market.total_stalls - market.occupied_stalls, 0)
  const occupancy = market.total_stalls ? Math.round((market.occupied_stalls / market.total_stalls) * 100) : 0
  const address = [market.street, market.village?.name_kh, market.commune?.name_kh, market.district?.name_kh, market.province?.name_kh].filter(Boolean).join(', ')
  const info = [
    ['ប្រភេទផ្សារ', market.market_type?.name_kh, Store], ['ថ្ងៃបើក', formatDate(market.opening_date, 'dd MMM yyyy'), CalendarDays],
    ['អ្នកគ្រប់គ្រង', market.manager_name, UserRound], ['ទូរស័ព្ទ', market.phone, Phone], ['Email', market.email, Mail],
    ['ម៉ោងដំណើរការ', market.opening_time && market.closing_time ? `${market.opening_time.slice(0,5)} - ${market.closing_time.slice(0,5)}` : null, Clock3],
  ]
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Link to="/markets" className="rounded-xl border bg-white p-2.5 hover:bg-slate-50"><ArrowLeft size={20}/></Link><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{market.name_kh}</h1><Badge className={MARKET_STATUS_COLORS[market.status]}>{statusLabel(market.status)}</Badge></div><p className="mt-1 font-mono text-sm text-blue-700">{market.market_code}</p></div></div><div className="flex gap-2">{hasPermission('markets.update') && <><button className="btn-secondary" onClick={() => setStatusOpen(true)}><RefreshCw size={17}/>ប្ដូរស្ថានភាព</button><Link to={`/markets/${market.id}/edit`} className="btn-primary"><Edit3 size={17}/>កែប្រែ</Link></>}</div></div>
    <div className="grid gap-5 xl:grid-cols-3"><div className="space-y-5 xl:col-span-2">
      <section className="card overflow-hidden">{imageUrl ? <img src={imageUrl} alt={market.name_kh} className="h-72 w-full object-cover"/> : <div className="grid h-52 place-items-center bg-slate-100 text-slate-400"><Store size={48}/></div>}<div className="p-5"><h2 className="mb-4 font-bold">ព័ត៌មានទូទៅ</h2><div className="grid gap-3 sm:grid-cols-2">{info.map(([label,value,Icon]) => <div key={label} className="flex gap-3 rounded-xl bg-slate-50 p-3"><Icon size={18} className="mt-0.5 text-slate-400"/><div><p className="text-xs text-slate-500">{label}</p><p className="font-medium">{value || '—'}</p></div></div>)}</div>{market.description && <div className="mt-4"><p className="text-sm text-slate-500">ពិពណ៌នា</p><p className="mt-1 whitespace-pre-line">{market.description}</p></div>}</div></section>
      <section className="card p-5"><div className="mb-4 flex items-center gap-2"><MapPin size={19} className="text-blue-600"/><h2 className="font-bold">ទីតាំង និងអាសយដ្ឋាន</h2></div><p className="mb-4 text-sm">{market.full_address || address || '—'}</p><iframe title="Market location" className="h-80 w-full rounded-xl border" loading="lazy" src={`https://maps.google.com/maps?q=${market.latitude},${market.longitude}&z=15&output=embed`}/><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"><span>{market.latitude}, {market.longitude}</span><a href={market.google_map_url} target="_blank" rel="noreferrer" className="font-semibold text-blue-600">បើកក្នុង Google Maps</a></div></section>
    </div><aside className="space-y-5">
      <section className="card p-5"><h2 className="mb-4 font-bold">ស្ថិតិតូប</h2><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-blue-50 p-3"><p className="text-xl font-bold text-blue-700">{market.total_stalls}</p><p className="text-xs text-slate-500">សរុប</p></div><div className="rounded-xl bg-green-50 p-3"><p className="text-xl font-bold text-green-700">{market.occupied_stalls}</p><p className="text-xs text-slate-500">បានប្រើ</p></div><div className="rounded-xl bg-slate-100 p-3"><p className="text-xl font-bold">{availableStalls}</p><p className="text-xs text-slate-500">ទំនេរ</p></div></div><div className="mt-4"><div className="mb-1 flex justify-between text-xs"><span>អត្រាប្រើប្រាស់</span><b>{occupancy}%</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${occupancy}%` }}/></div></div><p className="mt-4 text-sm text-slate-500">អាជីវករ <b className="float-right text-slate-800">{market.trader_count}</b></p><p className="mt-2 text-sm text-slate-500">ទំហំផ្សារ <b className="float-right text-slate-800">{market.market_size ? `${market.market_size} m²` : '—'}</b></p></section>
      <section className="card p-5"><div className="mb-4 flex items-center gap-2"><RefreshCw size={19} className="text-blue-600"/><h2 className="font-bold">ប្រវត្តិស្ថានភាព</h2></div>{statusHistory.length === 0 ? <p className="text-sm text-slate-500">មិនទាន់មានការផ្លាស់ប្ដូរ</p> : <div className="space-y-4">{statusHistory.map(item => <div key={item.id} className="border-l-2 border-blue-200 pl-3"><p className="text-sm font-medium">{statusLabel(item.old_status)} → {statusLabel(item.new_status)}</p><p className="mt-1 text-xs text-slate-500">{item.reason || 'មិនមានមូលហេតុ'}</p><p className="mt-1 text-xs text-slate-400">{item.changer?.full_name || 'ប្រព័ន្ធ'} · {formatDate(item.changed_at)}</p></div>)}</div>}</section>
      {hasPermission('markets.view_audit') && <section className="card p-5"><div className="mb-4 flex items-center gap-2"><History size={19} className="text-blue-600"/><h2 className="font-bold">ប្រវត្តិសកម្មភាព</h2></div>{logs.length === 0 ? <p className="text-sm text-slate-500">មិនទាន់មានសកម្មភាព</p> : <div className="space-y-4">{logs.slice(0,20).map(log => <div key={log.id} className="border-l-2 border-blue-200 pl-3"><p className="text-sm font-medium">{auditLabels[log.action] || log.action}</p><p className="mt-1 text-xs text-slate-400">{log.actor?.full_name || 'ប្រព័ន្ធ'} · {formatDate(log.created_at)}</p></div>)}</div>}</section>}
      <section className="card p-5 text-xs text-slate-500"><p>បង្កើតដោយ <b>{market.creator?.full_name || '—'}</b></p><p className="mt-2">ថ្ងៃបង្កើត {formatDate(market.created_at)}</p><p className="mt-2">កែចុងក្រោយ {formatDate(market.updated_at)}</p></section>
    </aside></div>
    <div className="xl:col-span-3"><StallManager marketId={market.id} canManage={hasPermission('markets.update')}/></div>
    <MarketStatusDialog market={market} open={statusOpen} onClose={() => setStatusOpen(false)} onSaved={() => { setStatusOpen(false); load() }}/>
  </div>
}
