import { measurementsDB, sessionsDB, mealsDB, routinesDB } from './db'
import { todayStr } from './storage'

async function getUserContext() {
  const today = todayStr()
  const [measurements, sessions, meals, routines] = await Promise.all([
    measurementsDB.getAll(),
    sessionsDB.getAll(),
    mealsDB.getAll(),
    routinesDB.getAll(),
  ])

  const sorted = measurements.sort((a, b) => b.date?.localeCompare(a.date))
  const latest = sorted[0]
  const todayMeals = meals.filter(m => m.date === today)
  const completedMeals = todayMeals.filter(m => m.completed)
  const todayCalories = completedMeals.reduce((s, m) => s + (m.calorias || 0), 0)
  const todayProtein = completedMeals.reduce((s, m) => s + (m.proteinas || 0), 0)
  const todayCarbs = completedMeals.reduce((s, m) => s + (m.carbohidratos || 0), 0)
  const todayFat = completedMeals.reduce((s, m) => s + (m.grasas || 0), 0)

  const weekSessions = sessions.filter(s => {
    const diff = (new Date(today) - new Date(s.date)) / 86400000
    return diff >= 0 && diff < 7
  })

  const recentSessions = sessions
    .sort((a, b) => b.date?.localeCompare(a.date))
    .slice(0, 5)

  return {
    peso: latest?.peso || null,
    grasa: latest?.grasa || null,
    lastMeasureDate: latest?.date || null,
    todayCalories,
    todayProtein,
    todayCarbs,
    todayFat,
    todayMealsCount: todayMeals.length,
    completedMealsCount: completedMeals.length,
    weekWorkouts: weekSessions.length,
    totalRoutines: routines.length,
    routineNames: routines.map(r => r.name),
    recentSessions: recentSessions.map(s => ({ name: s.routineName, date: s.date })),
    totalMeasurements: measurements.length,
    measurements: sorted.slice(0, 3),
  }
}

const TIPS = {
  rutina: [
    'Para ganar fuerza, trabajá con 4-6 repeticiones y peso alto. Para hipertrofia, 8-12 reps con peso moderado.',
    'Descansá entre 60-90 segundos entre series para hipertrofia, o 2-3 minutos para fuerza pura.',
    'Cambiá tu rutina cada 6-8 semanas para seguir progresando y evitar estancarte.',
    'Empezá siempre con los ejercicios compuestos (press banca, sentadilla, peso muerto) y terminá con los aislados.',
    'No te saltees el calentamiento. 5-10 minutos de movilidad y series livianas previenen lesiones.',
  ],
  nutricion: [
    'Tratá de comer 1.6-2.2g de proteína por kg de peso corporal si tu objetivo es ganar músculo.',
    'No te saltees el desayuno. Un buen desayuno con proteína y carbos te da energía para todo el día.',
    'Tomá al menos 2-3 litros de agua por día, más si entrenás intenso.',
    'Los carbohidratos no son el enemigo. Son tu combustible principal para entrenar con intensidad.',
    'Comé cada 3-4 horas para mantener el metabolismo activo y los niveles de energía estables.',
    'Post-entreno: combiná proteína + carbos dentro de las 2 horas siguientes (ej: batido + banana).',
  ],
  peso: [
    'Para bajar de peso, necesitás un déficit calórico moderado: comé ~300-500 kcal menos de tu mantenimiento.',
    'No busques bajar más de 0.5-1 kg por semana. Más rápido que eso perdés músculo.',
    'El peso fluctúa día a día por retención de líquidos. Mirá la tendencia semanal, no el número diario.',
    'Combiná dieta con entrenamiento de fuerza para preservar la masa muscular mientras bajás de peso.',
  ],
  musculo: [
    'Para ganar músculo necesitás superávit calórico moderado (+200-400 kcal) y proteína suficiente.',
    'Los ejercicios compuestos (sentadilla, peso muerto, press) reclutan más fibras y generan más crecimiento.',
    'El descanso es clave: los músculos crecen cuando descansás, no cuando entrenás. Dormí 7-8 horas.',
    'La sobrecarga progresiva es fundamental: subí peso, reps o series de forma gradual cada semana.',
  ],
  motivacion: [
    '¡Cada día que entrenás estás más cerca de tu mejor versión! La constancia le gana al talento.',
    'No te compares con otros. Competí con vos mismo de ayer.',
    'Los días que menos ganas tenés de entrenar son los que más cuentan. ¡Dale que se puede!',
    'El progreso no es lineal. Vas a tener semanas buenas y malas, pero la tendencia siempre sube si sos constante.',
    'Acordate por qué empezaste. Ese objetivo sigue ahí esperándote.',
  ],
  descanso: [
    'Descansá al menos 48 horas antes de volver a entrenar el mismo grupo muscular.',
    'El sobreentrenamiento es real. Si te sentís agotado, con dolor articular o sin ganas, tomá un día off.',
    'Dormir 7-9 horas es tan importante como entrenar. El cuerpo se recupera y crece mientras dormís.',
    'Los días de descanso activo (caminata, yoga, elongación) ayudan a la recuperación sin quedarte quieto.',
  ],
  ejercicio: [
    'La sentadilla es el rey de los ejercicios para piernas. Bajá hasta que el muslo quede paralelo al piso.',
    'En el press de banca, retractá las escápulas y apoyá bien los pies. La técnica previene lesiones del hombro.',
    'El peso muerto trabaja toda la cadena posterior. Mantené la espalda neutra y empujá el piso con los pies.',
    'Para bíceps, no balancees el cuerpo. Controlá el movimiento tanto al subir como al bajar.',
    'Las dominadas son excelentes para espalda. Si no podés hacerlas, empezá con jalón al pecho.',
  ],
  grasa: [
    'Un porcentaje de grasa saludable es 10-20% para hombres y 18-28% para mujeres.',
    'No se puede elegir de dónde bajar grasa. El cuerpo la pierde de forma general con déficit calórico.',
    'El cardio ayuda a quemar calorías, pero la dieta es el 80% del resultado en pérdida de grasa.',
    'Los abdominales se hacen en la cocina. Podés tener un core fuerte pero no se ve sin bajar la grasa abdominal.',
  ],
  suplementos: [
    'La creatina monohidratada (5g/día) es el suplemento con más evidencia científica para fuerza y masa.',
    'La proteína en polvo es un complemento, no un reemplazo de comida real.',
    'La cafeína antes de entrenar mejora el rendimiento. 3-6 mg por kg de peso, 30 min antes.',
    'Los BCAA son innecesarios si ya consumís suficiente proteína en tu dieta.',
  ],
}

