import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, NumericInput, CardSkeleton, ConfirmModal, CardItem, GroupedSelect } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface LoteCategoria {
  id?: string
  categoria: string
  quant_inicial?: number
  data_pesagem?: string
  peso_entrada_kg_cab?: number
  peso_entrada_arrobas?: number
  gmd?: string
  periodo?: number
  rc_inicial?: number
  rc_final?: number
  rc_atual?: number
  quant_atual?: number
  peso_vivo_atual_kg_cab?: number
  peso_vivo_atual_arroba_cab?: number
  producao_atual_arroba_cab?: number
  peso_vivo_meta_kg_cab?: number
  peso_venda_meta_arroba?: number
  producao_projetada_arroba_cab?: number
  venda_total_arroba_lote_categoria?: number
  dias_restantes_meta?: number
  data_meta_projetada?: string
  estrategia_nutricional?: string
  raca?: string
  sexo?: string
  idade?: number
  preco_entrada_reais_kg?: number
  preco_entrada_reais_arroba?: number
  preco_entrada_reais_cab?: number
  agio_percent?: number
  custo_operacional_reais_cab_dia?: number
  margem_lucro_percent?: number
  preco_custo_reais_arroba?: number
  preco_custo_cab?: number
  preco_venda_projetado_reais_arroba?: number
  preco_venda_sugerido_cab?: number
  faturamento_projetado_reais_lote_categoria?: number
  morte?: number
  consumo?: number
  abate?: number
  transf_entrada?: number
  transf_saida?: number
  qtd_bezerros?: number
  consumo_meta_porcentagem_pesovivo?: number
  custo_frete_reais_cab?: number
  custo_comissao_reais_cab?: number
  custo_sanidade_reais_cab?: number
  custo_identificacao_rastreabilidade_reais_cab?: number
  custo_total_entrada_reais_cab?: number
  custo_total_entrada_reais_lote?: number
  ativo?: boolean
}

interface Lote {
  id: string
  fazenda_id: string
  nome: string
  n_cabecas?: number
  categorias?: LoteCategoria[]
  peso_vivo_atual_kg_cab?: number
  peso_vivo_meta_kg_cab?: number
  data_meta_projetada?: string
  qtd_bezerros?: number
  quant_inicial?: number
  data_pesagem?: string
  peso_entrada_kg_cab?: number
  gmd?: string
  periodo?: number
  ativo: boolean
  pasto_id?: string
  sistema_producao?: string
  meta_intervalo_rodeio_dias?: number
  rc_inicial?: number
  preco_entrada_reais_kg?: number
  preco_entrada_reais_cab?: number
  custo_operacional_reais_cab_dia?: number
  margem_lucro_percent?: number
  raca?: string
  sexo?: string
  idade?: number
  estrategia_nutricional?: string
  dias_restantes_meta?: number
  produtor_rural?: string
  propriedade_origem?: string
  numero_contrato?: string
  mes_competencia?: string
  data_liberacao_sisbov?: string
  periodo_liberacao_sisbov?: number
  data_embarque_prevista?: string
  pasto_nome?: string
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
  const [racas, setRacas] = useState<{id: string, nome: string}[]>([])
  const [nutritionalOptions, setNutritionalOptions] = useState<{id: string, name: string, category: string, consumo_meta?: number, gmd?: number}[]>([])
  const [movimentacaoData, setMovimentacaoData] = useState<any[]>([])
  const [maternidadeData, setMaternidadeData] = useState<any[]>([])
  const [morteData, setMorteData] = useState<any[]>([])
  const [formData, setFormData] = useState({
    nome: '',
    numero_cabecas: '',
    categorias: [] as LoteCategoria[],
    categoria_outros: '',
    peso_vivo_atual_kg_cab: '',
    peso_vivo_meta_kg_cab: '',
    data_meta_projetada: '',
    quantidade_bezerros: '',
    quant_inicial: '',
    data: '',
    peso_entrada_kg_cab: '',
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
    meta_intervalo_rodeio_dias: '',
    rc_inicial: '',
    preco_entrada_reais_kg: '',
    preco_entrada_reais_cab: '',
    custo_operacional_reais_cab_dia: '',
    margem_lucro_percent: '',
    raca: '',
    sexo: '',
    idade: '',
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
  const [showCategoryRemoveModal, setShowCategoryRemoveModal] = useState(false)
  const [originalAtivo, setOriginalAtivo] = useState(true)

  const categoriasOpcoes = [
    'vaca',
    'touro',
    'boi gordo',
    'boi magro',
    'garrote',
    'bezerro',
    'bezerro ao pé',
    'bezerra',
    'bezerra ao pé',
    'novilha',
    'tropa',
  ]

  const categoriaColors: Record<string, string> = {
    'vaca': 'border-blue-500',
    'touro': 'border-red-500',
    'boi gordo': 'border-green-500',
    'boi magro': 'border-yellow-500',
    'garrote': 'border-purple-500',
    'bezerro': 'border-orange-500',
    'bezerro ao pé': 'border-amber-500',
    'bezerra': 'border-pink-500',
    'bezerra ao pé': 'border-rose-500',
    'novilha': 'border-teal-500',
    'tropa': 'border-indigo-500',
  }

  const categoriaBgColors: Record<string, string> = {
    'vaca': 'bg-blue-50',
    'touro': 'bg-red-50',
    'boi gordo': 'bg-green-50',
    'boi magro': 'bg-yellow-50',
    'garrote': 'bg-purple-50',
    'bezerro': 'bg-orange-50',
    'bezerro ao pé': 'bg-amber-50',
    'bezerra': 'bg-pink-50',
    'bezerra ao pé': 'bg-rose-50',
    'novilha': 'bg-teal-50',
    'tropa': 'bg-indigo-50',
  }

  const getCategoriaColor = (categoria: string): string => {
    const normalized = categoria.toLowerCase()
    return categoriaColors[normalized] || 'border-accent'
  }

  const getCategoriaBgColor = (categoria: string): string => {
    const normalized = categoria.toLowerCase()
    return categoriaBgColors[normalized] || 'bg-gray-50'
  }

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

    const loadRacas = async () => {
      if (!user) return
      const { data: vinculos } = await supabase
        .from('usuario_fazenda')
        .select('fazenda_id')
        .eq('usuario_id', user.id)
        .eq('ativo', true)

      if (!vinculos || vinculos.length === 0) return

      const fazendaId = vinculos[0].fazenda_id

      const { data: racasData } = await supabase
        .from('racas')
        .select('id, nome')
        .eq('fazenda_id', fazendaId)
        .eq('ativo', true)
        .order('nome')

      if (racasData) {
        setRacas(racasData)
      }
    }

    loadPastos()
    loadRacas()
  }, [user])

  useEffect(() => {
    const loadNutritionalOptions = async () => {
      if (!user) return
      const { data: vinculos } = await supabase
        .from('usuario_fazenda')
        .select('fazenda_id')
        .eq('usuario_id', user.id)
        .eq('ativo', true)

      if (!vinculos || vinculos.length === 0) return

      const fazendaId = vinculos[0].fazenda_id

      const { data } = await supabase
        .from('formulacoes')
        .select('id, nome, tipo, meta_consumo_ms_percent_pv, gmd')
        .eq('fazenda_id', fazendaId)
        .eq('ativo', true)
        .order('nome')

      const options: {id: string, name: string, category: string, consumo_meta?: number, gmd?: number}[] = []

      if (data) {
        data.forEach(item => {
          options.push({
            id: item.id,
            name: item.nome,
            category: item.tipo || 'Formulações',
            consumo_meta: item.meta_consumo_ms_percent_pv !== undefined && item.meta_consumo_ms_percent_pv !== null ? Number(item.meta_consumo_ms_percent_pv) : undefined,
            gmd: item.gmd !== undefined && item.gmd !== null ? Number(item.gmd) : undefined
          })
        })
      }

      setNutritionalOptions(options)
    }

    loadNutritionalOptions()
  }, [user])

