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

interface AplicacaoItem {
  insumo_aplicado?: string
  quantidade_total_aplicada?: string
  area_trabalhada?: string
  dose_aplicada?: string
}

interface RegistroOperacoesMaquinas {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  data: string
  veiculo_trator: string
  implemento_utilizado: string
  hora_inicial?: string
  hora_final?: string
  odometro_horimetro_inicial: string
  odometro_horimetro_final: string
  total_odometro_horimetro?: string
  tipo_operacao: string
  observacao?: string
  checklist?: {
    meta_diaria_batida?: ChecklistItem
    algum_imprevisto?: ChecklistItem
  }
  aplicacoes?: AplicacaoItem[]
  sync_status?: string
  version?: number
  created_at: string
  updated_at: string
  deleted_at?: string
  nome_usuario?: string
}

export function RegistrosOperacoesMaquinasDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroOperacoesMaquinas | null>(null)
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
      .from('registros_operacoes_maquinas')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroOperacoesMaquinas)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/operacoes-maquinas')}>
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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Operações de Máquinas</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/operacoes-maquinas')}>
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
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Veículo/Trator:</span> {registro.veiculo_trator}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Implemento Utilizado:</span> {registro.implemento_utilizado}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Tipo Operação:</span> {registro.tipo_operacao.charAt(0).toUpperCase() + registro.tipo_operacao.slice(1)}</p>
            </div>
          </div>

          {/* Horários */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Horários</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Hora Inicial:</span> {registro.hora_inicial || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Hora Final:</span> {registro.hora_final || '-'}</p>
              </div>
            </div>
          </div>

          {/* Odômetro */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Odômetro/Horímetro</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Inicial:</span> {registro.odometro_horimetro_inicial || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Final:</span> {registro.odometro_horimetro_final || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Total:</span> {registro.total_odometro_horimetro || '-'}</p>
              </div>
            </div>
          </div>

          {/* Aplicação */}
          {registro.aplicacoes && Array.isArray(registro.aplicacoes) && registro.aplicacoes.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Aplicação</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                {registro.aplicacoes.map((aplic, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <p className="text-sm"><span className="font-medium text-gray-700">Insumo Aplicado:</span> {aplic.insumo_aplicado || '-'}</p>
                    <p className="text-sm"><span className="font-medium text-gray-700">Quantidade Total:</span> {aplic.quantidade_total_aplicada || '-'}</p>
                    <p className="text-sm"><span className="font-medium text-gray-700">Área Trabalhada:</span> {aplic.area_trabalhada || '-'}</p>
                    <p className="text-sm"><span className="font-medium text-gray-700">Dose Aplicada:</span> {aplic.dose_aplicada || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta Diária */}
          {registro.checklist?.meta_diaria_batida && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Meta Diária</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <p className="text-sm"><span className="font-medium text-gray-700">Meta Diária Batida:</span> {registro.checklist.meta_diaria_batida.valor === 'S' ? 'Sim' : registro.checklist.meta_diaria_batida.valor === 'N' ? 'Não' : registro.checklist.meta_diaria_batida.valor || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">Obs.:</span> {registro.checklist.meta_diaria_batida.observacao || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Imprevistos */}
          {registro.checklist?.algum_imprevisto && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Imprevistos</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <p className="text-sm"><span className="font-medium text-gray-700">Algum Imprevisto:</span> {registro.checklist.algum_imprevisto.valor === 'S' ? 'Sim' : registro.checklist.algum_imprevisto.valor === 'N' ? 'Não' : registro.checklist.algum_imprevisto.valor || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">Obs.:</span> {registro.checklist.algum_imprevisto.observacao || '-'}</p>
                </div>
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
