import { supabase } from './supabaseClient'

export interface User {
  id: string
  email: string
  nome: string
  telefone?: string
  ativo: boolean
}

export interface Session {
  user: User
  token: string
}

export async function signIn(email: string, password: string): Promise<Session | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Erro ao fazer login:', error)
    return null
  }

  // Buscar dados adicionais do usuário
  const { data: userData } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .single()

  if (!userData) {
    return null
  }

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
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: userData } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', user.email)
    .single()

  if (!userData) {
    return null
  }

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
