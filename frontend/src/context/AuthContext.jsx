import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, AUTH_EXPIRED_EVENT } from '../lib/api'

const TOKEN_KEY = 'noq.auth.token'
const AuthContext = createContext(null)

const getTokenExpiry = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload)).exp * 1000
  } catch { return null }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [provider, setProvider] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(token))
  const expiryHandled = useRef(false)

  const expireSession = useCallback(() => {
    if (expiryHandled.current) return
    expiryHandled.current = true
    const from = `${window.location.pathname}${window.location.search}`
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setProvider(null)
    setIsLoading(false)
    if (window.location.pathname !== '/login') {
      navigate('/login', { replace: true, state: { from, authReason: 'expired' } })
    }
  }, [navigate])

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, expireSession)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expireSession)
  }, [expireSession])

  useEffect(() => {
    if (!token) return undefined
    const expiresAt = getTokenExpiry(token)
    if (!expiresAt) return undefined
    let timer
    const scheduleExpiry = () => {
      const remaining = expiresAt - Date.now()
      if (remaining <= 0) expireSession()
      else timer = setTimeout(scheduleExpiry, Math.min(remaining, 2_147_000_000))
    }
    scheduleExpiry()
    return () => clearTimeout(timer)
  }, [token, expireSession])

  useEffect(() => {
    if (!token) return
    let active = true
    api('/auth/me', { token })
      .then(({ provider: profile }) => active && setProvider(profile))
      .catch((error) => {
        if (!active) return
        if (error.status !== 401) setIsLoading(false)
      })
      .finally(() => active && setIsLoading(false))
    return () => { active = false }
  }, [token])

  const establishSession = ({ token: nextToken, provider: profile }) => {
    expiryHandled.current = false
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
  const updateDocuments = async (requiredDocuments) => {
    const result = await api('/provider/documents', { method: 'PUT', token, body: { requiredDocuments } })
    setProvider((current) => ({ ...current, requiredDocuments: result.requiredDocuments }))
    return result.requiredDocuments
  }
  const changePassword = async (passwords) => {
    const result = await api('/auth/change-password', { method: 'PATCH', token, body: passwords })
    localStorage.setItem(TOKEN_KEY, result.token)
    expiryHandled.current = false
    setToken(result.token)
    return result
  }
  const logout = () => {
    expiryHandled.current = false
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setProvider(null)
    setIsLoading(false)
  }

  return <AuthContext.Provider value={{ token, provider, isAuthenticated: Boolean(provider), isLoading, signup, login, logout, completeOnboarding, updateProvider, updateDocuments, changePassword }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
