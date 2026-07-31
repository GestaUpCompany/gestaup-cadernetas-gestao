import { supabase } from './supabaseClient'

export type TipoProgramacao = 'engorda' | 'sequestro'

export interface ProgramacaoTratos {
  id: string
  fazenda_id: string
  tipo: TipoProgramacao
  quantidade_tratos: number
  ativo: boolean
}

export interface ProgramacaoPercentual {
  id: string
  programacao_id: string
  ordem_trato: number
  percentual: number
  horario_sugerido: string | null
}

export interface ProgramacaoCompleta {
  programacao: ProgramacaoTratos | null
  percentuais: ProgramacaoPercentual[]
}

/**
 * Carrega a programação de tratos de um tipo específico (engorda ou sequestro)
 * para a fazenda, incluindo os percentuais por trato.
 */
export async function getProgramacaoTratos(
  fazendaId: string,
  tipo: TipoProgramacao
): Promise<ProgramacaoCompleta> {
  const { data: prog, error: progError } = await supabase
    .from('programacao_tratos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .eq('tipo', tipo)
    .maybeSingle()

  if (progError) {
    console.error('Erro ao buscar programação de tratos:', progError)
    return { programacao: null, percentuais: [] }
  }

  if (!prog) {
    return { programacao: null, percentuais: [] }
  }

  const { data: percentuais, error: percError } = await supabase
    .from('programacao_tratos_percentuais')
    .select('*')
    .eq('programacao_id', prog.id)
    .order('ordem_trato', { ascending: true })

  if (percError) {
    console.error('Erro ao buscar percentuais:', percError)
  }

  return {
    programacao: prog as ProgramacaoTratos,
    percentuais: (percentuais || []) as ProgramacaoPercentual[],
  }
}

/**
 * Carrega quais tipos de programação (engorda/sequestro) já existem para a fazenda.
 */
export async function getTiposExistentes(fazendaId: string): Promise<TipoProgramacao[]> {
  const { data, error } = await supabase
    .from('programacao_tratos')
    .select('tipo')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)

  if (error || !data) return []
  return data.map((d) => d.tipo as TipoProgramacao)
}

/**
 * Salva a programação de tratos de um tipo específico.
 * Se já existe uma programação ativa para o tipo, atualiza; senão, cria nova.
 * Percentuais são reescritos (delete + insert) a cada salvamento.
 */
export async function saveProgramacaoTratos(
  fazendaId: string,
  tipo: TipoProgramacao,
  config: {
    quantidade_tratos: number
    percentuais: { ordem_trato: number; percentual: number; horario_sugerido: string | null }[]
  }
): Promise<{ success: boolean; error: string | null }> {
  // Busca programação existente do tipo
  const { data: existing } = await supabase
    .from('programacao_tratos')
    .select('id')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .eq('tipo', tipo)
    .maybeSingle()

  let programacaoId: string

  if (existing) {
    const { error: updateError } = await supabase
      .from('programacao_tratos')
      .update({
        quantidade_tratos: config.quantidade_tratos,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }
    programacaoId = existing.id

    // Limpa percentuais antigos
    await supabase.from('programacao_tratos_percentuais').delete().eq('programacao_id', programacaoId)
  } else {
    const { data: newProg, error: insertError } = await supabase
      .from('programacao_tratos')
      .insert({
        fazenda_id: fazendaId,
        tipo,
        quantidade_tratos: config.quantidade_tratos,
        ativo: true,
      })
      .select()
      .single()

    if (insertError) {
      return { success: false, error: insertError.message }
    }
    programacaoId = newProg.id
  }

  // Insere percentuais
  if (config.percentuais.length > 0) {
    const { error: percError } = await supabase
      .from('programacao_tratos_percentuais')
      .insert(
        config.percentuais.map((p) => ({
          programacao_id: programacaoId,
          ordem_trato: p.ordem_trato,
          percentual: p.percentual,
          horario_sugerido: p.horario_sugerido,
        }))
      )

    if (percError) {
      return { success: false, error: percError.message }
    }
  }

  return { success: true, error: null }
}
