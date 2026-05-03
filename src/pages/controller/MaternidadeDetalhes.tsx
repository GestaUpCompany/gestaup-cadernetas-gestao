import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'

interface RegistroMaternidade {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  pasto?: string
  lote?: string
  peso_cria_kg?: number
  numero_cria?: string
  tratamento?: string
  tipo_parto?: string
  sexo?: string
  raca?: string
  numero_mae?: string
  categoria_mae?: string
  sync_status?: string
  created_at: string
  updated_at?: string
}

export function MaternidadeDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroMaternidade | null>(null)
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
      .from('registros_maternidade')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroMaternidade)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/maternidade')}>
          Voltar
        </Button>
        <Card className="bg-white p-6 text-center">
          <p className="text-gray-600">Registro não encontrado</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Detalhes do Registro de Maternidade</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/maternidade')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações da Mãe</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Nº Mãe:</span> {registro.numero_mae || '-'}</p>
              <p><span className="font-medium">Categoria Mãe:</span> {registro.categoria_mae || '-'}</p>
              <p><span className="font-medium">Raça:</span> {registro.raca || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações da Cria</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Nº Cria:</span> {registro.numero_cria || '-'}</p>
              <p><span className="font-medium">Sexo:</span> {registro.sexo || '-'}</p>
              <p><span className="font-medium">Peso (kg):</span> {registro.peso_cria_kg || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações do Parto</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Tipo Parto:</span> {registro.tipo_parto || '-'}</p>
              <p><span className="font-medium">Tratamento:</span> {registro.tratamento || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Localização</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Lote:</span> {registro.lote || '-'}</p>
              <p><span className="font-medium">Pasto:</span> {registro.pasto || '-'}</p>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Metadados</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Data:</span> {new Date(registro.data).toLocaleDateString('pt-BR')}</p>
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
