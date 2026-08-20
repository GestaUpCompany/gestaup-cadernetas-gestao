-- Create function to link orphans to their mother when mother is added/updated
CREATE OR REPLACE FUNCTION link_orphans_to_mother()
RETURNS TRIGGER AS $$
BEGIN
  -- Only link if this is a female (potential mother)
  IF NEW.sexo = 'Fêmea' AND (NEW.id_brinco IS NOT NULL OR NEW.id_chip IS NOT NULL) THEN
    -- Update orphans where mother identification matches
    UPDATE individuos
    SET 
      mae = NEW.id,
      id_brinco_mae = NULL,
      id_chip_mae = NULL
    WHERE 
      mae IS NULL AND
      fazenda_id = NEW.fazenda_id AND
      (
        (NEW.id_brinco IS NOT NULL AND id_brinco_mae = NEW.id_brinco) OR
        (NEW.id_chip IS NOT NULL AND id_chip_mae = NEW.id_chip)
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on individuos INSERT and UPDATE of id_brinco/id_chip
CREATE TRIGGER trg_individuos_link_orphans_to_mother
AFTER INSERT OR UPDATE OF id_brinco, id_chip ON individuos
FOR EACH ROW
EXECUTE FUNCTION link_orphans_to_mother();;
