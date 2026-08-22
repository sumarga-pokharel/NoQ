import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import FormError from '../components/FormError'
import './auth-forms.css'

export default function ResetPasswordPage() {
  const { resetToken } = useParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (password !== confirmPassword) return setError('Passwords do not match.')
    setError('')
    setSubmitting(true)
    try {
      const result = await api(`/auth/reset-password/${resetToken}`, { method: 'POST', body: { password } })
      setMessage(result.message)
      setPassword('')
      setConfirmPassword('')
    } catch (err) { setError(err) }
    finally { setSubmitting(false) }
  }

  return <form className="auth-form" onSubmit={submit}>
    <h1>Choose a new password</h1>
    <p className="auth-form__lede">Use at least eight characters. This reset link works only once.</p>
    <FormError error={error} />
    {message && <div className="auth-form__notice" role="status">{message} <Link to="/login">Log in</Link></div>}
    {!message && <><div className="field"><label htmlFor="newPassword">New password</label><input id="newPassword" type="password" required minLength="8" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div><div className="field"><label htmlFor="confirmPassword">Confirm new password</label><input id="confirmPassword" type="password" required minLength="8" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div><button className="btn btn-primary btn-block" disabled={submitting}>{submitting ? 'Resetting…' : 'Reset password'}</button></>}
  </form>
}
