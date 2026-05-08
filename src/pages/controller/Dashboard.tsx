import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Card, Button } from '../../components/ui'
import { supabase } from '../../services/supabaseClient'
import { CADERNETA_IMAGES, CADERNETA_TITLES } from '../../types/images'

interface Fazenda {
  id: string
  nome: string
  acesso_id: string
  cnpj?: string
  email?: string
  telefone?: string
  endereco?: string
  logo_url?: string
  ativo: boolean
}

interface RecentActivity {
  id: string
  type: string
  title: string
  date: string
  path: string
}

export function ControllerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [fazenda, setFazenda] = useState<Fazenda | null>(null)
  const [loading, setLoading] = useState(true)
  const [cadastroStats, setCadastroStats] = useState({
    pastos: 0,
    lotes: 0,
    funcionarios: 0,
    insumos: 0,
    pluviometros: 0,
  })
  const [cadernetaStats, setCadernetaStats] = useState({
    maternidade: 0,
    enfermaria: 0,
    pastagens: 0,
    rodeio: 0,
    suplementacao: 0,
    bebedouros: 0,
    movimentacao: 0,
    morte: 0,
    clima: 0,
    abastecimento: 0,
    cantina: 0,
  })

  const [registrosHoje, setRegistrosHoje] = useState(0)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])

  useEffect(() => {
    loadFazenda()
    loadStats()
    loadRecentActivities()
  }, [user])

  const loadRecentActivities = async () => {
    if (!user) return

    // Buscar fazenda vinculada
    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    // Buscar registros recentes de todas as cadernetas
    const activities: RecentActivity[] = []

    // Maternidade
    const { data: maternidadeData } = await supabase
      .from('registros_maternidade')
      .select('id, data')
      .eq('fazenda_id', fazendaId)
      .order('data', { ascending: false })
      .limit(1)

    if (maternidadeData && maternidadeData.length > 0) {
      const [year, day, month] = maternidadeData[0].data.split('-')
      const dataFormatada = `${day}/${month}/${year}`
      activities.push({
        id: maternidadeData[0].id,
        type: 'Maternidade',
        title: 'Registro de parto',
        date: dataFormatada,
        path: '/controller/maternidade',
      })
    }

    // Enfermaria
    const { data: enfermariaData } = await supabase
      .from('registros_enfermaria')
      .select('id, data')
      .eq('fazenda_id', fazendaId)
      .order('data', { ascending: false })
      .limit(1)

    if (enfermariaData && enfermariaData.length > 0) {
      const [year, day, month] = enfermariaData[0].data.split('-')
      const dataFormatada = `${day}/${month}/${year}`
      activities.push({
        id: enfermariaData[0].id,
        type: 'Enfermaria',
        title: 'Registro de tratamento',
        date: dataFormatada,
        path: '/controller/enfermaria',
      })
    }

    // Rodeio
    const { data: rodeioData } = await supabase
      .from('registros_rodeio')
      .select('id, data')
      .eq('fazenda_id', fazendaId)
      .order('data', { ascending: false })
      .limit(1)

    if (rodeioData && rodeioData.length > 0) {
      const [year, day, month] = rodeioData[0].data.split('-')
      const dataFormatada = `${day}/${month}/${year}`
      activities.push({
        id: rodeioData[0].id,
        type: 'Rodeio',
        title: 'Registro de rodeio',
        date: dataFormatada,
        path: '/controller/rodeio',
      })
    }

    // Ordenar por data e pegar os 5 mais recentes
    setRecentActivities(activities.slice(0, 5))
  }

  const loadFazenda = async () => {
    if (!user) return

    // Buscar fazenda vinculada ao controller
    const { data: vinculos, error: vinculoError } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (vinculoError || !vinculos || vinculos.length === 0) {
      console.error('Erro ao buscar fazenda vinculada:', vinculoError)
      setLoading(false)
      return
    }

    const fazendaId = vinculos[0].fazenda_id

    const { data: fazendaData, error: fazendaError } = await supabase
      .from('fazendas')
      .select('*')
      .eq('id', fazendaId)
      .single()

    if (fazendaError) {
      console.error('Erro ao buscar fazenda:', fazendaError)
    } else {
      setFazenda(fazendaData as Fazenda)
    }

    setLoading(false)
  }

  const loadStats = async () => {
    if (!user) return

    // Buscar fazenda vinculada
    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    // Buscar estatísticas de cadastros
    const [
      { count: pastosCount },
      { count: lotesCount },
      { count: funcionariosCount },
      { count: insumosCount },
      { count: pluviometrosCount },
    ] = await Promise.all([
      supabase.from('pastos').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('lotes').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('funcionarios').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('insumos').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('pluviometros').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
    ])

    // Buscar estatísticas de cadernetas
    const [
      { count: maternidadeCount },
      { count: enfermariaCount },
      { count: pastagensCount },
      { count: rodeioCount },
      { count: suplementacaoCount },
      { count: bebedourosCount },
      { count: movimentacaoCount },
      { count: morteCount },
      { count: climaCount },
      { count: abastecimentoCount },
      { count: cantinaCount },
    ] = await Promise.all([
      supabase.from('registros_maternidade').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_enfermaria').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_pastagens').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_rodeio').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_suplementacao').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_bebedouros').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_movimentacao').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_morte').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_clima').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_abastecimento').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      supabase.from('registros_cantina').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
    ])

    // Buscar registros de hoje
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayStr = `${year}-${day}-${month}` // Formato yyyy-dd-mm

    const [
      { count: maternidadeHoje },
      { count: enfermariaHoje },
      { count: pastagensHoje },
      { count: rodeioHoje },
      { count: suplementacaoHoje },
      { count: bebedourosHoje },
      { count: movimentacaoHoje },
      { count: morteHoje },
    ] = await Promise.all([
      supabase.from('registros_maternidade').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).eq('data', todayStr),
      supabase.from('registros_enfermaria').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).eq('data', todayStr),
      supabase.from('registros_pastagens').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).eq('data', todayStr),
      supabase.from('registros_rodeio').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).eq('data', todayStr),
      supabase.from('registros_suplementacao').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).eq('data', todayStr),
      supabase.from('registros_bebedouros').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).eq('data', todayStr),
      supabase.from('registros_movimentacao').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).eq('data', todayStr),
      supabase.from('registros_morte').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).eq('data', todayStr),
    ])

    const totalHoje = (maternidadeHoje || 0) + (enfermariaHoje || 0) + (pastagensHoje || 0) + (rodeioHoje || 0) + (suplementacaoHoje || 0) + (bebedourosHoje || 0) + (movimentacaoHoje || 0) + (morteHoje || 0)
    setRegistrosHoje(totalHoje)

    setCadastroStats({
      pastos: pastosCount || 0,
      lotes: lotesCount || 0,
      funcionarios: funcionariosCount || 0,
      insumos: insumosCount || 0,
      pluviometros: pluviometrosCount || 0,
    })

    setCadernetaStats({
      maternidade: maternidadeCount || 0,
      enfermaria: enfermariaCount || 0,
      pastagens: pastagensCount || 0,
      rodeio: rodeioCount || 0,
      suplementacao: suplementacaoCount || 0,
      bebedouros: bebedourosCount || 0,
      movimentacao: movimentacaoCount || 0,
      morte: morteCount || 0,
      clima: climaCount || 0,
      abastecimento: abastecimentoCount || 0,
      cantina: cantinaCount || 0,
    })
  }

  if (loading) {
    return <p className="text-gray-600">Carregando...</p>
  }

  if (!fazenda) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Nenhuma fazenda vinculada ao seu usuário</p>
        <p className="text-sm text-gray-500">Entre em contato com o administrador</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header da Fazenda */}
      <div className="bg-white rounded-lg p-4 shadow-sm border-0">
        <div className="flex items-center gap-3">
          {fazenda.logo_url ? (
            <img
              src={fazenda.logo_url}
              alt={fazenda.nome}
              className="w-32 h-16 rounded-lg object-contain"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
              <span className="text-3xl text-gray-400">F</span>
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{fazenda.nome}</h2>
            <p className="text-sm text-gray-500">ID: {fazenda.acesso_id}</p>
          </div>
        </div>
      </div>

      {/* Resumo Consolidado */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Resumo Consolidado</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white p-6 border-0 shadow-sm">
            <p className="text-sm text-gray-500 mb-2">Registros Hoje</p>
            <p className="text-4xl font-bold text-gray-800">
              {registrosHoje}
            </p>
          </Card>
          <Card className="bg-white p-6 border-0 shadow-sm">
            <p className="text-sm text-gray-500 mb-2">Total Cadastros</p>
            <p className="text-4xl font-bold text-gray-800">
              {cadastroStats.pastos + cadastroStats.lotes + cadastroStats.funcionarios + cadastroStats.insumos + cadastroStats.pluviometros}
            </p>
          </Card>
          <Card className="bg-white p-6 border-0 shadow-sm">
            <p className="text-sm text-gray-500 mb-2">Total Registros</p>
            <p className="text-4xl font-bold text-gray-800">
              {cadernetaStats.maternidade + cadernetaStats.enfermaria + cadernetaStats.pastagens + cadernetaStats.rodeio + cadernetaStats.suplementacao + cadernetaStats.bebedouros + cadernetaStats.movimentacao + cadernetaStats.morte + cadernetaStats.clima + cadernetaStats.abastecimento + cadernetaStats.cantina}
            </p>
          </Card>
        </div>
      </div>

      {/* Estatísticas de Cadastros */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Resumo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white p-6 border-0 shadow-sm">
            <p className="text-sm text-gray-500 mb-2">Pastos</p>
            <p className="text-4xl font-bold text-gray-800">{cadastroStats.pastos}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/pastos')}
            >
              Gerenciar
            </Button>
          </Card>
          <Card className="bg-white p-6 border-0 shadow-sm">
            <p className="text-sm text-gray-500 mb-2">Lotes</p>
            <p className="text-4xl font-bold text-gray-800">{cadastroStats.lotes}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/lotes')}
            >
              Gerenciar
            </Button>
          </Card>
          <Card className="bg-white p-6 border-0 shadow-sm">
            <p className="text-sm text-gray-500 mb-2">Funcionários</p>
            <p className="text-4xl font-bold text-gray-800">{cadastroStats.funcionarios}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/funcionarios')}
            >
              Gerenciar
            </Button>
          </Card>
          <Card className="bg-white p-6 border-0 shadow-sm">
            <p className="text-sm text-gray-500 mb-2">Insumos</p>
            <p className="text-4xl font-bold text-gray-800">{cadastroStats.insumos}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/insumos')}
            >
              Gerenciar
            </Button>
          </Card>
          <Card className="bg-white p-6 border-0 shadow-sm">
            <p className="text-sm text-gray-500 mb-2">Pluviômetros</p>
            <p className="text-4xl font-bold text-gray-800">{cadastroStats.pluviometros}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => navigate('/controller/pluviometros')}
            >
              Gerenciar
            </Button>
          </Card>
        </div>
      </div>

      {/* Estatísticas de Cadernetas */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Cadernetas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="bg-white p-6 border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-accent transition-all"
            onClick={() => navigate('/controller/maternidade')}
          >
            <div className="flex items-center gap-4 mb-3">
              <img src={CADERNETA_IMAGES.maternidade} alt={CADERNETA_TITLES.maternidade} className="w-16 h-16 rounded-[32px]" />
              <div>
                <p className="text-sm text-gray-500 mb-1">{CADERNETA_TITLES.maternidade}</p>
                <p className="text-4xl font-bold text-gray-800">{cadernetaStats.maternidade}</p>
              </div>
            </div>
          </Card>
          <Card 
            className="bg-white p-6 border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-accent transition-all"
            onClick={() => navigate('/controller/pastagens-caderneta')}
          >
            <div className="flex items-center gap-4 mb-3">
              <img src={CADERNETA_IMAGES.pastagens} alt={CADERNETA_TITLES.pastagens} className="w-16 h-16 rounded-[32px]" />
              <div>
                <p className="text-sm text-gray-500 mb-1">{CADERNETA_TITLES.pastagens}</p>
                <p className="text-4xl font-bold text-gray-800">{cadernetaStats.pastagens}</p>
              </div>
            </div>
          </Card>
          <Card 
            className="bg-white p-6 border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-accent transition-all"
            onClick={() => navigate('/controller/rodeio')}
          >
            <div className="flex items-center gap-4 mb-3">
              <img src={CADERNETA_IMAGES.rodeio} alt={CADERNETA_TITLES.rodeio} className="w-16 h-16 rounded-[32px]" />
              <div>
                <p className="text-sm text-gray-500 mb-1">{CADERNETA_TITLES.rodeio}</p>
                <p className="text-4xl font-bold text-gray-800">{cadernetaStats.rodeio}</p>
              </div>
            </div>
          </Card>
          <Card 
            className="bg-white p-6 border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-accent transition-all"
            onClick={() => navigate('/controller/suplementacao')}
          >
            <div className="flex items-center gap-4 mb-3">
              <img src={CADERNETA_IMAGES.suplementacao} alt={CADERNETA_TITLES.suplementacao} className="w-16 h-16 rounded-[32px]" />
              <div>
                <p className="text-sm text-gray-500 mb-1">{CADERNETA_TITLES.suplementacao}</p>
                <p className="text-4xl font-bold text-gray-800">{cadernetaStats.suplementacao}</p>
              </div>
            </div>
          </Card>
          <Card 
            className="bg-white p-6 border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-accent transition-all"
            onClick={() => navigate('/controller/bebedouros')}
          >
            <div className="flex items-center gap-4 mb-3">
              <img src={CADERNETA_IMAGES.bebedouros} alt={CADERNETA_TITLES.bebedouros} className="w-16 h-16 rounded-[32px]" />
              <div>
                <p className="text-sm text-gray-500 mb-1">{CADERNETA_TITLES.bebedouros}</p>
                <p className="text-4xl font-bold text-gray-800">{cadernetaStats.bebedouros}</p>
              </div>
            </div>
          </Card>
          <Card 
            className="bg-white p-6 border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-accent transition-all"
            onClick={() => navigate('/controller/movimentacao')}
          >
            <div className="flex items-center gap-4 mb-3">
              <img src={CADERNETA_IMAGES.movimentacao} alt={CADERNETA_TITLES.movimentacao} className="w-16 h-16 rounded-[32px]" />
              <div>
                <p className="text-sm text-gray-500 mb-1">{CADERNETA_TITLES.movimentacao}</p>
                <p className="text-4xl font-bold text-gray-800">{cadernetaStats.movimentacao}</p>
              </div>
            </div>
          </Card>
          <Card 
            className="bg-white p-6 border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-accent transition-all"
            onClick={() => navigate('/controller/enfermaria')}
          >
            <div className="flex items-center gap-4 mb-3">
              <img src={CADERNETA_IMAGES.enfermaria} alt={CADERNETA_TITLES.enfermaria} className="w-16 h-16 rounded-[32px]" />
              <div>
                <p className="text-sm text-gray-500 mb-1">{CADERNETA_TITLES.enfermaria}</p>
                <p className="text-4xl font-bold text-gray-800">{cadernetaStats.enfermaria}</p>
              </div>
            </div>
          </Card>
          <Card 
            className="bg-white p-6 border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-accent transition-all"
            onClick={() => navigate('/controller/morte')}
          >
            <div className="flex items-center gap-4 mb-3">
              <img src={CADERNETA_IMAGES.morte} alt={CADERNETA_TITLES.morte} className="w-16 h-16 rounded-[32px]" />
              <div>
                <p className="text-sm text-gray-500 mb-1">{CADERNETA_TITLES.morte}</p>
                <p className="text-4xl font-bold text-gray-800">{cadernetaStats.morte}</p>
              </div>
            </div>
          </Card>
          <Card 
            className="bg-white p-6 border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-accent transition-all"
            onClick={() => navigate('/controller/clima')}
          >
            <div className="flex items-center gap-4 mb-3">
              <img src={CADERNETA_IMAGES.clima} alt={CADERNETA_TITLES.clima} className="w-16 h-16 rounded-[32px]" />
              <div>
                <p className="text-sm text-gray-500 mb-1">{CADERNETA_TITLES.clima}</p>
                <p className="text-4xl font-bold text-gray-800">{cadernetaStats.clima}</p>
              </div>
            </div>
          </Card>
          <Card 
            className="bg-white p-6 border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-accent transition-all"
            onClick={() => navigate('/controller/abastecimento')}
          >
            <div className="flex items-center gap-4 mb-3">
              <img src={CADERNETA_IMAGES.abastecimento} alt={CADERNETA_TITLES.abastecimento} className="w-16 h-16 rounded-[32px]" />
              <div>
                <p className="text-sm text-gray-500 mb-1">{CADERNETA_TITLES.abastecimento}</p>
                <p className="text-4xl font-bold text-gray-800">{cadernetaStats.abastecimento}</p>
              </div>
            </div>
          </Card>
          <Card 
            className="bg-white p-6 border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-accent transition-all"
            onClick={() => navigate('/controller/cantina')}
          >
            <div className="flex items-center gap-4 mb-3">
              <img src={CADERNETA_IMAGES.cantina} alt={CADERNETA_TITLES.cantina} className="w-16 h-16 rounded-[32px]" />
              <div>
                <p className="text-sm text-gray-500 mb-1">{CADERNETA_TITLES.cantina}</p>
                <p className="text-4xl font-bold text-gray-800">{cadernetaStats.cantina}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Atividades Recentes */}
      {recentActivities.length > 0 && (
        <Card className="bg-white p-6 border-0 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Atividades Recentes</h3>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => navigate(activity.path)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                    <span className="text-lg">📝</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{activity.title}</p>
                    <p className="text-sm text-gray-500">{activity.type}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{activity.date}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ações Rápidas */}
      <Card className="bg-white p-6 border-0 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button onClick={() => navigate('/controller/pastos')}>
            Novo Pasto
          </Button>
          <Button onClick={() => navigate('/controller/lotes')}>
            Novo Lote
          </Button>
          <Button onClick={() => navigate('/controller/funcionarios')}>
            Novo Funcionário
          </Button>
          <Button onClick={() => navigate('/controller/insumos')}>
            Novo Insumo
          </Button>
        </div>
      </Card>
    </div>
  )
}
