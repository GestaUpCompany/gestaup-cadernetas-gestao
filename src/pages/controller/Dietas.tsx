import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal, CardItem } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface Dieta {
  id: string
  fazenda_id: string
  nome: string
  descricao?: string
  tipo?: string
  insumos?: DietaInsumoCalc[]
  meta_consumo_ms_percent_pv?: number
  peso_vivo_atual?: number
  custo_total?: number
  custo_diario_animal?: number
  consumo_diario_kg?: number
  teor_ms_dieta?: number
  custo_ms_tonelada?: number
  consumo_ms_total?: number
  ativo: boolean
  created_at: string
  updated_at: string
}

interface InsumoOption {
  id: string
  nome: string
  ms_percent?: number
  preco_ton?: number
}

interface DietaInsumoCalc {
  insumo_id: string
  nome: string
  ms_percent: number
  preco_ton: number
  formula_ms_percent: number
  formula_mn_bruta?: number
  formula_mn_percent?: number
  custo_tonelada?: number
  consumo_ms_kg_cab_dia?: number
  consumo_mn_kg_cab_dia?: number
  custo_dieta_reais_cab_dia?: number
}

export function Dietas() {
  const { user } = useAuth()
  const [dietas, setDietas] = useState<Dieta[]>([])
  const [insumos, setInsumos] = useState<InsumoOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDieta, setEditingDieta] = useState<Dieta | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: '',
    meta_consumo_ms_percent_pv: '0.30',
    peso_vivo_atual: '435',
    ativo: true,
  })
  const [selectedInsumos, setSelectedInsumos] = useState<DietaInsumoCalc[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [dietaToDelete, setDietaToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadDietas()
    loadInsumos()
  }, [user])

  const loadDietas = async () => {
    if (!user) return
    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)
    if (!vinculos || vinculos.length === 0) return
    const fazendaId = vinculos[0].fazenda_id

    const { data, error } = await supabase
      .from('dietas')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar dietas:', error)
    } else {
      setDietas(data as Dieta[])
    }
    setLoading(false)
  }

  const loadInsumos = async () => {
    if (!user) return
    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)
    if (!vinculos || vinculos.length === 0) return
    const fazendaId = vinculos[0].fazenda_id

    const { data } = await supabase
      .from('insumos')
      .select('id, nome, ms_percent, preco_ton')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .order('nome')

    setInsumos(data as InsumoOption[] || [])
  }

  // Calculate all derived fields
  const calcularFormulacao = (items: DietaInsumoCalc[]): DietaInsumoCalc[] => {
    const metaPV = parseFloat(formData.meta_consumo_ms_percent_pv) || 0
    const pesoVivo = parseFloat(formData.peso_vivo_atual) || 0
    const consumoMSTotal = pesoVivo * (metaPV / 100)

    // Step 1: Calculate formula_mn_bruta for each item
    const withBruta = items.map(item => {
      const ms = item.ms_percent / 100
      const mnBruta = ms > 0 ? (item.formula_ms_percent / ms) : 0
      return { ...item, formula_mn_bruta: mnBruta }
    })

    // Step 2: Normalize to 100%
    const totalBruta = withBruta.reduce((sum, i) => sum + (i.formula_mn_bruta || 0), 0)
    const withNormalized = withBruta.map(item => {
      const mnPercent = totalBruta > 0 ? ((item.formula_mn_bruta || 0) / totalBruta) * 100 : 0
      return { ...item, formula_mn_percent: parseFloat(mnPercent.toFixed(2)) }
    })

    // Step 3: Calculate costs and consumptions
    return withNormalized.map(item => {
      const ms = item.ms_percent / 100
      const custoTonelada = (item.formula_mn_percent || 0) * item.preco_ton / 100
      const consumoMS = consumoMSTotal * (item.formula_ms_percent / 100)
      const consumoMN = ms > 0 ? consumoMS / ms : 0
      const precoKg = item.preco_ton / 1000
      const custoDieta = consumoMN * precoKg
      return {
        ...item,
        custo_tonelada: parseFloat(custoTonelada.toFixed(2)),
        consumo_ms_kg_cab_dia: parseFloat(consumoMS.toFixed(3)),
        consumo_mn_kg_cab_dia: parseFloat(consumoMN.toFixed(3)),
        custo_dieta_reais_cab_dia: parseFloat(custoDieta.toFixed(2)),
      }
    })
  }

  const recalculated = calcularFormulacao(selectedInsumos)
  const custoTotal = parseFloat(recalculated.reduce((sum, i) => sum + (i.custo_tonelada || 0), 0).toFixed(2))
  const consumoMSTotal = parseFloat(recalculated.reduce((sum, i) => sum + (i.consumo_ms_kg_cab_dia || 0), 0).toFixed(3))
  const consumoMNTotal = parseFloat(recalculated.reduce((sum, i) => sum + (i.consumo_mn_kg_cab_dia || 0), 0).toFixed(3))
  const custoDiarioTotal = parseFloat(recalculated.reduce((sum, i) => sum + (i.custo_dieta_reais_cab_dia || 0), 0).toFixed(2))
  // Teor médio ponderado de MS da dieta (média pela formulação MN)
  const teorMSDieta = parseFloat((recalculated.reduce((sum, i) => sum + ((i.formula_mn_percent || 0) * i.ms_percent), 0) / 100).toFixed(2))
  // Custo da dieta em MS/ton (custo MN/ton ÷ teor MS como decimal)
  const custoMSToneladaRaw = teorMSDieta > 0 ? custoTotal / (teorMSDieta / 100) : 0
  const custoMSTonelada = parseFloat(custoMSToneladaRaw.toFixed(2))

  const handleAddInsumo = (insumoId: string) => {
    const insumo = insumos.find(i => i.id === insumoId)
    if (!insumo || selectedInsumos.some(s => s.insumo_id === insumoId)) return
    setSelectedInsumos(prev => [...prev, {
      insumo_id: insumo.id,
      nome: insumo.nome,
      ms_percent: insumo.ms_percent || 0,
      preco_ton: insumo.preco_ton || 0,
      formula_ms_percent: 0,
    }])
  }

  const handleRemoveInsumo = (index: number) => {
    setSelectedInsumos(prev => prev.filter((_, i) => i !== index))
  }

  const formulaMsTotal = selectedInsumos.reduce((sum, i) => sum + i.formula_ms_percent, 0)

  const handleFormulaChange = (index: number, val: number) => {
    setSelectedInsumos(prev => {
      const next = [...prev]
      const currentVal = next[index]?.formula_ms_percent || 0
      const otherSum = formulaMsTotal - currentVal
      const maxAllowed = Math.max(0, 100 - otherSum)
      const clamped = Math.min(val, maxAllowed)
      next[index] = { ...next[index], formula_ms_percent: clamped }
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

    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) {
      setSubmitting(false)
      return
    }

    const fazendaId = vinculos[0].fazenda_id
    const metaPV = parseFloat(formData.meta_consumo_ms_percent_pv) || 0
    const pesoVivo = parseFloat(formData.peso_vivo_atual) || 0

    const data = {
      fazenda_id: fazendaId,
      nome: formData.nome,
      descricao: formData.descricao || null,
      tipo: formData.tipo || null,
      meta_consumo_ms_percent_pv: metaPV,
      peso_vivo_atual: pesoVivo,
      insumos: recalculated as unknown as Record<string, unknown>[],
      custo_total: custoTotal,
      custo_diario_animal: custoDiarioTotal,
      consumo_diario_kg: consumoMNTotal,
      teor_ms_dieta: teorMSDieta,
      custo_ms_tonelada: custoMSTonelada,
      consumo_ms_total: consumoMSTotal,
      ativo: formData.ativo,
    }

    let error
    if (editingDieta) {
      const { error: updateError } = await supabase
        .from('dietas')
        .update(data)
        .eq('id', editingDieta.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('dietas').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar dieta:', error)
    } else {
      setFormData({
        nome: '',
        descricao: '',
        tipo: '',
        meta_consumo_ms_percent_pv: '0.30',
        peso_vivo_atual: '435',
        ativo: true,
      })
      setSelectedInsumos([])
      setShowForm(false)
      setEditingDieta(null)
      loadDietas()
    }
    setSubmitting(false)
  }

  const handleEdit = (dieta: Dieta) => {
    setEditingDieta(dieta)
    setFormData({
      nome: dieta.nome,
      descricao: dieta.descricao || '',
      tipo: dieta.tipo || '',
      meta_consumo_ms_percent_pv: dieta.meta_consumo_ms_percent_pv?.toString() || '0.30',
      peso_vivo_atual: dieta.peso_vivo_atual?.toString() || '435',
      ativo: dieta.ativo,
    })
    setSelectedInsumos(dieta.insumos?.map(i => ({
      insumo_id: i.insumo_id,
      nome: i.nome,
      ms_percent: i.ms_percent,
      preco_ton: i.preco_ton,
      formula_ms_percent: i.formula_ms_percent,
      formula_mn_bruta: i.formula_mn_bruta,
      formula_mn_percent: i.formula_mn_percent,
      custo_tonelada: i.custo_tonelada,
      consumo_ms_kg_cab_dia: i.consumo_ms_kg_cab_dia,
      consumo_mn_kg_cab_dia: i.consumo_mn_kg_cab_dia,
      custo_dieta_reais_cab_dia: i.custo_dieta_reais_cab_dia,
    })) || [])
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingDieta(null)
    setFormData({
      nome: '',
      descricao: '',
      tipo: '',
      meta_consumo_ms_percent_pv: '0.30',
      peso_vivo_atual: '435',
      ativo: true,
    })
    setSelectedInsumos([])
    setShowForm(false)
  }

  const handleDeleteClick = (id: string) => {
    setDietaToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!dietaToDelete) return

    const { error } = await supabase.from('dietas').delete().eq('id', dietaToDelete)

    if (error) {
      console.error('Erro ao excluir dieta:', error)
    } else {
      loadDietas()
    }

    setDietaToDelete(null)
    setShowDeleteModal(false)
  }

  const handleToggleActive = async (dieta: Dieta) => {
    const { error } = await supabase
      .from('dietas')
      .update({ ativo: !dieta.ativo })
      .eq('id', dieta.id)

    if (error) {
      console.error('Erro ao atualizar dieta:', error)
    } else {
      loadDietas()
    }
  }

  const shortcuts = [
    {
      key: 'f',
      ctrl: true,
      description: 'Buscar dietas',
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
        <h2 className="text-2xl font-bold text-gray-800">Dietas</h2>
        <div className="flex gap-2 items-start">
          <Input
            type="text"
            placeholder="Buscar dieta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs border-gray-200 focus:border-accent h-10"
          />
          <Button onClick={() => setShowForm(true)} className="h-10">Nova Dieta</Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-gray-800">
              {editingDieta ? 'Editar Formulação' : 'Nova Formulação'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <Input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  placeholder="Nome da dieta"
                  className="border-gray-200 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <Input
                  type="text"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  placeholder="Ex: Engorda, Terminação"
                  className="border-gray-200 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Consumo MS/%PV</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Peso Vivo Atual (kg)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.peso_vivo_atual}
                  onChange={(e) => setFormData({ ...formData, peso_vivo_atual: e.target.value })}
                  placeholder="Ex: 435"
                  className="border-gray-200 focus:border-accent"
                />
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
                    {i.nome} {i.ms_percent !== undefined ? `(MS: ${i.ms_percent}%)` : ''} {i.preco_ton !== undefined ? `- R$ ${i.preco_ton}/ton` : ''}
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
                      <th className="text-left p-2 font-medium text-gray-700">Form. Proteinado</th>
                      <th className="text-right p-2 font-medium text-gray-700">MS Insumo (%)</th>
                      <th className="text-right p-2 font-medium text-gray-700">Preço (R$/ton)</th>
                      <th className="text-right p-2 font-medium text-gray-700 bg-green-50 w-28">Form. MS (%)</th>
                      <th className="text-right p-2 font-medium text-gray-700">Form. MN (%)</th>
                      <th className="text-right p-2 font-medium text-gray-700">Custo Dieta (R$/ton)</th>
                      <th className="text-right p-2 font-medium text-gray-700">Consumo MS (kg/cab/dia)</th>
                      <th className="text-right p-2 font-medium text-gray-700">Consumo MN (kg/cab/dia)</th>
                      <th className="text-right p-2 font-medium text-gray-700">Custo Dieta (R$/cab/dia)</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recalculated.map((item, idx) => (
                      <tr key={item.insumo_id + idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-2 font-medium text-gray-800">{item.nome}</td>
                        <td className="p-2 text-right text-gray-600">{item.ms_percent.toFixed(2)}%</td>
                        <td className="p-2 text-right text-gray-600">
                          R$ {item.preco_ton.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right bg-green-50 w-28">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.formula_ms_percent.toString()}
                            onChange={(e) => handleFormulaChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-20 text-right border-gray-200 focus:border-accent py-1"
                          />
                        </td>
                        <td className="p-2 text-right text-gray-600">{(item.formula_mn_percent || 0).toFixed(2)}%</td>
                        <td className="p-2 text-right text-gray-600">
                          R$ {(item.custo_tonelada || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right text-gray-600">{(item.consumo_ms_kg_cab_dia || 0).toFixed(3)}</td>
                        <td className="p-2 text-right text-gray-600">{(item.consumo_mn_kg_cab_dia || 0).toFixed(3)}</td>
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
                        {teorMSDieta.toFixed(2)}%
                        <span className="absolute bottom-0 right-0 w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-yellow-400"></span>
                      </td>
                      <td className="p-2"></td>
                      <td className={`p-2 text-right ${Math.abs(formulaMsTotal - 100) < 0.01 ? 'text-green-700' : 'text-amber-600'}`}>
                        {formulaMsTotal.toFixed(2)}%
                      </td>
                      <td className="p-2 text-right text-gray-800">
                        {recalculated.reduce((s, i) => s + (i.formula_mn_percent || 0), 0).toFixed(2)}%
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
                      <td className="p-2 text-right text-gray-800">{consumoMSTotal.toFixed(3)}</td>
                      <td className="p-2 text-right text-gray-800">{consumoMNTotal.toFixed(3)}</td>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-green-50 p-4 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Meta Consumo MS/%PV</label>
                  <div className="text-lg font-bold text-green-800">
                    {formData.meta_consumo_ms_percent_pv}%
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Peso Vivo Atual (kg)</label>
                  <div className="text-lg font-bold text-green-800">
                    {formData.peso_vivo_atual}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Consumo MS (kg/cab/dia)</label>
                  <div className="text-lg font-bold text-green-800">
                    {consumoMSTotal.toFixed(3)}
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

      {!showForm && dietas.length === 0 ? (
        <Card className="bg-white p-12 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4">Nenhuma formulação cadastrada</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeira Formulação</Button>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dietas
            .filter((dieta) =>
              dieta.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (dieta.tipo && dieta.tipo.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .map((dieta) => (
              <CardItem
                key={dieta.id}
                title={dieta.nome}
                subtitle={dieta.tipo}
                status={dieta.ativo}
                onClick={() => handleEdit(dieta)}
              >
                <div className="space-y-1 mb-4 text-sm text-gray-600">
                  {dieta.meta_consumo_ms_percent_pv != null && (
                    <p><span className="font-medium">Meta MS/%PV:</span> {dieta.meta_consumo_ms_percent_pv}%</p>
                  )}
                  {dieta.peso_vivo_atual != null && (
                    <p><span className="font-medium">PV:</span> {dieta.peso_vivo_atual} kg</p>
                  )}
                  {dieta.teor_ms_dieta != null && (
                    <p><span className="font-medium">Teor MS:</span> {dieta.teor_ms_dieta.toFixed(2)}%</p>
                  )}
                  {dieta.consumo_ms_total != null && (
                    <p><span className="font-medium">Consumo MS:</span> {dieta.consumo_ms_total.toFixed(3)} kg</p>
                  )}
                  {dieta.custo_diario_animal != null && (
                    <p><span className="font-medium">Custo/dia:</span> R$ {dieta.custo_diario_animal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  )}
                  {dieta.insumos && dieta.insumos.length > 0 && (
                    <p><span className="font-medium">Insumos:</span> {dieta.insumos.length}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 sm:gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleActive(dieta)
                    }}
                  >
                    {dieta.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(dieta)
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
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
        title="Excluir Dieta"
        message="Tem certeza que deseja excluir esta dieta? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
