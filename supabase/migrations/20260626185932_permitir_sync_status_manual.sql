
-- Modificar trigger para respeitar sync_status manual explicitamente definido pelo frontend
CREATE OR REPLACE FUNCTION public.trg_individuos_atualizar_sync_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se o frontend explicitamente definiu um status manual, respeitar
  IF NEW.sync_status IN ('manual_completo', 'manual_incompleto') THEN
    RETURN NEW;
  END IF;

  -- Caso contrário, recalcular baseado na completude
  NEW.sync_status := public.calcular_sync_status_individuo(
    NEW.origem,
    NEW.id_brinco,
    NEW.id_chip,
    NEW.id_manejo,
    NEW.id_provisorio_cria,
    NEW.data_nascimento,
    NEW.sexo,
    NEW.categoria,
    NEW.raca,
    NEW.peso_nascimento_kg,
    NEW.status,
    NEW.sync_status
  );

  RETURN NEW;
END;
$$;
;
