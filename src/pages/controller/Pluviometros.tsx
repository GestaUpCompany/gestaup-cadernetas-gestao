import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface Pluviometro {
  id: string
  fazenda_id: string
  nome: string
  localizacao: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export function Pluviometros() {
  const { user } = useAuth()
  const [pluviometros, setPluviometros] = useState<Pluviometro[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPluviometro, setEditingPluviometro] = useState<Pluviometro | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    localizacao: '',
    ativo: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [pluviometroToDelete, setPluviometroToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadPluviometros()
  }, [user])

  const loadPluviometros = async () => {
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
      .from('pluviometros')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar pluviômetros:', error)
    } else {
      setPluviometros(data as Pluviometro[])
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
      localizacao: formData.localizacao,
      ativo: formData.ativo,
    }

    let error

    if (editingPluviometro) {
      // Atualizar pluviômetro existente
      const { error: updateError } = await supabase
        .from('pluviometros')
        .update(data)
        .eq('id', editingPluviometro.id)
      error = updateError
    } else {
      // Criar novo pluviômetro
      const { error: insertError } = await supabase.from('pluviometros').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar pluviômetro:', error)
    } else {
      setFormData({
        nome: '',
        localizacao: '',
        ativo: true,
      })
      setShowForm(false)
      setEditingPluviometro(null)
      loadPluviometros()
    }

    setSubmitting(false)
  }

  const handleEdit = (pluviometro: Pluviometro) => {
    setEditingPluviometro(pluviometro)
    setFormData({
      nome: pluviometro.nome,
      localizacao: pluviometro.localizacao,
      ativo: pluviometro.ativo,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingPluviometro(null)
    setFormData({
      nome: '',
      localizacao: '',
      ativo: true,
    })
    setShowForm(false)
  }

  const handleDeleteClick = (id: string) => {
    setPluviometroToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!pluviometroToDelete) return

    const { error } = await supabase.from('pluviometros').delete().eq('id', pluviometroToDelete)

    if (error) {
      console.error('Erro ao excluir pluviômetro:', error)
    } else {
      loadPluviometros()
    }

    setShowDeleteModal(false)
    setPluviometroToDelete(null)
  }

  const handleToggleActive = async (pluviometro: Pluviometro) => {
    const { error } = await supabase
      .from('pluviometros')
      .update({ ativo: !pluviometro.ativo })
      .eq('id', pluviometro.id)

    if (error) {
      console.error('Erro ao atualizar pluviômetro:', error)
    } else {
      loadPluviometros()
    }
  }

  const shortcuts = [
    {
      key: 'f',
      ctrl: true,
      description: 'Buscar pluviômetros',
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
        <h2 className="text-2xl font-bold text-gray-800">Pluviômetros</h2>
        <div className="flex gap-2 items-start">
          <Input
            type="text"
            placeholder="Buscar pluviômetro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs border-gray-200 focus:border-accent h-10"
          />
          <Button onClick={() => setShowForm(true)} className="h-10">Novo Pluviômetro</Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-white p-6 border-0 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {editingPluviometro ? 'Editar Pluviômetro' : 'Novo Pluviômetro'}
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
                placeholder="Nome do pluviômetro"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Localização *
              </label>
              <Input
                type="text"
                value={formData.localizacao}
                onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                required
                placeholder="Localização do pluviômetro"
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

      {!showForm && pluviometros.length === 0 ? (
        <Card className="bg-white p-12 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4">Nenhum pluviômetro cadastrado</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeiro Pluviômetro</Button>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {pluviometros
            .filter((pluviometro) =>
              pluviometro.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              pluviometro.localizacao.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((pluviometro) => (
            <Card 
              key={pluviometro.id} 
              className="bg-white p-6 border-0 shadow-sm cursor-pointer  transition-all"
              onClick={() => handleEdit(pluviometro)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-lg">{pluviometro.nome}</h3>
                  <p className="text-sm text-gray-500">{pluviometro.localizacao}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    pluviometro.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {pluviometro.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1 text-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleActive(pluviometro)
                  }}
                >
                  {pluviometro.ativo ? 'Desativar' : 'Ativar'}
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(pluviometro)
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteClick(pluviometro.id)
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
        title="Excluir Pluviômetro"
        message="Tem certeza que deseja excluir este pluviômetro? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
