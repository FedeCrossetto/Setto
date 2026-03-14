import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import Header from '../components/Header'
import Card from '../components/ui/Card'
import { measurementsDB, importsDB, generateId } from '../lib/db'
import { parseExcelFile } from '../lib/excel-parser'

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const EVOLUTION_TABS = [
  { key: 'peso', label: 'Peso', unit: 'kg', dataKey: 'peso' },
  { key: 'grasa', label: 'Masa grasa', unit: '%', dataKey: 'grasa' },
  { key: 'muscle', label: 'Masa muscular', unit: 'kg', dataKey: 'muscleMassKg' },
  { key: 'cintura', label: 'Cintura', unit: 'cm', dataKey: 'cintura' },
]

const COMPOSITION_COLORS = ['#21c45d', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']
const COMPOSITION_NAMES = [
  { key: 'fatMassKg', label: 'Grasa' },
  { key: 'muscleMassKg', label: 'Músculo' },
  { key: 'residualMassKg', label: 'Residual' },
  { key: 'boneMassKg', label: 'Hueso' },
  { key: 'skinMassKg', label: 'Piel' },
]

const MEDIDAS_IMPORTANTES = [
  { key: 'pecho', label: 'Pecho', perimeterKey: 'thoraxCm' },
  { key: 'cintura', label: 'Cintura', perimeterKey: 'waistMinCm' },
  { key: 'cadera', label: 'Cadera', perimeterKey: 'hipsMaxCm' },
  { key: 'brazo', label: 'Brazo', perimeterKey: 'relaxedArmCm' },
  { key: 'pierna', label: 'Pierna', perimeterKey: 'upperThighCm' },
]

const FIELDS = [
  { key: 'peso', label: 'Peso (kg)', icon: 'monitor_weight' },
  { key: 'grasa', label: 'Grasa (%)', icon: 'water_drop' },
  { key: 'pecho', label: 'Pecho (cm)', icon: 'straighten' },
  { key: 'cintura', label: 'Cintura (cm)', icon: 'straighten' },
  { key: 'cadera', label: 'Cadera (cm)', icon: 'straighten' },
  { key: 'brazo', label: 'Brazo (cm)', icon: 'straighten' },
  { key: 'pierna', label: 'Pierna (cm)', icon: 'straighten' },
]

const DETAIL_GROUPS = [
  { title: 'Pliegues (mm)', source: 'skinfolds', keys: ['tricepsMm', 'subscapularMm', 'supraespinalMm', 'abdominalMm', 'medialThighMm', 'calfMm'], labels: ['Tríceps', 'Subescapular', 'Supraespinal', 'Abdominal', 'Muslo', 'Pantorrilla'] },
  { title: 'Perímetros secundarios (cm)', source: 'perimeters', keys: ['relaxedArmCm', 'flexedArmCm', 'upperThighCm', 'medialThighCm', 'calfMaxCm', 'thoraxCm'], labels: ['Brazo relajado', 'Brazo flexionado', 'Muslo superior', 'Muslo medial', 'Pantorrilla', 'Tórax'] },
]

function formatMonth(dateStr) {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length >= 2) {
    const monthIdx = parseInt(parts[1]) - 1
    const year = parts[0]?.slice(2)
    return `${MONTH_NAMES[monthIdx] || parts[1]}${year ? " '" + year : ''}`
  }
  return dateStr
}

function formatImportDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getMonthKey(dateStr) {
  if (!dateStr) return ''
  return dateStr.slice(0, 7)
}

function groupByMonth(measurements) {
  const months = {}
  for (const m of measurements) {
    const mk = getMonthKey(m.date)
    if (!mk) continue
    if (!months[mk]) months[mk] = []
    months[mk].push(m)
  }
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, entries]) => {
      const sorted = entries.sort((a, b) => b.date?.localeCompare(a.date))
      return { monthKey, label: formatMonth(sorted[0].date), ...sorted[0] }
    })
}

function delta(current, previous, decimals = 1) {
  if (current == null || previous == null) return null
  const diff = current - previous
  return { value: diff.toFixed(decimals), positive: diff > 0 }
}

