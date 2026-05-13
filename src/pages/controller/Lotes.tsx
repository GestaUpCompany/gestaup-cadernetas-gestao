import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface Lote {
  id: string
  fazenda_id: string
  nome: string
  n_cabecas?: number
  categorias?: string[]
  peso_vivo_kg?: number
  qtd_bezerros?: number
  ativo: boolean
}

export function Lotes() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLote, setEditingLote] = useState<Lote | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    numero_cabecas: '',
    categorias: [] as string[],
    categoria_outros: '',
    peso_vivo_kg: '',
    peso_vivo_meta_kg: '',
    data_meta: '',
    quantidade_bezerros: '',
    quant_inicial: '',
    data: '',
    peso_entrada: '',
    gmd: '',
    periodo: '',
    morte: '',
    consumo: '',
    abate: '',
    transf_entrada: '',
    transf_saida: '',
    quant_atual: '',
    ativo: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [loteToDelete, setLoteToDelete] = useState<string | null>(null)
  const [originalAtivo, setOriginalAtivo] = useState(true)

  const categoriasOpcoes = [
    'vaca',
    'touro',
    'boi gordo',
    'boi magro',
    'garrote',
    'bezerro',
    'novilha',
    'tropa',
  ]

  const handleCategoriaToggle = (categoria: string) => {
    if (formData.categorias.includes(categoria)) {
      setFormData({
        ...formData,
        categorias: formData.categorias.filter((c) => c !== categoria),
      })
    } else {
      setFormData({
        ...formData,
        categorias: [...formData.categorias, categoria],
      })
    }
  }

  useEffect(() => {
    loadLotes()
  }, [user])

  // Calcular período automaticamente quando a data de pesagem mudar
  useEffect(() => {
    if (formData.data) {
      const dataPesagem = new Date(formData.data)
      const dataAtual = new Date()
      const diffTime = Math.abs(dataAtual.getTime() - dataPesagem.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      setFormData({ ...formData, periodo: diffDays.toString() })
    } else {
      setFormData({ ...formData, periodo: '' })
    }
  }, [formData.data])

  // Calcular data meta automaticamente quando peso_vivo_meta_kg, peso_vivo_kg ou gmd mudarem
  useEffect(() => {
    const pesoMeta = parseFloat(formData.peso_vivo_meta_kg)
    const pesoAtual = parseFloat(formData.peso_vivo_kg)
    const gmd = parseFloat(formData.gmd)

    if (pesoMeta && pesoAtual && gmd && gmd > 0) {
      const diasParaMeta = (pesoMeta - pesoAtual) / gmd
      const dataHoje = new Date()
      const dataMeta = new Date(dataHoje.getTime() + (diasParaMeta * 24 * 60 * 60 * 1000))
      
      // Formatar data como yyyy-mm-dd
      const year = dataMeta.getFullYear()
      const month = String(dataMeta.getMonth() + 1).padStart(2, '0')
      const day = String(dataMeta.getDate()).padStart(2, '0')
      const dataMetaFormatada = `${year}-${month}-${day}`
      
      setFormData({ ...formData, data_meta: dataMetaFormatada })
    } else {
      setFormData({ ...formData, data_meta: '' })
    }
  }, [formData.peso_vivo_meta_kg, formData.peso_vivo_kg, formData.gmd])

  const loadLotes = async () => {
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
      .from('lotes')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao buscar lotes:', error)
    } else {
      setLotes(data as Lote[])
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

    // Montar array de categorias
    const categoriasFinal = [...formData.categorias]
    if (formData.categoria_outros && formData.categoria_outros.trim()) {
      categoriasFinal.push(formData.categoria_outros.trim())
    }

    // Validar categorias
    if (categoriasFinal.length === 0) {
      alert('Selecione pelo menos uma categoria')
      setSubmitting(false)
      return
    }

    const data = {
      fazenda_id: fazendaId,
      nome: formData.nome,
      n_cabecas: formData.numero_cabecas ? parseInt(formData.numero_cabecas) : null,
      categorias: categoriasFinal.length > 0 ? categoriasFinal : null,
      peso_vivo_kg: formData.peso_vivo_kg ? parseFloat(formData.peso_vivo_kg) : null,
      qtd_bezerros: formData.quantidade_bezerros ? parseInt(formData.quantidade_bezerros) : null,
      ativo: formData.ativo,
    }

    let error

    if (editingLote) {
      // Atualizar lote existente
      const { error: updateError } = await supabase
        .from('lotes')
        .update(data)
        .eq('id', editingLote.id)
      error = updateError
    } else {
      // Criar novo lote
      const { error: insertError } = await supabase.from('lotes').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar lote:', error)
    } else {
      setFormData({
        nome: '',
        numero_cabecas: '',
        categorias: [],
        categoria_outros: '',
        peso_vivo_kg: '',
        peso_vivo_meta_kg: '',
        data_meta: '',
        quantidade_bezerros: '',
        quant_inicial: '',
        data: '',
        peso_entrada: '',
        gmd: '',
        periodo: '',
        morte: '',
        consumo: '',
        abate: '',
        transf_entrada: '',
        transf_saida: '',
        quant_atual: '',
        ativo: true,
      })
      setShowForm(false)
      setEditingLote(null)
      setOriginalAtivo(true)
      loadLotes()
      // Invalidar cache do Dashboard para atualizar KPIs
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['fazenda', user.id] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats', user.id] })
        queryClient.invalidateQueries({ queryKey: ['gado-stats', user.id] })
        queryClient.invalidateQueries({ queryKey: ['recent-activities', user.id] })
      }
    }

    setSubmitting(false)
  }

  const handleEdit = (lote: Lote) => {
    setEditingLote(lote)
    
    // Tratar categorias - podem vir como string JSON ou array
    let cats: string[] = []
    if (Array.isArray(lote.categorias)) {
      cats = lote.categorias
    } else if (typeof lote.categorias === 'string') {
      try {
        const parsed = JSON.parse(lote.categorias)
        cats = Array.isArray(parsed) ? parsed : []
      } catch (e) {
        cats = []
      }
    }

    setFormData({
      nome: lote.nome,
      numero_cabecas: lote.n_cabecas?.toString() || '',
      categorias: cats,
      categoria_outros: '',
      peso_vivo_kg: lote.peso_vivo_kg?.toString() || '',
      peso_vivo_meta_kg: '',
      data_meta: '',
      quantidade_bezerros: lote.qtd_bezerros?.toString() || '',
      quant_inicial: '',
      data: '',
      peso_entrada: '',
      gmd: '',
      periodo: '',
      morte: '',
      consumo: '',
      abate: '',
      transf_entrada: '',
      transf_saida: '',
      quant_atual: '',
      ativo: lote.ativo ?? true,
    })
    setOriginalAtivo(lote.ativo ?? true)
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingLote(null)
    setFormData({
      nome: '',
      numero_cabecas: '',
      categorias: [],
      categoria_outros: '',
      peso_vivo_kg: '',
      peso_vivo_meta_kg: '',
      data_meta: '',
      quantidade_bezerros: '',
      quant_inicial: '',
      data: '',
      peso_entrada: '',
      gmd: '',
      periodo: '',
      morte: '',
      consumo: '',
      abate: '',
      transf_entrada: '',
      transf_saida: '',
      quant_atual: '',
      ativo: true,
    })
    setOriginalAtivo(true)
    setShowForm(false)
  }

  const handleDeleteClick = (id: string) => {
    setLoteToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!loteToDelete) return

    const { error } = await supabase.from('lotes').delete().eq('id', loteToDelete)

    if (error) {
      console.error('Erro ao excluir lote:', error)
    } else {
      loadLotes()
    }

    setShowDeleteModal(false)
    setLoteToDelete(null)
  }

  const handleToggleActive = async (lote: Lote) => {
    const { error } = await supabase
      .from('lotes')
      .update({ ativo: !lote.ativo })
      .eq('id', lote.id)

    if (error) {
      console.error('Erro ao atualizar lote:', error)
    } else {
      loadLotes()
    }
  }

  const shortcuts = [
    {
      key: 'f',
      ctrl: true,
      description: 'Buscar lotes',
      action: () => {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
        searchInput?.focus()
      },
    },
  ]

  useKeyboardShortcuts(shortcuts)

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!showForm && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Lotes</h2>
          <div className="flex gap-2 items-start">
            <Input
              type="text"
              placeholder="Buscar lote..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs border-gray-200 focus:border-accent h-10"
            />
            <Button onClick={() => setShowForm(true)} className="h-10">Novo Lote</Button>
          </div>
        </div>
      )}

      {showForm && (
        <Card className="bg-white p-6 border-0 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {editingLote ? 'Editar Lote' : 'Novo Lote'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-6 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  placeholder="Nome do lote"
                  className="border-gray-200 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quant. Inicial
                </label>
                <Input
                  type="number"
                  value={formData.quant_inicial}
                  onChange={(e) => setFormData({ ...formData, quant_inicial: e.target.value })}
                  disabled
                  placeholder="0"
                  className="border-gray-200 focus:border-accent opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Pesagem
                </label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  disabled
                  className="border-gray-200 focus:border-accent opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Peso Entrada (kg)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.peso_entrada}
                  onChange={(e) => setFormData({ ...formData, peso_entrada: e.target.value })}
                  placeholder="0"
                  disabled
                  className="border-gray-200 focus:border-accent opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GMD (kg/cab/dia)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.gmd}
                  onChange={(e) => setFormData({ ...formData, gmd: e.target.value })}
                  placeholder="0"
                  disabled
                  className="border-gray-200 focus:border-accent opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Período (dias)
                </label>
                <Input
                  type="number"
                  value={formData.periodo}
                  onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                  placeholder="0"
                  disabled
                  className="border-gray-200 focus:border-accent opacity-60"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quant. Atual (cab) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.numero_cabecas}
                  onChange={(e) => setFormData({ ...formData, numero_cabecas: e.target.value })}
                  required
                  placeholder="Ex: 100"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Peso Vivo Atual (kg)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.peso_vivo_kg}
                  onChange={(e) => setFormData({ ...formData, peso_vivo_kg: e.target.value })}
                  placeholder="Ex: 450.5"
                  disabled
                  className="border-gray-200 focus:border-accent opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Peso Vivo Meta (kg)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.peso_vivo_meta_kg}
                  onChange={(e) => setFormData({ ...formData, peso_vivo_meta_kg: e.target.value })}
                  placeholder="Ex: 500"
                  disabled
                  className="border-gray-200 focus:border-accent opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Meta
                </label>
                <Input
                  type="date"
                  value={formData.data_meta}
                  onChange={(e) => setFormData({ ...formData, data_meta: e.target.value })}
                  disabled
                  className="border-gray-200 focus:border-accent opacity-60"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Morte (cab)
                </label>
                <Input
                  type="number"
                  value={formData.morte}
                  onChange={(e) => setFormData({ ...formData, morte: e.target.value })}
                  placeholder="0"
                  disabled
                  className="border-gray-200 focus:border-accent opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consumo (cab)
                </label>
                <Input
                  type="number"
                  value={formData.consumo}
                  onChange={(e) => setFormData({ ...formData, consumo: e.target.value })}
                  placeholder="0"
                  disabled
                  className="border-gray-200 focus:border-accent opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Abate (cab)
                </label>
                <Input
                  type="number"
                  value={formData.abate}
                  onChange={(e) => setFormData({ ...formData, abate: e.target.value })}
                  placeholder="0"
                  disabled
                  className="border-gray-200 focus:border-accent opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transf. Entrada (cab)
                </label>
                <Input
                  type="number"
                  value={formData.transf_entrada}
                  onChange={(e) => setFormData({ ...formData, transf_entrada: e.target.value })}
                  placeholder="0"
                  disabled
                  className="border-gray-200 focus:border-accent opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transf. Saída (cab)
                </label>
                <Input
                  type="number"
                  value={formData.transf_saida}
                  onChange={(e) => setFormData({ ...formData, transf_saida: e.target.value })}
                  placeholder="0"
                  disabled
                  className="border-gray-200 focus:border-accent opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categorias <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {categoriasOpcoes.map((categoria) => {
                  const isSelected = formData.categorias.includes(categoria)
                  return (
                    <button
                      key={categoria}
                      type="button"
                      onClick={() => handleCategoriaToggle(categoria)}
                      className={`px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-primary text-white border-primary hover:bg-primary/90'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <span className="capitalize">{categoria}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="w-1/4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outra Categoria
              </label>
              <Input
                type="text"
                value={formData.categoria_outros}
                onChange={(e) => setFormData({ ...formData, categoria_outros: e.target.value })}
                placeholder="Digite outra categoria (opcional)"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div className="w-1/4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade de Bezerros
              </label>
              <Input
                type="number"
                value={formData.quantidade_bezerros}
                onChange={(e) => setFormData({ ...formData, quantidade_bezerros: e.target.value })}
                placeholder="Ex: 25"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div className="flex gap-2 items-center">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="secondary" onClick={handleCancel}>
                Cancelar
              </Button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ativo: !formData.ativo })}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    formData.ativo
                      ? 'bg-green-100 text-green-800 border-2 border-green-300 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 border-2 border-red-300 hover:bg-red-200'
                  }`}
                >
                  {formData.ativo ? '✓ Ativo' : '✗ Inativo'}
                </button>
                {formData.ativo !== originalAtivo && (
                  <span className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                    ⚠️ Salve para aplicar
                  </span>
                )}
              </div>
            </div>
          </form>
        </Card>
      )}

      {!showForm && lotes.length === 0 ? (
        <Card className="bg-white p-12 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4">Nenhum lote cadastrado</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeiro Lote</Button>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lotes
            .filter((lote) =>
              lote.nome.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((lote) => (
            <Card 
              key={lote.id} 
              className="bg-white p-6 border-0 shadow-sm cursor-pointer  transition-all"
              onClick={() => handleEdit(lote)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{lote.nome}</h3>
                  {lote.n_cabecas && (
                    <p className="text-sm text-gray-500">
                      {lote.n_cabecas} cabeças
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    lote.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {lote.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {lote.peso_vivo_kg && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Peso Vivo:</span> {lote.peso_vivo_kg} kg
                  </p>
                )}

                {lote.categorias && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Categorias:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(() => {
                        let cats: string[] = []
                        if (Array.isArray(lote.categorias)) {
                          cats = lote.categorias
                        } else if (typeof lote.categorias === 'string') {
                          try {
                            const parsed = JSON.parse(lote.categorias)
                            cats = Array.isArray(parsed) ? parsed : []
                          } catch (e) {
                            cats = []
                          }
                        }
                        return cats.map((cat: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 rounded text-xs capitalize"
                          >
                            {cat}
                          </span>
                        ))
                      })()}
                    </div>
                  </div>
                )}

                {lote.qtd_bezerros && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Bezerros:</span> {lote.qtd_bezerros}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1 text-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleActive(lote)
                  }}
                >
                  {lote.ativo ? 'Desativar' : 'Ativar'}
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(lote)
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteClick(lote.id)
                  }}
                >
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Lote"
        message="Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
