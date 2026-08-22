import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import FormError from '../components/FormError'
import './auth-forms.css'

export default function AccountPage() {
  const { provider, changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) return setError('New passwords do not match.')
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const result = await changePassword({ currentPassword, newPassword })
      setMessage(result.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) { setError(err) }
    finally { setSubmitting(false) }
  }

  return <div className="account-page"><div><h1>Account security</h1><p>Signed in as {provider.email}</p></div><form className="card auth-form account-page__form" onSubmit={submit}><h2>Change password</h2><FormError error={error} />{message && <div className="auth-form__notice" role="status">{message}</div>}<div className="field"><label htmlFor="currentPassword">Current password</label><input id="currentPassword" type="password" required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div><div className="field"><label htmlFor="accountNewPassword">New password</label><input id="accountNewPassword" type="password" required minLength="8" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></div><div className="field"><label htmlFor="accountConfirmPassword">Confirm new password</label><input id="accountConfirmPassword" type="password" required minLength="8" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div><button className="btn btn-primary" disabled={submitting}>{submitting ? 'Changing…' : 'Change password'}</button></form></div>
}
