import { useState, useEffect, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Header from '../components/Header'
import Card from '../components/ui/Card'
import { measurementsDB, usersDB, generateId } from '../lib/db'
import { parseExcelFile } from '../lib/excel-parser'
import { useAuth } from '../contexts/AuthContext'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function fmtAxis(d) { if (!d) return ''; const p = d.split('-'); return p.length < 2 ? d : `${MONTHS[parseInt(p[1])-1]} '${p[0].slice(2)}` }
function fmtLong(d) { if (!d) return '—'; const dt = new Date(d+'T12:00:00'); return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'}) }
function calcDelta(a, b) { return a != null && b != null ? +(a - b).toFixed(1) : null }

const COMP_CARDS = [
  { key: 'peso',    label: 'Peso',          unit: 'kg', icon: 'monitor_weight', field: m => m.peso,          lowerBetter: true  },
  { key: 'musculo', label: 'Masa muscular', unit: 'kg', icon: 'exercise',       field: m => m.masaMuscular,  lowerBetter: false },
  { key: 'grasa',   label: 'Masa adiposa',  unit: '%',  icon: 'water_drop',     field: m => m.grasaCorporal, lowerBetter: true  },
]

const PERIM_OPTIONS = [
  { key: 'cabeza',          label: 'Cabeza',             field: m => m.cabeza          },
  { key: 'brazoIzq',        label: 'Brazo relajado',     field: m => m.brazoIzq        },
  { key: 'brazoFlex',       label: 'Brazo flexionado',   field: m => m.brazoFlex       },
  { key: 'antebrazo',       label: 'Antebrazo',          field: m => m.antebrazo       },
  { key: 'pecho',           label: 'Tórax mesoesternal', field: m => m.pecho           },
  { key: 'cintura',         label: 'Cintura (mínima)',   field: m => m.cintura         },
  { key: 'cadera',          label: 'Caderas (máxima)',   field: m => m.cadera          },
  { key: 'musloIzq',        label: 'Muslo superior',     field: m => m.musloIzq        },
  { key: 'musloDer',        label: 'Muslo medial',       field: m => m.musloDer        },
  { key: 'pantorrillaIzq',  label: 'Pantorrilla (máx.)', field: m => m.pantorrillaIzq  },
  { key: 'cuello',          label: 'Cuello',             field: m => m.cuello          },
]

const CHART_TABS = [
  { key: 'peso',    label: 'Peso',    unit: 'kg', field: m => m.peso,          lowerBetter: true  },
  { key: 'grasa',   label: 'Grasa',   unit: '%',  field: m => m.grasaCorporal, lowerBetter: true  },
  { key: 'musculo', label: 'Músculo', unit: 'kg', field: m => m.masaMuscular,  lowerBetter: false },
]

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:10, padding:'6px 12px', boxShadow:'0 4px 16px rgba(0,0,0,.14)' }}>
      <p style={{ fontSize:10, color:'var(--color-text-secondary)', marginBottom:2 }}>{label}</p>
      <p style={{ fontSize:14, fontWeight:700, color:'var(--color-text)', margin:0 }}>{Number(payload[0].value).toFixed(1)} {unit}</p>
    </div>
  )
}

// ─── Diagnostic engine ───────────────────────────────────────

