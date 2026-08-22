import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useOfficeRealtime } from '../hooks/useOfficeRealtime'
import './TicketPage.css'

export default function TicketPage() {
  const { ticketId } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [action, setAction] = useState('')

  const refresh = useCallback(() => api(`/public/tickets/${ticketId}`).then(setData).catch((err) => setError(err.message)), [ticketId])
  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 5000)
    return () => clearInterval(timer)
  }, [refresh])
  useOfficeRealtime(data?.ticket?.provider, refresh)

  const update = async (name) => {
    setAction(name)
    setError('')
    try {
      const result = await api(`/public/tickets/${ticketId}/${name}`, { method: 'PATCH' })
      setData((current) => ({ ...current, ticket: result.ticket }))
    } catch (err) {
      setError(err.message)
    } finally {
      setAction('')
    }
  }

  if (error && !data) return <main className="ticket"><div className="card ticket__card"><h1>Ticket unavailable</h1><p>{error}</p><Link to="/join" className="btn btn-primary">Join a queue</Link></div></main>
  if (!data) return <main className="ticket"><p>Loading your live ticket…</p></main>

  const { ticket, office, position, estimate, nowServing } = data
  if (ticket.status === 'left') return <main className="ticket ticket--left"><div className="card ticket__card"><h1>You&rsquo;ve left the queue</h1><p>Token {ticket.token} has been released.</p><Link to="/join" className="btn btn-primary">Join a new queue</Link></div></main>

  return <main className="ticket"><div className="ticket__panel">
    {error && <div role="alert">{error}</div>}
    <div className="ticket__header"><div className="eyebrow-plain">{office.officeName}</div><div className="ticket__service">{ticket.service?.name}</div>{ticket.priority && <span className="badge badge-amber">Priority</span>}</div>
    <div className="ticket__hero"><div className="eyebrow-plain ticket__hero-label">Your number</div><div className="ticket__number">{ticket.token}</div><div className="ticket__now-serving"><span className="dot" />Now serving {nowServing.join(', ') || '—'} · {position.ahead} ahead</div></div>
    <div className="card ticket__wait"><div className="ticket__wait-top"><span>Estimated wait</span><span className="ticket__updated">Updated live</span></div><div className="ticket__wait-val">{estimate.min}–{estimate.max} <span>min</span></div><div className="ticket__wait-bar"><div style={{ width: `${Math.min(100, position.ahead * 10)}%` }} /></div><p>Status: {ticket.status}</p></div>
    <div className="card ticket__travel"><div className="ticket__travel-map">Route to {office.officeName}</div><div className="ticket__travel-body"><div className="ticket__travel-title">Getting there</div><p>{office.address || 'Address not provided'}</p>{office.location?.lat && <a className="btn btn-secondary btn-block" href={`https://www.google.com/maps/dir/?api=1&destination=${office.location.lat},${office.location.lng}`} target="_blank" rel="noreferrer">Open directions</a>}</div></div>
    <div className="card ticket__hold"><button type="button" className="btn btn-ghost btn-block ticket__hold-btn" onClick={() => update('hold')} disabled={Boolean(ticket.heldAt) || action === 'hold'}>{ticket.heldAt ? 'Place held' : action === 'hold' ? 'Holding…' : 'Hold my place'}</button><p>Stuck in traffic? Let the office know you are briefly away.</p></div>
    <button type="button" className="ticket__leave" onClick={() => update('leave')} disabled={action === 'leave'}>{action === 'leave' ? 'Leaving…' : 'Leave the queue'}</button>
  </div></main>
}
