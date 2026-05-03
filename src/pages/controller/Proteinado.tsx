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
  teor_proteico?: number
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
    teor_proteico: '',
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
      teor_proteico: formData.teor_proteico ? parseFloat(formData.teor_proteico) : null,
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
        teor_proteico: '',
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
      teor_proteico: proteinado.teor_proteico?.toString() || '',
      unidade_medida: proteinado.unidade_medida || '',
      peso_saco: proteinado.peso_saco?.toString() || '',
      estoque_atual: proteinado.estoque_atual?.toString() || '',
      estoque_minimo: proteinado.estoque_minimo?.toString() || '',
      custo_unitario: proteinado.custo_unitario?.toString() || '',
      custo_saco: proteinado.custo_saco?.toString() || '',
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
      teor_proteico: '',
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
                Teor Proteico (%)
              </label>
              <Input
                type="number"
                step="0.1"
                value={formData.teor_proteico}
                onChange={(e) => setFormData({ ...formData, teor_proteico: e.target.value })}
                placeholder="Ex: 45.0"
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

      {proteinados.length === 0 ? (
        <Card className="bg-white p-12 border-0 shadow-sm text-center">
          <div className="text-6xl mb-4">🥩</div>
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
                {proteinado.teor_proteico && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Teor Proteico:</span> {proteinado.teor_proteico}%
                  </p>
                )}

                {proteinado.estoque_atual !== undefined && proteinado.estoque_atual !== null && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Estoque:</span> {proteinado.estoque_atual}
                    {proteinado.unidade_medida && ` ${proteinado.unidade_medida}`}
                  </p>
                )}

                {proteinado.unidade_medida && !proteinado.estoque_atual && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Unidade:</span> {proteinado.unidade_medida}
                  </p>
                )}

                {proteinado.marca && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Marca:</span> {proteinado.marca}
                  </p>
                )}

                {proteinado.fornecedor && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Fornecedor:</span> {proteinado.fornecedor}
                  </p>
                )}

                {proteinado.custo_unitario && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Custo Unitário:</span> R$ {proteinado.custo_unitario.toFixed(2)}
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
