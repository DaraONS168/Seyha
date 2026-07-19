import { LoaderCircle } from 'lucide-react'
export default function LoadingState({ label = 'កំពុងដំណើរការ...' }) { return <div className="flex min-h-48 items-center justify-center gap-3 text-slate-500"><LoaderCircle className="animate-spin" size={22}/>{label}</div> }
