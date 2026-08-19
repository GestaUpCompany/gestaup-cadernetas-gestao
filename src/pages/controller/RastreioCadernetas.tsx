import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardSkeleton } from '../../components/ui'
import { getFazendaIdForUser } from '../../utils/fazendaContext'
import {
  getRastreioUsuarios,
  getRastreioCadernetas,
  getRastreioCadernetasDetalhe,
  cadernetaLabel,
  type RastreioUsuario,
  type RastreioCaderneta,
  type RastreioDetalhe,
} from '../../services/rastreioService'

type PeriodoPreset = '7d' | '30d' | '90d' | 'tudo'

const PERIODO_LABELS: Record<PeriodoPreset, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
  tudo: 'Tudo',
}

function getDataInicio(preset: PeriodoPreset): string | undefined {
  if (preset === 'tudo') return undefined
  const dias = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().split('T')[0]
}

function formatData(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatDataHora(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function diasDesde(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  const agora = new Date()
  return Math.floor((agora.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export function RastreioCadernetas() {
  const { user } = useAuth()
  const [fazendaId, setFazendaId] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<PeriodoPreset>('30d')
  const [usuarios, setUsuarios] = useState<RastreioUsuario[]>([])
  const [cadernetas, setCadernetas] = useState<RastreioCaderneta[]>([])
  const [detalhe, setDetalhe] = useState<RastreioDetalhe[]>([])
  const [loading, setLoading] = useState(true)
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<string | null>(null)

  const loadFazenda = useCallback(async () => {
    if (!user) return
    const id = await getFazendaIdForUser(user.id)
    if (id) setFazendaId(id)
  }, [user])

  useEffect(() => { loadFazenda() }, [loadFazenda])

  const dataInicio = useMemo(() => getDataInicio(periodo), [periodo])

  useEffect(() => {
    if (!fazendaId) return
    setLoading(true)
    setUsuarioSelecionado(null)
    Promise.all([
      getRastreioUsuarios(fazendaId, dataInicio),
      getRastreioCadernetas(fazendaId, dataInicio),
    ]).then(([u, c]) => {
      setUsuarios(u)
      setCadernetas(c)
      setLoading(false)
    })
  }, [fazendaId, dataInicio])

  useEffect(() => {
    if (!fazendaId || !usuarioSelecionado) {
      setDetalhe([])
      return
    }
    getRastreioCadernetasDetalhe(fazendaId, usuarioSelecionado, dataInicio).then(setDetalhe)
  }, [fazendaId, usuarioSelecionado, dataInicio])

  // Cards de resumo
  const totalRegistros = useMemo(() => usuarios.reduce((s, u) => s + u.total_registros, 0), [usuarios])
  const totalCadernetasUsadas = useMemo(() => {
    const set = new Set(cadernetas.map((c) => c.caderneta))
    return set.size
  }, [cadernetas])
  const usuarioMaisAtivo = useMemo(() => usuarios[0] || null, [usuarios])
  const cadernetaMaisUsada = useMemo(() => {
    const porCaderneta: Record<string, number> = {}
    cadernetas.forEach((c) => { porCaderneta[c.caderneta] = (porCaderneta[c.caderneta] || 0) + c.total_registros })
    const entries = Object.entries(porCaderneta).sort((a, b) => b[1] - a[1])
    return entries[0] ? { caderneta: entries[0][0], total: entries[0][1] } : null
  }, [cadernetas])

  // Cadernetas do usuario selecionado
  const cadernetasDoUsuario = useMemo(() => {
    if (!usuarioSelecionado) return []
    return cadernetas.filter((c) => c.nome_usuario === usuarioSelecionado).sort((a, b) => b.total_registros - a.total_registros)
  }, [cadernetas, usuarioSelecionado])

  // Detalhe agregado por dia (todos os usuarios) para o heatmap
  const detalhePorDia = useMemo(() => {
    const map: Record<string, number> = {}
    detalhe.forEach((d) => {
      const key = d.dia
      map[key] = (map[key] || 0) + d.total
    })
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([dia, total]) => ({ dia, total }))
  }, [detalhe])

  const maxDiaTotal = useMemo(() => Math.max(1, ...detalhePorDia.map((d) => d.total)), [detalhePorDia])

  if (!fazendaId && !loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Uso das Cadernetas</h1>
        <Card className="p-8 text-center text-gray-500">Nenhuma fazenda associada ao seu usuário.</Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Uso das Cadernetas</h1>
        <div className="flex gap-2">
          {(Object.keys(PERIODO_LABELS) as PeriodoPreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                periodo === p
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {PERIODO_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white p-4 border-0 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Usuários ativos</p>
              <p className="text-2xl font-bold text-gray-800">{usuarios.length}</p>
            </Card>
            <Card className="bg-white p-4 border-0 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Total de registros</p>
              <p className="text-2xl font-bold text-gray-800">{totalRegistros}</p>
            </Card>
            <Card className="bg-white p-4 border-0 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Cadernetas usadas</p>
              <p className="text-2xl font-bold text-gray-800">{totalCadernetasUsadas}</p>
              <p className="text-xs text-gray-400 mt-1">de 20 disponíveis</p>
            </Card>
            <Card className="bg-white p-4 border-0 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Usuário mais ativo</p>
              <p className="text-lg font-bold text-gray-800 truncate">{usuarioMaisAtivo?.nome_usuario || '-'}</p>
              <p className="text-xs text-gray-400 mt-1">{usuarioMaisAtivo?.total_registros || 0} registros</p>
            </Card>
          </div>

          {/* Lista de usuarios */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Usuários</h2>
              <div className="space-y-2">
                {usuarios.length === 0 ? (
                  <Card className="p-6 text-center text-gray-400 text-sm">Nenhum registro no período</Card>
                ) : (
                  usuarios.map((u) => {
                    const dias = diasDesde(u.ultimo_registro)
                const ativo = dias !== null && dias <= 7
                const isSelected = usuarioSelecionado === u.nome_usuario
                return (
                  <button
                    key={u.nome_usuario}
                    onClick={() => setUsuarioSelecionado(isSelected ? null : u.nome_usuario)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${ativo ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="font-semibold text-gray-800 text-sm">{u.nome_usuario}</span>
                      </div>
                      <span className="text-xs text-gray-400">{u.total_registros}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{u.cadernetas_usadas} caderneta{u.cadernetas_usadas !== 1 ? 's' : ''}</span>
                      <span>{u.dias_ativos} dia{u.dias_ativos !== 1 ? 's' : ''} ativo{u.dias_ativos !== 1 ? 's' : ''}</span>
                      <span>últ. {formatData(u.ultimo_registro)}</span>
                    </div>
                  </button>
                )
                  })
                )}
              </div>
            </div>

            {/* Detalhe do usuario selecionado */}
            <div className="lg:col-span-2">
              {!usuarioSelecionado ? (
                <>
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                    Caderneta mais usada
                  </h2>
                  {cadernetaMaisUsada ? (
                    <Card className="bg-white p-4 border-0 shadow-sm mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-800">{cadernetaLabel(cadernetaMaisUsada.caderneta)}</p>
                          <p className="text-xs text-gray-400">{cadernetaMaisUsada.total} registros no período</p>
                        </div>
                        <div className="text-3xl font-bold text-primary">{cadernetaMaisUsada.total}</div>
                      </div>
                    </Card>
                  ) : null}

                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                    Registros por caderneta
                  </h2>
                  {cadernetas.length === 0 ? (
                    <Card className="p-6 text-center text-gray-400 text-sm">Nenhum registro no período</Card>
                  ) : (
                    <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                          <tr>
                            <th className="text-left px-4 py-3">Usuário</th>
                            <th className="text-left px-4 py-3">Caderneta</th>
                            <th className="text-right px-4 py-3">Total</th>
                            <th className="text-right px-4 py-3">Dias</th>
                            <th className="text-left px-4 py-3">Último</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {cadernetas.map((c, i) => (
                            <tr
                              key={`${c.nome_usuario}-${c.caderneta}-${i}`}
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => setUsuarioSelecionado(c.nome_usuario)}
                            >
                              <td className="px-4 py-3 text-gray-800 font-medium">{c.nome_usuario}</td>
                              <td className="px-4 py-3 text-gray-600">{cadernetaLabel(c.caderneta)}</td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-800">{c.total_registros}</td>
                              <td className="px-4 py-3 text-right text-gray-500">{c.dias_ativos}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{formatDataHora(c.ultimo_registro)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                      {usuarioSelecionado}
                    </h2>
                    <button
                      onClick={() => setUsuarioSelecionado(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      ← voltar
                    </button>
                  </div>

                  {/* Breakdown por caderneta */}
                  <div className="space-y-2 mb-6">
                    {cadernetasDoUsuario.map((c) => (
                      <Card key={c.caderneta} className="bg-white p-3 border-0 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{cadernetaLabel(c.caderneta)}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                              <span>{c.total_registros} total</span>
                              <span>{c.dias_ativos} dias</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-800">{c.total_registros}</div>
                            <div className="text-xs text-gray-400">{formatData(c.primeiro_registro)} → {formatData(c.ultimo_registro)}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Timeline diario */}
                  {detalhePorDia.length > 0 && (
                    <>
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                        Atividade por dia
                      </h3>
                      <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-end gap-1 h-32 overflow-x-auto">
                          {detalhePorDia.map((d) => {
                            const altura = Math.max(4, (d.total / maxDiaTotal) * 100)
                            return (
                              <div
                                key={d.dia}
                                className="flex flex-col items-center gap-1 flex-shrink-0"
                                title={`${formatData(d.dia)}: ${d.total} registros`}
                              >
                                <div
                                  className="w-6 bg-primary rounded-t transition-all hover:bg-primary/80"
                                  style={{ height: `${altura}%` }}
                                />
                                <span className="text-[10px] text-gray-400">{d.dia.slice(8)}/{d.dia.slice(5, 7)}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
