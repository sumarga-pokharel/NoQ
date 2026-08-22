import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import './JoinPage.css'

const SERVICES = [
  { id: 'tax', name: 'Property tax payment', wait: 'about 8 min each' },
  { id: 'rec', name: 'Recommendation letter', wait: 'about 5 min each' },
  { id: 'birth', name: 'Birth / death registration', wait: 'about 12 min each' },
  { id: 'land', name: 'Land ownership transfer', wait: 'about 20 min each' },
]

const DOCS = ['Citizenship certificate (original)', 'Photocopy of citizenship', "Last year's tax receipt"]

let ticketSeed = 24

export default function JoinPage() {
  const [step, setStep] = useState(1)
  const [serviceId, setServiceId] = useState(SERVICES[0].id)
  const [checked, setChecked] = useState(() => new Set())
  const [priority, setPriority] = useState(false)
  const [notifyBrowser, setNotifyBrowser] = useState(true)
  const [notifySms, setNotifySms] = useState(false)
  const [phone, setPhone] = useState('')
  const { isNp } = useLanguage()
  const navigate = useNavigate()

  const service = SERVICES.find((s) => s.id === serviceId)

  const toggleDoc = (doc) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(doc)) next.delete(doc)
      else next.add(doc)
      return next
    })
  }

  const submit = () => {
    ticketSeed += 1
    const token = `B-${ticketSeed}`
    navigate(`/ticket/${token}`, {
      state: {
        token,
        service: service.name,
        office: 'Ward 16 Office, Lalitpur',
        ahead: 6,
        priority,
      },
    })
  }

  return (
    <main className="join">
      <div className="join__intro">
        <div className="eyebrow">Ward 16 Office, Lalitpur</div>
        <h1>{isNp ? 'लाइनमा जोडिनुहोस्' : 'Join the queue'}</h1>
        <p>
          {isNp
            ? 'तपाईंले मुख्य ढोकाको QR स्क्यान गर्नुभयो। तल तपाईंको सेवा र कागजातहरू भर्नुहोस्।'
            : 'This mirrors the QR you would scan at the gate. Pick a service, confirm your documents, and get a live number.'}
        </p>
      </div>

      <div className="card join__card">
        <div className="join__steps">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`join__step ${step >= n ? 'on' : ''}`}>
              {n}
            </span>
          ))}
        </div>

        {step === 1 && (
          <>
            <h2>What do you need today?</h2>
            <div className="join__service-list">
              {SERVICES.map((s) => (
                <label key={s.id} className={`join__service ${serviceId === s.id ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="service"
                    checked={serviceId === s.id}
                    onChange={() => setServiceId(s.id)}
                  />
                  <span className="join__service-radio" aria-hidden="true" />
                  <span>
                    <div className="join__service-name">{s.name}</div>
                    <div className="join__service-wait">{s.wait}</div>
                  </span>
                </label>
              ))}
            </div>
            <button type="button" className="btn btn-primary btn-block" onClick={() => setStep(2)}>
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Bring these with you</h2>
            <div className="join__docs">
              {DOCS.map((doc) => (
                <label key={doc} className="join__doc">
                  <input type="checkbox" checked={checked.has(doc)} onChange={() => toggleDoc(doc)} />
                  {doc}
                </label>
              ))}
            </div>

            <label className="join__toggle-row">
              <div>
                <div className="join__toggle-title">Do you need priority?</div>
                <div className="join__toggle-sub">Senior citizens, pregnant women and people with disability.</div>
              </div>
              <input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} />
            </label>

            <label className="join__toggle-row">
              <div>
                <div className="join__toggle-title">Notify me in this browser</div>
                <div className="join__toggle-sub">Free, works while this page is closed</div>
              </div>
              <input type="checkbox" checked={notifyBrowser} onChange={(e) => setNotifyBrowser(e.target.checked)} />
            </label>

            <label className="join__toggle-row">
              <div>
                <div className="join__toggle-title">Send me an SMS instead</div>
                <div className="join__toggle-sub">Useful with no data connection</div>
              </div>
              <input type="checkbox" checked={notifySms} onChange={(e) => setNotifySms(e.target.checked)} />
            </label>

            {notifySms && (
              <div className="field">
                <label htmlFor="phone">Mobile number</label>
                <div className="join__phone-input">
                  <span>+977</span>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="98XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="join__actions">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="btn btn-primary btn-block" onClick={submit}>
                Get my token
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
