import { supabase } from './supabaseClient'

export interface Atividade {
  id: string
  fazenda_id: string
  titulo: string
  descricao: string | null
  setor_id: string | null
  equipe_id: string | null
  data_inicio: string
  data_fim: string
  prioridade: number
  status: string
  inicio_automatico: boolean
  ativo: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Joined
  setor_nome?: string | null
  equipe_nome?: string | null
  funcionarios?: AtividadeFuncionario[]
}

export interface AtividadeFuncionario {
  id: string
  atividade_id: string
  funcionario_id: string
  status_individual: string
  inicio_at: string | null
  fim_at: string | null
  detalhamento: string | null
  tempo_gasto_segundos: number | null
  // Joined
  funcionario_nome?: string | null
  equipe_nome?: string | null
}

export interface PrioridadeAtividade {
  id: string
  fazenda_id: string
  nivel: number
  nome: string
}

export interface Equipe {
  id: string
  fazenda_id: string
  nome: string
  ativo: boolean
}

export interface FuncionarioComEquipe {
  id: string
  nome: string
  equipe_id: string | null
  equipe_nome: string | null
  cargo: string | null
  ativo: boolean
}

export async function getAtividades(
  fazendaId: string,
  filtros?: { semanaInicio?: string; status?: string; prioridade?: number; setorId?: string }
): Promise<Atividade[]> {
  let query = supabase
    .from('atividades')
    .select(`
      *,
      setor:setores(nome),
      equipe:equipes(nome)
    `)
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('data_inicio', { ascending: false })
    .order('prioridade', { ascending: true })

  if (filtros?.semanaInicio) {
    query = query.eq('data_inicio', filtros.semanaInicio)
  }
  if (filtros?.status) {
    query = query.eq('status', filtros.status)
  }
  if (filtros?.prioridade) {
    query = query.eq('prioridade', filtros.prioridade)
  }
  if (filtros?.setorId) {
    query = query.eq('setor_id', filtros.setorId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Atividades] Erro ao buscar atividades:', error)
    return []
  }

  const atividades = (data || []).map((a: any) => ({
    ...a,
    setor_nome: a.setor?.nome || null,
    equipe_nome: a.equipe?.nome || null,
  })) as Atividade[]

  // Buscar funcionários associados
  const atividadeIds = atividades.map((a) => a.id)
  if (atividadeIds.length === 0) return atividades

  const { data: afs, error: afError } = await supabase
    .from('atividade_funcionarios')
    .select(`
      *,
      funcionario:funcionarios(nome, equipe_id, equipe:equipes(nome))
    `)
    .in('atividade_id', atividadeIds)

  if (afError) {
    console.error('[Atividades] Erro ao buscar funcionários das atividades:', afError)
    return atividades
  }

  const afsByAtividade: Record<string, AtividadeFuncionario[]> = {}
  for (const af of afs || []) {
    const mapped: AtividadeFuncionario = {
      ...af,
      funcionario_nome: af.funcionario?.nome || null,
      equipe_nome: af.funcionario?.equipe?.nome || null,
    }
    if (!afsByAtividade[af.atividade_id]) afsByAtividade[af.atividade_id] = []
    afsByAtividade[af.atividade_id].push(mapped)
  }

  return atividades.map((a) => ({
    ...a,
    funcionarios: afsByAtividade[a.id] || [],
  }))
}

export async function createAtividade(
  payload: Omit<Atividade, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'setor_nome' | 'equipe_nome' | 'funcionarios'> & {
    funcionario_ids: string[]
  }
): Promise<Atividade | null> {
  const { funcionario_ids, ...atividadeData } = payload

  const { data, error } = await supabase
    .from('atividades')
    .insert(atividadeData)
    .select()
    .single()

  if (error) {
    console.error('[Atividades] Erro ao criar atividade:', error)
    return null
  }

  const atividadeId = data.id

  if (funcionario_ids.length > 0) {
    const afInserts = funcionario_ids.map((fid) => ({
      atividade_id: atividadeId,
      funcionario_id: fid,
      status_individual: 'pendente',
    }))

    const { error: afError } = await supabase
      .from('atividade_funcionarios')
      .insert(afInserts)

    if (afError) {
      console.error('[Atividades] Erro ao inserir funcionários da atividade:', afError)
    }
  }

  return data as Atividade
}

