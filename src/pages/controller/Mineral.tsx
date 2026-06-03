import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal, CardItem } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface Mineral {
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

export function Mineral() {
  const { user } = useAuth()
  const [minerais, setMinerais] = useState<Mineral[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMineral, setEditingMineral] = useState<Mineral | null>(null)
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
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [mineralToDelete, setMineralToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadMinerais()
  }, [user])

  const loadMinerais = async () => {
    if (!user) return

    // Buscar fazenda vinculada
    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    const { data, error } = await supabase
      .from('mineral')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar minerais:', error)
    } else {
      setMinerais(data as Mineral[])
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

    if (editingMineral) {
      // Atualizar mineral existente
      const { error: updateError } = await supabase
        .from('mineral')
        .update(data)
        .eq('id', editingMineral.id)
      error = updateError
    } else {
      // Criar novo mineral
      const { error: insertError } = await supabase.from('mineral').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar mineral:', error)
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
      setEditingMineral(null)
      loadMinerais()
    }

    setSubmitting(false)
  }

  const handleEdit = (mineral: Mineral) => {
    setEditingMineral(mineral)
    setFormData({
      nome: mineral.nome,
      marca: mineral.marca || '',
      fabricante: mineral.fabricante || '',
      tipo: mineral.tipo || '',
      fornecedor: mineral.fornecedor || '',
      espacamento_ideal_cocho: mineral.espacamento_ideal_cocho?.toString() || '',
      consumo_meta_porcentagem_pesovivo: mineral.consumo_meta_porcentagem_pesovivo?.toString() || '',
      ativo: mineral.ativo,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingMineral(null)
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

  const handleDeleteClick = (id: string) => {
    setMineralToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!mineralToDelete) return

    const { error } = await supabase.from('mineral').delete().eq('id', mineralToDelete)

    if (error) {
      console.error('Erro ao excluir mineral:', error)
    } else {
      loadMinerais()
    }

    setMineralToDelete(null)
    setShowDeleteModal(false)
  }

  const handleToggleActive = async (mineral: Mineral) => {
    const { error } = await supabase
      .from('mineral')
      .update({ ativo: !mineral.ativo })
      .eq('id', mineral.id)

    if (error) {
      console.error('Erro ao atualizar mineral:', error)
    } else {
      loadMinerais()
    }
  }

  const shortcuts = [
    {
      key: 'f',
      ctrl: true,
      description: 'Buscar minerais',
      action: () => {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
        searchInput?.focus()
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
        <h2 className="text-2xl font-bold text-gray-800">Minerais</h2>
        <div className="flex gap-2 items-start">
          <Input
            type="text"
            placeholder="Buscar mineral..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs border-gray-200 focus:border-accent h-10"
          />
          <Button onClick={() => setShowForm(true)} className="h-10">Nova Mineral</Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-white p-6 border-0 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {editingMineral ? 'Editar Mineral' : 'Novo Mineral'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <Input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  placeholder="Nome do mineral"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca
                </label>
                <Input
                  type="text"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  placeholder="Marca do mineral"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fabricante
                </label>
                <Input
                  type="text"
                  value={formData.fabricante}
                  onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
                  placeholder="Fabricante do mineral"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <Input
                  type="text"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  placeholder="Ex: Sal mineral, Sal comum, Farelo"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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

      {!showForm && minerais.length === 0 ? (
        <Card className="bg-white p-12 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4">Nenhum mineral cadastrado</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeiro Mineral</Button>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {minerais
            .filter((mineral) =>
              mineral.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (mineral.tipo && mineral.tipo.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .map((mineral) => (
              <CardItem
                key={mineral.id}
                title={mineral.nome}
                subtitle={mineral.tipo}
                status={mineral.ativo}
                onClick={() => handleEdit(mineral)}
              >
                <div className="space-y-2 mb-4">
                  {mineral.marca && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Marca:</span> {mineral.marca}
                    </p>
                  )}

                  {mineral.fabricante && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Fabricante:</span> {mineral.fabricante}
                    </p>
                  )}

                  {mineral.fornecedor && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Fornecedor:</span> {mineral.fornecedor}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 sm:gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleActive(mineral)
                    }}
                  >
                    {mineral.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(mineral)
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(mineral.id)
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
        title="Excluir Mineral"
        message="Tem certeza que deseja excluir este mineral? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
