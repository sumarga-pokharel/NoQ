import { Link, NavLink, Outlet } from 'react-router-dom'
import Logo from '../components/Logo'
import LanguageToggle from '../components/LanguageToggle'
import { useAuth } from '../context/AuthContext'
import './PublicLayout.css'

export default function PublicLayout() {
  const { isAuthenticated, provider } = useAuth()

  return (
    <div className="public-shell">
      <header className="public-nav">
        <Link to="/" className="public-nav__brand">
          <Logo />
        </Link>

        <nav className="public-nav__links">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/join">Join a queue</NavLink>
        </nav>

        <div className="public-nav__actions">
          <LanguageToggle />
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary btn-sm">
              {provider?.officeName || 'Dashboard'}
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Set up your counter
              </Link>
            </>
          )}
        </div>
      </header>

      <Outlet />

      <footer className="public-footer">
        <div className="public-footer__inner">
          <div className="public-footer__brand">
            <Logo tagline={false} />
            <p>Pulchowk, Lalitpur · hello@noq.com.np · 01-5970000</p>
          </div>
          <div className="public-footer__cols">
            <div>
              <div className="public-footer__heading">Product</div>
              <Link to="/join">For visitors</Link>
              <Link to="/signup">For providers</Link>
              <Link to="/display">Display board</Link>
            </div>
            <div>
              <div className="public-footer__heading">Provider</div>
              <Link to="/login">Log in</Link>
              <Link to="/signup">Sign up</Link>
              <Link to="/dashboard">Dashboard</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
