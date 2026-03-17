import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import ProgressBar from '../components/ui/ProgressBar'
import StatCard from '../components/ui/StatCard'
import { sessionsDB, mealsDB, measurementsDB } from '../lib/db'
import { todayStr } from '../lib/storage'
import { exportAllData } from '../lib/export'

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getWeekMonday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function getWeekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState({ calories: 0, protein: 0, workouts: 0, weight: null })
  const [sessionDates, setSessionDates] = useState([])
  const [chartMode, setChartMode] = useState('week') // 'week' | 'month'
  const today = todayStr()

  useEffect(() => {
    async function load() {
      const [allMeals, allSessions, allMeasurements] = await Promise.all([
        mealsDB.getAll(),
        sessionsDB.getAll(),
        measurementsDB.getAll(),
      ])

      const todayMeals = allMeals.filter(m => m.date === today && m.completed)
      const calories = todayMeals.reduce((sum, m) => sum + (m.calorias || 0), 0)
      const protein = todayMeals.reduce((sum, m) => sum + (m.proteinas || 0), 0)

      const thisWeekSessions = allSessions.filter(s => {
        const diff = (new Date(today) - new Date(s.date)) / 86400000
        return diff >= 0 && diff < 7
      })

      const lastMeasurement = allMeasurements.sort((a, b) => b.date?.localeCompare(a.date))[0]

      setSessionDates(allSessions.map(s => s.date))
      setStats({
        calories,
        protein,
        workouts: thisWeekSessions.length,
        weight: lastMeasurement?.peso || null,
      })
    }
    load()
  }, [today])

  return (
    <div className="min-h-full">
      <Header
        variant="home"
        greetingLabel="Bienvenido"
        greetingName={`Hola, ${user?.nombre || user?.username || ''}`}
        avatar={user?.avatar || null}
      />

      <div className="px-5 pt-5 space-y-3.5 pb-6">
        {/* Daily Calories - card principal oscura */}
        <div className="rounded-2xl bg-gray-900 p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-orange-400 text-lg">local_fire_department</span>
            <span className="font-semibold text-sm text-white">Calorías de hoy</span>
          </div>
          <ProgressBar value={stats.calories} max={user?.metaCalorias || 2200} label="" showValue />
          <div className="flex justify-between mt-2 text-xs text-white/50">
            <span>{stats.calories} kcal consumidas</span>
            <span>Meta: {user?.metaCalorias || 2200} kcal</span>
          </div>
        </div>

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
          <StatCard icon="local_fire_department" label="Calorías hoy" value={stats.calories} unit="kcal" color="text-orange-400" />
        </div>

        {/* Weekly / Monthly training mini-chart */}
        {(() => {
          if (!sessionDates.length) return null

          const countsByDate = sessionDates.reduce((acc, d) => {
            acc[d] = (acc[d] || 0) + 1
            return acc
          }, {})

          const todayDate = new Date(today + 'T12:00:00')

          let items = []
          if (chartMode === 'week') {
            // Últimos 7 días (de izquierda a derecha: más viejo → hoy)
            for (let i = 6; i >= 0; i--) {
              const d = new Date(todayDate)
              d.setDate(d.getDate() - i)
              const key = d.toISOString().slice(0, 10)
              const label = d.toLocaleDateString('es-ES', { weekday: 'short' })
              items.push({ key, label, count: countsByDate[key] || 0 })
            }
          } else {
            // Últimas 4 semanas (bloques semanales)
            const mondayThisWeek = getWeekMonday(today)
            for (let i = 3; i >= 0; i--) {
              const start = new Date(mondayThisWeek)
              start.setDate(start.getDate() - 7 * i)
              const end = new Date(start)
              end.setDate(end.getDate() + 6)
              let count = 0
              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const key = d.toISOString().slice(0, 10)
                count += countsByDate[key] || 0
              }
              const label = i === 0 ? 'Esta' : `-${i}`
              items.push({ key: start.toISOString(), label, count })
            }
          }

          const max = Math.max(1, ...items.map(i => i.count))
          const total = items.reduce((sum, i) => sum + i.count, 0)

          // Comparación con período anterior (para badge tipo "+12% vs ayer")
          let deltaPercent = null
          if (chartMode === 'week') {
            const windowEnd = new Date(todayDate)
            const windowStart = new Date(todayDate)
            windowStart.setDate(windowStart.getDate() - 6)

            const prevEnd = new Date(windowStart)
            prevEnd.setDate(prevEnd.getDate() - 1)
            const prevStart = new Date(prevEnd)
            prevStart.setDate(prevStart.getDate() - 6)

            const sumRange = (start, end) => {
              let s = 0
              const d = new Date(start)
              while (d <= end) {
                const key = d.toISOString().slice(0, 10)
                s += countsByDate[key] || 0
                d.setDate(d.getDate() + 1)
              }
              return s
            }
            const curr = sumRange(windowStart, windowEnd)
            const prev = sumRange(prevStart, prevEnd)
            if (prev > 0) {
              deltaPercent = Math.round(((curr - prev) / prev) * 100)
            }
          } else {
            // Mes: últimas 4 semanas vs 4 anteriores
            const mondayThisWeek = getWeekMonday(today)
            const sumWeeks = (startMonday) => {
              const start = new Date(startMonday)
              const end = new Date(startMonday)
              end.setDate(end.getDate() + 27)
              let s = 0
              const d = new Date(start)
              while (d <= end) {
                const key = d.toISOString().slice(0, 10)
                s += countsByDate[key] || 0
                d.setDate(d.getDate() + 1)
              }
              return s
            }
            const currStart = new Date(mondayThisWeek)
            currStart.setDate(currStart.getDate() - 21)
            const prevStart = new Date(currStart)
            prevStart.setDate(prevStart.getDate() - 28)
            const curr = sumWeeks(currStart)
            const prev = sumWeeks(prevStart)
            if (prev > 0) {
              deltaPercent = Math.round(((curr - prev) / prev) * 100)
            }
          }

          return (
            <Card className="p-3! border border-border/60 shadow-sm relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-primary to-emerald-400" />
              <div className="flex items-center justify-between mb-2 mt-0.5">
                <div>
                  <h3 className="font-semibold text-sm">
                    {chartMode === 'week' ? 'Actividad semanal' : 'Actividad mensual'}
                  </h3>
                  <p className="text-[10px] text-text-secondary flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                    {chartMode === 'week' ? 'Entrenos por día' : 'Entrenos por semana'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {deltaPercent !== null && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                      {deltaPercent > 0 ? '+' : ''}
                      {deltaPercent}% <span className="text-[9px] font-normal text-primary/80">vs período anterior</span>
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                    <span className="font-semibold text-text">{total}</span>
                    <span>{chartMode === 'week' ? 'sesiones' : 'sesiones totales'}</span>
                  </div>
                  <div className="flex gap-1 rounded-full bg-bg border border-border px-0.5 py-0.5">
                    {[
                      { id: 'week', label: 'Semana' },
                      { id: 'month', label: 'Mes' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setChartMode(opt.id)}
                        className={`px-2 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                          chartMode === opt.id
                            ? 'bg-primary text-black shadow-[0_2px_8px_rgba(0,0,0,0.25)]'
                            : 'text-text-secondary'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-end gap-1.5 h-20 pt-1">
                {items.map(item => (
                  <div key={item.key} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                    <div className="w-full max-w-[22px] rounded-md bg-track/80 overflow-hidden h-14 flex items-end shadow-inner">
                      <div
                        className="w-full rounded-md bg-linear-to-t from-primary to-emerald-400 shadow-[0_4px_10px_rgba(0,0,0,0.25)]"
                        style={{ height: `${(item.count / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-text-secondary/75 truncate">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )
        })()}

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
