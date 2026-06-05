import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'
import { formatDate } from '../../utils/formatDate'

interface RegistroAbastecimento {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  data: string
  quem_abasteceu: string
  operador_motorista: string
  veiculo_trator: string
  placa: string
  hidrometro_inicial: number
  hidrometro_final: number
  total_abastecido: number
  combustivel: string
  odometro: string
  tipo_operacao: string
  observacao?: string
  sync_status?: string
  version?: number
  created_at: string
  updated_at: string
  deleted_at?: string
  nome_usuario?: string
}

export function RegistrosAbastecimentoDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroAbastecimento | null>(null)
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
      .from('registros_abastecimento')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroAbastecimento)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/abastecimento')}>
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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Abastecimento</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/abastecimento')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm" disableHover>
        <div className="space-y-6">
          {/* Informações Gerais */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Informações Gerais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Data:</span> {formatDate(registro.data)}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Quem Abasteceu:</span> {registro.quem_abasteceu}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Operador/Motorista:</span> {registro.operador_motorista}</p>
            </div>
          </div>

          {/* Veículo */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Veículo</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Veículo/Trator:</span> {registro.veiculo_trator}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Placa:</span> {registro.placa}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Combustível:</span> {registro.combustivel}</p>
              </div>
            </div>
          </div>

          {/* Medições */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Medições</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Hidrômetro Inicial:</span> {registro.hidrometro_inicial}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Hidrômetro Final:</span> {registro.hidrometro_final}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Total Abastecido:</span> {registro.total_abastecido} L</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Odômetro:</span> {registro.odometro}</p>
              </div>
            </div>
          </div>

          {/* Operação */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Operação</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Tipo de Operação:</span> {registro.tipo_operacao}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Observação:</span> {registro.observacao || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
