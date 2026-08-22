import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { useOfficeRealtime } from '../hooks/useOfficeRealtime'
import './DashboardPage.css'

const HOURS = [22, 48, 86, 100, 71, 34, 52, 63, 29, 14]

export default function DashboardPage() {
  const { provider, token, updateProvider } = useAuth()
  const [data, setData] = useState(null)
  const [services, setServices] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const refresh = useCallback(async () => {
    try {
      const [dashboard, serviceData] = await Promise.all([api('/tickets/dashboard', { token }), api('/services', { token })])
      setData(dashboard)
      setServices(serviceData.services)
      setError('')
    } catch (err) { setError(err.message) }
  }, [token])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 5000)
    return () => clearInterval(timer)
  }, [refresh])
  useOfficeRealtime(provider?.id, refresh)

  const counterAction = async (id, action) => {
    setBusy(`${id}-${action}`)
    try { await api(`/counters/${id}/${action}`, { method: 'POST', token }); await refresh() } catch (err) { setError(err.message) } finally { setBusy('') }
  }
  const toggleJoins = async () => {
    setBusy('joins')
    try { await updateProvider({ isAcceptingJoins: !provider.isAcceptingJoins }) } catch (err) { setError(err.message) } finally { setBusy('') }
  }
  const addWalkIn = async () => {
    if (!services.length) return setError('Create a service before issuing a walk-in token.')
    setBusy('walkin')
    try { await api('/tickets/walk-in', { method: 'POST', token, body: { serviceId: services[0]._id } }); await refresh() } catch (err) { setError(err.message) } finally { setBusy('') }
  }

  if (!data) return <div className="dash"><p>{error || 'Loading live queue…'}</p></div>
  const readyCount = data.waitingList.filter((ticket) => ticket.documents.every((doc) => doc.confirmed)).length
  const readyPercent = data.waitingCount ? Math.round((readyCount / data.waitingCount) * 100) : 100

  return <div className="dash">
    <div className="dash__head"><div><h1>Today&rsquo;s queue</h1><p>{provider.officeName} · {data.waitingCount} waiting right now</p></div><div className="dash__head-actions"><button type="button" className="btn btn-secondary" onClick={toggleJoins} disabled={busy === 'joins'}>{provider.isAcceptingJoins ? 'Pause new joins' : 'Resume new joins'}</button><button type="button" className="btn btn-primary" onClick={addWalkIn} disabled={busy === 'walkin'}>Add walk-in token</button></div></div>
    {error && <div role="alert">{error}</div>}
    <div className="dash__stats">
      <div className="card dash__stat"><div className="eyebrow">Waiting now</div><div className="dash__stat-val">{data.waitingCount}</div></div>
      <div className="card dash__stat"><div className="eyebrow">Average wait</div><div className="dash__stat-val">{data.avgWaitMinutes}<span> min</span></div></div>
      <div className="card dash__stat"><div className="eyebrow">Served today</div><div className="dash__stat-val">{data.servedToday}</div><div className="dash__stat-note">of {data.issuedToday} issued</div></div>
      <div className="card dash__stat"><div className="eyebrow">No-shows</div><div className="dash__stat-val">{data.noShowToday}</div></div>
      <div className="card dash__stat dash__stat--highlight"><div className="eyebrow">Documents ready</div><div className="dash__stat-val">{readyPercent}<span>%</span></div></div>
    </div>
    <div className="dash__counters">{data.counters.map((counter) => <div className="card dash__counter" key={counter._id} data-status={counter.status}><div className="dash__counter-top"><span className="dash__counter-name">{counter.name}</span><span className={`badge badge-${counter.status === 'serving' ? 'green' : counter.status === 'waiting' ? 'amber' : 'neutral'}`}>{counter.status}</span></div><div className="dash__counter-token">{counter.currentTicket?.token || '—'}</div><div className="dash__counter-meta">{counter.compatibleServices.length ? counter.compatibleServices.map((s) => s.name).join(', ') : 'All services'}</div><div className="dash__counter-actions"><button className="btn btn-primary btn-sm" onClick={() => counterAction(counter._id, 'call-next')} disabled={Boolean(busy)}>Call next</button><button className="btn btn-secondary btn-sm" onClick={() => counterAction(counter._id, 'skip')} disabled={Boolean(busy)}>Skip</button></div></div>)}</div>
    <div className="dash__lower"><div className="card dash__waiting"><div className="dash__waiting-head"><div className="dash__waiting-title">Waiting list</div><span className="badge badge-green">All {data.waitingCount}</span><div className="dash__waiting-updated">Live</div></div><div className="dash__waiting-table"><div className="dash__waiting-row dash__waiting-row--head"><span>Token</span><span>Visitor</span><span>Service</span><span>Status</span><span>Documents</span></div>{data.waitingList.map((ticket) => { const confirmed = ticket.documents.filter((d) => d.confirmed).length; return <div className="dash__waiting-row" key={ticket._id}><span className="dash__waiting-token">{ticket.token}</span><span>{ticket.phone || 'Anonymous'}{ticket.priority && <div className="dash__waiting-tag">Priority</div>}</span><span>{ticket.service?.name}</span><span>{ticket.status}</span><span><span className={`badge ${confirmed === ticket.documents.length ? 'badge-green' : 'badge-red'}`}>{confirmed} of {ticket.documents.length}</span></span></div> })}</div></div><div className="dash__side"><div className="card dash__chart"><div className="dash__chart-title">Busiest hours</div><div className="dash__chart-bars">{HOURS.map((height, index) => <div key={index} className="dash__chart-bar" style={{ height: `${height}%` }} />)}</div></div><div className="card dash__qr"><div className="dash__chart-title">Public join link</div><div className="dash__qr-url">{`${window.location.origin}/join/${provider.slug}`}</div></div></div></div>
  </div>
}
