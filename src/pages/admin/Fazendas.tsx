import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFazendas, Fazenda, updateFazenda } from '../../services/fazendasService'
import { Button, Card } from '../../components/ui'

export function FazendasList() {
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

  const toggleAtivo = async (fazenda: Fazenda) => {
    const result = await updateFazenda(fazenda.id, { ativo: !fazenda.ativo })
    if (result) {
      loadFazendas()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Fazendas</h2>
        <Button onClick={() => navigate('/admin/fazendas/nova')}>
          Nova Fazenda
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-600">Carregando...</p>
      ) : fazendas.length === 0 ? (
        <Card className="bg-white p-6 text-center">
          <p className="text-gray-600 mb-4">Nenhuma fazenda cadastrada</p>
          <Button onClick={() => navigate('/admin/fazendas/nova')}>
            Criar Primeira Fazenda
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fazendas.map((fazenda) => (
            <Card
              key={fazenda.id}
              className="bg-white p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/admin/fazendas/${fazenda.id}/detalhes`)}
            >
              <div className="flex items-start gap-4">
                {fazenda.logo_url ? (
                  <img
                    src={fazenda.logo_url}
                    alt={fazenda.nome}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                    <span className="text-2xl text-gray-400">F</span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 mb-1">{fazenda.nome}</h3>
                  <p className="text-sm text-gray-600 mb-2">ID: {fazenda.acesso_id}</p>
                  {fazenda.email && (
                    <p className="text-sm text-gray-600">{fazenda.email}</p>
                  )}
                  {fazenda.telefone && (
                    <p className="text-sm text-gray-600">{fazenda.telefone}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    fazenda.ativo
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {fazenda.ativo ? 'Ativa' : 'Inativa'}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleAtivo(fazenda)
                    }}
                  >
                    {fazenda.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/admin/fazendas/${fazenda.id}`)
                    }}
                  >
                    Editar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
