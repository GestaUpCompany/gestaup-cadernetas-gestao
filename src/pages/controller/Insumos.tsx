import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input } from '../../components/ui'

interface Insumo {
  id: string
  fazenda_id: string
  nome: string
  tipo?: string
  estoque_atual?: number
  unidade?: string
  ativo: boolean
}

export function Insumos() {
  const { user } = useAuth()
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    tipo: '',
    estoque_atual: '',
    unidade: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadInsumos()
  }, [user])

  const loadInsumos = async () => {
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
      .from('insumos')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar insumos:', error)
    } else {
      setInsumos(data as Insumo[])
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
      tipo: formData.tipo || null,
      estoque_atual: formData.estoque_atual ? parseFloat(formData.estoque_atual) : null,
      unidade: formData.unidade || null,
    }

    let error

    if (editingInsumo) {
      // Atualizar insumo existente
      const { error: updateError } = await supabase
        .from('insumos')
        .update(data)
        .eq('id', editingInsumo.id)
      error = updateError
    } else {
      // Criar novo insumo
      const { error: insertError } = await supabase.from('insumos').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar insumo:', error)
    } else {
      setFormData({
        nome: '',
        tipo: '',
        estoque_atual: '',
        unidade: '',
      })
      setShowForm(false)
      setEditingInsumo(null)
      loadInsumos()
    }

    setSubmitting(false)
  }

  const handleEdit = (insumo: Insumo) => {
    setEditingInsumo(insumo)
    setFormData({
      nome: insumo.nome,
      tipo: insumo.tipo || '',
      estoque_atual: insumo.estoque_atual?.toString() || '',
      unidade: insumo.unidade || '',
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingInsumo(null)
    setFormData({
      nome: '',
      tipo: '',
      estoque_atual: '',
      unidade: '',
    })
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este insumo?')) return

    const { error } = await supabase.from('insumos').delete().eq('id', id)

    if (error) {
      console.error('Erro ao excluir insumo:', error)
    } else {
      loadInsumos()
    }
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Insumos</h2>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Buscar insumo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={() => setShowForm(true)}>Novo Insumo</Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-white p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {editingInsumo ? 'Editar Insumo' : 'Novo Insumo'}
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
                placeholder="Nome do insumo"
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
                placeholder="Ex: Ração, Sal, Vacina, Medicamento"
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidade
              </label>
              <Input
                type="text"
                value={formData.unidade}
                onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                placeholder="Ex: kg, litros, unidades"
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

      {insumos.length === 0 ? (
        <Card className="bg-white p-6 text-center">
          <p className="text-gray-600 mb-4">Nenhum insumo cadastrado</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeiro Insumo</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insumos
            .filter((insumo) =>
              insumo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (insumo.tipo && insumo.tipo.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .map((insumo) => (
            <Card key={insumo.id} className="bg-white p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{insumo.nome}</h3>
                  {insumo.tipo && (
                    <p className="text-sm text-gray-600">{insumo.tipo}</p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    insumo.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {insumo.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {insumo.estoque_atual !== undefined && insumo.estoque_atual !== null && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Estoque:</span> {insumo.estoque_atual}
                    {insumo.unidade && ` ${insumo.unidade}`}
                  </p>
                )}

                {insumo.unidade && !insumo.estoque_atual && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Unidade:</span> {insumo.unidade}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleEdit(insumo)}>
                  Editar
                </Button>
                <Button variant="secondary" onClick={() => handleDelete(insumo.id)}>
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
