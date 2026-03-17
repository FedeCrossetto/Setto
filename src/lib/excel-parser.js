let _XLSX = null
async function getXLSX() {
  if (!_XLSX) _XLSX = await import('xlsx')
  return _XLSX
}

// ─── Label definitions (most specific first) ─────────────────

const ROW_LABELS = [
  { field: 'peso',        aliases: ['peso', 'peso corporal', 'peso (kg)', 'body weight', 'weight'] },
  { field: 'grasa',       aliases: ['masa adiposa', 'masa grasa', 'grasa corporal', 'grasa', 'tejido adiposo', 'tejido graso', 'body fat', 'fat mass', '% grasa'] },
  { field: 'musculo',     aliases: ['masa muscular', 'musculo', 'masa magra', 'lean mass', 'muscle mass'] },
  { field: 'brazoFlex',   aliases: ['brazo flexionado en tension', 'brazo flexionado', 'brazo f', 'brazo contraido'] },
  { field: 'brazo',       aliases: ['brazo relajado', 'brazo r'] },
  { field: 'antebrazo',   aliases: ['antebrazo', 'forearm'] },
  { field: 'pecho',       aliases: ['torax mesoesternal', 'torax', 'pecho', 'chest'] },
  { field: 'cintura',     aliases: ['cintura minima', 'cintura (minima)', 'cintura', 'waist'] },
  { field: 'cadera',      aliases: ['caderas maxima', 'caderas (maxima)', 'caderas', 'cadera', 'hip'] },
  { field: 'musloMed',    aliases: ['muslo medial', 'muslo (medial)', 'muslo med'] },
  { field: 'musloSup',    aliases: ['muslo superior', 'muslo (superior)', 'muslo sup', 'muslo'] },
  { field: 'pantorrilla', aliases: ['pantorrilla maxima', 'pantorrilla (maxima)', 'pantorrilla', 'gemelo', 'calf'] },
  { field: 'cabeza',      aliases: ['cabeza', 'head', 'craneo'] },
  { field: 'cuello',      aliases: ['cuello', 'neck'] },
]

function normalize(str) {
  return String(str).toLowerCase().trim().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
}

function toNumber(val) {
  if (val == null) return null
  if (typeof val === 'number') return val
  const s = String(val).replace(',', '.').trim()
  if (s === '' || s === '-') return null
  const n = Number(s)
  return isNaN(n) ? null : n
}

