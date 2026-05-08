import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'

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
        <Button variant="secondary" onClick={() => navigate('/controller/abastecimento')}>
          Voltar
        </Button>
        <Card className="bg-white p-6 text-center">
          <p className="text-gray-600">Registro não encontrado</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Detalhes do Registro de Abastecimento</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/abastecimento')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações Gerais</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Data:</span> {registro.data}</p>
              <p><span className="font-medium">Quem Abasteceu:</span> {registro.quem_abasteceu}</p>
              <p><span className="font-medium">Operador/Motorista:</span> {registro.operador_motorista}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Veículo</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Veículo/Trator:</span> {registro.veiculo_trator}</p>
              <p><span className="font-medium">Placa:</span> {registro.placa}</p>
              <p><span className="font-medium">Combustível:</span> {registro.combustivel}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Medições</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Hidrômetro Inicial:</span> {registro.hidrometro_inicial}</p>
              <p><span className="font-medium">Hidrômetro Final:</span> {registro.hidrometro_final}</p>
              <p><span className="font-medium">Total Abastecido:</span> {registro.total_abastecido} L</p>
              <p><span className="font-medium">Odômetro:</span> {registro.odometro}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Operação</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Tipo de Operação:</span> {registro.tipo_operacao}</p>
              <p><span className="font-medium">Observação:</span> {registro.observacao || '-'}</p>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Metadados</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Usuário:</span> {registro.nome_usuario || '-'}</p>
              <p><span className="font-medium">Criado em:</span> {new Date(registro.created_at).toLocaleString('pt-BR')}</p>
              {registro.updated_at && (
                <p><span className="font-medium">Atualizado em:</span> {new Date(registro.updated_at).toLocaleString('pt-BR')}</p>
              )}
              <p><span className="font-medium">Sync Status:</span> {registro.sync_status || '-'}</p>
              <p><span className="font-medium">Version:</span> {registro.version || '-'}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
