import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Card from '../components/ui/Card'
import ExercisePicker from '../components/ExercisePicker'
import ExerciseDetail from '../components/ExerciseDetail'
import { routinesDB, sessionsDB, generateId } from '../lib/db'
import { getExercisesByBodyPart, searchExercises } from '../lib/exercisedb'
import exercisesData from '../data/exercises.json'

// Mapeo local → término de búsqueda en ExerciseDB (para enriquecer templates con GIFs)
const LOCAL_TO_SEARCH = {
  'bench-press':    'barbell bench press chest',
  'incline-bench':  'incline barbell bench press',
  'chest-fly':      'dumbbell fly chest',
  'cable-crossover':'cable crossover chest fly',
  'tricep-pushdown':'cable tricep pushdown',
  'skull-crusher':  'skull crusher ez bar tricep',
  'overhead-tricep':'overhead tricep extension dumbbell',
  'deadlift':       'barbell deadlift back',
  'barbell-row':    'bent over barbell row',
  'lat-pulldown':   'cable lat pulldown',
  'seated-row':     'seated cable row',
  'barbell-curl':   'barbell curl bicep',
  'hammer-curl':    'dumbbell hammer curl bicep',
  'preacher-curl':  'preacher curl bicep',
  'squat':          'barbell squat legs',
  'leg-press':      'leg press machine',
  'leg-extension':  'leg extension machine quad',
  'leg-curl':       'lying leg curl hamstring',
  'calf-raise':     'standing calf raise',
  'shoulder-press': 'barbell overhead shoulder press',
  'lateral-raise':  'dumbbell lateral raise shoulder',
  'face-pull':      'cable face pull rear delt',
  'plank':          'plank abs core',
  'crunch':         'crunch abs',
}

const BODY_PARTS = [
  { id: 'chest',       label: 'Pecho',        icon: 'fitness_center',     color: 'bg-red-500' },
  { id: 'back',        label: 'Espalda',       icon: 'sports_gymnastics',  color: 'bg-blue-500' },
  { id: 'shoulders',   label: 'Hombros',       icon: 'sports_martial_arts',color: 'bg-amber-500' },
  { id: 'upper arms',  label: 'Brazos',        icon: 'sports_handball',    color: 'bg-purple-500' },
  { id: 'lower arms',  label: 'Antebrazos',    icon: 'front_hand',         color: 'bg-pink-500' },
  { id: 'upper legs',  label: 'Piernas',       icon: 'directions_run',     color: 'bg-green-600' },
  { id: 'lower legs',  label: 'Pantorrillas',  icon: 'hiking',             color: 'bg-teal-500' },
  { id: 'waist',       label: 'Abdomen',       icon: 'self_improvement',   color: 'bg-orange-500' },
  { id: 'cardio',      label: 'Cardio',        icon: 'monitor_heart',      color: 'bg-rose-500' },
  { id: 'neck',        label: 'Cuello',        icon: 'accessibility_new',  color: 'bg-cyan-500' },
]

const TEMPLATE_CATEGORIES = [...new Set(exercisesData.routineTemplates.map(t => t.category))]

// Portadas distintivas para rutinas sin GIF
const COVERS = [
  { gradient: 'from-red-500/70 to-orange-400/60',   icon: 'local_fire_department', label: 'push'    },
  { gradient: 'from-blue-500/70 to-cyan-400/60',    icon: 'exercise',              label: 'pull'    },
  { gradient: 'from-violet-500/70 to-purple-400/60',icon: 'sprint',                label: 'legs'    },
  { gradient: 'from-emerald-500/70 to-teal-400/60', icon: 'self_improvement',      label: 'core'    },
  { gradient: 'from-amber-500/70 to-yellow-400/60', icon: 'bolt',                  label: 'full'    },
  { gradient: 'from-cyan-500/70 to-sky-400/60',     icon: 'sports_gymnastics',     label: 'upper'   },
  { gradient: 'from-rose-500/70 to-pink-400/60',    icon: 'sports_martial_arts',   label: 'cardio'  },
  { gradient: 'from-indigo-500/70 to-blue-400/60',  icon: 'fitness_center',        label: 'default' },
]

