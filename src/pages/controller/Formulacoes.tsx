import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal, CardItem } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { getFazendaIdForUser } from '../../utils/fazendaContext'

function fmt(n: number, digits = 2): string {
  return n.toFixed(digits).replace('.', ',')
}

function parseCommaDecimal(val: string): number {
  const cleaned = val.replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

interface Dieta {
  id: string
  fazenda_id: string
  nome: string
  descricao?: string
  tipo?: string
  categoria?: string
  insumos?: DietaInsumoCalc[]
  meta_consumo_ms_percent_pv?: number
  peso_vivo_medio?: number
  gmd?: number
  sistema_producao?: string
  custo_total?: number
  custo_dieta_reais_cab_dia?: number
  consumo_mn_kg_cab_dia?: number
  teor_ms_dieta?: number
  custo_ms_tonelada?: number
  custo_mn_tonelada?: number
  consumo_ms_kg_cab_dia?: number
  ativo: boolean
  categoria_inferida_automaticamente?: boolean
  categoria_inferida_observacao?: string
  created_at: string
  updated_at: string
}

interface InsumoOption {
  id: string
  nome: string
  teor_ms?: number
  preco_ton_mn?: number
}

interface DietaInsumoCalc {
  insumo_id: string
  nome: string
  teor_ms: number
  preco_ton_mn: number
  formula_teor_ms: number
  formula_mn_bruta?: number
  formula_mn_percent?: number
  custo_tonelada?: number
  consumo_ms_kg_cab_dia?: number
  consumo_mn_kg_cab_dia?: number
  custo_dieta_reais_cab_dia?: number
}

function FormulaMsInput({
  id,
  value,
  onChange,
  className,
}: {
  id: string
  value: number
  onChange: (val: number) => void
  className?: string
}) {
  const [raw, setRaw] = useState(value.toFixed(2).replace('.', ','))

  useEffect(() => {
    const formatted = value.toFixed(2).replace('.', ',')
    // Only sync from prop if user is not actively editing (avoids cursor jump)
    if (document.activeElement !== document.getElementById(id)) {
      setRaw(formatted)
    }
  }, [value, id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace('.', ',')
    // Allow only digits and at most one comma
    v = v.replace(/[^\d,]/g, '')
    const parts = v.split(',')
    if (parts.length > 2) {
      v = parts[0] + ',' + parts.slice(1).join('')
    }
    setRaw(v)
  }

  const handleBlur = () => {
    const num = parseFloat(raw.replace(',', '.')) || 0
    onChange(num)
    setRaw(num.toFixed(2).replace('.', ','))
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={raw}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  )
}

export function Formulacoes() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [formulacoes, setFormulacoes] = useState<Dieta[]>([])
  const [insumos, setInsumos] = useState<InsumoOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingFormulacao, setEditingFormulacao] = useState<Dieta | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: '',
    categoria: '',
    meta_consumo_ms_percent_pv: '0.30',
    peso_vivo_medio: '435.00',
    gmd: '0,000',
    sistema_producao: '',
    ativo: true,
  })
  const [selectedInsumos, setSelectedInsumos] = useState<DietaInsumoCalc[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [formulacaoToDelete, setFormulacaoToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadFormulacoes()
    loadInsumos()
  }, [user])

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && formulacoes.length > 0) {
      const formulacaoToEdit = formulacoes.find(f => f.id === editId)
      if (formulacaoToEdit) {
        handleEdit(formulacaoToEdit)
      }
    }
  }, [searchParams, formulacoes])

  const loadFormulacoes = async () => {
    if (!user) return
    const _fazendaId = await getFazendaIdForUser(user.id)
    const vinculos = _fazendaId ? [{ fazenda_id: _fazendaId }] : []
    if (!vinculos || vinculos.length === 0) return
    const fazendaId = vinculos[0].fazenda_id

    const { data, error } = await supabase
      .from('formulacoes')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar formulações:', error)
    } else {
      setFormulacoes(data as Dieta[])
    }
    setLoading(false)
  }

  const loadInsumos = async () => {
    if (!user) return
    const _fazendaId = await getFazendaIdForUser(user.id)
    const vinculos = _fazendaId ? [{ fazenda_id: _fazendaId }] : []
    if (!vinculos || vinculos.length === 0) return
    const fazendaId = vinculos[0].fazenda_id

    const { data } = await supabase
      .from('insumos')
      .select('id, nome, teor_ms, preco_ton_mn')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .order('nome')

    setInsumos(data as InsumoOption[] || [])
  }

  // Calculate all derived fields
  const calcularFormulacao = (items: DietaInsumoCalc[]): DietaInsumoCalc[] => {
    const metaPV = parseFloat(formData.meta_consumo_ms_percent_pv) || 0
    const pesoVivo = parseFloat(formData.peso_vivo_medio) || 0
    const consumoMSTotal = pesoVivo * (metaPV / 100)

    // Step 1: Calculate formula_mn_bruta for each item (keep full precision)
    const withBruta = items.map(item => {
      const ms = item.teor_ms / 100
      const mnBruta = ms > 0 ? (item.formula_teor_ms / ms) : 0
      return { ...item, formula_mn_bruta: mnBruta }
    })

    // Step 2: Normalize to 100% (keep 4 decimal places for percent)
    const totalBruta = withBruta.reduce((sum, i) => sum + (i.formula_mn_bruta || 0), 0)
    const withNormalized = withBruta.map(item => {
      const mnPercent = totalBruta > 0 ? ((item.formula_mn_bruta || 0) / totalBruta) * 100 : 0
      return { ...item, formula_mn_percent: mnPercent }
    })

    // Step 3: Calculate costs and consumptions (keep full precision, round only at display)
    return withNormalized.map(item => {
      const ms = item.teor_ms / 100
      const custoTonelada = (item.formula_mn_percent || 0) * item.preco_ton_mn / 100
      const consumoMS = consumoMSTotal * (item.formula_teor_ms / 100)
      const consumoMN = ms > 0 ? consumoMS / ms : 0
      const precoKg = item.preco_ton_mn / 1000
      const custoDieta = consumoMN * precoKg
      return {
        ...item,
        custo_tonelada: custoTonelada,
        consumo_ms_kg_cab_dia: consumoMS,
        consumo_mn_kg_cab_dia: consumoMN,
        custo_dieta_reais_cab_dia: custoDieta,
      }
    })
  }

  const recalculated = useMemo(
    () => calcularFormulacao(selectedInsumos),
    [selectedInsumos, formData.meta_consumo_ms_percent_pv, formData.peso_vivo_medio]
  )

  // Compute totals from exact (unrounded) values
  const custoTotalExact = recalculated.reduce((sum, i) => sum + (i.custo_tonelada || 0), 0)
  const consumoMSTotalExact = recalculated.reduce((sum, i) => sum + (i.consumo_ms_kg_cab_dia || 0), 0)
  const consumoMNTotalExact = recalculated.reduce((sum, i) => sum + (i.consumo_mn_kg_cab_dia || 0), 0)
  const custoDiarioTotalExact = recalculated.reduce((sum, i) => sum + (i.custo_dieta_reais_cab_dia || 0), 0)
  const teorMSDietaExact = recalculated.reduce((sum, i) => sum + ((i.formula_mn_percent || 0) * i.teor_ms), 0) / 100

  const custoTotal = parseFloat(custoTotalExact.toFixed(2))
  const consumoMSTotal = parseFloat(consumoMSTotalExact.toFixed(3))
  const consumoMNTotal = parseFloat(consumoMNTotalExact.toFixed(3))
  const custoDiarioTotal = parseFloat(custoDiarioTotalExact.toFixed(2))
  const teorMSDieta = parseFloat(teorMSDietaExact.toFixed(2))
  const custoMSToneladaRaw = teorMSDieta > 0 ? custoTotalExact / (teorMSDietaExact / 100) : 0
  const custoMSTonelada = parseFloat(custoMSToneladaRaw.toFixed(2))

  const handleAddInsumo = (insumoId: string) => {
    const insumo = insumos.find(i => i.id === insumoId)
    if (!insumo || selectedInsumos.some(s => s.insumo_id === insumoId)) return
    setSelectedInsumos(prev => [...prev, {
      insumo_id: insumo.id,
      nome: insumo.nome,
      teor_ms: insumo.teor_ms || 0,
      preco_ton_mn: insumo.preco_ton_mn || 0,
      formula_teor_ms: 0,
    }])
  }

  const handleRemoveInsumo = (index: number) => {
    setSelectedInsumos(prev => prev.filter((_, i) => i !== index))
  }

  const formulaMsTotal = selectedInsumos.reduce((sum, i) => sum + i.formula_teor_ms, 0)

  const handleFormulaChange = (index: number, val: number) => {
    setSelectedInsumos(prev => {
      const next = [...prev]
      const currentVal = next[index]?.formula_teor_ms || 0
      const otherSum = formulaMsTotal - currentVal
      const maxAllowed = Math.max(0, 100 - otherSum)
      const clamped = Math.min(val, maxAllowed)
      next[index] = { ...next[index], formula_teor_ms: parseFloat(clamped.toFixed(2)) }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    if (!user) {
      setSubmitting(false)
      return
    }

    const _fazendaId = await getFazendaIdForUser(user.id)
    const vinculos = _fazendaId ? [{ fazenda_id: _fazendaId }] : []

    if (!vinculos || vinculos.length === 0) {
      setSubmitting(false)
      return
    }

    const fazendaId = vinculos[0].fazenda_id
    const metaPV = parseFloat(parseFloat(formData.meta_consumo_ms_percent_pv || '0').toFixed(2))
    const pesoVivo = parseFloat(parseFloat(formData.peso_vivo_medio || '0').toFixed(2))
    const gmd = parseFloat(parseCommaDecimal(formData.gmd || '0').toFixed(3))

    const data = {
      fazenda_id: fazendaId,
      nome: formData.nome,
      descricao: formData.descricao || null,
      tipo: formData.tipo || null,
      categoria: formData.categoria || null,
      meta_consumo_ms_percent_pv: metaPV,
      peso_vivo_medio: pesoVivo,
      gmd: gmd || null,
      sistema_producao: formData.sistema_producao || null,
      insumos: recalculated as unknown as Record<string, unknown>[],
      custo_total: custoTotal,
      custo_dieta_reais_cab_dia: custoDiarioTotal,
      consumo_mn_kg_cab_dia: consumoMNTotal,
      teor_ms_dieta: teorMSDieta,
      custo_ms_tonelada: custoMSTonelada,
      custo_mn_tonelada: custoTotal,
      consumo_ms_kg_cab_dia: consumoMSTotal,
      ativo: formData.ativo,
      categoria_inferida_automaticamente: false,
      categoria_inferida_observacao: null,
    }

    let error
    if (editingFormulacao) {
      const { error: updateError } = await supabase
        .from('formulacoes')
        .update(data)
        .eq('id', editingFormulacao.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('formulacoes').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar formulação:', error)
    } else {
      setFormData({
        nome: '',
        descricao: '',
        tipo: '',
        categoria: '',
        meta_consumo_ms_percent_pv: '0.30',
        peso_vivo_medio: '435.00',
        gmd: '0,000',
        sistema_producao: '',
        ativo: true,
      })
      setSelectedInsumos([])
      setShowForm(false)
      setEditingFormulacao(null)
      loadFormulacoes()
    }
    setSubmitting(false)
  }

  const handleEdit = (dieta: Dieta) => {
    setEditingFormulacao(dieta)
    setFormData({
      nome: dieta.nome,
      descricao: dieta.descricao || '',
      tipo: dieta.tipo || '',
      categoria: dieta.categoria || '',
      meta_consumo_ms_percent_pv: dieta.meta_consumo_ms_percent_pv?.toFixed(2) || '0.30',
      peso_vivo_medio: dieta.peso_vivo_medio?.toFixed(2) || '435.00',
      gmd: dieta.gmd?.toFixed(3).replace('.', ',') || '0,000',
      sistema_producao: dieta.sistema_producao || '',
      ativo: dieta.ativo,
    })
    setSelectedInsumos(dieta.insumos?.map(i => ({
      insumo_id: i.insumo_id,
      nome: i.nome,
      teor_ms: (i as any).teor_ms ?? (i as any).ms_percent ?? 0,
      preco_ton_mn: (i as any).preco_ton_mn ?? (i as any).preco_ton ?? 0,
      formula_teor_ms: (i as any).formula_teor_ms ?? (i as any).formula_ms_percent ?? 0,
      formula_mn_bruta: (i as any).formula_mn_bruta ?? 0,
      formula_mn_percent: (i as any).formula_mn_percent ?? 0,
      custo_tonelada: (i as any).custo_tonelada ?? 0,
      consumo_ms_kg_cab_dia: (i as any).consumo_ms_kg_cab_dia ?? 0,
      consumo_mn_kg_cab_dia: (i as any).consumo_mn_kg_cab_dia ?? 0,
      custo_dieta_reais_cab_dia: (i as any).custo_dieta_reais_cab_dia ?? 0,
    })) || [])
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingFormulacao(null)
    setFormData({
      nome: '',
      descricao: '',
      tipo: '',
      categoria: '',
      meta_consumo_ms_percent_pv: '0.30',
      peso_vivo_medio: '435.00',
      gmd: '0,000',
      sistema_producao: '',
      ativo: true,
    })
    setSelectedInsumos([])
    setShowForm(false)
  }

  const handleDeleteClick = (id: string) => {
    setFormulacaoToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!formulacaoToDelete) return

    const { error } = await supabase.from('formulacoes').delete().eq('id', formulacaoToDelete)

    if (error) {
      console.error('Erro ao excluir formulação:', error)
    } else {
      loadFormulacoes()
    }

    setFormulacaoToDelete(null)
    setShowDeleteModal(false)
  }

  const handleToggleActive = async (dieta: Dieta) => {
    const { error } = await supabase
      .from('formulacoes')
      .update({ ativo: !dieta.ativo })
      .eq('id', dieta.id)

    if (error) {
      console.error('Erro ao atualizar formulação:', error)
    } else {
      loadFormulacoes()
    }
  }

  const shortcuts = [
    {
      key: 'f',
      ctrl: true,
      description: 'Buscar formulações',
      action: () => {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
        searchInput?.focus()
      },
    },
    {
      key: 'Escape',
      description: 'Fechar formulário',
      action: () => {
        if (showForm) handleCancel()
      },
    },
  ]

  useKeyboardShortcuts(shortcuts)

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Formulações</h2>
        <div className="flex gap-2 items-start">
          <Input
            type="text"
            placeholder="Buscar formulação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs border-gray-200 focus:border-accent h-10"
          />
          <Button onClick={() => setShowForm(true)} className="h-10">Nova Formulação</Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-gray-800">
              {editingFormulacao ? 'Editar Formulação' : 'Nova Formulação'}
            </h3>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="Fechar formulário"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">Nome *</label>
                <Input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  placeholder="Nome da formulação"
                  className="border-gray-200 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">Tipo</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary input-focus min-h-[44px] text-sm sm:text-base border-gray-200 focus:border-accent bg-white"
                >
                  <option value="">Selecione...</option>
                  <option value="Sal Mineral">Sal Mineral</option>
                  <option value="Sal Adensado">Sal Adensado</option>
                  <option value="Proteico">Proteico</option>
                  <option value="Proteico-Energético">Proteico-Energético</option>
                  <option value="Ração">Ração</option>
                  <option value="Premix">Premix</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">Categoria *</label>
                {editingFormulacao?.categoria_inferida_automaticamente && (
                  <div className="mb-2 p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900">
                    <p className="font-semibold mb-1">Categoria preenchida automaticamente</p>
                    <p>
                      A categoria desta formulação foi inferida automaticamente a partir do nome e parâmetros. É fortemente recomendado que você confirme manualmente o valor correto abaixo.
                    </p>
                    {editingFormulacao.categoria_inferida_observacao && (
                      <p className="mt-2 italic">Observação: {editingFormulacao.categoria_inferida_observacao}</p>
                    )}
                  </div>
                )}
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  required
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary input-focus min-h-[44px] text-sm sm:text-base border-gray-200 focus:border-accent bg-white"
                >
                  <option value="">Selecione...</option>
                  <option value="vaca">Vaca</option>
                  <option value="touro">Touro</option>
                  <option value="boi gordo">Boi Gordo</option>
                  <option value="boi magro">Boi Magro</option>
                  <option value="garrote">Garrote</option>
                  <option value="bezerro">Bezerro</option>
                  <option value="bezerro ao pé">Bezerro ao Pé</option>
                  <option value="bezerra">Bezerra</option>
                  <option value="bezerra ao pé">Bezerra ao Pé</option>
                  <option value="novilha">Novilha</option>
                  <option value="tropa">Tropa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">Descrição</label>
                <Input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição opcional"
                  className="border-gray-200 focus:border-accent"
                />
              </div>
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">Meta Consumo MS (%PV)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.meta_consumo_ms_percent_pv}
                  onChange={(e) => setFormData({ ...formData, meta_consumo_ms_percent_pv: e.target.value })}
                  placeholder="Ex: 0.30"
                  className="border-gray-200 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">Peso Vivo Médio (kg)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.peso_vivo_medio}
                  onChange={(e) => setFormData({ ...formData, peso_vivo_medio: e.target.value })}
                  placeholder="Ex: 435"
                  className="border-gray-200 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">GMD Planejado (kg/Cab/Dia)</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.gmd}
                  onChange={(e) => {
                    const value = e.target.value.replace('.', ',')
                    setFormData({ ...formData, gmd: value })
                  }}
                  placeholder="Ex: 0,300"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">Sistema de Produção</label>
                <select
                  value={formData.sistema_producao}
                  onChange={(e) => setFormData({ ...formData, sistema_producao: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary input-focus min-h-[44px] text-sm sm:text-base border-gray-200 focus:border-accent bg-white"
                >
                  <option value="">Selecione...</option>
                  <option value="Cria">Cria</option>
                  <option value="Recria">Recria</option>
                  <option value="Engorda">Engorda</option>
                </select>
              </div>
            </div>

            {/* Add insumo */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Adicionar Insumo</label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddInsumo(e.target.value)
                    e.target.value = ''
                  }
                }}
                className="w-full sm:max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px] bg-white text-sm"
              >
                <option value="">Selecione um insumo...</option>
                {insumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome} {i.teor_ms !== undefined ? `(Teor MS: ${i.teor_ms}%)` : ''} {i.preco_ton_mn !== undefined ? `- R$ ${i.preco_ton_mn}/Ton/MN` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Formulation Table */}
            {selectedInsumos.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left p-2 font-medium text-gray-700">Insumos</th>
                      <th className="text-right p-2 font-medium text-gray-700">Teor MS (%)</th>
                      <th className="text-right p-2 font-medium text-gray-700">Preço (R$/Ton/MN)</th>
                      <th className="text-right p-2 font-medium text-gray-700 bg-green-50 w-28">Form. MS (%)</th>
                      <th className="text-right p-2 font-medium text-gray-700">Form. MN (%)</th>
                      <th className="text-right p-2 font-medium text-gray-700">Custo Dieta (R$/Ton)</th>
                      <th className="text-right p-2 font-medium text-gray-700">Consumo MS (kg/Cab/Dia)</th>
                      <th className="text-right p-2 font-medium text-gray-700">Consumo MN (kg/Cab/Dia)</th>
                      <th className="text-right p-2 font-medium text-gray-700">Custo Dieta (R$/Cab/Dia)</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recalculated.map((item, idx) => (
                      <tr key={item.insumo_id + idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-2 font-medium text-gray-800">{item.nome}</td>
                        <td className="p-2 text-right text-gray-600">{fmt(item.teor_ms)}%</td>
                        <td className="p-2 text-right text-gray-600">
                          R$ {(item.preco_ton_mn || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right bg-green-50 w-28">
                          <FormulaMsInput
                            id={`formula-ms-${idx}`}
                            value={item.formula_teor_ms}
                            onChange={(val) => handleFormulaChange(idx, val)}
                            className="w-20 text-right border-gray-200 focus:border-accent py-1"
                          />
                        </td>
                        <td className="p-2 text-right text-gray-600">{fmt(item.formula_mn_percent || 0)}%</td>
                        <td className="p-2 text-right text-gray-600">
                          R$ {(item.custo_tonelada || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right text-gray-600">{fmt(item.consumo_ms_kg_cab_dia || 0, 3)}</td>
                        <td className="p-2 text-right text-gray-600">{fmt(item.consumo_mn_kg_cab_dia || 0, 3)}</td>
                        <td className="p-2 text-right text-gray-600">
                          R$ {(item.custo_dieta_reais_cab_dia || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveInsumo(idx)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Total row */}
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                      <td className="p-2 text-gray-800">Total</td>
                      <td className="p-2 text-right text-gray-800 relative" title="Teor de Matéria Seca da Dieta">
                        {fmt(teorMSDieta)}%
                        <span className="absolute bottom-0 right-0 w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-yellow-400"></span>
                      </td>
                      <td className="p-2"></td>
                      <td className={`p-2 text-right ${Math.abs(formulaMsTotal - 100) < 0.01 ? 'text-green-700' : 'text-amber-600'}`}>
                        {fmt(formulaMsTotal)}%
                      </td>
                      <td className="p-2 text-right text-gray-800">
                        {fmt(recalculated.reduce((s, i) => s + (i.formula_mn_percent || 0), 0))}%
                      </td>
                      <td className="p-2 text-right text-gray-800">
                        <div>
                          R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-gray-800 font-medium relative" title="Custo da dieta na MS">
                          R$ {custoMSTonelada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="absolute bottom-0 right-0 w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-yellow-400"></span>
                        </div>
                      </td>
                      <td className="p-2 text-right text-gray-800">{fmt(consumoMSTotal, 3)}</td>
                      <td className="p-2 text-right text-gray-800">{fmt(consumoMNTotal, 3)}</td>
                      <td className="p-2 text-right text-gray-800">
                        R$ {custoDiarioTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary parameters */}
            {selectedInsumos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-green-50 p-4 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Meta Consumo MS (%PV)</label>
                  <div className="text-lg font-bold text-green-800">
                    {fmt(parseFloat(formData.meta_consumo_ms_percent_pv || '0'))}%
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Peso Vivo Médio (kg)</label>
                  <div className="text-lg font-bold text-green-800">
                    {fmt(parseFloat(formData.peso_vivo_medio || '0'))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">GMD Planejado (kg/Cab/Dia)</label>
                  <div className="text-lg font-bold text-green-800">
                    {fmt(parseFloat(formData.gmd || '0'), 3)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sistema de Produção</label>
                  <div className="text-lg font-bold text-green-800">
                    {formData.sistema_producao || '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Consumo MS (kg/cab/dia)</label>
                  <div className="text-lg font-bold text-green-800">
                    {fmt(consumoMSTotal, 3)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar Formulação'}
              </Button>
              <Button variant="secondary" onClick={handleCancel}>
                Cancelar
              </Button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, ativo: !formData.ativo })}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 border-2 ${
                  formData.ativo
                    ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                }`}
              >
                {formData.ativo ? '✓ Ativo' : '✗ Inativo'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {!showForm && formulacoes.length === 0 ? (
        <Card className="bg-white p-12 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4">Nenhuma formulação cadastrada</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeira Formulação</Button>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formulacoes
            .filter((dieta) =>
              dieta.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (dieta.tipo && dieta.tipo.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .map((dieta) => (
              <CardItem
                key={dieta.id}
                title={dieta.nome}
                subtitle={dieta.categoria ? `${(dieta.tipo || 'Sem tipo').replace(/\b\w/g, (c) => c.toUpperCase())} • ${dieta.categoria.replace(/\b\w/g, (c) => c.toUpperCase())}` : (dieta.tipo ? dieta.tipo.replace(/\b\w/g, (c) => c.toUpperCase()) : undefined)}
                status={dieta.ativo}
                onClick={() => handleEdit(dieta)}
              >
                <div className="space-y-1 mb-4 text-sm text-gray-600">
                  {dieta.meta_consumo_ms_percent_pv != null && (
                    <p><span className="font-medium">Meta MS (%PV):</span> {fmt(dieta.meta_consumo_ms_percent_pv)}%</p>
                  )}
                  {dieta.peso_vivo_medio != null && (
                    <p><span className="font-medium">PV Médio:</span> {fmt(dieta.peso_vivo_medio)} kg</p>
                  )}
                  {dieta.gmd != null && (
                    <p><span className="font-medium">GMD Planejado:</span> {fmt(dieta.gmd, 3)} kg/Cab/Dia</p>
                  )}
                  {dieta.sistema_producao && (
                    <p><span className="font-medium">Sistema:</span> {dieta.sistema_producao}</p>
                  )}
                  {dieta.teor_ms_dieta != null && (
                    <p><span className="font-medium">Teor MS:</span> {fmt(dieta.teor_ms_dieta)}%</p>
                  )}
                  {dieta.consumo_ms_kg_cab_dia != null && (
                    <p><span className="font-medium">Consumo MS:</span> {fmt(dieta.consumo_ms_kg_cab_dia, 3)} kg</p>
                  )}
                  {dieta.custo_dieta_reais_cab_dia != null && (
                    <p><span className="font-medium">Custo/dia:</span> R$ {dieta.custo_dieta_reais_cab_dia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  )}
                  {dieta.insumos && dieta.insumos.length > 0 && (
                    <p><span className="font-medium">Insumos:</span> {dieta.insumos.length}</p>
                  )}
                </div>

                <div className="flex gap-2 mt-auto pt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(dieta)
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-red-600 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleActive(dieta)
                    }}
                  >
                    {dieta.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-red-600 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(dieta.id)
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </CardItem>
            ))}
        </div>
      ) : null}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Formulação"
        message="Tem certeza que deseja excluir esta formulação? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
