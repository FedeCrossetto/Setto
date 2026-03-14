import { openDB } from 'idb'

const DB_NAME = 'setto'
const DB_VERSION = 2

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('routines')) {
          const routines = db.createObjectStore('routines', { keyPath: 'id' })
          routines.createIndex('name', 'name')
        }
          if (!db.objectStoreNames.contains('sessions')) {
          const sessions = db.createObjectStore('sessions', { keyPath: 'id' })
          sessions.createIndex('date', 'date')
          sessions.createIndex('routineId', 'routineId')
        }
        if (!db.objectStoreNames.contains('measurements')) {
          const measurements = db.createObjectStore('measurements', { keyPath: 'id' })
          measurements.createIndex('date', 'date')
        }
        if (!db.objectStoreNames.contains('meals')) {
          const meals = db.createObjectStore('meals', { keyPath: 'id' })
          meals.createIndex('date', 'date')
        }
        if (!db.objectStoreNames.contains('photos')) {
          const photos = db.createObjectStore('photos', { keyPath: 'id' })
          photos.createIndex('date', 'date')
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
      }
      if (oldVersion < 2 && !db.objectStoreNames.contains('imports')) {
        const imports = db.createObjectStore('imports', { keyPath: 'id' })
        imports.createIndex('date', 'date')
      }
    }
  })
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// Generic CRUD
async function getAll(store) {
  const db = await getDB()
  return db.getAll(store)
}

async function getById(store, id) {
  const db = await getDB()
  return db.get(store, id)
}

async function put(store, data) {
  const db = await getDB()
  if (!data.id) data.id = generateId()
  await db.put(store, data)
  return data
}

async function remove(store, id) {
  const db = await getDB()
  return db.delete(store, id)
}

async function getAllByIndex(store, indexName, value) {
  const db = await getDB()
  return db.getAllFromIndex(store, indexName, value)
}

// Routines
export const routinesDB = {
  getAll: () => getAll('routines'),
  get: (id) => getById('routines', id),
  save: (data) => put('routines', data),
  delete: (id) => remove('routines', id),
}

// Workout Sessions
export const sessionsDB = {
  getAll: () => getAll('sessions'),
  get: (id) => getById('sessions', id),
  save: (data) => put('sessions', data),
  delete: (id) => remove('sessions', id),
  getByDate: (date) => getAllByIndex('sessions', 'date', date),
  getByRoutine: (routineId) => getAllByIndex('sessions', 'routineId', routineId),
}

// Measurements
export const measurementsDB = {
  getAll: () => getAll('measurements'),
  get: (id) => getById('measurements', id),
  save: (data) => put('measurements', data),
  delete: (id) => remove('measurements', id),
  getByDate: (date) => getAllByIndex('measurements', 'date', date),
}

// Meals
export const mealsDB = {
  getAll: () => getAll('meals'),
  get: (id) => getById('meals', id),
  save: (data) => put('meals', data),
  delete: (id) => remove('meals', id),
  getByDate: (date) => getAllByIndex('meals', 'date', date),
}

// Photos
export const photosDB = {
  getAll: () => getAll('photos'),
  get: (id) => getById('photos', id),
  save: (data) => put('photos', data),
  delete: (id) => remove('photos', id),
}

// Imports (historial de archivos Excel subidos)
export const importsDB = {
  getAll: () => getAll('imports'),
  get: (id) => getById('imports', id),
  save: (data) => put('imports', data),
  delete: (id) => remove('imports', id),
}

// Settings
export const settingsDB = {
  get: async (key) => {
    const db = await getDB()
    const result = await db.get('settings', key)
    return result?.value
  },
  set: async (key, value) => {
    const db = await getDB()
    await db.put('settings', { key, value })
  },
}

export { generateId }
