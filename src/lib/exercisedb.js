import { exerciseCacheDB } from './db'

const BASE_URL = 'https://exercisedb-api.vercel.app/api/v1'

async function fetchAPI(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })

  const cacheKey = url.toString()
  const cached = await exerciseCacheDB.getValid(cacheKey)
  if (cached) return cached

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`ExerciseDB API error: ${res.status}`)
  const json = await res.json()

  if (json.success) {
    await exerciseCacheDB.set(cacheKey, json)
  }

  return json
}

export async function searchExercises(query, { offset = 0, limit = 25, threshold = 0.3 } = {}) {
  const json = await fetchAPI('/exercises/search', { q: query, offset, limit, threshold })
  return { exercises: json.data || [], metadata: json.metadata }
}

export async function getExercises({ offset = 0, limit = 25, search, sortBy = 'name', sortOrder = 'asc' } = {}) {
  const json = await fetchAPI('/exercises', { offset, limit, search, sortBy, sortOrder })
  return { exercises: json.data || [], metadata: json.metadata }
}

export async function filterExercises({ muscles, equipment, bodyParts, search, offset = 0, limit = 25 } = {}) {
  const json = await fetchAPI('/exercises/filter', {
    muscles,
    equipment,
    bodyParts,
    search,
    offset,
    limit,
    sortBy: 'name',
    sortOrder: 'asc',
  })
  return { exercises: json.data || [], metadata: json.metadata }
}

export async function getExerciseById(exerciseId) {
  const json = await fetchAPI(`/exercises/${exerciseId}`)
  return json.data || null
}

export async function getExercisesByMuscle(muscleName, { offset = 0, limit = 25 } = {}) {
  const json = await fetchAPI(`/muscles/${encodeURIComponent(muscleName)}/exercises`, { offset, limit })
  return { exercises: json.data || [], metadata: json.metadata }
}

export async function getExercisesByBodyPart(bodyPartName, { offset = 0, limit = 25 } = {}) {
  const json = await fetchAPI(`/bodyparts/${encodeURIComponent(bodyPartName)}/exercises`, { offset, limit })
  return { exercises: json.data || [], metadata: json.metadata }
}

export async function getExercisesByEquipment(equipmentName, { offset = 0, limit = 25 } = {}) {
  const json = await fetchAPI(`/equipments/${encodeURIComponent(equipmentName)}/exercises`, { offset, limit })
  return { exercises: json.data || [], metadata: json.metadata }
}

export async function getMuscles() {
  const json = await fetchAPI('/muscles')
  return (json.data || []).map(m => m.name)
}

export async function getBodyParts() {
  const json = await fetchAPI('/bodyparts')
  return (json.data || []).map(b => b.name)
}

export async function getEquipments() {
  const json = await fetchAPI('/equipments')
  return (json.data || []).map(e => e.name)
}
