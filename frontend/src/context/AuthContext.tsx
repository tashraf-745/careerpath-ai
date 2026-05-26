import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface AuthUser {
  userId: string
  email:  string
  token:  string
}

interface AuthContextValue {
  user:           AuthUser | null
  isAuthenticated: boolean
  login:          (email: string, password: string) => Promise<void>
  register:       (email: string, password: string) => Promise<void>
  logout:         () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'careerpath_auth'
const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser)

  const persist = (u: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    setUser(u)
  }

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${BASE}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Login failed')
    }
    const data = await res.json()
    persist({ userId: data.user_id, email: data.email, token: data.token })
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${BASE}/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Registration failed')
    }
    const data = await res.json()
    persist({ userId: data.user_id, email: data.email, token: data.token })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
