/**
 * db.js — Capa de datos unificada
 * App data  → Supabase (normalizado)
 * API cache → IndexedDB (solo offline)
 */

import { openDB } from 'idb'
import { supabase } from './supabase'

// ─── Helpers ────────────────────────────────────────────────

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function getCurrentUserId() {
  try {
    const stored = localStorage.getItem('setto-session')
    if (!stored) return null
    return JSON.parse(stored).userId
  } catch {
    return null
  }
}

function throw_if_error({ error }) {
  if (error) throw error
}

// ─── USUARIOS ────────────────────────────────────────────────

export const usersDB = {
  get: async (id) => {
    const { data } = await supabase.from('usuarios').select('*').eq('id', id).single()
    return data ? mapUserFromDB(data) : null
  },
  getAll: async () => {
    const { data } = await supabase.from('usuarios').select('*')
    return (data || []).map(mapUserFromDB)
  },
  save: async (user) => {
    const row = mapUserToDB(user)
    throw_if_error(await supabase.from('usuarios').upsert(row))
    return user
  },
  delete: async (id) => {
    throw_if_error(await supabase.from('usuarios').delete().eq('id', id))
  },
  getByUsername: async (username) => {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle()
    return data ? mapUserFromDB(data) : null
  },
}

function mapUserFromDB(row) {
  return {
    id:        row.id,
    username:  row.username,
    password:  row.password,
    nombre:    row.nombre,
    apellido:  row.apellido,
    edad:      row.edad,
    sexo:      row.sexo,
    peso:      row.peso,
    altura:    row.altura,
    objetivo:  row.objetivo,
    nivel:     row.nivel,
    avatar:    row.avatar_url,
    createdAt: row.creado_en,
  }
}

function mapUserToDB(u) {
  return {
    id:         u.id,
    username:   u.username?.toLowerCase().trim(),
    password:   u.password,
    nombre:     u.nombre    || null,
    apellido:   u.apellido  || null,
    edad:       u.edad      ? Number(u.edad)   : null,
    sexo:       u.sexo      || null,
    peso:       u.peso      ? Number(u.peso)   : null,
    altura:     u.altura    ? Number(u.altura) : null,
    objetivo:   u.objetivo  || null,
    nivel:      u.nivel     || null,
    avatar_url: u.avatar    || null,
  }
}

// ─── RUTINAS ─────────────────────────────────────────────────

export const routinesDB = {
  getAll: async () => {
    const userId = getCurrentUserId()
    const { data, error } = await supabase
      .from('rutinas')
      .select('*, rutina_ejercicios(*)')
      .eq('usuario_id', userId)
      .order('creado_en', { ascending: true })
    if (error) { console.error(error); return [] }
    return (data || []).map(mapRoutineFromDB)
  },

  get: async (id) => {
    const { data } = await supabase
      .from('rutinas')
      .select('*, rutina_ejercicios(*)')
      .eq('id', id)
      .single()
    return data ? mapRoutineFromDB(data) : null
  },

  save: async (routine) => {
    const userId = getCurrentUserId()
    if (!routine.id) routine.id = generateId()

    // Upsert rutina
    throw_if_error(await supabase.from('rutinas').upsert({
      id:         routine.id,
      usuario_id: userId,
      nombre:     routine.name,
      image_url:  routine.imageUrl || null,
      creado_en:  routine.createdAt || new Date().toISOString(),
    }))

    // Reemplazar ejercicios (delete cascade + reinsert)
    await supabase.from('rutina_ejercicios').delete().eq('rutina_id', routine.id)

    if (routine.exercises?.length > 0) {
      throw_if_error(await supabase.from('rutina_ejercicios').insert(
        routine.exercises.map((ex, i) => ({
          id:                `${routine.id}:${i}`,
          rutina_id:         routine.id,
          orden:             i,
          exercise_id:       ex.exerciseId || ex.id || '',
          nombre:            ex.name,
          image_url:         ex.imageUrl || '',
          musculos_objetivo: ex.targetMuscles || [],
          series_default:    typeof ex.sets === 'number' ? ex.sets : 3,
        }))
      ))
    }
    return routine
  },

  delete: async (id) => {
    throw_if_error(await supabase.from('rutinas').delete().eq('id', id))
  },
}

