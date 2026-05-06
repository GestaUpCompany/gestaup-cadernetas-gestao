import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button, Input, Card } from '../../components/ui'
import { LOGO_GESTAUP } from '../../types/images'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const user = await signIn(email, password)
    if (user) {
      navigate('/')
    } else {
      setError('Email ou senha inválidos')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo Centralizado */}
        <div className="flex flex-col items-center">
          <img 
            src={LOGO_GESTAUP} 
            alt="Manej'Us Logo" 
            className="h-20 w-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-800">Manej'Us</h2>
          <p className="text-gray-500">Faça login para acessar sua fazenda</p>
        </div>

        {/* Formulário */}
        <Card className="bg-white shadow-lg border-0">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400">
          © 2026 Gesta'Up
        </p>
      </div>
    </div>
  )
}
