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

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/ticket/:ticketId" element={<TicketPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<ProviderLayout />}>
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/setup"
          element={
            <RequireAuth>
              <SetupPage />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="/display" element={<DisplayPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
