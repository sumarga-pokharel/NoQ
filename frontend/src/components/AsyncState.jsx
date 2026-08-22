import './AsyncState.css'

export default function AsyncState({ loading = false, title, message, onRetry, retryLabel = 'Try again', tone = 'default' }) {
  return <div className="async-state" data-tone={tone} role={loading ? 'status' : onRetry ? 'alert' : undefined} aria-live="polite">
    {loading && <span className="async-state__spinner" aria-hidden="true" />}
    <strong>{title}</strong>
    {message && <p>{message}</p>}
    {onRetry && <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>{retryLabel}</button>}
  </div>
}
