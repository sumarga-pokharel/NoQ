import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

const TOKEN_KEY = 'noq.auth.token'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [provider, setProvider] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) return
    let active = true
    api('/auth/me', { token })
      .then(({ provider: profile }) => active && setProvider(profile))
      .catch(() => {
        if (!active) return
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      })
      .finally(() => active && setIsLoading(false))
    return () => { active = false }
  }, [token])

  const establishSession = ({ token: nextToken, provider: profile }) => {
    localStorage.setItem(TOKEN_KEY, nextToken)
    setToken(nextToken)
    setProvider(profile)
    return profile
  }

  const signup = async (details) => establishSession(await api('/auth/signup', { method: 'POST', body: details }))
  const login = async (credentials) => establishSession(await api('/auth/login', { method: 'POST', body: credentials }))
  const completeOnboarding = async ({ sector, services, requiredDocuments }) => {
    const result = await api('/provider/setup', { method: 'PUT', token, body: { sector, services, requiredDocuments } })
    setProvider(result.provider)
    return result
  }
  const updateProvider = async (updates) => {
    const { provider: profile } = await api('/provider/me', { method: 'PUT', token, body: updates })
    setProvider(profile)
    return profile
  }
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setProvider(null)
    setIsLoading(false)
  }

  return <AuthContext.Provider value={{ token, provider, isAuthenticated: Boolean(provider), isLoading, signup, login, logout, completeOnboarding, updateProvider }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
