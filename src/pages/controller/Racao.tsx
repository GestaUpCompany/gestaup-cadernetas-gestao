import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal, CardItem } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface Racao {
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

export function Racao() {
  const { user } = useAuth()
  const [racoes, setRacoes] = useState<Racao[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRacao, setEditingRacao] = useState<Racao | null>(null)
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
  const [racaoToDelete, setRacaoToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadRacoes()
  }, [user])

  const loadRacoes = async () => {
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
      .from('racao')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar rações:', error)
    } else {
      setRacoes(data as Racao[])
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

    if (editingRacao) {
      // Atualizar ração existente
      const { error: updateError } = await supabase
        .from('racao')
        .update(data)
        .eq('id', editingRacao.id)
      error = updateError
    } else {
      // Criar nova ração
      const { error: insertError } = await supabase.from('racao').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar ração:', error)
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
      setEditingRacao(null)
      loadRacoes()
    }

    setSubmitting(false)
  }

  const handleEdit = (racao: Racao) => {
    setEditingRacao(racao)
    setFormData({
      nome: racao.nome,
      marca: racao.marca || '',
      fabricante: racao.fabricante || '',
      tipo: racao.tipo || '',
      fornecedor: racao.fornecedor || '',
      espacamento_ideal_cocho: racao.espacamento_ideal_cocho?.toString() || '',
      consumo_meta_porcentagem_pesovivo: racao.consumo_meta_porcentagem_pesovivo?.toString() || '',
      ativo: racao.ativo,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingRacao(null)
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
    setRacaoToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!racaoToDelete) return

    const { error } = await supabase.from('racao').delete().eq('id', racaoToDelete)

    if (error) {
      console.error('Erro ao excluir ração:', error)
    } else {
      loadRacoes()
    }

    setRacaoToDelete(null)
    setShowDeleteModal(false)
  }

  const handleToggleActive = async (racao: Racao) => {
    const { error } = await supabase
      .from('racao')
      .update({ ativo: !racao.ativo })
      .eq('id', racao.id)

    if (error) {
      console.error('Erro ao atualizar ração:', error)
    } else {
      loadRacoes()
    }
  }

  const shortcuts = [
    {
      key: 'f',
      ctrl: true,
      description: 'Buscar rações',
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
        <h2 className="text-2xl font-bold text-gray-800">Rações</h2>
        <div className="flex gap-2 items-start">
          <Input
            type="text"
            placeholder="Buscar ração..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs border-gray-200 focus:border-accent h-10"
          />
          <Button onClick={() => setShowForm(true)} className="h-10">Nova Ração</Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-white p-6 border-0 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {editingRacao ? 'Editar Ração' : 'Nova Ração'}
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
                  placeholder="Nome da ração"
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
                  placeholder="Marca da ração"
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
                  placeholder="Fabricante da ração"
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

      {!showForm && racoes.length === 0 ? (
        <Card className="bg-white p-12 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4">Nenhuma ração cadastrada</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeira Ração</Button>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {racoes
            .filter((racao) =>
              racao.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (racao.tipo && racao.tipo.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .map((racao) => (
              <CardItem
                key={racao.id}
                title={racao.nome}
                subtitle={racao.tipo}
                status={racao.ativo}
                onClick={() => handleEdit(racao)}
              >
                <div className="space-y-2 mb-4">
                  {racao.marca && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Marca:</span> {racao.marca}
                    </p>
                  )}

                  {racao.fabricante && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Fabricante:</span> {racao.fabricante}
                    </p>
                  )}

                  {racao.fornecedor && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Fornecedor:</span> {racao.fornecedor}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 sm:gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleActive(racao)
                    }}
                  >
                    {racao.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(racao)
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(racao.id)
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
        title="Excluir Ração"
        message="Tem certeza que deseja excluir esta ração? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
