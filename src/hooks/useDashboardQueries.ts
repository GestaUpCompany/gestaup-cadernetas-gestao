import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabaseClient'

async function getFazendaId(userId: string): Promise<string | null> {
  const { data: vinculos } = await supabase
    .from('usuario_fazenda')
    .select('fazenda_id')
    .eq('usuario_id', userId)
    .eq('ativo', true)
  return vinculos?.[0]?.fazenda_id ?? null
}

export function useFazenda(userId: string | undefined) {
  return useQuery({
    queryKey: ['fazenda', userId],
    enabled: !!userId,
    queryFn: async () => {
      const fazendaId = await getFazendaId(userId!)
      if (!fazendaId) return null

      const { data } = await supabase
        .from('fazendas')
        .select('*')
        .eq('id', fazendaId)
        .single()

      return data
    },
  })
}

export function useDashboardStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard-stats', userId],
    enabled: !!userId,
    queryFn: async () => {
      const fazendaId = await getFazendaId(userId!)
      if (!fazendaId) return null

      const [
        { count: pastosCount },
        { count: lotesCount },
        { count: funcionariosCount },
        { count: insumosCount },
        { count: pluviometrosCount },
        { count: medicamentosCount },
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
        { count: limpezaCount },
        { count: operacoesMaquinasCount },
        { count: almoxarifadoCount },
        { count: manutencaoMaquinasCount },
        { count: problemasCount },
      ] = await Promise.all([
        supabase.from('pastos').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('lotes').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('funcionarios').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('insumos').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('pluviometros').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('medicamentos').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
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
        supabase.from('registros_alimentacao').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('registros_limpeza').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('registros_operacoes_maquinas').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('registros_almoxarifado').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('registros_manutencao_maquinas').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('registros_problemas').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      ])

      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayStr = `${year}-${month}-${day}`
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowYear = tomorrow.getFullYear()
      const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0')
      const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0')
      const tomorrowStr = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`

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
        supabase.from('registros_maternidade').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).gte('data', `${todayStr}T00:00:00Z`).lt('data', `${tomorrowStr}T00:00:00Z`),
        supabase.from('registros_enfermaria').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).gte('data', `${todayStr}T00:00:00Z`).lt('data', `${tomorrowStr}T00:00:00Z`),
        supabase.from('registros_pastagens').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).gte('data', `${todayStr}T00:00:00Z`).lt('data', `${tomorrowStr}T00:00:00Z`),
        supabase.from('registros_rodeio').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).gte('data', `${todayStr}T00:00:00Z`).lt('data', `${tomorrowStr}T00:00:00Z`),
        supabase.from('registros_suplementacao').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).gte('data', `${todayStr}T00:00:00Z`).lt('data', `${tomorrowStr}T00:00:00Z`),
        supabase.from('registros_bebedouros').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).gte('data', `${todayStr}T00:00:00Z`).lt('data', `${tomorrowStr}T00:00:00Z`),
        supabase.from('registros_movimentacao').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).gte('data', `${todayStr}T00:00:00Z`).lt('data', `${tomorrowStr}T00:00:00Z`),
        supabase.from('registros_morte').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId).gte('data', `${todayStr}T00:00:00Z`).lt('data', `${tomorrowStr}T00:00:00Z`),
      ])

      return {
        cadastroStats: {
          pastos: pastosCount || 0,
          lotes: lotesCount || 0,
          funcionarios: funcionariosCount || 0,
          insumos: insumosCount || 0,
          pluviometros: pluviometrosCount || 0,
          medicamentos: medicamentosCount || 0,
        },
        cadernetaStats: {
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
          limpeza: limpezaCount || 0,
          'operacoes-maquinas': operacoesMaquinasCount || 0,
          almoxarifado: almoxarifadoCount || 0,
          'manutencao-maquinas': manutencaoMaquinasCount || 0,
          problemas: problemasCount || 0,
        },
        registrosHoje: (maternidadeHoje || 0) + (enfermariaHoje || 0) + (pastagensHoje || 0) + (rodeioHoje || 0) + (suplementacaoHoje || 0) + (bebedourosHoje || 0) + (movimentacaoHoje || 0) + (morteHoje || 0),
      }
    },
  })
}

export function useGadoStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['gado-stats', userId],
    enabled: !!userId,
    queryFn: async () => {
      const fazendaId = await getFazendaId(userId!)
      if (!fazendaId) return null

      // Buscar lotes ativos
      const { data: lotes } = await supabase
        .from('lotes')
        .select('id, nome')
        .eq('fazenda_id', fazendaId)
        .eq('ativo', true)

      const loteIds = lotes?.map(l => l.id) || []

      // Buscar categorias dos lotes
      const { data: categorias } = await supabase
        .from('lote_categorias')
        .select('lote_id, quant_atual, quant_inicial, peso_vivo_atual_kg_cab, peso_entrada_kg_cab')
        .in('lote_id', loteIds)

      // Agrupar categorias por lote
      const categoriasPorLote: Record<string, NonNullable<typeof categorias>[number][]> = {}
      categorias?.forEach(cat => {
        if (!categoriasPorLote[cat.lote_id]) categoriasPorLote[cat.lote_id] = []
        categoriasPorLote[cat.lote_id].push(cat)
      })

      // Calcular totais por lote
      const lotesStats = lotes?.map(lote => {
        const cats = categoriasPorLote[lote.id] || []
        const cabecas = cats.reduce((sum, c) => sum + (c.quant_atual ?? c.quant_inicial ?? 0), 0)
        const totalPeso = cats.reduce((sum, c) => {
          const q = c.quant_atual ?? c.quant_inicial ?? 0
          const pesoAtual = c.peso_vivo_atual_kg_cab ? parseFloat(c.peso_vivo_atual_kg_cab as unknown as string) : 0
          const pesoEntrada = c.peso_entrada_kg_cab ? parseFloat(c.peso_entrada_kg_cab as unknown as string) : 0
          const p = pesoAtual || pesoEntrada || 0
          return sum + (q * p)
        }, 0)
        const pesoMedio = cabecas > 0 ? totalPeso / cabecas : 0
        return { nome: lote.nome, cabecas, pesoMedio }
      }) || []

      const totalAnimais = lotesStats.reduce((acc, l) => acc + l.cabecas, 0)
      const animaisPorLote = lotesStats.map(l => ({ nome: l.nome, cabecas: l.cabecas }))

      const lotesComPeso = lotesStats.filter(l => l.pesoMedio > 0)
      const totalCabecasComPeso = lotesComPeso.reduce((sum, l) => sum + l.cabecas, 0)
      const totalPeso = lotesComPeso.reduce((sum, l) => sum + (l.cabecas * l.pesoMedio), 0)
      const pesoMedioLotes = totalCabecasComPeso > 0 ? totalPeso / totalCabecasComPeso : 0

      const [{ data: mortesData }, { data: enfermariaData }, { data: causasMorte }] = await Promise.all([
        supabase.from('registros_morte').select('*').eq('fazenda_id', fazendaId),
        supabase.from('registros_enfermaria').select('*').eq('fazenda_id', fazendaId),
        supabase.from('registros_morte').select('causa_morte').eq('fazenda_id', fazendaId).not('causa_morte', 'is', null),
      ])

      const causasCount: { [key: string]: number } = {}
      causasMorte?.forEach(registro => {
        if (registro.causa_morte) {
          causasCount[registro.causa_morte] = (causasCount[registro.causa_morte] || 0) + 1
        }
      })

      const causasMorteFrequentes = Object.entries(causasCount)
        .map(([causa, total]) => ({ causa, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

      return {
        totalAnimais,
        animaisPorLote,
        mortesMesAtual: mortesData?.length || 0,
        pesoMedioLotes,
        enfermariaMesAtual: enfermariaData?.length || 0,
        causasMorteFrequentes,
      }
    },
  })
}

export function useRecentActivities(userId: string | undefined) {
  return useQuery({
    queryKey: ['recent-activities', userId],
    enabled: !!userId,
    queryFn: async () => {
      const fazendaId = await getFazendaId(userId!)
      if (!fazendaId) return []

      const [{ data: maternidadeData }, { data: enfermariaData }, { data: rodeioData }] = await Promise.all([
        supabase.from('registros_maternidade').select('id, data').eq('fazenda_id', fazendaId).order('data', { ascending: false }).limit(1),
        supabase.from('registros_enfermaria').select('id, data').eq('fazenda_id', fazendaId).order('data', { ascending: false }).limit(1),
        supabase.from('registros_rodeio').select('id, data').eq('fazenda_id', fazendaId).order('data', { ascending: false }).limit(1),
      ])

      const formatDateTime = (isoString: string): string => {
        const d = new Date(isoString)
        if (isNaN(d.getTime())) return isoString
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        const hours = String(d.getHours()).padStart(2, '0')
        const minutes = String(d.getMinutes()).padStart(2, '0')
        const hasTime = hours !== '00' || minutes !== '00' || isoString.includes('T')
        if (hasTime && (hours !== '00' || minutes !== '00')) {
          return `${day}/${month}/${year} ${hours}:${minutes}`
        }
        return `${day}/${month}/${year}`
      }

      const activities = []

      if (maternidadeData?.[0]) {
        activities.push({ id: maternidadeData[0].id, type: 'Maternidade', title: 'Registro de parto', date: formatDateTime(maternidadeData[0].data), path: `/controller/cadernetas/maternidade/${maternidadeData[0].id}` })
      }
      if (enfermariaData?.[0]) {
        activities.push({ id: enfermariaData[0].id, type: 'Enfermaria', title: 'Registro de tratamento', date: formatDateTime(enfermariaData[0].data), path: `/controller/cadernetas/enfermaria/${enfermariaData[0].id}` })
      }
      if (rodeioData?.[0]) {
        activities.push({ id: rodeioData[0].id, type: 'Rodeio', title: 'Registro de rodeio', date: formatDateTime(rodeioData[0].data), path: `/controller/cadernetas/rodeio/${rodeioData[0].id}` })
      }

      return activities.slice(0, 5)
    },
  })
}
