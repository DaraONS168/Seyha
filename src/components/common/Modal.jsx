import { X } from 'lucide-react'
export default function Modal({ open, onClose, title, children, size = 'max-w-2xl' }) {
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className={`max-h-[92vh] w-full ${size} overflow-y-auto rounded-2xl bg-white shadow-2xl`}><div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4"><h2 className="text-lg font-bold">{title}</h2><button className="rounded-lg p-2 hover:bg-slate-100" onClick={onClose} aria-label="បិទ"><X size={20}/></button></div><div className="p-5">{children}</div></div></div>
}
