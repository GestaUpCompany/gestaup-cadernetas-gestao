UPDATE public.individuos
SET categoria = 'Vaca Parida',
    updated_at = now()
WHERE deleted_at IS NULL
  AND sexo = 'Fêmea'
  AND categoria IN ('Vaca Vazia', 'Vaca Prenha', 'Vaca Descarte')
  AND (
    EXISTS (
      SELECT 1
      FROM public.registros_maternidade rm
      WHERE rm.individuo_id_mae = individuos.id
        AND rm.deleted_at IS NULL
    )
    OR sync_status = 'automatico_incompleto'
  );;
