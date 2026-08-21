-- Corrigir defaults e descricoes das notas de leitura de cocho

-- Atualizar registros existentes
UPDATE public.notas_leitura_cocho_config 
SET percentual_ajuste = 10.0, descricao = 'Cocho vazio (lambido). Aumentar a oferta em 10%'
WHERE nota = -1;

UPDATE public.notas_leitura_cocho_config 
SET percentual_ajuste = 5.0, descricao = 'Cocho limpo (sem sobras). Aumentar a oferta em 5%'
WHERE nota = 0;

UPDATE public.notas_leitura_cocho_config 
SET percentual_ajuste = 0.0, descricao = 'Poucas sobras (rapinha). Manter a oferta'
WHERE nota = 1;

UPDATE public.notas_leitura_cocho_config 
SET percentual_ajuste = -5.0, descricao = 'Sobras moderadas. Diminuir a oferta em 5%'
WHERE nota = 2;

UPDATE public.notas_leitura_cocho_config 
SET percentual_ajuste = -10.0, descricao = 'Sobras em excesso. Diminuir a oferta em 10%'
WHERE nota = 3;

-- Atualizar trigger para novas fazendas
CREATE OR REPLACE FUNCTION public.seed_notas_leitura_cocho_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notas_leitura_cocho_config (fazenda_id, nota, percentual_ajuste, descricao)
  VALUES 
    (NEW.id, -1, 10.0, 'Cocho vazio (lambido). Aumentar a oferta em 10%'),
    (NEW.id, 0, 5.0, 'Cocho limpo (sem sobras). Aumentar a oferta em 5%'),
    (NEW.id, 1, 0.0, 'Poucas sobras (rapinha). Manter a oferta'),
    (NEW.id, 2, -5.0, 'Sobras moderadas. Diminuir a oferta em 5%'),
    (NEW.id, 3, -10.0, 'Sobras em excesso. Diminuir a oferta em 10%')
  ON CONFLICT (fazenda_id, nota) DO NOTHING;
  RETURN NEW;
END;
$function$;

SELECT nota, percentual_ajuste, descricao
FROM public.notas_leitura_cocho_config
WHERE fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'
ORDER BY nota;;