function mapRoutineFromDB(row) {
  const exercises = (row.rutina_ejercicios || [])
    .sort((a, b) => a.orden - b.orden)
    .map(ex => ({
      exerciseId:    ex.exercise_id,
      name:          ex.nombre,
      imageUrl:      ex.image_url || '',
      targetMuscles: ex.musculos_objetivo || [],
      sets:          ex.series_default || 3,
    }))
  return {
    id:        row.id,
    name:      row.nombre,
    imageUrl:  row.image_url || '',
    exercises,
    createdAt: row.creado_en,
  }
}

// ─── SESIONES ────────────────────────────────────────────────

export const sessionsDB = {
  getAll: async () => {
    const userId = getCurrentUserId()
    const { data, error } = await supabase
      .from('sesiones')
      .select(`
        *,
        sesion_ejercicios (
          *,
          sesion_series (*)
        )
      `)
      .eq('usuario_id', userId)
      .order('fecha', { ascending: false })
    if (error) { console.error(error); return [] }
    return (data || []).map(mapSessionFromDB)
  },

  get: async (id) => {
    const { data } = await supabase
      .from('sesiones')
      .select(`
        *,
        sesion_ejercicios (
          *,
          sesion_series (*)
        )
      `)
      .eq('id', id)
      .single()
    return data ? mapSessionFromDB(data) : null
  },

  save: async (session) => {
    const userId = getCurrentUserId()
    if (!session.id) session.id = generateId()

    // Upsert sesión
    throw_if_error(await supabase.from('sesiones').upsert({
      id:               session.id,
      usuario_id:       userId,
      rutina_id:        session.routineId   || null,
      nombre_rutina:    session.routineName || '',
      fecha:            session.date,
      inicio:           session.startTime   || null,
      fin:              session.endTime     || null,
      duracion_segundos: session.duration   || null,
      completada:       session.completed   || false,
    }))

    // Reemplazar ejercicios + series (cascade delete)
    await supabase.from('sesion_ejercicios').delete().eq('sesion_id', session.id)

    if (session.exercises?.length > 0) {
      // Insertar ejercicios con IDs estables
      throw_if_error(await supabase.from('sesion_ejercicios').insert(
        session.exercises.map((ex, i) => ({
          id:                `${session.id}:${i}`,
          sesion_id:         session.id,
          orden:             i,
          exercise_id:       ex.exerciseId || '',
          nombre:            ex.name,
          image_url:         ex.imageUrl || '',
          musculos_objetivo: ex.targetMuscles || [],
        }))
      ))

      // Insertar todas las series
      const allSeries = session.exercises.flatMap((ex, i) =>
        (ex.sets || []).map((set, j) => ({
          sesion_ejercicio_id: `${session.id}:${i}`,
          numero_serie:        j + 1,
          peso_kg:             set.weight !== '' && set.weight != null ? parseFloat(set.weight) : null,
          repeticiones:        set.reps   !== '' && set.reps   != null ? parseInt(set.reps)    : null,
          completada:          set.completed || false,
        }))
      )
      if (allSeries.length > 0) {
        throw_if_error(await supabase.from('sesion_series').insert(allSeries))
      }
    }
    return session
  },

  delete: async (id) => {
    throw_if_error(await supabase.from('sesiones').delete().eq('id', id))
  },

  getByDate: async (date) => {
    const userId = getCurrentUserId()
    const { data } = await supabase
      .from('sesiones')
      .select('*, sesion_ejercicios(*, sesion_series(*))')
      .eq('usuario_id', userId)
      .eq('fecha', date)
    return (data || []).map(mapSessionFromDB)
  },

  getByRoutine: async (routineId) => {
    const userId = getCurrentUserId()
    const { data } = await supabase
      .from('sesiones')
      .select('*, sesion_ejercicios(*, sesion_series(*))')
      .eq('usuario_id', userId)
      .eq('rutina_id', routineId)
    return (data || []).map(mapSessionFromDB)
  },
}

function mapSessionFromDB(row) {
  const exercises = (row.sesion_ejercicios || [])
    .sort((a, b) => a.orden - b.orden)
    .map(ex => ({
      exerciseId:    ex.exercise_id,
      name:          ex.nombre,
      imageUrl:      ex.image_url || '',
      targetMuscles: ex.musculos_objetivo || [],
      sets: (ex.sesion_series || [])
        .sort((a, b) => a.numero_serie - b.numero_serie)
        .map(s => ({
          weight:    s.peso_kg     != null ? String(s.peso_kg)     : '',
          reps:      s.repeticiones != null ? String(s.repeticiones) : '',
          completed: s.completada  || false,
        })),
    }))
  return {
    id:          row.id,
    routineId:   row.rutina_id,
    routineName: row.nombre_rutina,
    date:        row.fecha,
    startTime:   row.inicio,
    endTime:     row.fin,
    duration:    row.duracion_segundos,
    completed:   row.completada,
    exercises,
  }
}

