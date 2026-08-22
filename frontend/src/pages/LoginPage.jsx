import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './auth-forms.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Enter your email and password to continue.')
      return
    }
    login({ email })
    navigate(location.state?.from || '/dashboard', { replace: true })
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Log in to your office</h1>
      <p className="auth-form__lede">Manage counters, services and your queue.</p>

      {error && <div className="auth-form__error">{error}</div>}

      <div className="field">
        <label htmlFor="email">Work email</label>
        <input id="email" type="email" placeholder="you@office.gov.np" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <p className="auth-form__hint">
        The backend isn&rsquo;t connected yet — logging in creates a local demo session in this browser so you can preview
        the Dashboard and Setup screens.
      </p>

      <button type="submit" className="btn btn-primary btn-block">
        Log in
      </button>

      <p className="auth-form__switch">
        New to NoQ? <Link to="/signup">Set up your counter</Link>
      </p>
    </form>
  )
}
