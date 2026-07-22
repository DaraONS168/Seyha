import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/common/ProtectedRoute'
import AdminRoute from './components/common/AdminRoute'
import PermissionRoute from './components/common/PermissionRoute'
import LoadingState from './components/common/LoadingState'
import DashboardLayout from './layouts/DashboardLayout'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'))
const FollowUpsPage = lazy(() => import('./pages/FollowUpsPage'))
const CallHistoryPage = lazy(() => import('./pages/CallHistoryPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SalesTeamPage = lazy(() => import('./pages/SalesTeamPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const VisitPlansPage = lazy(() => import('./pages/VisitPlansPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'))
const MarketsPage = lazy(() => import('./pages/MarketsPage'))
const MarketFormPage = lazy(() => import('./pages/MarketFormPage'))
const MarketDetailPage = lazy(() => import('./pages/MarketDetailPage'))

export default function App() {
  return <Suspense fallback={<LoadingState label="កំពុងបើកទំព័រ..."/>}>
    <Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route element={<ProtectedRoute><DashboardLayout/></ProtectedRoute>}>
        <Route index element={<PermissionRoute permission="dashboard"><DashboardPage/></PermissionRoute>}/>
        <Route path="customers" element={<PermissionRoute permission="customers"><CustomersPage/></PermissionRoute>}/>
        <Route path="customers/:id" element={<PermissionRoute permission="customers"><CustomerDetailPage/></PermissionRoute>}/>
        <Route path="follow-ups" element={<PermissionRoute permission="follow_ups"><FollowUpsPage/></PermissionRoute>}/>
        <Route path="visit-plans" element={<PermissionRoute permission="visit_plans"><VisitPlansPage/></PermissionRoute>}/>
        <Route path="calls" element={<PermissionRoute permission="calls"><CallHistoryPage/></PermissionRoute>}/>
        <Route path="reports" element={<PermissionRoute permission="reports"><ReportsPage/></PermissionRoute>}/>
        <Route path="sales" element={<PermissionRoute permission="sales_team"><SalesTeamPage/></PermissionRoute>}/>
        <Route path="notifications" element={<PermissionRoute permission="notifications"><NotificationsPage/></PermissionRoute>}/>
        <Route path="users" element={<AdminRoute><UserManagementPage/></AdminRoute>}/>
        <Route path="markets" element={<PermissionRoute permission="markets.view"><MarketsPage/></PermissionRoute>}/>
        <Route path="markets/new" element={<PermissionRoute permission="markets.create"><MarketFormPage/></PermissionRoute>}/>
        <Route path="markets/:id" element={<PermissionRoute permission="markets.view"><MarketDetailPage/></PermissionRoute>}/>
        <Route path="markets/:id/edit" element={<PermissionRoute permission="markets.update"><MarketFormPage/></PermissionRoute>}/>
        <Route path="settings" element={<PermissionRoute permission="settings"><SettingsPage/></PermissionRoute>}/>
      </Route>
      <Route path="*" element={<NotFoundPage/>}/>
    </Routes>
  </Suspense>
}
