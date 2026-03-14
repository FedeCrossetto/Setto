import { createContext, useContext, useState, useEffect } from 'react'
import { usersDB } from '../lib/db'

const AuthContext = createContext(null)

const SESSION_KEY = 'setto-session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function restoreSession() {
      try {
        const stored = localStorage.getItem(SESSION_KEY)
        if (stored) {
          const { userId } = JSON.parse(stored)
          const u = await usersDB.get(userId)
          if (u) setUser(u)
          else localStorage.removeItem(SESSION_KEY)
        }
      } catch {
        localStorage.removeItem(SESSION_KEY)
      }
      setLoading(false)
    }
    restoreSession()
  }, [])

  async function login(username, password) {
    let u
    try {
      u = await usersDB.getByUsername(username.trim().toLowerCase())
    } catch (e) {
      throw new Error('Error de conexión. Verificá tu internet.')
    }
    if (!u || u.password !== password) {
      throw new Error('Usuario o contraseña incorrectos')
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: u.id }))
    setUser(u)
    return u
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  function refreshUser(updated) {
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
