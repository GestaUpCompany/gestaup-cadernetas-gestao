
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMPTZ;

-- Create index for efficient online status queries
CREATE INDEX IF NOT EXISTS idx_usuarios_ultimo_acesso ON public.usuarios(ultimo_acesso);
;
