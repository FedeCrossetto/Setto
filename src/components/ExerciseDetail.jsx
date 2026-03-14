import { useState, useEffect } from 'react'
import { getExerciseById, searchExercises } from '../lib/exercisedb'
import MuscleDiagram from './MuscleDiagram'

// Maps local exercise IDs (from templates) to ExerciseDB English search terms
const LOCAL_ID_TO_SEARCH = {
  'bench-press': 'barbell bench press chest',
  'incline-bench': 'incline barbell bench press',
  'chest-fly': 'dumbbell fly chest',
  'cable-crossover': 'cable crossover chest fly',
  'tricep-pushdown': 'cable tricep pushdown',
  'skull-crusher': 'skull crusher ez bar tricep',
  'overhead-tricep': 'overhead tricep extension dumbbell',
  'deadlift': 'barbell deadlift back',
  'barbell-row': 'bent over barbell row',
  'lat-pulldown': 'cable lat pulldown',
  'seated-row': 'seated cable row',
  'pull-up': 'pull up',
  'barbell-curl': 'barbell curl bicep',
  'hammer-curl': 'dumbbell hammer curl bicep',
  'preacher-curl': 'preacher curl bicep',
  'squat': 'barbell squat legs',
  'leg-press': 'leg press machine',
  'leg-extension': 'leg extension machine quad',
  'leg-curl': 'lying leg curl hamstring',
  'calf-raise': 'standing calf raise',
  'shoulder-press': 'barbell overhead shoulder press',
  'lateral-raise': 'dumbbell lateral raise shoulder',
  'face-pull': 'cable face pull rear delt',
  'plank': 'plank abs core',
  'crunch': 'crunch abs',
  'romanian-deadlift': 'romanian deadlift hamstring',
  'hip-thrust': 'barbell hip thrust glute',
  'lunges': 'dumbbell lunge leg',
}

export default function ExerciseDetail({ exercise, onClose, onAdd }) {
  const [detail, setDetail] = useState(exercise)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('diagram')

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true)
      try {
        const id = exercise?.exerciseId
        let result = null

        if (id) {
          const searchTerm = LOCAL_ID_TO_SEARCH[id]
          if (searchTerm) {
            // Local exercise ID → search ExerciseDB by English name
            const { exercises } = await searchExercises(searchTerm, { limit: 3 })
            if (exercises?.length > 0) result = exercises[0]
          } else {
            // ExerciseDB native ID → fetch directly
            result = await getExerciseById(id)
          }
        }

        if (result) {
          setDetail(prev => ({ ...result, name: prev?.name || result.name }))
        }
      } catch (e) {
        console.error('ExerciseDetail fetch:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [exercise])

  if (!detail) return null

  const tabs = [
    { id: 'diagram', label: 'Músculos', icon: 'body_system' },
    { id: 'gif', label: 'Animación', icon: 'play_circle' },
    { id: 'instructions', label: 'Instrucciones', icon: 'format_list_numbered' },
  ]

  return (
    <div className="fixed inset-0 z-60 bg-black/50 flex items-end justify-center">
      <div className="bg-card w-full max-w-lg rounded-t-3xl flex flex-col max-h-[92vh] animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-text truncate">{detail.name}</h2>
            {detail.equipments?.length > 0 && (
              <p className="text-xs text-text-secondary capitalize mt-0.5 truncate">
                {detail.equipments.join(' · ')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 shrink-0 ml-2">
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 gap-1 shrink-0 pb-3 border-b border-border">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === t.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:bg-track'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
            </div>
          ) : (
            <>
              {/* ── DIAGRAM TAB ── */}
              {activeTab === 'diagram' && (
                <div className="space-y-4">
                  <MuscleDiagram
                    targetMuscles={detail.targetMuscles || []}
                    secondaryMuscles={detail.secondaryMuscles || []}
                  />

                  {/* Muscle chips */}
                  <div className="space-y-2">
                    {detail.targetMuscles?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
                          Músculos principales
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {detail.targetMuscles.map(m => (
                            <span key={m} className="text-xs bg-primary/15 text-primary px-2.5 py-1 rounded-full font-medium capitalize">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {detail.secondaryMuscles?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
                          Músculos secundarios
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {detail.secondaryMuscles.map(m => (
                            <span key={m} className="text-xs bg-track text-text-secondary px-2.5 py-1 rounded-full font-medium capitalize">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {detail.bodyParts?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {detail.bodyParts.map(b => (
                          <div key={b} className="flex items-center gap-1 text-xs text-text-secondary">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            <span className="capitalize">{b}</span>
                          </div>
                        ))}
                        {detail.equipments?.map(e => (
                          <div key={e} className="flex items-center gap-1 text-xs text-text-secondary">
                            <span className="material-symbols-outlined text-sm">fitness_center</span>
                            <span className="capitalize">{e}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── GIF TAB ── */}
              {activeTab === 'gif' && (
                detail.gifUrl ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl overflow-hidden bg-track">
                      <img
                        src={detail.gifUrl}
                        alt={detail.name}
                        className="w-full h-auto"
                      />
                    </div>
                    <p className="text-xs text-text-secondary text-center">
                      Animación de ejemplo del ejercicio
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-secondary">
                    <span className="material-symbols-outlined text-3xl mb-2 block">gif_box</span>
                    <p className="text-sm">No hay animación disponible</p>
                  </div>
                )
              )}

              {/* ── INSTRUCTIONS TAB ── */}
              {activeTab === 'instructions' && (
                <div className="space-y-3">
                  {detail.instructions?.length > 0 ? (
                    <ol className="space-y-3">
                      {detail.instructions.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-text">
                          <span className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="flex-1 leading-relaxed pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="text-center py-8 text-text-secondary">
                      <span className="material-symbols-outlined text-3xl mb-2 block">info</span>
                      <p className="text-sm">No hay instrucciones disponibles</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {onAdd && (
          <div className="shrink-0 px-5 py-3 border-t border-border bg-card">
            <button
              onClick={() => onAdd(detail)}
              className="w-full py-3 bg-primary text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition-transform"
            >
              Agregar a rutina
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
