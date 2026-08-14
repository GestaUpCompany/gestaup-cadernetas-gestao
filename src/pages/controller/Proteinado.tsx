import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, CardItem } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { getFazendaIdForUser } from '../../utils/fazendaContext'

interface Proteinado {
  id: string
  fazenda_id: string
  nome: string
  marca?: string
  fabricante?: string
  tipo?: string
  fornecedor?: string
  espacamento_ideal_cocho?: number
  consumo_meta_porcentagem_pesovivo?: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export function Proteinado() {
  const { user } = useAuth()
  const [proteinados, setProteinados] = useState<Proteinado[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProteinado, setEditingProteinado] = useState<Proteinado | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    marca: '',
    fabricante: '',
    tipo: '',
    fornecedor: '',
    espacamento_ideal_cocho: '',
    consumo_meta_porcentagem_pesovivo: '',
    ativo: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    loadProteinados()
  }, [user])

  const loadProteinados = async () => {
    if (!user) return

    // Buscar fazenda vinculada
    const _fazendaId = await getFazendaIdForUser(user.id)
    const vinculos = _fazendaId ? [{ fazenda_id: _fazendaId }] : []

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    const { data, error } = await supabase
      .from('proteinado')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar proteinados:', error)
    } else {
      setProteinados(data as Proteinado[])
    }

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    if (!user) {
      setSubmitting(false)
      return
    }

    // Buscar fazenda vinculada
    const _fazendaId = await getFazendaIdForUser(user.id)
    const vinculos = _fazendaId ? [{ fazenda_id: _fazendaId }] : []

    if (!vinculos || vinculos.length === 0) {
      setSubmitting(false)
      return
    }

    const fazendaId = vinculos[0].fazenda_id

    const data = {
      fazenda_id: fazendaId,
      nome: formData.nome,
      marca: formData.marca || null,
      fabricante: formData.fabricante || null,
      tipo: formData.tipo || null,
      fornecedor: formData.fornecedor || null,
      espacamento_ideal_cocho: formData.espacamento_ideal_cocho ? parseFloat(formData.espacamento_ideal_cocho) : null,
      consumo_meta_porcentagem_pesovivo: formData.consumo_meta_porcentagem_pesovivo ? parseFloat(formData.consumo_meta_porcentagem_pesovivo) : null,
      ativo: formData.ativo,
    }

    let error

    if (editingProteinado) {
      // Atualizar proteinado existente
      const { error: updateError } = await supabase
        .from('proteinado')
        .update(data)
        .eq('id', editingProteinado.id)
      error = updateError
    } else {
      // Criar novo proteinado
      const { error: insertError } = await supabase.from('proteinado').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar proteinado:', error)
    } else {
      setFormData({
        nome: '',
        marca: '',
        fabricante: '',
        tipo: '',
        fornecedor: '',
        espacamento_ideal_cocho: '',
        consumo_meta_porcentagem_pesovivo: '',
        ativo: true,
      })
      setShowForm(false)
      setEditingProteinado(null)
      loadProteinados()
    }

    setSubmitting(false)
  }

  const handleEdit = (proteinado: Proteinado) => {
    setEditingProteinado(proteinado)
    setFormData({
      nome: proteinado.nome,
      marca: proteinado.marca || '',
      fabricante: proteinado.fabricante || '',
      tipo: proteinado.tipo || '',
      fornecedor: proteinado.fornecedor || '',
      espacamento_ideal_cocho: proteinado.espacamento_ideal_cocho?.toString() || '',
      consumo_meta_porcentagem_pesovivo: proteinado.consumo_meta_porcentagem_pesovivo?.toString() || '',
      ativo: proteinado.ativo,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingProteinado(null)
    setFormData({
      nome: '',
      marca: '',
      fabricante: '',
      tipo: '',
      fornecedor: '',
      espacamento_ideal_cocho: '',
      consumo_meta_porcentagem_pesovivo: '',
      ativo: true,
    })
    setShowForm(false)
  }

  const handleToggleActive = async (proteinado: Proteinado) => {
    const { error } = await supabase
      .from('proteinado')
      .update({ ativo: !proteinado.ativo, deleted_at: !proteinado.ativo ? new Date().toISOString() : null })
      .eq('id', proteinado.id)

    if (error) {
      console.error('Erro ao atualizar proteinado:', error)
    } else {
      loadProteinados()
    }
  }

  const shortcuts = [
    {
      key: 'f',
      ctrl: true,
      description: 'Buscar proteinados',
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
        <h2 className="text-2xl font-bold text-gray-800">Proteinados</h2>
        <div className="flex gap-2 items-start">
          <Input
            type="text"
            placeholder="Buscar proteinado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs border-gray-200 focus:border-accent h-10"
          />
          <button
            type="button"
            onClick={() => setShowInactive(!showInactive)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 border-2 h-10 ${
              showInactive
                ? 'bg-primary text-white border-primary hover:bg-primary/90'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showInactive ? '✓ Mostrando Desativados' : 'Mostrar Desativados'}
          </button>
          <Button onClick={() => setShowForm(true)} className="h-10">Novo Proteinado</Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-white p-6 border-0 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-gray-800">
              {editingProteinado ? 'Editar Proteinado' : 'Novo Proteinado'}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">
                  Nome *
                </label>
                <Input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  placeholder="Nome do proteinado"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">
                  Marca
                </label>
                <Input
                  type="text"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  placeholder="Marca do proteinado"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">
                  Fabricante
                </label>
                <Input
                  type="text"
                  value={formData.fabricante}
                  onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
                  placeholder="Fabricante do proteinado"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">
                  Tipo
                </label>
                <Input
                  type="text"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  placeholder="Ex: Farelo, Concentrado, Suplemento"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">
                  Fornecedor
                </label>
                <Input
                  type="text"
                  value={formData.fornecedor}
                  onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                  placeholder="Nome do fornecedor"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">
                  Espaçamento ideal no cocho (m)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.espacamento_ideal_cocho}
                  onChange={(e) => setFormData({ ...formData, espacamento_ideal_cocho: e.target.value })}
                  placeholder="Ex: 0.50"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 min-h-[2.5rem] leading-tight line-clamp-2">
                  Consumo Meta (%/PV)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.consumo_meta_porcentagem_pesovivo}
                  onChange={(e) => setFormData({ ...formData, consumo_meta_porcentagem_pesovivo: e.target.value })}
                  placeholder="Ex: 2.50"
                  className="border-gray-200 focus:border-accent"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar'}
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

      {!showForm && proteinados.length === 0 ? (
        <Card className="bg-white p-12 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4">Nenhum proteinado cadastrado</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeiro Proteinado</Button>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proteinados
            .filter((proteinado) =>
              (showInactive || proteinado.ativo) &&
              (proteinado.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (proteinado.tipo && proteinado.tipo.toLowerCase().includes(searchTerm.toLowerCase())))
            )
            .map((proteinado) => (
              <CardItem
                key={proteinado.id}
                title={proteinado.nome}
                subtitle={proteinado.tipo}
                status={proteinado.ativo}
                onClick={() => handleEdit(proteinado)}
              >
                <div className="space-y-2 mb-4">
                  {proteinado.marca && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Marca:</span> {proteinado.marca}
                    </p>
                  )}

                  {proteinado.fabricante && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Fabricante:</span> {proteinado.fabricante}
                    </p>
                  )}

                  {proteinado.fornecedor && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Fornecedor:</span> {proteinado.fornecedor}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 sm:gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleActive(proteinado)
                    }}
                  >
                    {proteinado.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(proteinado)
                    }}
                  >
                    Editar
                  </Button>
                </div>
              </CardItem>
            ))}
        </div>
      ) : null}
    </div>
  )
}
