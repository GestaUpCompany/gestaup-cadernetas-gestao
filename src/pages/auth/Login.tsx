import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Button, Input, Card } from '../../components/ui'

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const user = await signIn(email, password)
    if (!user) {
      setError('Email ou senha inválidos')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-primary text-center mb-2">GestaUp</h1>
        <p className="text-gray-600 text-center mb-8">Cadernetas Gestão</p>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
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

        <p className="text-center text-sm text-gray-600 mt-6">
          Não tem uma conta?{' '}
          <a href="/signup" className="text-primary font-semibold hover:underline">
            Cadastre-se
          </a>
        </p>
      </Card>
    </div>
  )
}
