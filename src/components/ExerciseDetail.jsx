import { useState, useEffect } from 'react'
import { getExerciseById } from '../lib/exercisedb'
import { getSearchTermsForId, getDisplayName, searchFirstWithImage } from '../lib/exerciseSearch'
import MuscleDiagram from './MuscleDiagram'

async function translateSteps(steps) {
  const results = await Promise.all(
    steps.map(async text => {
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 450))}&langpair=en|es`
        const res = await fetch(url)
        const data = await res.json()
        const translated = data.responseData?.translatedText
        return translated && translated !== text ? translated : text
      } catch {
        return text
      }
    })
  )
  return results
}

export default function ExerciseDetail({ exercise, onClose, onAdd }) {
  const [detail, setDetail] = useState(exercise)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('diagram')
  const [translatedSteps, setTranslatedSteps] = useState(null)
  const [translating, setTranslating] = useState(false)

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true)
      try {
        const id = exercise?.exerciseId
        let result = null

        if (id) {
          const terms = getSearchTermsForId(id)
          if (terms.length > 0) {
            result = await searchFirstWithImage(terms)
          } else {
            result = await getExerciseById(id)
          }
        }

        if (result) {
          const displayName = getDisplayName(id) || exercise?.name || result.name
          setDetail(prev => ({ ...result, name: displayName }))
        }
      } catch (e) {
        console.error('ExerciseDetail fetch:', e)
      } finally {
        setLoading(false)
      }
    }
    setTranslatedSteps(null)
    fetchDetail()
  }, [exercise])

  async function handleTabChange(tabId) {
    setActiveTab(tabId)
    if (tabId === 'instructions' && !translatedSteps && !translating && detail?.instructions?.length > 0) {
      setTranslating(true)
      try {
        const translated = await translateSteps(detail.instructions)
        setTranslatedSteps(translated)
      } finally {
        setTranslating(false)
      }
    }
  }

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
        <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
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
        <div className="flex px-4 gap-1 shrink-0 pb-2 border-b border-border">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              title={t.label}
              className={`flex items-center justify-center w-9 h-8 rounded-lg transition-colors ${
                activeTab === t.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:bg-track'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
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
                detail.imageUrl ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl overflow-hidden bg-track">
                      <img
                        src={detail.imageUrl}
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
                    <>
                      {translating && (
                        <div className="flex items-center gap-2 text-xs text-text-secondary pb-1">
                          <span className="material-symbols-outlined text-sm animate-spin text-primary">progress_activity</span>
                          Traduciendo al español…
                        </div>
                      )}
                      <ol className="space-y-2">
                        {(translatedSteps || detail.instructions).map((step, i) => (
                          <li key={i} className="flex gap-2 text-xs text-text">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                              {i + 1}
                            </span>
                            <span className="flex-1 leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </>
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
