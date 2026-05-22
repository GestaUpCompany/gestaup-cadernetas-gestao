import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'

interface RegistroBebedouros {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  responsavel?: string
  pasto?: string
  lote?: string
  gado?: string
  leitura_bebedouro?: number
  numero_bebedouro?: string
  observacao?: string
  agua_suficiente?: boolean
  agua_suficiente_obs?: string
  vazao_bebedouro_ideal?: boolean
  vazao_bebedouro_ideal_obs?: string
  aterro_acesso_bebedouro_ideal?: boolean
  aterro_acesso_bebedouro_ideal_obs?: string
  espacamento_bebedouro_ideal?: boolean
  espacamento_bebedouro_ideal_obs?: string
  boia_protecao_boas_condicoes?: boolean
  boia_protecao_boas_condicoes_obs?: string
  sync_status?: string
  created_at: string
  updated_at?: string
}

export function BebedourosDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroBebedouros | null>(null)
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
      .from('registros_bebedouros')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroBebedouros)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/bebedouros')}>
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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Bebedouros</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/bebedouros')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm" disableHover>
        <div className="space-y-6">
          {/* Informações Gerais */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Informações Gerais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Data:</span> {(() => {
                const [year, month, day] = registro.data.split('-')
                return `${day}/${month}/${year}`
              })()}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Responsável:</span> {registro.responsavel || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Pasto:</span> {registro.pasto || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Lote:</span> {registro.lote || '-'}</p>
            </div>
          </div>

          {/* Bebedouro */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Bebedouro</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Nº Bebedouro:</span> {registro.numero_bebedouro || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Leitura:</span> {registro.leitura_bebedouro || 0}</p>
              </div>
            </div>
          </div>

          {/* Condições do Bebedouro */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Condições do Bebedouro</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Água Suficiente:</span> {registro.agua_suficiente ? 'Sim' : 'Não'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Vazão Bebedouro Ideal:</span> {registro.vazao_bebedouro_ideal ? 'Sim' : 'Não'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Aterro Acesso Bebedouro Ideal:</span> {registro.aterro_acesso_bebedouro_ideal ? 'Sim' : 'Não'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Espaçamento Bebedouro Ideal:</span> {registro.espacamento_bebedouro_ideal ? 'Sim' : 'Não'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Boia Proteção Boas Condições:</span> {registro.boia_protecao_boas_condicoes ? 'Sim' : 'Não'}</p>
              </div>
              {registro.agua_suficiente_obs && <p className="text-sm"><span className="font-medium text-gray-700">Obs. Água:</span> {registro.agua_suficiente_obs}</p>}
              {registro.vazao_bebedouro_ideal_obs && <p className="text-sm"><span className="font-medium text-gray-700">Obs. Vazão:</span> {registro.vazao_bebedouro_ideal_obs}</p>}
              {registro.aterro_acesso_bebedouro_ideal_obs && <p className="text-sm"><span className="font-medium text-gray-700">Obs. Aterro:</span> {registro.aterro_acesso_bebedouro_ideal_obs}</p>}
              {registro.espacamento_bebedouro_ideal_obs && <p className="text-sm"><span className="font-medium text-gray-700">Obs. Espaçamento:</span> {registro.espacamento_bebedouro_ideal_obs}</p>}
              {registro.boia_protecao_boas_condicoes_obs && <p className="text-sm"><span className="font-medium text-gray-700">Obs. Boia:</span> {registro.boia_protecao_boas_condicoes_obs}</p>}
            </div>
          </div>

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
