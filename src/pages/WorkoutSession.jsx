import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import ExerciseDetail from '../components/ExerciseDetail'
import { sessionsDB } from '../lib/db'
import { useActiveSession } from '../contexts/ActiveSessionContext'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function WorkoutSession() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeSession, setActiveSession, clearActiveSession, elapsed } = useActiveSession()
  const [session, setSession] = useState(null)
  const [showDetail, setShowDetail] = useState(null)

  useEffect(() => {
    sessionsDB.get(id).then(s => {
      if (s) {
        setSession(s)
        if (!s.completed) {
          setActiveSession({
            sessionId: s.id,
            routineName: s.routineName,
            startTime: s.startTime,
          })
        }
      }
    })
  }, [id])

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
      </div>
    )
  }

  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0
  )
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0

  async function updateSet(exIdx, setIdx, field, value) {
    const updated = { ...session }
    updated.exercises = session.exercises.map((ex, ei) =>
      ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((set, si) =>
          si !== setIdx ? set : { ...set, [field]: value }
        ),
      }
    )
    setSession(updated)
    await sessionsDB.save(updated)
  }

  async function toggleSet(exIdx, setIdx) {
    const set = session.exercises[exIdx].sets[setIdx]
    await updateSet(exIdx, setIdx, 'completed', !set.completed)
  }

  async function addSet(exIdx) {
    const updated = {
      ...session,
      exercises: session.exercises.map((ex, ei) =>
        ei !== exIdx ? ex : {
          ...ex,
          sets: [...ex.sets, { weight: '', reps: '', completed: false }],
        }
      ),
    }
    setSession(updated)
    await sessionsDB.save(updated)
  }

  async function removeSet(exIdx, setIdx) {
    const ex = session.exercises[exIdx]
    if (ex.sets.length <= 1) return
    const updated = {
      ...session,
      exercises: session.exercises.map((ex, ei) =>
        ei !== exIdx ? ex : {
          ...ex,
          sets: ex.sets.filter((_, si) => si !== setIdx),
        }
      ),
    }
    setSession(updated)
    await sessionsDB.save(updated)
  }

  async function finishSession() {
    const updated = {
      ...session,
      completed: true,
      endTime: Date.now(),
      duration: elapsed,
    }
    await sessionsDB.save(updated)
    clearActiveSession()
    setSession(updated)
    navigate('/workout')
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-bg/95 backdrop-blur-md border-b border-border shadow-[0_1px_3px_0_rgba(0,0,0,0.06),0_1px_2px_-1px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between min-h-[56px] px-5 py-3">
          <button
            onClick={() => navigate('/workout')}
            className="flex items-center gap-1 text-text-secondary"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="text-sm">Volver</span>
          </button>

          {/* Timer in header */}
          {!session.completed && (
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-sm">timer</span>
              <span className="font-mono font-bold text-text tabular-nums text-sm">{formatTime(elapsed)}</span>
            </div>
          )}

          {!session.completed && (
            <button
              onClick={finishSession}
              className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl"
            >
              Finalizar
            </button>
          )}
        </div>
      </header>

      <div className="px-4 pt-4 pb-6 space-y-3">
        {/* Session info */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text">{session.routineName}</h2>
            <p className="text-xs text-text-secondary mt-0.5">{session.date}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-primary">{completedSets}/{totalSets} series</p>
            <p className="text-[10px] text-text-secondary mt-0.5">
              {session.completed ? 'Completada' : 'En curso'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-track rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* All exercise cards */}
        {session.exercises.map((ex, exIdx) => {
          const allDone = ex.sets.every(s => s.completed)
          const doneSets = ex.sets.filter(s => s.completed).length

          return (
            <Card
              key={exIdx}
              className={`transition-all ${allDone ? 'opacity-80' : ''}`}
            >
              {/* Exercise header */}
              <div className="flex items-center gap-2.5 mb-3">
                {/* GIF or placeholder */}
                <button
                  onClick={() => ex.exerciseId && setShowDetail({ exerciseId: ex.exerciseId, name: ex.name, gifUrl: ex.gifUrl })}
                  className="shrink-0"
                >
                  {ex.gifUrl ? (
                    <img
                      src={ex.gifUrl}
                      alt={ex.name}
                      className="w-12 h-12 rounded-xl object-cover bg-track"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-track flex items-center justify-center">
                      <span className="material-symbols-outlined text-text-secondary text-xl">fitness_center</span>
                    </div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {allDone && (
                      <span className="material-symbols-outlined text-primary text-sm filled">check_circle</span>
                    )}
                    <h3 className={`font-bold text-sm truncate ${allDone ? 'text-text-secondary' : 'text-text'}`}>
                      {ex.name}
                    </h3>
                  </div>
                  {ex.targetMuscles?.length > 0 && (
                    <p className="text-[10px] text-text-secondary capitalize truncate mt-0.5">
                      {ex.targetMuscles.slice(0, 2).join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!session.completed && ex.exerciseId && (
                    <button
                      onClick={() => setShowDetail({ exerciseId: ex.exerciseId, name: ex.name, gifUrl: ex.gifUrl })}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-track transition-colors"
                    >
                      <span className="material-symbols-outlined text-text-secondary text-base">info</span>
                    </button>
                  )}
                  {!session.completed && (
                    <button
                      onClick={() => addSet(exIdx)}
                      className="flex items-center gap-0.5 text-[11px] text-primary font-semibold px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Serie
                    </button>
                  )}
                </div>
              </div>

              {/* Sets table header */}
              <div className={`grid gap-1.5 text-[10px] text-text-secondary font-semibold uppercase mb-1.5 px-0.5 ${session.completed ? 'grid-cols-[32px_1fr_1fr_32px]' : 'grid-cols-[32px_1fr_1fr_32px_24px]'}`}>
                <span className="text-center">#</span>
                <span>Peso (kg)</span>
                <span>Reps</span>
                <span></span>
                {!session.completed && <span></span>}
              </div>

              {/* Sets rows */}
              <div className="space-y-1.5">
                {ex.sets.map((set, setIdx) => (
                  <div
                    key={setIdx}
                    className={`grid gap-1.5 items-center px-0.5 py-1 rounded-xl transition-colors ${
                      set.completed ? 'bg-primary/8' : 'bg-bg'
                    } ${session.completed ? 'grid-cols-[32px_1fr_1fr_32px]' : 'grid-cols-[32px_1fr_1fr_32px_24px]'}`}
                  >
                    <span className="text-[11px] font-bold text-text-secondary text-center">{setIdx + 1}</span>
                    {session.completed ? (
                      <>
                        <span className="text-sm font-semibold text-text text-center">{set.weight || '—'}</span>
                        <span className="text-sm font-semibold text-text text-center">{set.reps || '—'}</span>
                      </>
                    ) : (
                      <>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="0"
                          value={set.weight}
                          onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                          className="w-full px-2 py-1.5 bg-card rounded-lg text-sm text-center font-medium border border-border text-text focus:outline-none focus:border-primary"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          value={set.reps}
                          onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                          className="w-full px-2 py-1.5 bg-card rounded-lg text-sm text-center font-medium border border-border text-text focus:outline-none focus:border-primary"
                        />
                      </>
                    )}
                    <button
                      onClick={() => !session.completed && toggleSet(exIdx, setIdx)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${
                        set.completed
                          ? 'bg-primary text-white'
                          : 'bg-track text-text-secondary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">check</span>
                    </button>
                    {!session.completed && (
                      <button
                        onClick={() => removeSet(exIdx, setIdx)}
                        disabled={ex.sets.length <= 1}
                        className="w-5 h-5 flex items-center justify-center rounded-md text-text-secondary hover:text-red-400 transition-colors disabled:opacity-20 disabled:pointer-events-none mx-auto"
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Progress mini-bar per exercise */}
              {ex.sets.length > 0 && (
                <div className="mt-2.5 h-1 bg-track rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(doneSets / ex.sets.length) * 100}%` }}
                  />
                </div>
              )}
            </Card>
          )
        })}

        {/* Finish button at the bottom if not completed */}
        {!session.completed && (
          <button
            onClick={finishSession}
            className="w-full py-3.5 bg-primary text-white font-semibold rounded-2xl active:scale-[0.98] transition-transform mt-2"
          >
            Finalizar sesión
          </button>
        )}
      </div>

      {/* Exercise Detail Modal */}
      {showDetail && (
        <ExerciseDetail
          exercise={showDetail}
          onClose={() => setShowDetail(null)}
        />
      )}
    </div>
  )
}
