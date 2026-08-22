import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Card, Modal, Input } from '../../components/ui'
import { getFazendaIdForUser } from '../../utils/fazendaContext'
import {
  getMonitoramentoData,
  getPrioridades,
  getFuncionariosComSetor,
  getSessoesAbertasByFazenda,
  getImprevistosRecentesByFazenda,
  getSessoesByAtividade,
  getImprevistosByAtividade,
  Atividade,
  PrioridadeAtividade,
  FuncionarioComSetor,
  AtividadeSessao,
  AtividadeImprevisto,
} from '../../services/atividadesService'

// === Constantes ===

const PRIORIDADE_CORES: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-yellow-400',
  3: 'bg-green-500',
}

const STATUS_CORES: Record<string, string> = {
  pendente: 'bg-gray-100 text-gray-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  concluido: 'bg-green-100 text-green-700',
  concluida: 'bg-green-100 text-green-700',
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  concluida: 'Concluída',
}

const STATUS_BORDA_HEX: Record<string, string> = {
  pendente: '#d1d5db',
  em_andamento: '#3b82f6',
  concluido: '#22c55e',
  concluida: '#22c55e',
}

const STATUS_CHIPS = [
  { value: 'pendente', label: 'Pendente', corAtivo: 'bg-gray-200 text-gray-700' },
  { value: 'em_andamento', label: 'Em Andamento', corAtivo: 'bg-blue-200 text-blue-700' },
  { value: 'concluido', label: 'Concluído', corAtivo: 'bg-green-200 text-green-700' },
] as const

const ORDEM_GRUPOS = ['em_andamento', 'pendente', 'concluido']

const GRUPO_INFO: Record<string, { label: string; corDot: string; corTexto: string }> = {
  em_andamento: { label: 'Em Andamento', corDot: 'bg-blue-500', corTexto: 'text-blue-700' },
  pendente: { label: 'Pendentes', corDot: 'bg-gray-400', corTexto: 'text-gray-700' },
  concluido: { label: 'Concluídas', corDot: 'bg-green-500', corTexto: 'text-green-700' },
}

const KANBAN_COLUNAS = [
  { status: 'em_andamento', label: 'Em Andamento', corDot: 'bg-blue-500', headerBg: 'bg-blue-50' },
  { status: 'pendente', label: 'Pendentes', corDot: 'bg-gray-400', headerBg: 'bg-gray-50' },
  { status: 'concluido', label: 'Concluídas', corDot: 'bg-green-500', headerBg: 'bg-green-50' },
]

const AVATAR_CORES = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500', 'bg-indigo-500']

// === Helpers ===

