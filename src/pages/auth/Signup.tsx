import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Button, Input, Card } from '../../components/ui'

export function Signup() {
  const { signUp } = useAuth()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    const user = await signUp(email, password, nome, telefone || undefined)
    if (!user) {
      setError('Erro ao criar conta. Tente novamente.')
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
            label="Nome Completo"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
          />
          <Input
            label="Telefone (opcional)"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Input
            label="Confirmar Senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Já tem uma conta?{' '}
          <a href="/login" className="text-primary font-semibold hover:underline">
            Faça login
          </a>
        </p>
      </Card>
    </div>
  )
}
