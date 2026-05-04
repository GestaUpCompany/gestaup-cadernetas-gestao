import { supabase } from './supabaseClient'
import { signUp } from './authService'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

async function rollbackUserCreation(userId: string, fazendaId?: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No session found for rollback')
      return false
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/rollback-user-creation`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, fazendaId }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Error calling rollback function:', error)
      return false
    }

    const result = await response.json()
    console.log('Rollback result:', result)
    return result.success || false
  } catch (error) {
    console.error('Exception in rollback:', error)
    return false
  }
}

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

export interface CreateFazendaWithControllerParams {
  acesso_id: string
  nome: string
  cnpj?: string
  endereco?: string
  telefone?: string
  email?: string
  logo_url?: string
  planilha_id?: string
  ativo: boolean
  controller_email: string
  controller_nome?: string
}

export interface CreateFazendaWithControllerResult {
  fazenda: Fazenda | null
  controller: { email: string; senha: string } | null
  error?: string
}

export async function createFazendaWithController(
  params: CreateFazendaWithControllerParams
): Promise<CreateFazendaWithControllerResult> {
  const { controller_email, controller_nome } = params

  // Gerar senha usando a regra: acesso_id + "2026"
  const senha = `${params.acesso_id}2026`

  // Nome do controller: usar o nome da fazenda se não fornecido
  const nomeController = controller_nome || `Controller ${params.nome}`

  // Criar usuário no Supabase Auth e na tabela usuarios
  const user = await signUp(controller_email, senha, nomeController, undefined, 'controller')

  if (!user) {
    return {
      fazenda: null,
      controller: null,
      error: 'Erro ao criar usuário controller'
    }
  }

  // Criar fazenda
  const fazenda = await createFazenda({
    acesso_id: params.acesso_id,
    nome: params.nome,
    cnpj: params.cnpj,
    endereco: params.endereco,
    telefone: params.telefone,
    email: params.email,
    logo_url: params.logo_url,
    planilha_id: params.planilha_id,
    ativo: params.ativo,
  })

  if (!fazenda) {
    // Rollback: deletar usuário criado via Edge Function
    await rollbackUserCreation(user.id)
    return {
      fazenda: null,
      controller: null,
      error: 'Erro ao criar fazenda'
    }
  }

  // Associar usuário à fazenda na tabela usuario_fazenda
  const { error: associationError } = await supabase
    .from('usuario_fazenda')
    .insert({
      usuario_id: user.id,
      fazenda_id: fazenda.id,
      papel: 'controller',
      ativo: true,
    })

  if (associationError) {
    console.error('Erro ao associar usuário à fazenda:', associationError)
    // Rollback: deletar fazenda e usuário criados via Edge Function
    await rollbackUserCreation(user.id, fazenda.id)
    return {
      fazenda: null,
      controller: null,
      error: 'Erro ao associar usuário à fazenda'
    }
  }

  // Criar peão para acesso do app mobile
  const peaoEmail = `peao.${params.acesso_id}@gestaup.internal`
  const peaoPassword = `${params.acesso_id}2026!`

  try {
    // Criar usuário peão no Supabase Auth via Edge Function com papel peao
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No session found for peão creation')
      return {
        fazenda,
        controller: {
          email: controller_email,
          senha,
        }
      }
    }

    // Criar usuário peão apenas no Supabase Auth usando Edge Function específica
    const peaoResponse = await fetch(
      `${supabaseUrl}/functions/v1/create-auth-user-only`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: peaoEmail,
          password: peaoPassword,
          nome: `Peão ${params.nome}`,
        }),
      }
    )

    if (peaoResponse.ok) {
      const peaoResult = await peaoResponse.json()
      if (peaoResult.success) {
        // Inserir peão na tabela peoes
        const { error: peaoError } = await supabase
          .from('peoes')
          .insert({
            email: peaoEmail,
            password: peaoPassword,
            fazenda_id: params.acesso_id,
            ativo: true,
          })

        if (peaoError) {
          console.error('Erro ao inserir peão na tabela peoes:', peaoError)
          // Não é fatal, continua com o fluxo
        }
      }
    } else {
      console.error('Erro ao criar usuário peão no Auth')
    }
  } catch (error) {
    console.error('Exception ao criar peão:', error)
    // Não é fatal, continua com o fluxo
  }

  return {
    fazenda,
    controller: {
      email: controller_email,
      senha,
    }
  }
}
