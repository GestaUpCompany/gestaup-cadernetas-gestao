import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'

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
      .from('registros_cantina')
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
        <Button variant="secondary" onClick={() => navigate('/controller/cantina')}>
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
        <h2 className="text-2xl font-bold text-gray-800">Detalhes do Registro de Cantina</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/cantina')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-6" disableHover>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações Gerais</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Data:</span> {registro.data}</p>
              <p><span className="font-medium">Nº Cozinheiras:</span> {registro.numero_cozinheiras || '-'}</p>
              <p><span className="font-medium">Quem Cozinhou:</span> {registro.quem_cozinhou || '-'}</p>
              <p><span className="font-medium">Quem Ajudou:</span> {registro.quem_ajudou || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quantidades</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Cafe Manhã:</span> {registro.numero_cafe_manha || '-'}</p>
              <p><span className="font-medium">Lanches:</span> {registro.numero_lanches || '-'}</p>
              <p><span className="font-medium">Almoço:</span> {registro.numero_refeicoes_almoco || '-'}</p>
              <p><span className="font-medium">Jantar:</span> {registro.numero_refeicoes_jantar || '-'}</p>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Itens</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Itens:</span> {registro.itens && registro.itens.length > 0 ? JSON.stringify(registro.itens, null, 2) : 'Nenhum item registrado'}</p>
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
