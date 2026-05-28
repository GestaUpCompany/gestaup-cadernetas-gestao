


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."atualizar_estoque_entrada"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_insumo_id UUID;
  v_quantidade NUMERIC;
  v_valor_total NUMERIC;
  v_valor_unitario NUMERIC;
BEGIN
  -- Para cada item da entrada
  FOR v_insumo_id, v_quantidade, v_valor_unitario, v_valor_total IN 
    SELECT insumo_id, quantidade, valor_unitario, valor_total 
    FROM entrada_insumos_itens 
    WHERE entrada_id = NEW.id
  LOOP
    -- Criar movimentação de auditoria
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, custo_total, custo_unitario,
      registro_id, tabela_origem, fazenda_id, fornecedor, nota_fiscal,
      data_movimentacao, criado_por
    ) VALUES (
      'entrada', v_quantidade, v_valor_total, v_valor_unitario,
      NEW.id, 'registros_entrada_insumos', NEW.fazenda_id, NEW.fornecedor, NEW.nota_fiscal,
      NEW.data_entrada, NEW.nome_usuario
    );
    
    -- Atualizar estoque atual
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) + v_quantidade,
        custo_total_estoque = COALESCE(custo_total_estoque, 0) + COALESCE(v_valor_total, 0)
    WHERE id = v_insumo_id;
  END LOOP;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_estoque_entrada"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_estoque_entrada_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_insumo_id UUID;
  v_quantidade NUMERIC;
  v_valor_total NUMERIC;
BEGIN
  -- Estornar todos os itens da entrada
  FOR v_insumo_id, v_quantidade, v_valor_total IN 
    SELECT insumo_id, quantidade, valor_total 
    FROM entrada_insumos_itens 
    WHERE entrada_id = OLD.id
  LOOP
    -- Atualizar estoque atual (subtrair)
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) - v_quantidade,
        custo_total_estoque = COALESCE(custo_total_estoque, 0) - COALESCE(v_valor_total, 0)
    WHERE id = v_insumo_id;
    
    -- Criar movimentação de estorno
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, custo_total, registro_id, tabela_origem, 
      fazenda_id, data_movimentacao, criado_por, motivo
    ) VALUES (
      'saida', v_quantidade, v_valor_total, OLD.id, 'registros_entrada_insumos',
      OLD.fazenda_id, OLD.data_entrada, OLD.nome_usuario, 'Exclusão de entrada'
    );
  END LOOP;
  
  -- Excluir itens da entrada (ON DELETE CASCADE cuida disso, mas garantimos aqui)
  DELETE FROM entrada_insumos_itens WHERE entrada_id = OLD.id;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."atualizar_estoque_entrada_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_estoque_entrada_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_insumo_id UUID;
  v_quantidade NUMERIC;
  v_valor_total NUMERIC;
  v_valor_unitario NUMERIC;
BEGIN
  -- Se data_entrada ou outros campos principais mudaram
  IF (OLD.data_entrada IS DISTINCT FROM NEW.data_entrada) OR
     (OLD.fornecedor IS DISTINCT FROM NEW.fornecedor) OR
     (OLD.nota_fiscal IS DISTINCT FROM NEW.nota_fiscal) OR
     (OLD.nome_usuario IS DISTINCT FROM NEW.nome_usuario) THEN
    
    -- Atualizar movimentações existentes com novos dados do cabeçalho
    UPDATE movimentacao_estoque 
    SET fornecedor = NEW.fornecedor,
        nota_fiscal = NEW.nota_fiscal,
        data_movimentacao = NEW.data_entrada,
        criado_por = NEW.nome_usuario
    WHERE registro_id = NEW.id 
      AND tabela_origem = 'registros_entrada_insumos';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_estoque_entrada_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_estoque_item_entrada"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Criar movimentação de auditoria com insumo_id
  INSERT INTO movimentacao_estoque (
    tipo_movimentacao, quantidade, custo_total, custo_unitario,
    registro_id, tabela_origem, fazenda_id, fornecedor, nota_fiscal,
    data_movimentacao, criado_por, insumo_id
  ) 
  VALUES (
    'entrada', NEW.quantidade, NEW.valor_total, NEW.valor_unitario,
    NEW.entrada_id, 'registros_entrada_insumos', 
    (SELECT fazenda_id FROM registros_entrada_insumos WHERE id = NEW.entrada_id),
    (SELECT fornecedor FROM registros_entrada_insumos WHERE id = NEW.entrada_id),
    (SELECT nota_fiscal FROM registros_entrada_insumos WHERE id = NEW.entrada_id),
    (SELECT data_entrada FROM registros_entrada_insumos WHERE id = NEW.entrada_id),
    (SELECT nome_usuario FROM registros_entrada_insumos WHERE id = NEW.entrada_id),
    NEW.insumo_id
  );
  
  -- Atualizar estoque atual
  UPDATE insumos 
  SET estoque_atual = COALESCE(estoque_atual, 0) + NEW.quantidade
  WHERE id = NEW.insumo_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_estoque_item_entrada"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_estoque_saida"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_insumo_id UUID;
  v_quantidade NUMERIC;
BEGIN
  -- Para cada item da saída
  FOR v_insumo_id, v_quantidade IN 
    SELECT insumo_id, quantidade FROM saida_insumos_itens WHERE saida_id = NEW.id
  LOOP
    -- Criar movimentação de auditoria
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, registro_id, tabela_origem, 
      fazenda_id, data_movimentacao, criado_por
    ) VALUES (
      'saida', v_quantidade, NEW.id, 'registros_saida_insumos',
      NEW.fazenda_id, NEW.data_producao, NEW.nome_usuario
    );
    
    -- Atualizar estoque atual
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) - v_quantidade
    WHERE id = v_insumo_id;
  END LOOP;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_estoque_saida"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_estoque_saida_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_insumo_id UUID;
  v_quantidade NUMERIC;
BEGIN
  -- Estornar todos os movimentos
  FOR v_insumo_id, v_quantidade IN 
    SELECT insumo_id, quantidade FROM saida_insumos_itens WHERE saida_id = OLD.id
  LOOP
    -- Atualizar estoque atual (devolver ao estoque)
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) + v_quantidade
    WHERE id = v_insumo_id;
    
    -- Criar movimentação de estorno
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, registro_id, tabela_origem, 
      fazenda_id, data_movimentacao, criado_por, motivo
    ) VALUES (
      'entrada', v_quantidade, OLD.id, 'registros_saida_insumos',
      OLD.fazenda_id, OLD.data_producao, OLD.nome_usuario, 'Exclusão de saída'
    );
  END LOOP;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."atualizar_estoque_saida_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_estoque_saida_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_insumo_id UUID;
  v_quantidade NUMERIC;
BEGIN
  -- Se data ou outros campos mudaram, precisamos recalcular
  -- Para simplificar, estornamos todos os itens antigos e aplicamos os novos
  FOR v_insumo_id, v_quantidade IN 
    SELECT insumo_id, quantidade FROM saida_insumos_itens WHERE saida_id = OLD.id
  LOOP
    -- Estornar movimento antigo
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) + v_quantidade
    WHERE id = v_insumo_id;
    
    -- Criar movimentação de estorno
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, registro_id, tabela_origem, 
      fazenda_id, data_movimentacao, criado_por, motivo
    ) VALUES (
      'entrada', v_quantidade, OLD.id, 'registros_saida_insumos',
      OLD.fazenda_id, OLD.data_producao, OLD.nome_usuario, 'Correção de saída'
    );
  END LOOP;
  
  -- Aplicar novos movimentos
  FOR v_insumo_id, v_quantidade IN 
    SELECT insumo_id, quantidade FROM saida_insumos_itens WHERE saida_id = NEW.id
  LOOP
    -- Atualizar estoque atual
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) - v_quantidade
    WHERE id = v_insumo_id;
    
    -- Criar movimentação de correção
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, registro_id, tabela_origem, 
      fazenda_id, data_movimentacao, criado_por, motivo
    ) VALUES (
      'saida', v_quantidade, NEW.id, 'registros_saida_insumos',
      NEW.fazenda_id, NEW.data_producao, NEW.nome_usuario, 'Correção de saída'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_estoque_saida_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calcular_espacamento_cocho_ideal"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.espacamento_cocho_cm_cab IS NOT NULL THEN
    -- Ideal: 40 cm/cab, Tolerância: 5%
    -- Se a diferença percentual for <= 5%, então é ideal
    NEW.espacamento_cocho_ideal = ABS(NEW.espacamento_cocho_cm_cab - 40) / 40 <= 0.05;
  ELSE
    NEW.espacamento_cocho_ideal = NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calcular_espacamento_cocho_ideal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at_registros_morte"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at_registros_morte"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_dados_lotes"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  lote_record RECORD;
  days_diff INTEGER;
  new_peso_vivo NUMERIC;
  dias_para_meta INTEGER;
  dias_restantes INTEGER;
  periodo_liberacao INTEGER;
BEGIN
  FOR lote_record IN 
    SELECT id, peso_entrada, gmd, data_pesagem, data_meta, data_liberacao_sisbov
    FROM lotes
    WHERE peso_entrada IS NOT NULL 
      AND gmd IS NOT NULL 
      AND data_pesagem IS NOT NULL
  LOOP
    -- STEP 1: Calculate periodo first
    days_diff := (CURRENT_DATE - lote_record.data_pesagem)::INTEGER;
    
    -- STEP 2: Calculate peso_vivo_kg using fresh periodo
    new_peso_vivo := lote_record.peso_entrada + (lote_record.gmd * days_diff);
    
    -- STEP 3: Calculate dias_restantes_meta if data_meta is present
    IF lote_record.data_meta IS NOT NULL THEN
      dias_para_meta := (lote_record.data_meta - lote_record.data_pesagem)::INTEGER;
      dias_restantes := dias_para_meta - days_diff;
    ELSE
      dias_restantes := NULL;
    END IF;
    
    -- STEP 4: Calculate periodo_liberacao_sisbov if data_liberacao_sisbov is present
    IF lote_record.data_liberacao_sisbov IS NOT NULL THEN
      periodo_liberacao := (lote_record.data_liberacao_sisbov - CURRENT_DATE)::INTEGER;
    ELSE
      periodo_liberacao := NULL;
    END IF;
    
    -- STEP 5: Update all in same transaction
    UPDATE lotes
    SET periodo = days_diff,
        peso_vivo_kg = new_peso_vivo,
        dias_restantes_meta = dias_restantes,
        periodo_liberacao_sisbov = periodo_liberacao
    WHERE id = lote_record.id;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."update_dados_lotes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "acao" "text" NOT NULL,
    "tabela" "text",
    "registro_id" "uuid",
    "dados_antigos" "jsonb",
    "dados_novos" "jsonb",
    "ip" "text",
    "user_agent" "text",
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bebedouros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "capacidade" numeric,
    "data_ultima_limpeza" "date",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "meta_intervalo_limpeza" integer
);


