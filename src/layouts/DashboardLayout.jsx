import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, CalendarRange, ChartNoAxesCombined, ChevronDown, ChevronRight, CircleDollarSign, ClipboardList, Fuel, History, Landmark, LayoutDashboard, LogOut, Menu, PhoneCall, ReceiptText, Search, Settings, Store, UserCog, Users, UserRound, WalletCards, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'

const navGroups = [
  { label: 'ទូទៅ', items: [{ to:'/',label:'ផ្ទាំងគ្រប់គ្រង',icon:LayoutDashboard,permission:'dashboard.view' }] },
  { label: 'គ្រប់គ្រងអតិថិជន', items: [
    { to:'/customers',label:'អតិថិជន',icon:Users,permission:'customers.view' },{ to:'/follow-ups',label:'Follow Up',icon:PhoneCall,permission:'follow_ups.view' },
    { to:'/calls',label:'ប្រវត្តិការហៅ',icon:History,permission:'calls.view' },{ to:'/visit-plans',label:'ផែនការចុះស្រុក',icon:CalendarRange,permission:'visit_plans.view' },
    { to:'/sales',label:'ក្រុមលក់',icon:UserRound,permission:'sales_team.view' },{ to:'/reports',label:'របាយការណ៍',icon:ChartNoAxesCombined,permission:'reports.view' },
  ]},
  { label: 'ប្រតិបត្តិការ', items: [{ to:'/markets',label:'គ្រប់គ្រងផ្សារ',icon:Store,permission:'markets.view' }] },
  { label: 'របាយការណ៍ប្រចាំថ្ងៃ', items: [{ to:'/daily-reports',label:'បញ្ជីរបាយការណ៍',icon:ClipboardList,permission:'daily_reports.view' }] },
  { label: 'ហិរញ្ញវត្ថុ', items: [{ key:'expenses',label:'គ្រប់គ្រងចំណាយ',icon:WalletCards,permission:'expenses.view',children:[
    { to:'/expenses',label:'ផ្ទាំងសង្ខេប',icon:Landmark,permission:'expenses.view' },{ to:'/expenses/requests',label:'សំណើចំណាយ',icon:ReceiptText,permission:'expenses.view' },
    { to:'/expenses/budgets',label:'ថវិកាតាមខេត្ត',icon:CircleDollarSign,permission:'expenses.budgets.view' },
    { to:'/expenses/fuel',label:'ចំណាយសាំង',icon:Fuel,permission:'fuel.view' },
    { to:'/expenses/fuel/budgets',label:'ថវិកាសាំង',icon:CircleDollarSign,permission:'fuel.budgets.view' },
  ]}]},
  { label: 'ប្រព័ន្ធ', items: [{ to:'/notifications',label:'ការជូនដំណឹង',icon:Bell,permission:'notifications.view' },{ to:'/users',label:'អ្នកប្រើប្រាស់',icon:UserCog,permission:'users.view' },{ to:'/settings',label:'ការកំណត់',icon:Settings,permission:'settings.view' }] },
]

