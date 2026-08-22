import { Link, Outlet } from 'react-router-dom'
import Logo from '../components/Logo'
import './AuthLayout.css'

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <Link to="/" className="auth-shell__brand">
        <Logo />
      </Link>
      <div className="auth-shell__panel">
        <Outlet />
      </div>
      <p className="auth-shell__back">
        <Link to="/">← Back to noq.com.np</Link>
      </p>
    </div>
  )
}