function buildDiagnostic(latest, prev) {
  if (!latest || !prev) return null
  const items = []

  const peso  = calcDelta(latest.peso,         prev.peso)
  const musc  = calcDelta(latest.masaMuscular,  prev.masaMuscular)
  const grasa = calcDelta(latest.grasaCorporal, prev.grasaCorporal)

  // ── Composición corporal
  if (peso != null) {
    if (peso < -3)      items.push({ icon: 'trending_down', color: 'text-primary',  text: `Perdiste ${Math.abs(peso)} kg — bajada de peso significativa.` })
    else if (peso < -0.5) items.push({ icon: 'trending_down', color: 'text-primary', text: `Leve descenso de ${Math.abs(peso)} kg de peso corporal.` })
    else if (peso > 3)  items.push({ icon: 'trending_up',   color: 'text-amber-500', text: `Subiste ${peso} kg — aumento de peso significativo.` })
    else if (peso > 0.5) items.push({ icon: 'trending_up',  color: 'text-amber-500', text: `Leve aumento de ${peso} kg de peso corporal.` })
    else                items.push({ icon: 'horizontal_rule', color: 'text-text-secondary', text: `Peso estable (variación de ${Math.abs(peso)} kg).` })
  }

  if (musc != null) {
    if (musc > 1)       items.push({ icon: 'fitness_center', color: 'text-primary', text: `Excelente: ganaste ${musc} kg de masa muscular.` })
    else if (musc > 0.3) items.push({ icon: 'fitness_center', color: 'text-primary', text: `Buen progreso: +${musc} kg de masa muscular.` })
    else if (musc < -1) items.push({ icon: 'fitness_center', color: 'text-amber-500', text: `Perdiste ${Math.abs(musc)} kg de masa muscular — revisá proteína y carga de entrenamiento.` })
    else if (musc < -0.3) items.push({ icon: 'fitness_center', color: 'text-amber-500', text: `Leve descenso de ${Math.abs(musc)} kg de masa muscular.` })
    else if (musc != null) items.push({ icon: 'fitness_center', color: 'text-text-secondary', text: `Masa muscular estable.` })
  }

  if (grasa != null) {
    if (grasa < -2)     items.push({ icon: 'water_drop', color: 'text-primary', text: `Reducción notable de ${Math.abs(grasa)}% de grasa corporal.` })
    else if (grasa < -0.5) items.push({ icon: 'water_drop', color: 'text-primary', text: `Bajaste ${Math.abs(grasa)}% de grasa — tendencia positiva.` })
    else if (grasa > 2) items.push({ icon: 'water_drop', color: 'text-amber-500', text: `Aumento de ${grasa}% de grasa corporal — chequeá alimentación.` })
    else if (grasa > 0.5) items.push({ icon: 'water_drop', color: 'text-amber-500', text: `Leve aumento de ${grasa}% de grasa corporal.` })
    else if (grasa != null) items.push({ icon: 'water_drop', color: 'text-text-secondary', text: `Grasa corporal estable.` })
  }

  // ── Composición neta (combinación músculo + grasa)
  if (musc != null && grasa != null) {
    if (musc > 0.3 && grasa < -0.3)
      items.push({ icon: 'star', color: 'text-primary', text: `Recomposición corporal positiva: más músculo y menos grasa. ¡Excelente trabajo!` })
    else if (musc < -0.3 && grasa > 0.3)
      items.push({ icon: 'warning', color: 'text-amber-500', text: `Tendencia negativa: menos músculo y más grasa. Revisá tu plan de entrenamiento y nutrición.` })
  }

  // ── Perímetros
  const perimChanges = PERIM_OPTIONS
    .map(p => ({ label: p.label, delta: calcDelta(p.field(latest), p.field(prev)), unit: 'cm' }))
    .filter(p => p.delta != null && Math.abs(p.delta) >= 0.5)

  if (perimChanges.length > 0) {
    const up   = perimChanges.filter(p => p.delta > 0).map(p => `${p.label} +${p.delta} cm`)
    const down = perimChanges.filter(p => p.delta < 0).map(p => `${p.label} ${p.delta} cm`)
    if (up.length)   items.push({ icon: 'straighten', color: 'text-amber-500', text: `Perímetros que aumentaron: ${up.join(', ')}.` })
    if (down.length) items.push({ icon: 'straighten', color: 'text-primary',   text: `Perímetros que bajaron: ${down.join(', ')}.` })
  }

  // ── Sin cambios relevantes
  if (items.length === 0)
    items.push({ icon: 'check_circle', color: 'text-text-secondary', text: 'Sin cambios significativos respecto a la medición anterior.' })

  return items
}

