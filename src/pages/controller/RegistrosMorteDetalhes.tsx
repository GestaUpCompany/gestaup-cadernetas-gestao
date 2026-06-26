import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'
import { formatDate } from '../../utils/formatDate'

interface RegistroMorte {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  pasto?: string
  lote?: string
  sexo?: string
  raca?: string
  idade?: string
  peso_vivo?: number
  causa_morte?: string
  brinco?: string
  chip?: string
  categoria?: string
  categoria_outros?: string
  diagnosticos?: Record<string, any>
  escore?: number
  nutricao_atual?: string
  nutricao_anterior?: string
  individuo_id?: string
  sync_status?: string
  version?: number
  created_at: string
  updated_at: string
  deleted_at?: string
}

export function RegistrosMorteDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroMorte | null>(null)
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
      .from('registros_morte')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroMorte)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/morte')}>
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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Morte</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/morte')}>
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
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Lote:</span> {registro.lote || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Pasto:</span> {registro.pasto || '-'}</p>
            </div>
          </div>

          {/* Identificação do Animal */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Identificação do Animal</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Brinco:</span> {registro.brinco || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Chip:</span> {registro.chip || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Categoria:</span> {registro.categoria || '-'}{registro.categoria === 'outros' && registro.categoria_outros ? ` (${registro.categoria_outros})` : ''}</p>
              </div>
              {registro.individuo_id && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Indivíduo:</span>{' '}
                    <button
                      onClick={() => navigate(`/controller/individuos/${registro.individuo_id}`)}
                      className="text-primary hover:underline font-medium"
                    >
                      Ver indivíduo
                    </button>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Características */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Características</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Sexo:</span> {registro.sexo || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Raça:</span> {registro.raca || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Idade:</span> {registro.idade || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Peso Vivo (kg):</span> {registro.peso_vivo || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Escore:</span> {registro.escore !== undefined && registro.escore !== null ? registro.escore : '-'}</p>
              </div>
            </div>
          </div>

          {/* Causa da Morte */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Causa da Morte</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm"><span className="font-medium text-gray-700">Causa:</span> {registro.causa_morte || '-'}</p>
            </div>
          </div>

          {/* Sinais Clínicos */}
          {registro.diagnosticos && Object.keys(registro.diagnosticos).length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Sinais Clínicos</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  {Object.entries(registro.diagnosticos)
                    .filter(([_, value]: [string, any]) => value.valor === 'S')
                    .map(([key]: [string, any]) => {
                      const mapping: Record<string, string> = {
                        secrecaoOrificios: 'Secreção pelos orifícios',
                        sintomasPneumonia: 'Sintomas de pneumonia',
                        inchaco: 'Inchaço',
                        incoordenacaoTremores: 'Incoordenação/Tremores',
                        apatiaFraqueza: 'Apatia/Fraqueza',
                        presencaSangue: 'Presença de sangue',
                        desordensDigestivas: 'Desordens digestivas',
                        morteSubita: 'Morte Súbita',
                        animalSozinho: 'Animal Sozinho'
                      }
                      return mapping[key] || key
                    })
                    .join(', ') || 'Nenhum sinal clínico registrado'}
                </p>
              </div>
            </div>
          )}

          {/* Nutrição */}
          {(registro.nutricao_atual || registro.nutricao_anterior) && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Nutrição</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <p className="text-sm"><span className="font-medium text-gray-700">Nutrição Atual:</span> {registro.nutricao_atual || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">Nutrição Anterior:</span> {registro.nutricao_anterior || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
