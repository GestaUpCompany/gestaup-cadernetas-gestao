import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input } from '../../components/ui'
import { exportToCSV } from '../../utils/exportCSV'

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
}

export function Suplementacao() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registros, setRegistros] = useState<RegistroSuplementacao[]>([])
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
      .from('registros_suplementacao')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar registros de suplementação:', error)
    } else {
      setRegistros(data as RegistroSuplementacao[])
    }

    setLoading(false)
  }

  const filteredRegistros = registros.filter((registro) => {
    const matchesSearch =
      (registro.tratador && registro.tratador.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.lote && registro.lote.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.pasto && registro.pasto.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.produto && registro.produto.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesDataInicio = !dataInicio || registro.data >= dataInicio
    const matchesDataFim = !dataFim || registro.data <= dataFim

    return matchesSearch && matchesDataInicio && matchesDataFim
  })

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Caderneta de Suplementação</h2>
      </div>

      <Card className="bg-white p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
          <Button
            onClick={() => exportToCSV(filteredRegistros, 'suplementacao-export')}
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
              placeholder="Tratador, lote, pasto, produto..."
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
          <div className="flex items-end">
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
          <p className="text-gray-600">Nenhum registro de suplementação encontrado</p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tratador</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pasto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sacos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KG Cocho</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KG Depósito</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRegistros.map((registro) => {
                const categorias = []
                if (registro.vaca) categorias.push('Vaca')
                if (registro.touro) categorias.push('Touro')
                if (registro.bezerro) categorias.push('Bezerro')
                if (registro.boi) categorias.push('Boi')
                if (registro.garrote) categorias.push('Garrote')
                if (registro.novilha) categorias.push('Novilha')

                return (
                  <tr
                    key={registro.id}
                    onClick={() => navigate(`/controller/suplementacao/${registro.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        const [year, day, month] = registro.data.split('-')
                        return `${day}/${month}/${year}`
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.tratador || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.produto || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.lote || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.pasto || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.sacos || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.kg_cocho || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.kg_deposito || 0}
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
