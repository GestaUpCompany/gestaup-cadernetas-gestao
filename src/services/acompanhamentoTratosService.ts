import { supabase } from './supabaseClient'
import type { TipoProgramacao } from './programacaoTratosService'

export interface PlanejadoLote {
  lote_id: string
  lote_nome: string | null
  curral_id: string
  curral_nome: string
  kg_mn_dia: number
  n_cabecas_snapshot: number | null
  peso_vivo_medio_snapshot: number | null
  tipo: TipoProgramacao
  quantidade_tratos: number
  programacao_created_at: string // ISO timestamp
}

export interface RegistroTratoDia {
  data: string // YYYY-MM-DD
  lote_id: string | null
  lote_nome: string | null
  curral_id: string | null
  curral_nome: string | null
  kg_planejado_total: number
  kg_ofertado_total: number
  n_tratos: number
  leitura_media: number | null
  tratadores: string[]
  qtd_registros: number
}

export interface LinhaDesvio {
  data: string // YYYY-MM-DD
  lote_id: string
  lote_nome: string
  curral_nome: string | null
  planejado_kg: number | null // null = sem planejamento
  real_kg: number
  desvio_kg: number | null
  desvio_pct: number | null
  n_tratos: number
  leitura_media: number | null
  tratador: string | null
  status: 'ok' | 'alerta' | 'critico' | 'sem_execucao'
}

export interface ResumoLote {
  lote_id: string
  lote_nome: string
  planejado_total_kg: number
  real_total_kg: number
  desvio_total_kg: number
  desvio_medio_pct: number
  dias_com_registro: number
  dias_no_periodo: number
  status: 'ok' | 'alerta' | 'critico' | 'sem_execucao'
}

/**
 * Busca a programação de tratos ativa da fazenda, agrupada por lote.
 * Usado para preencher dias sem execução (linhas "sem execução").
 */
export async function fetchPlanejadoPorLote(
  fazendaId: string
): Promise<Record<string, PlanejadoLote[]>> {
  const { data: progs, error: progError } = await supabase
    .from('programacao_tratos')
    .select('id, tipo, quantidade_tratos, created_at')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)

  if (progError || !progs || progs.length === 0) return {}

  const resultado: Record<string, PlanejadoLote[]> = {}

  for (const prog of progs) {
    const { data: currais, error: curraisError } = await supabase
      .from('programacao_tratos_currais')
      .select(`
        curral_id,
        lote_id,
        kg_mn_dia,
        n_cabecas_snapshot,
        peso_vivo_medio_snapshot,
        currais (nome),
        lotes (nome)
      `)
      .eq('programacao_id', prog.id)

    if (curraisError || !currais) continue

    for (const c of currais) {
      const loteId = c.lote_id
      if (!loteId) continue

      const item: PlanejadoLote = {
        lote_id: loteId,
        lote_nome: (c.lotes as any)?.nome ?? null,
        curral_id: c.curral_id,
        curral_nome: (c.currais as any)?.nome ?? '—',
        kg_mn_dia: Number(c.kg_mn_dia) || 0,
        n_cabecas_snapshot: c.n_cabecas_snapshot,
        peso_vivo_medio_snapshot: c.peso_vivo_medio_snapshot,
        tipo: prog.tipo as TipoProgramacao,
        quantidade_tratos: prog.quantidade_tratos,
        programacao_created_at: prog.created_at as string,
      }

      if (!resultado[loteId]) resultado[loteId] = []
      resultado[loteId].push(item)
    }
  }

  return resultado
}

/**
 * Busca registros de oferta de trato do período, agregados por lote + dia.
 * Lê da tabela registros_oferta_trato, que já contém kg_planejado e kg_ofertado_real por trato.
 */
