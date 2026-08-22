import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useOfficeRealtime } from '../hooks/useOfficeRealtime'
import AsyncState from '../components/AsyncState'
import './DisplayPage.css'

export default function DisplayPage() {
  const { officeSlug: routeSlug } = useParams()
  const [searchParams] = useSearchParams()
  const slug = routeSlug || searchParams.get('office') || import.meta.env.VITE_DEMO_OFFICE_SLUG
  const [now, setNow] = useState(() => new Date())
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const refresh = useCallback(() => {
    if (!slug) return setError('Open a valid office display link.')
    api(`/public/offices/${slug}/display`).then((result) => { setData(result); setError('') }).catch((err) => setError(err.message))
  }, [slug])

  useEffect(() => {
    refresh()
    const clock = setInterval(() => setNow(new Date()), 1000)
    const poll = setInterval(refresh, 5000)
    return () => { clearInterval(clock); clearInterval(poll) }
  }, [refresh])
  useOfficeRealtime(data?.office?.id, refresh)

  if (!data) return <div className="board"><AsyncState tone="dark" loading={!error} title={error ? 'Display board unavailable' : 'Loading display board'} message={error || 'Connecting to the live office queue…'} onRetry={error ? refresh : undefined} /></div>
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const date = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })

  return <div className="board">
    {error && <div className="board__retry" role="alert"><span>{error}</span><button type="button" className="btn btn-secondary btn-sm" onClick={refresh}>Retry</button></div>}
    <div className="board__header"><div><div className="board__office-np">NoQ · लाइभ लाइन</div><div className="board__office-en">{data.office.officeName}</div></div><div className="board__clock"><div className="board__time">{time}</div><div className="board__date">{date}</div></div></div>
    {!data.counters.length && <AsyncState tone="dark" title="No counters configured" message="The office will appear here after staff add a counter." />}\n    <div className="board__counters">{data.counters.map((counter) => <div className={`board__counter board__counter--${counter.currentTicket ? 'default' : 'open'}`} key={counter._id}><div className="board__counter-label">{counter.name}</div>{counter.currentTicket ? <div className="board__counter-token">{counter.currentTicket.token}</div> : <div className="board__counter-token board__counter-token--empty">खाली</div>}<div className="board__counter-note">{counter.currentTicket ? 'Please come · कृपया आउनुहोस्' : 'Open'}</div></div>)}</div>
    <div className="board__tiles"><div className="board__tile"><span className="board__tile-val">{data.servingCount}</span><span className="board__tile-label">अहिले सेवा<br />Being served</span></div><div className="board__tile"><span className="board__tile-val">{data.waitingCount}</span><span className="board__tile-label">लाइनमा<br />Waiting in queue</span></div><div className="board__tile board__tile--wide"><span className="board__tile-dot" /><span className="board__tile-label board__tile-label--light">कृपया आफ्नो कागजात तयार राख्नुहोस्<br /><span>Please keep your documents ready.</span></span></div></div>
    <div className="board__footer"><div><div className="board__next-label">क्रमै पालो · Next up</div><div className="board__next-list">{data.nextUp.map((ticket) => <span key={ticket}>{ticket}</span>)}</div></div><div className="board__scan"><div className="board__scan-text">फोनमा पालो हेर्नुहोस्<br /><span>{`${window.location.origin}/join/${slug}`}</span></div><div className="board__scan-code" aria-hidden="true" /></div></div>
  </div>
}
