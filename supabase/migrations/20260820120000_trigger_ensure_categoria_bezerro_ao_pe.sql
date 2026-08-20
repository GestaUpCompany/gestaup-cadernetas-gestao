-- ============================================================================
-- MIGRAÇÃO - Trigger: criar "Bezerro ao Pé"/"Bezerra ao Pé" automaticamente
-- quando chega um registros_maternidade para um lote que ainda não tem a categoria
-- ============================================================================
-- Antes desta trigger, partos registrados em registros_maternidade não criavam
-- a lote_categorias correspondente. O calculate_quant_atual nunca era chamado
-- para aquela categoria (a linha não existia), e os bezerros ficavam órfãos na
-- contagem do lote. Esta trigger cria a categoria faltante no INSERT do parto.
--
-- Padrão seguido: migration 20260813170000_fix_imutabilidade_quant_inicial.sql
--   - quant_inicial = 1 (o bezerro que nasceu e disparou a trigger)
--   - quant_atual = 1 (valor imediato para o usuário)
--   - created_at = NEW.data + 1s (cutoff cai DEPOIS do nascimento, para a função
--     calculate_quant_atual não contar este bezerro de novo no v_maternidade_count)
--   - data_pesagem = NEW.data::date (data do parto, não now())
--
-- peso_entrada_arrobas e peso_vivo_atual_arroba_cab ficam NULL porque rc_* são
-- NULL para bezerro ao pé (sem rendimento de carcaça). Fórmula do Lotes.tsx:
-- arrobas = kg * (rc/100) / 15; sem rc, não há arrobas.
-- ============================================================================

-- 1. Função da trigger (SECURITY DEFINER para bypassar RLS do PWA)
CREATE OR REPLACE FUNCTION public.fn_ensure_categoria_bezerro_ao_pe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_categoria_nome text;
  v_sexo_cat text;
  v_existe boolean;
  v_peso numeric;
BEGIN
  -- Só dispara em INSERT, com lote_id preenchido, não soft-deletado.
  -- Sexo é obrigatório no PWA, mas a guarda defensiva protege contra
  -- inserts diretos no banco que violem a regra.
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;
  IF NEW.lote_id IS NULL OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.sexo IS NULL THEN
    RETURN NEW;
  END IF;

  -- Mapear sexo do registro para nome da categoria e sexo da lote_categorias.
  -- registros_maternidade.sexo e lote_categorias.sexo usam 'Macho'/'Fêmea'
  -- (confirmado em calculate_quant_atual, migration 20260813170000).
  IF LOWER(TRIM(NEW.sexo)) IN ('macho', 'm') THEN
    v_categoria_nome := 'Bezerro ao Pé';
    v_sexo_cat := 'Macho';
  ELSIF LOWER(TRIM(NEW.sexo)) IN ('fêmea', 'femea', 'f') THEN
    v_categoria_nome := 'Bezerra ao Pé';
    v_sexo_cat := 'Fêmea';
  ELSE
    RETURN NEW;
  END IF;

  -- Verificar se já existe lote_categorias ATIVA com essa categoria para o lote.
  -- O partial unique index unique_lote_categoria_ativa (lote_id, categoria)
  -- WHERE ativo = true garante que só existe uma ativa por lote+categoria.
  SELECT EXISTS (
    SELECT 1 FROM public.lote_categorias
    WHERE lote_id = NEW.lote_id
      AND LOWER(categoria) = LOWER(v_categoria_nome)
      AND ativo = true
  ) INTO v_existe;

  IF v_existe THEN
    RETURN NEW;  -- categoria já existe, não faz nada
  END IF;

  -- Peso de entrada: usa peso_cria_kg do registro, ou default 30 kg da faixa
  v_peso := COALESCE(NEW.peso_cria_kg, 30);

  -- Criar a categoria. O EXCEPTION WHEN unique_violation trata a race condition
  -- de dois partos simultâneos no mesmo lote/sexo: ambas as triggers verificam
  -- "existe?", ambas veem "não", ambas tentam inserir; o partial unique index
  -- rejeita a segunda e a trigger engole silenciosamente.
  BEGIN
    INSERT INTO public.lote_categorias (
      lote_id, categoria, quant_inicial, quant_atual,
      data_pesagem, peso_entrada_kg_cab, peso_entrada_arrobas,
      peso_vivo_atual_kg_cab, peso_vivo_atual_arroba_cab,
      sexo, ativo, created_at,
      morte, consumo, abate, transf_entrada, transf_saida, qtd_bezerros,
      periodo, gmd, rc_inicial, rc_final, rc_atual,
      peso_vivo_meta_kg_cab, dias_restantes_meta,
      consumo_meta_porcentagem_pesovivo, peso_venda_meta_arroba,
      margem_lucro_percent, preco_custo_reais_arroba, preco_custo_cab,
      preco_venda_projetado_reais_arroba, preco_venda_sugerido_cab,
      producao_atual_arroba_cab, producao_projetada_arroba_cab,
      preco_entrada_reais_arroba, preco_entrada_reais_kg, preco_entrada_reais_cab,
      faturamento_projetado_reais_lote_categoria,
      venda_total_arroba_lote_categoria, agio_percent,
      custo_frete_reais_cab, custo_comissao_reais_cab,
      custo_sanidade_reais_cab, custo_identificacao_rastreabilidade_reais_cab,
      custo_total_entrada_reais_cab, custo_total_entrada_reais_lote,
      custo_operacional_reais_cab_dia, idade, raca,
      estrategia_nutricional, data_ajuste_peso
    ) VALUES (
      NEW.lote_id, v_categoria_nome, 1, 1,
      NEW.data::date, v_peso, NULL,
      v_peso, NULL,
      v_sexo_cat, true, NEW.data + interval '1 second',
      0, 0, 0, 0, 0, 0,
      0, 0, NULL, NULL, NULL,
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, NULL,
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, NULL,
      NULL,
      NULL, NULL,
      NULL, NULL,
      NULL, NULL,
      NULL, NULL,
      NULL, NULL, NEW.raca,
      NULL, NULL
    );
  EXCEPTION WHEN unique_violation THEN
    -- Concorrência: outra transação criou a categoria entre o SELECT EXISTS
    -- e o INSERT. Engole silenciosamente; a categoria já existe.
    NULL;
  END;

  RETURN NEW;
END;
$function$;

-- 2. Trigger AFTER INSERT em registros_maternidade
DROP TRIGGER IF EXISTS trg_ensure_categoria_bezerro_ao_pe
  ON public.registros_maternidade;
CREATE TRIGGER trg_ensure_categoria_bezerro_ao_pe
  AFTER INSERT ON public.registros_maternidade
  FOR EACH ROW EXECUTE FUNCTION public.fn_ensure_categoria_bezerro_ao_pe();