ALTER TABLE "public"."bebedouros" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categorias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categorias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."causas_morte" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."causas_morte" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conflitos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "tabela" "text" NOT NULL,
    "registro_id" "uuid" NOT NULL,
    "versao_local" integer,
    "versao_remota" integer,
    "dados_local" "jsonb",
    "dados_remoto" "jsonb",
    "resolvido_por" "text",
    "resolvido_em" timestamp with time zone,
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conflitos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dietas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "tipo" "text",
    "insumos" "jsonb",
    "custo_total" numeric,
    "custo_diario_animal" numeric,
    "consumo_diario_kg" numeric,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dietas" OWNER TO "postgres";


COMMENT ON TABLE "public"."dietas" IS 'Tabela de dietas personalizadas/combinações de insumos';



COMMENT ON COLUMN "public"."dietas"."insumos" IS 'Lista de insumos com quantidades em JSON';



COMMENT ON COLUMN "public"."dietas"."custo_total" IS 'Custo total da dieta';



COMMENT ON COLUMN "public"."dietas"."custo_diario_animal" IS 'Custo por animal por dia';



COMMENT ON COLUMN "public"."dietas"."consumo_diario_kg" IS 'Consumo diário em kg por animal';



CREATE TABLE IF NOT EXISTS "public"."dispositivos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "device_id" "text" NOT NULL,
    "nome" "text",
    "modelo" "text",
    "plataforma" "text",
    "ultimo_acesso" timestamp with time zone DEFAULT "now"(),
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dispositivos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entrada_insumos_itens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrada_id" "uuid" NOT NULL,
    "insumo_id" "uuid" NOT NULL,
    "quantidade" numeric NOT NULL,
    "valor_unitario" numeric,
    "valor_total" numeric,
    "produto" "text"
);


ALTER TABLE "public"."entrada_insumos_itens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fazendas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "acesso_id" "text" NOT NULL,
    "nome" "text" NOT NULL,
    "cnpj" "text",
    "endereco" "text",
    "telefone" "text",
    "email" "text",
    "logo_url" "text",
    "planilha_id" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fazendas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fornecedores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "razao_social" "text",
    "cnpj" "text",
    "telefone" "text",
    "email" "text",
    "endereco" "text",
    "cidade" "text",
    "estado" "text",
    "cep" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fornecedores" OWNER TO "postgres";


COMMENT ON TABLE "public"."fornecedores" IS 'Tabela de fornecedores de insumos e produtos';



COMMENT ON COLUMN "public"."fornecedores"."razao_social" IS 'Razão social jurídica';



COMMENT ON COLUMN "public"."fornecedores"."cnpj" IS 'CNPJ do fornecedor';



CREATE TABLE IF NOT EXISTS "public"."frigorificos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "razao_social" "text",
    "cnpj" "text",
    "telefone" "text",
    "email" "text",
    "endereco" "text",
    "cidade" "text",
    "estado" "text",
    "cep" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."frigorificos" OWNER TO "postgres";


COMMENT ON TABLE "public"."frigorificos" IS 'Tabela de frigoríficos para abate e venda de gado';



COMMENT ON COLUMN "public"."frigorificos"."razao_social" IS 'Razão social jurídica';



COMMENT ON COLUMN "public"."frigorificos"."cnpj" IS 'CNPJ do frigorífico';



CREATE TABLE IF NOT EXISTS "public"."funcionarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "cpf" "text",
    "telefone" "text",
    "cargo" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."funcionarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historico_limpezas_bebedouros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "bebedouro_id" "uuid" NOT NULL,
    "data_limpeza" "date" NOT NULL,
    "responsavel" "text",
    "observacao" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."historico_limpezas_bebedouros" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."insumos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "tipo" "text",
    "estoque_atual" numeric(10,2),
    "unidade" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "marca" "text",
    "fabricante" "text",
    "custo_unitario" numeric,
    "fornecedor" "text",
    "custo_total_estoque" numeric GENERATED ALWAYS AS (("estoque_atual" * "custo_unitario")) STORED
);


ALTER TABLE "public"."insumos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."insumos"."marca" IS 'Marca do produto';



COMMENT ON COLUMN "public"."insumos"."fabricante" IS 'Fabricante do produto';



COMMENT ON COLUMN "public"."insumos"."custo_unitario" IS 'Custo unitário por kg/unidade';



COMMENT ON COLUMN "public"."insumos"."fornecedor" IS 'Fornecedor do produto';



COMMENT ON COLUMN "public"."insumos"."custo_total_estoque" IS 'Custo total do estoque atual (calculado automaticamente)';



CREATE TABLE IF NOT EXISTS "public"."lote_pasto_historico" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lote_id" "uuid",
    "pasto_id" "uuid",
    "data_inicial" "date" DEFAULT CURRENT_DATE NOT NULL,
    "data_final" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lote_pasto_historico" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "n_cabecas" integer,
    "categorias" "text",
    "qtd_bezerros" integer,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "numero_cabecas" integer,
    "quantidade_bezerros" integer,
    "pasto_id" "uuid",
    "raca" "text",
    "sexo" "text",
    "idade_meses" integer,
    "rc_inicial" numeric,
    "preco_kg" numeric,
    "preco_cab" numeric,
    "custo_operacional" numeric,
    "estrategia_nutricional" "text",
    "produtor_rural" "text",
    "propriedade_origem" "text",
    "numero_contrato" "text",
    "mes_competencia" "text",
    "data_liberacao_sisbov" "date",
    "periodo_liberacao_sisbov" "text",
    "data_embarque_previsto" "date",
    "quant_inicial" integer,
    "peso_entrada_kg" numeric,
    "gmd" numeric(10,3),
    "data_pesagem" "date",
    "data_meta" "date",
    "peso_vivo_meta_kg" numeric,
    "peso_vivo_kg" numeric,
    "peso_entrada" numeric,
    "periodo" integer,
    "sistema_producao" "text",
    "preco_animal_kg" numeric,
    "preco_animal_cab" numeric,
    "idade" integer,
    "dias_restantes_meta" integer,
    "data_embarque_prevista" "date"
);


ALTER TABLE "public"."lotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medicamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "nome_comercial" "text" NOT NULL,
    "dose_recomendada" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "principio_ativo" "text" NOT NULL
);


ALTER TABLE "public"."medicamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mineral" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "marca" "text",
    "fabricante" "text",
    "tipo" "text",
    "composicao" "jsonb",
    "unidade_medida" "text",
    "peso_saco" numeric,
    "estoque_atual" numeric DEFAULT 0,
    "estoque_minimo" numeric DEFAULT 0,
    "custo_unitario" numeric,
    "custo_saco" numeric,
    "custo_total_estoque" numeric GENERATED ALWAYS AS (("estoque_atual" * "custo_unitario")) STORED,
    "fornecedor" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mineral" OWNER TO "postgres";


COMMENT ON TABLE "public"."mineral" IS 'Tabela de produtos minerais para suplementação';



COMMENT ON COLUMN "public"."mineral"."composicao" IS 'Composição nutricional em JSON (ex: { "calcio": 15, "fosforo": 8 })';



COMMENT ON COLUMN "public"."mineral"."custo_total_estoque" IS 'Custo total do estoque atual (calculado automaticamente)';



CREATE TABLE IF NOT EXISTS "public"."movimentacao_estoque" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "tabela_origem" "text" NOT NULL,
    "registro_id" "uuid" NOT NULL,
    "tipo_movimentacao" "text" NOT NULL,
    "quantidade" numeric NOT NULL,
    "custo_unitario" numeric,
    "custo_total" numeric,
    "motivo" "text",
    "nota_fiscal" "text",
    "fornecedor" "text",
    "data_movimentacao" "date" DEFAULT CURRENT_DATE NOT NULL,
    "criado_por" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "insumo_id" "uuid"
);


ALTER TABLE "public"."movimentacao_estoque" OWNER TO "postgres";


COMMENT ON TABLE "public"."movimentacao_estoque" IS 'Tabela única para rastrear movimentações de estoque de todos os produtos';



COMMENT ON COLUMN "public"."movimentacao_estoque"."tabela_origem" IS 'Nome da tabela de origem (insumos, mineral, proteinado, racao)';



COMMENT ON COLUMN "public"."movimentacao_estoque"."registro_id" IS 'ID do produto na tabela de origem';



COMMENT ON COLUMN "public"."movimentacao_estoque"."tipo_movimentacao" IS 'Tipo: entrada, saida, ajuste';



COMMENT ON COLUMN "public"."movimentacao_estoque"."quantidade" IS 'Quantidade movimentada';



COMMENT ON COLUMN "public"."movimentacao_estoque"."custo_total" IS 'Custo total da movimentação (quantidade * custo_unitario)';



CREATE TABLE IF NOT EXISTS "public"."notificacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "titulo" "text" NOT NULL,
    "mensagem" "text" NOT NULL,
    "lida" boolean DEFAULT false,
    "acao_url" "text",
    "acao_label" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    CONSTRAINT "notificacoes_tipo_check" CHECK (("tipo" = ANY (ARRAY['info'::"text", 'warning'::"text", 'error'::"text", 'success'::"text"])))
);


ALTER TABLE "public"."notificacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pastos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "area_util_ha" numeric(10,2),
    "especie" "text",
    "altura_entrada_cm" numeric(5,2),
    "altura_saida_cm" numeric(5,2),
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "metragem_cocho_m" numeric,
    "nivel_degradacao" integer,
    "area_util_porcentagem" numeric,
    "setor" "text",
    "tipo" "text"
);


ALTER TABLE "public"."pastos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."peoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "password" "text" NOT NULL,
    "fazenda_id" "text" NOT NULL,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."peoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pluviometros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "localizacao" "text" NOT NULL,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pluviometros" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proteinado" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "marca" "text",
    "fabricante" "text",
    "tipo" "text",
    "teor_proteico" numeric,
    "composicao" "jsonb",
    "unidade_medida" "text",
    "peso_saco" numeric,
    "estoque_atual" numeric DEFAULT 0,
    "estoque_minimo" numeric DEFAULT 0,
    "custo_unitario" numeric,
    "custo_saco" numeric,
    "custo_total_estoque" numeric GENERATED ALWAYS AS (("estoque_atual" * "custo_unitario")) STORED,
    "fornecedor" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."proteinado" OWNER TO "postgres";


COMMENT ON TABLE "public"."proteinado" IS 'Tabela de produtos proteinados para suplementação';



