import { supabase } from './supabaseClient'

export interface User {
  id: string
  email: string
  nome: string
  telefone?: string
  papel: 'admin' | 'controller'
  ativo: boolean
}

export interface Session {
  user: User
  token: string
}

export async function signIn(email: string, password: string): Promise<Session | null> {
  console.log('Tentando fazer login com:', email)
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Erro ao fazer login (Auth):', error)
    return null
  }

  console.log('Login no Auth bem-sucedido, buscando dados do usuário...')

  // Buscar dados adicionais do usuário
  const { data: userData, error: userError } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .single()

  if (userError) {
    console.error('Erro ao buscar dados do usuário (DB):', userError)
    return null
  }

  if (!userData) {
    console.error('Usuário não encontrado na tabela usuarios')
    return null
  }

  console.log('Usuário encontrado:', userData)
  return {
    user: userData as User,
    token: data.session.access_token,
  }
}

export async function signUp(email: string, password: string, nome: string, telefone?: string): Promise<User | null> {
  // Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    console.error('Erro ao criar usuário no Auth:', authError)
    return null
  }

  if (!authData.user) {
    return null
  }

  // Criar usuário na tabela usuarios
  const { data: userData, error: dbError } = await supabase
    .from('usuarios')
    .insert({
      email,
      nome,
      telefone,
      ativo: true,
    })
    .select()
    .single()

  if (dbError) {
    console.error('Erro ao criar usuário no banco:', dbError)
    // Rollback: deletar usuário do Auth
    await supabase.auth.admin.deleteUser(authData.user.id)
    return null
  }

  return userData as User
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Erro ao fazer logout:', error)
  }
}

export async function getCurrentUser(): Promise<User | null> {
  console.log('getCurrentUser: Buscando usuário do Supabase Auth...')
  
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('getCurrentUser: Erro ao buscar usuário do Auth:', error)
    return null
  }

  if (!user) {
    console.log('getCurrentUser: Nenhum usuário logado no Auth')
    return null
  }

  console.log('getCurrentUser: Usuário encontrado no Auth, buscando dados na tabela usuarios...')

  const { data: userData, error: userError } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (userError) {
    console.error('getCurrentUser: Erro ao buscar dados do usuário (DB):', userError)
    return null
  }

  if (!userData) {
    console.error('getCurrentUser: Usuário não encontrado na tabela usuarios')
    return null
  }

  console.log('getCurrentUser: Usuário encontrado:', userData)
  return userData as User
}

export async function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      const user = await getCurrentUser()
      callback(user)
    } else {
      callback(null)
    }
  })
}
