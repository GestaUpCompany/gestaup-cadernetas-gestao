import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, NumericInput, CardSkeleton, ConfirmModal, CardItem } from '../../components/ui'
import { PlanoNutricionalModal } from '../../components/plano-nutricional/PlanoNutricionalModal'
import { PlanoNutricionalDraftModal, PlanoRascunho } from '../../components/plano-nutricional/PlanoNutricionalDraftModal'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { getFazendaIdForUser } from '../../utils/fazendaContext'
import { exportToXLSXMultiSheet, type ColumnConfig } from '../../utils/exportXLSX'

interface LoteCategoria {
  id?: string
  categoria: string
  quant_inicial?: number | null
  data_pesagem?: string | null
  peso_entrada_kg_cab?: number | null
  peso_entrada_arrobas?: number | null
  gmd?: string | null
  periodo?: number | null
  rc_inicial?: number | null
  rc_final?: number | null
  rc_atual?: number | null
  quant_atual?: number | null
  peso_vivo_atual_kg_cab?: number | null
  peso_vivo_atual_arroba_cab?: number | null
  producao_atual_arroba_cab?: number | null
  peso_vivo_meta_kg_cab?: number | null
  peso_venda_meta_arroba?: number | null
  producao_projetada_arroba_cab?: number | null
  venda_total_arroba_lote_categoria?: number | null
  dias_restantes_meta?: number | null
  data_meta_projetada?: string | null
  estrategia_nutricional?: string | null
  formulacao_id?: string | null
  raca?: string | null
  sexo?: string | null
  idade?: number | null
  preco_entrada_reais_kg?: number | null
  preco_entrada_reais_arroba?: number | null
  preco_entrada_reais_cab?: number | null
  agio_percent?: number | null
  custo_operacional_reais_cab_dia?: number | null
  margem_lucro_percent?: number | null
  preco_custo_reais_arroba?: number | null
  preco_custo_cab?: number | null
  preco_venda_projetado_reais_arroba?: number | null
  preco_venda_sugerido_cab?: number | null
  faturamento_projetado_reais_lote_categoria?: number | null
  morte?: number | null
  consumo?: number | null
  abate?: number | null
  transf_entrada?: number | null
  transf_saida?: number | null
  qtd_bezerros?: number | null
  consumo_meta_porcentagem_pesovivo?: number | null
  custo_frete_reais_cab?: number | null
  custo_comissao_reais_cab?: number | null
  custo_sanidade_reais_cab?: number | null
  custo_identificacao_rastreabilidade_reais_cab?: number | null
  custo_total_entrada_reais_cab?: number | null
  custo_total_entrada_reais_lote?: number | null
  ativo?: boolean | null
  planos_rascunho?: PlanoRascunho[]
  data_ajuste_peso?: string | null
  planos_cadastrados?: { id: string; nome: string; ativo: boolean; ordem: number; data_inicio: string | null; data_fim: string | null; peso_inicio_kg_cab: number | null }[]
}

interface Lote {
  id: string
  fazenda_id: string
  nome: string
  n_cabecas?: number | null
  categorias?: LoteCategoria[]
  peso_vivo_atual_kg_cab?: number | null
  peso_vivo_meta_kg_cab?: number | null
  data_meta_projetada?: string | null
  qtd_bezerros?: number | null
  quant_inicial?: number | null
  data_pesagem?: string | null
  peso_entrada_kg_cab?: number | null
  gmd?: string | null
  periodo?: number | null
  ativo: boolean | null
  pasto_id?: string | null
  pasto_nome?: string | null
  curral_id?: string | null
  curral_nome?: string | null
  modulo_id?: string | null
  modulo_nome?: string | null
  sistema_producao?: string | null
  destino?: string | null
  meta_intervalo_rodeio_dias?: number | null
  rc_inicial?: number | null
  preco_entrada_reais_kg?: number | null
  preco_entrada_reais_cab?: number | null
  custo_operacional_reais_cab_dia?: number | null
  margem_lucro_percent?: number | null
  raca?: string | null
  sexo?: string | null
  idade?: number | null
  estrategia_nutricional?: string | null
  dias_restantes_meta?: number | null
  produtor_rural?: string | null
  propriedade_origem?: string | null
  numero_contrato?: string | null
  mes_competencia?: string | null
  data_liberacao_sisbov?: string | null
  periodo_liberacao_sisbov?: number | null
  data_embarque_prevista?: string | null
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
  const [nutritionalOptions, setNutritionalOptions] = useState<{id: string, name: string, category: string, categoria?: string, consumo_meta?: number, gmd?: number}[]>([])
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
    destino: '',
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
  const [showCategoryRemoveModal, setShowCategoryRemoveModal] = useState(false)
  const [originalAtivo, setOriginalAtivo] = useState(true)
  const [ocupacaoPorLote, setOcupacaoPorLote] = useState<Record<string, any>>({})
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [showInactive, setShowInactive] = useState(false)
  const [isPlanoModalOpen, setIsPlanoModalOpen] = useState(false)
  const [selectedCategoriaForPlanos, setSelectedCategoriaForPlanos] = useState<{ loteCategoriaId?: string; categoria: string } | null>(null)
  const [isPlanoDraftModalOpen, setIsPlanoDraftModalOpen] = useState(false)
  const [selectedDraftCategoriaIndex, setSelectedDraftCategoriaIndex] = useState<number | null>(null)
  const [autoSaveToast, setAutoSaveToast] = useState<string | null>(null)
  const [openingPlanos, setOpeningPlanos] = useState(false)
  const [originalPesos, setOriginalPesos] = useState<Record<string, number | undefined>>({})
  const [pesoEditModal, setPesoEditModal] = useState<{
    isOpen: boolean
    categoriasAlteradas: { categoria: string; pesoOriginal: number; novoPeso: number }[]
  } | null>(null)
  const [pendingSubmitData, setPendingSubmitData] = useState<{ loteId: string; recalculatedCategorias: LoteCategoria[] } | null>(null)

  const categoriasOpcoes = useMemo(() => {
    const baseCategorias = [
      'bezerro ao pé',
      'bezerra ao pé',
      'bezerro',
      'bezerra',
      'garrote',
      'novilha',
    ]
    if (formData.destino === 'reprodução') {
      return [...baseCategorias, 'tourinho', 'touro', 'vaca', 'tropa']
    }
    if (formData.destino === 'corte') {
      return [...baseCategorias, 'boi magro', 'boi gordo', 'vaca', 'tropa']
    }
    return [...baseCategorias, 'boi magro', 'boi gordo', 'tourinho', 'touro', 'vaca', 'tropa']
  }, [formData.destino])

