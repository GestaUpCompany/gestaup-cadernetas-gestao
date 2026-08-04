import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, Select } from '../../components/ui'
import { exportToXLSX } from '../../utils/exportXLSX'
import { SUPLEMENTACAO_EXPORT_CONFIG } from '../../utils/exportConfigs'
import { formatDate } from '../../utils/formatDate'
import { getFazendaIdForUser } from '../../utils/fazendaContext'
import { gerarRelatorioConsumoPDF, DadoRelatorioConsumo, InfoLote } from '../../utils/relatorioConsumoPDF'

interface RegistroSuplementacao {
  id: string
  fazenda_id: string
  dispositivo_id?: string
  nome_usuario?: string
  data: string
  tratador?: string
  pasto?: string
  lote?: string
  lote_id?: string
  formulacao?: string
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
  n_cabecas?: number
  qtd_bezerros?: number
  peso_vivo_kg?: number
  consumo_medio_geral_kg_mn?: number
  consumo_medio_geral_kg_ms?: number
  consumo_medio_geral_percent_pv?: number
  custo_medio_reais_cab_dia?: number
  sync_status?: string
  created_at: string
}

export function Suplementacao() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [registros, setRegistros] = useState<RegistroSuplementacao[]>([])
  const [lotes, setLotes] = useState<{ id: string; nome: string }[]>([])
  const [loteSelecionado, setLoteSelecionado] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('desc')
  const [erroExportacao, setErroExportacao] = useState<string | null>(null)

  useEffect(() => {
    loadRegistros()
    loadLotes()
  }, [user])

  useEffect(() => {
    setErroExportacao(null)
  }, [loteSelecionado, dataInicio, dataFim])

  const loadLotes = async () => {
    if (!user) return
    const _fazendaId = await getFazendaIdForUser(user.id)
    if (!_fazendaId) return

    const { data, error } = await supabase
      .from('lotes')
      .select('id, nome')
      .eq('fazenda_id', _fazendaId)
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao carregar lotes:', error)
    } else {
      setLotes(data || [])
    }
  }

  const loadRegistros = async () => {
    if (!user) return

    const _fazendaId = await getFazendaIdForUser(user.id)
    const vinculos = _fazendaId ? [{ fazenda_id: _fazendaId }] : []

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
    const matchesLote = !loteSelecionado || registro.lote_id === loteSelecionado

    const matchesSearch =
      !searchTerm ||
      (registro.tratador && registro.tratador.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.lote && registro.lote.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.pasto && registro.pasto.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.formulacao && registro.formulacao.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registro.sacos && registro.sacos.toString().includes(searchTerm.toLowerCase())) ||
      (registro.kg_cocho && registro.kg_cocho.toString().includes(searchTerm.toLowerCase())) ||
      (registro.kg_deposito && registro.kg_deposito.toString().includes(searchTerm.toLowerCase()))

    const matchesDataInicio = !dataInicio || new Date(registro.data) >= new Date(dataInicio)
    const matchesDataFim = !dataFim || new Date(registro.data) <= new Date(dataFim + 'T23:59:59')

    return matchesLote && matchesSearch && matchesDataInicio && matchesDataFim
  }).sort((a, b) => {
    const dateA = new Date(a.data)
    const dateB = new Date(b.data)
    return dateSortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
  })

  const handleExportarRelatorio = async () => {
    setErroExportacao(null)
    if (!loteSelecionado || !dataInicio || !dataFim) {
      setErroExportacao('Selecione os filtros antes')
      return
    }

    const dataInicioDate = new Date(dataInicio)
    const dataFimDate = new Date(dataFim + 'T23:59:59')

    const dadosRegistro = filteredRegistros
      .filter((r) => {
        const d = new Date(r.data)
        return d >= dataInicioDate && d <= dataFimDate && r.lote_id === loteSelecionado
      })
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

    if (dadosRegistro.length === 0) {
      alert('Nenhum registro de suplementação encontrado para o lote e período selecionados.')
      return
    }

    setGerandoPDF(true)

    try {
      const lote = lotes.find((l) => l.id === loteSelecionado)
      const fazendaId = dadosRegistro[0].fazenda_id

      const { data: fazendaData } = await supabase
        .from('fazendas')
        .select('nome, logo_url')
        .eq('id', fazendaId)
        .maybeSingle()

      const info: InfoLote = {
        lote_id: loteSelecionado,
        lote_nome: lote?.nome || '—',
        fazenda_id: fazendaId,
        fazenda_nome: fazendaData?.nome,
        fazenda_logo_url: fazendaData?.logo_url,
        peso_entrada_kg: null,
        peso_atual_kg: null,
        dias: null,
        data_prevista_final: null,
        n_cabecas_atual: null,
        raca: null,
        categoria: null,
        dieta: null,
        data_inicio_plano: null,
      }

      // Carregar lote_categoria ativa para o lote
      const { data: loteCatData, error: loteCatError } = await supabase
        .from('lote_categorias')
        .select('id, peso_entrada_kg_cab, peso_vivo_atual_kg_cab, data_meta_projetada, quant_atual, raca, categoria, formulacao_id, data_pesagem')
        .eq('lote_id', loteSelecionado)
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (loteCatError) {
        console.error('Erro ao carregar lote_categoria:', loteCatError)
      } else if (loteCatData && loteCatData.length > 0) {
        const lc = loteCatData[0]
        info.peso_entrada_kg = lc.peso_entrada_kg_cab
        info.peso_atual_kg = lc.peso_vivo_atual_kg_cab
        info.data_prevista_final = lc.data_meta_projetada
        info.n_cabecas_atual = lc.quant_atual
        info.raca = lc.raca
        info.categoria = lc.categoria

        if (lc.formulacao_id) {
          const { data: formulacaoData } = await supabase
            .from('formulacoes')
            .select('nome')
            .eq('id', lc.formulacao_id)
            .maybeSingle()
          if (formulacaoData) {
            info.dieta = formulacaoData.nome
          }
        }
      }

      // Carregar plano ativo para calcular dias desde o início
      const { data: planoData, error: planoError } = await supabase
        .from('planos_nutricionais')
        .select('data_inicio')
        .eq('fazenda_id', fazendaId)
        .eq('lote_categoria_id', loteCatData?.[0]?.id)
        .eq('ativo', true)
        .maybeSingle()

      if (planoError) {
        console.error('Erro ao carregar plano:', planoError)
      } else if (planoData && planoData.data_inicio) {
        info.data_inicio_plano = planoData.data_inicio
        const inicio = new Date(planoData.data_inicio)
        const hoje = new Date()
        const inicioData = Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate())
        const hojeData = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
        info.dias = Math.max(0, Math.round((hojeData - inicioData) / (1000 * 60 * 60 * 24)))
      }

      const dados: DadoRelatorioConsumo[] = dadosRegistro.map((r) => {
        const d = new Date(r.data)
        const dia = d.getUTCDate().toString().padStart(2, '0')
        const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
        return {
          data: r.data,
          data_label: `${dia}/${mes}`,
          kg_cocho: r.kg_cocho || 0,
          consumo_percent_pv: r.consumo_medio_geral_percent_pv || 0,
          leitura_cocho: r.leitura != null ? Number(r.leitura) : null,
          custo_reais_cab_dia: r.custo_medio_reais_cab_dia ?? null,
        }
      })

      const blob = await gerarRelatorioConsumoPDF({
        dataInicio,
        dataFim,
        info,
        dados,
      })

      const formatarData = (dataStr: string) => {
        const d = new Date(dataStr)
        const dia = d.getUTCDate().toString().padStart(2, '0')
        const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
        const ano = d.getUTCFullYear()
        return `${dia}/${mes}/${ano}`
      }

      const nomeFazenda = info.fazenda_nome || 'Fazenda'
      const dataInicioFmt = formatarData(dataInicio)
      const dataFimFmt = formatarData(dataFim)
      const fileName = `Gesta'Up - Relatório de Consumo ${nomeFazenda} | ${dataInicioFmt} a ${dataFimFmt}.pdf`

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Abre também em nova aba para preview
      window.open(url, '_blank')
    } catch (err: any) {
      console.error('Erro ao gerar relatório:', err)
      alert('Erro ao gerar relatório: ' + (err.message || 'Tente novamente.'))
    } finally {
      setGerandoPDF(false)
    }
  }

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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Caderneta de Suplementação</h2>
      </div>

      <Card className="bg-white p-4 sm:p-6" disableHover>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">Filtros</h3>
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 w-full sm:w-auto">
            <Button
              onClick={() => {
              // Pre-computar data_anterior e intervalo_dias para cada registro
              // baseado na serie lote_id + formulacao ordenada por data
              const sorted = [...filteredRegistros].sort((a, b) =>
                new Date(a.data).getTime() - new Date(b.data).getTime()
              )
              const seriesMap = new Map<string, typeof sorted>()
              for (const reg of sorted) {
                const key = `${reg.lote_id || ''}|${reg.formulacao || ''}`
                if (!seriesMap.has(key)) seriesMap.set(key, [])
                seriesMap.get(key)!.push(reg)
              }
              const enriched = sorted.map((reg) => {
                const key = `${reg.lote_id || ''}|${reg.formulacao || ''}`
                const series = seriesMap.get(key)!
                const idx = series.indexOf(reg)
                const prev = idx > 0 ? series[idx - 1] : null
                const dataAtual = new Date(reg.data)
                const dataAnterior = prev ? new Date(prev.data) : null
                const intervalo = dataAnterior
                  ? Math.max(Math.round((dataAtual.getTime() - dataAnterior.getTime()) / (1000 * 60 * 60 * 24)), 0)
                  : null
                return {
                  ...reg,
                  data_anterior: dataAnterior ? dataAnterior.toISOString() : null,
                  intervalo_dias: intervalo
                }
              })
              exportToXLSX(enriched, SUPLEMENTACAO_EXPORT_CONFIG)
            }}
            disabled={filteredRegistros.length === 0}
            className="w-full sm:w-auto text-sm"
          >
            Exportar XLSX
          </Button>
          <div className="flex flex-col items-start">
            <Button
              onClick={handleExportarRelatorio}
              disabled={gerandoPDF}
              className="w-full sm:w-auto text-sm"
            >
              {gerandoPDF ? 'Gerando...' : 'Exportar Relatório de Consumo'}
            </Button>
            {erroExportacao && (
              <p className="text-sm text-red-600 mt-2">{erroExportacao}</p>
            )}
          </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">Lote</label>
            <Select
              value={loteSelecionado}
              onChange={setLoteSelecionado}
              options={[
                { value: '', label: 'Selecione o lote' },
                ...lotes.map((l) => ({ value: l.id, label: l.nome })),
              ]}
              placeholder="Selecione o lote"
              className={`text-sm ${erroExportacao && !loteSelecionado ? 'border-red-500' : ''}`}
            />
          </div>
          <div className="sm:col-span-2 md:col-span-3">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">Buscar</label>
            <Input
              type="text"
              placeholder="Tratador, produto, lote, pasto, sacos, kg cocho, kg depósito..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">Data Início</label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className={`text-sm ${erroExportacao && !dataInicio ? 'border-red-500 focus:border-red-500' : ''}`}
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">Data Fim</label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className={`text-sm ${erroExportacao && !dataFim ? 'border-red-500 focus:border-red-500' : ''}`}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">&nbsp;</label>
            <Button variant="secondary" onClick={() => {
              setSearchTerm('')
              setDataInicio('')
              setDataFim('')
              setLoteSelecionado('')
            }} className="w-full sm:w-auto text-sm">
              Limpar Filtros
            </Button>
          </div>
        </div>
      </Card>

      {registros.length === 0 ? (
        <Card className="bg-white p-4 sm:p-6 text-center" disableHover>
          <p className="text-gray-600">Nenhum registro de suplementação encontrado</p>
        </Card>
      ) : filteredRegistros.length === 0 ? (
        <Card className="bg-white p-4 sm:p-6 text-center" disableHover>
          <p className="text-gray-600">Nenhum registro encontrado com os filtros aplicados</p>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {filteredRegistros
              .filter((registro) => registro.id)
              .map((registro) => (
              <Card
                key={registro.id}
                className="p-4"
                onClick={() => navigate(`/controller/cadernetas/suplementacao/${registro.id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-500">Data:</span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-800">
                      {formatDate(registro.data)}
                    </span>
                  </div>
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
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tratador:</span>
                    <span className="text-gray-800 font-medium">{registro.tratador || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Formulação:</span>
                    <span className="text-gray-800 font-medium">{registro.formulacao || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lote:</span>
                    <span className="text-gray-800 font-medium">{registro.lote || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pasto:</span>
                    <span className="text-gray-800 font-medium">{registro.pasto || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sacos:</span>
                    <span className="text-gray-800 font-medium">{registro.sacos || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">KG Cocho:</span>
                    <span className="text-gray-800 font-medium">{registro.kg_cocho || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">KG Depósito:</span>
                    <span className="text-gray-800 font-medium">{registro.kg_deposito || 0}</span>
                  </div>
                </div>
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
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tratador</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Formulação</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pasto</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sacos</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KG Cocho</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KG Depósito</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRegistros
                  .filter((registro) => registro.id)
                  .map((registro) => {
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
                      onClick={() => navigate(`/controller/cadernetas/suplementacao/${registro.id}`)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(registro.data)}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                        {registro.tratador || '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                        {registro.formulacao || '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                        {registro.lote || '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                        {registro.pasto || '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                        {registro.sacos || 0}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                        {registro.kg_cocho || 0}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                        {registro.kg_deposito || 0}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
