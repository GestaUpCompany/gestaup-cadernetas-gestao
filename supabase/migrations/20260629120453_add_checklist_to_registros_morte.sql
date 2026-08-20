ALTER TABLE registros_morte ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]';;