function DiagnosticPanel({ latest, prev }) {
  const items = buildDiagnostic(latest, prev)
  if (!items) return null

  return (
    <div>
      <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-2">Resumen del período</p>
      <Card className="p-3! rounded-xl!">
        <p className="text-[9px] text-text-secondary/60 mb-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">calendar_month</span>
          {fmtLong(prev.date)} → {fmtLong(latest.date)}
        </p>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`material-symbols-outlined text-base shrink-0 mt-0.5 ${item.color}`}>{item.icon}</span>
              <p className="text-xs text-text leading-snug">{item.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function DeltaBadge({ value, unit, good }) {
  if (value == null) return null
  return (
    <span className={`text-[10px] font-bold inline-flex items-center gap-0.5 ${good ? 'text-primary' : 'text-amber-600 dark:text-amber-400'}`}>
      <span className="material-symbols-outlined text-xs leading-none">{value > 0 ? 'arrow_upward' : 'arrow_downward'}</span>
      {value > 0 ? '+' : ''}{value} {unit}
    </span>
  )
}

export default function Anthropometry() {
  const { user } = useAuth()
  const isAdmin  = user?.username === 'admin'
  const fileRef  = useRef(null)

  const [measurements, setMeasurements] = useState([])
  const [chartMode, setChartMode]       = useState('peso')
  const [selectedPerim, setSelectedPerim] = useState('')
  const [importing, setImporting]       = useState(false)
  const [importMsg, setImportMsg]       = useState(null)
  const [allUsers, setAllUsers]         = useState([])
  const [targetUserId, setTargetUserId] = useState(null)

  useEffect(() => {
    if (isAdmin) usersDB.getAll().then(u => setAllUsers(u.filter(x => x.username !== 'admin')))
  }, [isAdmin])

  useEffect(() => { loadData() }, [targetUserId]) // eslint-disable-line

  async function loadData() {
    if (isAdmin && !targetUserId) { setMeasurements([]); return }
    const data = await measurementsDB.getAll(targetUserId || undefined)
    setMeasurements(data.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')))
  }

  const sorted = [...measurements]
  const latest = sorted[sorted.length - 1] ?? null
  const prev   = sorted.length >= 2 ? sorted[sorted.length - 2] : null
  const perimsWithData = PERIM_OPTIONS.filter(p => sorted.some(m => p.field(m) != null))

  useEffect(() => {
    if (perimsWithData.length && !selectedPerim) setSelectedPerim(perimsWithData[0].key)
  }, [perimsWithData.length]) // eslint-disable-line

  const isPerimMode = PERIM_OPTIONS.some(p => p.key === chartMode)
  const activeCfg = isPerimMode
    ? (() => { const p = PERIM_OPTIONS.find(x => x.key === chartMode); return p ? { ...p, unit: 'cm', lowerBetter: true } : null })()
    : CHART_TABS.find(t => t.key === chartMode) ?? CHART_TABS[0]

  const chartData = activeCfg ? sorted.map(m => ({ label: fmtAxis(m.date), value: activeCfg.field(m) })).filter(d => d.value != null) : []
  const chartCurr = latest && activeCfg ? activeCfg.field(latest) : null
  const chartPrev = prev && activeCfg ? activeCfg.field(prev) : null
  const chartDelta = calcDelta(chartCurr, chartPrev)
  const chartGood = chartDelta != null && activeCfg ? (activeCfg.lowerBetter ? chartDelta < 0 : chartDelta > 0) : false

  const perimCfg = PERIM_OPTIONS.find(p => p.key === selectedPerim)
  const perimVal = latest && perimCfg ? perimCfg.field(latest) : null
  const perimDelta = calcDelta(perimVal, prev && perimCfg ? perimCfg.field(prev) : null)

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true); setImportMsg(null)
    try {
      const parsed = await parseExcelFile(file)
      if (!parsed.length) { setImportMsg({ type: 'warning', text: 'No se encontraron mediciones válidas.' }); return }
      const saveFor = targetUserId || undefined
      for (const m of parsed) await measurementsDB.save({ ...m, id: generateId() }, saveFor)
      await loadData()
      const who = targetUserId ? (allUsers.find(u => u.id === targetUserId)?.nombre ?? 'el usuario') : 'tu historial'
      setImportMsg({ type: 'success', text: `${parsed.length} medición${parsed.length !== 1 ? 'es' : ''} añadida${parsed.length !== 1 ? 's' : ''} a ${who}.` })
    } catch (err) {
      console.error('[Anthropometry] Import error:', err)
      setImportMsg({ type: 'error', text: `Error: ${err.message}` })
    } finally { setImporting(false); e.target.value = '' }
  }

  function handlePerimSelect(key) { setSelectedPerim(key); setChartMode(key) }

  const selectedUserName = targetUserId ? (allUsers.find(u => u.id === targetUserId)?.nombre ?? '—') : null
  const showAdminEmpty = isAdmin && !targetUserId

  return (
    <div className="min-h-full">
      <Header title="Antropometría">
        {isAdmin && (
          <label className={`w-10 h-10 flex items-center justify-center rounded-full cursor-pointer transition-all ${importing ? 'bg-primary/20 text-primary/50' : 'bg-primary text-white active:scale-95'}`} title="Importar Excel">
            <span className={`material-symbols-outlined text-lg ${importing ? 'animate-spin' : ''}`}>{importing ? 'autorenew' : 'table_chart'}</span>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" disabled={importing} />
          </label>
        )}
      </Header>

      <div className="pb-28 px-4 pt-3 space-y-3">

        {/* Admin user selector */}
        {isAdmin && allUsers.length > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/8 border border-primary/20">
            <span className="material-symbols-outlined text-primary text-base shrink-0">manage_accounts</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-0.5">Viendo datos de</p>
              <select value={targetUserId ?? ''} onChange={e => setTargetUserId(e.target.value || null)} className="w-full bg-transparent text-text text-xs font-semibold focus:outline-none cursor-pointer">
                <option value="">— Seleccioná un usuario —</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.nombre ? `${u.nombre}${u.apellido ? ' ' + u.apellido : ''}` : u.username}</option>)}
              </select>
            </div>
            {selectedUserName && <button onClick={() => setTargetUserId(null)} className="text-text-secondary shrink-0"><span className="material-symbols-outlined text-sm">close</span></button>}
          </div>
        )}

        {/* Import feedback */}
        {importMsg && (
          <div className={`flex items-start gap-3 p-4 rounded-2xl border ${importMsg.type === 'success' ? 'bg-primary/10 border-primary/20' : importMsg.type === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
            <span className={`material-symbols-outlined text-lg mt-0.5 shrink-0 ${importMsg.type === 'success' ? 'text-primary' : importMsg.type === 'error' ? 'text-red-500' : 'text-amber-600'}`}>{importMsg.type === 'success' ? 'check_circle' : importMsg.type === 'error' ? 'error' : 'warning'}</span>
            <p className="flex-1 text-sm font-medium text-text">{importMsg.text}</p>
            <button onClick={() => setImportMsg(null)} className="text-text-secondary shrink-0"><span className="material-symbols-outlined text-base">close</span></button>
          </div>
        )}

        {/* Admin: no user selected — show empty prompt */}
        {showAdminEmpty && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl block mb-3 text-primary/25">person_search</span>
            <p className="text-base font-semibold text-text">Seleccioná un usuario</p>
            <p className="text-sm text-text-secondary mt-1">Elegí un usuario del selector para ver o cargar sus mediciones.</p>
          </div>
        )}

        {/* Full UI — always visible (even without data) unless admin has no user selected */}
        {!showAdminEmpty && (
          <>
            {sorted.length > 0 && (
              <p className="text-xs text-text-secondary">
                {selectedUserName ? <strong>{selectedUserName} · </strong> : null}
                Última medición: <strong>{fmtLong(latest?.date)}</strong> · {sorted.length} {sorted.length === 1 ? 'registro' : 'registros'}
              </p>
            )}

            {/* ── 4 stat cards (2×2) ── */}
            <div className="grid grid-cols-2 gap-2">
              {COMP_CARDS.map(card => {
                const val = latest ? card.field(latest) : null
                const dd  = calcDelta(val, prev ? card.field(prev) : null)
                const good = dd != null ? (card.lowerBetter ? dd < 0 : dd > 0) : false
                return (
                  <Card key={card.key} className="p-2.5! rounded-xl!">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="material-symbols-outlined text-xs text-text-secondary/50">{card.icon}</span>
                      <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">{card.label}</p>
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-lg font-bold tabular-nums leading-none ${val != null ? 'text-text' : 'text-text-secondary/25'}`}>{val != null ? Number(val).toFixed(1) : '—'}</span>
                      <span className="text-[9px] text-text-secondary">{card.unit}</span>
                    </div>
                    {dd != null && <div className="mt-0.5"><DeltaBadge value={dd} unit={card.unit} good={good} /></div>}
                  </Card>
                )
              })}

              {/* Perímetros card */}
              <Card className="p-2.5! rounded-xl!">
                <div className="flex items-center gap-1 mb-1">
                  <span className="material-symbols-outlined text-xs text-text-secondary/50">straighten</span>
                  <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Perímetros</p>
                </div>
                {perimsWithData.length > 0 ? (
                  <>
                    <select
                      value={selectedPerim}
                      onChange={e => handlePerimSelect(e.target.value)}
                      className="w-full bg-transparent text-text text-[11px] font-semibold focus:outline-none cursor-pointer mb-1"
                    >
                      {perimsWithData.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-lg font-bold tabular-nums leading-none ${perimVal != null ? 'text-text' : 'text-text-secondary/25'}`}>{perimVal != null ? Number(perimVal).toFixed(1) : '—'}</span>
                      <span className="text-[9px] text-text-secondary">cm</span>
                    </div>
                    {perimDelta != null && <div className="mt-0.5"><DeltaBadge value={perimDelta} unit="cm" good={perimDelta < 0} /></div>}
                  </>
                ) : (
                  <>
                    <span className="text-lg font-bold tabular-nums leading-none text-text-secondary/25">—</span>
                    <span className="text-[9px] text-text-secondary ml-0.5">cm</span>
                  </>
                )}
              </Card>
            </div>

            {/* ── Chart tabs ── */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {CHART_TABS.map(t => {
                const has = sorted.some(m => t.field(m) != null)
                return (
                  <button
                    key={t.key} disabled={!has}
                    onClick={() => has && setChartMode(t.key)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      chartMode === t.key ? 'bg-primary text-white' : has ? 'bg-surface text-text-secondary' : 'bg-surface/50 text-text-secondary/30 cursor-not-allowed'
                    }`}
                  >{t.label}</button>
                )
              })}
              {perimsWithData.length > 0 && (
                <select
                  value={isPerimMode ? chartMode : ''}
                  onChange={e => { if (e.target.value) { setChartMode(e.target.value); setSelectedPerim(e.target.value) } }}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer focus:outline-none transition-all appearance-none ${
                    isPerimMode ? 'bg-primary text-white' : 'bg-surface text-text-secondary'
                  }`}
                  style={{ paddingRight: '1.4rem', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='${isPerimMode ? 'white' : '%239ca3af'}'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.3rem center', backgroundSize: '0.8rem' }}
                >
                  {!isPerimMode && <option value="">Perímetro…</option>}
                  {perimsWithData.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              )}
            </div>

            {/* ── Main chart ── */}
            {activeCfg && (
              chartData.length >= 2 ? (
                <Card className="p-3! pt-3! rounded-xl!">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">{activeCfg.label}</p>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-2xl font-bold text-text tabular-nums leading-none">{chartCurr != null ? Number(chartCurr).toFixed(1) : '—'}</span>
                        <span className="text-xs text-text-secondary">{activeCfg.unit}</span>
                      </div>
                    </div>
                    {chartDelta != null && <DeltaBadge value={chartDelta} unit={activeCfg.unit} good={chartGood} />}
                  </div>
                  <div style={{ width: '100%', height: 150, overflow: 'hidden' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                        <defs><linearGradient id="aFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" padding={{ left: 6, right: 6 }} />
                        <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} domain={['auto','auto']} tickCount={4} width={40} />
                        <Tooltip content={props => <ChartTooltip {...props} unit={activeCfg.unit} />} />
                        <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} fill="url(#aFill)" dot={{ r: 3, fill: 'var(--color-primary)', strokeWidth: 0 }} activeDot={{ r: 5, fill: 'var(--color-primary)', strokeWidth: 0 }} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              ) : (
                <Card className="p-4! rounded-xl! text-center">
                  <span className="material-symbols-outlined text-2xl text-text-secondary/30 block mb-1">show_chart</span>
                  <p className="text-xs text-text-secondary">
                    {chartData.length === 1
                      ? `Solo 1 registro de ${activeCfg.label}. Importá otro Excel para ver el gráfico.`
                      : `Aún no hay datos de ${activeCfg.label}.`}
                  </p>
                </Card>
              )
            )}

            {/* ── Diagnostic ── */}
            {sorted.length >= 2 && <DiagnosticPanel latest={latest} prev={prev} />}

            {/* ── History ── */}
            {sorted.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-2">Historial</p>
                <div className="space-y-1.5">
                  {[...sorted].reverse().map(m => (
                    <Card key={m.id} className="p-2.5! rounded-xl!">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-text text-xs">{fmtLong(m.date)}</p>
                          <p className="text-[9px] text-text-secondary mt-0.5 flex flex-wrap gap-x-2">
                            {m.peso != null && <span><strong>{m.peso}</strong> kg</span>}
                            {m.grasaCorporal != null && <span>{m.grasaCorporal}% grasa</span>}
                            {m.masaMuscular != null && <span>{m.masaMuscular} kg musc.</span>}
                            {m.cintura != null && <span>{m.cintura} cm cintura</span>}
                          </p>
                        </div>
                        {isAdmin && <button onClick={() => measurementsDB.delete(m.id).then(loadData)} className="p-0.5 text-text-secondary hover:text-red-500 transition-colors shrink-0"><span className="material-symbols-outlined text-sm">delete</span></button>}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
