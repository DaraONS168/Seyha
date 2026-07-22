import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/common/ProtectedRoute'
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
const ExpenseDashboardPage = lazy(() => import('./pages/ExpenseDashboardPage'))
const ProvincialBudgetsPage = lazy(() => import('./pages/ProvincialBudgetsPage'))
const ExpenseRequestsPage = lazy(() => import('./pages/ExpenseRequestsPage'))
const ExpenseRequestFormPage = lazy(() => import('./pages/ExpenseRequestFormPage'))
const ExpenseRequestDetailPage = lazy(() => import('./pages/ExpenseRequestDetailPage'))
const FuelExpensesPage = lazy(() => import('./pages/FuelExpensesPage'))
const FuelBudgetsPage = lazy(() => import('./pages/FuelBudgetsPage'))

export default function App() {
  return <Suspense fallback={<LoadingState label="កំពុងបើកទំព័រ..."/>}>
    <Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route element={<ProtectedRoute><DashboardLayout/></ProtectedRoute>}>
        <Route index element={<PermissionRoute permission="dashboard.view"><DashboardPage/></PermissionRoute>}/>
        <Route path="customers" element={<PermissionRoute permission="customers.view"><CustomersPage/></PermissionRoute>}/>
        <Route path="customers/:id" element={<PermissionRoute permission="customers.view"><CustomerDetailPage/></PermissionRoute>}/>
        <Route path="follow-ups" element={<PermissionRoute permission="follow_ups.view"><FollowUpsPage/></PermissionRoute>}/>
        <Route path="visit-plans" element={<PermissionRoute permission="visit_plans.view"><VisitPlansPage/></PermissionRoute>}/>
        <Route path="calls" element={<PermissionRoute permission="calls.view"><CallHistoryPage/></PermissionRoute>}/>
        <Route path="reports" element={<PermissionRoute permission="reports.view"><ReportsPage/></PermissionRoute>}/>
        <Route path="sales" element={<PermissionRoute permission="sales_team.view"><SalesTeamPage/></PermissionRoute>}/>
        <Route path="notifications" element={<PermissionRoute permission="notifications.view"><NotificationsPage/></PermissionRoute>}/>
        <Route path="users" element={<PermissionRoute permission="users.view"><UserManagementPage/></PermissionRoute>}/>
        <Route path="markets" element={<PermissionRoute permission="markets.view"><MarketsPage/></PermissionRoute>}/>
        <Route path="markets/new" element={<PermissionRoute permission="markets.create"><MarketFormPage/></PermissionRoute>}/>
        <Route path="markets/:id" element={<PermissionRoute permission="markets.view"><MarketDetailPage/></PermissionRoute>}/>
        <Route path="markets/:id/edit" element={<PermissionRoute permission="markets.update"><MarketFormPage/></PermissionRoute>}/>
        <Route path="expenses" element={<PermissionRoute permission="expenses.view"><ExpenseDashboardPage/></PermissionRoute>}/>
        <Route path="expenses/budgets" element={<PermissionRoute permission="expenses.budgets.view"><ProvincialBudgetsPage/></PermissionRoute>}/>
        <Route path="expenses/requests" element={<PermissionRoute permission="expenses.view"><ExpenseRequestsPage/></PermissionRoute>}/>
        <Route path="expenses/requests/new" element={<PermissionRoute permission="expenses.create"><ExpenseRequestFormPage/></PermissionRoute>}/>
        <Route path="expenses/requests/:id" element={<PermissionRoute permission="expenses.view"><ExpenseRequestDetailPage/></PermissionRoute>}/>
        <Route path="expenses/requests/:id/edit" element={<PermissionRoute permission="expenses.create"><ExpenseRequestFormPage/></PermissionRoute>}/>
        <Route path="expenses/fuel" element={<PermissionRoute permission="fuel.view"><FuelExpensesPage/></PermissionRoute>}/>
        <Route path="expenses/fuel/budgets" element={<PermissionRoute permission="fuel.budgets.view"><FuelBudgetsPage/></PermissionRoute>}/>
        <Route path="settings" element={<PermissionRoute permission="settings.view"><SettingsPage/></PermissionRoute>}/>
      </Route>
      <Route path="*" element={<NotFoundPage/>}/>
    </Routes>
  </Suspense>
}
