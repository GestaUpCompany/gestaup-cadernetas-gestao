import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal, Modal, MultiSelect } from '../../components/ui'
import { getFazendaIdForUser } from '../../utils/fazendaContext'
import {
  getAtividades,
  createAtividade,
  updateAtividade,
  deleteAtividade,
  getPrioridades,
  updatePrioridade,
  getEquipes,
  getFuncionariosComEquipe,
  getControleAcessoHabilitado,
  Atividade,
  PrioridadeAtividade,
  Equipe,
  FuncionarioComEquipe,
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
}

interface FormData {
  titulo: string
  descricao: string
  setor_id: string
  equipe_id: string
  funcionario_ids: string[]
  data_inicio: string
  prioridade: number
}

const INITIAL_FORM: FormData = {
  titulo: '',
  descricao: '',
  setor_id: '',
  equipe_id: '',
  funcionario_ids: [],
  data_inicio: '',
  prioridade: 3,
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

function gerarSemanas(quantidade: number): { value: string; label: string }[] {
  const semanas: { value: string; label: string }[] = []
  const hoje = new Date()
  const diaSemana = hoje.getDay()
  const diasParaSegunda = ((1 - diaSemana + 7) % 7)
  const segundaAtual = new Date(hoje)
  segundaAtual.setDate(hoje.getDate() - diasParaSegunda)

  for (let i = 0; i < quantidade; i++) {
    const seg = new Date(segundaAtual)
    seg.setDate(segundaAtual.getDate() + i * 7)
    const value = seg.toISOString().split('T')[0]
    semanas.push({ value, label: formatarSemana(value) })
  }
  return semanas
}

export function Atividades() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [fazendaId, setFazendaId] = useState<string | null>(null)
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [atividadeToDelete, setAtividadeToDelete] = useState<string | null>(null)

  const [controleAcessoHabilitado, setControleAcessoHabilitado] = useState(false)
  const [gateLoading, setGateLoading] = useState(true)

  const [setores, setSetores] = useState<{ id: string; nome: string }[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [funcionarios, setFuncionarios] = useState<FuncionarioComEquipe[]>([])
  const [prioridades, setPrioridades] = useState<PrioridadeAtividade[]>([])

  const [filtroSemana, setFiltroSemana] = useState<string>('')
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [filtroPrioridade, setFiltroPrioridade] = useState<number | ''>('')

  const [showPrioridadesModal, setShowPrioridadesModal] = useState(false)
  const [prioridadeNomes, setPrioridadeNomes] = useState<Record<number, string>>({})
  const [salvandoPrioridades, setSalvandoPrioridades] = useState(false)

  const loadFazenda = useCallback(async () => {
    if (!user) return
    const id = await getFazendaIdForUser(user.id)
    if (id) setFazendaId(id)
  }, [user])

  useEffect(() => { loadFazenda() }, [loadFazenda])

  useEffect(() => {
    if (!fazendaId) return
    loadControleAcesso()
    loadSetores()
    loadEquipes()
    loadFuncionarios()
    loadPrioridades()
    loadAtividades()
  }, [fazendaId])

  const loadControleAcesso = async () => {
    if (!fazendaId) return
    const habilitado = await getControleAcessoHabilitado(fazendaId)
    setControleAcessoHabilitado(habilitado)
    setGateLoading(false)
  }

  const loadSetores = async () => {
    if (!fazendaId) return
    const { data, error } = await supabase
      .from('setores')
      .select('id, nome')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (error) { console.error('Erro ao buscar setores:', error) }
    else { setSetores(data || []) }
  }

  const loadEquipes = async () => {
    if (!fazendaId) return
    setEquipes(await getEquipes(fazendaId))
  }

  const loadFuncionarios = async () => {
    if (!fazendaId) return
    const data = await getFuncionariosComEquipe(fazendaId)
    setFuncionarios(data.filter((f) => f.ativo))
  }

  const loadPrioridades = async () => {
    if (!fazendaId) return
    const data = await getPrioridades(fazendaId)
    setPrioridades(data)
    const nomesMap: Record<number, string> = {}
    data.forEach((p) => { nomesMap[p.nivel] = p.nome })
    setPrioridadeNomes(nomesMap)
  }

  const loadAtividades = async () => {
    if (!fazendaId) return
    setLoading(true)
    const filtros: { semanaInicio?: string; status?: string; prioridade?: number } = {}
    if (filtroSemana) filtros.semanaInicio = filtroSemana
    if (filtroStatus) filtros.status = filtroStatus
    if (filtroPrioridade !== '') filtros.prioridade = filtroPrioridade
    setAtividades(await getAtividades(fazendaId, filtros))
    setLoading(false)
  }

  useEffect(() => { if (fazendaId) loadAtividades() }, [filtroSemana, filtroStatus, filtroPrioridade, fazendaId])

  const funcionariosFiltrados = useMemo(() => {
    if (formData.equipe_id) return funcionarios.filter((f) => f.equipe_id === formData.equipe_id)
    return funcionarios
  }, [formData.equipe_id, funcionarios])

  const funcionarioOptions = useMemo(() => {
    return funcionariosFiltrados.map((f) => ({
      id: f.id,
      name: f.nome,
      category: f.equipe_nome || 'Sem equipe',
    }))
  }, [funcionariosFiltrados])

  const handleSelecionarTodosEquipe = () => {
    if (formData.equipe_id) {
      setFormData({ ...formData, funcionario_ids: funcionarios.filter((f) => f.equipe_id === formData.equipe_id).map((f) => f.id) })
    } else {
      setFormData({ ...formData, funcionario_ids: funcionarios.map((f) => f.id) })
    }
  }

  const handleOpenForm = () => {
    setFormData({ ...INITIAL_FORM, data_inicio: getSegundaAtual() })
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (atividade: Atividade) => {
    setFormData({
      titulo: atividade.titulo,
      descricao: atividade.descricao || '',
      setor_id: atividade.setor_id || '',
      equipe_id: atividade.equipe_id || '',
      funcionario_ids: atividade.funcionarios?.map((af) => af.funcionario_id) || [],
      data_inicio: atividade.data_inicio,
      prioridade: atividade.prioridade,
    })
    setEditingId(atividade.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fazendaId) return

    if (!formData.titulo.trim()) { alert('Título é obrigatório'); return }
    if (!formData.data_inicio) { alert('Selecione uma semana'); return }
    if (formData.funcionario_ids.length === 0) { alert('Selecione pelo menos um responsável'); return }

    setSubmitting(true)

    const dataFim = getDataFimSemana(formData.data_inicio)
    const payload = {
      fazenda_id: fazendaId,
      titulo: formData.titulo.trim(),
      descricao: formData.descricao.trim() || null,
      setor_id: formData.setor_id || null,
      equipe_id: formData.equipe_id || null,
      data_inicio: formData.data_inicio,
      data_fim: dataFim,
      prioridade: formData.prioridade,
      inicio_automatico: false,
      status: 'pendente' as const,
      ativo: true,
      created_by: user?.id || null,
      funcionario_ids: formData.funcionario_ids,
    }

    if (editingId) {
      await updateAtividade(editingId, {
        titulo: payload.titulo,
        descricao: payload.descricao,
        setor_id: payload.setor_id,
        equipe_id: payload.equipe_id,
        data_inicio: payload.data_inicio,
        data_fim: payload.data_fim,
        prioridade: payload.prioridade,
        funcionario_ids: payload.funcionario_ids,
      })
    } else {
      await createAtividade(payload)
    }

    setSubmitting(false)
    setShowForm(false)
    setFormData(INITIAL_FORM)
    setEditingId(null)
    loadAtividades()
  }

  const handleDelete = async () => {
    if (!atividadeToDelete) return
    await deleteAtividade(atividadeToDelete)
    setShowDeleteModal(false)
    setAtividadeToDelete(null)
    loadAtividades()
  }

  const handleSalvarPrioridades = async () => {
    if (!fazendaId) return
    setSalvandoPrioridades(true)
    for (const nivel of [1, 2, 3]) {
      const nome = prioridadeNomes[nivel]
      if (nome) await updatePrioridade(fazendaId, nivel, nome.trim())
    }
    setSalvandoPrioridades(false)
    setShowPrioridadesModal(false)
    loadPrioridades()
  }

  const semanasDisponiveis = useMemo(() => gerarSemanas(12), [])

  const semanasFuturas = useMemo(() => {
    const semanas = gerarSemanas(12)
    // Se estiver editando e a data da atividade não estiver na lista, adicionar
    if (editingId && formData.data_inicio && !semanas.find((s) => s.value === formData.data_inicio)) {
      semanas.unshift({ value: formData.data_inicio, label: formatarSemana(formData.data_inicio) })
    }
    return semanas
  }, [editingId, formData.data_inicio])

  if (gateLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Atividades</h2>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Atividades</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowPrioridadesModal(true)} className="h-10">
            Prioridades
          </Button>
          <Button onClick={handleOpenForm} disabled={!controleAcessoHabilitado} className="h-10">
            Nova Atividade
          </Button>
        </div>
      </div>

      {!controleAcessoHabilitado && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          <p className="text-sm font-medium">
            Ative o controle de acesso por funcionário em Cadastros Auxiliares para criar atividades.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          value={filtroSemana}
          onChange={(e) => setFiltroSemana(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent min-h-[40px] bg-white text-sm"
        >
          <option value="">Todas as semanas</option>
          {semanasDisponiveis.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent min-h-[40px] bg-white text-sm"
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluido">Concluído</option>
          <option value="atrasado">Atrasado</option>
        </select>
        <select
          value={filtroPrioridade}
          onChange={(e) => setFiltroPrioridade(e.target.value === '' ? '' : Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent min-h-[40px] bg-white text-sm"
        >
          <option value="">Todas as prioridades</option>
          {prioridades.map((p) => (
            <option key={p.nivel} value={p.nivel}>{p.nome}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : atividades.length === 0 ? (
        <Card className="bg-white p-8 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4">Nenhuma atividade encontrada</p>
          {controleAcessoHabilitado && (
            <Button onClick={handleOpenForm}>Criar Primeira Atividade</Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {atividades.map((atividade) => (
            <Card key={atividade.id} className="bg-white p-4 border-0 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${PRIORIDADE_CORES[atividade.prioridade] || 'bg-gray-400'}`} />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{atividade.titulo}</h3>
                    {atividade.descricao && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{atividade.descricao}</p>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_CORES[atividade.status] || 'bg-gray-100'}`}>
                  {STATUS_LABELS[atividade.status] || atividade.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {formatarSemana(atividade.data_inicio)}
                </span>
                {atividade.setor_nome && (
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" /></svg>
                    {atividade.setor_nome}
                  </span>
                )}
                {atividade.equipe_nome && (
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    {atividade.equipe_nome}
                  </span>
                )}
              </div>

              {atividade.funcionarios && atividade.funcionarios.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500 font-medium mb-2">Responsáveis:</p>
                  <div className="flex flex-wrap gap-2">
                    {atividade.funcionarios.map((af) => {
                      const icone = af.status_individual === 'concluida' ? '✓' : af.status_individual === 'em_andamento' ? '▶' : '○'
                      const cor = af.status_individual === 'concluida' ? 'text-green-600' : af.status_individual === 'em_andamento' ? 'text-blue-600' : 'text-gray-400'
                      return (
                        <span key={af.id} className={`inline-flex items-center gap-1 text-xs ${cor}`}>
                          <span className="font-medium">{icone}</span>
                          {af.funcionario_nome}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <Button variant="secondary" onClick={() => handleEdit(atividade)} className="h-8 text-xs px-3">
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/controller/monitoramento-atividades?atividade=${atividade.id}`)}
                  className="h-8 text-xs px-3"
                >
                  Monitorar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => { setAtividadeToDelete(atividade.id); setShowDeleteModal(true) }}
                  className="h-8 text-xs px-3 text-red-600 hover:text-red-700"
                >
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => { setShowForm(false); setFormData(INITIAL_FORM); setEditingId(null) }}
          title={editingId ? 'Editar Atividade' : 'Nova Atividade'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <Input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                required
                placeholder="Descrição da atividade"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
                placeholder="Detalhes adicionais (opcional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Setor</label>
                <select
                  value={formData.setor_id}
                  onChange={(e) => setFormData({ ...formData, setor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px] bg-white"
                >
                  <option value="">Selecione</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>

              {equipes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipe</label>
                  <select
                    value={formData.equipe_id}
                    onChange={(e) => setFormData({ ...formData, equipe_id: e.target.value, funcionario_ids: [] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px] bg-white"
                  >
                    <option value="">Todas</option>
                    {equipes.map((eq) => (
                      <option key={eq.id} value={eq.id}>{eq.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Responsáveis *</label>
                <button
                  type="button"
                  onClick={handleSelecionarTodosEquipe}
                  className="text-xs text-primary hover:underline"
                >
                  Selecionar todos{formData.equipe_id ? ' da equipe' : ''}
                </button>
              </div>
              <MultiSelect
                options={funcionarioOptions}
                value={formData.funcionario_ids}
                onChange={(ids) => setFormData({ ...formData, funcionario_ids: ids })}
                placeholder="Selecione os responsáveis"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semana *
              </label>
              <select
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px] bg-white"
              >
                <option value="">Selecione a semana</option>
                {semanasFuturas.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
              <div className="flex gap-3">
                {[1, 2, 3].map((nivel) => (
                  <button
                    key={nivel}
                    type="button"
                    onClick={() => setFormData({ ...formData, prioridade: nivel })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      formData.prioridade === nivel
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${PRIORIDADE_CORES[nivel]}`} />
                    <span className="text-sm">{prioridadeNomes[nivel] || `Nível ${nivel}`}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Atividade'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setShowForm(false); setFormData(INITIAL_FORM); setEditingId(null) }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Excluir Atividade"
        message="Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita."
        confirmText="Excluir"
      />

      {showPrioridadesModal && (
        <Modal
          isOpen={showPrioridadesModal}
          onClose={() => setShowPrioridadesModal(false)}
          title="Editar Nomes das Prioridades"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Você pode personalizar os nomes das prioridades, mas não pode alterar as cores nem adicionar/remover níveis.
            </p>
            {[1, 2, 3].map((nivel) => (
              <div key={nivel} className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full flex-shrink-0 ${PRIORIDADE_CORES[nivel]}`} />
                <Input
                  type="text"
                  value={prioridadeNomes[nivel] || ''}
                  onChange={(e) => setPrioridadeNomes({ ...prioridadeNomes, [nivel]: e.target.value })}
                  className="flex-1 border-gray-200 focus:border-accent"
                />
              </div>
            ))}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button onClick={handleSalvarPrioridades} disabled={salvandoPrioridades} className="flex-1">
                {salvandoPrioridades ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="secondary" onClick={() => setShowPrioridadesModal(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
