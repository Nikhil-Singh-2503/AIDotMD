import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { setAuthToken } from '@/api/client'

interface User {
  id: string
  email: string
  display_name: string
  role: string
  is_active: boolean
  is_service_account: boolean
  created_at: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'aidotmd_session_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) {
      setUser(null)
      setToken(null)
      setAuthToken(null)
      setIsLoading(false)
      return
    }
    setAuthToken(stored)
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${stored}` },
      })
      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
        setToken(stored)
      } else {
        localStorage.removeItem(TOKEN_KEY)
        setUser(null)
        setToken(null)
        setAuthToken(null)
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }))
      throw new Error(err.detail || 'Login failed')
    }
    const data = await res.json()
    localStorage.setItem(TOKEN_KEY, data.token)
    setAuthToken(data.token)
    setToken(data.token)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored) {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${stored}` },
      }).catch(() => {})
    }
    localStorage.removeItem(TOKEN_KEY)
    setAuthToken(null)
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}
