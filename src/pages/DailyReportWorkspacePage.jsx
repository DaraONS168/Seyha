import { useEffect, useMemo, useState } from 'react'
import { Bell, BriefcaseBusiness, Camera, Car, Eye, FileText, Fuel, Gauge, MapPinned, Paperclip, Plus, Save, Send, ShoppingCart, Trash2, WalletCards, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { dailyReportService } from '../services/dailyReportService'
import Modal from '../components/common/Modal'

const invoicesSeed = [
  ['INV-00125', 'Customer A', 'ផ្សារកណ្តាល', 250, 250],
  ['INV-00126', 'Customer B', 'ផ្សារកំពង់ចាម', 400, 200],
  ['INV-00127', 'Customer C', 'ផ្សារថ្មី', 180, 180],
  ['INV-00128', 'Customer D', 'ផ្សារកំពូល', 360, 260],
  ['INV-00129', 'Customer E', 'ផ្សារបឹង', 220, 160],
  ['INV-00130', 'Customer F', 'ផ្សារកំពង់សៀម', 300, 250],
  ['INV-00131', 'Customer G', 'ផ្សារព្រៃឈរ', 280, 180],
  ['INV-00132', 'Customer H', 'ផ្សារជើងព្រៃ', 460, 370],
]
const expenseSeed = [
  ['សាំង', 'PTT Station', 23],
  ['អាហារ', 'ហាងបាយក្នុងផ្សារ', 12],
  ['ថតចម្លង', 'ផ្សារកំពង់ចាម', 2],
  ['ផ្លូវការ', 'ចំណតរថយន្ត', 3.4],
]
const emptyInvoice = { code: '', customer: '', province_id: '', district_id: '', market_id: '', market: '', amount: '', collected: '', returned: '', note: '' }
const emptyExpense = { type: '', province_id: '', district_id: '', market_id: '', vendor: '', amount: '', note: '' }

export default function DailyReportWorkspacePage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const editReportId = searchParams.get('report')
  const [lookups, setLookups] = useState({ plans: [], teams: [], vehicles: [], provinces: [], districts: [], markets: [], categories: [] })
  const [date, setDate] = useState('2026-07-22')
  const [sales, setSales] = useState('Van')
  const [team, setTeam] = useState('Team A')
  const [plan, setPlan] = useState('VP-2026-0024')
  const [province, setProvince] = useState('កំពង់ចាម')
  const [vehicle, setVehicle] = useState('Toyota Hilux 2AB-1234')
  const [invoices, setInvoices] = useState(invoicesSeed.map(([code, customer, market, amount, collected]) => ({ code, customer, market, amount, collected })))
  const [expenses, setExpenses] = useState(expenseSeed.map(([type, vendor, amount]) => ({ type, vendor, amount })))
  const [fuel, setFuel] = useState({ liters: 5.5, unitPrice: 4.2, station: 'PTT Station', invoice: 'PTT-00125', workStartTime: '08:00', workEndTime: '17:30', nightCheckTime: '20:00', start: 25120, end: 25246, night: 25246 })
  const [saving, setSaving] = useState(false)
  const [invoiceDialog, setInvoiceDialog] = useState(null)
  const [expenseDialog, setExpenseDialog] = useState(null)
  const [notes, setNotes] = useState({
    summary: '- បានចុះផ្សារ 6 កន្លែង\n- បានយក 12 Invoice\n- អតិថិជនចង់បាន Follow Up',
    problems: 'អតិថិជនខ្លះស្នើពន្យារទូទាត់។',
    next: 'ចំណាំបន្ថែម...',
  })

  useEffect(() => {
    Promise.all([dailyReportService.plans(), dailyReportService.teams(), dailyReportService.vehicles(), dailyReportService.provinces(), dailyReportService.districts(), dailyReportService.markets(), dailyReportService.categories()])
      .then(([plans, teams, vehicles, provinces, districts, markets, categories]) => {
        setLookups({ plans: plans.data || [], teams: teams.data || [], vehicles: vehicles.data || [], provinces: provinces.data || [], districts: districts.data || [], markets: markets.data || [], categories: categories.data || [] })
      })
  }, [])
  useEffect(() => {
    if (!editReportId) return
    dailyReportService.get(editReportId).then(({ data, error }) => {
      if (error) return toast.error(error.message)
      setDate(data.report_date || '')
      setSales(data.sales?.full_name || '')
      setTeam(data.team?.name || 'Team A')
      setPlan(data.visit_plan_id || '')
      setProvince(data.plan?.province || data.province?.name_kh || '')
      setVehicle(data.vehicle_id || '')
      setInvoices((data.invoices || []).map(row => ({
        code: row.invoice_number,
        customer: row.customer_name,
        province_id: row.market?.province_id || '',
        district_id: row.market?.district_id || '',
        market_id: row.market_id || '',
        market: row.market?.name_kh || row.market_name || '',
        amount: Number(row.invoice_amount || 0),
        collected: Number(row.collected_amount || 0),
        returned: Number(row.returned_amount || 0),
        note: row.notes || '',
      })))
      setExpenses((data.expenses || []).map(row => ({
        type: row.category?.name_kh || row.description || 'ផ្សេងៗ',
        province_id: row.market?.province_id || '',
        district_id: row.market?.district_id || '',
        market_id: row.market_id || '',
        vendor: row.market?.name_kh || row.vendor_name || '',
        amount: Number(row.amount || Number(row.quantity || 0) * Number(row.unit_price || 0)),
        note: row.notes || '',
      })))
      setFuel(current => ({
        ...current,
        liters: Number(data.fuel_liters || current.liters),
        unitPrice: Number(data.fuel_unit_price || current.unitPrice),
        station: data.fuel_station || current.station,
        invoice: data.fuel_invoice_number || current.invoice,
        start: Number(data.odometer_start || current.start),
        end: Number(data.odometer_end || current.end),
        night: Number(data.odometer_night || data.odometer_end || current.night),
        workStartTime: data.work_start_time?.slice(0, 5) || current.workStartTime,
        workEndTime: data.work_end_time?.slice(0, 5) || current.workEndTime,
        nightCheckTime: data.night_check_time?.slice(0, 5) || current.nightCheckTime,
      }))
      setNotes({
        summary: data.report_summary || '',
        problems: data.problems || '',
        next: data.next_plan || '',
      })
      toast.success(`បានបើកកែ ${data.report_code}`)
    })
  }, [editReportId])

  const filteredPlans = useMemo(() => lookups.plans.filter(item => !sales || item.assignee?.full_name === sales), [lookups.plans, sales])
  const selectedPlan = lookups.plans.find(item => item.id === plan)
  const selectedVehicle = lookups.vehicles.find(item => item.id === vehicle)
  const salesOptions = [{ value: '', label: 'Sales ទាំងអស់' }, ...[...new Set([...lookups.plans.map(item => item.assignee?.full_name).filter(Boolean), 'Van', 'Phanha', 'Pheak'])].map(name => ({ value: name, label: name }))]
  useEffect(() => {
    if (!filteredPlans.length) return
    if (filteredPlans.some(item => item.id === plan)) return
    const next = filteredPlans[0]
    setPlan(next.id)
    setProvince(next.province || province)
    setDate(next.start_date || date)
  }, [filteredPlans, plan, province, date])
  useEffect(() => {
    if (editReportId) return
    if (!selectedPlan?.id || !date) return
    dailyReportService.fuelForPlanDate({ visitPlanId: selectedPlan.id, salesUserId: selectedPlan.assigned_to, reportDate: date }).then(({ data, error }) => {
      if (error) return toast.error(error.message)
      if (!data?.length) return
      const start = Math.min(...data.map(item => Number(item.start_odometer) || 0))
      const end = Math.max(...data.map(item => Number(item.end_odometer) || 0))
      const liters = data.reduce((sum, item) => sum + Number(item.fuel_liters || 0), 0)
      const total = data.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
      const latest = data[0]
      setVehicle(current => latest.vehicle_id || current)
      setFuel(current => ({ ...current, start, end, night: Math.max(Number(current.night || 0), end), liters: Number(liters.toFixed(2)), unitPrice: liters ? Number((total / liters).toFixed(2)) : current.unitPrice, station: latest.fuel_station || current.station, invoice: latest.invoice_number || current.invoice }))
      toast.success(`បានទាញចំណាយសាំង ${data.length} កំណត់ត្រា`)
    })
  }, [date, editReportId, selectedPlan?.id, selectedPlan?.assigned_to])

  const totals = useMemo(() => {
    const salesAmount = invoices.reduce((sum, row) => sum + Number(row.amount), 0)
    const collected = invoices.reduce((sum, row) => sum + Number(row.collected), 0)
    const returned = invoices.reduce((sum, row) => sum + Number(row.returned || 0), 0)
    const credit = Math.max(salesAmount - collected - returned, 0)
    const otherExpense = expenses.reduce((sum, row) => sum + Number(row.amount), 0)
    const workDistance = Math.max(Number(fuel.end) - Number(fuel.start), 0)
    const afterHoursDistance = Math.max(Number(fuel.night) - Number(fuel.end), 0)
    const distance = workDistance
    const totalOdometerDistance = workDistance + afterHoursDistance
    const fuelTotal = Number(fuel.liters) * Number(fuel.unitPrice)
    return { salesAmount, collected, returned, credit, otherExpense, distance, workDistance, afterHoursDistance, totalOdometerDistance, fuelTotal, totalExpense: otherExpense + fuelTotal, efficiency: Number(fuel.liters) ? distance / Number(fuel.liters) : 0, costPerKm: distance ? fuelTotal / distance : 0 }
  }, [expenses, fuel, invoices])

  const nextInvoiceCode = () => {
    const next = invoices.reduce((max, row) => {
      const match = String(row.code || '').match(/(\d+)$/)
      return match ? Math.max(max, Number(match[1])) : max
    }, 0) + 1
    return `INV-${String(next || 1).padStart(5, '0')}`
  }
  const invoiceDistricts = invoiceDialog?.values.province_id ? lookups.districts.filter(item => String(item.province_id) === String(invoiceDialog.values.province_id)) : lookups.districts
  const invoiceMarkets = lookups.markets.filter(item => (!invoiceDialog?.values.province_id || String(item.province_id) === String(invoiceDialog.values.province_id)) && (!invoiceDialog?.values.district_id || String(item.district_id) === String(invoiceDialog.values.district_id)))
  const openInvoiceCreate = () => setInvoiceDialog({ mode: 'create', index: null, values: { ...emptyInvoice, code: nextInvoiceCode() } })
  const openInvoiceEdit = index => {
    const row = invoices[index]
    const marketRow = lookups.markets.find(item => item.id === row.market_id)
    setInvoiceDialog({ mode: 'edit', index, values: { ...emptyInvoice, ...row, province_id: row.province_id || marketRow?.province_id || '', district_id: row.district_id || marketRow?.district_id || '' } })
  }
  const selectInvoiceProvince = provinceId => setInvoiceDialog(current => ({ ...current, values: { ...current.values, province_id: provinceId, district_id: '', market_id: '', market: '' } }))
  const selectInvoiceDistrict = districtId => setInvoiceDialog(current => ({ ...current, values: { ...current.values, district_id: districtId, market_id: '', market: '' } }))
  const selectInvoiceMarket = marketId => {
    const marketRow = lookups.markets.find(item => item.id === marketId)
    setInvoiceDialog(current => ({ ...current, values: { ...current.values, market_id: marketId, market: marketRow?.name_kh || '', province_id: marketRow?.province_id || current.values.province_id, district_id: marketRow?.district_id || current.values.district_id } }))
  }
  const saveInvoice = event => {
    event.preventDefault()
    const marketRow = lookups.markets.find(item => item.id === invoiceDialog.values.market_id)
    const values = { ...invoiceDialog.values, province_id: marketRow?.province_id || invoiceDialog.values.province_id, district_id: marketRow?.district_id || invoiceDialog.values.district_id, market: marketRow?.name_kh || invoiceDialog.values.market, amount: Number(invoiceDialog.values.amount || 0), collected: Number(invoiceDialog.values.collected || 0), returned: Number(invoiceDialog.values.returned || 0) }
    if (!values.code.trim() || !values.customer.trim()) return toast.error('សូមបញ្ចូលលេខ Invoice និងអតិថិជន')
    if (values.collected + values.returned > values.amount) return toast.error('ប្រាក់ប្រមូល និងប្តូរឥវ៉ាន់វិញ មិនអាចធំជាងទឹកប្រាក់ Invoice')
    setInvoices(rows => invoiceDialog.mode === 'edit' ? change(rows, invoiceDialog.index, null, values) : [...rows, values])
    setInvoiceDialog(null)
  }
  const openExpenseCreate = () => setExpenseDialog({ mode: 'create', index: null, values: { ...emptyExpense, type: 'ផ្សេងៗ', vendor: province } })
  const openExpenseEdit = index => {
    const row = expenses[index]
    const marketRow = lookups.markets.find(item => item.id === row.market_id)
    setExpenseDialog({ mode: 'edit', index, values: { ...emptyExpense, ...row, province_id: row.province_id || marketRow?.province_id || '', district_id: row.district_id || marketRow?.district_id || '' } })
  }
  const expenseDistricts = expenseDialog?.values.province_id ? lookups.districts.filter(item => String(item.province_id) === String(expenseDialog.values.province_id)) : lookups.districts
  const expenseMarkets = lookups.markets.filter(item => (!expenseDialog?.values.province_id || String(item.province_id) === String(expenseDialog.values.province_id)) && (!expenseDialog?.values.district_id || String(item.district_id) === String(expenseDialog.values.district_id)))
  const selectExpenseProvince = provinceId => setExpenseDialog(current => ({ ...current, values: { ...current.values, province_id: provinceId, district_id: '', market_id: '', vendor: '' } }))
  const selectExpenseDistrict = districtId => setExpenseDialog(current => ({ ...current, values: { ...current.values, district_id: districtId, market_id: '', vendor: '' } }))
  const selectExpenseMarket = marketId => {
    const marketRow = lookups.markets.find(item => item.id === marketId)
    setExpenseDialog(current => ({ ...current, values: { ...current.values, market_id: marketId, vendor: marketRow?.name_kh || '', province_id: marketRow?.province_id || current.values.province_id, district_id: marketRow?.district_id || current.values.district_id } }))
  }
  const saveExpense = event => {
    event.preventDefault()
    const marketRow = lookups.markets.find(item => item.id === expenseDialog.values.market_id)
    const values = { ...expenseDialog.values, province_id: marketRow?.province_id || expenseDialog.values.province_id, district_id: marketRow?.district_id || expenseDialog.values.district_id, vendor: marketRow?.name_kh || expenseDialog.values.vendor, amount: Number(expenseDialog.values.amount || 0) }
    if (!values.type.trim() || !values.vendor.trim()) return toast.error('សូមបញ្ចូលប្រភេទចំណាយ និងទីតាំង/ហាង')
    setExpenses(rows => expenseDialog.mode === 'edit' ? change(rows, expenseDialog.index, null, values) : [...rows, values])
    setExpenseDialog(null)
  }
  const saveDraft = async () => {
    const planRow = selectedPlan || filteredPlans[0]
    if (!planRow) return toast.error('សូមជ្រើសផែនការចុះ')
    setSaving(true)
    const salesUserId = planRow.assigned_to || user?.id
    const payload = {
      report_date: date,
      visit_plan_id: planRow.id,
      sales_user_id: salesUserId,
      vehicle_id: selectedVehicle?.id || null,
      odometer_start: fuel.start,
      odometer_end: fuel.end,
      total_distance_km: totals.workDistance,
      fuel_liters: fuel.liters,
      fuel_unit_price: fuel.unitPrice,
      fuel_station: fuel.station,
      fuel_invoice_number: fuel.invoice,
      report_summary: notes.summary,
      problems: notes.problems,
      next_plan: notes.next,
    }
    const existing = editReportId ? { data: [{ id: editReportId }] } : await dailyReportService.findDraft({ salesUserId, visitPlanId: planRow.id, reportDate: date })
    if (existing.error) { setSaving(false); toast.error(existing.error.message); return null }
    const existingReport = existing.data?.[0]
    const report = existingReport ? await dailyReportService.update(existingReport.id, payload) : await dailyReportService.create(payload)
    if (report.error) { setSaving(false); toast.error(report.error.message); return null }
    const reportId = report.data.id
    const invoiceResult = await dailyReportService.replaceInvoices(reportId, invoices.map(row => ({ invoice_number: row.code, customer_name: row.customer, market_id: row.market_id || null, market_name: row.market, invoice_amount: row.amount, collected_amount: row.collected, returned_amount: row.returned || 0, status: row.amount <= Number(row.collected || 0) + Number(row.returned || 0) ? 'paid' : Number(row.collected || 0) > 0 || Number(row.returned || 0) > 0 ? 'partial' : 'open' })))
    const category = lookups.categories.find(item => !item.is_fuel)
    const expenseResult = category ? await dailyReportService.replaceExpenses(reportId, expenses.map(row => ({ expense_category_id: category.id, expense_date: date, description: row.type, market_id: row.market_id || null, vendor_name: row.vendor, quantity: 1, unit_price: row.amount }))) : { error: null }
    setSaving(false)
    if (invoiceResult.error || expenseResult.error) { toast.error(invoiceResult.error?.message || expenseResult.error?.message); return null }
    toast.success(existingReport ? 'បានកែប្រែ Workspace ជាព្រាង' : 'បានរក្សាទុក Workspace ជាព្រាង')
    return reportId
  }
  const submitToManager = async () => {
    if (saving) return
    const reportId = await saveDraft()
    if (!reportId) return
    setSaving(true)
    const result = await dailyReportService.submit(reportId)
    setSaving(false)
    if (result.error) return toast.error(result.error.message)
    toast.success('បានដាក់ស្នើទៅ Manager')
  }

  return <div className="space-y-4 text-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><button className="rounded-xl p-2 hover:bg-slate-100"><Bell size={21}/></button><div><h1 className="text-2xl font-bold">របាយការណ៍ប្រចាំថ្ងៃ</h1><p className="text-sm text-slate-500">បញ្ចូល Invoice, ចំណូល, ចំណាយ, សាំង និងចម្ងាយក្នុងមួយថ្ងៃ</p></div></div>
      <div className="flex gap-2"><button className="btn-secondary" disabled={saving} onClick={saveDraft}><Save size={18}/>{saving ? 'កំពុងរក្សា...' : 'រក្សាទុកព្រាង'}</button><button className="btn-primary bg-green-600 hover:bg-green-700" disabled={saving} onClick={submitToManager}><Send size={18}/>{saving ? 'កំពុងរក្សា...' : 'ដាក់ស្នើទៅ Manager'}</button></div>
    </div>

    <div className="card grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
      <Filter label="ថ្ងៃរបាយការណ៍" value={date} onChange={setDate} type="date"/>
      <Filter label="បុគ្គលិកលក់" value={sales} onChange={value => { setSales(value); setPlan('') }} options={salesOptions}/>
      <Filter label="ក្រុម Sales" value={team} onChange={setTeam} options={[...lookups.teams.map(item => item.name), 'Team A', 'Team B']}/>
      <Filter label="លេខផែនការចុះ" value={plan} onChange={value => { const next = lookups.plans.find(item => item.id === value); setPlan(value); setSales(next?.assignee?.full_name || sales); setProvince(next?.province || province); setDate(next?.start_date || date) }} options={filteredPlans.length ? filteredPlans.map(item => ({ value: item.id, label: item.title })) : [{ value: '', label: 'មិនមានផែនការ' }]}/>
      <Filter label="ខេត្ត" value={province} onChange={setProvince} options={[...new Set(lookups.plans.map(item => item.province).filter(Boolean)), 'កំពង់ចាម', 'ភ្នំពេញ']}/>
      <Filter label="យានយន្ត" value={vehicle} onChange={value => { const next = lookups.vehicles.find(item => item.id === value); setVehicle(value); if (next?.current_odometer) setFuel(current => ({ ...current, start: Number(next.current_odometer) })) }} options={lookups.vehicles.length ? lookups.vehicles.map(item => ({ value: item.id, label: `${item.brand_model} ${item.plate_number}` })) : ['Toyota Hilux 2AB-1234', 'Prius 2BC-7312']}/>
    </div>

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <Summary icon={FileText} label="ចំនួន INV សរុប" value={invoices.length} tone="blue" suffix="Invoice"/>
      <Summary icon={BriefcaseBusiness} label="ទឹកប្រាក់លក់សរុប" value={money(totals.salesAmount)} tone="green" suffix="Sales Amount"/>
      <Summary icon={WalletCards} label="បានប្រមូល" value={money(totals.collected)} tone="violet" suffix="Collected"/>
      <Summary icon={Gauge} label="ជំពាក់" value={money(totals.credit)} tone="orange" suffix="Credit"/>
      <Summary icon={ShoppingCart} label="ចំណាយសរុប" value={money(totals.totalExpense)} tone="red" suffix="Total Expense"/>
      <Summary icon={MapPinned} label="ចម្ងាយសរុប" value={`${totals.distance} KM`} tone="teal" suffix="Total Distance"/>
    </div>

    <div className="card overflow-hidden">
      <div className="flex flex-wrap border-b text-sm font-semibold text-slate-600">
        {['សង្ខេបប្រចាំថ្ងៃ', 'ផ្សារដែលបានចុះ', 'ផ្លូវដំណើរ', 'ចំណាយប្រចាំថ្ងៃ', 'យោបល់ និងការណ៍'].map((tab, index) => <button className={`flex items-center gap-2 px-5 py-3 ${index === 0 ? 'border-b-2 border-blue-600 text-blue-600' : 'hover:bg-slate-50'}`} key={tab}>{index === 0 && <Gauge size={17}/>} {tab}</button>)}
      </div>
      <div className="grid gap-4 p-4 xl:grid-cols-[1.25fr_1fr]">
        <section className="overflow-hidden rounded-lg border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50/70 p-4"><div><h2 className="font-bold">បញ្ជី Invoice ប្រចាំថ្ងៃ</h2><p className="text-xs text-slate-500">គ្រប់គ្រងការលក់ ប្រមូលប្រាក់ និងជំពាក់តាមអតិថិជន</p></div><button className="btn-primary px-3 py-2" onClick={openInvoiceCreate}><Plus size={16}/>បន្ថែម Invoice</button></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[820px]"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['ល.រ','លេខ Invoice','អតិថិជន','ផ្សារ','ទឹកប្រាក់','បានប្រមូល','ប្តូរឥវ៉ាន់','ជំពាក់','សកម្មភាព'].map(x => <th className="table-cell" key={x}>{x}</th>)}</tr></thead><tbody className="divide-y">{invoices.map((row, index) => <tr key={`${row.code}-${index}`}><td className="table-cell">{index + 1}</td><td className="table-cell font-semibold">{row.code}</td><td className="table-cell">{row.customer}</td><td className="table-cell">{row.market}</td><MoneyInput value={row.amount} onChange={value => setInvoices(change(invoices, index, 'amount', value))}/><MoneyInput value={row.collected} onChange={value => setInvoices(change(invoices, index, 'collected', value))}/><MoneyInput value={row.returned || 0} onChange={value => setInvoices(change(invoices, index, 'returned', value))}/><td className="table-cell font-bold text-orange-600">{money(Number(row.amount || 0) - Number(row.collected || 0) - Number(row.returned || 0))}</td><td className="table-cell"><RowActions onEdit={() => openInvoiceEdit(index)} onDelete={() => setInvoices(invoices.filter((_, i) => i !== index))}/></td></tr>)}</tbody><tfoot className="bg-slate-50 font-bold"><tr><td className="table-cell" colSpan="4">សរុប</td><td className="table-cell text-blue-600">{money(totals.salesAmount)}</td><td className="table-cell text-green-600">{money(totals.collected)}</td><td className="table-cell text-red-600">{money(totals.returned)}</td><td className="table-cell text-orange-600">{money(totals.credit)}</td><td/></tr></tfoot></table></div>
        </section>

        <div className="space-y-4">
          <section className="rounded-lg border p-4">
            <h2 className="mb-3 font-bold">កីឡូម៉ែត្ររថយន្ត</h2>
            <div className="grid gap-3 md:grid-cols-[1fr_170px]">
              <div className="space-y-3">
                <Odometer label="ចាប់ផ្តើមការងារ" value={fuel.start} time={fuel.workStartTime} onChange={value => setFuel({ ...fuel, start: value })} onTimeChange={value => setFuel({ ...fuel, workStartTime: value })}/>
                <Odometer label="បញ្ចប់ការងារ" value={fuel.end} time={fuel.workEndTime} onChange={value => setFuel({ ...fuel, end: value, night: Math.max(Number(fuel.night || 0), Number(value || 0)) })} onTimeChange={value => setFuel({ ...fuel, workEndTime: value })}/>
                <Odometer label="ពិនិត្យពេលយប់" value={fuel.night} time={fuel.nightCheckTime} onChange={value => setFuel({ ...fuel, night: value })} onTimeChange={value => setFuel({ ...fuel, nightCheckTime: value })}/>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-blue-50 p-3 font-bold text-blue-900">ចម្ងាយការងារ: {totals.workDistance} KM</div>
                  <div className={`rounded-lg p-3 font-bold ${totals.afterHoursDistance > 0 ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>ក្រៅម៉ោង: {totals.afterHoursDistance} KM</div>
                </div>
              </div>
              <div className="grid place-items-center"><div className={`grid size-36 place-items-center rounded-full border-[12px] ${totals.afterHoursDistance > 0 ? 'border-orange-500 border-l-slate-200' : 'border-green-500 border-l-slate-200'} text-center`}><Car size={36}/><b>{totals.totalOdometerDistance}</b><span className="text-xs">KM</span></div></div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3"><Upload label="រូបចាប់ផ្តើម"/><Upload label="រូបបញ្ចប់ការងារ"/><Upload label="រូបពិនិត្យពេលយប់"/></div>
          </section>

          <section className="rounded-lg border">
            <div className="flex items-center justify-between border-b p-3"><h2 className="font-bold">ចំណាយប្រចាំថ្ងៃ</h2><button className="btn-primary px-3 py-2" onClick={openExpenseCreate}><Plus size={16}/>បន្ថែមចំណាយ</button></div>
            <table className="w-full"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['ប្រភេទចំណាយ','ទីតាំង/ហាង','ចំនួន','ភ្ជាប់',''].map(x => <th className="table-cell" key={x}>{x}</th>)}</tr></thead><tbody className="divide-y">{expenses.map((row, index) => <tr key={index}><td className="table-cell font-medium">{row.type}</td><td className="table-cell">{row.vendor}</td><td className="table-cell font-semibold">{money(row.amount)}</td><td className="table-cell"><Paperclip size={16}/></td><td className="table-cell"><RowActions onEdit={() => openExpenseEdit(index)} onDelete={() => setExpenses(expenses.filter((_, i) => i !== index))}/></td></tr>)}</tbody><tfoot className="bg-slate-50 font-bold text-red-600"><tr><td className="table-cell" colSpan="2">ចំណាយសរុប</td><td className="table-cell">{money(totals.otherExpense)}</td><td colSpan="2"/></tr></tfoot></table>
          </section>
        </div>
      </div>
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-bold">ចាក់សាំង</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Auto ពីចំណាយសាំងតាម Plan/ថ្ងៃ</span></div>
        <div className="grid gap-3 md:grid-cols-5"><FuelInput label="ចំនួនលីត្រ" value={fuel.liters} suffix="L" onChange={value => setFuel({ ...fuel, liters: value })}/><FuelInput label="តម្លៃ/លីត្រ" value={fuel.unitPrice} suffix="$" onChange={value => setFuel({ ...fuel, unitPrice: value })}/><FuelInput label="ចំណាយសាំង" value={totals.fuelTotal.toFixed(2)} readOnly/><Filter label="ស្ថានីយប្រេង" value={fuel.station} onChange={value => setFuel({ ...fuel, station: value })} options={['PTT Station', 'Tela', 'Total']}/><FuelInput label="លេខវិក្កយបត្រ" value={fuel.invoice} onChange={value => setFuel({ ...fuel, invoice: value })}/></div>
        <div className="mt-4 grid gap-3 rounded-lg bg-green-50 p-3 md:grid-cols-4"><Mini icon={MapPinned} label="ចម្ងាយ" value={`${totals.distance} KM`}/><Mini icon={Fuel} label="ប្រើសាំង" value={`${fuel.liters} L`}/><Mini icon={Gauge} label="ប្រសិទ្ធភាព" value={`${totals.efficiency.toFixed(2)} KM/L`}/><Mini icon={WalletCards} label="ចំណាយក្នុង 1 KM" value={money(totals.costPerKm)}/></div>
      </section>
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
        <Note title="សង្ខេបការងារប្រចាំថ្ងៃ" value={notes.summary} onChange={value => setNotes({ ...notes, summary: value })}/>
        <Note title="បញ្ហាប្រឈម" value={notes.problems} onChange={value => setNotes({ ...notes, problems: value })}/>
        <Note title="ផែនការបន្ទាប់" value={notes.next} onChange={value => setNotes({ ...notes, next: value })}/>
      </section>
    </div>
    <Modal open={Boolean(invoiceDialog)} onClose={() => setInvoiceDialog(null)} title={invoiceDialog?.mode === 'edit' ? 'កែ Invoice' : 'បន្ថែម Invoice'} size="max-w-3xl">
      <form className="space-y-4" onSubmit={saveInvoice}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="លេខ Invoice *"><input className="field" value={invoiceDialog?.values.code || ''} onChange={event => setInvoiceDialog(current => ({ ...current, values: { ...current.values, code: event.target.value } }))}/></Field>
          <Field label="អតិថិជន *"><input className="field" value={invoiceDialog?.values.customer || ''} onChange={event => setInvoiceDialog(current => ({ ...current, values: { ...current.values, customer: event.target.value } }))}/></Field>
          <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
            <Field label="ខេត្ត"><select className="field" value={invoiceDialog?.values.province_id || ''} onChange={event => selectInvoiceProvince(event.target.value)}><option value="">ខេត្តទាំងអស់</option>{lookups.provinces.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)}</select></Field>
            <Field label="ស្រុក/ខណ្ឌ"><select className="field" value={invoiceDialog?.values.district_id || ''} onChange={event => selectInvoiceDistrict(event.target.value)}><option value="">ស្រុក/ខណ្ឌទាំងអស់</option>{invoiceDistricts.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)}</select></Field>
            <Field label="ផ្សារ"><select className="field" value={invoiceDialog?.values.market_id || ''} onChange={event => selectInvoiceMarket(event.target.value)}><option value="">ផ្សារទាំងអស់</option>{invoiceMarkets.map(item => <option key={item.id} value={item.id}>{item.name_kh}{item.market_code ? ` · ${item.market_code}` : ''}</option>)}</select><p className="mt-1 text-xs text-slate-500">មាន {invoiceMarkets.length} ផ្សារតាមតំបន់នេះ</p></Field>
          </div>
          <Field label="ស្ថានភាព"><input readOnly className="field bg-slate-50" value={invoiceStatus(invoiceDialog?.values)}/></Field>
          <Field label="ទឹកប្រាក់ *"><input className="field" min="0" step="0.01" type="number" value={invoiceDialog?.values.amount || ''} onChange={event => setInvoiceDialog(current => ({ ...current, values: { ...current.values, amount: event.target.value } }))}/></Field>
          <Field label="បានប្រមូល *"><input className="field" min="0" step="0.01" type="number" value={invoiceDialog?.values.collected || ''} onChange={event => setInvoiceDialog(current => ({ ...current, values: { ...current.values, collected: event.target.value } }))}/></Field>
          <Field label="ភ្ញៀវប្តូរឥវ៉ាន់វិញ"><input className="field" min="0" step="0.01" type="number" value={invoiceDialog?.values.returned || ''} onChange={event => setInvoiceDialog(current => ({ ...current, values: { ...current.values, returned: event.target.value } }))}/></Field>
          <div className="md:col-span-2"><Field label="កំណត់សម្គាល់"><textarea className="field min-h-20" value={invoiceDialog?.values.note || ''} onChange={event => setInvoiceDialog(current => ({ ...current, values: { ...current.values, note: event.target.value } }))}/></Field></div>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="grid gap-3 text-sm md:grid-cols-4"><Info label="Invoice" value={money(invoiceDialog?.values.amount)}/><Info label="Collected" value={money(invoiceDialog?.values.collected)}/><Info label="Returned" value={money(invoiceDialog?.values.returned)}/><Info label="Credit" value={money(Number(invoiceDialog?.values.amount || 0) - Number(invoiceDialog?.values.collected || 0) - Number(invoiceDialog?.values.returned || 0))}/></div>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4"><button type="button" className="btn-secondary" onClick={() => setInvoiceDialog(null)}><X size={17}/>បោះបង់</button><button className="btn-primary"><Save size={17}/>រក្សាទុក Invoice</button></div>
      </form>
    </Modal>
    <Modal open={Boolean(expenseDialog)} onClose={() => setExpenseDialog(null)} title={expenseDialog?.mode === 'edit' ? 'កែចំណាយ' : 'បន្ថែមចំណាយ'} size="max-w-3xl">
      <form className="space-y-4" onSubmit={saveExpense}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="ប្រភេទចំណាយ *"><select className="field" value={expenseDialog?.values.type || ''} onChange={event => setExpenseDialog(current => ({ ...current, values: { ...current.values, type: event.target.value } }))}><option value="">ជ្រើសប្រភេទចំណាយ</option>{['សាំង','អាហារ','ថតចម្លង','ផ្លូវការ','ស្នាក់នៅ','ផ្សេងៗ'].map(item => <option key={item} value={item}>{item}</option>)}</select></Field>
          <Field label="ទីតាំង/ហាង *"><input className="field" value={expenseDialog?.values.vendor || ''} onChange={event => setExpenseDialog(current => ({ ...current, values: { ...current.values, vendor: event.target.value, market_id: '' } }))}/></Field>
          <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
            <Field label="ខេត្ត"><select className="field" value={expenseDialog?.values.province_id || ''} onChange={event => selectExpenseProvince(event.target.value)}><option value="">ខេត្តទាំងអស់</option>{lookups.provinces.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)}</select></Field>
            <Field label="ស្រុក/ខណ្ឌ"><select className="field" value={expenseDialog?.values.district_id || ''} onChange={event => selectExpenseDistrict(event.target.value)}><option value="">ស្រុក/ខណ្ឌទាំងអស់</option>{expenseDistricts.map(item => <option key={item.id} value={item.id}>{item.name_kh}</option>)}</select></Field>
            <Field label="ផ្សារ"><select className="field" value={expenseDialog?.values.market_id || ''} onChange={event => selectExpenseMarket(event.target.value)}><option value="">ផ្សារទាំងអស់</option>{expenseMarkets.map(item => <option key={item.id} value={item.id}>{item.name_kh}{item.market_code ? ` · ${item.market_code}` : ''}</option>)}</select><p className="mt-1 text-xs text-slate-500">មាន {expenseMarkets.length} ផ្សារតាមតំបន់នេះ</p></Field>
          </div>
          <Field label="ចំនួន *"><input className="field" min="0" step="0.01" type="number" value={expenseDialog?.values.amount || ''} onChange={event => setExpenseDialog(current => ({ ...current, values: { ...current.values, amount: event.target.value } }))}/></Field>
          <Field label="ភ្ជាប់ឯកសារ"><input className="field file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-blue-700" type="file" accept=".pdf,image/*"/></Field>
          <div className="md:col-span-2"><Field label="កំណត់សម្គាល់"><textarea className="field min-h-20" value={expenseDialog?.values.note || ''} onChange={event => setExpenseDialog(current => ({ ...current, values: { ...current.values, note: event.target.value } }))}/></Field></div>
        </div>
        <div className="rounded-lg bg-slate-50 p-4"><Info label="ចំណាយសរុប" value={money(expenseDialog?.values.amount)}/></div>
        <div className="flex justify-end gap-2 border-t pt-4"><button type="button" className="btn-secondary" onClick={() => setExpenseDialog(null)}><X size={17}/>បោះបង់</button><button className="btn-primary"><Save size={17}/>រក្សាទុកចំណាយ</button></div>
      </form>
    </Modal>
  </div>
}

function Filter({ label, value, onChange, options, type = 'text' }) { return <label className="block text-sm"><span className="mb-1.5 block font-medium text-slate-700">{label}</span>{options ? <select className="field" value={value} onChange={event => onChange(event.target.value)}>{options.map(option => typeof option === 'object' ? <option key={option.value} value={option.value}>{option.label}</option> : <option key={option}>{option}</option>)}</select> : <input className="field" type={type} value={value} onChange={event => onChange(event.target.value)}/>}</label> }
function Summary({ icon: Icon, label, value, suffix, tone }) { const tones = { blue:'bg-blue-50 text-blue-600 border-blue-100', green:'bg-green-50 text-green-600 border-green-100', violet:'bg-violet-50 text-violet-600 border-violet-100', orange:'bg-orange-50 text-orange-600 border-orange-100', red:'bg-red-50 text-red-600 border-red-100', teal:'bg-teal-50 text-teal-600 border-teal-100' }; return <div className={`rounded-lg border bg-white p-4 ${tones[tone]}`}><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-lg bg-white/70"><Icon size={23}/></span><div><p className="text-xs font-semibold">{label}</p><p className="text-2xl font-bold text-slate-950">{value}</p><p className="text-xs text-slate-600">{suffix}</p></div></div></div> }
function MoneyInput({ value, onChange }) { return <td className="table-cell"><input className="w-24 rounded-md border px-2 py-1 text-right" type="number" step="0.01" value={value} onChange={event => onChange(Number(event.target.value))}/></td> }
function RowActions({ onEdit, onDelete }) { return <div className="flex gap-1"><button className="rounded-lg bg-blue-50 p-2 text-blue-600" onClick={onEdit}><Eye size={15}/></button><button className="rounded-lg bg-red-50 p-2 text-red-600" onClick={onDelete}><Trash2 size={15}/></button></div> }
function Odometer({ label, value, time, onChange, onTimeChange }) { return <label className="grid gap-2 text-sm sm:grid-cols-[1fr_120px_150px] sm:items-center"><span className="font-medium text-slate-700">{label}</span><input className="field" type="time" value={time} onChange={event => onTimeChange(event.target.value)}/><input className="field text-right" type="number" value={value} onChange={event => onChange(Number(event.target.value))}/></label> }
function Upload({ label }) { return <div><p className="mb-2 text-sm font-medium">{label}</p><div className="flex items-center gap-2"><span className="grid size-12 place-items-center rounded-lg bg-slate-100"><Camera size={20}/></span><button className="btn-secondary px-3 py-2">មើល</button><button className="btn-secondary px-3 py-2"><Camera size={16}/>ថតរូប</button></div></div> }
function FuelInput({ label, value, onChange, suffix, readOnly }) { return <label className="block text-sm"><span className="mb-1.5 block font-medium">{label}</span><div className="relative"><input readOnly={readOnly} className={`field ${readOnly ? 'bg-green-50 font-bold text-green-700' : ''}`} value={value} onChange={event => onChange?.(event.target.value)}/>{suffix && <span className="absolute right-3 top-2.5 text-xs text-slate-400">{suffix}</span>}</div></label> }
function Mini({ icon: Icon, label, value }) { return <div className="flex items-center gap-2"><Icon className="text-green-600" size={24}/><div><p className="text-xs text-slate-500">{label}</p><p className="font-bold">{value}</p></div></div> }
function Note({ title, value, onChange }) { return <div className="card p-4"><h3 className="mb-2 font-bold">{title}</h3><textarea className="field min-h-24 whitespace-pre-line" value={value} onChange={event => onChange(event.target.value)}/></div> }
function Field({ label, children }) { return <div><label className="label">{label}</label>{children}</div> }
function Info({ label, value }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="font-bold">{value}</p></div> }
function change(rows, index, key, value) { return rows.map((row, i) => i === index ? (key ? { ...row, [key]: value } : value) : row) }
function money(value) { return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function invoiceStatus(values = {}) { const amount = Number(values.amount || 0); const collected = Number(values.collected || 0); const returned = Number(values.returned || 0); if (amount > 0 && collected + returned >= amount) return 'Paid'; if (collected > 0 || returned > 0) return 'Partial'; return 'Open' }
