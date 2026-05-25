import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal, CardItem } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface Lote {
  id: string
  fazenda_id: string
  nome: string
  n_cabecas?: number
  categorias?: string[]
  peso_vivo_kg?: number
  peso_vivo_meta_kg?: number
  data_meta?: string
  qtd_bezerros?: number
  quant_inicial?: number
  data_pesagem?: string
  peso_entrada?: number
  gmd?: number
  periodo?: number
  ativo: boolean
  pasto_id?: string
  sistema_producao?: string
  rc_inicial?: number
  preco_animal_kg?: number
  preco_animal_cab?: number
  raca?: string
  sexo?: string
  idade?: number
  custo_operacional?: number
  estrategia_nutricional?: string
  dias_restantes_meta?: number
  produtor_rural?: string
  propriedade_origem?: string
  numero_contrato?: string
  mes_competencia?: string
  data_liberacao_sisbov?: string
  periodo_liberacao_sisbov?: number
  data_embarque_prevista?: string
}

export function Lotes() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLote, setEditingLote] = useState<Lote | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pastos, setPastos] = useState<{id: string, nome: string}[]>([])
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
    pasto_id: '',
    sistema_producao: '',
    rc_inicial: '',
    preco_animal_kg: '',
    preco_animal_cab: '',
    raca: '',
    sexo: '',
    idade: '',
    custo_operacional: '',
    estrategia_nutricional: '',
    dias_restantes_meta: '',
    produtor_rural: '',
    propriedade_origem: '',
    numero_contrato: '',
    mes_competencia: '',
    data_liberacao_sisbov: '',
    periodo_liberacao_sisbov: '',
    data_embarque_prevista: '',
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

  useEffect(() => {
    const loadPastos = async () => {
      if (!user) return
      const { data: vinculos } = await supabase
        .from('usuario_fazenda')
        .select('fazenda_id')
        .eq('usuario_id', user.id)
        .eq('ativo', true)

      if (!vinculos || vinculos.length === 0) return

      const fazendaId = vinculos[0].fazenda_id

      const { data: pastosData } = await supabase
        .from('pastos')
        .select('id, nome')
        .eq('fazenda_id', fazendaId)
        .eq('ativo', true)

      if (pastosData) {
        setPastos(pastosData)
      }
    }

    loadPastos()
  }, [user])

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
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      setFormData({ ...formData, periodo: diffDays.toString() })
    } else {
      setFormData({ ...formData, periodo: '' })
    }
  }, [formData.data])

  useEffect(() => {
    if (formData.data_meta) {
      const dataMeta = new Date(formData.data_meta)
      const dataAtual = new Date()
      const diffTime = Math.abs(dataMeta.getTime() - dataAtual.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      setFormData({ ...formData, dias_restantes_meta: diffDays.toString() })
    } else {
      setFormData({ ...formData, dias_restantes_meta: '' })
    }
  }, [formData.data_meta])

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

  // Calcular peso_vivo_kg automaticamente quando peso_entrada, gmd e periodo estiverem presentes
  useEffect(() => {
    const pesoEntrada = parseFloat(formData.peso_entrada)
    const gmd = parseFloat(formData.gmd)
    const periodo = parseFloat(formData.periodo)

    if (pesoEntrada && gmd && periodo) {
      const pesoVivoCalculado = pesoEntrada + (gmd * periodo)
      setFormData({ ...formData, peso_vivo_kg: pesoVivoCalculado.toFixed(1) })
    }
  }, [formData.peso_entrada, formData.gmd, formData.periodo])

  // Calcular numero_cabecas automaticamente quando quant_inicial, morte, consumo, abate, transf_saida, transf_entrada estiverem presentes
  useEffect(() => {
    const quantInicial = parseInt(formData.quant_inicial)
    const morte = parseInt(formData.morte) || 0
    const consumo = parseInt(formData.consumo) || 0
    const abate = parseInt(formData.abate) || 0
    const transfSaida = parseInt(formData.transf_saida) || 0
    const transfEntrada = parseInt(formData.transf_entrada) || 0

    if (quantInicial) {
      const quantAtual = quantInicial - morte - consumo - abate - transfSaida + transfEntrada
      setFormData({ ...formData, numero_cabecas: quantAtual.toString() })
    }
  }, [formData.quant_inicial, formData.morte, formData.consumo, formData.abate, formData.transf_saida, formData.transf_entrada])

  // Calcular dias_restantes_meta automaticamente: (data_meta - data_pesagem) - periodo
  useEffect(() => {
    if (formData.data_meta && formData.data && formData.periodo) {
      const dataMeta = new Date(formData.data_meta)
      const dataPesagem = new Date(formData.data)
      const periodo = parseFloat(formData.periodo)

      // Calculate difference in days
      const diffTime = dataMeta.getTime() - dataPesagem.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // Calculate dias restantes
      const diasRestantes = diffDays - periodo

      setFormData({ ...formData, dias_restantes_meta: diasRestantes.toString() })
    }
  }, [formData.data_meta, formData.data, formData.periodo])

  // Calcular periodo_liberacao_sisbov automaticamente: data_liberacao_sisbov - CURRENT_DATE
  useEffect(() => {
    if (formData.data_liberacao_sisbov) {
      const dataLiberacao = new Date(formData.data_liberacao_sisbov)
      const currentDate = new Date()

      // Calculate difference in days
      const diffTime = dataLiberacao.getTime() - currentDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      setFormData({ ...formData, periodo_liberacao_sisbov: diffDays.toString() })
    }
  }, [formData.data_liberacao_sisbov])

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
      peso_vivo_meta_kg: formData.peso_vivo_meta_kg ? parseFloat(formData.peso_vivo_meta_kg) : null,
      data_meta: formData.data_meta || null,
      qtd_bezerros: formData.quantidade_bezerros ? parseInt(formData.quantidade_bezerros) : null,
      quant_inicial: formData.quant_inicial ? parseInt(formData.quant_inicial) : null,
      data_pesagem: formData.data || null,
      peso_entrada: formData.peso_entrada ? parseFloat(formData.peso_entrada) : null,
      gmd: formData.gmd ? parseFloat(formData.gmd) : null,
      periodo: formData.periodo ? parseInt(formData.periodo) : null,
      ativo: formData.ativo,
      pasto_id: formData.pasto_id || null,
      sistema_producao: formData.sistema_producao || null,
      rc_inicial: formData.rc_inicial ? parseFloat(formData.rc_inicial) : null,
      preco_kg: formData.preco_animal_kg ? parseFloat(formData.preco_animal_kg) : null,
      preco_cab: formData.preco_animal_cab ? parseFloat(formData.preco_animal_cab) : null,
      raca: formData.raca || null,
      sexo: formData.sexo || null,
      idade_meses: formData.idade ? parseInt(formData.idade) : null,
      custo_operacional: formData.custo_operacional ? parseFloat(formData.custo_operacional) : null,
      estrategia_nutricional: formData.estrategia_nutricional || null,
      dias_restantes_meta: formData.dias_restantes_meta ? parseInt(formData.dias_restantes_meta) : null,
      produtor_rural: formData.produtor_rural || null,
      propriedade_origem: formData.propriedade_origem || null,
      numero_contrato: formData.numero_contrato || null,
      mes_competencia: formData.mes_competencia || null,
      data_liberacao_sisbov: formData.data_liberacao_sisbov || null,
      periodo_liberacao_sisbov: formData.periodo_liberacao_sisbov || null,
      data_embarque_previsto: formData.data_embarque_prevista || null,
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
        pasto_id: '',
        sistema_producao: '',
        rc_inicial: '',
        preco_animal_kg: '',
        preco_animal_cab: '',
        raca: '',
        sexo: '',
        idade: '',
        custo_operacional: '',
        estrategia_nutricional: '',
        dias_restantes_meta: '',
        produtor_rural: '',
        propriedade_origem: '',
        numero_contrato: '',
        mes_competencia: '',
        data_liberacao_sisbov: '',
        periodo_liberacao_sisbov: '',
        data_embarque_prevista: '',
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
      peso_vivo_meta_kg: lote.peso_vivo_meta_kg?.toString() || '',
      data_meta: lote.data_meta || '',
      quantidade_bezerros: lote.qtd_bezerros?.toString() || '',
      quant_inicial: lote.quant_inicial?.toString() || '',
      data: lote.data_pesagem || '',
      peso_entrada: lote.peso_entrada?.toString() || '',
      gmd: lote.gmd?.toString() || '',
      periodo: lote.periodo?.toString() || '',
      morte: '',
      consumo: '',
      abate: '',
      transf_entrada: '',
      transf_saida: '',
      quant_atual: '',
      ativo: lote.ativo ?? true,
      pasto_id: lote.pasto_id || '',
      sistema_producao: lote.sistema_producao || '',
      rc_inicial: lote.rc_inicial?.toString() || '',
      preco_animal_kg: lote.preco_animal_kg?.toString() || '',
      preco_animal_cab: lote.preco_animal_cab?.toString() || '',
      raca: lote.raca || '',
      sexo: lote.sexo || '',
      idade: lote.idade?.toString() || '',
      custo_operacional: lote.custo_operacional?.toString() || '',
      estrategia_nutricional: lote.estrategia_nutricional || '',
      dias_restantes_meta: '',
      produtor_rural: lote.produtor_rural || '',
      propriedade_origem: lote.propriedade_origem || '',
      numero_contrato: lote.numero_contrato || '',
      mes_competencia: lote.mes_competencia || '',
      data_liberacao_sisbov: lote.data_liberacao_sisbov || '',
      periodo_liberacao_sisbov: lote.periodo_liberacao_sisbov?.toString() || '',
      data_embarque_prevista: lote.data_embarque_prevista || '',
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
      pasto_id: '',
      sistema_producao: '',
      rc_inicial: '',
      preco_animal_kg: '',
      preco_animal_cab: '',
      raca: '',
      sexo: '',
      idade: '',
      custo_operacional: '',
      estrategia_nutricional: '',
      dias_restantes_meta: '',
      produtor_rural: '',
      propriedade_origem: '',
      numero_contrato: '',
      mes_competencia: '',
      data_liberacao_sisbov: '',
      periodo_liberacao_sisbov: '',
      data_embarque_prevista: '',
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identificação Básica */}
            <div className="border-t pt-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Identificação Básica</h4>
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
                    Pasto <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.pasto_id}
                    onChange={(e) => setFormData({ ...formData, pasto_id: e.target.value })}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:border-accent"
                  >
                    <option value="">Selecione</option>
                    {pastos.map((pasto) => (
                      <option key={pasto.id} value={pasto.id}>{pasto.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sistema de Produção <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.sistema_producao}
                    onChange={(e) => setFormData({ ...formData, sistema_producao: e.target.value })}
                    required
                    placeholder="Ex: Cria"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Raça <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.raca}
                    onChange={(e) => setFormData({ ...formData, raca: e.target.value })}
                    required
                    placeholder="Ex: Nelore"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sexo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.sexo}
                    onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:border-accent"
                  >
                    <option value="">Selecione</option>
                    <option value="macho">Macho</option>
                    <option value="fêmea">Fêmea</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Idade (meses) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.idade}
                    onChange={(e) => setFormData({ ...formData, idade: e.target.value })}
                    required
                    placeholder="Ex: 24"
                    className="border-gray-200 focus:border-accent"
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

              <div className="w-1/4 mt-2">
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
            </div>

            {/* Peso e Crescimento */}
            <div className="border-t pt-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Peso e Crescimento</h4>
              <div className="grid grid-cols-6 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quant. Inicial
                  </label>
                  <Input
                    type="number"
                    value={formData.quant_inicial}
                    onChange={(e) => setFormData({ ...formData, quant_inicial: e.target.value })}
                    placeholder="0"
                    className="border-gray-200 focus:border-accent"
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
                    className="border-gray-200 focus:border-accent"
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
                    className="border-gray-200 focus:border-accent"
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
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Período (dias) <span className="text-gray-400 text-xs">(calculado)</span>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RC Inicial (%) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.rc_inicial}
                    onChange={(e) => setFormData({ ...formData, rc_inicial: e.target.value })}
                    required
                    placeholder="Ex: 50"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quant. Atual (cab) <span className="text-gray-400 text-xs">(calculado)</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.numero_cabecas}
                    onChange={(e) => setFormData({ ...formData, numero_cabecas: e.target.value })}
                    disabled
                    placeholder="0"
                    className="border-gray-200 focus:border-accent opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso Vivo Atual (kg) {formData.peso_entrada && formData.gmd && formData.periodo ? <span className="text-gray-400 text-xs">(calculado)</span> : ''}
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.peso_vivo_kg}
                    onChange={(e) => setFormData({ ...formData, peso_vivo_kg: e.target.value })}
                    placeholder="Ex: 450.5"
                    disabled={!!(formData.peso_entrada && formData.gmd && formData.periodo)}
                    className={`border-gray-200 focus:border-accent ${formData.peso_entrada && formData.gmd && formData.periodo ? 'opacity-60' : ''}`}
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
                    className="border-gray-200 focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dias Restantes para Meta <span className="text-gray-400 text-xs">(calculado)</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.dias_restantes_meta}
                    onChange={(e) => setFormData({ ...formData, dias_restantes_meta: e.target.value })}
                    disabled
                    placeholder="0"
                    className="border-gray-200 focus:border-accent opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Meta
                  </label>
                  <Input
                    type="date"
                    value={formData.data_meta}
                    onChange={(e) => setFormData({ ...formData, data_meta: e.target.value })}
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estratégia Nutricional <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.estrategia_nutricional}
                    onChange={(e) => setFormData({ ...formData, estrategia_nutricional: e.target.value })}
                    required
                    placeholder="Ex: RIP"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Movimentação */}
            <div className="border-t pt-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Movimentação</h4>
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
                <div>
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
              </div>
            </div>

            {/* Informações Financeiras */}
            <div className="border-t pt-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Informações Financeiras</h4>
              <div className="grid grid-cols-6 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço Animal (R$/kg)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_animal_kg}
                    onChange={(e) => setFormData({ ...formData, preco_animal_kg: e.target.value })}
                    placeholder="Ex: 12.50"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço Animal (R$/cab)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_animal_cab}
                    onChange={(e) => setFormData({ ...formData, preco_animal_cab: e.target.value })}
                    placeholder="Ex: 5300.00"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 whitespace-nowrap">
                    Custo Operacional (R$/cab/Per.)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.custo_operacional}
                    onChange={(e) => setFormData({ ...formData, custo_operacional: e.target.value })}
                    placeholder="Ex: 1.80"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Informações Administrativas */}
            <div className="border-t pt-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Informações Administrativas</h4>
              <div className="grid grid-cols-6 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Produtor Rural <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.produtor_rural}
                    onChange={(e) => setFormData({ ...formData, produtor_rural: e.target.value })}
                    required
                    placeholder="Nome do produtor"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Propriedade de Origem <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.propriedade_origem}
                    onChange={(e) => setFormData({ ...formData, propriedade_origem: e.target.value })}
                    required
                    placeholder="Nome da propriedade"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    N° Contrato <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.numero_contrato}
                    onChange={(e) => setFormData({ ...formData, numero_contrato: e.target.value })}
                    required
                    placeholder="Ex: 12345"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mês de Competência <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="month"
                    value={formData.mes_competencia}
                    onChange={(e) => setFormData({ ...formData, mes_competencia: e.target.value })}
                    required
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* SISBOV e Logística */}
            <div className="border-t pt-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">SISBOV e Logística</h4>
              <div className="grid grid-cols-6 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Liberação SISBOV
                  </label>
                  <Input
                    type="date"
                    value={formData.data_liberacao_sisbov}
                    onChange={(e) => setFormData({ ...formData, data_liberacao_sisbov: e.target.value })}
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Período Liberação SISBOV
                  </label>
                  <Input
                    type="number"
                    value={formData.periodo_liberacao_sisbov}
                    onChange={(e) => setFormData({ ...formData, periodo_liberacao_sisbov: e.target.value })}
                    placeholder="0"
                    disabled
                    className="border-gray-200 focus:border-accent opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Embarque Prevista
                  </label>
                  <Input
                    type="date"
                    value={formData.data_embarque_prevista}
                    onChange={(e) => setFormData({ ...formData, data_embarque_prevista: e.target.value })}
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
              </div>
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
              <CardItem
                key={lote.id}
                title={lote.nome}
                subtitle={lote.n_cabecas ? `${lote.n_cabecas} cabeças` : undefined}
                status={lote.ativo}
                onClick={() => handleEdit(lote)}
              >
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

                <div className="flex flex-wrap gap-1 sm:gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleActive(lote)
                    }}
                  >
                    {lote.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(lote)
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(lote.id)
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </CardItem>
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
