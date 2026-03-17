import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Card from '../components/ui/Card'
import ExercisePicker from '../components/ExercisePicker'
import ExerciseDetail from '../components/ExerciseDetail'
import { routinesDB, sessionsDB, generateId } from '../lib/db'
import { getExercisesByBodyPart } from '../lib/exercisedb'
import { getSearchTermsForId, searchFirstWithImage, getDisplayName } from '../lib/exerciseSearch'
import exercisesData from '../data/exercises.json'

const BODY_PARTS = [
  { id: 'chest',       label: 'Pecho',        icon: 'fitness_center'      },
  { id: 'back',        label: 'Espalda',       icon: 'sports_gymnastics'   },
  { id: 'shoulders',   label: 'Hombros',       icon: 'sports_martial_arts' },
  { id: 'upper arms',  label: 'Brazos',        icon: 'sports_handball'     },
  { id: 'lower arms',  label: 'Antebrazos',    icon: 'front_hand'          },
  { id: 'upper legs',  label: 'Piernas',       icon: 'directions_run'      },
  { id: 'lower legs',  label: 'Pantorrillas',  icon: 'hiking'              },
  { id: 'waist',       label: 'Abdomen',       icon: 'self_improvement'    },
  { id: 'cardio',      label: 'Cardio',        icon: 'monitor_heart'       },
  { id: 'neck',        label: 'Cuello',        icon: 'accessibility_new'   },
]

const TEMPLATE_CATEGORIES = [...new Set(exercisesData.routineTemplates.map(t => t.category))]

function formatDateWithWeekday(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.toLocaleDateString('es-ES', { weekday: 'long' })
  const short = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  return `${short} · ${day.charAt(0).toUpperCase() + day.slice(1)}`
}

