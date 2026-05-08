import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'

interface RegistroLimpeza {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  data: string
  numero_equipe?: number
  setor?: string
  local?: string
  hora_inicio?: string
  hora_final?: string
  limpeza_realizada?: any[]
  observacao?: string
  nome_usuario?: string
  sync_status?: string
  version?: number
  created_at: string
  updated_at: string
  deleted_at?: string
}

export function RegistrosLimpezaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroLimpeza | null>(null)
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
      .from('registros_limpeza')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroLimpeza)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/limpeza')}>
          Voltar
        </Button>
        <Card className="bg-white p-6 text-center" disableHover>
          <p className="text-gray-600">Registro não encontrado</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Detalhes do Registro de Limpeza</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/limpeza')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-6" disableHover>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações Gerais</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Data:</span> {registro.data}</p>
              <p><span className="font-medium">Nº Equipe:</span> {registro.numero_equipe || '-'}</p>
              <p><span className="font-medium">Setor:</span> {registro.setor || '-'}</p>
              <p><span className="font-medium">Local:</span> {registro.local || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Horários</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Hora Início:</span> {registro.hora_inicio || '-'}</p>
              <p><span className="font-medium">Hora Final:</span> {registro.hora_final || '-'}</p>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Limpeza Realizada</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Itens:</span> {registro.limpeza_realizada && registro.limpeza_realizada.length > 0 ? JSON.stringify(registro.limpeza_realizada, null, 2) : 'Nenhum item registrado'}</p>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Observações</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Observação:</span> {registro.observacao || '-'}</p>
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
