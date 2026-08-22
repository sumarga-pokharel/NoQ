import { Link } from 'react-router-dom'
import './NotFoundPage.css'

export default function NotFoundPage() {
  return (
    <main className="notfound">
      <div className="eyebrow">404</div>
      <h1>This queue doesn&rsquo;t exist.</h1>
      <p>The page you&rsquo;re looking for may have moved, or the link is off.</p>
      <Link to="/" className="btn btn-primary">
        Back to NoQ
      </Link>
    </main>
  )
}
