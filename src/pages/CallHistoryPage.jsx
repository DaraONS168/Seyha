import { useEffect, useState } from 'react'
import { Clock3, Phone } from 'lucide-react'
import { callService } from '../services/callService'
import { CALL_RESULTS, labelOf } from '../utils/constants'
import { formatDate } from '../utils/formatters'
import LoadingState from '../components/common/LoadingState'
import EmptyState from '../components/common/EmptyState'
import Badge from '../components/common/Badge'
import { toast } from 'sonner'

export default function CallHistoryPage(){const[rows,setRows]=useState([]),[loading,setLoading]=useState(true);useEffect(()=>{callService.list().then(({data,error})=>{if(error)toast.error(error.message);setRows(data||[]);setLoading(false)})},[]);return <div className="space-y-5"><div><h1 className="text-2xl font-bold">ប្រវត្តិការហៅ</h1><p className="mt-1 text-sm text-slate-500">កំណត់ត្រាការហៅទៅអតិថិជនទាំងអស់</p></div><div className="card overflow-hidden">{loading?<LoadingState/>:rows.length===0?<EmptyState title="មិនទាន់មានការហៅ"/>:<div className="overflow-x-auto"><table className="w-full min-w-[800px]"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="table-cell">អតិថិជន</th><th className="table-cell">អ្នកហៅ</th><th className="table-cell">លទ្ធផល</th><th className="table-cell">រយៈពេល</th><th className="table-cell">កំណត់ចំណាំ</th><th className="table-cell">ថ្ងៃ/ម៉ោង</th></tr></thead><tbody className="divide-y">{rows.map(c=><tr key={c.id}><td className="table-cell"><p className="font-semibold">{c.customer?.name}</p><a className="inline-flex items-center gap-1 text-xs text-blue-600" href={`tel:${c.customer?.phone}`}><Phone size={12}/>{c.customer?.phone}</a></td><td className="table-cell">{c.caller?.full_name}</td><td className="table-cell"><Badge className="bg-blue-50 text-blue-700">{labelOf(CALL_RESULTS,c.call_result)}</Badge></td><td className="table-cell"><span className="inline-flex items-center gap-1"><Clock3 size={14}/>{c.call_duration||0}s</span></td><td className="table-cell max-w-xs truncate">{c.notes||'—'}</td><td className="table-cell">{formatDate(c.called_at)}</td></tr>)}</tbody></table></div>}</div></div>}
