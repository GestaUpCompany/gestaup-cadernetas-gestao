
-- Fix: update_classificacao_matriz should NOT overwrite NULL for on-the-spot mothers
-- On-the-spot mothers have origem IS NULL and should keep NULL (user manually sets)
CREATE OR REPLACE FUNCTION update_classificacao_matriz(p_individuo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.individuos
  SET classificacao_matriz = compute_classificacao_matriz(p_individuo_id)
  WHERE id = p_individuo_id
    AND sexo = 'Fêmea'
    AND categoria IN ('Vaca Parida', 'Vaca Prenha', 'Vaca Vazia', 'Vaca Descarte', 'Primípara')
    AND origem IS NOT NULL;  -- Only recompute for known-origem mothers, skip on-the-spot
END;
$$ LANGUAGE plpgsql;
;
