import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'
import { formatDate } from '../../utils/formatDate'
import { getFazendaIdForUser } from '../../utils/fazendaContext'

interface RegistroMaternidade {
  id: string
  fazenda_id: string
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
  escore_matriz?: string
  id_brinco_mae?: string
  id_chip_mae?: string
  id_brinco_cria?: string
  id_chip_cria?: string
  id_provisorio_cria?: string
  individuo_id_cria?: string
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

    const _fazendaId = await getFazendaIdForUser(user.id)
    const vinculos = _fazendaId ? [{ fazenda_id: _fazendaId }] : []

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
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/maternidade')}>
          Voltar
        </Button>
        <Card className="bg-white p-6 text-center">
          <p className="text-gray-600">Registro não encontrado</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Maternidade</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/maternidade')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm" disableHover>
        <div className="space-y-6">
          {/* Informações Gerais */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Informações Gerais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Data:</span> {formatDate(registro.data)}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Usuário:</span> {registro.nome_usuario || '-'}</p>
            </div>
          </div>

          {/* Localização */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Localização</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Lote:</span> {registro.lote || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Pasto:</span> {registro.pasto || '-'}</p>
            </div>
          </div>

          {/* Informações dos Animais */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Informações dos Animais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informações da Mãe */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-3">Mãe</h4>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-medium text-gray-700">ID Brinco:</span> {registro.id_brinco_mae || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">ID Chip:</span> {registro.id_chip_mae || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">Categoria:</span> {registro.categoria_mae || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">Raça:</span> {registro.raca || '-'}</p>
                </div>
              </div>

              {/* Informações da Cria */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-3">Cria</h4>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-medium text-gray-700">ID Provisório:</span> {registro.id_provisorio_cria || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">ID Brinco:</span> {registro.id_brinco_cria || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">ID Chip:</span> {registro.id_chip_cria || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">Sexo:</span> {registro.sexo || '-'}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">Peso (kg):</span> {registro.peso_cria_kg || '-'}</p>
                  {registro.individuo_id_cria && (
                    <p className="text-sm pt-2 border-t border-gray-200 mt-2">
                      <span className="font-medium text-gray-700">Indivíduo:</span>{' '}
                      <button
                        onClick={() => navigate(`/controller/individuos/${registro.individuo_id_cria}`)}
                        className="text-primary hover:underline font-medium"
                      >
                        Ver indivíduo
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Informações do Parto */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Informações do Parto</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Tipo Parto:</span> {registro.tipo_parto || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Escore Matriz:</span> {registro.escore_matriz || '-'}</p>
              </div>
              <div className="mt-3">
                <p className="text-sm"><span className="font-medium text-gray-700">Tratamento:</span> {registro.tratamento || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