export async function fetchRealPorLoteDia(
  fazendaId: string,
  dataInicio: string,
  dataFim: string
): Promise<RegistroTratoDia[]> {
  const { data, error } = await supabase
    .from('registros_oferta_trato')
    .select(`
      data,
      lote_id,
      curral_id,
      ordem_trato,
      kg_planejado,
      kg_ofertado_real,
      leitura_cocho_nota,
      nome_usuario,
      lotes (nome),
      currais (nome)
    `)
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: true })

  if (error || !data) return []

  // Agrupar por lote_id + data
  const mapa: Record<string, RegistroTratoDia> = {}

  for (const r of data) {
    const dataDia = r.data as string // já é date (YYYY-MM-DD)
    const loteId = r.lote_id || '_sem_lote'
    const chave = `${loteId}|${dataDia}`

    if (!mapa[chave]) {
      mapa[chave] = {
        data: dataDia,
        lote_id: r.lote_id || null,
        lote_nome: (r.lotes as any)?.nome ?? null,
        curral_id: r.curral_id || null,
        curral_nome: (r.currais as any)?.nome ?? null,
        kg_planejado_total: 0,
        kg_ofertado_total: 0,
        n_tratos: 0,
        leitura_media: null,
        tratadores: [],
        qtd_registros: 0,
      }
    }

    const entry = mapa[chave]
    entry.kg_planejado_total += Number(r.kg_planejado) || 0
    entry.kg_ofertado_total += Number(r.kg_ofertado_real) || 0
    entry.n_tratos += 1
    entry.qtd_registros += 1

    // Coletar tratadores únicos
    if (r.nome_usuario && !entry.tratadores.includes(r.nome_usuario)) {
      entry.tratadores.push(r.nome_usuario)
    }

    // Leitura média (leitura_cocho_nota é integer)
    const leituraNum = r.leitura_cocho_nota != null ? Number(r.leitura_cocho_nota) : null
    if (leituraNum != null && !isNaN(leituraNum)) {
      if (entry.leitura_media == null) {
        entry.leitura_media = leituraNum
      } else {
        entry.leitura_media = (entry.leitura_media * (entry.qtd_registros - 1) + leituraNum) / entry.qtd_registros
      }
    }
  }

  return Object.values(mapa)
}

/**
 * Gera todas as datas entre dataInicio e dataFim (inclusive).
 */
function gerarDatasPeriodo(dataInicio: string, dataFim: string): string[] {
  const datas: string[] = []
  const inicio = new Date(dataInicio + 'T00:00:00')
  const fim = new Date(dataFim + 'T00:00:00')
  const atual = new Date(inicio)

  while (atual <= fim) {
    const ano = atual.getFullYear()
    const mes = String(atual.getMonth() + 1).padStart(2, '0')
    const dia = String(atual.getDate()).padStart(2, '0')
    datas.push(`${ano}-${mes}-${dia}`)
    atual.setDate(atual.getDate() + 1)
  }

  return datas
}

/**
 * Cruza planejado e real por lote × dia.
 * Para dias com execução, usa o kg_planejado que vem do próprio registro (mais preciso).
 * Para dias sem execução, usa o kg_mn_dia da programacao_tratos_currais.
 */
