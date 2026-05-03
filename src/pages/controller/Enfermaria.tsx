import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input } from '../../components/ui'
import { exportToCSV } from '../../utils/exportCSV'

interface RegistroEnfermaria {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  pasto?: string
  lote?: string
  brinco_chip?: string
  categoria?: string
  tratamento?: string
  tratamento_outros?: string
  problema_casco?: boolean
  problema_casco_obs?: string
  sintomas_pneumonia?: boolean
  sintomas_pneumonia_obs?: string
  picado_cobra?: boolean
  picado_cobra_obs?: string
  incoordenacao_tremores?: boolean
  incoordenacao_tremores_obs?: string
  febre_alta?: boolean
  febre_alta_obs?: string
  presenca_sangue?: boolean
  presenca_sangue_obs?: string
  fraturas?: boolean
  fraturas_obs?: string
  desordens_digestivas?: boolean
  desordens_digestivas_obs?: string
  sync_status?: string
  created_at: string
}

export function Enfermaria() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registros, setRegistros] = useState<RegistroEnfermaria[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  useEffect(() => {
    loadRegistros()
  }, [user])

  const loadRegistros = async () => {
    if (!user) return

    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    let query = supabase
      .from('registros_enfermaria')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar registros de enfermaria:', error)
    } else {
      setRegistros(data as RegistroEnfermaria[])
    }

    setLoading(false)
  }

  const filteredRegistros = registros.filter((registro) => {
    const matchesSearch =
      (registro.brinco_chip && registro.brinco_chip.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.lote && registro.lote.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.pasto && registro.pasto.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.categoria && registro.categoria.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.tratamento && registro.tratamento.toLowerCase().includes(searchTerm.toLowerCase()))

    // Converter data do input (yyyy-mm-dd) para formato do banco (yyyy-dd-mm)
    const convertDate = (dateStr: string) => {
      if (!dateStr) return ''
      const [year, month, day] = dateStr.split('-')
      return `${year}-${day}-${month}`
    }

    const matchesDataInicio = !dataInicio || registro.data >= convertDate(dataInicio)
    const matchesDataFim = !dataFim || registro.data <= convertDate(dataFim)

    return matchesSearch && matchesDataInicio && matchesDataFim
  })

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Caderneta de Enfermaria</h2>
      </div>

      <Card className="bg-white p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
          <Button
            onClick={() => exportToCSV(filteredRegistros, 'enfermaria-export')}
            disabled={filteredRegistros.length === 0}
          >
            Exportar CSV
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <Input
              type="text"
              placeholder="Brinco/Chip, lote, pasto, tratamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
            <Button variant="secondary" onClick={() => {
              setSearchTerm('')
              setDataInicio('')
              setDataFim('')
            }}>
              Limpar Filtros
            </Button>
          </div>
        </div>
      </Card>

      {registros.length === 0 ? (
        <Card className="bg-white p-6 text-center">
          <p className="text-gray-600">Nenhum registro de enfermaria encontrado</p>
        </Card>
      ) : filteredRegistros.length === 0 ? (
        <Card className="bg-white p-6 text-center">
          <p className="text-gray-600">Nenhum registro encontrado com os filtros aplicados</p>
        </Card>
      ) : (
        <Card className="bg-white overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brinco/Chip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tratamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pasto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sintomas</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRegistros.map((registro) => {
                const sintomas = []
                if (registro.problema_casco) sintomas.push('Cascos')
                if (registro.sintomas_pneumonia) sintomas.push('Pneumonia')
                if (registro.picado_cobra) sintomas.push('Cobra')
                if (registro.incoordenacao_tremores) sintomas.push('Incoordenação')
                if (registro.febre_alta) sintomas.push('Febre')
                if (registro.presenca_sangue) sintomas.push('Sangue')
                if (registro.fraturas) sintomas.push('Fraturas')
                if (registro.desordens_digestivas) sintomas.push('Digestivo')

                return (
                  <tr
                    key={registro.id}
                    onClick={() => navigate(`/controller/enfermaria/${registro.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        const [year, day, month] = registro.data.split('-')
                        return `${day}/${month}/${year}`
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.brinco_chip || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.lote || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.pasto || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.categoria || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.tratamento || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sintomas.length > 0 ? sintomas.join(', ') : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
