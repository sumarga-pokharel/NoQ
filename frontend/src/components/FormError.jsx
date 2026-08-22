import './FormError.css'

export default function FormError({ error }) {
  if (!error) return null
  const message = error instanceof Error ? error.message : String(error)
  const details = error instanceof Error ? Object.entries(error.errors || {}) : []
  return <div className="form-error" role="alert"><strong>{message}</strong>{details.length > 0 && <ul>{details.map(([field, detail]) => <li key={field}>{detail}</li>)}</ul>}</div>
}