function getRoutineCover(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return COVERS[h % COVERS.length]
}

export default function Workout() {
  const navigate = useNavigate()
  const [routines, setRoutines] = useState([])
  const [sessions, setSessions] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [showBodyPartExercises, setShowBodyPartExercises] = useState(null)
  const [bodyPartExercises, setBodyPartExercises] = useState([])
  const [bodyPartLoading, setBodyPartLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedExercises, setSelectedExercises] = useState([])
  const [tab, setTab] = useState('routines')
  const [templateFilter, setTemplateFilter] = useState('')
  const [bodyPartPreviews, setBodyPartPreviews] = useState({})
  const [previewsLoaded, setPreviewsLoaded] = useState(false)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (tab === 'explore' && !previewsLoaded) {
      setPreviewsLoaded(true)
      Promise.allSettled(
        BODY_PARTS.map(bp =>
          getExercisesByBodyPart(bp.id, { limit: 1 })
            .then(data => ({ id: bp.id, gif: data.exercises?.[0]?.gifUrl || null }))
            .catch(() => ({ id: bp.id, gif: null }))
        )
      ).then(results => {
        const previews = {}
        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value.gif) {
            previews[r.value.id] = r.value.gif
          }
        })
        setBodyPartPreviews(previews)
      })
    }
  }, [tab, previewsLoaded])

  async function loadData() {
    const [r, s] = await Promise.all([routinesDB.getAll(), sessionsDB.getAll()])
    setRoutines(r)
    setSessions(s.sort((a, b) => b.date?.localeCompare(a.date)))
  }

  function handleToggleExercise(ex) {
    setSelectedExercises(prev => {
      const exists = prev.some(s => s.exerciseId === ex.exerciseId)
      if (exists) return prev.filter(s => s.exerciseId !== ex.exerciseId)
      return [...prev, {
        exerciseId: ex.exerciseId,
        name: ex.name,
        gifUrl: ex.gifUrl || '',
        targetMuscles: ex.targetMuscles || [],
      }]
    })
  }

  async function createRoutine() {
    if (!newName.trim() || selectedExercises.length === 0) return
    const routine = {
      id: generateId(),
      name: newName.trim(),
      exercises: selectedExercises.map(ex => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        gifUrl: ex.gifUrl || '',
        targetMuscles: ex.targetMuscles || [],
        sets: 3,
      })),
      createdAt: new Date().toISOString(),
    }
    await routinesDB.save(routine)
    setNewName('')
    setSelectedExercises([])
    setShowCreate(false)
    loadData()
  }

  async function loadTemplate(template) {
    const exercises = template.exercises.map(id => {
      const ex = exercisesData.exercises.find(e => e.id === id)
      return { exerciseId: id, name: ex?.name || id, gifUrl: '', targetMuscles: [], sets: 3 }
    })
    const routine = {
      id: generateId(),
      name: template.name,
      exercises,
      createdAt: new Date().toISOString(),
    }
    await routinesDB.save(routine)
    setShowTemplates(false)
    loadData()
    // Enriquece con GIFs en segundo plano (no bloquea UI)
    enrichRoutineWithGifs(routine.id, exercises)
  }

  async function enrichRoutineWithGifs(routineId, exercises) {
    try {
      const enriched = await Promise.all(
        exercises.map(async ex => {
          const term = LOCAL_TO_SEARCH[ex.exerciseId]
          if (!term) return ex
          try {
            const { exercises: results } = await searchExercises(term, { limit: 1 })
            if (results?.[0]) {
              return {
                ...ex,
                gifUrl: results[0].gifUrl || '',
                targetMuscles: results[0].targetMuscles || [],
              }
            }
          } catch { /* ignore */ }
          return ex
        })
      )
      const saved = await routinesDB.get(routineId)
      if (saved) {
        await routinesDB.save({ ...saved, exercises: enriched })
        loadData()
      }
    } catch { /* ignore */ }
  }

  function startSession(routine) {
    const sessionId = generateId()
    const session = {
      id: sessionId,
      routineId: routine.id,
      routineName: routine.name,
      date: new Date().toISOString().split('T')[0],
      startTime: Date.now(),
      exercises: routine.exercises.map(ex => ({
        ...ex,
        sets: Array.from({ length: ex.sets }, () => ({ weight: '', reps: '', completed: false })),
      })),
      completed: false,
    }
    sessionsDB.save(session).then(() => {
      navigate(`/workout/session/${sessionId}`)
    })
  }

  async function deleteRoutine(id) {
    await routinesDB.delete(id)
    loadData()
  }

  async function openBodyPart(bp) {
    setShowBodyPartExercises(bp)
    setBodyPartLoading(true)
    setBodyPartExercises([])
    try {
      const data = await getExercisesByBodyPart(bp.id, { limit: 25 })
      setBodyPartExercises(data.exercises || [])
    } catch { setBodyPartExercises([]) }
    finally { setBodyPartLoading(false) }
  }

  const filteredTemplates = templateFilter
    ? exercisesData.routineTemplates.filter(t => t.category === templateFilter)
    : exercisesData.routineTemplates

  return (
    <div className="min-h-full">
      <Header title="Entrenamiento">
        <div className="flex items-center gap-2 pr-1">
          <button
            onClick={() => setShowCreate(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
        </div>
      </Header>

      {/* Tabs */}
      <div className="px-5 pt-5 mb-4">
        <div className="flex bg-track rounded-xl p-1">
          {['routines', 'explore', 'history'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                tab === t ? 'bg-card text-primary shadow-sm' : 'text-text-secondary'
              }`}
            >
              {t === 'routines' ? 'Rutinas' : t === 'explore' ? 'Explorar' : 'Historial'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-3 pb-6">
        {/* ==================== RUTINAS ==================== */}
        {tab === 'routines' && (
          <>
            <button
              onClick={() => setShowTemplates(true)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors"
            >
              <span className="material-symbols-outlined">library_add</span>
              <span className="text-sm font-semibold">Cargar rutina predefinida</span>
            </button>

            {routines.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <span className="material-symbols-outlined text-4xl mb-2 block">fitness_center</span>
                <p className="text-sm">No tenés rutinas aún</p>
                <p className="text-xs mt-1">Creá una nueva o cargá un template</p>
              </div>
            ) : (
              routines.map(routine => {
                const previewGif = routine.exercises.find(ex => ex.gifUrl)?.gifUrl
                const cover = getRoutineCover(routine.name)
                return (
                  <Card key={routine.id} className="overflow-hidden p-0!">
                    {/* Portada */}
                    <div className="relative w-full h-28 overflow-hidden">
                      {previewGif ? (
                        <img
                          src={previewGif}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className={`absolute inset-0 bg-linear-to-br ${cover.gradient}`} />
                      )}
                      {/* Overlay oscuro en la parte inferior para legibilidad */}
                      <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
                      {/* Icono decorativo si no hay GIF */}
                      {!previewGif && (
                        <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20 text-7xl select-none">
                          {cover.icon}
                        </span>
                      )}
                      {/* Nombre sobre la portada */}
                      <div className="absolute bottom-0 left-0 right-0 px-4 py-2.5">
                        <h3 className="font-bold text-base text-white truncate drop-shadow">
                          {routine.name}
                        </h3>
                        <p className="text-xs text-white/70 mt-0.5">
                          {routine.exercises.length} ejercicios
                        </p>
                      </div>
                      {/* Botón eliminar */}
                      <button
                        onClick={() => deleteRoutine(routine.id)}
                        className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-lg bg-black/30 text-white/80 hover:bg-black/50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>

                    <div className="px-4 pt-3 pb-4">
                      <div className="flex flex-wrap gap-1 mb-3">
                        {routine.exercises.slice(0, 4).map((ex, i) => (
                          <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-lg truncate max-w-[130px]">
                            {ex.name}
                          </span>
                        ))}
                        {routine.exercises.length > 4 && (
                          <span className="text-[10px] text-text-secondary self-center">+{routine.exercises.length - 4}</span>
                        )}
                      </div>

                      <button
                        onClick={() => startSession(routine)}
                        className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition-transform"
                      >
                        Empezar rutina
                      </button>
                    </div>
                  </Card>
                )
              })
            )}
          </>
        )}

        {/* ==================== EXPLORAR ==================== */}
        {tab === 'explore' && (
          <>
            {/* Body Parts Grid */}
            <p className="text-xs font-semibold text-text-secondary uppercase">Por grupo muscular</p>
            <div className="grid grid-cols-2 gap-2.5">
              {BODY_PARTS.map(bp => {
                const gif = bodyPartPreviews[bp.id]
                return (
                  <button
                    key={bp.id}
                    onClick={() => openBodyPart(bp)}
                    className="relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/30 transition-all active:scale-[0.97] text-left h-28"
                  >
                    {/* Background GIF or gradient */}
                    {gif ? (
                      <img
                        src={gif}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-40"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`absolute inset-0 ${bp.color} opacity-15`} />
                    )}
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
                    {/* Icon top-right */}
                    <div className={`absolute top-3 right-3 w-8 h-8 rounded-lg ${bp.color} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-white text-base">{bp.icon}</span>
                    </div>
                    {/* Label bottom */}
                    <span className="absolute bottom-3 left-3 text-sm font-bold text-white drop-shadow">
                      {bp.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Quick Search */}
            <button
              onClick={() => setShowPicker(true)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-xl">search</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-text">Buscar ejercicio</p>
                <p className="text-[11px] text-text-secondary">+1500 ejercicios con GIFs</p>
              </div>
            </button>
          </>
        )}

        {/* ==================== HISTORIAL ==================== */}
        {tab === 'history' && (
          <>
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <span className="material-symbols-outlined text-4xl mb-2 block">history</span>
                <p className="text-sm">Sin sesiones registradas</p>
              </div>
            ) : (
              sessions.map(session => (
                <Card key={session.id} onClick={() => navigate(`/workout/session/${session.id}`)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{session.routineName}</h3>
                      <p className="text-xs text-text-secondary mt-0.5">{session.date}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {session.completed && (
                        <span className="material-symbols-outlined text-primary text-lg filled">check_circle</span>
                      )}
                      <span className="material-symbols-outlined text-text-secondary text-lg">chevron_right</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </>
        )}
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Create Routine Modal */}
      {showCreate && !showPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-card w-full max-w-lg rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text">Nueva Rutina</h2>
              <button onClick={() => { setShowCreate(false); setSelectedExercises([]); setNewName('') }} className="p-1">
                <span className="material-symbols-outlined text-text-secondary">close</span>
              </button>
            </div>

            <input
              type="text"
              placeholder="Nombre de la rutina"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-bg border border-border text-sm text-text mb-4 focus:outline-none focus:border-primary"
            />

            {selectedExercises.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-text-secondary mb-2">
                  Ejercicios seleccionados ({selectedExercises.length})
                </p>
                <div className="space-y-1.5">
                  {selectedExercises.map((ex) => (
                    <div key={ex.exerciseId} className="flex items-center gap-3 p-2.5 rounded-xl bg-bg border border-border">
                      {ex.gifUrl ? (
                        <img src={ex.gifUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-track shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-track flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-text-secondary text-sm">fitness_center</span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-text flex-1 truncate">{ex.name}</span>
                      <button
                        onClick={() => setSelectedExercises(prev => prev.filter(s => s.exerciseId !== ex.exerciseId))}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowPicker(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors mb-4"
            >
              <span className="material-symbols-outlined text-lg">search</span>
              Buscar y agregar ejercicios
            </button>

            <button
              onClick={createRoutine}
              disabled={!newName.trim() || selectedExercises.length === 0}
              className="w-full py-3 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-40"
            >
              Crear Rutina ({selectedExercises.length} ejercicios)
            </button>
          </div>
        </div>
      )}

      {/* ExercisePicker */}
      {showPicker && (
        <ExercisePicker
          selected={selectedExercises}
          onToggle={handleToggleExercise}
          onClose={() => setShowPicker(false)}
          onViewDetail={(ex) => setShowDetail(ex)}
        />
      )}

      {/* Exercise Detail */}
      {showDetail && (
        <ExerciseDetail
          exercise={showDetail}
          onClose={() => setShowDetail(null)}
          onAdd={showCreate ? (ex) => { handleToggleExercise(ex); setShowDetail(null) } : undefined}
        />
      )}

      {/* Body Part Exercises Modal */}
      {showBodyPartExercises && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-card w-full max-w-lg rounded-t-3xl flex flex-col max-h-[90vh] animate-slide-up">
            <div className="flex items-center gap-3 p-5 pb-3 shrink-0">
              <div className={`w-10 h-10 rounded-xl ${showBodyPartExercises.color} flex items-center justify-center shrink-0`}>
                <span className="material-symbols-outlined text-white text-lg">{showBodyPartExercises.icon}</span>
              </div>
              <h2 className="text-lg font-bold text-text flex-1">{showBodyPartExercises.label}</h2>
              <button onClick={() => setShowBodyPartExercises(null)} className="p-1">
                <span className="material-symbols-outlined text-text-secondary">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {bodyPartLoading ? (
                <div className="flex justify-center py-12">
                  <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                </div>
              ) : bodyPartExercises.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">
                  <p className="text-sm">No se encontraron ejercicios</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bodyPartExercises.map(ex => (
                    <button
                      key={ex.exerciseId}
                      onClick={() => setShowDetail(ex)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-bg border border-border hover:border-primary/30 transition-colors text-left"
                    >
                      {ex.gifUrl ? (
                        <img src={ex.gifUrl} alt={ex.name} className="w-14 h-14 rounded-lg object-cover bg-track shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-track flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-text-secondary">fitness_center</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{ex.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(ex.targetMuscles || []).slice(0, 2).map(m => (
                            <span key={m} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full capitalize">{m}</span>
                          ))}
                          {(ex.equipments || []).slice(0, 1).map(e => (
                            <span key={e} className="text-[10px] bg-track text-text-secondary px-1.5 py-0.5 rounded-full capitalize">{e}</span>
                          ))}
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-text-secondary text-lg shrink-0">chevron_right</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-card w-full max-w-lg rounded-t-3xl flex flex-col max-h-[85vh] animate-slide-up">
            <div className="flex items-center justify-between p-5 pb-3 shrink-0">
              <h2 className="text-lg font-bold text-text">Rutinas Predefinidas</h2>
              <button onClick={() => setShowTemplates(false)} className="p-1">
                <span className="material-symbols-outlined text-text-secondary">close</span>
              </button>
            </div>

            {/* Category filters */}
            <div className="flex gap-1.5 overflow-x-auto px-5 pb-3 no-scrollbar shrink-0">
              <button
                onClick={() => setTemplateFilter('')}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  !templateFilter ? 'bg-primary text-white' : 'bg-bg text-text-secondary border border-border'
                }`}
              >
                Todas
              </button>
              {TEMPLATE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setTemplateFilter(templateFilter === cat ? '' : cat)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    templateFilter === cat ? 'bg-primary text-white' : 'bg-bg text-text-secondary border border-border'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2.5">
              {filteredTemplates.map((t, i) => (
                <button
                  key={i}
                  onClick={() => loadTemplate(t)}
                  className="w-full text-left p-4 rounded-2xl bg-bg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm text-text">{t.name}</h3>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t.category}</span>
                  </div>
                  <p className="text-xs text-text-secondary mb-2">{t.description}</p>
                  <p className="text-[11px] text-text-secondary">
                    {t.exercises.map(id => exercisesData.exercises.find(e => e.id === id)?.name).filter(Boolean).join(' · ')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
