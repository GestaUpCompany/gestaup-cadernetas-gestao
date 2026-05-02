import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input } from '../../components/ui'

interface Lote {
  id: string
  fazenda_id: string
  nome: string
  numero_cabecas?: number
  categorias?: string[]
  peso_vivo_kg?: number
  quantidade_bezerros?: number
  ativo: boolean
}

export function Lotes() {
  const { user } = useAuth()
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLote, setEditingLote] = useState<Lote | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    numero_cabecas: '',
    categorias: [] as string[],
    categoria_outros: '',
    peso_vivo_kg: '',
    quantidade_bezerros: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const categoriasOpcoes = [
    'vaca',
    'touro',
    'boi gordo',
    'boi magro',
    'garrote',
    'bezerro',
    'novilha',
    'tropa',
  ]

  const handleCategoriaToggle = (categoria: string) => {
    if (formData.categorias.includes(categoria)) {
      setFormData({
        ...formData,
        categorias: formData.categorias.filter((c) => c !== categoria),
      })
    } else {
      setFormData({
        ...formData,
        categorias: [...formData.categorias, categoria],
      })
    }
  }

  useEffect(() => {
    loadLotes()
  }, [user])

  const loadLotes = async () => {
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
      .from('lotes')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar lotes:', error)
    } else {
      setLotes(data as Lote[])
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

    // Montar array de categorias
    const categoriasFinal = [...formData.categorias]
    if (formData.categoria_outros && formData.categoria_outros.trim()) {
      categoriasFinal.push(formData.categoria_outros.trim())
    }

    const data = {
      fazenda_id: fazendaId,
      nome: formData.nome,
      numero_cabecas: formData.numero_cabecas ? parseInt(formData.numero_cabecas) : null,
      categorias: categoriasFinal.length > 0 ? categoriasFinal : null,
      peso_vivo_kg: formData.peso_vivo_kg ? parseFloat(formData.peso_vivo_kg) : null,
      quantidade_bezerros: formData.quantidade_bezerros ? parseInt(formData.quantidade_bezerros) : null,
    }

    let error

    if (editingLote) {
      // Atualizar lote existente
      const { error: updateError } = await supabase
        .from('lotes')
        .update(data)
        .eq('id', editingLote.id)
      error = updateError
    } else {
      // Criar novo lote
      const { error: insertError } = await supabase.from('lotes').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar lote:', error)
    } else {
      setFormData({
        nome: '',
        numero_cabecas: '',
        categorias: [],
        categoria_outros: '',
        peso_vivo_kg: '',
        quantidade_bezerros: '',
      })
      setShowForm(false)
      setEditingLote(null)
      loadLotes()
    }

    setSubmitting(false)
  }

  const handleEdit = (lote: Lote) => {
    setEditingLote(lote)
    
    // Tratar categorias - podem vir como string JSON ou array
    let cats: string[] = []
    if (Array.isArray(lote.categorias)) {
      cats = lote.categorias
    } else if (typeof lote.categorias === 'string') {
      try {
        const parsed = JSON.parse(lote.categorias)
        cats = Array.isArray(parsed) ? parsed : []
      } catch (e) {
        cats = []
      }
    }

    setFormData({
      nome: lote.nome,
      numero_cabecas: lote.numero_cabecas?.toString() || '',
      categorias: cats,
      categoria_outros: '',
      peso_vivo_kg: lote.peso_vivo_kg?.toString() || '',
      quantidade_bezerros: lote.quantidade_bezerros?.toString() || '',
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingLote(null)
    setFormData({
      nome: '',
      numero_cabecas: '',
      categorias: [],
      categoria_outros: '',
      peso_vivo_kg: '',
      quantidade_bezerros: '',
    })
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lote?')) return

    const { error } = await supabase.from('lotes').delete().eq('id', id)

    if (error) {
      console.error('Erro ao excluir lote:', error)
    } else {
      loadLotes()
    }
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Lotes</h2>
        <Button onClick={() => setShowForm(true)}>Novo Lote</Button>
      </div>

      {showForm && (
        <Card className="bg-white p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {editingLote ? 'Editar Lote' : 'Novo Lote'}
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
                placeholder="Nome do lote"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Cabeças *
                </label>
                <Input
                  type="number"
                  value={formData.numero_cabecas}
                  onChange={(e) => setFormData({ ...formData, numero_cabecas: e.target.value })}
                  required
                  placeholder="Ex: 100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Peso Vivo (kg)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.peso_vivo_kg}
                  onChange={(e) => setFormData({ ...formData, peso_vivo_kg: e.target.value })}
                  placeholder="Ex: 450.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categorias
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {categoriasOpcoes.map((categoria) => (
                  <label key={categoria} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.categorias.includes(categoria)}
                      onChange={() => handleCategoriaToggle(categoria)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700 capitalize">{categoria}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outra Categoria
              </label>
              <Input
                type="text"
                value={formData.categoria_outros}
                onChange={(e) => setFormData({ ...formData, categoria_outros: e.target.value })}
                placeholder="Digite outra categoria (opcional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade de Bezerros
              </label>
              <Input
                type="number"
                value={formData.quantidade_bezerros}
                onChange={(e) => setFormData({ ...formData, quantidade_bezerros: e.target.value })}
                placeholder="Ex: 25"
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

      {lotes.length === 0 ? (
        <Card className="bg-white p-6 text-center">
          <p className="text-gray-600 mb-4">Nenhum lote cadastrado</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeiro Lote</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lotes.map((lote) => (
            <Card key={lote.id} className="bg-white p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{lote.nome}</h3>
                  {lote.numero_cabecas && (
                    <p className="text-sm text-gray-600">
                      {lote.numero_cabecas} cabeças
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    lote.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {lote.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {lote.peso_vivo_kg && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Peso Vivo:</span> {lote.peso_vivo_kg} kg
                  </p>
                )}

                {lote.categorias && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Categorias:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(() => {
                        let cats: string[] = []
                        if (Array.isArray(lote.categorias)) {
                          cats = lote.categorias
                        } else if (typeof lote.categorias === 'string') {
                          try {
                            const parsed = JSON.parse(lote.categorias)
                            cats = Array.isArray(parsed) ? parsed : []
                          } catch (e) {
                            cats = []
                          }
                        }
                        return cats.map((cat: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 rounded text-xs capitalize"
                          >
                            {cat}
                          </span>
                        ))
                      })()}
                    </div>
                  </div>
                )}

                {lote.quantidade_bezerros && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Bezerros:</span> {lote.quantidade_bezerros}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleEdit(lote)}>
                  Editar
                </Button>
                <Button variant="secondary" onClick={() => handleDelete(lote.id)}>
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
