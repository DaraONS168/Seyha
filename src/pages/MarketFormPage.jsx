import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import MarketForm from '../components/markets/MarketForm'
import EmptyState from '../components/common/EmptyState'
import LoadingState from '../components/common/LoadingState'
import { marketService } from '../services/marketService'

export default function MarketFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [market, setMarket] = useState(null)
  const [loading, setLoading] = useState(Boolean(id))
  const load = useCallback(async () => { if (!id) return; const { data, error } = await marketService.get(id); if (error) toast.error(error.message); setMarket(data); setLoading(false) }, [id])
  useEffect(() => { load() }, [load])
  if (loading) return <LoadingState/>
  if (id && !market) return <EmptyState title="រកមិនឃើញផ្សារ"/>
  return <div className="space-y-5"><div className="flex items-center gap-3"><Link to={id ? `/markets/${id}` : '/markets'} className="rounded-xl border bg-white p-2.5 hover:bg-slate-50"><ArrowLeft size={20}/></Link><div><h1 className="text-2xl font-bold">{id ? 'កែប្រែព័ត៌មានផ្សារ' : 'បន្ថែមផ្សារថ្មី'}</h1><p className="mt-1 text-sm text-slate-500">បំពេញព័ត៌មានតាមផ្នែក ហើយចុចរក្សាទុក</p></div></div><div className="card p-5"><MarketForm market={market} onCancel={() => navigate(id ? `/markets/${id}` : '/markets')} onSaved={saved => navigate(`/markets/${saved.id}`)}/></div></div>
}