COMMENT ON COLUMN "public"."proteinado"."teor_proteico" IS 'Percentual de proteína bruta';



COMMENT ON COLUMN "public"."proteinado"."composicao" IS 'Composição nutricional em JSON';



COMMENT ON COLUMN "public"."proteinado"."custo_total_estoque" IS 'Custo total do estoque atual (calculado automaticamente)';



CREATE TABLE IF NOT EXISTS "public"."racao" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "marca" "text",
    "fabricante" "text",
    "tipo" "text",
    "composicao" "jsonb",
    "unidade_medida" "text",
    "peso_saco" numeric,
    "estoque_atual" numeric DEFAULT 0,
    "estoque_minimo" numeric DEFAULT 0,
    "custo_unitario" numeric,
    "custo_saco" numeric,
    "custo_total_estoque" numeric GENERATED ALWAYS AS (("estoque_atual" * "custo_unitario")) STORED,
    "fornecedor" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."racao" OWNER TO "postgres";


COMMENT ON TABLE "public"."racao" IS 'Tabela de rações comerciais';



COMMENT ON COLUMN "public"."racao"."composicao" IS 'Composição nutricional em JSON';



COMMENT ON COLUMN "public"."racao"."custo_total_estoque" IS 'Custo total do estoque atual (calculado automaticamente)';



CREATE TABLE IF NOT EXISTS "public"."registros_abastecimento" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "data" "date" NOT NULL,
    "quem_abasteceu" "text" NOT NULL,
    "operador_motorista" "text" NOT NULL,
    "veiculo_trator" "text" NOT NULL,
    "placa" "text" NOT NULL,
    "hidrometro_inicial" numeric NOT NULL,
    "hidrometro_final" numeric NOT NULL,
    "total_abastecido" numeric NOT NULL,
    "combustivel" "text" NOT NULL,
    "odometro" "text" NOT NULL,
    "tipo_operacao" "text" NOT NULL,
    "observacao" "text",
    "sync_status" "text" DEFAULT 'synced'::"text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "nome_usuario" "text",
    "tipo_operacao_outros" "text"
);


ALTER TABLE "public"."registros_abastecimento" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_almoxarifado" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "text" NOT NULL,
    "dispositivo_id" "text",
    "nome_usuario" "text",
    "data" timestamp without time zone NOT NULL,
    "quem_entregou" "text",
    "quem_pegou" "text",
    "setor" "text",
    "observacao" "text",
    "sync_status" "text" DEFAULT 'synced'::"text",
    "version" integer DEFAULT 1,
    "google_row_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "itens" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."registros_almoxarifado" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_bebedouros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "nome_usuario" "text",
    "data" "date" NOT NULL,
    "responsavel" "text",
    "pasto" "text",
    "lote" "text",
    "gado" "text",
    "leitura_bebedouro" integer,
    "numero_bebedouro" "text",
    "observacao" "text",
    "sync_status" "text" DEFAULT 'synced'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "agua_suficiente" boolean,
    "agua_suficiente_obs" "text",
    "vazao_bebedouro_ideal" boolean,
    "vazao_bebedouro_ideal_obs" "text",
    "aterro_acesso_bebedouro_ideal" boolean,
    "aterro_acesso_bebedouro_ideal_obs" "text",
    "espacamento_bebedouro_ideal" boolean,
    "espacamento_bebedouro_ideal_obs" "text",
    "boia_protecao_boas_condicoes" boolean,
    "boia_protecao_boas_condicoes_obs" "text",
    CONSTRAINT "registros_bebedouros_leitura_bebedouro_check" CHECK ((("leitura_bebedouro" >= 1) AND ("leitura_bebedouro" <= 3)))
);


ALTER TABLE "public"."registros_bebedouros" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_cantina" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "text",
    "dispositivo_id" "text",
    "data" "text" NOT NULL,
    "numero_cozinheiras" integer,
    "quem_cozinhou" "text",
    "quem_ajudou" "text",
    "numero_cafe_manha" integer,
    "numero_lanches" integer,
    "numero_refeicoes_almoco" integer,
    "numero_refeicoes_jantar" integer,
    "itens" "jsonb",
    "observacao" "text",
    "nome_usuario" "text",
    "sync_status" "text" DEFAULT 'pending'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "nome_outros" "text",
    "quantidade_outros" "text",
    "unidade_outros" "text"
);


ALTER TABLE "public"."registros_cantina" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_clima" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "nome_usuario" "text",
    "data" "date" NOT NULL,
    "responsavel" "text" NOT NULL,
    "temperatura_media" numeric,
    "observacao" "text",
    "medicoes" "jsonb" DEFAULT '[]'::"jsonb",
    "sync_status" "text" DEFAULT 'synced'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."registros_clima" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_enfermaria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "nome_usuario" "text",
    "data" "date" NOT NULL,
    "pasto" "text",
    "lote" "text",
    "categoria" "text",
    "tratamento" "text",
    "tratamento_outros" "text",
    "sync_status" "text" DEFAULT 'synced'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "tratamento_obs" "text",
    "brinco" "text",
    "chip" "text",
    "diagnosticos" "jsonb" DEFAULT '{}'::"jsonb",
    "sexo" "text",
    "raca" "text",
    "idade" "text",
    "medicamentos" "jsonb"
);


ALTER TABLE "public"."registros_enfermaria" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_entrada_insumos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "nome_usuario" "text",
    "data_entrada" "date" NOT NULL,
    "horario" "text",
    "produto" "text",
    "quantidade" numeric(10,2),
    "valor_unitario" numeric(10,2),
    "valor_total" numeric(10,2),
    "nota_fiscal" "text",
    "fornecedor" "text",
    "placa" "text",
    "motorista" "text",
    "responsavel_recebimento" "text",
    "sync_status" "text" DEFAULT 'synced'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "insumo_id" "uuid"
);


ALTER TABLE "public"."registros_entrada_insumos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_limpeza" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "data" "date" NOT NULL,
    "numero_equipe" integer,
    "setor" "text",
    "local" "text",
    "hora_inicio" "text",
    "hora_final" "text",
    "limpeza_realizada" "jsonb" DEFAULT '[]'::"jsonb",
    "observacao" "text",
    "nome_usuario" "text",
    "sync_status" "text" DEFAULT 'pending'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."registros_limpeza" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_manutencao_maquinas" (
    "id" bigint NOT NULL,
    "fazenda_id" "text" NOT NULL,
    "dispositivo_id" "text",
    "nome_usuario" "text",
    "sync_status" "text" DEFAULT 'synced'::"text",
    "version" integer DEFAULT 1,
    "data" "text" NOT NULL,
    "responsavel_checklist" "text",
    "operador_motorista" "text",
    "veiculo_trator" "text",
    "placa" "text",
    "odometro" "text",
    "observacao" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "checklist" "jsonb"
);


ALTER TABLE "public"."registros_manutencao_maquinas" OWNER TO "postgres";


ALTER TABLE "public"."registros_manutencao_maquinas" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."registros_manutencao_maquinas_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."registros_maternidade" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "nome_usuario" "text",
    "data" "date" NOT NULL,
    "pasto" "text",
    "lote" "text",
    "peso_cria_kg" numeric(10,2),
    "id_provisorio_cria" "text",
    "tratamento" "text",
    "tipo_parto" "text",
    "sexo" "text",
    "raca" "text",
    "categoria_mae" "text",
    "sync_status" "text" DEFAULT 'synced'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "escore_matriz" "text",
    "id_chip_mae" "text",
    "id_brinco_cria" "text",
    "id_chip_cria" "text",
    "id_brinco_mae" "text"
);


ALTER TABLE "public"."registros_maternidade" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_morte" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "nome_usuario" "text",
    "data" "date" NOT NULL,
    "pasto" "text",
    "lote" "text",
    "sexo" "text",
    "raca" "text",
    "idade" "text",
    "peso_vivo" integer,
    "causa_morte" "text",
    "sync_status" "text" DEFAULT 'synced'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "brinco" "text",
    "chip" "text",
    "categoria" "text",
    "categoria_outros" "text",
    "diagnosticos" "jsonb" DEFAULT '{}'::"jsonb",
    "escore" numeric,
    "nutricao_atual" "text",
    "nutricao_anterior" "text"
);


ALTER TABLE "public"."registros_morte" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_movimentacao" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "nome_usuario" "text",
    "data" "date" NOT NULL,
    "lote_origem" "text",
    "destino" "text",
    "numero_cabecas" integer,
    "peso_medio_kg" numeric(10,2),
    "motivo_movimentacao" "text",
    "causa_observacao" "text",
    "sync_status" "text" DEFAULT 'synced'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "tipo_saida" "text",
    "tipo_entrada" "text",
    "brinco" "text",
    "chip" "text",
    "tipo_destino" "text",
    "categoria" "text"
);


ALTER TABLE "public"."registros_movimentacao" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_operacoes_maquinas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "data" "date" NOT NULL,
    "veiculo_trator" "text" NOT NULL,
    "implemento_utilizado" "text" NOT NULL,
    "hora_inicial" "text",
    "hora_final" "text",
    "odometro_inicial" "text" NOT NULL,
    "odometro_final" "text" NOT NULL,
    "total_odometro" "text",
    "tipo_operacao" "text" NOT NULL,
    "produto_aplicado" "text",
    "quantidade_total_aplicada" "text",
    "area_trabalhada" "text",
    "dose_aplicada" "text",
    "meta_diaria_batida" "text",
    "meta_diaria_batida_obs" "text",
    "algum_imprevisto" "text",
    "algum_imprevisto_obs" "text",
    "observacao" "text",
    "sync_status" "text" DEFAULT 'synced'::"text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "nome_usuario" "text"
);


ALTER TABLE "public"."registros_operacoes_maquinas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_pastagens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "nome_usuario" "text",
    "data" "date" NOT NULL,
    "manejador" "text",
    "lote" "text",
    "pasto_saida" "text",
    "avaliacao_saida" integer,
    "pasto_entrada" "text",
    "avaliacao_entrada" integer,
    "vaca" integer DEFAULT 0,
    "touro" integer DEFAULT 0,
    "bezerro" integer DEFAULT 0,
    "boi_magro" integer DEFAULT 0,
    "garrote" integer DEFAULT 0,
    "novilha" integer DEFAULT 0,
    "sync_status" "text" DEFAULT 'synced'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "escore_gado" numeric,
    "pasto_saida_area_util" "text",
    "pasto_saida_especie" "text",
    "pasto_entrada_area_util" "text",
    "pasto_entrada_especie" "text",
    "total_animais" integer DEFAULT 0,
    "gado_contado" "text",
    CONSTRAINT "registros_pastagens_avaliacao_entrada_check" CHECK ((("avaliacao_entrada" >= 1) AND ("avaliacao_entrada" <= 5))),
    CONSTRAINT "registros_pastagens_avaliacao_saida_check" CHECK ((("avaliacao_saida" >= 1) AND ("avaliacao_saida" <= 5)))
);


