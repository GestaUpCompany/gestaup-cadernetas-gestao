import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input } from '../../components/ui'

interface Proteinado {
  id: string
  fazenda_id: string
  nome: string
  marca?: string
  fabricante?: string
  tipo?: string
  fornecedor?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export function Proteinado() {
  const { user } = useAuth()
  const [proteinados, setProteinados] = useState<Proteinado[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProteinado, setEditingProteinado] = useState<Proteinado | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    marca: '',
    fabricante: '',
    tipo: '',
    fornecedor: '',
    ativo: true,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadProteinados()
  }, [user])

  const loadProteinados = async () => {
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
      .from('proteinado')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar proteinados:', error)
    } else {
      setProteinados(data as Proteinado[])
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
      ativo: formData.ativo,
    }

    let error

    if (editingProteinado) {
      // Atualizar proteinado existente
      const { error: updateError } = await supabase
        .from('proteinado')
        .update(data)
        .eq('id', editingProteinado.id)
      error = updateError
    } else {
      // Criar novo proteinado
      const { error: insertError } = await supabase.from('proteinado').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar proteinado:', error)
    } else {
      setFormData({
        nome: '',
        marca: '',
        fabricante: '',
        tipo: '',
        fornecedor: '',
        ativo: true,
      })
      setShowForm(false)
      setEditingProteinado(null)
      loadProteinados()
    }

    setSubmitting(false)
  }

  const handleEdit = (proteinado: Proteinado) => {
    setEditingProteinado(proteinado)
    setFormData({
      nome: proteinado.nome,
      marca: proteinado.marca || '',
      fabricante: proteinado.fabricante || '',
      tipo: proteinado.tipo || '',
      fornecedor: proteinado.fornecedor || '',
      ativo: proteinado.ativo,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingProteinado(null)
    setFormData({
      nome: '',
      marca: '',
      fabricante: '',
      tipo: '',
      fornecedor: '',
      ativo: true,
    })
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este proteinado?')) return

    const { error } = await supabase.from('proteinado').delete().eq('id', id)

    if (error) {
      console.error('Erro ao excluir proteinado:', error)
    } else {
      loadProteinados()
    }
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Proteinados</h2>
        <div className="flex gap-2 items-start">
          <Input
            type="text"
            placeholder="Buscar proteinado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs border-gray-200 focus:border-accent h-10"
          />
          <Button onClick={() => setShowForm(true)} className="h-10">Novo Proteinado</Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-white p-6 border-0 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {editingProteinado ? 'Editar Proteinado' : 'Novo Proteinado'}
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
                placeholder="Nome do proteinado"
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
                placeholder="Marca do proteinado"
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
                placeholder="Fabricante do proteinado"
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
                placeholder="Ex: Farelo, Concentrado, Suplemento"
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

      {!showForm && proteinados.length === 0 ? (
        <Card className="bg-white p-12 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4">Nenhum proteinado cadastrado</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeiro Proteinado</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proteinados
            .filter((proteinado) =>
              proteinado.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (proteinado.tipo && proteinado.tipo.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .map((proteinado) => (
            <Card 
              key={proteinado.id} 
              className="bg-white p-6 border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-accent transition-all"
              onClick={() => handleEdit(proteinado)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{proteinado.nome}</h3>
                  {proteinado.tipo && (
                    <p className="text-sm text-gray-500">{proteinado.tipo}</p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    proteinado.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {proteinado.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {proteinado.marca && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Marca:</span> {proteinado.marca}
                  </p>
                )}

                {proteinado.fabricante && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Fabricante:</span> {proteinado.fabricante}
                  </p>
                )}

                {proteinado.fornecedor && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Fornecedor:</span> {proteinado.fornecedor}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(proteinado)
                  }}
                >
                  Editar
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(proteinado.id)
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
