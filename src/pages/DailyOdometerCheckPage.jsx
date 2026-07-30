import { useEffect, useMemo, useState } from 'react'
import { Camera, Car, CheckCircle2, Clock, Download, Gauge, Plus, Save, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const storageKey = 'seyha_daily_odometer_checks'
const vehicleOptions = ['Prius ភ្នំពេញ 2BC-7312', 'Camry សៀមរាប 2A-4041', 'Toyota Hilux 2AB-1234']
const salesOptions = ['Van', 'Phanha', 'Pheak', 'Aleav']
const today = '2026-07-30'

const emptyForm = {
  check_date: today,
  sales: 'Van',
  vehicle: 'Prius ភ្នំពេញ 2BC-7312',
  work_start_time: '08:00',
  work_start_odometer: 25120,
  work_end_time: '17:30',
  work_end_odometer: 25246,
  night_check_time: '20:00',
  night_check_odometer: 25246,
  start_photo: '',
  end_photo: '',
  night_photo: '',
  notes: '',
}

const number = value => Number(value || 0)
const km = value => `${Number(value || 0).toLocaleString()} KM`

function loadRows() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRows(rows) {
  localStorage.setItem(storageKey, JSON.stringify(rows))
}

function PhotoButton({ label, value, onChange }) {
  return <div>
    <p className="mb-2 text-sm font-bold text-slate-700">{label}</p>
    <div className="flex flex-wrap items-center gap-2">
      <label className="grid size-12 cursor-pointer place-items-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200">
        <Camera size={20}/>
        <input className="hidden" type="file" accept="image/*" capture="environment" onChange={event => onChange(event.target.files?.[0]?.name || '')}/>
      </label>
      <button type="button" className="btn-secondary px-3 py-2" onClick={() => toast.info(value || 'មិនទាន់មានរូបភាព')}>មើល</button>
      <label className="btn-secondary cursor-pointer px-3 py-2">
        <Camera size={16}/>ថតរូប
        <input className="hidden" type="file" accept="image/*" capture="environment" onChange={event => onChange(event.target.files?.[0]?.name || '')}/>
      </label>
    </div>
    {value && <p className="mt-1 truncate text-xs text-green-600">{value}</p>}
  </div>
}

function OdometerLine({ label, time, odometer, onTimeChange, onOdometerChange }) {
  return <div className="grid gap-2 sm:grid-cols-[1fr_130px_170px] sm:items-center">
    <span className="text-sm font-bold text-slate-700">{label}</span>
    <div className="relative"><input className="field pr-9" type="time" value={time} onChange={event => onTimeChange(event.target.value)}/><Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/></div>
    <input className="field text-right font-semibold" type="number" min="0" value={odometer} onChange={event => onOdometerChange(Number(event.target.value))}/>
  </div>
}

export default function DailyOdometerCheckPage() {
  const [form, setForm] = useState(emptyForm)
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')

  useEffect(() => setRows(loadRows()), [])

  const totals = useMemo(() => {
    const workDistance = Math.max(number(form.work_end_odometer) - number(form.work_start_odometer), 0)
    const afterHoursDistance = Math.max(number(form.night_check_odometer) - number(form.work_end_odometer), 0)
    return { workDistance, afterHoursDistance, total: workDistance + afterHoursDistance }
  }, [form])

  const filteredRows = useMemo(() => rows.filter(row => {
    const text = `${row.check_date} ${row.sales} ${row.vehicle}`.toLowerCase()
    return !query || text.includes(query.toLowerCase())
  }), [query, rows])

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const save = event => {
    event.preventDefault()
    if (!form.sales || !form.vehicle) return toast.error('សូមជ្រើស Sales និងយានយន្ត')
    if (number(form.work_end_odometer) < number(form.work_start_odometer)) return toast.error('គីឡូបញ្ចប់ការងារត្រូវធំជាង ឬស្មើគីឡូចាប់ផ្តើម')
    if (number(form.night_check_odometer) < number(form.work_end_odometer)) return toast.error('គីឡូពេលយប់ត្រូវធំជាង ឬស្មើគីឡូបញ្ចប់ការងារ')
    const row = { ...form, id: `${form.check_date}-${form.sales}-${form.vehicle}`, work_distance_km: totals.workDistance, after_hours_distance_km: totals.afterHoursDistance, total_distance_km: totals.total, saved_at: new Date().toISOString() }
    const next = [row, ...rows.filter(item => item.id !== row.id)]
    setRows(next)
    saveRows(next)
    toast.success('បានរក្សាទុក Daily Odometer Check')
  }
  const remove = id => {
    const next = rows.filter(row => row.id !== id)
    setRows(next)
    saveRows(next)
    toast.success('បានលុបកំណត់ត្រា')
  }
  const exportCsv = () => {
    const headers = ['Date', 'Sales', 'Vehicle', 'Start Time', 'Start Odo', 'End Time', 'End Odo', 'Night Time', 'Night Odo', 'Work KM', 'After Hours KM']
    const csv = [headers, ...rows.map(row => [row.check_date, row.sales, row.vehicle, row.work_start_time, row.work_start_odometer, row.work_end_time, row.work_end_odometer, row.night_check_time, row.night_check_odometer, row.work_distance_km, row.after_hours_distance_km])].map(line => line.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `daily-odometer-checks-${today}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <div className="space-y-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-bold text-blue-600">Daily Operations</p>
        <h1 className="text-3xl font-extrabold text-slate-950">កីឡូម៉ែត្ររថយន្តប្រចាំថ្ងៃ</h1>
        <p className="mt-1 text-sm text-slate-500">បំពេញចាប់ផ្តើមការងារ, បញ្ចប់ការងារ និងពិនិត្យពេលយប់ ដើម្បីតាមដានការប្រើប្រាស់ក្រៅម៉ោង។</p>
      </div>
      <div className="flex gap-2"><button className="btn-secondary" onClick={exportCsv}><Download size={17}/>Export</button><button className="btn-primary" onClick={() => setForm(emptyForm)}><Plus size={17}/>ថ្ងៃថ្មី</button></div>
    </div>

    <form className="card p-5" onSubmit={save}>
      <div className="grid gap-4 lg:grid-cols-4">
        <label><span className="label">ថ្ងៃបំពេញ *</span><input className="field" type="date" value={form.check_date} onChange={event => update('check_date', event.target.value)}/></label>
        <label><span className="label">Sales *</span><select className="field" value={form.sales} onChange={event => update('sales', event.target.value)}>{salesOptions.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="lg:col-span-2"><span className="label">យានយន្ត *</span><select className="field" value={form.vehicle} onChange={event => update('vehicle', event.target.value)}>{vehicleOptions.map(item => <option key={item}>{item}</option>)}</select></label>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_190px]">
        <div className="space-y-4">
          <OdometerLine label="ចាប់ផ្តើមការងារ" time={form.work_start_time} odometer={form.work_start_odometer} onTimeChange={value => update('work_start_time', value)} onOdometerChange={value => update('work_start_odometer', value)}/>
          <OdometerLine label="បញ្ចប់ការងារ" time={form.work_end_time} odometer={form.work_end_odometer} onTimeChange={value => update('work_end_time', value)} onOdometerChange={value => update('work_end_odometer', value)}/>
          <OdometerLine label="ពិនិត្យពេលយប់" time={form.night_check_time} odometer={form.night_check_odometer} onTimeChange={value => update('night_check_time', value)} onOdometerChange={value => update('night_check_odometer', value)}/>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-blue-50 p-4 font-extrabold text-blue-900">ចម្ងាយការងារ: {km(totals.workDistance)}</div>
            <div className={`rounded-xl p-4 font-extrabold ${totals.afterHoursDistance > 0 ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>ក្រៅម៉ោង: {km(totals.afterHoursDistance)}</div>
          </div>
        </div>
        <div className="grid place-items-center">
          <div className={`grid size-40 place-items-center rounded-full border-[14px] ${totals.afterHoursDistance > 0 ? 'border-orange-500 border-l-slate-200' : 'border-green-500 border-l-slate-200'} text-center`}>
            <Car size={34}/>
            <b className="text-2xl">{totals.total}</b>
            <span className="text-xs">KM</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <PhotoButton label="រូបចាប់ផ្តើម" value={form.start_photo} onChange={value => update('start_photo', value)}/>
        <PhotoButton label="រូបបញ្ចប់ការងារ" value={form.end_photo} onChange={value => update('end_photo', value)}/>
        <PhotoButton label="រូបពិនិត្យពេលយប់" value={form.night_photo} onChange={value => update('night_photo', value)}/>
      </div>

      <label className="mt-5 block"><span className="label">កំណត់សម្គាល់</span><textarea className="field min-h-24" value={form.notes} onChange={event => update('notes', event.target.value)} placeholder="ឧ. ពេលយប់មានទៅញុំាអាហារ / បញ្ហាផ្លូវ / ចំណាំផ្សេងៗ"/></label>
      <div className="mt-5 flex justify-end border-t pt-4"><button className="btn-primary"><Save size={17}/>រក្សាទុកកីឡូម៉ែត្រ</button></div>
    </form>

    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
        <div><h2 className="font-extrabold">ប្រវត្តិបំពេញប្រចាំថ្ងៃ</h2><p className="text-xs text-slate-500">រក្សាទុកក្នុង browser សម្រាប់ prototype test មុនភ្ជាប់ Supabase។</p></div>
        <div className="relative w-full md:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input className="field pl-10" value={query} onChange={event => setQuery(event.target.value)} placeholder="ស្វែងរក Sales / យានយន្ត..."/></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>{['ថ្ងៃ','Sales','យានយន្ត','ចាប់ផ្តើម','បញ្ចប់','ពេលយប់','ចម្ងាយការងារ','ក្រៅម៉ោង','ស្ថានភាព',''].map(item => <th key={item} className="table-cell">{item}</th>)}</tr></thead>
          <tbody className="divide-y">
            {filteredRows.map(row => <tr key={row.id}>
              <td className="table-cell font-bold">{row.check_date}</td>
              <td className="table-cell">{row.sales}</td>
              <td className="table-cell">{row.vehicle}</td>
              <td className="table-cell">{row.work_start_time} · {row.work_start_odometer}</td>
              <td className="table-cell">{row.work_end_time} · {row.work_end_odometer}</td>
              <td className="table-cell">{row.night_check_time} · {row.night_check_odometer}</td>
              <td className="table-cell font-bold text-blue-700">{km(row.work_distance_km)}</td>
              <td className={`table-cell font-bold ${row.after_hours_distance_km > 0 ? 'text-orange-600' : 'text-green-600'}`}>{km(row.after_hours_distance_km)}</td>
              <td className="table-cell">{row.after_hours_distance_km > 0 ? <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">ត្រូវពិនិត្យ</span> : <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700"><CheckCircle2 size={13}/>ធម្មតា</span>}</td>
              <td className="table-cell text-right"><button className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => remove(row.id)}><Trash2 size={16}/></button></td>
            </tr>)}
            {!filteredRows.length && <tr><td colSpan="10" className="table-cell py-10 text-center text-slate-500"><Gauge className="mx-auto mb-2 text-slate-300"/>មិនទាន់មានកំណត់ត្រា</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>
}