export async function updateAtividade(
  id: string,
  payload: Partial<Omit<Atividade, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'setor_nome' | 'equipe_nome' | 'funcionarios'>> & {
    funcionario_ids?: string[]
  }
): Promise<Atividade | null> {
  const { funcionario_ids, ...atividadeData } = payload

  if (Object.keys(atividadeData).length > 0) {
    const { error } = await supabase
      .from('atividades')
      .update(atividadeData)
      .eq('id', id)

    if (error) {
      console.error('[Atividades] Erro ao atualizar atividade:', error)
      return null
    }
  }

  // Sincronizar funcionários se fornecido
  if (funcionario_ids) {
    // Buscar registros existentes
    const { data: existing, error: fetchError } = await supabase
      .from('atividade_funcionarios')
      .select('id, funcionario_id, status_individual')
      .eq('atividade_id', id)

    if (fetchError) {
      console.error('[Atividades] Erro ao buscar funcionários existentes:', fetchError)
      return null
    }

    const existingMap = new Map((existing || []).map((e) => [e.funcionario_id, e]))
    const newIds = funcionario_ids.filter((fid) => !existingMap.has(fid))
    const removedIds = (existing || [])
      .filter((e) => !funcionario_ids.includes(e.funcionario_id) && e.status_individual === 'pendente')
      .map((e) => e.id)

    // Adicionar novos
    if (newIds.length > 0) {
      const { error: insertError } = await supabase
        .from('atividade_funcionarios')
        .insert(newIds.map((fid) => ({
          atividade_id: id,
          funcionario_id: fid,
          status_individual: 'pendente',
        })))
      if (insertError) console.error('[Atividades] Erro ao adicionar funcionários:', insertError)
    }

    // Remover apenas os que ainda estão pendentes
    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('atividade_funcionarios')
        .delete()
        .in('id', removedIds)
      if (deleteError) console.error('[Atividades] Erro ao remover funcionários:', deleteError)
    }
  }

  // Buscar atividade atualizada
  const { data: updated, error: updateError } = await supabase
    .from('atividades')
    .select('*')
    .eq('id', id)
    .single()

  if (updateError) {
    console.error('[Atividades] Erro ao buscar atividade atualizada:', updateError)
    return null
  }

  return updated as Atividade
}

export async function deleteAtividade(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('atividades')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[Atividades] Erro ao excluir atividade:', error)
    return false
  }

  return true
}

export async function getPrioridades(fazendaId: string): Promise<PrioridadeAtividade[]> {
  const { data, error } = await supabase
    .from('prioridades_atividades')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .order('nivel', { ascending: true })

  if (error) {
    console.error('[Atividades] Erro ao buscar prioridades:', error)
    return []
  }

  return data as PrioridadeAtividade[]
}

export async function updatePrioridade(
  fazendaId: string,
  nivel: number,
  nome: string
): Promise<boolean> {
  const { error } = await supabase
    .from('prioridades_atividades')
    .update({ nome })
    .eq('fazenda_id', fazendaId)
    .eq('nivel', nivel)

  if (error) {
    console.error('[Atividades] Erro ao atualizar prioridade:', error)
    return false
  }

  return true
}

export async function getEquipes(fazendaId: string): Promise<Equipe[]> {
  const { data, error } = await supabase
    .from('equipes')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('nome', { ascending: true })

  if (error) {
    console.error('[Atividades] Erro ao buscar equipes:', error)
    return []
  }

  return data as Equipe[]
}

export async function getFuncionariosComEquipe(fazendaId: string): Promise<FuncionarioComEquipe[]> {
  const { data, error } = await supabase
    .from('funcionarios')
    .select(`
      id,
      nome,
      equipe_id,
      cargo,
      ativo,
      equipe:equipes(nome)
    `)
    .eq('fazenda_id', fazendaId)
    .order('nome', { ascending: true })

  if (error) {
    console.error('[Atividades] Erro ao buscar funcionários com equipe:', error)
    return []
  }

  return (data || []).map((f: any) => ({
    id: f.id,
    nome: f.nome,
    equipe_id: f.equipe_id,
    equipe_nome: f.equipe?.nome || null,
    cargo: f.cargo || null,
    ativo: f.ativo,
  })) as FuncionarioComEquipe[]
}

export async function getMonitoramentoData(
  fazendaId: string,
  semanaInicio?: string
): Promise<Atividade[]> {
  return getAtividades(fazendaId, { semanaInicio })
}

export async function getControleAcessoHabilitado(fazendaId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('fazendas')
    .select('controle_acesso_habilitado')
    .eq('id', fazendaId)
    .single()

  if (error) {
    console.error('[Atividades] Erro ao buscar controle de acesso:', error)
    return false
  }

  return !!data?.controle_acesso_habilitado
}
