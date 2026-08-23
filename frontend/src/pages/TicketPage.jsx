import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useOfficeRealtime } from '../hooks/useOfficeRealtime'
import { useTicketLocation } from '../hooks/useTicketLocation'
import { notifyForTicket } from '../lib/browserNotifications'
import { readTicketCache, writeTicketCache } from '../lib/ticketCache'
import AsyncState from '../components/AsyncState'
import LocationMap from '../components/LocationMap'
import { formatEstimateWindow } from '../lib/estimateWindow'
import './TicketPage.css'

export default function TicketPage() {
  const { ticketId } = useParams()
  const cachedTicket = readTicketCache(ticketId)
  const [data, setData] = useState(() => cachedTicket?.data || null)
  const [lastUpdated, setLastUpdated] = useState(() => cachedTicket?.savedAt || null)
  const [offline, setOffline] = useState(() => !navigator.onLine)
  const hasData = useRef(Boolean(cachedTicket?.data))
  const [error, setError] = useState('')
  const [action, setAction] = useState('')

  const refresh = useCallback(() => api(`/public/tickets/${ticketId}`).then((result) => {
    hasData.current = true
    setData(result)
    setLastUpdated(writeTicketCache(ticketId, result))
    setOffline(false)
    setError('')
  }).catch((err) => {
    const connectionFailed = !navigator.onLine || err instanceof TypeError
    setOffline(connectionFailed)
    if (!connectionFailed || !hasData.current) setError(connectionFailed ? 'You are offline and no saved copy of this ticket is available yet.' : err.message)
  }), [ticketId])
  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 5000)
    const wentOffline = () => setOffline(true)
    const cameOnline = () => { setOffline(false); refresh() }
    window.addEventListener('offline', wentOffline)
    window.addEventListener('online', cameOnline)
    return () => {
      clearInterval(timer)
      window.removeEventListener('offline', wentOffline)
      window.removeEventListener('online', cameOnline)
    }
  }, [refresh])
  useOfficeRealtime(data?.ticket?.provider, refresh)
  const ticketActive = !data || !['done', 'no-show', 'left'].includes(data.ticket.status)
  const location = useTicketLocation(ticketId, ticketActive && !offline)
  useEffect(() => {
    if (data) notifyForTicket(data)
  }, [data])

  const update = async (name) => {
    setAction(name)
    setError('')
    try {
      const result = await api(`/public/tickets/${ticketId}/${name}`, { method: 'PATCH' })
      const next = { ...data, ticket: result.ticket }
      setData(next)
      setLastUpdated(writeTicketCache(ticketId, next))
    } catch (err) {
      setError(err.message)
    } finally {
      setAction('')
    }
  }

  if (error && !data) return <main className="ticket"><div className="card ticket__card"><AsyncState title="Ticket unavailable" message={error} onRetry={refresh} /><Link to="/join" className="btn btn-ghost">Join a different queue</Link></div></main>
  if (!data) return <main className="ticket"><AsyncState loading title="Loading your live ticket" message="Connecting to the office queue…" /></main>

  const { ticket, office, position, estimate, nowServing, travel } = data
  if (ticket.status === 'left') return <main className="ticket ticket--ended"><div className="card ticket__card"><h1>You&rsquo;ve left the queue</h1><p>Token {ticket.token} has been released.</p><Link to="/join" className="btn btn-primary">Join a new queue</Link></div></main>
  if (ticket.status === 'done') {
    const finishedAt = ticket.completedAt ? new Date(ticket.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null
    return <main className="ticket ticket--ended"><div className="card ticket__card"><div className="ticket__card-icon">✓</div><h1>Your service is complete</h1><p>Token {ticket.token} for {ticket.service?.name || 'your service'} at {office.officeName}{ticket.counter?.name ? ` (${ticket.counter.name})` : ''} is done{finishedAt ? ` — served at ${finishedAt}` : ''}. Thank you for using NoQ.</p><Link to="/join" className="btn btn-primary">Join another queue</Link></div></main>
  }
  if (ticket.status === 'no-show') return <main className="ticket ticket--ended"><div className="card ticket__card"><div className="ticket__card-icon ticket__card-icon--warn">!</div><h1>You missed your turn</h1><p>Token {ticket.token} was marked as a no-show after being called and not showing up. You can rejoin the queue if you still need this service.</p><Link to="/join" className="btn btn-primary">Rejoin the queue</Link></div></main>

  return <main className="ticket"><div className="ticket__panel">
    {offline && <div className="ticket__offline" role="status"><span className="dot" /><div><strong>Offline—showing your saved ticket</strong><span>{lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. ` : ''}Updates will resume automatically when you reconnect.</span></div></div>}
    {error && <div className="ticket__retry" role="alert"><span>{error}</span><button type="button" className="btn btn-secondary btn-sm" onClick={refresh}>Retry</button></div>}
    <div className="ticket__header"><div className="eyebrow-plain">{office.officeName}</div><div className="ticket__service">{ticket.service?.name}</div>{ticket.priority && <span className="badge badge-amber">Priority</span>}</div>
    <div className="ticket__hero"><div className="eyebrow-plain ticket__hero-label">Your number</div><div className="ticket__number">{ticket.token}</div><div className="ticket__now-serving"><span className="dot" />Now serving {nowServing.join(', ') || '—'} · {position.ahead} ahead</div></div>
    <div className="card ticket__wait"><div className="ticket__wait-top"><span>Estimated wait</span><span className="ticket__updated">Updated live</span></div><div className="ticket__wait-val">{estimate.min}–{estimate.max} <span>min</span></div><div className="ticket__wait-clock">Around {formatEstimateWindow(estimate.min, estimate.max)}</div><div className="ticket__wait-bar"><div style={{ width: `${Math.min(100, position.ahead * 10)}%` }} /></div><p>Status: {ticket.status}</p></div>
    <div className="card ticket__travel"><div className="ticket__travel-map"><LocationMap office={office.location} visitor={location.sharing ? location.coords : null} />{travel && <div className="ticket__travel-map-badge">{(travel.distanceMeters / 1000).toFixed(1)} km · {travel.durationMinutes} min</div>}</div><div className="ticket__travel-body"><div className="ticket__travel-title">Getting there</div><p>{office.address || 'Address not provided'}</p>{travel && <div className={`ticket__leave-by ${travel.leaveNow ? 'ticket__leave-by--now' : ''}`}><strong>{travel.leaveNow ? 'Leave now' : `Leave by ${new Date(travel.leaveBy).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}</strong><span>{travel.source === 'google-routes' ? 'Live traffic-aware route' : 'Approximate route'} · includes a {travel.bufferMinutes}-minute arrival buffer</span></div>}{travel?.warning && <p className="ticket__route-warning">{travel.warning}</p>}{!travel && location.sharing && <p>Calculating your route…</p>}{location.locationError && <p role="alert" className="ticket__location-error">{location.locationError}</p>}<button type="button" className={`btn ${location.sharing ? 'btn-ghost' : 'btn-secondary'} btn-block`} onClick={location.sharing ? location.stop : location.start}>{location.sharing ? 'Stop sharing location' : 'Share my live location'}</button>{location.sharing && <p className="ticket__location-status"><span className="dot" /> Sharing only while this page is open{location.lastUpdated ? ` · updated ${location.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</p>}{office.location?.lat && <a className="btn btn-secondary btn-block" href={`https://www.google.com/maps/dir/?api=1&destination=${office.location.lat},${office.location.lng}`} target="_blank" rel="noreferrer">Open directions</a>}</div></div>
    <div className="card ticket__hold"><button type="button" className="btn btn-ghost btn-block ticket__hold-btn" onClick={() => update('hold')} disabled={offline || Boolean(ticket.heldAt) || action === 'hold'}>{ticket.heldAt ? 'Place held' : action === 'hold' ? 'Holding…' : 'Hold my place'}</button><p>{offline ? 'Reconnect before changing your place in the queue.' : 'Stuck in traffic? Let the office know you are briefly away.'}</p></div>
    <button type="button" className="ticket__leave" onClick={() => update('leave')} disabled={offline || action === 'leave'}>{action === 'leave' ? 'Leaving…' : 'Leave the queue'}</button>
  </div></main>
}
