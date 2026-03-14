import { photosDB, generateId } from './db'

export async function savePhoto(blob, metadata = {}) {
  const id = generateId()
  const photo = {
    id,
    blob,
    date: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
    ...metadata,
  }
  await photosDB.save(photo)
  return photo
}

export async function getPhotoURL(photo) {
  if (!photo?.blob) return null
  return URL.createObjectURL(photo.blob)
}

export async function fileToBlob(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const blob = new Blob([reader.result], { type: file.type })
      resolve(blob)
    }
    reader.readAsArrayBuffer(file)
  })
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function getWeekNumber(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const start = new Date(d.getFullYear(), 0, 1)
  const diff = d - start
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7)
}

export function todayStr() {
  return new Date().toISOString().split('T')[0]
}
