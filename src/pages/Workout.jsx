import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Card from '../components/ui/Card'
import { routinesDB, sessionsDB, generateId } from '../lib/db'
import exercisesData from '../data/exercises.json'

export default function Workout() {
  const navigate = useNavigate()
  const [routines, setRoutines] = useState([])
  const [sessions, setSessions] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedExercises, setSelectedExercises] = useState([])
  const [tab, setTab] = useState('routines')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [r, s] = await Promise.all([routinesDB.getAll(), sessionsDB.getAll()])
    setRoutines(r)
    setSessions(s.sort((a, b) => b.date?.localeCompare(a.date)))
  }

  async function createRoutine() {
    if (!newName.trim()) return
    const routine = {
      id: generateId(),
      name: newName.trim(),
      exercises: selectedExercises.map(id => {
        const ex = exercisesData.exercises.find(e => e.id === id)
        return { exerciseId: id, name: ex?.name || id, sets: 3 }
      }),
      createdAt: new Date().toISOString(),
    }
    await routinesDB.save(routine)
    setNewName('')
    setSelectedExercises([])
    setShowCreate(false)
    loadData()
  }

  async function loadTemplate(template) {
    const routine = {
      id: generateId(),
      name: template.name,
      exercises: template.exercises.map(id => {
        const ex = exercisesData.exercises.find(e => e.id === id)
        return { exerciseId: id, name: ex?.name || id, sets: 3 }
      }),
      createdAt: new Date().toISOString(),
    }
    await routinesDB.save(routine)
    setShowTemplates(false)
    loadData()
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

  const muscles = [...new Set(exercisesData.exercises.map(e => e.muscle))]

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
      <div className="px-5 mb-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {['routines', 'history'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                tab === t ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'
              }`}
            >
              {t === 'routines' ? 'Rutinas' : 'Historial'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-3 pb-6">
        {tab === 'routines' ? (
          <>
            {/* Templates Button */}
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
              routines.map(routine => (
                <Card key={routine.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{routine.name}</h3>
                      <p className="text-xs text-text-secondary mt-1">
                        {routine.exercises.length} ejercicios
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {routine.exercises.slice(0, 4).map((ex, i) => (
                          <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {ex.name}
                          </span>
                        ))}
                        {routine.exercises.length > 4 && (
                          <span className="text-[10px] text-text-secondary">+{routine.exercises.length - 4} más</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => deleteRoutine(routine.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => startSession(routine)}
                    className="mt-3 w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition-transform"
                  >
                    Iniciar Sesión
                  </button>
                </Card>
              ))
            )}
          </>
        ) : (
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
                      <span className="material-symbols-outlined text-gray-300 text-lg">chevron_right</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </>
        )}
      </div>

      {/* Create Routine Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Nueva Rutina</h2>
              <button onClick={() => setShowCreate(false)} className="p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <input
              type="text"
              placeholder="Nombre de la rutina"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm mb-4 focus:outline-none focus:border-primary"
            />

            <p className="text-xs font-semibold text-text-secondary mb-2">Seleccionar ejercicios</p>
            {muscles.map(muscle => (
              <div key={muscle} className="mb-3">
                <p className="text-xs font-bold text-primary mb-1">{muscle}</p>
                <div className="space-y-1">
                  {exercisesData.exercises.filter(e => e.muscle === muscle).map(ex => (
                    <label key={ex.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedExercises.includes(ex.id)}
                        onChange={() => {
                          setSelectedExercises(prev =>
                            prev.includes(ex.id) ? prev.filter(id => id !== ex.id) : [...prev, ex.id]
                          )
                        }}
                        className="accent-primary w-4 h-4"
                      />
                      <span className="text-sm">{ex.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={createRoutine}
              disabled={!newName.trim() || selectedExercises.length === 0}
              className="w-full py-3 bg-primary text-white text-sm font-semibold rounded-xl mt-4 disabled:opacity-40"
            >
              Crear Rutina ({selectedExercises.length} ejercicios)
            </button>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Rutinas Predefinidas</h2>
              <button onClick={() => setShowTemplates(false)} className="p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3">
              {exercisesData.routineTemplates.map((t, i) => (
                <Card key={i} onClick={() => loadTemplate(t)}>
                  <h3 className="font-semibold text-sm">{t.name}</h3>
                  <p className="text-xs text-text-secondary mt-1">
                    {t.exercises.map(id => exercisesData.exercises.find(e => e.id === id)?.name).filter(Boolean).join(', ')}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
