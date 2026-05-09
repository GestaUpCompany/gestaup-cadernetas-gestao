import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface Dieta {
  id: string
  fazenda_id: string
  nome: string
  descricao?: string
  tipo?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export function Dietas() {
  const { user } = useAuth()
  const [dietas, setDietas] = useState<Dieta[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDieta, setEditingDieta] = useState<Dieta | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: '',
    ativo: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [dietaToDelete, setDietaToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadDietas()
  }, [user])

  const loadDietas = async () => {
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
      descricao: formData.descricao || null,
      tipo: formData.tipo || null,
      ativo: formData.ativo,
    }

    let error

    if (editingDieta) {
      // Atualizar dieta existente
      const { error: updateError } = await supabase
        .from('dietas')
        .update(data)
        .eq('id', editingDieta.id)
      error = updateError
    } else {
      // Criar nova dieta
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
        ativo: true,
      })
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
      ativo: dieta.ativo,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingDieta(null)
    setFormData({
      nome: '',
      descricao: '',
      tipo: '',
      ativo: true,
    })
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

    setShowDeleteModal(false)
    setDietaToDelete(null)
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
        <Card className="bg-white p-6 border-0 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {editingDieta ? 'Editar Dieta' : 'Nova Dieta'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <Input
                type="text"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da dieta"
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
                placeholder="Ex: Engorda, Terminação, Creche"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="rounded border-gray-300 text-accent focus:ring-accent"
              />
              <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                Ativo
              </label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="secondary" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!showForm && dietas.length === 0 ? (
        <Card className="bg-white p-12 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4">Nenhuma dieta cadastrada</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeira Dieta</Button>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {dietas
            .filter((dieta) =>
              dieta.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (dieta.tipo && dieta.tipo.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .map((dieta) => (
            <Card 
              key={dieta.id} 
              className="bg-white p-6 border-0 shadow-sm cursor-pointer  transition-all"
              onClick={() => handleEdit(dieta)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{dieta.nome}</h3>
                  {dieta.tipo && (
                    <p className="text-sm text-gray-500">{dieta.tipo}</p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    dieta.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {dieta.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {dieta.descricao && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Descrição:</span> {dieta.descricao}
                  </p>
                )}

                {dieta.tipo && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Tipo:</span> {dieta.tipo}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
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
                  variant="secondary" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteClick(dieta.id)
                  }}
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
        title="Excluir Dieta"
        message="Tem certeza que deseja excluir esta dieta? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
