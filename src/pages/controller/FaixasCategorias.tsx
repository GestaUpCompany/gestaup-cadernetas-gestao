import { Fragment, useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal, Modal } from '../../components/ui'
import { getFazendaIdForUser } from '../../utils/fazendaContext'

interface FaixaCategoria {
  id: string
  fazenda_id: string
  nome: string
  sexo: 'M' | 'F'
  peso_min: number
  peso_max: number
  ordem: number
  cor: string | null
  ativo: boolean
}

interface LoteCategoriaCronologia {
  id: string
  lote_id: string
  categoria: string
  sexo: string | null
  quant_atual: number | null
  peso_vivo_atual_kg_cab: number | null
  peso_entrada_kg_cab: number | null
  data_pesagem: string | null
  data_fim: string | null
  ativo: boolean
  categoria_origem_id: string | null
  created_at?: string | null
  lote_nome?: string
  lote_destino?: string | null
}

interface FormulacaoOpcao {
  id: string
  nome: string
  categoria: string | null
}

interface TransicaoHistorico {
  id: string
  categoria_origem: string
  categoria_destino: string
  peso_na_transicao_kg: number | null
  data_transicao: string
  motivo: string
}

const SEXO_LABEL: Record<string, string> = { M: 'Machos', F: 'Fêmeas' }

