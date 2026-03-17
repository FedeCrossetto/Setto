import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { usersDB, setCurrentUserId } from '../lib/db'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // INITIAL_SESSION fires on mount with the current session (or null).
    // Handles page refresh / tab reopen without any extra getSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setCurrentUserId(null)
          setUser(null)
          setLoading(false)
          return
        }

        if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            const u = await usersDB.getByAuthId(session.user.id)
            if (u) {
              setCurrentUserId(u.id)
              setUser(u)
            }
          }
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function login(username, password) {
    // Step 1: resolve the email stored in usuarios for this username.
    const { data: row } = await supabase
      .from('usuarios')
      .select('email')
      .eq('username', username.trim().toLowerCase())
      .maybeSingle()

    if (!row?.email) {
      throw new Error('Usuario o contraseña incorrectos')
    }

    // Step 2: Supabase Auth sign in.
    const { data: { user: authUser }, error } = await supabase.auth.signInWithPassword({
      email: row.email,
      password,
    })

    if (error) throw new Error('Usuario o contraseña incorrectos')

    // Step 3: fetch full usuarios row and set app state.
    const u = await usersDB.getByAuthId(authUser.id)
    if (!u) throw new Error('Perfil no encontrado. Contactá al administrador.')

    setCurrentUserId(u.id)
    setUser(u)
    return u
  }

  async function logout() {
    await supabase.auth.signOut()
    // onAuthStateChange SIGNED_OUT handler clears user state.
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
