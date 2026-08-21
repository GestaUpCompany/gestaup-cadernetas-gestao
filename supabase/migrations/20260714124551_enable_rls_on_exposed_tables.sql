-- Habilitar RLS nas 13 tabelas identificadas com RLS desabilitado
ALTER TABLE public.dispositivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacao_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_limpezas_bebedouros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saida_insumos_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrada_insumos_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_backup_20260526 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos_pastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotacao_pastos ENABLE ROW LEVEL SECURITY;

-- dispositivos
DROP POLICY IF EXISTS "Users can manage farm dispositivos records" ON public.dispositivos;
DROP POLICY IF EXISTS "Users can view farm dispositivos records" ON public.dispositivos;
CREATE POLICY "Users can manage farm dispositivos records" ON public.dispositivos FOR ALL TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));
CREATE POLICY "Users can view farm dispositivos records" ON public.dispositivos FOR SELECT TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));

-- sync_queue
DROP POLICY IF EXISTS "Users can manage farm sync_queue records" ON public.sync_queue;
DROP POLICY IF EXISTS "Users can view farm sync_queue records" ON public.sync_queue;
CREATE POLICY "Users can manage farm sync_queue records" ON public.sync_queue FOR ALL TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));
CREATE POLICY "Users can view farm sync_queue records" ON public.sync_queue FOR SELECT TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));

-- conflitos
DROP POLICY IF EXISTS "Users can manage farm conflitos records" ON public.conflitos;
DROP POLICY IF EXISTS "Users can view farm conflitos records" ON public.conflitos;
CREATE POLICY "Users can manage farm conflitos records" ON public.conflitos FOR ALL TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));
CREATE POLICY "Users can view farm conflitos records" ON public.conflitos FOR SELECT TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));

-- audit_log
DROP POLICY IF EXISTS "Users can manage farm audit_log records" ON public.audit_log;
DROP POLICY IF EXISTS "Users can view farm audit_log records" ON public.audit_log;
CREATE POLICY "Users can manage farm audit_log records" ON public.audit_log FOR ALL TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));
CREATE POLICY "Users can view farm audit_log records" ON public.audit_log FOR SELECT TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));

-- movimentacao_estoque
DROP POLICY IF EXISTS "Users can manage farm movimentacao_estoque records" ON public.movimentacao_estoque;
DROP POLICY IF EXISTS "Users can view farm movimentacao_estoque records" ON public.movimentacao_estoque;
CREATE POLICY "Users can manage farm movimentacao_estoque records" ON public.movimentacao_estoque FOR ALL TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));
CREATE POLICY "Users can view farm movimentacao_estoque records" ON public.movimentacao_estoque FOR SELECT TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));

-- historico_limpezas_bebedouros
DROP POLICY IF EXISTS "Authenticated delete historico_limpezas_bebedouros" ON public.historico_limpezas_bebedouros;
DROP POLICY IF EXISTS "Authenticated insert historico_limpezas_bebedouros" ON public.historico_limpezas_bebedouros;
DROP POLICY IF EXISTS "Authenticated select historico_limpezas_bebedouros" ON public.historico_limpezas_bebedouros;
DROP POLICY IF EXISTS "Authenticated update historico_limpezas_bebedouros" ON public.historico_limpezas_bebedouros;
DROP POLICY IF EXISTS "Users can manage farm historico_limpezas_bebedouros records" ON public.historico_limpezas_bebedouros;
DROP POLICY IF EXISTS "Users can view farm historico_limpezas_bebedouros records" ON public.historico_limpezas_bebedouros;
CREATE POLICY "Users can manage farm historico_limpezas_bebedouros records" ON public.historico_limpezas_bebedouros FOR ALL TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));
CREATE POLICY "Users can view farm historico_limpezas_bebedouros records" ON public.historico_limpezas_bebedouros FOR SELECT TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));

-- notificacoes
DROP POLICY IF EXISTS "Users can manage farm notificacoes records" ON public.notificacoes;
DROP POLICY IF EXISTS "Users can view farm notificacoes records" ON public.notificacoes;
CREATE POLICY "Users can manage farm notificacoes records" ON public.notificacoes FOR ALL TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));
CREATE POLICY "Users can view farm notificacoes records" ON public.notificacoes FOR SELECT TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));

