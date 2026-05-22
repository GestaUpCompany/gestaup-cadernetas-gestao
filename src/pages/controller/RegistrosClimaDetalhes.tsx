import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'

interface RegistroClima {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  responsavel: string
  temperatura_media?: number
  observacao?: string
  medicoes?: any[]
  sync_status?: string
  version?: number
  created_at: string
  updated_at: string
  deleted_at?: string
}

export function RegistrosClimaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroClima | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRegistro()
  }, [id, user])

  const loadRegistro = async () => {
    if (!id || !user) return

    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    const { data, error } = await supabase
      .from('registros_clima')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroClima)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/clima')}>
          Voltar
        </Button>
        <Card className="bg-white p-6 text-center" disableHover>
          <p className="text-gray-600">Registro não encontrado</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Clima</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/clima')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm" disableHover>
        <div className="space-y-6">
          {/* Informações Gerais */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Informações Gerais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Data:</span> {(() => {
                const [year, month, day] = registro.data.split('-')
                return `${day}/${month}/${year}`
              })()}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Responsável:</span> {registro.responsavel}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Temperatura Média:</span> {registro.temperatura_media ? `${registro.temperatura_media}°C` : '-'}</p>
            </div>
          </div>

          {/* Medições */}
          {registro.medicoes && registro.medicoes.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Medições</h3>
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Pluviômetro</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Localização</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Medição (mm)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {registro.medicoes.map((medicao: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {medicao.pluviometro_nome || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {medicao.pluviometro_localizacao || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {medicao.medicao !== undefined ? `${medicao.medicao} mm` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Observação */}
          {registro.observacao && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Observação</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm">{registro.observacao}</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
