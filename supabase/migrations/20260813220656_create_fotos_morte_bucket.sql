INSERT INTO storage.buckets (id, name, public) VALUES ('fotos-morte', 'fotos-morte', true) ON CONFLICT (id) DO NOTHING;;
