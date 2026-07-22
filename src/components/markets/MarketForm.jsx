import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, MapPin, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { marketLookupService } from '../../services/marketLookupService'
import { marketService, validateMarket } from '../../services/marketService'
import { MARKET_STATUSES, MARKET_TABS } from '../../utils/marketConstants'
import GoogleMapPicker from './GoogleMapPicker'

const emptyMarket = {
  name_kh: '', name_en: '', market_type_id: '', status: 'active', opening_date: '', image: '',
  province_id: '', district_id: '', commune_id: '', village_id: '', street: '', full_address: '',
  latitude: '', longitude: '', manager_name: '', phone: '', email: '', opening_time: '', closing_time: '',
  total_stalls: 0, occupied_stalls: 0, trader_count: 0, market_size: '', description: '',
}

export default function MarketForm({ market, onSaved, onCancel }) {
  const [form, setForm] = useState(emptyMarket)
  const [tab, setTab] = useState(0)
  const [types, setTypes] = useState([])
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [communes, setCommunes] = useState([])
  const [villages, setVillages] = useState([])
  const [errors, setErrors] = useState({})
  const [imageFile, setImageFile] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const load = async () => {
      const initial = market ? { ...emptyMarket, ...market, village_id: market.village_id || '', opening_date: market.opening_date || '', opening_time: market.opening_time || '', closing_time: market.closing_time || '' } : emptyMarket
      setForm(initial)
      const [typeResult, provinceResult, districtResult, communeResult, villageResult] = await Promise.all([
        marketLookupService.marketTypes(), marketLookupService.provinces(),
        initial.province_id ? marketLookupService.districts(initial.province_id) : Promise.resolve({ data: [] }),
        initial.district_id ? marketLookupService.communes(initial.district_id) : Promise.resolve({ data: [] }),
        initial.commune_id ? marketLookupService.villages(initial.commune_id) : Promise.resolve({ data: [] }),
      ])
      setTypes(typeResult.data || []); setProvinces(provinceResult.data || [])
      setDistricts(districtResult.data || []); setCommunes(communeResult.data || []); setVillages(villageResult.data || [])
    }
    load()
  }, [market])

  const preview = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : marketService.imageUrl(form.image), [imageFile, form.image])
  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const error = name => errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]}</p>

  const selectProvince = async event => {
    const provinceId = event.target.value
    setForm(current => ({ ...current, province_id: provinceId, district_id: '', commune_id: '', village_id: '' }))
    setCommunes([]); setVillages([])
    const { data } = provinceId ? await marketLookupService.districts(provinceId) : { data: [] }
    setDistricts(data || [])
  }
  const selectDistrict = async event => {
    const districtId = event.target.value
    setForm(current => ({ ...current, district_id: districtId, commune_id: '', village_id: '' }))
    setVillages([])
    const { data } = districtId ? await marketLookupService.communes(districtId) : { data: [] }
    setCommunes(data || [])
  }
  const selectCommune = async event => {
    const communeId = event.target.value
    setForm(current => ({ ...current, commune_id: communeId, village_id: '' }))
    const { data } = communeId ? await marketLookupService.villages(communeId) : { data: [] }
    setVillages(data || [])
  }
  const useCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error('Browser មិនគាំទ្រ Location')
    navigator.geolocation.getCurrentPosition(
      position => setForm(current => ({ ...current, latitude: position.coords.latitude.toFixed(7), longitude: position.coords.longitude.toFixed(7) })),
      () => toast.error('មិនអាចទាញយកទីតាំងបាន'),
    )
  }

  const submit = async event => {
    event.preventDefault()
    const validationErrors = validateMarket(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length) {
      const tabByField = { name_kh: 0, market_type_id: 0, status: 0, province_id: 1, district_id: 1, commune_id: 1, latitude: 2, longitude: 2, phone: 3, email: 3, closing_time: 3, occupied_stalls: 4 }
      setTab(tabByField[Object.keys(validationErrors)[0]] || 0)
      return toast.error('សូមពិនិត្យព័ត៌មានដែលបានបញ្ចូល')
    }
    setBusy(true)
    let payload = { ...form }
    if (imageFile) {
      const upload = await marketService.uploadImage(imageFile, market?.id)
      if (upload.error) { setBusy(false); return toast.error(upload.error.message) }
      payload = { ...payload, image: upload.data.path }
    }
    const result = market ? await marketService.update(market.id, payload) : await marketService.create(payload)
    setBusy(false)
    if (result.error) return toast.error(result.error.message)
    toast.success(market ? 'បានកែប្រែព័ត៌មានផ្សារ' : 'បានបង្កើតផ្សារថ្មី')
    onSaved(result.data)
  }

  const options = rows => rows.map(row => <option key={row.id} value={row.id}>{row.name_kh}{row.name_en ? ` (${row.name_en})` : ''}</option>)
  return <form onSubmit={submit} className="space-y-5">
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">{MARKET_TABS.map((label, index) => <button key={label} type="button" onClick={() => setTab(index)} className={`min-w-max flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === index ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{index + 1}. {label}</button>)}</div>

    {tab === 0 && <div className="grid gap-4 md:grid-cols-2">
      <div><label className="label">លេខកូដផ្សារ</label><input className="field bg-slate-50" readOnly value={market?.market_code || 'បង្កើតដោយស្វ័យប្រវត្តិ'}/></div>
      <div><label className="label">ឈ្មោះផ្សារជាភាសាខ្មែរ *</label><input className="field" name="name_kh" value={form.name_kh} onChange={update}/>{error('name_kh')}</div>
      <div><label className="label">ឈ្មោះផ្សារជាភាសាអង់គ្លេស</label><input className="field" name="name_en" value={form.name_en || ''} onChange={update}/></div>
      <div><label className="label">ប្រភេទផ្សារ *</label><select className="field" name="market_type_id" value={form.market_type_id} onChange={update}><option value="">ជ្រើសរើស</option>{options(types)}</select>{error('market_type_id')}</div>
      <div><label className="label">ស្ថានភាព *</label><select className="field" disabled={Boolean(market)} name="status" value={form.status} onChange={update}>{MARKET_STATUSES.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>{market && <p className="mt-1 text-xs text-slate-500">ប្ដូរស្ថានភាពពីទំព័រព័ត៌មានលម្អិត ដើម្បីរក្សាទុកប្រវត្តិ។</p>}</div>
      <div><label className="label">ថ្ងៃបើកដំណើរការ</label><input type="date" className="field" name="opening_date" value={form.opening_date || ''} onChange={update}/></div>
      <div className="md:col-span-2"><label className="label">រូបភាពផ្សារ</label><div className="flex flex-wrap items-center gap-4">{preview ? <div className="relative"><img src={preview} alt="Market preview" className="h-32 w-48 rounded-xl object-cover"/><button type="button" onClick={() => { setImageFile(null); setForm(current => ({ ...current, image: '' })) }} className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow"><X size={16}/></button></div> : <div className="grid h-32 w-48 place-items-center rounded-xl border-2 border-dashed text-slate-400"><ImagePlus/></div>}<label className="btn-secondary cursor-pointer"><ImagePlus size={17}/>ជ្រើសរូបភាព<input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={event => setImageFile(event.target.files?.[0] || null)}/></label></div></div>
    </div>}

    {tab === 1 && <div className="grid gap-4 md:grid-cols-2">
      <div><label className="label">រាជធានី/ខេត្ត *</label><select className="field" value={form.province_id} onChange={selectProvince}><option value="">ជ្រើសរើស</option>{options(provinces)}</select>{error('province_id')}</div>
      <div><label className="label">ក្រុង/ស្រុក/ខណ្ឌ *</label><select className="field" value={form.district_id} onChange={selectDistrict} disabled={!form.province_id}><option value="">ជ្រើសរើស</option>{options(districts)}</select>{error('district_id')}</div>
      <div><label className="label">ឃុំ/សង្កាត់ *</label><select className="field" value={form.commune_id} onChange={selectCommune} disabled={!form.district_id}><option value="">ជ្រើសរើស</option>{options(communes)}</select>{error('commune_id')}</div>
      <div><label className="label">ភូមិ</label><select className="field" name="village_id" value={form.village_id || ''} onChange={update} disabled={!form.commune_id}><option value="">មិនកំណត់</option>{options(villages)}</select></div>
      <div><label className="label">ផ្លូវ</label><input className="field" name="street" value={form.street || ''} onChange={update}/></div>
      <div><label className="label">អាសយដ្ឋានពេញ</label><input className="field" name="full_address" value={form.full_address || ''} onChange={update}/></div>
    </div>}

    {tab === 2 && <div className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><div><label className="label">Latitude *</label><input type="number" step="0.0000001" className="field" name="latitude" value={form.latitude} onChange={update}/>{error('latitude')}</div><div><label className="label">Longitude *</label><input type="number" step="0.0000001" className="field" name="longitude" value={form.longitude} onChange={update}/>{error('longitude')}</div></div><div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary" onClick={useCurrentLocation}><MapPin size={17}/>ប្រើទីតាំងបច្ចុប្បន្ន</button>{form.latitude && form.longitude && <a className="btn-secondary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}>បើកក្នុង Google Maps</a>}</div><GoogleMapPicker latitude={form.latitude} longitude={form.longitude} onChange={(latitude, longitude) => setForm(current => ({ ...current, latitude: latitude.toFixed(7), longitude: longitude.toFixed(7) }))}/></div>}

    {tab === 3 && <div className="grid gap-4 md:grid-cols-2"><div><label className="label">ឈ្មោះអ្នកគ្រប់គ្រង</label><input className="field" name="manager_name" value={form.manager_name || ''} onChange={update}/></div><div><label className="label">លេខទូរស័ព្ទ</label><input className="field" name="phone" value={form.phone || ''} onChange={update}/>{error('phone')}</div><div><label className="label">Email</label><input type="email" className="field" name="email" value={form.email || ''} onChange={update}/>{error('email')}</div><div/><div><label className="label">ម៉ោងបើក</label><input type="time" className="field" name="opening_time" value={form.opening_time || ''} onChange={update}/></div><div><label className="label">ម៉ោងបិទ</label><input type="time" className="field" name="closing_time" value={form.closing_time || ''} onChange={update}/>{error('closing_time')}</div></div>}

    {tab === 4 && <div className="grid gap-4 md:grid-cols-2"><div><label className="label">ចំនួនតូបសរុប</label><input type="number" min="0" className="field" name="total_stalls" value={form.total_stalls} onChange={update}/></div><div><label className="label">តូបដែលបានប្រើ</label><input type="number" min="0" className="field" name="occupied_stalls" value={form.occupied_stalls} onChange={update}/>{error('occupied_stalls')}</div><div><label className="label">តូបទំនេរ</label><input className="field bg-slate-50" readOnly value={Math.max(Number(form.total_stalls || 0) - Number(form.occupied_stalls || 0), 0)}/></div><div><label className="label">ចំនួនអាជីវករ</label><input type="number" min="0" className="field" name="trader_count" value={form.trader_count} onChange={update}/></div><div><label className="label">ទំហំផ្សារ (m²)</label><input type="number" min="0" step="0.01" className="field" name="market_size" value={form.market_size || ''} onChange={update}/></div><div className="md:col-span-2"><label className="label">ពិពណ៌នា</label><textarea className="field min-h-28" name="description" value={form.description || ''} onChange={update}/></div></div>}

    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div><button type="button" className="btn-secondary" disabled={tab === 0} onClick={() => setTab(current => current - 1)}>ថយក្រោយ</button>{tab < MARKET_TABS.length - 1 && <button type="button" className="btn-secondary ml-2" onClick={() => setTab(current => current + 1)}>បន្ទាប់</button>}</div><div className="flex gap-2"><button type="button" className="btn-secondary" onClick={onCancel}>បោះបង់</button><button className="btn-primary" disabled={busy}><Save size={17}/>{busy ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}</button></div></div>
  </form>
}
