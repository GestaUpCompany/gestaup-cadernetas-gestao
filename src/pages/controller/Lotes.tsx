import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal, CardItem } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface LoteCategoria {
  id?: string
  categoria: string
  quant_inicial?: number
  data_pesagem?: string
  peso_entrada?: number
  peso_entrada_arrobas?: number
  gmd?: number
  periodo?: number
  rc_inicial?: number
  quant_atual?: number
  peso_vivo_kg?: number
  peso_vivo_meta_kg?: number
  dias_restantes_meta?: number
  data_meta?: string
  estrategia_nutricional?: string
  raca?: string
  sexo?: string
  idade?: number
  preco_animal_kg?: number
  preco_animal_cab?: number
  custo_operacional?: number
  morte?: number
  consumo?: number
  abate?: number
  transf_entrada?: number
  transf_saida?: number
  qtd_bezerros?: number
  ativo?: boolean
}

interface Lote {
  id: string
  fazenda_id: string
  nome: string
  n_cabecas?: number
  categorias?: LoteCategoria[]
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
  const [formData, setFormData] = useState({
    nome: '',
    numero_cabecas: '',
    categorias: [] as LoteCategoria[],
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
    const categoriaExists = formData.categorias.some(c => c.categoria === categoria)
    if (categoriaExists) {
      setFormData({
        ...formData,
        categorias: formData.categorias.filter((c) => c.categoria !== categoria),
      })
    } else {
      const novaCategoria: LoteCategoria = {
        categoria,
        quant_inicial: undefined,
        data_pesagem: undefined,
        peso_entrada: undefined,
        peso_entrada_arrobas: undefined,
        gmd: undefined,
        periodo: undefined,
        rc_inicial: undefined,
        quant_atual: undefined,
        peso_vivo_kg: undefined,
        peso_vivo_meta_kg: undefined,
        dias_restantes_meta: undefined,
        data_meta: undefined,
        estrategia_nutricional: undefined,
        raca: undefined,
        sexo: undefined,
        idade: undefined,
        preco_animal_kg: undefined,
        preco_animal_cab: undefined,
        custo_operacional: undefined,
        morte: undefined,
        consumo: undefined,
        abate: undefined,
        transf_entrada: undefined,
        transf_saida: undefined,
        qtd_bezerros: undefined,
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

  // Calcular peso_entrada_arrobas automaticamente para cada categoria: (peso_entrada * (rc_inicial/100)) / 15
  useEffect(() => {
    const updatedCategorias = formData.categorias.map(cat => {
      if (cat.peso_entrada && cat.rc_inicial) {
        const pesoEntradaArrobas = (cat.peso_entrada * (cat.rc_inicial / 100)) / 15
        return { ...cat, peso_entrada_arrobas: pesoEntradaArrobas }
      }
      return cat
    })
    setFormData({ ...formData, categorias: updatedCategorias })
  }, [formData.categorias.map(cat => `${cat.peso_entrada}-${cat.rc_inicial}`).join(',')])

  // Calcular período (dias) automaticamente para cada categoria: dias desde data_pesagem até data atual
  useEffect(() => {
    const updatedCategorias = formData.categorias.map(cat => {
      if (cat.data_pesagem) {
        const dataPesagem = new Date(cat.data_pesagem)
        const currentDate = new Date()
        const diffTime = currentDate.getTime() - dataPesagem.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return { ...cat, periodo: diffDays > 0 ? diffDays : 0 }
      }
      return cat
    })
    setFormData({ ...formData, categorias: updatedCategorias })
  }, [formData.categorias.map(cat => cat.data_pesagem).join(',')])

  // Calcular peso_vivo_kg automaticamente para cada categoria: peso_entrada + (periodo * gmd)
  useEffect(() => {
    const updatedCategorias = formData.categorias.map(cat => {
      if (cat.peso_entrada && cat.gmd && cat.periodo) {
        const pesoVivoKg = cat.peso_entrada + (cat.periodo * cat.gmd)
        return { ...cat, peso_vivo_kg: pesoVivoKg }
      }
      return cat
    })
    setFormData({ ...formData, categorias: updatedCategorias })
  }, [formData.categorias.map(cat => `${cat.peso_entrada}-${cat.gmd}-${cat.periodo}`).join(',')])

  // Calcular data_meta automaticamente para cada categoria quando peso_vivo_meta_kg, peso_vivo_kg ou gmd mudarem
  useEffect(() => {
    const updatedCategorias = formData.categorias.map(cat => {
      const pesoMeta = cat.peso_vivo_meta_kg
      const pesoAtual = cat.peso_vivo_kg
      const gmd = cat.gmd

      if (pesoMeta && pesoAtual && gmd && gmd > 0) {
        const diasParaMeta = (pesoMeta - pesoAtual) / gmd
        const dataHoje = new Date()
        const dataMeta = new Date(dataHoje.getTime() + (diasParaMeta * 24 * 60 * 60 * 1000))

        // Formatar data como yyyy-mm-dd
        const year = dataMeta.getFullYear()
        const month = String(dataMeta.getMonth() + 1).padStart(2, '0')
        const day = String(dataMeta.getDate()).padStart(2, '0')
        const dataMetaFormatada = `${year}-${month}-${day}`

        return { ...cat, data_meta: dataMetaFormatada }
      }
      return cat
    })
    setFormData({ ...formData, categorias: updatedCategorias })
  }, [formData.categorias.map(cat => `${cat.peso_vivo_meta_kg}-${cat.peso_vivo_kg}-${cat.gmd}`).join(',')])

  // Calcular dias_restantes_meta automaticamente para cada categoria: dias desde data atual até data_meta
  useEffect(() => {
    const updatedCategorias = formData.categorias.map(cat => {
      if (cat.data_meta) {
        const dataMeta = new Date(cat.data_meta)
        const currentDate = new Date()
        const diffTime = dataMeta.getTime() - currentDate.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return { ...cat, dias_restantes_meta: diffDays > 0 ? diffDays : 0 }
      }
      return cat
    })
    setFormData({ ...formData, categorias: updatedCategorias })
  }, [formData.categorias.map(cat => cat.data_meta).join(',')])

  // Calcular preco_animal_kg automaticamente para cada categoria: preco_animal_cab / peso_vivo_kg
  useEffect(() => {
    const updatedCategorias = formData.categorias.map(cat => {
      if (cat.preco_animal_cab && cat.peso_vivo_kg && cat.peso_vivo_kg > 0) {
        const precoKg = cat.preco_animal_cab / cat.peso_vivo_kg
        return { ...cat, preco_animal_kg: precoKg }
      }
      return cat
    })
    setFormData({ ...formData, categorias: updatedCategorias })
  }, [formData.categorias.map(cat => `${cat.preco_animal_cab}-${cat.peso_vivo_kg}`).join(',')])

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
    const lotesComCategorias = (lotesData || []).map(lote => ({
      ...lote,
      pasto_nome: lote.pastos?.nome,
      categorias: (categoriasData || []).filter(cat => cat.lote_id === lote.id)
    }))

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

    // Salvar categorias em lote_categorias
    const categoriasToInsert = formData.categorias.map(cat => ({
      lote_id: loteId,
      categoria: cat.categoria,
      quant_inicial: cat.quant_inicial ? parseInt(cat.quant_inicial.toString()) : null,
      data_pesagem: cat.data_pesagem || null,
      peso_entrada: cat.peso_entrada ? parseFloat(cat.peso_entrada.toString()) : null,
      peso_entrada_arrobas: cat.peso_entrada_arrobas ? parseFloat(cat.peso_entrada_arrobas.toString()) : null,
      gmd: cat.gmd ? parseFloat(cat.gmd.toString()) : null,
      periodo: cat.periodo ? parseInt(cat.periodo.toString()) : null,
      rc_inicial: cat.rc_inicial ? parseFloat(cat.rc_inicial.toString()) : null,
      quant_atual: cat.quant_atual ? parseInt(cat.quant_atual.toString()) : null,
      peso_vivo_kg: cat.peso_vivo_kg ? parseFloat(cat.peso_vivo_kg.toString()) : null,
      peso_vivo_meta_kg: cat.peso_vivo_meta_kg ? parseFloat(cat.peso_vivo_meta_kg.toString()) : null,
      dias_restantes_meta: cat.dias_restantes_meta ? parseInt(cat.dias_restantes_meta.toString()) : null,
      data_meta: cat.data_meta || null,
      estrategia_nutricional: cat.estrategia_nutricional || null,
      raca: cat.raca || null,
      sexo: cat.sexo || null,
      idade: cat.idade ? parseInt(cat.idade.toString()) : null,
      preco_animal_kg: cat.preco_animal_kg ? parseFloat(cat.preco_animal_kg.toString()) : null,
      preco_animal_cab: cat.preco_animal_cab ? parseFloat(cat.preco_animal_cab.toString()) : null,
      custo_operacional: cat.custo_operacional ? parseFloat(cat.custo_operacional.toString()) : null,
      morte: cat.morte ? parseInt(cat.morte.toString()) : 0,
      consumo: cat.consumo ? parseInt(cat.consumo.toString()) : 0,
      abate: cat.abate ? parseInt(cat.abate.toString()) : 0,
      transf_entrada: cat.transf_entrada ? parseInt(cat.transf_entrada.toString()) : 0,
      transf_saida: cat.transf_saida ? parseInt(cat.transf_saida.toString()) : 0,
      qtd_bezerros: cat.qtd_bezerros ? parseInt(cat.qtd_bezerros.toString()) : null,
      ativo: cat.ativo ?? true,
    }))

    const { error: categoriasError } = await supabase
      .from('lote_categorias')
      .insert(categoriasToInsert)

    if (categoriasError) {
      console.error('Erro ao salvar categorias:', categoriasError)
    } else {
      setFormData({
        nome: '',
        numero_cabecas: '',
        categorias: [] as LoteCategoria[],
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

setFormData({
      nome: lote.nome,
      numero_cabecas: lote.n_cabecas?.toString() || '',
      categorias: lote.categorias || [],
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categorias <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {categoriasOpcoes.map((categoria) => {
                    const isSelected = formData.categorias.some(c => c.categoria === categoria)
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
                    <div key={catIndex} className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h5 className="text-md font-medium text-gray-700 mb-3 capitalize">
                        Categoria: {cat.categoria}
                      </h5>
                      
                      {/* Identificação */}
                      <div className="mb-4">
                        <h6 className="text-sm font-semibold text-gray-600 mb-2">Identificação</h6>
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
                              <option value="Aberdeen Angus">Aberdeen Angus</option>
                              <option value="Brahman">Brahman</option>
                              <option value="Brangus">Brangus</option>
                              <option value="Caracu">Caracu</option>
                              <option value="Canchin">Canchin</option>
                              <option value="Charolês">Charolês</option>
                              <option value="Cruzamento">Cruzamento</option>
                              <option value="Cruz/Nelore">Cruz/Nelore</option>
                              <option value="GOL">GOL</option>
                              <option value="Guzerá">Guzerá</option>
                              <option value="Hereford">Hereford</option>
                              <option value="Limousin">Limousin</option>
                              <option value="Mestiço">Mestiço</option>
                              <option value="Nelore">Nelore</option>
                              <option value="Red Angus">Red Angus</option>
                              <option value="SRD">SRD</option>
                              <option value="Senepol">Senepol</option>
                              <option value="Simental">Simental</option>
                              <option value="Tabapuah">Tabapuah</option>
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
                      <div className="mb-4 border-t border-gray-200 pt-4">
                        <h6 className="text-sm font-semibold text-gray-600 mb-2">Quantidade e Datas</h6>
                        <div className="grid grid-cols-6 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quant. Inicial
                            </label>
                            <Input
                              type="number"
                              value={cat.quant_inicial?.toString() || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, quant_inicial: e.target.value ? parseFloat(e.target.value) : undefined }
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
                        </div>
                      </div>

                      {/* Peso e Performance */}
                      <div className="mb-4 border-t border-gray-200 pt-4">
                        <h6 className="text-sm font-semibold text-gray-600 mb-2">Peso e Performance</h6>
                        <div className="grid grid-cols-6 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Peso Entrada (kg)
                            </label>
                            <Input
                              type="number"
                              step="0.1"
                              value={cat.peso_entrada?.toString() || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, peso_entrada: e.target.value ? parseFloat(e.target.value) : undefined }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              placeholder="0"
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Peso Entrada (@)
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
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Peso Vivo Atual (kg)
                            </label>
                            <Input
                              type="number"
                              step="0.1"
                              value={cat.peso_vivo_kg?.toFixed(1) || ''}
                              disabled
                              placeholder="0"
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
                              value={cat.peso_vivo_meta_kg?.toString() || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, peso_vivo_meta_kg: e.target.value ? parseFloat(e.target.value) : undefined }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
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
                              value={cat.gmd?.toString() || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, gmd: e.target.value ? parseFloat(e.target.value) : undefined }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              placeholder="0"
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
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Data Meta
                            </label>
                            <Input
                              type="date"
                              value={cat.data_meta || ''}
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
                          <div>
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
                        </div>
                      </div>

                      {/* Financeiro */}
                      <div className="mb-4 border-t border-gray-200 pt-4">
                        <h6 className="text-sm font-semibold text-gray-600 mb-2">Financeiro</h6>
                        <div className="grid grid-cols-6 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Preço (R$/kg)
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              value={cat.preco_animal_kg?.toFixed(2) || ''}
                              disabled
                              placeholder="0.00"
                              className="border-gray-200 focus:border-accent opacity-60"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Preço (R$/cab)
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              value={cat.preco_animal_cab?.toString() || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, preco_animal_cab: e.target.value ? parseFloat(e.target.value) : undefined }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              placeholder="Ex: 5300.00"
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1 whitespace-nowrap">
                              Custo Operacional (R$/cab/Per.)
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              value={cat.custo_operacional?.toString() || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, custo_operacional: e.target.value ? parseFloat(e.target.value) : undefined }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              placeholder="Ex: 1.80"
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Nutrição */}
                      <div className="border-t border-gray-200 pt-4">
                        <h6 className="text-sm font-semibold text-gray-600 mb-2">Nutrição</h6>
                        <div className="grid grid-cols-6 gap-2">
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Estratégia Nutricional
                            </label>
                            <Input
                              type="text"
                              value={cat.estrategia_nutricional || ''}
                              onChange={(e) => {
                                const updatedCategorias = [...formData.categorias]
                                updatedCategorias[catIndex] = { ...cat, estrategia_nutricional: e.target.value }
                                setFormData({ ...formData, categorias: updatedCategorias })
                              }}
                              placeholder="Ex: RIP"
                              className="border-gray-200 focus:border-accent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                <div className="col-span-2">
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
