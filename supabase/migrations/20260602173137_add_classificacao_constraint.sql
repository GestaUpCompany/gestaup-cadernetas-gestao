ALTER TABLE public.itens_almoxarifado 
ADD CONSTRAINT itens_almoxarifado_classificacao_check 
CHECK (classificacao IN ('Ferramentas', 'Peças', 'Hidráulica', 'Elétrica', 'Insumos', 'Fertilizantes', 'Corretivos', 'Defensivos', 'Herbicidas', 'Fungicidas', 'Inseticidas', 'Adjuvantes', 'Sementes', 'Medicamentos', 'Equipamentos', 'Combustíveis', 'Lubrificantes', 'EPI', 'Materiais de Construção'));;
