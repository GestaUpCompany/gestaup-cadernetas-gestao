-- Habilitar RLS nas tabelas principais
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fazendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_fazenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individuos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lote_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastos ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS em outras tabelas críticas
ALTER TABLE public.registros_maternidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_pastagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_rodeio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_suplementacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_bebedouros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_movimentacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_enfermaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_entrada_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_saida_insumos ENABLE ROW LEVEL SECURITY;;
