/**
 * Configuración central para búsqueda de ejercicios:
 * - Términos en inglés para la API (con fallbacks para encontrar GIF)
 * - Nombres en español para la UI
 * - Mapeo español → inglés para que el usuario busque en castellano
 */

import exercisesData from '../data/exercises.json'
import { searchExercises } from './exercisedb'

const LIST = exercisesData.exercises || []

/** id local → lista de términos de búsqueda en inglés (el primero que devuelva resultado con imagen gana) */
export const SEARCH_TERMS_BY_ID = {
  'bench-press':    ['barbell bench press chest', 'bench press'],
  'incline-bench':  ['incline barbell bench press', 'incline bench press'],
  'chest-fly':      ['dumbbell fly chest', 'chest fly'],
  'cable-crossover': ['cable crossover chest fly', 'cable crossover', 'cable fly'],
  'tricep-pushdown': ['cable tricep pushdown', 'tricep pushdown'],
  'skull-crusher':  [
    'barbell decline close grip to skull press',
    'skull crusher',
    'lying tricep extension skull crusher',
    'skull crusher ez bar tricep',
    'ez bar skull crusher',
  ],
  'overhead-tricep': ['overhead tricep extension dumbbell', 'overhead tricep extension', 'lying tricep extension'],
  'deadlift':       ['barbell deadlift back', 'deadlift'],
  'barbell-row':    ['bent over barbell row', 'barbell row'],
  'lat-pulldown':   ['cable lat pulldown', 'lat pulldown'],
  'seated-row':     ['seated cable row', 'cable row'],
  'pull-up':        ['pull up', 'pull-up'],
  'barbell-curl':   ['barbell curl bicep', 'barbell curl'],
  'hammer-curl':    ['dumbbell hammer curl bicep', 'hammer curl'],
  'preacher-curl':  ['preacher curl bicep', 'preacher curl'],
  'squat':          ['barbell squat legs', 'barbell squat', 'squat'],
  'leg-press':      ['leg press machine', 'leg press'],
  'leg-extension':  ['leg extension machine quad', 'leg extension'],
  'leg-curl':       ['lying leg curl hamstring', 'leg curl'],
  'calf-raise':     ['standing calf raise', 'calf raise'],
  'shoulder-press': ['barbell overhead shoulder press', 'overhead press', 'military press'],
  'lateral-raise':  ['dumbbell lateral raise shoulder', 'lateral raise'],
  'face-pull':      ['cable face pull rear delt', 'face pull'],
  'plank':          ['plank abs core', 'plank'],
  'crunch':         ['crunch abs', 'crunch'],
  'romanian-deadlift': ['romanian deadlift hamstring', 'romanian deadlift', 'rdl'],
  'hip-thrust':     ['barbell hip thrust glute', 'hip thrust'],
  'lunges':         ['dumbbell lunge leg', 'lunge'],
}

/** Búsqueda en español → término en inglés para la API (usuario escribe en castellano) */
export const SPANISH_TO_ENGLISH_SEARCH = {}
LIST.forEach(({ id, name }) => {
  if (!name) return
  const terms = SEARCH_TERMS_BY_ID[id]
  if (terms?.length) {
    const normalized = name.trim().toLowerCase()
    SPANISH_TO_ENGLISH_SEARCH[normalized] = terms[0]
    SPANISH_TO_ENGLISH_SEARCH[normalized.replace(/\s+/g, ' ')] = terms[0]
  }
})
SPANISH_TO_ENGLISH_SEARCH['rompecráneos'] = 'skull crusher'
SPANISH_TO_ENGLISH_SEARCH['rompecraneos'] = 'skull crusher'
SPANISH_TO_ENGLISH_SEARCH['peso muerto'] = 'deadlift'
SPANISH_TO_ENGLISH_SEARCH['press banca'] = 'barbell bench press'
SPANISH_TO_ENGLISH_SEARCH['sentadilla'] = 'barbell squat'
SPANISH_TO_ENGLISH_SEARCH['press militar'] = 'overhead shoulder press'
SPANISH_TO_ENGLISH_SEARCH['jalón'] = 'lat pulldown'
SPANISH_TO_ENGLISH_SEARCH['remo barra'] = 'bent over barbell row'
SPANISH_TO_ENGLISH_SEARCH['curl barra'] = 'barbell curl'
SPANISH_TO_ENGLISH_SEARCH['elevaciones laterales'] = 'dumbbell lateral raise'
SPANISH_TO_ENGLISH_SEARCH['prensa piernas'] = 'leg press'
SPANISH_TO_ENGLISH_SEARCH['gemelos'] = 'calf raise'
SPANISH_TO_ENGLISH_SEARCH['extensión piernas'] = 'leg extension'
SPANISH_TO_ENGLISH_SEARCH['curl piernas'] = 'leg curl'
SPANISH_TO_ENGLISH_SEARCH['plancha'] = 'plank'
SPANISH_TO_ENGLISH_SEARCH['aperturas'] = 'dumbbell fly chest'
SPANISH_TO_ENGLISH_SEARCH['cruces polea'] = 'cable crossover'
SPANISH_TO_ENGLISH_SEARCH['pushdown'] = 'tricep pushdown'
SPANISH_TO_ENGLISH_SEARCH['extensión overhead'] = 'overhead tricep extension'
SPANISH_TO_ENGLISH_SEARCH['curl martillo'] = 'hammer curl'
SPANISH_TO_ENGLISH_SEARCH['curl predicador'] = 'preacher curl'

export function getSearchTermsForId(id) {
  return SEARCH_TERMS_BY_ID[id] || (id ? [id.replace(/-/g, ' ')] : [])
}

export function getDisplayName(id) {
  const ex = LIST.find(e => e.id === id)
  return ex?.name ?? null
}

/** Dado un texto de búsqueda del usuario, devuelve términos adicionales en inglés para consultar la API */
export function getEnglishTermsForQuery(query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return []
  const terms = new Set()
  if (SPANISH_TO_ENGLISH_SEARCH[q]) terms.add(SPANISH_TO_ENGLISH_SEARCH[q])
  LIST.forEach(({ name }) => {
    if (name && q.includes(name.trim().toLowerCase())) {
      const ex = LIST.find(e => e.name === name)
      if (ex && SEARCH_TERMS_BY_ID[ex.id]?.[0]) terms.add(SEARCH_TERMS_BY_ID[ex.id][0])
    }
  })
  return [...terms]
}

/**
 * Prueba varios términos de búsqueda en orden y devuelve el primer ejercicio que tenga imageUrl (o el primero).
 */
export async function searchFirstWithImage(searchTerms = []) {
  if (!searchTerms.length) return null
  for (const term of searchTerms) {
    try {
      const { exercises } = await searchExercises(term, { limit: 5, threshold: 0.25 })
      const withImage = (exercises || []).find(ex => ex.imageUrl)
      if (withImage) return withImage
      if (exercises?.length > 0) return exercises[0]
    } catch {
      continue
    }
  }
  return null
}
