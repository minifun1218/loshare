import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe } from '../api/auth'

const AuthContext = createContext(null)

function readStoredUser() {
  const raw = localStorage.getItem('loshare_user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem('loshare_user')
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [token, setToken] = useState(() => localStorage.getItem('loshare_token'))
  const [loading, setLoading] = useState(() => !!localStorage.getItem('loshare_token'))

  const login = useCallback((tokenData) => {
    localStorage.setItem('loshare_token', tokenData.access_token)
    localStorage.setItem('loshare_user', JSON.stringify(tokenData.user))
    setToken(tokenData.access_token)
    setUser(tokenData.user)
    setLoading(false)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('loshare_token')
    localStorage.removeItem('loshare_user')
    setToken(null)
    setUser(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    const handleLogout = () => logout()
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [logout])

  useEffect(() => {
    if (!token) return
    getMe()
      .then(data => {
        localStorage.setItem('loshare_user', JSON.stringify(data))
        setUser(data)
      })
      .catch(logout)
      .finally(() => setLoading(false))
  }, [token, logout])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
