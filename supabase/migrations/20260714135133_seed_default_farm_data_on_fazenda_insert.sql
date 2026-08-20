-- Criar função para copiar dados padrão das tabelas tratamentos, causas_morte e racas
-- para uma nova fazenda, baseada na fazenda padrão d649c65e-16ab-4b77-a84b-df937aa41cc3

CREATE OR REPLACE FUNCTION public.seed_default_farm_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Só insere se ainda não existir nenhum registro para a nova fazenda
  IF NOT EXISTS (SELECT 1 FROM public.tratamentos WHERE fazenda_id = NEW.id) THEN
    INSERT INTO public.tratamentos (id, fazenda_id, nome, ativo, created_at, updated_at)
    SELECT gen_random_uuid(), NEW.id, nome, ativo, now(), now()
    FROM public.tratamentos
    WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.causas_morte WHERE fazenda_id = NEW.id) THEN
    INSERT INTO public.causas_morte (id, fazenda_id, nome, descricao, ativo, created_at, updated_at)
    SELECT gen_random_uuid(), NEW.id, nome, descricao, ativo, now(), now()
    FROM public.causas_morte
    WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.racas WHERE fazenda_id = NEW.id) THEN
    INSERT INTO public.racas (id, fazenda_id, nome, ativo, created_at, updated_at, deleted_at)
    SELECT gen_random_uuid(), NEW.id, nome, ativo, now(), now(), deleted_at
    FROM public.racas
    WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3';
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função após inserção na tabela fazendas
DROP TRIGGER IF EXISTS seed_default_farm_data_trigger ON public.fazendas;

CREATE TRIGGER seed_default_farm_data_trigger
AFTER INSERT ON public.fazendas
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_farm_data();;
