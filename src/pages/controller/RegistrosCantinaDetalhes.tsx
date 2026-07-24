import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'
import { formatDateTime } from '../../utils/formatDate'

interface RegistroCantina {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  data: string
  numero_cozinheiras?: number
  quem_cozinhou?: string
  quem_ajudou?: string
  numero_cafe_manha?: number
  numero_lanches?: number
  numero_refeicoes_almoco?: number
  numero_refeicoes_jantar?: number
  itens?: any[]
  observacao?: string
  nome_usuario?: string
  sync_status?: string
  version?: number
  created_at: string
  updated_at: string
  deleted_at?: string
}

export function RegistrosCantinaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroCantina | null>(null)
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
      .from('registros_alimentacao')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroCantina)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/cantina')}>
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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Cantina</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/cantina')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm" disableHover>
        <div className="space-y-6">
          {/* Informações Gerais */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Informações Gerais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Data:</span> {formatDateTime(registro.data)}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Nº Cozinheiras:</span> {registro.numero_cozinheiras || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Quem Cozinhou:</span> {registro.quem_cozinhou || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Quem Ajudou:</span> {registro.quem_ajudou || '-'}</p>
            </div>
          </div>

          {/* Quantidades */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Quantidades</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Café Manhã:</span> {registro.numero_cafe_manha || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Lanches:</span> {registro.numero_lanches || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Almoço:</span> {registro.numero_refeicoes_almoco || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Jantar:</span> {registro.numero_refeicoes_jantar || '-'}</p>
              </div>
            </div>
          </div>

          {/* Itens */}
          {registro.itens && registro.itens.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Itens</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  {registro.itens.map((item: any, index: number) => (
                    <p key={index} className="text-sm">
                      <span className="font-medium text-gray-700">{item.nome || item.item || 'Item'}:</span> {item.quantidade || item.quantidade || '-'} {item.unidade || ''}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Observação */}
          {registro.observacao && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Observação</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm">{registro.observacao}</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
