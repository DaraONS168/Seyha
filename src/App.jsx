import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/common/ProtectedRoute'
import AdminRoute from './components/common/AdminRoute'
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

export default function App() {
  return <Suspense fallback={<LoadingState label="កំពុងបើកទំព័រ..."/>}>
    <Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route element={<ProtectedRoute><DashboardLayout/></ProtectedRoute>}>
        <Route index element={<DashboardPage/>}/>
        <Route path="customers" element={<CustomersPage/>}/>
        <Route path="customers/:id" element={<CustomerDetailPage/>}/>
        <Route path="follow-ups" element={<FollowUpsPage/>}/>
        <Route path="visit-plans" element={<VisitPlansPage/>}/>
        <Route path="calls" element={<CallHistoryPage/>}/>
        <Route path="reports" element={<ReportsPage/>}/>
        <Route path="sales" element={<AdminRoute><SalesTeamPage/></AdminRoute>}/>
        <Route path="notifications" element={<NotificationsPage/>}/>
        <Route path="settings" element={<AdminRoute><SettingsPage/></AdminRoute>}/>
      </Route>
      <Route path="*" element={<NotFoundPage/>}/>
    </Routes>
  </Suspense>
}
