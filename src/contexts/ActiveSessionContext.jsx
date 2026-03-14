import { createContext, useContext, useState, useEffect, useRef } from 'react'

const ActiveSessionContext = createContext(null)

const STORAGE_KEY = 'setto-active-session'

export function ActiveSessionProvider({ children }) {
  const [activeSession, setActiveSessionState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    clearInterval(timerRef.current)
    if (activeSession?.startTime) {
      const tick = () => setElapsed(Math.floor((Date.now() - activeSession.startTime) / 1000))
      tick()
      timerRef.current = setInterval(tick, 1000)
    } else {
      setElapsed(0)
    }
    return () => clearInterval(timerRef.current)
  }, [activeSession?.startTime, activeSession?.sessionId])

  function setActiveSession(data) {
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setActiveSessionState(data)
  }

  function clearActiveSession() {
    setActiveSession(null)
  }

  return (
    <ActiveSessionContext.Provider value={{ activeSession, setActiveSession, clearActiveSession, elapsed }}>
      {children}
    </ActiveSessionContext.Provider>
  )
}

export function useActiveSession() {
  return useContext(ActiveSessionContext)
}
