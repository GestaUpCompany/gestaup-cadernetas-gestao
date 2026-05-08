import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'

interface RegistroOperacoesMaquinas {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  data: string
  veiculo_trator: string
  implemento_utilizado: string
  hora_inicial?: string
  hora_final?: string
  odometro_inicial: string
  odometro_final: string
  total_odometro?: string
  tipo_operacao: string
  produto_aplicado?: string
  quantidade_total_aplicada?: string
  area_trabalhada?: string
  dose_aplicada?: string
  meta_diaria_batida?: string
  meta_diaria_batida_obs?: string
  algum_imprevisto?: string
  algum_imprevisto_obs?: string
  observacao?: string
  sync_status?: string
  version?: number
  created_at: string
  updated_at: string
  deleted_at?: string
  nome_usuario?: string
}

export function RegistrosOperacoesMaquinasDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroOperacoesMaquinas | null>(null)
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
      .from('registros_operacoes_maquinas')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroOperacoesMaquinas)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/operacoes-maquinas')}>
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
        <h2 className="text-2xl font-bold text-gray-800">Detalhes do Registro de Operações de Máquinas</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/operacoes-maquinas')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações Gerais</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Data:</span> {registro.data}</p>
              <p><span className="font-medium">Veículo/Trator:</span> {registro.veiculo_trator}</p>
              <p><span className="font-medium">Implemento Utilizado:</span> {registro.implemento_utilizado}</p>
              <p><span className="font-medium">Tipo Operação:</span> {registro.tipo_operacao}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Horários</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Hora Inicial:</span> {registro.hora_inicial || '-'}</p>
              <p><span className="font-medium">Hora Final:</span> {registro.hora_final || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Odômetro</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Odômetro Inicial:</span> {registro.odometro_inicial}</p>
              <p><span className="font-medium">Odômetro Final:</span> {registro.odometro_final}</p>
              <p><span className="font-medium">Total Odômetro:</span> {registro.total_odometro || '-'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Aplicação</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Produto Aplicado:</span> {registro.produto_aplicado || '-'}</p>
              <p><span className="font-medium">Quantidade Total Aplicada:</span> {registro.quantidade_total_aplicada || '-'}</p>
              <p><span className="font-medium">Área Trabalhada:</span> {registro.area_trabalhada || '-'}</p>
              <p><span className="font-medium">Dose Aplicada:</span> {registro.dose_aplicada || '-'}</p>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Meta Diária</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Meta Diária Batida:</span> {registro.meta_diaria_batida || '-'}</p>
              <p><span className="font-medium">Meta Diária Batida Obs:</span> {registro.meta_diaria_batida_obs || '-'}</p>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Imprevistos</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Algun Imprevisto:</span> {registro.algum_imprevisto || '-'}</p>
              <p><span className="font-medium">Algun Imprevisto Obs:</span> {registro.algum_imprevisto_obs || '-'}</p>
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
