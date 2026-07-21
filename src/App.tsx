import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuthStore } from '@/store/authStore'
import LoginPage from '@/pages/LoginPage'
import ChangePasswordPage from '@/pages/ChangePasswordPage'
import DashboardPage from '@/pages/DashboardPage'
import CustomersPage from '@/pages/customers/CustomersPage'
import NewCustomersPage from '@/pages/customers/NewCustomersPage'
import CustomerDetailPage from '@/pages/customers/CustomerDetailPage'
import AgentPerformancePage from '@/pages/agentPerformance/AgentPerformancePage'
import UsersPage from '@/pages/users/UsersPage'

// Blocks access to the rest of the app until a forced password change (set on freshly-seeded
// accounts) is completed — /change-password itself sits outside this gate.
function RequirePasswordChanged() {
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword)
  if (mustChangePassword) return <Navigate to="/change-password" replace />
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route element={<RequirePasswordChanged />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/new-customers" element={<NewCustomersPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/agent-performance" element={<AgentPerformancePage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
