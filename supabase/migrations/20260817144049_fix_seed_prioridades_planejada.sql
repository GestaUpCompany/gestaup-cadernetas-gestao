CREATE OR REPLACE FUNCTION fn_seed_prioridades_nova_fazenda()
RETURNS trigger AS $$
BEGIN
  INSERT INTO prioridades_atividades (fazenda_id, nivel, nome) VALUES
    (NEW.id, 1, 'Urgente'),
    (NEW.id, 2, 'Importante'),
    (NEW.id, 3, 'Planejada');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
