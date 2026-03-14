import { routinesDB, sessionsDB, measurementsDB, mealsDB } from './db'

export async function exportAllData() {
  const [routines, sessions, measurements, meals] = await Promise.all([
    routinesDB.getAll(),
    sessionsDB.getAll(),
    measurementsDB.getAll(),
    mealsDB.getAll(),
  ])

  const data = {
    exportDate: new Date().toISOString(),
    app: 'Setto',
    routines,
    sessions,
    measurements,
    meals,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `setto-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
