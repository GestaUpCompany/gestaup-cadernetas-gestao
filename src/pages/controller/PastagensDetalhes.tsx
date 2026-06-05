import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'
import { formatDate } from '../../utils/formatDate'

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
  pasto_saida_area_util?: string
  pasto_saida_especie?: string
  pasto_entrada?: string
  avaliacao_entrada?: number
  pasto_entrada_area_util?: string
  pasto_entrada_especie?: string
  vaca?: number
  touro?: number
  bezerro?: number
  boi_magro?: number
  garrote?: number
  novilha?: number
  escore_gado?: number
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
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/pastagens')}>
          Voltar
        </Button>
        <Card className="bg-white p-6" disableHover text-center>
          <p className="text-gray-600">Registro não encontrado</p>
        </Card>
      </div>
    )
  }

  const totalAnimais = (registro.vaca || 0) + (registro.touro || 0) + (registro.bezerro || 0) + (registro.boi_magro || 0) + (registro.garrote || 0) + (registro.novilha || 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Pastagens</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/pastagens')}>
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
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Manejador:</span> {registro.manejador || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Lote:</span> {registro.lote || '-'}</p>
            </div>
          </div>

          {/* Movimentação de Pasto */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Movimentação de Pasto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pasto Saída */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-3">Pasto Saída</h4>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-medium text-gray-700">Pasto:</span> {registro.pasto_saida || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">Área Útil:</span> {registro.pasto_saida_area_util || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">Espécie:</span> {registro.pasto_saida_especie || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">Avaliação:</span> {registro.avaliacao_saida || '-'}</p>
                </div>
              </div>

              {/* Pasto Entrada */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-3">Pasto Entrada</h4>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-medium text-gray-700">Pasto:</span> {registro.pasto_entrada || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">Área Útil:</span> {registro.pasto_entrada_area_util || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">Espécie:</span> {registro.pasto_entrada_especie || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">Avaliação:</span> {registro.avaliacao_entrada || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contagem de Animais */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Contagem de Animais</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr><td className="px-4 py-2 text-sm text-gray-900">Vaca</td><td className="px-4 py-2 text-sm text-gray-900 text-right">{registro.vaca || 0}</td></tr>
                  <tr><td className="px-4 py-2 text-sm text-gray-900">Touro</td><td className="px-4 py-2 text-sm text-gray-900 text-right">{registro.touro || 0}</td></tr>
                  <tr><td className="px-4 py-2 text-sm text-gray-900">Bezerro</td><td className="px-4 py-2 text-sm text-gray-900 text-right">{registro.bezerro || 0}</td></tr>
                  <tr><td className="px-4 py-2 text-sm text-gray-900">Boi Magro</td><td className="px-4 py-2 text-sm text-gray-900 text-right">{registro.boi_magro || 0}</td></tr>
                  <tr><td className="px-4 py-2 text-sm text-gray-900">Garrote</td><td className="px-4 py-2 text-sm text-gray-900 text-right">{registro.garrote || 0}</td></tr>
                  <tr><td className="px-4 py-2 text-sm text-gray-900">Novilha</td><td className="px-4 py-2 text-sm text-gray-900 text-right">{registro.novilha || 0}</td></tr>
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-4 py-2 text-sm text-gray-900">Total</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">{totalAnimais}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <p className="text-sm"><span className="font-medium text-gray-700">Escore Gado:</span> {registro.escore_gado || '-'}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
