
-- Função para notificar todos os usuários ativos da fazenda sobre indivíduo incompleto
CREATE OR REPLACE FUNCTION public.notificar_individuo_incompleto(
  p_fazenda_id UUID,
  p_individuo_id UUID,
  p_id_provisorio_cria TEXT,
  p_id_brinco_cria TEXT,
  p_id_chip_cria TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_identificacao TEXT;
BEGIN
  v_identificacao := COALESCE(
    NULLIF(TRIM(p_id_brinco_cria), ''),
    NULLIF(TRIM(p_id_chip_cria), ''),
    NULLIF(TRIM(p_id_provisorio_cria), ''),
    'sem identificação'
  );

  INSERT INTO public.notificacoes (
    usuario_id,
    fazenda_id,
    tipo,
    titulo,
    mensagem,
    acao_url,
    acao_label,
    lida
  )
  SELECT
    u.id,
    p_fazenda_id,
    'warning',
    'Indivíduo criado automaticamente',
    'O indivíduo ' || v_identificacao || ' foi gerado via registro de maternidade e possui dados incompletos. Revise e complete o cadastro.',
    '/controller/individuos/' || p_individuo_id,
    'Completar cadastro',
    false
  FROM public.usuario_fazenda uf
  JOIN public.usuarios u ON u.id = uf.usuario_id
  WHERE uf.fazenda_id = p_fazenda_id
    AND uf.ativo = true
    AND u.ativo = true
  ON CONFLICT DO NOTHING;
END;
$$;

-- Modifica trigger para vincular indivíduo à maternidade e notificar usuários
CREATE OR REPLACE FUNCTION public.create_individual_from_maternidade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pasto_uuid UUID;
  categoria_value TEXT;
  raca_normalizada TEXT;
  parto_array TEXT[];
  v_individuo_id UUID;
BEGIN
  -- Skip if individuo_id_cria is already set (frontend already created it)
  IF NEW.individuo_id_cria IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Derive categoria from sexo
  IF NEW.sexo = 'Macho' THEN
    categoria_value := 'Bezerro ao Pé';
  ELSIF NEW.sexo = 'Fêmea' THEN
    categoria_value := 'Bezerra ao Pé';
  ELSE
    categoria_value := NULL;
  END IF;

  -- Normalize raca buscando na tabela de racas da fazenda
  SELECT nome INTO raca_normalizada
  FROM public.racas
  WHERE fazenda_id = NEW.fazenda_id
    AND UPPER(TRIM(nome)) = UPPER(TRIM(COALESCE(NEW.raca, '')))
    AND (ativo IS NULL OR ativo = true)
  LIMIT 1;

  -- Se nao encontrar na tabela, manter o valor original enviado pelo frontend
  IF raca_normalizada IS NULL THEN
    raca_normalizada := NEW.raca;
  END IF;

  -- Lookup pasto UUID
  IF NEW.pasto_id IS NOT NULL THEN
    pasto_uuid := NEW.pasto_id;
  ELSE
    SELECT id INTO pasto_uuid FROM public.pastos WHERE nome = NEW.pasto AND fazenda_id = NEW.fazenda_id LIMIT 1;
  END IF;

  -- Convert tipo_parto (jsonb) to text[] for individuos.parto
  IF NEW.tipo_parto IS NOT NULL AND jsonb_array_length(NEW.tipo_parto) > 0 THEN
    SELECT ARRAY(SELECT value::text FROM jsonb_array_elements_text(NEW.tipo_parto) AS value) INTO parto_array;
  ELSE
    parto_array := NULL;
  END IF;

  -- Insert into individuos e captura o ID gerado
  INSERT INTO public.individuos (
    fazenda_id, data_nascimento, data_entrada_fazenda, peso_nascimento_kg,
    id_provisorio_cria, id_brinco, id_chip, lote_atual, pasto_atual, sexo, raca,
    parto, id_brinco_mae, id_chip_mae, categoria, origem, status
  ) VALUES (
    NEW.fazenda_id, NEW.data::DATE, NEW.data::DATE, NEW.peso_cria_kg::NUMERIC,
    NEW.id_provisorio_cria, NEW.id_brinco_cria, NEW.id_chip_cria, NEW.lote_id,
    pasto_uuid, NEW.sexo, raca_normalizada,
    parto_array,
    NEW.id_brinco_mae, NEW.id_chip_mae, categoria_value, 'Nascimento', 'Vivo'
  )
  RETURNING id INTO v_individuo_id;

  -- Vincula o indivíduo criado ao registro de maternidade
  UPDATE public.registros_maternidade
  SET individuo_id_cria = v_individuo_id
  WHERE id = NEW.id;

  -- Notifica todos os usuários ativos da fazenda
  PERFORM public.notificar_individuo_incompleto(
    NEW.fazenda_id,
    v_individuo_id,
    NEW.id_provisorio_cria,
    NEW.id_brinco_cria,
    NEW.id_chip_cria
  );

  RETURN NEW;
END;
$$;
;
