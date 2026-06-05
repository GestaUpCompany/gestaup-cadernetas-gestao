import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'
import { formatDate } from '../../utils/formatDate'

interface RegistroLimpeza {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  data: string
  numero_equipe?: number
  setor?: string
  local?: string
  hora_inicio?: string
  hora_final?: string
  limpeza_realizada?: any[]
  observacao?: string
  nome_usuario?: string
  sync_status?: string
  version?: number
  created_at: string
  updated_at: string
  deleted_at?: string
}

export function RegistrosLimpezaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroLimpeza | null>(null)
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
      .from('registros_limpeza')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroLimpeza)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/limpeza')}>
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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Limpeza</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/limpeza')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm" disableHover>
        <div className="space-y-6">
          {/* Informações Gerais */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Informações Gerais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Data:</span> {formatDate(registro.data)}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Nº Equipe:</span> {registro.numero_equipe || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Setor:</span> {registro.setor || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Local:</span> {registro.local || '-'}</p>
            </div>
          </div>

          {/* Horários */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Horários</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Hora Início:</span> {registro.hora_inicio || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Hora Final:</span> {registro.hora_final || '-'}</p>
              </div>
            </div>
          </div>

          {/* Limpeza Realizada */}
          {registro.limpeza_realizada && registro.limpeza_realizada.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Limpeza Realizada</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  {registro.limpeza_realizada.map((item: string) => 
                    item.charAt(0).toUpperCase() + item.slice(1)
                  ).join(', ')}
                </p>
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
