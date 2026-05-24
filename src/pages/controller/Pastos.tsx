import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import * as XLSX from 'xlsx'

interface Pasto {
  id: string
  fazenda_id: string
  nome: string
  setor?: string
  tipo?: string
  metragem_cocho_m?: number
  nivel_degradacao?: number
  area_util_ha?: number
  especie?: string
  altura_entrada_cm?: number
  altura_saida_cm?: number
  ativo: boolean
}

export function Pastos() {
  const { user } = useAuth()
  const [pastos, setPastos] = useState<Pasto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPasto, setEditingPasto] = useState<Pasto | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    setor: '',
    tipo: '',
    metragem_cocho_m: '',
    nivel_degradacao: '',
    area_util_ha: '',
    especie: '',
    altura_entrada_cm: '',
    altura_saida_cm: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [pastoToDelete, setPastoToDelete] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadPastos()
  }, [user])

  const loadPastos = async () => {
    if (!user) return

    // Buscar fazenda vinculada
    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    const { data, error } = await supabase
      .from('pastos')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar pastos:', error)
    } else {
      setPastos(data as Pasto[])
    }

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    if (!user) {
      setSubmitting(false)
      return
    }

    // Buscar fazenda vinculada
    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) {
      setSubmitting(false)
      return
    }

    const fazendaId = vinculos[0].fazenda_id

    const data = {
      fazenda_id: fazendaId,
      nome: formData.nome,
      setor: formData.setor || null,
      tipo: formData.tipo || null,
      metragem_cocho_m: formData.metragem_cocho_m ? parseFloat(formData.metragem_cocho_m) : null,
      nivel_degradacao: formData.nivel_degradacao ? parseInt(formData.nivel_degradacao) : null,
      area_util_ha: formData.area_util_ha ? parseFloat(formData.area_util_ha) : null,
      especie: formData.especie || null,
      altura_entrada_cm: formData.altura_entrada_cm ? parseFloat(formData.altura_entrada_cm) : null,
      altura_saida_cm: formData.altura_saida_cm ? parseFloat(formData.altura_saida_cm) : null,
    }

    let error

    if (editingPasto) {
      // Atualizar pasto existente
      const { error: updateError } = await supabase
        .from('pastos')
        .update(data)
        .eq('id', editingPasto.id)
      error = updateError
    } else {
      // Criar novo pasto
      const { error: insertError } = await supabase.from('pastos').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar pasto:', error)
    } else {
      setFormData({
        nome: '',
        setor: '',
        tipo: '',
        metragem_cocho_m: '',
        nivel_degradacao: '',
        area_util_ha: '',
        especie: '',
        altura_entrada_cm: '',
        altura_saida_cm: '',
      })
      setShowForm(false)
      setEditingPasto(null)
      loadPastos()
    }

    setSubmitting(false)
  }

  const handleEdit = (pasto: Pasto) => {
    setEditingPasto(pasto)
    setFormData({
      nome: pasto.nome,
      setor: pasto.setor || '',
      tipo: pasto.tipo || '',
      metragem_cocho_m: pasto.metragem_cocho_m?.toString() || '',
      nivel_degradacao: pasto.nivel_degradacao?.toString() || '',
      area_util_ha: pasto.area_util_ha?.toString() || '',
      especie: pasto.especie || '',
      altura_entrada_cm: pasto.altura_entrada_cm?.toString() || '',
      altura_saida_cm: pasto.altura_saida_cm?.toString() || '',
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingPasto(null)
    setFormData({
      nome: '',
      setor: '',
      tipo: '',
      metragem_cocho_m: '',
      nivel_degradacao: '',
      area_util_ha: '',
      especie: '',
      altura_entrada_cm: '',
      altura_saida_cm: '',
    })
    setShowForm(false)
  }

  const handleDeleteClick = (id: string) => {
    setPastoToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!pastoToDelete) return

    const { error } = await supabase.from('pastos').delete().eq('id', pastoToDelete)

    if (error) {
      console.error('Erro ao excluir pasto:', error)
    } else {
      loadPastos()
    }

    setShowDeleteModal(false)
    setPastoToDelete(null)
  }

  const handleToggleActive = async (pasto: Pasto) => {
    const { error } = await supabase
      .from('pastos')
      .update({ ativo: !pasto.ativo })
      .eq('id', pasto.id)

    if (error) {
      console.error('Erro ao atualizar pasto:', error)
    } else {
      loadPastos()
    }
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return

    const file = e.target.files[0]
    setImporting(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      if (!user) {
        setImportError('Usuário não autenticado')
        setImporting(false)
        return
      }

      // Buscar fazenda vinculada
      const { data: vinculos } = await supabase
        .from('usuario_fazenda')
        .select('fazenda_id')
        .eq('usuario_id', user.id)
        .eq('ativo', true)

      if (!vinculos || vinculos.length === 0) {
        setImportError('Nenhuma fazenda vinculada ao usuário')
        setImporting(false)
        return
      }

      const fazendaId = vinculos[0].fazenda_id

      // Buscar pastos existentes para verificar duplicatas
      const { data: existingPastos } = await supabase
        .from('pastos')
        .select('nome')
        .eq('fazenda_id', fazendaId)

      const existingNames = new Set(existingPastos?.map(p => p.nome.toLowerCase()) || [])

      // Ler arquivo Excel
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      if (jsonData.length < 2) {
        setImportError('Arquivo vazio ou sem dados')
        setImporting(false)
        return
      }

      // Mapear colunas (linha 0 são os cabeçalhos)
      const headers = jsonData[0].map((h: any) => h?.toString().trim())
      const rows = jsonData.slice(1)

      console.log('Headers encontrados:', headers)

      // Validar colunas obrigatórias (case-insensitive)
      const requiredColumns = ['Nome', 'Especie', 'Area Util (ha)', 'Altura Entrada (cm)', 'Altura Saida (cm)', 'Tipo', 'Metragem Cocho (m)']
      const headersLower = headers.map(h => h.toLowerCase())
      const missingColumns = requiredColumns.filter(col => !headersLower.includes(col.toLowerCase()))

      if (missingColumns.length > 0) {
        setImportError(`Colunas obrigatórias faltando: ${missingColumns.join(', ')}`)
        setImporting(false)
        return
      }

      // Mapear índices das colunas (case-insensitive)
      const colIndices: { [key: string]: number } = {}
      headers.forEach((header, index) => {
        colIndices[header.toLowerCase()] = index
      })

      console.log('Índices das colunas:', colIndices)

      // Validar e processar dados
      const pastosToInsert: any[] = []
      const duplicates: { row: number; name: string }[] = []
      const invalidRows: { row: number; name: string; missingFields: string[] }[] = []
      let totalRowsProcessed = 0

      rows.forEach((row, rowIndex) => {
        const rowNum = rowIndex + 2 // Excel row number (1-indexed + header)

        console.log(`Linha ${rowNum}:`, row)

        // Skip empty rows (only check first 9 columns - the actual data columns)
        const dataColumns = row.slice(0, 9)
        if (!row || row.length === 0 || dataColumns.every(cell => cell === undefined || cell === null || cell === '')) {
          console.log(`Linha ${rowNum}: pulando linha vazia`)
          return
        }

        totalRowsProcessed++

        try {
          const nome = row[colIndices['nome']]?.toString().trim()
          const especie = row[colIndices['especie']]?.toString().trim()
          const areaUtil = parseFloat(row[colIndices['area util (ha)']])
          const alturaEntrada = parseFloat(row[colIndices['altura entrada (cm)']])
          const alturaSaida = parseFloat(row[colIndices['altura saida (cm)']])
          const tipo = row[colIndices['tipo']]?.toString().trim()
          const setor = colIndices['setor'] !== undefined ? row[colIndices['setor']]?.toString().trim() || null : null
          const metragemCocho = colIndices['metragem cocho (m)'] !== undefined ? row[colIndices['metragem cocho (m)']] ? parseFloat(row[colIndices['metragem cocho (m)']]) : null : null
          const nivelDegradacao = colIndices['nivel degradacao'] !== undefined ? row[colIndices['nivel degradacao']] ? parseInt(row[colIndices['nivel degradacao']]) : null : null

          // Verificar duplicata de nome
          if (nome && existingNames.has(nome.toLowerCase())) {
            duplicates.push({ row: rowNum, name: nome })
            console.log(`Linha ${rowNum}: pulando nome duplicado - ${nome}`)
            return
          }

          // Validações - coletar campos faltantes
          const missingFields: string[] = []
          if (!nome) missingFields.push('Nome')
          if (!especie) missingFields.push('Especie')
          if (isNaN(areaUtil) || areaUtil <= 0) missingFields.push('Area Util (ha) - deve ser número positivo')
          if (isNaN(alturaEntrada) || alturaEntrada <= 0) missingFields.push('Altura Entrada (cm) - deve ser número positivo')
          if (isNaN(alturaSaida) || alturaSaida <= 0) missingFields.push('Altura Saida (cm) - deve ser número positivo')
          if (!tipo) missingFields.push('Tipo')
          if (metragemCocho === null || metragemCocho === undefined || isNaN(metragemCocho) || metragemCocho <= 0) missingFields.push('Metragem Cocho (m) - deve ser número positivo')

          const tiposValidos = ['Cria', 'Confinamento', 'Engorda', 'Enfermaria', 'Recria', 'RIP', 'TIP', 'Volumosos']
          if (tipo && !tiposValidos.includes(tipo)) {
            missingFields.push(`Tipo - deve ser um dos seguintes: ${tiposValidos.join(', ')}`)
          }

          if (nivelDegradacao !== null && (isNaN(nivelDegradacao) || nivelDegradacao < 1 || nivelDegradacao > 5)) {
            missingFields.push('Nivel Degradacao - deve ser entre 1 e 5')
          }

          // Se houver erros de validação, adicionar a invalidRows e continuar
          if (missingFields.length > 0) {
            invalidRows.push({ row: rowNum, name: nome || '(sem nome)', missingFields })
            console.log(`Linha ${rowNum}: linha inválida - ${missingFields.join(', ')}`)
            return
          }

          // Se passou todas as validações, adicionar para inserção
          pastosToInsert.push({
            fazenda_id: fazendaId,
            nome,
            setor,
            tipo,
            metragem_cocho_m: metragemCocho,
            nivel_degradacao: nivelDegradacao,
            area_util_ha: areaUtil,
            especie,
            altura_entrada_cm: alturaEntrada,
            altura_saida_cm: alturaSaida,
            ativo: true,
          })
        } catch (err) {
          invalidRows.push({ row: rowNum, name: '(erro ao processar)', missingFields: ['Erro ao processar dados'] })
        }
      })

      if (pastosToInsert.length === 0) {
        setImportError('Nenhum dado válido para importar')
        setImporting(false)
        return
      }

      // Inserir no banco de dados
      const { error: insertError } = await supabase.from('pastos').insert(pastosToInsert)

      if (insertError) {
        setImportError(`Erro ao inserir dados: ${insertError.message}`)
        setImporting(false)
        return
      }

      let successMessage = ''
      const totalSkipped = duplicates.length + invalidRows.length

      if (totalSkipped > 0) {
        successMessage = `${pastosToInsert.length} de ${totalRowsProcessed} pastos importados com sucesso!`
      } else {
        successMessage = `${pastosToInsert.length} pastos importados com sucesso!`
      }

      if (duplicates.length > 0) {
        successMessage += `\n\n${duplicates.length} linhas puladas porque já existem:\n${duplicates.map(d => `- Linha ${d.row}: "${d.name}"`).join('\n')}`
      }

      if (invalidRows.length > 0) {
        successMessage += `\n\n${invalidRows.length} linhas com erros de validação:\n${invalidRows.map(i => `- Linha ${i.row}: "${i.name}" - Campos inválidos: ${i.missingFields.join(', ')}`).join('\n')}`
        successMessage += '\n\nVolte à planilha, localize os pastos com dados irregulares/faltantes, realize as correções indicadas acima e faça upload do arquivo novamente.'
      }

      setImportSuccess(successMessage)
      loadPastos()

      // Limpar input
      e.target.value = ''
    } catch (error) {
      setImportError(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    window.location.href = '/Modelo Pastos - Gesta\'Up.xlsx'
  }

  const shortcuts = [
    {
      key: 'f',
      ctrl: true,
      description: 'Buscar pastos',
      action: () => {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
        searchInput?.focus()
      },
    },
  ]

  useKeyboardShortcuts(shortcuts)

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      {!showForm && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Pastos</h2>
          <div className="flex flex-col sm:flex-row gap-2 items-start w-full md:w-auto">
            <Input
              type="text"
              placeholder="Buscar pasto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-xs border-gray-200 focus:border-accent h-10 text-sm"
            />
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button onClick={() => setShowForm(true)} className="h-10 text-sm flex-1 sm:flex-none">Novo Pasto</Button>
              <Button onClick={downloadTemplate} variant="secondary" className="h-10 text-sm flex-1 sm:flex-none">Baixar Modelo</Button>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                disabled={importing}
                className="hidden"
                id="import-excel"
              />
              <Button
                onClick={() => document.getElementById('import-excel')?.click()}
                variant="secondary"
                className="h-10 text-sm flex-1 sm:flex-none"
                disabled={importing}
              >
                {importing ? 'Importando...' : 'Importar Excel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Messages */}
      {importError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg">
          <p className="font-medium text-sm sm:text-base">Erro na importação:</p>
          <pre className="text-xs sm:text-sm mt-1 whitespace-pre-wrap">{importError}</pre>
        </div>
      )}

      {importSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg">
          <p className="font-medium text-sm sm:text-base whitespace-pre-line">{importSuccess}</p>
        </div>
      )}

      {showForm && (
        <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
            {editingPasto ? 'Editar Pasto' : 'Novo Pasto'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  placeholder="Nome do pasto"
                  className="border-gray-200 focus:border-accent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Setor
                </label>
                <Input
                  type="text"
                  value={formData.setor}
                  onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                  placeholder="Setor"
                  className="border-gray-200 focus:border-accent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] rounded-lg border-2 border-gray-200 focus:border-accent bg-white text-gray-700 transition-all text-sm"
                >
                  <option value="">Selecione...</option>
                  <option value="Cria">Cria</option>
                  <option value="Confinamento">Confinamento</option>
                  <option value="Engorda">Engorda</option>
                  <option value="Enfermaria">Enfermaria</option>
                  <option value="Recria">Recria</option>
                  <option value="RIP">RIP</option>
                  <option value="TIP">TIP</option>
                  <option value="Volumosos">Volumosos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Metragem Cocho (m)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.metragem_cocho_m}
                  onChange={(e) => setFormData({ ...formData, metragem_cocho_m: e.target.value })}
                  placeholder="0"
                  className="border-gray-200 focus:border-accent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Nível Degradação
                </label>
                <select
                  value={formData.nivel_degradacao}
                  onChange={(e) => setFormData({ ...formData, nivel_degradacao: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] rounded-lg border-2 border-gray-200 focus:border-accent bg-white text-gray-700 transition-all text-sm"
                >
                  <option value="">Selecione...</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Área Útil (ha) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.area_util_ha}
                onChange={(e) => setFormData({ ...formData, area_util_ha: e.target.value })}
                required
                placeholder="Ex: 50.5"
                className="border-gray-200 focus:border-accent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Espécie <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.especie}
                onChange={(e) => setFormData({ ...formData, especie: e.target.value })}
                required
                placeholder="Ex: Brachiaria"
                className="border-gray-200 focus:border-accent text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-end">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Altura Entrada (cm) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.altura_entrada_cm}
                  onChange={(e) => setFormData({ ...formData, altura_entrada_cm: e.target.value })}
                  required
                  placeholder="Ex: 15.0"
                  className="border-gray-200 focus:border-accent text-sm"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Altura Saída (cm) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.altura_saida_cm}
                  onChange={(e) => setFormData({ ...formData, altura_saida_cm: e.target.value })}
                  required
                  placeholder="Ex: 5.0"
                  className="border-gray-200 focus:border-accent text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <Button type="submit" disabled={submitting} className="flex-1 sm:flex-none text-sm">
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="secondary" onClick={handleCancel} className="flex-1 sm:flex-none text-sm">
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!showForm && pastos.length === 0 ? (
        <Card className="bg-white p-8 sm:p-12 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4 text-sm sm:text-base">Nenhum pasto cadastrado</p>
          <Button onClick={() => setShowForm(true)} className="text-sm">Criar Primeiro Pasto</Button>
        </Card>
      ) : !showForm ? (
        <>
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {pastos
              .filter((pasto) =>
                pasto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (pasto.especie && pasto.especie.toLowerCase().includes(searchTerm.toLowerCase()))
              )
              .map((pasto) => (
                <Card
                  key={pasto.id}
                  className="p-4"
                  onClick={() => handleEdit(pasto)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">{pasto.nome}</h3>
                      {pasto.area_util_ha && (
                        <p className="text-xs sm:text-sm text-gray-500">Área: {pasto.area_util_ha} ha</p>
                      )}
                    </div>
                    <span
                      className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ${
                        pasto.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {pasto.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs sm:text-sm">
                    {pasto.setor && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Setor:</span>
                        <span className="text-gray-800 font-medium">{pasto.setor}</span>
                      </div>
                    )}
                    {pasto.tipo && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tipo:</span>
                        <span className="text-gray-800 font-medium">{pasto.tipo}</span>
                      </div>
                    )}
                    {pasto.especie && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Espécie:</span>
                        <span className="text-gray-800 font-medium">{pasto.especie}</span>
                      </div>
                    )}
                    {pasto.metragem_cocho_m && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Metragem Cocho:</span>
                        <span className="text-gray-800 font-medium">{pasto.metragem_cocho_m} m</span>
                      </div>
                    )}
                    {pasto.nivel_degradacao && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nível Degradação:</span>
                        <span className="text-gray-800 font-medium">{pasto.nivel_degradacao}</span>
                      </div>
                    )}
                    {(pasto.altura_entrada_cm || pasto.altura_saida_cm) && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Alturas:</span>
                        <span className="text-gray-800 font-medium">
                          {pasto.altura_entrada_cm && `Entrada: ${pasto.altura_entrada_cm} cm`}
                          {pasto.altura_entrada_cm && pasto.altura_saida_cm && ' | '}
                          {pasto.altura_saida_cm && `Saída: ${pasto.altura_saida_cm} cm`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="secondary"
                      className="flex-1 text-xs sm:text-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleActive(pasto)
                      }}
                    >
                      {pasto.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 text-xs sm:text-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(pasto)
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 text-xs sm:text-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClick(pasto.id)
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </Card>
              ))}
          </div>

          {/* Desktop Table View */}
          <Card className="bg-white overflow-x-auto hidden sm:block" disableHover>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Setor</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área (ha)</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Espécie</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metragem Cocho (m)</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nível Degradação</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pastos
                  .filter((pasto) =>
                    pasto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (pasto.especie && pasto.especie.toLowerCase().includes(searchTerm.toLowerCase()))
                  )
                  .map((pasto) => (
                    <tr key={pasto.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{pasto.nome}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">{pasto.setor || '-'}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">{pasto.tipo || '-'}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">{pasto.area_util_ha || '-'}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">{pasto.especie || '-'}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">{pasto.metragem_cocho_m || '-'}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">{pasto.nivel_degradacao || '-'}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                        <span
                          className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                            pasto.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {pasto.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            className="text-xs sm:text-sm"
                            onClick={() => handleToggleActive(pasto)}
                          >
                            {pasto.ativo ? 'Desativar' : 'Ativar'}
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-xs sm:text-sm"
                            onClick={() => handleEdit(pasto)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-xs sm:text-sm"
                            onClick={() => handleDeleteClick(pasto.id)}
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        </>
      ) : null}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Pasto"
        message="Tem certeza que deseja excluir este pasto? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
