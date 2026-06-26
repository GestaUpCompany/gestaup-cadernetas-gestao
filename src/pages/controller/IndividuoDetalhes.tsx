import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, Select, NumericInput, CardSkeleton } from '../../components/ui'
import { formatDate } from '../../utils/formatDate'
import {
  calculateCompletenessScore,
  getSyncStatusFromScore,
  validateIndividuo,
  categoriasMacho,
  categoriasFemea,
  statusList,
  origens,
} from '../../utils/individualValidation'

interface Individuo {
  id: string
  fazenda_id: string
  id_manejo?: string
  id_brinco?: string
  id_chip?: string
  id_provisorio_cria?: string
  sexo: string
  categoria: string
  raca: string
  data_nascimento?: string
  peso_nascimento_kg?: number
  peso_atual_kg?: number
  status: string
  origem?: string
  sync_status?: string
  lote_atual?: string
  pasto_atual?: string
  setor_atual?: string
  pai?: string
  mae?: string
  idade_atual_dias?: number
  idade_atual_meses?: number
  periodo_fazenda_dias?: number
  data_entrada_fazenda?: string
  data_desmama?: string
  peso_desmama_kg?: number
  data_insercao_rastreabilidade?: string
  data_liberacao_sisbov?: string
  pv_entrada_kg?: number
  preco_entrada_reais_kg?: number
  preco_entrada_reais_arroba?: number
  preco_entrada_reais_cabeca?: number
  preco_arroba_boi_gordo?: number
  agio_desagio?: number
  data_formacao_lote?: string
  protocolo_sanitario?: string
  fornecedor?: string
  propriedade_origem?: string
  propriedade_atual?: string
  estrategia_nutricional_tipo?: string
  estrategia_nutricional_id?: string
  estrategia_nutricional_nome?: string
  gmd_kg_cab_dia?: number
  peso_meta_kg?: number
  created_at: string
  updated_at: string
}

interface SelectOption {
  id: string
  nome: string
}

interface Formulacao {
  id: string
  nome: string
  tipo?: string
}

interface Maternidade {
  id: string
  data: string
  id_brinco_mae?: string
  id_chip_mae?: string
}

interface RegistroMorte {
  id: string
  data: string
  causa_morte?: string
}

type FormField =
  | 'id_manejo'
  | 'id_brinco'
  | 'id_chip'
  | 'id_provisorio_cria'
  | 'sexo'
  | 'categoria'
  | 'raca'
  | 'data_nascimento'
  | 'peso_nascimento_kg'
  | 'status'
  | 'origem'
  | 'data_entrada_fazenda'
  | 'pv_entrada_kg'
  | 'preco_entrada_reais_kg'
  | 'preco_entrada_reais_arroba'
  | 'preco_entrada_reais_cabeca'
  | 'preco_arroba_boi_gordo'
  | 'agio_desagio'
  | 'data_formacao_lote'
  | 'lote_atual'
  | 'protocolo_sanitario'
  | 'fornecedor'
  | 'propriedade_origem'
  | 'propriedade_atual'
  | 'pai'
  | 'mae'
  | 'estrategia_nutricional_tipo'
  | 'estrategia_nutricional_id'
  | 'estrategia_nutricional_nome'
  | 'gmd_kg_cab_dia'
  | 'peso_meta_kg'
  | 'data_desmama'
  | 'peso_desmama_kg'
  | 'pasto_atual'
  | 'setor_atual'
  | 'data_insercao_rastreabilidade'
  | 'data_liberacao_sisbov'

const formFieldValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return ''
  return String(value)
}

