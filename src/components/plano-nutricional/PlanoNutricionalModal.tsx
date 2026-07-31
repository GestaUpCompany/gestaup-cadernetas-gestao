import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { Button, Input, NumericInput, ConfirmModal, Modal } from '../ui'

interface Formulacao {
  id: string
  nome: string
  tipo?: string | null
  gmd?: number | null
  meta_consumo_ms_percent_pv?: number | null
  categoria?: string | null
}

interface PlanoNutricional {
  id: string
  lote_categoria_id: string
  fazenda_id: string
  nome: string
  formulacao_id: string
  periodo_dias: number
  peso_meta_kg: number
  gmd_planejado?: number | null
  ordem: number
  ativo: boolean
  data_inicio: string | null
  data_fim: string | null
  condicao_migracao: 'periodo' | 'peso' | 'ambos'
  migracao_automatica: boolean
  created_at: string
  updated_at: string
}

interface PlanoNutricionalModalProps {
  isOpen: boolean
  onClose: () => void
  loteCategoriaId: string
  categoria: string
  fazendaId?: string
  onPlanChanged?: () => void
}

const CONDICOES = {
  periodo: 'Período completo',
  peso: 'Peso atingido',
  ambos: 'O que vier primeiro',
}

export function PlanoNutricionalModal({
  isOpen,
  onClose,
  loteCategoriaId,
  categoria,
  fazendaId: fazendaIdProp,
  onPlanChanged,
}: PlanoNutricionalModalProps) {
  const [planos, setPlanos] = useState<PlanoNutricional[]>([])
  const [formulacoes, setFormulacoes] = useState<Formulacao[]>([])
  const [loading, setLoading] = useState(false)
  const [fazendaId, setFazendaId] = useState<string | undefined>(fazendaIdProp)
  const [pesoAtualCategoria, setPesoAtualCategoria] = useState<number | null>(null)

  const [editingPlano, setEditingPlano] = useState<PlanoNutricional | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    formulacao_id: '',
    periodo_dias: '',
    peso_meta_kg: '',
    gmd_planejado: '',
    condicao_migracao: 'periodo' as 'periodo' | 'peso' | 'ambos',
    migracao_automatica: true,
    tipo_entrada_periodo: 'periodo' as 'periodo' | 'data_final',
    data_final: '',
  })

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    variant: 'danger' | 'warning' | 'info'
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' })

  const [message, setMessage] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [showEncerrados, setShowEncerrados] = useState(false)

  const selectedFormulacao = useMemo(
    () => formulacoes.find((f) => f.id === formData.formulacao_id),
    [formulacoes, formData.formulacao_id]
  )

  useEffect(() => {
    if (!isOpen || !loteCategoriaId) return
    loadData()
  }, [isOpen, loteCategoriaId])

  const loadData = async () => {
    if (!loteCategoriaId) return
    setLoading(true)

    try {
      // Buscar lote_id da categoria atual
      const { data: categoriaData } = await supabase
        .from('lote_categorias')
        .select('lote_id, peso_vivo_atual_kg_cab')
        .eq('id', loteCategoriaId)
        .single()

      setPesoAtualCategoria(categoriaData?.peso_vivo_atual_kg_cab ?? null)

      // Buscar todos os IDs de categorias do mesmo lote (ativas e encerradas)
      const { data: todasCategorias } = await supabase
        .from('lote_categorias')
        .select('id')
        .eq('lote_id', categoriaData?.lote_id)

      const todosCategoriaIds = (todasCategorias || []).map(c => c.id)

      // Buscar planos nutricionais de todas as categorias do lote
      const { data: planosData, error: planosError } = await supabase
        .from('planos_nutricionais')
        .select('*')
        .in('lote_categoria_id', todosCategoriaIds.length > 0 ? todosCategoriaIds : [loteCategoriaId])
        .order('ordem', { ascending: true })

      if (planosError) throw planosError

      // Se não temos fazendaId, buscar via lote_categorias -> lotes
      let fId = fazendaId
      if (!fId) {
        const { data: loteData } = await supabase
          .from('lotes')
          .select('fazenda_id')
          .eq('id', categoriaData?.lote_id)
          .single()

        fId = loteData?.fazenda_id
        setFazendaId(fId)
      }

      // Buscar formulações da categoria
      if (fId) {
        const { data: formulacoesData, error: formError } = await supabase
          .from('formulacoes')
          .select('id, nome, tipo, gmd, meta_consumo_ms_percent_pv, categoria')
          .eq('fazenda_id', fId)
          .eq('ativo', true)
          .order('nome', { ascending: true })

        if (formError) throw formError
        setFormulacoes((formulacoesData as Formulacao[]) || [])
      }

      setPlanos((planosData as PlanoNutricional[]) || [])
    } catch (error) {
      console.error('Erro ao carregar planos nutricionais:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFormulacaoChange = (formulacaoId: string) => {
    const formulacao = formulacoes.find((f) => f.id === formulacaoId)
    setFormData((prev) => ({
      ...prev,
      formulacao_id: formulacaoId,
      nome: prev.nome || formulacao?.nome || '',
    }))
  }

  const resetForm = () => {
    setEditingPlano(null)
    setFormData({
      nome: '',
      formulacao_id: '',
      periodo_dias: '',
      peso_meta_kg: '',
      gmd_planejado: '',
      condicao_migracao: 'periodo',
      migracao_automatica: true,
      tipo_entrada_periodo: 'periodo',
      data_final: '',
    })
    setMessage(null)
  }

  const handleEdit = (plano: PlanoNutricional) => {
    setEditingPlano(plano)
    setFormData({
      nome: plano.nome,
      formulacao_id: plano.formulacao_id,
      periodo_dias: String(plano.periodo_dias),
      peso_meta_kg: String(plano.peso_meta_kg),
      gmd_planejado: plano.gmd_planejado != null ? plano.gmd_planejado.toString().replace('.', ',') : '',
      condicao_migracao: plano.condicao_migracao,
      migracao_automatica: plano.migracao_automatica,
      tipo_entrada_periodo: 'periodo',
      data_final: '',
    })
  }

  const validateForm = () => {
    if (!formData.nome.trim()) return 'Nome do plano é obrigatório'
    if (!formData.formulacao_id) return 'Formulação é obrigatória'
    if (formData.tipo_entrada_periodo === 'periodo') {
      if (!formData.periodo_dias || Number(formData.periodo_dias) <= 0) return 'Período deve ser maior que zero'
    } else {
      if (!formData.data_final) return 'Data final é obrigatória'
      const dataFinal = new Date(formData.data_final + 'T00:00:00')
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      if (dataFinal <= hoje) return 'Data final deve ser maior que a data atual'
    }
    if (!formData.peso_meta_kg || Number(formData.peso_meta_kg) <= 0) return 'Peso meta deve ser maior que zero'
    if (pesoAtualCategoria != null && Number(formData.peso_meta_kg) < pesoAtualCategoria) return `Peso meta (${Number(formData.peso_meta_kg).toFixed(2).replace('.', ',')} kg) não pode ser menor que o peso atual de ${pesoAtualCategoria.toFixed(2).replace('.', ',')} kg`
    if (!formData.gmd_planejado || Number(formData.gmd_planejado.replace(',', '.')) <= 0) return 'GMD deve ser maior que zero'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const error = validateForm()
    if (error) {
      setMessage(error)
      return
    }

    let periodo: number
    if (formData.tipo_entrada_periodo === 'periodo') {
      periodo = parseInt(formData.periodo_dias, 10)
    } else {
      const dataFinal = new Date(formData.data_final + 'T00:00:00')
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      periodo = Math.ceil((dataFinal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    }
    const pesoMeta = parseFloat(formData.peso_meta_kg.replace(',', '.'))
    const gmdValue = parseFloat(formData.gmd_planejado.replace(',', '.'))

    if (!fazendaId) {
      setMessage('Não foi possível identificar a fazenda. Feche e reabra o modal.')
      return
    }

    const data = {
      lote_categoria_id: loteCategoriaId,
      fazenda_id: fazendaId,
      nome: formData.nome.trim(),
      formulacao_id: formData.formulacao_id,
      periodo_dias: periodo,
      peso_meta_kg: pesoMeta,
      gmd_planejado: gmdValue,
      condicao_migracao: formData.condicao_migracao,
      migracao_automatica: formData.migracao_automatica,
    }

    try {
      if (editingPlano) {
        const { error } = await supabase
          .from('planos_nutricionais')
          .update(data)
          .eq('id', editingPlano.id)
        if (error) throw error
      } else {
        const maxOrdem = planos.length > 0 ? Math.max(...planos.map(p => p.ordem)) : -1
        const ordem = maxOrdem + 1

        const { error } = await supabase
          .from('planos_nutricionais')
          .insert({
            ...data,
            ordem,
            ativo: false,
            data_inicio: null,
          })
        if (error) throw error
      }

      resetForm()
      await loadData()
      onPlanChanged?.()
    } catch (error) {
      console.error('Erro ao salvar plano:', error)
      setMessage('Erro ao salvar plano. Tente novamente.')
    }
  }

  const handleDelete = async (plano: PlanoNutricional) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Plano',
      message: `Tem certeza que deseja excluir o plano "${plano.nome}"?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('planos_nutricionais').delete().eq('id', plano.id)
          if (error) throw error
          await loadData()
          onPlanChanged?.()
        } catch (error) {
          console.error('Erro ao excluir plano:', error)
        }
      },
    })
  }

  const handleIniciarPlano = async (planoId?: string) => {
    if (planos.length === 0) return

    let planoParaIniciar: PlanoNutricional | undefined
    if (planoId) {
      planoParaIniciar = planos.find((p) => p.id === planoId)
    } else {
      planoParaIniciar = [...planos]
        .sort((a, b) => a.ordem - b.ordem)
        .find((p) => !p.data_fim)
    }

    if (!planoParaIniciar) {
      setMessage('Nenhum plano disponível para iniciar.')
      return
    }

    const primeiroPlano = planoParaIniciar

    setConfirmModal({
      isOpen: true,
      title: 'Iniciar Plano Nutricional',
      message: `Iniciar o plano "${primeiroPlano.nome}"?\n\nEle se tornará o plano ativo a partir de hoje.`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          const dataInicio = new Date().toISOString().split('T')[0]

          // Capturar peso e RC atuais da categoria para servir de baseline do plano
          const { data: catData } = await supabase
            .from('lote_categorias')
            .select('peso_vivo_atual_kg_cab, rc_atual')
            .eq('id', loteCategoriaId)
            .single()

          const { error } = await supabase
            .from('planos_nutricionais')
            .update({
              ativo: true,
              data_inicio: dataInicio,
              data_fim: null,
              peso_inicio_kg_cab: catData?.peso_vivo_atual_kg_cab ?? null,
              rc_inicio: catData?.rc_atual ?? null,
            })
            .eq('id', primeiroPlano.id)
          if (error) throw error

          const formulacao = formulacoes.find((f) => f.id === primeiroPlano.formulacao_id)
          await supabase
            .from('lote_categorias')
            .update({
              formulacao_id: primeiroPlano.formulacao_id,
              periodo: primeiroPlano.periodo_dias,
              peso_vivo_meta_kg_cab: primeiroPlano.peso_meta_kg,
              estrategia_nutricional: primeiroPlano.nome,
              gmd: primeiroPlano.gmd_planejado != null ? primeiroPlano.gmd_planejado.toFixed(3).replace('.', ',') : (formulacao?.gmd ? formulacao.gmd.toFixed(3).replace('.', ',') : null),
              consumo_meta_porcentagem_pesovivo: formulacao?.meta_consumo_ms_percent_pv ?? null,
            })
            .eq('id', loteCategoriaId)

          // Criar registro de entrada do plano
          await supabase.rpc('criar_snapshot_entrada', {
            p_plano_id: primeiroPlano.id,
            p_lote_categoria_id: loteCategoriaId,
            p_motivo: 'inicio',
          })

          await loadData()
          onPlanChanged?.()
        } catch (error) {
          console.error('Erro ao iniciar plano:', error)
          setMessage('Erro ao iniciar plano. Tente novamente.')
        }
      },
    })
  }

  const handleIniciarPlanoRetroativo = async (planoId?: string) => {
    if (planos.length === 0) return

    let planoParaIniciar: PlanoNutricional | undefined
    if (planoId) {
      planoParaIniciar = planos.find((p) => p.id === planoId)
    } else {
      planoParaIniciar = [...planos]
        .sort((a, b) => a.ordem - b.ordem)
        .find((p) => !p.data_fim)
    }

    if (!planoParaIniciar) {
      setMessage('Nenhum plano disponível para iniciar.')
      return
    }

    // Buscar data_pesagem e peso_entrada_kg_cab da categoria
    const { data: catData } = await supabase
      .from('lote_categorias')
      .select('data_pesagem, peso_entrada_kg_cab, rc_atual')
      .eq('id', loteCategoriaId)
      .single()

    if (!catData?.data_pesagem) {
      setMessage('Data de entrada (pesagem) não cadastrada para esta categoria. Cadastre a data de entrada no formulário do lote antes de iniciar o plano retroativo.')
      return
    }

    if (!catData?.peso_entrada_kg_cab) {
      setMessage('Peso de entrada não cadastrado para esta categoria. Cadastre o peso de entrada no formulário do lote antes de iniciar o plano retroativo.')
      return
    }

    const dataPesagem = catData.data_pesagem as string
    const pesoEntrada = catData.peso_entrada_kg_cab as number

    // Determinar GMD: plano > formulação
    const formulacao = formulacoes.find((f) => f.id === planoParaIniciar.formulacao_id)
    const gmd = planoParaIniciar.gmd_planejado != null
      ? planoParaIniciar.gmd_planejado
      : formulacao?.gmd ?? null

    if (!gmd || gmd <= 0) {
      setMessage('GMD não definida para este plano. Defina o GMD planejado no plano ou na formulação antes de iniciar retroativo.')
      return
    }

    // Calcular peso projetado
    const dataPesagemDate = new Date(dataPesagem + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((today.getTime() - dataPesagemDate.getTime()) / (1000 * 60 * 60 * 24))
    const pesoProjetado = pesoEntrada + (gmd * Math.max(diffDays, 0))

    const dataPesagemBR = dataPesagemDate.toLocaleDateString('pt-BR')
    const pesoEntradoBR = pesoEntrada.toFixed(2).replace('.', ',')
    const pesoProjetadoBR = pesoProjetado.toFixed(2).replace('.', ',')
    const diffDiasTexto = diffDays > 0 ? `${diffDays} dias` : 'hoje'

    setConfirmModal({
      isOpen: true,
      title: 'Iniciar Plano Retroativo',
      message: `O plano "${planoParaIniciar.nome}" será iniciado com data de ${dataPesagemBR} (data de entrada).\n\nO peso atual será recalculado retroativamente:\n• Peso de entrada: ${pesoEntradoBR} kg\n• GMD: ${gmd.toFixed(3).replace('.', ',')} kg/dia\n• Período: ${diffDiasTexto}\n• Novo peso atual: ${pesoProjetadoBR} kg\n\nO peso atual será sobrescrito com o valor projetado. Confirmar?`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          // 1. Atualizar plano nutricional
          const { error: planoError } = await supabase
            .from('planos_nutricionais')
            .update({
              ativo: true,
              data_inicio: dataPesagem,
              data_fim: null,
              peso_inicio_kg_cab: pesoEntrada,
              rc_inicio: catData?.rc_atual ?? null,
            })
            .eq('id', planoParaIniciar!.id)
          if (planoError) throw planoError

          // 2. Atualizar lote_categorias: formulação, GMD, meta, limpar data_ajuste_peso, sobrescrever peso atual
          const { error: catError } = await supabase
            .from('lote_categorias')
            .update({
              formulacao_id: planoParaIniciar!.formulacao_id,
              periodo: planoParaIniciar!.periodo_dias,
              peso_vivo_meta_kg_cab: planoParaIniciar!.peso_meta_kg,
              estrategia_nutricional: planoParaIniciar!.nome,
              gmd: gmd.toFixed(3).replace('.', ','),
              consumo_meta_porcentagem_pesovivo: formulacao?.meta_consumo_ms_percent_pv ?? null,
              data_ajuste_peso: null,
              peso_vivo_atual_kg_cab: pesoProjetado,
            })
            .eq('id', loteCategoriaId)
          if (catError) throw catError

          // 3. Criar snapshot de entrada
          await supabase.rpc('criar_snapshot_entrada', {
            p_plano_id: planoParaIniciar!.id,
            p_lote_categoria_id: loteCategoriaId,
            p_motivo: 'inicio_retroativo',
          })

          await loadData()
          onPlanChanged?.()
        } catch (error) {
          console.error('Erro ao iniciar plano retroativo:', error)
          setMessage('Erro ao iniciar plano retroativo. Tente novamente.')
        }
      },
    })
  }

  const executarMigracao = async (planoDestinoId?: string) => {
    try {
      const { error } = await supabase.rpc('migrar_plano_nutricional', {
        p_lote_categoria_id: loteCategoriaId,
        p_plano_destino_id: planoDestinoId || null,
        p_motivo: planoDestinoId ? 'manual' : 'manual',
      })

      if (error) throw error

      await loadData()
      onPlanChanged?.()
    } catch (error: any) {
      console.error('Erro ao migrar plano:', error)
      setMessage(error.message || 'Erro ao migrar plano')
    }
  }

  const handleMigracaoAutomatica = () => {
    const planoVigente = planos.find((p) => p.ativo)
    if (!planoVigente) {
      setMessage('Não há plano vigente para migrar')
      return
    }

    if (isUltimoPlano(planoVigente.id)) {
      setConfirmModal({
        isOpen: true,
        title: 'Encerrar Plano',
        message: `Encerrar o plano "${planoVigente.nome}"?\n\nEste é o último plano da sequência. Ao atingir a condição, o plano será encerrado automaticamente.`,
        variant: 'warning',
        onConfirm: async () => {
          try {
            const { error } = await supabase.rpc('encerrar_plano_nutricional', {
              p_lote_categoria_id: loteCategoriaId,
            })
            if (error) throw error
            await loadData()
            onPlanChanged?.()
          } catch (error: any) {
            console.error('Erro ao encerrar plano:', error)
            setMessage(error.message || 'Erro ao encerrar plano')
          }
        },
      })
      return
    }

    const proximoPlano = planos.find((p) => p.ordem > planoVigente.ordem && !p.data_fim)
    if (!proximoPlano) {
      setMessage('Não há próximo plano cadastrado')
      return
    }

    setConfirmModal({
      isOpen: true,
      title: 'Migrar Plano',
      message: `Migrar do plano "${planoVigente.nome}" para "${proximoPlano.nome}"?\n\nA migração automática sempre avança para o próximo plano na sequência que ainda não foi executado, mesmo que você tenha pulado planos em migrações manuais anteriores.`,
      variant: 'warning',
      onConfirm: () => executarMigracao(),
    })
  }

  const handleMigracaoManual = (planoDestino: PlanoNutricional) => {
    const planoVigente = planos.find((p) => p.ativo)
    if (!planoVigente) {
      setMessage('Não há plano vigente')
      return
    }

    setConfirmModal({
      isOpen: true,
      title: 'Migrar para Plano Selecionado',
      message: `Migrar do plano "${planoVigente.nome}" para "${planoDestino.nome}"?\n\nUm registro do estado atual será salvo para auditoria. Esta ação não pode ser desfeita.\n\nImportante: a migração automática (se ativada) sempre avança para o próximo plano na sequência que ainda não foi executado, mesmo que você tenha pulado planos anteriormente.`,
      variant: 'warning',
      onConfirm: () => executarMigracao(planoDestino.id),
    })
  }

  const planoVigente = planos.find((p) => p.ativo)

  const planosNaoEncerrados = [...planos].filter((p) => !p.data_fim).sort((a, b) => a.ordem - b.ordem)
  const ultimoPlanoNaoEncerrado = planosNaoEncerrados[planosNaoEncerrados.length - 1]
  const isUltimoPlano = (planoId: string) => ultimoPlanoNaoEncerrado?.id === planoId

  const handleEncerrarPlano = () => {
    if (!planoVigente) return

    setConfirmModal({
      isOpen: true,
      title: 'Encerrar Plano',
      message: `Encerrar o plano "${planoVigente.nome}"?\n\nO plano será finalizado hoje e um registro de saída será salvo para auditoria. Esta ação não pode ser desfeita.`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase.rpc('encerrar_plano_nutricional', {
            p_lote_categoria_id: loteCategoriaId,
          })
          if (error) throw error
          await loadData()
          onPlanChanged?.()
        } catch (error: any) {
          console.error('Erro ao encerrar plano:', error)
          setMessage(error.message || 'Erro ao encerrar plano')
        }
      },
    })
  }

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    const sorted = [...planos].sort((a, b) => a.ordem - b.ordem)
    const [moved] = sorted.splice(fromIndex, 1)
    sorted.splice(toIndex, 0, moved)
    const reordered = sorted.map((p, i) => ({ ...p, ordem: i }))
    setPlanos(reordered)

    try {
      await Promise.all(
        reordered.map((p) =>
          supabase.from('planos_nutricionais').update({ ordem: p.ordem }).eq('id', p.id)
        )
      )
      onPlanChanged?.()
    } catch (error) {
      console.error('Erro ao reordenar planos:', error)
      await loadData()
    }
  }

  const handleDragStart = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    setDraggingIndex(index)
    e.dataTransfer.setData('text/plain', index.toString())
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (dropIndex: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (isNaN(dragIndex) || dragIndex === dropIndex) {
      setDragOverIndex(null)
      setDraggingIndex(null)
      return
    }
    handleReorder(dragIndex, dropIndex)
    setDragOverIndex(null)
    setDraggingIndex(null)
  }

  const handleDragEnd = () => {
    setDragOverIndex(null)
    setDraggingIndex(null)
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Planos Nutricionais — ${categoria?.replace(/\b\w/g, (c) => c.toUpperCase())}`} size="lg">
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3 text-gray-500">
            <svg className="animate-spin h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm">Carregando planos...</p>
          </div>
        ) : (
        <div className="space-y-6">
          {/* ========== SEÇÃO: PLANOS ========== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-800">Planos</h3>
              <span className="text-xs text-gray-400">Visualize e gerencie a sequência</span>
            </div>

          {/* Plano vigente */}
          {planoVigente && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-green-900">Plano Vigente</h4>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                  Ativo
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Nome:</span>
                  <p className="font-medium text-gray-900">{planoVigente.nome}</p>
                </div>
                <div>
                  <span className="text-gray-600">Período:</span>
                  <p className="font-medium text-gray-900">{planoVigente.periodo_dias} dias</p>
                </div>
                <div>
                  <span className="text-gray-600">Peso Meta:</span>
                  <p className="font-medium text-gray-900">{planoVigente.peso_meta_kg.toFixed(2).replace('.', ',')} kg</p>
                </div>
                <div>
                  <span className="text-gray-600">Condição:</span>
                  <p className="font-medium text-gray-900">
                    {planoVigente.migracao_automatica ? CONDICOES[planoVigente.condicao_migracao] : 'Manual'}
                  </p>
                </div>
              </div>
              {planoVigente.migracao_automatica && !isUltimoPlano(planoVigente.id) && planos.some((p) => p.ordem > planoVigente.ordem && !p.data_fim) && (
                <div className="mt-4 pt-3 border-t border-green-200">
                  <Button size="sm" onClick={handleMigracaoAutomatica}>
                    Migrar para Próximo Plano
                  </Button>
                </div>
              )}
              {!planoVigente.migracao_automatica && (
                <div className="mt-4 pt-3 border-t border-green-200">
                  <Button size="sm" variant="danger" onClick={handleEncerrarPlano}>
                    Encerrar Plano
                  </Button>
                </div>
              )}
            </div>
          )}

          {!planoVigente && planos.length > 0 && (() => {
            const planosDisponiveis = [...planos]
              .sort((a, b) => a.ordem - b.ordem)
              .filter((p) => !p.data_fim)
            const planosEncerrados = [...planos]
              .sort((a, b) => a.ordem - b.ordem)
              .filter((p) => p.data_fim)
            return (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-yellow-800">
                    Nenhum plano está vigente. Inicie um plano para começar.
                  </p>
                </div>
                {planosDisponiveis.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {planosDisponiveis.map((plano) => (
                        <Button
                          key={plano.id}
                          size="sm"
                          onClick={() => handleIniciarPlano(plano.id)}
                        >
                          Iniciar "{plano.nome}"
                        </Button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {planosDisponiveis.map((plano) => (
                        <Button
                          key={plano.id}
                          size="sm"
                          variant="secondary"
                          onClick={() => handleIniciarPlanoRetroativo(plano.id)}
                        >
                          Iniciar Retroativo "{plano.nome}"
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {planosEncerrados.length > 0 && (
                  <div className="pt-2 border-t border-yellow-200">
                    <p className="text-xs text-yellow-700 mb-2">Planos encerrados (podem ser reativados):</p>
                    <div className="space-y-2">
                      {planosEncerrados.map((plano) => (
                        <div key={plano.id} className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleIniciarPlano(plano.id)}
                          >
                            Reativar "{plano.nome}"
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEdit(plano)}
                          >
                            Editar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Lista de planos */}
          {planos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-800">Sequência de Planos</h4>
                  <p className="text-xs text-gray-500">Arraste para reordenar. Planos já iniciados não podem ser movidos.</p>
                </div>
                {planos.some((p) => p.data_fim) && (
                  <button
                    type="button"
                    onClick={() => setShowEncerrados(!showEncerrados)}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    {showEncerrados ? 'Ocultar encerrados' : 'Mostrar encerrados'}
                  </button>
                )}
              </div>
              {[...planos]
                .sort((a, b) => a.ordem - b.ordem)
                .filter((plano) => showEncerrados || !plano.data_fim)
                .map((plano, sortedIndex) => {
                  const isVigente = plano.ativo
                  const canDrag = !plano.data_inicio
                  return (
                    <div
                      key={plano.id}
                      draggable={canDrag}
                      onDragStart={canDrag ? handleDragStart(sortedIndex) : undefined}
                      onDragOver={canDrag ? handleDragOver(sortedIndex) : undefined}
                      onDrop={canDrag ? handleDrop(sortedIndex) : undefined}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between border rounded-lg p-3 transition-colors ${
                        isVigente
                          ? 'bg-green-50 border-green-200'
                          : dragOverIndex === sortedIndex
                          ? 'border-primary bg-primary/5'
                          : draggingIndex === sortedIndex
                          ? 'border-gray-300 opacity-50'
                          : 'border-gray-200'
                      } ${canDrag ? 'cursor-move' : ''}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {canDrag && (
                          <span className="text-gray-400 select-none flex-shrink-0" title="Arraste para reordenar">⠿</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {sortedIndex + 1}. {plano.nome}
                            {isVigente && (
                              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">Vigente</span>
                            )}
                            {plano.data_fim && !isVigente && (
                              <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">Encerrado</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {plano.periodo_dias} dias • Peso meta: {plano.peso_meta_kg.toFixed(2).replace('.', ',')} kg
                          </p>
                          {plano.data_fim && (
                            <p className="text-xs text-gray-500">Encerrado em {new Date(plano.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                          )}
                          {!plano.data_fim && (
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  const newVal = !plano.migracao_automatica
                                  await supabase
                                    .from('planos_nutricionais')
                                    .update({ migracao_automatica: newVal })
                                    .eq('id', plano.id)
                                  await loadData()
                                  onPlanChanged?.()
                                }}
                                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                                  plano.migracao_automatica ? 'bg-primary' : 'bg-gray-300'
                                }`}
                                title={plano.migracao_automatica
                                  ? (isUltimoPlano(plano.id) ? 'Encerramento automático ativado' : 'Migração automática ativada')
                                  : (isUltimoPlano(plano.id) ? 'Encerramento automático desativado' : 'Migração automática desativada')}
                              >
                                <span
                                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                    plano.migracao_automatica ? 'translate-x-3.5' : 'translate-x-0.5'
                                  }`}
                                />
                              </button>
                              <span className="text-xs text-gray-500">
                                {plano.migracao_automatica
                                  ? (isUltimoPlano(plano.id) ? 'Encerramento automático' : 'Migração automática')
                                  : (isUltimoPlano(plano.id) ? 'Encerramento manual' : 'Migração manual')}
                              </span>
                              {plano.migracao_automatica && (
                                <select
                                  value={plano.condicao_migracao}
                                  onChange={async (e) => {
                                    e.stopPropagation()
                                    await supabase
                                      .from('planos_nutricionais')
                                      .update({ condicao_migracao: e.target.value })
                                      .eq('id', plano.id)
                                    await loadData()
                                    onPlanChanged?.()
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 bg-white focus:border-primary focus:outline-none cursor-pointer"
                                  title="Condição para migração/encerramento automático"
                                >
                                  <option value="periodo">Período completo</option>
                                  <option value="peso">Peso atingido</option>
                                  <option value="ambos">O que vier primeiro</option>
                                </select>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {!plano.data_fim && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEdit(plano)}
                          >
                            Editar
                          </Button>
                        )}
                        {!plano.ativo && !plano.data_fim && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDelete(plano)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Excluir
                          </Button>
                        )}
                        {!plano.ativo && !plano.data_fim && planoVigente && (
                          <Button size="sm" onClick={() => handleMigracaoManual(plano)}>
                            Migrar para este
                          </Button>
                        )}
                        {plano.data_fim && !planoVigente && (
                          <Button
                            size="sm"
                            onClick={() => handleIniciarPlano(plano.id)}
                          >
                            Reativar
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}

          </div>

          {/* ========== SEÇÃO: CRIAR/EDITAR PLANO ========== */}
          <div className="border-t-2 border-gray-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-base font-semibold text-gray-800">
                {editingPlano ? 'Editar Plano' : 'Novo Plano'}
              </h3>
              <span className="text-xs text-gray-400">
                {editingPlano ? 'Altere os dados e salve' : 'Preencha os dados e adicione à sequência'}
              </span>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Plano
                  </label>
                  <Input
                    type="text"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    placeholder="Ex: Engorda Inicial"
                    required
                    className="border-gray-200 focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formulação *
                  </label>
                  <select
                    value={formData.formulacao_id}
                    onChange={(e) => handleFormulacaoChange(e.target.value)}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary input-focus min-h-[44px] text-sm sm:text-base border-gray-200 focus:border-accent bg-white"
                  >
                    <option value="">Selecione uma formulação...</option>
                    {formulacoes.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome} {f.tipo ? `(${f.tipo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Duração do Plano *
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo_entrada_periodo: 'periodo' })}
                        className={`px-2 py-0.5 rounded border text-xs font-medium transition-all ${
                          formData.tipo_entrada_periodo === 'periodo'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-primary'
                        }`}
                      >
                        Dias
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo_entrada_periodo: 'data_final' })}
                        className={`px-2 py-0.5 rounded border text-xs font-medium transition-all ${
                          formData.tipo_entrada_periodo === 'data_final'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-primary'
                        }`}
                      >
                        Data final
                      </button>
                    </div>
                  </div>
                  {formData.tipo_entrada_periodo === 'periodo' ? (
                    <NumericInput
                      value={formData.periodo_dias}
                      onChange={(value) =>
                        setFormData({ ...formData, periodo_dias: value })
                      }
                      decimalPlaces={0}
                      placeholder="Ex: 30"
                    />
                  ) : (
                    <>
                      <Input
                        type="date"
                        value={formData.data_final}
                        onChange={(e) =>
                          setFormData({ ...formData, data_final: e.target.value })
                        }
                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                        className="border-gray-200 focus:border-accent"
                      />
                      {formData.data_final && (
                        <p className="text-xs text-gray-500 mt-1">
                          Equivale a {Math.ceil((new Date(formData.data_final + 'T00:00:00').getTime() - new Date(new Date().setHours(0,0,0,0)).getTime()) / (1000 * 60 * 60 * 24))} dias
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso Meta (kg/cab) *
                  </label>
                  <NumericInput
                    value={formData.peso_meta_kg}
                    onChange={(value) =>
                      setFormData({ ...formData, peso_meta_kg: value })
                    }
                    decimalPlaces={2}
                    placeholder="Ex: 450,00"
                  />
                  {pesoAtualCategoria != null && formData.peso_meta_kg && (
                    (() => {
                      const pesoMeta = parseFloat(formData.peso_meta_kg)
                      const diff = pesoMeta - pesoAtualCategoria
                      if (isNaN(pesoMeta) || pesoMeta <= 0) return null
                      return (
                        <p className={`text-xs mt-1 ${diff <= 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {diff > 0
                            ? `${diff.toFixed(2).replace('.', ',')} kg acima do peso atual (${pesoAtualCategoria.toFixed(2).replace('.', ',')} kg)`
                            : `Peso meta deve ser maior que o peso atual (${pesoAtualCategoria.toFixed(2).replace('.', ',')} kg)`}
                        </p>
                      )
                    })()
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GMD (kg/cab/dia) *
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formData.gmd_planejado}
                    onChange={(e) => {
                      const value = e.target.value.replace('.', ',')
                      setFormData({ ...formData, gmd_planejado: value })
                    }}
                    placeholder="Ex: 0,300"
                    required
                    className="border-gray-200 focus:border-accent"
                  />
                  {selectedFormulacao?.gmd != null && (
                    <p className="text-xs text-gray-500 mt-1">
                      GMD da formulação: {selectedFormulacao.gmd.toFixed(3).replace('.', ',')} kg/cab/dia (referência)
                    </p>
                  )}
                </div>
              </div>

              {formData.migracao_automatica && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editingPlano && isUltimoPlano(editingPlano.id)
                    ? 'Condição para Encerramento Automático'
                    : 'Condição para Migração Automática'}
                </label>
                <div className="flex flex-wrap gap-3">
                  {(['periodo', 'peso', 'ambos'] as const).map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, condicao_migracao: cond })
                      }
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.condicao_migracao === cond
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {CONDICOES[cond]}
                    </button>
                  ))}
                </div>
              </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Migração Automática
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, migracao_automatica: !formData.migracao_automatica })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.migracao_automatica ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.migracao_automatica ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-600">
                    {formData.migracao_automatica
                      ? (editingPlano && isUltimoPlano(editingPlano.id)
                        ? 'Encerra automaticamente ao atingir a condição'
                        : 'Migra automaticamente ao atingir a condição')
                      : (editingPlano && isUltimoPlano(editingPlano.id)
                        ? 'Apenas encerramento manual pelo usuário'
                        : 'Apenas migração manual pelo usuário')}
                  </span>
                </div>
              </div>

              {/* Dados da formulação selecionada */}
              {selectedFormulacao && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <h5 className="text-sm font-semibold text-blue-900 mb-2">
                    Dados da Formulação
                  </h5>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">GMD:</span>
                      <p className="font-medium text-gray-900">
                        {formData.gmd_planejado
                          ? `${formData.gmd_planejado} kg/cab/dia`
                          : '0,000 kg/cab/dia'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Consumo MS (%PV):</span>
                      <p className="font-medium text-gray-900">
                        {selectedFormulacao.meta_consumo_ms_percent_pv?.toFixed(2).replace('.', ',') || '—'}%
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Tipo:</span>
                      <p className="font-medium text-gray-900">
                        {selectedFormulacao.tipo || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {message && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {message}
                </div>
              )}

              {formulacoes.length === 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  Não há formulações cadastradas para esta fazenda. Cadastre uma formulação primeiro.
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={formulacoes.length === 0}>
                  {editingPlano ? 'Salvar Alterações' : 'Adicionar Plano'}
                </Button>
                {editingPlano && (
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Cancelar Edição
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          confirmModal.onConfirm()
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />
    </>
  )
}
