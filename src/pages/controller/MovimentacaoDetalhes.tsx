import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'

interface RegistroMovimentacao {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  lote_origem?: string
  lote_destino?: string
  numero_cabecas?: number
  peso_medio_kg?: number
  vaca?: boolean
  touro?: boolean
  boi_gordo?: boolean
  boi_magro?: boolean
  garrote?: boolean
  bezerro?: boolean
  novilha?: boolean
  tropa?: boolean
  outros?: boolean
  motivo_movimentacao?: string
  brinco_chip?: string
  causa_observacao?: string
  causa_morte?: string
  sync_status?: string
  created_at: string
  updated_at?: string
}

export function MovimentacaoDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroMovimentacao | null>(null)
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
      .from('registros_movimentacao')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroMovimentacao)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/movimentacao')}>
          Voltar
        </Button>
        <Card className="bg-white p-6 text-center">
          <p className="text-gray-600">Registro não encontrado</p>
        </Card>
      </div>
    )
  }

  const categorias = []
  if (registro.vaca) categorias.push('Vaca')
  if (registro.touro) categorias.push('Touro')
  if (registro.boi_gordo) categorias.push('Boi Gordo')
  if (registro.boi_magro) categorias.push('Boi Magro')
  if (registro.garrote) categorias.push('Garrote')
  if (registro.bezerro) categorias.push('Bezerro')
  if (registro.novilha) categorias.push('Novilha')
  if (registro.tropa) categorias.push('Tropa')
  if (registro.outros) categorias.push('Outros')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Detalhes do Registro de Movimentação</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/movimentacao')}>
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
              <p><span className="font-medium">Lote Origem:</span> {registro.lote_origem || '-'}</p>
              <p><span className="font-medium">Lote Destino:</span> {registro.lote_destino || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quantidades</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Nº Cabeças:</span> {registro.numero_cabecas || 0}</p>
              <p><span className="font-medium">Peso Médio (kg):</span> {registro.peso_medio_kg || 0}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Categorias</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Categorias:</span> {categorias.length > 0 ? categorias.join(', ') : '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Motivação</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Motivo:</span> {registro.motivo_movimentacao || '-'}</p>
              <p><span className="font-medium">Brinco/Chip:</span> {registro.brinco_chip || '-'}</p>
              <p><span className="font-medium">Observação:</span> {registro.causa_observacao || '-'}</p>
              <p><span className="font-medium">Causa Morte:</span> {registro.causa_morte || '-'}</p>
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
