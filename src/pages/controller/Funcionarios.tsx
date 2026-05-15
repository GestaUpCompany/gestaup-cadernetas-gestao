import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal, CardItem } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface Funcionario {
  id: string
  fazenda_id: string
  nome: string
  cpf?: string
  telefone?: string
  cargo?: string
  ativo: boolean
}

export function Funcionarios() {
  const { user } = useAuth()
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    cargo: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [funcionarioToDelete, setFuncionarioToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadFuncionarios()
  }, [user])

  const loadFuncionarios = async () => {
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
      .from('funcionarios')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar funcionários:', error)
    } else {
      setFuncionarios(data as Funcionario[])
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
      cpf: formData.cpf || null,
      telefone: formData.telefone || null,
      cargo: formData.cargo || null,
    }

    let error

    if (editingFuncionario) {
      // Atualizar funcionário existente
      const { error: updateError } = await supabase
        .from('funcionarios')
        .update(data)
        .eq('id', editingFuncionario.id)
      error = updateError
    } else {
      // Criar novo funcionário
      const { error: insertError } = await supabase.from('funcionarios').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar funcionário:', error)
    } else {
      setFormData({
        nome: '',
        cpf: '',
        telefone: '',
        cargo: '',
      })
      setShowForm(false)
      setEditingFuncionario(null)
      loadFuncionarios()
    }

    setSubmitting(false)
  }

  const handleEdit = (funcionario: Funcionario) => {
    setEditingFuncionario(funcionario)
    setFormData({
      nome: funcionario.nome,
      cpf: funcionario.cpf || '',
      telefone: funcionario.telefone || '',
      cargo: funcionario.cargo || '',
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingFuncionario(null)
    setFormData({
      nome: '',
      cpf: '',
      telefone: '',
      cargo: '',
    })
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    setFuncionarioToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!funcionarioToDelete) return

    const { error } = await supabase.from('funcionarios').delete().eq('id', funcionarioToDelete)

    if (error) {
      console.error('Erro ao excluir funcionário:', error)
    } else {
      loadFuncionarios()
    }

    setDeleteConfirmOpen(false)
    setFuncionarioToDelete(null)
  }

  const shortcuts = [
    {
      key: 'f',
      ctrl: true,
      description: 'Buscar funcionários',
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
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Funcionários</h2>
          <div className="flex gap-2 items-start">
            <Input
              type="text"
              placeholder="Buscar funcionário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs border-gray-200 focus:border-accent h-10"
            />
            <Button onClick={() => setShowForm(true)} className="h-10">Novo Funcionário</Button>
          </div>
        </div>

        {showForm && (
          <Card className="bg-white p-6 border-0 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              {editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
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
                  placeholder="Nome completo"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF
                </label>
                <Input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <Input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo
                </label>
                <Input
                  type="text"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  placeholder="Ex: Peão, Tratorista, Administrador"
                  className="border-gray-200 focus:border-accent"
                />
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

        {!showForm && funcionarios.length === 0 ? (
          <Card className="bg-white p-12 border-0 shadow-sm text-center">
            <p className="text-gray-600 mb-4">Nenhum funcionário cadastrado</p>
            <Button onClick={() => setShowForm(true)}>Criar Primeiro Funcionário</Button>
          </Card>
        ) : !showForm ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {funcionarios
              .filter((funcionario) =>
                funcionario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (funcionario.cargo && funcionario.cargo.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (funcionario.cpf && funcionario.cpf.includes(searchTerm))
              )
              .map((funcionario) => (
              <CardItem
                key={funcionario.id}
                title={funcionario.nome}
                subtitle={funcionario.cargo}
                status={funcionario.ativo}
                onClick={() => handleEdit(funcionario)}
              >
                <div className="space-y-2 mb-4">
                  {funcionario.cpf && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">CPF:</span> {funcionario.cpf}
                    </p>
                  )}

                  {funcionario.telefone && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Telefone:</span> {funcionario.telefone}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 sm:gap-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(funcionario)
                    }}
                  >
                    Editar
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(funcionario.id)
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </CardItem>
            ))}
          </div>
        ) : null}
      </div>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Funcionário"
        message="Tem certeza que deseja excluir este funcionário? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </>
  )
}
