import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFazendas, Fazenda } from '../../services/fazendasService'
import { Button, Card } from '../../components/ui'

export function AdminDashboard() {
  const navigate = useNavigate()
  const [fazendas, setFazendas] = useState<Fazenda[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFazendas()
  }, [])

  const loadFazendas = async () => {
    setLoading(true)
    const data = await getFazendas()
    setFazendas(data)
    setLoading(false)
  }

  const stats = {
    totalFazendas: fazendas.length,
    fazendasAtivas: fazendas.filter(f => f.ativo).length,
    fazendasInativas: fazendas.filter(f => !f.ativo).length,
  }

  return (
    <div className="space-y-8">
      {/* Visão Geral */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Visão Geral</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white p-6 border-0 shadow-sm">
            <h3 className="text-sm text-gray-500 mb-2">Total de Fazendas</h3>
            <p className="text-4xl font-bold text-gray-800">{stats.totalFazendas}</p>
          </Card>
          <Card className="bg-white p-6 border-0 shadow-sm">
            <h3 className="text-sm text-gray-500 mb-2">Fazendas Ativas</h3>
            <p className="text-4xl font-bold text-gray-800">{stats.fazendasAtivas}</p>
          </Card>
          <Card className="bg-white p-6 border-0 shadow-sm">
            <h3 className="text-sm text-gray-500 mb-2">Fazendas Inativas</h3>
            <p className="text-4xl font-bold text-gray-800">{stats.fazendasInativas}</p>
          </Card>
        </div>
      </div>

      {/* Fazendas Recentes */}
      <Card className="bg-white p-6 border-0 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Fazendas Recentes</h2>
          <Button variant="secondary" onClick={() => navigate('/admin/fazendas')}>
            Ver Todas
          </Button>
        </div>

        {loading ? (
          <p className="text-gray-600">Carregando...</p>
        ) : fazendas.length === 0 ? (
          <p className="text-gray-600">Nenhuma fazenda cadastrada</p>
        ) : (
          <div className="space-y-3">
            {fazendas.slice(0, 5).map((fazenda) => (
              <div
                key={fazenda.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg  cursor-pointer"
                onClick={() => navigate(`/admin/fazendas/${fazenda.id}/detalhes`)}
              >
                <div className="flex items-center gap-4">
                  {fazenda.logo_url && (
                    <img
                      src={fazenda.logo_url}
                      alt={fazenda.nome}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-800">{fazenda.nome}</h3>
                    <p className="text-sm text-gray-500">ID: {fazenda.acesso_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      fazenda.ativo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {fazenda.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Botão Flutuante Nova Fazenda */}
      <Button
        onClick={() => navigate('/admin/fazendas/nova')}
        className="bg-accent text-gray-800"
      >
        Nova Fazenda
      </Button>
    </div>
  )
}
