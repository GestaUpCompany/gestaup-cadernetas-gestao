import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal, CardItem } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface TabConfig {
  key: string
  label: string
  table: string
  fields: { name: string; label: string; required?: boolean; placeholder?: string }[]
  searchPlaceholder: string
}

const tabs: TabConfig[] = [
  {
    key: 'racas',
    label: 'Raças',
    table: 'racas',
    fields: [{ name: 'nome', label: 'Nome', required: true, placeholder: 'Nome da raça' }],
    searchPlaceholder: 'Buscar raça...',
  },
  {
    key: 'setores',
    label: 'Setores',
    table: 'setores',
    fields: [{ name: 'nome', label: 'Nome', required: true, placeholder: 'Nome do setor' }],
    searchPlaceholder: 'Buscar setor...',
  },
  {
    key: 'locais',
    label: 'Locais',
    table: 'locais',
    fields: [{ name: 'nome', label: 'Nome', required: true, placeholder: 'Nome do local' }],
    searchPlaceholder: 'Buscar local...',
  },
  {
    key: 'causas-morte',
    label: 'Causas de Morte',
    table: 'causas_morte',
    fields: [
      { name: 'nome', label: 'Nome', required: true, placeholder: 'Nome da causa de morte' },
      { name: 'descricao', label: 'Descrição', placeholder: 'Descrição opcional' },
    ],
    searchPlaceholder: 'Buscar causa de morte...',
  },
  {
    key: 'implementos',
    label: 'Implementos',
    table: 'implementos',
    fields: [{ name: 'nome', label: 'Nome', required: true, placeholder: 'Nome do implemento' }],
    searchPlaceholder: 'Buscar implemento...',
  },
  {
    key: 'tratamentos',
    label: 'Tratamentos de Maternidade',
    table: 'tratamentos',
    fields: [{ name: 'nome', label: 'Nome', required: true, placeholder: 'Nome do tratamento' }],
    searchPlaceholder: 'Buscar tratamento...',
  },
  {
    key: 'itens-almoxarifado',
    label: 'Itens do Almoxarifado',
    table: 'itens_almoxarifado',
    fields: [
      { name: 'nome', label: 'Nome', required: true, placeholder: 'Nome do item' },
      { name: 'classificacao', label: 'Classificação', placeholder: 'Classificação do item' },
    ],
    searchPlaceholder: 'Buscar item...',
  },
  {
    key: 'itens-supermercado',
    label: 'Itens de Supermercado',
    table: 'itens_supermercado',
    fields: [
      { name: 'nome', label: 'Nome', required: true, placeholder: 'Nome do item' },
      { name: 'unidade_medida', label: 'Unidade de Medida', placeholder: 'Ex: kg, un, litro' },
    ],
    searchPlaceholder: 'Buscar item...',
  },
  {
    key: 'pluviometros',
    label: 'Pluviômetros',
    table: 'pluviometros',
    fields: [
      { name: 'nome', label: 'Nome', required: true, placeholder: 'Nome do pluviômetro' },
      { name: 'localizacao', label: 'Localização', placeholder: 'Localização do pluviômetro' },
    ],
    searchPlaceholder: 'Buscar pluviômetro...',
  },
  {
    key: 'maquinas-veiculos',
    label: 'Máquinas e Veículos',
    table: 'maquinas_veiculos',
    fields: [
      { name: 'nome', label: 'Nome', required: true, placeholder: 'Nome da máquina/veículo' },
      { name: 'tipo', label: 'Tipo', placeholder: 'Ex: Trator, Caminhão' },
      { name: 'categoria', label: 'Categoria', placeholder: 'Ex: Próprio, Alugado' },
      { name: 'modelo', label: 'Modelo', placeholder: 'Modelo' },
      { name: 'placa', label: 'Placa', placeholder: 'Placa' },
      { name: 'status', label: 'Status', placeholder: 'Ex: Ativo, Manutenção' },
    ],
    searchPlaceholder: 'Buscar máquina/veículo...',
  },
  {
    key: 'funcionarios',
    label: 'Funcionários',
    table: 'funcionarios',
    fields: [
      { name: 'nome', label: 'Nome', required: true, placeholder: 'Nome do funcionário' },
      { name: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
      { name: 'telefone', label: 'Telefone', placeholder: '(00) 00000-0000' },
      { name: 'cargo', label: 'Cargo', placeholder: 'Ex: Veterinário, Capataz' },
    ],
    searchPlaceholder: 'Buscar funcionário...',
  },
  {
    key: 'medicamentos',
    label: 'Medicamentos',
    table: 'medicamentos',
    fields: [
      { name: 'nome_comercial', label: 'Nome Comercial', required: true, placeholder: 'Nome do medicamento' },
      { name: 'principio_ativo', label: 'Princípio Ativo', placeholder: 'Princípio ativo' },
      { name: 'tipo', label: 'Tipo', placeholder: 'Ex: Antibiótico, Vermífugo' },
      { name: 'dose_recomendada', label: 'Dose Recomendada', placeholder: 'Ex: 1ml/50kg' },
    ],
    searchPlaceholder: 'Buscar medicamento...',
  },
  {
    key: 'bebedouros',
    label: 'Bebedouros',
    table: 'bebedouros',
    fields: [
      { name: 'nome', label: 'Nome', required: true, placeholder: 'Nome do bebedouro' },
      { name: 'capacidade', label: 'Capacidade (L)', placeholder: 'Ex: 500' },
      { name: 'meta_intervalo_limpeza', label: 'Meta Intervalo Limpeza (dias)', placeholder: 'Ex: 30' },
    ],
    searchPlaceholder: 'Buscar bebedouro...',
  },
]

interface GenericItem {
  id: string
  fazenda_id: string
  nome: string
  nome_comercial?: string
  descricao?: string
  classificacao?: string
  localizacao?: string
  unidade_medida?: string
  tipo?: string
  categoria?: string
  modelo?: string
  placa?: string
  status?: string
  cpf?: string
  telefone?: string
  cargo?: string
  principio_ativo?: string
  dose_recomendada?: string
  capacidade?: number
  meta_intervalo_limpeza?: number
  ativo: boolean
  [key: string]: any
}

interface TabState {
  items: GenericItem[]
  loading: boolean
  showForm: boolean
  editingItem: GenericItem | null
  searchTerm: string
  formData: Record<string, string>
  submitting: boolean
}

const defaultTabState: TabState = {
  items: [],
  loading: true,
  showForm: false,
  editingItem: null,
  searchTerm: '',
  formData: {},
  submitting: false,
}

export function CadastrosAuxiliares() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(tabs[0].key)
  const [tabStates, setTabStates] = useState<Record<string, TabState>>(
    () => Object.fromEntries(tabs.map((t) => [t.key, { ...defaultTabState }]))
  )
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ tab: string; id: string } | null>(null)

  const currentTab = tabs.find((t) => t.key === activeTab)!
  const state = tabStates[activeTab]

  useEffect(() => {
    loadItems(activeTab)
  }, [activeTab, user])

  const getFazendaId = async (): Promise<string | null> => {
    if (!user) return null
    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return null
    return vinculos[0].fazenda_id
  }

  const loadItems = async (tabKey: string) => {
    const fazendaId = await getFazendaId()
    if (!fazendaId) return

    const tab = tabs.find((t) => t.key === tabKey)!
    const { data, error } = await supabase
      .from(tab.table)
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('nome', { ascending: true })

    if (error) {
      console.error(`Erro ao buscar ${tab.label}:`, error)
    }

    setTabStates((prev) => ({
      ...prev,
      [tabKey]: {
        ...prev[tabKey],
        items: data || [],
        loading: false,
      },
    }))
  }

  const getInitialFormData = (tab: TabConfig): Record<string, string> => {
    const data: Record<string, string> = {}
    tab.fields.forEach((f) => (data[f.name] = ''))
    return data
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setTabStates((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], submitting: true },
    }))

    const fazendaId = await getFazendaId()
    if (!fazendaId) {
      setTabStates((prev) => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], submitting: false },
      }))
      return
    }

    const tab = tabs.find((t) => t.key === activeTab)!
    const data: any = { fazenda_id: fazendaId }
    tab.fields.forEach((f) => {
      const value = state.formData[f.name]
      data[f.name] = value || null
    })

    let error
    if (state.editingItem) {
      const { error: updateError } = await supabase
        .from(tab.table)
        .update(data)
        .eq('id', state.editingItem.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from(tab.table).insert(data)
      error = insertError
    }

    if (error) {
      console.error(`Erro ao salvar ${tab.label}:`, error)
      alert(`Erro ao salvar. Verifique se já não existe um registro com este nome.`)
    } else {
      setTabStates((prev) => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          formData: getInitialFormData(tab),
          showForm: false,
          editingItem: null,
          submitting: false,
        },
      }))
      loadItems(activeTab)
    }

    setTabStates((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], submitting: false },
    }))
  }

  const handleEdit = (item: GenericItem) => {
    const tab = tabs.find((t) => t.key === activeTab)!
    const formData: Record<string, string> = {}
    tab.fields.forEach((f) => {
      formData[f.name] = item[f.name] || ''
    })

    setTabStates((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        editingItem: item,
        formData,
        showForm: true,
      },
    }))
  }

  const handleCancel = () => {
    const tab = tabs.find((t) => t.key === activeTab)!
    setTabStates((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        editingItem: null,
        formData: getInitialFormData(tab),
        showForm: false,
      },
    }))
  }

  const handleDeleteClick = (id: string) => {
    setItemToDelete({ tab: activeTab, id })
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return

    const tab = tabs.find((t) => t.key === itemToDelete.tab)!
    const { error } = await supabase.from(tab.table).delete().eq('id', itemToDelete.id)

    if (error) {
      console.error(`Erro ao excluir ${tab.label}:`, error)
    } else {
      loadItems(itemToDelete.tab)
    }

    setShowDeleteModal(false)
    setItemToDelete(null)
  }

  const handleToggleActive = async (item: GenericItem) => {
    const tab = tabs.find((t) => t.key === activeTab)!
    const { error } = await supabase
      .from(tab.table)
      .update({ ativo: !item.ativo })
      .eq('id', item.id)

    if (error) {
      console.error('Erro ao atualizar status:', error)
    } else {
      loadItems(activeTab)
    }
  }

  const setFormField = (field: string, value: string) => {
    setTabStates((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        formData: { ...prev[activeTab].formData, [field]: value },
      },
    }))
  }

  const setSearchTerm = (value: string) => {
    setTabStates((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], searchTerm: value },
    }))
  }

  const setShowForm = (show: boolean) => {
    setTabStates((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        showForm: show,
        formData: show ? prev[activeTab].formData : getInitialFormData(currentTab),
        editingItem: show ? prev[activeTab].editingItem : null,
      },
    }))
  }

  const shortcuts = [
    {
      key: 'f',
      ctrl: true,
      description: 'Buscar',
      action: () => {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
        searchInput?.focus()
      },
    },
  ]

  useKeyboardShortcuts(shortcuts)

  const filteredItems = state.items.filter((item) => {
    const search = state.searchTerm.toLowerCase()
    if (!search) return true
    return (
      item.nome.toLowerCase().includes(search) ||
      currentTab.fields.some((f) => {
        const val = item[f.name]
        return val && String(val).toLowerCase().includes(search)
      })
    )
  })

  return (
    <div className="space-y-6 max-w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Cadastros Auxiliares</h2>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-gray-200 pb-1">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 sm:px-4 py-2.5 sm:py-2 text-sm font-medium rounded-t-lg transition-colors min-h-[44px] ${
                activeTab === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Tab Content */}
      <div className="space-y-4 max-w-full">
        {/* Search + Add */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <Input
            type="text"
            placeholder={currentTab.searchPlaceholder}
            value={state.searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-xs border-gray-200 focus:border-accent h-10"
          />
          <Button onClick={() => setShowForm(true)} className="h-10 min-h-[44px] w-full sm:w-auto">
            Novo {currentTab.label}
          </Button>
        </div>

        {/* Form */}
        {state.showForm && (
          <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
              {state.editingItem ? `Editar ${currentTab.label}` : `Novo ${currentTab.label}`}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {currentTab.fields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <Input
                      type="text"
                      value={state.formData[field.name] || ''}
                      onChange={(e) => setFormField(field.name, e.target.value)}
                      required={field.required}
                      placeholder={field.placeholder}
                      className="border-gray-200 focus:border-accent min-h-[44px]"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Button type="submit" disabled={state.submitting} className="w-full sm:w-auto min-h-[44px]">
                  {state.submitting ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button variant="secondary" onClick={handleCancel} className="w-full sm:w-auto min-h-[44px]">
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Items Grid */}
        {state.loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : !state.showForm && filteredItems.length === 0 ? (
          <Card className="bg-white p-8 sm:p-12 border-0 shadow-sm text-center">
            <p className="text-gray-600 mb-4 text-sm sm:text-base">Nenhum {currentTab.label.toLowerCase()} cadastrado</p>
            <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
              Criar Primeiro {currentTab.label}
            </Button>
          </Card>
        ) : !state.showForm ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredItems.map((item) => (
              <CardItem
                key={item.id}
                title={item.nome || item.nome_comercial || 'Sem nome'}
                subtitle={
                  currentTab.fields
                    .filter((f) => !['nome', 'nome_comercial'].includes(f.name) && item[f.name])
                    .map((f) => `${f.label}: ${item[f.name]}`)
                    .join(' | ') || undefined
                }
                status={item.ativo}
                onClick={() => handleEdit(item)}
              >
                <div className="flex flex-wrap gap-1 sm:gap-2 mt-auto">
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleActive(item)
                    }}
                  >
                    {item.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(item)
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(item.id)
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </CardItem>
            ))}
          </div>
        ) : null}
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Registro"
        message="Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
