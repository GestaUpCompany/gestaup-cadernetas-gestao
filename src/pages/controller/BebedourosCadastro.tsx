import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, ConfirmModal } from '../../components/ui'

interface Bebedouro {
  id: string
  fazenda_id: string
  nome: string
  capacidade?: number
  data_ultima_limpeza?: string
  meta_intervalo_limpeza?: number
  ativo: boolean
  created_at: string
  updated_at?: string
  data_ultima_limpeza_historico?: string
}

export function BebedourosCadastro() {
  const { user } = useAuth()
  const [bebedouros, setBebedouros] = useState<Bebedouro[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBebedouro, setEditingBebedouro] = useState<Bebedouro | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [bebedouroToDelete, setBebedouroToDelete] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nome: '',
    capacidade: '',
    data_ultima_limpeza: '',
    meta_intervalo_limpeza: ''
  })

  useEffect(() => {
    loadBebedouros()
  }, [user])

  const loadBebedouros = async () => {
    if (!user) return

    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    const { data, error } = await supabase
      .from('bebedouros')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao buscar bebedouros:', error)
    } else {
      const bebedourosWithHistorico = await Promise.all(
        (data as Bebedouro[]).map(async (bebedouro) => {
          const { data: ultimaLimpeza } = await supabase
            .from('historico_limpezas_bebedouros')
            .select('data_limpeza')
            .eq('bebedouro_id', bebedouro.id)
            .order('data_limpeza', { ascending: false })
            .limit(1)
            .single()

          return {
            ...bebedouro,
            data_ultima_limpeza_historico: ultimaLimpeza?.data_limpeza || null
          }
        })
      )
      setBebedouros(bebedourosWithHistorico)
    }

    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)

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

    const bebedouroData = {
      fazenda_id: fazendaId,
      nome: formData.nome,
      capacidade: formData.capacidade ? parseFloat(formData.capacidade) : null,
      data_ultima_limpeza: formData.data_ultima_limpeza || null,
      meta_intervalo_limpeza: formData.meta_intervalo_limpeza ? parseInt(formData.meta_intervalo_limpeza) : null,
      ativo: true
    }

    let error
    if (editingBebedouro) {
      const result = await supabase
        .from('bebedouros')
        .update(bebedouroData)
        .eq('id', editingBebedouro.id)
      error = result.error
    } else {
      const result = await supabase
        .from('bebedouros')
        .insert(bebedouroData)
      error = result.error
    }

    if (error) {
      console.error('Erro ao salvar bebedouro:', error)
    } else {
      handleCancel()
      loadBebedouros()
    }

    setSubmitting(false)
  }

  const handleEdit = (bebedouro: Bebedouro) => {
    setEditingBebedouro(bebedouro)
    setFormData({
      nome: bebedouro.nome,
      capacidade: bebedouro.capacidade?.toString() || '',
      data_ultima_limpeza: bebedouro.data_ultima_limpeza_historico || '',
      meta_intervalo_limpeza: bebedouro.meta_intervalo_limpeza?.toString() || ''
    })
    setShowForm(true)
  }

  const handleDeleteClick = (id: string) => {
    setBebedouroToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!bebedouroToDelete) return

    const { error } = await supabase
      .from('bebedouros')
      .delete()
      .eq('id', bebedouroToDelete)

    if (error) {
      console.error('Erro ao excluir bebedouro:', error)
    } else {
      loadBebedouros()
    }

    setShowDeleteModal(false)
    setBebedouroToDelete(null)
  }

  const handleToggleActive = async (bebedouro: Bebedouro) => {
    const { error } = await supabase
      .from('bebedouros')
      .update({ ativo: !bebedouro.ativo })
      .eq('id', bebedouro.id)

    if (error) {
      console.error('Erro ao atualizar bebedouro:', error)
    } else {
      loadBebedouros()
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingBebedouro(null)
    setFormData({ nome: '', capacidade: '', data_ultima_limpeza: '', meta_intervalo_limpeza: '' })
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Bebedouros</h2>
        <div className="flex gap-2 items-start">
          <Input
            type="text"
            placeholder="Buscar bebedouro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs border-gray-200 focus:border-accent h-10"
          />
          <Button onClick={() => setShowForm(true)} className="h-10">Novo Bebedouro</Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-white p-6 border-0 shadow-sm" disableHover>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {editingBebedouro ? 'Editar Bebedouro' : 'Novo Bebedouro'}
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome/Número *
              </label>
              <Input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                placeholder="Nome ou número do bebedouro"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacidade (L)
              </label>
              <Input
                type="number"
                value={formData.capacidade}
                onChange={(e) => setFormData({ ...formData, capacidade: e.target.value })}
                placeholder="Capacidade em litros"
                className="border-gray-200 focus:border-accent"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data da Última Limpeza
              </label>
              <Input
                type="date"
                value={formData.data_ultima_limpeza}
                onChange={(e) => setFormData({ ...formData, data_ultima_limpeza: e.target.value })}
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta de Intervalo de Limpeza (dias)
              </label>
              <Input
                type="number"
                value={formData.meta_intervalo_limpeza}
                onChange={(e) => setFormData({ ...formData, meta_intervalo_limpeza: e.target.value })}
                placeholder="Intervalo em dias"
                className="border-gray-200 focus:border-accent"
                min="1"
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

      {!showForm && bebedouros.length === 0 ? (
        <Card className="bg-white p-12 border-0 shadow-sm text-center" disableHover>
          <p className="text-gray-600 mb-4">Nenhum bebedouro cadastrado</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeiro Bebedouro</Button>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {bebedouros
            .filter((bebedouro) =>
              bebedouro.nome.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((bebedouro) => (
              <Card 
                key={bebedouro.id} 
                className="bg-white p-6 border-0 shadow-sm cursor-pointer"
                onClick={() => handleEdit(bebedouro)}
                disableHover
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">{bebedouro.nome}</h3>
                    {bebedouro.capacidade && (
                      <p className="text-sm text-gray-500 mt-1">Capacidade: {bebedouro.capacidade} L</p>
                    )}
                    {bebedouro.data_ultima_limpeza_historico && (
                      <p className="text-sm text-gray-500 mt-1">
                        Última limpeza: {(() => {
                          const [year, month, day] = bebedouro.data_ultima_limpeza_historico!.split('-')
                          return `${day}/${month}/${year}`
                        })()}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      bebedouro.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {bebedouro.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="secondary" 
                    className="flex-1 text-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleActive(bebedouro)
                    }}
                  >
                    {bebedouro.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1 text-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(bebedouro)
                    }}
                  >
                    Editar
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1 text-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(bebedouro.id)
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
        title="Excluir Bebedouro"
        message="Tem certeza que deseja excluir este bebedouro? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