// ─── MEDICIONES ──────────────────────────────────────────────

export const measurementsDB = {
  // forUserId: optional userId override (for admin acting on behalf of another user)
  getAll: async (forUserId) => {
    const userId = forUserId || getCurrentUserId()
    const { data } = await supabase
      .from('mediciones')
      .select('*')
      .eq('usuario_id', userId)
      .order('fecha', { ascending: true })
    return (data || []).map(mapMeasurementFromDB)
  },
  get: async (id) => {
    const { data } = await supabase.from('mediciones').select('*').eq('id', id).single()
    return data ? mapMeasurementFromDB(data) : null
  },
  save: async (m, forUserId) => {
    if (!m.id) m.id = generateId()
    const userId = forUserId || getCurrentUserId()
    // Validar que la fecha sea ISO (YYYY-MM-DD) antes de enviar a Supabase
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(m.date) ? m.date : null
    if (!fecha) throw new Error(`Fecha inválida: "${m.date}"`)
    throw_if_error(await supabase.from('mediciones').upsert({
      id:              m.id,
      usuario_id:      userId,
      fecha:           fecha,
      peso:            m.peso                                      ?? null,
      grasa_corporal:  m.grasaCorporal  ?? m.grasa                 ?? null,
      masa_muscular:   m.masaMuscular   ?? m.musculo               ?? null,
      altura:          m.altura                                    ?? null,
      cintura:         m.cintura                                   ?? null,
      cadera:          m.cadera                                    ?? null,
      pecho:           m.pecho                                     ?? null,
      brazo_izq:       m.brazoIzq       ?? m.brazo                 ?? null,
      brazo_der:       m.brazoDer       ?? m.brazoFlex             ?? null,
      antebrazo:       m.antebrazo                                 ?? null,
      muslo_izq:       m.musloIzq       ?? m.pierna   ?? m.musloSup ?? null,
      muslo_der:       m.musloDer       ?? m.musloMed              ?? null,
      pantorrilla_izq: m.pantorrillaIzq ?? m.pantorrilla           ?? null,
      pantorrilla_der: m.pantorrillaDer                            ?? null,
      cuello:          m.cuello                                    ?? null,
      cabeza:          m.cabeza                                    ?? null,
      notas:           m.notas                                     ?? null,
    }))
    return m
  },
  delete: async (id) => {
    throw_if_error(await supabase.from('mediciones').delete().eq('id', id))
  },
  getByDate: async (date) => {
    const userId = getCurrentUserId()
    const { data } = await supabase
      .from('mediciones').select('*')
      .eq('usuario_id', userId).eq('fecha', date)
    return (data || []).map(mapMeasurementFromDB)
  },
}

function mapMeasurementFromDB(row) {
  return {
    id:             row.id,
    date:           row.fecha,
    peso:           row.peso,
    grasaCorporal:  row.grasa_corporal,
    masaMuscular:   row.masa_muscular,
    imc:            row.imc,
    altura:         row.altura,
    cintura:        row.cintura,
    cadera:         row.cadera,
    pecho:          row.pecho,
    brazoIzq:       row.brazo_izq,       // brazo relajado
    brazoFlex:      row.brazo_der,       // brazo flexionado
    antebrazo:      row.antebrazo,
    musloIzq:       row.muslo_izq,       // muslo superior
    musloDer:       row.muslo_der,       // muslo medial
    pantorrillaIzq: row.pantorrilla_izq,
    pantorrillaDer: row.pantorrilla_der,
    cuello:         row.cuello,
    cabeza:         row.cabeza,
    notas:          row.notas,
  }
}

// ─── COMIDAS ─────────────────────────────────────────────────

