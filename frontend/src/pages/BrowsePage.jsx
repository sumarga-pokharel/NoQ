import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { useLanguage } from '../context/LanguageContext'
import { api } from '../lib/api'
import AsyncState from '../components/AsyncState'
import { formatHoursRange } from '../lib/formatHours'
import { formatEstimateWindow } from '../lib/estimateWindow'
import './BrowsePage.css'

const SECTOR_LABELS = {
  government: { en: 'Government offices', np: 'सरकारी कार्यालय' },
  hospital: { en: 'Hospitals', np: 'अस्पताल' },
  bank: { en: 'Banks', np: 'बैंक' },
  other: { en: 'Other services', np: 'अन्य सेवा' },
}

const SECTOR_ORDER = ['government', 'hospital', 'bank', 'other']

function ServiceQr({ office, service }) {
  const [dataUrl, setDataUrl] = useState('')
  const joinPath = `/join/${office.slug}?service=${service._id}`
  const joinUrl = `${window.location.origin}${joinPath}`

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(joinUrl, { width: 220, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setDataUrl('')
      })
    return () => {
      cancelled = true
    }
  }, [joinUrl])

  return (
    <div className="browse__service">
      <div className="browse__service-info">
        <div className="browse__service-name">{service.name}</div>
        <div className="browse__service-meta">
          {service.category ? `${service.category} · ` : ''}
          {service.prefix} · ~{service.avgMinutes} min
          {service.isEmergency ? ' · emergency' : ''}
        </div>
        <div className="browse__service-queue">
          <strong>{service.ahead}</strong> {service.ahead === 1 ? 'person' : 'people'} ahead · about{' '}
          {service.estimate?.min}–{service.estimate?.max} min wait
          {service.estimate && (
            <span className="browse__service-clock">
              {' '}
              (around {formatEstimateWindow(service.estimate.min, service.estimate.max)})
            </span>
          )}
        </div>
        <Link to={joinPath} className="btn btn-secondary btn-sm">
          Join this line
        </Link>
      </div>
      <div className="browse__qr-block">
        {dataUrl ? (
          <img className="browse__qr" src={dataUrl} alt={`QR code for ${service.name}`} />
        ) : (
          <div className="browse__qr browse__qr--empty">QR unavailable</div>
        )}
        <div className="browse__qr-caption">
          <strong>{office.officeName}</strong>
          <span>{service.name}</span>
        </div>
      </div>
    </div>
  )
}

export default function BrowsePage() {
  const { sector } = useParams()
  const { isNp } = useLanguage()
  const [offices, setOffices] = useState([])
  const [sectors, setSectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api(`/public/directory${sector ? `?sector=${sector}` : ''}`)
      .then((data) => {
        setOffices(data.offices || [])
        setSectors(data.sectors || [])
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sector])

  if (loading) {
    return (
      <main className="browse">
        <AsyncState loading title="Loading services" message="Fetching offices and their queues…" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="browse">
        <AsyncState title="Could not load the directory" message={error} />
      </main>
    )
  }

  const counts = Object.fromEntries(sectors.map((s) => [s.sector, s.officeCount]))

  return (
    <main className="browse">
      <div className="browse__intro">
        <div className="eyebrow">{isNp ? 'सेवा खोज्नुहोस्' : 'Browse services'}</div>
        <h1>
          {sector
            ? SECTOR_LABELS[sector]?.[isNp ? 'np' : 'en'] || sector
            : isNp
              ? 'क्षेत्र छान्नुहोस्'
              : 'Pick a sector'}
        </h1>
        <p>
          {isNp
            ? 'सेवा छान्नुहोस्, QR स्क्यान गर्नुहोस् वा लिंक थिच्नुहोस् — खाता चाहिँदैन।'
            : 'Pick a service, scan its QR or tap the link. No account needed.'}
        </p>
      </div>

      <div className="browse__sectors">
        <Link className={`browse__tab ${sector ? '' : 'browse__tab--on'}`} to="/browse">
          All
        </Link>
        {SECTOR_ORDER.map((key) => (
          <Link
            key={key}
            to={`/browse/${key}`}
            className={`browse__tab ${sector === key ? 'browse__tab--on' : ''}`}
          >
            {SECTOR_LABELS[key][isNp ? 'np' : 'en']}
            {counts[key] === undefined ? '' : ` (${counts[key]})`}
          </Link>
        ))}
      </div>

      {offices.length === 0 && (
        <div className="card browse__empty">
          {isNp ? 'यो क्षेत्रमा अहिले कुनै कार्यालय छैन।' : 'No offices are listed in this sector yet.'}
        </div>
      )}

      {offices.map((office) => (
        <section className="card browse__office" key={office.id}>
          <header className="browse__office-head">
            <div>
              <h2>{office.officeName}</h2>
              <p>
                {office.address || '—'}
                {office.openTime && office.closeTime && (
                  <span className="browse__office-hours"> · {formatHoursRange(office.openTime, office.closeTime)}</span>
                )}
              </p>
            </div>
            <span className={`browse__badge ${office.isAcceptingJoins ? '' : 'browse__badge--off'}`}>
              {office.isAcceptingJoins ? 'Open' : 'Paused'}
            </span>
          </header>

          {office.requiredDocuments?.length > 0 && (
            <div className="browse__docs">
              <span>Bring:</span> {office.requiredDocuments.map((doc) => doc.name).join(', ')}
            </div>
          )}

          {office.services.length === 0 ? (
            <div className="browse__none">No services published yet.</div>
          ) : (
            <div className="browse__services">
              {office.services.map((service) => (
                <ServiceQr key={service._id} office={office} service={service} />
              ))}
            </div>
          )}
        </section>
      ))}
    </main>
  )
}
