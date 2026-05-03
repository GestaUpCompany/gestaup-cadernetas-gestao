import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input } from '../../components/ui'

interface Pasto {
  id: string
  fazenda_id: string
  nome: string
  area_util_ha?: number
  especie?: string
  altura_entrada_cm?: number
  altura_saida_cm?: number
  ativo: boolean
}

export function Pastos() {
  const { user } = useAuth()
  const [pastos, setPastos] = useState<Pasto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPasto, setEditingPasto] = useState<Pasto | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    area_util_ha: '',
    especie: '',
    altura_entrada_cm: '',
    altura_saida_cm: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadPastos()
  }, [user])

  const loadPastos = async () => {
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
      .from('pastos')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar pastos:', error)
    } else {
      setPastos(data as Pasto[])
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
      area_util_ha: formData.area_util_ha ? parseFloat(formData.area_util_ha) : null,
      especie: formData.especie || null,
      altura_entrada_cm: formData.altura_entrada_cm ? parseFloat(formData.altura_entrada_cm) : null,
      altura_saida_cm: formData.altura_saida_cm ? parseFloat(formData.altura_saida_cm) : null,
    }

    let error

    if (editingPasto) {
      // Atualizar pasto existente
      const { error: updateError } = await supabase
        .from('pastos')
        .update(data)
        .eq('id', editingPasto.id)
      error = updateError
    } else {
      // Criar novo pasto
      const { error: insertError } = await supabase.from('pastos').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar pasto:', error)
    } else {
      setFormData({
        nome: '',
        area_util_ha: '',
        especie: '',
        altura_entrada_cm: '',
        altura_saida_cm: '',
      })
      setShowForm(false)
      setEditingPasto(null)
      loadPastos()
    }

    setSubmitting(false)
  }

  const handleEdit = (pasto: Pasto) => {
    setEditingPasto(pasto)
    setFormData({
      nome: pasto.nome,
      area_util_ha: pasto.area_util_ha?.toString() || '',
      especie: pasto.especie || '',
      altura_entrada_cm: pasto.altura_entrada_cm?.toString() || '',
      altura_saida_cm: pasto.altura_saida_cm?.toString() || '',
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingPasto(null)
    setFormData({
      nome: '',
      area_util_ha: '',
      especie: '',
      altura_entrada_cm: '',
      altura_saida_cm: '',
    })
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pasto?')) return

    const { error } = await supabase.from('pastos').delete().eq('id', id)

    if (error) {
      console.error('Erro ao excluir pasto:', error)
    } else {
      loadPastos()
    }
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Pastos</h2>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Buscar pasto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={() => setShowForm(true)}>Novo Pasto</Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-white p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {editingPasto ? 'Editar Pasto' : 'Novo Pasto'}
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
                placeholder="Nome do pasto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Área Útil (ha)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.area_util_ha}
                onChange={(e) => setFormData({ ...formData, area_util_ha: e.target.value })}
                placeholder="Ex: 50.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Espécie
              </label>
              <Input
                type="text"
                value={formData.especie}
                onChange={(e) => setFormData({ ...formData, especie: e.target.value })}
                placeholder="Ex: Brachiaria"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Altura Entrada (cm)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.altura_entrada_cm}
                  onChange={(e) => setFormData({ ...formData, altura_entrada_cm: e.target.value })}
                  placeholder="Ex: 15.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Altura Saída (cm)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.altura_saida_cm}
                  onChange={(e) => setFormData({ ...formData, altura_saida_cm: e.target.value })}
                  placeholder="Ex: 5.0"
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
            </div>
          </form>
        </Card>
      )}

      {pastos.length === 0 ? (
        <Card className="bg-white p-6 text-center">
          <p className="text-gray-600 mb-4">Nenhum pasto cadastrado</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeiro Pasto</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pastos
            .filter((pasto) =>
              pasto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (pasto.especie && pasto.especie.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .map((pasto) => (
              <Card key={pasto.id} className="bg-white p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">{pasto.nome}</h3>
                    {pasto.area_util_ha && (
                      <p className="text-sm text-gray-600">Área: {pasto.area_util_ha} ha</p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      pasto.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {pasto.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {pasto.especie && (
                  <p className="text-sm text-gray-600 mb-2">Espécie: {pasto.especie}</p>
                )}

                {(pasto.altura_entrada_cm || pasto.altura_saida_cm) && (
                  <div className="text-sm text-gray-600 mb-4">
                    {pasto.altura_entrada_cm && (
                      <p>Entrada: {pasto.altura_entrada_cm} cm</p>
                    )}
                    {pasto.altura_saida_cm && (
                      <p>Saída: {pasto.altura_saida_cm} cm</p>
                    )}
                  </div>
                )}

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleEdit(pasto)}>
                  Editar
                </Button>
                <Button variant="secondary" onClick={() => handleDelete(pasto.id)}>
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
