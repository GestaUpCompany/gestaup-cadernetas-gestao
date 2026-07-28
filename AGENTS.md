# Memória do projeto

## Fazenda de testes (regra obrigatória)

Qualquer teste que envolva dados de fazenda no Supabase (RPC, inserts, updates, recategorização, snapshots, seeds) deve usar **exclusivamente** a fazenda de id `d649c65e-16ab-4b77-a84b-df937aa41cc3` (Fazenda Gesta'Up, acesso `gestaup`).

Não executar mutações contra outras fazendas do banco, nem mesmo em transações com ROLLBACK, sem autorização explícita do usuário. Migrations de schema (CREATE TABLE, ALTER, índices, policies) valem para todo o banco por natureza e seguem normalmente.

Disparador: antes de rodar qualquer SQL que toque dados de `lote_categorias`, `planos_nutricionais`, `formulacoes`, `faixas_categorias`, `lote_categorias_transicoes`, ou qualquer tabela com `fazenda_id`, filtrar por `fazenda_id = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'` ou usar lotes/formulações pertencentes a essa fazenda.

## Pastos ↔ Bebedouros: fase 2 (obrigatoriedade)

Estado atual (fase 1 concluída em 2026-07-23):
- Relação migrada de JSONB (`pastos.bebedouros`) para tabela de junção `pasto_bebedouros(pasto_id, bebedouro_id)` com FK e RLS.
- Coluna JSONB `pastos.bebedouros` mantida no banco por segurança (não é mais escrita pelo app), mas pode ser dropada depois de confirmar estabilidade.
- UI do `Pastos.tsx` mostra o MultiSelect de bebedouros sempre (não mais condicionado a `fonte_agua_principal === 'Bebedouro'`).
- Associação está **opcional** nesta fase.

Pontos de atenção para a fase 2 (tornar bebedouro obrigatório no pasto):
1. Adicionar validação no `handleSubmit` do `Pastos.tsx` exigindo `selectedBebedouros.length > 0`.
2. Decidir se a obrigatoriedade será só em app-level ou também com constraint no banco. Constraint em DB é mais robusto mas exige backfill dos 1141 pastos antes de ligar.
3. Regularizar o passivo: 1141 dos 1145 pastos ativos estão sem bebedouro associado. Antes de ligar a obrigatoriedade, gerar relatório/lista dos pastos sem bebedouro para o usuário ir associando aos poucos.
4. Visão reversa opcional: `BebedourosCadastro.tsx`/`BebedourosDetalhes.tsx` ainda não mostram a qual pasto cada bebedouro pertence; agora que a junction existe, fica trivial adicionar.

Disparador: quando o usuário mencionar "bebedouro obrigatório", "fase 2 bebedouros", "tornar bebedouro obrigatório no pasto", ou retomar o assunto pasto↔bebedouro, lembrar estes pontos.

## Cronologia evolutiva do rebanho (faixas de categorias por peso)

Plano aprovado em 2026-07-24, aguardando implementação.

Tabela de faixas padrão:
- Bezerro ao pé: 30-180 kg
- Bezerra ao pé: 30-170 kg
- Bezerro: 180-300 kg
- Bezerra: 170-280 kg
- Novilha: 280-420 kg
- Garrote: 300-420 kg
- Boi Magro: 420-500 kg
- Boi Gordo: acima de 500 kg
- Vaca: acima de 420 kg
- Touro: acima de 650 kg

Decisões tomadas:
1. **Posicionamento**: página standalone sob "Gestão da Fazenda" (`/controller/faixas-categorias`), quarto item do submenu (Lotes, Indivíduos, Cadastros Auxiliares, Faixas de Categorias).
2. **Escopo da tela**: edição de faixas + visualização da cronologia evolutiva como fluxo/linha do tempo, separado por sexo (machos: bezerro ao pé → bezerro → garrote → boi magro → boi gordo; fêmeas: bezerra ao pé → bezerra → novilha → vaca; touro isolado). Tudo numa página só.
3. **Modelo de dados**: tabela nova `faixas_categorias` com `fazenda_id, nome, sexo, peso_min, peso_max, ordem, ativo, cor`, unique em `(fazenda_id, nome)`. Defaults seedados para toda fazenda. A tabela `categorias` existente (3 registros vestigiais, sem faixas, sem consumidores) não é tocada.
4. **Hardcoded**: o array `categoriasOpcoes` no `Lotes.tsx` (linha 181) permanece intacto por enquanto. Substituição pela leitura da nova tabela acontece depois de o usuário validar a tela, numa fase posterior.
5. **Tropa**: desconsiderada nesta tela. Fica no hardcoded do Lotes.tsx e será removida ou tratada separadamente depois.
6. **Validação de continuidade**: a UI deve validar que não há gap nem sobreposição entre categorias consecutivas da mesma cadeia de sexo.

Disparador: quando o usuário mencionar "cronologia do rebanho", "faixas de categorias", "faixas de peso", "cronologia evolutiva", ou pedir para implementar a tela de categorias por peso, lembrar este plano.

### Destino do lote (corte vs reprodução) — adicionado em 2026-07-24

Pesquisa web (Embrapa, DeHeus, Rehagro, Canal Rural) confirmou que sistema_producao e destino são eixos ortogonais:
- **sistema_producao** determina onde o lote entra/sai na cronologia (trecho do fluxo).
- **destino** determina o terminal (boi gordo para abate, touro para reprodução).

Decisões:
1. **Campo novo `destino` no lotes** (valores: "corte"/"reprodução"), independente de sistema_producao. Não substitui nem reutiliza sistema_producao.
2. **Obrigatório em novos/edições**. Lotes existentes ficam sem destino até serem editados (não bloqueia, cronologia não aparece até preencher).
3. **Fêmeas têm cronologia única** (bezerra ao pé → bezerra → novilha → vaca), sem bifurcar por destino.
4. **Machos bifurcam**: corte termina em boi gordo (→ abate), reprodução termina em touro.
5. **Default inteligente por sistema**: Engorda/TIP/Confinamento-terminação → corte; Cria → reprodução; Recria/RIP/Sequestro → sem default (usuário decide). Default é sugerido, não travado.

Tabela combinatória machos (sistema × destino → entrada/saída na cronologia):
- Cria + qualquer destino: bezerro ao pé → bezerro (venda desmama)
- Recria + corte: bezerro → boi magro
- Recria + reprodução: bezerro → garrote (→ touro)
- Engorda + corte (obrigatório): boi magro → boi gordo
- Confinamento + corte: boi magro → boi gordo
- Confinamento + reprodução: novilha (cobrição)
- RIP + corte: bezerro → boi magro (acelerado)
- RIP + reprodução: bezerro → garrote (acelerado → touro)
- Sequestro + corte: bezerro → boi magro
- Sequestro + reprodução: bezerro → garrote
- TIP + corte (obrigatório): boi magro → boi gordo

Tabela fêmeas (cronologia única, sistema define entrada/saída):
- Cria: bezerra ao pé → bezerra (venda) ou vaca (matriz)
- Recria: bezerra → novilha
- Engorda/TIP/Confinamento: novilha → vaca (descarte)

Disparador: quando o usuário mencionar "destino do lote", "corte vs reprodução", "finalidade do lote", ou retomar a discussão de cronologia, lembrar estas decisões.

### Plano de implementação da cronologia + recategorização — adicionado em 2026-07-27

Implementação concluída em 2026-07-27. Resumo do que foi feito:

1. **Migration Parte A**: `lote_categorias` ganhou `data_fim` e `categoria_origem_id`; criada `lote_categorias_transicoes` com RLS, índices e snapshot jsonb.
2. **Migration Parte B**: `formulacoes` ganhou `categoria_inferida_automaticamente` (bool) e `categoria_inferida_observacao` (text); 36 formulações ativas sem categoria foram backfilled com inferência por peso/nome/sistema; 10 marcadas com observação de revisão prioritária.
3. **Cron `update_dados_lotes`**: reescrito com `AND lc.data_fim IS NULL` no cursor e no UPDATE, para não corromper snapshots. Testado em produção sem erros.
4. **UI do backfill**: `Formulacoes.tsx` mostra caixa amarela acima do select de categoria quando a flag está true; `Dashboard.tsx` mostra seção de avisos listando formulações da fazenda com categoria a confirmar, com links `?edit=<id>`. Hook `useFormulacoesBackfillAlert` em `useDashboardQueries.ts`. Ao salvar, flag é zerada e aviso desaparece.
5. **UI da cronologia + recategorização**: nova página `/controller/faixas-categorias` (componente `FaixasCategorias.tsx`), item "Faixas de Categorias" no menu "Gestão da Fazenda" do `ControllerLayout`. Página tem: edição de faixas por sexo (M/F), visualização da cronologia de cada lote como linha do tempo com cores, histórico de transições, botão "Recategorizar" que abre modal com Opção 2 (continuar com formulação atual vs trocar, seletor em soft mode com separador, aviso não-bloqueante se peso fora da faixa). RPC `recategorizar_lote_categoria(uuid, text, boolean, uuid, uuid, text)` executa a transação: encerra origem, encerra plano via `encerrar_plano_nutricional`, cria nova `lote_categoria`, cria novo plano nutricional, registra auditoria em `lote_categorias_transicoes` com snapshot.
6. **Seed de `faixas_categorias`**: tabela criada com defaults para todas as fazendas existentes e trigger `trg_seed_faixas_categorias` para novas fazendas. Defaults: Bezerro ao Pé (0-120), Bezerro/Bezerra (120-210), Garrote (210-360), Novilha (210-330), Boi Magro (360-450), Boi Gordo (450-520), Touro (450-700), Vaca (330-600).

Aprovação original: "Pode começar" em 2026-07-27. Typecheck e build passaram.

**Princípio de simplificação:** inteligência fica na visualização (camada 1), não na automação (camada 3). Recategorização é sempre manual, com clique explícito do usuário. Camada 2 (sugestão de "X animais acima de Y kg") está fora porque nem toda fazenda identifica indivíduos.

**Passo 1 — Migration Parte A (auditoria e snapshot):**
- `lote_categorias`: adicionar `data_fim` (timestamptz, nullable) e `categoria_origem_id` (uuid, FK para `lote_categorias.id`, nullable).
- Tabela nova `lote_categorias_transicoes` com `id, fazenda_id, lote_id, lote_categoria_origem_id, lote_categoria_destino_id, categoria_origem, categoria_destino, peso_na_transicao_kg, data_transicao, motivo ('manual'|'sugestao'), usuario_id, snapshot_jsonb`.
- Passivo: `lote_categorias` existentes ficam com `data_fim=NULL` e `categoria_origem_id=NULL`.

**Passo 2 — Migration Parte B (backfill de formulações):**
- `formulacoes`: adicionar `categoria_inferida_automaticamente` (bool, default false) e `categoria_inferida_observacao` (text, nullable).
- Backfill das 36 formulações ativas sem categoria, com inferência por `peso_vivo_medio` + `nome` + `sistema_producao`. Tabela de inferências completa registrada (bezerro/garrote/boi magro/vaca conforme o caso; 5 de confiança baixa/média marcadas com `categoria_inferida_observacao`).
- Novas formulações cadastradas pelo usuário sempre nascem com `categoria_inferida_automaticamente=false`.

**Passo 3 — Ajuste do cron `update_dados_lotes`:**
- Adicionar `AND lc.data_fim IS NULL` no WHERE do cursor que itera sobre `lote_categorias`.
- Ponto mais sensível: sem isso o cron corrompe o snapshot silenciosamente. Merece teste explícito.
- Função atual localizada: é `SECURITY DEFINER`, plpgsql, itera sobre categorias com plano nutricional ativo e projeta peso. Já tem lógica que respeita `data_ajuste_peso` e migra planos por peso.

**Passo 4 — UI do backfill:**
- `Formulacoes.tsx`: caixa amarela acima do select de categoria quando `categoria_inferida_automaticamente=true`, mostrando `categoria_inferida_observacao` se houver. Ao salvar, setar flag=false junto com a categoria informada.
- `Dashboard.tsx` (controller): seção de avisos no topo listando "N formulações com categoria a confirmar", filtrado por `fazenda_id` do usuário, com nomes clicáveis que levam à edição da formulação. Consulta: `SELECT id, nome FROM formulacoes WHERE fazenda_id=? AND ativo=true AND categoria_inferida_automaticamente=true`.
- Aviso desaparece quando a flag é zerada (única fonte de verdade).

**Passo 5 — UI da cronologia + recategorização (Opção 2):**
- Tela `/controller/faixas-categorias` em "Gestão da Fazenda": edição das faixas + visualização da cronologia como fluxo (sexo + sistema_producao + destino).
- Botão "Recategorizar" na cronologia do lote. Modal mostra origem, destino, peso, data, e rádio "Continuar com formulação atual" (default) vs "Trocar formulação".
- Se "Trocar": seletor de formulações em soft mode (categoria destino primeiro, separador, depois outras).
- Aviso não-bloqueante se peso atual estiver fora da faixa da categoria destino.
- Execução em transação: encerra `lote_categoria` antiga (`data_fim=now()`), encerra plano nutricional ativo via RPC `encerrar_plano_nutricional`, insere nova `lote_categorias` copiando dados operacionais com `categoria_origem_id` e `peso_entrada_kg_cab = peso_vivo_atual_kg_cab` da origem, `data_ajuste_peso=NULL`, insere novo `planos_nutricionais` (copiando do anterior ou com nova formulacao_id), insere auditoria em `lote_categorias_transicoes` com snapshot jsonb.

Disparador: quando for retomar a implementação da cronologia, recategorização ou backfill de formulações, ler este plano antes de começar.


ATENÇÃO: QUALQUER TESTE A SER FEITO EM UMA FAZENDA, FAÇA SOMENTE NA FAZENDA DE ID d649c65e-16ab-4b77-a84b-df937aa41cc3
