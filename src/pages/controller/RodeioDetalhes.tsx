import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'

interface RegistroRodeio {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  pasto?: string
  lote?: string
  vaca?: number
  touro?: number
  bezerro?: number
  boi?: number
  garrote?: number
  novilha?: number
  animais_tratados?: number
  escore_fezes?: number
  escore_gado?: number
  equipe?: number
  procedimentos?: string[]
  escore_gado_ideal?: boolean
  agua_boa_bebedouro?: boolean
  pastagem_adequada?: boolean
  animais_doentes?: boolean
  cercas_cochos?: boolean
  carrapatos_moscas?: boolean
  animais_entrevero?: boolean
  animal_morto?: boolean
  sync_status?: string
  created_at: string
  updated_at?: string
}

export function RodeioDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroRodeio | null>(null)
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
      .from('registros_rodeio')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroRodeio)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/rodeio')}>
          Voltar
        </Button>
        <Card className="bg-white p-6 text-center">
          <p className="text-gray-600">Registro não encontrado</p>
        </Card>
      </div>
    )
  }

  const problemas = []
  if (!registro.escore_gado_ideal) problemas.push('Escore')
  if (!registro.agua_boa_bebedouro) problemas.push('Água')
  if (!registro.pastagem_adequada) problemas.push('Pastagem')
  if (registro.animais_doentes) problemas.push('Doentes')
  if (!registro.cercas_cochos) problemas.push('Cercas')
  if (registro.carrapatos_moscas) problemas.push('Carrapatos')
  if (registro.animais_entrevero) problemas.push('Entrevero')
  if (registro.animal_morto) problemas.push('Morto')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Detalhes do Registro de Rodeio</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/rodeio')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações Gerais</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Data:</span> {(() => {
                const [year, day, month] = registro.data.split('-')
                return `${day}/${month}/${year}`
              })()}</p>
              <p><span className="font-medium">Pasto:</span> {registro.pasto || '-'}</p>
              <p><span className="font-medium">Lote:</span> {registro.lote || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Contagem de Animais</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Vaca:</span> {registro.vaca || 0}</p>
              <p><span className="font-medium">Touro:</span> {registro.touro || 0}</p>
              <p><span className="font-medium">Bezerro:</span> {registro.bezerro || 0}</p>
              <p><span className="font-medium">Boi:</span> {registro.boi || 0}</p>
              <p><span className="font-medium">Garrote:</span> {registro.garrote || 0}</p>
              <p><span className="font-medium">Novilha:</span> {registro.novilha || 0}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Indicadores</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Animais Tratados:</span> {registro.animais_tratados || 0}</p>
              <p><span className="font-medium">Escore Fezes:</span> {registro.escore_fezes || '-'}</p>
              <p><span className="font-medium">Escore Gado:</span> {registro.escore_gado || '-'}</p>
              <p><span className="font-medium">Equipe:</span> {registro.equipe || 0}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Procedimentos</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Procedimentos:</span> {registro.procedimentos?.join(', ') || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Problemas Identificados</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Problemas:</span> {problemas.length > 0 ? problemas.join(', ') : 'Nenhum'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Metadados</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Usuário:</span> {registro.nome_usuario || '-'}</p>
              <p><span className="font-medium">Criado em:</span> {new Date(registro.created_at).toLocaleString('pt-BR')}</p>
              {registro.updated_at && (
                <p><span className="font-medium">Atualizado em:</span> {new Date(registro.updated_at).toLocaleString('pt-BR')}</p>
              )}
              <p><span className="font-medium">Sync Status:</span> {registro.sync_status || '-'}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
