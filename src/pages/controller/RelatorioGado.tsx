import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Card, Button } from '../../components/ui'
import { supabase } from '../../services/supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Lote {
  id: string
  nome: string
  n_cabecas?: number
  peso_vivo_kg?: number
  categorias?: string[]
  ativo: boolean
}

type PeriodoFiltro = '7d' | '30d' | '90d' | 'all'

export function RelatorioGado() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>('all')

  useEffect(() => {
    loadLotes()
  }, [user, periodoFiltro])

  const loadLotes = async () => {
    if (!user) return

    const { data: vinculos } = await supabase
      .from('usuario_fazenda')
      .select('fazenda_id')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (!vinculos || vinculos.length === 0) return

    const fazendaId = vinculos[0].fazenda_id

    const { data: lotes } = await supabase
      .from('lotes')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)

    setLotes(lotes || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Período:</span>
          <div className="flex gap-2">
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 border-0 shadow-sm rounded-xl">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="bg-white p-6 border-0 shadow-sm rounded-xl">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="bg-white p-6 border-0 shadow-sm rounded-xl">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white p-6 border-0 shadow-sm rounded-xl">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="bg-white p-6 border-0 shadow-sm rounded-xl">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  const totalAnimais = lotes.reduce((acc, lote) => acc + (lote.n_cabecas || 0), 0)
  const pesoMedio = lotes.filter(l => l.peso_vivo_kg).reduce((acc, l) => {
    const peso = typeof l.peso_vivo_kg === 'string' ? parseFloat(l.peso_vivo_kg) : l.peso_vivo_kg
    return acc + (peso || 0)
  }, 0) / lotes.filter(l => l.peso_vivo_kg).length

  // Dados para o gráfico
  const dadosGrafico = lotes.map(lote => ({
    nome: lote.nome,
    cabecas: lote.n_cabecas || 0,
  }))

  return (
    <div className="space-y-6 page-transition">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Relatório de Gado</h2>
        <Button onClick={() => navigate('/controller/dashboard')} variant="secondary" className="w-full md:w-auto">
          Voltar ao Dashboard
        </Button>
      </div>

      {/* Filtro de Período */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <span className="text-sm text-gray-600">Período:</span>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant={periodoFiltro === '7d' ? 'primary' : 'secondary'}
            onClick={() => setPeriodoFiltro('7d')}
            className="text-sm flex-1 sm:flex-none"
          >
            7 dias
          </Button>
          <Button
            variant={periodoFiltro === '30d' ? 'primary' : 'secondary'}
            onClick={() => setPeriodoFiltro('30d')}
            className="text-sm flex-1 sm:flex-none"
          >
            30 dias
          </Button>
          <Button
            variant={periodoFiltro === '90d' ? 'primary' : 'secondary'}
            onClick={() => setPeriodoFiltro('90d')}
            className="text-sm flex-1 sm:flex-none"
          >
            90 dias
          </Button>
          <Button
            variant={periodoFiltro === 'all' ? 'primary' : 'secondary'}
            onClick={() => setPeriodoFiltro('all')}
            className="text-sm flex-1 sm:flex-none"
          >
            Todo o período
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <Card className="bg-white p-6 border-0 shadow-sm">
          <p className="text-sm text-gray-500 mb-2">Total de Animais</p>
          <p className="text-4xl font-bold text-gray-800">{totalAnimais}</p>
          <p className="text-xs text-gray-400 mt-2">Cabeças</p>
        </Card>
        <Card className="bg-white p-6 border-0 shadow-sm">
          <p className="text-sm text-gray-500 mb-2">Total de Lotes</p>
          <p className="text-4xl font-bold text-gray-800">{lotes.length}</p>
          <p className="text-xs text-gray-400 mt-2">Lotes ativos</p>
        </Card>
        <Card className="bg-white p-6 border-0 shadow-sm">
          <p className="text-sm text-gray-500 mb-2">Peso Médio</p>
          <p className="text-4xl font-bold text-gray-800">{pesoMedio.toFixed(0)}</p>
          <p className="text-xs text-gray-400 mt-2">kg por animal</p>
        </Card>
      </div>

      {/* Gráfico de Distribuição por Lote */}
      <Card className="bg-white p-6 border-0 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Distribuição por Lote</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dadosGrafico}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nome" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cabecas" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Detalhes por Lote */}
      <Card className="bg-white p-6 border-0 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Detalhes por Lote</h3>
        <div className="space-y-3">
          {lotes.map((lote) => (
            <div key={lote.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">{lote.nome}</p>
                <p className="text-sm text-gray-500">
                  {lote.categorias && Array.isArray(lote.categorias) 
                    ? lote.categorias.join(', ') 
                    : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-800">{lote.n_cabecas || 0} cabeças</p>
                <p className="text-sm text-gray-500">{lote.peso_vivo_kg} kg</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