function parseDate(val) {
  if (!val) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val.toISOString().split('T')[0]
  const str = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)
  const dmy = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (dmy) {
    const year = dmy[3].length === 2 ? '20' + dmy[3] : dmy[3]
    const c = `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
    if (isValidISODate(c)) return c
  }
  if (/^\d{5}$/.test(str)) {
    const d = new Date(Math.floor(parseInt(str) - 25569) * 86400000)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  return null
}

function isValidISODate(s) {
  return !isNaN(new Date(s + 'T12:00:00').getTime()) && s.length === 10
}

function matchLabel(cellText, aliases) {
  const norm = normalize(cellText)
  if (!norm || norm.length < 2) return false
  for (const alias of aliases) {
    if (norm === normalize(alias)) return true
  }
  for (const alias of aliases) {
    const na = normalize(alias)
    if (na.length >= 4 && norm.includes(na)) return true
  }
  return false
}

// ─── Sheet selection ─────────────────────────────────────────
// The user's Excel files have data in a sheet called "Presentación"
// (the second sheet). We prefer that sheet, falling back to first.

function selectSheet(workbook) {
  const names = workbook.SheetNames
  // Try to find "Presentación" (accent-insensitive)
  const target = names.find(n => normalize(n).includes('presentacion'))
  if (target) {
    console.log('[ExcelParser] Using sheet:', target)
    return workbook.Sheets[target]
  }
  // Fall back to second sheet if available, else first
  if (names.length >= 2) {
    console.log('[ExcelParser] Using second sheet:', names[1])
    return workbook.Sheets[names[1]]
  }
  console.log('[ExcelParser] Using first sheet:', names[0])
  return workbook.Sheets[names[0]]
}

// ─── Strategy 1: Known-format parser ─────────────────────────
// The user's Excel has a fixed layout:
//   Row 10 col E (0-indexed: r=9, c=4)  → Peso
//   Row 60 col E (0-indexed: r=59, c=4) → Masa adiposa (grasa)
//   Row 61 col E (0-indexed: r=60, c=4) → Masa muscular
//   Rows 21–30, label in col B (c=1), value in col E (c=4) → Perimeters
// Each file = ONE assessment on ONE date.

const KNOWN_COMP_ROWS = [
  { row: 9,  col: 4, field: 'peso' },
  { row: 59, col: 4, field: 'grasa' },
  { row: 60, col: 4, field: 'musculo' },
]

const KNOWN_PERIM_ROWS = { start: 20, end: 30, labelCol: 1, valueCol: 4 }

function parseKnownFormat(json) {
  // Find the assessment date
  let date = null
  for (let r = 0; r < Math.min(json.length, 15) && !date; r++) {
    for (let c = 0; c < (json[r]?.length || 0) && !date; c++) {
      date = parseDate(json[r]?.[c])
    }
  }
  if (!date) return null

  const m = { date }

  // Extract composition values from known rows
  for (const { row, col, field } of KNOWN_COMP_ROWS) {
    if (row >= json.length) continue
    const v = toNumber(json[row]?.[col])
    if (v != null && v > 0) {
      m[field] = v
      console.log(`[ExcelParser:Known] Row ${row + 1} Col ${String.fromCharCode(65 + col)}: ${field} = ${v}`)
    }
  }

  // Extract perimeters from rows 21–30
  const { start, end, labelCol, valueCol } = KNOWN_PERIM_ROWS
  for (let r = start; r < Math.min(end, json.length); r++) {
    const row = json[r]
    if (!row) continue
    const label = row[labelCol]
    if (label == null || typeof label !== 'string' || label.trim().length < 2) continue
    const v = toNumber(row[valueCol])
    if (v == null || v <= 0) continue

    for (const { field, aliases } of ROW_LABELS) {
      if (m[field] != null) continue
      if (matchLabel(label, aliases)) {
        m[field] = v
        console.log(`[ExcelParser:Known] Row ${r + 1}: "${label.trim()}" → ${field} = ${v}`)
        break
      }
    }
  }

  const fieldCount = Object.entries(m).filter(([k, v]) => k !== 'date' && v != null).length
  console.log('[ExcelParser:Known] date=' + date + ', fields=' + fieldCount)
  return fieldCount >= 3 ? [m] : null
}

// ─── Strategy 2: Form format (generic label scanning) ────────

function parseFormFormat(json) {
  let date = null
  for (let r = 0; r < json.length && !date; r++) {
    for (let c = 0; c < (json[r]?.length || 0) && !date; c++) {
      date = parseDate(json[r][c])
    }
  }
  if (!date) return null

  const m = { date }

  for (let r = 0; r < json.length; r++) {
    const row = json[r]
    if (!row) continue

    let matchedField = null
    let labelColIdx = -1
    for (let c = 0; c < Math.min(row.length, 4); c++) {
      const cell = row[c]
      if (cell == null || typeof cell !== 'string' || cell.trim().length < 2) continue

      for (const { field, aliases } of ROW_LABELS) {
        if (m[field] != null) continue
        if (matchLabel(cell, aliases)) {
          matchedField = field
          labelColIdx = c
          break
        }
      }
      if (matchedField) break
    }
    if (!matchedField) continue

    let value = null
    for (let c = labelColIdx + 1; c < row.length; c++) {
      const v = toNumber(row[c])
      if (v != null && Math.abs(v) > 5) { value = v; break }
    }
    if (value == null) {
      for (let c = labelColIdx + 1; c < row.length; c++) {
        const v = toNumber(row[c])
        if (v != null && v > 0) { value = v; break }
      }
    }

    if (value != null) m[matchedField] = value
  }

  const fieldCount = Object.entries(m).filter(([k, v]) => k !== 'date' && v != null).length
  return fieldCount >= 1 ? [m] : null
}

// ─── Strategy 3: Transposed (multiple dates in columns) ──────

function parseTransposed(json) {
  const datesByCol = {}
  for (let r = 0; r < Math.min(json.length, 50); r++) {
    const row = json[r]
    if (!row) continue
    let found = 0
    for (let c = 1; c < row.length; c++) {
      if (datesByCol[c]) continue
      const d = parseDate(row[c])
      if (d) { datesByCol[c] = d; found++ }
    }
    if (found >= 2) break
  }

  const dateCols = Object.entries(datesByCol)
    .map(([col, date]) => ({ col: Number(col), date }))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (dateCols.length < 2) return null

  const fieldData = {}
  for (let r = 0; r < json.length; r++) {
    const row = json[r]
    if (!row) continue
    for (let c = 0; c < Math.min(row.length, 6); c++) {
      const cell = row[c]
      if (cell == null || typeof cell !== 'string' || cell.trim().length < 2) continue
      for (const { field, aliases } of ROW_LABELS) {
        if (fieldData[field]) continue
        if (!matchLabel(cell, aliases)) continue
        fieldData[field] = {}
        for (const { col } of dateCols) {
          const v = toNumber(row[col])
          if (v != null) fieldData[field][col] = v
        }
        break
      }
    }
  }

  const measurements = []
  for (const { col, date } of dateCols) {
    const m = { date }
    let hasData = false
    for (const [field, cols] of Object.entries(fieldData)) {
      if (cols[col] != null) { m[field] = cols[col]; hasData = true }
    }
    if (hasData) measurements.push(m)
  }
  return measurements.length >= 2 ? measurements : null
}

// ─── Strategy 4: Tabular fallback (dates in rows) ────────────

function parseTabular(json) {
  let headerIdx = 0
  for (let i = 0; i < Math.min(json.length, 5); i++) {
    const row = json[i]
    if (!row || row.length < 2) continue
    const strs = row.filter(c => c != null && typeof c === 'string' && c.trim().length > 0)
    if (strs.length >= 2 && strs.length > row.filter(c => typeof c === 'number').length) { headerIdx = i; break }
  }

  const headers = json[headerIdx] || []
  const COLS = [
    ['fecha', ['fecha', 'date', 'dia', 'periodo', 'mes']],
    ['peso', ['peso', 'weight']],
    ['grasa', ['grasa', 'grasa corporal']],
    ['musculo', ['masa muscular', 'musculo']],
    ['pecho', ['pecho', 'torax']],
    ['cintura', ['cintura', 'waist']],
    ['cadera', ['cadera', 'caderas']],
    ['brazo', ['brazo', 'brazo relajado']],
    ['brazoFlex', ['brazo flexionado']],
    ['antebrazo', ['antebrazo']],
    ['musloSup', ['muslo', 'pierna']],
    ['pantorrilla', ['pantorrilla', 'calf']],
    ['cabeza', ['cabeza']],
    ['cuello', ['cuello']],
  ]

  const colMap = {}
  for (const [key, aliases] of COLS) {
    const nh = headers.map(h => normalize(String(h ?? '')))
    for (const a of aliases) {
      const na = normalize(a)
      let idx = nh.findIndex(h => h === na)
      if (idx === -1) idx = nh.findIndex(h => h.includes(na) || na.includes(h))
      if (idx !== -1) { colMap[key] = idx; break }
    }
  }

  const measurements = []
  for (let i = headerIdx + 1; i < json.length; i++) {
    const row = json[i]
    if (!row || row.every(c => c == null || String(c).trim() === '')) continue
    let d = colMap.fecha != null ? parseDate(row[colMap.fecha]) : null
    if (!d) d = parseDate(row[0])
    if (!d && row[1] != null) d = parseDate(row[1])
    if (!d || !isValidISODate(d)) continue
    const g = k => colMap[k] != null ? toNumber(row[colMap[k]]) : null
    const m = { date: d, peso: g('peso'), grasa: g('grasa'), musculo: g('musculo'), pecho: g('pecho'), cintura: g('cintura'), cadera: g('cadera'), brazo: g('brazo'), brazoFlex: g('brazoFlex'), antebrazo: g('antebrazo'), pierna: g('musloSup'), pantorrilla: g('pantorrilla'), cabeza: g('cabeza'), cuello: g('cuello') }
    if (Object.entries(m).filter(([k]) => k !== 'date').some(([, v]) => v != null)) measurements.push(m)
  }
  return measurements.length ? measurements : null
}

// ─── Main export — pick the best strategy ────────────────────

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const XLSX = await getXLSX()
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const sheet = selectSheet(workbook)
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

        if (json.length < 2) { reject(new Error('Archivo vacío')); return }
        console.log('[ExcelParser] Rows:', json.length, '| Sheets:', workbook.SheetNames.join(', '))

        // Try all strategies, pick the one with most data
        const candidates = [
          parseKnownFormat(json),
          parseFormFormat(json),
          parseTransposed(json),
          parseTabular(json),
        ].filter(r => r?.length > 0)

        if (!candidates.length) { resolve([]); return }

        const best = candidates
          .map(ms => ({
            ms,
            score: ms.reduce((sum, m) => sum + Object.entries(m).filter(([k, v]) => k !== 'date' && v != null).length, 0),
          }))
          .sort((a, b) => b.score - a.score)[0]

        console.log('[ExcelParser] Best result:', best.ms.length, 'measurements,', best.score, 'total fields')
        resolve(best.ms)
      } catch (err) {
        console.error('[ExcelParser] Error:', err)
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}
