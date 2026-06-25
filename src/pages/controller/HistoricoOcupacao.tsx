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
  const [apenasAtivos, setApenasAtivos] = useState(false)

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

    // Buscar apenas lotes da fazenda do usuário
    const { data: lotesData } = await supabase
      .from('lotes')
      .select('id')
      .eq('fazenda_id', fazendaId)

    if (!lotesData || lotesData.length === 0) {
      setHistorico([])
      setLoading(false)
      return
    }

    const loteIds = lotesData.map(l => l.id)

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

    const matchAtivos = !apenasAtivos || item.data_hora_saida == null

    return matchSearch && matchAtivos
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
        <div className="flex flex-wrap gap-4">
          {/* Toggle Pasto / Módulo */}
          <div className="flex bg-gray-100 rounded-lg p-1 self-start">
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

          {/* Filtro apenas ativos */}
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer self-center">
            <input
              type="checkbox"
              checked={apenasAtivos}
              onChange={(e) => setApenasAtivos(e.target.checked)}
              className="rounded border-gray-300"
            />
            Apenas ocupações ativas
          </label>
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
            {searchTerm || apenasAtivos ? 'Nenhum registro encontrado com os filtros aplicados' : 'Nenhum histórico de ocupação disponível'}
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
