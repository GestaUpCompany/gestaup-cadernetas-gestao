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
  total_cabecas?: number
  escore_fezes?: number
  escore_gado?: number
  equipe?: number
  diagnosticos?: any
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
        <Card className="bg-white p-6 text-center" disableHover>
          <p className="text-gray-600">Registro não encontrado</p>
        </Card>
      </div>
    )
  }

  const formatProblemKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  const problemas = registro.diagnosticos ? Object.keys(registro.diagnosticos).filter(key => registro.diagnosticos[key]).map(formatProblemKey) : []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Detalhes do Registro de Rodeio</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/rodeio')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm" disableHover>
        <div className="space-y-6">
          {/* Informações Gerais */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Informações Gerais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Data:</span> {(() => {
                const [year, month, day] = registro.data.split('-')
                return `${day}/${month}/${year}`
              })()}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Pasto:</span> {registro.pasto || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Lote:</span> {registro.lote || '-'}</p>
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
                  <tr><td className="px-4 py-2 text-sm text-gray-900">Boi</td><td className="px-4 py-2 text-sm text-gray-900 text-right">{registro.boi || 0}</td></tr>
                  <tr><td className="px-4 py-2 text-sm text-gray-900">Garrote</td><td className="px-4 py-2 text-sm text-gray-900 text-right">{registro.garrote || 0}</td></tr>
                  <tr><td className="px-4 py-2 text-sm text-gray-900">Novilha</td><td className="px-4 py-2 text-sm text-gray-900 text-right">{registro.novilha || 0}</td></tr>
                  {registro.total_cabecas !== undefined && (
                    <tr className="bg-gray-50 font-bold">
                      <td className="px-4 py-2 text-sm text-gray-900">Total Cabeças</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">{registro.total_cabecas}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Indicadores */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Indicadores</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Escore Fezes:</span> {registro.escore_fezes || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Escore Gado:</span> {registro.escore_gado || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Equipe:</span> {registro.equipe || 0}</p>
              </div>
            </div>
          </div>

          {/* Problemas Identificados */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Problemas Identificados</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm"><span className="font-medium text-gray-700">Problemas:</span> {problemas.length > 0 ? problemas.join(', ') : 'Nenhum'}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
