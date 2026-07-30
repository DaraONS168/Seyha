import { AlertTriangle, Banknote, BellRing, CalendarClock, CheckCircle2, CreditCard, FileText, Palette, ShieldAlert, Type } from 'lucide-react'

const colors = [
  { name: 'Primary Blue', hex: '#2563EB', use: 'Primary actions, links, active tabs' },
  { name: 'Success Green', hex: '#16A34A', use: 'Paid, collected, fully paid' },
  { name: 'Warning Amber', hex: '#F59E0B', use: 'Due soon, due today, credit warning' },
  { name: 'Danger Red', hex: '#DC2626', use: 'Overdue, blocked, cancel, write off' },
  { name: 'Surface', hex: '#FFFFFF', use: 'Cards, modals, tables' },
  { name: 'Background', hex: '#F8FAFC', use: 'Page background' },
]

const statuses = [
  ['Active', 'bg-blue-50 text-blue-700'],
  ['Due Soon', 'bg-amber-50 text-amber-700'],
  ['Due Today', 'bg-orange-50 text-orange-700'],
  ['Overdue', 'bg-red-50 text-red-700'],
  ['Fully Paid', 'bg-green-50 text-green-700'],
  ['Written Off', 'bg-rose-50 text-rose-700'],
  ['Promise Pending', 'bg-amber-50 text-amber-700'],
  ['Promise Broken', 'bg-red-50 text-red-700'],
  ['Credit Blocked', 'bg-red-50 text-red-700'],
]

const components = [
  { icon: CreditCard, title: 'Summary Cards', text: 'ប្រើសម្រាប់ Outstanding, Overdue, Due Today, Collected និង Collection Rate។' },
  { icon: FileText, title: 'Debt Table', text: 'Table-first UI មាន filters, status badges, row actions និង export។' },
  { icon: Banknote, title: 'Payment Modal', text: 'បង់ប្រាក់ត្រូវកាត់ balance, បង្កើត receipt, cash flow និង audit log។' },
  { icon: BellRing, title: 'Promise to Pay', text: 'កត់ត្រាសន្យាបង់ប្រាក់ និង update Broken ពេលហួសថ្ងៃ។' },
  { icon: ShieldAlert, title: 'Risk Actions', text: 'Cancel, Write Off និង Admin override ត្រូវមាន confirmation និង reason។' },
  { icon: CalendarClock, title: 'Reminder UX', text: 'Due Soon, Due Today និង Overdue មិនត្រូវ spam notification ពេល refresh។' },
]

function Badge({ label, className }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>{label}</span>
}

export default function DebtBrandSystemPage() {
  return <div className="space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-bold text-blue-600">Brand System</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Debt / Accounts Receivable</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">Visual និង product rules សម្រាប់គ្រប់គ្រងបំណុលអតិថិជន។ Page នេះជាកន្លែងមើល style, component behavior និង tone មុន build database ពេញ។</p>
      </div>
      <a className="btn-secondary" href="/debts"><CreditCard size={17}/>មើល UX/UI Debt</a>
    </div>

    <section className="card overflow-hidden">
      <div className="border-b bg-slate-50 px-5 py-4">
        <div className="flex items-center gap-3"><Palette className="text-blue-600"/><div><h2 className="font-extrabold">Color System</h2><p className="text-xs text-slate-500">ពណ៌ត្រូវជួយឲ្យ finance status មើលឃើញលឿន។</p></div></div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {colors.map(color => <div key={color.hex} className="rounded-2xl border p-4">
          <div className="mb-3 h-16 rounded-xl border" style={{ backgroundColor: color.hex }}/>
          <p className="font-bold">{color.name}</p>
          <p className="text-sm font-semibold text-slate-500">{color.hex}</p>
          <p className="mt-1 text-xs text-slate-500">{color.use}</p>
        </div>)}
      </div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="card p-5">
        <div className="mb-4 flex items-center gap-3"><Type className="text-blue-600"/><div><h2 className="font-extrabold">Typography</h2><p className="text-xs text-slate-500">Khmer business readable style</p></div></div>
        <div className="space-y-4">
          <div><p className="text-xs text-slate-500">Page title</p><p className="text-3xl font-extrabold">គ្រប់គ្រងបំណុល</p></div>
          <div><p className="text-xs text-slate-500">Section title</p><p className="text-xl font-bold">កត់ត្រាការបង់ប្រាក់</p></div>
          <div><p className="text-xs text-slate-500">Table text</p><p className="text-sm">អតិថិជន · Invoice · ប្រាក់នៅសល់ · ថ្ងៃត្រូវបង់</p></div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-3"><AlertTriangle className="text-amber-600"/><div><h2 className="font-extrabold">Status Badges</h2><p className="text-xs text-slate-500">Badge តូចៗ សម្រាប់ scan ក្នុង table និង detail page។</p></div></div>
        <div className="flex flex-wrap gap-2">{statuses.map(([label, className]) => <Badge key={label} label={label} className={className}/>)}</div>
      </div>
    </section>

    <section className="card p-5">
      <div className="mb-4 flex items-center gap-3"><CheckCircle2 className="text-green-600"/><div><h2 className="font-extrabold">Core Components</h2><p className="text-xs text-slate-500">Component ទាំងនេះគួរត្រូវប្រើពេល build module ពេញ។</p></div></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {components.map(item => {
          const Icon = item.icon
          return <div key={item.title} className="rounded-2xl border p-4">
            <span className="mb-3 grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon size={20}/></span>
            <h3 className="font-bold">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{item.text}</p>
          </div>
        })}
      </div>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <div className="card p-5">
        <h2 className="mb-3 font-extrabold">Financial Safety Rules</h2>
        <div className="space-y-2 text-sm text-slate-600">
          <p>• Amount Paid មិនអាចធំជាង Remaining Balance លុះត្រាតែ Admin override។</p>
          <p>• Cancel Payment និង Write Off ត្រូវមាន confirmation និង reason។</p>
          <p>• រាល់ financial edit ត្រូវរក្សា Audit Log។</p>
          <p>• Payment មួយមិនត្រូវបង្កើត Income ស្ទួនក្នុង Cash Flow។</p>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="mb-3 font-extrabold">Khmer Copy Rules</h2>
        <div className="flex flex-wrap gap-2">
          {['កត់ត្រាការបង់ប្រាក់', 'បំណុលហួសកំណត់', 'សន្យាបង់ប្រាក់', 'បោះពុម្ព Statement', 'បញ្ជាក់ការលុបចោល'].map(item => <span key={item} className="rounded-lg border bg-slate-50 px-3 py-2 text-sm font-semibold">{item}</span>)}
        </div>
      </div>
    </section>
  </div>
}
