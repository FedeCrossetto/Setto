import { useState, useEffect } from 'react'
import Header from '../components/Header'
import Card from '../components/ui/Card'
import ProgressBar from '../components/ui/ProgressBar'
import { mealsDB, generateId } from '../lib/db'
import { todayStr } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import mealsData from '../data/meals.json'

const MEAL_TYPES = [
  { key: 'desayuno', label: 'Desayuno', icon: 'wb_sunny' },
  { key: 'almuerzo', label: 'Almuerzo', icon: 'restaurant' },
  { key: 'cena', label: 'Cena', icon: 'nightlight' },
  { key: 'snack', label: 'Snack', icon: 'icecream' },
]

export default function Nutrition() {
  const { user } = useAuth()
  const [meals, setMeals] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [addType, setAddType] = useState('desayuno')
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' })
  const [barcode, setBarcode] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const today = todayStr()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const all = await mealsDB.getAll()
    setMeals(all.filter(m => m.date === today).sort((a, b) => {
      const order = { desayuno: 0, almuerzo: 1, cena: 2, snack: 3 }
      return (order[a.tipo] || 4) - (order[b.tipo] || 4)
    }))
  }

  const totals = meals.filter(m => m.completed).reduce(
    (acc, m) => {
      acc.calories += m.calorias || 0
      acc.protein += m.proteinas || 0
      acc.carbs += m.carbohidratos || 0
      acc.fat += m.grasas || 0
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  async function toggleMeal(meal) {
    await mealsDB.save({ ...meal, completed: !meal.completed })
    loadData()
  }

  const goals = {
    calories: user?.metaCalorias  || mealsData.dailyGoal.calories,
    protein:  user?.metaProteinas || mealsData.dailyGoal.protein,
    carbs:    user?.metaCarbos    || mealsData.dailyGoal.carbs,
    fat:      user?.metaGrasas    || mealsData.dailyGoal.fat,
  }

  async function addMeal() {
    if (!form.name.trim()) return
    const id = generateId()
    await mealsDB.save({
      id,
      date: today,
      type: addType,
      name: form.name.trim(),
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
    })
    await supabase.from('comidas_items').insert({
      comida_id: id,
      cantidad: 1,
      gramos: null,
      calorias: Number(form.calories) || 0,
      proteina_g: Number(form.protein) || 0,
      carbohidratos_g: Number(form.carbs) || 0,
      grasa_g: Number(form.fat) || 0,
    })
    setForm({ name: '', calories: '', protein: '', carbs: '', fat: '' })
    setBarcode('')
    setSearchQuery('')
    setSearchResults([])
    setShowAdd(false)
    loadData()
  }

  async function addFromTemplate(template) {
    const id = generateId()
    await mealsDB.save({
      id,
      date: today,
      type: template.type,
      name: template.name,
      description: template.description,
      calories: template.calories,
      protein: template.protein,
      carbs: template.carbs,
      fat: template.fat,
    })
    await supabase.from('comidas_items').insert({
      comida_id: id,
      cantidad: 1,
      gramos: null,
      calorias: template.calories,
      proteina_g: template.protein,
      carbohidratos_g: template.carbs,
      grasa_g: template.fat,
    })
    setShowTemplates(false)
    loadData()
  }

  async function deleteMeal(id) {
    await mealsDB.delete(id)
    loadData()
  }

  function openAddForType(type) {
    setAddType(type)
    setShowAdd(true)
  }

  async function searchFood() {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchError('')
    try {
    const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/buscar-alimento`,
        {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mode: 'text', query: searchQuery.trim(), limit: 5 }),
        }
        )
      const json = await res.json()
      if (!res.ok) {
        setSearchError(json.error || 'Error buscando alimento')
        setSearchResults([])
        return
      }
      const results = json.results || []
      setSearchResults(results)
    } catch (e) {
      console.error(e)
      setSearchError('Error de red buscando alimento')
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  function applySearchResult(r) {
    setForm({
      name: r.nombre_display || '',
      calories: r.calorias != null ? String(r.calorias) : '',
      protein: r.proteina_g != null ? String(r.proteina_g) : '',
      carbs: r.carbohidratos_g != null ? String(r.carbohidratos_g) : '',
      fat: r.grasa_g != null ? String(r.grasa_g) : '',
    })
    if (r.codigo_barras) {
      setBarcode(String(r.codigo_barras))
    }
  }

  async function searchByBarcode() {
    if (!barcode.trim()) return
    setSearchLoading(true)
    setSearchError('')
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/buscar-alimento`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mode: 'barcode', barcode: barcode.trim() }),
        }
      )
      const json = await res.json()
      if (!res.ok) {
        setSearchError(json.error || 'Error buscando por código de barras')
        return
      }
      const alimento = json.alimento || json.product || json
      if (alimento) {
        applySearchResult(alimento)
      }
    } catch (e) {
      console.error(e)
      setSearchError('Error de red buscando por código de barras')
    } finally {
      setSearchLoading(false)
    }
  }

  return (
    <div className="min-h-full">
      <Header title="Nutrición">
        <div className="flex items-center gap-2 pr-1">
          <button
            onClick={() => setShowTemplates(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border text-text-secondary"
          >
            <span className="material-symbols-outlined text-lg">menu_book</span>
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white"
          >
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
        </div>
      </Header>

      <div className="px-5 pt-5 space-y-4 pb-6">
        {/* Calories Overview */}
        <Card>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">Calorías diarias</span>
            <span className="text-xs text-text-secondary font-medium">{totals.calories} / {goals.calories} kcal</span>
          </div>
          <ProgressBar value={totals.calories} max={goals.calories} showValue={false} />
          <p className="text-xs text-text-secondary mt-2 text-right">
            Faltan <b className="text-primary">{Math.max(0, goals.calories - totals.calories)}</b> kcal
          </p>
        </Card>

        {/* Macros */}
        <Card className="!p-0 overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-border">
            {[
              { label: 'Kcal',  value: totals.calories, max: goals.calories,  color: 'text-primary' },
              { label: 'Prot',  value: totals.protein,  max: goals.protein,   color: 'text-blue-400' },
              { label: 'Carbos',value: totals.carbs,    max: goals.carbs,     color: 'text-amber-400' },
              { label: 'Grasas',value: totals.fat,      max: goals.fat,       color: 'text-rose-400' },
            ].map(m => (
              <div key={m.label} className="flex flex-col items-center py-3 px-1">
                <span className={`text-xl font-black tabular-nums leading-tight ${m.color}`}>{m.value}</span>
                <span className="text-[9px] font-semibold text-text-secondary uppercase tracking-wide mt-0.5">{m.label}</span>
                <span className="text-[9px] text-text-secondary/50">/ {m.max}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Meals by Type */}
        {MEAL_TYPES.map(type => {
          const typeMeals = meals.filter(m => m.tipo === type.key)
          return (
            <div key={type.key}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{type.label}</h3>
                <button onClick={() => openAddForType(type.key)} className="text-primary text-[10px] font-semibold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-sm">add</span>
                  Agregar
                </button>
              </div>

              {typeMeals.length === 0 ? (
                <div className="py-4 text-center text-xs text-text-secondary border-2 border-dashed border-gray-200 rounded-2xl">
                  Sin comidas registradas
                </div>
              ) : (
                <div className="space-y-2">
                  {typeMeals.map(meal => (
                    <Card key={meal.id} className={`!p-3 transition-opacity ${meal.completed ? '' : 'opacity-50'}`}>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleMeal(meal)}
                          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                            meal.completed ? 'bg-primary text-white' : 'bg-track text-text-secondary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs">check</span>
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${meal.completed ? 'text-text' : 'text-text-secondary'}`}>{meal.name}</p>
                          <div className="flex gap-2.5 text-[10px] mt-0.5 tabular-nums">
                            <span className="text-primary font-medium">{meal.calorias} kcal</span>
                            <span className="text-blue-400">P {meal.proteinas}g</span>
                            <span className="text-amber-400">C {meal.carbohidratos}g</span>
                            <span className="text-rose-400">G {meal.grasas}g</span>
                          </div>
                        </div>
                        <button onClick={() => deleteMeal(meal.id)} className="p-1 text-gray-300 hover:text-red-500">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Meal Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold">Agregar comida</h2>
              <button onClick={() => setShowAdd(false)} className="p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex gap-1 mb-3">
              {MEAL_TYPES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setAddType(t.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    addType === t.key ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] text-text-secondary font-semibold">
                  Buscar alimento (Open Food Facts)
                </label>
                <div className="flex gap-2 mt-1.5">
                  <input
                    type="text"
                    placeholder="Ej: yogur descremado, arroz, etc."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={searchFood}
                    disabled={searchLoading || !searchQuery.trim()}
                    className="px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-semibold disabled:opacity-40"
                  >
                    {searchLoading ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
                {searchError && (
                  <p className="text-[10px] text-red-500 mt-1">{searchError}</p>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-1.5 max-h-32 overflow-y-auto border border-gray-100 rounded-xl divide-y">
                    {searchResults.map((r, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applySearchResult(r)}
                        className="w-full text-left px-3 py-1.5 bg-white hover:bg-gray-50 text-[11px]"
                      >
                        <div className="font-semibold text-[11px]">
                          {r.nombre_display}
                        </div>
                        <div className="text-[10px] text-text-secondary flex gap-2 mt-0.5">
                          {r.marca && <span>{r.marca}</span>}
                          {r.calorias != null && <span>{r.calorias} kcal/100g</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Nombre de la comida"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-primary"
              />
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { key: 'calories', label: 'Calorías (kcal)' },
                  { key: 'protein', label: 'Proteína (g)' },
                  { key: 'carbs', label: 'Carbohidratos (g)' },
                  { key: 'fat', label: 'Grasas (g)' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] text-text-secondary font-semibold">{f.label}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={form[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full mt-1 px-3 py-1.75 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={addMeal}
              disabled={!form.name.trim()}
              className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-xl mt-3 disabled:opacity-40"
            >
              Agregar
            </button>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Comidas Sugeridas</h2>
              <button onClick={() => setShowTemplates(false)} className="p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {MEAL_TYPES.map(type => {
              const templates = mealsData.mealTemplates.filter(t => t.type === type.key)
              if (templates.length === 0) return null
              return (
                <div key={type.key} className="mb-4">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">{type.label}</h3>
                  <div className="space-y-2">
                    {templates.map(t => (
                      <Card key={t.id} onClick={() => addFromTemplate(t)} className="!p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">{t.name}</p>
                            <p className="text-[10px] text-text-secondary mt-0.5">{t.description}</p>
                            <div className="flex gap-3 text-[10px] text-text-secondary mt-1">
                              <span className="font-medium text-primary">{t.calories} kcal</span>
                              <span>P: {t.protein}g</span>
                              <span>C: {t.carbs}g</span>
                              <span>G: {t.fat}g</span>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-primary text-lg">add_circle</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
