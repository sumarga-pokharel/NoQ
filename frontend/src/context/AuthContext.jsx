import { createContext, useContext, useEffect, useState } from 'react'

// NOTE: There is no backend wired up yet, so "authentication" here is a
// local-only stand-in — it just remembers a provider profile in
// localStorage so the Setup/Dashboard pages have something to gate on and
// display. Swap this for real API calls (and a real token) once the
// backend's auth routes exist.
const STORAGE_KEY = 'noq.provider.session'

const AuthContext = createContext(null)

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [provider, setProvider] = useState(() => readSession())

  useEffect(() => {
    if (provider) localStorage.setItem(STORAGE_KEY, JSON.stringify(provider))
    else localStorage.removeItem(STORAGE_KEY)
  }, [provider])

  const signup = ({ officeName, sector, email }) => {
    const profile = {
      officeName: officeName || 'Your office',
      sector: sector || 'government',
      email,
      onboarded: false,
    }
    setProvider(profile)
    return profile
  }

  const login = ({ email }) => {
    const existing = readSession()
    const profile = existing?.email === email ? existing : { officeName: 'Your office', sector: 'government', email, onboarded: true }
    setProvider(profile)
    return profile
  }

  const completeOnboarding = (updates = {}) => {
    setProvider((prev) => (prev ? { ...prev, ...updates, onboarded: true } : prev))
  }

  const logout = () => setProvider(null)

  return (
    <AuthContext.Provider
      value={{ provider, isAuthenticated: !!provider, signup, login, logout, completeOnboarding }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