export function cruzarPlanejadoReal(
  planejado: Record<string, PlanejadoLote[]>,
  real: RegistroTratoDia[],
  dataInicio: string,
  dataFim: string,
  lotesFiltro: string[] // se vazio, todos
): LinhaDesvio[] {
  const datas = gerarDatasPeriodo(dataInicio, dataFim)
  const linhas: LinhaDesvio[] = []

  // Indexar real por lote_id + data
  const realMapa: Record<string, RegistroTratoDia> = {}
  for (const r of real) {
    const loteId = r.lote_id || '_sem_lote'
    realMapa[`${loteId}|${r.data}`] = r
  }

  // Lotes com planejamento: gerar linha para cada dia do período
  const lotesPlanejados = Object.keys(planejado).filter(
    (id) => lotesFiltro.length === 0 || lotesFiltro.includes(id)
  )

  for (const loteId of lotesPlanejados) {
    const curraisLote = planejado[loteId]
    const kgPlanejadoDia = curraisLote.reduce((sum, c) => sum + c.kg_mn_dia, 0)
    const loteNome = curraisLote[0]?.lote_nome ?? '—'
    const curralNome = curraisLote[0]?.curral_nome ?? null

    // Data de início efetiva do planejamento: created_at da programação.
    // A tabela programacao_tratos não tem data_inicio, então usamos created_at como proxy.
    const createdAt = curraisLote[0]?.programacao_created_at
    const dataInicioPlanejamento = createdAt ? createdAt.substring(0, 10) : dataInicio

    for (const data of datas) {
      // Pular dias anteriores à criação da programação
      if (data < dataInicioPlanejamento) continue

      const realDia = realMapa[`${loteId}|${data}`]

      if (realDia) {
        // Dia com execução: usar kg_planejado do próprio registro
        const planejadoKg = realDia.kg_planejado_total
        const realKg = realDia.kg_ofertado_total
        const desvioKg = realKg - planejadoKg
        const desvioPct = planejadoKg > 0 ? (desvioKg / planejadoKg) * 100 : null

        linhas.push({
          data,
          lote_id: loteId,
          lote_nome: loteNome,
          curral_nome: realDia.curral_nome || curralNome,
          planejado_kg: planejadoKg,
          real_kg: realKg,
          desvio_kg: desvioKg,
          desvio_pct: desvioPct,
          n_tratos: realDia.n_tratos,
          leitura_media: realDia.leitura_media,
          tratador: realDia.tratadores.join(', ') || null,
          status: classificarDesvio(desvioPct),
        })
      } else {
        // Dia sem execução para lote planejado
        linhas.push({
          data,
          lote_id: loteId,
          lote_nome: loteNome,
          curral_nome: curralNome,
          planejado_kg: kgPlanejadoDia,
          real_kg: 0,
          desvio_kg: -kgPlanejadoDia,
          desvio_pct: -100,
          n_tratos: 0,
          leitura_media: null,
          tratador: null,
          status: 'sem_execucao',
        })
      }
    }
  }

  // Lotes com execução mas sem planejamento (não deveria acontecer com registros_oferta_trato,
  // mas mantemos por segurança)
  const lotesRealSemPlanejamento = new Set<string>()
  for (const r of real) {
    const loteId = r.lote_id || '_sem_lote'
    if (!planejado[loteId]) {
      lotesRealSemPlanejamento.add(loteId)
    }
  }

  for (const loteId of lotesRealSemPlanejamento) {
    if (lotesFiltro.length > 0 && !lotesFiltro.includes(loteId)) continue

    for (const r of real) {
      const rLoteId = r.lote_id || '_sem_lote'
      if (rLoteId !== loteId) continue

      const desvioKg = r.kg_ofertado_total - r.kg_planejado_total
      const desvioPct = r.kg_planejado_total > 0 ? (desvioKg / r.kg_planejado_total) * 100 : null

      linhas.push({
        data: r.data,
        lote_id: loteId,
        lote_nome: r.lote_nome ?? 'Sem lote',
        curral_nome: r.curral_nome,
        planejado_kg: r.kg_planejado_total,
        real_kg: r.kg_ofertado_total,
        desvio_kg: desvioKg,
        desvio_pct: desvioPct,
        n_tratos: r.n_tratos,
        leitura_media: r.leitura_media,
        tratador: r.tratadores.join(', ') || null,
        status: classificarDesvio(desvioPct),
      })
    }
  }

  // Ordenar por data desc, depois por lote
  linhas.sort((a, b) => {
    if (a.data !== b.data) return b.data.localeCompare(a.data)
    return a.lote_nome.localeCompare(b.lote_nome)
  })

  return linhas
}

function classificarDesvio(desvioPct: number | null): 'ok' | 'alerta' | 'critico' {
  if (desvioPct == null) return 'ok'
  const abs = Math.abs(desvioPct)
  if (abs <= 5) return 'ok'
  if (abs <= 15) return 'alerta'
  return 'critico'
}

/**
 * Calcula o resumo agregado por lote para o período.
 */
export function calcularResumoPorLote(
  linhas: LinhaDesvio[],
  dataInicio: string,
  dataFim: string
): ResumoLote[] {
  const diasNoPeriodo = gerarDatasPeriodo(dataInicio, dataFim).length
  const mapa: Record<string, ResumoLote> = {}

  for (const linha of linhas) {
    if (!mapa[linha.lote_id]) {
      mapa[linha.lote_id] = {
        lote_id: linha.lote_id,
        lote_nome: linha.lote_nome,
        planejado_total_kg: 0,
        real_total_kg: 0,
        desvio_total_kg: 0,
        desvio_medio_pct: 0,
        dias_com_registro: 0,
        dias_no_periodo: diasNoPeriodo,
        status: 'ok',
      }
    }

    const res = mapa[linha.lote_id]
    if (linha.planejado_kg != null) res.planejado_total_kg += linha.planejado_kg
    res.real_total_kg += linha.real_kg
    if (linha.desvio_kg != null) res.desvio_total_kg += linha.desvio_kg
    if (linha.n_tratos > 0) res.dias_com_registro += 1
  }

  // Calcular desvio médio % e status
  for (const res of Object.values(mapa)) {
    if (res.planejado_total_kg > 0) {
      res.desvio_medio_pct = (res.desvio_total_kg / res.planejado_total_kg) * 100
      res.status = classificarDesvio(res.desvio_medio_pct)
    } else if (res.real_total_kg === 0) {
      res.status = 'sem_execucao'
    }
  }

  return Object.values(mapa).sort((a, b) => a.lote_nome.localeCompare(b.lote_nome))
}
