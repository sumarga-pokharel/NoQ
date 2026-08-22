import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './DashboardPage.css'

const INITIAL_COUNTERS = [
  { id: 1, name: 'Counter 1', status: 'serving', service: 'Property tax · Ramesh Adhikari', token: 'B-17', meta: '4 min in · avg 8 min' },
  { id: 2, name: 'Counter 2', status: 'serving', service: 'Recommendation · Sita Tamang', token: 'R-63', meta: '1 min in · avg 5 min' },
  { id: 3, name: 'Counter 3', status: 'waiting', service: 'Property tax · called twice', token: 'B-22', meta: 'Auto-skip in 1:12' },
  { id: 4, name: 'Counter 4', status: 'idle', service: 'Land transfer queue is empty', token: null, meta: '11 property-tax tokens are compatible' },
]

const WAITING_LIST = [
  { token: 'B-23', name: 'Kamala Shrestha', tag: 'Senior citizen · priority', service: 'Property tax payment', wait: '14 min', docs: '3 of 3', ready: true },
  { token: 'B-24', name: '+977 98••••4412', tag: 'Arriving · 22 min away', service: 'Property tax payment', wait: '11 min', docs: '2 of 3', ready: false },
  { token: 'R-64', name: 'Bibek Gurung', tag: 'On site', service: 'Recommendation letter', wait: '9 min', docs: '2 of 2', ready: true },
  { token: 'L-08', name: 'Nirmala Bhandari', tag: 'Missing tax receipt', service: 'Land ownership transfer', wait: '7 min', docs: '1 of 4', ready: false },
]

const HOURS = [22, 48, 86, 100, 71, 34, 52, 63, 29, 14]

export default function DashboardPage() {
  const { provider } = useAuth()
  const [counters, setCounters] = useState(INITIAL_COUNTERS)

  const waitingCount = useMemo(() => WAITING_LIST.length + 33, [])

  const callNext = (id) => {
    setCounters((cs) => cs.map((c) => (c.id === id ? { ...c, status: 'serving', meta: '0 min in · avg ' + (c.meta.match(/avg (\d+)/)?.[1] || 8) + ' min' } : c)))
  }

  const skip = (id) => {
    setCounters((cs) => cs.map((c) => (c.id === id ? { ...c, status: 'idle', service: 'Waiting for next compatible token', token: null } : c)))
  }

  return (
    <div className="dash">
      <div className="dash__head">
        <div>
          <h1>Today&rsquo;s queue</h1>
          <p>{provider?.officeName || 'Your office'} · {waitingCount} waiting right now</p>
        </div>
        <div className="dash__head-actions">
          <button type="button" className="btn btn-secondary">
            Pause new joins
          </button>
          <button type="button" className="btn btn-primary">
            Add walk-in token
          </button>
        </div>
      </div>

      <div className="dash__stats">
        <div className="card dash__stat">
          <div className="eyebrow">Waiting now</div>
          <div className="dash__stat-val">{waitingCount}</div>
          <div className="dash__stat-note dash__stat-note--up">+6 in last 15 min</div>
        </div>
        <div className="card dash__stat">
          <div className="eyebrow">Average wait</div>
          <div className="dash__stat-val">
            22<span> min</span>
          </div>
          <div className="dash__stat-note dash__stat-note--down">4 min above target</div>
        </div>
        <div className="card dash__stat">
          <div className="eyebrow">Served today</div>
          <div className="dash__stat-val">148</div>
          <div className="dash__stat-note">of 210 issued</div>
        </div>
        <div className="card dash__stat">
          <div className="eyebrow">No-shows</div>
          <div className="dash__stat-val">9</div>
          <div className="dash__stat-note">6 rejoined later</div>
        </div>
        <div className="card dash__stat dash__stat--highlight">
          <div className="eyebrow">Documents ready</div>
          <div className="dash__stat-val">
            81<span>%</span>
          </div>
          <div className="dash__stat-note dash__stat-note--up">7 flagged incomplete</div>
        </div>
      </div>

      <div className="dash__counters">
        {counters.map((c) => (
          <div className="card dash__counter" key={c.id} data-status={c.status}>
            <div className="dash__counter-top">
              <span className="dash__counter-name">{c.name}</span>
              <span className={`badge badge-${c.status === 'serving' ? 'green' : c.status === 'waiting' ? 'amber' : 'neutral'}`}>
                {c.status === 'serving' ? 'Serving' : c.status === 'waiting' ? 'Waiting on visitor' : 'Idle'}
              </span>
            </div>
            <div className="dash__counter-service">{c.service}</div>
            {c.token && <div className="dash__counter-token">{c.token}</div>}
            <div className="dash__counter-meta">{c.meta}</div>
            <div className="dash__counter-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => callNext(c.id)}>
                {c.status === 'waiting' ? 'Call again' : 'Call next'}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => skip(c.id)}>
                Skip
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="dash__lower">
        <div className="card dash__waiting">
          <div className="dash__waiting-head">
            <div className="dash__waiting-title">Waiting list</div>
            <span className="badge badge-green">All {waitingCount}</span>
            <div className="dash__waiting-updated">Updated 4s ago</div>
          </div>
          <div className="dash__waiting-table">
            <div className="dash__waiting-row dash__waiting-row--head">
              <span>Token</span>
              <span>Visitor</span>
              <span>Service</span>
              <span>Waiting</span>
              <span>Documents</span>
            </div>
            {WAITING_LIST.map((w) => (
              <div className="dash__waiting-row" key={w.token}>
                <span className="dash__waiting-token">{w.token}</span>
                <span>
                  <div className="dash__waiting-name">{w.name}</div>
                  <div className={`dash__waiting-tag ${w.ready ? '' : 'alert'}`}>{w.tag}</div>
                </span>
                <span>{w.service}</span>
                <span>{w.wait}</span>
                <span>
                  <span className={`badge ${w.ready ? 'badge-green' : 'badge-red'}`}>{w.docs}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="dash__waiting-more">33 more waiting · show all</div>
        </div>

        <div className="dash__side">
          <div className="card dash__chart">
            <div className="dash__chart-title">Busiest hours</div>
            <div className="dash__chart-sub">Tokens issued, last 30 days average</div>
            <div className="dash__chart-bars">
              {HOURS.map((h, i) => (
                <div key={i} className="dash__chart-bar" style={{ height: `${h}%`, background: h > 80 ? 'var(--color-green)' : 'var(--color-green-wash-strong)' }} />
              ))}
            </div>
            <div className="dash__chart-axis">
              <span>10a</span>
              <span>12p</span>
              <span>2p</span>
              <span>4p</span>
            </div>
            <div className="dash__chart-note">Peak is 11a–12p. A third property-tax counter then would cut peak wait by about 9 minutes.</div>
          </div>

          <div className="card dash__qr">
            <div className="dash__chart-title">Today&rsquo;s QR</div>
            <div className="dash__qr-row">
              <div className="dash__qr-code" aria-hidden="true" />
              <div>
                <div className="dash__qr-url">noq.com.np/{(provider?.officeName || 'office').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16)}</div>
                <div className="dash__qr-scans">210 scans today</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
