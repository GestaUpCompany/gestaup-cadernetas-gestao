import { supabase } from './supabaseClient'

export interface Fazenda {
  id: string
  acesso_id: string
  nome: string
  cnpj?: string
  endereco?: string
  telefone?: string
  email?: string
  logo_url?: string
  planilha_id?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export async function getFazendas(): Promise<Fazenda[]> {
  const { data, error } = await supabase
    .from('fazendas')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar fazendas:', error)
    return []
  }

  return data || []
}

export async function getFazendaById(id: string): Promise<Fazenda | null> {
  const { data, error } = await supabase
    .from('fazendas')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Erro ao buscar fazenda:', error)
    return null
  }

  return data
}

export async function createFazenda(fazenda: Omit<Fazenda, 'id' | 'created_at' | 'updated_at'>): Promise<Fazenda | null> {
  const { data, error } = await supabase
    .from('fazendas')
    .insert(fazenda)
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar fazenda:', error)
    return null
  }

  return data
}

export async function updateFazenda(id: string, fazenda: Partial<Fazenda>): Promise<Fazenda | null> {
  const { data, error } = await supabase
    .from('fazendas')
    .update(fazenda)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar fazenda:', error)
    return null
  }

  return data
}

export async function deleteFazenda(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('fazendas')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao deletar fazenda:', error)
    return false
  }

  return true
}
