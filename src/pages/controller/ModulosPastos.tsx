import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal } from '../../components/ui'

interface ModuloPasto {
  id: string
  fazenda_id: string
  nome: string
  area_util_total_ha: number
  ativo: boolean
  deleted_at?: string
  pastos?: Pasto[]
}

interface Pasto {
  id: string
  nome: string
  area_util_ha?: number
  especie?: string
  modulo_id?: string
}

export function ModulosPastos() {
  const { user } = useAuth()
  const [modulos, setModulos] = useState<ModuloPasto[]>([])
  const [pastos, setPastos] = useState<Pasto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingModulo, setEditingModulo] = useState<ModuloPasto | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [selectedPastos, setSelectedPastos] = useState<string[]>([])
  const [calculatedArea, setCalculatedArea] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [moduloToDelete, setModuloToDelete] = useState<ModuloPasto | null>(null)

  const loadModulos = async () => {
    if (!user) return

    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) {
      setLoading(false)
      return
    }

    const fazendaId = vinculos[0].fazenda_id

    const { data, error } = await supabase
      .from('modulos_pastos')
      .select('*, pastos(id, nome, area_util_ha, especie)')
      .eq('fazenda_id', fazendaId)
      .order('nome')

    if (error) {
      console.error('Erro ao carregar módulos:', error)
    } else {
      setModulos(data || [])
    }

    setLoading(false)
  }

  const loadPastos = async (moduloId?: string) => {
    if (!user) return

    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    let query = supabase
      .from('pastos')
      .select('id, nome, area_util_ha, especie, modulo_id')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)

    // Se estiver editando um módulo, mostrar pastos órfãos OU pastos deste módulo
    // Se estiver criando novo módulo, mostrar apenas pastos órfãos
    if (moduloId) {
      query = query.or(`modulo_id.is.null,modulo_id.eq.${moduloId}`)
    } else {
      query = query.is('modulo_id', null)
    }

    const { data, error } = await query.order('nome')

    if (error) {
      console.error('Erro ao carregar pastos:', error)
    } else {
      setPastos(data || [])
    }
  }

  useEffect(() => {
    loadModulos()
    loadPastos()
  }, [user])

  useEffect(() => {
    // Recarregar pastos quando mudar entre criar/editar
    if (editingModulo) {
      loadPastos(editingModulo.id)
    } else {
      loadPastos()
    }
  }, [editingModulo])

  useEffect(() => {
    const totalArea = selectedPastos.reduce((sum, pastoId) => {
      const pasto = pastos.find(p => p.id === pastoId)
      return sum + (pasto?.area_util_ha || 0)
    }, 0)
    setCalculatedArea(totalArea)
  }, [selectedPastos, pastos])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    if (!user) {
      setSubmitting(false)
      return
    }

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
    }

    let moduloId: string | undefined
    let error

    if (editingModulo) {
      const { error: updateError } = await supabase
        .from('modulos_pastos')
        .update(data)
        .eq('id', editingModulo.id)
      error = updateError
      moduloId = editingModulo.id
    } else {
      const { data: insertedData, error: insertError } = await supabase.from('modulos_pastos').insert(data).select('id').single()
      error = insertError
      moduloId = insertedData?.id
    }

    if (error) {
      console.error('Erro ao salvar módulo:', error)
    } else if (moduloId) {
      // Get old associations BEFORE deleting (to identify pastos to orphan)
      let oldPastoIds: string[] = []
      if (editingModulo) {
        const { data: oldRotacoes } = await supabase
          .from('rotacao_pastos')
          .select('pasto_id')
          .eq('modulo_id', moduloId)
        
        oldPastoIds = oldRotacoes?.map(r => r.pasto_id) || []
      }

      // Remove existing associations
      await supabase
        .from('rotacao_pastos')
        .delete()
        .eq('modulo_id', moduloId)

      // Add new associations
      if (selectedPastos.length > 0) {
        const rotacoes = selectedPastos.map((pastoId, index) => ({
          modulo_id: moduloId,
          pasto_id: pastoId,
          ordem: index + 1,
        }))

        await supabase.from('rotacao_pastos').insert(rotacoes)
      }

      // Update pastos modulo_id for selected pastos
      await supabase
        .from('pastos')
        .update({ modulo_id: selectedPastos.length > 0 ? moduloId : null })
        .in('id', selectedPastos)

      // Reset modulo_id for pastos that were previously in this module but are no longer selected
      if (editingModulo && oldPastoIds.length > 0) {
        const toReset = oldPastoIds.filter(id => !selectedPastos.includes(id))
        if (toReset.length > 0) {
          await supabase
            .from('pastos')
            .update({ modulo_id: null })
            .in('id', toReset)
        }
      }

      setFormData({ nome: '' })
      setSelectedPastos([])
      setShowForm(false)
      setEditingModulo(null)
      loadModulos()
    }

    setSubmitting(false)
  }

  const handleEdit = async (modulo: ModuloPasto) => {
    setEditingModulo(modulo)
    setFormData({
      nome: modulo.nome,
    })
    
    // Load associated pastos
    const { data: rotacoes } = await supabase
      .from('rotacao_pastos')
      .select('pasto_id')
      .eq('modulo_id', modulo.id)
      .eq('ativo', true)
    
    setSelectedPastos(rotacoes?.map(r => r.pasto_id) || [])
    setShowForm(true)
  }

  const handleToggleActive = async (modulo: ModuloPasto) => {
    const { error } = await supabase
      .from('modulos_pastos')
      .update({ ativo: !modulo.ativo })
      .eq('id', modulo.id)

    if (error) {
      console.error('Erro ao atualizar status do módulo:', error)
    } else {
      loadModulos()
    }
  }

  const handleDelete = async () => {
    if (!moduloToDelete) return

    // Primeiro, tornar os pastos órfãos (limpar modulo_id)
    const { error: pastosError } = await supabase
      .from('pastos')
      .update({ modulo_id: null })
      .eq('modulo_id', moduloToDelete.id)

    if (pastosError) {
      console.error('Erro ao liberar pastos:', pastosError)
    }

    // Depois, fazer soft delete do módulo (marcar como deletado)
    const { error } = await supabase
      .from('modulos_pastos')
      .update({ 
        ativo: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', moduloToDelete.id)

    if (error) {
      console.error('Erro ao desativar módulo:', error)
    } else {
      setShowDeleteModal(false)
      setModuloToDelete(null)
      loadModulos()
      loadPastos() // Recarregar pastos para atualizar a lista
    }
  }

  const handleCancel = () => {
    setEditingModulo(null)
    setFormData({ nome: '' })
    setSelectedPastos([])
    setShowForm(false)
  }


  const filteredModulos = modulos.filter(
    (modulo) =>
      modulo.nome.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !modulo.deleted_at &&
      (showInactive || modulo.ativo)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Módulos de Pastos</h1>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          Novo Módulo
        </Button>
      </div>

      {!showForm && (
        <div className="flex items-center justify-between mb-4">
          <Input
            type="text"
            placeholder="Buscar módulo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          <button
            type="button"
            onClick={() => setShowInactive(!showInactive)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 border-2 ${
              showInactive
                ? 'bg-primary text-white border-primary hover:bg-primary/90'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showInactive ? '✓ Mostrando Desativados' : 'Mostrar Desativados'}
          </button>
        </div>
      )}

      {showForm && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {editingModulo ? 'Editar Módulo' : 'Novo Módulo'}
            </h2>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="Fechar formulário"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                placeholder="Ex: Módulo 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Área Total (ha)
              </label>
              <Input
                type="text"
                value={calculatedArea.toFixed(2)}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">Calculada automaticamente com base nos piquetes selecionados</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Piquetes
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {pastos.map((pasto) => (
                  <button
                    key={pasto.id}
                    type="button"
                    onClick={() => {
                      if (selectedPastos.includes(pasto.id)) {
                        setSelectedPastos(selectedPastos.filter(id => id !== pasto.id))
                      } else {
                        setSelectedPastos([...selectedPastos, pasto.id])
                      }
                    }}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedPastos.includes(pasto.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{pasto.nome}</div>
                    <div className="text-sm text-gray-600">
                      {pasto.especie || '—'} • {pasto.area_util_ha?.toFixed(2) || 0} ha
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : editingModulo ? 'Atualizar' : 'Salvar'}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !showForm && filteredModulos.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500">
            {searchTerm ? 'Nenhum módulo encontrado' : 'Nenhum módulo cadastrado'}
          </p>
        </Card>
      ) : !showForm ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModulos.map((modulo) => (
            <Card key={modulo.id} className={`hover:shadow-lg transition-shadow flex flex-col ${!modulo.ativo ? 'opacity-60' : ''}`}>
              <div className="flex flex-col flex-grow space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{modulo.nome}</h3>
                    <p className="text-sm text-gray-600">
                      Área Útil Total: {modulo.area_util_total_ha?.toFixed(2) || 0} ha
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      modulo.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {modulo.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {modulo.pastos && modulo.pastos.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Piquetes ({modulo.pastos.length}):</p>
                    <div className="flex flex-wrap gap-1">
                      {modulo.pastos.map((pasto) => (
                        <span
                          key={pasto.id}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                        >
                          {pasto.nome}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-auto pt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEdit(modulo)}
                  className="flex-1"
                >
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggleActive(modulo)}
                  className="text-red-600 hover:text-red-700"
                >
                  {modulo.ativo ? 'Desativar' : 'Ativar'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setModuloToDelete(modulo)
                    setShowDeleteModal(true)
                  }}
                  className="text-red-600 hover:text-red-700"
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
        onClose={() => {
          setShowDeleteModal(false)
          setModuloToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Excluir Módulo"
        message={`Tem certeza que deseja excluir o módulo "${moduloToDelete?.nome}"? Esta ação pode ser desfeita reativando o módulo.`}
      />

    </div>
  )
}
