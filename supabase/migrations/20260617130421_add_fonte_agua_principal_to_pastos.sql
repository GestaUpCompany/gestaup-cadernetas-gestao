ALTER TABLE pastos ADD COLUMN fonte_agua_principal text CHECK (fonte_agua_principal IN ('Bebedouro', 'Córrego', 'Represa', 'Rio'));;
