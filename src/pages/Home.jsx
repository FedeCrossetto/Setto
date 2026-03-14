import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Card from '../components/ui/Card'
import ProgressBar from '../components/ui/ProgressBar'
import StatCard from '../components/ui/StatCard'
import { sessionsDB, mealsDB, measurementsDB } from '../lib/db'
import { todayStr } from '../lib/storage'
import { exportAllData } from '../lib/export'

export default function Home() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ calories: 0, protein: 0, workouts: 0, weight: null })
  const today = todayStr()

  useEffect(() => {
    async function load() {
      const [allMeals, allSessions, allMeasurements] = await Promise.all([
        mealsDB.getAll(),
        sessionsDB.getAll(),
        measurementsDB.getAll(),
      ])

      const todayMeals = allMeals.filter(m => m.date === today && m.completed)
      const calories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0)
      const protein = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0)

      const thisWeekSessions = allSessions.filter(s => {
        const diff = (new Date(today) - new Date(s.date)) / 86400000
        return diff >= 0 && diff < 7
      })

      const lastMeasurement = allMeasurements.sort((a, b) => b.date?.localeCompare(a.date))[0]

      setStats({
        calories,
        protein,
        workouts: thisWeekSessions.length,
        weight: lastMeasurement?.peso || null,
      })
    }
    load()
  }, [today])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="min-h-full">
      <Header title="">
        <div />
      </Header>

      <div className="px-5 space-y-5 pb-6">
        {/* Greeting */}
        <div>
          <p className="text-sm text-text-secondary font-medium">{greeting} 👋</p>
          <h2 className="text-2xl font-bold mt-0.5">Hola, Setto</h2>
        </div>

        {/* Daily Calories - card principal oscura */}
        <Card className="bg-surface text-white border-0 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-lg">local_fire_department</span>
            <span className="font-semibold text-sm">Calorías de hoy</span>
          </div>
          <ProgressBar value={stats.calories} max={2200} label="" showValue />
          <div className="flex justify-between mt-2 text-xs text-white/70">
            <span>{stats.calories} kcal consumidas</span>
            <span>Meta: 2200 kcal</span>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon="fitness_center" label="Entrenos esta semana" value={stats.workouts} />
          <StatCard icon="restaurant" label="Proteína hoy" value={stats.protein} unit="g" />
          <StatCard
            icon="monitor_weight"
            label="Peso actual"
            value={stats.weight ? stats.weight.toFixed(1) : '—'}
            unit={stats.weight ? 'kg' : ''}
          />
          <StatCard icon="local_fire_department" label="Calorías hoy" value={stats.calories} unit="kcal" />
        </div>

        {/* Quick Actions */}
        <Card>
          <h3 className="font-semibold text-sm mb-3">Acceso rápido</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: 'fitness_center', label: 'Nuevo entreno', to: '/workout' },
              { icon: 'monitoring', label: 'Medidas', to: '/anthropometry' },
              { icon: 'restaurant', label: 'Agregar comida', to: '/nutrition' },
              { icon: 'photo_camera', label: 'Subir foto', to: '/progress' },
            ].map((action) => (
              <button
                key={action.to}
                onClick={() => navigate(action.to)}
                className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <span className="material-symbols-outlined text-primary text-lg">{action.icon}</span>
                <span className="text-xs font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Motivational */}
        <Card className="bg-primary text-white border-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl">emoji_events</span>
            <div>
              <p className="font-bold text-sm">¡Seguí así!</p>
              <p className="text-xs text-white/80">La constancia es la clave del progreso</p>
            </div>
          </div>
        </Card>

        {/* Export */}
        <button
          onClick={exportAllData}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-text-secondary text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Exportar datos (backup JSON)
        </button>
      </div>
    </div>
  )
}
