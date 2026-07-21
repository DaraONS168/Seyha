import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, CalendarRange, ChartNoAxesCombined, ChevronDown, History, LayoutDashboard, LogOut, Menu, PhoneCall, Search, Settings, UserCog, Users, UserRound, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'

const nav = [
  ['/', 'ផ្ទាំងគ្រប់គ្រង', LayoutDashboard, 'dashboard'], ['/customers', 'អតិថិជន', Users, 'customers'], ['/follow-ups', 'Follow Up', PhoneCall, 'follow_ups'],
  ['/calls', 'ប្រវត្តិការហៅ', History, 'calls'], ['/reports', 'របាយការណ៍', ChartNoAxesCombined, 'reports'], ['/sales', 'ក្រុមលក់', UserRound, 'sales_team'],
  ['/visit-plans', 'ផែនការចុះស្រុក', CalendarRange, 'visit_plans'],
  ['/notifications', 'ការជូនដំណឹង', Bell, 'notifications'], ['/users', 'អ្នកប្រើប្រាស់', UserCog, 'user_management'], ['/settings', 'ការកំណត់', Settings, 'settings'],
]

export default function DashboardLayout() {
  const [mobile, setMobile] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { profile, signOut, hasPermission } = useAuth()
  const { unread } = useNotifications()
  const navigate = useNavigate()
  const logout = async () => { await signOut(); navigate('/login') }
  const sidebar = <>
    <div className="flex h-[72px] items-center gap-3 border-b border-blue-500/30 px-5 py-4"><div className="grid size-10 place-items-center rounded-xl bg-white text-blue-600"><PhoneCall size={21}/></div><div><p className="font-bold">Customer CRM</p><p className="text-xs text-blue-100">Follow Up System</p></div></div>
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">{nav.filter(([, , , permission]) => hasPermission(permission)).map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMobile(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isActive ? 'bg-white text-blue-700 shadow' : 'text-blue-50 hover:bg-blue-500'}`}><Icon size={19}/><span className="flex-1">{label}</span>{to === '/notifications' && unread > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">{unread}</span>}</NavLink>)}</nav>
    <button onClick={logout} className="m-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-blue-50 hover:bg-blue-500"><LogOut size={19}/>ចាកចេញ</button>
  </>
  return <div className="min-h-screen bg-slate-50">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-blue-600 text-white lg:flex">{sidebar}</aside>
    {mobile && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-950/50" onClick={() => setMobile(false)}/><aside className="relative flex h-full w-72 flex-col bg-blue-600 text-white">{sidebar}<button onClick={() => setMobile(false)} className="absolute right-3 top-4 rounded-lg p-2 hover:bg-blue-500"><X/></button></aside></div>}
    <div className="lg:pl-64"><header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b bg-white/95 px-4 py-3 backdrop-blur md:px-6"><button onClick={() => setMobile(true)} className="rounded-xl p-2 hover:bg-slate-100 lg:hidden"><Menu/></button><div className="relative hidden max-w-md flex-1 md:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="field pl-10" placeholder="ស្វែងរកអតិថិជន..." onKeyDown={e => e.key === 'Enter' && navigate(`/customers?search=${encodeURIComponent(e.currentTarget.value)}`)}/></div><div className="ml-auto flex items-center gap-2"><button onClick={() => navigate('/notifications')} className="relative rounded-xl p-2.5 hover:bg-slate-100"><Bell size={21}/>{unread > 0 && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-red-500 text-[9px] text-white">{unread > 9 ? '9+' : unread}</span>}</button><div className="relative"><button onClick={() => setProfileOpen(v => !v)} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100"><div className="grid size-9 place-items-center rounded-full bg-blue-100 font-bold text-blue-700">{profile?.full_name?.[0]?.toUpperCase() || 'U'}</div><div className="hidden text-left sm:block"><p className="max-w-36 truncate text-sm font-semibold">{profile?.full_name}</p><p className="text-xs capitalize text-slate-500">{profile?.role}</p></div><ChevronDown size={16}/></button>{profileOpen && <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white p-2 shadow-xl"><div className="border-b p-2 text-sm"><p className="font-semibold">{profile?.full_name}</p><p className="truncate text-xs text-slate-500">{profile?.email}</p></div><button onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-lg p-2 text-sm text-red-600 hover:bg-red-50"><LogOut size={16}/>ចាកចេញ</button></div>}</div></div></header><main className="p-4 md:p-6"><Outlet/></main></div>
  </div>
}
