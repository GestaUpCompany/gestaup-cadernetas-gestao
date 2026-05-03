import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input } from '../../components/ui'

interface Dieta {
  id: string
  fazenda_id: string
  nome: string
  descricao?: string
  tipo?: string
  insumos?: any
  custo_total?: number
  custo_diario_animal?: number
  consumo_diario_kg?: number
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
    custo_total: '',
    custo_diario_animal: '',
    consumo_diario_kg: '',
    ativo: true,
  })
  const [submitting, setSubmitting] = useState(false)

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
      custo_total: formData.custo_total ? parseFloat(formData.custo_total) : null,
      custo_diario_animal: formData.custo_diario_animal ? parseFloat(formData.custo_diario_animal) : null,
      consumo_diario_kg: formData.consumo_diario_kg ? parseFloat(formData.consumo_diario_kg) : null,
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
        custo_total: '',
        custo_diario_animal: '',
        consumo_diario_kg: '',
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
      custo_total: dieta.custo_total?.toString() || '',
      custo_diario_animal: dieta.custo_diario_animal?.toString() || '',
      consumo_diario_kg: dieta.consumo_diario_kg?.toString() || '',
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
      custo_total: '',
      custo_diario_animal: '',
      consumo_diario_kg: '',
      ativo: true,
    })
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta dieta?')) return

    const { error } = await supabase.from('dietas').delete().eq('id', id)

    if (error) {
      console.error('Erro ao excluir dieta:', error)
    } else {
      loadDietas()
    }
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custo Total (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_total}
                onChange={(e) => setFormData({ ...formData, custo_total: e.target.value })}
                placeholder="Ex: 5000.00"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custo Diário por Animal (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_diario_animal}
                onChange={(e) => setFormData({ ...formData, custo_diario_animal: e.target.value })}
                placeholder="Ex: 5.00"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consumo Diário (kg/animal)
              </label>
              <Input
                type="number"
                step="0.1"
                value={formData.consumo_diario_kg}
                onChange={(e) => setFormData({ ...formData, consumo_diario_kg: e.target.value })}
                placeholder="Ex: 10.0"
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

      {dietas.length === 0 ? (
        <Card className="bg-white p-12 border-0 shadow-sm text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <p className="text-gray-600 mb-4">Nenhuma dieta cadastrada</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeira Dieta</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dietas
            .filter((dieta) =>
              dieta.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (dieta.tipo && dieta.tipo.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .map((dieta) => (
            <Card 
              key={dieta.id} 
              className="bg-white p-6 border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-accent transition-all"
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

                {dieta.custo_total && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Custo Total:</span> R$ {dieta.custo_total.toFixed(2)}
                  </p>
                )}

                {dieta.custo_diario_animal && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Custo Diário/Animal:</span> R$ {dieta.custo_diario_animal.toFixed(2)}
                  </p>
                )}

                {dieta.consumo_diario_kg && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Consumo Diário:</span> {dieta.consumo_diario_kg} kg
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
                    handleDelete(dieta.id)
                  }}
                >
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
