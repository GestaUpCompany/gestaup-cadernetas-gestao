export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    alert('Nenhum dado para exportar')
    return
  }

  // Obter headers das chaves do primeiro objeto
  const headers = Object.keys(data[0])

  // Converter dados para formato CSV
  const csvRows = []
  
  // Adicionar headers
  csvRows.push(headers.join(','))

  // Adicionar linhas de dados
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]
      // Tratar valores null/undefined
      if (value === null || value === undefined) return ''
      // Tratar datas
      if (value instanceof Date) return value.toLocaleDateString('pt-BR')
      // Converter para string e escapar vírgulas
      const stringValue = String(value)
      return stringValue.includes(',') ? `"${stringValue}"` : stringValue
    })
    csvRows.push(values.join(','))
  }

  // Criar blob e download
  const csvString = csvRows.join('\n')
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
