import { Bell, BellRing, CheckCheck, ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useNotifications } from '../hooks/useNotifications'
import { formatDate } from '../utils/formatters'
import EmptyState from '../components/common/EmptyState'
import LoadingState from '../components/common/LoadingState'

const permissionLabels = {
  granted:['បានអនុញ្ញាត','bg-green-100 text-green-700'],
  denied:['បានបដិសេធ','bg-red-100 text-red-700'],
  default:['មិនទាន់អនុញ្ញាត','bg-orange-100 text-orange-700'],
  unsupported:['Browser មិនគាំទ្រ','bg-slate-100 text-slate-600'],
}

export default function NotificationsPage() {
  const { items, unread, loading, permission, load, sendTestNotification, markRead, markAllRead } = useNotifications()
  const test = async () => {
    const success = await sendTestNotification()
    if (success) toast.success('បានផ្ញើ Test Notification')
    else toast.error(permission === 'denied' ? 'Notification ត្រូវបាន Block ក្នុង Browser Settings' : 'មិនអាចបើក Browser Notification បាន')
  }
  const [permissionLabel, permissionTone] = permissionLabels[permission] || permissionLabels.default
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">ការជូនដំណឹង</h1><p className="mt-1 text-sm text-slate-500">មាន {unread} មិនទាន់អាន · ពិនិត្យដោយស្វ័យប្រវត្តិរៀងរាល់ 60 វិនាទី</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={load} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} size={17}/>ពិនិត្យឥឡូវ</button><button className="btn-primary" onClick={test}><BellRing size={17}/>សាកល្បង Notification</button></div></div>
    <div className="card flex flex-wrap items-center gap-3 p-4"><div className={`rounded-xl p-3 ${permission === 'granted' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>{permission === 'denied' ? <ShieldAlert size={20}/> : <Bell size={20}/>}</div><div className="flex-1"><p className="font-semibold">Browser Notification Permission</p><p className="text-sm text-slate-500">Reminder នឹងផ្ញើនៅពេល Follow Up ដល់ថ្ងៃ/ម៉ោង ឬហួសពេល។</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${permissionTone}`}>{permissionLabel}</span>{unread > 0 && <button className="btn-secondary py-2" onClick={markAllRead}><CheckCheck size={16}/>អានទាំងអស់</button>}</div>
    <div className="card overflow-hidden">{loading && !items.length ? <LoadingState/> : items.length === 0 ? <EmptyState title="មិនមានការជូនដំណឹង" description="បច្ចុប្បន្នមិនមាន Follow Up ដែលដល់ពេល។ អ្នកអាចចុច សាកល្បង Notification ដើម្បីពិនិត្យ Browser។"/> : <div className="divide-y">{items.map(item => <div key={item.id} className={`flex gap-3 p-4 ${!item.is_read ? 'bg-blue-50/60' : ''}`}><div className={`mt-1 grid size-9 shrink-0 place-items-center rounded-full ${item.is_read ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600'}`}><Bell size={17}/></div><div className="flex-1"><p className="font-semibold">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.message}</p>{item.recipient?.full_name && <p className="mt-1 text-xs text-blue-600">សម្រាប់៖ {item.recipient.full_name}</p>}<p className="mt-2 text-xs text-slate-400">{formatDate(item.created_at)}</p></div><div className="flex items-start gap-1">{item.customer_id && <Link to={`/customers/${item.customer_id}`} className="rounded-lg p-2 hover:bg-white"><ExternalLink size={17}/></Link>}{!item.is_read && <button title="សម្គាល់ថាបានអាន" onClick={() => markRead(item.id)} className="rounded-lg p-2 text-blue-600 hover:bg-white"><CheckCheck size={17}/></button>}</div></div>)}</div>}</div>
  </div>
}
