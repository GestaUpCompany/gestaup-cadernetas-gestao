import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Card, CardSkeleton, Modal } from '../../components/ui'
import { getFazendaIdForUser } from '../../utils/fazendaContext'
import {
  getMonitoramentoData,
  getPrioridades,
  Atividade,
  PrioridadeAtividade,
} from '../../services/atividadesService'

const PRIORIDADE_CORES: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-yellow-400',
  3: 'bg-green-500',
}

const STATUS_CORES: Record<string, string> = {
  pendente: 'bg-gray-100 text-gray-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  concluido: 'bg-green-100 text-green-700',
  atrasado: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  atrasado: 'Atrasado',
  concluida: 'Concluída',
}

const STATUS_INDIVIDUAL_CORES: Record<string, string> = {
  pendente: 'bg-gray-100 text-gray-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  concluida: 'bg-green-100 text-green-700',
}

function formatarDataHora(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function getSegundaAtual(): string {
  const hoje = new Date()
  const diaSemana = hoje.getDay()
  const diasParaSegunda = ((1 - diaSemana + 7) % 7)
  const segunda = new Date(hoje)
  segunda.setDate(hoje.getDate() - diasParaSegunda)
  return segunda.toISOString().split('T')[0]
}

function getDataFimSemana(dataInicio: string): string {
  const d = new Date(dataInicio + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

function formatarSemana(dataInicio: string): string {
  if (!dataInicio) return ''
  const fim = getDataFimSemana(dataInicio)
  const [, mi, di] = dataInicio.split('-')
  const [, mf, df] = fim.split('-')
  return `${di}/${mi} - ${df}/${mf}`
}

function formatarTempo(segundos: number | null): string {
  if (!segundos) return '-'
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

export function MonitoramentoAtividades() {
  const { user } = useAuth()
  const [fazendaId, setFazendaId] = useState<string | null>(null)
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [loading, setLoading] = useState(true)
  const [semanaSelecionada, setSemanaSelecionada] = useState<string>(getSegundaAtual())
  const [prioridades, setPrioridades] = useState<PrioridadeAtividade[]>([])
  const [detalheAtividade, setDetalheAtividade] = useState<Atividade | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const atividadeParam = searchParams.get('atividade')

  const loadFazenda = useCallback(async () => {
    if (!user) return
    const id = await getFazendaIdForUser(user.id)
    if (id) setFazendaId(id)
  }, [user])

  useEffect(() => { loadFazenda() }, [loadFazenda])

  useEffect(() => {
    if (!fazendaId) return
    loadPrioridades()
    loadAtividades()
  }, [fazendaId, semanaSelecionada])

  const loadPrioridades = async () => {
    if (!fazendaId) return
    setPrioridades(await getPrioridades(fazendaId))
  }

  const loadAtividades = async () => {
    if (!fazendaId) return
    setLoading(true)
    setAtividades(await getMonitoramentoData(fazendaId, semanaSelecionada))
    setLoading(false)
  }

  // Abrir detalhe automaticamente quando vier de ?atividade=<id>
  useEffect(() => {
    if (!atividadeParam || !fazendaId) return
    // Buscar a atividade diretamente para abrir o detalhe,
    // independente da semana selecionada
    const loadAtividadeEspecifica = async () => {
      const { data } = await supabase
        .from('atividades')
        .select(`
          id, titulo, descricao, setor_id, equipe_id, data_inicio, data_fim,
          prioridade, status, ativo, inicio_automatico,
          setor:setores(nome),
          equipe:equipes(nome),
          funcionarios:atividade_funcionarios(
            id, atividade_id, funcionario_id, status_individual,
            inicio_at, fim_at, detalhamento, tempo_gasto_segundos,
            funcionario:funcionarios(nome, equipe:equipes(nome))
          )
        `)
        .eq('id', atividadeParam)
        .eq('fazenda_id', fazendaId)
        .single()
      if (data) {
        const mapped = {
          ...data,
          setor_nome: (data as any).setor?.nome || null,
          equipe_nome: (data as any).equipe?.nome || null,
          funcionarios: (data as any).funcionarios?.map((af: any) => ({
            ...af,
            funcionario_nome: af.funcionario?.nome || null,
            equipe_nome: af.funcionario?.equipe?.nome || null,
          })) || [],
        } as unknown as Atividade
        // Ajustar a semana selecionada para a semana da atividade
        setSemanaSelecionada((data as any).data_inicio)
        setDetalheAtividade(mapped)
        setSearchParams({}, { replace: true })
      }
    }
    loadAtividadeEspecifica()
  }, [atividadeParam, fazendaId, setSearchParams])

  // Realtime: escutar mudanças em atividade_funcionarios para atualizar o dashboard
  useEffect(() => {
    if (!fazendaId || !semanaSelecionada) return

    const channel = supabase
      .channel('monitoramento_atividades')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'atividade_funcionarios',
        },
        () => { loadAtividades() }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'atividades',
          filter: `fazenda_id=eq.${fazendaId}`,
        },
        () => { loadAtividades() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fazendaId, semanaSelecionada])

  const kpis = useMemo(() => {
    const total = atividades.length
    const porStatus = { pendente: 0, em_andamento: 0, concluido: 0, atrasado: 0 }
    atividades.forEach((a) => {
      if (porStatus[a.status as keyof typeof porStatus] !== undefined) {
        porStatus[a.status as keyof typeof porStatus]++
      }
    })
    const taxaConclusao = total > 0 ? Math.round((porStatus.concluido / total) * 100) : 0
    return { total, ...porStatus, taxaConclusao }
  }, [atividades])

  const metricasFuncionario = useMemo(() => {
    const map: Record<string, { nome: string; atribuidas: number; concluidas: number; emAndamento: number; pendentes: number; tempoTotal: number }> = {}
    atividades.forEach((a) => {
      a.funcionarios?.forEach((af) => {
        if (!map[af.funcionario_id]) {
          map[af.funcionario_id] = {
            nome: af.funcionario_nome || 'Sem nome',
            atribuidas: 0,
            concluidas: 0,
            emAndamento: 0,
            pendentes: 0,
            tempoTotal: 0,
          }
        }
        const m = map[af.funcionario_id]
        m.atribuidas++
        if (af.status_individual === 'concluida') {
          m.concluidas++
          m.tempoTotal += af.tempo_gasto_segundos || 0
        } else if (af.status_individual === 'em_andamento') {
          m.emAndamento++
        } else {
          m.pendentes++
        }
      })
    })
    return Object.values(map).sort((a, b) => b.atribuidas - a.atribuidas)
  }, [atividades])

  const semanasDisponiveis = useMemo(() => {
    const semanas: { value: string; label: string }[] = []
    const hoje = new Date()
    const diaSemana = hoje.getDay()
    const diasParaSegunda = ((1 - diaSemana + 7) % 7)
    const segundaAtual = new Date(hoje)
    segundaAtual.setDate(hoje.getDate() - diasParaSegunda)
    for (let i = -4; i <= 4; i++) {
      const seg = new Date(segundaAtual)
      seg.setDate(segundaAtual.getDate() + i * 7)
      const value = seg.toISOString().split('T')[0]
      semanas.push({ value, label: formatarSemana(value) })
    }
    return semanas
  }, [])

  if (loading && atividades.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Monitoramento</h2>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Monitoramento de Atividades</h2>
        <select
          value={semanaSelecionada}
          onChange={(e) => setSemanaSelecionada(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent min-h-[40px] bg-white text-sm"
        >
          {semanasDisponiveis.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white p-4 border-0 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-800">{kpis.total}</p>
        </Card>
        <Card className="bg-white p-4 border-0 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Pendentes</p>
          <p className="text-2xl font-bold text-gray-700">{kpis.pendente}</p>
        </Card>
        <Card className="bg-white p-4 border-0 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Em Andamento</p>
          <p className="text-2xl font-bold text-blue-600">{kpis.em_andamento}</p>
        </Card>
        <Card className="bg-white p-4 border-0 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Concluídas</p>
          <p className="text-2xl font-bold text-green-600">{kpis.concluido}</p>
        </Card>
        <Card className="bg-white p-4 border-0 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Atrasadas</p>
          <p className="text-2xl font-bold text-red-600">{kpis.atrasado}</p>
        </Card>
        <Card className="bg-white p-4 border-0 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Taxa Conclusão</p>
          <p className="text-2xl font-bold text-gray-800">{kpis.taxaConclusao}%</p>
        </Card>
      </div>

      {/* Lista de atividades */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Atividades da Semana</h3>
        {atividades.length === 0 ? (
          <Card className="bg-white p-8 border-0 shadow-sm text-center">
            <p className="text-gray-600">Nenhuma atividade para esta semana</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {atividades.map((atividade) => (
              <Card
                key={atividade.id}
                className="bg-white p-4 border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setDetalheAtividade(atividade)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${PRIORIDADE_CORES[atividade.prioridade] || 'bg-gray-400'}`} />
                    <div className="min-w-0">
                      <h4 className="font-medium text-gray-800 truncate">{atividade.titulo}</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {atividade.funcionarios?.map((af) => {
                          const icone = af.status_individual === 'concluida' ? '✓' : af.status_individual === 'em_andamento' ? '▶' : '○'
                          const cor = af.status_individual === 'concluida' ? 'text-green-600' : af.status_individual === 'em_andamento' ? 'text-blue-600' : 'text-gray-400'
                          return (
                            <span key={af.id} className={`text-xs ${cor}`}>
                              {icone} {af.funcionario_nome}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_CORES[atividade.status] || 'bg-gray-100'}`}>
                    {STATUS_LABELS[atividade.status] || atividade.status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Métricas por funcionário */}
      {metricasFuncionario.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Desempenho por Funcionário</h3>
          <Card className="bg-white border-0 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Funcionário</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Atribuídas</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Concluídas</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Em Andamento</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Pendentes</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Tempo Total</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {metricasFuncionario.map((m, i) => {
                  const taxa = m.atribuidas > 0 ? Math.round((m.concluidas / m.atribuidas) * 100) : 0
                  return (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 px-4 font-medium text-gray-800">{m.nome}</td>
                      <td className="text-center py-3 px-4 text-gray-600">{m.atribuidas}</td>
                      <td className="text-center py-3 px-4 text-green-600 font-medium">{m.concluidas}</td>
                      <td className="text-center py-3 px-4 text-blue-600">{m.emAndamento}</td>
                      <td className="text-center py-3 px-4 text-gray-500">{m.pendentes}</td>
                      <td className="text-center py-3 px-4 text-gray-600">{formatarTempo(m.tempoTotal)}</td>
                      <td className="text-center py-3 px-4 font-medium text-gray-800">{taxa}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Modal de detalhe */}
      {detalheAtividade && (
        <Modal
          isOpen={!!detalheAtividade}
          onClose={() => setDetalheAtividade(null)}
          title={detalheAtividade.titulo}
        >
          <div className="space-y-4">
            {detalheAtividade.descricao && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Descrição</p>
                <p className="text-sm text-gray-700">{detalheAtividade.descricao}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-sm">
              <div>
                <span className="text-gray-500">Semana: </span>
                <span className="font-medium text-gray-800">{formatarSemana(detalheAtividade.data_inicio)}</span>
              </div>
              {detalheAtividade.setor_nome && (
                <div>
                  <span className="text-gray-500">Setor: </span>
                  <span className="font-medium text-gray-800">{detalheAtividade.setor_nome}</span>
                </div>
              )}
              {detalheAtividade.equipe_nome && (
                <div>
                  <span className="text-gray-500">Equipe: </span>
                  <span className="font-medium text-gray-800">{detalheAtividade.equipe_nome}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Prioridade: </span>
                <span className="font-medium text-gray-800">
                  {prioridades.find((p) => p.nivel === detalheAtividade.prioridade)?.nome || `Nível ${detalheAtividade.prioridade}`}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Status: </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CORES[detalheAtividade.status]}`}>
                  {STATUS_LABELS[detalheAtividade.status] || detalheAtividade.status}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 font-medium mb-3">Status por Responsável</p>
              <div className="space-y-2">
                {detalheAtividade.funcionarios?.map((af) => (
                  <div key={af.id} className="py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_INDIVIDUAL_CORES[af.status_individual] || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABELS[af.status_individual] || af.status_individual}
                        </span>
                        <span className="text-sm font-medium text-gray-800">{af.funcionario_nome}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {af.tempo_gasto_segundos && formatarTempo(af.tempo_gasto_segundos)}
                        {af.detalhamento && (
                          <span className="ml-2 italic">"{af.detalhamento}"</span>
                        )}
                      </div>
                    </div>
                    {(af.inicio_at || af.fim_at) && (
                      <div className="text-xs text-gray-400 mt-1 ml-1">
                        {af.inicio_at && <>Iniciou: {formatarDataHora(af.inicio_at)}</>}
                        {af.inicio_at && af.fim_at && <> · </>}
                        {af.fim_at && <>Concluiu: {formatarDataHora(af.fim_at)}</>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
