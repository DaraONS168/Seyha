import { useCallback, useEffect, useState } from 'react'
import { PhoneCall, Target, TrendingUp, Users } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../services/supabase'
import LoadingState from '../components/common/LoadingState'
import EmptyState from '../components/common/EmptyState'

export default function SalesTeamPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select(
      'id,full_name,username,email,phone,is_active,customers:customers!customers_assigned_to_fkey(id,status),calls:call_histories!call_histories_called_by_fkey(id),follow_ups:follow_ups!follow_ups_assigned_to_fkey(id,status)',
    ).eq('role', 'sales').order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold">ក្រុម Sales</h1><p className="mt-1 text-sm text-slate-500">តាមដានសមិទ្ធផលរបស់ក្រុមលក់។ ការបង្កើតគណនីថ្មីធ្វើនៅទំព័រ អ្នកប្រើប្រាស់។</p></div>
    {loading ? <LoadingState/> : rows.length === 0 ? <div className="card"><EmptyState title="មិនមាន Sales User" description="Admin អាចបង្កើតគណនីនៅក្នុងទំព័រ អ្នកប្រើប្រាស់។"/></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map(sales => {
        const total = sales.customers?.length || 0
        const converted = sales.customers?.filter(customer => customer.status === 'converted').length || 0
        const calls = sales.calls?.length || 0
        const followUps = sales.follow_ups?.length || 0
        const rate = total ? Math.round(converted / total * 100) : 0
        return <div className="card p-5" key={sales.id}>
          <div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">{sales.full_name?.[0]?.toUpperCase()}</div><div className="min-w-0"><h2 className="truncate font-bold">{sales.full_name}</h2><p className="truncate text-sm text-slate-500">@{sales.username || sales.email?.split('@')[0]}</p><p className="text-xs text-slate-400">{sales.phone || 'មិនមានលេខទូរស័ព្ទ'}</p></div><span className={`ml-auto size-2 shrink-0 rounded-full ${sales.is_active ? 'bg-green-500' : 'bg-slate-300'}`}/></div>
          <div className="mt-5 grid grid-cols-2 gap-3">{[[Users,total,'អតិថិជន'],[PhoneCall,calls,'ការហៅ'],[Target,followUps,'Follow Up'],[TrendingUp,`${rate}%`,'Conversion']].map(([Icon,value,label]) => <div className="rounded-xl bg-slate-50 p-3" key={label}><Icon size={17} className="text-blue-600"/><p className="mt-2 text-xl font-bold">{value}</p><p className="text-xs text-slate-500">{label}</p></div>)}</div>
          <p className="mt-4 text-sm text-green-600">Converted: <b>{converted}</b></p>
        </div>
      })}
    </div>}
  </div>
}
