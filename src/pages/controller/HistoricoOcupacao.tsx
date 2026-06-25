import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Card, CardSkeleton } from '../../components/ui'

interface HistoricoItem {
  historico_id: string
  lote_id: string
  lote_nome: string
  pasto_id?: string
  pasto_nome?: string
  modulo_id?: string
  modulo_nome?: string
  data_hora_entrada: string
  data_hora_saida?: string | null
  cabecas_entrada?: number | null
  peso_vivo_medio_entrada_kg?: number | null
  cabecas_saida?: number | null
  peso_vivo_medio_saida_kg?: number | null
  meta_intervalo_ocupacao_dias?: number | null
  desvio_tempo_ocupacao_percent?: number | null
  taxa_lotacao_ua_ha?: number | null
  periodo_ocupacao_dias?: number | null
  periodo_ocupacao_horas?: number | null
}

type VisualizacaoTipo = 'pasto' | 'modulo'

export function HistoricoOcupacao() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [tipo, setTipo] = useState<VisualizacaoTipo>('pasto')
  const [searchTerm, setSearchTerm] = useState('')

  // Filtros temporais
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [periodoRapido, setPeriodoRapido] = useState('')

  // Filtros por entidade
  const [loteSelecionado, setLoteSelecionado] = useState('')
  const [pastoSelecionado, setPastoSelecionado] = useState('')
  const [moduloSelecionado, setModuloSelecionado] = useState('')
  const [lotesDisponiveis, setLotesDisponiveis] = useState<{id: string, nome: string}[]>([])
  const [pastosDisponiveis, setPastosDisponiveis] = useState<{id: string, nome: string}[]>([])
  const [modulosDisponiveis, setModulosDisponiveis] = useState<{id: string, nome: string}[]>([])

  // Filtros por métricas
  const [taxaLotacaoMin, setTaxaLotacaoMin] = useState('')
  const [taxaLotacaoMax, setTaxaLotacaoMax] = useState('')
  const [cabecasMin, setCabecasMin] = useState('')
  const [cabecasMax, setCabecasMax] = useState('')
  const [diasMin, setDiasMin] = useState('')
  const [diasMax, setDiasMax] = useState('')

  // Filtros por meta
  const [apenasExcedeuMeta, setApenasExcedeuMeta] = useState(false)
  const [desvioMin, setDesvioMin] = useState('')
  const [apenasComMeta, setApenasComMeta] = useState(false)

  // Filtro de status
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'ativos' | 'encerrados'>('todos')

  useEffect(() => {
    loadHistorico()
  }, [user, tipo])

  const loadHistorico = async () => {
    if (!user) return
    setLoading(true)

    // Buscar fazenda vinculada ao usuário
    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) {
      setHistorico([])
      setLoading(false)
      return
    }

    const fazendaId = vinculos[0].fazenda_id
    const viewName = tipo === 'pasto' ? 'v_historico_ocupacao_pasto' : 'v_historico_ocupacao_modulo'

    // Buscar lotes, pastos e módulos da fazenda para os filtros
    const [lotesData, pastosData, modulosData] = await Promise.all([
      supabase.from('lotes').select('id, nome').eq('fazenda_id', fazendaId).order('nome'),
      supabase.from('pastos').select('id, nome').eq('fazenda_id', fazendaId).order('nome'),
      supabase.from('modulos_pastos').select('id, nome').eq('fazenda_id', fazendaId).order('nome'),
    ])

    setLotesDisponiveis(lotesData.data || [])
    setPastosDisponiveis(pastosData.data || [])
    setModulosDisponiveis(modulosData.data || [])

    // Buscar apenas lotes da fazenda do usuário
    const { data: lotesIdsData } = await supabase
      .from('lotes')
      .select('id')
      .eq('fazenda_id', fazendaId)

    if (!lotesIdsData || lotesIdsData.length === 0) {
      setHistorico([])
      setLoading(false)
      return
    }

    const loteIds = lotesIdsData.map(l => l.id)

    const { data, error } = await supabase
      .from(viewName as any)
      .select('*')
      .in('lote_id', loteIds)
      .order('data_hora_entrada', { ascending: false })

    if (error) {
      console.error('Erro ao carregar histórico:', error)
    } else {
      setHistorico((data || []) as unknown as HistoricoItem[])
    }

    setLoading(false)
  }

  const filtrado = historico.filter((item) => {
    const termoBusca = searchTerm.toLowerCase()
    const matchSearch =
      !searchTerm ||
      item.lote_nome.toLowerCase().includes(termoBusca) ||
      (item.pasto_nome?.toLowerCase().includes(termoBusca) ?? false) ||
      (item.modulo_nome?.toLowerCase().includes(termoBusca) ?? false)

    // Filtro de status (substitui apenasAtivos)
    const matchStatus =
      statusFiltro === 'todos' ||
      (statusFiltro === 'ativos' && item.data_hora_saida == null) ||
      (statusFiltro === 'encerrados' && item.data_hora_saida != null)

    // Filtros temporais
    const dataEntrada = new Date(item.data_hora_entrada)
    const matchDataInicio = !dataInicio || dataEntrada >= new Date(dataInicio)
    const matchDataFim = !dataFim || dataEntrada <= new Date(dataFim)

    // Período rápido
    let matchPeriodoRapido = true
    if (periodoRapido) {
      const agora = new Date()
      const diasAtras = { '7': 7, '30': 30, '90': 90, '365': 365 }[periodoRapido] || 0
      if (diasAtras > 0) {
        const limite = new Date(agora.getTime() - diasAtras * 24 * 60 * 60 * 1000)
        matchPeriodoRapido = dataEntrada >= limite
      }
    }

    // Filtros por entidade
    const matchLote = !loteSelecionado || item.lote_id === loteSelecionado
    const matchPasto = !pastoSelecionado || item.pasto_id === pastoSelecionado
    const matchModulo = !moduloSelecionado || item.modulo_id === moduloSelecionado

    // Filtros por métricas
    const matchTaxaMin = !taxaLotacaoMin || (item.taxa_lotacao_ua_ha != null && item.taxa_lotacao_ua_ha >= parseFloat(taxaLotacaoMin))
    const matchTaxaMax = !taxaLotacaoMax || (item.taxa_lotacao_ua_ha != null && item.taxa_lotacao_ua_ha <= parseFloat(taxaLotacaoMax))
    const matchCabecasMin = !cabecasMin || (item.cabecas_entrada != null && item.cabecas_entrada >= parseInt(cabecasMin))
    const matchCabecasMax = !cabecasMax || (item.cabecas_entrada != null && item.cabecas_entrada <= parseInt(cabecasMax))
    const matchDiasMin = !diasMin || (item.periodo_ocupacao_dias != null && item.periodo_ocupacao_dias >= parseFloat(diasMin))
    const matchDiasMax = !diasMax || (item.periodo_ocupacao_dias != null && item.periodo_ocupacao_dias <= parseFloat(diasMax))

    // Filtros por meta
    const matchExcedeuMeta = !apenasExcedeuMeta || (item.desvio_tempo_ocupacao_percent != null && item.desvio_tempo_ocupacao_percent > 0)
    const matchDesvioMin = !desvioMin || (item.desvio_tempo_ocupacao_percent != null && item.desvio_tempo_ocupacao_percent >= parseFloat(desvioMin))
    const matchComMeta = !apenasComMeta || item.meta_intervalo_ocupacao_dias != null

    return matchSearch && matchStatus && matchDataInicio && matchDataFim && matchPeriodoRapido &&
           matchLote && matchPasto && matchModulo &&
           matchTaxaMin && matchTaxaMax && matchCabecasMin && matchCabecasMax && matchDiasMin && matchDiasMax &&
           matchExcedeuMeta && matchDesvioMin && matchComMeta
  })

  const formatarData = (dataStr?: string | null) => {
    if (!dataStr) return '—'
    return new Date(dataStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatarPeso = (peso?: number | null) => {
    if (peso == null) return '—'
    return `${peso.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`
  }

  const getDesvioClass = (desvio?: number | null) => {
    if (desvio == null) return 'text-gray-500'
    if (desvio > 0) return 'text-red-600 font-semibold'
    return 'text-green-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Histórico de Ocupação</h1>
          <p className="text-sm text-gray-500 mt-1">Entradas e saídas de lotes em pastos e módulos</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div className="space-y-4">
          {/* Primeira linha: Toggle, Busca, Status */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Toggle Pasto / Módulo */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTipo('pasto')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  tipo === 'pasto' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'
                }`}
              >
                Por Pasto
              </button>
              <button
                onClick={() => setTipo('modulo')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  tipo === 'modulo' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'
                }`}
              >
                Por Módulo
              </button>
            </div>

            {/* Busca geral */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Buscar por lote, pasto ou módulo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Status */}
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as 'todos' | 'ativos' | 'encerrados')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="todos">Todos os status</option>
              <option value="ativos">Apenas ativos</option>
              <option value="encerrados">Apenas encerrados</option>
            </select>
          </div>

          {/* Segunda linha: Filtros temporais */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">De:</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">Até:</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <select
              value={periodoRapido}
              onChange={(e) => setPeriodoRapido(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="">Período rápido...</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Último ano</option>
            </select>
          </div>

          {/* Terceira linha: Filtros por entidade */}
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={loteSelecionado}
              onChange={(e) => setLoteSelecionado(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm min-w-[150px]"
            >
              <option value="">Todos os lotes</option>
              {lotesDisponiveis.map(l => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
            <select
              value={pastoSelecionado}
              onChange={(e) => setPastoSelecionado(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm min-w-[150px]"
            >
              <option value="">Todos os pastos</option>
              {pastosDisponiveis.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            <select
              value={moduloSelecionado}
              onChange={(e) => setModuloSelecionado(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm min-w-[150px]"
            >
              <option value="">Todos os módulos</option>
              {modulosDisponiveis.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>

          {/* Quarta linha: Filtros por métricas */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-600">Taxa UA/ha:</label>
              <input
                type="number"
                placeholder="Min"
                value={taxaLotacaoMin}
                onChange={(e) => setTaxaLotacaoMin(e.target.value)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <span className="text-xs text-gray-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={taxaLotacaoMax}
                onChange={(e) => setTaxaLotacaoMax(e.target.value)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-600">Cabeças:</label>
              <input
                type="number"
                placeholder="Min"
                value={cabecasMin}
                onChange={(e) => setCabecasMin(e.target.value)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <span className="text-xs text-gray-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={cabecasMax}
                onChange={(e) => setCabecasMax(e.target.value)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-600">Dias:</label>
              <input
                type="number"
                placeholder="Min"
                value={diasMin}
                onChange={(e) => setDiasMin(e.target.value)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <span className="text-xs text-gray-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={diasMax}
                onChange={(e) => setDiasMax(e.target.value)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          {/* Quinta linha: Filtros por meta */}
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={apenasExcedeuMeta}
                onChange={(e) => setApenasExcedeuMeta(e.target.checked)}
                className="rounded border-gray-300"
              />
              Apenas excedeu meta
            </label>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-600">Desvio mínimo %:</label>
              <input
                type="number"
                placeholder="0"
                value={desvioMin}
                onChange={(e) => setDesvioMin(e.target.value)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={apenasComMeta}
                onChange={(e) => setApenasComMeta(e.target.checked)}
                className="rounded border-gray-300"
              />
              Apenas com meta definida
            </label>
          </div>
        </div>
      </Card>

      {/* Tabela */}
      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filtrado.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">
            {searchTerm || statusFiltro !== 'todos' || dataInicio || dataFim || periodoRapido || loteSelecionado || pastoSelecionado || moduloSelecionado || taxaLotacaoMin || taxaLotacaoMax || cabecasMin || cabecasMax || diasMin || diasMax || apenasExcedeuMeta || desvioMin || apenasComMeta ? 'Nenhum registro encontrado com os filtros aplicados' : 'Nenhum histórico de ocupação disponível'}
          </p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-0">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lote</th>
                  {tipo === 'pasto' ? (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pasto</th>
                  ) : (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Módulo</th>
                  )}
                  {tipo === 'pasto' && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Módulo</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entrada</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Saída</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Dias</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cab. Entrada</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Peso Entrada</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cab. Saída</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Peso Saída</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Meta (dias)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Desvio (%)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-blue-600 uppercase tracking-wider">Taxa (UA/ha)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtrado.map((item) => (
                  <tr key={item.historico_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{item.lote_nome}</td>
                    {tipo === 'pasto' ? (
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.pasto_nome || '—'}</td>
                    ) : (
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.modulo_nome || '—'}</td>
                    )}
                    {tipo === 'pasto' && (
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{item.modulo_nome || '—'}</td>
                    )}
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatarData(item.data_hora_entrada)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatarData(item.data_hora_saida)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                      {item.periodo_ocupacao_dias != null ? (
                        <span className={item.meta_intervalo_ocupacao_dias && item.periodo_ocupacao_dias > item.meta_intervalo_ocupacao_dias ? 'text-red-600 font-semibold' : ''}>
                          {item.periodo_ocupacao_dias}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">{item.cabecas_entrada ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">{formatarPeso(item.peso_vivo_medio_entrada_kg)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">{item.cabecas_saida ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">{formatarPeso(item.peso_vivo_medio_saida_kg)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">{item.meta_intervalo_ocupacao_dias ?? '—'}</td>
                    <td className={`px-4 py-3 text-right whitespace-nowrap ${getDesvioClass(item.desvio_tempo_ocupacao_percent)}`}>
                      {item.desvio_tempo_ocupacao_percent != null
                        ? `${item.desvio_tempo_ocupacao_percent > 0 ? '+' : ''}${item.desvio_tempo_ocupacao_percent.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-blue-700">
                      {item.taxa_lotacao_ua_ha != null
                        ? item.taxa_lotacao_ua_ha.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {item.data_hora_saida == null ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Encerrado
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 px-4 pb-2">{filtrado.length} registro{filtrado.length !== 1 ? 's' : ''}</p>
        </Card>
      )}
    </div>
  )
}
