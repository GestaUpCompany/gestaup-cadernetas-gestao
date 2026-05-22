import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input } from '../../components/ui'
import { exportToCSV } from '../../utils/exportCSV'

interface RegistroAbastecimento {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  data: string
  quem_abasteceu: string
  operador_motorista: string
  veiculo_trator: string
  placa: string
  hidrometro_inicial: number
  hidrometro_final: number
  total_abastecido: number
  combustivel: string
  odometro: string
  tipo_operacao: string
  observacao?: string
  sync_status?: string
  version?: number
  created_at: string
  updated_at: string
  deleted_at?: string
  nome_usuario?: string
}

export function RegistrosAbastecimento() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registros, setRegistros] = useState<RegistroAbastecimento[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('desc')

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
      .from('registros_abastecimento')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar registros de abastecimento:', error)
    } else {
      setRegistros(data as RegistroAbastecimento[])
    }

    setLoading(false)
  }

  const filteredRegistros = registros.filter((registro) => {
    const matchesSearch =
      (registro.quem_abasteceu && registro.quem_abasteceu.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.operador_motorista && registro.operador_motorista.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.veiculo_trator && registro.veiculo_trator.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.placa && registro.placa.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.total_abastecido && registro.total_abastecido.toString().includes(searchTerm.toLowerCase())) ||
      (registro.combustivel && registro.combustivel.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.observacao && registro.observacao.toLowerCase().includes(searchTerm.toLowerCase()))

    // Converter data do input (yyyy-mm-dd) para formato do banco (yyyy-dd-mm)
    const convertDate = (dateStr: string) => {
      if (!dateStr) return ''
      const [year, month, day] = dateStr.split('-')
      return `${year}-${day}-${month}`
    }

    const matchesDataInicio = !dataInicio || registro.data >= convertDate(dataInicio)
    const matchesDataFim = !dataFim || registro.data <= convertDate(dataFim)

    return matchesSearch && matchesDataInicio && matchesDataFim
  }).sort((a, b) => {
    const dateA = new Date(a.data)
    const dateB = new Date(b.data)
    return dateSortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
  })

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Caderneta de Abastecimento</h2>
      </div>

      <Card className="bg-white p-6" disableHover>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
          <Button
            onClick={() => exportToCSV(filteredRegistros, 'abastecimento-export')}
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
              placeholder="Quem abasteceu, operador, veículo, placa, total, combustível..."
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
        <Card className="bg-white p-6 text-center" disableHover>
          <p className="text-gray-600">Nenhum registro de abastecimento encontrado</p>
        </Card>
      ) : filteredRegistros.length === 0 ? (
        <Card className="bg-white p-6 text-center" disableHover>
          <p className="text-gray-600">Nenhum registro encontrado com os filtros aplicados</p>
        </Card>
      ) : (
        <Card className="bg-white overflow-x-auto" disableHover>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setDateSortOrder(dateSortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  Data <span className="text-lg ml-1">{dateSortOrder === 'asc' ? '↑' : '↓'}</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quem Abasteceu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operador/Motorista</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veículo/Trator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Abastecido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Combustível</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRegistros.map((registro) => (
                <tr
                  key={registro.id}
                  onClick={() => navigate(`/controller/abastecimento/${registro.id}`)}
                  className=" cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(() => {
                      const [year, month, day] = registro.data.split('-')
                      return `${day}/${month}/${year}`
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {registro.quem_abasteceu || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {registro.operador_motorista || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {registro.veiculo_trator || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {registro.placa || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {registro.total_abastecido ? `${registro.total_abastecido} L` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {registro.combustivel || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