ALTER TABLE "public"."registros_pastagens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_problemas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "nome_usuario" "text",
    "data" "date" NOT NULL,
    "setor" "text",
    "local" "text",
    "descricao_problema" "text",
    "causa_identificada" boolean DEFAULT false,
    "causa_identificada_obs" "text",
    "acao_corretiva_realizada" boolean DEFAULT false,
    "acao_corretiva_realizada_obs" "text",
    "tipo_ocorrencia" "text",
    "tipo_ocorrencia_obs" "text",
    "causa_raiz_identificada" boolean DEFAULT false,
    "causa_raiz_identificada_obs" "text",
    "gravidade_impacto" "text",
    "gravidade_impacto_obs" "text",
    "tipo_problema" "text",
    "tipo_problema_obs" "text",
    "prioridade" "text",
    "sync_status" "text" DEFAULT 'synced'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."registros_problemas" OWNER TO "postgres";


COMMENT ON TABLE "public"."registros_problemas" IS 'Registros de problemas reportados na fazenda';



COMMENT ON COLUMN "public"."registros_problemas"."setor" IS 'Setor onde ocorreu o problema (Gado, Máquinas, ADM, Fábrica, Manutenção, Terceirizado)';



COMMENT ON COLUMN "public"."registros_problemas"."causa_identificada" IS 'Indica se a causa do problema foi identificada';



COMMENT ON COLUMN "public"."registros_problemas"."acao_corretiva_realizada" IS 'Indica se ação corretiva foi realizada';



COMMENT ON COLUMN "public"."registros_problemas"."tipo_ocorrencia" IS 'Tipo de ocorrência (Única ou Repetitiva)';



COMMENT ON COLUMN "public"."registros_problemas"."causa_raiz_identificada" IS 'Indica se a causa raiz foi identificada';



COMMENT ON COLUMN "public"."registros_problemas"."gravidade_impacto" IS 'Gravidade ou impacto do problema (baixa, média, alta)';



COMMENT ON COLUMN "public"."registros_problemas"."tipo_problema" IS 'Tipo de problema (Estrutural, Máquinas, Processos, Rebanho)';



COMMENT ON COLUMN "public"."registros_problemas"."prioridade" IS 'Prioridade do problema (baixa, média, alta)';



CREATE TABLE IF NOT EXISTS "public"."registros_rodeio" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "nome_usuario" "text",
    "data" "date" NOT NULL,
    "pasto" "text",
    "lote" "text",
    "vaca" integer DEFAULT 0,
    "touro" integer DEFAULT 0,
    "bezerro" integer DEFAULT 0,
    "boi" integer DEFAULT 0,
    "garrote" integer DEFAULT 0,
    "novilha" integer DEFAULT 0,
    "total_cabecas" integer DEFAULT 0,
    "escore_fezes" integer,
    "equipe" integer,
    "sync_status" "text" DEFAULT 'synced'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "escore_gado" numeric,
    "diagnosticos" "jsonb",
    CONSTRAINT "registros_rodeio_escore_fezes_check" CHECK ((("escore_fezes" >= 1) AND ("escore_fezes" <= 5)))
);


ALTER TABLE "public"."registros_rodeio" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_saida_insumos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "nome_usuario" "text",
    "data_producao" "date" NOT NULL,
    "dieta_produzida" "text",
    "destino_producao" "text",
    "total_produzido" numeric(10,2),
    "insumos_quantidades" "jsonb",
    "sync_status" "text" DEFAULT 'synced'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "insumo_id" "uuid"
);


ALTER TABLE "public"."registros_saida_insumos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_suplementacao" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "nome_usuario" "text",
    "data" "date" NOT NULL,
    "tratador" "text",
    "pasto" "text",
    "lote" "text",
    "produto" "text",
    "categorias" "text",
    "leitura" integer,
    "sacos" integer DEFAULT 0,
    "kg_cocho" numeric(10,2) DEFAULT 0,
    "kg_deposito" numeric(10,2) DEFAULT 0,
    "sync_status" "text" DEFAULT 'synced'::"text",
    "version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "escore_fezes" numeric,
    "limpeza_cocho" boolean,
    "limpeza_cocho_obs" "text",
    "cochos_condicoes" boolean,
    "cochos_condicoes_obs" "text",
    "aterro_acesso_ideal" boolean,
    "aterro_acesso_ideal_obs" "text",
    "espacamento_cocho_ideal" boolean,
    "espacamento_cocho_ideal_obs" "text",
    "deposito_condicoes" boolean,
    "deposito_condicoes_obs" "text",
    "estoque_deposito" boolean,
    "estoque_deposito_obs" "text",
    "espacamento_cocho_cm_cab" numeric,
    "espacamento_cocho_obs" "text",
    CONSTRAINT "registros_suplementacao_leitura_check" CHECK ((("leitura" >= '-1'::integer) AND ("leitura" <= 3)))
);


ALTER TABLE "public"."registros_suplementacao" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saida_insumos_itens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "saida_id" "uuid" NOT NULL,
    "insumo_id" "uuid" NOT NULL,
    "quantidade" numeric NOT NULL
);


ALTER TABLE "public"."saida_insumos_itens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_filters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "fazenda_id" "uuid",
    "tela" character varying(100) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "filtros" "jsonb" NOT NULL,
    "is_preset" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."saved_filters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "dispositivo_id" "uuid",
    "tabela" "text" NOT NULL,
    "registro_id" "uuid" NOT NULL,
    "operacao" "text" NOT NULL,
    "prioridade" "text" DEFAULT 'normal'::"text",
    "retry_count" integer DEFAULT 0,
    "erro" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processado_at" timestamp with time zone
);


ALTER TABLE "public"."sync_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuario_fazenda" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "fazenda_id" "uuid" NOT NULL,
    "papel" "text" NOT NULL,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."usuario_fazenda" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "nome" "text" NOT NULL,
    "telefone" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "papel" "text" DEFAULT 'controller'::"text",
    "auth_id" "uuid",
    CONSTRAINT "usuarios_papel_check" CHECK (("papel" = ANY (ARRAY['admin'::"text", 'controller'::"text"])))
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bebedouros"
    ADD CONSTRAINT "bebedouros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categorias"
    ADD CONSTRAINT "categorias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."causas_morte"
    ADD CONSTRAINT "causas_morte_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conflitos"
    ADD CONSTRAINT "conflictos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dietas"
    ADD CONSTRAINT "dietas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dispositivos"
    ADD CONSTRAINT "dispositivos_device_id_key" UNIQUE ("device_id");



ALTER TABLE ONLY "public"."dispositivos"
    ADD CONSTRAINT "dispositivos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entrada_insumos_itens"
    ADD CONSTRAINT "entrada_insumos_itens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fazendas"
    ADD CONSTRAINT "fazendas_acesso_id_key" UNIQUE ("acesso_id");



ALTER TABLE ONLY "public"."fazendas"
    ADD CONSTRAINT "fazendas_cnpj_key" UNIQUE ("cnpj");



ALTER TABLE ONLY "public"."fazendas"
    ADD CONSTRAINT "fazendas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fornecedores"
    ADD CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."frigorificos"
    ADD CONSTRAINT "frigorificos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funcionarios"
    ADD CONSTRAINT "funcionarios_cpf_key" UNIQUE ("cpf");



