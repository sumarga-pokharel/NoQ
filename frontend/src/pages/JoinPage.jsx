import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { api } from '../lib/api'
import { getBrowserNotificationStatus, requestBrowserNotifications } from '../lib/browserNotifications'
import { useOfficeRealtime } from '../hooks/useOfficeRealtime'
import FormError from '../components/FormError'
import AsyncState from '../components/AsyncState'
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
  const [notificationPermission, setNotificationPermission] = useState(getBrowserNotificationStatus)
  const [notifyBrowser, setNotifyBrowser] = useState(() => getBrowserNotificationStatus() === 'granted')
  const [notifySms, setNotifySms] = useState(false)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { isNp } = useLanguage()
  const navigate = useNavigate()

  const loadOffice = useCallback(() => {
    if (!officeSlug) {
      setError('Open a valid office join link to continue.')
      setLoading(false)
      return Promise.resolve()
    }
    return api(`/public/offices/${officeSlug}`)
      .then((data) => {
        setOffice(data.office)
        setServices(data.services)
        setError('')
        const preselected = searchParams.get('service')
        setServiceId((current) => {
          if (data.services.some((service) => service._id === preselected)) return preselected
          if (data.services.some((service) => service._id === current)) return current
          return data.services[0]?._id || ''
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [officeSlug, searchParams])
  useEffect(() => {
    loadOffice()
  }, [loadOffice])
  useOfficeRealtime(office?.id, loadOffice)

  useEffect(() => {
    const syncPermission = () => {
      const permission = getBrowserNotificationStatus()
      setNotificationPermission(permission)
      if (permission !== 'granted') setNotifyBrowser(false)
    }
    window.addEventListener('focus', syncPermission)
    document.addEventListener('visibilitychange', syncPermission)
    return () => {
      window.removeEventListener('focus', syncPermission)
      document.removeEventListener('visibilitychange', syncPermission)
    }
  }, [])

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
      const notificationPermission = notifyBrowser ? await requestBrowserNotifications() : 'denied'
      const browserAlertsEnabled = notificationPermission === 'granted'
      setNotificationPermission(notificationPermission)
      if (notifyBrowser && !browserAlertsEnabled) setNotifyBrowser(false)

      const result = await api(`/public/offices/${officeSlug}/tickets`, {
        method: 'POST',
        body: {
          serviceId,
          priority,
          documents: docs.map((doc) => ({ name: doc.name, confirmed: checked.has(doc.name) })),
          phone: notifySms ? phone : '',
          notifyBrowser: browserAlertsEnabled,
          notifySms,
        },
      })
      navigate(`/ticket/${result.ticket._id}`)
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleBrowserNotifications = async (enabled) => {
    if (!enabled) {
      setNotifyBrowser(false)
      return
    }

    const permission = await requestBrowserNotifications()
    setNotificationPermission(permission)
    if (permission === 'granted') {
      setNotifyBrowser(true)
      setError('')
    } else {
      setNotifyBrowser(false)
      setError({
        unsupported: 'Browser notifications require a supported browser over a secure HTTPS connection.',
        denied: 'Browser notifications are blocked. Enable them in this site’s browser settings to receive alerts.',
        default: 'Notification permission was not granted. You can try enabling browser alerts again.',
      }[permission] || 'Browser notifications could not be enabled.')
    }
  }

  const notificationMessage = {
    granted: 'Allowed by this browser. Alerts will work while this ticket is active.',
    denied: 'Blocked by your browser. Open this site’s settings, allow notifications, then return here.',
    unsupported: 'Unavailable in this browser. Notifications require a supported browser and a secure HTTPS connection.',
    default: 'Off until you enable it and approve the browser permission prompt.',
  }[notificationPermission]

  if (loading) return <main className="join"><AsyncState loading title="Loading office" message="Fetching available services and document requirements…" /></main>

  return (
    <main className="join">
      <div className="join__intro">
        <div className="eyebrow">{office?.officeName || 'NoQ'}</div>
        <h1>{isNp ? 'लाइनमा जोडिनुहोस्' : 'Join the queue'}</h1>
        <p>{office?.address || 'Choose a service, confirm your documents, and get a live number.'}</p>
      </div>
      <div className="card join__card">
        <FormError error={error} />
        {!office ? <AsyncState title="Office unavailable" message="We could not load this public queue." onRetry={loadOffice} /> : !office.isAcceptingJoins ? <AsyncState title="New joins are paused" message="This office is not accepting new queue entries right now. Please try again shortly." onRetry={loadOffice} /> : !services.length ? <AsyncState title="No services available" message="This office has not published an active service yet." onRetry={loadOffice} /> : <>
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
            <div className="join__docs">{docs.map((doc) => <label key={doc._id || doc.name} className="join__doc"><input type="checkbox" checked={checked.has(doc.name)} onChange={() => toggleDoc(doc.name)} />{doc.name}{doc.required === false && <span> (optional)</span>}</label>)}</div>
            <label className="join__toggle-row"><div><div className="join__toggle-title">Do you need priority?</div><div className="join__toggle-sub">Senior citizens, pregnant women and people with disability.</div></div><input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} /></label>
            <label className={`join__toggle-row join__notification-${notificationPermission}`}><div><div className="join__toggle-title">Notify me in this browser</div><div className="join__toggle-sub">{notificationMessage}</div></div><input type="checkbox" checked={notifyBrowser} disabled={notificationPermission === 'denied' || notificationPermission === 'unsupported'} onChange={(e) => toggleBrowserNotifications(e.target.checked)} /></label>
            <label className="join__toggle-row"><div><div className="join__toggle-title">Send me an SMS</div></div><input type="checkbox" checked={notifySms} onChange={(e) => setNotifySms(e.target.checked)} /></label>
            {notifySms && <div className="field"><label htmlFor="phone">Mobile number</label><input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>}
            <div className="join__actions"><button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Back</button><button type="button" className="btn btn-primary btn-block" onClick={submit} disabled={submitting}>{submitting ? 'Joining…' : 'Get my token'}</button></div>
          </>}
        </>}
      </div>
    </main>
  )
}
