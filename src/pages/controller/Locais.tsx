import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface Local {
  id: string
  fazenda_id: string
  nome: string
  ativo: boolean
}

export function Locais() {
  const { user } = useAuth()
  const [locais, setLocais] = useState<Local[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLocal, setEditingLocal] = useState<Local | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [localToDelete, setLocalToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadLocais()
  }, [user])

  const loadLocais = async () => {
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
      .from('locais')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar locais:', error)
    } else {
      setLocais(data as Local[])
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

    if (editingLocal) {
      // Atualizar local existente
      const { error: updateError } = await supabase
        .from('locais')
        .update(data)
        .eq('id', editingLocal.id)
      error = updateError
    } else {
      // Criar novo local
      const { error: insertError } = await supabase.from('locais').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar local:', error)
    } else {
      setFormData({
        nome: '',
      })
      setShowForm(false)
      setEditingLocal(null)
      loadLocais()
    }

    setSubmitting(false)
  }

  const handleEdit = (local: Local) => {
    setEditingLocal(local)
    setFormData({
      nome: local.nome,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingLocal(null)
    setFormData({
      nome: '',
    })
    setShowForm(false)
  }

  const handleDeleteClick = (id: string) => {
    setLocalToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!localToDelete) return

    const { error } = await supabase.from('locais').delete().eq('id', localToDelete)

    if (error) {
      console.error('Erro ao excluir local:', error)
    } else {
      loadLocais()
    }

    setShowDeleteModal(false)
    setLocalToDelete(null)
  }

  const handleToggleActive = async (local: Local) => {
    const { error } = await supabase
      .from('locais')
      .update({ ativo: !local.ativo })
      .eq('id', local.id)

    if (error) {
      console.error('Erro ao atualizar local:', error)
    } else {
      loadLocais()
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

  const filteredLocais = locais.filter((local) =>
    local.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      {!showForm && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Locais</h2>
          <div className="flex flex-col sm:flex-row gap-2 items-start w-full md:w-auto">
            <Input
              type="text"
              placeholder="Buscar local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-xs border-gray-200 focus:border-accent h-10 text-sm"
            />
            <Button onClick={() => setShowForm(true)} className="h-10 text-sm flex-1 sm:flex-none">Novo Local</Button>
          </div>
        </div>
      )}

      {showForm && (
        <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
            {editingLocal ? 'Editar Local' : 'Novo Local'}
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
                placeholder="Nome do local"
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

      {!showForm && filteredLocais.length === 0 ? (
        <Card className="bg-white p-8 sm:p-12 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4 text-sm sm:text-base">Nenhum local cadastrado</p>
          <Button onClick={() => setShowForm(true)} className="text-sm">Criar Primeiro Local</Button>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocais.map((local) => (
            <Card key={local.id} className={!local.ativo ? 'opacity-60' : ''}>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold">{local.nome}</h3>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    local.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {local.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="secondary" onClick={() => handleEdit(local)}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleToggleActive(local)}
                >
                  {local.ativo ? 'Desativar' : 'Ativar'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDeleteClick(local.id)}
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
        title="Excluir Local"
        message="Tem certeza que deseja excluir este local? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