const KEYWORD_MAP = [
  { keywords: ['rutina', 'entrenamiento', 'entreno', 'entrenar', 'programa', 'split', 'plan de entrenamiento'], category: 'rutina' },
  { keywords: ['comida', 'comer', 'nutricion', 'nutrición', 'dieta', 'alimentacion', 'alimentación', 'macro', 'macros', 'caloria', 'calorias', 'calorías', 'proteina', 'proteína', 'carbo', 'carbohidrato', 'grasa alimentaria'], category: 'nutricion' },
  { keywords: ['peso', 'bajar', 'subir de peso', 'adelgazar', 'engordar', 'deficit', 'déficit', 'superavit', 'superávit', 'mantenimiento'], category: 'peso' },
  { keywords: ['musculo', 'músculo', 'masa', 'ganar masa', 'hipertrofia', 'volumen', 'crecer', 'fuerza'], category: 'musculo' },
  { keywords: ['motivacion', 'motivación', 'ganas', 'animo', 'ánimo', 'no puedo', 'cuesta', 'difícil', 'dificil', 'abandonar'], category: 'motivacion' },
  { keywords: ['descanso', 'descansar', 'recupera', 'dormir', 'sueño', 'sobreentrenamiento', 'fatiga', 'cansado', 'agotado'], category: 'descanso' },
  { keywords: ['ejercicio', 'sentadilla', 'press', 'banca', 'peso muerto', 'curl', 'dominada', 'remo', 'técnica', 'tecnica', 'forma'], category: 'ejercicio' },
  { keywords: ['grasa corporal', '% grasa', 'porcentaje', 'abdominales', 'definir', 'definicion', 'definición', 'marcar', 'secar'], category: 'grasa' },
  { keywords: ['suplemento', 'creatina', 'proteina polvo', 'whey', 'bcaa', 'cafeina', 'cafeína', 'pre entreno'], category: 'suplementos' },
]

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function findCategory(text) {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const entry of KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      const normalizedKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (lower.includes(normalizedKw)) return entry.category
    }
  }
  return null
}

