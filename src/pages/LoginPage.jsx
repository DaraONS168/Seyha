import { useEffect, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, PhoneCall, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured } from '../services/supabase'

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { signIn, session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { if (session) navigate('/', { replace: true }) }, [session, navigate])

  const submit = async event => {
    event.preventDefault()
    setError('')
    setBusy(true)
    if (!isSupabaseConfigured) {
      setError('សូមកំណត់ VITE_SUPABASE_URL និង VITE_SUPABASE_ANON_KEY ក្នុង .env')
      setBusy(false)
      return
    }
    const { error: authError } = await signIn(form.username, form.password)
    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Username ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ'
        : authError.message)
    } else navigate('/', { replace: true })
    setBusy(false)
  }

  return <div className="grid min-h-screen bg-white lg:grid-cols-2">
    <section className="hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-white/15"><PhoneCall/></div><div><p className="text-xl font-bold">Customer Follow Up</p><p className="text-sm text-blue-100">Management System</p></div></div>
      <div><h1 className="max-w-xl text-4xl font-bold leading-relaxed">គ្រប់គ្រងអតិថិជន និង Follow Up កាន់តែមានប្រសិទ្ធភាព</h1><p className="mt-4 max-w-lg text-blue-100">កត់ត្រាការហៅ រៀបចំកាលវិភាគ និងតាមដានលទ្ធផលក្រុម Sales ក្នុងកន្លែងតែមួយ។</p></div>
      <p className="text-sm text-blue-100">© 2026 Customer CRM</p>
    </section>
    <section className="flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 lg:hidden"><div className="mb-3 grid size-12 place-items-center rounded-2xl bg-blue-600 text-white"><PhoneCall/></div><h1 className="text-xl font-bold">Customer Follow Up</h1></div>
        <h2 className="text-3xl font-bold text-slate-900">ចូលប្រើប្រាស់</h2>
        <p className="mt-2 text-slate-500">បញ្ចូល Username និងពាក្យសម្ងាត់ដើម្បីបន្ត</p>
        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={submit} className="mt-7 space-y-5">
          <div><label className="label">Username</label><div className="relative"><UserRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" required minLength="3" autoCapitalize="none" autoComplete="username" className="field pl-10" placeholder="ឧ. seyha01" value={form.username} onChange={event => setForm({ ...form, username: event.target.value })}/></div></div>
          <div><label className="label">ពាក្យសម្ងាត់</label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type={show ? 'text' : 'password'} required minLength="8" autoComplete="current-password" className="field px-10" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })}/><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={show ? 'លាក់ពាក្យសម្ងាត់' : 'បង្ហាញពាក្យសម្ងាត់'}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div>
          <button disabled={busy} className="btn-primary w-full py-3">{busy ? 'កំពុងចូល...' : 'ចូលប្រើប្រាស់'}</button>
        </form>
      </div>
    </section>
  </div>
}