export default function DashboardLayout() {
  const [mobile, setMobile] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const location = useLocation()
  const [expanded, setExpanded] = useState({ expenses: location.pathname.startsWith('/expenses') })
  const { profile, signOut, hasPermission } = useAuth()
  const { unread } = useNotifications()
  const navigate = useNavigate()
  const logout = async () => { await signOut(); navigate('/login') }
  const linkClass = ({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-50 hover:bg-white/10 hover:text-white'}`
  const sidebar = <>
    <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm"><PhoneCall size={22}/></div><div className="min-w-0"><p className="truncate text-base font-bold tracking-tight">Customer CRM</p><p className="truncate text-xs text-blue-100">Government Management System</p></div></div>
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">{navGroups.map(group => {
      const visibleItems=group.items.filter(item=>hasPermission(item.permission))
      if(!visibleItems.length)return null
      return <section key={group.label}><p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200/80">{group.label}</p><div className="space-y-1">{visibleItems.map(item=>{
        const Icon=item.icon
        if(item.children){const children=item.children.filter(child=>hasPermission(child.permission));const isActive=item.children.some(child=>location.pathname===child.to||location.pathname.startsWith(`${child.to}/`));const open=expanded[item.key]||isActive;return <div key={item.key}><button onClick={()=>setExpanded(current=>({...current,[item.key]:!open}))} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive?'bg-blue-700/40 text-white':'text-blue-50 hover:bg-white/10'}`}><Icon size={19}/><span className="flex-1 text-left">{item.label}</span>{open?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</button>{open&&<div className="ml-5 mt-1 space-y-1 border-l border-blue-300/30 pl-3">{children.map(child=>{const ChildIcon=child.icon;return <NavLink key={child.to} to={child.to} end={child.to==='/expenses'} onClick={()=>setMobile(false)} className={linkClass}><ChildIcon size={17}/><span className="flex-1">{child.label}</span></NavLink>})}</div>}</div>}
        return <NavLink key={item.to} to={item.to} end={item.to==='/'} onClick={()=>setMobile(false)} className={linkClass}><Icon size={19}/><span className="flex-1">{item.label}</span>{item.to==='/notifications'&&unread>0&&<span className="grid min-w-5 place-items-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">{unread>9?'9+':unread}</span>}</NavLink>
      })}</div></section>})}</nav>
    <div className="border-t border-white/10 p-3"><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-blue-100 transition hover:bg-red-500/20 hover:text-white"><LogOut size={19}/>ចាកចេញ</button></div>
  </>
  return <div className="min-h-screen bg-slate-50">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-blue-600 text-white lg:flex">{sidebar}</aside>
    {mobile && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-950/50" onClick={() => setMobile(false)}/><aside className="relative flex h-full w-72 flex-col bg-blue-600 text-white">{sidebar}<button onClick={() => setMobile(false)} className="absolute right-3 top-4 rounded-lg p-2 hover:bg-blue-500"><X/></button></aside></div>}
    <div className="lg:pl-64"><header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b bg-white/95 px-4 py-3 backdrop-blur md:px-6"><button onClick={() => setMobile(true)} className="rounded-xl p-2 hover:bg-slate-100 lg:hidden"><Menu/></button><div className="relative hidden max-w-md flex-1 md:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="field pl-10" placeholder="ស្វែងរកអតិថិជន..." onKeyDown={e => e.key === 'Enter' && navigate(`/customers?search=${encodeURIComponent(e.currentTarget.value)}`)}/></div><div className="ml-auto flex items-center gap-2"><button onClick={() => navigate('/notifications')} className="relative rounded-xl p-2.5 hover:bg-slate-100"><Bell size={21}/>{unread > 0 && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-red-500 text-[9px] text-white">{unread > 9 ? '9+' : unread}</span>}</button><div className="relative"><button onClick={() => setProfileOpen(v => !v)} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100"><div className="grid size-9 place-items-center rounded-full bg-blue-100 font-bold text-blue-700">{profile?.full_name?.[0]?.toUpperCase() || 'U'}</div><div className="hidden text-left sm:block"><p className="max-w-36 truncate text-sm font-semibold">{profile?.full_name}</p><p className="text-xs capitalize text-slate-500">{profile?.role}</p></div><ChevronDown size={16}/></button>{profileOpen && <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white p-2 shadow-xl"><div className="border-b p-2 text-sm"><p className="font-semibold">{profile?.full_name}</p><p className="truncate text-xs text-slate-500">{profile?.email}</p></div><button onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-lg p-2 text-sm text-red-600 hover:bg-red-50"><LogOut size={16}/>ចាកចេញ</button></div>}</div></div></header><main className="p-4 md:p-6"><Outlet/></main></div>
  </div>
}
