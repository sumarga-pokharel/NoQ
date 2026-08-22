import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { api } from '../lib/api'
import './JoinPage.css'

export default function JoinPage() {
  const { officeSlug: routeSlug } = useParams()
  const [searchParams] = useSearchParams()
  const officeSlug = routeSlug || searchParams.get('office') || import.meta.env.VITE_DEMO_OFFICE_SLUG
  const [office, setOffice] = useState(null)
  const [services, setServices] = useState([])
  const [step, setStep] = useState(1)
  const [serviceId, setServiceId] = useState('')
  const [checked, setChecked] = useState(() => new Set())
  const [priority, setPriority] = useState(false)
  const [notifyBrowser, setNotifyBrowser] = useState(true)
  const [notifySms, setNotifySms] = useState(false)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { isNp } = useLanguage()
  const navigate = useNavigate()

  useEffect(() => {
    if (!officeSlug) {
      setError('Open a valid office join link to continue.')
      setLoading(false)
      return
    }
    api(`/public/offices/${officeSlug}`)
      .then((data) => {
        setOffice(data.office)
        setServices(data.services)
        setServiceId(data.services[0]?._id || '')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [officeSlug])

  const selectedService = services.find((service) => service._id === serviceId)
  const docs = office?.requiredDocuments || []
  const toggleDoc = (name) => setChecked((current) => {
    const next = new Set(current)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    return next
  })

  const submit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const result = await api(`/public/offices/${officeSlug}/tickets`, {
        method: 'POST',
        body: {
          serviceId,
          priority,
          documents: docs.map((doc) => ({ name: doc.name, confirmed: checked.has(doc.name) })),
          phone: notifySms ? phone : '',
          notifyBrowser,
          notifySms,
        },
      })
      navigate(`/ticket/${result.ticket._id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <main className="join"><p>Loading office…</p></main>

  return (
    <main className="join">
      <div className="join__intro">
        <div className="eyebrow">{office?.officeName || 'NoQ'}</div>
        <h1>{isNp ? 'लाइनमा जोडिनुहोस्' : 'Join the queue'}</h1>
        <p>{office?.address || 'Choose a service, confirm your documents, and get a live number.'}</p>
      </div>
      <div className="card join__card">
        {error && <div role="alert" className="auth-form__error">{error}</div>}
        {!office ? <p>This office could not be loaded.</p> : !office.isAcceptingJoins ? <p>This office has paused new joins.</p> : <>
          <div className="join__steps">{[1, 2].map((n) => <span key={n} className={`join__step ${step >= n ? 'on' : ''}`}>{n}</span>)}</div>
          {step === 1 && <>
            <h2>What do you need today?</h2>
            <div className="join__service-list">{services.map((service) => (
              <label key={service._id} className={`join__service ${serviceId === service._id ? 'selected' : ''}`}>
                <input type="radio" name="service" checked={serviceId === service._id} onChange={() => setServiceId(service._id)} />
                <span className="join__service-radio" aria-hidden="true" />
                <span><div className="join__service-name">{service.name}</div><div className="join__service-wait">about {service.avgMinutes} min each</div></span>
              </label>
            ))}</div>
            <button type="button" className="btn btn-primary btn-block" disabled={!selectedService} onClick={() => setStep(2)}>Continue</button>
          </>}
          {step === 2 && <>
            <h2>Bring these with you</h2>
            <div className="join__docs">{docs.map((doc) => <label key={doc._id || doc.name} className="join__doc"><input type="checkbox" checked={checked.has(doc.name)} onChange={() => toggleDoc(doc.name)} />{doc.name}</label>)}</div>
            <label className="join__toggle-row"><div><div className="join__toggle-title">Do you need priority?</div><div className="join__toggle-sub">Senior citizens, pregnant women and people with disability.</div></div><input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} /></label>
            <label className="join__toggle-row"><div><div className="join__toggle-title">Notify me in this browser</div></div><input type="checkbox" checked={notifyBrowser} onChange={(e) => setNotifyBrowser(e.target.checked)} /></label>
            <label className="join__toggle-row"><div><div className="join__toggle-title">Send me an SMS</div></div><input type="checkbox" checked={notifySms} onChange={(e) => setNotifySms(e.target.checked)} /></label>
            {notifySms && <div className="field"><label htmlFor="phone">Mobile number</label><input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>}
            <div className="join__actions"><button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Back</button><button type="button" className="btn btn-primary btn-block" onClick={submit} disabled={submitting}>{submitting ? 'Joining…' : 'Get my token'}</button></div>
          </>}
        </>}
      </div>
    </main>
  )
}