export const mealsDB = {
  getAll: async () => {
    const userId = getCurrentUserId()
    const { data } = await supabase
      .from('comidas')
      .select('*')
      .eq('usuario_id', userId)
      .order('fecha', { ascending: false })
    return (data || []).map(mapMealFromDB)
  },
  get: async (id) => {
    const { data } = await supabase
      .from('comidas')
      .select('*')
      .eq('id', id)
      .single()
    return data ? mapMealFromDB(data) : null
  },
  save: async (meal) => {
    if (!meal.id) meal.id = generateId()
    throw_if_error(
      await supabase.from('comidas').upsert({
        id:                meal.id,
        usuario_id:        getCurrentUserId(),
        fecha:             meal.date,
        tipo:              meal.tipo || meal.type || null,
        nombre_comida:     meal.name || meal.nombre || null,
        calorias_totales:  meal.calorias      ?? meal.calories ?? null,
        proteinas_totales: meal.proteinas     ?? meal.protein  ?? null,
        carbohidratos_totales: meal.carbohidratos ?? meal.carbs ?? null,
        grasas_totales:    meal.grasas        ?? meal.fat      ?? null,
      })
    )
    return meal
  },
  delete: async (id) => {
    throw_if_error(await supabase.from('comidas').delete().eq('id', id))
  },
  getByDate: async (date) => {
    const userId = getCurrentUserId()
    const { data } = await supabase
      .from('comidas')
      .select('*')
      .eq('usuario_id', userId)
      .eq('fecha', date)
    return (data || []).map(mapMealFromDB)
  },
}

function mapMealFromDB(row) {
  return {
    id:          row.id,
    date:        row.fecha,
    tipo:        row.tipo,
    name:        row.nombre_comida ?? row.nombre,
    nombre:      row.nombre_comida ?? row.nombre,
    calorias:    row.calorias_totales      ?? row.calorias,
    proteinas:   row.proteinas_totales     ?? row.proteinas,
    carbohidratos: row.carbohidratos_totales ?? row.carbohidratos,
    grasas:      row.grasas_totales        ?? row.grasas,
  }
}

// ─── FOTOS DE PROGRESO ───────────────────────────────────────

export const photosDB = {
  getAll: async () => {
    const userId = getCurrentUserId()
    const { data } = await supabase
      .from('fotos_progreso').select('*')
      .eq('usuario_id', userId).order('fecha', { ascending: false })
    return (data || []).map(mapPhotoFromDB)
  },
  get: async (id) => {
    const { data } = await supabase.from('fotos_progreso').select('*').eq('id', id).single()
    return data ? mapPhotoFromDB(data) : null
  },
  save: async (photo) => {
    if (!photo.id) photo.id = generateId()
    throw_if_error(await supabase.from('fotos_progreso').upsert({
      id:          photo.id,
      usuario_id:  getCurrentUserId(),
      fecha:       photo.date,
      foto_url:    photo.url          || null,
      foto_base64: photo.base64       || null,
      notas:       photo.notas        || null,
    }))
    return photo
  },
  delete: async (id) => {
    throw_if_error(await supabase.from('fotos_progreso').delete().eq('id', id))
  },
}

function mapPhotoFromDB(row) {
  return {
    id:     row.id,
    date:   row.fecha,
    url:    row.foto_url,
    base64: row.foto_base64,
    notas:  row.notas,
  }
}

// ─── SETTINGS (localStorage — no va a Supabase) ──────────────

export const settingsDB = {
  get: (key) => {
    try { return JSON.parse(localStorage.getItem(`setto-setting-${key}`)) } catch { return null }
  },
  set: (key, value) => {
    localStorage.setItem(`setto-setting-${key}`, JSON.stringify(value))
  },
}

// ─── IMPORTS (historial de archivos subidos) ──────────────────
// Kept local-only (no relevance for multi-device sync)
export const importsDB = {
  getAll: () => [],
  save: async () => {},
  delete: async () => {},
}

// ─── EXERCISE CACHE (IndexedDB — solo offline) ────────────────

const CACHE_DB_NAME  = 'setto-exercise-cache'
const CACHE_DB_VER   = 1

function getCacheDB() {
  return openDB(CACHE_DB_NAME, CACHE_DB_VER, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('cache')) {
        const store = db.createObjectStore('cache', { keyPath: 'cacheKey' })
        store.createIndex('cachedAt', 'cachedAt')
      }
    },
  })
}

export const exerciseCacheDB = {
  get: async (key) => {
    const db = await getCacheDB()
    return db.get('cache', key)
  },
  set: async (key, data, ttlMs = 24 * 60 * 60 * 1000) => {
    const db = await getCacheDB()
    await db.put('cache', {
      cacheKey:  key,
      data,
      cachedAt:  Date.now(),
      expiresAt: Date.now() + ttlMs,
    })
  },
  getValid: async (key) => {
    const db = await getCacheDB()
    const entry = await db.get('cache', key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      await db.delete('cache', key)
      return null
    }
    return entry.data
  },
}
