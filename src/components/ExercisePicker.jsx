import { useState, useEffect, useRef, useCallback } from 'react'
import { searchExercises, getMuscles, filterExercises } from '../lib/exercisedb'
import { getEnglishTermsForQuery } from '../lib/exerciseSearch'

export default function ExercisePicker({ selected = [], onToggle, onClose, onViewDetail }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [muscles, setMuscles] = useState([])
  const [activeMuscle, setActiveMuscle] = useState('')
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const debounceRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    getMuscles().then(setMuscles).catch(() => {})
    loadExercises('', '', 0, true)
  }, [])

  const loadExercises = useCallback(async (search, muscle, newOffset, reset = false) => {
    setLoading(true)
    try {
      let exercises = []
      if (search.trim()) {
        const englishTerms = getEnglishTermsForQuery(search)
        const apiQuery = englishTerms.length > 0 ? englishTerms[0] : search
        const data = await searchExercises(apiQuery, { offset: newOffset, limit: 25 })
        exercises = data.exercises || []
      } else if (muscle) {
        const data = await filterExercises({ muscles: muscle, offset: newOffset, limit: 25 })
        exercises = data.exercises || []
      } else {
        const data = await filterExercises({ offset: newOffset, limit: 25 })
        exercises = data.exercises || []
      }

      setResults(prev => reset ? exercises : [...prev, ...exercises])
      setHasMore(exercises.length === 25)
      setOffset(newOffset + exercises.length)
    } catch (err) {
      console.error('ExerciseDB fetch error:', err)
      if (reset) setResults([])
      setHasMore(false)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  function handleSearch(value) {
    setQuery(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setResults([])
      setOffset(0)
      setHasMore(true)
      loadExercises(value, activeMuscle, 0, true)
    }, 400)
  }

  function handleMuscleFilter(muscle) {
    const next = activeMuscle === muscle ? '' : muscle
    setActiveMuscle(next)
    setResults([])
    setOffset(0)
    setHasMore(true)
    loadExercises(query, next, 0, true)
  }

  function handleScroll(e) {
    const el = e.target
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && hasMore && !loading) {
      loadExercises(query, activeMuscle, offset, false)
    }
  }

  const isSelected = (id) => selected.some(s => s.exerciseId === id)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
      <div className="bg-card w-full max-w-lg rounded-t-3xl flex flex-col max-h-[90vh] animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 shrink-0">
          <h2 className="text-lg font-bold text-text">Buscar Ejercicios</h2>
          <button onClick={onClose} className="p-1">
            <span className="material-symbols-outlined text-text-secondary">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">search</span>
            <input
              type="text"
              placeholder="Buscar en español o inglés (ej. Rompecráneos, Peso muerto…)"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg border border-border text-sm text-text focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Muscle Filters */}
        {muscles.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto px-5 pb-3 no-scrollbar shrink-0">
            {muscles.map(m => (
              <button
                key={m}
                onClick={() => handleMuscleFilter(m)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                  activeMuscle === m
                    ? 'bg-primary text-white'
                    : 'bg-bg text-text-secondary border border-border'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 pb-5"
        >
          {initialLoad ? (
            <div className="flex justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="text-center py-12 text-text-secondary">
              <span className="material-symbols-outlined text-4xl mb-2 block">search_off</span>
              <p className="text-sm">No se encontraron ejercicios</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map(ex => {
                const sel = isSelected(ex.exerciseId)
                return (
                  <div
                    key={ex.exerciseId}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                      sel ? 'bg-primary/10 border border-primary/30' : 'bg-bg border border-border'
                    }`}
                    onClick={() => onToggle(ex)}
                  >
                    {/* Image Thumbnail */}
                    {ex.imageUrl ? (
                      <img
                        src={ex.imageUrl}
                        alt={ex.name}
                        className="w-14 h-14 rounded-lg object-cover bg-track shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-track flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-text-secondary">fitness_center</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{ex.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(ex.targetMuscles || []).slice(0, 2).map(m => (
                          <span key={m} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full capitalize">
                            {m}
                          </span>
                        ))}
                        {(ex.equipments || []).slice(0, 1).map(e => (
                          <span key={e} className="text-[10px] bg-track text-text-secondary px-1.5 py-0.5 rounded-full capitalize">
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {onViewDetail && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onViewDetail(ex) }}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg transition-colors"
                        >
                          <span className="material-symbols-outlined text-text-secondary text-lg">info</span>
                        </button>
                      )}
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        sel ? 'bg-primary border-primary' : 'border-border'
                      }`}>
                        {sel && <span className="material-symbols-outlined text-white text-sm">check</span>}
                      </div>
                    </div>
                  </div>
                )
              })}

              {loading && (
                <div className="flex justify-center py-4">
                  <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selected.length > 0 && (
          <div className="shrink-0 px-5 py-3 border-t border-border bg-card">
            <button
              onClick={onClose}
              className="w-full py-3 bg-primary text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition-transform"
            >
              Listo ({selected.length} ejercicios)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
