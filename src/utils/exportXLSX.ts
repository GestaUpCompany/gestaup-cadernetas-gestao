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
