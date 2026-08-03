import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Button, Card, CardSkeleton, Input } from '../../components/ui'
import { getFazendaIdForUser } from '../../utils/fazendaContext'
import {
  TipoProgramacao,
  getCurraisFazenda,
  getProgramacaoTratos,
  getTiposExistentes,
  saveProgramacaoTratos,
} from '../../services/programacaoTratosService'

interface PercentualTrato {
  ordem_trato: number
  percentual: string
  horario_sugerido: string
}

interface CurralComKg {
  curral_id: string
  curral_nome: string
  lote_id: string | null
  lote_nome: string | null
  kg_mn_dia: string
}

const DISTRIBUICAO_PADRAO_4: Record<number, string> = { 1: '30', 2: '20', 3: '20', 4: '30' }

const TIPOS: { value: TipoProgramacao; label: string }[] = [
  { value: 'engorda', label: 'Engorda' },
  { value: 'sequestro', label: 'Sequestro' },
]

export function ProgramacaoTratos() {
  const { user } = useAuth()
  const [fazendaId, setFazendaId] = useState<string | null>(null)
  const [loadingFazenda, setLoadingFazenda] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Tipos ativos (engorda, sequestro, ou ambos)
  const [tiposAtivos, setTiposAtivos] = useState<TipoProgramacao[]>([])
  // Tipo atualmente selecionado para edição
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoProgramacao>('engorda')

  // Configuração por tipo
  const [configs, setConfigs] = useState<Record<string, {
    quantidadeTratos: string
    percentuais: PercentualTrato[]
    currais: CurralComKg[]
  }>>({})

  const loadFazenda = useCallback(async () => {
    if (!user) return
    const fid = await getFazendaIdForUser(user.id)
    setFazendaId(fid)
    setLoadingFazenda(false)
  }, [user])

  useEffect(() => {
    loadFazenda()
  }, [loadFazenda])

  const loadData = useCallback(async () => {
    if (!fazendaId) return
    setLoading(true)
    setErro(null)

    const [tiposExistentes, progEngorda, progSequestro, curraisFazenda] = await Promise.all([
      getTiposExistentes(fazendaId),
      getProgramacaoTratos(fazendaId, 'engorda'),
      getProgramacaoTratos(fazendaId, 'sequestro'),
      getCurraisFazenda(fazendaId),
    ])

    setTiposAtivos(tiposExistentes.length > 0 ? tiposExistentes : ['engorda'])

    const newConfigs: Record<string, { quantidadeTratos: string; percentuais: PercentualTrato[]; currais: CurralComKg[] }> = {}

    for (const [tipo, prog] of [['engorda', progEngorda], ['sequestro', progSequestro]] as const) {
      // Mapa de kg MN salvos por curral
      const kgPorCurral: Record<string, string> = {}
      for (const c of prog.currais || []) {
        kgPorCurral[c.curral_id] = String(c.kg_mn_dia)
      }

      // Lista de currais da fazenda, mesclando com valores salvos
      const currais: CurralComKg[] = curraisFazenda.map((c) => ({
        curral_id: c.id,
        curral_nome: c.nome,
        lote_id: c.lote_id,
        lote_nome: c.lote_nome,
        kg_mn_dia: kgPorCurral[c.id] ?? '',
      }))

      if (prog.programacao) {
        newConfigs[tipo] = {
          quantidadeTratos: String(prog.programacao.quantidade_tratos),
          percentuais: prog.percentuais.map((p) => ({
            ordem_trato: p.ordem_trato,
            percentual: String(p.percentual),
            horario_sugerido: p.horario_sugerido || '',
          })),
          currais,
        }
      } else {
        newConfigs[tipo] = {
          quantidadeTratos: '4',
          percentuais: distribuirPercentuais(4),
          currais,
        }
      }
    }

    setConfigs(newConfigs)
    setLoading(false)
  }, [fazendaId])

  useEffect(() => {
    if (fazendaId) loadData()
  }, [fazendaId, loadData])

  function distribuirPercentuais(n: number): PercentualTrato[] {
    if (n === 4) {
      return [1, 2, 3, 4].map((i) => ({
        ordem_trato: i,
        percentual: DISTRIBUICAO_PADRAO_4[i],
        horario_sugerido: '',
      }))
    }
    const igual = (100 / n).toFixed(1)
    return Array.from({ length: n }, (_, i) => ({
      ordem_trato: i + 1,
      percentual: igual,
      horario_sugerido: '',
    }))
  }

  const configAtual = configs[tipoSelecionado] || {
    quantidadeTratos: '4',
    percentuais: distribuirPercentuais(4),
    currais: [],
  }

  const handleQuantidadeTratosChange = (value: string) => {
    const n = parseInt(value) || 0
    setConfigs((prev) => ({
      ...prev,
      [tipoSelecionado]: {
        ...prev[tipoSelecionado],
        quantidadeTratos: value,
        percentuais: n > 0 ? distribuirPercentuais(n) : [],
      },
    }))
  }

  const handlePercentualChange = (ordem: number, campo: 'percentual' | 'horario_sugerido', value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [tipoSelecionado]: {
        ...prev[tipoSelecionado],
        percentuais: (prev[tipoSelecionado]?.percentuais || []).map((p) =>
          p.ordem_trato === ordem ? { ...p, [campo]: value } : p
        ),
      },
    }))
  }

  const handleCurralKgChange = (curralId: string, value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [tipoSelecionado]: {
        ...prev[tipoSelecionado],
        currais: (prev[tipoSelecionado]?.currais || []).map((c) =>
          c.curral_id === curralId ? { ...c, kg_mn_dia: value } : c
        ),
      },
    }))
  }

  const handleAdicionarTipo = (tipo: TipoProgramacao) => {
    if (!tiposAtivos.includes(tipo)) {
      setTiposAtivos([...tiposAtivos, tipo])
      setTipoSelecionado(tipo)
    }
  }

  const somaPercentuais = useMemo(() => {
    return (configAtual.percentuais || []).reduce((sum, p) => sum + (parseFloat(p.percentual) || 0), 0)
  }, [configAtual])

  const percentuaisValidos = Math.abs(somaPercentuais - 100) < 0.01
  const horariosPreenchidos = (configAtual.percentuais || []).every((p) => p.horario_sugerido !== '')

  const podeSalvar =
    parseInt(configAtual.quantidadeTratos) > 0 &&
    (configAtual.percentuais || []).length > 0 &&
    percentuaisValidos &&
    horariosPreenchidos

  const handleSalvar = async () => {
    if (!fazendaId || !podeSalvar) return
    setSaving(true)
    setSalvo(false)
    setErro(null)

    const result = await saveProgramacaoTratos(fazendaId, tipoSelecionado, {
      quantidade_tratos: parseInt(configAtual.quantidadeTratos),
      percentuais: (configAtual.percentuais || []).map((p) => ({
        ordem_trato: p.ordem_trato,
        percentual: parseFloat(p.percentual) || 0,
        horario_sugerido: p.horario_sugerido || null,
      })),
      currais: (configAtual.currais || [])
        .filter((c) => c.kg_mn_dia !== '' && parseFloat(c.kg_mn_dia) > 0)
        .map((c) => ({
          curral_id: c.curral_id,
          lote_id: c.lote_id,
          kg_mn_dia: parseFloat(c.kg_mn_dia) || 0,
        })),
    })

    if (result.success) {
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
      if (!tiposAtivos.includes(tipoSelecionado)) {
        setTiposAtivos([...tiposAtivos, tipoSelecionado])
      }
    } else {
      setErro(result.error)
    }

    setSaving(false)
  }

  if (loadingFazenda) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <CardSkeleton />
      </div>
    )
  }

  const tipoPodeSerAdicionado = TIPOS.find((t) => t.value !== tipoSelecionado && !tiposAtivos.includes(t.value))

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Programação de Tratos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Defina a quantidade de tratos diários e a distribuição percentual por trato para cada tipo de manejo.
        </p>
      </div>

      {/* Card explicativo */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <svg className="w-6 h-6 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Como funciona</p>
            <p>
              Os percentuais por trato balizam a distribuição do <strong>primeiro dia</strong>. Do segundo dia em diante,
              a oferta recomendada por curral e por trato será ajustada pela leitura de cocho do dia anterior.
            </p>
          </div>
        </div>
      </Card>

      {erro && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <p className="text-sm text-red-700 font-medium">Erro ao salvar programação</p>
          <p className="text-xs text-red-500 mt-1">{erro}</p>
        </div>
      )}

      {/* Seletor de tipo + adicionar */}
      <div className="flex items-center gap-2 flex-wrap">
        {tiposAtivos.map((tipo) => {
          const t = TIPOS.find((x) => x.value === tipo)
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => setTipoSelecionado(tipo)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tipoSelecionado === tipo
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t?.label || tipo}
            </button>
          )
        })}
        {tipoPodeSerAdicionado && (
          <button
            type="button"
            onClick={() => handleAdicionarTipo(tipoPodeSerAdicionado.value)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 border border-dashed border-gray-300 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            + {tipoPodeSerAdicionado.label}
          </button>
        )}
      </div>

      {loading ? (
        <CardSkeleton />
      ) : (
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Configuração: {TIPOS.find((t) => t.value === tipoSelecionado)?.label}
          </h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1 leading-tight line-clamp-2">
              Quantidade de tratos por dia
            </label>
            <Input
              type="number"
              min={1}
              value={configAtual.quantidadeTratos}
              onChange={(e) => handleQuantidadeTratosChange(e.target.value)}
              placeholder="Ex: 4"
              className="border-gray-200 focus:border-accent max-w-[200px]"
            />
          </div>

          {/* Tabela de percentuais por trato */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Distribuição percentual por trato</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border border-gray-200 rounded-lg">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-2">Trato</th>
                    <th className="px-4 py-2">Percentual (%)</th>
                    <th className="px-4 py-2">Horário sugerido <span className="text-red-500">*</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(configAtual.percentuais || []).map((p) => (
                    <tr key={p.ordem_trato}>
                      <td className="px-4 py-2 font-medium text-gray-800">{p.ordem_trato}º</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          value={p.percentual}
                          onChange={(e) => handlePercentualChange(p.ordem_trato, 'percentual', e.target.value)}
                          className="w-24 border-gray-200 focus:border-accent"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="time"
                          value={p.horario_sugerido}
                          onChange={(e) => handlePercentualChange(p.ordem_trato, 'horario_sugerido', e.target.value)}
                          className="w-32 border-gray-200 focus:border-accent"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td className="px-4 py-2 text-gray-700">Total</td>
                    <td className="px-4 py-2">
                      <span className={percentuaisValidos ? 'text-green-600' : 'text-red-600'}>
                        {somaPercentuais.toFixed(1)}%
                      </span>
                      {!percentuaisValidos && (
                        <span className="text-xs text-red-500 ml-2">(deve somar 100%)</span>
                      )}
                    </td>
                    <td className="px-4 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Tabela de kg MN por curral (Dia 1) */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">
              Quantidade total de MN (kg) por curral, Dia 1
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Informe o total diário de matéria natural (kg) que será trato em cada curral no primeiro dia.
              O aplicativo usará esses valores como previsão inicial, ajustada depois pelas leituras de cocho.
            </p>
            {(configAtual.currais || []).length === 0 ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 text-center">
                Nenhum curral ativo cadastrado para esta fazenda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-2">Curral</th>
                      <th className="px-4 py-2">Lote</th>
                      <th className="px-4 py-2">Total MN Dia 1 (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(configAtual.currais || []).map((c) => (
                      <tr key={c.curral_id}>
                        <td className="px-4 py-2 font-medium text-gray-800">{c.curral_nome}</td>
                        <td className="px-4 py-2 text-gray-600">{c.lote_nome || <span className="text-gray-400 italic">Sem lote</span>}</td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            min={0}
                            step="0.1"
                            value={c.kg_mn_dia}
                            onChange={(e) => handleCurralKgChange(c.curral_id, e.target.value)}
                            placeholder="0"
                            className="w-28 border-gray-200 focus:border-accent"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-medium">
                    <tr>
                      <td className="px-4 py-2 text-gray-700" colSpan={2}>Total geral</td>
                      <td className="px-4 py-2">
                        <span className="text-gray-800">
                          {(configAtual.currais || []).reduce((sum, c) => sum + (parseFloat(c.kg_mn_dia) || 0), 0).toFixed(1)} kg
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Botão salvar */}
          <div className="flex justify-end gap-3 items-center mt-6">
            {salvo && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Salvo!
              </span>
            )}
            <Button
              onClick={handleSalvar}
              disabled={!podeSalvar || saving}
              className="px-6"
            >
              {saving ? 'Salvando...' : 'Salvar Programação'}
            </Button>
          </div>

          {!podeSalvar && (
            <p className="text-xs text-gray-400 text-right mt-2">
              {!percentuaisValidos && 'Os percentuais devem somar 100%. '}
              {!horariosPreenchidos && 'Todos os horários sugeridos devem ser preenchidos. '}
              {parseInt(configAtual.quantidadeTratos) <= 0 && 'A quantidade de tratos deve ser maior que zero. '}
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
