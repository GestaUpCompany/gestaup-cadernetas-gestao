import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'

interface RegistroPastagens {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  manejador?: string
  lote?: string
  pasto_saida?: string
  avaliacao_saida?: number
  pasto_entrada?: string
  avaliacao_entrada?: number
  vaca?: number
  touro?: number
  bezerro?: number
  boi_magro?: number
  garrote?: number
  novilha?: number
  sync_status?: string
  created_at: string
  updated_at?: string
}

export function PastagensDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroPastagens | null>(null)
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
      .from('registros_pastagens')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroPastagens)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/pastagens-caderneta')}>
          Voltar
        </Button>
        <Card className="bg-white p-6 text-center">
          <p className="text-gray-600">Registro não encontrado</p>
        </Card>
      </div>
    )
  }

  const totalAnimais = (registro.vaca || 0) + (registro.touro || 0) + (registro.bezerro || 0) + (registro.boi_magro || 0) + (registro.garrote || 0) + (registro.novilha || 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Detalhes do Registro de Pastagens</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/pastagens-caderneta')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações Gerais</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Data:</span> {new Date(registro.data).toLocaleDateString('pt-BR')}</p>
              <p><span className="font-medium">Manejador:</span> {registro.manejador || '-'}</p>
              <p><span className="font-medium">Lote:</span> {registro.lote || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Movimentação</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Pasto Saída:</span> {registro.pasto_saida || '-'}</p>
              <p><span className="font-medium">Avaliação Saída:</span> {registro.avaliacao_saida || '-'}</p>
              <p><span className="font-medium">Pasto Entrada:</span> {registro.pasto_entrada || '-'}</p>
              <p><span className="font-medium">Avaliação Entrada:</span> {registro.avaliacao_entrada || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Contagem de Animais</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Vaca:</span> {registro.vaca || 0}</p>
              <p><span className="font-medium">Touro:</span> {registro.touro || 0}</p>
              <p><span className="font-medium">Bezerro:</span> {registro.bezerro || 0}</p>
              <p><span className="font-medium">Boi Magro:</span> {registro.boi_magro || 0}</p>
              <p><span className="font-medium">Garrote:</span> {registro.garrote || 0}</p>
              <p><span className="font-medium">Novilha:</span> {registro.novilha || 0}</p>
              <p className="font-bold text-gray-800 mt-2">Total: {totalAnimais}</p>
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
