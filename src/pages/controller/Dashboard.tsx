import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Card, Button } from '../../components/ui'

interface Fazenda {
  id: string
  nome: string
  acesso_id: string
  cnpj?: string
  email?: string
  telefone?: string
  endereco?: string
  logo_url?: string
  ativo: boolean
}

interface CadastroStats {
  pastos: number
  lotes: number
  funcionarios: number
  insumos: number
}

interface CadernetaStats {
  maternidade: number
  enfermaria: number
  pastagens: number
  rodeio: number
  suplementacao: number
  bebedouros: number
  movimentacao: number
}

export function ControllerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [fazenda, setFazenda] = useState<Fazenda | null>(null)
  const [loading, setLoading] = useState(true)
  const [cadastroStats, setCadastroStats] = useState<CadastroStats>({
    pastos: 0,
    lotes: 0,
    funcionarios: 0,
    insumos: 0,
  })
  const [cadernetaStats, setCadernetaStats] = useState<CadernetaStats>({
    maternidade: 0,
    enfermaria: 0,
    pastagens: 0,
    rodeio: 0,
    suplementacao: 0,
    bebedouros: 0,
    movimentacao: 0,
  })

  useEffect(() => {
    loadFazenda()
    loadStats()
  }, [user])

  const loadFazenda = async () => {
    if (!user) return

    // Buscar fazenda vinculada ao controller
    const { data: vinculos, error: vinculoError } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (vinculoError || !vinculos || vinculos.length === 0) {
      console.error('Erro ao buscar fazenda vinculada:', vinculoError)
      setLoading(false)
      return
    }

    const fazendaId = vinculos[0].fazenda_id

    const { data: fazendaData, error: fazendaError } = await supabase
      .from('fazendas')
      .select('*')
      .eq('id', fazendaId)
      .single()

    if (fazendaError) {
      console.error('Erro ao buscar fazenda:', fazendaError)
    } else {
      setFazenda(fazendaData as Fazenda)
    }

    setLoading(false)
  }

  const loadStats = async () => {
    if (!user) return

    // Buscar fazenda vinculada
    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    // Buscar estatísticas de cadastros
    const [
      { count: pastosCount },
      { count: lotesCount },
      { count: funcionariosCount },
      { count: insumosCount },
    ] = await Promise.all([
      supabase.from('pastos').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('lotes').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('funcionarios').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('insumos').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
    ])

    // Buscar estatísticas de cadernetas
    const [
      { count: maternidadeCount },
      { count: enfermariaCount },
      { count: pastagensCount },
      { count: rodeioCount },
      { count: suplementacaoCount },
      { count: bebedourosCount },
      { count: movimentacaoCount },
    ] = await Promise.all([
      supabase.from('registros_maternidade').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_enfermaria').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_pastagens').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_rodeio').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_suplementacao').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_bebedouros').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_movimentacao').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
    ])

    setCadastroStats({
      pastos: pastosCount || 0,
      lotes: lotesCount || 0,
      funcionarios: funcionariosCount || 0,
      insumos: insumosCount || 0,
    })

    setCadernetaStats({
      maternidade: maternidadeCount || 0,
      enfermaria: enfermariaCount || 0,
      pastagens: pastagensCount || 0,
      rodeio: rodeioCount || 0,
      suplementacao: suplementacaoCount || 0,
      bebedouros: bebedourosCount || 0,
      movimentacao: movimentacaoCount || 0,
    })
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!fazenda) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Nenhuma fazenda vinculada ao seu usuário</p>
        <p className="text-sm text-gray-500">Entre em contato com o administrador</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header da Fazenda */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {fazenda.logo_url ? (
            <img
              src={fazenda.logo_url}
              alt={fazenda.nome}
              className="w-20 h-20 rounded-lg object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
              <span className="text-4xl">🏠</span>
            </div>
          )}
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{fazenda.nome}</h2>
            <p className="text-gray-600">ID: {fazenda.acesso_id}</p>
            {fazenda.cnpj && <p className="text-sm text-gray-600">CNPJ: {fazenda.cnpj}</p>}
          </div>
        </div>
      </div>

      {/* Estatísticas de Cadastros */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Cadastros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white p-6">
            <p className="text-sm text-gray-500 mb-2">Pastos</p>
            <p className="text-4xl font-bold text-primary">{cadastroStats.pastos}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/pastos')}
            >
              Gerenciar
            </Button>
          </Card>
          <Card className="bg-white p-6">
            <p className="text-sm text-gray-500 mb-2">Lotes</p>
            <p className="text-4xl font-bold text-blue-600">{cadastroStats.lotes}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/lotes')}
            >
              Gerenciar
            </Button>
          </Card>
          <Card className="bg-white p-6">
            <p className="text-sm text-gray-500 mb-2">Funcionários</p>
            <p className="text-4xl font-bold text-green-600">{cadastroStats.funcionarios}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/funcionarios')}
            >
              Gerenciar
            </Button>
          </Card>
          <Card className="bg-white p-6">
            <p className="text-sm text-gray-500 mb-2">Insumos</p>
            <p className="text-4xl font-bold text-purple-600">{cadastroStats.insumos}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/insumos')}
            >
              Gerenciar
            </Button>
          </Card>
        </div>
      </div>

      {/* Estatísticas de Cadernetas */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Cadernetas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white p-6">
            <p className="text-sm text-gray-500 mb-2">Maternidade</p>
            <p className="text-4xl font-bold text-pink-600">{cadernetaStats.maternidade}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/maternidade')}
            >
              Ver Registros
            </Button>
          </Card>
          <Card className="bg-white p-6">
            <p className="text-sm text-gray-500 mb-2">Enfermaria</p>
            <p className="text-4xl font-bold text-red-600">{cadernetaStats.enfermaria}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/enfermaria')}
            >
              Ver Registros
            </Button>
          </Card>
          <Card className="bg-white p-6">
            <p className="text-sm text-gray-500 mb-2">Pastagens</p>
            <p className="text-4xl font-bold text-yellow-600">{cadernetaStats.pastagens}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/pastagens-caderneta')}
            >
              Ver Registros
            </Button>
          </Card>
          <Card className="bg-white p-6">
            <p className="text-sm text-gray-500 mb-2">Rodeio</p>
            <p className="text-4xl font-bold text-orange-600">{cadernetaStats.rodeio}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/rodeio')}
            >
              Ver Registros
            </Button>
          </Card>
          <Card className="bg-white p-6">
            <p className="text-sm text-gray-500 mb-2">Suplementação</p>
            <p className="text-4xl font-bold text-orange-600">{cadernetaStats.suplementacao}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/suplementacao')}
            >
              Ver Registros
            </Button>
          </Card>
          <Card className="bg-white p-6">
            <p className="text-sm text-gray-500 mb-2">Bebedouros</p>
            <p className="text-4xl font-bold text-cyan-600">{cadernetaStats.bebedouros}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/bebedouros')}
            >
              Ver Registros
            </Button>
          </Card>
          <Card className="bg-white p-6">
            <p className="text-sm text-gray-500 mb-2">Movimentação</p>
            <p className="text-4xl font-bold text-purple-600">{cadernetaStats.movimentacao}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/movimentacao')}
            >
              Ver Registros
            </Button>
          </Card>
        </div>
      </div>

      {/* Ações Rápidas */}
      <Card className="bg-white p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button onClick={() => navigate('/controller/pastos')}>
            Novo Pasto
          </Button>
          <Button onClick={() => navigate('/controller/lotes')}>
            Novo Lote
          </Button>
          <Button onClick={() => navigate('/controller/funcionarios')}>
            Novo Funcionário
          </Button>
          <Button onClick={() => navigate('/controller/insumos')}>
            Novo Insumo
          </Button>
        </div>
      </Card>
    </div>
  )
}