function formatDateShort(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '—'
  const d = new Date(dateStr + 'T12:00:00')
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getInsight(latest, previous) {
  if (!latest || !previous) return null
  const pesoD = previous.peso != null && latest.peso != null ? latest.peso - previous.peso : null
  const cinturaD = previous.cintura != null && latest.cintura != null ? latest.cintura - previous.cintura : null
  const grasaD = previous.grasa != null && latest.grasa != null ? latest.grasa - previous.grasa : null
  const muscleD = (previous.muscleMassKg != null && latest.muscleMassKg != null) ? latest.muscleMassKg - previous.muscleMassKg : null
  if (pesoD != null && pesoD < 0 && cinturaD != null && cinturaD < 0) return 'Bajaste de peso y de cintura. ¡Muy bien!'
  if (pesoD != null && pesoD < 0) return 'Bajaste de peso respecto al mes anterior.'
  if (muscleD != null && muscleD > 0) return 'Ganaste masa muscular. Seguí así.'
  if (grasaD != null && grasaD < 0) return 'Tu porcentaje de grasa bajó. Buen progreso.'
  if (cinturaD != null && cinturaD < 0) return 'Tu cintura bajó. ¡Bien!'
  if (pesoD != null && pesoD > 0 && muscleD != null && muscleD > 0) return 'Subiste de peso y masa muscular.'
  if (pesoD != null && pesoD > 0) return 'Subiste un poco de peso. Revisá alimentación y entrenamiento.'
  return null
}

function getCompositionData(m) {
  const bc = m?.bodyComposition
  if (bc) {
    const segments = COMPOSITION_NAMES.map(({ key, label }, i) => {
      const val = bc[key]
      return val != null ? { name: label, value: Math.round(val * 10) / 10, color: COMPOSITION_COLORS[i] } : null
    }).filter(Boolean)
    if (segments.length > 0) return segments
  }
  if (m?.peso != null && m?.grasa != null) {
    const grasaKg = (m.peso * m.grasa) / 100
    return [
      { name: 'Grasa', value: Math.round(grasaKg * 10) / 10, color: COMPOSITION_COLORS[0] },
      { name: 'Resto', value: Math.round((m.peso - grasaKg) * 10) / 10, color: COMPOSITION_COLORS[1] },
    ]
  }
  return []
}

const MAX_MONTHS_CHART = 12

export default function Anthropometry() {
  const [measurements, setMeasurements] = useState([])
  const [imports, setImports] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], label: '' })
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState(null)
  const [evolutionTab, setEvolutionTab] = useState('peso')
  const [technicalOpen, setTechnicalOpen] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [data, importList] = await Promise.all([
      measurementsDB.getAll(),
      importsDB.getAll(),
    ])
    setMeasurements(data.sort((a, b) => a.date?.localeCompare(b.date)))
    setImports(importList.sort((a, b) => (b.date || '').localeCompare(a.date || '')))
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    try {
      const parsed = await parseExcelFile(file)
      if (parsed.length === 0) {
        setImportPreview({ file: file.name, count: 0 })
        return
      }
      for (const m of parsed) {
        await measurementsDB.save({ ...m, id: generateId() })
      }
      await importsDB.save({
        id: generateId(),
        filename: file.name,
        date: new Date().toISOString(),
        count: parsed.length,
      })
      await loadData()
      setImportPreview({ file: file.name, count: parsed.length, success: true })
    } catch (err) {
      console.error('Import error:', err)
      setImportPreview({ file: file.name, count: 0, error: err.message })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  async function saveMeasurement() {
    if (!form.date) return
    await measurementsDB.save({
      id: generateId(),
      ...form,
      label: form.label?.trim() || null,
      peso: form.peso ? Number(form.peso) : null,
      grasa: form.grasa ? Number(form.grasa) : null,
      pecho: form.pecho ? Number(form.pecho) : null,
      cintura: form.cintura ? Number(form.cintura) : null,
      cadera: form.cadera ? Number(form.cadera) : null,
      brazo: form.brazo ? Number(form.brazo) : null,
      pierna: form.pierna ? Number(form.pierna) : null,
    })
    setForm({ date: new Date().toISOString().split('T')[0], label: '' })
    setShowForm(false)
    loadData()
  }

  async function deleteMeasurement(id) {
    await measurementsDB.delete(id)
    loadData()
  }

  const monthly = groupByMonth(measurements)
  const monthlyLimited = monthly.slice(-MAX_MONTHS_CHART)
  const latest = monthly[monthly.length - 1]
  const previous = monthly.length >= 2 ? monthly[monthly.length - 2] : null
  const first = monthly[0]
  const latestRaw = measurements[measurements.length - 1]

  const previousRaw = measurements.length >= 2 ? measurements[measurements.length - 2] : null
  const weightDelta = latestRaw?.peso != null && previousRaw?.peso != null ? (latestRaw.peso - previousRaw.peso).toFixed(1) : null
  const weightDeltaPct = latest?.peso != null && previous?.peso != null && previous.peso !== 0
    ? (((latest.peso - previous.peso) / previous.peso) * 100).toFixed(1)
    : null
  const currentTab = EVOLUTION_TABS.find(t => t.key === evolutionTab) || EVOLUTION_TABS[0]
  const evolutionData = monthlyLimited
    .map(m => ({
      month: m.label,
      value: currentTab.dataKey === 'muscleMassKg'
        ? (m.muscleMassKg ?? m.bodyComposition?.muscleMassKg)
        : m[currentTab.dataKey],
    }))
    .filter(d => d.value != null)
  const compositionData = getCompositionData(latestRaw)
  const insight = getInsight(latestRaw, previousRaw)

  return (
    <div className="min-h-full">
      <Header title="Antropometría">
        <div className="flex items-center gap-2 pr-1">
          <label className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary cursor-pointer shadow-sm">
            <span className="material-symbols-outlined text-lg">{importing ? 'hourglass_empty' : 'upload_file'}</span>
            <input type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleImport} className="hidden" />
          </label>
          <button
            onClick={() => setShowForm(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
        </div>
      </Header>

      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-5">
        {importPreview && (
          <div className={`rounded-2xl p-4 flex items-start gap-3 ${
            importPreview.success ? 'bg-green-50 border border-green-200' : importPreview.error ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
          }`}>
            <span className={`material-symbols-outlined text-lg mt-0.5 ${importPreview.success ? 'text-green-600' : importPreview.error ? 'text-red-500' : 'text-amber-600'}`}>
              {importPreview.success ? 'check_circle' : importPreview.error ? 'error' : 'warning'}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {importPreview.success ? `Se importaron ${importPreview.count} mediciones` : importPreview.error ? `Error: ${importPreview.error}` : 'No se encontraron mediciones'}
              </p>
            </div>
            <button onClick={() => setImportPreview(null)} className="p-0.5 text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* 1. Arriba: Peso actual + cambio vs anterior + fecha */}
        <div className="pt-6 pb-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-4xl font-bold text-text">
              {latestRaw?.peso != null ? latestRaw.peso.toFixed(1) : '—'}
            </span>
            <span className="text-xl text-text-secondary font-medium">kg</span>
            {weightDelta != null && (
              <span className={`text-base font-semibold ${Number(weightDelta) <= 0 ? 'text-primary' : 'text-amber-600'}`}>
                {Number(weightDelta) > 0 ? '+' : ''}{weightDelta} kg vs anterior
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Última medición: {formatDateShort(latestRaw?.date)}
          </p>
        </div>

        {/* 2. Cards: Masa grasa, Masa muscular, Cintura */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-6">
          <Card className="p-4">
            <p className="text-sm text-text-secondary mb-0.5">Masa grasa</p>
            <p className="text-2xl font-bold text-text">
              {latestRaw?.bodyComposition?.fatMassPct != null ? `${latestRaw.bodyComposition.fatMassPct.toFixed(1)}%` : latestRaw?.grasa != null ? `${latestRaw.grasa}%` : '—'}
            </p>
            {previousRaw && (latestRaw?.grasa != null && previousRaw?.grasa != null) && (
              <p className="text-sm text-primary font-medium mt-1">
                {(latestRaw.grasa - previousRaw.grasa) >= 0 ? '+' : ''}{(latestRaw.grasa - previousRaw.grasa).toFixed(1)}% vs anterior
              </p>
            )}
          </Card>
          <Card className="p-4">
            <p className="text-sm text-text-secondary mb-0.5">Masa muscular</p>
            <p className="text-2xl font-bold text-text">
              {latestRaw?.bodyComposition?.muscleMassKg != null ? `${latestRaw.bodyComposition.muscleMassKg.toFixed(1)} kg` : latestRaw?.muscleMassKg != null ? `${latestRaw.muscleMassKg.toFixed(1)} kg` : '—'}
            </p>
            {previousRaw && (latestRaw?.muscleMassKg != null || latestRaw?.bodyComposition?.muscleMassKg != null) && (previousRaw?.muscleMassKg != null || previousRaw?.bodyComposition?.muscleMassKg != null) && (
              <p className="text-sm text-primary font-medium mt-1">
                {((latestRaw?.bodyComposition?.muscleMassKg ?? latestRaw?.muscleMassKg) - (previousRaw?.bodyComposition?.muscleMassKg ?? previousRaw?.muscleMassKg)) >= 0 ? '+' : ''}{((latestRaw?.bodyComposition?.muscleMassKg ?? latestRaw?.muscleMassKg) - (previousRaw?.bodyComposition?.muscleMassKg ?? previousRaw?.muscleMassKg)).toFixed(1)} kg vs anterior
              </p>
            )}
          </Card>
          <Card className="p-4">
            <p className="text-sm text-text-secondary mb-0.5">Cintura</p>
            <p className="text-2xl font-bold text-text">
              {(latestRaw?.cintura ?? latestRaw?.perimeters?.waistMinCm) != null ? `${(latestRaw?.cintura ?? latestRaw?.perimeters?.waistMinCm)} cm` : '—'}
            </p>
            {previousRaw && (() => {
              const curr = latestRaw?.cintura ?? latestRaw?.perimeters?.waistMinCm
              const prev = previousRaw?.cintura ?? previousRaw?.perimeters?.waistMinCm
              if (curr == null || prev == null) return null
              const d = (curr - prev).toFixed(1)
              return <p className="text-sm text-primary font-medium mt-1">{(curr - prev) >= 0 ? '+' : ''}{d} cm vs anterior</p>
            })()}
          </Card>
        </div>

        {/* Insight automático */}
        {insight && (
          <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 mb-6">
            <p className="text-base font-medium text-text">{insight}</p>
          </div>
        )}

        {/* 3. Composición actual: 5 masas */}
        {compositionData.length > 0 && (
          <div className="pb-6">
            <h3 className="text-lg font-bold text-text mb-3">Composición corporal actual</h3>
            <Card className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={compositionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {compositionData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} kg`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* 4. Tabs: Evolución temporal */}
        <div className="pb-6">
          <h3 className="text-lg font-bold text-text mb-3">Evolución en el tiempo</h3>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {EVOLUTION_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setEvolutionTab(tab.key)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${evolutionTab === tab.key ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {evolutionData.length >= 2 && (
            <Card className="p-4">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={evolutionData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="evolutionFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', fontSize: '13px' }}
                    formatter={(v) => [`${Number(v).toFixed(1)} ${currentTab.unit}`, currentTab.label]}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} fill="url(#evolutionFill)" dot={{ r: 4, fill: 'var(--color-primary)' }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {/* 5. Medidas importantes */}
        {latestRaw && MEDIDAS_IMPORTANTES.some(f => latestRaw[f.key] != null || latestRaw.perimeters?.[f.perimeterKey] != null) && (
          <div className="pb-6">
            <h3 className="text-lg font-bold text-text mb-3">Medidas importantes</h3>
            <div className="space-y-2">
              {MEDIDAS_IMPORTANTES.map((f) => {
                const val = latestRaw[f.key] ?? latestRaw.perimeters?.[f.perimeterKey]
                if (val == null) return null
                return (
                  <div key={f.key} className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-text">{f.label}</span>
                    <span className="text-lg font-bold text-primary">{val} cm</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 6. Detalle técnico colapsable */}
        <div className="pb-6">
          <button
            onClick={() => setTechnicalOpen(!technicalOpen)}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl border border-gray-200 text-text-secondary font-medium"
          >
            <span>Detalle técnico (pliegues, perímetros, etc.)</span>
            <span className="material-symbols-outlined text-lg">{technicalOpen ? 'expand_less' : 'expand_more'}</span>
          </button>
          {technicalOpen && latestRaw && (
            <div className="mt-2 rounded-xl border border-gray-200 overflow-hidden">
              {DETAIL_GROUPS.map((g) => (
                <div key={g.title} className="p-4 border-b border-gray-100 last:border-0">
                  <p className="text-sm font-semibold text-text-secondary mb-2">{g.title}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {g.keys.map((key, i) => {
                      const val = latestRaw[g.source]?.[key]
                      if (val == null) return null
                      return (
                        <div key={key} className="flex justify-between">
                          <span className="text-text-secondary">{g.labels[i] ?? key}</span>
                          <span className="font-medium text-text">{val}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {(latestRaw?.peso != null || latestRaw?.pecho != null) && (
                <div className="p-4 border-b border-gray-100 last:border-0">
                  <p className="text-sm font-semibold text-text-secondary mb-2">Básicos</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {latestRaw.peso != null && <><div className="text-text-secondary">Peso</div><div className="font-medium text-text">{latestRaw.peso} kg</div></>}
                    {latestRaw.grasa != null && <><div className="text-text-secondary">Grasa %</div><div className="font-medium text-text">{latestRaw.grasa}%</div></>}
                    {latestRaw.pecho != null && <><div className="text-text-secondary">Pecho</div><div className="font-medium text-text">{latestRaw.pecho} cm</div></>}
                    {latestRaw.brazo != null && <><div className="text-text-secondary">Brazo</div><div className="font-medium text-text">{latestRaw.brazo} cm</div></>}
                    {latestRaw.pierna != null && <><div className="text-text-secondary">Pierna</div><div className="font-medium text-text">{latestRaw.pierna} cm</div></>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Historial de archivos subidos */}
        {imports.length > 0 && (
          <div className="pb-6">
            <h3 className="text-lg font-bold text-text mb-3">Archivos subidos</h3>
            <div className="space-y-2">
              {imports.map((imp) => (
                <Card key={imp.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-text truncate">{imp.filename}</p>
                      <p className="text-sm text-text-secondary">{formatImportDate(imp.date)} · {imp.count} mediciones</p>
                    </div>
                    <span className="material-symbols-outlined text-primary shrink-0">description</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {measurements.length === 0 && !imports.length && (
          <div className="text-center py-14 text-text-secondary">
            <span className="material-symbols-outlined text-5xl mb-3 block">monitoring</span>
            <p className="text-lg font-medium text-text">Sin mediciones aún</p>
            <p className="text-sm mt-1">Importá un archivo o cargá una medición manual para ver tu progreso.</p>
          </div>
        )}

        {measurements.length > 0 && (
          <div className="pb-6">
            <h3 className="text-lg font-bold text-text mb-3">Tus registros</h3>
            <div className="space-y-2">
              {[...measurements].reverse().map((m) => (
                <Card key={m.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-text">{m.label || formatDateShort(m.date)}</p>
                    <p className="text-sm text-text-secondary">{formatDateShort(m.date)}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-text-secondary">
                    {m.peso != null && <span><strong>{m.peso}</strong> kg</span>}
                    {m.cintura != null && <span>{m.cintura} cm cintura</span>}
                    <button onClick={() => deleteMeasurement(m.id)} className="p-1 text-gray-400 hover:text-red-500" aria-label="Eliminar">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text">Nueva Medición</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-text-secondary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary">Nombre del informe</label>
                <input
                  type="text"
                  value={form.label || ''}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  placeholder="Ej: Evaluación inicial, Semana 4..."
                  className="w-full mt-1 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary">Fecha</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              {FIELDS.map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-text-secondary">{f.label}</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="0"
                    value={form[f.key] || ''}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              ))}
            </div>
            <button onClick={saveMeasurement} className="w-full py-3 bg-primary text-white text-sm font-semibold rounded-xl mt-5">
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
