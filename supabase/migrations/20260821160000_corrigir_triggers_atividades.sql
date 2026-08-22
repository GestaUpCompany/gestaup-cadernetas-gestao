-- Correção consolidada de 4 bugs críticos no sistema de atividades:
-- 1. Trigger antigo de cálculo de tempo conflita com o novo (sessões)
-- 2. Dois triggers de conclusão contraditórios ("basta um" vs "todos")
-- 3. Início automático seta em_andamento + inicio_at sem criar sessão
-- 4. (Bug 4 é correção de código no atividadesService.ts, não neste SQL)

-- ============================================================
-- BUG 1: Remover trigger antigo de cálculo de tempo
-- ============================================================
-- O trigger trg_calcular_tempo_gasto (BEFORE UPDATE) calcula
-- tempo_gasto_segundos = fim_at - inicio_at (tempo bruto).
-- O trigger trg_recalc_tempo_gasto_af (AFTER em atividade_sessoes)
-- recalcula como SUM(duracao_segundos WHERE trabalhada=true).
-- O trigger antigo sobrescreve o novo, gerando tempos inflados
-- (caso real: 64s real virou 64.7h porque contou 3 dias de fim_at-inicio_at).

DROP TRIGGER IF EXISTS trg_calcular_tempo_gasto ON atividade_funcionarios;
DROP FUNCTION IF EXISTS fn_calcular_tempo_gasto();

-- ============================================================
-- BUG 2: Resolver conflito de triggers de conclusão
-- ============================================================
-- Decisão de produto: atividade é concluída quando UM responsável conclui.
-- Manter: trg_concluir_atividade_on_funcionario (fn_concluir_atividade_on_funcionario)
-- Remover do fn_atividade_status_on_individual_change: lógica de "só conclui quando todos"
-- Manter do fn_atividade_status_on_individual_change: propagação pendente→em_andamento

CREATE OR REPLACE FUNCTION fn_atividade_status_on_individual_change()
RETURNS trigger AS $$
BEGIN
  -- Propagar: quando um funcionário inicia, atividade vai para em_andamento
  IF NEW.status_individual = 'em_andamento' AND OLD.status_individual = 'pendente' THEN
    UPDATE atividades SET status = 'em_andamento'
    WHERE id = NEW.atividade_id AND status = 'pendente';
  END IF;
  -- Conclusão da atividade é tratada por fn_concluir_atividade_on_funcionario ("basta um")
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- BUG 3: Remover início automático que seta em_andamento sem sessão
-- ============================================================
-- O trigger trg_inicio_automatico_af_on_insert marca funcionarios como
-- em_andamento com inicio_at=now() no INSERT, mas não cria sessão.
-- O PWA espera sessões no IndexedDB para o cronômetro; sem sessão,
-- o peão vê "Em Andamento" sem cronômetro e não consegue registrar tempo.
-- Correção: funcionarios ficam pendentes até o peão clicar "Iniciar" no PWA,
-- que cria a sessão aberta. A atividade pode estar em_andamento (cron/trigger
-- na tabela atividades), mas o status_individual do funcionário fica pendente.

DROP TRIGGER IF EXISTS trg_inicio_automatico_af_on_insert ON atividade_funcionarios;
DROP FUNCTION IF EXISTS fn_inicio_automatico_af_on_insert();

-- Reescrever o cron para NÃO propagar em_andamento para atividade_funcionarios.
-- Apenas a atividade pai vai para em_andamento; os funcionários ficam pendentes
-- até o peão iniciar manualmente no PWA (criando sessão).
CREATE OR REPLACE FUNCTION fn_atualizar_status_atividades_automatico()
RETURNS void AS $$
BEGIN
  -- inicio_automatico: ativar atividades pendentes cuja data_inicio chegou
  UPDATE atividades
  SET status = 'em_andamento', updated_at = now()
  WHERE inicio_automatico = true
    AND status = 'pendente'
    AND data_inicio <= CURRENT_DATE
    AND deleted_at IS NULL;

  -- atrasado: marcar atividades nao concluidas cujo prazo passou
  UPDATE atividades
  SET status = 'atrasado', updated_at = now()
  WHERE data_fim < CURRENT_DATE
    AND status NOT IN ('concluido', 'atrasado')
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- BACKFILL: Corrigir dados corrompidos
-- ============================================================

-- 1. Recalcular tempo_gasto_segundos de todos atividade_funcionarios
--    a partir das sessões trabalhadas (source of truth = atividade_sessoes).
--    Funcionários sem sessões ficam com tempo_gasto_segundos = 0.
UPDATE atividade_funcionarios af
SET tempo_gasto_segundos = COALESCE(
  (SELECT SUM(s.duracao_segundos)
   FROM atividade_sessoes s
   WHERE s.atividade_funcionario_id = af.id
     AND s.duracao_segundos IS NOT NULL
     AND s.trabalhada = true),
  0
)
WHERE af.status_individual IN ('concluida', 'pausada', 'em_andamento');

-- 2. Resetar funcionários em_andamento SEM sessões para pendente.
--    Esses foram marcados pelo trigger/cron de início automático sem sessão.
--    Resetando para pendente, o peão vê "Iniciar" no PWA e começa corretamente.
UPDATE atividade_funcionarios af
SET status_individual = 'pendente',
    inicio_at = NULL,
    updated_at = now()
WHERE af.status_individual = 'em_andamento'
  AND NOT EXISTS (
    SELECT 1 FROM atividade_sessoes s
    WHERE s.atividade_funcionario_id = af.id
  );

-- 3. Resetar funcionários pausados SEM sessões para pendente.
--    Mesma razão: foram iniciados pelo trigger/cron sem sessão.
UPDATE atividade_funcionarios af
SET status_individual = 'pendente',
    inicio_at = NULL,
    updated_at = now()
WHERE af.status_individual = 'pausada'
  AND NOT EXISTS (
    SELECT 1 FROM atividade_sessoes s
    WHERE s.atividade_funcionario_id = af.id
  );

-- 4. Limpar fim_at de concluídas sem sessões onde fim_at foi setado
--    pelo trigger antigo mas não corresponde a uma conclusão real do PWA.
--    Concluídas sem sessões e sem tempo real: manter status concluida
--    (o peão concluiu de alguma forma), mas zerar tempo_gasto_segundos
--    já feito no passo 1 (COALESCE para 0 quando sem sessões).
