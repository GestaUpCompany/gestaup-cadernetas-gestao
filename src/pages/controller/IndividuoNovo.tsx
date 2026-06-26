import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input, Select, NumericInput } from '../../components/ui'
import {
  calculateCompletenessScore,
  getSyncStatusFromScore,
  validateIndividuo,
  categoriasMacho,
  categoriasFemea,
  statusList,
  origens,
} from '../../utils/individualValidation'

interface SelectOption {
  id: string
  nome: string
}

interface Formulacao {
  id: string
  nome: string
  tipo?: string
}

const INITIAL_FORM = {
  id_manejo: '',
  id_brinco: '',
  id_chip: '',
  id_provisorio_cria: '',
  sexo: '',
  categoria: '',
  raca: '',
  data_nascimento: '',
  peso_nascimento_kg: '',
  status: 'Vivo',
  origem: '',
  data_entrada_fazenda: '',
  pv_entrada_kg: '',
  preco_entrada_reais_kg: '',
  preco_entrada_reais_arroba: '',
  preco_entrada_reais_cabeca: '',
  preco_arroba_boi_gordo: '',
  agio_desagio: '',
  data_formacao_lote: '',
  lote_atual: '',
  protocolo_sanitario: '',
  fornecedor: '',
  propriedade_origem: '',
  propriedade_atual: '',
  pai: '',
  mae: '',
  estrategia_nutricional_tipo: '',
  estrategia_nutricional_id: '',
  estrategia_nutricional_nome: '',
  gmd_kg_cab_dia: '',
  peso_meta_kg: '',
  data_desmama: '',
  peso_desmama_kg: '',
  pasto_atual: '',
  setor_atual: '',
  data_insercao_rastreabilidade: '',
  data_liberacao_sisbov: '',
}

export function IndividuoNovo() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [fazendaId, setFazendaId] = useState('')
  const [racas, setRacas] = useState<SelectOption[]>([])
  const [lotes, setLotes] = useState<SelectOption[]>([])
  const [pastos, setPastos] = useState<SelectOption[]>([])
  const [setores, setSetores] = useState<SelectOption[]>([])
  const [fornecedores, setFornecedores] = useState<SelectOption[]>([])
  const [individuosMacho, setIndividuosMacho] = useState<SelectOption[]>([])
  const [individuosFemea, setIndividuosFemea] = useState<SelectOption[]>([])
  const [formulacoes, setFormulacoes] = useState<Formulacao[]>([])
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['identificacao', 'nascimento']))

  useEffect(() => {
    loadAuxiliaryData()
  }, [user])

  const loadAuxiliaryData = async () => {
    if (!user) return

    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return

    const fazenda = vinculos[0].fazenda_id
    setFazendaId(fazenda)

    const [racasRes, lotesRes, pastosRes, setoresRes, fornecedoresRes, machosRes, femeasRes, formulacoesRes] =
      await Promise.all([
        supabase.from('racas').select('id, nome').eq('fazenda_id', fazenda).is('deleted_at', null),
        supabase.from('lotes').select('id, nome').eq('fazenda_id', fazenda).is('deleted_at', null),
        supabase.from('pastos').select('id, nome').eq('fazenda_id', fazenda).is('deleted_at', null),
        supabase.from('setores').select('id, nome').eq('fazenda_id', fazenda).is('deleted_at', null),
        supabase.from('fornecedores').select('id, nome').eq('fazenda_id', fazenda).is('deleted_at', null),
        supabase
          .from('individuos')
          .select('id, id_brinco, id_chip, id_manejo, id_provisorio_cria')
          .eq('fazenda_id', fazenda)
          .eq('sexo', 'Macho')
          .is('deleted_at', null),
        supabase
          .from('individuos')
          .select('id, id_brinco, id_chip, id_manejo, id_provisorio_cria')
          .eq('fazenda_id', fazenda)
          .eq('sexo', 'Fêmea')
          .is('deleted_at', null),
        supabase.from('formulacoes').select('id, nome, tipo').eq('fazenda_id', fazenda).eq('ativo', true),
      ])

    if (formulacoesRes.error) console.error('Erro ao buscar formulações:', formulacoesRes.error)
    else setFormulacoes(formulacoesRes.data as Formulacao[])

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

  const handleChange = (field: keyof typeof form, value: string) => {
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
  }

  const handleNumericChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors = validateIndividuo(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)

    const dataToInsert: any = {
      fazenda_id: fazendaId,
      ...form,
      sync_status: syncStatus,
    }

    Object.keys(dataToInsert).forEach((key) => {
      if (dataToInsert[key] === '') {
        dataToInsert[key] = null
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
      if (dataToInsert[field]) {
        dataToInsert[field] = Number(dataToInsert[field])
      }
    })

    const { data, error } = await supabase.from('individuos').insert(dataToInsert).select('id').single()

    if (error) {
      console.error('Erro ao criar indivíduo:', error)
      alert('Erro ao criar indivíduo: ' + error.message)
      setSubmitting(false)
      return
    }

    navigate(`/controller/individuos/${data.id}`)
  }

  const Section = ({ title, section, children }: { title: string; section: string; children: React.ReactNode }) => (
    <Card className="border-0 shadow-sm overflow-hidden">
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" size="sm" onClick={() => navigate('/controller/individuos')}>
          ← Voltar
        </Button>
        <h2 className="text-2xl font-bold text-gray-800">Novo Indivíduo</h2>
      </div>

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
              label="Sexo *"
              value={form.sexo}
              onChange={(value) => handleChange('sexo', value)}
              options={[
                { value: 'Macho', label: 'Macho' },
                { value: 'Fêmea', label: 'Fêmea' },
              ]}
              required
            />
            <Select
              label="Categoria *"
              value={form.categoria}
              onChange={(value) => handleChange('categoria', value)}
              options={categoriaOptions.map((c) => ({ value: c, label: c }))}
              placeholder={form.sexo ? 'Selecione...' : 'Selecione o sexo primeiro'}
              required
            />
            <Select
              label="Raça *"
              value={form.raca}
              onChange={(value) => handleChange('raca', value)}
              options={racas.map((r) => ({ value: r.nome, label: r.nome }))}
              placeholder="Selecione..."
              required
            />
            <Input
              label="Data de nascimento *"
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
              label="Status *"
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
            <Select
              label="Lote atual"
              value={form.lote_atual}
              onChange={(value) => handleChange('lote_atual', value)}
              options={lotes.map((l) => ({ value: l.id, label: l.nome }))}
              placeholder="Selecione..."
            />
            <Select
              label="Pasto atual"
              value={form.pasto_atual}
              onChange={(value) => handleChange('pasto_atual', value)}
              options={pastos.map((p) => ({ value: p.id, label: p.nome }))}
              placeholder="Selecione..."
            />
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

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button type="submit" disabled={submitting} className="flex-1 sm:flex-none">
            {submitting ? 'Salvando...' : 'Salvar Indivíduo'}
          </Button>
          <Button variant="secondary" type="button" onClick={() => navigate('/controller/individuos')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