ALTER TABLE ONLY "public"."funcionarios"
    ADD CONSTRAINT "funcionarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historico_limpezas_bebedouros"
    ADD CONSTRAINT "historico_limpezas_bebedouros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."insumos"
    ADD CONSTRAINT "insumos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lote_pasto_historico"
    ADD CONSTRAINT "lote_pasto_historico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lotes"
    ADD CONSTRAINT "lotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medicamentos"
    ADD CONSTRAINT "medicamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mineral"
    ADD CONSTRAINT "mineral_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."movimentacao_estoque"
    ADD CONSTRAINT "movimentacao_estoque_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notificacoes"
    ADD CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pastos"
    ADD CONSTRAINT "pastos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."peoes"
    ADD CONSTRAINT "peoes_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."peoes"
    ADD CONSTRAINT "peoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pluviometros"
    ADD CONSTRAINT "pluviometros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proteinado"
    ADD CONSTRAINT "proteinado_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."racao"
    ADD CONSTRAINT "racao_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_abastecimento"
    ADD CONSTRAINT "registros_abastecimento_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_almoxarifado"
    ADD CONSTRAINT "registros_almoxarifado_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_bebedouros"
    ADD CONSTRAINT "registros_bebedouros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_cantina"
    ADD CONSTRAINT "registros_cantina_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_clima"
    ADD CONSTRAINT "registros_clima_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_enfermaria"
    ADD CONSTRAINT "registros_enfermaria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_entrada_insumos"
    ADD CONSTRAINT "registros_entrada_insumos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_limpeza"
    ADD CONSTRAINT "registros_limpeza_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_manutencao_maquinas"
    ADD CONSTRAINT "registros_manutencao_maquinas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_maternidade"
    ADD CONSTRAINT "registros_maternidade_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_morte"
    ADD CONSTRAINT "registros_morte_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_movimentacao"
    ADD CONSTRAINT "registros_movimentacao_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_operacoes_maquinas"
    ADD CONSTRAINT "registros_operacoes_maquinas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_pastagens"
    ADD CONSTRAINT "registros_pastagens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_problemas"
    ADD CONSTRAINT "registros_problemas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_rodeio"
    ADD CONSTRAINT "registros_rodeio_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_saida_insumos"
    ADD CONSTRAINT "registros_saida_insumos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_suplementacao"
    ADD CONSTRAINT "registros_suplementacao_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saida_insumos_itens"
    ADD CONSTRAINT "saida_insumos_itens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_filters"
    ADD CONSTRAINT "saved_filters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_queue"
    ADD CONSTRAINT "sync_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuario_fazenda"
    ADD CONSTRAINT "usuario_fazenda_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuario_fazenda"
    ADD CONSTRAINT "usuario_fazenda_usuario_id_fazenda_id_key" UNIQUE ("usuario_id", "fazenda_id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_almoxarifado_data" ON "public"."registros_almoxarifado" USING "btree" ("data");



CREATE INDEX "idx_almoxarifado_fazenda" ON "public"."registros_almoxarifado" USING "btree" ("fazenda_id");



CREATE INDEX "idx_almoxarifado_sync_status" ON "public"."registros_almoxarifado" USING "btree" ("sync_status");



CREATE INDEX "idx_audit_log_acao" ON "public"."audit_log" USING "btree" ("acao");



CREATE INDEX "idx_audit_log_criado_em" ON "public"."audit_log" USING "btree" ("criado_em");



CREATE INDEX "idx_audit_log_dispositivo" ON "public"."audit_log" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_audit_log_fazenda" ON "public"."audit_log" USING "btree" ("fazenda_id");



CREATE INDEX "idx_bebedouros_ativo" ON "public"."bebedouros" USING "btree" ("ativo");



CREATE INDEX "idx_bebedouros_data" ON "public"."registros_bebedouros" USING "btree" ("data");



CREATE INDEX "idx_bebedouros_deleted" ON "public"."registros_bebedouros" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_bebedouros_dispositivo" ON "public"."registros_bebedouros" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_bebedouros_fazenda" ON "public"."registros_bebedouros" USING "btree" ("fazenda_id");



CREATE INDEX "idx_bebedouros_fazenda_id" ON "public"."bebedouros" USING "btree" ("fazenda_id");



CREATE INDEX "idx_bebedouros_nome" ON "public"."bebedouros" USING "btree" ("nome");



CREATE INDEX "idx_bebedouros_sync" ON "public"."registros_bebedouros" USING "btree" ("sync_status");



CREATE INDEX "idx_categorias_ativo" ON "public"."categorias" USING "btree" ("ativo");



CREATE INDEX "idx_categorias_fazenda" ON "public"."categorias" USING "btree" ("fazenda_id");



CREATE INDEX "idx_categorias_nome" ON "public"."categorias" USING "btree" ("nome");



CREATE INDEX "idx_causas_morte_ativo" ON "public"."causas_morte" USING "btree" ("ativo");



CREATE INDEX "idx_causas_morte_fazenda_id" ON "public"."causas_morte" USING "btree" ("fazenda_id");



CREATE INDEX "idx_conflictos_fazenda" ON "public"."conflitos" USING "btree" ("fazenda_id");



CREATE INDEX "idx_conflictos_resolvido" ON "public"."conflitos" USING "btree" ("resolvido_por") WHERE ("resolvido_por" IS NULL);



CREATE INDEX "idx_conflictos_tabela" ON "public"."conflitos" USING "btree" ("tabela");



CREATE INDEX "idx_dietas_fazenda_id" ON "public"."dietas" USING "btree" ("fazenda_id");



CREATE INDEX "idx_dispositivos_ativo" ON "public"."dispositivos" USING "btree" ("ativo");



CREATE INDEX "idx_dispositivos_device_id" ON "public"."dispositivos" USING "btree" ("device_id");



CREATE INDEX "idx_dispositivos_fazenda" ON "public"."dispositivos" USING "btree" ("fazenda_id");



CREATE INDEX "idx_enfermaria_data" ON "public"."registros_enfermaria" USING "btree" ("data");



CREATE INDEX "idx_enfermaria_deleted" ON "public"."registros_enfermaria" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_enfermaria_dispositivo" ON "public"."registros_enfermaria" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_enfermaria_fazenda" ON "public"."registros_enfermaria" USING "btree" ("fazenda_id");



CREATE INDEX "idx_enfermaria_sync" ON "public"."registros_enfermaria" USING "btree" ("sync_status");



CREATE INDEX "idx_entrada_insumos_data" ON "public"."registros_entrada_insumos" USING "btree" ("data_entrada");



CREATE INDEX "idx_entrada_insumos_deleted" ON "public"."registros_entrada_insumos" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_entrada_insumos_dispositivo" ON "public"."registros_entrada_insumos" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_entrada_insumos_fazenda" ON "public"."registros_entrada_insumos" USING "btree" ("fazenda_id");



CREATE INDEX "idx_entrada_insumos_sync" ON "public"."registros_entrada_insumos" USING "btree" ("sync_status");



CREATE INDEX "idx_entrada_itens_entrada_id" ON "public"."entrada_insumos_itens" USING "btree" ("entrada_id");



CREATE INDEX "idx_entrada_itens_insumo_id" ON "public"."entrada_insumos_itens" USING "btree" ("insumo_id");



CREATE INDEX "idx_fazendas_acesso_id" ON "public"."fazendas" USING "btree" ("acesso_id");



CREATE INDEX "idx_fazendas_ativo" ON "public"."fazendas" USING "btree" ("ativo");



CREATE INDEX "idx_fazendas_nome" ON "public"."fazendas" USING "btree" ("nome");



CREATE INDEX "idx_fornecedores_fazenda_id" ON "public"."fornecedores" USING "btree" ("fazenda_id");



CREATE INDEX "idx_frigorificos_fazenda_id" ON "public"."frigorificos" USING "btree" ("fazenda_id");



CREATE INDEX "idx_funcionarios_ativo" ON "public"."funcionarios" USING "btree" ("ativo");



CREATE INDEX "idx_funcionarios_fazenda" ON "public"."funcionarios" USING "btree" ("fazenda_id");



CREATE INDEX "idx_funcionarios_nome" ON "public"."funcionarios" USING "btree" ("nome");



CREATE INDEX "idx_historico_limpezas_bebedouro_id" ON "public"."historico_limpezas_bebedouros" USING "btree" ("bebedouro_id");



CREATE INDEX "idx_historico_limpezas_data" ON "public"."historico_limpezas_bebedouros" USING "btree" ("data_limpeza" DESC);



CREATE INDEX "idx_historico_limpezas_fazenda_id" ON "public"."historico_limpezas_bebedouros" USING "btree" ("fazenda_id");



CREATE INDEX "idx_insumos_ativo" ON "public"."insumos" USING "btree" ("ativo");



CREATE INDEX "idx_insumos_fazenda" ON "public"."insumos" USING "btree" ("fazenda_id");



CREATE INDEX "idx_insumos_nome" ON "public"."insumos" USING "btree" ("nome");



CREATE INDEX "idx_insumos_tipo" ON "public"."insumos" USING "btree" ("tipo");



CREATE INDEX "idx_lote_pasto_historico_data_final" ON "public"."lote_pasto_historico" USING "btree" ("data_final") WHERE ("data_final" IS NULL);



CREATE INDEX "idx_lote_pasto_historico_lote_id" ON "public"."lote_pasto_historico" USING "btree" ("lote_id");



CREATE INDEX "idx_lote_pasto_historico_pasto_id" ON "public"."lote_pasto_historico" USING "btree" ("pasto_id");



CREATE INDEX "idx_lotes_ativo" ON "public"."lotes" USING "btree" ("ativo");



CREATE INDEX "idx_lotes_fazenda" ON "public"."lotes" USING "btree" ("fazenda_id");



CREATE INDEX "idx_lotes_nome" ON "public"."lotes" USING "btree" ("nome");



CREATE INDEX "idx_lotes_pasto_id" ON "public"."lotes" USING "btree" ("pasto_id");



CREATE INDEX "idx_maternidade_data" ON "public"."registros_maternidade" USING "btree" ("data");



CREATE INDEX "idx_maternidade_deleted" ON "public"."registros_maternidade" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_maternidade_dispositivo" ON "public"."registros_maternidade" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_maternidade_fazenda" ON "public"."registros_maternidade" USING "btree" ("fazenda_id");



CREATE INDEX "idx_maternidade_sync" ON "public"."registros_maternidade" USING "btree" ("sync_status");



CREATE INDEX "idx_medicamentos_deleted_at" ON "public"."medicamentos" USING "btree" ("deleted_at");



CREATE INDEX "idx_medicamentos_fazenda_id" ON "public"."medicamentos" USING "btree" ("fazenda_id");



CREATE INDEX "idx_medicamentos_nome_comercial" ON "public"."medicamentos" USING "btree" ("nome_comercial");



CREATE INDEX "idx_mineral_fazenda_id" ON "public"."mineral" USING "btree" ("fazenda_id");



CREATE INDEX "idx_movimentacao_data" ON "public"."registros_movimentacao" USING "btree" ("data");



CREATE INDEX "idx_movimentacao_deleted" ON "public"."registros_movimentacao" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_movimentacao_dispositivo" ON "public"."registros_movimentacao" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_movimentacao_estoque_data" ON "public"."movimentacao_estoque" USING "btree" ("data_movimentacao");



CREATE INDEX "idx_movimentacao_estoque_fazenda" ON "public"."movimentacao_estoque" USING "btree" ("fazenda_id");



CREATE INDEX "idx_movimentacao_estoque_tabela_registro" ON "public"."movimentacao_estoque" USING "btree" ("tabela_origem", "registro_id");



CREATE INDEX "idx_movimentacao_estoque_tipo" ON "public"."movimentacao_estoque" USING "btree" ("tipo_movimentacao");



CREATE INDEX "idx_movimentacao_fazenda" ON "public"."registros_movimentacao" USING "btree" ("fazenda_id");



CREATE INDEX "idx_movimentacao_sync" ON "public"."registros_movimentacao" USING "btree" ("sync_status");



CREATE INDEX "idx_notificacoes_created_at" ON "public"."notificacoes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notificacoes_fazenda" ON "public"."notificacoes" USING "btree" ("fazenda_id");



CREATE INDEX "idx_notificacoes_lida" ON "public"."notificacoes" USING "btree" ("lida");



CREATE INDEX "idx_notificacoes_usuario" ON "public"."notificacoes" USING "btree" ("usuario_id");



CREATE INDEX "idx_pastagens_data" ON "public"."registros_pastagens" USING "btree" ("data");



CREATE INDEX "idx_pastagens_deleted" ON "public"."registros_pastagens" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_pastagens_dispositivo" ON "public"."registros_pastagens" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_pastagens_fazenda" ON "public"."registros_pastagens" USING "btree" ("fazenda_id");



CREATE INDEX "idx_pastagens_sync" ON "public"."registros_pastagens" USING "btree" ("sync_status");



CREATE INDEX "idx_pastos_ativo" ON "public"."pastos" USING "btree" ("ativo");



CREATE INDEX "idx_pastos_fazenda" ON "public"."pastos" USING "btree" ("fazenda_id");



CREATE INDEX "idx_pastos_nome" ON "public"."pastos" USING "btree" ("nome");



CREATE INDEX "idx_peoes_email" ON "public"."peoes" USING "btree" ("email");



CREATE INDEX "idx_peoes_fazenda_id" ON "public"."peoes" USING "btree" ("fazenda_id");



CREATE INDEX "idx_proteinado_fazenda_id" ON "public"."proteinado" USING "btree" ("fazenda_id");



CREATE INDEX "idx_racao_fazenda_id" ON "public"."racao" USING "btree" ("fazenda_id");



CREATE INDEX "idx_registros_abastecimento_data" ON "public"."registros_abastecimento" USING "btree" ("data");



CREATE INDEX "idx_registros_abastecimento_deleted_at" ON "public"."registros_abastecimento" USING "btree" ("deleted_at");



CREATE INDEX "idx_registros_abastecimento_dispositivo_id" ON "public"."registros_abastecimento" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_registros_abastecimento_fazenda_id" ON "public"."registros_abastecimento" USING "btree" ("fazenda_id");



CREATE INDEX "idx_registros_almoxarifado_itens" ON "public"."registros_almoxarifado" USING "gin" ("itens");



CREATE INDEX "idx_registros_cantina_data" ON "public"."registros_cantina" USING "btree" ("data");



CREATE INDEX "idx_registros_cantina_dispositivo_id" ON "public"."registros_cantina" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_registros_cantina_fazenda_id" ON "public"."registros_cantina" USING "btree" ("fazenda_id");



CREATE INDEX "idx_registros_cantina_sync_status" ON "public"."registros_cantina" USING "btree" ("sync_status");



CREATE INDEX "idx_registros_cantina_version" ON "public"."registros_cantina" USING "btree" ("version");



CREATE INDEX "idx_registros_clima_data" ON "public"."registros_clima" USING "btree" ("data");



CREATE INDEX "idx_registros_clima_fazenda_id" ON "public"."registros_clima" USING "btree" ("fazenda_id");



CREATE INDEX "idx_registros_clima_medicoes" ON "public"."registros_clima" USING "gin" ("medicoes");



CREATE INDEX "idx_registros_clima_sync_status" ON "public"."registros_clima" USING "btree" ("sync_status");



CREATE INDEX "idx_registros_limpeza_data" ON "public"."registros_limpeza" USING "btree" ("data");



CREATE INDEX "idx_registros_limpeza_dispositivo_id" ON "public"."registros_limpeza" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_registros_limpeza_fazenda_id" ON "public"."registros_limpeza" USING "btree" ("fazenda_id");



CREATE INDEX "idx_registros_limpeza_sync_status" ON "public"."registros_limpeza" USING "btree" ("sync_status");



CREATE INDEX "idx_registros_morte_data" ON "public"."registros_morte" USING "btree" ("data");



CREATE INDEX "idx_registros_morte_fazenda_id" ON "public"."registros_morte" USING "btree" ("fazenda_id");



CREATE INDEX "idx_registros_morte_sync_status" ON "public"."registros_morte" USING "btree" ("sync_status");



CREATE INDEX "idx_registros_operacoes_maquinas_data" ON "public"."registros_operacoes_maquinas" USING "btree" ("data");



CREATE INDEX "idx_registros_operacoes_maquinas_fazenda_id" ON "public"."registros_operacoes_maquinas" USING "btree" ("fazenda_id");



CREATE INDEX "idx_registros_operacoes_maquinas_sync_status" ON "public"."registros_operacoes_maquinas" USING "btree" ("sync_status");



CREATE INDEX "idx_registros_problemas_data" ON "public"."registros_problemas" USING "btree" ("data");



CREATE INDEX "idx_registros_problemas_deleted_at" ON "public"."registros_problemas" USING "btree" ("deleted_at");



CREATE INDEX "idx_registros_problemas_dispositivo_id" ON "public"."registros_problemas" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_registros_problemas_fazenda_id" ON "public"."registros_problemas" USING "btree" ("fazenda_id");



CREATE INDEX "idx_registros_problemas_sync_status" ON "public"."registros_problemas" USING "btree" ("sync_status");



CREATE INDEX "idx_rodeio_data" ON "public"."registros_rodeio" USING "btree" ("data");



CREATE INDEX "idx_rodeio_deleted" ON "public"."registros_rodeio" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_rodeio_dispositivo" ON "public"."registros_rodeio" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_rodeio_fazenda" ON "public"."registros_rodeio" USING "btree" ("fazenda_id");



CREATE INDEX "idx_rodeio_sync" ON "public"."registros_rodeio" USING "btree" ("sync_status");



CREATE INDEX "idx_saida_insumos_data" ON "public"."registros_saida_insumos" USING "btree" ("data_producao");



CREATE INDEX "idx_saida_insumos_deleted" ON "public"."registros_saida_insumos" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_saida_insumos_dispositivo" ON "public"."registros_saida_insumos" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_saida_insumos_fazenda" ON "public"."registros_saida_insumos" USING "btree" ("fazenda_id");



CREATE INDEX "idx_saida_insumos_sync" ON "public"."registros_saida_insumos" USING "btree" ("sync_status");



CREATE INDEX "idx_saida_itens_insumo_id" ON "public"."saida_insumos_itens" USING "btree" ("insumo_id");



CREATE INDEX "idx_saida_itens_saida_id" ON "public"."saida_insumos_itens" USING "btree" ("saida_id");



CREATE INDEX "idx_saved_filters_fazenda" ON "public"."saved_filters" USING "btree" ("fazenda_id");



CREATE INDEX "idx_saved_filters_preset" ON "public"."saved_filters" USING "btree" ("is_preset");



CREATE INDEX "idx_saved_filters_tela" ON "public"."saved_filters" USING "btree" ("tela");



CREATE INDEX "idx_saved_filters_usuario" ON "public"."saved_filters" USING "btree" ("usuario_id");



CREATE INDEX "idx_suplementacao_data" ON "public"."registros_suplementacao" USING "btree" ("data");



CREATE INDEX "idx_suplementacao_deleted" ON "public"."registros_suplementacao" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_suplementacao_dispositivo" ON "public"."registros_suplementacao" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_suplementacao_fazenda" ON "public"."registros_suplementacao" USING "btree" ("fazenda_id");



CREATE INDEX "idx_suplementacao_sync" ON "public"."registros_suplementacao" USING "btree" ("sync_status");



CREATE INDEX "idx_sync_queue_created" ON "public"."sync_queue" USING "btree" ("created_at");



CREATE INDEX "idx_sync_queue_dispositivo" ON "public"."sync_queue" USING "btree" ("dispositivo_id");



CREATE INDEX "idx_sync_queue_fazenda" ON "public"."sync_queue" USING "btree" ("fazenda_id");



CREATE INDEX "idx_sync_queue_prioridade" ON "public"."sync_queue" USING "btree" ("prioridade");



CREATE INDEX "idx_usuario_fazenda_ativo" ON "public"."usuario_fazenda" USING "btree" ("ativo");



CREATE INDEX "idx_usuario_fazenda_fazenda" ON "public"."usuario_fazenda" USING "btree" ("fazenda_id");



CREATE INDEX "idx_usuario_fazenda_papel" ON "public"."usuario_fazenda" USING "btree" ("papel");



CREATE INDEX "idx_usuario_fazenda_usuario" ON "public"."usuario_fazenda" USING "btree" ("usuario_id");



CREATE INDEX "idx_usuarios_ativo" ON "public"."usuarios" USING "btree" ("ativo");



CREATE INDEX "idx_usuarios_auth_id" ON "public"."usuarios" USING "btree" ("auth_id");



CREATE INDEX "idx_usuarios_email" ON "public"."usuarios" USING "btree" ("email");



CREATE OR REPLACE TRIGGER "on_update_registros_morte" BEFORE UPDATE ON "public"."registros_morte" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at_registros_morte"();



CREATE OR REPLACE TRIGGER "trg_estoque_entrada" AFTER INSERT ON "public"."registros_entrada_insumos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_estoque_entrada"();



CREATE OR REPLACE TRIGGER "trg_estoque_entrada_delete" AFTER DELETE ON "public"."registros_entrada_insumos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_estoque_entrada_delete"();



CREATE OR REPLACE TRIGGER "trg_estoque_entrada_update" AFTER UPDATE ON "public"."registros_entrada_insumos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_estoque_entrada_update"();



CREATE OR REPLACE TRIGGER "trg_estoque_item_entrada_insert" AFTER INSERT ON "public"."entrada_insumos_itens" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_estoque_item_entrada"();



CREATE OR REPLACE TRIGGER "trg_estoque_saida" AFTER INSERT ON "public"."registros_saida_insumos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_estoque_saida"();



CREATE OR REPLACE TRIGGER "trg_estoque_saida_delete" AFTER DELETE ON "public"."registros_saida_insumos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_estoque_saida_delete"();



CREATE OR REPLACE TRIGGER "trg_estoque_saida_update" AFTER UPDATE ON "public"."registros_saida_insumos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_estoque_saida_update"();



CREATE OR REPLACE TRIGGER "trigger_calcular_espacamento_cocho_ideal" BEFORE INSERT OR UPDATE OF "espacamento_cocho_cm_cab" ON "public"."registros_suplementacao" FOR EACH ROW EXECUTE FUNCTION "public"."calcular_espacamento_cocho_ideal"();



CREATE OR REPLACE TRIGGER "update_categorias_updated_at" BEFORE UPDATE ON "public"."categorias" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_dispositivos_updated_at" BEFORE UPDATE ON "public"."dispositivos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fazendas_updated_at" BEFORE UPDATE ON "public"."fazendas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_funcionarios_updated_at" BEFORE UPDATE ON "public"."funcionarios" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_insumos_updated_at" BEFORE UPDATE ON "public"."insumos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_lotes_updated_at" BEFORE UPDATE ON "public"."lotes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pastos_updated_at" BEFORE UPDATE ON "public"."pastos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registros_abastecimento_updated_at" BEFORE UPDATE ON "public"."registros_abastecimento" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registros_bebedouros_updated_at" BEFORE UPDATE ON "public"."registros_bebedouros" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registros_cantina_updated_at" BEFORE UPDATE ON "public"."registros_cantina" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registros_clima_updated_at" BEFORE UPDATE ON "public"."registros_clima" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registros_enfermaria_updated_at" BEFORE UPDATE ON "public"."registros_enfermaria" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registros_entrada_insumos_updated_at" BEFORE UPDATE ON "public"."registros_entrada_insumos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registros_limpeza_updated_at" BEFORE UPDATE ON "public"."registros_limpeza" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registros_maternidade_updated_at" BEFORE UPDATE ON "public"."registros_maternidade" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registros_movimentacao_updated_at" BEFORE UPDATE ON "public"."registros_movimentacao" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registros_pastagens_updated_at" BEFORE UPDATE ON "public"."registros_pastagens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registros_rodeio_updated_at" BEFORE UPDATE ON "public"."registros_rodeio" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registros_saida_insumos_updated_at" BEFORE UPDATE ON "public"."registros_saida_insumos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registros_supplementacao_updated_at" BEFORE UPDATE ON "public"."registros_suplementacao" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_saved_filters_updated_at" BEFORE UPDATE ON "public"."saved_filters" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_usuario_fazenda_updated_at" BEFORE UPDATE ON "public"."usuario_fazenda" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_usuarios_updated_at" BEFORE UPDATE ON "public"."usuarios" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bebedouros"
    ADD CONSTRAINT "bebedouros_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categorias"
    ADD CONSTRAINT "categorias_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."causas_morte"
    ADD CONSTRAINT "causas_morte_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conflitos"
    ADD CONSTRAINT "conflictos_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dietas"
    ADD CONSTRAINT "dietas_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id");