  const handleCategoriaToggle = (categoria: string) => {
    const categoriaExists = formData.categorias.some(c => c.categoria.toLowerCase() === categoria.toLowerCase())
    if (categoriaExists) {
      // Check if category has quant_atual > 0 before allowing removal
      const catToRemove = formData.categorias.find(c => c.categoria.toLowerCase() === categoria.toLowerCase())
      if (catToRemove && catToRemove.quant_atual && catToRemove.quant_atual > 0) {
        setShowCategoryRemoveModal(true)
        return
      }
      setFormData({
        ...formData,
        categorias: formData.categorias.filter((c) => c.categoria.toLowerCase() !== categoria.toLowerCase()),
      })
    } else {
      const novaCategoria: LoteCategoria = {
        categoria,
        quant_inicial: undefined,
        data_pesagem: undefined,
        peso_entrada_kg_cab: undefined,
        peso_entrada_arrobas: undefined,
        gmd: undefined,
        periodo: undefined,
        rc_inicial: undefined,
        rc_final: undefined,
        rc_atual: undefined,
        quant_atual: undefined, // Will be set to match quant_inicial after user inputs it
        peso_vivo_atual_kg_cab: undefined,
        peso_vivo_atual_arroba_cab: undefined,
        producao_atual_arroba_cab: undefined,
        peso_vivo_meta_kg_cab: undefined,
        peso_venda_meta_arroba: undefined,
        producao_projetada_arroba_cab: undefined,
        venda_total_arroba_lote_categoria: undefined,
        dias_restantes_meta: undefined,
        data_meta_projetada: undefined,
        estrategia_nutricional: undefined,
        raca: undefined,
        sexo: undefined,
        idade: undefined,
        preco_entrada_reais_kg: undefined,
        preco_entrada_reais_arroba: undefined,
        preco_entrada_reais_cab: undefined,
        agio_percent: undefined,
        custo_operacional_reais_cab_dia: undefined,
        margem_lucro_percent: undefined,
        morte: undefined,
        faturamento_projetado_reais_lote_categoria: undefined,
        consumo: undefined,
        abate: undefined,
        transf_entrada: undefined,
        transf_saida: undefined,
        qtd_bezerros: undefined,
        consumo_meta_porcentagem_pesovivo: undefined,
        ativo: true,
      }
      setFormData({
        ...formData,
        categorias: [...formData.categorias, novaCategoria],
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
    if (formData.data_meta_projetada) {
      const dataMeta = new Date(formData.data_meta_projetada)
      const dataAtual = new Date()
      const diffTime = Math.abs(dataMeta.getTime() - dataAtual.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      setFormData({ ...formData, dias_restantes_meta: diffDays.toString() })
    } else {
      setFormData({ ...formData, dias_restantes_meta: '' })
    }
  }, [formData.data_meta_projetada])

// Calcular data meta automaticamente quando peso_vivo_meta_kg_cab, peso_vivo_atual_kg_cab ou gmd mudarem
  useEffect(() => {
    const pesoMeta = parseFloat(formData.peso_vivo_meta_kg_cab)
    const pesoAtual = parseFloat(formData.peso_vivo_atual_kg_cab)
    const gmd = formData.gmd ? parseFloat(formData.gmd.replace(',', '.')) : null

    if (pesoMeta && pesoAtual && gmd && gmd > 0) {
      const diasParaMeta = (pesoMeta - pesoAtual) / gmd
      const dataHoje = new Date()
      const dataMeta = new Date(dataHoje.getTime() + (diasParaMeta * 24 * 60 * 60 * 1000))
      
      // Formatar data como yyyy-mm-dd
      const year = dataMeta.getFullYear()
      const month = String(dataMeta.getMonth() + 1).padStart(2, '0')
      const day = String(dataMeta.getDate()).padStart(2, '0')
      const dataMetaFormatada = `${year}-${month}-${day}`
      
      setFormData({ ...formData, data_meta_projetada: dataMetaFormatada })
    } else {
      setFormData({ ...formData, data_meta_projetada: '' })
    }
  }, [formData.peso_vivo_meta_kg_cab, formData.peso_vivo_atual_kg_cab, formData.gmd])

  // Calcular peso_vivo_atual_kg_cab automaticamente quando peso_entrada_kg_cab, gmd e periodo estiverem presentes
  useEffect(() => {
    const pesoEntrada = parseFloat(formData.peso_entrada_kg_cab)
    const gmd = formData.gmd ? parseFloat(formData.gmd.replace(',', '.')) : null
    const periodo = parseFloat(formData.periodo)

    if (pesoEntrada && gmd && periodo) {
      const pesoVivoCalculado = pesoEntrada + (gmd * periodo)
      setFormData({ ...formData, peso_vivo_atual_kg_cab: pesoVivoCalculado.toFixed(1) })
    }
  }, [formData.peso_entrada_kg_cab, formData.gmd, formData.periodo])

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

  // Calcular dias_restantes_meta automaticamente: (data_meta_projetada - data_pesagem) - periodo
  useEffect(() => {
    if (formData.data_meta_projetada && formData.data && formData.periodo) {
      const dataMeta = new Date(formData.data_meta_projetada)
      const dataPesagem = new Date(formData.data)
      const periodo = parseFloat(formData.periodo)

      // Calculate difference in days
      const diffTime = dataMeta.getTime() - dataPesagem.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // Calculate dias restantes
      const diasRestantes = diffDays - periodo

      setFormData({ ...formData, dias_restantes_meta: diasRestantes.toString() })
    }
  }, [formData.data_meta_projetada, formData.data, formData.periodo])

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

  // Sync quant_atual with quant_inicial for new categories (not yet saved)
  useEffect(() => {
    if (!editingLote) {
      // For new lots, sync quant_atual with quant_inicial only if quant_atual is not set
      const updatedCategorias = formData.categorias.map(cat => ({
        ...cat,
        quant_atual: cat.quant_atual === undefined ? (cat.quant_inicial || undefined) : cat.quant_atual
      }))
      setFormData({ ...formData, categorias: updatedCategorias })
    }
  }, [formData.categorias.map(cat => cat.quant_inicial).join(','), editingLote])

  // Função unificada para recalcular todos os campos dependentes de uma categoria
  const recalcularCategoria = (cat: LoteCategoria): LoteCategoria => {
    let updatedCat = { ...cat }

    // 1. Calcular peso_entrada_arrobas: (peso_entrada_kg_cab * (rc_inicial/100)) / 15
    if (updatedCat.peso_entrada_kg_cab && updatedCat.rc_inicial) {
      const pesoEntradaArrobas = (updatedCat.peso_entrada_kg_cab * (updatedCat.rc_inicial / 100)) / 15
      updatedCat = { ...updatedCat, peso_entrada_arrobas: pesoEntradaArrobas }
    }

    // 2. Calcular período: dias desde data_pesagem até data atual
    if (updatedCat.data_pesagem) {
      const dataPesagem = new Date(updatedCat.data_pesagem)
      const currentDate = new Date()
      const diffTime = currentDate.getTime() - dataPesagem.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      updatedCat = { ...updatedCat, periodo: diffDays > 0 ? diffDays : 0 }
    }

    // 3. Calcular peso_vivo_atual_kg_cab: peso_entrada_kg_cab + (periodo * gmd)
    if (updatedCat.peso_entrada_kg_cab && updatedCat.gmd && updatedCat.periodo) {
      const gmdNumber = parseFloat(updatedCat.gmd.replace(',', '.'))
      const pesoVivoKg = updatedCat.peso_entrada_kg_cab + (updatedCat.periodo * gmdNumber)
      updatedCat = { ...updatedCat, peso_vivo_atual_kg_cab: pesoVivoKg }
    }

    // 3.5. Calcular peso_vivo_atual_arroba_cab: peso_vivo_atual_kg_cab * ((rc_atual / 100) / 15)
    if (updatedCat.peso_vivo_atual_kg_cab && updatedCat.rc_atual) {
      const pesoVivoAtualArroba = updatedCat.peso_vivo_atual_kg_cab * ((updatedCat.rc_atual / 100) / 15)
      updatedCat = { ...updatedCat, peso_vivo_atual_arroba_cab: pesoVivoAtualArroba }
    } else {
      updatedCat = { ...updatedCat, peso_vivo_atual_arroba_cab: undefined }
    }

    // 3.6. Calcular producao_atual_arroba_cab: peso_vivo_atual_arroba_cab - peso_entrada_arrobas
    if (updatedCat.peso_entrada_arrobas && updatedCat.peso_vivo_atual_arroba_cab) {
      const producaoAtualArroba = updatedCat.peso_vivo_atual_arroba_cab - updatedCat.peso_entrada_arrobas
      updatedCat = { ...updatedCat, producao_atual_arroba_cab: producaoAtualArroba }
    } else {
      updatedCat = { ...updatedCat, producao_atual_arroba_cab: undefined }
    }

    // 4. Calcular data_meta_projetada quando peso_vivo_meta_kg_cab, peso_vivo_atual_kg_cab ou gmd mudarem
    const pesoMeta = updatedCat.peso_vivo_meta_kg_cab
    const pesoAtual = updatedCat.peso_vivo_atual_kg_cab
    const gmd = updatedCat.gmd

    if (pesoMeta && pesoAtual && gmd) {
      const gmdNumber = parseFloat(gmd.replace(',', '.'))
      if (gmdNumber > 0) {
        const diasParaMeta = (pesoMeta - pesoAtual) / gmdNumber
        const dataHoje = new Date()
        const dataMeta = new Date(dataHoje.getTime() + (diasParaMeta * 24 * 60 * 60 * 1000))

        // Formatar data como yyyy-mm-dd
        const year = dataMeta.getFullYear()
        const month = String(dataMeta.getMonth() + 1).padStart(2, '0')
        const day = String(dataMeta.getDate()).padStart(2, '0')
        const dataMetaFormatada = `${year}-${month}-${day}`

        updatedCat = { ...updatedCat, data_meta_projetada: dataMetaFormatada }
      }
    }

    // 5. Calcular dias_restantes_meta: dias desde data atual até data_meta_projetada
    if (updatedCat.data_meta_projetada) {
      const dataMeta = new Date(updatedCat.data_meta_projetada)
      const currentDate = new Date()
      const diffTime = dataMeta.getTime() - currentDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      updatedCat = { ...updatedCat, dias_restantes_meta: diffDays > 0 ? diffDays : 0 }
    }

    // 6. Calcular preco_entrada_reais_cab: preco_entrada_reais_kg * peso_entrada_kg_cab
    if (updatedCat.preco_entrada_reais_kg && updatedCat.peso_entrada_kg_cab && updatedCat.peso_entrada_kg_cab > 0) {
      const precoCab = updatedCat.preco_entrada_reais_kg * updatedCat.peso_entrada_kg_cab
      updatedCat = { ...updatedCat, preco_entrada_reais_cab: precoCab }
    }

    // 6.5. Calcular preco_entrada_reais_arroba: preco_entrada_reais_kg * 30
    if (updatedCat.preco_entrada_reais_kg) {
      const precoEntradaArroba = updatedCat.preco_entrada_reais_kg * 30
      updatedCat = { ...updatedCat, preco_entrada_reais_arroba: precoEntradaArroba }
    } else {
      updatedCat = { ...updatedCat, preco_entrada_reais_arroba: undefined }
    }

    // 6.6. Calcular agio_percent: (preco_entrada_reais_arroba - preco_venda_projetado_reais_arroba) / preco_venda_projetado_reais_arroba * 100
    if (updatedCat.preco_entrada_reais_arroba && updatedCat.preco_venda_projetado_reais_arroba && updatedCat.preco_venda_projetado_reais_arroba > 0) {
      const agio = ((updatedCat.preco_entrada_reais_arroba - updatedCat.preco_venda_projetado_reais_arroba) / updatedCat.preco_venda_projetado_reais_arroba) * 100
      updatedCat = { ...updatedCat, agio_percent: agio }
    } else {
      updatedCat = { ...updatedCat, agio_percent: undefined }
    }

    // 6.7. Calcular custo_total_entrada_reais_cab: preco_entrada_reais_cab + custo_frete_reais_cab + custo_comissao_reais_cab + custo_sanidade_reais_cab + custo_identificacao_rastreabilidade_reais_cab
    const custoTotal = (updatedCat.preco_entrada_reais_cab || 0) + 
                       (updatedCat.custo_frete_reais_cab || 0) + 
                       (updatedCat.custo_comissao_reais_cab || 0) + 
                       (updatedCat.custo_sanidade_reais_cab || 0) + 
                       (updatedCat.custo_identificacao_rastreabilidade_reais_cab || 0)
    updatedCat = { ...updatedCat, custo_total_entrada_reais_cab: custoTotal > 0 ? custoTotal : undefined }

    // 6.8. Calcular custo_total_entrada_reais_lote: custo_total_entrada_reais_cab * quant_inicial
    if (updatedCat.custo_total_entrada_reais_cab && updatedCat.quant_inicial) {
      const custoTotalLote = updatedCat.custo_total_entrada_reais_cab * updatedCat.quant_inicial
      updatedCat = { ...updatedCat, custo_total_entrada_reais_lote: custoTotalLote }
    } else {
      updatedCat = { ...updatedCat, custo_total_entrada_reais_lote: undefined }
    }

    // 7. Calcular peso_venda_meta_arroba: peso_vivo_meta_kg_cab * ((rc_final / 100) / 15)
    if (updatedCat.peso_vivo_meta_kg_cab && updatedCat.rc_final) {
      const pesoVendaMetaArroba = updatedCat.peso_vivo_meta_kg_cab * ((updatedCat.rc_final / 100) / 15)
      updatedCat = { ...updatedCat, peso_venda_meta_arroba: Math.round(pesoVendaMetaArroba * 100) / 100 }
    }

    // 7.5. Calcular producao_projetada_arroba_cab: peso_venda_meta_arroba - peso_entrada_arrobas
    if (updatedCat.peso_venda_meta_arroba && updatedCat.peso_entrada_arrobas) {
      const producaoProjetadaArroba = updatedCat.peso_venda_meta_arroba - updatedCat.peso_entrada_arrobas
      updatedCat = { ...updatedCat, producao_projetada_arroba_cab: producaoProjetadaArroba }
    } else {
      updatedCat = { ...updatedCat, producao_projetada_arroba_cab: undefined }
    }

    // 7.6. Calcular venda_total_arroba_lote_categoria: peso_venda_meta_arroba * quant_atual
    if (updatedCat.peso_venda_meta_arroba && updatedCat.quant_atual) {
      const vendaTotalArroba = updatedCat.peso_venda_meta_arroba * updatedCat.quant_atual
      updatedCat = { ...updatedCat, venda_total_arroba_lote_categoria: vendaTotalArroba }
    } else {
      updatedCat = { ...updatedCat, venda_total_arroba_lote_categoria: undefined }
    }

    // 8. Calcular preços de custo e venda
    // Total dias = periodo + dias_restantes_meta
    const totalDias = (updatedCat.periodo || 0) + (updatedCat.dias_restantes_meta || 0)
    
    if (updatedCat.preco_entrada_reais_cab && updatedCat.custo_operacional_reais_cab_dia && totalDias > 0 && updatedCat.quant_atual && updatedCat.peso_venda_meta_arroba) {
      // Custo total por cabeça = custo aquisição + (custo operacional diário * total dias)
      const custoTotalPorCab = updatedCat.preco_entrada_reais_cab + (updatedCat.custo_operacional_reais_cab_dia * totalDias)
      
      // Custo por @ = custo total por cabeça / peso venda meta em arrobas
      const custoPorArroba = custoTotalPorCab / updatedCat.peso_venda_meta_arroba
      
      updatedCat = { ...updatedCat, preco_custo_cab: custoTotalPorCab, preco_custo_reais_arroba: custoPorArroba }
      
      // Preço de venda sugerido é inserido manualmente pelo usuário, não calculado
    } else {
      updatedCat = { ...updatedCat, preco_custo_cab: undefined, preco_custo_reais_arroba: undefined }
    }

    // 9. Calcular preco_venda_sugerido_cab: preco_venda_projetado_reais_arroba * peso_venda_meta_arroba
    if (updatedCat.preco_venda_projetado_reais_arroba && updatedCat.peso_venda_meta_arroba) {
      const precoVendaSugeridoCab = updatedCat.preco_venda_projetado_reais_arroba * updatedCat.peso_venda_meta_arroba
      updatedCat = { ...updatedCat, preco_venda_sugerido_cab: precoVendaSugeridoCab }
    } else {
      updatedCat = { ...updatedCat, preco_venda_sugerido_cab: undefined }
    }

    // 10. Calcular faturamento_projetado_reais_lote_categoria: preco_venda_sugerido_cab * quant_atual
    if (updatedCat.preco_venda_sugerido_cab && updatedCat.quant_atual) {
      const faturamentoProjetado = updatedCat.preco_venda_sugerido_cab * updatedCat.quant_atual
      updatedCat = { ...updatedCat, faturamento_projetado_reais_lote_categoria: faturamentoProjetado }
    } else {
      updatedCat = { ...updatedCat, faturamento_projetado_reais_lote_categoria: undefined }
    }

    return updatedCat
  }

  // Recalcular todas as categorias quando qualquer campo dependente mudar
  useEffect(() => {
    const updatedCategorias = formData.categorias.map(recalcularCategoria)
    setFormData({ ...formData, categorias: updatedCategorias })
  }, [
    formData.categorias.map(cat => cat.peso_entrada_kg_cab).join(','),
    formData.categorias.map(cat => cat.rc_inicial).join(','),
    formData.categorias.map(cat => cat.data_pesagem).join(','),
    formData.categorias.map(cat => cat.gmd).join(','),
    formData.categorias.map(cat => cat.peso_vivo_meta_kg_cab).join(','),
    formData.categorias.map(cat => cat.rc_final).join(','),
    formData.categorias.map(cat => cat.rc_atual).join(','),
    formData.categorias.map(cat => cat.preco_entrada_reais_kg).join(','),
    formData.categorias.map(cat => cat.custo_operacional_reais_cab_dia).join(','),
    formData.categorias.map(cat => cat.preco_venda_projetado_reais_arroba).join(','),
    formData.categorias.map(cat => cat.peso_venda_meta_arroba).join(','),
    formData.categorias.map(cat => cat.periodo).join(','),
    formData.categorias.map(cat => cat.dias_restantes_meta).join(','),
    formData.categorias.map(cat => cat.quant_atual).join(','),
    formData.categorias.map(cat => cat.custo_frete_reais_cab).join(','),
    formData.categorias.map(cat => cat.custo_comissao_reais_cab).join(','),
    formData.categorias.map(cat => cat.custo_sanidade_reais_cab).join(','),
    formData.categorias.map(cat => cat.custo_identificacao_rastreabilidade_reais_cab).join(','),
    formData.categorias.map(cat => cat.quant_inicial).join(','),
  ])

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

    // Buscar lotes com suas categorias
    const { data: lotesData, error: lotesError } = await supabase
      .from('lotes')
      .select(`
        *,
        pastos (nome)
      `)
      .eq('fazenda_id', fazendaId)
      .order('nome', { ascending: true })

    if (lotesError) {
      console.error('Erro ao buscar lotes:', lotesError)
      setLoading(false)
      return
    }

    // Buscar categorias para cada lote
    const loteIds = lotesData?.map(l => l.id) || []
    const { data: categoriasData, error: categoriasError } = await supabase
      .from('lote_categorias')
      .select('*')
      .in('lote_id', loteIds)

    if (categoriasError) {
      console.error('Erro ao buscar categorias:', categoriasError)
    }

    // Combinar lotes com suas categorias
    const lotesComCategorias = await Promise.all(
      (lotesData || []).map(async (lote) => {
        const categorias = (categoriasData || []).filter(cat => cat.lote_id === lote.id)
        return {
          ...lote,
          pasto_nome: lote.pastos?.nome,
          categorias: categorias
        }
      })
    )

    setLotes(lotesComCategorias as Lote[])
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

    // Validar categorias
    if (formData.categorias.length === 0) {
      alert('Selecione pelo menos uma categoria')
      setSubmitting(false)
      return
    }

    const loteData = {
      fazenda_id: fazendaId,
      nome: formData.nome,
      n_cabecas: formData.numero_cabecas ? parseInt(formData.numero_cabecas) : null,
      qtd_bezerros: formData.quantidade_bezerros ? parseInt(formData.quantidade_bezerros) : null,
      ativo: formData.ativo,
      pasto_id: formData.pasto_id || null,
      sistema_producao: formData.sistema_producao || null,
      meta_intervalo_rodeio_dias: formData.meta_intervalo_rodeio_dias ? parseInt(formData.meta_intervalo_rodeio_dias) : null,
      produtor_rural: formData.produtor_rural || null,
      propriedade_origem: formData.propriedade_origem || null,
      numero_contrato: formData.numero_contrato || null,
      mes_competencia: formData.mes_competencia || null,
      data_liberacao_sisbov: formData.data_liberacao_sisbov || null,
      periodo_liberacao_sisbov: formData.periodo_liberacao_sisbov || null,
      data_embarque_prevista: formData.data_embarque_prevista || null,
    }

    let loteId: string
    let error

    if (editingLote) {
      // Atualizar lote existente
      const { error: updateError } = await supabase
        .from('lotes')
        .update(loteData)
        .eq('id', editingLote.id)
        .select()
        .single()
      error = updateError
      loteId = editingLote.id

      // Remover categorias antigas
      await supabase
        .from('lote_categorias')
        .delete()
        .eq('lote_id', loteId)
    } else {
      // Criar novo lote
      const { data: newLote, error: insertError } = await supabase
        .from('lotes')
        .insert(loteData)
        .select()
        .single()
      error = insertError
      loteId = newLote?.id || ''
    }

    if (error) {
      console.error('Erro ao salvar lote:', error)
      setSubmitting(false)
      return
    }

    // Recalculate all categories to ensure calculated fields are up-to-date before saving
    const recalculatedCategorias = formData.categorias.map(recalcularCategoria)

    // Salvar categorias em lote_categorias
    const categoriasToInsert = recalculatedCategorias.map(cat => ({
      lote_id: loteId,
      categoria: cat.categoria,
      quant_inicial: cat.quant_inicial ? parseInt(cat.quant_inicial.toString()) : null,
      data_pesagem: cat.data_pesagem || null,
      peso_entrada_kg_cab: cat.peso_entrada_kg_cab ? parseFloat(cat.peso_entrada_kg_cab.toString()) : null,
      peso_entrada_arrobas: cat.peso_entrada_arrobas ? parseFloat(cat.peso_entrada_arrobas.toString()) : null,
      gmd: cat.gmd?.toString() || null,
      periodo: cat.periodo ? parseInt(cat.periodo.toString()) : null,
      rc_inicial: cat.rc_inicial ? parseFloat(cat.rc_inicial.toString()) : null,
      rc_final: cat.rc_final ? parseFloat(cat.rc_final.toString()) : null,
      rc_atual: cat.rc_atual ? parseFloat(cat.rc_atual.toString()) : null,
      quant_atual: cat.quant_atual ? parseInt(cat.quant_atual.toString()) : null,
      peso_vivo_atual_kg_cab: cat.peso_vivo_atual_kg_cab ? parseFloat(cat.peso_vivo_atual_kg_cab.toString()) : null,
      peso_vivo_atual_arroba_cab: cat.peso_vivo_atual_arroba_cab ? parseFloat(cat.peso_vivo_atual_arroba_cab.toString()) : null,
      producao_atual_arroba_cab: cat.producao_atual_arroba_cab ? parseFloat(cat.producao_atual_arroba_cab.toString()) : null,
      peso_vivo_meta_kg_cab: cat.peso_vivo_meta_kg_cab ? parseFloat(cat.peso_vivo_meta_kg_cab.toString()) : null,
      peso_venda_meta_arroba: cat.peso_venda_meta_arroba ? parseFloat(cat.peso_venda_meta_arroba.toString()) : null,
      producao_projetada_arroba_cab: cat.producao_projetada_arroba_cab ? parseFloat(cat.producao_projetada_arroba_cab.toString()) : null,
      venda_total_arroba_lote_categoria: cat.venda_total_arroba_lote_categoria ? parseFloat(cat.venda_total_arroba_lote_categoria.toString()) : null,
      dias_restantes_meta: cat.dias_restantes_meta ? parseInt(cat.dias_restantes_meta.toString()) : null,
      data_meta_projetada: cat.data_meta_projetada || null,
      estrategia_nutricional: cat.estrategia_nutricional || null,
      raca: cat.raca || null,
      sexo: cat.sexo || null,
      idade: cat.idade ? parseInt(cat.idade.toString()) : null,
      preco_entrada_reais_kg: cat.preco_entrada_reais_kg ? parseFloat(cat.preco_entrada_reais_kg.toString()) : null,
      preco_entrada_reais_arroba: cat.preco_entrada_reais_arroba ? parseFloat(cat.preco_entrada_reais_arroba.toString()) : null,
      preco_entrada_reais_cab: cat.preco_entrada_reais_cab ? parseFloat(cat.preco_entrada_reais_cab.toString()) : null,
      agio_percent: cat.agio_percent ? parseFloat(cat.agio_percent.toString()) : null,
      custo_operacional_reais_cab_dia: cat.custo_operacional_reais_cab_dia ? parseFloat(cat.custo_operacional_reais_cab_dia.toString()) : null,
      margem_lucro_percent: cat.margem_lucro_percent ? parseFloat(cat.margem_lucro_percent.toString()) : null,
      preco_custo_reais_arroba: cat.preco_custo_reais_arroba ? parseFloat(cat.preco_custo_reais_arroba.toString()) : null,
      preco_custo_cab: cat.preco_custo_cab ? parseFloat(cat.preco_custo_cab.toString()) : null,
      preco_venda_projetado_reais_arroba: cat.preco_venda_projetado_reais_arroba ? parseFloat(cat.preco_venda_projetado_reais_arroba.toString()) : null,
      preco_venda_sugerido_cab: cat.preco_venda_sugerido_cab ? parseFloat(cat.preco_venda_sugerido_cab.toString()) : null,
      faturamento_projetado_reais_lote_categoria: cat.faturamento_projetado_reais_lote_categoria ? parseFloat(cat.faturamento_projetado_reais_lote_categoria.toString()) : null,
      morte: cat.morte ? parseInt(cat.morte.toString()) : 0,
      consumo: cat.consumo ? parseInt(cat.consumo.toString()) : 0,
      abate: cat.abate ? parseInt(cat.abate.toString()) : 0,
      transf_entrada: cat.transf_entrada ? parseInt(cat.transf_entrada.toString()) : 0,
      transf_saida: cat.transf_saida ? parseInt(cat.transf_saida.toString()) : 0,
      qtd_bezerros: cat.qtd_bezerros ? parseInt(cat.qtd_bezerros.toString()) : null,
      consumo_meta_porcentagem_pesovivo: cat.consumo_meta_porcentagem_pesovivo ? parseFloat(cat.consumo_meta_porcentagem_pesovivo.toString()) : null,
      custo_frete_reais_cab: cat.custo_frete_reais_cab ? parseFloat(cat.custo_frete_reais_cab.toString()) : null,
      custo_comissao_reais_cab: cat.custo_comissao_reais_cab ? parseFloat(cat.custo_comissao_reais_cab.toString()) : null,
      custo_sanidade_reais_cab: cat.custo_sanidade_reais_cab ? parseFloat(cat.custo_sanidade_reais_cab.toString()) : null,
      custo_identificacao_rastreabilidade_reais_cab: cat.custo_identificacao_rastreabilidade_reais_cab ? parseFloat(cat.custo_identificacao_rastreabilidade_reais_cab.toString()) : null,
      custo_total_entrada_reais_cab: cat.custo_total_entrada_reais_cab ? parseFloat(cat.custo_total_entrada_reais_cab.toString()) : null,
      custo_total_entrada_reais_lote: cat.custo_total_entrada_reais_lote ? parseFloat(cat.custo_total_entrada_reais_lote.toString()) : null,
      ativo: cat.ativo ?? true,
    }))

    const { error: categoriasError } = await supabase
      .from('lote_categorias')
      .insert(categoriasToInsert)

    if (categoriasError) {
      console.error('Erro ao salvar categorias:', categoriasError)
      console.error('Categorias data:', categoriasToInsert)
      alert('Erro ao salvar categorias: ' + categoriasError.message)
      setSubmitting(false)
      return
    } else {
      setFormData({
        nome: '',
        numero_cabecas: '',
        categorias: [] as LoteCategoria[],
        categoria_outros: '',
        peso_vivo_atual_kg_cab: '',
        peso_vivo_meta_kg_cab: '',
        data_meta_projetada: '',
        quantidade_bezerros: '',
        quant_inicial: '',
        data: '',
        peso_entrada_kg_cab: '',
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
        meta_intervalo_rodeio_dias: '',
        rc_inicial: '',
        preco_entrada_reais_kg: '',
        preco_entrada_reais_cab: '',
        custo_operacional_reais_cab_dia: '',
        margem_lucro_percent: '',
        raca: '',
        sexo: '',
        idade: '',
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

  const handleEdit = async (lote: Lote) => {
    setEditingLote(lote)

    // Fetch categories with quant_atual from lote_categorias
    const { data: categoriasData } = await supabase
      .from('lote_categorias')
      .select('*')
      .eq('lote_id', lote.id)

    const updatedCategorias = categoriasData || lote.categorias || []

    // Update categorias to include new fields if not present
    const categoriasWithMeta = updatedCategorias.map(cat => ({
      ...cat,
      consumo_meta_porcentagem_pesovivo: cat.consumo_meta_porcentagem_pesovivo ?? undefined,
      rc_final: cat.rc_final ?? undefined,
      rc_atual: cat.rc_atual ?? undefined,
      peso_venda_meta_arroba: cat.peso_venda_meta_arroba ?? undefined,
      peso_vivo_atual_arroba_cab: cat.peso_vivo_atual_arroba_cab ?? undefined,
      producao_atual_arroba_cab: cat.producao_atual_arroba_cab ?? undefined,
      producao_projetada_arroba_cab: cat.producao_projetada_arroba_cab ?? undefined,
      venda_total_arroba_lote_categoria: cat.venda_total_arroba_lote_categoria ?? undefined,
      preco_entrada_reais_arroba: cat.preco_entrada_reais_arroba ?? undefined,
      agio_percent: cat.agio_percent ?? undefined,
      margem_lucro_percent: cat.margem_lucro_percent ?? undefined,
      preco_custo_reais_arroba: cat.preco_custo_reais_arroba ?? undefined,
      preco_custo_cab: cat.preco_custo_cab ?? undefined,
      preco_venda_projetado_reais_arroba: cat.preco_venda_projetado_reais_arroba ?? undefined,
      preco_venda_sugerido_cab: cat.preco_venda_sugerido_cab ?? undefined,
      faturamento_projetado_reais_lote_categoria: cat.faturamento_projetado_reais_lote_categoria ?? undefined,
      custo_frete_reais_cab: cat.custo_frete_reais_cab ?? undefined,
      custo_comissao_reais_cab: cat.custo_comissao_reais_cab ?? undefined,
      custo_sanidade_reais_cab: cat.custo_sanidade_reais_cab ?? undefined,
      custo_identificacao_rastreabilidade_reais_cab: cat.custo_identificacao_rastreabilidade_reais_cab ?? undefined,
      custo_total_entrada_reais_cab: cat.custo_total_entrada_reais_cab ?? undefined,
      custo_total_entrada_reais_lote: cat.custo_total_entrada_reais_lote ?? undefined
    }))

    // Fetch movimentation data for this lot
    if (!user) return
    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (vinculos && vinculos.length > 0) {
      const fazendaId = vinculos[0].fazenda_id

      // Fetch movimentacao data
      const { data: movData } = await supabase
        .from('registros_movimentacao')
        .select('*')
        .or(`lote_origem_id.eq.${lote.id},lote_destino_id.eq.${lote.id}`)
        .eq('fazenda_id', fazendaId)
        .is('deleted_at', null)
        .order('data', { ascending: false })

      setMovimentacaoData(movData || [])

      // Fetch maternidade data
      const { data: matData } = await supabase
        .from('registros_maternidade')
        .select('*')
        .eq('lote_id', lote.id)
        .eq('fazenda_id', fazendaId)
        .is('deleted_at', null)
        .order('data', { ascending: false })

      setMaternidadeData(matData || [])

      // Fetch morte data
      const { data: morData } = await supabase
        .from('registros_morte')
        .select('*')
        .eq('lote_id', lote.id)
        .eq('fazenda_id', fazendaId)
        .is('deleted_at', null)
        .order('data', { ascending: false })

      setMorteData(morData || [])
    }

    setFormData({
      nome: lote.nome,
      numero_cabecas: lote.n_cabecas?.toString() || '',
      categorias: categoriasWithMeta,
      categoria_outros: '',
      peso_vivo_atual_kg_cab: lote.peso_vivo_atual_kg_cab?.toString() || '',
      peso_vivo_meta_kg_cab: lote.peso_vivo_meta_kg_cab?.toString() || '',
      data_meta_projetada: lote.data_meta_projetada || '',
      quantidade_bezerros: lote.qtd_bezerros?.toString() || '',
      quant_inicial: lote.quant_inicial?.toString() || '',
      data: lote.data_pesagem || '',
      peso_entrada_kg_cab: lote.peso_entrada_kg_cab?.toString() || '',
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
      meta_intervalo_rodeio_dias: lote.meta_intervalo_rodeio_dias?.toString() || '',
      rc_inicial: lote.rc_inicial?.toString() || '',
      preco_entrada_reais_kg: lote.preco_entrada_reais_kg?.toString() || '',
      preco_entrada_reais_cab: lote.preco_entrada_reais_cab?.toString() || '',
      custo_operacional_reais_cab_dia: lote.custo_operacional_reais_cab_dia?.toString() || '',
      margem_lucro_percent: lote.margem_lucro_percent?.toString() || '',
      raca: lote.raca || '',
      sexo: lote.sexo || '',
      idade: lote.idade?.toString() || '',
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
      peso_vivo_atual_kg_cab: '',
      peso_vivo_meta_kg_cab: '',
      data_meta_projetada: '',
      quantidade_bezerros: '',
      quant_inicial: '',
      data: '',
      peso_entrada_kg_cab: '',
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
      meta_intervalo_rodeio_dias: '',
      rc_inicial: '',
      preco_entrada_reais_kg: '',
      preco_entrada_reais_cab: '',
      custo_operacional_reais_cab_dia: '',
      margem_lucro_percent: '',
      raca: '',
      sexo: '',
      idade: '',
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
    {
      key: 'Escape',
      description: 'Fechar formulário',
      action: () => {
        if (showForm) handleCancel()
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
            <Button onClick={() => {
              setShowForm(true)
              setEditingLote(null)
              setMovimentacaoData([])
              setMaternidadeData([])
              setMorteData([])
            }} className="h-10">Novo Lote</Button>
          </div>
        </div>
      )}

      {showForm && (
        <Card className="bg-white p-6 border-0 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-gray-800">
              {editingLote ? 'Editar Lote' : 'Novo Lote'}
            </h3>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="Fechar formulário"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sistema de Produção <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.sistema_producao}
                    onChange={(e) => setFormData({ ...formData, sistema_producao: e.target.value })}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:border-accent"
                  >
                    <option value="">Selecione</option>
                    <option value="Cria">Cria</option>
                    <option value="Confinamento">Confinamento</option>
                    <option value="Engorda">Engorda</option>
                    <option value="Recria">Recria</option>
                    <option value="RIP">RIP</option>
                    <option value="Sequestro">Sequestro</option>
                    <option value="TIP">TIP</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta de Intervalo de Rodeio (dias)
                  </label>
                  <NumericInput
                    value={formData.meta_intervalo_rodeio_dias}
                    onChange={(value) => setFormData({ ...formData, meta_intervalo_rodeio_dias: value })}
                    placeholder="Dias"
                    decimalPlaces={0}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categorias <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {categoriasOpcoes.map((categoria) => {
                    const isSelected = formData.categorias.some(c => c.categoria.toLowerCase() === categoria.toLowerCase())
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

              {/* Dados Específicos por Categoria */}
              {formData.categorias.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Dados por Categoria</h4>
                  {formData.categorias.map((cat, catIndex) => (
                    <div key={catIndex} className="mb-10 p-6 bg-white rounded-xl border-2 border-gray-300 shadow-md">
                      <h5 className={`text-xl font-bold text-gray-800 mb-5 capitalize border-l-4 pl-4 py-2 bg-gray-50 rounded-r ${getCategoriaColor(cat.categoria)}`}>
                        Categoria: {cat.categoria}
                      </h5>
                      
                      {/* Identificação */}
                      <div className="mb-5">
                        <h6 className={`text-sm font-bold text-gray-800 mb-3 border-l-3 pl-3 py-1 rounded-r ${getCategoriaColor(cat.categoria)} ${getCategoriaBgColor(cat.categoria)}`}>
                          Identificação
                        </h6>
                        <div className="grid grid-cols-6 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Raça <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={cat.raca || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, raca: e.target.value }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              required
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:border-accent"
                            >
                              <option value="">Selecione</option>
                              {racas.map((raca) => (
                                <option key={raca.id} value={raca.nome}>{raca.nome}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Sexo <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={cat.sexo || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, sexo: e.target.value }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
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
                              value={cat.idade?.toString() || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, idade: e.target.value ? parseInt(e.target.value) : undefined }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              required
                              placeholder="Ex: 24"
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Quantidade e Datas */}
                      <div className="mb-5 border-t border-gray-200 pt-4">
                        <h6 className={`text-sm font-bold text-gray-800 mb-3 border-l-3 pl-3 py-1 rounded-r ${getCategoriaColor(cat.categoria)} ${getCategoriaBgColor(cat.categoria)}`}>
                          Quantidade e Datas
                        </h6>
                        <div className="grid grid-cols-6 gap-2">
                          <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quant. Inicial (cab)
                            </label>
                            <Input
                              type="number"
                              value={cat.quant_inicial?.toString() || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                const val = e.target.value ? parseFloat(e.target.value) : undefined
                                updatedCategorias[catIndex] = { ...cat, quant_inicial: val, quant_atual: val }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              placeholder="0"
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quant. Atual (cab)
                            </label>
                            <Input
                              type="number"
                              value={cat.quant_atual?.toString() || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, quant_atual: e.target.value ? parseFloat(e.target.value) : undefined }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              placeholder="0"
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Data Entrada
                            </label>
                            <Input
                              type="date"
                              value={cat.data_pesagem || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, data_pesagem: e.target.value }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                          <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Período (dias)
                            </label>
                            <Input
                              type="number"
                              value={cat.periodo?.toString() || ''}
                              disabled
                              placeholder="0"
                              className="border-gray-200 focus:border-accent opacity-60"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              GMD (kg/cab/dia)
                            </label>
                            <NumericInput
                              value={cat.gmd?.toString() || ''}
                              onChange={() => {}}
                              placeholder="0,000"
                              decimalPlaces={3}
                              disabled
                              className="border-gray-200 focus:border-accent opacity-60"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-6 gap-2 mt-2">
                          <div className="col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Estratégia Nutricional
                            </label>
                            <GroupedSelect
                              options={nutritionalOptions}
                              value={cat.estrategia_nutricional || ''}
                              onChange={(value) => {
                                const updatedCategorias = [...formData.categorias]
                                const selectedOption = nutritionalOptions.find(opt => opt.name === value)
                                updatedCategorias[catIndex] = {
                                  ...cat,
                                  estrategia_nutricional: value,
                                  consumo_meta_porcentagem_pesovivo: selectedOption?.consumo_meta !== undefined && selectedOption?.consumo_meta !== null ? Number(selectedOption.consumo_meta) : undefined,
                                  gmd: selectedOption?.gmd !== undefined && selectedOption?.gmd !== null ? selectedOption.gmd.toFixed(3).replace('.', ',') : undefined
                                }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              placeholder="Selecione..."
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Consumo Meta (%/PV)
                            </label>
                            <Input
                              type="text"
                              value={cat.consumo_meta_porcentagem_pesovivo !== undefined && cat.consumo_meta_porcentagem_pesovivo !== null ? Number(cat.consumo_meta_porcentagem_pesovivo).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                              disabled
                              placeholder="0,00"
                              className="bg-gray-50 border-gray-200 focus:border-accent opacity-60"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Peso e Performance */}
                      <div className="mb-5 border-t border-gray-200 pt-4">
                        <h6 className={`text-sm font-bold text-gray-800 mb-3 border-l-3 pl-3 py-1 rounded-r ${getCategoriaColor(cat.categoria)} ${getCategoriaBgColor(cat.categoria)}`}>
                          Peso e Performance
                        </h6>
                        
                        {/* Entrada */}
                        <div className="mb-4">
                          <span className="text-sm font-bold text-gray-700 mb-2 block border-b border-gray-300 pb-1">Entrada</span>
                          <div className="grid grid-cols-6 gap-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Peso Entrada (kg/cab)
                              </label>
                              <NumericInput
                                value={cat.peso_entrada_kg_cab?.toString() || ''}
                                onChange={(value) => {
                                  const updatedCategorias = [...formData.categorias]
                                  updatedCategorias[catIndex] = { ...cat, peso_entrada_kg_cab: value ? parseFloat(value.replace(',', '.')) : undefined }
                                  setFormData({ ...formData, categorias: updatedCategorias })
                                }}
                                placeholder="0,00"
                                decimalPlaces={2}
                                className="border-gray-200 focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                RC Inicial (%)
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                value={cat.rc_inicial?.toString() || ''}
                                onChange={(e) => {
                                  const updatedCategorias = [...formData.categorias]
                                  updatedCategorias[catIndex] = { ...cat, rc_inicial: e.target.value ? parseFloat(e.target.value) : undefined }
                                  setFormData({ ...formData, categorias: updatedCategorias })
                                }}
                                placeholder="Ex: 50"
                                className="border-gray-200 focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Peso Entrada (@/cab)
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                value={cat.peso_entrada_arrobas?.toFixed(2) || ''}
                                disabled
                                placeholder="0"
                                className="border-gray-200 focus:border-accent opacity-60"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Atual */}
                        <div className="mb-4">
                          <span className="text-sm font-bold text-gray-700 mb-2 block border-b border-gray-300 pb-1">Atual</span>
                          <div className="grid grid-cols-6 gap-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Peso Vivo Atual (kg/cab)
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                value={cat.peso_vivo_atual_kg_cab?.toFixed(2) || ''}
                                disabled
                                placeholder="0"
                                className="border-gray-200 focus:border-accent opacity-60"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                RC Atual (%)
                              </label>
                              <NumericInput
                                value={cat.rc_atual?.toString() || ''}
                                onChange={(value) => {
                                  const updatedCategorias = [...formData.categorias]
                                  updatedCategorias[catIndex] = { ...cat, rc_atual: value ? parseFloat(value.replace(',', '.')) : undefined }
                                  setFormData({ ...formData, categorias: updatedCategorias })
                                }}
                                decimalPlaces={2}
                                className="border-gray-200 focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Peso Vivo Atual (@/cab)
                              </label>
                              <Input
                                type="text"
                                value={cat.peso_vivo_atual_arroba_cab ? cat.peso_vivo_atual_arroba_cab.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                disabled
                                placeholder="0"
                                className="border-gray-200 focus:border-accent opacity-60"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Produção Atual (@/cab)
                              </label>
                              <Input
                                type="text"
                                value={cat.producao_atual_arroba_cab ? cat.producao_atual_arroba_cab.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                disabled
                                placeholder="0"
                                className="bg-gray-50 border-gray-200 focus:border-accent opacity-60"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="mb-4">
                          <span className="text-sm font-bold text-gray-700 mb-2 block border-b border-gray-300 pb-1">Meta</span>
                          <div className="grid grid-cols-6 gap-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Peso Vivo Meta (kg/cab)
                              </label>
                              <NumericInput
                                value={cat.peso_vivo_meta_kg_cab?.toString() || ''}
                                onChange={(value) => {
                                  const updatedCategorias = [...formData.categorias]
                                  updatedCategorias[catIndex] = { ...cat, peso_vivo_meta_kg_cab: value ? parseFloat(value.replace(',', '.')) : undefined }
                                  setFormData({ ...formData, categorias: updatedCategorias })
                                }}
                                placeholder="0,00"
                                decimalPlaces={2}
                                className="border-gray-200 focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                RC Final (%)
                              </label>
                              <NumericInput
                                value={cat.rc_final?.toString() || ''}
                                onChange={(value) => {
                                  const updatedCategorias = [...formData.categorias]
                                  updatedCategorias[catIndex] = { ...cat, rc_final: value ? parseFloat(value.replace(',', '.')) : undefined }
                                  setFormData({ ...formData, categorias: updatedCategorias })
                                }}
                                placeholder="0,00"
                                decimalPlaces={2}
                                className="border-gray-200 focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Peso Venda Meta (@/cab)
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                value={cat.peso_venda_meta_arroba?.toFixed(2) || ''}
                                readOnly
                                placeholder="Calculado automaticamente"
                                className="bg-gray-50 border-gray-200 focus:border-accent opacity-60"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Produção Projetada (@/cab)
                              </label>
                              <Input
                                type="text"
                                value={cat.producao_projetada_arroba_cab ? cat.producao_projetada_arroba_cab.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                disabled
                                placeholder="0"
                                className="bg-gray-50 border-gray-200 focus:border-accent opacity-60"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Venda Total Projetada (@/Lote/Categoria)
                              </label>
                              <Input
                                type="text"
                                value={cat.venda_total_arroba_lote_categoria ? cat.venda_total_arroba_lote_categoria.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : ''}
                                disabled
                                placeholder="0"
                                className="bg-gray-50 border-gray-200 focus:border-accent opacity-60"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-6 gap-2 mt-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data Meta Projetada
                              </label>
                              <Input
                                type="date"
                                value={cat.data_meta_projetada || ''}
                                disabled
                                className="border-gray-200 focus:border-accent opacity-60"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Dias Restantes Meta
                              </label>
                              <Input
                                type="number"
                                value={cat.dias_restantes_meta?.toString() || ''}
                                disabled
                                placeholder="0"
                                className="border-gray-200 focus:border-accent opacity-60"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Financeiro */}
                      <div className="mb-5 border-t border-gray-200 pt-4">
                        <h6 className={`text-sm font-bold text-gray-800 mb-3 border-l-3 pl-3 py-1 rounded-r ${getCategoriaColor(cat.categoria)} ${getCategoriaBgColor(cat.categoria)}`}>
                          Financeiro
                        </h6>
                        <div className="grid grid-cols-6 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Preço Entrada (R$/kg)
                            </label>
                            <NumericInput
                              value={cat.preco_entrada_reais_kg?.toString() || ''}
                              onChange={(value) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, preco_entrada_reais_kg: value ? parseFloat(value.replace(',', '.')) : undefined }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              decimalPlaces={2}
                              prefix="R$"
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Preço Entrada (R$/@)
                            </label>
                            <Input
                              type="text"
                              value={cat.preco_entrada_reais_arroba ? `R$ ${cat.preco_entrada_reais_arroba.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                              disabled
                              placeholder="R$ 0,00"
                              className="bg-gray-50 border-gray-200 focus:border-accent opacity-60"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Ágio (%)
                            </label>
                            <Input
                              type="text"
                              value={cat.agio_percent !== undefined ? `${cat.agio_percent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : ''}
                              disabled
                              placeholder="0,00%"
                              className="bg-gray-50 border-gray-200 focus:border-accent opacity-60"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Preço Entrada (R$/cab)
                            </label>
                            <Input
                              type="text"
                              step="0.01"
                              value={cat.preco_entrada_reais_cab ? `R$ ${cat.preco_entrada_reais_cab.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                              disabled
                              placeholder="R$ 0,00"
                              className="border-gray-200 focus:border-accent opacity-60"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1 whitespace-nowrap">
                              Custo Operacional (R$/cab/dia)
                            </label>
                            <NumericInput
                              value={cat.custo_operacional_reais_cab_dia?.toString() || ''}
                              onChange={(value) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, custo_operacional_reais_cab_dia: value ? parseFloat(value.replace(',', '.')) : undefined }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              decimalPlaces={2}
                              prefix="R$"
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-6 gap-2 mt-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Custo Frete (R$/cab)
                            </label>
                            <NumericInput
                              value={cat.custo_frete_reais_cab?.toString() || ''}
                              onChange={(value) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, custo_frete_reais_cab: value ? parseFloat(value.replace(',', '.')) : undefined }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              placeholder="0,00"
                              decimalPlaces={2}
                              prefix="R$"
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Custo Comissão (R$/cab)
                            </label>
                            <NumericInput
                              value={cat.custo_comissao_reais_cab?.toString() || ''}
                              onChange={(value) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, custo_comissao_reais_cab: value ? parseFloat(value.replace(',', '.')) : undefined }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              placeholder="0,00"
                              decimalPlaces={2}
                              prefix="R$"
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Custo Sanidade (R$/cab)
                            </label>
                            <NumericInput
                              value={cat.custo_sanidade_reais_cab?.toString() || ''}
                              onChange={(value) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, custo_sanidade_reais_cab: value ? parseFloat(value.replace(',', '.')) : undefined }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              placeholder="0,00"
                              decimalPlaces={2}
                              prefix="R$"
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Custo Identificação/Rastreabilidade (R$/cab)
                            </label>
                            <NumericInput
                              value={cat.custo_identificacao_rastreabilidade_reais_cab?.toString() || ''}
                              onChange={(value) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, custo_identificacao_rastreabilidade_reais_cab: value ? parseFloat(value.replace(',', '.')) : undefined }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              placeholder="0,00"
                              decimalPlaces={2}
                              prefix="R$"
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                        </div>
                        
                        <div className="mt-2 flex gap-2">
                          <div className="max-w-xs">
                            <label className="block text-sm font-medium text-gray-700 mb-1 whitespace-nowrap">
                              Custo Total Entrada (R$/cab)
                            </label>
                            <Input
                              type="text"
                              value={cat.custo_total_entrada_reais_cab !== undefined ? `R$ ${cat.custo_total_entrada_reais_cab.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                              disabled
                              placeholder="R$ 0,00"
                              className="bg-gray-50 border-gray-200 focus:border-accent opacity-60"
                            />
                          </div>
                          <div className="max-w-xs">
                            <label className="block text-sm font-medium text-gray-700 mb-1 whitespace-nowrap">
                              Custo Total Entrada (R$/Lote)
                            </label>
                            <Input
                              type="text"
                              value={cat.custo_total_entrada_reais_lote !== undefined ? `R$ ${cat.custo_total_entrada_reais_lote.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                              disabled
                              placeholder="R$ 0,00"
                              className="bg-gray-50 border-gray-200 focus:border-accent opacity-60"
                            />
                          </div>
                        </div>
                        
                        {/* Calculated Prices */}
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                          <h6 className="text-sm font-semibold text-blue-800 mb-3">Preços Sugeridos de Venda</h6>
                          <div className="grid grid-cols-6 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-blue-700 mb-1">
                                Preço Custo (R$/@)
                              </label>
                              <Input
                                type="text"
                                value={cat.preco_custo_reais_arroba ? `R$ ${cat.preco_custo_reais_arroba.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                                disabled
                                placeholder="R$ 0,00"
                                className="bg-gray-100 border-blue-200 focus:border-blue-500 opacity-80 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-blue-700 mb-1">
                                Preço Custo (R$/cab)
                              </label>
                              <Input
                                type="text"
                                value={cat.preco_custo_cab ? `R$ ${cat.preco_custo_cab.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                                disabled
                                placeholder="R$ 0,00"
                                className="bg-gray-100 border-blue-200 focus:border-blue-500 opacity-80 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-green-700 mb-1">
                                Preço Venda Projetado (R$/@)
                              </label>
                              <NumericInput
                                value={cat.preco_venda_projetado_reais_arroba?.toString() || ''}
                                onChange={(value) => {
                                  const updatedCategorias = [...formData.categorias]
                                  updatedCategorias[catIndex] = { ...cat, preco_venda_projetado_reais_arroba: value ? parseFloat(value.replace(',', '.')) : undefined }
                                  setFormData({ ...formData, categorias: updatedCategorias })
                                }}
                                placeholder="R$ 0,00"
                                decimalPlaces={2}
                                prefix="R$"
                                className="bg-white border-green-300 focus:border-green-500 opacity-90 text-xs font-semibold text-green-700"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-green-700 mb-1">
                                Preço Venda Sugerido (R$/cab)
                              </label>
                              <Input
                                type="text"
                                value={cat.preco_venda_sugerido_cab ? `R$ ${cat.preco_venda_sugerido_cab.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                                disabled
                                placeholder="R$ 0,00"
                                className="bg-gray-100 border-green-300 focus:border-green-500 opacity-90 text-xs font-semibold text-green-700"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-green-700 mb-1">
                                Faturamento Projetado (R$/Lote/Categoria)
                              </label>
                              <Input
                                type="text"
                                value={cat.faturamento_projetado_reais_lote_categoria ? `R$ ${cat.faturamento_projetado_reais_lote_categoria.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                                disabled
                                placeholder="R$ 0,00"
                                className="bg-gray-100 border-green-300 focus:border-green-500 opacity-90 text-xs font-semibold text-green-700"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1 whitespace-nowrap">
                            Margem de Lucro (%)
                          </label>
                          <NumericInput
                            value={cat.margem_lucro_percent?.toString() || ''}
                            onChange={(value) => {
                              const updatedCategorias = [...formData.categorias]
                              updatedCategorias[catIndex] = { ...cat, margem_lucro_percent: value ? parseFloat(value.replace(',', '.')) : undefined }
                              setFormData({ ...formData, categorias: updatedCategorias })
                            }}
                            decimalPlaces={2}
                            className="border-gray-200 focus:border-accent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Histórico de Movimentação - Timeline View */}
              {showForm && (movimentacaoData.length > 0 || maternidadeData.length > 0 || morteData.length > 0) && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h6 className="text-sm font-bold text-gray-800 mb-4 border-l-3 border-red-500 pl-3 py-1 bg-red-50 rounded-r">
                    Histórico de Movimentação
                  </h6>
                  
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    
                    {/* Combined timeline events */}
                    <div className="space-y-4">
                      {[...movimentacaoData.map(m => ({ ...m, type: 'movimentacao' })),
                        ...maternidadeData.map(m => ({ ...m, type: 'maternidade' })),
                        ...morteData.map(m => ({ ...m, type: 'morte' }))]
                        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                        .map((event) => {
                          const getEventColor = (type: string) => {
                            switch(type) {
                              case 'movimentacao': return 'bg-blue-500 border-blue-500';
                              case 'maternidade': return 'bg-pink-500 border-pink-500';
                              case 'morte': return 'bg-red-500 border-red-500';
                              default: return 'bg-gray-500 border-gray-500';
                            }
                          };

                          const getEventLabel = (event: any) => {
                            if (event.type === 'movimentacao') {
                              let movementType = event.motivo_movimentacao || event.tipo_saida || event.tipo_entrada;
                              let isSource = event.lote_origem_id === editingLote?.id;
                              let isDestination = event.lote_destino_id === editingLote?.id;
                              let movementReason = '';

                              if (event.lote_origem_id && event.lote_destino_id) {
                                if (isSource) {
                                  movementType = 'Saída';
                                } else if (isDestination) {
                                  movementType = 'Entrada';
                                }
                              }

                              if (event.motivo_movimentacao === 'Entrevero') {
                                movementReason = ' (Entrevero)';
                              } else if (event.tipo_saida === 'Transferência' || event.tipo_saida === 'Apartação' || event.tipo_entrada === 'Transferência' || event.tipo_entrada === 'Apartação') {
                                movementReason = ' (Movimentação)';
                              }

                              return { label: movementType + movementReason, category: event.categoria };
                            } else if (event.type === 'maternidade') {
                              return { label: 'Nascimento', category: event.categoria };
                            } else if (event.type === 'morte') {
                              return { label: 'Óbito', category: event.categoria };
                            }
                            return { label: '', category: '' };
                          };

                          const { label, category } = getEventLabel(event);
                          const colorClass = getEventColor(event.type);

                          return (
                            <div key={`${event.type}-${event.id}`} className="relative pl-10">
                              {/* Timeline dot */}
                              <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full ${colorClass.split(' ')[0]} border-2 ${colorClass.split(' ')[1]} bg-white`}></div>
                              
                              {/* Event card */}
                              <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colorClass.split(' ')[0].replace('bg-', 'bg-opacity-10')} ${colorClass.split(' ')[1].replace('border-', 'text-')}`}>
                                      {label}
                                    </span>
                                    {category && (
                                      <span className="text-xs text-gray-500 capitalize">{category}</span>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-400">{new Date(event.data).toLocaleDateString('pt-BR')}</span>
                                </div>
                                
                                <div className="text-xs text-gray-600 mt-2">
                                  {event.type === 'movimentacao' && event.numero_cabecas && `${event.numero_cabecas} cabeças`}
                                  {event.type === 'maternidade' && (
                                    <>
                                      {event.sexo && `Sexo: ${event.sexo}`}
                                      {event.peso_cria_kg && ` • Peso: ${event.peso_cria_kg} kg`}
                                      {event.tipo_parto && ` • Tipo: ${Array.isArray(event.tipo_parto) ? event.tipo_parto.join(', ') : event.tipo_parto}`}
                                    </>
                                  )}
                                  {event.type === 'morte' && (
                                    <>
                                      {event.causa_morte && `Causa: ${event.causa_morte}`}
                                      {event.peso_vivo && ` • Peso: ${event.peso_vivo} kg`}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Informações Administrativas */}
            <div className="border-t pt-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Informações Administrativas</h4>
              <div className="grid grid-cols-6 gap-2">
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
                <div className="col-span-2">
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
                    N° Contrato
                  </label>
                  <Input
                    type="text"
                    value={formData.numero_contrato}
                    onChange={(e) => setFormData({ ...formData, numero_contrato: e.target.value })}
                    placeholder="Ex: 12345"
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mês de Competência
                  </label>
                  <Input
                    type="month"
                    value={formData.mes_competencia}
                    onChange={(e) => setFormData({ ...formData, mes_competencia: e.target.value })}
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* SISBOV e Logística */}
            <div className="border-t pt-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">SISBOV e Logística</h4>
              <div className="grid grid-cols-6 gap-2">
                <div className="col-span-2">
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
                <div className="col-span-2">
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
                <div className="col-span-2">
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
          <Button onClick={() => {
            setShowForm(true)
            setEditingLote(null)
            setMovimentacaoData([])
            setMaternidadeData([])
            setMorteData([])
          }}>Criar Primeiro Lote</Button>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {lotes
            .filter((lote) =>
              lote.nome.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((lote) => (
              <CardItem
                key={lote.id}
                title={lote.nome}
                subtitle={(() => {
                  const total = lote.categorias?.reduce((sum, cat) => sum + (cat.quant_atual ?? cat.quant_inicial ?? 0), 0) || lote.n_cabecas || 0
                  return total > 0 ? `${total} cabeças` : undefined
                })()}
                status={lote.ativo}
                onClick={() => handleEdit(lote)}
              >
                <div className="space-y-2 mb-4 flex-1">
                  {lote.peso_vivo_atual_kg_cab && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Peso Vivo:</span> {lote.peso_vivo_atual_kg_cab} kg
                    </p>
                  )}

                  {lote.pasto_nome && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Pasto:</span> {lote.pasto_nome}
                    </p>
                  )}

                  {lote.categorias && lote.categorias.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Categorias:</p>
                      <div className="flex flex-wrap gap-1">
                        {lote.categorias.map((cat: LoteCategoria, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 rounded text-xs capitalize"
                          >
                            {cat.categoria}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {lote.qtd_bezerros && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Bezerros:</span> {lote.qtd_bezerros}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 sm:gap-2 mt-auto">
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

      <ConfirmModal
        isOpen={showCategoryRemoveModal}
        onClose={() => setShowCategoryRemoveModal(false)}
        onConfirm={() => setShowCategoryRemoveModal(false)}
        title="Não é possível remover categoria"
        message="Não é possível remover uma categoria que possui cabeças. Transfira ou remova os animais primeiro."
        confirmText="Entendi"
        cancelText="Cancelar"
        variant="warning"
      />
    </div>
  )
}