  const categoriaColors: Record<string, string> = {
    'vaca': 'border-blue-500',
    'touro': 'border-red-500',
    'tourinho': 'border-violet-400',
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
    'tourinho': 'bg-violet-50',
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
    const loadAuxiliaryData = async () => {
      if (!user) return
      const _fazendaId = await getFazendaIdForUser(user.id)
    const vinculos = _fazendaId ? [{ fazenda_id: _fazendaId }] : []

      if (!vinculos || vinculos.length === 0) return

      const fazendaId = vinculos[0].fazenda_id

      const [pastosData, racasData, formulacoesData] = await Promise.all([
        supabase.from('pastos').select('id, nome').eq('fazenda_id', fazendaId).eq('ativo', true).is('deleted_at', null),
        supabase.from('racas').select('id, nome').eq('fazenda_id', fazendaId).eq('ativo', true).is('deleted_at', null).order('nome'),
        supabase.from('formulacoes').select('id, nome, tipo, categoria, consumo_ms_percent_pv, gmd, e_premix').eq('fazenda_id', fazendaId).eq('ativo', true).eq('e_premix', false).is('deleted_at', null).order('nome'),
      ])

      if (pastosData.data) setPastos(pastosData.data)
      if (racasData.data) setRacas(racasData.data)

      if (formulacoesData.data) {
        setNutritionalOptions(
          formulacoesData.data.map((item) => ({
            id: item.id,
            name: item.nome,
            category: item.tipo || 'Formulações',
            categoria: item.categoria || undefined,
            consumo_meta: item.consumo_ms_percent_pv != null ? Number(item.consumo_ms_percent_pv) : undefined,
            gmd: item.gmd != null ? Number(item.gmd) : undefined,
          }))
        )
      }
    }

    loadAuxiliaryData()
  }, [user])

  const handleCategoryCollapse = (categoria: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoria)) {
        newSet.delete(categoria)
      } else {
        newSet.add(categoria)
      }
      return newSet
    })
  }

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
        data_ajuste_peso: undefined,
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
    if (user) {
      loadLotes()
    }
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
      const diasParaMeta = Math.ceil((pesoMeta - pesoAtual) / gmd)
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
  // quant_atual é read-only no frontend: só a trigger/cron devem atualizá-lo.
  // Na criação manual, quant_atual = quant_inicial automaticamente.
  useEffect(() => {
    if (!editingLote) {
      const updatedCategorias = formData.categorias.map(cat => ({
        ...cat,
        quant_atual: cat.quant_inicial || undefined
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

    // 2. Calcular período e peso_vivo_atual_kg_cab
    const planoVigente = updatedCat.planos_cadastrados?.find(p => p.ativo && p.data_inicio)
    const hasAjusteManual = !!updatedCat.data_ajuste_peso

    if (hasAjusteManual) {
      // Após edição manual: não recalcular peso_vivo_atual nem periodo automaticamente
      // O peso foi definido manualmente pelo usuário; o cron somará GMD incrementalmente
      if (updatedCat.data_ajuste_peso) {
        const dataAjuste = new Date(updatedCat.data_ajuste_peso + 'T00:00:00')
        const currentDate = new Date()
        currentDate.setHours(0, 0, 0, 0)
        const diffTime = currentDate.getTime() - dataAjuste.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        updatedCat = { ...updatedCat, periodo: diffDays > 0 ? diffDays : 0 }
      }
    } else if (planoVigente) {
      // Plano vigente ativo: calcular periodo a partir de data_inicio do plano
      // Não recalcular peso_vivo_atual_kg_cab aqui - o cron update_dados_lotes()
      // atualiza server-side diariamente. O frontend deve respeitar o valor do banco.
      const dataInicio = new Date(planoVigente.data_inicio! + 'T00:00:00')
      const currentDate = new Date()
      currentDate.setHours(0, 0, 0, 0)
      const diffTime = currentDate.getTime() - dataInicio.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      updatedCat = { ...updatedCat, periodo: diffDays > 0 ? diffDays : 0 }
    } else if (updatedCat.data_pesagem) {
      // Sem plano vigente: comportamento legado com data_pesagem
      const dataPesagem = new Date(updatedCat.data_pesagem + 'T00:00:00')
      const currentDate = new Date()
      currentDate.setHours(0, 0, 0, 0)
      const diffTime = currentDate.getTime() - dataPesagem.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      updatedCat = { ...updatedCat, periodo: diffDays > 0 ? diffDays : 0 }

      if (updatedCat.peso_entrada_kg_cab && updatedCat.gmd && updatedCat.periodo) {
        const gmdNumber = parseFloat(updatedCat.gmd.replace(',', '.'))
        const pesoVivoKg = updatedCat.peso_entrada_kg_cab + (updatedCat.periodo * gmdNumber)
        updatedCat = { ...updatedCat, peso_vivo_atual_kg_cab: pesoVivoKg }
      }
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
        const diasParaMeta = Math.ceil((pesoMeta - pesoAtual) / gmdNumber)
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
    formData.categorias.map(cat => cat.data_ajuste_peso).join(','),
    formData.categorias.map(cat => cat.planos_cadastrados?.find(p => p.ativo)?.data_inicio).join(','),
    formData.categorias.map(cat => cat.planos_cadastrados?.find(p => p.ativo)?.peso_inicio_kg_cab).join(','),
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
    const _fazendaId = await getFazendaIdForUser(user.id)
    const vinculos = _fazendaId ? [{ fazenda_id: _fazendaId }] : []

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    // Buscar lotes com suas categorias
    const { data: lotesData, error: lotesError } = await supabase
      .from('lotes')
      .select(`
        *,
        pastos (nome),
        currais (id, nome)
      `)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .order('nome', { ascending: true })

    if (lotesError) {
      console.error('Erro ao buscar lotes:', lotesError)
      setLoading(false)
      return
    }

    // Buscar categorias para cada lote (apenas ativas)
    const loteIds = lotesData?.map(l => l.id) || []
    const { data: categoriasData, error: categoriasError } = await supabase
      .from('lote_categorias')
      .select('*')
      .in('lote_id', loteIds)
      .eq('ativo', true)

    if (categoriasError) {
      console.error('Erro ao buscar categorias:', categoriasError)
    }

    // Combinar lotes com suas categorias (apenas ativas)
    const lotesComCategorias = (lotesData || []).map((lote: any) => {
      const categorias = (categoriasData || []).filter(cat => cat.lote_id === lote.id)
      const curral = Array.isArray(lote.currais) ? lote.currais[0] : lote.currais
      return {
        ...lote,
        pasto_nome: lote.pastos?.nome,
        curral_id: curral?.id || null,
        curral_nome: curral?.nome || null,
        categorias: categorias
      }
    })

    setLotes(lotesComCategorias as Lote[])
    setLoading(false)

    // Carregar ocupação atual dos lotes
    const { data: ocupacaoPastoData } = await supabase
      .from('v_lote_pasto_ocupacao_atual')
      .select('*')

    const { data: ocupacaoModuloData } = await supabase
      .from('v_lote_modulo_ocupacao_atual')
      .select('*')

    if (ocupacaoPastoData || ocupacaoModuloData) {
      const ocupacaoMap: Record<string, any> = {}
      ocupacaoPastoData?.forEach((item: any) => {
        if (!ocupacaoMap[item.lote_id]) ocupacaoMap[item.lote_id] = {}
        ocupacaoMap[item.lote_id].pasto = item
      })
      ocupacaoModuloData?.forEach((item: any) => {
        if (!ocupacaoMap[item.lote_id]) ocupacaoMap[item.lote_id] = {}
        ocupacaoMap[item.lote_id].modulo = item
      })
      setOcupacaoPorLote(ocupacaoMap)
    }
  }

  const syncIndividuosNutricional = async (loteId: string, categorias: LoteCategoria[]) => {
    if (!loteId || categorias.length === 0) return

    for (const cat of categorias) {
      if (!cat.categoria) continue
      // Só sincroniza se houver estratégia nutricional definida, para não sobrescrever dados setados por outras vias
      if (!cat.estrategia_nutricional && !cat.formulacao_id) continue

      let estrategiaMapeada = 'Ração'
      if (cat.estrategia_nutricional) {
        if (cat.estrategia_nutricional.includes('Proteico') || cat.estrategia_nutricional.includes('Proteinado')) {
          estrategiaMapeada = 'Proteico-Energético'
        } else if (cat.estrategia_nutricional.includes('Ração')) {
          estrategiaMapeada = 'Ração'
        }
      }

      const gmdNumber = cat.gmd ? parseFloat(cat.gmd.replace(',', '.')) : null
      const pesoMeta = cat.peso_vivo_meta_kg_cab ? parseFloat(cat.peso_vivo_meta_kg_cab.toString()) : null

      try {
        const { error } = await supabase
          .from('individuos')
          .update({
            estrategia_nutricional_tipo: estrategiaMapeada,
            estrategia_nutricional_nome: cat.estrategia_nutricional,
            gmd_kg_cab_dia: gmdNumber,
            peso_meta_kg: pesoMeta,
            estrategia_nutricional_id: cat.formulacao_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('lote_atual', loteId)
          .eq('categoria', cat.categoria)
          .is('deleted_at', null)

        if (error) {
          console.error(`Erro ao sincronizar nutrição dos indivíduos da categoria ${cat.categoria}:`, error)
        }
      } catch (syncError) {
        console.error(`Erro ao sincronizar nutrição dos indivíduos da categoria ${cat.categoria}:`, syncError)
      }
    }
  }

  // Auto-save do lote antes de abrir o modal de planos
  const abrirPlanosComAutoSave = async (catId: string, catIndex: number) => {
    // Validações básicas
    if (!formData.nome?.trim()) {
      alert('Preencha o nome do lote antes de gerenciar planos.')
      return
    }
    if (formData.categorias.length === 0) {
      alert('Selecione pelo menos uma categoria antes de gerenciar planos.')
      return
    }

    setSubmitting(true)
    setOpeningPlanos(true)
    try {
      // Buscar fazenda vinculada
      const _fazendaId = await getFazendaIdForUser(user?.id || '')
      if (!_fazendaId) {
        alert('Não foi possível determinar a fazenda vinculada.')
        setSubmitting(false)
        return
      }

      const loteData = {
        fazenda_id: _fazendaId,
        nome: formData.nome,
        n_cabecas: formData.numero_cabecas ? parseInt(formData.numero_cabecas) : null,
        qtd_bezerros: formData.quantidade_bezerros ? parseInt(formData.quantidade_bezerros) : null,
        ativo: formData.ativo,
        pasto_id: formData.pasto_id || null,
        sistema_producao: formData.sistema_producao || null,
        destino: formData.destino || null,
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
      if (editingLote) {
        const { error: updateError } = await supabase
          .from('lotes')
          .update(loteData)
          .eq('id', editingLote.id)
        if (updateError) throw updateError
        loteId = editingLote.id
      } else {
        const { data: newLote, error: insertError } = await supabase
          .from('lotes')
          .insert(loteData)
          .select()
          .single()
        if (insertError) throw insertError
        loteId = newLote?.id || ''
        // Atualiza editingLote para o lote recém-criado, evitando que um
        // handleSubmit posterior faça um segundo insert e duplique o lote.
        setEditingLote(newLote as any)
      }

      // Salvar categorias (inclui raça, peso, etc.)
      const recalculatedCategorias = formData.categorias.map(recalcularCategoria)
      await salvarCategorias(loteId, recalculatedCategorias)

      // Buscar a categoria correta: priorizar ID (categoria já persistida),
      // fallback por índice (categoria recém-criada neste save)
      const { data: savedCats } = await supabase
        .from('lote_categorias')
        .select('id, categoria')
        .eq('lote_id', loteId)
        .eq('ativo', true)
        .order('created_at', { ascending: true })

      const savedCat = catId
        ? savedCats?.find((c) => c.id === catId)
        : savedCats?.[catIndex]
      if (savedCat) {
        setAutoSaveToast('Lote salvo automaticamente. Abrindo planos...')
        setTimeout(() => setAutoSaveToast(null), 3000)
        setSelectedCategoriaForPlanos({ loteCategoriaId: savedCat.id, categoria: savedCat.categoria })
        setIsPlanoModalOpen(true)
        // Recarregar lotes para refletir o save
        await loadLotes()
        if (editingLote) {
          await handleEdit({ ...editingLote, id: loteId } as any)
        }
      }
    } catch (error: any) {
      console.error('Erro no auto-save:', error)
      alert('Não foi possível salvar o lote. Verifique os campos obrigatórios e tente novamente.')
    } finally {
      setSubmitting(false)
      setOpeningPlanos(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    if (!user) {
      setSubmitting(false)
      return
    }

    // Buscar fazenda vinculada
    const _fazendaId = await getFazendaIdForUser(user.id)
    const vinculos = _fazendaId ? [{ fazenda_id: _fazendaId }] : []

    if (!vinculos || vinculos.length === 0) {
      setSubmitting(false)
      return
    }

    const fazendaId = vinculos[0].fazenda_id

    // Validar: lote em curral nao pode ter pasto
    if (formData.pasto_id && editingLote?.curral_id) {
      alert(`Este lote está vinculado ao curral "${editingLote.curral_nome}" e não pode ser alocado em um pasto simultaneamente. Remova-o do curral primeiro.`)
      setSubmitting(false)
      return
    }

    // Validar categorias
    if (formData.categorias.length === 0) {
      alert('Selecione pelo menos uma categoria')
      setSubmitting(false)
      return
    }

    // Validação de plano nutricional desativada para testes internos
    // const categoriasSemPlano = formData.categorias.filter(
    //   cat => !cat.planos_rascunho?.length && !cat.formulacao_id
    // )
    // if (categoriasSemPlano.length > 0) {
    //   const nomes = categoriasSemPlano.map(cat => cat.categoria).join(', ')
    //   alert(`As seguintes categorias precisam de um plano nutricional completo (formulação, período e peso meta): ${nomes}`)
    //   setSubmitting(false)
    //   return
    // }

    const loteData = {
      fazenda_id: fazendaId,
      nome: formData.nome,
      n_cabecas: formData.numero_cabecas ? parseInt(formData.numero_cabecas) : null,
      qtd_bezerros: formData.quantidade_bezerros ? parseInt(formData.quantidade_bezerros) : null,
      ativo: formData.ativo,
      pasto_id: formData.pasto_id || null,
      sistema_producao: formData.sistema_producao || null,
      destino: formData.destino || null,
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

    // Trava: peso meta deve ser maior que peso atual
    const categoriasComPesoMetaInvalido = recalculatedCategorias.filter((cat) => {
      const pesoMeta = cat.peso_vivo_meta_kg_cab ? parseFloat(cat.peso_vivo_meta_kg_cab.toString()) : null
      const pesoAtual = cat.peso_vivo_atual_kg_cab ? parseFloat(cat.peso_vivo_atual_kg_cab.toString()) : null
      return pesoMeta != null && pesoAtual != null && pesoMeta <= pesoAtual
    })

    if (categoriasComPesoMetaInvalido.length > 0) {
      const nomes = categoriasComPesoMetaInvalido.map((cat) => cat.categoria).join(', ')
      alert(`O peso meta deve ser maior que o peso atual nas categorias: ${nomes}`)
      setSubmitting(false)
      return
    }

    // Validar: peso atual não pode ser menor que o peso original (com plano vigente)
    const categoriasComPesoInvalido = recalculatedCategorias.filter((cat) => {
      const hasPlanoVigente = cat.planos_cadastrados?.some(p => p.ativo)
      const pesoOriginal = originalPesos[cat.categoria.toLowerCase()]
      const pesoAtual = cat.peso_vivo_atual_kg_cab
      return hasPlanoVigente && pesoOriginal != null && pesoAtual != null && pesoAtual < pesoOriginal
    })

    if (categoriasComPesoInvalido.length > 0) {
      const nomes = categoriasComPesoInvalido.map((cat) => cat.categoria).join(', ')
      alert(`O peso atual não pode ser menor que o peso original nas categorias: ${nomes}`)
      setSubmitting(false)
      return
    }

    // Detectar categorias com peso atual alterado manualmente (maior que original, com plano vigente)
    const categoriasComPesoAlterado = recalculatedCategorias.filter((cat) => {
      const hasPlanoVigente = cat.planos_cadastrados?.some(p => p.ativo)
      const pesoOriginal = originalPesos[cat.categoria.toLowerCase()]
      const pesoAtual = cat.peso_vivo_atual_kg_cab
      return hasPlanoVigente && pesoOriginal != null && pesoAtual != null && pesoAtual > pesoOriginal
    }).map((cat) => ({
      categoria: cat.categoria,
      pesoOriginal: originalPesos[cat.categoria.toLowerCase()]!,
      novoPeso: cat.peso_vivo_atual_kg_cab!,
    }))

    if (categoriasComPesoAlterado.length > 0) {
      setPendingSubmitData({ loteId, recalculatedCategorias })
      setPesoEditModal({
        isOpen: true,
        categoriasAlteradas: categoriasComPesoAlterado,
      })
      setSubmitting(false)
      return
    }

    // Continuar com o save das categorias
    await salvarCategorias(loteId, recalculatedCategorias)
  }

  const salvarCategorias = async (loteId: string, recalculatedCategorias: LoteCategoria[]) => {
    setSubmitting(true)

    // Buscar fazenda vinculada ao lote
    const { data: loteData } = await supabase
      .from('lotes')
      .select('fazenda_id')
      .eq('id', loteId)
      .single()
    const fazendaId = loteData?.fazenda_id || ''

    // Buscar categorias existentes (apenas ativas) para preservar IDs e planos
    // Categorias encerradas por recategorização não devem ser tocadas nem deletadas
    const { data: existingCategorias } = await supabase
      .from('lote_categorias')
      .select('id, categoria')
      .eq('lote_id', loteId)
      .eq('ativo', true)

    const existingByName: Record<string, string> = {}
    existingCategorias?.forEach((cat: any) => {
      const key = cat.categoria.toLowerCase()
      if (!existingByName[key]) existingByName[key] = cat.id
    })

    const savedCategoryIds: string[] = []

    // Upsert categorias: preserva IDs existentes
    for (const cat of recalculatedCategorias) {
      const categoriaId = cat.id || existingByName[cat.categoria.toLowerCase()]
      const categoriaPayload: Record<string, any> = {
        lote_id: loteId,
        categoria: cat.categoria,
        quant_inicial: cat.quant_inicial ? parseInt(cat.quant_inicial.toString()) : null,
        data_pesagem: cat.data_pesagem || null,
        data_ajuste_peso: cat.data_ajuste_peso || null,
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
        formulacao_id: cat.formulacao_id || null,
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
      }

      // Ao editar categoria existente, não enviar quant_inicial (imutável) nem
      // quant_atual (gerido por trigger/cron) para evitar sobrescrever valores do banco.
      if (categoriaId) {
        delete categoriaPayload.quant_inicial
        delete categoriaPayload.quant_atual
      }

      try {
        let savedId = categoriaId
        if (categoriaId) {
          const { error: updateCatError } = await supabase
            .from('lote_categorias')
            .update(categoriaPayload)
            .eq('id', categoriaId)
          if (updateCatError) throw updateCatError
          savedId = categoriaId
        } else {
          const { data: newCat, error: insertCatError } = await supabase
            .from('lote_categorias')
            .insert(categoriaPayload)
            .select('id')
            .single()
          if (insertCatError) throw insertCatError
          savedId = newCat.id
        }

        savedCategoryIds.push(savedId)

        // Criar planos nutricionais se a categoria ainda não tiver nenhum
        const { data: planosExistentes } = await supabase
          .from('planos_nutricionais')
          .select('id')
          .eq('lote_categoria_id', savedId)
          .limit(1)

        if (!planosExistentes || planosExistentes.length === 0) {
          let planosParaInserir: any[] = []

          if (cat.planos_rascunho && cat.planos_rascunho.length > 0) {
            planosParaInserir = cat.planos_rascunho.map((plano, idx) => ({
              lote_categoria_id: savedId,
              fazenda_id: fazendaId,
              nome: plano.nome,
              formulacao_id: plano.formulacao_id,
              periodo_dias: plano.periodo_dias,
              peso_meta_kg: plano.peso_meta_kg,
              gmd_planejado: plano.gmd_planejado ?? null,
              ordem: plano.ordem ?? idx,
              ativo: false,
              data_inicio: null,
              condicao_migracao: plano.condicao_migracao,
            }))
          } else if (cat.formulacao_id && cat.periodo && cat.peso_vivo_meta_kg_cab) {
            planosParaInserir = [{
              lote_categoria_id: savedId,
              fazenda_id: fazendaId,
              nome: cat.estrategia_nutricional || 'Plano Inicial',
              formulacao_id: cat.formulacao_id,
              periodo_dias: cat.periodo,
              peso_meta_kg: cat.peso_vivo_meta_kg_cab,
              ordem: 0,
              ativo: false,
              data_inicio: null,
              condicao_migracao: 'periodo',
            }]
          }

          if (planosParaInserir.length > 0) {
            const { error: planoError } = await supabase.from('planos_nutricionais').insert(planosParaInserir)
            if (planoError) {
              console.error(`Erro ao criar planos nutricionais para ${cat.categoria}:`, planoError)
            }
          }
        }
      } catch (catError: any) {
        console.error(`Erro ao salvar categoria ${cat.categoria}:`, catError)
        alert(`Erro ao salvar categoria ${cat.categoria}: ${catError.message}`)
        continue
      }
    }

    // Encerrar categorias que não estão mais no formulário (soft-delete)
    // Soft-delete preserva snapshots de planos e auditoria de transições,
    // evitando violação de FK NO ACTION em planos_nutricionais_snapshots.
    if (existingCategorias && existingCategorias.length > 0) {
      const idsToEncerrar = existingCategorias
        .filter((cat: any) => !savedCategoryIds.includes(cat.id))
        .map((cat: any) => cat.id)

      if (idsToEncerrar.length > 0) {
        // 1. Encerrar planos nutricionais ativos das categorias removidas
        const { error: planoEncerrarError } = await supabase
          .from('planos_nutricionais')
          .update({ ativo: false, data_fim: new Date().toISOString() })
          .in('lote_categoria_id', idsToEncerrar)
          .eq('ativo', true)

        if (planoEncerrarError) {
          console.error('Erro ao encerrar planos das categorias removidas:', planoEncerrarError)
        }

        // 2. Soft-delete das categorias (ativo=false + data_fim=now)
        const { error: softDeleteError } = await supabase
          .from('lote_categorias')
          .update({ ativo: false, data_fim: new Date().toISOString() })
          .in('id', idsToEncerrar)

        if (softDeleteError) {
          console.error('Erro ao encerrar categorias antigas:', softDeleteError)
        }
      }
    }

    // Sincronizar dados nutricionais dos indivíduos deste lote
    await syncIndividuosNutricional(loteId, recalculatedCategorias)

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
        destino: '',
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

    setSubmitting(false)
  }

  const handleEdit = async (lote: Lote) => {
    setEditingLote(lote)

    const fazendaId = lote.fazenda_id

    // Buscar categorias, movimentação (registros_movimentacao, unificado), maternidade e morte em paralelo
    // lote_historico foi migrado para registros_movimentacao (H2 unificação)
    const loteNomeTrim = lote.nome.trim()
    const [
      categoriasData,
      movPwaByIdData,
      movPwaByNomeData,
      matData,
      morData
    ] = await Promise.all([
      supabase.from('lote_categorias').select('*').eq('lote_id', lote.id).eq('ativo', true),
      // Movimentações filtradas por ID do lote (origem ou destino)
      supabase.from('registros_movimentacao')
        .select('*')
        .eq('fazenda_id', fazendaId)
        .is('deleted_at', null)
        .or(`lote_origem_id.eq.${lote.id},lote_destino_id.eq.${lote.id}`)
        .order('data', { ascending: false }),
      // Fallback por nome: registros antigos onde lote_origem_id é null mas o texto bate com o nome do lote
      loteNomeTrim ? supabase.from('registros_movimentacao')
        .select('*')
        .eq('fazenda_id', fazendaId)
        .is('deleted_at', null)
        .is('lote_origem_id', null)
        .ilike('lote_origem', loteNomeTrim)
        .order('data', { ascending: false }) : Promise.resolve({ data: null, error: null }),
      supabase.from('registros_maternidade').select('*').eq('lote_id', lote.id).eq('fazenda_id', fazendaId).is('deleted_at', null).order('data', { ascending: false }),
      supabase.from('registros_morte').select('*').eq('lote_id', lote.id).eq('fazenda_id', fazendaId).is('deleted_at', null).order('data', { ascending: false }),
    ])

    // Normalizar registros_movimentacao para o formato da timeline
    const movPwaById = (movPwaByIdData.data || []).map((r: any) => ({
      ...r,
      type: 'movimentacao',
      data_movimentacao: r.data,
      tipo_movimentacao: r.lote_origem_id === lote.id ? 'saida' : 'entrada',
      quantidade: r.numero_cabecas,
      peso_kg: r.peso_vivo_atual_kg,
      observacoes: [
        r.motivo_movimentacao ? `Motivo: ${r.motivo_movimentacao}` : null,
        r.subtipo ? `Subtipo: ${r.subtipo}` : null,
        r.lote_origem_id === lote.id && r.destino ? `Destino: ${r.destino}` : null,
        r.lote_destino_id === lote.id && r.lote_origem ? `Origem: ${r.lote_origem}` : null,
        r.responsavel ? `Resp: ${r.responsavel}` : null,
        r.causa_observacao ? r.causa_observacao : null,
      ].filter(Boolean).join(' • '),
    }))

    // Fallback por nome: apenas registros que ainda não foram capturados por ID
    const idsJaCapturados = new Set(movPwaById.map((r: any) => r.id))
    const movPwaByNome = (movPwaByNomeData.data || [])
      .filter((r: any) => !idsJaCapturados.has(r.id))
      .map((r: any) => ({
        ...r,
        type: 'movimentacao',
        data_movimentacao: r.data,
        tipo_movimentacao: 'saida',
        quantidade: r.numero_cabecas,
        peso_kg: r.peso_vivo_atual_kg,
        observacoes: [
          r.motivo_movimentacao ? `Motivo: ${r.motivo_movimentacao}` : null,
          r.destino ? `Destino: ${r.destino}` : null,
          r.responsavel ? `Resp: ${r.responsavel}` : null,
          r.causa_observacao ? r.causa_observacao : null,
          'Correspondência por nome (sem ID)',
        ].filter(Boolean).join(' • '),
      }))

    const movimentacaoCombinada = [...movPwaById, ...movPwaByNome]

    const updatedCategorias = categoriasData.data || lote.categorias || []

    // Buscar planos nutricionais das categorias
    const categoriaIds = updatedCategorias.map((c: any) => c.id)
    const { data: planosData } = await supabase
      .from('planos_nutricionais')
      .select('id, lote_categoria_id, nome, ativo, ordem, data_inicio, data_fim, peso_inicio_kg_cab')
      .in('lote_categoria_id', categoriaIds)
      .order('ordem', { ascending: true })

    const planosPorCategoria: Record<string, { id: string; nome: string; ativo: boolean; ordem: number; data_inicio: string | null; data_fim: string | null; peso_inicio_kg_cab: number | null }[]> = {}
    ;(planosData || []).forEach((p: any) => {
      if (!planosPorCategoria[p.lote_categoria_id]) planosPorCategoria[p.lote_categoria_id] = []
      planosPorCategoria[p.lote_categoria_id].push({ id: p.id, nome: p.nome, ativo: p.ativo, ordem: p.ordem, data_inicio: p.data_inicio, data_fim: p.data_fim, peso_inicio_kg_cab: p.peso_inicio_kg_cab })
    })

    // Update categorias to include new fields if not present
    const categoriasWithMeta = updatedCategorias.map((cat: any) => ({
      ...cat,
      data_ajuste_peso: cat.data_ajuste_peso ?? undefined,
      planos_cadastrados: planosPorCategoria[cat.id] || [],
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

    setMovimentacaoData(movimentacaoCombinada)
    setMaternidadeData(matData.data || [])
    setMorteData(morData.data || [])

    const pesosOrig: Record<string, number | undefined> = {}
    categoriasWithMeta.forEach((cat: any) => {
      pesosOrig[cat.categoria.toLowerCase()] = cat.peso_vivo_atual_kg_cab ?? undefined
    })
    setOriginalPesos(pesosOrig)

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
      destino: lote.destino || '',
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
      destino: '',
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

  const handleToggleActive = async (lote: Lote) => {
    const newAtivo = !lote.ativo
    const updateData: any = { ativo: newAtivo }
    
    // Desvincular lote do pasto ao desativar
    if (!newAtivo) {
      updateData.pasto_id = null
    }
    
    const { error } = await supabase
      .from('lotes')
      .update(updateData)
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

  const LOTES_EXPORT_COLUMNS: ColumnConfig[] = [
    { source: 'nome', header: 'Nome' },
    { source: 'n_cabecas', header: 'Cabeças', format: 'number' },
    { source: 'ativo', header: 'Ativo', format: 'boolean' },
    { source: 'pasto_nome', header: 'Pasto' },
    { source: 'curral_nome', header: 'Curral' },
    { source: 'modulo_nome', header: 'Módulo' },
    { source: 'sistema_producao', header: 'Sistema de produção' },
    { source: 'destino', header: 'Destino' },
    { source: 'meta_intervalo_rodeio_dias', header: 'Meta intervalo rodeio (dias)', format: 'number' },
    { source: 'rc_inicial', header: 'RC inicial (%)', format: 'number' },
    { source: 'estrategia_nutricional', header: 'Estratégia nutricional' },
    { source: 'preco_kg', header: 'Preço (R$/kg)', format: 'number' },
    { source: 'preco_cab', header: 'Preço (R$/cab)', format: 'number' },
    { source: 'custo_operacional_reais_cab_dia', header: 'Custo operacional (R$/cab/dia)', format: 'number' },
    { source: 'produtor_rural', header: 'Produtor rural' },
    { source: 'propriedade_origem', header: 'Propriedade origem' },
    { source: 'numero_contrato', header: 'Número contrato' },
    { source: 'mes_competencia', header: 'Mês competência' },
    { source: 'data_liberacao_sisbov', header: 'Data liberação SisBov', format: 'date' },
    { source: 'periodo_liberacao_sisbov', header: 'Período liberação SisBov' },
    { source: 'data_embarque_prevista', header: 'Data embarque prevista', format: 'date' },
  ]

  const CATEGORIAS_EXPORT_COLUMNS: ColumnConfig[] = [
    { source: 'lote_nome', header: 'Lote' },
    { source: 'categoria', header: 'Categoria' },
    { source: 'ativo', header: 'Ativo', format: 'boolean' },
    { source: 'quant_inicial', header: 'Quant. inicial (cab)', format: 'number' },
    { source: 'quant_atual', header: 'Quant. atual (cab)', format: 'number' },
    { source: 'data_pesagem', header: 'Data pesagem', format: 'date' },
    { source: 'data_ajuste_peso', header: 'Data ajuste peso', format: 'date' },
    { source: 'peso_entrada_kg_cab', header: 'Peso entrada (kg/cab)', format: 'number' },
    { source: 'peso_entrada_arrobas', header: 'Peso entrada (@/cab)', format: 'number' },
    { source: 'gmd', header: 'GMD (categoria)', format: 'number' },
    { source: 'periodo', header: 'Período (dias)', format: 'number' },
    { source: 'rc_inicial', header: 'RC inicial (%)', format: 'number' },
    { source: 'rc_final', header: 'RC final (%)', format: 'number' },
    { source: 'rc_atual', header: 'RC atual (%)', format: 'number' },
    { source: 'peso_vivo_atual_kg_cab', header: 'Peso vivo atual (kg/cab)', format: 'number' },
    { source: 'peso_vivo_atual_arroba_cab', header: 'Peso vivo atual (@/cab)', format: 'number' },
    { source: 'peso_vivo_meta_kg_cab', header: 'Peso vivo meta (kg/cab)', format: 'number' },
    { source: 'peso_venda_meta_arroba', header: 'Peso venda meta (@)', format: 'number' },
    { source: 'producao_atual_arroba_cab', header: 'Produção atual (@/cab)', format: 'number' },
    { source: 'producao_projetada_arroba_cab', header: 'Produção projetada (@/cab)', format: 'number' },
    { source: 'venda_total_arroba_lote_categoria', header: 'Venda total (@/lote/cat)', format: 'number' },
    { source: 'dias_restantes_meta', header: 'Dias restantes meta', format: 'number' },
    { source: 'data_meta_projetada', header: 'Data meta projetada', format: 'date' },
    { source: 'raca', header: 'Raça' },
    { source: 'sexo', header: 'Sexo' },
    { source: 'idade', header: 'Idade (meses)', format: 'number' },
    { source: 'preco_entrada_reais_kg', header: 'Preço entrada (R$/kg)', format: 'number' },
    { source: 'preco_entrada_reais_arroba', header: 'Preço entrada (R$/@)', format: 'number' },
    { source: 'preco_entrada_reais_cab', header: 'Preço entrada (R$/cab)', format: 'number' },
    { source: 'agio_percent', header: 'Ágio (%)', format: 'number' },
    { source: 'custo_operacional_reais_cab_dia', header: 'Custo operacional (R$/cab/dia)', format: 'number' },
    { source: 'margem_lucro_percent', header: 'Margem lucro (%)', format: 'number' },
    { source: 'preco_custo_reais_arroba', header: 'Preço custo (R$/@)', format: 'number' },
    { source: 'preco_custo_cab', header: 'Preço custo (R$/cab)', format: 'number' },
    { source: 'preco_venda_projetado_reais_arroba', header: 'Preço venda projetado (R$/@)', format: 'number' },
    { source: 'preco_venda_sugerido_cab', header: 'Preço venda sugerido (R$/cab)', format: 'number' },
    { source: 'faturamento_projetado_reais_lote_categoria', header: 'Faturamento projetado (R$/lote/cat)', format: 'number' },
    { source: 'morte', header: 'Morte', format: 'number' },
    { source: 'consumo', header: 'Consumo', format: 'number' },
    { source: 'abate', header: 'Abate', format: 'number' },
    { source: 'transf_entrada', header: 'Transf. entrada', format: 'number' },
    { source: 'transf_saida', header: 'Transf. saída', format: 'number' },
    { source: 'qtd_bezerros', header: 'Qtd. bezerros', format: 'number' },
    { source: 'consumo_meta_porcentagem_pesovivo', header: 'Consumo meta (% PV)', format: 'number' },
    { source: 'custo_frete_reais_cab', header: 'Custo frete (R$/cab)', format: 'number' },
    { source: 'custo_comissao_reais_cab', header: 'Custo comissão (R$/cab)', format: 'number' },
    { source: 'custo_sanidade_reais_cab', header: 'Custo sanidade (R$/cab)', format: 'number' },
    { source: 'custo_identificacao_rastreabilidade_reais_cab', header: 'Custo identif. rastreabilidade (R$/cab)', format: 'number' },
    { source: 'custo_total_entrada_reais_cab', header: 'Custo total entrada (R$/cab)', format: 'number' },
    { source: 'custo_total_entrada_reais_lote', header: 'Custo total entrada (R$/lote)', format: 'number' },
    // Plano vigente
    { source: 'formulacao_nome', header: 'Formulação (plano vigente)' },
    { source: 'gmd_planejado', header: 'GMD planejado (plano vigente)', format: 'number' },
    { source: 'periodo_meta_dias', header: 'Período meta (dias)', format: 'number' },
    { source: 'periodo_decorrido_dias', header: 'Período decorrido (dias)', format: 'number' },
    { source: 'peso_meta_kg', header: 'Peso meta (kg)', format: 'number' },
  ]

  const handleExportAllLotes = async () => {
    const lotesVisiveis = lotes.filter((lote) =>
      (showInactive || lote.ativo) &&
      lote.nome.toLowerCase().includes(searchTerm.toLowerCase())
    )
    if (lotesVisiveis.length === 0) return

    // Coletar todos os categoriaIds dos lotes visíveis
    const todosCategoriaIds: string[] = []
    for (const lote of lotesVisiveis) {
      for (const cat of (lote.categorias || [])) {
        if (cat.id) todosCategoriaIds.push(cat.id)
      }
    }

    // Buscar planos vigentes (ativo=true) com campos completos
    let planosData: any[] = []
    if (todosCategoriaIds.length > 0) {
      const { data, error } = await supabase
        .from('planos_nutricionais')
        .select('id, lote_categoria_id, formulacao_id, periodo_dias, peso_meta_kg, gmd_planejado, data_inicio, ativo')
        .in('lote_categoria_id', todosCategoriaIds)
        .eq('ativo', true)
      if (error) {
        console.error('Erro ao buscar planos nutricionais para export:', error)
      }
      planosData = data || []
    }

    // Indexar planos por lote_categoria_id (vigente = ativo true; pega o primeiro)
    const planoVigentePorCategoria: Record<string, any> = {}
    for (const p of planosData) {
      if (!planoVigentePorCategoria[p.lote_categoria_id]) {
        planoVigentePorCategoria[p.lote_categoria_id] = p
      }
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    // Aba "Lotes": 1 linha por lote com todos os campos do cadastro
    const rowsLotes = lotesVisiveis.map((lote: any) => ({
      nome: lote.nome,
      n_cabecas: lote.n_cabecas ?? null,
      ativo: lote.ativo,
      pasto_nome: lote.pasto_nome ?? null,
      curral_nome: lote.curral_nome ?? null,
      modulo_nome: lote.modulo_nome ?? null,
      sistema_producao: lote.sistema_producao ?? null,
      destino: lote.destino ?? null,
      meta_intervalo_rodeio_dias: lote.meta_intervalo_rodeio_dias ?? null,
      rc_inicial: lote.rc_inicial ?? null,
      estrategia_nutricional: lote.estrategia_nutricional ?? null,
      preco_kg: lote.preco_kg ?? null,
      preco_cab: lote.preco_cab ?? null,
      custo_operacional_reais_cab_dia: lote.custo_operacional_reais_cab_dia ?? null,
      produtor_rural: lote.produtor_rural ?? null,
      propriedade_origem: lote.propriedade_origem ?? null,
      numero_contrato: lote.numero_contrato ?? null,
      mes_competencia: lote.mes_competencia ?? null,
      data_liberacao_sisbov: lote.data_liberacao_sisbov ?? null,
      periodo_liberacao_sisbov: lote.periodo_liberacao_sisbov ?? null,
      data_embarque_prevista: lote.data_embarque_prevista ?? null,
    }))

    // Aba "Categorias": 1 linha por categoria com todos os campos + lote_nome + plano vigente
    const rowsCategorias: any[] = []
    for (const lote of lotesVisiveis) {
      for (const cat of (lote.categorias || [])) {
        const plano = cat.id ? planoVigentePorCategoria[cat.id] : null
        let formulacaoNome: string | null = null
        let gmdPlanejado: number | null = null
        let periodoMetaDias: number | null = null
        let periodoDecorridoDias: number | null = null
        let pesoMetaKg: number | null = null
        if (plano) {
          const formulacao = plano.formulacao_id
            ? nutritionalOptions.find(opt => opt.id === plano.formulacao_id)
            : null
          formulacaoNome = formulacao?.name ?? null
          gmdPlanejado = plano.gmd_planejado != null
            ? Number(plano.gmd_planejado)
            : (formulacao?.gmd != null ? Number(formulacao.gmd) : null)
          periodoMetaDias = plano.periodo_dias != null ? Number(plano.periodo_dias) : null
          pesoMetaKg = plano.peso_meta_kg != null ? Number(plano.peso_meta_kg) : null
          if (plano.data_inicio) {
            const inicio = new Date(plano.data_inicio + 'T00:00:00')
            inicio.setHours(0, 0, 0, 0)
            const diffMs = hoje.getTime() - inicio.getTime()
            periodoDecorridoDias = Math.max(Math.round(diffMs / (1000 * 60 * 60 * 24)), 0)
          }
        }
        rowsCategorias.push({
          lote_nome: lote.nome,
          categoria: cat.categoria,
          ativo: cat.ativo,
          quant_inicial: cat.quant_inicial ?? null,
          quant_atual: cat.quant_atual ?? null,
          data_pesagem: cat.data_pesagem ?? null,
          data_ajuste_peso: cat.data_ajuste_peso ?? null,
          peso_entrada_kg_cab: cat.peso_entrada_kg_cab ?? null,
          peso_entrada_arrobas: cat.peso_entrada_arrobas ?? null,
          gmd: cat.gmd ? Number(String(cat.gmd).replace(',', '.')) : null,
          periodo: cat.periodo ?? null,
          rc_inicial: cat.rc_inicial ?? null,
          rc_final: cat.rc_final ?? null,
          rc_atual: cat.rc_atual ?? null,
          peso_vivo_atual_kg_cab: cat.peso_vivo_atual_kg_cab ?? null,
          peso_vivo_atual_arroba_cab: cat.peso_vivo_atual_arroba_cab ?? null,
          peso_vivo_meta_kg_cab: cat.peso_vivo_meta_kg_cab ?? null,
          peso_venda_meta_arroba: cat.peso_venda_meta_arroba ?? null,
          producao_atual_arroba_cab: cat.producao_atual_arroba_cab ?? null,
          producao_projetada_arroba_cab: cat.producao_projetada_arroba_cab ?? null,
          venda_total_arroba_lote_categoria: cat.venda_total_arroba_lote_categoria ?? null,
          dias_restantes_meta: cat.dias_restantes_meta ?? null,
          data_meta_projetada: cat.data_meta_projetada ?? null,
          raca: cat.raca ?? null,
          sexo: cat.sexo ?? null,
          idade: cat.idade ?? null,
          preco_entrada_reais_kg: cat.preco_entrada_reais_kg ?? null,
          preco_entrada_reais_arroba: cat.preco_entrada_reais_arroba ?? null,
          preco_entrada_reais_cab: cat.preco_entrada_reais_cab ?? null,
          agio_percent: cat.agio_percent ?? null,
          custo_operacional_reais_cab_dia: cat.custo_operacional_reais_cab_dia ?? null,
          margem_lucro_percent: cat.margem_lucro_percent ?? null,
          preco_custo_reais_arroba: cat.preco_custo_reais_arroba ?? null,
          preco_custo_cab: cat.preco_custo_cab ?? null,
          preco_venda_projetado_reais_arroba: cat.preco_venda_projetado_reais_arroba ?? null,
          preco_venda_sugerido_cab: cat.preco_venda_sugerido_cab ?? null,
          faturamento_projetado_reais_lote_categoria: cat.faturamento_projetado_reais_lote_categoria ?? null,
          morte: cat.morte ?? null,
          consumo: cat.consumo ?? null,
          abate: cat.abate ?? null,
          transf_entrada: cat.transf_entrada ?? null,
          transf_saida: cat.transf_saida ?? null,
          qtd_bezerros: cat.qtd_bezerros ?? null,
          consumo_meta_porcentagem_pesovivo: cat.consumo_meta_porcentagem_pesovivo ?? null,
          custo_frete_reais_cab: cat.custo_frete_reais_cab ?? null,
          custo_comissao_reais_cab: cat.custo_comissao_reais_cab ?? null,
          custo_sanidade_reais_cab: cat.custo_sanidade_reais_cab ?? null,
          custo_identificacao_rastreabilidade_reais_cab: cat.custo_identificacao_rastreabilidade_reais_cab ?? null,
          custo_total_entrada_reais_cab: cat.custo_total_entrada_reais_cab ?? null,
          custo_total_entrada_reais_lote: cat.custo_total_entrada_reais_lote ?? null,
          formulacao_nome: formulacaoNome,
          gmd_planejado: gmdPlanejado,
          periodo_meta_dias: periodoMetaDias,
          periodo_decorrido_dias: periodoDecorridoDias,
          peso_meta_kg: pesoMetaKg,
        })
      }
    }

    exportToXLSXMultiSheet({
      tableName: 'estado_lotes',
      sheets: [
        { data: rowsLotes, config: { sheetName: 'Lotes', columns: LOTES_EXPORT_COLUMNS } },
        { data: rowsCategorias, config: { sheetName: 'Categorias', columns: CATEGORIAS_EXPORT_COLUMNS } },
      ],
    })
  }

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
              className="flex-1 min-w-0 border-gray-200 focus:border-accent h-10"
            />
            <Button onClick={() => {
              setShowForm(true)
              setEditingLote(null)
              setMovimentacaoData([])
              setMaternidadeData([])
              setMorteData([])
            }} className="h-10">Novo Lote</Button>
            <Button
              onClick={handleExportAllLotes}
              disabled={lotes.length === 0}
              className="h-10"
            >
              Exportar Tudo
            </Button>
          </div>
        </div>
      )}

      {/* Filter Toggle */}
      {!showForm && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowInactive(!showInactive)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 border-2 ${
              showInactive
                ? 'bg-primary text-white border-primary hover:bg-primary/90'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showInactive ? '✓ Mostrando Desativados' : 'Mostrar Desativados'}
          </button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
                    Pasto <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.pasto_id}
                    onChange={(e) => setFormData({ ...formData, pasto_id: e.target.value })}
                    required
                    disabled={!!editingLote?.curral_id}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:border-accent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecione</option>
                    {pastos.map((pasto) => (
                      <option key={pasto.id} value={pasto.id}>{pasto.nome}</option>
                    ))}
                  </select>
                  {editingLote?.curral_id && (
                    <p className="text-xs text-red-500 mt-1">
                      Este lote está no curral "{editingLote.curral_nome}". Remova-o do curral antes de alocar em um pasto.
                    </p>
                  )}
                </div>
                <div className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                <div className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
                    Destino <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.destino}
                    onChange={(e) => {
                      const novoDestino = e.target.value
                      const categoriasValidas = novoDestino === 'reprodução'
                        ? ['bezerro ao pé', 'bezerra ao pé', 'bezerro', 'bezerra', 'garrote', 'novilha', 'tourinho', 'touro', 'vaca', 'tropa']
                        : novoDestino === 'corte'
                          ? ['bezerro ao pé', 'bezerra ao pé', 'bezerro', 'bezerra', 'garrote', 'novilha', 'boi magro', 'boi gordo', 'vaca', 'tropa']
                          : ['bezerro ao pé', 'bezerra ao pé', 'bezerro', 'bezerra', 'garrote', 'novilha', 'boi magro', 'boi gordo', 'tourinho', 'touro', 'vaca', 'tropa']
                      setFormData({
                        ...formData,
                        destino: novoDestino,
                        categorias: formData.categorias.filter(c =>
                          categoriasValidas.includes(c.categoria.toLowerCase())
                        ),
                      })
                    }}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:border-accent"
                  >
                    <option value="">Selecione</option>
                    <option value="corte">Abate</option>
                    <option value="reprodução">Reprodução</option>
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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

              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                      <div className="flex items-center justify-between mb-4">
                        <h5 className={`text-xl font-bold text-gray-800 capitalize border-l-4 pl-4 py-2 bg-gray-50 rounded-r ${getCategoriaColor(cat.categoria)}`}>
                          Categoria: {cat.categoria}
                        </h5>
                        <button
                          type="button"
                          onClick={() => handleCategoryCollapse(cat.categoria)}
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                          aria-label={expandedCategories.has(cat.categoria) ? 'Colapsar' : 'Expandir'}
                        >
                          <svg 
                            className={`w-4 h-4 text-gray-600 transition-transform ${expandedCategories.has(cat.categoria) ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Conteúdo colapsável */}
                      {expandedCategories.has(cat.categoria) && (
                        <>
                          {/* Identificação */}
                          <div className="mb-5">
                        <h6 className={`text-sm font-bold text-gray-800 mb-3 border-l-3 pl-3 py-1 rounded-r ${getCategoriaColor(cat.categoria)} ${getCategoriaBgColor(cat.categoria)}`}>
                          Identificação
                        </h6>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                          <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
                              Quant. Inicial (cab){!cat.id && <span className="text-red-500">*</span>}
                            </label>
                            <Input
                              type="number"
                              value={cat.quant_inicial?.toString() || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                const val = e.target.value ? parseFloat(e.target.value) : undefined
                                updatedCategorias[catIndex] = { ...cat, quant_inicial: val }
                                if (!editingLote) {
                                  updatedCategorias[catIndex].quant_atual = val
                                }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              placeholder="0"
                              disabled={!!cat.id}
                              className={`border-gray-200 focus:border-accent ${cat.id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              title={cat.id ? 'Quant. inicial é definida na criação e não pode ser alterada' : ''}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
                              Quant. Atual (cab)
                            </label>
                            <Input
                              type="number"
                              value={cat.quant_atual?.toString() || ''}
                              readOnly
                              placeholder="0"
                              className="border-gray-200 bg-gray-50 cursor-not-allowed"
                              title="Quant. atual é calculada automaticamente pelas movimentações"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
                              Data Entrada <span className="text-red-500">*</span>
                            </label>
                            <Input
                              type="date"
                              value={cat.data_pesagem || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, data_pesagem: e.target.value }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              required
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 mt-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
                              Peso Entrada (kg/cab) <span className="text-red-500">*</span>
                            </label>
                            <NumericInput
                              value={cat.peso_entrada_kg_cab?.toString() || ''}
                              onChange={(value) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, peso_entrada_kg_cab: value ? parseFloat(value.replace(',', '.')) : undefined }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              required
                              placeholder="0,00"
                              decimalPlaces={2}
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 mt-2">
                          <div className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-5">
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
                              Plano Nutricional <span className="text-red-500">*</span>
                            </label>

                            {(() => {
                              const hasPlano = !!(cat.formulacao_id || cat.planos_rascunho?.length || cat.planos_cadastrados?.length)
                              const formulacao = cat.formulacao_id ? nutritionalOptions.find(opt => opt.id === cat.formulacao_id) : null
                              const titulo = formulacao?.name || (cat.planos_cadastrados?.find(p => p.ativo)?.nome) || 'Plano Nutricional'
                              const gmdValor = cat.gmd ? Number(cat.gmd.replace(',', '.')) : (formulacao?.gmd ?? null)
                              const consumoValor = formulacao?.consumo_meta ?? null
                              const planosCount = cat.planos_cadastrados?.filter(p => !p.data_fim).length || cat.planos_rascunho?.length || 0
                              const hasVigente = cat.planos_cadastrados?.some(p => p.ativo) || !!cat.formulacao_id
                              const planoVigenteData = cat.planos_cadastrados?.find(p => p.ativo)?.data_inicio || null

                              return (
                                <div className={`rounded-lg p-3 ${hasPlano ? (hasVigente ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200') : 'bg-yellow-50 border border-yellow-200'}`}>
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    {hasPlano ? (
                                      <div className="text-sm">
                                        <p className="font-medium text-gray-900">{titulo}</p>
                                        <p className="text-gray-600">
                                          {hasVigente && planoVigenteData ? ` • Início: ${new Date(planoVigenteData + 'T00:00:00').toLocaleDateString('pt-BR')}` : null}
                                          {hasVigente && cat.peso_vivo_meta_kg_cab ? ` • Meta: ${Number(cat.peso_vivo_meta_kg_cab).toFixed(2).replace('.', ',')} kg/cab` : null}
                                          {hasVigente && gmdValor ? ` • GMD: ${Number(gmdValor).toFixed(3).replace('.', ',')} kg/cab/dia` : null}
                                          {hasVigente && consumoValor ? ` • Consumo MS: ${Number(consumoValor).toFixed(2).replace('.', ',')}% PV` : null}
                                          {planosCount > 1 ? ` • ${planosCount} planos na sequência` : null}
                                          {!hasVigente && planosCount > 0 ? ' • Nenhum vigente' : null}
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-yellow-800">Crie o plano nutricional para esta categoria</p>
                                    )}
                                    <div className="flex flex-col gap-1 items-end">
                                      <Button
                                        type="button"
                                        size="sm"
                                        disabled={openingPlanos}
                                        onClick={() => abrirPlanosComAutoSave(cat.id || '', catIndex)}
                                      >
                                        {openingPlanos ? 'Salvando...' : hasPlano ? 'Gerenciar Planos' : 'Criar Plano'}
                                      </Button>
                                      <p className="text-[10px] text-gray-400">Salva o lote automaticamente</p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Peso e Performance */}
                      <div className="mb-5 border-t border-gray-200 pt-4">
                        <h6 className={`text-sm font-bold text-gray-800 mb-3 border-l-3 pl-3 py-1 rounded-r ${getCategoriaColor(cat.categoria)} ${getCategoriaBgColor(cat.categoria)}`}>
                          Peso e Performance
                        </h6>
                        
                        {/* Atual */}
                        <div className="mb-4">
                          <span className="text-sm font-bold text-gray-700 mb-2 block border-b border-gray-300 pb-1">Atual</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
                                Peso Vivo Atual (kg/cab)
                              </label>
                              <NumericInput
                                value={cat.peso_vivo_atual_kg_cab?.toString() || ''}
                                onChange={(value) => {
                                  const novoPeso = value ? parseFloat(value.replace(',', '.')) : undefined
                                  const updatedCategorias = [...formData.categorias]
                                  updatedCategorias[catIndex] = { ...cat, peso_vivo_atual_kg_cab: novoPeso }
                                  setFormData({ ...formData, categorias: updatedCategorias })
                                }}
                                placeholder="0,00"
                                decimalPlaces={2}
                                className={
                                  cat.planos_cadastrados?.some(p => p.ativo) &&
                                  cat.peso_vivo_atual_kg_cab != null &&
                                  originalPesos[cat.categoria.toLowerCase()] != null &&
                                  cat.peso_vivo_atual_kg_cab < (originalPesos[cat.categoria.toLowerCase()] ?? 0)
                                    ? 'border-red-500 focus:border-red-500 bg-red-50'
                                    : 'border-gray-200 focus:border-accent'
                                }
                              />
                              {cat.planos_cadastrados?.some(p => p.ativo) &&
                                cat.peso_vivo_atual_kg_cab != null &&
                                originalPesos[cat.categoria.toLowerCase()] != null &&
                                cat.peso_vivo_atual_kg_cab < (originalPesos[cat.categoria.toLowerCase()] ?? 0) && (
                                <p className="text-xs text-red-600 mt-1">O peso atual não pode ser menor que o peso original.</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                              <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                              <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                            <div className="col-span-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="mb-4">
                          <span className="text-sm font-bold text-gray-700 mb-2 block border-b border-gray-300 pb-1">Meta</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
                                Peso Vivo Meta (kg/cab)
                              </label>
                              <NumericInput
                                value={cat.peso_vivo_meta_kg_cab?.toString() || ''}
                                disabled
                                placeholder="0,00"
                                decimalPlaces={2}
                                className="bg-gray-50 border-gray-200 focus:border-accent opacity-60"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                              <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                            <div className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                            <div className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 mt-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                              <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
                              Ágio (%)
                            </label>
                            <Input
                              type="text"
                              value={cat.agio_percent != null ? `${cat.agio_percent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : ''}
                              disabled
                              placeholder="0,00%"
                              className="bg-gray-50 border-gray-200 focus:border-accent opacity-60"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                          <div className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 mt-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                          <div className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                        
                        <div className="mt-2 flex flex-col sm:flex-row gap-2">
                          <div className="flex-1 min-w-0">
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
                              Custo Total Entrada (R$/cab)
                            </label>
                            <Input
                              type="text"
                              value={cat.custo_total_entrada_reais_cab != null ? `R$ ${cat.custo_total_entrada_reais_cab.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                              disabled
                              placeholder="R$ 0,00"
                              className="bg-gray-50 border-gray-200 focus:border-accent opacity-60"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
                              Custo Total Entrada (R$/Lote)
                            </label>
                            <Input
                              type="text"
                              value={cat.custo_total_entrada_reais_lote != null ? `R$ ${cat.custo_total_entrada_reais_lote.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                              disabled
                              placeholder="R$ 0,00"
                              className="bg-gray-50 border-gray-200 focus:border-accent opacity-60"
                            />
                          </div>
                        </div>
                        
                        {/* Calculated Prices */}
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                          <h6 className="text-sm font-semibold text-blue-800 mb-3">Preços Sugeridos de Venda</h6>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-blue-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2 [-webkit-box-pack:end]">
                                Preço Custo (R$/@)
                              </label>
                              <Input
                                type="text"
                                value={cat.preco_custo_reais_arroba ? `R$ ${cat.preco_custo_reais_arroba.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                                disabled
                                placeholder="R$ 0,00"
                                className="bg-gray-100 border-blue-200 focus:border-blue-500 opacity-80"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-blue-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2 [-webkit-box-pack:end]">
                                Preço Custo (R$/cab)
                              </label>
                              <Input
                                type="text"
                                value={cat.preco_custo_cab ? `R$ ${cat.preco_custo_cab.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                                disabled
                                placeholder="R$ 0,00"
                                className="bg-gray-100 border-blue-200 focus:border-blue-500 opacity-80"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-green-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2 [-webkit-box-pack:end]">
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
                                className="bg-white border-green-300 focus:border-green-500 opacity-90 font-semibold text-green-700"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-green-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2 [-webkit-box-pack:end]">
                                Preço Venda Sugerido (R$/cab)
                              </label>
                              <Input
                                type="text"
                                value={cat.preco_venda_sugerido_cab ? `R$ ${cat.preco_venda_sugerido_cab.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                                disabled
                                placeholder="R$ 0,00"
                                className="bg-gray-100 border-green-300 focus:border-green-500 opacity-90 font-semibold text-green-700"
                              />
                            </div>
                            <div className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2">
                              <label className="block text-xs font-medium text-green-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2 [-webkit-box-pack:end]">
                                Faturamento Projetado (R$/Lote/Categoria)
                              </label>
                              <Input
                                type="text"
                                value={cat.faturamento_projetado_reais_lote_categoria ? `R$ ${cat.faturamento_projetado_reais_lote_categoria.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                                disabled
                                placeholder="R$ 0,00"
                                className="bg-gray-100 border-green-300 focus:border-green-500 opacity-90 font-semibold text-green-700"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Histórico de Movimentação - Timeline View */}
              {showForm && (movimentacaoData.length > 0 || maternidadeData.length > 0 || morteData.length > 0) && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <button
                    type="button"
                    onClick={() => setExpandedCategories(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('historico-movimentacao')) {
                        newSet.delete('historico-movimentacao')
                      } else {
                        newSet.add('historico-movimentacao')
                      }
                      return newSet
                    })}
                    className="flex items-center gap-2 w-full text-left"
                  >
                    <svg
                      className={`w-4 h-4 text-gray-600 transition-transform ${expandedCategories.has('historico-movimentacao') ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <h6 className="text-sm font-bold text-gray-800 border-l-3 border-red-500 pl-3 py-1 bg-red-50 rounded-r">
                      Histórico de Movimentação ({movimentacaoData.length + maternidadeData.length + morteData.length} eventos)
                    </h6>
                  </button>
                  
                  {expandedCategories.has('historico-movimentacao') && (
                  <div className="relative mt-4">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    
                    {/* Combined timeline events */}
                    <div className="space-y-4">
                      {[...movimentacaoData.map(m => ({ ...m, type: 'movimentacao' })),
                        ...maternidadeData.map(m => ({ ...m, type: 'maternidade' })),
                        ...morteData.map(m => ({ ...m, type: 'morte' }))]
                        .sort((a, b) => {
                          const dateA = a.type === 'movimentacao' ? a.data_movimentacao : a.data
                          const dateB = b.type === 'movimentacao' ? b.data_movimentacao : b.data
                          return new Date(dateB).getTime() - new Date(dateA).getTime()
                        })
                        .map((event) => {
                          const getEventColor = (event: any) => {
                            if (event.type === 'maternidade') return 'bg-pink-500 border-pink-500';
                            if (event.type === 'morte') return 'bg-red-500 border-red-500';
                            // Movimentação: distinguir saída (laranja) de entrada (verde)
                            if (event.tipo_movimentacao === 'saida') return 'bg-orange-500 border-orange-500';
                            if (event.tipo_movimentacao === 'entrada') return 'bg-green-500 border-green-500';
                            return 'bg-blue-500 border-blue-500';
                          };

                          const getEventLabel = (event: any) => {
                            if (event.type === 'movimentacao') {
                              const dir = event.tipo_movimentacao === 'saida' ? 'Saída'
                                : event.tipo_movimentacao === 'entrada' ? 'Entrada'
                                : 'Movimentação';
                              return { label: dir, category: event.categoria };
                            } else if (event.type === 'maternidade') {
                              return { label: 'Nascimento', category: event.categoria };
                            } else if (event.type === 'morte') {
                              return { label: 'Óbito', category: event.categoria };
                            }
                            return { label: '', category: '' };
                          };

                          const { label, category } = getEventLabel(event);
                          const colorClass = getEventColor(event);

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
                                  <span className="text-xs text-gray-400">{new Date(event.type === 'movimentacao' ? event.data_movimentacao : event.data).toLocaleDateString('pt-BR')}</span>
                                </div>

                                <div className="text-xs text-gray-600 mt-2">
                                  {event.type === 'movimentacao' && (
                                    <>
                                      {event.quantidade && `${event.quantidade} cabeça${event.quantidade > 1 ? 's' : ''}`}
                                      {event.peso_kg && ` • Peso: ${event.peso_kg} kg`}
                                      {event.observacoes && ` • ${event.observacoes}`}
                                    </>
                                  )}
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
                  )}
                </div>
              )}
            </div>

            {/* Informações Administrativas */}
            <div className="border-t pt-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Informações Administrativas</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                <div className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                <div className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                <div className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
                    Data Liberação SISBOV
                  </label>
                  <Input
                    type="date"
                    value={formData.data_liberacao_sisbov}
                    onChange={(e) => setFormData({ ...formData, data_liberacao_sisbov: e.target.value })}
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                <div className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
                <div className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
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
              (showInactive || lote.ativo) &&
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
                status={lote.ativo ?? undefined}
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

                  {ocupacaoPorLote[lote.id]?.pasto && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Tempo no pasto:</span> {ocupacaoPorLote[lote.id].pasto.periodo_ocupacao_dias} dias
                    </p>
                  )}

                  {ocupacaoPorLote[lote.id]?.modulo && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Módulo:</span> {ocupacaoPorLote[lote.id].modulo.modulo_nome}
                    </p>
                  )}

                  {ocupacaoPorLote[lote.id]?.modulo && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Tempo no módulo:</span> {ocupacaoPorLote[lote.id].modulo.periodo_ocupacao_dias} dias
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

                <div className="flex gap-2 mt-auto pt-3">
                  <button
                    className="rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 hover-scale-sm button-press whitespace-nowrap min-h-[44px] px-3 py-2 text-sm bg-gray-200 text-gray-800 focus:ring-gray-500 hover:shadow-md hover:bg-gray-300 flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(lote)
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 hover-scale-sm button-press whitespace-nowrap min-h-[44px] px-3 py-2 text-sm bg-gray-200 text-gray-800 focus:ring-gray-500 hover:shadow-md hover:bg-gray-300 text-red-600 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleActive(lote)
                    }}
                  >
                    {lote.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </CardItem>
            ))}
        </div>
      ) : null}

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

      {pesoEditModal?.isOpen && (
        <ConfirmModal
          isOpen={pesoEditModal.isOpen}
          onClose={() => {
            setPesoEditModal(null)
            setPendingSubmitData(null)
          }}
          onConfirm={() => {
            if (!pesoEditModal || !pendingSubmitData) return
            const today = new Date().toISOString().split('T')[0]
            const { loteId, recalculatedCategorias } = pendingSubmitData
            const categoriasComAjuste = recalculatedCategorias.map((cat) => {
              const alterada = pesoEditModal.categoriasAlteradas.find(
                (c) => c.categoria.toLowerCase() === cat.categoria.toLowerCase()
              )
              if (alterada) {
                return { ...cat, data_ajuste_peso: today }
              }
              return cat
            })
            setPesoEditModal(null)
            setPendingSubmitData(null)
            salvarCategorias(loteId, categoriasComAjuste)
          }}
          title="Aviso: alteração do peso atual"
          message={`Você está alterando o peso atual das seguintes categorias:\n\n${pesoEditModal.categoriasAlteradas.map((c) => `• ${c.categoria}: de ${c.pesoOriginal.toFixed(2).replace('.', ',')} kg para ${c.novoPeso.toFixed(2).replace('.', ',')} kg`).join('\n')}\n\nEsta alteração do peso atual vai impactar diretamente as métricas nutricionais e o cálculo de consumo do lote. A partir de agora, a projeção automática de peso passará a usar o valor informado como referência, em vez da data de início do plano.\n\nDeseja confirmar esta alteração do peso atual?`}
          confirmText="Confirmar alteração do peso atual"
          cancelText="Cancelar"
          variant="warning"
        />
      )}

      {autoSaveToast && (
        <div className="fixed top-4 right-4 z-[80] max-w-sm bg-white border border-green-300 shadow-lg rounded-lg p-4 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            </div>
            <p className="text-sm font-semibold text-gray-800">{autoSaveToast}</p>
            <button
              onClick={() => setAutoSaveToast(null)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              aria-label="Fechar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {selectedCategoriaForPlanos && (
        <PlanoNutricionalModal
          isOpen={isPlanoModalOpen}
          onClose={() => {
            setIsPlanoModalOpen(false)
            setSelectedCategoriaForPlanos(null)
            loadLotes()
            if (editingLote) {
              handleEdit(editingLote)
            }
          }}
          loteCategoriaId={selectedCategoriaForPlanos.loteCategoriaId || ''}
          categoria={selectedCategoriaForPlanos.categoria}
          fazendaId={editingLote?.fazenda_id}
          onPlanChanged={async () => {
            await loadLotes()
            if (editingLote) {
              await handleEdit(editingLote)
            }
          }}
        />
      )}

      {selectedDraftCategoriaIndex !== null && (
        <PlanoNutricionalDraftModal
          isOpen={isPlanoDraftModalOpen}
          onClose={() => {
            setIsPlanoDraftModalOpen(false)
            setSelectedDraftCategoriaIndex(null)
          }}
          categoria={formData.categorias[selectedDraftCategoriaIndex]?.categoria || ''}
          formulacoes={nutritionalOptions.map((opt) => ({
            id: opt.id,
            nome: opt.name,
            categoria: opt.categoria,
            gmd: opt.gmd,
            consumo_ms_percent_pv: opt.consumo_meta,
          }))}
          planos={formData.categorias[selectedDraftCategoriaIndex]?.planos_rascunho || []}
          onSave={(planos) => {
            const updatedCategorias = [...formData.categorias]
            const cat = updatedCategorias[selectedDraftCategoriaIndex]
            const primeiroPlano = planos[0]
            const f = nutritionalOptions.find((opt) => opt.id === primeiroPlano?.formulacao_id)
            updatedCategorias[selectedDraftCategoriaIndex] = {
              ...cat,
              planos_rascunho: planos,
              estrategia_nutricional: primeiroPlano?.nome || f?.name,
              formulacao_id: primeiroPlano?.formulacao_id,
              periodo: primeiroPlano?.periodo_dias,
              peso_vivo_meta_kg_cab: primeiroPlano?.peso_meta_kg,
              gmd: primeiroPlano?.gmd_planejado != null ? primeiroPlano.gmd_planejado.toFixed(3).replace('.', ',') : (f?.gmd !== undefined && f?.gmd !== null ? f.gmd.toFixed(3).replace('.', ',') : undefined),
              consumo_meta_porcentagem_pesovivo: f?.consumo_meta !== undefined && f?.consumo_meta !== null ? Number(f.consumo_meta) : undefined,
            }
            setFormData({ ...formData, categorias: updatedCategorias })
            setIsPlanoDraftModalOpen(false)
            setSelectedDraftCategoriaIndex(null)
          }}
        />
      )}
    </div>
  )
}
