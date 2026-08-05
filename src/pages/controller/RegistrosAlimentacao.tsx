import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton } from '../../components/ui'
import { exportToXLSX } from '../../utils/exportXLSX'
import { ALIMENTACAO_EXPORT_CONFIG } from '../../utils/exportConfigs'
import { formatDateTime } from '../../utils/formatDate'
import { getFazendaIdForUser } from '../../utils/fazendaContext'

interface RegistroAlimentacao {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  data: string
  modo?: string
  numero_cozinheiras?: number
  quem_cozinhou?: string
  quem_ajudou?: string
  numero_cafe_manha?: number
  numero_lanches?: number
  numero_refeicoes_almoco?: number
  numero_refeicoes_jantar?: number
  fornecedor?: string
  quantidade_marmitas?: number
  preco_unitario?: number
  destinatario?: string
  quantidade_outros?: string
  unidade_outros?: string
  itens?: any
  observacao?: string
  nome_usuario?: string
  sync_status?: string
  version?: number
  created_at: string
  updated_at: string
  deleted_at?: string
}

export function RegistrosAlimentacao() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registros, setRegistros] = useState<RegistroAlimentacao[]>([])
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

    const _fazendaId = await getFazendaIdForUser(user.id)
    const vinculos = _fazendaId ? [{ fazenda_id: _fazendaId }] : []

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    let query = supabase
      .from('registros_alimentacao')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar registros de alimentação:', error)
    } else {
      setRegistros(data as RegistroAlimentacao[])
    }

    setLoading(false)
  }

  const filteredRegistros = registros.filter((registro) => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      (registro.quem_cozinhou && registro.quem_cozinhou.toLowerCase().includes(search)) ||
      (registro.quem_ajudou && registro.quem_ajudou.toLowerCase().includes(search)) ||
      (registro.numero_cozinheiras && registro.numero_cozinheiras.toString().includes(search)) ||
      (registro.numero_cafe_manha && registro.numero_cafe_manha.toString().includes(search)) ||
      (registro.numero_lanches && registro.numero_lanches.toString().includes(search)) ||
      (registro.numero_refeicoes_almoco && registro.numero_refeicoes_almoco.toString().includes(search)) ||
      (registro.numero_refeicoes_jantar && registro.numero_refeicoes_jantar.toString().includes(search)) ||
      (registro.fornecedor && registro.fornecedor.toLowerCase().includes(search)) ||
      (registro.destinatario && registro.destinatario.toLowerCase().includes(search)) ||
      (registro.quantidade_marmitas && registro.quantidade_marmitas.toString().includes(search)) ||
      (registro.observacao && registro.observacao.toLowerCase().includes(search))

    const matchesDataInicio = !dataInicio || registro.data >= dataInicio
    const matchesDataFim = !dataFim || registro.data <= dataFim

    return matchesSearch && matchesDataInicio && matchesDataFim
  }).sort((a, b) => {
    const dateA = new Date(a.data)
    const dateB = new Date(b.data)
    return dateSortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
  })

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Caderneta de Alimentação</h2>
      </div>

      <Card className="bg-white p-4 sm:p-6" disableHover>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">Filtros</h3>
          <Button
            onClick={() => exportToXLSX(filteredRegistros, ALIMENTACAO_EXPORT_CONFIG)}
            disabled={filteredRegistros.length === 0}
            className="w-full sm:w-auto text-sm"
          >
            Exportar XLSX
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">Buscar</label>
            <Input
              type="text"
              placeholder="Quem cozinhou, fornecedor, destinatário, refeições..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">Data Início</label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">Data Fim</label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">&nbsp;</label>
            <Button variant="secondary" onClick={() => {
              setSearchTerm('')
              setDataInicio('')
              setDataFim('')
            }} className="w-full sm:w-auto text-sm">
              Limpar Filtros
            </Button>
          </div>
        </div>
      </Card>

      {registros.length === 0 ? (
        <Card className="bg-white p-4 sm:p-6 text-center" disableHover>
          <p className="text-gray-600">Nenhum registro de alimentação encontrado</p>
        </Card>
      ) : filteredRegistros.length === 0 ? (
        <Card className="bg-white p-4 sm:p-6 text-center" disableHover>
          <p className="text-gray-600">Nenhum registro encontrado com os filtros aplicados</p>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {filteredRegistros.map((registro) => (
              <Card
                key={registro.id}
                className="p-4"
                onClick={() => navigate(`/controller/cadernetas/alimentacao/${registro.id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-500">Data:</span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-800">
                      {formatDateTime(registro.data)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {registro.modo && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        registro.modo === 'marmita'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {registro.modo === 'marmita' ? 'Marmita' : 'Cantina'}
                      </span>
                    )}
                    <span
                      className="text-xs sm:text-sm px-2 py-1 rounded-full bg-primary/10 text-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDateSortOrder(dateSortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                    >
                      {dateSortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  </div>
                </div>
                {registro.modo === 'marmita' ? (
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fornecedor:</span>
                      <span className="text-gray-800 font-medium">{registro.fornecedor || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Qtd. Marmitas:</span>
                      <span className="text-gray-800 font-medium">{registro.quantidade_marmitas || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Preço Unit.:</span>
                      <span className="text-gray-800 font-medium">
                        {registro.preco_unitario ? `R$ ${Number(registro.preco_unitario).toFixed(2).replace('.', ',')}` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Destinatário:</span>
                      <span className="text-gray-800 font-medium">{registro.destinatario || '-'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Quem Cozinhou:</span>
                      <span className="text-gray-800 font-medium">{registro.quem_cozinhou || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Quem Ajudou:</span>
                      <span className="text-gray-800 font-medium">{registro.quem_ajudou || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nº Cozinheiras:</span>
                      <span className="text-gray-800 font-medium">{registro.numero_cozinheiras || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Café Manhã:</span>
                      <span className="text-gray-800 font-medium">{registro.numero_cafe_manha || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Lanches:</span>
                      <span className="text-gray-800 font-medium">{registro.numero_lanches || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Almoço:</span>
                      <span className="text-gray-800 font-medium">{registro.numero_refeicoes_almoco || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Jantar:</span>
                      <span className="text-gray-800 font-medium">{registro.numero_refeicoes_jantar || '-'}</span>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className="bg-white overflow-x-auto hidden sm:block" disableHover>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setDateSortOrder(dateSortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    Data <span className="text-lg ml-1">{dateSortOrder === 'asc' ? '↑' : '↓'}</span>
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modo</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsável / Fornecedor</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalhes</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observação</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRegistros.map((registro) => (
                  <tr
                    key={registro.id}
                    onClick={() => navigate(`/controller/cadernetas/alimentacao/${registro.id}`)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(registro.data)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        registro.modo === 'marmita'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {registro.modo === 'marmita' ? 'Marmita' : 'Cantina'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.modo === 'marmita'
                        ? (registro.fornecedor || '-')
                        : (registro.quem_cozinhou || '-')}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900">
                      {registro.modo === 'marmita' ? (
                        <span className="whitespace-nowrap">
                          {registro.quantidade_marmitas || 0} marmitas
                          {registro.preco_unitario ? ` × R$ ${Number(registro.preco_unitario).toFixed(2).replace('.', ',')}` : ''}
                          {registro.destinatario ? ` → ${registro.destinatario}` : ''}
                        </span>
                      ) : (
                        <span className="whitespace-nowrap">
                          {[
                            registro.numero_cafe_manha != null && `Café: ${registro.numero_cafe_manha}`,
                            registro.numero_lanches != null && `Lanches: ${registro.numero_lanches}`,
                            registro.numero_refeicoes_almoco != null && `Almoço: ${registro.numero_refeicoes_almoco}`,
                            registro.numero_refeicoes_jantar != null && `Jantar: ${registro.numero_refeicoes_jantar}`,
                          ].filter(Boolean).join(' · ') || '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-500 max-w-xs truncate">
                      {registro.observacao || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
