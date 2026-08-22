import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import './TicketPage.css'

export default function TicketPage() {
  const { ticketId } = useParams()
  const { state } = useLocation()
  const [held, setHeld] = useState(false)
  const [left, setLeft] = useState(false)

  const ticket = {
    token: state?.token || ticketId || 'B-24',
    service: state?.service || 'Property tax payment',
    office: state?.office || 'Ward 16 Office, Lalitpur',
    ahead: state?.ahead ?? 6,
    priority: !!state?.priority,
  }

  if (left) {
    return (
      <main className="ticket ticket--left">
        <div className="card ticket__card">
          <h1>You&rsquo;ve left the queue</h1>
          <p>Token {ticket.token} has been released. You can join again any time.</p>
          <Link to="/join" className="btn btn-primary">
            Join a new queue
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="ticket">
      <div className="ticket__panel">
        <div className="ticket__header">
          <div className="eyebrow-plain">{ticket.office}</div>
          <div className="ticket__service">{ticket.service}</div>
          {ticket.priority && <span className="badge badge-amber">Priority</span>}
        </div>

        <div className="ticket__hero">
          <div className="eyebrow-plain ticket__hero-label">Your number</div>
          <div className="ticket__number">{ticket.token}</div>
          <div className="ticket__now-serving">
            <span className="dot" />
            Now serving B-17 · {ticket.ahead} ahead
          </div>
        </div>

        <div className="card ticket__wait">
          <div className="ticket__wait-top">
            <span>Estimated wait</span>
            <span className="ticket__updated">Updated just now</span>
          </div>
          <div className="ticket__wait-val">
            18–26 <span>min</span>
          </div>
          <div className="ticket__wait-bar">
            <div style={{ width: '38%' }} />
          </div>
          <p>The range narrows as the counter moves.</p>
        </div>

        <div className="card ticket__travel">
          <div className="ticket__travel-map">Route to {ticket.office}</div>
          <div className="ticket__travel-body">
            <div className="ticket__travel-title">Getting there</div>
            <p>
              You are 6.2 km away
              <br />
              22 min by bike right now
            </p>
            <div className="ticket__leave-by">
              <strong>Leave by 2:14 PM</strong>
              <span>We will remind you 10 minutes before that.</span>
            </div>
            <button type="button" className="btn btn-secondary btn-block">
              Open directions
            </button>
          </div>
        </div>

        <div className="card ticket__hold">
          <button type="button" className="btn btn-ghost btn-block ticket__hold-btn" onClick={() => setHeld(true)} disabled={held}>
            {held ? 'Place held' : 'Hold my place'}
          </button>
          <p>Stuck in traffic? Move back 3 places without losing your turn.</p>
        </div>

        <div className="ticket__offline">
          <span className="dot" />
          No internet. Showing your place as of 2:06 PM.
        </div>

        <button type="button" className="ticket__leave" onClick={() => setLeft(true)}>
          Leave the queue
        </button>
      </div>
    </main>
  )
}
