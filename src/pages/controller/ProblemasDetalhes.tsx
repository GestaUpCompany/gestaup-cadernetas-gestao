import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'
import { formatDate } from '../../utils/formatDate'
import { getFazendaIdForUser } from '../../utils/fazendaContext'

interface RegistroProblemas {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  setor?: string
  local?: string
  descricao_problema?: string
  causa_identificada?: boolean
  causa_identificada_obs?: string
  acao_corretiva_realizada?: boolean
  acao_corretiva_realizada_obs?: string
  tipo_ocorrencia?: string
  tipo_ocorrencia_obs?: string
  causa_raiz_identificada?: boolean
  causa_raiz_identificada_obs?: string
  gravidade_impacto?: string
  gravidade_impacto_obs?: string
  tipo_problema?: string
  tipo_problema_obs?: string
  prioridade?: string
  setor_resolve?: string
  sync_status?: string
  created_at: string
  updated_at?: string
}

export function ProblemasDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroProblemas | null>(null)
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
      .from('registros_problemas')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroProblemas)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/problemas')}>
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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Problemas</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/problemas')}>
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
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Setor:</span> {registro.setor || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Local:</span> {registro.local || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Prioridade:</span> {registro.prioridade || '-'}</p>
            </div>
          </div>

          {/* Problema */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Problema</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Tipo Problema:</span> {registro.tipo_problema || '-'}{registro.tipo_problema_obs ? ` (${registro.tipo_problema_obs})` : ''}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Tipo Ocorrência:</span> {registro.tipo_ocorrencia || '-'}{registro.tipo_ocorrencia_obs ? ` (${registro.tipo_ocorrencia_obs})` : ''}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Gravidade do Impacto:</span> {registro.gravidade_impacto || '-'}{registro.gravidade_impacto_obs ? ` (${registro.gravidade_impacto_obs})` : ''}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Setor Resolve:</span> {registro.setor_resolve || '-'}</p>
              </div>
            </div>
          </div>

          {/* Descrição */}
          {registro.descricao_problema && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Descrição do Problema</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm">{registro.descricao_problema}</p>
              </div>
            </div>
          )}

          {/* Análise */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Análise e Ação</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Causa Identificada:</span> {registro.causa_identificada ? 'Sim' : 'Não'}{registro.causa_identificada_obs ? ` - ${registro.causa_identificada_obs}` : ''}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Causa Raiz Identificada:</span> {registro.causa_raiz_identificada ? 'Sim' : 'Não'}{registro.causa_raiz_identificada_obs ? ` - ${registro.causa_raiz_identificada_obs}` : ''}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Ação Corretiva Realizada:</span> {registro.acao_corretiva_realizada ? 'Sim' : 'Não'}{registro.acao_corretiva_realizada_obs ? ` - ${registro.acao_corretiva_realizada_obs}` : ''}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
