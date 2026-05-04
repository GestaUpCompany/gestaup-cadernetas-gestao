import { supabase } from './supabaseClient'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

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

export async function signUp(email: string, password: string, nome: string, telefone?: string, papel: 'admin' | 'controller' = 'controller'): Promise<User | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No session found for user creation')
      return null
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/create-user-without-confirmation`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, nome, telefone, papel }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Error calling create user function:', error)
      return null
    }

    const result = await response.json()
    return result.user
  } catch (error) {
    console.error('Exception in signUp:', error)
    return null
  }
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

export async function changeUserPassword(usuarioId: string, newPassword: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return false
    }

    // Buscar o auth_id do usuário
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('auth_id, id')
      .eq('id', usuarioId)
      .single()

    if (userError || !userData) {
      console.error('Erro ao buscar auth_id do usuário:', userError)
      return false
    }

    // Usar auth_id se existir, senão usar o próprio id
    const authId = userData.auth_id || userData.id

    const response = await fetch(
      `${supabaseUrl}/functions/v1/change-user-password`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: authId, newPassword }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Erro ao alterar senha:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro ao alterar senha:', error)
    return false
  }
}
