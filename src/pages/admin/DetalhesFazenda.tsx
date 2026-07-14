import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFazendas, Fazenda } from '../../services/fazendasService'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'

interface CadastroStats {
  pastos: number
  lotes: number
  funcionarios: number
  insumos: number
}

export function DetalhesFazenda() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [fazenda, setFazenda] = useState<Fazenda | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<CadastroStats>({
    pastos: 0,
    lotes: 0,
    funcionarios: 0,
    insumos: 0,
  })

  useEffect(() => {
    loadFazenda()
    loadStats()
  }, [id])

  const loadFazenda = async () => {
    if (!id) return
    const fazendas = await getFazendas()
    const found = fazendas.find(f => f.id === id)
    setFazenda(found || null)
    setLoading(false)
  }

  const loadStats = async () => {
    if (!id) return
    
    // Buscar contagem de cadastros
    const { count: pastosCount } = await supabase
      .from('pastos')
      .select('*', { count: 'exact', head: true })
      .eq('fazenda_id', id)

    const { count: lotesCount } = await supabase
      .from('lotes')
      .select('*', { count: 'exact', head: true })
      .eq('fazenda_id', id)

    const { count: funcionariosCount } = await supabase
      .from('funcionarios')
      .select('*', { count: 'exact', head: true })
      .eq('fazenda_id', id)

    const { count: insumosCount } = await supabase
      .from('insumos')
      .select('*', { count: 'exact', head: true })
      .eq('fazenda_id', id)

    setStats({
      pastos: pastosCount || 0,
      lotes: lotesCount || 0,
      funcionarios: funcionariosCount || 0,
      insumos: insumosCount || 0,
    })
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!fazenda) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Fazenda não encontrada</p>
        <Button onClick={() => navigate('/admin/fazendas')} className="mt-4">
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Button variant="secondary" onClick={() => navigate('/admin/fazendas')} className="mb-4">
            Voltar
          </Button>
          <h2 className="text-3xl font-bold text-gray-800">{fazenda.nome}</h2>
          <p className="text-gray-600">{fazenda.cnpj || 'Sem CNPJ'}</p>
        </div>
        <Button onClick={() => navigate(`/admin/fazendas/${fazenda.id}`)}>
          Editar Fazenda
        </Button>
      </div>

      {/* Informações da Fazenda */}
      <Card className="bg-white p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Informações</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Acesso ID</p>
            <p className="font-medium">{fazenda.acesso_id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{fazenda.email || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Telefone</p>
            <p className="font-medium">{fazenda.telefone || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Endereço</p>
            <p className="font-medium">{fazenda.endereco || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span className={`px-3 py-1 rounded-full text-sm ${
              fazenda.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {fazenda.ativo ? 'Ativa' : 'Inativa'}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Confinamento</p>
            <span className={`px-3 py-1 rounded-full text-sm ${
              fazenda.acesso_confinamento ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {fazenda.acesso_confinamento ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
      </Card>

      {/* Estatísticas de Cadastros */}
      <Card className="bg-white p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Cadastros</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Pastos</p>
            <p className="text-3xl font-bold text-primary">{stats.pastos}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Lotes</p>
            <p className="text-3xl font-bold text-blue-600">{stats.lotes}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Funcionários</p>
            <p className="text-3xl font-bold text-green-600">{stats.funcionarios}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Insumos</p>
            <p className="text-3xl font-bold text-purple-600">{stats.insumos}</p>
          </div>
        </div>
      </Card>

      {/* Registros de Cadernetas */}
      <Card className="bg-white p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Registros de Cadernetas</h3>
        <p className="text-gray-600 mb-4">
          Em breve: listagem de registros de cadernetas (Maternidade, Enfermaria, Pastagens, Rodeio, etc.)
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Maternidade</p>
            <p className="text-2xl font-bold text-gray-400">Em breve</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Enfermaria</p>
            <p className="text-2xl font-bold text-gray-400">Em breve</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Pastagens</p>
            <p className="text-2xl font-bold text-gray-400">Em breve</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Rodeio</p>
            <p className="text-2xl font-bold text-gray-400">Em breve</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
