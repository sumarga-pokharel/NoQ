import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './SetupPage.css'

const SECTORS = [
  { id: 'government', title: 'Government office', color: '#1b4d3e', desc: 'Ward offices, transport, land revenue, passport. Document checks on, priority for senior citizens on.' },
  { id: 'hospital', title: 'Hospital', color: '#2a4c8f', desc: 'Emergency jumps the queue, OPD by department, lab and pharmacy as separate lines.' },
  { id: 'bank', title: 'Bank', color: '#7a5210', desc: 'Teller, remittance, loan and KYC desks with multi-counter balancing on by default.' },
  { id: 'other', title: 'Other service', color: '#8a3e52', desc: 'Restaurants, salons, workshops, ticket counters. Party size instead of documents.' },
]

const STEPS = ['Service type', 'Services', 'Documents', 'Publish']

export default function SetupPage() {
  const { provider, completeOnboarding } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [sector, setSector] = useState(provider?.sector || 'government')
  const [services, setServices] = useState([
    { name: 'Property tax payment', minutes: 8, prefix: 'B' },
    { name: 'Recommendation letter', minutes: 5, prefix: 'R' },
  ])
  const [newService, setNewService] = useState({ name: '', minutes: '', prefix: '' })
  const [docs, setDocs] = useState(['Citizenship certificate (original)', 'Photocopy of citizenship'])
  const [newDoc, setNewDoc] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const addService = () => {
    if (!newService.name.trim()) return
    setServices((s) => [
      ...s,
      {
        name: newService.name.trim(),
        minutes: Number(newService.minutes) || 5,
        prefix: (newService.prefix || newService.name[0] || 'S').toUpperCase().slice(0, 1),
      },
    ])
    setNewService({ name: '', minutes: '', prefix: '' })
  }

  const removeService = (name) => setServices((s) => s.filter((svc) => svc.name !== name))

  const addDoc = () => {
    if (!newDoc.trim()) return
    setDocs((d) => [...d, newDoc.trim()])
    setNewDoc('')
  }

  const removeDoc = (doc) => setDocs((d) => d.filter((x) => x !== doc))

  const finish = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await completeOnboarding({ sector, services, requiredDocuments: docs })
      navigate('/dashboard')
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="setup">
      <div className="setup__stepper">
        {STEPS.map((label, i) => (
          <div key={label} className={`setup__stepper-item ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <span className="setup__stepper-num">{i < step ? '✓' : i + 1}</span>
            {label}
          </div>
        ))}
      </div>

      <div className="setup__panel">
        {step === 0 && (
          <>
            <h1>What kind of service is this?</h1>
            <p className="setup__lede">Your choice sets the service list, the document rules and how the queue is ordered.</p>
            <div className="setup__sector-grid">
              {SECTORS.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  className={`setup__sector-card ${sector === s.id ? 'selected' : ''}`}
                  onClick={() => setSector(s.id)}
                >
                  <div className="setup__sector-top">
                    <span className="setup__sector-swatch" style={{ background: s.color }} />
                    <span className="setup__sector-radio" />
                  </div>
                  <div className="setup__sector-title">{s.title}</div>
                  <p>{s.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1>Services running today</h1>
            <p className="setup__lede">
              The average time per person drives every estimate. Start with a default — NoQ corrects it from real service
              times.
            </p>
            <div className="setup__table card">
              <div className="setup__table-head">
                <span>Service</span>
                <span>Avg per person</span>
                <span>Prefix</span>
                <span />
              </div>
              {services.map((s) => (
                <div className="setup__table-row" key={s.name}>
                  <span>{s.name}</span>
                  <span>{s.minutes} min</span>
                  <span>{s.prefix}</span>
                  <button type="button" className="setup__row-remove" onClick={() => removeService(s.name)} aria-label={`Remove ${s.name}`}>
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="setup__add-row">
              <input placeholder="Service name" value={newService.name} onChange={(e) => setNewService((v) => ({ ...v, name: e.target.value }))} />
              <input placeholder="Min" type="number" value={newService.minutes} onChange={(e) => setNewService((v) => ({ ...v, minutes: e.target.value }))} />
              <input placeholder="Prefix" maxLength={1} value={newService.prefix} onChange={(e) => setNewService((v) => ({ ...v, prefix: e.target.value }))} />
              <button type="button" className="btn btn-secondary" onClick={addService}>
                + Add
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1>Required documents</h1>
            <p className="setup__lede">Visitors see this list the moment they scan, in their language.</p>
            <div className="card setup__docs">
              {docs.map((doc) => (
                <div className="setup__doc-row" key={doc}>
                  <span>{doc}</span>
                  <button type="button" className="setup__row-remove" onClick={() => removeDoc(doc)} aria-label={`Remove ${doc}`}>
                    ✕
                  </button>
                </div>
              ))}
              {!docs.length && <div className="setup__docs-empty">No documents required yet.</div>}
            </div>
            <div className="setup__add-row setup__add-row--doc">
              <input placeholder="Add another document…" value={newDoc} onChange={(e) => setNewDoc(e.target.value)} />
              <button type="button" className="btn btn-secondary" onClick={addDoc}>
                Add
              </button>
            </div>
            <div className="setup__note">
              Turning a document on means a visitor cannot be marked ready without it. Staff can override at the counter.
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1>Publish your QR</h1>
            <p className="setup__lede">The link never expires — the poster stays on the wall and picks up whatever you publish.</p>
            <div className="setup__publish">
              <div className="setup__qr" aria-hidden="true" />
              <div>
                <div className="setup__publish-office">{provider?.officeName || 'Your office'}</div>
                <div className="setup__publish-url">noq.com.np/{(provider?.officeName || 'your-office').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 18)}</div>
                <div className="setup__publish-summary">
                  {services.length} service{services.length === 1 ? '' : 's'} · {docs.length} document{docs.length === 1 ? '' : 's'} required ·{' '}
                  {SECTORS.find((s) => s.id === sector)?.title}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="setup__actions">
          {saveError && <span role="alert">{saveError}</span>}
          <button type="button" className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
              Continue
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={finish} disabled={saving}>
              {saving ? 'Publishing…' : 'Finish setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
