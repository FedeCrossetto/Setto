import * as XLSX from 'xlsx'

const COLUMN_MAPPINGS = {
  fecha: ['fecha', 'date', 'dia', 'día', 'periodo', 'mes', 'month', 'semana', 'week', 'control'],
  peso: ['peso', 'weight', 'peso (kg)', 'peso(kg)', 'peso kg', 'kg', 'mass', 'masa', 'peso corporal', 'body weight'],
  grasa: ['grasa', 'grasa corporal', 'body fat', '% grasa', 'grasa (%)', 'bf%', 'bf', 'fat', 'grasa%', '% gc', 'gc%', 'gc', 'masa grasa', 'tejido graso', 'graso'],
  pecho: ['pecho', 'chest', 'torax', 'tórax', 'toracico', 'torácico', 'perimetro pecho', 'per. pecho', 'per pecho'],
  cintura: ['cintura', 'waist', 'abdomen', 'abdominal', 'perimetro cintura', 'per. cintura', 'per cintura', 'umbilical'],
  cadera: ['cadera', 'hip', 'gluteo', 'glúteo', 'perimetro cadera', 'per. cadera', 'per cadera'],
  brazo: ['brazo', 'arm', 'bicep', 'bícep', 'biceps', 'bíceps', 'brazo relajado', 'brazo contraido', 'brazo contraído', 'per. brazo', 'per brazo'],
  pierna: ['pierna', 'leg', 'muslo', 'quad', 'cuadriceps', 'cuádriceps', 'per. muslo', 'per muslo', 'per. pierna', 'per pierna', 'pantorrilla', 'gemelo'],
}

