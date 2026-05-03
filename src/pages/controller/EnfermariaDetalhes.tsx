import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'

interface RegistroEnfermaria {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  brinco_chip?: string
  lote?: string
  pasto?: string
  categoria?: string
  tratamento?: string
  problema_casco?: boolean
  problema_casco_obs?: string
  sintomas_pneumonia?: boolean
  picado_cobra?: boolean
  incoordenacao_tremores?: boolean
  febre_alta?: boolean
  presenca_sangue?: boolean
  fraturas?: boolean
  fraturas_obs?: string
  desordens_digestivas?: boolean
  desordens_digestivas_obs?: string
  sync_status?: string
  created_at: string
  updated_at?: string
}

export function EnfermariaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroEnfermaria | null>(null)
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
      .from('registros_enfermaria')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroEnfermaria)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/enfermaria')}>
          Voltar
        </Button>
        <Card className="bg-white p-6 text-center">
          <p className="text-gray-600">Registro não encontrado</p>
        </Card>
      </div>
    )
  }

  const sintomas = []
  if (registro.problema_casco) sintomas.push('Cascos')
  if (registro.sintomas_pneumonia) sintomas.push('Pneumonia')
  if (registro.picado_cobra) sintomas.push('Cobra')
  if (registro.incoordenacao_tremores) sintomas.push('Incoordenação')
  if (registro.febre_alta) sintomas.push('Febre')
  if (registro.presenca_sangue) sintomas.push('Sangue')
  if (registro.fraturas) sintomas.push('Fraturas')
  if (registro.desordens_digestivas) sintomas.push('Digestivo')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Detalhes do Registro de Enfermaria</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/enfermaria')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Identificação</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Brinco/Chip:</span> {registro.brinco_chip || '-'}</p>
              <p><span className="font-medium">Categoria:</span> {registro.categoria || '-'}</p>
              <p><span className="font-medium">Data:</span> {new Date(registro.data).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Localização</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Lote:</span> {registro.lote || '-'}</p>
              <p><span className="font-medium">Pasto:</span> {registro.pasto || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tratamento</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Tratamento:</span> {registro.tratamento || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sintomas</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Sintomas:</span> {sintomas.length > 0 ? sintomas.join(', ') : 'Nenhum'}</p>
              {registro.problema_casco_obs && <p><span className="font-medium">Obs Cascos:</span> {registro.problema_casco_obs}</p>}
              {registro.fraturas_obs && <p><span className="font-medium">Obs Fraturas:</span> {registro.fraturas_obs}</p>}
              {registro.desordens_digestivas_obs && <p><span className="font-medium">Obs Digestivo:</span> {registro.desordens_digestivas_obs}</p>}
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
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
