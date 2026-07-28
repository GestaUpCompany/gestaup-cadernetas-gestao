import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'
import { formatDateTime } from '../../utils/formatDate'
import { getFazendaIdForUser } from '../../utils/fazendaContext'

interface RegistroAlmoxarifado {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  quem_entregou?: string
  quem_pegou?: string
  setor?: string
  observacao?: string
  itens?: any
  sync_status?: string
  created_at: string
  updated_at?: string
}

export function AlmoxarifadoDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroAlmoxarifado | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRegistro()
  }, [id, user])

  const loadRegistro = async () => {
    if (!id || !user) return

    const _fazendaId = await getFazendaIdForUser(user.id)
    const vinculos = _fazendaId ? [{ fazenda_id: _fazendaId }] : []

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    const { data, error } = await supabase
      .from('registros_almoxarifado')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroAlmoxarifado)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/almoxarifado')}>
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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Almoxarifado</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/almoxarifado')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm" disableHover>
        <div className="space-y-6">
          {/* Informações Gerais */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Informações Gerais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Data:</span> {(() => {
                return formatDateTime(registro.data)
              })()}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Setor:</span> {registro.setor || '-'}</p>
            </div>
          </div>

          {/* Movimentação */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Movimentação</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Quem Entregou:</span> {registro.quem_entregou || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Quem Pegou:</span> {registro.quem_pegou || '-'}</p>
              </div>
            </div>
          </div>

          {/* Itens */}
          {registro.itens && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Itens</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {Array.isArray(registro.itens) ? (
                  <div className="space-y-4">
                    {registro.itens.map((item: any, index: number) => (
                      <div key={index} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                        {typeof item === 'string' ? (
                          <p className="text-sm">{item}</p>
                        ) : typeof item === 'object' && item !== null ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            {Object.entries(item).map(([key, value]) => {
                              // Hide necessitaDevolucao if prazoDevolucao is not null
                              if (key === 'necessitaDevolucao' && item.prazoDevolucao) {
                                return null
                              }
                              return (
                                <div key={key} className="flex flex-col">
                                  <span className="font-medium text-gray-700 capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                  </span>
                                  <span className="text-gray-900">{String(value)}</span>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm">{String(item)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : typeof registro.itens === 'object' && registro.itens !== null ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {Object.entries(registro.itens).map(([key, value]) => {
                      // Hide necessitaDevolucao if prazoDevolucao is not null
                      if (key === 'necessitaDevolucao' && registro.itens.prazoDevolucao) {
                        return null
                      }
                      return (
                        <div key={key} className="flex flex-col">
                          <span className="font-medium text-gray-700 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                          </span>
                          <span className="text-gray-900">{String(value)}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm">{String(registro.itens)}</p>
                )}
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Observações</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm"><span className="font-medium text-gray-700">Observação:</span> {registro.observacao || '-'}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
