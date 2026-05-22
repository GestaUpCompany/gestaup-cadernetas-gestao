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
  categorias?: string
  leitura?: number
  sacos?: number
  kg_cocho?: number
  kg_deposito?: number
  escore_fezes?: number
  limpeza_cocho?: boolean
  limpeza_cocho_obs?: string
  cochos_condicoes?: boolean
  cochos_condicoes_obs?: string
  aterro_acesso_ideal?: boolean
  aterro_acesso_ideal_obs?: string
  espacamento_cocho_ideal?: boolean
  espacamento_cocho_ideal_obs?: string
  deposito_condicoes?: boolean
  deposito_condicoes_obs?: string
  estoque_deposito?: boolean
  estoque_deposito_obs?: string
  espacamento_cocho_cm_cab?: number
  espacamento_cocho_obs?: string
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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Suplementação</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/suplementacao')}>
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
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Tratador:</span> {registro.tratador || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Pasto:</span> {registro.pasto || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Lote:</span> {registro.lote || '-'}</p>
            </div>
          </div>

          {/* Produto */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Produto</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Produto:</span> {registro.produto || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Categorias:</span> {registro.categorias || '-'}</p>
              </div>
            </div>
          </div>

          {/* Quantidades */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Quantidades</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr><td className="px-4 py-2 text-sm text-gray-900">Sacos</td><td className="px-4 py-2 text-sm text-gray-900 text-right">{registro.sacos || 0}</td></tr>
                  <tr><td className="px-4 py-2 text-sm text-gray-900">KG Cocho</td><td className="px-4 py-2 text-sm text-gray-900 text-right">{registro.kg_cocho || 0}</td></tr>
                  <tr><td className="px-4 py-2 text-sm text-gray-900">KG Depósito</td><td className="px-4 py-2 text-sm text-gray-900 text-right">{registro.kg_deposito || 0}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Indicadores */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Indicadores</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Leitura:</span> {registro.leitura || 0}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Escore Fezes:</span> {registro.escore_fezes || '-'}</p>
                {registro.espacamento_cocho_cm_cab !== undefined && (
                  <p className="text-sm"><span className="font-medium text-gray-700">Espaçamento Cocho (cm/cab):</span> {registro.espacamento_cocho_cm_cab}</p>
                )}
              </div>
            </div>
          </div>

          {/* Condições do Cocho */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Condições do Cocho</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Limpeza Cocho:</span> {registro.limpeza_cocho ? 'Sim' : 'Não'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Cochos Condições:</span> {registro.cochos_condicoes ? 'Sim' : 'Não'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Aterro Acesso Ideal:</span> {registro.aterro_acesso_ideal ? 'Sim' : 'Não'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Espaçamento Cocho Ideal:</span> {registro.espacamento_cocho_ideal ? 'Sim' : 'Não'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Depósito Condições:</span> {registro.deposito_condicoes ? 'Sim' : 'Não'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Estoque Depósito:</span> {registro.estoque_deposito ? 'Sim' : 'Não'}</p>
              </div>
              {registro.limpeza_cocho_obs && <p className="text-sm"><span className="font-medium text-gray-700">Obs. Limpeza:</span> {registro.limpeza_cocho_obs}</p>}
              {registro.cochos_condicoes_obs && <p className="text-sm"><span className="font-medium text-gray-700">Obs. Cochos:</span> {registro.cochos_condicoes_obs}</p>}
              {registro.aterro_acesso_ideal_obs && <p className="text-sm"><span className="font-medium text-gray-700">Obs. Aterro:</span> {registro.aterro_acesso_ideal_obs}</p>}
              {registro.espacamento_cocho_ideal_obs && <p className="text-sm"><span className="font-medium text-gray-700">Obs. Espaçamento:</span> {registro.espacamento_cocho_ideal_obs}</p>}
              {registro.deposito_condicoes_obs && <p className="text-sm"><span className="font-medium text-gray-700">Obs. Depósito:</span> {registro.deposito_condicoes_obs}</p>}
              {registro.estoque_deposito_obs && <p className="text-sm"><span className="font-medium text-gray-700">Obs. Estoque:</span> {registro.estoque_deposito_obs}</p>}
              {registro.espacamento_cocho_obs && <p className="text-sm"><span className="font-medium text-gray-700">Obs. Espaçamento Cocho:</span> {registro.espacamento_cocho_obs}</p>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