-- saved_filters
DROP POLICY IF EXISTS "Users can manage own saved_filters" ON public.saved_filters;
DROP POLICY IF EXISTS "Users can view own saved_filters" ON public.saved_filters;
CREATE POLICY "Users can manage own saved_filters" ON public.saved_filters FOR ALL TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "Users can view own saved_filters" ON public.saved_filters FOR SELECT TO authenticated USING (usuario_id = auth.uid());

-- entrada_insumos_itens
DROP POLICY IF EXISTS "Users can manage farm entrada_insumos_itens records" ON public.entrada_insumos_itens;
DROP POLICY IF EXISTS "Users can view farm entrada_insumos_itens records" ON public.entrada_insumos_itens;
CREATE POLICY "Users can manage farm entrada_insumos_itens records" ON public.entrada_insumos_itens FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.registros_entrada_insumos re WHERE re.id = entrada_insumos_itens.entrada_id AND re.fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true)));
CREATE POLICY "Users can view farm entrada_insumos_itens records" ON public.entrada_insumos_itens FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.registros_entrada_insumos re WHERE re.id = entrada_insumos_itens.entrada_id AND re.fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true)));

-- saida_insumos_itens
DROP POLICY IF EXISTS "Users can manage farm saida_insumos_itens records" ON public.saida_insumos_itens;
DROP POLICY IF EXISTS "Users can view farm saida_insumos_itens records" ON public.saida_insumos_itens;
CREATE POLICY "Users can manage farm saida_insumos_itens records" ON public.saida_insumos_itens FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.registros_saida_insumos rs WHERE rs.id = saida_insumos_itens.saida_id AND rs.fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true)));
CREATE POLICY "Users can view farm saida_insumos_itens records" ON public.saida_insumos_itens FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.registros_saida_insumos rs WHERE rs.id = saida_insumos_itens.saida_id AND rs.fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true)));

-- lotes_backup_20260526
DROP POLICY IF EXISTS "Users can manage farm lotes_backup_20260526 records" ON public.lotes_backup_20260526;
DROP POLICY IF EXISTS "Users can view farm lotes_backup_20260526 records" ON public.lotes_backup_20260526;
CREATE POLICY "Users can manage farm lotes_backup_20260526 records" ON public.lotes_backup_20260526 FOR ALL TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));
CREATE POLICY "Users can view farm lotes_backup_20260526 records" ON public.lotes_backup_20260526 FOR SELECT TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));

-- modulos_pastos
DROP POLICY IF EXISTS "Usuários podem atualizar módulos de suas fazendas" ON public.modulos_pastos;
DROP POLICY IF EXISTS "Usuários podem excluir módulos de suas fazendas" ON public.modulos_pastos;
DROP POLICY IF EXISTS "Usuários podem inserir módulos em suas fazendas" ON public.modulos_pastos;
DROP POLICY IF EXISTS "Usuários podem ver módulos de suas fazendas" ON public.modulos_pastos;
DROP POLICY IF EXISTS "Users can manage farm modulos_pastos records" ON public.modulos_pastos;
DROP POLICY IF EXISTS "Users can view farm modulos_pastos records" ON public.modulos_pastos;
CREATE POLICY "Users can manage farm modulos_pastos records" ON public.modulos_pastos FOR ALL TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));
CREATE POLICY "Users can view farm modulos_pastos records" ON public.modulos_pastos FOR SELECT TO authenticated USING (fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true));

-- rotacao_pastos
DROP POLICY IF EXISTS "Usuários podem atualizar rotações em módulos de suas fazend" ON public.rotacao_pastos;
DROP POLICY IF EXISTS "Usuários podem excluir rotações em módulos de suas fazendas" ON public.rotacao_pastos;
DROP POLICY IF EXISTS "Usuários podem inserir rotações em módulos de suas fazendas" ON public.rotacao_pastos;
DROP POLICY IF EXISTS "Usuários podem ver rotações de módulos de suas fazendas" ON public.rotacao_pastos;
DROP POLICY IF EXISTS "Users can manage farm rotacao_pastos records" ON public.rotacao_pastos;
DROP POLICY IF EXISTS "Users can view farm rotacao_pastos records" ON public.rotacao_pastos;
CREATE POLICY "Users can manage farm rotacao_pastos records" ON public.rotacao_pastos FOR ALL TO authenticated USING (modulo_id IN (SELECT mp.id FROM public.modulos_pastos mp WHERE mp.fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true)));
CREATE POLICY "Users can view farm rotacao_pastos records" ON public.rotacao_pastos FOR SELECT TO authenticated USING (modulo_id IN (SELECT mp.id FROM public.modulos_pastos mp WHERE mp.fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true)));;