function normalize(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function findColumn(headers, aliases) {
  const normalizedHeaders = headers.map(h => normalize(h))
  for (const alias of aliases) {
    const normalizedAlias = normalize(alias)
    const exact = normalizedHeaders.findIndex(h => h === normalizedAlias)
    if (exact !== -1) return exact
  }
  for (const alias of aliases) {
    const normalizedAlias = normalize(alias)
    const partial = normalizedHeaders.findIndex(h => h.includes(normalizedAlias) || normalizedAlias.includes(h))
    if (partial !== -1) return partial
  }
  return -1
}

function looksLikeNumber(val) {
  if (val == null) return false
  if (typeof val === 'number') return true
  const n = Number(String(val).replace(',', '.'))
  return !isNaN(n) && String(val).trim() !== ''
}

function toNumber(val) {
  if (val == null) return null
  if (typeof val === 'number') return val
  const n = Number(String(val).replace(',', '.'))
  return isNaN(n) ? null : n
}

function parseDate(val) {
  if (!val) return null
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null
    return val.toISOString().split('T')[0]
  }
  const str = String(val).trim()
  // Try ISO format (2024-01-15)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (dmy) {
    const year = dmy[3].length === 2 ? '20' + dmy[3] : dmy[3]
    return `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  }
  // Try MM/DD/YYYY
  const mdy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (mdy) {
    const m = parseInt(mdy[1]), d = parseInt(mdy[2])
    if (m > 12 && d <= 12) {
      return `${mdy[3]}-${mdy[2].padStart(2, '0')}-${mdy[1].padStart(2, '0')}`
    }
  }
  // Try Excel serial number
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str)
    const utcDays = Math.floor(serial - 25569)
    const d = new Date(utcDays * 86400 * 1000)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  // Use as-is if it's a string like "Enero", "Semana 1", etc.
  return str
}

function findHeaderRow(json) {
  for (let i = 0; i < Math.min(json.length, 5); i++) {
    const row = json[i]
    if (!row || row.length < 2) continue
    const strCells = row.filter(c => c != null && typeof c === 'string' && c.trim().length > 0)
    const numCells = row.filter(c => typeof c === 'number')
    if (strCells.length >= 2 && strCells.length > numCells.length) {
      return i
    }
  }
  return 0
}

function detectNumericColumns(json, startRow) {
  const cols = {}
  const numFields = ['peso', 'grasa', 'pecho', 'cintura', 'cadera', 'brazo', 'pierna']

  for (let i = startRow; i < Math.min(json.length, startRow + 5); i++) {
    const row = json[i]
    if (!row) continue
    for (let j = 0; j < row.length; j++) {
      if (looksLikeNumber(row[j])) {
        if (!cols[j]) cols[j] = 0
        cols[j]++
      }
    }
  }

  const numericCols = Object.entries(cols)
    .filter(([, count]) => count >= 1)
    .map(([idx]) => parseInt(idx))
    .sort((a, b) => a - b)

  return numericCols
}

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

        if (json.length < 2) {
          reject(new Error('El archivo está vacío o no tiene datos suficientes'))
          return
        }

        const headerRowIdx = findHeaderRow(json)
        const headers = json[headerRowIdx] || []
        const dataStartRow = headerRowIdx + 1

        console.log('[ExcelParser] Sheet:', workbook.SheetNames[0])
        console.log('[ExcelParser] Header row:', headerRowIdx, '→', headers)
        console.log('[ExcelParser] Total rows:', json.length, '| Data starts at row:', dataStartRow)

        const columnMap = {}
        for (const [key, aliases] of Object.entries(COLUMN_MAPPINGS)) {
          columnMap[key] = findColumn(headers, aliases)
        }

        console.log('[ExcelParser] Column mapping:', JSON.stringify(columnMap))

        const hasDateCol = columnMap.fecha !== -1
        const hasPesoCol = columnMap.peso !== -1
        const hasAnyMeasurement = Object.entries(columnMap)
          .filter(([k]) => k !== 'fecha')
          .some(([, v]) => v !== -1)

        if (!hasAnyMeasurement) {
          const numericCols = detectNumericColumns(json, dataStartRow)
          console.log('[ExcelParser] No named columns matched. Numeric columns detected:', numericCols)

          if (numericCols.length > 0) {
            columnMap.peso = numericCols[0]
            if (numericCols.length > 1) columnMap.grasa = numericCols[1]
            if (numericCols.length > 2) columnMap.pecho = numericCols[2]
            if (numericCols.length > 3) columnMap.cintura = numericCols[3]
            if (numericCols.length > 4) columnMap.cadera = numericCols[4]
            if (numericCols.length > 5) columnMap.brazo = numericCols[5]
            if (numericCols.length > 6) columnMap.pierna = numericCols[6]
            console.log('[ExcelParser] Auto-assigned numeric columns:', JSON.stringify(columnMap))
          }
        }

        const measurements = []
        for (let i = dataStartRow; i < json.length; i++) {
          const row = json[i]
          if (!row || row.every(c => c == null || String(c).trim() === '')) continue

          let dateValue
          if (hasDateCol) {
            dateValue = parseDate(row[columnMap.fecha])
          }
          if (!dateValue) {
            const firstCell = row[0]
            if (firstCell != null && String(firstCell).trim() !== '') {
              dateValue = parseDate(firstCell)
            }
          }
          if (!dateValue) {
            dateValue = `row-${i + 1}`
          }

          const measurement = {
            date: dateValue,
            peso: columnMap.peso !== -1 ? toNumber(row[columnMap.peso]) : null,
            grasa: columnMap.grasa !== -1 ? toNumber(row[columnMap.grasa]) : null,
            pecho: columnMap.pecho !== -1 ? toNumber(row[columnMap.pecho]) : null,
            cintura: columnMap.cintura !== -1 ? toNumber(row[columnMap.cintura]) : null,
            cadera: columnMap.cadera !== -1 ? toNumber(row[columnMap.cadera]) : null,
            brazo: columnMap.brazo !== -1 ? toNumber(row[columnMap.brazo]) : null,
            pierna: columnMap.pierna !== -1 ? toNumber(row[columnMap.pierna]) : null,
          }

          const hasData = [measurement.peso, measurement.grasa, measurement.pecho, measurement.cintura, measurement.cadera, measurement.brazo, measurement.pierna].some(v => v != null)

          if (hasData) {
            measurements.push(measurement)
          }
        }

        console.log('[ExcelParser] Parsed', measurements.length, 'measurements')
        if (measurements.length > 0) {
          console.log('[ExcelParser] Sample:', JSON.stringify(measurements[0]))
        }

        resolve(measurements)
      } catch (err) {
        console.error('[ExcelParser] Error:', err)
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}
