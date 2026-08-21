CREATE OR REPLACE FUNCTION update_modulo_area()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.ativo = true THEN
      UPDATE modulos_pastos
      SET area_util_total_ha = (
        SELECT COALESCE(SUM(p.area_util_ha), 0)
        FROM rotacao_pastos rp
        JOIN pastos p ON rp.pasto_id = p.id
        WHERE rp.modulo_id = NEW.modulo_id AND rp.ativo = true
      )
      WHERE id = NEW.modulo_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE modulos_pastos
    SET area_util_total_ha = (
      SELECT COALESCE(SUM(p.area_util_ha), 0)
      FROM rotacao_pastos rp
      JOIN pastos p ON rp.pasto_id = p.id
      WHERE rp.modulo_id = OLD.modulo_id AND rp.ativo = true
    )
    WHERE id = OLD.modulo_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_modulo_area
AFTER INSERT OR UPDATE OR DELETE ON rotacao_pastos
FOR EACH ROW EXECUTE FUNCTION update_modulo_area();;
