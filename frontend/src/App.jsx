import { Route, Routes } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import PublicLayout from './layouts/PublicLayout'
import AuthLayout from './layouts/AuthLayout'
import ProviderLayout from './layouts/ProviderLayout'
import LandingPage from './pages/LandingPage'
import JoinPage from './pages/JoinPage'
import TicketPage from './pages/TicketPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import SetupPage from './pages/SetupPage'
import DashboardPage from './pages/DashboardPage'
import DisplayPage from './pages/DisplayPage'
import NotFoundPage from './pages/NotFoundPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AccountPage from './pages/AccountPage'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/join/:officeSlug" element={<JoinPage />} />
        <Route path="/ticket/:ticketId" element={<TicketPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:resetToken" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<RequireAuth><ProviderLayout /></RequireAuth>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>

      <Route path="/display" element={<DisplayPage />} />
      <Route path="/display/:officeSlug" element={<DisplayPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
