import { supabase } from './supabaseClient'

export interface GrupoFazenda {
  id: string
  nome: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface GrupoWithFazendas extends GrupoFazenda {
  fazendas: { id: string; nome: string; acesso_id: string; ativo: boolean }[]
}

export async function getGrupos(): Promise<GrupoFazenda[]> {
  const { data, error } = await supabase
    .from('grupos_fazenda')
    .select('*')
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar grupos:', error)
    return []
  }

  return data || []
}

export async function getGrupoById(id: string): Promise<GrupoFazenda | null> {
  const { data, error } = await supabase
    .from('grupos_fazenda')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Erro ao buscar grupo:', error)
    return null
  }

  return data
}

export async function createGrupo(nome: string): Promise<GrupoFazenda | null> {
  const { data, error } = await supabase
    .from('grupos_fazenda')
    .insert({ nome })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar grupo:', error)
    return null
  }

  return data
}

export async function updateGrupo(id: string, updates: Partial<Pick<GrupoFazenda, 'nome' | 'ativo'>>): Promise<GrupoFazenda | null> {
  const { data, error } = await supabase
    .from('grupos_fazenda')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar grupo:', error)
    return null
  }

  return data
}

export async function deleteGrupo(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('grupos_fazenda')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao deletar grupo:', error)
    return false
  }

  return true
}

export async function getFazendasDoGrupo(grupoId: string): Promise<{ id: string; nome: string; acesso_id: string; ativo: boolean }[]> {
  const { data, error } = await supabase
    .from('fazendas')
    .select('id, nome, acesso_id, ativo')
    .eq('grupo_id', grupoId)
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar fazendas do grupo:', error)
    return []
  }

  return data || []
}

export async function getGruposWithFazendas(): Promise<GrupoWithFazendas[]> {
  const { data, error } = await supabase
    .from('grupos_fazenda')
    .select(`
      *,
      fazendas!fazendas_grupo_id_fkey(id, nome, acesso_id, ativo)
    `)
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar grupos com fazendas:', error)
    return []
  }

  return (data || []).map((g: any) => ({
    ...g,
    fazendas: g.fazendas || [],
  }))
}
