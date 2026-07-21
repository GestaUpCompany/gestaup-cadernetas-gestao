import { useEffect, useMemo, useState } from 'react'
import { Button, Input, NumericInput, Modal } from '../ui'

interface Formulacao {
  id: string
  nome: string
  tipo?: string | null
  gmd?: number | null
  meta_consumo_ms_percent_pv?: number | null
  categoria?: string | null
}

export interface PlanoRascunho {
  id?: string
  nome: string
  formulacao_id: string
  periodo_dias: number
  peso_meta_kg: number
  ordem: number
  condicao_migracao: 'periodo' | 'peso' | 'ambos'
}

interface PlanoNutricionalDraftModalProps {
  isOpen: boolean
  onClose: () => void
  categoria: string
  formulacoes: Formulacao[]
  planos: PlanoRascunho[]
  onSave: (planos: PlanoRascunho[]) => void
}

const CONDICOES: Record<string, string> = {
  periodo: 'Período completo',
  peso: 'Peso atingido',
  ambos: 'O que vier primeiro',
}

export function PlanoNutricionalDraftModal({
  isOpen,
  onClose,
  categoria,
  formulacoes,
  planos,
  onSave,
}: PlanoNutricionalDraftModalProps) {
  const [draftPlanos, setDraftPlanos] = useState<PlanoRascunho[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    formulacao_id: '',
    periodo_dias: '',
    peso_meta_kg: '',
    condicao_migracao: 'periodo' as 'periodo' | 'peso' | 'ambos',
  })

  useEffect(() => {
    if (isOpen) {
      const sorted = [...planos].sort((a, b) => a.ordem - b.ordem)
      setDraftPlanos(sorted)
      resetForm()
    }
  }, [isOpen, planos])

  const resetForm = () => {
    setEditingIndex(null)
    setFormData({
      nome: '',
      formulacao_id: '',
      periodo_dias: '',
      peso_meta_kg: '',
      condicao_migracao: 'periodo',
    })
  }

  const selectedFormulacao = useMemo(
    () => formulacoes.find((f) => f.id === formData.formulacao_id),
    [formulacoes, formData.formulacao_id]
  )

  const handleAddOrUpdate = () => {
    if (!formData.formulacao_id || !formData.periodo_dias || !formData.peso_meta_kg) return

    const nome = formData.nome.trim() || selectedFormulacao?.nome || 'Plano'
    const novoPlano: PlanoRascunho = {
      nome,
      formulacao_id: formData.formulacao_id,
      periodo_dias: parseInt(formData.periodo_dias),
      peso_meta_kg: parseFloat(formData.peso_meta_kg.replace(',', '.')),
      condicao_migracao: formData.condicao_migracao,
      ordem: 0,
    }

    let updated = [...draftPlanos]
    if (editingIndex !== null) {
      novoPlano.ordem = updated[editingIndex].ordem
      updated[editingIndex] = { ...updated[editingIndex], ...novoPlano }
    } else {
      const maxOrdem = updated.length > 0 ? Math.max(...updated.map((p) => p.ordem)) : -1
      novoPlano.ordem = maxOrdem + 1
      updated.push(novoPlano)
    }

    updated = updated.sort((a, b) => a.ordem - b.ordem)
    setDraftPlanos(updated)
    resetForm()
  }

  const handleEdit = (index: number) => {
    const p = draftPlanos[index]
    setEditingIndex(index)
    setFormData({
      nome: p.nome,
      formulacao_id: p.formulacao_id,
      periodo_dias: p.periodo_dias.toString(),
      peso_meta_kg: p.peso_meta_kg.toString(),
      condicao_migracao: p.condicao_migracao,
    })
  }

  const handleDelete = (index: number) => {
    const updated = draftPlanos.filter((_, i) => i !== index)
    const reordenado = updated.map((p, i) => ({ ...p, ordem: i }))
    setDraftPlanos(reordenado)
    if (editingIndex === index) resetForm()
  }

  const handleDragStart = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', index.toString())
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (dropIndex: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (isNaN(dragIndex) || dragIndex === dropIndex) {
      setDragOverIndex(null)
      return
    }
    const updated = [...draftPlanos]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(dropIndex, 0, moved)
    setDraftPlanos(updated.map((p, i) => ({ ...p, ordem: i })))
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragOverIndex(null)
  }

  const handleSave = () => {
    onSave(draftPlanos)
    onClose()
  }

  const formulacoesFiltradas = formulacoes.filter(
    (f) => !categoria || (f.categoria || '').toLowerCase() === categoria.toLowerCase()
  )

  const podeSalvarForm = formData.formulacao_id && formData.periodo_dias && formData.peso_meta_kg

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Planos Nutricionais — ${categoria ? categoria.replace(/\b\w/g, (c) => c.toUpperCase()) : ''}`} size="lg">
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-800">Planos</h3>
            <span className="text-xs text-gray-400">Visualize e gerencie a sequência</span>
          </div>

          {draftPlanos.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Nenhum plano na sequência. Adicione ao menos um plano para a categoria.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Sequência de Planos</h4>
              <p className="text-xs text-gray-500">Arraste para reordenar.</p>
              <div className="space-y-2">
                {draftPlanos.map((plano, index) => {
                  const f = formulacoes.find((x) => x.id === plano.formulacao_id)
                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={handleDragStart(index)}
                      onDragOver={handleDragOver(index)}
                      onDrop={handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between border rounded-lg p-3 transition-colors ${
                        dragOverIndex === index ? 'border-primary bg-primary/5' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-gray-400 select-none flex-shrink-0" title="Arraste para reordenar">⠿</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {index + 1}. {plano.nome}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {f?.nome} • {plano.periodo_dias} dias • {plano.peso_meta_kg.toFixed(2).replace('.', ',')} kg • {CONDICOES[plano.condicao_migracao]}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="secondary" onClick={() => handleEdit(index)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleDelete(index)} className="text-red-600 hover:text-red-700">
                          Excluir
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-t-2 border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-base font-semibold text-gray-800">
              {editingIndex !== null ? 'Editar Plano' : 'Novo Plano'}
            </h3>
            <span className="text-xs text-gray-400">
              {editingIndex !== null ? 'Altere os dados e salve' : 'Preencha os dados e adicione à sequência'}
            </span>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleAddOrUpdate() }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Plano</label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Engorda Inicial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Formulação *</label>
                <select
                  value={formData.formulacao_id}
                  onChange={(e) => {
                    const fid = e.target.value
                    const f = formulacoes.find((x) => x.id === fid)
                    setFormData({
                      ...formData,
                      formulacao_id: fid,
                      nome: f?.nome || formData.nome,
                    })
                  }}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:border-accent input-focus text-sm sm:text-base bg-white"
                >
                  <option value="">Selecione uma formulação...</option>
                  {formulacoesFiltradas.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} {f.gmd ? `(${f.gmd.toFixed(3).replace('.', ',')})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Período (dias) *</label>
                <Input
                  type="number"
                  value={formData.periodo_dias}
                  onChange={(e) => setFormData({ ...formData, periodo_dias: e.target.value })}
                  placeholder="Ex: 90"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Peso Meta (kg/cab) *</label>
                <NumericInput
                  value={formData.peso_meta_kg}
                  onChange={(value) => setFormData({ ...formData, peso_meta_kg: value })}
                  placeholder="0,00"
                  decimalPlaces={2}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Condição para Migração</label>
                <div className="flex flex-wrap gap-3">
                  {(['periodo', 'peso', 'ambos'] as const).map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setFormData({ ...formData, condicao_migracao: cond })}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.condicao_migracao === cond
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {CONDICOES[cond]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedFormulacao && (
              <div className="text-xs text-gray-600 flex flex-wrap gap-3">
                <span>GMD: {selectedFormulacao.gmd?.toFixed(3).replace('.', ',') || '—'} kg/cab/dia</span>
                <span>
                  Consumo MS: {selectedFormulacao.meta_consumo_ms_percent_pv?.toFixed(2).replace('.', ',') || '—'}% PV
                </span>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={handleAddOrUpdate} disabled={!podeSalvarForm}>
                {editingIndex !== null ? 'Atualizar' : 'Adicionar'} plano
              </Button>
            </div>
          </form>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={draftPlanos.length === 0}>
            Salvar planos
          </Button>
        </div>
      </div>
    </Modal>
  )}
