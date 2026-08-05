const XLSX = require('xlsx')
const wb = XLSX.readFile('C:\\Users\\USER\\Downloads\\cadernetas_completo_2026-08-05.xlsx')
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

console.log('=== RESUMO DAS ABAS ===')
wb.SheetNames.forEach(n => {
  const ws = wb.Sheets[n]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
  console.log(n + ': ' + rows.length + ' linhas, ' + (rows[0] ? rows[0].length : 0) + ' colunas')
})

console.log('\n=== UUIDs CRUS ===')
let uuidCount = 0
wb.SheetNames.forEach(n => {
  const ws = wb.Sheets[n]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
  const headers = rows[0] || []
  let found = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    for (let j = 0; j < r.length; j++) {
      const v = String(r[j] || '')
      if (uuidPattern.test(v)) {
        found.push('  linha ' + (i + 1) + ' coluna "' + headers[j] + '"')
        uuidCount++
      }
    }
  }
  if (found.length > 0) {
    console.log(n + ':')
    found.forEach(f => console.log(f))
  }
})
if (uuidCount === 0) console.log('Nenhum UUID cru encontrado.')

console.log('\n=== [object Object] ===')
let objCount = 0
wb.SheetNames.forEach(n => {
  const ws = wb.Sheets[n]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
  const headers = rows[0] || []
  let found = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    for (let j = 0; j < r.length; j++) {
      const v = String(r[j] || '')
      if (v === '[object Object]') {
        found.push('  linha ' + (i + 1) + ' coluna "' + headers[j] + '"')
        objCount++
      }
    }
  }
  if (found.length > 0) {
    console.log(n + ':')
    found.forEach(f => console.log(f))
  }
})
if (objCount === 0) console.log('Nenhum [object Object] encontrado.')

console.log('\n=== JSON.stringify cru ===')
let jsonCount = 0
wb.SheetNames.forEach(n => {
  const ws = wb.Sheets[n]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
  const headers = rows[0] || []
  let found = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    for (let j = 0; j < r.length; j++) {
      const v = String(r[j] || '')
      if ((v.startsWith('{"') || v.startsWith('[{')) && v.length > 50) {
        found.push('  linha ' + (i + 1) + ' coluna "' + headers[j] + '": ' + v.substring(0, 70) + '...')
        jsonCount++
      }
    }
  }
  if (found.length > 0) {
    console.log(n + ':')
    found.forEach(f => console.log(f))
  }
})
if (jsonCount === 0) console.log('Nenhum JSON.stringify cru encontrado.')

console.log('\n=== HEADERS DE CADA ABA ===')
wb.SheetNames.forEach(n => {
  const ws = wb.Sheets[n]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
  console.log('--- ' + n + ' ---')
  console.log(rows[0] ? rows[0].join(' | ') : '(empty)')
})
