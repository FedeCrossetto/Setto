import { supabase } from './supabase'
import { photosDB, generateId } from './db'

const BUCKET = 'fotos-progreso'

export async function savePhoto(file, metadata = {}) {
  const id = generateId()
  const ext = file.type?.split('/')[1] || 'jpg'
  const path = `${id}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const photo = {
    id,
    url: publicUrl,
    date: new Date().toISOString().split('T')[0],
    ...metadata,
  }
  await photosDB.save(photo)
  return photo
}

export async function deletePhotoFromStorage(url) {
  if (!url) return
  const path = url.split(`/${BUCKET}/`)[1]
  if (path) await supabase.storage.from(BUCKET).remove([path])
}

export async function getPhotoURL(photo) {
  return photo?.url || null
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
