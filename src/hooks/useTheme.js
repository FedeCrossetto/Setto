import { useState } from 'react'

const STORAGE_KEY = 'setto-theme'

function readStoredTheme() {
  if (typeof window === 'undefined') return 'light'
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

function applyTheme(value) {
  const isDark = value === 'dark'
  document.documentElement.classList.toggle('dark', isDark)
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    const value = readStoredTheme()
    applyTheme(value)
    return value
  })

  function setTheme(value) {
    const next = value === 'dark' ? 'dark' : 'light'
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
    setThemeState(next)
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return [theme, setTheme, toggleTheme]
}
