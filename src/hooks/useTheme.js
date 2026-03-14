import { useState, useEffect } from 'react'
import { settingsDB } from '../lib/db'

export function useTheme() {
  const [theme, setThemeState] = useState('light')

  useEffect(() => {
    settingsDB.get('theme').then(saved => {
      const value = saved === 'dark' ? 'dark' : 'light'
      setThemeState(value)
      document.documentElement.classList.toggle('dark', value === 'dark')
    })
  }, [])

  async function setTheme(value) {
    const next = value === 'dark' ? 'dark' : 'light'
    await settingsDB.set('theme', next)
    setThemeState(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return [theme, setTheme, toggleTheme]
}