// Íconos distintivos para rutinas (sin colores llamativos)
const COVERS = [
  { icon: 'local_fire_department', label: 'push'    },
  { icon: 'exercise',              label: 'pull'    },
  { icon: 'sprint',                label: 'legs'    },
  { icon: 'self_improvement',      label: 'core'    },
  { icon: 'bolt',                  label: 'full'    },
  { icon: 'sports_gymnastics',     label: 'upper'   },
  { icon: 'sports_martial_arts',   label: 'cardio'  },
  { icon: 'fitness_center',        label: 'default' },
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
  const [previewRoutine, setPreviewRoutine] = useState(null)
  const [newName, setNewName] = useState('')
  const [selectedExercises, setSelectedExercises] = useState([])
  const [tab, setTab] = useState('routines')
  const [templateFilter, setTemplateFilter] = useState('')
  const [bodyPartPreviews, setBodyPartPreviews] = useState({})
  const [previewsLoaded, setPreviewsLoaded] = useState(false)

  const enrichedRoutinesRef = useRef(new Set())

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (routines.length === 0) return
    routines.forEach(async routine => {
      const needsImages = routine.exercises?.some(
        ex => !ex.imageUrl && getSearchTermsForId(ex.exerciseId).length > 0
      )
      if (!needsImages || enrichedRoutinesRef.current.has(routine.id)) return
      enrichedRoutinesRef.current.add(routine.id)
      try {
        const enriched = await Promise.all(
          routine.exercises.map(async ex => {
            const terms = getSearchTermsForId(ex.exerciseId)
            if (!terms.length || ex.imageUrl) return ex
            const found = await searchFirstWithImage(terms)
            if (found) return { ...ex, imageUrl: found.imageUrl || '', targetMuscles: found.targetMuscles || [] }
            return ex
          })
        )
        const updated = { ...routine, exercises: enriched }
        if (enriched.some((e, i) => e.imageUrl !== (routine.exercises[i]?.imageUrl))) {
          await routinesDB.save(updated)
          loadData()
        }
      } catch { /* ignore */ }
    })
  }, [routines])

  useEffect(() => {
    if (tab === 'explore' && !previewsLoaded) {
      setPreviewsLoaded(true)
      Promise.allSettled(
        BODY_PARTS.map(bp =>
          getExercisesByBodyPart(bp.id, { limit: 1 })
            .then(data => ({ id: bp.id, gif: data.exercises?.[0]?.imageUrl || null }))
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
        imageUrl: ex.imageUrl || '',
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
        imageUrl: ex.imageUrl || '',
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
      return { exerciseId: id, name: ex?.name || id, imageUrl: '', targetMuscles: [], sets: 3 }
    })
    const routine = {
      id: generateId(),
      name: template.name,
      imageUrl: template.imageUrl || '',
      exercises,
      createdAt: new Date().toISOString(),
    }
    await routinesDB.save(routine)
    setShowTemplates(false)
    loadData()
    // Enriquece con imágenes de ejercicios en segundo plano (no bloquea UI)
    enrichRoutineWithImages(routine.id, exercises)
  }

  async function enrichRoutineWithImages(routineId, exercises) {
    try {
      const enriched = await Promise.all(
        exercises.map(async ex => {
          const terms = getSearchTermsForId(ex.exerciseId)
          if (!terms.length) return ex
          try {
            const found = await searchFirstWithImage(terms)
            if (found) {
              return {
                ...ex,
                imageUrl: found.imageUrl || '',
                targetMuscles: found.targetMuscles || [],
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
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Nueva
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
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">library_add</span>
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
                const cover = getRoutineCover(routine.name)
                return (
                  <Card key={routine.id} className="p-0! overflow-hidden">
                    {/* Tappable area → preview */}
                    <button
                      onClick={() => setPreviewRoutine(routine)}
                      className="w-full px-4 pt-3 pb-2.5 text-left active:bg-border/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary text-base">{cover.icon}</span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-text truncate">{routine.name}</h3>
                            <p className="text-[10px] text-text-secondary">{routine.exercises.length} ejercicios · Ver detalle</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-text-secondary/40 text-base mt-0.5 shrink-0">chevron_right</span>
                      </div>

                      {/* Exercise tags */}
                      <div className="flex flex-wrap gap-1">
                        {routine.exercises.slice(0, 4).map((ex, i) => (
                          <span key={i} className="text-[9px] bg-border/60 text-text-secondary px-1.5 py-0.5 rounded-md truncate max-w-[120px]">
                            {getDisplayName(ex.exerciseId) || ex.name}
                          </span>
                        ))}
                        {routine.exercises.length > 4 && (
                          <span className="text-[9px] text-text-secondary/60 self-center">+{routine.exercises.length - 4}</span>
                        )}
                      </div>
                    </button>

                    {/* Action row */}
                    <div className="flex items-center gap-2 px-4 pb-3 pt-2 border-t border-border/50">
                      <button
                        onClick={() => startSession(routine)}
                        className="flex-1 py-2 border border-primary text-primary text-xs font-semibold rounded-xl active:scale-[0.98] transition-all hover:bg-primary/8"
                      >
                        Empezar rutina
                      </button>
                      <button
                        onClick={() => deleteRoutine(routine.id)}
                        className="p-2 text-text-secondary/40 hover:text-red-400 transition-colors rounded-xl"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
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
                    className="relative overflow-hidden rounded-2xl bg-card border border-border active:scale-[0.97] transition-all text-left h-24"
                  >
                    {gif && (
                      <img
                        src={gif}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-10"
                        loading="lazy"
                      />
                    )}
                    <div className="relative z-10 flex items-center gap-3 px-3.5 h-full">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-lg">{bp.icon}</span>
                      </div>
                      <span className="text-sm font-bold text-text">{bp.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Quick Search */}
            <button
              onClick={() => setShowPicker(true)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-xl">search</span>
              </div>
              <div className="text-left">
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
                <Card key={session.id} className="!p-3" onClick={() => navigate(`/workout/session/${session.id}`)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-xs">{session.routineName}</h3>
                      <p className="text-[10px] text-text-secondary mt-0.5">{formatDateWithWeekday(session.date)}</p>
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
                      {ex.imageUrl ? (
                        <img src={ex.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-track shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-track flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-text-secondary text-sm">fitness_center</span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-text flex-1 truncate">{getDisplayName(ex.exerciseId) || ex.name}</span>
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
                      {ex.imageUrl ? (
                        <img src={ex.imageUrl} alt={ex.name} className="w-14 h-14 rounded-lg object-cover bg-track shrink-0" loading="lazy" />
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

      {/* ==================== ROUTINE PREVIEW MODAL ==================== */}
      {previewRoutine && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center pb-[72px]" onClick={() => setPreviewRoutine(null)}>
          <div
            className="bg-card w-full max-w-lg rounded-3xl max-h-[78vh] flex flex-col animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-sm">
                    {getRoutineCover(previewRoutine.name).icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm text-text truncate">{previewRoutine.name}</h2>
                  <p className="text-[10px] text-text-secondary">{previewRoutine.exercises.length} ejercicios</p>
                </div>
              </div>
              <button onClick={() => setPreviewRoutine(null)} className="p-1.5 text-text-secondary rounded-full hover:bg-border/50">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Exercise list */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-1.5">
              {previewRoutine.exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl bg-bg border border-border">
                  {ex.imageUrl ? (
                    <img src={ex.imageUrl} alt={getDisplayName(ex.exerciseId) || ex.name} className="w-9 h-9 rounded-lg object-cover bg-track shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-track flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-text-secondary/40 text-base">fitness_center</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text truncate">{getDisplayName(ex.exerciseId) || ex.name}</p>
                        <p className="text-[10px] text-text-secondary">{ex.sets} series</p>
                        {ex.targetMuscles?.length > 0 && (
                          <p className="text-[10px] text-primary/70 truncate mt-0.5">{ex.targetMuscles.slice(0, 2).join(' · ')}</p>
                        )}
                      </div>
                      <span className="text-xs font-bold text-text-secondary/40 shrink-0">#{i + 1}</span>
                    </div>
                  ))}
                </div>

            {/* CTA */}
            <div className="px-4 py-3 border-t border-border shrink-0">
              <button
                onClick={() => { setPreviewRoutine(null); startSession(previewRoutine) }}
                className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all"
              >
                Empezar rutina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
