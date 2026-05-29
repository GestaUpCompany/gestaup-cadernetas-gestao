import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface Setor {
  id: string
  fazenda_id: string
  nome: string
  ativo: boolean
}

export function Setores() {
  const { user } = useAuth()
  const [setores, setSetores] = useState<Setor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSetor, setEditingSetor] = useState<Setor | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [setorToDelete, setSetorToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadSetores()
  }, [user])

  const loadSetores = async () => {
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
      .from('setores')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar setores:', error)
    } else {
      setSetores(data as Setor[])
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
    }

    let error

    if (editingSetor) {
      // Atualizar setor existente
      const { error: updateError } = await supabase
        .from('setores')
        .update(data)
        .eq('id', editingSetor.id)
      error = updateError
    } else {
      // Criar novo setor
      const { error: insertError } = await supabase.from('setores').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar setor:', error)
    } else {
      setFormData({
        nome: '',
      })
      setShowForm(false)
      setEditingSetor(null)
      loadSetores()
    }

    setSubmitting(false)
  }

  const handleEdit = (setor: Setor) => {
    setEditingSetor(setor)
    setFormData({
      nome: setor.nome,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingSetor(null)
    setFormData({
      nome: '',
    })
    setShowForm(false)
  }

  const handleDeleteClick = (id: string) => {
    setSetorToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!setorToDelete) return

    const { error } = await supabase.from('setores').delete().eq('id', setorToDelete)

    if (error) {
      console.error('Erro ao excluir setor:', error)
    } else {
      loadSetores()
    }

    setShowDeleteModal(false)
    setSetorToDelete(null)
  }

  const handleToggleActive = async (setor: Setor) => {
    const { error } = await supabase
      .from('setores')
      .update({ ativo: !setor.ativo })
      .eq('id', setor.id)

    if (error) {
      console.error('Erro ao atualizar setor:', error)
    } else {
      loadSetores()
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

  const filteredSetores = setores.filter((setor) =>
    setor.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      {!showForm && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Setores</h2>
          <div className="flex flex-col sm:flex-row gap-2 items-start w-full md:w-auto">
            <Input
              type="text"
              placeholder="Buscar setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-xs border-gray-200 focus:border-accent h-10 text-sm"
            />
            <Button onClick={() => setShowForm(true)} className="h-10 text-sm flex-1 sm:flex-none">Novo Setor</Button>
          </div>
        </div>
      )}

      {showForm && (
        <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
            {editingSetor ? 'Editar Setor' : 'Novo Setor'}
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
                placeholder="Nome do setor"
                className="border-gray-200 focus:border-accent"
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

      {!showForm && filteredSetores.length === 0 ? (
        <Card className="bg-white p-8 sm:p-12 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4 text-sm sm:text-base">Nenhum setor cadastrado</p>
          <Button onClick={() => setShowForm(true)} className="text-sm">Criar Primeiro Setor</Button>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSetores.map((setor) => (
            <Card key={setor.id} className={!setor.ativo ? 'opacity-60' : ''}>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold">{setor.nome}</h3>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    setor.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {setor.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={() => handleEdit(setor)}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleToggleActive(setor)}
                >
                  {setor.ativo ? 'Desativar' : 'Ativar'}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDeleteClick(setor.id)}
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
        title="Excluir Setor"
        message="Tem certeza que deseja excluir este setor? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
