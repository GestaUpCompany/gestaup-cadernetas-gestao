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
      ] = await Promise.all([
        supabase.from('pastos').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('lotes').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('funcionarios').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('insumos').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('pluviometros').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
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
        supabase.from('registros_limpeza').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
        supabase.from('registros_operacoes_maquinas').select('*', { count: 'exact', head: true }).eq('fazenda_id', fazendaId),
      ])

      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayStr = `${year}-${day}-${month}`

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

      return {
        cadastroStats: {
          pastos: pastosCount || 0,
          lotes: lotesCount || 0,
          funcionarios: funcionariosCount || 0,
          insumos: insumosCount || 0,
          pluviometros: pluviometrosCount || 0,
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

      const { data: lotes } = await supabase
        .from('lotes')
        .select('nome, n_cabecas, categorias, peso_vivo_kg')
        .eq('fazenda_id', fazendaId)
        .eq('ativo', true)

      const totalAnimais = lotes?.reduce((acc, lote) => acc + (lote.n_cabecas || 0), 0) || 0
      const animaisPorLote = lotes?.map(lote => ({ nome: lote.nome, cabecas: lote.n_cabecas || 0 })) || []

      const lotesComPeso = lotes?.filter(lote => lote.peso_vivo_kg) || []
      const pesoMedioLotes = lotesComPeso.length > 0
        ? lotesComPeso.reduce((acc, lote) => {
            const peso = typeof lote.peso_vivo_kg === 'string' ? parseFloat(lote.peso_vivo_kg) : lote.peso_vivo_kg
            return acc + (peso || 0)
          }, 0) / lotesComPeso.length
        : 0

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

      const activities = []

      if (maternidadeData?.[0]) {
        const [year, day, month] = maternidadeData[0].data.split('-')
        activities.push({ id: maternidadeData[0].id, type: 'Maternidade', title: 'Registro de parto', date: `${day}/${month}/${year}`, path: '/controller/maternidade' })
      }
      if (enfermariaData?.[0]) {
        const [year, day, month] = enfermariaData[0].data.split('-')
        activities.push({ id: enfermariaData[0].id, type: 'Enfermaria', title: 'Registro de tratamento', date: `${day}/${month}/${year}`, path: '/controller/enfermaria' })
      }
      if (rodeioData?.[0]) {
        const [year, day, month] = rodeioData[0].data.split('-')
        activities.push({ id: rodeioData[0].id, type: 'Rodeio', title: 'Registro de rodeio', date: `${day}/${month}/${year}`, path: '/controller/rodeio' })
      }

      return activities.slice(0, 5)
    },
  })
}
