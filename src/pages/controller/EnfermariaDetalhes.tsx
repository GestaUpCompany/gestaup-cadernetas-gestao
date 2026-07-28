import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card } from '../../components/ui'
import { formatDate } from '../../utils/formatDate'
import { getFazendaIdForUser } from '../../utils/fazendaContext'

interface RegistroEnfermaria {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  brinco?: string
  chip?: string
  lote?: string
  pasto?: string
  categoria?: string
  tratamento?: string
  tratamento_outros?: string
  tratamento_obs?: string
  diagnosticos?: Record<string, any>
  medicamentos?: Record<string, any>
  sexo?: string
  raca?: string
  idade?: string
  sync_status?: string
  created_at: string
  updated_at?: string
}

export function EnfermariaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registro, setRegistro] = useState<RegistroEnfermaria | null>(null)
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
      .from('registros_enfermaria')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      console.error('Erro ao buscar registro:', error)
    } else {
      setRegistro(data as RegistroEnfermaria)
    }

    setLoading(false)
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!registro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/enfermaria')}>
          Voltar
        </Button>
        <Card className="bg-white p-6" disableHover text-center>
          <p className="text-gray-600">Registro não encontrado</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Detalhes do Registro de Enfermaria</h2>
        <Button variant="secondary" onClick={() => navigate('/controller/cadernetas/enfermaria')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm" disableHover>
        <div className="space-y-6">
          {/* Informações Gerais */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Informações Gerais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Data:</span> {formatDate(registro.data)}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Brinco:</span> {registro.brinco || '-'}</p>
              <p className="text-sm sm:text-base"><span className="font-medium text-gray-700">Chip:</span> {registro.chip || '-'}</p>
            </div>
          </div>

          {/* Identificação do Animal */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Identificação do Animal</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Categoria:</span> {registro.categoria || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Sexo:</span> {registro.sexo || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Raça:</span> {registro.raca || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Idade:</span> {registro.idade || '-'}</p>
              </div>
            </div>
          </div>

          {/* Localização */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Localização</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-sm"><span className="font-medium text-gray-700">Lote:</span> {registro.lote || '-'}</p>
                <p className="text-sm"><span className="font-medium text-gray-700">Pasto:</span> {registro.pasto || '-'}</p>
              </div>
            </div>
          </div>

          {/* Tratamento */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Tratamento</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <p className="text-sm"><span className="font-medium text-gray-700">Tratamento:</span> {registro.tratamento || '-'}</p>
              {registro.tratamento_outros && <p className="text-sm"><span className="font-medium text-gray-700">Tratamento Outros:</span> {registro.tratamento_outros}</p>}
              {registro.tratamento_obs && <p className="text-sm"><span className="font-medium text-gray-700">Observação:</span> {registro.tratamento_obs}</p>}
            </div>
          </div>

          {/* Diagnósticos */}
          {registro.diagnosticos && Object.keys(registro.diagnosticos).length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Diagnósticos</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  {Object.entries(registro.diagnosticos)
                    .filter(([_, value]: [string, any]) => value.valor === 'S')
                    .map(([key]: [string, any]) => {
                      const mapping: Record<string, string> = {
                        bicheira: 'Bicheira',
                        cegueira: 'Cegueira',
                        fraturas: 'Fraturas',
                        febreAlta: 'Febre Alta',
                        picadoCobra: 'Picado por Cobra',
                        presencaSangue: 'Presença de Sangue',
                        andarCambaleante: 'Andar Cambaleante',
                        pododermiteCascos: 'Pododermite/Cascos',
                        sintomasPneumonia: 'Sintomas de Pneumonia',
                        desordensDigestivas: 'Desordens Digestivas',
                        incoordenacaoTremores: 'Incoordenação/Tremores'
                      }
                      return mapping[key] || key
                    })
                    .join(', ') || 'Nenhum diagnóstico positivo'}
                </p>
              </div>
            </div>
          )}

          {/* Medicamentos */}
          {registro.medicamentos && Array.isArray(registro.medicamentos) && registro.medicamentos.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Medicamentos</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-3">
                  {registro.medicamentos.map((med: any, index: number) => (
                    <div key={index} className="border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                      <p className="text-sm"><span className="font-medium text-gray-700">Nome:</span> {med.nomeComercial || '-'}</p>
                      <p className="text-sm"><span className="font-medium text-gray-700">Tipo:</span> {med.tipo || '-'}</p>
                      <p className="text-sm"><span className="font-medium text-gray-700">Dose Aplicada:</span> {med.doseAplicada || '-'}</p>
                      {med.doseRecomendada && <p className="text-sm"><span className="font-medium text-gray-700">Dose Recomendada:</span> {med.doseRecomendada}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
