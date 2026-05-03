import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input } from '../../components/ui'

interface Mineral {
  id: string
  fazenda_id: string
  nome: string
  marca?: string
  fabricante?: string
  tipo?: string
  composicao?: any
  unidade_medida?: string
  peso_saco?: number
  estoque_atual?: number
  estoque_minimo?: number
  custo_unitario?: number
  custo_saco?: number
  custo_total_estoque?: number
  fornecedor?: string
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
    unidade_medida: '',
    peso_saco: '',
    estoque_atual: '',
    estoque_minimo: '',
    custo_unitario: '',
    custo_saco: '',
    fornecedor: '',
    ativo: true,
  })
  const [submitting, setSubmitting] = useState(false)

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
      unidade_medida: formData.unidade_medida || null,
      peso_saco: formData.peso_saco ? parseFloat(formData.peso_saco) : null,
      estoque_atual: formData.estoque_atual ? parseFloat(formData.estoque_atual) : null,
      estoque_minimo: formData.estoque_minimo ? parseFloat(formData.estoque_minimo) : null,
      custo_unitario: formData.custo_unitario ? parseFloat(formData.custo_unitario) : null,
      custo_saco: formData.custo_saco ? parseFloat(formData.custo_saco) : null,
      fornecedor: formData.fornecedor || null,
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
        unidade_medida: '',
        peso_saco: '',
        estoque_atual: '',
        estoque_minimo: '',
        custo_unitario: '',
        custo_saco: '',
        fornecedor: '',
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
      unidade_medida: mineral.unidade_medida || '',
      peso_saco: mineral.peso_saco?.toString() || '',
      estoque_atual: mineral.estoque_atual?.toString() || '',
      estoque_minimo: mineral.estoque_minimo?.toString() || '',
      custo_unitario: mineral.custo_unitario?.toString() || '',
      custo_saco: mineral.custo_saco?.toString() || '',
      fornecedor: mineral.fornecedor || '',
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
      unidade_medida: '',
      peso_saco: '',
      estoque_atual: '',
      estoque_minimo: '',
      custo_unitario: '',
      custo_saco: '',
      fornecedor: '',
      ativo: true,
    })
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este mineral?')) return

    const { error } = await supabase.from('mineral').delete().eq('id', id)

    if (error) {
      console.error('Erro ao excluir mineral:', error)
    } else {
      loadMinerais()
    }
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Minerais</h2>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Buscar mineral..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs border-gray-200 focus:border-accent"
          />
          <Button onClick={() => setShowForm(true)}>Novo Mineral</Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-white p-6 border-0 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {editingMineral ? 'Editar Mineral' : 'Novo Mineral'}
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
                Unidade de Medida
              </label>
              <Input
                type="text"
                value={formData.unidade_medida}
                onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value })}
                placeholder="Ex: kg, litros, unidades"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Peso do Saco (kg)
              </label>
              <Input
                type="number"
                step="0.1"
                value={formData.peso_saco}
                onChange={(e) => setFormData({ ...formData, peso_saco: e.target.value })}
                placeholder="Ex: 50"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estoque Atual
              </label>
              <Input
                type="number"
                step="0.1"
                value={formData.estoque_atual}
                onChange={(e) => setFormData({ ...formData, estoque_atual: e.target.value })}
                placeholder="Ex: 100"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estoque Mínimo
              </label>
              <Input
                type="number"
                step="0.1"
                value={formData.estoque_minimo}
                onChange={(e) => setFormData({ ...formData, estoque_minimo: e.target.value })}
                placeholder="Ex: 10"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custo Unitário (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_unitario}
                onChange={(e) => setFormData({ ...formData, custo_unitario: e.target.value })}
                placeholder="Ex: 50.00"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custo do Saco (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_saco}
                onChange={(e) => setFormData({ ...formData, custo_saco: e.target.value })}
                placeholder="Ex: 2500.00"
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

      {minerais.length === 0 ? (
        <Card className="bg-white p-12 border-0 shadow-sm text-center">
          <div className="text-6xl mb-4">🧂</div>
          <p className="text-gray-600 mb-4">Nenhum mineral cadastrado</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeiro Mineral</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {minerais
            .filter((mineral) =>
              mineral.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (mineral.tipo && mineral.tipo.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .map((mineral) => (
            <Card 
              key={mineral.id} 
              className="bg-white p-6 border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-accent transition-all"
              onClick={() => handleEdit(mineral)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{mineral.nome}</h3>
                  {mineral.tipo && (
                    <p className="text-sm text-gray-500">{mineral.tipo}</p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    mineral.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {mineral.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {mineral.estoque_atual !== undefined && mineral.estoque_atual !== null && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Estoque:</span> {mineral.estoque_atual}
                    {mineral.unidade_medida && ` ${mineral.unidade_medida}`}
                  </p>
                )}

                {mineral.unidade_medida && !mineral.estoque_atual && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Unidade:</span> {mineral.unidade_medida}
                  </p>
                )}

                {mineral.marca && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Marca:</span> {mineral.marca}
                  </p>
                )}

                {mineral.fornecedor && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Fornecedor:</span> {mineral.fornecedor}
                  </p>
                )}

                {mineral.custo_unitario && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Custo Unitário:</span> R$ {mineral.custo_unitario.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(mineral)
                  }}
                >
                  Editar
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(mineral.id)
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