function formatarDataHora(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatarData(iso: string): string {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function formatarPeriodo(dataInicio: string, dataFim: string): string {
  if (!dataInicio) return ''
  if (dataInicio === dataFim) return formatarData(dataInicio)
  return `${formatarData(dataInicio)} - ${formatarData(dataFim)}`
}

function getIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function getCorAvatar(nome: string): string {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_CORES[Math.abs(hash) % AVATAR_CORES.length]
}

function getCorBarra(taxa: number): string {
  if (taxa >= 70) return 'bg-green-500'
  if (taxa >= 40) return 'bg-yellow-400'
  return 'bg-red-500'
}

function formatarTempo(segundos: number): string {
  if (segundos <= 0) return '0min'
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}min`
  if (m > 0) return `${m}min${s > 0 ? ` ${s}s` : ''}`
  return `${s}s`
}

function formatarHoraCurta(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// === Componente ===

export function MonitoramentoAtividades() {
  const { user } = useAuth()
  const [fazendaId, setFazendaId] = useState<string | null>(null)
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [loading, setLoading] = useState(true)
  const [prioridades, setPrioridades] = useState<PrioridadeAtividade[]>([])
  const [funcionarios, setFuncionarios] = useState<FuncionarioComSetor[]>([])
  const [detalheAtividade, setDetalheAtividade] = useState<Atividade | null>(null)
  const [sessoesAbertas, setSessoesAbertas] = useState<AtividadeSessao[]>([])
  const [imprevistosRecentes, setImprevistosRecentes] = useState<AtividadeImprevisto[]>([])
  const [sessoesDetalhe, setSessoesDetalhe] = useState<AtividadeSessao[]>([])
  const [imprevistosDetalhe, setImprevistosDetalhe] = useState<AtividadeImprevisto[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const atividadeParam = searchParams.get('atividade')

  // Filtros
  const [busca, setBusca] = useState('')
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>([])
  const [prioridadeSelecionada, setPrioridadeSelecionada] = useState<number | ''>('')
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<string>('')

  // Vista
  const [vista, setVista] = useState<'lista' | 'kanban'>('lista')
  const [expandirNaoPrevistas, setExpandirNaoPrevistas] = useState(false)

  // Flash e tendencia
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  const [tendencia, setTendencia] = useState<Record<string, 'up' | 'down' | null>>({})
  const prevEstadoRef = useRef<Map<string, string> | null>(null)
  const prevCountsRef = useRef<{ total: number; pendente: number; em_andamento: number; concluido: number; atrasada: number } | null>(null)
  const isFirstLoadRef = useRef(true)

  const loadFazenda = useCallback(async () => {
    if (!user) return
    const id = await getFazendaIdForUser(user.id)
    if (id) setFazendaId(id)
  }, [user])

  useEffect(() => { loadFazenda() }, [loadFazenda])

  useEffect(() => {
    if (!fazendaId) return
    loadPrioridades()
    loadFuncionarios()
    loadAtividades()
    loadSessoesAbertas()
    loadImprevistosRecentes()
  }, [fazendaId])

  const loadSessoesAbertas = async () => {
    if (!fazendaId) return
    const data = await getSessoesAbertasByFazenda(fazendaId)
    setSessoesAbertas(data)
  }

  const loadImprevistosRecentes = async () => {
    if (!fazendaId) return
    const data = await getImprevistosRecentesByFazenda(fazendaId, 7)
    setImprevistosRecentes(data)
  }

  const loadPrioridades = async () => {
    if (!fazendaId) return
    setPrioridades(await getPrioridades(fazendaId))
  }

  const loadFuncionarios = async () => {
    if (!fazendaId) return
    const data = await getFuncionariosComSetor(fazendaId)
    setFuncionarios(data.filter((f) => f.ativo))
  }

  const loadAtividades = async (isRealtime = false) => {
    if (!fazendaId) return
    if (!isRealtime) setLoading(true)
    const data = await getMonitoramentoData(fazendaId)

    // Detectar mudancas para flash
    const novosEstados = new Map<string, string>()
    data.forEach((a) => {
      const funcHash = a.funcionarios?.map((af) => af.status_individual).join(',') || ''
      novosEstados.set(a.id, `${a.status}|${funcHash}`)
    })
    if (prevEstadoRef.current && isRealtime) {
      const changed = new Set<string>()
      novosEstados.forEach((estado, id) => {
        if (prevEstadoRef.current!.get(id) !== estado) changed.add(id)
      })
      // Novas atividades
      prevEstadoRef.current!.forEach((_, id) => {
        if (!novosEstados.has(id)) changed.add(id)
      })
      if (changed.size > 0) {
        setFlashIds(changed)
        setTimeout(() => setFlashIds(new Set()), 2000)
      }
    }
    prevEstadoRef.current = novosEstados

    // Tendencia
    const counts = { total: data.length, pendente: 0, em_andamento: 0, concluido: 0, atrasada: 0 }
    data.forEach((a) => {
      if (a.status in counts && a.status !== 'total') {
        counts[a.status as keyof typeof counts]++
      }
      if (a.atrasada) counts.atrasada++
    })
    if (prevCountsRef.current && !isFirstLoadRef.current) {
      const t: Record<string, 'up' | 'down' | null> = {}
      Object.keys(counts).forEach((key) => {
        const prev = prevCountsRef.current![key as keyof typeof counts]
        const curr = counts[key as keyof typeof counts]
        t[key] = curr > prev ? 'up' : curr < prev ? 'down' : null
      })
      setTendencia(t)
    }
    prevCountsRef.current = counts
    isFirstLoadRef.current = false

    setAtividades(data)
    if (!isRealtime) setLoading(false)
  }

  // Abrir detalhe automaticamente quando vier de ?atividade=<id>
  useEffect(() => {
    if (!atividadeParam || !fazendaId) return
    const loadAtividadeEspecifica = async () => {
      const { data } = await supabase
        .from('atividades')
        .select(`
          id, titulo, descricao, local, setor_id, data_inicio, data_fim,
          prioridade, status, atrasada, nao_prevista, ativo,
          setor:setores(nome),
          funcionarios:atividade_funcionarios(
            id, atividade_id, funcionario_id, status_individual,
            inicio_at, fim_at, detalhamento, tempo_gasto_segundos,
            funcionario:funcionarios(nome, setor:setores(nome))
          )
        `)
        .eq('id', atividadeParam)
        .eq('fazenda_id', fazendaId)
        .single()
      if (data) {
        const mapped = {
          ...data,
          setor_nome: (data as any).setor?.nome || null,
          funcionarios: (data as any).funcionarios?.map((af: any) => ({
            ...af,
            funcionario_nome: af.funcionario?.nome || null,
            setor_nome: af.funcionario?.setor?.nome || null,
          })) || [],
        } as unknown as Atividade
        setDetalheAtividade(mapped)
        setSearchParams({}, { replace: true })
      }
    }
    loadAtividadeEspecifica()
  }, [atividadeParam, fazendaId, setSearchParams])

  // Realtime
  useEffect(() => {
    if (!fazendaId) return
    const channel = supabase
      .channel('monitoramento_atividades')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'atividade_funcionarios' },
        () => { loadAtividades(true); loadSessoesAbertas() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'atividades', filter: `fazenda_id=eq.${fazendaId}` },
        () => loadAtividades(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'atividade_sessoes' },
        () => { loadSessoesAbertas(); if (detalheAtividade) loadDetalheSessoesImprevistos(detalheAtividade.id) }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'atividade_imprevistos' },
        () => { loadImprevistosRecentes(); if (detalheAtividade) loadDetalheSessoesImprevistos(detalheAtividade.id) }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fazendaId, detalheAtividade])

  // Carregar sessoes e imprevistos ao abrir detalhe
  const loadDetalheSessoesImprevistos = async (atividadeId: string) => {
    const [s, i] = await Promise.all([
      getSessoesByAtividade(atividadeId),
      getImprevistosByAtividade(atividadeId),
    ])
    setSessoesDetalhe(s)
    setImprevistosDetalhe(i)
  }

  useEffect(() => {
    if (detalheAtividade) {
      loadDetalheSessoesImprevistos(detalheAtividade.id)
    } else {
      setSessoesDetalhe([])
      setImprevistosDetalhe([])
    }
  }, [detalheAtividade])

  // === Filtragem ===
  const atividadesFiltradas = useMemo(() => {
    let result = [...atividades]
    if (busca.trim()) {
      const termo = busca.trim().toLowerCase()
      result = result.filter((a) =>
        a.titulo.toLowerCase().includes(termo) ||
        (a.descricao || '').toLowerCase().includes(termo)
      )
    }
    if (statusSelecionados.length > 0) {
      result = result.filter((a) => {
        if (statusSelecionados.includes('atrasada')) {
          const outras = statusSelecionados.filter((s) => s !== 'atrasada')
          if (outras.length === 0) return a.atrasada === true
          return a.atrasada === true || outras.includes(a.status)
        }
        return statusSelecionados.includes(a.status)
      })
    }
    if (prioridadeSelecionada !== '') {
      result = result.filter((a) => a.prioridade === prioridadeSelecionada)
    }
    if (funcionarioSelecionado) {
      result = result.filter((a) =>
        a.funcionarios?.some((af) => af.funcionario_id === funcionarioSelecionado)
      )
    }
    result.sort((a, b) => (b.data_inicio || '').localeCompare(a.data_inicio || ''))
    return result
  }, [atividades, busca, statusSelecionados, prioridadeSelecionada, funcionarioSelecionado])

  // Separar planejadas e nao previstas
  const planejadasFiltradas = useMemo(() => atividadesFiltradas.filter((a) => !a.nao_prevista), [atividadesFiltradas])
  const naoPrevistasFiltradas = useMemo(() => atividadesFiltradas.filter((a) => a.nao_prevista), [atividadesFiltradas])

  const usarGrupos = statusSelecionados.length === 0 && vista === 'lista'

  const atividadesAgrupadas = useMemo(() => {
    if (!usarGrupos) return null
    const grupos: Record<string, Atividade[]> = {}
    planejadasFiltradas.forEach((a) => {
      const s = a.status || 'pendente'
      if (!grupos[s]) grupos[s] = []
      grupos[s].push(a)
    })
    return grupos
  }, [planejadasFiltradas, usarGrupos])

  const kpis = useMemo(() => {
    const total = planejadasFiltradas.length
    const porStatus = { pendente: 0, em_andamento: 0, concluido: 0, atrasada: 0 }
    planejadasFiltradas.forEach((a) => {
      if (porStatus[a.status as keyof typeof porStatus] !== undefined) {
        porStatus[a.status as keyof typeof porStatus]++
      }
      if (a.atrasada) porStatus.atrasada++
    })
    const taxaConclusao = total > 0 ? Math.round((porStatus.concluido / total) * 100) : 0
    return { total, ...porStatus, taxaConclusao }
  }, [planejadasFiltradas])

  const metricasFuncionario = useMemo(() => {
    const map: Record<string, { nome: string; atribuidas: number; concluidas: number; emAndamento: number; pendentes: number; tempoProdutivo: number; naoPrevistas: number }> = {}
    // Planejadas
    planejadasFiltradas.forEach((a) => {
      a.funcionarios?.forEach((af) => {
        if (!map[af.funcionario_id]) {
          map[af.funcionario_id] = { nome: af.funcionario_nome || 'Sem nome', atribuidas: 0, concluidas: 0, emAndamento: 0, pendentes: 0, tempoProdutivo: 0, naoPrevistas: 0 }
        }
        const m = map[af.funcionario_id]
        m.atribuidas++
        m.tempoProdutivo += af.tempo_gasto_segundos || 0
        if (af.status_individual === 'concluida') {
          m.concluidas++
        } else if (af.status_individual === 'em_andamento') {
          m.emAndamento++
        } else {
          m.pendentes++
        }
      })
    })
    // Nao previstas
    naoPrevistasFiltradas.forEach((a) => {
      a.funcionarios?.forEach((af) => {
        if (!map[af.funcionario_id]) {
          map[af.funcionario_id] = { nome: af.funcionario_nome || 'Sem nome', atribuidas: 0, concluidas: 0, emAndamento: 0, pendentes: 0, tempoProdutivo: 0, naoPrevistas: 0 }
        }
        const m = map[af.funcionario_id]
        m.naoPrevistas++
        m.tempoProdutivo += af.tempo_gasto_segundos || 0
      })
    })
    return Object.values(map).sort((a, b) => b.atribuidas - a.atribuidas)
  }, [planejadasFiltradas, naoPrevistasFiltradas])

  // === Handlers ===
  const toggleStatus = (status: string) => {
    setStatusSelecionados((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status])
  }

  const handleKpiClick = (status: string) => {
    toggleStatus(status)
  }

  const limparFiltros = () => {
    setBusca('')
    setStatusSelecionados([])
    setPrioridadeSelecionada('')
    setFuncionarioSelecionado('')
  }

  const temFiltrosAtivos = busca.trim() || statusSelecionados.length > 0 || prioridadeSelecionada !== '' || funcionarioSelecionado

  // === Render helpers ===

  const renderTendencia = (key: string) => {
    const t = tendencia[key]
    if (t === 'up') return <span className="text-green-500 text-xs ml-1">▲</span>
    if (t === 'down') return <span className="text-red-500 text-xs ml-1">▼</span>
    return null
  }

  const renderCard = (atividade: Atividade, compact = false) => {
    const totalFunc = atividade.funcionarios?.length || 0
    const concluidas = atividade.funcionarios?.filter((af) => af.status_individual === 'concluida').length || 0
    const progresso = totalFunc > 0 ? Math.round((concluidas / totalFunc) * 100) : 0
    const isAtrasada = atividade.atrasada === true
    const isFlash = flashIds.has(atividade.id)
    const bordaCor = STATUS_BORDA_HEX[atividade.status] || '#d1d5db'
    const tempoTotal = atividade.funcionarios?.reduce((acc, af) => acc + (af.tempo_gasto_segundos || 0), 0) || 0
    const isConcluida = atividade.status === 'concluido' || atividade.status === 'concluida'

    return (
      <div
        key={atividade.id}
        onClick={() => setDetalheAtividade(atividade)}
        className={`p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all border-l-4 ${isAtrasada ? 'bg-red-50' : 'bg-white'} ${isFlash ? 'ring-2 ring-blue-400' : ''}`}
        style={{ borderLeftColor: bordaCor }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {!atividade.nao_prevista && (
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${PRIORIDADE_CORES[atividade.prioridade] || 'bg-gray-400'}`} />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-gray-800 truncate">{atividade.titulo}</h4>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                <span>{formatarPeriodo(atividade.data_inicio, atividade.data_fim)}</span>
                {atividade.local && <span>📍 {atividade.local}</span>}
                {isConcluida && tempoTotal > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-green-700 font-medium">
                    ⏱ {formatarTempo(tempoTotal)}
                  </span>
                )}
              </div>
              {!compact && atividade.funcionarios && atividade.funcionarios.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {atividade.funcionarios.map((af) => {
                    const icone = af.status_individual === 'concluida' ? '✓' : af.status_individual === 'em_andamento' ? '▶' : '○'
                    const cor = af.status_individual === 'concluida' ? 'text-green-600' : af.status_individual === 'em_andamento' ? 'text-blue-600' : 'text-gray-400'
                    return <span key={af.id} className={`text-xs ${cor}`}>{icone} {af.funcionario_nome}</span>
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CORES[atividade.status] || 'bg-gray-100'}`}>
              {STATUS_LABELS[atividade.status] || atividade.status}
            </span>
            {isAtrasada && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                Atrasada
              </span>
            )}
            {atividade.nao_prevista && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                Não prevista
              </span>
            )}
          </div>
        </div>

        {/* Barra de progresso */}
        {totalFunc > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{concluidas}/{totalFunc} concluíram</span>
              {progresso === 100 ? (
                <span className="text-green-600 font-medium">✓ Completo</span>
              ) : progresso > 0 ? (
                <span className="text-blue-600">{progresso}%</span>
              ) : null}
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progresso === 100 ? 'bg-green-500' : progresso > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  const STATUS_BADGE_CORES: Record<string, string> = {
    pendente: 'bg-gray-100 text-gray-600',
    em_andamento: 'bg-blue-100 text-blue-700',
    concluida: 'bg-green-100 text-green-700',
  }

  const STATUS_BADGE_LABELS: Record<string, string> = {
    pendente: 'Pendente',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
  }

  // === KPIs ===
  const KPI_ITEMS = [
    { key: 'em_andamento', label: 'Em Andamento', cor: 'text-blue-600', clickable: true, highlight: 'blue' },
    { key: 'pendente', label: 'Pendentes', cor: 'text-gray-700', clickable: true, highlight: null },
    { key: 'concluido', label: 'Concluídas', cor: 'text-green-600', clickable: true, highlight: null },
    { key: 'atrasada', label: 'Atrasadas', cor: 'text-red-600', clickable: true, highlight: 'red' },
  ] as const

  // === Render ===

  if (loading && atividades.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="h-11 flex-1 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-11 w-56 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-11 w-48 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 w-28 bg-gray-200 rounded-full animate-pulse" />)}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-full min-w-0 overflow-x-hidden">
      {/* Header + view toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Monitoramento de Atividades</h2>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setVista('lista')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${vista === 'lista' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
          >
            Lista
          </button>
          <button
            onClick={() => setVista('kanban')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${vista === 'kanban' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
          >
            Board
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <Input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou descrição..."
            className="flex-1 border-gray-300 focus:border-accent"
          />
          <select
            value={funcionarioSelecionado}
            onChange={(e) => setFuncionarioSelecionado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px] bg-white text-sm md:w-56"
          >
            <option value="">Todos os responsáveis</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
          <select
            value={prioridadeSelecionada}
            onChange={(e) => setPrioridadeSelecionada(e.target.value === '' ? '' : Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px] bg-white text-sm md:w-48"
          >
            <option value="">Todas as prioridades</option>
            {prioridades.map((p) => (
              <option key={p.nivel} value={p.nivel}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_CHIPS.map((chip) => {
            const ativo = statusSelecionados.includes(chip.value)
            return (
              <button
                key={chip.value}
                onClick={() => toggleStatus(chip.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  ativo ? chip.corAtivo + ' ring-2 ring-offset-1 ring-gray-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {chip.label}
              </button>
            )
          })}
          {temFiltrosAtivos && (
            <button
              onClick={limparFiltros}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPI_ITEMS.map((kpi) => {
          const valor = (kpis as any)[kpi.key] as number
          const isClickable = kpi.clickable && valor > 0
          const highlightClass =
            kpi.highlight === 'red' && kpis.atrasada > 0 ? 'ring-2 ring-red-200' :
            kpi.highlight === 'blue' && kpis.em_andamento > 0 ? 'ring-2 ring-blue-200' : ''
          return (
            <Card
              key={kpi.key}
              className={`bg-white p-4 border-0 shadow-sm transition-all ${highlightClass} ${isClickable ? 'cursor-pointer hover:shadow-md' : ''}`}
              onClick={isClickable ? () => handleKpiClick(kpi.key === 'concluido' ? 'concluido' : kpi.key) : undefined}
            >
              <p className="text-xs text-gray-500 mb-1">
                {kpi.label}
                {renderTendencia(kpi.key)}
              </p>
              <p className={`text-2xl font-bold ${kpi.cor}`}>{valor}</p>
            </Card>
          )
        })}
      </div>

      {/* Agora: sessoes abertas em tempo real */}
      {sessoesAbertas.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            Trabalhando agora
            <span className="text-sm font-normal text-gray-500">({sessoesAbertas.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sessoesAbertas.map((s) => {
              const decorrido = Math.floor((Date.now() - new Date(s.inicio_at).getTime()) / 1000)
              return (
                <Card
                  key={s.id}
                  className="bg-blue-50 border border-blue-100 p-3 shadow-sm cursor-pointer hover:shadow-md transition-all"
                  onClick={() => {
                    if (s.atividade_id) {
                      const atv = atividades.find((a) => a.id === s.atividade_id)
                      if (atv) setDetalheAtividade(atv)
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 text-sm truncate">{s.atividade_titulo || 'Atividade'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.funcionario_nome || 'Funcionário'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold tabular-nums text-blue-700">{formatarTempo(decorrido)}</p>
                      <p className="text-[10px] text-gray-400">desde {formatarHoraCurta(s.inicio_at)}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Conteudo: Lista ou Kanban */}
      {vista === 'lista' ? (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Atividades {planejadasFiltradas.length !== atividades.length && `(${planejadasFiltradas.length} de ${atividades.filter(a => !a.nao_prevista).length})`}
          </h3>
          {planejadasFiltradas.length === 0 ? (
            <Card className="bg-white p-8 border-0 shadow-sm text-center">
              <p className="text-gray-600">
                {temFiltrosAtivos ? 'Nenhuma atividade encontrada com os filtros aplicados' : 'Nenhuma atividade encontrada'}
              </p>
            </Card>
          ) : usarGrupos && atividadesAgrupadas ? (
            <div className="space-y-6">
              {ORDEM_GRUPOS.map((status) => {
                const items = atividadesAgrupadas[status]
                if (!items || items.length === 0) return null
                const info = GRUPO_INFO[status] || { label: status, corDot: 'bg-gray-400', corTexto: 'text-gray-700' }
                return (
                  <div key={status}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-3 h-3 rounded-full ${info.corDot}`} />
                      <h4 className={`font-medium text-sm ${info.corTexto}`}>{info.label}</h4>
                      <span className="text-xs text-gray-400">({items.length})</span>
                    </div>
                    <div className="space-y-3">
                      {items.map((a) => renderCard(a))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {planejadasFiltradas.map((a) => renderCard(a))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Board {planejadasFiltradas.length !== atividades.length && `(${planejadasFiltradas.length} de ${atividades.filter(a => !a.nao_prevista).length})`}
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUNAS.map((col) => {
              const items = planejadasFiltradas.filter((a) => a.status === col.status)
              return (
                <div key={col.status} className="flex-shrink-0 w-72">
                  <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg ${col.headerBg}`}>
                    <div className={`w-3 h-3 rounded-full ${col.corDot}`} />
                    <span className="font-medium text-sm text-gray-700">{col.label}</span>
                    <span className="text-xs text-gray-400 ml-auto">({items.length})</span>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <div className="text-center text-xs text-gray-400 py-8 border-2 border-dashed border-gray-100 rounded-lg">
                        Vazio
                      </div>
                    ) : (
                      items.map((a) => renderCard(a, true))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Metricas por funcionario */}
      {metricasFuncionario.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Desempenho por Funcionário</h3>
          <Card className="bg-white border-0 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Funcionário</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Atrib.</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Concl.</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Andam.</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Pend.</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Não prev.</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Tempo prod.</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 min-w-[140px]">
                    <span className="inline-flex items-center gap-1" title="Taxa de conclusão = concluídas ÷ atribuídas. Mostra o percentual de atividades que o funcionário concluiu entre todas as que recebeu.">
                      Taxa
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {metricasFuncionario.map((m, i) => {
                  const taxa = m.atribuidas > 0 ? Math.round((m.concluidas / m.atribuidas) * 100) : 0
                  return (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${getCorAvatar(m.nome)}`}>
                            {getIniciais(m.nome)}
                          </div>
                          <span className="font-medium text-gray-800">{m.nome}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4 text-gray-600">{m.atribuidas}</td>
                      <td className="text-center py-3 px-4 text-green-600 font-medium">{m.concluidas}</td>
                      <td className="text-center py-3 px-4 text-blue-600">{m.emAndamento}</td>
                      <td className="text-center py-3 px-4 text-gray-500">{m.pendentes}</td>
                      <td className="text-center py-3 px-4 text-purple-600 font-medium">{m.naoPrevistas || '-'}</td>
                      <td className="text-center py-3 px-4 text-gray-700 font-medium whitespace-nowrap">{m.tempoProdutivo > 0 ? formatarTempo(m.tempoProdutivo) : '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                            <div className={`h-full rounded-full ${getCorBarra(taxa)}`} style={{ width: `${taxa}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-700 min-w-[35px]">{taxa}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Imprevistos recentes (ultimos 7 dias) */}
      {imprevistosRecentes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-amber-500 text-lg">⚠️</span>
            Imprevistos recentes
            <span className="text-sm font-normal text-gray-500">({imprevistosRecentes.length} nos últimos 7 dias)</span>
          </h3>
          <Card className="bg-white border-0 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Quando</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Atividade</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Funcionário</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Descrição</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Impacto</th>
                </tr>
              </thead>
              <tbody>
                {imprevistosRecentes.slice(0, 20).map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      if (i.atividade_id) {
                        const atv = atividades.find((a) => a.id === i.atividade_id)
                        if (atv) setDetalheAtividade(atv)
                      }
                    }}
                  >
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatarDataHora(i.ocorrido_at)}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        <span className="text-xs">⚠️</span>
                        {i.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700 truncate max-w-[180px]">{i.atividade_titulo || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{i.funcionario_nome || '-'}</td>
                    <td className="py-3 px-4 text-gray-500 truncate max-w-[200px]">{i.descricao || '-'}</td>
                    <td className="py-3 px-4 text-center text-gray-600 whitespace-nowrap">
                      {i.impacto_minutos != null ? `${i.impacto_minutos}min` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Atividades nao previstas */}
      {naoPrevistasFiltradas.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            Atividades não previstas
            <span className="text-sm font-normal text-gray-500">({naoPrevistasFiltradas.length})</span>
          </h3>
          <div className="space-y-2">
            {(expandirNaoPrevistas ? naoPrevistasFiltradas : naoPrevistasFiltradas.slice(0, 5)).map((a) => {
              const func = a.funcionarios?.[0]
              const tempo = func?.tempo_gasto_segundos || 0
              const isConcluidaNp = a.status === 'concluido' || a.status === 'concluida'
              return (
                <div
                  key={a.id}
                  onClick={() => setDetalheAtividade(a)}
                  className="p-3 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all border-l-4 bg-white border-purple-400"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-gray-800 text-sm truncate">{a.titulo}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                        {func && <span>{func.funcionario_nome}</span>}
                        {isConcluidaNp && tempo > 0 && (
                          <span className="text-green-700 font-medium">⏱ {formatarTempo(tempo)}</span>
                        )}
                        <span>{formatarPeriodo(a.data_inicio, a.data_fim)}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_CORES[a.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          {naoPrevistasFiltradas.length > 5 && (
            <button
              onClick={() => setExpandirNaoPrevistas((v) => !v)}
              className="mt-2 text-sm text-purple-600 font-medium hover:underline"
            >
              {expandirNaoPrevistas
                ? `Ver menos`
                : `Ver mais ${naoPrevistasFiltradas.length - 5} de ${naoPrevistasFiltradas.length}`}
            </button>
          )}
        </div>
      )}

      {/* Modal de detalhe */}
      {detalheAtividade && (() => {
        const totalFunc = detalheAtividade.funcionarios?.length || 0
        const concluidasModal = detalheAtividade.funcionarios?.filter((af) => af.status_individual === 'concluida').length || 0
        const progressoModal = totalFunc > 0 ? Math.round((concluidasModal / totalFunc) * 100) : 0

        return (
          <Modal
            isOpen={!!detalheAtividade}
            onClose={() => setDetalheAtividade(null)}
            title={detalheAtividade.titulo}
          >
            <div className="space-y-4">
              {/* Barra de progresso geral */}
              {totalFunc > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-medium">Progresso geral</span>
                    <span className="text-xs font-medium text-gray-700">{concluidasModal}/{totalFunc} ({progressoModal}%)</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progressoModal === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${progressoModal}%` }}
                    />
                  </div>
                </div>
              )}

              {detalheAtividade.descricao && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Descrição</p>
                  <p className="text-sm text-gray-700">{detalheAtividade.descricao}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Período: </span>
                  <span className="font-medium text-gray-800">{formatarPeriodo(detalheAtividade.data_inicio, detalheAtividade.data_fim)}</span>
                </div>
                {detalheAtividade.setor_nome && (
                  <div>
                    <span className="text-gray-500">Setor: </span>
                    <span className="font-medium text-gray-800">{detalheAtividade.setor_nome}</span>
                  </div>
                )}
                {detalheAtividade.local && (
                  <div>
                    <span className="text-gray-500">Local: </span>
                    <span className="font-medium text-gray-800">{detalheAtividade.local}</span>
                  </div>
                )}
                {!detalheAtividade.nao_prevista && (
                <div>
                  <span className="text-gray-500">Prioridade: </span>
                  <span className="font-medium text-gray-800">
                    {prioridades.find((p) => p.nivel === detalheAtividade.prioridade)?.nome || `Nível ${detalheAtividade.prioridade}`}
                  </span>
                </div>
                )}
                <div>
                  <span className="text-gray-500">Status: </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CORES[detalheAtividade.status]}`}>
                    {STATUS_LABELS[detalheAtividade.status] || detalheAtividade.status}
                  </span>
                  {detalheAtividade.atrasada && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Atrasada
                    </span>
                  )}
                  {detalheAtividade.nao_prevista && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      Não prevista
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 font-medium mb-3">Status por Responsável</p>
                <div className="space-y-3">
                  {detalheAtividade.funcionarios?.map((af) => {
                    const sessoesAf = sessoesDetalhe.filter((s) => s.atividade_funcionario_id === af.id)
                    const imprevistosAf = imprevistosDetalhe.filter((i) => i.atividade_funcionario_id === af.id)
                    const tempoProdutivo = sessoesAf
                      .filter((s) => s.fim_at && s.trabalhada && s.duracao_segundos != null)
                      .reduce((acc, s) => acc + (s.duracao_segundos || 0), 0)
                    const temSessaoAberta = sessoesAf.some((s) => !s.fim_at)
                    return (
                      <div key={af.id} className="py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${getCorAvatar(af.funcionario_nome || '?')}`}>
                              {getIniciais(af.funcionario_nome || '?')}
                            </div>
                            <span className="text-sm font-medium text-gray-800">{af.funcionario_nome}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CORES[af.status_individual] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_BADGE_LABELS[af.status_individual] || af.status_individual}
                            </span>
                            {temSessaoAberta && (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                gravando
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 text-right">
                            {tempoProdutivo > 0 && (
                              <span className="font-medium text-gray-700">⏱ {formatarTempo(tempoProdutivo)}</span>
                            )}
                          </div>
                        </div>
                        {(af.inicio_at || af.fim_at) && (
                          <div className="text-xs text-gray-400 mt-1 ml-9">
                            {af.inicio_at && <>Iniciou: {formatarDataHora(af.inicio_at)}</>}
                            {af.inicio_at && af.fim_at && <> · </>}
                            {af.fim_at && <>Concluiu: {formatarDataHora(af.fim_at)}</>}
                          </div>
                        )}
                        {af.detalhamento && (
                          <div className="mt-1 ml-9 text-xs text-gray-600 italic bg-gray-50 rounded px-2 py-1">
                            "{af.detalhamento}"
                          </div>
                        )}
                        {sessoesAf.length > 0 && (
                          <div className="mt-2 ml-9 space-y-1">
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Sessões ({sessoesAf.length})</p>
                            {sessoesAf.map((s) => (
                              <div key={s.id} className="flex items-center gap-2 text-xs text-gray-500">
                                <span className={`w-1.5 h-1.5 rounded-full ${s.trabalhada ? 'bg-green-400' : 'bg-amber-400'}`} />
                                <span>{formatarHoraCurta(s.inicio_at)} → {s.fim_at ? formatarHoraCurta(s.fim_at) : '...'}</span>
                                <span className="font-medium">{s.duracao_segundos != null ? formatarTempo(s.duracao_segundos) : 'em andamento'}</span>
                                {s.motivo_pausa && <span className="text-gray-400">({s.motivo_pausa})</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {imprevistosAf.length > 0 && (
                          <div className="mt-2 ml-9 space-y-1">
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Imprevistos ({imprevistosAf.length})</p>
                            {imprevistosAf.map((i) => (
                              <div key={i.id} className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="text-xs text-amber-500">⚠️</span>
                                <span className="font-medium">{i.tipo}</span>
                                <span className="text-gray-400">· {formatarHoraCurta(i.ocorrido_at)}</span>
                                {i.impacto_minutos != null && <span className="text-gray-400">({i.impacto_minutos}min)</span>}
                                {i.descricao && <span className="text-gray-400 truncate">— {i.descricao}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