ALTER TABLE ONLY "public"."dispositivos"
    ADD CONSTRAINT "dispositivos_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entrada_insumos_itens"
    ADD CONSTRAINT "entrada_insumos_itens_entrada_id_fkey" FOREIGN KEY ("entrada_id") REFERENCES "public"."registros_entrada_insumos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entrada_insumos_itens"
    ADD CONSTRAINT "entrada_insumos_itens_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id");



ALTER TABLE ONLY "public"."fornecedores"
    ADD CONSTRAINT "fornecedores_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id");



ALTER TABLE ONLY "public"."frigorificos"
    ADD CONSTRAINT "frigorificos_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id");



ALTER TABLE ONLY "public"."funcionarios"
    ADD CONSTRAINT "funcionarios_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."historico_limpezas_bebedouros"
    ADD CONSTRAINT "historico_limpezas_bebedouros_bebedouro_id_fkey" FOREIGN KEY ("bebedouro_id") REFERENCES "public"."bebedouros"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."historico_limpezas_bebedouros"
    ADD CONSTRAINT "historico_limpezas_bebedouros_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."insumos"
    ADD CONSTRAINT "insumos_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lote_pasto_historico"
    ADD CONSTRAINT "lote_pasto_historico_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lote_pasto_historico"
    ADD CONSTRAINT "lote_pasto_historico_pasto_id_fkey" FOREIGN KEY ("pasto_id") REFERENCES "public"."pastos"("id");



