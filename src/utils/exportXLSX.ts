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
  'lote_id'
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

export function exportToXLSX(data: any[], config: TableExportConfig): void {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Filter out excluded columns and apply column config
  const filteredColumns = config.columns.filter(
    col => !EXCLUDED_COLUMNS.has(col.source)
  )

  // Transform data according to column config
  const transformedData = data.map(row => {
    const transformedRow: any = {}
    filteredColumns.forEach(col => {
      const value = row[col.source]
      transformedRow[col.header] = col.transform
        ? col.transform(value)
        : formatValue(value, col.format)
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

    const filteredColumns = sheet.config.columns.filter(
      col => !EXCLUDED_COLUMNS.has(col.source)
    )

    const transformedData = sheet.data.map(row => {
      const transformedRow: any = {}
      filteredColumns.forEach(col => {
        const value = row[col.source]
        transformedRow[col.header] = col.transform
          ? col.transform(value)
          : formatValue(value, col.format)
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
