import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './auth-forms.css'

const SECTORS = [
  { id: 'government', label: 'Government office' },
  { id: 'hospital', label: 'Hospital' },
  { id: 'bank', label: 'Bank' },
  { id: 'other', label: 'Other service' },
]

export default function SignupPage() {
  const [officeName, setOfficeName] = useState('')
  const [sector, setSector] = useState('government')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!officeName || !email || !password) {
      setError('Fill in your office name, email and a password to continue.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await signup({ officeName, sector, email, phone, password })
      navigate('/setup', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Set up your counter</h1>
      <p className="auth-form__lede">Three minutes, no hardware to buy. Free under 60 tokens a day.</p>

      {error && <div className="auth-form__error">{error}</div>}

      <div className="field">
        <label htmlFor="officeName">Office / branch name</label>
        <input
          id="officeName"
          placeholder="e.g. Ward 16 Office, Lalitpur"
          value={officeName}
          onChange={(e) => setOfficeName(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="sector">What kind of service is this?</label>
        <select id="sector" value={sector} onChange={(e) => setSector(e.target.value)}>
          {SECTORS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="auth-form__row">
        <div className="field">
          <label htmlFor="email">Work email</label>
          <input id="email" type="email" placeholder="you@office.gov.np" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" type="tel" placeholder="98XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Create office account'}
      </button>

      <p className="auth-form__switch">
        Already set up? <Link to="/login">Log in</Link>
      </p>
    </form>
  )
}
