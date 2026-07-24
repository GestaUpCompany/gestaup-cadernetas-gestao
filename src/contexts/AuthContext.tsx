
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { User, signIn, signUp, signOut, getCurrentUser, updateUltimoAcesso } from '../services/authService'
import { supabase } from '../services/supabaseClient'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<User | null>
  signUp: (email: string, password: string, nome: string, telefone?: string) => Promise<User | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const userRef = useRef<User | null>(null)
  const authUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        // getSession é síncrono e lê do localStorage, mais confiável na inicialização
        const { data: { session } } = await supabase.auth.getSession()
        authUserIdRef.current = session?.user?.id ?? null

        if (session?.user && isMounted) {
          const currentUser = await getCurrentUser()
          if (isMounted) {
            setUser(currentUser)
            if (currentUser) updateUltimoAcesso(session?.user?.id)
          }
        }
      } catch (error) {
        console.error('AuthProvider: Erro ao buscar usuário:', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    // Ouvi mudanças de autenticação (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: { user: { id: string } } | null) => {
      if (!isMounted) return

      const authUserId = session?.user?.id ?? null

      if (event === 'SIGNED_OUT' || !authUserId) {
        authUserIdRef.current = null
        if (userRef.current !== null) {
          setUser(null)
        }
        return
      }

      // Ignora eventos de refresh/visibilidade para o mesmo usuário já carregado,
      // evitando re-renderização e refetch desnecessário em todas as páginas
      if (authUserId === authUserIdRef.current && userRef.current) {
        return
      }

      authUserIdRef.current = authUserId

      getCurrentUser().then((currentUser) => {
        if (isMounted) {
          setUser(currentUser)
          if (currentUser) updateUltimoAcesso(authUserId)
        }
      })
    })

    // Timeout de 5 segundos para evitar travamento
    const timeoutId = setTimeout(() => {
      if (isMounted) setLoading(false)
    }, 5000)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  // Atualizar último acesso a cada 5 minutos enquanto houver usuário logado
  useEffect(() => {
    if (!user) return

    updateUltimoAcesso(user.auth_id)
    const intervalId = setInterval(() => {
      updateUltimoAcesso(user.auth_id)
    }, 5 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [user])

  const handleSignIn = async (email: string, password: string): Promise<User | null> => {
    const session = await signIn(email, password)
    if (session) {
      setUser(session.user)
      return session.user
    }
    return null
  }

  const handleSignUp = async (email: string, password: string, nome: string, telefone?: string): Promise<User | null> => {
    const newUser = await signUp(email, password, nome, telefone)
    if (newUser) {
      setUser(newUser)
      return newUser
    }
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn: handleSignIn, signUp: handleSignUp, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
