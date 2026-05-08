import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'

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
  secrecao_orificios: boolean
  secrecao_orificios_obs?: string
  sintomas_pneumonia: boolean
  sintomas_pneumonia_obs?: string
  inchaco: boolean
  inchaco_obs?: string
  incoordenacao_tremores: boolean
  incoordenacao_tremores_obs?: string
  apatia_fraqueza: boolean
  apatia_fraqueza_obs?: string
  presenca_sangue: boolean
  presenca_sangue_obs?: string
  desordens_digestivas: boolean
  desordens_digestivas_obs?: string
  brinco?: string
  chip?: string
  categoria?: string
  categoria_outros?: string
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
        <Button variant="secondary" onClick={() => navigate('/controller/morte')}>
          Voltar
        </Button>
        <Card className="bg-white p-6 text-center" disableHover>
          <p className="text-gray-600">Registro não encontrado</p>
        </Card>
      </div>
    )
  }

  const sinaisClinicos = []
  if (registro.secrecao_orificios) sinaisClinicos.push(`Secreção pelos orifícios${registro.secrecao_orificios_obs ? ` (${registro.secrecao_orificios_obs})` : ''}`)
  if (registro.sintomas_pneumonia) sinaisClinicos.push(`Sintomas de pneumonia${registro.sintomas_pneumonia_obs ? ` (${registro.sintomas_pneumonia_obs})` : ''}`)
  if (registro.inchaco) sinaisClinicos.push(`Inchaço${registro.inchaco_obs ? ` (${registro.inchaco_obs})` : ''}`)
  if (registro.incoordenacao_tremores) sinaisClinicos.push(`Incoordenação/Tremores${registro.incoordenacao_tremores_obs ? ` (${registro.incoordenacao_tremores_obs})` : ''}`)
  if (registro.apatia_fraqueza) sinaisClinicos.push(`Apatia/Fraqueza${registro.apatia_fraqueza_obs ? ` (${registro.apatia_fraqueza_obs})` : ''}`)
  if (registro.presenca_sangue) sinaisClinicos.push(`Presença de sangue${registro.presenca_sangue_obs ? ` (${registro.presenca_sangue_obs})` : ''}`)
  if (registro.desordens_digestivas) sinaisClinicos.push(`Desordens digestivas${registro.desordens_digestivas_obs ? ` (${registro.desordens_digestivas_obs})` : ''}`)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Detalhes do Registro de Morte</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/morte')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-6" disableHover>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações Gerais</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Data:</span> {(() => {
                const [year, day, month] = registro.data.split('-')
                return `${day}/${month}/${year}`
              })()}</p>
              <p><span className="font-medium">Lote:</span> {registro.lote || '-'}</p>
              <p><span className="font-medium">Pasto:</span> {registro.pasto || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Identificação</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Brinco:</span> {registro.brinco || '-'}</p>
              <p><span className="font-medium">Chip:</span> {registro.chip || '-'}</p>
              <p><span className="font-medium">Categoria:</span> {registro.categoria || '-'}{registro.categoria === 'outros' && registro.categoria_outros ? ` (${registro.categoria_outros})` : ''}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Características</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Sexo:</span> {registro.sexo || '-'}</p>
              <p><span className="font-medium">Raça:</span> {registro.raca || '-'}</p>
              <p><span className="font-medium">Idade:</span> {registro.idade || '-'}</p>
              <p><span className="font-medium">Peso Vivo (kg):</span> {registro.peso_vivo || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Causa da Morte</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Causa:</span> {registro.causa_morte || '-'}</p>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sinais Clínicos</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Sinais:</span> {sinaisClinicos.length > 0 ? sinaisClinicos.join(', ') : 'Nenhum sinal clínico registrado'}</p>
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
