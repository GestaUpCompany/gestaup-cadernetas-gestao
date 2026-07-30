import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'
import { formatDate } from '../../utils/formatDate'
import { getFazendaIdForUser } from '../../utils/fazendaContext'

interface ChecklistItem {
  valor: string
  observacao: string
}

interface RegistroManutencaoMaquinas {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  responsavel_checklist?: string
  operador_motorista?: string
  veiculo_trator?: string
  placa?: string
  odometro_horimetro?: string
  observacao?: string
  checklist?: Record<string, ChecklistItem>
  sync_status?: string
  created_at: string
  updated_at?: string
}

const CHECKLIST_LABELS: Record<string, string> = {
  assentoBom: 'Assento em bom estado',
  bateriaBoa: 'Bateria em boa condição',
  freiosBons: 'Freios em bom estado',
  tapetesBons: 'Tapetes em bom estado',
  calibrouPneus: 'Calibrou pneus',
  limpouRadiador: 'Limpou radiador',
  nivelAguaIdeal: 'Nível de água ideal',
  vidrosPerfeitos: 'Vidros perfeitos',
  conferiuEletrica: 'Conferiu parte elétrica',
  lavagemRealizada: 'Lavagem realizada',
  maquinaEngraxada: 'Máquina engraxada',
  conferiuNivelOleo: 'Conferiu nível de óleo',
  abastecimentoRealizado: 'Abastecimento realizado',
}

export function ManutencaoMaquinasDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroManutencaoMaquinas | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRegistro()
  }, [id, user])

  const loadRegistro = async () => {
    if (!id || !user) return

    const _fazendaId = await getFazendaIdForUser(user.id)
    const vinculos = _fazendaId ? [{ fazenda_id: _fazendaId }] : []

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    const { data, error } = await supabase
      .from('registros_manutencao_maquinas')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroManutencaoMaquinas)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/manutencao-maquinas')}>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Manutenção de Máquinas</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/manutencao-maquinas')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm" disableHover>
        <div className="space-y-6">
          {/* Informações Gerais */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Informações Gerais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Data:</span> {formatDate(registro.data)}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Veículo/Trator:</span> {registro.veiculo_trator || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Placa:</span> {registro.placa || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Odômetro/Horímetro:</span> {registro.odometro_horimetro || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Operador/Motorista:</span> {registro.operador_motorista || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Responsável Checklist:</span> {registro.responsavel_checklist || '-'}</p>
            </div>
          </div>

          {/* Checklist de Manutenção */}
          {registro.checklist && Object.keys(registro.checklist).length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Checklist de Manutenção</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(registro.checklist).map(([key, item]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-sm">
                        <span className="font-medium text-gray-700">{CHECKLIST_LABELS[key] || key}:</span>{' '}
                        {item.valor === 'S' ? 'Sim' : item.valor === 'N' ? 'Não' : item.valor || '-'}
                      </p>
                      {item.observacao && (
                        <p className="text-sm text-gray-600"><span className="font-medium">Obs.:</span> {item.observacao}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Observações</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm"><span className="font-medium text-gray-700">Observação:</span> {registro.observacao || '-'}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
