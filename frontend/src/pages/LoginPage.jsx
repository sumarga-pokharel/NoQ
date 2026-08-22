import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FormError from '../components/FormError'
import './auth-forms.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Enter your email and password to continue.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await login({ email, password })
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Log in to your office</h1>
      <p className="auth-form__lede">Manage counters, services and your queue.</p>

      {location.state?.authReason === 'expired' && <div className="auth-form__notice" role="status">Your session expired. Log in again to continue where you left off.</div>}
      <FormError error={error} />

      <div className="field">
        <label htmlFor="email">Work email</label>
        <input id="email" type="email" placeholder="you@office.gov.np" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? 'Logging in…' : 'Log in'}
      </button>

      <p className="auth-form__forgot"><Link to="/forgot-password">Forgot your password?</Link></p>

      <p className="auth-form__switch">
        New to NoQ? <Link to="/signup">Set up your counter</Link>
      </p>
    </form>
  )
}
