import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { Button, Card, Input } from '../../components/ui'
import { GroupedSelect } from '../../components/ui/GroupedSelect'

interface Curral {
  id: string
  fazenda_id: string
  nome: string
  lote_id: string | null
  formulacao_id: string | null
  ativo: boolean
  lote_nome?: string
  formulacao_nome?: string
}

interface Lote {
  id: string
  nome: string
}

interface Formulacao {
  id: string
  nome: string
  tipo?: string
}

interface FormulacaoOption {
  id: string
  name: string
  category: string
}

export function Currais() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currais, setCurrais] = useState<Curral[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [formulacoes, setFormulacoes] = useState<Formulacao[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCurral, setEditingCurral] = useState<Curral | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    lote_id: '',
    formulacao_id: '',
    formulacao_nome: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const formulacaoOptions: FormulacaoOption[] = useMemo(
    () =>
      formulacoes.map((f) => ({
        id: f.id,
        name: f.nome,
        category: f.tipo || 'Formulações',
      })),
    [formulacoes]
  )

  const curraisFiltrados = useMemo(() => {
    return currais.filter((curral) => {
      if (!showInactive && !curral.ativo) return false
      return true
    })
  }, [currais, showInactive])

  const loadData = async () => {
    if (!user) return
    setLoading(true)

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

    const [curraisData, lotesData, formulacoesData] = await Promise.all([
      supabase
        .from('currais')
        .select('*, lotes(nome), formulacoes(nome)')
        .eq('fazenda_id', fazendaId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase.from('lotes').select('id, nome').eq('fazenda_id', fazendaId).eq('ativo', true).order('nome'),
      supabase.from('formulacoes').select('id, nome, tipo').eq('fazenda_id', fazendaId).eq('ativo', true).order('nome'),
    ])

    if (curraisData.error) {
      console.error('Erro ao buscar currais:', curraisData.error)
    } else {
      setCurrais(
        (curraisData.data || []).map((c: any) => ({
          ...c,
          lote_nome: c.lotes?.nome || null,
          formulacao_nome: c.formulacoes?.nome || null,
        }))
      )
    }

    if (lotesData.error) {
      console.error('Erro ao buscar lotes:', lotesData.error)
    } else {
      setLotes(lotesData.data || [])
    }

    if (formulacoesData.error) {
      console.error('Erro ao buscar formulacoes:', formulacoesData.error)
    } else {
      setFormulacoes(formulacoesData.data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [user])

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
      lote_id: formData.lote_id || null,
      formulacao_id: formData.formulacao_id || null,
    }

    let error

    if (editingCurral) {
      const { error: updateError } = await supabase.from('currais').update(data).eq('id', editingCurral.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('currais').insert(data)
      error = insertError
    }

    if (error) {
      console.error('Erro ao salvar curral:', error)
    } else {
      setFormData({ nome: '', lote_id: '', formulacao_id: '', formulacao_nome: '' })
      setEditingCurral(null)
      setShowForm(false)
      loadData()
    }

    setSubmitting(false)
  }

  const handleEdit = (curral: Curral) => {
    setEditingCurral(curral)
    setFormData({
      nome: curral.nome,
      lote_id: curral.lote_id || '',
      formulacao_id: curral.formulacao_id || '',
      formulacao_nome: curral.formulacao_nome || '',
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setEditingCurral(null)
    setFormData({ nome: '', lote_id: '', formulacao_id: '', formulacao_nome: '' })
    setShowForm(false)
  }

  const handleToggleActive = async (curral: Curral) => {
    const { error } = await supabase.from('currais').update({ ativo: !curral.ativo }).eq('id', curral.id)

    if (error) {
      console.error('Erro ao atualizar curral:', error)
    } else {
      loadData()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('currais').update({ deleted_at: new Date().toISOString() }).eq('id', id)

    if (error) {
      console.error('Erro ao excluir curral:', error)
    } else {
      loadData()
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Currais</h2>
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!showForm && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Currais</h2>
            <p className="text-sm text-gray-500">Cadastro de currais de confinamento.</p>
          </div>
          <Button onClick={() => setShowForm(true)}>Novo Curral</Button>
        </div>
      )}

      {!showForm && (
        <div className="flex justify-end">
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
        <Card className="bg-white p-6 border-0 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {editingCurral ? 'Editar Curral' : 'Novo Curral'}
            </h3>
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
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  placeholder="Nome do curral"
                  className="border-gray-200 focus:border-accent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lote</label>
                <select
                  value={formData.lote_id}
                  onChange={(e) => setFormData({ ...formData, lote_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-accent bg-white text-gray-700 text-sm min-h-[44px]"
                >
                  <option value="">Selecione...</option>
                  {lotes.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      {lote.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Formulação</label>
                  <button
                    type="button"
                    onClick={() => navigate('/controller/formulacoes')}
                    className="text-xs text-primary hover:text-primary/80 font-medium underline-offset-2 hover:underline"
                  >
                    Gerenciar
                  </button>
                </div>
                <GroupedSelect
                  options={formulacaoOptions}
                  value={formData.formulacao_nome}
                  onChange={(value) => {
                    const selected = formulacaoOptions.find((opt) => opt.name === value)
                    setFormData({
                      ...formData,
                      formulacao_nome: value,
                      formulacao_id: selected?.id || '',
                    })
                  }}
                  placeholder="Selecione..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-8 pt-2">
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

      {!showForm && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {curraisFiltrados.map((curral) => (
          <Card key={curral.id} className="p-4 shadow-sm border-0">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-gray-800">{curral.nome}</h3>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  curral.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {curral.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <p>
                <span className="font-medium">Lote:</span> {curral.lote_nome || '-'}
              </p>
              <p>
                <span className="font-medium">Formulação:</span> {curral.formulacao_nome || '-'}
              </p>
            </div>
            <div className="flex gap-2 mt-auto pt-3">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleEdit(curral)}>
                Editar
              </Button>
              <Button size="sm" variant="secondary" className="text-red-600 hover:text-red-700" onClick={() => handleToggleActive(curral)}>
                {curral.ativo ? 'Desativar' : 'Ativar'}
              </Button>
              <Button size="sm" variant="secondary" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(curral.id)}>
                Excluir
              </Button>
            </div>
          </Card>
        ))}
      </div>
      )}

      {!showForm && currais.length === 0 && (
        <Card className="p-8 text-center border-0">
          <p className="text-gray-600">Nenhum curral cadastrado.</p>
        </Card>
      )}
    </div>
  )
}