function buildContextResponse(ctx) {
  const lines = []
  if (ctx.peso) lines.push(`Tu peso actual es ${ctx.peso} kg.`)
  if (ctx.grasa) lines.push(`Tu grasa corporal es ${ctx.grasa}%.`)
  lines.push(`Hoy consumiste ${ctx.todayCalories} kcal y ${ctx.todayProtein}g de proteína.`)
  if (ctx.weekWorkouts > 0) {
    lines.push(`Esta semana entrenaste ${ctx.weekWorkouts} ${ctx.weekWorkouts === 1 ? 'vez' : 'veces'}.`)
  } else {
    lines.push('Todavía no entrenaste esta semana. ¡Es un buen momento para arrancar!')
  }
  if (ctx.routineNames.length > 0) {
    lines.push(`Tus rutinas: ${ctx.routineNames.join(', ')}.`)
  }
  return lines.join(' ')
}

export async function sendMessage(text) {
  const ctx = await getUserContext()
  const category = findCategory(text)
  const lower = text.toLowerCase()

  // Greeting
  if (/^(hola|buenas|hey|ey|que tal|qué tal|buen dia|buenos dias)\b/.test(lower)) {
    const greeting = ctx.peso
      ? `¡Hola! ¿Cómo va todo? ${buildContextResponse(ctx)}\n\n¿En qué te puedo ayudar?`
      : '¡Hola! Soy Setto, tu coach fitness. Preguntame sobre entrenamiento, nutrición, rutinas, suplementos o lo que necesites.'
    return greeting
  }

  // User asking about their progress/data
  if (/progreso|como voy|cómo voy|como estoy|cómo estoy|mis datos|mi estado|resumen/.test(lower)) {
    if (!ctx.peso && ctx.todayMealsCount === 0 && ctx.weekWorkouts === 0) {
      return 'Todavía no tenés datos cargados. Empezá registrando tus medidas en Antropometría, tus comidas en Nutrición o hacé tu primer entreno.'
    }
    return buildContextResponse(ctx)
  }

  // User asking what can I eat / what should I eat
  if (/que (puedo|deberia|debería|debo|tendria|tendría que) (comer|desayunar|almorzar|cenar|merendar)/.test(lower)) {
    const remaining = 2200 - ctx.todayCalories
    if (remaining > 500) {
      return `Te quedan ~${remaining} kcal por hoy. Podrías comer algo con buena proteína como pollo con arroz (~520 kcal, 40g proteína) o una tortilla de verduras (~340 kcal, 22g proteína). Revisá las comidas sugeridas en la sección de Nutrición.`
    } else if (remaining > 0) {
      return `Te quedan solo ~${remaining} kcal. Optá por algo liviano como un yogur con granola (~220 kcal) o una fruta. No te pases del objetivo.`
    }
    return 'Ya llegaste a tu meta de calorías de hoy. Si tenés hambre, tomá agua o comé algo muy liviano como una fruta.'
  }

  // How many calories / protein
  if (/cuantas calorias|cuántas calorías|cuanta proteina|cuánta proteína|cuantos carbos|cuántos carbos/.test(lower)) {
    return `Hoy llevás ${ctx.todayCalories} kcal consumidas (meta: 2200). Proteína: ${ctx.todayProtein}g, Carbos: ${ctx.todayCarbs}g, Grasas: ${ctx.todayFat}g. Te faltan ${Math.max(0, 2200 - ctx.todayCalories)} kcal para llegar a tu objetivo.`
  }

  // Category-based response
  if (category && TIPS[category]) {
    return pickRandom(TIPS[category])
  }

  // Help / what can you do
  if (/ayuda|help|que (podes|podés|sabes|sabés) hacer|funciones|opciones/.test(lower)) {
    return 'Puedo ayudarte con:\n\n• Consejos de entrenamiento y rutinas\n• Tips de nutrición y dieta\n• Info sobre suplementos\n• Tu progreso y datos actuales\n• Motivación cuando la necesites\n• Cómo bajar/subir de peso\n• Técnica de ejercicios\n\nPreguntame lo que quieras.'
  }

  // Thank you
  if (/gracias|grax|thx|thank|genial|buenisimo|buenísimo|excelente|crack/.test(lower)) {
    return pickRandom([
      '¡De nada! Estoy acá para lo que necesites.',
      '¡Para eso estoy! Cualquier otra duda, mandá nomás.',
      '¡Genial! Seguí así y vas a ver resultados.',
    ])
  }

  // Fallback with random tip
  const allCategories = Object.keys(TIPS)
  const randomCat = pickRandom(allCategories)
  return `No estoy seguro de entender tu pregunta, pero acá va un tip:\n\n${pickRandom(TIPS[randomCat])}\n\nPodés preguntarme sobre rutinas, nutrición, suplementos, tu progreso, o escribí "ayuda" para ver todo lo que puedo hacer.`
}
