import { useEffect, useState } from 'react'
import './DisplayPage.css'

const COUNTERS = [
  { label: 'Counter 1', token: 'B-17', note: 'Property tax', variant: 'default' },
  { label: 'Counter 2', token: 'R-63', note: 'Recommendation letter', variant: 'default' },
  { label: 'Counter 3', token: 'B-22', note: 'Please come · कृपया आउनुहोस्', variant: 'call' },
  { label: 'Counter 4', token: null, note: 'Open — walk up', variant: 'open' },
]

const NEXT_UP = ['B-23', 'B-24', 'R-64', 'L-08', 'B-25']

export default function DisplayPage() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const date = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="board">
      <div className="board__header">
        <div>
          <div className="board__office-np">वडा १६ कार्यालय, ललितपुर</div>
          <div className="board__office-en">Ward 16 Office, Lalitpur</div>
        </div>
        <div className="board__clock">
          <div className="board__time">{time}</div>
          <div className="board__date">{date}</div>
        </div>
      </div>

      <div className="board__counters">
        {COUNTERS.map((c) => (
          <div className={`board__counter board__counter--${c.variant}`} key={c.label}>
            <div className="board__counter-label">{c.label}</div>
            {c.token ? <div className="board__counter-token">{c.token}</div> : <div className="board__counter-token board__counter-token--empty">खाली</div>}
            <div className="board__counter-note">{c.note}</div>
          </div>
        ))}
      </div>

      <div className="board__tiles">
        <div className="board__tile">
          <span className="board__tile-val">२२</span>
          <span className="board__tile-label">
            मिनेट औसत प्रतीक्षा
            <br />
            Average wait now
          </span>
        </div>
        <div className="board__tile">
          <span className="board__tile-val">३७</span>
          <span className="board__tile-label">
            लाइनमा
            <br />
            Waiting in queue
          </span>
        </div>
        <div className="board__tile board__tile--wide">
          <span className="board__tile-dot" />
          <span className="board__tile-label board__tile-label--light">
            कागजात नपुगेका व्यक्तिलाई काउन्टर ५ मा सहयोग गरिन्छ
            <br />
            <span>Missing a document? Counter 5 will help you.</span>
          </span>
        </div>
      </div>

      <div className="board__footer">
        <div>
          <div className="board__next-label">क्रमै पालो · Next up</div>
          <div className="board__next-list">
            {NEXT_UP.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
        <div className="board__scan">
          <div className="board__scan-text">
            फोनमा पालो हेर्नुहोस्
            <br />
            <span>Scan to join · noq.com.np/w16</span>
          </div>
          <div className="board__scan-code" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