export function IndividuoDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [individuo, setIndividuo] = useState<Individuo | null>(null)
  const [form, setForm] = useState<Record<FormField, string>>({} as Record<FormField, string>)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [racas, setRacas] = useState<SelectOption[]>([])
  const [lotes, setLotes] = useState<SelectOption[]>([])
  const [pastos, setPastos] = useState<SelectOption[]>([])
  const [setores, setSetores] = useState<SelectOption[]>([])
  const [fornecedores, setFornecedores] = useState<SelectOption[]>([])
  const [individuosMacho, setIndividuosMacho] = useState<SelectOption[]>([])
  const [individuosFemea, setIndividuosFemea] = useState<SelectOption[]>([])
  const [formulacoes, setFormulacoes] = useState<Formulacao[]>([])
  const [maternidade, setMaternidade] = useState<Maternidade | null>(null)
  const [registroMorte, setRegistroMorte] = useState<RegistroMorte | null>(null)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['identificacao', 'nascimento']))
  const [showStatusModal, setShowStatusModal] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [id, user])

  const loadData = async () => {
    if (!user || !id) return

    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    const [individuoRes, racasRes, lotesRes, pastosRes, setoresRes, fornecedoresRes, machosRes, femeasRes, maternidadeRes, formulacoesRes] =
      await Promise.all([
        supabase.from('individuos').select('*').eq('id', id).eq('fazenda_id', fazendaId).single(),
        supabase.from('racas').select('id, nome').eq('fazenda_id', fazendaId).is('deleted_at', null),
        supabase.from('lotes').select('id, nome').eq('fazenda_id', fazendaId).is('deleted_at', null),
        supabase.from('pastos').select('id, nome').eq('fazenda_id', fazendaId).is('deleted_at', null),
        supabase.from('setores').select('id, nome').eq('fazenda_id', fazendaId).is('deleted_at', null),
        supabase.from('fornecedores').select('id, nome').eq('fazenda_id', fazendaId).is('deleted_at', null),
        supabase
          .from('individuos')
          .select('id, id_brinco, id_chip, id_manejo, id_provisorio_cria')
          .eq('fazenda_id', fazendaId)
          .eq('sexo', 'Macho')
          .neq('id', id)
          .is('deleted_at', null),
        supabase
          .from('individuos')
          .select('id, id_brinco, id_chip, id_manejo, id_provisorio_cria')
          .eq('fazenda_id', fazendaId)
          .eq('sexo', 'Fêmea')
          .neq('id', id)
          .is('deleted_at', null),
        supabase
          .from('registros_maternidade')
          .select('id, data, id_brinco_mae, id_chip_mae')
          .eq('individuo_id_cria', id)
          .maybeSingle(),
        supabase.from('formulacoes').select('id, nome, tipo').eq('fazenda_id', fazendaId).eq('ativo', true),
      ])

    if (formulacoesRes.error) console.error('Erro ao buscar formulações:', formulacoesRes.error)
    else setFormulacoes(formulacoesRes.data as Formulacao[])

    if (individuoRes.error) {
      console.error('Erro ao buscar indivíduo:', individuoRes.error)
      navigate('/controller/individuos')
      return
    }

    const ind = individuoRes.data as Individuo
    setIndividuo(ind)
    setForm({
      id_manejo: formFieldValue(ind.id_manejo),
      id_brinco: formFieldValue(ind.id_brinco),
      id_chip: formFieldValue(ind.id_chip),
      id_provisorio_cria: formFieldValue(ind.id_provisorio_cria),
      sexo: formFieldValue(ind.sexo),
      categoria: formFieldValue(ind.categoria),
      raca: formFieldValue(ind.raca),
      data_nascimento: formFieldValue(ind.data_nascimento),
      peso_nascimento_kg: formFieldValue(ind.peso_nascimento_kg),
      status: formFieldValue(ind.status),
      origem: formFieldValue(ind.origem),
      data_entrada_fazenda: formFieldValue(ind.data_entrada_fazenda),
      pv_entrada_kg: formFieldValue(ind.pv_entrada_kg),
      preco_entrada_reais_kg: formFieldValue(ind.preco_entrada_reais_kg),
      preco_entrada_reais_arroba: formFieldValue(ind.preco_entrada_reais_arroba),
      preco_entrada_reais_cabeca: formFieldValue(ind.preco_entrada_reais_cabeca),
      preco_arroba_boi_gordo: formFieldValue(ind.preco_arroba_boi_gordo),
      agio_desagio: formFieldValue(ind.agio_desagio),
      data_formacao_lote: formFieldValue(ind.data_formacao_lote),
      lote_atual: formFieldValue(ind.lote_atual),
      protocolo_sanitario: formFieldValue(ind.protocolo_sanitario),
      fornecedor: formFieldValue(ind.fornecedor),
      propriedade_origem: formFieldValue(ind.propriedade_origem),
      propriedade_atual: formFieldValue(ind.propriedade_atual),
      pai: formFieldValue(ind.pai),
      mae: formFieldValue(ind.mae),
      estrategia_nutricional_tipo: formFieldValue(ind.estrategia_nutricional_tipo),
      estrategia_nutricional_id: formFieldValue(ind.estrategia_nutricional_id),
      estrategia_nutricional_nome: formFieldValue(ind.estrategia_nutricional_nome),
      gmd_kg_cab_dia: formFieldValue(ind.gmd_kg_cab_dia),
      peso_meta_kg: formFieldValue(ind.peso_meta_kg),
      data_desmama: formFieldValue(ind.data_desmama),
      peso_desmama_kg: formFieldValue(ind.peso_desmama_kg),
      pasto_atual: formFieldValue(ind.pasto_atual),
      setor_atual: formFieldValue(ind.setor_atual),
      data_insercao_rastreabilidade: formFieldValue(ind.data_insercao_rastreabilidade),
      data_liberacao_sisbov: formFieldValue(ind.data_liberacao_sisbov),
    })

    const mapOptions = (data: any[] | null): SelectOption[] =>
      (data || []).map((item) => ({ id: item.id, nome: item.nome }))

    const mapIndividuos = (data: any[] | null): SelectOption[] =>
      (data || []).map((item) => ({
        id: item.id,
        nome:
          item.id_brinco ||
          item.id_chip ||
          item.id_manejo ||
          item.id_provisorio_cria ||
          item.id,
      }))

    setRacas(mapOptions(racasRes.data))
    setLotes(mapOptions(lotesRes.data))
    setPastos(mapOptions(pastosRes.data))
    setSetores(mapOptions(setoresRes.data))
    setFornecedores(mapOptions(fornecedoresRes.data))
    setIndividuosMacho(mapIndividuos(machosRes.data))
    setIndividuosFemea(mapIndividuos(femeasRes.data))
    setMaternidade(maternidadeRes.data as Maternidade | null)

    if (ind.status === 'Morto') {
      const { data: morteData } = await supabase
        .from('registros_morte')
        .select('id, data, causa_morte')
        .eq('fazenda_id', fazendaId)
        .eq('individuo_id', id)
        .is('deleted_at', null)
        .maybeSingle()
      if (morteData) {
        setRegistroMorte(morteData as RegistroMorte)
      }
    }

    setLoading(false)
  }

  const handleChange = (field: FormField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    if (field === 'sexo') {
      setForm((prev) => ({ ...prev, categoria: '' }))
    }
    if (field === 'status' && value === 'Venda Vivo') {
      setShowStatusModal('venda')
    }
  }

  const handleNumericChange = (field: FormField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleFormulacaoChange = (formulacaoId: string) => {
    const formulacao = formulacoes.find((f) => f.id === formulacaoId)
    setForm((prev) => ({
      ...prev,
      estrategia_nutricional_id: formulacao ? formulacao.id : '',
      estrategia_nutricional_nome: formulacao ? formulacao.nome : '',
      estrategia_nutricional_tipo: formulacao ? formulacao.tipo || '' : '',
    }))
  }

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const categoriaOptions =
    form.sexo === 'Macho'
      ? categoriasMacho
      : form.sexo === 'Fêmea'
      ? categoriasFemea
      : []

  const score = calculateCompletenessScore(form)
  const syncStatus = getSyncStatusFromScore(score)

  const getScoreColor = () => {
    if (score >= 100) return 'bg-green-500'
    if (score >= 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getIdentificacao = (ind?: Individuo) => {
    if (!ind) return '-'
    return ind.id_brinco || ind.id_chip || ind.id_manejo || ind.id_provisorio_cria || 'Sem identificação'
  }

  const getCompletudeBadge = (syncStatus?: string) => {
    switch (syncStatus) {
      case 'automatico_incompleto':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            Criado automaticamente — revise os dados
          </span>
        )
      case 'manual_completo':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            Cadastro completo
          </span>
        )
      case 'manual_incompleto':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            Cadastro incompleto
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Não classificado
          </span>
        )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !individuo) return

    const validationErrors = validateIndividuo(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)

    const dataToUpdate: any = {
      ...form,
      sync_status: syncStatus,
    }

    Object.keys(dataToUpdate).forEach((key) => {
      if (dataToUpdate[key] === '') {
        dataToUpdate[key] = null
      }
    })

    const numericFields = [
      'peso_nascimento_kg',
      'pv_entrada_kg',
      'preco_entrada_reais_kg',
      'preco_entrada_reais_arroba',
      'preco_entrada_reais_cabeca',
      'preco_arroba_boi_gordo',
      'agio_desagio',
      'gmd_kg_cab_dia',
      'peso_meta_kg',
      'peso_desmama_kg',
    ]

    numericFields.forEach((field) => {
      if (dataToUpdate[field]) {
        dataToUpdate[field] = Number(dataToUpdate[field])
      }
    })

    const { error } = await supabase.from('individuos').update(dataToUpdate).eq('id', id)

    if (error) {
      console.error('Erro ao atualizar indivíduo:', error)
      alert('Erro ao atualizar indivíduo: ' + error.message)
      setSubmitting(false)
      return
    }

    loadData()
    setSubmitting(false)
  }

  const Section = ({ title, section, children }: { title: string; section: string; children: React.ReactNode }) => (
    <Card className="border-0 shadow-sm">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${openSections.has(section) ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          openSections.has(section) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4">{children}</div>
        </div>
      </div>
    </Card>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  if (!individuo) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" size="sm" onClick={() => navigate('/controller/individuos')}>
          ← Voltar
        </Button>
        <Card className="p-8 text-center border-0 shadow-sm">
          <p className="text-gray-600">Indivíduo não encontrado</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={() => navigate('/controller/individuos')}>
            ← Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{getIdentificacao(individuo)}</h2>
            <p className="text-sm text-gray-500">
              {individuo.categoria} • {individuo.sexo} • {individuo.raca}
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de completude */}
      <div className="flex items-center gap-3">
        {getCompletudeBadge(individuo.sync_status)}
      </div>

      {/* Campos incompletos */}
      {(individuo.sync_status === 'automatico_incompleto' || individuo.sync_status === 'manual_incompleto') && (
        <Card className="p-4 border-l-4 border-yellow-400 bg-yellow-50 border-0 shadow-sm">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">
            Campos pendentes de revisão
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            {!form.id_brinco && !form.id_chip && !form.id_manejo && !form.id_provisorio_cria && (
              <li>• Identificação (brinco, chip, manejo ou provisório)</li>
            )}
            {!form.data_nascimento && <li>• Data de nascimento</li>}
            {!form.sexo && <li>• Sexo</li>}
            {!form.categoria && <li>• Categoria</li>}
            {!form.raca && <li>• Raça</li>}
            {!form.peso_nascimento_kg && <li>• Peso ao nascer</li>}
            {!form.status && <li>• Status</li>}
          </ul>
        </Card>
      )}

      {/* Score de completude */}
      <Card className="p-4 border-0 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Completude do cadastro</span>
          <span className="text-sm font-bold text-gray-900">{score}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className={`${getScoreColor()} h-2.5 rounded-full transition-all`} style={{ width: `${score}%` }} />
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="Identificação" section="identificacao">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Brinco"
              value={form.id_brinco}
              onChange={(e) => handleChange('id_brinco', e.target.value)}
              error={errors.id_brinco || errors.identificacao}
            />
            <Input
              label="Chip"
              value={form.id_chip}
              onChange={(e) => handleChange('id_chip', e.target.value)}
              error={errors.id_chip}
            />
            <Input
              label="Manejo"
              value={form.id_manejo}
              onChange={(e) => handleChange('id_manejo', e.target.value)}
              error={errors.id_manejo}
            />
            <Input
              label="Provisório"
              value={form.id_provisorio_cria}
              onChange={(e) => handleChange('id_provisorio_cria', e.target.value)}
              error={errors.id_provisorio_cria}
            />
          </div>
        </Section>

        <Section title="Nascimento e Origem" section="nascimento">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Sexo"
              value={form.sexo}
              onChange={(value) => handleChange('sexo', value)}
              options={[
                { value: 'Macho', label: 'Macho' },
                { value: 'Fêmea', label: 'Fêmea' },
              ]}
              required
            />
            <Select
              label="Categoria"
              value={form.categoria}
              onChange={(value) => handleChange('categoria', value)}
              options={categoriaOptions.map((c) => ({ value: c, label: c }))}
              placeholder={form.sexo ? 'Selecione...' : 'Selecione o sexo primeiro'}
              required
            />
            <Select
              label="Raça"
              value={form.raca}
              onChange={(value) => handleChange('raca', value)}
              options={racas.map((r) => ({ value: r.nome, label: r.nome }))}
              placeholder="Selecione..."
              required
            />
            <Input
              label="Data de nascimento"
              type="date"
              value={form.data_nascimento}
              onChange={(e) => handleChange('data_nascimento', e.target.value)}
              error={errors.data_nascimento}
              required
            />
            <NumericInput
              label="Peso ao nascer (kg)"
              value={form.peso_nascimento_kg}
              onChange={(value) => handleNumericChange('peso_nascimento_kg', value)}
              error={errors.peso_nascimento_kg}
            />
            <Select
              label="Origem"
              value={form.origem}
              onChange={(value) => handleChange('origem', value)}
              options={origens.map((o) => ({ value: o, label: o }))}
              placeholder="Selecione..."
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(value) => handleChange('status', value)}
              options={statusList
                .filter((s) => s !== 'Morto')
                .map((s) => ({ value: s, label: s }))}
              placeholder="Selecione..."
              required
            />
          </div>
        </Section>

        <Section title="Entrada na Fazenda" section="entrada">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Data de entrada"
              type="date"
              value={form.data_entrada_fazenda}
              onChange={(e) => handleChange('data_entrada_fazenda', e.target.value)}
              error={errors.data_entrada_fazenda}
            />
            <NumericInput
              label="PV entrada (kg)"
              value={form.pv_entrada_kg}
              onChange={(value) => handleNumericChange('pv_entrada_kg', value)}
            />
            <NumericInput
              label="Preço entrada (R$/kg)"
              value={form.preco_entrada_reais_kg}
              onChange={(value) => handleNumericChange('preco_entrada_reais_kg', value)}
            />
            <NumericInput
              label="Preço entrada (R$/@)"
              value={form.preco_entrada_reais_arroba}
              onChange={(value) => handleNumericChange('preco_entrada_reais_arroba', value)}
            />
            <NumericInput
              label="Preço entrada (R$/cabeça)"
              value={form.preco_entrada_reais_cabeca}
              onChange={(value) => handleNumericChange('preco_entrada_reais_cabeca', value)}
            />
            <NumericInput
              label="Preço arroba boi gordo"
              value={form.preco_arroba_boi_gordo}
              onChange={(value) => handleNumericChange('preco_arroba_boi_gordo', value)}
            />
            <NumericInput
              label="Ágio/Deságio"
              value={form.agio_desagio}
              onChange={(value) => handleNumericChange('agio_desagio', value)}
            />
            <Select
              label="Fornecedor"
              value={form.fornecedor}
              onChange={(value) => handleChange('fornecedor', value)}
              options={fornecedores.map((f) => ({ value: f.id, label: f.nome }))}
              placeholder="Selecione..."
            />
            <Input
              label="Propriedade de origem"
              value={form.propriedade_origem}
              onChange={(e) => handleChange('propriedade_origem', e.target.value)}
            />
            <Input
              label="Propriedade atual"
              value={form.propriedade_atual}
              onChange={(e) => handleChange('propriedade_atual', e.target.value)}
            />
          </div>
        </Section>

        <Section title="Localização e Filiação" section="localizacao">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Lote atual</label>
              <p className="text-sm text-gray-500">
                {lotes.find((l) => l.id === form.lote_atual)?.nome || 'Não definido'}
              </p>
              <p className="text-xs text-gray-400">Editado apenas via movimentação de lotes</p>
              {form.lote_atual && (
                <button
                  type="button"
                  onClick={() => navigate('/controller/lotes')}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Ver lotes
                </button>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Pasto atual</label>
              <p className="text-sm text-gray-500">
                {pastos.find((p) => p.id === form.pasto_atual)?.nome || 'Não definido'}
              </p>
              <p className="text-xs text-gray-400">Editado apenas via movimentação de pastos</p>
              {form.pasto_atual && (
                <button
                  type="button"
                  onClick={() => navigate('/controller/pastos')}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Ver pastos
                </button>
              )}
            </div>
            <Select
              label="Setor atual"
              value={form.setor_atual}
              onChange={(value) => handleChange('setor_atual', value)}
              options={setores.map((s) => ({ value: s.id, label: s.nome }))}
              placeholder="Selecione..."
            />
            <Select
              label="Pai"
              value={form.pai}
              onChange={(value) => handleChange('pai', value)}
              options={individuosMacho.map((i) => ({ value: i.id, label: i.nome }))}
              placeholder="Selecione..."
            />
            <Select
              label="Mãe"
              value={form.mae}
              onChange={(value) => handleChange('mae', value)}
              options={individuosFemea.map((i) => ({ value: i.id, label: i.nome }))}
              placeholder="Selecione..."
            />
            {individuo.status === 'Morto' && registroMorte && (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Registro de morte</label>
                <p className="text-sm text-gray-500">
                  {formatDate(registroMorte.data)} — {registroMorte.causa_morte || 'Sem causa'}
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/controller/cadernetas/morte/${registroMorte.id}`)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Ver registro de morte
                </button>
              </div>
            )}
          </div>
        </Section>

        <Section title="Nutrição e Peso" section="nutricao">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Estratégia nutricional atual"
              value={form.estrategia_nutricional_id}
              onChange={handleFormulacaoChange}
              options={formulacoes.map((f) => ({ value: f.id, label: f.nome }))}
              placeholder="Selecione..."
            />
            <NumericInput
              label="GMD (kg/cab/dia)"
              value={form.gmd_kg_cab_dia}
              onChange={(value) => handleNumericChange('gmd_kg_cab_dia', value)}
            />
            <NumericInput
              label="Peso meta (kg)"
              value={form.peso_meta_kg}
              onChange={(value) => handleNumericChange('peso_meta_kg', value)}
            />
          </div>
        </Section>

        <Section title="Desmama" section="desmama">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Data da desmama"
              type="date"
              value={form.data_desmama}
              onChange={(e) => handleChange('data_desmama', e.target.value)}
              error={errors.data_desmama}
            />
            <NumericInput
              label="Peso na desmama (kg)"
              value={form.peso_desmama_kg}
              onChange={(value) => handleNumericChange('peso_desmama_kg', value)}
            />
          </div>
        </Section>

        <Section title="Sisbov e Rastreabilidade" section="sisbov">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Data de inserção na rastreabilidade"
              type="date"
              value={form.data_insercao_rastreabilidade}
              onChange={(e) => handleChange('data_insercao_rastreabilidade', e.target.value)}
              error={errors.data_insercao_rastreabilidade}
            />
            <Input
              label="Data de liberação SISBOV"
              type="date"
              value={form.data_liberacao_sisbov}
              onChange={(e) => handleChange('data_liberacao_sisbov', e.target.value)}
              error={errors.data_liberacao_sisbov}
            />
          </div>
        </Section>

        <Section title="Dados Calculados (somente leitura)" section="calculados">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <label className="block text-gray-500">Idade atual</label>
              <p className="font-medium text-gray-900">
                {individuo.idade_atual_meses ? `${individuo.idade_atual_meses} meses` : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <label className="block text-gray-500">Período na fazenda</label>
              <p className="font-medium text-gray-900">
                {individuo.periodo_fazenda_dias ? `${individuo.periodo_fazenda_dias} dias` : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <label className="block text-gray-500">Peso atual</label>
              <p className="font-medium text-gray-900">
                {individuo.peso_atual_kg ? `${individuo.peso_atual_kg} kg` : '-'}
              </p>
            </div>
          </div>
        </Section>

        {maternidade && (
          <Section title="Registro de Origem" section="origem">
            <div className="text-sm">
              <p className="text-gray-600 mb-2">
                Indivíduo originado do parto em {formatDate(maternidade.data)}.
              </p>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => navigate(`/controller/cadernetas/maternidade/${maternidade.id}`)}
              >
                Ver registro de maternidade
              </Button>
            </div>
          </Section>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button type="submit" disabled={submitting} className="flex-1 sm:flex-none">
            {submitting ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
          <Button variant="secondary" type="button" onClick={() => navigate('/controller/individuos')}>
            Voltar
          </Button>
        </div>
      </form>

      {/* Modal de alerta de status Venda Vivo */}
      {showStatusModal === 'venda' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6 border-0 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Status: Venda Vivo</h3>
            <p className="text-gray-600 mb-4">
              Para registrar a venda deste indivíduo, utilize a tela de movimentação ou registros de saída.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowStatusModal(null)
                  setForm((prev) => ({ ...prev, status: 'Vivo' }))
                }}
              >
                Manter Vivo
              </Button>
              <Button onClick={() => setShowStatusModal(null)}>Continuar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
