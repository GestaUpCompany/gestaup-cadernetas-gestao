import { useEffect, useState, ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, CardSkeleton, ConfirmModal, CardItem } from '../../components/ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import * as XLSX from 'xlsx'

interface TabConfig {
  key: string
  label: string
  table: string
  fields: { name: string; label: string; required?: boolean; placeholder?: string; options?: { label: string; value: string }[]; showIf?: (formData: Record<string, string>) => boolean }[]
  searchPlaceholder: string
  statusField?: 'ativo' | 'status'
  orderBy?: string
  category: string
  icon: ReactNode
}

// Simple inline SVG icons
const iconGenetica = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
)
const iconInfra = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
)
const iconMaquina = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
)
const iconSaude = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
)
const iconOperacional = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
)
const iconAgua = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
)

const tabs: TabConfig[] = [
  {
    key: 'racas',
    label: 'Raças',
    table: 'racas',
    fields: [{ name: 'nome', label: 'Nome', required: true, placeholder: 'Nome da raça' }],
    searchPlaceholder: 'Buscar raça...',
    category: 'Genética',
    icon: iconGenetica,
  },
  {
    key: 'setores',
    label: 'Setores',
    table: 'setores',
    fields: [{ name: 'nome', label: 'Nome', required: true, placeholder: 'Nome do setor' }],
    searchPlaceholder: 'Buscar setor...',
    category: 'Infraestrutura',
    icon: iconInfra,
  },
  {
    key: 'locais',
    label: 'Locais',
    table: 'locais',
    fields: [{ name: 'nome', label: 'Nome', required: true, placeholder: 'Nome do local' }],
    searchPlaceholder: 'Buscar local...',
    category: 'Infraestrutura',
    icon: iconInfra,
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
    category: 'Saúde & Reprodução',
    icon: iconSaude,
  },
  {
    key: 'implementos',
    label: 'Implementos',
    table: 'implementos',
    fields: [{ name: 'nome', label: 'Nome', required: true, placeholder: 'Nome do implemento' }],
    searchPlaceholder: 'Buscar implemento...',
    category: 'Máquinas & Equipamentos',
    icon: iconMaquina,
  },
  {
    key: 'tratamentos',
    label: 'Tratamentos de Maternidade',
    table: 'tratamentos',
    fields: [{ name: 'nome', label: 'Nome', required: true, placeholder: 'Nome do tratamento' }],
    searchPlaceholder: 'Buscar tratamento...',
    category: 'Saúde & Reprodução',
    icon: iconSaude,
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
    category: 'Operacional',
    icon: iconOperacional,
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
    category: 'Operacional',
    icon: iconOperacional,
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
    category: 'Infraestrutura',
    icon: iconAgua,
  },
  {
    key: 'maquinas-veiculos',
    label: 'Máquinas e Veículos',
    table: 'maquinas_veiculos',
    fields: [
      { name: 'marca', label: 'Marca', required: true, placeholder: 'Ex: John Deere, Massey Ferguson' },
      { name: 'modelo', label: 'Modelo', required: true, placeholder: 'Ex: 6110J, 4292' },
      { name: 'tipo', label: 'Tipo', required: true, options: [{ label: 'Máquina', value: 'Maquina' }, { label: 'Veículo', value: 'Veiculo' }] },
      { name: 'categoria', label: 'Categoria', required: true, options: [
        { label: 'Trator', value: 'Trator' },
        { label: 'Colheitadeira', value: 'Colheitadeira' },
        { label: 'Caminhão', value: 'Caminhao' },
        { label: 'Carro', value: 'Carro' },
        { label: 'Motocicleta', value: 'Motocicleta' },
        { label: 'Pulverizador', value: 'Pulverizador' },
        { label: 'Adubadeira', value: 'Adubadeira' },
        { label: 'Semeadora', value: 'Semeadora' },
        { label: 'Grade', value: 'Grade' },
        { label: 'Subsolador', value: 'Subsolador' },
        { label: 'Plaina', value: 'Plaina' },
        { label: 'Roçadeira', value: 'Rocadeira' },
        { label: 'Guincho', value: 'Guincho' },
        { label: 'Outro', value: 'Outro' },
      ]},
      { name: 'outro_categoria', label: 'Especificar Categoria', required: true, placeholder: 'Descreva a categoria', showIf: (d) => d.categoria === 'Outro' },
      { name: 'placa', label: 'Placa', placeholder: 'Placa' },
      { name: 'status', label: 'Status', options: [{ label: 'Ativo', value: 'Ativo' }, { label: 'Inativo', value: 'Inativo' }, { label: 'Manutenção', value: 'Manutencao' }] },
    ],
    searchPlaceholder: 'Buscar máquina/veículo...',
    statusField: 'status',
    category: 'Máquinas & Equipamentos',
    icon: iconMaquina,
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
    category: 'Operacional',
    icon: iconOperacional,
  },
  {
    key: 'medicamentos',
    label: 'Medicamentos',
    table: 'medicamentos',
    fields: [
      { name: 'nome_comercial', label: 'Nome Comercial', required: true, placeholder: 'Nome do medicamento' },
      { name: 'principio_ativo', label: 'Princípio Ativo', required: true, placeholder: 'Princípio ativo' },
      { name: 'tipo', label: 'Tipo', required: true, options: [
        { label: 'Antibiótico', value: 'Antibiotico' },
        { label: 'Vermífugo', value: 'Vermifugo' },
        { label: 'Carrapaticida', value: 'Carrapaticida' },
        { label: 'Vacina', value: 'Vacina' },
        { label: 'Anti-inflamatório', value: 'Anti_inflamatorio' },
        { label: 'Analgésico', value: 'Analgesico' },
        { label: 'Hormônio', value: 'Hormonio' },
        { label: 'Vitamina/Mineral', value: 'Vitamina_Mineral' },
        { label: 'Probiótico', value: 'Probiotico' },
        { label: 'Anti-stress', value: 'Anti_stress' },
        { label: 'Coccidiostático', value: 'Coccidiostatico' },
        { label: 'Flúido oral/Eletrólitos', value: 'Fluido_oral' },
        { label: 'Outro', value: 'Outro' },
      ]},
      { name: 'outro_tipo', label: 'Especificar Tipo', required: true, placeholder: 'Descreva o tipo', showIf: (d) => d.tipo === 'Outro' },
      { name: 'dose_recomendada', label: 'Dose Recomendada', placeholder: 'Ex: 1ml/50kg' },
    ],
    searchPlaceholder: 'Buscar medicamento...',
    orderBy: 'nome_comercial',
    category: 'Saúde & Reprodução',
    icon: iconSaude,
  },
  {
    key: 'bebedouros',
    label: 'Bebedouros',
    table: 'bebedouros',
    fields: [
      { name: 'nome', label: 'Nome', required: true, placeholder: 'Nome do bebedouro' },
      { name: 'capacidade', label: 'Capacidade (L)', placeholder: 'Ex: 500' },
      { name: 'meta_intervalo_limpeza', label: 'Meta Intervalo Limpeza (dias)', placeholder: 'Ex: 30' },
      { name: 'setor_id', label: 'Setor', placeholder: 'Selecione um setor' },
    ],
    searchPlaceholder: 'Buscar bebedouro...',
    category: 'Infraestrutura',
    icon: iconAgua,
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
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [setores, setSetores] = useState<{id: string, nome: string}[]>([])

  const currentTab = tabs.find((t) => t.key === activeTab)!
  const state = tabStates[activeTab]

  useEffect(() => {
    loadItems(activeTab)
    if (activeTab === 'bebedouros') {
      loadSetores()
    }
  }, [activeTab, user])

  const loadSetores = async () => {
    const fazendaId = await getFazendaId()
    if (!fazendaId) return

    const { data, error } = await supabase
      .from('setores')
      .select('id, nome')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao buscar setores:', error)
    } else {
      setSetores(data || [])
    }
  }

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
      .order(tab.orderBy || 'nome', { ascending: true })

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

    // Auto-populate nome for maquinas-veiculos from marca + modelo
    if (activeTab === 'maquinas-veiculos' && !data.nome) {
      const marca = state.formData.marca || ''
      const modelo = state.formData.modelo || ''
      data.nome = `${marca} ${modelo}`.trim() || null
    }

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

  const isItemActive = (item: GenericItem, tab: TabConfig) => {
    if (tab.statusField === 'status') {
      return item.status === 'Ativo'
    }
    return !!item.ativo
  }

  const handleToggleActive = async (item: GenericItem) => {
    const tab = tabs.find((t) => t.key === activeTab)!
    const active = isItemActive(item, tab)
    const updateData =
      tab.statusField === 'status'
        ? { status: active ? 'Inativo' : 'Ativo' }
        : { ativo: !active }
    const { error } = await supabase
      .from(tab.table)
      .update(updateData)
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

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return

    const file = e.target.files[0]
    setImporting(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      if (!user) {
        setImportError('Usuário não autenticado')
        setImporting(false)
        return
      }

      const { data: vinculos } = await supabase
        .from('usuario_fazenda')
        .select('fazenda_id')
        .eq('usuario_id', user.id)
        .eq('ativo', true)

      if (!vinculos || vinculos.length === 0) {
        setImportError('Nenhuma fazenda vinculada ao usuário')
        setImporting(false)
        return
      }

      const fazendaId = vinculos[0].fazenda_id

      const { data: existingBebedouros } = await supabase
        .from('bebedouros')
        .select('nome')
        .eq('fazenda_id', fazendaId)

      const existingNames = new Set(existingBebedouros?.map(b => b.nome.toLowerCase()) || [])

      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      if (jsonData.length < 2) {
        setImportError('Arquivo vazio ou sem dados')
        setImporting(false)
        return
      }

      const headers = jsonData[0].map((h: any) => h?.toString().trim())
      const rows = jsonData.slice(1)

      const requiredColumns = ['Nome/Numero', 'Capacidade (L)']
      const headersLower = headers.map(h => h.toLowerCase())
      const missingColumns = requiredColumns.filter(col => !headersLower.includes(col.toLowerCase()))

      if (missingColumns.length > 0) {
        setImportError(`Colunas obrigatórias faltando: ${missingColumns.join(', ')}`)
        setImporting(false)
        return
      }

      const colIndices: { [key: string]: number } = {}
      headers.forEach((header, index) => {
        colIndices[header.toLowerCase()] = index
      })

      const bebedourosToInsert: any[] = []
      const duplicates: { row: number; name: string }[] = []
      const invalidRows: { row: number; name: string; missingFields: string[] }[] = []
      let totalRowsProcessed = 0

      rows.forEach((row, rowIndex) => {
        const rowNum = rowIndex + 2
        const dataColumns = row.slice(0, 3)
        if (!row || row.length === 0 || dataColumns.every(cell => cell === undefined || cell === null || cell === '')) {
          return
        }

        totalRowsProcessed++

        try {
          const nome = row[colIndices['nome/numero']]?.toString().trim()
          const capacidade = parseFloat(row[colIndices['capacidade (l)']])
          const metaIntervalo = colIndices['meta de intervalo de limpeza (dias)'] !== undefined ? row[colIndices['meta de intervalo de limpeza (dias)']] ? parseInt(row[colIndices['meta de intervalo de limpeza (dias)']]) : null : null

          if (nome && existingNames.has(nome.toLowerCase())) {
            duplicates.push({ row: rowNum, name: nome })
            return
          }

          const missingFields: string[] = []
          if (!nome) missingFields.push('Nome/Numero')
          if (isNaN(capacidade) || capacidade <= 0) missingFields.push('Capacidade (L) - deve ser número positivo')

          if (metaIntervalo !== null && (isNaN(metaIntervalo) || metaIntervalo <= 0)) {
            missingFields.push('Meta de Intervalo de Limpeza (dias) - deve ser número positivo')
          }

          if (missingFields.length > 0) {
            invalidRows.push({ row: rowNum, name: nome || '(sem nome)', missingFields })
            return
          }

          bebedourosToInsert.push({
            fazenda_id: fazendaId,
            nome,
            capacidade,
            meta_intervalo_limpeza: metaIntervalo,
            ativo: true,
          })
        } catch {
          invalidRows.push({ row: rowNum, name: '(erro ao processar)', missingFields: ['Erro ao processar dados'] })
        }
      })

      if (bebedourosToInsert.length === 0) {
        setImportError('Nenhum dado válido para importar')
        setImporting(false)
        return
      }

      const { error: insertError } = await supabase.from('bebedouros').insert(bebedourosToInsert)

      if (insertError) {
        setImportError(`Erro ao inserir dados: ${insertError.message}`)
        setImporting(false)
        return
      }

      let successMessage = ''
      const totalSkipped = duplicates.length + invalidRows.length

      if (totalSkipped > 0) {
        successMessage = `${bebedourosToInsert.length} de ${totalRowsProcessed} bebedouros importados com sucesso!`
      } else {
        successMessage = `${bebedourosToInsert.length} bebedouros importados com sucesso!`
      }

      if (duplicates.length > 0) {
        successMessage += `\n\n${duplicates.length} linhas puladas porque já existem:\n${duplicates.map(d => `- Linha ${d.row}: "${d.name}"`).join('\n')}`
      }

      if (invalidRows.length > 0) {
        successMessage += `\n\n${invalidRows.length} linhas com erros de validação:\n${invalidRows.map(i => `- Linha ${i.row}: "${i.name}" - Campos inválidos: ${i.missingFields.join(', ')}`).join('\n')}`
        successMessage += '\n\nVolte à planilha, localize os bebedouros com dados irregulares/faltantes, realize as correções indicadas acima e faça upload do arquivo novamente.'
      }

      setImportSuccess(successMessage)
      loadItems('bebedouros')

      e.target.value = ''
    } catch (error) {
      setImportError(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    window.location.href = "/Modelo Bebedouros - Gesta'Up.xlsx"
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

      {/* Compact Category + Tab Bar */}
      {(() => {
        const groups = tabs.reduce<Record<string, TabConfig[]>>((acc, tab) => {
          acc[tab.category] = acc[tab.category] || []
          acc[tab.category].push(tab)
          return acc
        }, {})
        const categoryOrder = ['Genética', 'Infraestrutura', 'Máquinas & Equipamentos', 'Saúde & Reprodução', 'Operacional']
        const activeCategory = tabs.find((t) => t.key === activeTab)?.category || categoryOrder[0]
        return (
          <div className="border-b border-gray-200 pb-1 space-y-2">
            {/* Category pills */}
            <div className="flex flex-wrap gap-1">
              {categoryOrder.map((cat) => {
                if (!groups[cat]) return null
                const isActive = cat === activeCategory
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      const firstTab = groups[cat][0]
                      if (firstTab) setActiveTab(firstTab.key)
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full transition-colors min-h-[32px] ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
            {/* Tabs in active category */}
            <div className="flex flex-wrap gap-1">
              {groups[activeCategory]?.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2 text-sm font-medium rounded-lg transition-colors min-h-[40px] ${
                    activeTab === tab.key
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )
      })()}

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
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {activeTab === 'bebedouros' && (
              <>
                <Button onClick={downloadTemplate} variant="secondary" className="h-10 min-h-[44px] flex-1 sm:flex-none text-sm">
                  Baixar Modelo
                </Button>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportExcel}
                  disabled={importing}
                  className="hidden"
                  id="import-excel"
                />
                <Button
                  onClick={() => document.getElementById('import-excel')?.click()}
                  variant="secondary"
                  className="h-10 min-h-[44px] flex-1 sm:flex-none text-sm"
                  disabled={importing}
                >
                  {importing ? 'Importando...' : 'Importar Excel'}
                </Button>
              </>
            )}
            <Button onClick={() => setShowForm(true)} className="h-10 min-h-[44px] flex-1 sm:flex-none">
              Novo {currentTab.label}
            </Button>
          </div>
        </div>

        {/* Import Messages */}
        {importError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Erro na importação:</p>
            <pre className="text-sm mt-1 whitespace-pre-wrap">{importError}</pre>
          </div>
        )}

        {importSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <p className="font-medium whitespace-pre-line">{importSuccess}</p>
          </div>
        )}

        {/* Form */}
        {state.showForm && (
          <Card className="bg-white p-4 sm:p-6 border-0 shadow-sm">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
              {state.editingItem ? `Editar ${currentTab.label}` : `Novo ${currentTab.label}`}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {currentTab.fields.filter((field) => !field.showIf || field.showIf(state.formData)).map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.name === 'setor_id' ? (
                      <select
                        value={state.formData[field.name] || ''}
                        onChange={(e) => setFormField(field.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px] bg-white"
                      >
                        <option value="">{field.placeholder || 'Selecione'}</option>
                        {setores.map((setor) => (
                          <option key={setor.id} value={setor.id}>{setor.nome}</option>
                        ))}
                      </select>
                    ) : field.options ? (
                      <select
                        value={state.formData[field.name] || ''}
                        onChange={(e) => setFormField(field.name, e.target.value)}
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px] bg-white"
                      >
                        <option value="">Selecione</option>
                        {field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type="text"
                        value={state.formData[field.name] || ''}
                        onChange={(e) => setFormField(field.name, e.target.value)}
                        required={field.required}
                        placeholder={field.placeholder}
                        className="border-gray-200 focus:border-accent min-h-[44px]"
                      />
                    )}
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
                  <div className="flex flex-col gap-0.5">
                    {currentTab.fields
                      .filter((f) => !['nome', 'nome_comercial'].includes(f.name) && item[f.name])
                      .map((f) => (
                        <span key={f.name}>
                          {f.label}: {f.name === 'setor_id' 
                            ? setores.find(s => s.id === item[f.name])?.nome || item[f.name]
                            : item[f.name]
                          }
                        </span>
                      ))}
                  </div>
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
                    {isItemActive(item, currentTab) ? 'Desativar' : 'Ativar'}
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
