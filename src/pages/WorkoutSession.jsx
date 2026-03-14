import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import { sessionsDB } from '../lib/db'

export default function WorkoutSession() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    sessionsDB.get(id).then(s => {
      if (s) {
        setSession(s)
        if (!s.completed) {
          timerRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - s.startTime) / 1000))
          }, 1000)
        }
      }
    })
    return () => clearInterval(timerRef.current)
  }, [id])

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
      </div>
    )
  }

  const currentExercise = session.exercises[currentIdx]
  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0
  )
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  async function updateSet(exIdx, setIdx, field, value) {
    const updated = { ...session }
    updated.exercises = [...session.exercises]
    updated.exercises[exIdx] = { ...updated.exercises[exIdx] }
    updated.exercises[exIdx].sets = [...updated.exercises[exIdx].sets]
    updated.exercises[exIdx].sets[setIdx] = {
      ...updated.exercises[exIdx].sets[setIdx],
      [field]: value,
    }
    setSession(updated)
    await sessionsDB.save(updated)
  }

  async function toggleSet(exIdx, setIdx) {
    const set = session.exercises[exIdx].sets[setIdx]
    await updateSet(exIdx, setIdx, 'completed', !set.completed)
  }

  async function finishSession() {
    clearInterval(timerRef.current)
    const updated = {
      ...session,
      completed: true,
      endTime: Date.now(),
      duration: elapsed,
    }
    await sessionsDB.save(updated)
    setSession(updated)
    navigate('/workout')
  }

  async function addSet(exIdx) {
    const updated = { ...session }
    updated.exercises = [...session.exercises]
    updated.exercises[exIdx] = { ...updated.exercises[exIdx] }
    updated.exercises[exIdx].sets = [
      ...updated.exercises[exIdx].sets,
      { weight: '', reps: '', completed: false },
    ]
    setSession(updated)
    await sessionsDB.save(updated)
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-md px-5 pt-4 pb-3 safe-top">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/workout')} className="flex items-center gap-1 text-text-secondary">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="text-sm">Volver</span>
          </button>
          {!session.completed && (
            <button onClick={finishSession} className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-full">
              Finalizar
            </button>
          )}
        </div>
      </header>

      <div className="px-5 space-y-4 pb-6">
        {/* Session Info */}
        <div>
          <h2 className="text-xl font-bold">{session.routineName}</h2>
          <div className="flex items-center gap-4 mt-1 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">timer</span>
              {formatTime(session.completed ? session.duration : elapsed)}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {completedSets}/{totalSets} series
            </span>
            <span>{session.date}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }}
          />
        </div>

        {/* Exercise Tabs */}
        {!session.completed && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 no-scrollbar">
            {session.exercises.map((ex, i) => {
              const done = ex.sets.every(s => s.completed)
              return (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    i === currentIdx
                      ? 'bg-primary text-white'
                      : done
                        ? 'bg-primary/10 text-primary'
                        : 'bg-gray-100 text-text-secondary'
                  }`}
                >
                  {ex.name}
                  {done && ' ✓'}
                </button>
              )
            })}
          </div>
        )}

        {/* Exercise Cards */}
        {session.completed ? (
          session.exercises.map((ex, exIdx) => (
            <Card key={exIdx}>
              <h3 className="font-semibold text-sm mb-2">{ex.name}</h3>
              <div className="space-y-1">
                {ex.sets.map((set, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-3 text-xs">
                    <span className="text-text-secondary w-14">Serie {setIdx + 1}</span>
                    <span className="font-medium">{set.weight || '—'} kg</span>
                    <span className="text-text-secondary">×</span>
                    <span className="font-medium">{set.reps || '—'} reps</span>
                    {set.completed && <span className="material-symbols-outlined text-primary text-sm filled">check_circle</span>}
                  </div>
                ))}
              </div>
            </Card>
          ))
        ) : (
          currentExercise && (
            <Card className="!p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base">{currentExercise.name}</h3>
                <button
                  onClick={() => addSet(currentIdx)}
                  className="text-xs text-primary font-semibold flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Serie
                </button>
              </div>

              {/* Sets Table Header */}
              <div className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 text-[10px] text-text-secondary font-semibold uppercase mb-2 px-1">
                <span>Serie</span>
                <span>Peso (kg)</span>
                <span>Reps</span>
                <span></span>
              </div>

              <div className="space-y-2">
                {currentExercise.sets.map((set, setIdx) => (
                  <div
                    key={setIdx}
                    className={`grid grid-cols-[40px_1fr_1fr_40px] gap-2 items-center p-2 rounded-xl transition-colors ${
                      set.completed ? 'bg-primary/5' : 'bg-gray-50'
                    }`}
                  >
                    <span className="text-xs font-bold text-text-secondary text-center">{setIdx + 1}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={set.weight}
                      onChange={e => updateSet(currentIdx, setIdx, 'weight', e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-lg text-sm text-center font-medium border border-gray-200 focus:outline-none focus:border-primary"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={set.reps}
                      onChange={e => updateSet(currentIdx, setIdx, 'reps', e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-lg text-sm text-center font-medium border border-gray-200 focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => toggleSet(currentIdx, setIdx)}
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                        set.completed ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">check</span>
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )
        )}

        {/* Upcoming Exercises */}
        {!session.completed && session.exercises.length > 1 && (
          <div>
            <h4 className="text-xs font-semibold text-text-secondary mb-2 uppercase">Próximos ejercicios</h4>
            <div className="space-y-1.5">
              {session.exercises.map((ex, i) => {
                if (i === currentIdx) return null
                const done = ex.sets.every(s => s.completed)
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                      done ? 'bg-primary/5' : 'bg-white'
                    } border border-gray-100`}
                  >
                    <span className="text-sm font-medium">{ex.name}</span>
                    <span className={`material-symbols-outlined text-lg ${done ? 'text-primary filled' : 'text-gray-300'}`}>
                      {done ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
