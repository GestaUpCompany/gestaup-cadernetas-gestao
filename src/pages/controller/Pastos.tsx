import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal, CardItem } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface Pasto {
  id: string
  fazenda_id: string
  nome: string
  setor?: string
  tipo?: string
  metragem_cocho_m?: number
  nivel_degradacao?: number
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
    setor: '',
    tipo: '',
    metragem_cocho_m: '',
    nivel_degradacao: '',
    area_util_ha: '',
    especie: '',
    altura_entrada_cm: '',
    altura_saida_cm: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [pastoToDelete, setPastoToDelete] = useState<string | null>(null)

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
      setor: formData.setor || null,
      tipo: formData.tipo || null,
      metragem_cocho_m: formData.metragem_cocho_m ? parseFloat(formData.metragem_cocho_m) : null,
      nivel_degradacao: formData.nivel_degradacao ? parseInt(formData.nivel_degradacao) : null,
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
        setor: '',
        tipo: '',
        metragem_cocho_m: '',
        nivel_degradacao: '',
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
      setor: pasto.setor || '',
      tipo: pasto.tipo || '',
      metragem_cocho_m: pasto.metragem_cocho_m?.toString() || '',
      nivel_degradacao: pasto.nivel_degradacao?.toString() || '',
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
      setor: '',
      tipo: '',
      metragem_cocho_m: '',
      nivel_degradacao: '',
      area_util_ha: '',
      especie: '',
      altura_entrada_cm: '',
      altura_saida_cm: '',
    })
    setShowForm(false)
  }

  const handleDeleteClick = (id: string) => {
    setPastoToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!pastoToDelete) return

    const { error } = await supabase.from('pastos').delete().eq('id', pastoToDelete)

    if (error) {
      console.error('Erro ao excluir pasto:', error)
    } else {
      loadPastos()
    }

    setShowDeleteModal(false)
    setPastoToDelete(null)
  }

  const handleToggleActive = async (pasto: Pasto) => {
    const { error } = await supabase
      .from('pastos')
      .update({ ativo: !pasto.ativo })
      .eq('id', pasto.id)

    if (error) {
      console.error('Erro ao atualizar pasto:', error)
    } else {
      loadPastos()
    }
  }

  const shortcuts = [
    {
      key: 'f',
      ctrl: true,
      description: 'Buscar pastos',
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
      {!showForm && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Pastos</h2>
          <div className="flex gap-2 items-start">
            <Input
              type="text"
              placeholder="Buscar pasto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs border-gray-200 focus:border-accent h-10"
            />
            <Button onClick={() => setShowForm(true)} className="h-10">Novo Pasto</Button>
          </div>
        </div>
      )}

      {showForm && (
        <Card className="bg-white p-6 border-0 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {editingPasto ? 'Editar Pasto' : 'Novo Pasto'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-5 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  placeholder="Nome do pasto"
                  className="border-gray-200 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setor
                </label>
                <Input
                  type="text"
                  value={formData.setor}
                  onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                  placeholder="Setor"
                  className="border-gray-200 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full h-10 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-accent bg-white text-gray-700 transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="Cria">Cria</option>
                  <option value="Confinamento">Confinamento</option>
                  <option value="Engorda">Engorda</option>
                  <option value="Enfermaria">Enfermaria</option>
                  <option value="Recria">Recria</option>
                  <option value="RIP">RIP</option>
                  <option value="TIP">TIP</option>
                  <option value="Volumosos">Volumosos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metragem Cocho (m)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.metragem_cocho_m}
                  onChange={(e) => setFormData({ ...formData, metragem_cocho_m: e.target.value })}
                  placeholder="0"
                  className="border-gray-200 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nível Degradação
                </label>
                <select
                  value={formData.nivel_degradacao}
                  onChange={(e) => setFormData({ ...formData, nivel_degradacao: e.target.value })}
                  className="w-full h-10 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-accent bg-white text-gray-700 transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Área Útil (ha) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.area_util_ha}
                onChange={(e) => setFormData({ ...formData, area_util_ha: e.target.value })}
                required
                placeholder="Ex: 50.5"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Espécie <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.especie}
                onChange={(e) => setFormData({ ...formData, especie: e.target.value })}
                required
                placeholder="Ex: Brachiaria"
                className="border-gray-200 focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Altura Entrada (cm) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.altura_entrada_cm}
                  onChange={(e) => setFormData({ ...formData, altura_entrada_cm: e.target.value })}
                  required
                  placeholder="Ex: 15.0"
                  className="border-gray-200 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Altura Saída (cm) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.altura_saida_cm}
                  onChange={(e) => setFormData({ ...formData, altura_saida_cm: e.target.value })}
                  required
                  placeholder="Ex: 5.0"
                  className="border-gray-200 focus:border-accent"
                />
              </div>
            </div>

            <div className="flex gap-2 items-center">
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

      {!showForm && pastos.length === 0 ? (
        <Card className="bg-white p-12 border-0 shadow-sm text-center">
          <p className="text-gray-600 mb-4">Nenhum pasto cadastrado</p>
          <Button onClick={() => setShowForm(true)}>Criar Primeiro Pasto</Button>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pastos
            .filter((pasto) =>
              pasto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (pasto.especie && pasto.especie.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .map((pasto) => (
              <CardItem
                key={pasto.id}
                title={pasto.nome}
                subtitle={pasto.area_util_ha ? `Área: ${pasto.area_util_ha} ha` : undefined}
                status={pasto.ativo}
                onClick={() => handleEdit(pasto)}
              >
                {pasto.especie && (
                  <p className="text-sm text-gray-500 mb-2">Espécie: {pasto.especie}</p>
                )}

                {(pasto.altura_entrada_cm || pasto.altura_saida_cm) && (
                  <div className="text-sm text-gray-500 mb-4">
                    {pasto.altura_entrada_cm && (
                      <p>Entrada: {pasto.altura_entrada_cm} cm</p>
                    )}
                    {pasto.altura_saida_cm && (
                      <p>Saída: {pasto.altura_saida_cm} cm</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 text-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleActive(pasto)
                    }}
                  >
                    {pasto.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(pasto)
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(pasto.id)
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
        title="Excluir Pasto"
        message="Tem certeza que deseja excluir este pasto? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
