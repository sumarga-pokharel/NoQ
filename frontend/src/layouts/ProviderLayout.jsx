import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import './ProviderLayout.css'

export default function ProviderLayout() {
  const { provider, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="provider-shell">
      <aside className="provider-side">
        <div>
          <Logo reversed tagline={false} />
          <div className="provider-side__office">{provider?.officeName || 'Your office'}</div>
          <div className="provider-side__status">
            <span className="dot" />
            Queue open
          </div>
        </div>

        <nav className="provider-side__nav">
          <NavLink to="/dashboard" end>
            Today&rsquo;s queue
          </NavLink>
          <NavLink to="/setup">Setup &amp; services</NavLink>
          <NavLink to="/display" target="_blank" rel="noreferrer" className="provider-side__external">
            Display board ↗
          </NavLink>
        </nav>

        <div className="provider-side__foot">
          <div>
            Signed in as
            <br />
            <strong>{provider?.email || 'you@example.com'}</strong>
          </div>
          <button type="button" className="btn btn-ghost btn-sm provider-side__logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="provider-main">
        <Outlet />
      </main>
    </div>
  )
}
