import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'

interface RegistroSuplementacao {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  tratador?: string
  pasto?: string
  lote?: string
  produto?: string
  gado?: string
  vaca?: boolean
  touro?: boolean
  bezerro?: boolean
  boi?: boolean
  garrote?: boolean
  novilha?: boolean
  leitura?: number
  sacos?: number
  kg_cocho?: number
  kg_deposito?: number
  creep?: number
  sync_status?: string
  created_at: string
  updated_at?: string
}

export function SuplementacaoDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroSuplementacao | null>(null)
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
      .from('registros_suplementacao')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroSuplementacao)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/suplementacao')}>
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
  if (registro.bezerro) categorias.push('Bezerro')
  if (registro.boi) categorias.push('Boi')
  if (registro.garrote) categorias.push('Garrote')
  if (registro.novilha) categorias.push('Novilha')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Detalhes do Registro de Suplementação</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/suplementacao')}>
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
              <p><span className="font-medium">Tratador:</span> {registro.tratador || '-'}</p>
              <p><span className="font-medium">Pasto:</span> {registro.pasto || '-'}</p>
              <p><span className="font-medium">Lote:</span> {registro.lote || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Produto</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Produto:</span> {registro.produto || '-'}</p>
              <p><span className="font-medium">Gado:</span> {registro.gado || '-'}</p>
              <p><span className="font-medium">Categorias:</span> {categorias.length > 0 ? categorias.join(', ') : '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quantidades</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Leitura:</span> {registro.leitura || 0}</p>
              <p><span className="font-medium">Sacos:</span> {registro.sacos || 0}</p>
              <p><span className="font-medium">kg Cocho:</span> {registro.kg_cocho || 0}</p>
              <p><span className="font-medium">kg Depósito:</span> {registro.kg_deposito || 0}</p>
              <p><span className="font-medium">Creep:</span> {registro.creep || 0}</p>
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