export function FaixasCategorias() {
  const { user } = useAuth()
  const [fazendaId, setFazendaId] = useState<string | null>(null)
  const [loadingFazenda, setLoadingFazenda] = useState(true)
  const [faixas, setFaixas] = useState<FaixaCategoria[]>([])
  const [loadingFaixas, setLoadingFaixas] = useState(true)
  const [savingFaixaId, setSavingFaixaId] = useState<string | null>(null)
  const [sexoFiltro, setSexoFiltro] = useState<'M' | 'F'>('M')

  // Cronologia dos lotes
  const [lotesCategorias, setLotesCategorias] = useState<LoteCategoriaCronologia[]>([])
  const [loadingCronologia, setLoadingCronologia] = useState(true)
  const [loteSelecionadoId, setLoteSelecionadoId] = useState<string | null>(null)
  const [transicoes, setTransicoes] = useState<TransicaoHistorico[]>([])

  // Modal de recategorização
  const [recategorizando, setRecategorizando] = useState<LoteCategoriaCronologia | null>(null)
  const [novaCategoria, setNovaCategoria] = useState<string>('')
  const [manterFormulacao, setManterFormulacao] = useState<boolean>(true)
  const [formulacoesDisponiveis, setFormulacoesDisponiveis] = useState<FormulacaoOpcao[]>([])
  const [formulacaoSelecionada, setFormulacaoSelecionada] = useState<string>('')
  const [loadingFormulacoes, setLoadingFormulacoes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erroRecategorizacao, setErroRecategorizacao] = useState<string | null>(null)
  const [sucessoRecategorizacao, setSucessoRecategorizacao] = useState<string | null>(null)

  // Modal de confirmação
  const [confirmRecategorizacao, setConfirmRecategorizacao] = useState(false)

  useEffect(() => {
    const loadFazenda = async () => {
      if (!user) return
      const fid = await getFazendaIdForUser(user.id)
      setFazendaId(fid)
      setLoadingFazenda(false)
    }
    loadFazenda()
  }, [user])

  const loadFaixas = useCallback(async () => {
    if (!fazendaId) return
    setLoadingFaixas(true)
    const { data, error } = await supabase
      .from('faixas_categorias')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('sexo', { ascending: true })
      .order('ordem', { ascending: true })
    if (error) {
      console.error('Erro ao carregar faixas:', error)
    } else {
      setFaixas(data as FaixaCategoria[])
    }
    setLoadingFaixas(false)
  }, [fazendaId])

  const loadCronologia = useCallback(async () => {
    if (!fazendaId) return
    setLoadingCronologia(true)
    // Buscar lotes da fazenda
    const { data: lotesData } = await supabase
      .from('lotes')
      .select('id, nome, destino')
      .eq('fazenda_id', fazendaId)
      .order('nome', { ascending: true })
    if (!lotesData || lotesData.length === 0) {
      setLotesCategorias([])
      setLoadingCronologia(false)
      return
    }
    const loteIds = lotesData.map(l => l.id)
    const loteMap = new Map(lotesData.map(l => [l.id, l]))

    // Buscar lote_categorias (ativas e encerradas) para reconstruir a cadeia
    const { data: catsData, error } = await supabase
      .from('lote_categorias')
      .select('*')
      .in('lote_id', loteIds)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('Erro ao carregar cronologia:', error)
      setLotesCategorias([])
    } else {
      const enriquecidas: LoteCategoriaCronologia[] = (catsData || []).map(c => ({
        ...c,
        lote_nome: loteMap.get(c.lote_id)?.nome,
        lote_destino: loteMap.get(c.lote_id)?.destino ?? null,
      }))
      setLotesCategorias(enriquecidas)
      if (loteIds.length > 0 && !loteSelecionadoId) {
        setLoteSelecionadoId(loteIds[0])
      }
    }
    setLoadingCronologia(false)
  }, [fazendaId, loteSelecionadoId])

  const loadTransicoes = useCallback(async () => {
    if (!fazendaId || !loteSelecionadoId) {
      setTransicoes([])
      return
    }
    const { data, error } = await supabase
      .from('lote_categorias_transicoes')
      .select('id, categoria_origem, categoria_destino, peso_na_transicao_kg, data_transicao, motivo')
      .eq('lote_id', loteSelecionadoId)
      .order('data_transicao', { ascending: false })
    if (error) {
      console.error('Erro ao carregar transições:', error)
      setTransicoes([])
    } else {
      setTransicoes(data as TransicaoHistorico[])
    }
  }, [fazendaId, loteSelecionadoId])

  useEffect(() => { if (fazendaId) loadFaixas() }, [fazendaId, loadFaixas])
  useEffect(() => { if (fazendaId) loadCronologia() }, [fazendaId, loadCronologia])
  useEffect(() => { if (fazendaId && loteSelecionadoId) loadTransicoes() }, [fazendaId, loteSelecionadoId, loadTransicoes])

  const faixasDoSexo = faixas.filter(f => f.sexo === sexoFiltro)

  const handleFaixaChange = (id: string, campo: 'peso_min' | 'peso_max' | 'ordem' | 'cor', valor: string) => {
    setFaixas(prev => prev.map(f => {
      if (f.id !== id) return f
      if (campo === 'cor') return { ...f, cor: valor }
      const num = parseFloat(valor.replace(',', '.'))
      if (isNaN(num)) return f
      return { ...f, [campo]: num }
    }))
  }

  const salvarFaixa = async (id: string) => {
    const faixa = faixas.find(f => f.id === id)
    if (!faixa) return
    setSavingFaixaId(id)
    const { error } = await supabase
      .from('faixas_categorias')
      .update({
        peso_min: faixa.peso_min,
        peso_max: faixa.peso_max,
        ordem: faixa.ordem,
        cor: faixa.cor,
      })
      .eq('id', id)
    if (error) {
      console.error('Erro ao salvar faixa:', error)
    }
    setSavingFaixaId(null)
  }

  const lotesDisponiveis = Array.from(new Set(lotesCategorias.map(lc => lc.lote_id)))
    .map(lid => ({
      id: lid,
      nome: lotesCategorias.find(lc => lc.lote_id === lid)?.lote_nome || 'Lote',
    }))

  const categoriasDoLoteSelecionado = lotesCategorias
    .filter(lc => lc.lote_id === loteSelecionadoId)
    .sort((a, b) => {
      // Ativas primeiro, depois por data
      if (a.data_fim === null && b.data_fim !== null) return -1
      if (a.data_fim !== null && b.data_fim === null) return 1
      return (a.created_at || '').localeCompare(b.created_at || '')
    })

  const categoriaAtiva = categoriasDoLoteSelecionado.find(c => c.data_fim === null && c.ativo)

  // Sugerir próxima categoria baseado nas faixas e no sexo
  const sugerirProximaCategoria = (categoriaAtual: string, sexo: string | null): string => {
    const sexoNormalizado = sexo === 'fêmea' || sexo === 'F' ? 'F' : 'M'
    const faixasSexo = faixas.filter(f => f.sexo === sexoNormalizado && f.ativo).sort((a, b) => a.ordem - b.ordem)
    const idxAtual = faixasSexo.findIndex(f => f.nome.toLowerCase() === categoriaAtual.toLowerCase())
    if (idxAtual >= 0 && idxAtual < faixasSexo.length - 1) {
      return faixasSexo[idxAtual + 1].nome
    }
    return ''
  }

  const abrirRecategorizacao = async (loteCategoria: LoteCategoriaCronologia) => {
    setRecategorizando(loteCategoria)
    const sugerida = sugerirProximaCategoria(loteCategoria.categoria, loteCategoria.sexo)
    setNovaCategoria(sugerida)
    setManterFormulacao(true)
    setFormulacaoSelecionada('')
    setErroRecategorizacao(null)
    setSucessoRecategorizacao(null)
    setFormulacoesDisponiveis([])
    // Pré-carregar formulações só quando usuário escolher "trocar"
  }

  const carregarFormulacoes = async (categoriaDestino: string) => {
    if (!fazendaId) return
    setLoadingFormulacoes(true)
    const { data, error } = await supabase
      .from('formulacoes')
      .select('id, nome, categoria')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (error) {
      console.error('Erro ao carregar formulações:', error)
      setFormulacoesDisponiveis([])
    } else {
      // Soft mode: categoria destino primeiro, depois as outras
      const matched = (data as FormulacaoOpcao[]).filter(f => f.categoria?.toLowerCase() === categoriaDestino.toLowerCase())
      const others = (data as FormulacaoOpcao[]).filter(f => f.categoria?.toLowerCase() !== categoriaDestino.toLowerCase())
      setFormulacoesDisponiveis([...matched, ...others])
    }
    setLoadingFormulacoes(false)
  }

  useEffect(() => {
    if (recategorizando && !manterFormulacao && novaCategoria) {
      carregarFormulacoes(novaCategoria)
    }
  }, [manterFormulacao, novaCategoria, recategorizando])

  // Validação: peso fora da faixa da categoria destino
  const faixaDestino = faixas.find(f => f.nome.toLowerCase() === novaCategoria.toLowerCase() && f.sexo === (recategorizando?.sexo === 'fêmea' || recategorizando?.sexo === 'F' ? 'F' : 'M'))
  const pesoAtual = recategorizando?.peso_vivo_atual_kg_cab
  const pesoForaDaFaixa = faixaDestino && pesoAtual != null && (pesoAtual < faixaDestino.peso_min || pesoAtual > faixaDestino.peso_max)

  const confirmarRecategorizacao = async () => {
    if (!recategorizando || !novaCategoria) return
    if (!manterFormulacao && !formulacaoSelecionada) {
      setErroRecategorizacao('Selecione uma formulação ou escolha continuar com a atual.')
      return
    }
    setSubmitting(true)
    setErroRecategorizacao(null)
    const { data, error } = await supabase.rpc('recategorizar_lote_categoria', {
      p_lote_categoria_origem_id: recategorizando.id,
      p_categoria_destino: novaCategoria,
      p_manter_formulacao: manterFormulacao,
      p_nova_formulacao_id: manterFormulacao ? null : formulacaoSelecionada,
      p_usuario_id: user?.id || null,
      p_motivo: 'manual',
    })
    if (error) {
      setErroRecategorizacao(error.message)
    } else {
      setSucessoRecategorizacao(`Recategorização concluída. Novo ID: ${data}`)
      setRecategorizando(null)
      setConfirmRecategorizacao(false)
      loadCronologia()
      loadTransicoes()
    }
    setSubmitting(false)
  }

  if (loadingFazenda) {
    return (
      <div className="flex items-center justify-center py-12 animate-fade-in">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  if (!fazendaId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Nenhuma fazenda vinculada ao seu usuário</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Faixas de Categorias</h2>
        <p className="text-sm text-gray-500 mt-1">
          Defina as faixas de peso por categoria e acompanhe a cronologia evolutiva do rebanho.
        </p>
      </div>

      {/* Seção 1: Edição de faixas */}
      <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
          <h3 className="text-lg font-semibold text-gray-800">Faixas de Peso por Categoria</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSexoFiltro('M')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sexoFiltro === 'M' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Machos
            </button>
            <button
              onClick={() => setSexoFiltro('F')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sexoFiltro === 'F' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Fêmeas
            </button>
          </div>
        </div>

        {loadingFaixas ? (
          <CardSkeleton />
        ) : faixasDoSexo.length === 0 ? (
          <p className="text-gray-500 text-sm py-6 text-center">Nenhuma faixa cadastrada para {SEXO_LABEL[sexoFiltro]}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-3 font-medium">Ordem</th>
                  <th className="py-2 pr-3 font-medium">Categoria</th>
                  <th className="py-2 pr-3 font-medium">Peso Mín (kg)</th>
                  <th className="py-2 pr-3 font-medium">Peso Máx (kg)</th>
                  <th className="py-2 pr-3 font-medium">Cor</th>
                  <th className="py-2 pr-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {faixasDoSexo.map(faixa => (
                  <tr key={faixa.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        value={faixa.ordem}
                        onChange={(e) => handleFaixaChange(faixa.id, 'ordem', e.target.value)}
                        className="w-16 px-2 py-1 text-sm border-gray-200"
                      />
                    </td>
                    <td className="py-2 pr-3 font-medium text-gray-800">
                      <span className="inline-flex items-center gap-2">
                        {faixa.cor && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: faixa.cor }} />}
                        {faixa.nome}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        value={faixa.peso_min}
                        onChange={(e) => handleFaixaChange(faixa.id, 'peso_min', e.target.value)}
                        className="w-24 px-2 py-1 text-sm border-gray-200"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        value={faixa.peso_max}
                        onChange={(e) => handleFaixaChange(faixa.id, 'peso_max', e.target.value)}
                        className="w-24 px-2 py-1 text-sm border-gray-200"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="color"
                        value={faixa.cor || '#cccccc'}
                        onChange={(e) => handleFaixaChange(faixa.id, 'cor', e.target.value)}
                        className="w-10 h-8 rounded border border-gray-200 cursor-pointer"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Button
                        variant="secondary"
                        onClick={() => salvarFaixa(faixa.id)}
                        disabled={savingFaixaId === faixa.id}
                        className="text-xs px-3 py-1"
                      >
                        {savingFaixaId === faixa.id ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">
          As faixas são defaults editáveis por fazenda. Mudanças aqui não retroagem lotes já cadastrados.
        </p>
      </Card>

      {/* Seção 2: Cronologia dos lotes */}
      <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
          <h3 className="text-lg font-semibold text-gray-800">Cronologia dos Lotes</h3>
          {lotesDisponiveis.length > 0 && (
            <select
              value={loteSelecionadoId || ''}
              onChange={(e) => setLoteSelecionadoId(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {lotesDisponiveis.map(l => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
          )}
        </div>

        {loadingCronologia ? (
          <CardSkeleton />
        ) : categoriasDoLoteSelecionado.length === 0 ? (
          <p className="text-gray-500 text-sm py-6 text-center">Nenhuma categoria cadastrada para este lote.</p>
        ) : (
          <div className="space-y-3">
            {/* Linha do tempo visual */}
            <div className="flex items-center overflow-x-auto pb-2">
              {categoriasDoLoteSelecionado.map((cat, idx) => {
                const ativa = cat.data_fim === null && cat.ativo
                const faixaCor = faixas.find(f => f.nome.toLowerCase() === cat.categoria.toLowerCase())?.cor
                return (
                  <div key={cat.id} className="flex items-center flex-shrink-0">
                    <div
                      className={`px-3 py-2 rounded-lg text-xs font-medium border-2 ${ativa ? 'text-white' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                      style={ativa ? { backgroundColor: faixaCor || '#3b82f6', borderColor: faixaCor || '#3b82f6' } : {}}
                      title={ativa ? 'Categoria ativa' : `Encerrada em ${cat.data_fim ? new Date(cat.data_fim).toLocaleDateString('pt-BR') : '?'}`}
                    >
                      <p className="font-semibold">{cat.categoria}</p>
                      <p className="text-[10px] opacity-80">
                        {cat.peso_vivo_atual_kg_cab != null ? `${cat.peso_vivo_atual_kg_cab} kg` : 'sem peso'}
                        {cat.quant_atual != null && ` • ${cat.quant_atual} cab`}
                      </p>
                    </div>
                    {idx < categoriasDoLoteSelecionado.length - 1 && (
                      <svg className="w-5 h-5 mx-1 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Detalhe da categoria ativa + botão recategorizar */}
            {categoriaAtiva && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Categoria ativa: {categoriaAtiva.categoria}</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Peso atual: {categoriaAtiva.peso_vivo_atual_kg_cab != null ? `${categoriaAtiva.peso_vivo_atual_kg_cab} kg` : 'não informado'}
                      {categoriaAtiva.quant_atual != null && ` • ${categoriaAtiva.quant_atual} cabeças`}
                      {categoriaAtiva.sexo && ` • Sexo: ${categoriaAtiva.sexo}`}
                    </p>
                  </div>
                  <Button
                    onClick={() => abrirRecategorizacao(categoriaAtiva)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    Recategorizar
                  </Button>
                </div>
              </div>
            )}

            {/* Histórico de transições */}
            {transicoes.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Histórico de transições</h4>
                <div className="space-y-2">
                  {transicoes.map(t => (
                    <div key={t.id} className="flex items-center text-xs text-gray-600 bg-gray-50 rounded p-2">
                      <span className="font-medium">{new Date(t.data_transicao).toLocaleDateString('pt-BR')}</span>
                      <span className="mx-2">→</span>
                      <span>{t.categoria_origem}</span>
                      <span className="mx-2">→</span>
                      <span className="font-medium">{t.categoria_destino}</span>
                      {t.peso_na_transicao_kg != null && (
                        <span className="ml-2 text-gray-400">({t.peso_na_transicao_kg} kg)</span>
                      )}
                      <span className="ml-auto text-gray-400">{t.motivo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Modal de recategorização */}
      <Modal
        isOpen={!!recategorizando}
        onClose={() => { if (!submitting) setRecategorizando(null) }}
        title="Recategorizar lote"
      >
        {recategorizando && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p><span className="text-gray-500">Categoria atual:</span> <span className="font-medium">{recategorizando.categoria}</span></p>
              <p><span className="text-gray-500">Peso atual:</span> <span className="font-medium">{recategorizando.peso_vivo_atual_kg_cab ?? 'não informado'} kg</span></p>
              <p><span className="text-gray-500">Cabeças:</span> <span className="font-medium">{recategorizando.quant_atual ?? 'não informado'}</span></p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova categoria *</label>
              <input
                type="text"
                list="faixas-sugeridas"
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Digite ou selecione a nova categoria"
              />
              <datalist id="faixas-sugeridas">
                {faixas
                  .filter(f => f.sexo === (recategorizando.sexo === 'fêmea' || recategorizando.sexo === 'F' ? 'F' : 'M') && f.ativo)
                  .map(f => <option key={f.id} value={f.nome} />)}
              </datalist>
            </div>

            {pesoForaDaFaixa && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900">
                Aviso: o peso atual ({pesoAtual} kg) está fora da faixa de {faixaDestino.nome} ({faixaDestino.peso_min}-{faixaDestino.peso_max} kg). Você pode prosseguir, mas revise se a recategorização é apropriada.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Formulação nutricional</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={manterFormulacao}
                    onChange={() => setManterFormulacao(true)}
                  />
                  Continuar com a formulação atual
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!manterFormulacao}
                    onChange={() => setManterFormulacao(false)}
                  />
                  Trocar formulação
                </label>
              </div>
            </div>

            {!manterFormulacao && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecionar nova formulação *</label>
                {loadingFormulacoes ? (
                  <p className="text-xs text-gray-500">Carregando formulações...</p>
                ) : formulacoesDisponiveis.length === 0 ? (
                  <p className="text-xs text-gray-500">Nenhuma formulação ativa encontrada.</p>
                ) : (
                  <>
                    <select
                      value={formulacaoSelecionada}
                      onChange={(e) => setFormulacaoSelecionada(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Selecione...</option>
                      {formulacoesDisponiveis.map((f, idx) => {
                        const isMatched = f.categoria?.toLowerCase() === novaCategoria.toLowerCase()
                        const showSeparator = idx > 0 && isMatched && formulacoesDisponiveis[idx - 1].categoria?.toLowerCase() !== novaCategoria.toLowerCase()
                        return (
                          <Fragment key={f.id}>
                            {showSeparator && <option disabled>── outras categorias ──</option>}
                            <option value={f.id}>
                              {f.nome}{f.categoria ? ` (${f.categoria})` : ''}
                            </option>
                          </Fragment>
                        )
                      })}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      Formulações da categoria "{novaCategoria}" aparecem primeiro; as outras abaixo do separador.
                    </p>
                  </>
                )}
              </div>
            )}

            {erroRecategorizacao && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
                {erroRecategorizacao}
              </div>
            )}

            {sucessoRecategorizacao && (
              <div className="bg-green-50 border border-green-300 rounded-lg p-3 text-sm text-green-700">
                {sucessoRecategorizacao}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setRecategorizando(null)} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                onClick={() => setConfirmRecategorizacao(true)}
                disabled={submitting || !novaCategoria}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Recategorizar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={confirmRecategorizacao}
        onClose={() => setConfirmRecategorizacao(false)}
        onConfirm={confirmarRecategorizacao}
        title="Confirmar recategorização"
        message={
          recategorizando
            ? `Confirmar a recategorização de "${recategorizando.categoria}" para "${novaCategoria}"? Esta ação encerra a categoria atual, cria uma nova, registra um snapshot para auditoria e não pode ser desfeita.`
            : ''
        }
        confirmText="Confirmar"
        cancelText="Cancelar"
        variant="info"
      />
    </div>
  )
}
