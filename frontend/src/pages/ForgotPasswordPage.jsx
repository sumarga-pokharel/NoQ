import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import FormError from '../components/FormError'
import './auth-forms.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try { setResult(await api('/auth/forgot-password', { method: 'POST', body: { email } })) }
    catch (err) { setError(err) }
    finally { setSubmitting(false) }
  }

  return <form className="auth-form" onSubmit={submit}>
    <h1>Reset your password</h1>
    <p className="auth-form__lede">Enter your office account email. Reset links expire after 30 minutes.</p>
    <FormError error={error} />
    {result && <div className="auth-form__notice" role="status">{result.message}{result.resetUrl && <><br /><Link to={new URL(result.resetUrl).pathname}>Open development reset link</Link></>}</div>}
    <div className="field"><label htmlFor="resetEmail">Work email</label><input id="resetEmail" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
    <button className="btn btn-primary btn-block" disabled={submitting}>{submitting ? 'Sending…' : 'Send reset link'}</button>
    <p className="auth-form__switch"><Link to="/login">Back to login</Link></p>
  </form>
}