ALTER TABLE ONLY "public"."lotes"
    ADD CONSTRAINT "lotes_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lotes"
    ADD CONSTRAINT "lotes_pasto_id_fkey" FOREIGN KEY ("pasto_id") REFERENCES "public"."pastos"("id");



ALTER TABLE ONLY "public"."medicamentos"
    ADD CONSTRAINT "medicamentos_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mineral"
    ADD CONSTRAINT "mineral_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id");



ALTER TABLE ONLY "public"."movimentacao_estoque"
    ADD CONSTRAINT "movimentacao_estoque_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id");



ALTER TABLE ONLY "public"."movimentacao_estoque"
    ADD CONSTRAINT "movimentacao_estoque_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id");



ALTER TABLE ONLY "public"."notificacoes"
    ADD CONSTRAINT "notificacoes_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notificacoes"
    ADD CONSTRAINT "notificacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pastos"
    ADD CONSTRAINT "pastos_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pluviometros"
    ADD CONSTRAINT "pluviometros_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proteinado"
    ADD CONSTRAINT "proteinado_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id");



ALTER TABLE ONLY "public"."racao"
    ADD CONSTRAINT "racao_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id");



ALTER TABLE ONLY "public"."registros_abastecimento"
    ADD CONSTRAINT "registros_abastecimento_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_abastecimento"
    ADD CONSTRAINT "registros_abastecimento_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_bebedouros"
    ADD CONSTRAINT "registros_bebedouros_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_bebedouros"
    ADD CONSTRAINT "registros_bebedouros_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_clima"
    ADD CONSTRAINT "registros_clima_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_clima"
    ADD CONSTRAINT "registros_clima_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_enfermaria"
    ADD CONSTRAINT "registros_enfermaria_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_enfermaria"
    ADD CONSTRAINT "registros_enfermaria_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_entrada_insumos"
    ADD CONSTRAINT "registros_entrada_insumos_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_entrada_insumos"
    ADD CONSTRAINT "registros_entrada_insumos_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_entrada_insumos"
    ADD CONSTRAINT "registros_entrada_insumos_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id");



ALTER TABLE ONLY "public"."registros_limpeza"
    ADD CONSTRAINT "registros_limpeza_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_limpeza"
    ADD CONSTRAINT "registros_limpeza_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_maternidade"
    ADD CONSTRAINT "registros_maternidade_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_maternidade"
    ADD CONSTRAINT "registros_maternidade_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_movimentacao"
    ADD CONSTRAINT "registros_movimentacao_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_movimentacao"
    ADD CONSTRAINT "registros_movimentacao_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_operacoes_maquinas"
    ADD CONSTRAINT "registros_operacoes_maquinas_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id");



ALTER TABLE ONLY "public"."registros_operacoes_maquinas"
    ADD CONSTRAINT "registros_operacoes_maquinas_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id");



ALTER TABLE ONLY "public"."registros_pastagens"
    ADD CONSTRAINT "registros_pastagens_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_pastagens"
    ADD CONSTRAINT "registros_pastagens_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_problemas"
    ADD CONSTRAINT "registros_problemas_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_problemas"
    ADD CONSTRAINT "registros_problemas_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_rodeio"
    ADD CONSTRAINT "registros_rodeio_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_rodeio"
    ADD CONSTRAINT "registros_rodeio_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_saida_insumos"
    ADD CONSTRAINT "registros_saida_insumos_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_saida_insumos"
    ADD CONSTRAINT "registros_saida_insumos_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_saida_insumos"
    ADD CONSTRAINT "registros_saida_insumos_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id");



ALTER TABLE ONLY "public"."registros_suplementacao"
    ADD CONSTRAINT "registros_suplementacao_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_suplementacao"
    ADD CONSTRAINT "registros_suplementacao_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saida_insumos_itens"
    ADD CONSTRAINT "saida_insumos_itens_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id");



ALTER TABLE ONLY "public"."saida_insumos_itens"
    ADD CONSTRAINT "saida_insumos_itens_saida_id_fkey" FOREIGN KEY ("saida_id") REFERENCES "public"."registros_saida_insumos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_filters"
    ADD CONSTRAINT "saved_filters_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_filters"
    ADD CONSTRAINT "saved_filters_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sync_queue"
    ADD CONSTRAINT "sync_queue_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sync_queue"
    ADD CONSTRAINT "sync_queue_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuario_fazenda"
    ADD CONSTRAINT "usuario_fazenda_fazenda_id_fkey" FOREIGN KEY ("fazenda_id") REFERENCES "public"."fazendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuario_fazenda"
    ADD CONSTRAINT "usuario_fazenda_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated insert" ON "public"."usuarios" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated to delete own pluviometros" ON "public"."pluviometros" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated to insert pluviometros" ON "public"."pluviometros" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated to read pluviometros" ON "public"."pluviometros" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated to update own pluviometros" ON "public"."pluviometros" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated update" ON "public"."usuarios" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Allow public delete access on registros_operacoes_maquinas" ON "public"."registros_operacoes_maquinas" FOR DELETE USING (true);



CREATE POLICY "Allow public insert access on registros_operacoes_maquinas" ON "public"."registros_operacoes_maquinas" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read access" ON "public"."usuarios" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read access on registros_operacoes_maquinas" ON "public"."registros_operacoes_maquinas" FOR SELECT USING (true);



CREATE POLICY "Allow public update access on registros_operacoes_maquinas" ON "public"."registros_operacoes_maquinas" FOR UPDATE USING (true);



CREATE POLICY "Allow service role full access to pluviometros" ON "public"."pluviometros" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service role insert" ON "public"."usuarios" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Allow service role insert peoes" ON "public"."peoes" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Allow service role select" ON "public"."usuarios" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Allow service role select peoes" ON "public"."peoes" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Anon delete causas_morte" ON "public"."causas_morte" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Anon delete fazendas" ON "public"."fazendas" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Anon delete insumos" ON "public"."insumos" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Anon delete lotes" ON "public"."lotes" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Anon delete pastos" ON "public"."pastos" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Anon delete peoes" ON "public"."peoes" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Anon insert causas_morte" ON "public"."causas_morte" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon insert fazendas" ON "public"."fazendas" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon insert insumos" ON "public"."insumos" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon insert lotes" ON "public"."lotes" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon insert pastos" ON "public"."pastos" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon insert peoes" ON "public"."peoes" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon pode ler peoes" ON "public"."peoes" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon pode ver dietas da própria fazenda" ON "public"."dietas" FOR SELECT TO "anon" USING (("fazenda_id" IN ( SELECT "usuario_fazenda"."fazenda_id"
   FROM "public"."usuario_fazenda"
  WHERE ("usuario_fazenda"."usuario_id" = "auth"."uid"()))));



CREATE POLICY "Anon pode ver minerais da própria fazenda" ON "public"."mineral" FOR SELECT TO "anon" USING (("fazenda_id" IN ( SELECT "usuario_fazenda"."fazenda_id"
   FROM "public"."usuario_fazenda"
  WHERE ("usuario_fazenda"."usuario_id" = "auth"."uid"()))));



CREATE POLICY "Anon pode ver proteinados da própria fazenda" ON "public"."proteinado" FOR SELECT TO "anon" USING (("fazenda_id" IN ( SELECT "usuario_fazenda"."fazenda_id"
   FROM "public"."usuario_fazenda"
  WHERE ("usuario_fazenda"."usuario_id" = "auth"."uid"()))));



CREATE POLICY "Anon pode ver rações da própria fazenda" ON "public"."racao" FOR SELECT TO "anon" USING (("fazenda_id" IN ( SELECT "usuario_fazenda"."fazenda_id"
   FROM "public"."usuario_fazenda"
  WHERE ("usuario_fazenda"."usuario_id" = "auth"."uid"()))));



