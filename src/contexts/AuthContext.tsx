
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, signIn, signUp, signOut, getCurrentUser, updateUltimoAcesso } from '../services/authService'

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

  useEffect(() => {
    // Timeout de 5 segundos para evitar travamento
    const timeoutId = setTimeout(() => {
      console.warn('AuthProvider: Timeout após 5 segundos, assumindo usuário não logado')
      setLoading(false)
    }, 5000)

    // Verificar usuário atual
    getCurrentUser()
      .then((currentUser) => {
        clearTimeout(timeoutId)
        setUser(currentUser)
        setLoading(false)
        if (currentUser) {
          updateUltimoAcesso()
        }
      })
      .catch((error) => {
        console.error('AuthProvider: Erro ao buscar usuário:', error)
        clearTimeout(timeoutId)
        setLoading(false)
      })

    return () => {
      clearTimeout(timeoutId)
    }
  }, [])

  // Atualizar último acesso a cada 5 minutos enquanto houver usuário logado
  useEffect(() => {
    if (!user) return

    updateUltimoAcesso()
    const intervalId = setInterval(() => {
      updateUltimoAcesso()
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
