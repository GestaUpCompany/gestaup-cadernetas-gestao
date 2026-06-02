import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal, Select } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface ItemAlmoxarifado {
  id: string
  fazenda_id: string
  nome: string
  classificacao: string
  ativo: boolean
}

export function ItensAlmoxarifado() {
  const { user } = useAuth()
  const [itens, setItens] = useState<ItemAlmoxarifado[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemAlmoxarifado | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    classificacao: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadItens()
  }, [user])

  const loadItens = async () => {
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
      .from('itens_almoxarifado')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar itens:', error)
    } else {
      setItens(data as ItemAlmoxarifado[])
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
      classificacao: formData.classificacao,
    }

    let error

    if (editingItem) {
      // Atualizar item existente
      const { error: updateError } = await supabase
        .from('itens_almoxarifado')
        .update(data)
        .eq('id', editingItem.id)
      error = updateError
    } else {
      // Criar novo item
      const { error: insertError } = await supabase.from('itens_almoxarifado').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar item:', error)
    } else {
      setFormData({
        nome: '',
        classificacao: '',
      })
      setShowForm(false)
      setEditingItem(null)
      loadItens()
    }

    setSubmitting(false)
  }

  const handleEdit = (item: ItemAlmoxarifado) => {
    setEditingItem(item)
    setFormData({
      nome: item.nome,
      classificacao: item.classificacao,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingItem(null)
    setFormData({
      nome: '',
      classificacao: '',
    })
    setShowForm(false)
  }

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return

    const { error } = await supabase.from('itens_almoxarifado').delete().eq('id', itemToDelete)

    if (error) {
      console.error('Erro ao excluir item:', error)
    } else {
      loadItens()
    }

    setShowDeleteModal(false)
    setItemToDelete(null)
  }

  const handleToggleActive = async (item: ItemAlmoxarifado) => {
    const { error } = await supabase
      .from('itens_almoxarifado')
      .update({ ativo: !item.ativo })
      .eq('id', item.id)

    if (error) {
      console.error('Erro ao atualizar item:', error)
    } else {
      loadItens()
    }
  }

  useKeyboardShortcuts([
    {
      key: 'Escape',
      description: 'Cancelar formulário',
      action: () => {
        if (showForm) handleCancel()
      },
    },
  ])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  const filteredItens = itens.filter((item) =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.classificacao.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      {!showForm && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Itens do Almoxarifado</h2>
          <div className="flex flex-col sm:flex-row gap-2 items-start w-full md:w-auto">
            <Input
              type="text"
              placeholder="Buscar item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-xs border-gray-200 focus:border-accent h-10 text-sm"
            />
            <Button onClick={() => setShowForm(true)} className="h-10 text-sm flex-1 sm:flex-none">Novo Item</Button>
          </div>
        </div>
      )}

      {showForm && (
        <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
            {editingItem ? 'Editar Item' : 'Novo Item'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                placeholder="Nome do item"
                className="border-gray-200 focus:border-accent"
              />
            </div>
            <div>
              <Select
                label="Classificação"
                value={formData.classificacao}
                onChange={(value) => setFormData({ ...formData, classificacao: value })}
                placeholder="Selecione..."
                required
                options={[
                  { value: 'Ferramentas', label: 'Ferramentas' },
                  { value: 'Peças', label: 'Peças' },
                  { value: 'Hidráulica', label: 'Hidráulica' },
                  { value: 'Elétrica', label: 'Elétrica' },
                  { value: 'Insumos', label: 'Insumos' },
                  { value: 'Fertilizantes', label: 'Fertilizantes' },
                  { value: 'Corretivos', label: 'Corretivos' },
                  { value: 'Defensivos', label: 'Defensivos' },
                  { value: 'Herbicidas', label: 'Herbicidas' },
                  { value: 'Fungicidas', label: 'Fungicidas' },
                  { value: 'Inseticidas', label: 'Inseticidas' },
                  { value: 'Adjuvantes', label: 'Adjuvantes' },
                  { value: 'Sementes', label: 'Sementes' },
                  { value: 'Medicamentos', label: 'Medicamentos' },
                  { value: 'Equipamentos', label: 'Equipamentos' },
                  { value: 'Combustíveis', label: 'Combustíveis' },
                  { value: 'Lubrificantes', label: 'Lubrificantes' },
                  { value: 'EPI', label: 'EPI' },
                  { value: 'Materiais de Construção', label: 'Materiais de Construção' },
                ]}
              />
            </div>

            <div className="flex gap-2 items-center">
              <Button type="submit" disabled={submitting} className="flex-1 sm:flex-none text-sm">
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="secondary" onClick={handleCancel} className="flex-1 sm:flex-none text-sm">
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!showForm && filteredItens.length === 0 ? (
        <Card className="bg-white p-8 sm:p-12 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4 text-sm sm:text-base">Nenhum item cadastrado</p>
          <Button onClick={() => setShowForm(true)} className="text-sm">Criar Primeiro Item</Button>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItens.map((item) => (
            <Card key={item.id} className={!item.ativo ? 'opacity-60' : ''}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold">{item.nome}</h3>
                  <p className="text-sm text-gray-500">{item.classificacao}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    item.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {item.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="secondary" onClick={() => handleEdit(item)}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleToggleActive(item)}
                >
                  {item.ativo ? 'Desativar' : 'Ativar'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDeleteClick(item.id)}
                >
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Item"
        message="Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
