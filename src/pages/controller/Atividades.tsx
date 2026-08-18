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
  iniciarAtividade,
  getPrioridades,
  updatePrioridade,
  getFuncionariosComSetor,
  getControleAcessoHabilitado,
  getAtividadeTemplates,
  createAtividadeTemplate,
  updateAtividadeTemplate,
  deleteAtividadeTemplate,
  Atividade,
  PrioridadeAtividade,
  FuncionarioComSetor,
  AtividadeTemplate,
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

// === Tipos do formulario de criacao em lote ===

interface FormRow {
  id: string
  titulo: string
  descricao: string
  local: string
  setor_id: string
  funcionario_ids: string[]
  tipo_data: 'periodo' | 'dia'
  data_inicio: string
  data_fim: string
  prioridade: number
  inicio_automatico: boolean
}

interface TemplateFormRow {
  id: string
  titulo: string
  descricao: string
  local: string
  setor_id: string
  funcionario_ids: string[]
  prioridade: number
}

function emptyTemplateRow(): TemplateFormRow {
  return {
    id: uid(),
    titulo: '',
    descricao: '',
    local: '',
    setor_id: '',
    funcionario_ids: [],
    prioridade: 3,
  }
}

// Formulario de edicao (atividade unica, modal vertical)
interface EditFormData {
  titulo: string
  descricao: string
  local: string
  setor_id: string
  funcionario_ids: string[]
  tipo_data: 'periodo' | 'dia'
  data_inicio: string
  data_fim: string
  prioridade: number
  inicio_automatico: boolean
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function emptyRow(): FormRow {
  return {
    id: uid(),
    titulo: '',
    descricao: '',
    local: '',
    setor_id: '',
    funcionario_ids: [],
    tipo_data: 'dia',
    data_inicio: '',
    data_fim: '',
    prioridade: 3,
    inicio_automatico: true,
  }
}

// === Helpers de data ===

function getHoje(): string {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
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

function formatarData(iso: string): string {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
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

// === Draft cache ===

const DRAFT_KEY = 'atividades_draft'

function saveDraft(rows: FormRow[]) {
  // So salva se houver pelo menos uma linha com algum conteudo
  const hasContent = rows.some((r) => r.titulo.trim() || r.data_inicio || r.funcionario_ids.length > 0)
  if (hasContent) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(rows))
  } else {
    localStorage.removeItem(DRAFT_KEY)
  }
}

function loadDraft(): FormRow[] | null {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as FormRow[]
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch { /* ignore */ }
  return null
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

// === Componente ===

export function Atividades() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [fazendaId, setFazendaId] = useState<string | null>(null)
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [loading, setLoading] = useState(true)

  // Form de criacao em lote (planilha inline)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [rows, setRows] = useState<FormRow[]>([emptyRow()])
  const [submitting, setSubmitting] = useState(false)

  // Form de edicao (modal vertical, atividade unica)
  const [editingAtividade, setEditingAtividade] = useState<Atividade | null>(null)
  const [editForm, setEditForm] = useState<EditFormData | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [atividadeToDelete, setAtividadeToDelete] = useState<string | null>(null)

  const [controleAcessoHabilitado, setControleAcessoHabilitado] = useState(false)
  const [gateLoading, setGateLoading] = useState(true)

  const [setores, setSetores] = useState<{ id: string; nome: string }[]>([])
  const [funcionarios, setFuncionarios] = useState<FuncionarioComSetor[]>([])
  const [prioridades, setPrioridades] = useState<PrioridadeAtividade[]>([])

  const [filtroSemana, setFiltroSemana] = useState<string>('')
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [filtroPrioridade, setFiltroPrioridade] = useState<number | ''>('')

  const [showPrioridadesModal, setShowPrioridadesModal] = useState(false)
  const [prioridadeNomes, setPrioridadeNomes] = useState<Record<number, string>>({})
  const [salvandoPrioridades, setSalvandoPrioridades] = useState(false)

  // === Templates (Recorrentes) ===
  const [abaMode, setAbaMode] = useState<'atividades' | 'recorrentes'>('atividades')
  const [templates, setTemplates] = useState<AtividadeTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [showBulkTemplateForm, setShowBulkTemplateForm] = useState(false)
  const [templateRows, setTemplateRows] = useState<TemplateFormRow[]>([emptyTemplateRow()])
  const [templateSubmitting, setTemplateSubmitting] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<AtividadeTemplate | null>(null)
  const [editTemplateForm, setEditTemplateForm] = useState<TemplateFormRow | null>(null)
  const [editTemplateSubmitting, setEditTemplateSubmitting] = useState(false)
  const [showTemplateDeleteModal, setShowTemplateDeleteModal] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])

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
    loadFuncionarios()
    loadPrioridades()
    loadAtividades()
    loadTemplates()
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

  const loadFuncionarios = async () => {
    if (!fazendaId) return
    const data = await getFuncionariosComSetor(fazendaId)
    setFuncionarios(data.filter((f) => f.ativo))
  }

  const loadPrioridades = async () => {
    if (!fazendaId) return
    const data = await getPrioridades(fazendaId)
    setPrioridades(data)
    const nomes: Record<number, string> = {}
    data.forEach((p) => { nomes[p.nivel] = p.nome })
    setPrioridadeNomes(nomes)
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

  const funcionarioOptionsAll = useMemo(() => {
    return funcionarios.map((f) => ({
      id: f.id,
      name: f.nome,
      category: f.setor_nome || undefined,
    }))
  }, [funcionarios])

  const semanasDisponiveis = useMemo(() => gerarSemanas(12), [])

  // === Handlers do form em lote ===

  const handleOpenBulkForm = () => {
    const draft = loadDraft()
    if (draft && draft.length > 0) {
      setRows(draft)
    } else {
      setRows([{ ...emptyRow(), data_inicio: getHoje() }])
    }
    setShowBulkForm(true)
  }

  const handleCloseBulkForm = () => {
    saveDraft(rows)
    setShowBulkForm(false)
  }

  const updateRow = (rowId: string, patch: Partial<FormRow>) => {
    setRows((prev) => {
      const updated = prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r))
      saveDraft(updated)
      return updated
    })
  }

  const handleAddRow = () => {
    setRows((prev) => {
      const updated = [...prev, { ...emptyRow(), data_inicio: getHoje() }]
      saveDraft(updated)
      return updated
    })
  }

  const handleRemoveRow = (rowId: string) => {
    setRows((prev) => {
      const updated = prev.filter((r) => r.id !== rowId)
      if (updated.length === 0) {
        const fresh = [{ ...emptyRow(), data_inicio: getHoje() }]
        saveDraft(fresh)
        return fresh
      }
      saveDraft(updated)
      return updated
    })
  }

  const handleSalvarLote = async () => {
    if (!fazendaId) return

    // Validar todas as linhas
    const linhasValidas = rows.filter((r) => r.titulo.trim() && r.data_inicio && r.funcionario_ids.length > 0)
    if (linhasValidas.length === 0) {
      alert('Preencha pelo menos uma linha com título, data e responsável')
      return
    }

    const invalidas = rows.filter((r) => r.titulo.trim() && (!r.data_inicio || r.funcionario_ids.length === 0))
    if (invalidas.length > 0) {
      alert('Há linhas com título mas sem data ou responsável. Corrija ou remova antes de salvar.')
      return
    }

    const semDataFim = rows.filter((r) => r.titulo.trim() && r.tipo_data === 'periodo' && !r.data_fim)
    if (semDataFim.length > 0) {
      alert('Há atividades em período sem data final. Defina a data fim ou mude para "Dia único".')
      return
    }

    setSubmitting(true)
    try {
      for (const row of linhasValidas) {
        const dataFim = row.tipo_data === 'dia' ? row.data_inicio : (row.data_fim || row.data_inicio)
        await createAtividade({
          fazenda_id: fazendaId,
          titulo: row.titulo.trim(),
          descricao: row.descricao.trim() || null,
          local: row.local.trim() || null,
          setor_id: row.setor_id || null,
          data_inicio: row.data_inicio,
          data_fim: dataFim,
          prioridade: row.prioridade,
          inicio_automatico: row.inicio_automatico,
          status: 'pendente' as const,
          ativo: true,
          created_by: user?.id || null,
          funcionario_ids: row.funcionario_ids,
        })
      }
      clearDraft()
      setRows([{ ...emptyRow(), data_inicio: getHoje() }])
      setShowBulkForm(false)
      loadAtividades()
    } catch (err) {
      console.error('Erro ao salvar lote:', err)
      alert('Erro ao salvar uma ou mais atividades')
    } finally {
      setSubmitting(false)
    }
  }

  // === Handlers de edicao (modal) ===

  const handleEdit = (atividade: Atividade) => {
    const isSingleDay = atividade.data_inicio === atividade.data_fim
    setEditForm({
      titulo: atividade.titulo,
      descricao: atividade.descricao || '',
      local: atividade.local || '',
      setor_id: atividade.setor_id || '',
      funcionario_ids: atividade.funcionarios?.map((af) => af.funcionario_id) || [],
      tipo_data: isSingleDay ? 'dia' : 'periodo',
      data_inicio: atividade.data_inicio,
      data_fim: atividade.data_fim,
      prioridade: atividade.prioridade,
      inicio_automatico: atividade.inicio_automatico,
    })
    setEditingAtividade(atividade)
  }

  const handleSubmitEdit = async () => {
    if (!editingAtividade || !editForm) return
    if (!editForm.titulo.trim()) { alert('Título é obrigatório'); return }
    if (!editForm.data_inicio) { alert('Selecione a data'); return }
    if (editForm.funcionario_ids.length === 0) { alert('Selecione pelo menos um responsável'); return }

    setEditSubmitting(true)
    try {
      const dataFim = editForm.tipo_data === 'dia' ? editForm.data_inicio : (editForm.data_fim || editForm.data_inicio)
      await updateAtividade(editingAtividade.id, {
        titulo: editForm.titulo.trim(),
        descricao: editForm.descricao.trim() || null,
        local: editForm.local.trim() || null,
        setor_id: editForm.setor_id || null,
        data_inicio: editForm.data_inicio,
        data_fim: dataFim,
        prioridade: editForm.prioridade,
        inicio_automatico: editForm.inicio_automatico,
        funcionario_ids: editForm.funcionario_ids,
      })
      setEditingAtividade(null)
      setEditForm(null)
      loadAtividades()
    } catch (err) {
      console.error('Erro ao editar:', err)
      alert('Erro ao salvar alterações')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleIniciarAtividade = async (atividadeId: string) => {
    const ok = await iniciarAtividade(atividadeId)
    if (ok) {
      loadAtividades()
    } else {
      alert('Erro ao iniciar atividade')
    }
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

  const funcionarioOptionsEdit = useMemo(() => {
    return funcionarios.map((f) => ({
      id: f.id,
      name: f.nome,
      category: f.setor_nome || undefined,
    }))
  }, [funcionarios])

  // === Funcoes de Template (Recorrentes) ===

  const loadTemplates = async () => {
    if (!fazendaId) return
    setTemplatesLoading(true)
    const data = await getAtividadeTemplates(fazendaId)
    setTemplates(data)
    setTemplatesLoading(false)
  }

  const handleOpenBulkTemplateForm = () => {
    setTemplateRows([emptyTemplateRow()])
    setShowBulkTemplateForm(true)
  }

  const handleCloseBulkTemplateForm = () => {
    setShowBulkTemplateForm(false)
  }

  const updateTemplateRow = (rowId: string, patch: Partial<TemplateFormRow>) => {
    setTemplateRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)))
  }

  const addTemplateRow = () => {
    setTemplateRows((prev) => [...prev, emptyTemplateRow()])
  }

  const removeTemplateRow = (rowId: string) => {
    setTemplateRows((prev) => prev.length > 1 ? prev.filter((r) => r.id !== rowId) : prev)
  }

  const handleSalvarBulkTemplates = async () => {
    if (!fazendaId) return
    const validRows = templateRows.filter((r) => r.titulo.trim())
    if (validRows.length === 0) {
      alert('Adicione pelo menos uma recorrente com nome')
      return
    }

    setTemplateSubmitting(true)
    try {
      for (const row of validRows) {
        await createAtividadeTemplate({
          fazenda_id: fazendaId,
          titulo: row.titulo.trim(),
          descricao: null,
          local: null,
          setor_id: null,
          prioridade: row.prioridade,
          ativo: true,
          created_by: user?.id || null,
          funcionario_ids: [],
        })
      }
      setTemplateRows([emptyTemplateRow()])
      setShowBulkTemplateForm(false)
      loadTemplates()
    } catch (err) {
      console.error('Erro ao salvar recorrentes:', err)
      alert('Erro ao salvar uma ou mais recorrentes')
    } finally {
      setTemplateSubmitting(false)
    }
  }

  const handleEditarTemplate = (t: AtividadeTemplate) => {
    setEditingTemplate(t)
    setEditTemplateForm({
      id: t.id,
      titulo: t.titulo,
      descricao: t.descricao || '',
      local: t.local || '',
      setor_id: t.setor_id || '',
      funcionario_ids: t.funcionario_ids || [],
      prioridade: t.prioridade,
    })
  }

  const handleSubmitEditTemplate = async () => {
    if (!editingTemplate || !editTemplateForm || !fazendaId) return
    if (!editTemplateForm.titulo.trim()) { alert('Nome da atividade é obrigatório'); return }

    setEditTemplateSubmitting(true)
    try {
      await updateAtividadeTemplate(editingTemplate.id, {
        titulo: editTemplateForm.titulo.trim(),
      })
      setEditingTemplate(null)
      setEditTemplateForm(null)
      loadTemplates()
    } catch (err) {
      console.error('Erro ao editar recorrente:', err)
      alert('Erro ao salvar alterações')
    } finally {
      setEditTemplateSubmitting(false)
    }
  }

  const handleExcluirTemplate = async () => {
    if (!templateToDelete) return
    await deleteAtividadeTemplate(templateToDelete)
    setShowTemplateDeleteModal(false)
    setTemplateToDelete(null)
    loadTemplates()
  }

  const handleUsarTemplatesSelecionados = () => {
    const selecionados = templates.filter((t) => selectedTemplateIds.includes(t.id))
    if (selecionados.length === 0) return
    const novasLinhas: FormRow[] = selecionados.map((t) => ({
      id: uid(),
      titulo: t.titulo,
      descricao: t.descricao || '',
      local: t.local || '',
      setor_id: t.setor_id || '',
      funcionario_ids: t.funcionario_ids || [],
      tipo_data: 'dia' as const,
      data_inicio: getHoje(),
      data_fim: '',
      prioridade: t.prioridade,
      inicio_automatico: true,
    }))
    const todas = [...rows, ...novasLinhas]
    setRows(todas)
    saveDraft(todas)
    setSelectedTemplateIds([])
    setShowTemplatePicker(false)
    setShowBulkForm(true)
  }

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleAllTemplates = () => {
    if (selectedTemplateIds.length === templates.length) {
      setSelectedTemplateIds([])
    } else {
      setSelectedTemplateIds(templates.map((t) => t.id))
    }
  }

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
          {abaMode === 'atividades' && (
            <>
              <Button variant="secondary" onClick={() => setShowPrioridadesModal(true)} className="h-10">
                Prioridades
              </Button>
              <Button onClick={handleOpenBulkForm} disabled={!controleAcessoHabilitado} className="h-10">
                Nova Atividade
              </Button>
            </>
          )}
          {abaMode === 'recorrentes' && (
            <Button onClick={handleOpenBulkTemplateForm} disabled={!controleAcessoHabilitado} className="h-10">
              Nova Recorrente
            </Button>
          )}
        </div>
      </div>

      {/* Toggle Atividades / Recorrentes */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setAbaMode('atividades')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            abaMode === 'atividades' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Atividades
        </button>
        <button
          onClick={() => setAbaMode('recorrentes')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            abaMode === 'recorrentes' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Recorrentes
        </button>
      </div>

      {/* === Seção Recorrentes === */}
      {abaMode === 'recorrentes' && (
        <div className="space-y-4">
          {!controleAcessoHabilitado && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
              <p className="text-sm font-medium">
                Ative o controle de acesso por funcionário em Cadastros Auxiliares para criar atividades recorrentes.
              </p>
            </div>
          )}

          {templatesLoading ? (
            <CardSkeleton />
          ) : templates.length === 0 ? (
            <Card className="bg-white p-8 border-0 shadow-sm text-center">
              <p className="text-gray-600 mb-4">Nenhuma atividade recorrente cadastrada</p>
              <Button onClick={handleOpenBulkTemplateForm} disabled={!controleAcessoHabilitado}>
                Criar Primeira Recorrente
              </Button>
            </Card>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                {templates.length} recorrente(s) cadastrada(s). Ao criar uma atividade, você pode selecionar uma recorrente para preencher automaticamente.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((t) => {
                  return (
                    <Card key={t.id} className="bg-white p-4 border-0 shadow-sm">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-gray-800">{t.titulo}</h3>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditarTemplate(t)}
                            className="text-xs text-primary hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              setTemplateToDelete(t.id)
                              setShowTemplateDeleteModal(true)
                            }}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* === Seção Atividades === */}
      {abaMode === 'atividades' && (
        <>
      {!controleAcessoHabilitado && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          <p className="text-sm font-medium">
            Ative o controle de acesso por funcionário em Cadastros Auxiliares para criar atividades.
          </p>
        </div>
      )}

      {/* Formulario em lote (modal planilha) */}
      {showBulkForm && (
        <Modal
          isOpen={showBulkForm}
          onClose={handleCloseBulkForm}
          title="Nova Atividades"
          size="full"
        >
          {/* Aviso de draft */}
          {loadDraft() && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-xs mb-3">
              Você tem atividades preenchidas salvas como rascunho. Elas serão mantidas até você salvar ou limpar.
            </div>
          )}

          {/* Botão Usar Recorrente */}
          {templates.length > 0 && (
            <div className="mb-3">
              <Button
                variant="secondary"
                onClick={() => { setSelectedTemplateIds([]); setShowTemplatePicker(true) }}
                className="h-9 text-sm"
              >
                Usar Recorrente
              </Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1360px]">
              <thead>
                <tr className="border-b-2 border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left py-2 px-2 w-8">#</th>
                  <th className="text-left py-2 px-2 min-w-[200px]">Atividade *</th>
                  <th className="text-left py-2 px-2 min-w-[160px]">Descrição</th>
                  <th className="text-left py-2 px-2 min-w-[140px]">Local</th>
                  <th className="text-left py-2 px-2 w-36">Setor</th>
                  <th className="text-left py-2 px-2 min-w-[220px]">Responsáveis *</th>
                  <th className="text-left py-2 px-2 w-28">Quando</th>
                  <th className="text-left py-2 px-2 w-44">Data *</th>
                  <th className="text-left py-2 px-2 w-40">Prioridade</th>
                  <th className="text-center py-2 px-2 w-24">Início Auto</th>
                  <th className="text-center py-2 px-2 w-20">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  return (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50 align-top h-20">
                      <td className="py-2 px-2 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="py-2 px-2">
                        <textarea
                          value={row.titulo}
                          onChange={(e) => updateRow(row.id, { titulo: e.target.value })}
                          placeholder="Consertar cerca..."
                          rows={1}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent min-h-[44px] resize-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <textarea
                          value={row.descricao}
                          onChange={(e) => updateRow(row.id, { descricao: e.target.value })}
                          placeholder="Opcional"
                          rows={1}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent min-h-[44px] resize-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <textarea
                          value={row.local}
                          onChange={(e) => updateRow(row.id, { local: e.target.value })}
                          placeholder="Pasto, curral..."
                          rows={1}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent min-h-[44px] resize-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={row.setor_id}
                          onChange={(e) => {
                            const setorId = e.target.value
                            const membros = setorId
                              ? funcionarios.filter((f) => f.setor_id === setorId).map((f) => f.id)
                              : []
                            updateRow(row.id, { setor_id: setorId, funcionario_ids: membros })
                          }}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent min-h-[44px] bg-white"
                        >
                          <option value="">-</option>
                          {setores.map((s) => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2 align-top">
                        <MultiSelect
                          options={funcionarioOptionsAll}
                          value={row.funcionario_ids}
                          onChange={(ids) => {
                            const membrosSetor = row.setor_id
                              ? funcionarios.filter((f) => f.setor_id === row.setor_id).map((f) => f.id)
                              : []
                            const aindaIgualSetor = membrosSetor.length > 0 &&
                              membrosSetor.length === ids.length &&
                              membrosSetor.every((id) => ids.includes(id))
                            updateRow(row.id, {
                              funcionario_ids: ids,
                              setor_id: aindaIgualSetor ? row.setor_id : '',
                            })
                          }}
                          placeholder="Selecionar..."
                          compact
                        />
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="radio"
                              checked={row.tipo_data === 'dia'}
                              onChange={() => updateRow(row.id, { tipo_data: 'dia', data_fim: '' })}
                              className="w-3.5 h-3.5"
                            />
                            Dia único
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="radio"
                              checked={row.tipo_data === 'periodo'}
                              onChange={() => updateRow(row.id, { tipo_data: 'periodo' })}
                              className="w-3.5 h-3.5"
                            />
                            Período
                          </label>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex flex-col gap-1.5">
                          <input
                            type="date"
                            value={row.data_inicio}
                            onChange={(e) => updateRow(row.id, { data_inicio: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent min-h-[44px]"
                          />
                          {row.tipo_data === 'periodo' && (
                            <input
                              type="date"
                              value={row.data_fim}
                              onChange={(e) => updateRow(row.id, { data_fim: e.target.value })}
                              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent min-h-[44px]"
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={row.prioridade}
                          onChange={(e) => updateRow(row.id, { prioridade: Number(e.target.value) })}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent min-h-[44px] bg-white"
                        >
                          {prioridades.map((p) => (
                            <option key={p.nivel} value={p.nivel}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => updateRow(row.id, { inicio_automatico: !row.inicio_automatico })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${row.inicio_automatico ? 'bg-primary' : 'bg-gray-300'}`}
                          title={row.inicio_automatico ? 'Início automático ativado' : 'Início automático desativado'}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${row.inicio_automatico ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleRemoveRow(row.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                            title="Remover linha"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button variant="secondary" onClick={handleAddRow} className="h-9 text-sm">
              + Adicionar Atividade
            </Button>
            <div className="flex gap-2">
              <Button onClick={handleSalvarLote} disabled={submitting} className="h-9">
                {submitting ? 'Salvando...' : 'Salvar Todas'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm('Limpar todas as linhas? O rascunho será descartado.')) {
                    clearDraft()
                    setRows([{ ...emptyRow(), data_inicio: getHoje() }])
                  }
                }}
                className="h-9"
              >
                Limpar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Filtros */}
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

      {/* Lista de atividades */}
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
            <Button onClick={handleOpenBulkForm}>Criar Primeira Atividade</Button>
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
                  {atividade.data_inicio === atividade.data_fim
                    ? formatarData(atividade.data_inicio)
                    : `${formatarData(atividade.data_inicio)} - ${formatarData(atividade.data_fim)}`}
                </span>
                {atividade.setor_nome && (
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" /></svg>
                    {atividade.setor_nome}
                  </span>
                )}
                {atividade.local && (
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {atividade.local}
                  </span>
                )}
                {atividade.inicio_automatico && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Início automático
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
                {!atividade.inicio_automatico && atividade.status === 'pendente' && (
                  <Button
                    onClick={() => handleIniciarAtividade(atividade.id)}
                    className="h-8 text-xs px-3"
                  >
                    Iniciar
                  </Button>
                )}
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

      {/* Modal de edicao (atividade unica, layout vertical) */}
      {editingAtividade && editForm && (
        <Modal
          isOpen={!!editingAtividade}
          onClose={() => { setEditingAtividade(null); setEditForm(null) }}
          title="Editar Atividade"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Atividade *</label>
              <Input
                type="text"
                value={editForm.titulo}
                onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
                placeholder="Descrição da atividade"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={editForm.descricao}
                onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                rows={3}
                placeholder="Detalhes adicionais (opcional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
              <Input
                type="text"
                value={editForm.local}
                onChange={(e) => setEditForm({ ...editForm, local: e.target.value })}
                placeholder="Pasto, curral, etc. (opcional)"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Setor</label>
              <select
                value={editForm.setor_id}
                onChange={(e) => {
                  const setorId = e.target.value
                  const membros = setorId
                    ? funcionarios.filter((f) => f.setor_id === setorId).map((f) => f.id)
                    : []
                  setEditForm({ ...editForm, setor_id: setorId, funcionario_ids: membros })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px] bg-white"
              >
                <option value="">Selecione</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsáveis *</label>
              <MultiSelect
                options={funcionarioOptionsEdit}
                value={editForm.funcionario_ids}
                onChange={(ids) => {
                  const membrosSetor = editForm.setor_id
                    ? funcionarios.filter((f) => f.setor_id === editForm.setor_id).map((f) => f.id)
                    : []
                  const aindaIgualSetor = membrosSetor.length > 0 &&
                    membrosSetor.length === ids.length &&
                    membrosSetor.every((id) => ids.includes(id))
                  setEditForm({
                    ...editForm,
                    funcionario_ids: ids,
                    setor_id: aindaIgualSetor ? editForm.setor_id : '',
                  })
                }}
                placeholder="Selecione os responsáveis"
              />
            </div>

            {/* Selecao dupla de data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quando *</label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={editForm.tipo_data === 'dia'}
                    onChange={() => setEditForm({ ...editForm, tipo_data: 'dia', data_fim: '' })}
                    className="w-4 h-4"
                  />
                  Dia único
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={editForm.tipo_data === 'periodo'}
                    onChange={() => setEditForm({ ...editForm, tipo_data: 'periodo' })}
                    className="w-4 h-4"
                  />
                  Período (de x até)
                </label>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">
                    {editForm.tipo_data === 'dia' ? 'Data' : 'Data início'}
                  </label>
                  <Input
                    type="date"
                    value={editForm.data_inicio}
                    onChange={(e) => setEditForm({ ...editForm, data_inicio: e.target.value })}
                    className="border-gray-200 focus:border-accent"
                  />
                </div>
                {editForm.tipo_data === 'periodo' && (
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Data fim</label>
                    <Input
                      type="date"
                      value={editForm.data_fim}
                      onChange={(e) => setEditForm({ ...editForm, data_fim: e.target.value })}
                      className="border-gray-200 focus:border-accent"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
              <div className="flex gap-3">
                {[1, 2, 3].map((nivel) => (
                  <button
                    key={nivel}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, prioridade: nivel })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      editForm.prioridade === nivel
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Início automático</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, inicio_automatico: !editForm.inicio_automatico })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.inicio_automatico ? 'bg-primary' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editForm.inicio_automatico ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-600">
                  {editForm.inicio_automatico
                    ? 'A atividade inicia sozinha (Status = Em Andamento) quando a data chegar'
                    : 'O responsável inicia manualmente no app'}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button onClick={handleSubmitEdit} disabled={editSubmitting} className="flex-1">
                {editSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setEditingAtividade(null); setEditForm(null) }}
              >
                Cancelar
              </Button>
            </div>
          </div>
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
        </>
      )}

      {/* === Modal: Criar Recorrentes em Lote (planilha) === */}
      {showBulkTemplateForm && (
        <Modal
          isOpen={showBulkTemplateForm}
          onClose={handleCloseBulkTemplateForm}
          title="Nova Atividade Recorrente"
          size="full"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left py-2 px-2 w-8">#</th>
                  <th className="text-left py-2 px-2">Atividade *</th>
                  <th className="text-center py-2 px-2 w-20">Ações</th>
                </tr>
              </thead>
              <tbody>
                {templateRows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50 align-top">
                    <td className="py-2 px-2 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="py-2 px-2">
                      <textarea
                        value={row.titulo}
                        onChange={(e) => updateTemplateRow(row.id, { titulo: e.target.value })}
                        placeholder="Vacinação do rebanho..."
                        rows={1}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent min-h-[44px] resize-none"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => removeTemplateRow(row.id)}
                        disabled={templateRows.length === 1}
                        className="text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                        title="Remover linha"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button variant="secondary" onClick={addTemplateRow} className="text-sm h-9">
              + Adicionar Atividade
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleCloseBulkTemplateForm} className="h-10">
                Cancelar
              </Button>
              <Button onClick={handleSalvarBulkTemplates} disabled={templateSubmitting} className="h-10">
                {templateSubmitting ? 'Salvando...' : 'Salvar Recorrentes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* === Modal: Editar Recorrente === */}
      {editingTemplate && editTemplateForm && (
        <Modal
          isOpen={!!editingTemplate}
          onClose={() => { setEditingTemplate(null); setEditTemplateForm(null) }}
          title="Editar Recorrente"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Atividade *</label>
              <Input
                type="text"
                value={editTemplateForm.titulo}
                onChange={(e) => setEditTemplateForm({ ...editTemplateForm, titulo: e.target.value })}
                placeholder="Ex: Vacinação do rebanho"
                className="border-gray-200 focus:border-accent"
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button onClick={handleSubmitEditTemplate} disabled={editTemplateSubmitting} className="flex-1">
                {editTemplateSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setEditingTemplate(null); setEditTemplateForm(null) }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* === Modal: Excluir Template === */}
      <ConfirmModal
        isOpen={showTemplateDeleteModal}
        onClose={() => setShowTemplateDeleteModal(false)}
        onConfirm={handleExcluirTemplate}
        title="Excluir Recorrente"
        message="Tem certeza que deseja excluir esta atividade recorrente? Esta ação não pode ser desfeita."
        confirmText="Excluir"
      />

      {/* === Modal: Selecionar Recorrente (no form em lote) === */}
      {showTemplatePicker && (
        <Modal
          isOpen={showTemplatePicker}
          onClose={() => setShowTemplatePicker(false)}
          title="Usar Atividade Recorrente"
        >
          {templates.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">Nenhuma recorrente cadastrada</p>
              <Button variant="secondary" onClick={() => setShowTemplatePicker(false)}>
                Fechar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Selecione uma ou mais recorrentes para preencher novas linhas. Você poderá ajustar a data e outros campos depois.
                </p>
              </div>
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <button
                  onClick={toggleAllTemplates}
                  className="text-sm text-primary hover:underline"
                >
                  {selectedTemplateIds.length === templates.length ? 'Desmarcar todas' : 'Selecionar todas'}
                </button>
                <span className="text-xs text-gray-400">
                  {selectedTemplateIds.length} de {templates.length} selecionada(s)
                </span>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {templates.map((t) => {
                  const checked = selectedTemplateIds.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTemplateSelection(t.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        checked ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          checked ? 'bg-primary border-primary' : 'border-gray-300 bg-white'
                        }`}>
                          {checked && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium text-gray-800">{t.titulo}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button
                  onClick={handleUsarTemplatesSelecionados}
                  disabled={selectedTemplateIds.length === 0}
                  className="flex-1"
                >
                  Adicionar {selectedTemplateIds.length > 0 ? `(${selectedTemplateIds.length})` : ''}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => { setShowTemplatePicker(false); setSelectedTemplateIds([]) }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
