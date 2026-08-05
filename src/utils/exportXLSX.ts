import * as XLSX from 'xlsx'
import { formatDate, formatDateTime } from './formatDate'

export type ColumnFormat = 'date' | 'datetime' | 'number' | 'boolean' | 'text'

export interface ColumnConfig {
  source: string
  header: string
  format?: ColumnFormat
  transform?: (value: any) => any
}

export interface TableExportConfig {
  tableName: string
  sheetName: string
  columns: ColumnConfig[]
}

export interface SheetConfig {
  sheetName: string
  columns: ColumnConfig[]
}

export interface MultiSheetExportConfig {
  tableName: string
  sheets: { data: any[]; config: SheetConfig }[]
}

// Columns to automatically exclude from all exports
// Matches the old CSV columnsToRemove plus the original XLSX exclusions
const EXCLUDED_COLUMNS = new Set([
  'id',
  'fazenda_id',
  'dispositivo_id',
  'nome_usuario',
  'sync_status',
  'version',
  'created_at',
  'updated_at',
  'deleted_at',
  'lote_id',
  'pasto_id',
  'espacamento_cocho_cm_cab',
  'espacamento_cocho_obs',
  'espacamento_cocho_detalhes',
  'checklist',
  'espacamento_cocho_ideal',
  'pasto_saida_id',
  'pasto_entrada_id',
  'parto_vinculo_id',
  'lote_origem_id',
  'lote_destino_id',
  'individuo_id',
  'individuo_id_mae',
  'individuo_id_cria',
  'maquina_veiculo_id',
  'qtd_bezerros',
])

function formatValue(value: any, format?: ColumnFormat): any {
  if (value === null || value === undefined) {
    return ''
  }

  switch (format) {
    case 'date':
      return formatDate(value)
    case 'datetime':
      return formatDateTime(value)
    case 'number':
      return typeof value === 'number' ? value : Number(value) || 0
    case 'boolean':
      return value === true ? 'Sim' : value === false ? 'Não' : value
    case 'text':
    default:
      return value
  }
}

// Auto-generate header from snake_case key, same as old CSV
function autoHeader(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Format data field the same way the old CSV did: dd/MM/yyyy HH:mm:ss
function formatDataField(value: any): string {
  if (!value) return ''
  const date = new Date(value)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

// Build the full column list: configured columns + any extra data columns not in config
// Config columns that don't exist in the data are skipped (avoids phantom empty columns)
function buildColumnList(data: any[], configColumns: ColumnConfig[]): {
  configCols: ColumnConfig[]
  extraKeys: string[]
} {
  const configSources = new Set(configColumns.map(c => c.source))

  // Collect all keys that actually exist in the data
  const dataKeys = new Set<string>()
  for (const row of data) {
    if (!row || typeof row !== 'object') continue
    for (const key of Object.keys(row)) {
      dataKeys.add(key)
    }
  }

  // Keep config columns that exist in data.
  // Config columns bypass EXCLUDED_COLUMNS so explicitly-configured fields
  // (e.g. checklist in Bebedouros) always pass through.
  const filteredConfigCols = configColumns.filter(
    col => dataKeys.has(col.source)
  )

  // Scan data for keys not in config and not excluded
  const extraKeys: string[] = []
  const seen = new Set<string>()
  for (const row of data) {
    if (!row || typeof row !== 'object') continue
    for (const key of Object.keys(row)) {
      if (EXCLUDED_COLUMNS.has(key) || configSources.has(key) || seen.has(key)) continue
      seen.add(key)
      extraKeys.push(key)
    }
  }

  return { configCols: filteredConfigCols, extraKeys }
}

export function exportToXLSX(data: any[], config: TableExportConfig): void {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  const { configCols, extraKeys } = buildColumnList(data, config.columns)

  // Transform data: configured columns first, then extra columns
  const transformedData = data.map(row => {
    const transformedRow: any = {}

    // Configured columns with their headers, transforms and formats
    configCols.forEach(col => {
      const value = row[col.source]
      transformedRow[col.header] = col.transform
        ? col.transform(value)
        : formatValue(value, col.format)
    })

    // Extra columns with auto-generated headers (same as old CSV)
    extraKeys.forEach(key => {
      const value = row[key]
      if (key === 'data') {
        transformedRow[autoHeader(key)] = formatDataField(value)
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        transformedRow[autoHeader(key)] = JSON.stringify(value)
      } else if (Array.isArray(value)) {
        transformedRow[autoHeader(key)] = value.join(', ')
      } else {
        transformedRow[autoHeader(key)] = value
      }
    })

    return transformedRow
  })

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(transformedData)

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, config.sheetName)

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10)
  const filename = `${config.tableName}_${timestamp}.xlsx`

  // Download file
  XLSX.writeFile(workbook, filename)
}

export function exportToXLSXMultiSheet(config: MultiSheetExportConfig): void {
  const workbook = XLSX.utils.book_new()
  const usedNames = new Set<string>()

  for (const sheet of config.sheets) {
    if (!sheet.data || sheet.data.length === 0) continue

    const { configCols, extraKeys } = buildColumnList(sheet.data, sheet.config.columns)

    const transformedData = sheet.data.map(row => {
      const transformedRow: any = {}

      configCols.forEach(col => {
        const value = row[col.source]
        transformedRow[col.header] = col.transform
          ? col.transform(value)
          : formatValue(value, col.format)
      })

      extraKeys.forEach(key => {
        const value = row[key]
        if (key === 'data') {
          transformedRow[autoHeader(key)] = formatDataField(value)
        } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          transformedRow[autoHeader(key)] = JSON.stringify(value)
        } else if (Array.isArray(value)) {
          transformedRow[autoHeader(key)] = value.join(', ')
        } else {
          transformedRow[autoHeader(key)] = value
        }
      })

      return transformedRow
    })

    const worksheet = XLSX.utils.json_to_sheet(transformedData)

    // Garante nome único de aba (Excel limita a 31 chars)
    let name = sheet.config.sheetName.slice(0, 31)
    let suffix = 1
    while (usedNames.has(name)) {
      const base = sheet.config.sheetName.slice(0, 28)
      name = `${base} (${suffix})`
      suffix++
    }
    usedNames.add(name)

    XLSX.utils.book_append_sheet(workbook, worksheet, name)
  }

  const timestamp = new Date().toISOString().slice(0, 10)
  const filename = `${config.tableName}_${timestamp}.xlsx`
  XLSX.writeFile(workbook, filename)
}
