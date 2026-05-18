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
  pasto_id?: string
  n_cabecas?: number
  quant_inicial?: number
  categorias?: string[]
  peso_vivo_kg?: number
  peso_vivo_meta_kg?: number
  peso_entrada_kg?: number
  gmd?: number
  data_pesagem?: string
  data_meta?: string
  qtd_bezerros?: number
  raca?: string
  sexo?: string
  idade_meses?: number
  rc_inicial?: number
  preco_kg?: number
  preco_cab?: number
  custo_operacional?: number
  estrategia_nutricional?: string
  produtor_rural?: string
  propriedade_origem?: string
  numero_contrato?: string
  mes_competencia?: string
  data_liberacao_sisbov?: string
  periodo_liberacao_sisbov?: string
  data_embarque_previsto?: string
  ativo: boolean
  created_at?: string
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
    pasto_id: '',
    numero_cabecas: '',
    categorias: [] as string[],
    categoria_outros: '',
    peso_vivo_kg: '',
    peso_vivo_projetado: '',
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
    // Novos campos
    raca: '',
    raca_outros: '',
    sexo: '',
    idade_meses: '',
    rc_inicial: '',
    preco_kg: '',
    preco_cab: '',
    custo_operacional: '',
    estrategia_nutricional: '',
    produtor_rural: '',
    propriedade_origem: '',
    numero_contrato: '',
    mes_competencia: '',
    data_liberacao_sisbov: '',
    periodo_liberacao_sisbov: '',
    data_embarque_previsto: '',
    ativo: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [loteToDelete, setLoteToDelete] = useState<string | null>(null)
  const [originalAtivo, setOriginalAtivo] = useState(true)
  const [pastos, setPastos] = useState<{ id: string; nome: string }[]>([])
  const [editQuantInicial, setEditQuantInicial] = useState(false)

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

  // Função para carregar pastos da fazenda
  const loadPastos = async () => {
    if (!user) return

    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    const { data, error } = await supabase
      .from('pastos')
      .select('id, nome')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao buscar pastos:', error)
    } else {
      setPastos(data || [])
    }
  }

  // Função para calcular dados do lote baseado em registros mobile
  const calcularDadosLote = async (loteNome: string, loteCreatedAt?: string, quantInicialParam?: string, pesoEntradaParam?: string) => {
    if (!user || !loteNome) return

    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    // Buscar TODOS os registros de morte da fazenda (sem filtro de data para evitar encoding issues)
    const { data: todasMortes } = await supabase
      .from('registros_morte')
      .select('lote, peso_vivo, created_at, deleted_at')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)

    // Filtrar por lote e data em memória
    const dataInicio = loteCreatedAt ? new Date(loteCreatedAt).getTime() : 0
    const mortesLote = (todasMortes || []).filter(r => {
      const dataRegistro = new Date(r.created_at).getTime()
      return r.lote === loteNome && dataRegistro >= dataInicio
    })
    const morteCount = mortesLote.length
    const mortePeso = mortesLote.reduce((sum, r) => sum + (r.peso_vivo || 0), 0)

    // Buscar TODAS as movimentações da fazenda (sem filtro de data)
    const { data: todasMovimentacoes } = await supabase
      .from('registros_movimentacao')
      .select('lote_origem, destino, motivo_movimentacao, numero_cabecas, peso_medio_kg, created_at, deleted_at')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)

    // Filtrar por lote, tipo e data em memória
    const movs = (todasMovimentacoes || []).filter(r => {
      const dataRegistro = new Date(r.created_at).getTime()
      return (r.lote_origem === loteNome || r.destino === loteNome) && dataRegistro >= dataInicio
    })

    // Normalizar motivo para comparação (lowercase + remover acentos)
    const normalizarMotivo = (s: string) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // Filtrar por tipo
    const consumo = movs.filter(r => normalizarMotivo(r.motivo_movimentacao) === 'consumo')
    const abate = movs.filter(r => normalizarMotivo(r.motivo_movimentacao) === 'abate')
    const entrada = movs.filter(r => normalizarMotivo(r.motivo_movimentacao) === 'entrada')
    const saida = movs.filter(r => normalizarMotivo(r.motivo_movimentacao) === 'saida')

    const consumoCount = consumo.reduce((sum, r) => sum + (r.numero_cabecas || 0), 0)
    const consumoPeso = consumo.reduce((sum, r) => sum + ((r.numero_cabecas || 0) * (r.peso_medio_kg || 0)), 0)

    const abateCount = abate.reduce((sum, r) => sum + (r.numero_cabecas || 0), 0)
    const abatePeso = abate.reduce((sum, r) => sum + ((r.numero_cabecas || 0) * (r.peso_medio_kg || 0)), 0)

    const entradaCount = entrada.reduce((sum, r) => sum + (r.numero_cabecas || 0), 0)
    const entradaPeso = entrada.reduce((sum, r) => sum + ((r.numero_cabecas || 0) * (r.peso_medio_kg || 0)), 0)

    const saidaCount = saida.reduce((sum, r) => sum + (r.numero_cabecas || 0), 0)
    const saidaPeso = saida.reduce((sum, r) => sum + ((r.numero_cabecas || 0) * (r.peso_medio_kg || 0)), 0)

    const quantInicial = parseInt(quantInicialParam ?? formData.quant_inicial) || 0
    const pesoEntrada = parseFloat(pesoEntradaParam ?? formData.peso_entrada) || 0

    // Calcular quantidade atual
    const quantAtual = quantInicial - morteCount - consumoCount - abateCount - saidaCount + entradaCount

    // Calcular peso vivo atual (peso_entrada é kg/cab, multiplicar pela quantidade inicial)
    const pesoEntradaTotal = pesoEntrada * quantInicial
    const pesoVivoAtual = pesoEntradaTotal - mortePeso - consumoPeso - abatePeso - saidaPeso + entradaPeso

    // Atualizar formData com valores calculados
    setFormData(prev => ({
      ...prev,
      morte: morteCount.toString(),
      consumo: consumoCount.toString(),
      abate: abateCount.toString(),
      transf_entrada: entradaCount.toString(),
      transf_saida: saidaCount.toString(),
      quant_atual: Math.max(0, quantAtual).toString(),
      peso_vivo_kg: Math.max(0, pesoVivoAtual).toFixed(2),
    }))
  }

  // Calcular peso vivo projetado via GMD
  useEffect(() => {
    const pesoEntrada = parseFloat(formData.peso_entrada) || 0
    const gmd = parseFloat(formData.gmd) || 0
    const periodo = parseInt(formData.periodo) || 0

    if (pesoEntrada > 0 && gmd > 0 && periodo > 0) {
      const pesoProjetado = pesoEntrada + (gmd * periodo)
      setFormData(prev => ({ ...prev, peso_vivo_projetado: pesoProjetado.toFixed(2) }))
    } else {
      setFormData(prev => ({ ...prev, peso_vivo_projetado: '' }))
    }
  }, [formData.peso_entrada, formData.gmd, formData.periodo])

  useEffect(() => {
    loadLotes()
    loadPastos()
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

  // Forçar cálculo de período e peso projetado quando lote é carregado
  useEffect(() => {
    if (editingLote && formData.data) {
      const dataPesagem = new Date(formData.data)
      const dataAtual = new Date()
      const diffTime = Math.abs(dataAtual.getTime() - dataPesagem.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      setFormData(prev => ({ ...prev, periodo: diffDays.toString() }))
    }
  }, [editingLote, formData.data])

  // Calcular data meta automaticamente quando peso_vivo_meta_kg, peso_entrada ou gmd mudarem
  useEffect(() => {
    const pesoMeta = parseFloat(formData.peso_vivo_meta_kg)
    const pesoEntrada = parseFloat(formData.peso_entrada)
    const gmd = parseFloat(formData.gmd)
    const dataPesagem = formData.data ? new Date(formData.data) : null

    if (pesoMeta && pesoEntrada && gmd && gmd > 0 && dataPesagem && pesoMeta > pesoEntrada) {
      const diasParaMeta = (pesoMeta - pesoEntrada) / gmd
      const dataMeta = new Date(dataPesagem.getTime() + (diasParaMeta * 24 * 60 * 60 * 1000))

      // Formatar data como yyyy-mm-dd
      const year = dataMeta.getFullYear()
      const month = String(dataMeta.getMonth() + 1).padStart(2, '0')
      const day = String(dataMeta.getDate()).padStart(2, '0')
      const dataMetaFormatada = `${year}-${month}-${day}`

      setFormData({ ...formData, data_meta: dataMetaFormatada })
    }
  }, [formData.peso_vivo_meta_kg, formData.peso_entrada, formData.gmd, formData.data])

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

    // Montar raça final
    let racaFinal = formData.raca
    if (formData.raca === 'outros' && formData.raca_outros.trim()) {
      racaFinal = formData.raca_outros.trim()
    }

    const data = {
      fazenda_id: fazendaId,
      nome: formData.nome,
      pasto_id: formData.pasto_id || null,
      n_cabecas: formData.numero_cabecas ? parseInt(formData.numero_cabecas) : null,
      quant_inicial: formData.quant_inicial ? parseInt(formData.quant_inicial) : null,
      categorias: categoriasFinal.length > 0 ? categoriasFinal : null,
      peso_vivo_meta_kg: formData.peso_vivo_meta_kg ? parseFloat(formData.peso_vivo_meta_kg) : null,
      peso_entrada_kg: formData.peso_entrada ? parseFloat(formData.peso_entrada) : null,
      gmd: formData.gmd ? parseFloat(formData.gmd) : null,
      data_pesagem: formData.data || null,
      data_meta: formData.data_meta || null,
      qtd_bezerros: formData.quantidade_bezerros ? parseInt(formData.quantidade_bezerros) : null,
      raca: racaFinal || null,
      sexo: formData.sexo || null,
      idade_meses: formData.idade_meses ? parseInt(formData.idade_meses) : null,
      rc_inicial: formData.rc_inicial ? parseFloat(formData.rc_inicial) : null,
      preco_kg: formData.preco_kg ? parseFloat(formData.preco_kg) : null,
      preco_cab: formData.preco_cab ? parseFloat(formData.preco_cab) : null,
      custo_operacional: formData.custo_operacional ? parseFloat(formData.custo_operacional) : null,
      estrategia_nutricional: formData.estrategia_nutricional || null,
      produtor_rural: formData.produtor_rural || null,
      propriedade_origem: formData.propriedade_origem || null,
      numero_contrato: formData.numero_contrato || null,
      mes_competencia: formData.mes_competencia || null,
      data_liberacao_sisbov: formData.data_liberacao_sisbov || null,
      periodo_liberacao_sisbov: formData.periodo_liberacao_sisbov || null,
      data_embarque_previsto: formData.data_embarque_previsto || null,
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
        pasto_id: '',
        numero_cabecas: '',
        categorias: [],
        categoria_outros: '',
        peso_vivo_kg: '',
        peso_vivo_projetado: '',
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
        raca: '',
        raca_outros: '',
        sexo: '',
        idade_meses: '',
        rc_inicial: '',
        preco_kg: '',
        preco_cab: '',
        custo_operacional: '',
        estrategia_nutricional: '',
        produtor_rural: '',
        propriedade_origem: '',
        numero_contrato: '',
        mes_competencia: '',
        data_liberacao_sisbov: '',
        periodo_liberacao_sisbov: '',
        data_embarque_previsto: '',
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
      pasto_id: lote.pasto_id || '',
      numero_cabecas: lote.n_cabecas?.toString() || '',
      categorias: cats,
      categoria_outros: '',
      peso_vivo_kg: '',
      peso_vivo_projetado: '',
      peso_vivo_meta_kg: lote.peso_vivo_meta_kg?.toString() || '',
      data_meta: lote.data_meta || '',
      quantidade_bezerros: lote.qtd_bezerros?.toString() || '',
      quant_inicial: lote.quant_inicial?.toString() || '',
      data: lote.data_pesagem || '',
      peso_entrada: lote.peso_entrada_kg?.toString() || '',
      gmd: lote.gmd?.toFixed(3) || '',
      periodo: '', // Será recalculado pelo useEffect
      morte: '',
      consumo: '',
      abate: '',
      transf_entrada: '',
      transf_saida: '',
      quant_atual: '',
      raca: lote.raca && ['nelore', 'angus', 'leiteiro', 'anelorado', 'srd'].includes(lote.raca) ? lote.raca : 'outros',
      raca_outros: lote.raca && !['nelore', 'angus', 'leiteiro', 'anelorado', 'srd'].includes(lote.raca) ? lote.raca : '',
      sexo: lote.sexo || '',
      idade_meses: lote.idade_meses?.toString() || '',
      rc_inicial: lote.rc_inicial?.toString() || '',
      preco_kg: lote.preco_kg?.toString() || '',
      preco_cab: lote.preco_cab?.toString() || '',
      custo_operacional: lote.custo_operacional?.toString() || '',
      estrategia_nutricional: lote.estrategia_nutricional || '',
      produtor_rural: lote.produtor_rural || '',
      propriedade_origem: lote.propriedade_origem || '',
      numero_contrato: lote.numero_contrato || '',
      mes_competencia: lote.mes_competencia || '',
      data_liberacao_sisbov: lote.data_liberacao_sisbov || '',
      periodo_liberacao_sisbov: lote.periodo_liberacao_sisbov || '',
      data_embarque_previsto: lote.data_embarque_previsto || '',
      ativo: lote.ativo ?? true,
    })
    setOriginalAtivo(lote.ativo ?? true)
    setShowForm(true)
    
    // Calcular dados do lote baseado em registros mobile (passar valores do lote pois setFormData é assíncrono)
    calcularDadosLote(lote.nome, lote.created_at, lote.quant_inicial?.toString() || '', lote.peso_entrada_kg?.toString() || '')
  }

  const handleCancel = () => {
    setEditingLote(null)
    setFormData({
      nome: '',
      pasto_id: '',
      numero_cabecas: '',
      categorias: [],
      categoria_outros: '',
      peso_vivo_kg: '',
      peso_vivo_projetado: '',
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
      raca: '',
      raca_outros: '',
      sexo: '',
      idade_meses: '',
      rc_inicial: '',
      preco_kg: '',
      preco_cab: '',
      custo_operacional: '',
      estrategia_nutricional: '',
      produtor_rural: '',
      propriedade_origem: '',
      numero_contrato: '',
      mes_competencia: '',
      data_liberacao_sisbov: '',
      periodo_liberacao_sisbov: '',
      data_embarque_previsto: '',
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seção 1 - Identificação */}
            <div>
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 border-b pb-2">
                Identificação
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    Pasto/Curral <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.pasto_id}
                    onChange={(e) => setFormData({ ...formData, pasto_id: e.target.value })}
                    required
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-accent focus:outline-none"
                  >
                    <option value="">Selecione...</option>
                    {pastos.map((pasto) => (
                      <option key={pasto.id} value={pasto.id}>
                        {pasto.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Raça
                  </label>
                  <select
                    value={formData.raca}
                    onChange={(e) => setFormData({ ...formData, raca: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-accent focus:outline-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="nelore">Nelore</option>
                    <option value="angus">Angus</option>
                    <option value="leiteiro">Leiteiro</option>
                    <option value="anelorado">Anelorado</option>
                    <option value="srd">SRD</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sexo
                  </label>
                  <select
                    value={formData.sexo}
                    onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-accent focus:outline-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="macho">Macho</option>
                    <option value="femea">Fêmea</option>
                  </select>
                </div>
              </div>
              {formData.raca === 'outros' && (
                <div className="mt-3 w-1/4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Outra Raça (especificar)
                  </label>
                  <Input
                    type="text"
                    value={formData.raca_outros}
                    onChange={(e) => setFormData({ ...formData, raca_outros: e.target.value })}
                    placeholder="Digite a raça"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
              )}
            </div>

            {/* Seção 2 - Dados do Animal */}
            <div>
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 border-b pb-2">
                Dados do Animal
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Idade (meses)
                  </label>
                  <Input
                    type="number"
                    value={formData.idade_meses}
                    onChange={(e) => setFormData({ ...formData, idade_meses: e.target.value })}
                    placeholder="Ex: 24"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quant. Inicial (cab) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.quant_inicial}
                      onChange={(e) => setFormData({ ...formData, quant_inicial: e.target.value })}
                      disabled={!!editingLote && !editQuantInicial}
                      required
                      placeholder="Ex: 100"
                      className={`border-gray-200 focus:border-accent flex-1 ${!!editingLote && !editQuantInicial ? 'opacity-60' : ''}`}
                    />
                    {editingLote && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditQuantInicial(!editQuantInicial)}
                        className="whitespace-nowrap text-xs"
                      >
                        {editQuantInicial ? 'Bloquear' : 'Editar'}
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quant. Atual (cab) <span className="text-xs text-gray-500">(calculado)</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.quant_atual}
                    disabled
                    className="border-gray-200 focus:border-accent opacity-60 bg-gray-50"
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

            {/* Seção 3 - Categorias */}
            <div>
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 border-b pb-2">
                Categorias <span className="text-red-500">*</span>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
              <div className="mt-3 w-1/4">
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

            {/* Seção 4 - Dados de Peso */}
            <div>
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 border-b pb-2">
                Dados de Peso
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso de Entrada (kg/cab)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.peso_entrada}
                    onChange={(e) => setFormData({ ...formData, peso_entrada: e.target.value })}
                    placeholder="Ex: 380.5"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso Vivo Projetado (kg/cab) <span className="text-xs text-gray-500">(GMD)</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.peso_vivo_projetado}
                    disabled
                    className="border-gray-200 focus:border-accent opacity-60 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso Vivo Meta (kg/cab)
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
                    RC Inicial (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.rc_inicial}
                    onChange={(e) => setFormData({ ...formData, rc_inicial: e.target.value })}
                    placeholder="Ex: 52.5"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GMD (kg/cab/dia)
                  </label>
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.gmd}
                    onChange={(e) => setFormData({ ...formData, gmd: e.target.value })}
                    placeholder="Ex: 0.800"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Seção 5 - Movimentações (READ-ONLY) */}
            <div>
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 border-b pb-2">
                Movimentações <span className="text-xs text-gray-500">(calculado dos registros)</span>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Morte (cab)
                  </label>
                  <Input
                    type="number"
                    value={formData.morte}
                    disabled
                    className="border-gray-200 focus:border-accent opacity-60 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consumo (cab)
                  </label>
                  <Input
                    type="number"
                    value={formData.consumo}
                    disabled
                    className="border-gray-200 focus:border-accent opacity-60 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Abate (cab)
                  </label>
                  <Input
                    type="number"
                    value={formData.abate}
                    disabled
                    className="border-gray-200 focus:border-accent opacity-60 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transf. Entrada (cab)
                  </label>
                  <Input
                    type="number"
                    value={formData.transf_entrada}
                    disabled
                    className="border-gray-200 focus:border-accent opacity-60 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transf. Saída (cab)
                  </label>
                  <Input
                    type="number"
                    value={formData.transf_saida}
                    disabled
                    className="border-gray-200 focus:border-accent opacity-60 bg-gray-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quant. Atual (cab) <span className="text-xs text-gray-500">(calculado)</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.quant_atual}
                    disabled
                    className="border-gray-200 focus:border-accent opacity-60 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso Vivo Real Total (kg) <span className="text-xs text-gray-500">(calculado)</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.peso_vivo_kg}
                    disabled
                    className="border-gray-200 focus:border-accent opacity-60 bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Seção 6 - Dados Financeiros */}
            <div>
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 border-b pb-2">
                Dados Financeiros
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço do animal (R$/kg)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_kg}
                    onChange={(e) => setFormData({ ...formData, preco_kg: e.target.value })}
                    placeholder="Ex: 15.50"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço do animal (R$/cab)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_cab}
                    onChange={(e) => setFormData({ ...formData, preco_cab: e.target.value })}
                    placeholder="Ex: 5890.00"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custo Operacional (R$/cab/Per.)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.custo_operacional}
                    onChange={(e) => setFormData({ ...formData, custo_operacional: e.target.value })}
                    placeholder="Ex: 450.00"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estratégia Nutricional Atual
                  </label>
                  <Input
                    type="text"
                    value={formData.estrategia_nutricional}
                    onChange={(e) => setFormData({ ...formData, estrategia_nutricional: e.target.value })}
                    placeholder="Ex: Suplementação mineral"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Seção 7 - Metas e Prazos */}
            <div>
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 border-b pb-2">
                Metas e Prazos
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    Data Meta <span className="text-xs text-gray-500">(calculado)</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.data_meta}
                    disabled
                    className="border-gray-200 focus:border-accent opacity-60 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Período (dias) <span className="text-xs text-gray-500">(calculado)</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.periodo}
                    disabled
                    className="border-gray-200 focus:border-accent opacity-60 bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Seção 8 - SISBOV */}
            <div>
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 border-b pb-2">
                SISBOV
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    type="text"
                    value={formData.periodo_liberacao_sisbov}
                    onChange={(e) => setFormData({ ...formData, periodo_liberacao_sisbov: e.target.value })}
                    placeholder="Ex: 30 dias"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Embarque Previsto
                  </label>
                  <Input
                    type="date"
                    value={formData.data_embarque_previsto}
                    onChange={(e) => setFormData({ ...formData, data_embarque_previsto: e.target.value })}
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    N° Contrato
                  </label>
                  <Input
                    type="text"
                    value={formData.numero_contrato}
                    onChange={(e) => setFormData({ ...formData, numero_contrato: e.target.value })}
                    placeholder="Ex: 2024-001"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Seção 9 - Origem */}
            <div>
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 border-b pb-2">
                Origem
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Produtor Rural
                  </label>
                  <Input
                    type="text"
                    value={formData.produtor_rural}
                    onChange={(e) => setFormData({ ...formData, produtor_rural: e.target.value })}
                    placeholder="Nome do produtor"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Propriedade de Origem
                  </label>
                  <Input
                    type="text"
                    value={formData.propriedade_origem}
                    onChange={(e) => setFormData({ ...formData, propriedade_origem: e.target.value })}
                    placeholder="Nome da propriedade"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mês de Competência
                  </label>
                  <Input
                    type="text"
                    value={formData.mes_competencia}
                    onChange={(e) => setFormData({ ...formData, mes_competencia: e.target.value })}
                    placeholder="Ex: 01/2024"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ativo: !formData.ativo })}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      formData.ativo
                        ? 'bg-green-100 text-green-800 border-2 border-green-300 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 border-2 border-red-300 hover:bg-red-200'
                    }`}
                  >
                    {formData.ativo ? '✓ Ativo' : '✗ Inativo'}
                  </button>
                </div>
              </div>
              {formData.ativo !== originalAtivo && editingLote && (
                <div className="mt-2">
                  <span className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                    ⚠️ Salve para aplicar alteração de status
                  </span>
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2 items-center pt-4 border-t">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="secondary" onClick={handleCancel}>
                Cancelar
              </Button>
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
                  {/* Pasto */}
                  {lote.pasto_id && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Pasto:</span>{' '}
                      {pastos.find(p => p.id === lote.pasto_id)?.nome || 'N/A'}
                    </p>
                  )}

                  {/* Raça e Sexo */}
                  <div className="flex gap-2">
                    {lote.raca && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded capitalize">
                        {lote.raca}
                      </span>
                    )}
                    {lote.sexo && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded capitalize">
                        {lote.sexo}
                      </span>
                    )}
                  </div>

                  {/* Peso Vivo */}
                  {lote.peso_vivo_kg && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Peso Vivo:</span> {lote.peso_vivo_kg} kg
                    </p>
                  )}

                  {/* Categorias */}
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

                  {/* Quantidade de Bezerros */}
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
