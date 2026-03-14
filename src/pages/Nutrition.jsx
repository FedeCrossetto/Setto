import { useState, useEffect } from 'react'
import Header from '../components/Header'
import Card from '../components/ui/Card'
import ProgressBar from '../components/ui/ProgressBar'
import { mealsDB, generateId } from '../lib/db'
import { todayStr } from '../lib/storage'
import mealsData from '../data/meals.json'

const MEAL_TYPES = [
  { key: 'desayuno', label: 'Desayuno', icon: 'wb_sunny' },
  { key: 'almuerzo', label: 'Almuerzo', icon: 'restaurant' },
  { key: 'cena', label: 'Cena', icon: 'nightlight' },
  { key: 'snack', label: 'Snack', icon: 'icecream' },
]

export default function Nutrition() {
  const [meals, setMeals] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [addType, setAddType] = useState('desayuno')
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' })
  const today = todayStr()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const all = await mealsDB.getAll()
    setMeals(all.filter(m => m.date === today).sort((a, b) => {
      const order = { desayuno: 0, almuerzo: 1, cena: 2, snack: 3 }
      return (order[a.type] || 4) - (order[b.type] || 4)
    }))
  }

  const totals = meals.reduce(
    (acc, m) => {
      if (m.completed) {
        acc.calories += m.calories || 0
        acc.protein += m.protein || 0
        acc.carbs += m.carbs || 0
        acc.fat += m.fat || 0
      }
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const goals = mealsData.dailyGoal

  async function addMeal() {
    if (!form.name.trim()) return
    await mealsDB.save({
      id: generateId(),
      date: today,
      type: addType,
      name: form.name.trim(),
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      completed: false,
    })
    setForm({ name: '', calories: '', protein: '', carbs: '', fat: '' })
    setShowAdd(false)
    loadData()
  }

  async function addFromTemplate(template) {
    await mealsDB.save({
      id: generateId(),
      date: today,
      type: template.type,
      name: template.name,
      description: template.description,
      calories: template.calories,
      protein: template.protein,
      carbs: template.carbs,
      fat: template.fat,
      completed: false,
    })
    setShowTemplates(false)
    loadData()
  }

  async function toggleMeal(meal) {
    await mealsDB.save({ ...meal, completed: !meal.completed })
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

  return (
    <div className="min-h-full">
      <Header title="Nutrición">
        <div className="flex items-center gap-2 pr-1">
          <button
            onClick={() => setShowTemplates(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">menu_book</span>
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
        </div>
      </Header>

      <div className="px-5 space-y-4 pb-6">
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
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Proteína', value: totals.protein, max: goals.protein, unit: 'g', color: 'bg-blue-500' },
            { label: 'Carbos', value: totals.carbs, max: goals.carbs, unit: 'g', color: 'bg-amber-500' },
            { label: 'Grasas', value: totals.fat, max: goals.fat, unit: 'g', color: 'bg-rose-500' },
          ].map(macro => (
            <Card key={macro.label} className="!p-3">
              <p className="text-[10px] text-text-secondary font-semibold uppercase">{macro.label}</p>
              <p className="text-lg font-bold mt-0.5">{macro.value}<span className="text-xs font-medium text-text-secondary">{macro.unit}</span></p>
              <ProgressBar value={macro.value} max={macro.max} color={macro.color} showValue={false} className="mt-1.5" />
              <p className="text-[10px] text-text-secondary mt-1">{macro.max}{macro.unit} meta</p>
            </Card>
          ))}
        </div>

        {/* Meals by Type */}
        {MEAL_TYPES.map(type => {
          const typeMeals = meals.filter(m => m.type === type.key)
          return (
            <div key={type.key}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">{type.icon}</span>
                  <h3 className="font-semibold text-sm">{type.label}</h3>
                </div>
                <button onClick={() => openAddForType(type.key)} className="text-primary text-xs font-semibold flex items-center gap-0.5">
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
                    <Card key={meal.id} className="!p-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleMeal(meal)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            meal.completed ? 'bg-primary text-white' : 'border-2 border-gray-300'
                          }`}
                        >
                          {meal.completed && <span className="material-symbols-outlined text-sm">check</span>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${meal.completed ? 'line-through text-text-secondary' : ''}`}>{meal.name}</p>
                          <div className="flex gap-3 text-[10px] text-text-secondary mt-0.5">
                            <span>{meal.calories} kcal</span>
                            <span>P: {meal.protein}g</span>
                            <span>C: {meal.carbs}g</span>
                            <span>G: {meal.fat}g</span>
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Agregar Comida</h2>
              <button onClick={() => setShowAdd(false)} className="p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {MEAL_TYPES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setAddType(t.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    addType === t.key ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre de la comida"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-primary"
              />
              <div className="grid grid-cols-2 gap-3">
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
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button onClick={addMeal} disabled={!form.name.trim()} className="w-full py-3 bg-primary text-white text-sm font-semibold rounded-xl mt-4 disabled:opacity-40">
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
