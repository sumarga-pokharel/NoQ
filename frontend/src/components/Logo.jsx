import './Logo.css'

export default function Logo({ tagline = true, reversed = false, size = 'md' }) {
  return (
    <span className={`noq-logo noq-logo--${size} ${reversed ? 'noq-logo--reversed' : ''}`}>
      <span className="noq-logo__mark" aria-hidden="true">
        <span className="noq-logo__ring" />
        <span className="noq-logo__dot" />
      </span>
      <span className="noq-logo__wordwrap">
        <span className="noq-logo__word">NoQ</span>
        {tagline && <span className="noq-logo__tag">no queue</span>}
      </span>
    </span>
  )
}
