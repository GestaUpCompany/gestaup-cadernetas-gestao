import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'
import { formatDate } from '../../utils/formatDate'

interface RegistroMovimentacao {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  lote_origem?: string
  destino?: string
  numero_cabecas?: number
  peso_vivo_atual_kg?: number
  motivo_movimentacao?: string
  causa_observacao?: string
  brinco?: string
  chip?: string
  tipo_saida?: string
  tipo_entrada?: string
  tipo_destino?: string
  categoria?: string
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
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/movimentacao')}>
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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Movimentação</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/movimentacao')}>
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
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Lote Origem:</span> {registro.lote_origem || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Destino:</span> {registro.destino || '-'}</p>
            </div>
          </div>

          {/* Quantidades */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Quantidades</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Nº Cabeças:</span> {registro.numero_cabecas || 0}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Peso Vivo Atual (kg):</span> {registro.peso_vivo_atual_kg || 0}</p>
              </div>
            </div>
          </div>

          {/* Categorias */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Categorias</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm"><span className="font-medium text-gray-700">Categoria:</span> {registro.categoria || '-'}</p>
            </div>
          </div>

          {/* Motivação */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Motivação</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Motivo:</span> {registro.motivo_movimentacao || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Brinco:</span> {registro.brinco || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Chip:</span> {registro.chip || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Tipo Saída:</span> {registro.tipo_saida || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Tipo Entrada:</span> {registro.tipo_entrada || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Tipo Destino:</span> {registro.tipo_destino || '-'}</p>
              </div>
              {registro.causa_observacao && <p className="text-sm"><span className="font-medium text-gray-700">Observação:</span> {registro.causa_observacao}</p>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