CREATE POLICY "Anon select causas_morte" ON "public"."causas_morte" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon select insumos" ON "public"."insumos" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon select lotes" ON "public"."lotes" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon select pastos" ON "public"."pastos" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon update causas_morte" ON "public"."causas_morte" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon update fazendas" ON "public"."fazendas" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon update insumos" ON "public"."insumos" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon update lotes" ON "public"."lotes" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon update pastos" ON "public"."pastos" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon update peoes" ON "public"."peoes" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Auth delete fazendas" ON "public"."fazendas" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Auth delete insumos" ON "public"."insumos" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Auth delete peoes" ON "public"."peoes" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Auth insert fazendas" ON "public"."fazendas" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Auth insert insumos" ON "public"."insumos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Auth insert peoes" ON "public"."peoes" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Auth select insumos" ON "public"."insumos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Auth update fazendas" ON "public"."fazendas" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Auth update insumos" ON "public"."insumos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Auth update peoes" ON "public"."peoes" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Debug - permitir leitura de dietas" ON "public"."dietas" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Debug - permitir leitura de minerais" ON "public"."mineral" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Debug - permitir leitura de proteinados" ON "public"."proteinado" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Debug - permitir leitura de rações" ON "public"."racao" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Enable delete for all authenticated users" ON "public"."bebedouros" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for all authenticated users" ON "public"."dietas" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for all authenticated users" ON "public"."fornecedores" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for all authenticated users" ON "public"."frigorificos" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for all authenticated users" ON "public"."funcionarios" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for all authenticated users" ON "public"."medicamentos" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for all authenticated users" ON "public"."mineral" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for all authenticated users" ON "public"."pluviometros" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for all authenticated users" ON "public"."proteinado" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for all authenticated users" ON "public"."racao" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for all authenticated users" ON "public"."registros_morte" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for anon users" ON "public"."fornecedores" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Enable delete for anon users" ON "public"."frigorificos" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Enable insert for all authenticated users" ON "public"."bebedouros" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for all authenticated users" ON "public"."dietas" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for all authenticated users" ON "public"."fornecedores" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for all authenticated users" ON "public"."frigorificos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for all authenticated users" ON "public"."funcionarios" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for all authenticated users" ON "public"."medicamentos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for all authenticated users" ON "public"."mineral" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for all authenticated users" ON "public"."pluviometros" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for all authenticated users" ON "public"."proteinado" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for all authenticated users" ON "public"."racao" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for all authenticated users" ON "public"."registros_morte" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for anon users" ON "public"."fornecedores" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Enable insert for anon users" ON "public"."frigorificos" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Enable public read access" ON "public"."bebedouros" FOR SELECT USING (true);



CREATE POLICY "Enable public read access" ON "public"."fazendas" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."dietas" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."fornecedores" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."frigorificos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."funcionarios" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."medicamentos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."mineral" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."pluviometros" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."proteinado" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."racao" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users" ON "public"."registros_morte" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for anon users" ON "public"."fornecedores" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable read access for anon users" ON "public"."frigorificos" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable update for all authenticated users" ON "public"."bebedouros" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for all authenticated users" ON "public"."dietas" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for all authenticated users" ON "public"."fornecedores" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for all authenticated users" ON "public"."frigorificos" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for all authenticated users" ON "public"."funcionarios" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for all authenticated users" ON "public"."medicamentos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for all authenticated users" ON "public"."mineral" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for all authenticated users" ON "public"."pluviometros" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for all authenticated users" ON "public"."proteinado" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for all authenticated users" ON "public"."racao" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for all authenticated users" ON "public"."registros_morte" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for anon users" ON "public"."fornecedores" FOR UPDATE TO "anon" USING (true);



CREATE POLICY "Enable update for anon users" ON "public"."frigorificos" FOR UPDATE TO "anon" USING (true);



CREATE POLICY "Funcionários ativos podem ser lidos" ON "public"."funcionarios" FOR SELECT USING (("ativo" = true));



CREATE POLICY "Usuários autenticados podem ler funcionários" ON "public"."funcionarios" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Usuários podem inserir histórico de limpezas na própria faze" ON "public"."historico_limpezas_bebedouros" FOR INSERT WITH CHECK (("fazenda_id" IN ( SELECT "usuario_fazenda"."fazenda_id"
   FROM "public"."usuario_fazenda"
  WHERE ("usuario_fazenda"."usuario_id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem ver dietas da própria fazenda" ON "public"."dietas" FOR SELECT USING (("fazenda_id" IN ( SELECT "usuario_fazenda"."fazenda_id"
   FROM "public"."usuario_fazenda"
  WHERE ("usuario_fazenda"."usuario_id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem ver histórico de limpezas da própria fazenda" ON "public"."historico_limpezas_bebedouros" FOR SELECT USING (("fazenda_id" IN ( SELECT "usuario_fazenda"."fazenda_id"
   FROM "public"."usuario_fazenda"
  WHERE ("usuario_fazenda"."usuario_id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem ver insumos da própria fazenda" ON "public"."insumos" FOR SELECT USING (("fazenda_id" IN ( SELECT "usuario_fazenda"."fazenda_id"
   FROM "public"."usuario_fazenda"
  WHERE ("usuario_fazenda"."usuario_id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem ver minerais da própria fazenda" ON "public"."mineral" FOR SELECT USING (("fazenda_id" IN ( SELECT "usuario_fazenda"."fazenda_id"
   FROM "public"."usuario_fazenda"
  WHERE ("usuario_fazenda"."usuario_id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem ver proteinados da própria fazenda" ON "public"."proteinado" FOR SELECT USING (("fazenda_id" IN ( SELECT "usuario_fazenda"."fazenda_id"
   FROM "public"."usuario_fazenda"
  WHERE ("usuario_fazenda"."usuario_id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem ver rações da própria fazenda" ON "public"."racao" FOR SELECT USING (("fazenda_id" IN ( SELECT "usuario_fazenda"."fazenda_id"
   FROM "public"."usuario_fazenda"
  WHERE ("usuario_fazenda"."usuario_id" = "auth"."uid"()))));



ALTER TABLE "public"."bebedouros" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dietas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fazendas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fornecedores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."frigorificos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."funcionarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mineral" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."peoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proteinado" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."racao" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
































































































































































































GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."audit_log" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_log" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."bebedouros" TO "anon";
GRANT ALL ON TABLE "public"."bebedouros" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."bebedouros" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."categorias" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."categorias" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."categorias" TO "service_role";



GRANT ALL ON TABLE "public"."causas_morte" TO "anon";
GRANT ALL ON TABLE "public"."causas_morte" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."causas_morte" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."conflitos" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."conflitos" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."conflitos" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."dietas" TO "anon";
GRANT ALL ON TABLE "public"."dietas" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."dietas" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."dispositivos" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."dispositivos" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."dispositivos" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."entrada_insumos_itens" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."entrada_insumos_itens" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."entrada_insumos_itens" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."fazendas" TO "anon";
GRANT ALL ON TABLE "public"."fazendas" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."fazendas" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."fornecedores" TO "anon";
GRANT ALL ON TABLE "public"."fornecedores" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."fornecedores" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."frigorificos" TO "anon";
GRANT ALL ON TABLE "public"."frigorificos" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."frigorificos" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."funcionarios" TO "anon";
GRANT ALL ON TABLE "public"."funcionarios" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."funcionarios" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."historico_limpezas_bebedouros" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."historico_limpezas_bebedouros" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."historico_limpezas_bebedouros" TO "service_role";



GRANT ALL ON TABLE "public"."insumos" TO "anon";
GRANT ALL ON TABLE "public"."insumos" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."insumos" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."lote_pasto_historico" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."lote_pasto_historico" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."lote_pasto_historico" TO "service_role";



GRANT ALL ON TABLE "public"."lotes" TO "anon";
GRANT ALL ON TABLE "public"."lotes" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."lotes" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."medicamentos" TO "anon";
GRANT ALL ON TABLE "public"."medicamentos" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."medicamentos" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."mineral" TO "anon";
GRANT ALL ON TABLE "public"."mineral" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."mineral" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."movimentacao_estoque" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."movimentacao_estoque" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."movimentacao_estoque" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."notificacoes" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notificacoes" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notificacoes" TO "service_role";



GRANT ALL ON TABLE "public"."pastos" TO "anon";
GRANT ALL ON TABLE "public"."pastos" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."pastos" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."peoes" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."peoes" TO "authenticated";
GRANT ALL ON TABLE "public"."peoes" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."pluviometros" TO "anon";
GRANT ALL ON TABLE "public"."pluviometros" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."pluviometros" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."proteinado" TO "anon";
GRANT ALL ON TABLE "public"."proteinado" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."proteinado" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."racao" TO "anon";
GRANT ALL ON TABLE "public"."racao" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."racao" TO "service_role";



GRANT ALL ON TABLE "public"."registros_abastecimento" TO "anon";
GRANT ALL ON TABLE "public"."registros_abastecimento" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_abastecimento" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."registros_almoxarifado" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."registros_almoxarifado" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_almoxarifado" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."registros_bebedouros" TO "anon";
GRANT ALL ON TABLE "public"."registros_bebedouros" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_bebedouros" TO "service_role";



GRANT ALL ON TABLE "public"."registros_cantina" TO "anon";
GRANT ALL ON TABLE "public"."registros_cantina" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_cantina" TO "service_role";



GRANT ALL ON TABLE "public"."registros_clima" TO "anon";
GRANT ALL ON TABLE "public"."registros_clima" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_clima" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."registros_enfermaria" TO "anon";
GRANT ALL ON TABLE "public"."registros_enfermaria" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_enfermaria" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."registros_entrada_insumos" TO "anon";
GRANT ALL ON TABLE "public"."registros_entrada_insumos" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_entrada_insumos" TO "service_role";



GRANT ALL ON TABLE "public"."registros_limpeza" TO "anon";
GRANT ALL ON TABLE "public"."registros_limpeza" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_limpeza" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."registros_manutencao_maquinas" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_manutencao_maquinas" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_manutencao_maquinas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."registros_manutencao_maquinas_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."registros_manutencao_maquinas_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."registros_manutencao_maquinas_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."registros_maternidade" TO "anon";
GRANT ALL ON TABLE "public"."registros_maternidade" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_maternidade" TO "service_role";



GRANT ALL ON TABLE "public"."registros_morte" TO "anon";
GRANT ALL ON TABLE "public"."registros_morte" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_morte" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."registros_movimentacao" TO "anon";
GRANT ALL ON TABLE "public"."registros_movimentacao" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_movimentacao" TO "service_role";



GRANT ALL ON TABLE "public"."registros_operacoes_maquinas" TO "anon";
GRANT ALL ON TABLE "public"."registros_operacoes_maquinas" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_operacoes_maquinas" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."registros_pastagens" TO "anon";
GRANT ALL ON TABLE "public"."registros_pastagens" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_pastagens" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."registros_problemas" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_problemas" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_problemas" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."registros_rodeio" TO "anon";
GRANT ALL ON TABLE "public"."registros_rodeio" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_rodeio" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."registros_saida_insumos" TO "anon";
GRANT ALL ON TABLE "public"."registros_saida_insumos" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_saida_insumos" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."registros_suplementacao" TO "anon";
GRANT ALL ON TABLE "public"."registros_suplementacao" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."registros_suplementacao" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."saida_insumos_itens" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."saida_insumos_itens" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."saida_insumos_itens" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."saved_filters" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."saved_filters" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."saved_filters" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."sync_queue" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."sync_queue" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."sync_queue" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."usuario_fazenda" TO "anon";
GRANT ALL ON TABLE "public"."usuario_fazenda" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."usuario_fazenda" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."usuarios" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";































