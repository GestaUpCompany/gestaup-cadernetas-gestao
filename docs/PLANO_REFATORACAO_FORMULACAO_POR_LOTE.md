# Plano de Refatoração: Formulação atrelada ao Lote (em vez da Categoria)

**Data:** 2026-08-20
**Fazenda de testes:** `d649c65e-16ab-4b77-a84b-df937aa41cc3` (Fazenda Gesta'Up)
**Objetivo:** Mover o eixo de vinculação de formulação de `lote_categorias` para `lotes`, com fila de formulações, GMD por categoria da formulação, versionamento, snapshots e regras de transição de planos.

**Estratégia:** Big-bang. Branch do Supabase + localhost para validar tudo antes de promover. Sem coexistência com painel legado. O PWA só lê nome de formulação (não escreve em tabelas de fórmula/plano), então big-bang é seguro para o app mobile.

---

## 1. Estado atual (auditoria realizada em 2026-08-20)

### 1.1 Onde a formulação se conecta hoje

| Tabela | Coluna | Papel | Quem escreve |
|--------|--------|-------|--------------|
| `lote_categorias` | `formulacao_id` (uuid, FK `ON DELETE SET NULL`) | Vincula formulação à categoria do lote | `Lotes.tsx` (por categoria), `recategorizar_lote_categoria` RPC |
| `planos_nutricionais` | `formulacao_id` + `gmd_planejado` | Carrega a formulação na evolução de peso | `PlanoNutricionalModal.tsx`, RPCs de migração |
| `formulacoes` | `gmd` (numeric) | GMD único por formulação | `Formulacoes.tsx` (input livre) |
| `lote_categorias` | `gmd` (text) | GMD efetivo materializado pelo cron | Cron `update_dados_lotes()` |
| `lotes` | — | **Não existe** `formulacao_id` em `lotes` | — |
| `formulacoes` | — | **Não existe** `versao` | — |
| — | — | **Não existe** `formulacoes_historico` | — |

Migration de origem da FK em `lote_categorias`: `20250702080000_adicionar_fk_formulacao_lote_categorias_e_fluxo_estrategia_individuos.sql`.

### 1.2 Cron e triggers que dependem da cadeia formulação → GMD → peso

- **Cron `update-peso-vivo-daily`** (04:00 UTC, ajustado em `20260824120000`): executa `update_dados_lotes()`, faz JOIN `planos_nutricionais` → `formulacoes` e projeta `peso_vivo_atual_kg_cab` usando `COALESCE(pn.gmd_planejado, f.gmd)`. Escreve o resultado em `lote_categorias.gmd`.
- **Trigger `trg_lote_categorias_propagar_estrategia`** (AFTER UPDATE em `lote_categorias`): propaga `formulacao_id` para `individuos.estrategia_nutricional_id` / `gmd_kg_cab_dia`.
- **Trigger em `formulacoes`** (AFTER UPDATE OF `gmd`): recalcula `peso_vivo_kg` em `registros_suplementacao` para lotes cujo plano ativo tem `gmd_planejado IS NULL`.
- **RPC `recategorizar_lote_categoria`**: copia `formulacao_id` do plano ativo para a nova categoria; encerra plano via `encerrar_plano_nutricional` e cria novo plano por categoria.
- **Trigger `fn_ensure_categoria_bezerro_ao_pe`** (AFTER INSERT em `registros_maternidade`): cria `lote_categorias` de "Bezerro ao Pé"/"Bezerra ao Pé" automaticamente, sem GMD.

### 1.3 Frontend que lê/escreve a estrutura atual

- `Formulacoes.tsx`: input livre de `gmd` (linha 342), salva em `formulacoes.gmd`.
- `Lotes.tsx`: carrega `formulacoes` por fazenda (linha 263), seleciona `formulacao_id` **por categoria** e persiste em `lote_categorias.formulacao_id` (linhas 1230, 1318, 3373).
- `PlanoNutricionalModal.tsx`: lista `formulacoes` por fazenda e vincula ao plano da categoria.
- **PWA**: só interage com `registros_*`. Lê nome da formulação via `planos_nutricionais.formulacao_id` → `formulacoes.nome`. Não escreve em `formulacoes`, `lote_categorias.formulacao_id` ou `planos_nutricionais`.

### 1.4 Confirmação: `lote_categorias.gmd` é a fonte de verdade para backfill

O cron `update_dados_lotes()` escreve `lote_categorias.gmd` com `COALESCE(pn.gmd_planejado, f.gmd)` (linhas 94-101 de `20260731100000_gmd_planejado_como_fonte_principal.sql`). É o GMD real, materializado, por categoria. Melhor fonte para backfill da nova tabela `formulacao_categorias_gmd` que `formulacoes.gmd` (valor único por formulação) ou `planos_nutricionais.gmd_planejado` (pode ser NULL).

---

## 2. Princípio orientador

**Big-bang com validação em branch.** A nova arquitetura substitui a antiga num único deploy coordenado (migrations + frontend + PWA). Tudo é validado na branch do Supabase com dados reais de prod antes de promover. As colunas antigas (`formulacoes.gmd`, `lote_categorias.formulacao_id`, `planos_nutricionais.formulacao_id`) são mantidas no banco por segurança mas deixam de ser escritas; serao dropadas na fase de corte após confirmação de estabilidade.

O PWA é só-leitura nas tabelas de formulação/plano, então não há risco de quebra durante a transição. O PWA antigo continua lendo das colunas antigas (que permanecem com dados existentes); o PWA atualizado passa a ler de `lotes.formulacao_id`.

---

## 3. Segurança e estratégia de teste

### 3.1 Branch-first

Com branch do Supabase disponível (upgrade confirmado em 2026-08-20), toda a validação acontece na branch:

1. Criar branch a partir do projeto prod (snapshot de dados reais).
2. Aplicar todas as migrations na branch.
3. Apontar painel novo (dev) e PWA (dev) para a URL da branch.
4. Validar coexistência, cron, triggers, features novas.
5. Promover para prod só depois de todos os critérios de sucesso passarem.

### 3.2 O que a branch protege

- Cron `update_dados_lotes()` reescrito: testado contra snapshot de prod, sem risco de afetar clientes reais.
- Triggers novas: exercitadas com writes de qualquer fazenda do snapshot.
- Backfill de dados: validado contra dados reais antes de promover.
- Features do painel/PWA: testadas contra a branch, sem tocar prod.

### 3.3 Pontos de atenção na branch

- A branch é um snapshot pontual. Dados gravados em prod após a criação não aparecem na branch. Se a validação durar muitos dias, considerar recriar a branch.
- O `pg_cron` pode ou não ser copiado para a branch. Verificar se o schedule veio; se não, executar `SELECT update_dados_lotes()` manualmente.
- Backup pontual de prod (`pg_dump` das tabelas `lotes`, `lote_categorias`, `planos_nutricionais`, `formulacoes`, `registros_suplementacao`) antes de promover, como rede de segurança.

### 3.4 PWA na transição

O PWA só lê nome de formulação via `planos_nutricionais.formulacao_id` → `formulacoes.nome`. Não escreve em tabelas de formulação/plano. Durante o big-bang:
- As colunas antigas permanecem no banco com dados existentes.
- O PWA antigo continua funcionando (lê das colunas antigas, mostra nome stale para lotes novos até o usuário atualizar o app).
- O PWA atualizado passa a ler de `lotes.formulacao_id` → `formulacoes.nome`.
- Não há risco de quebra ou corrupção de dados.

---

## 4. Plano de migrations (big-bang)

### Regras gerais

1. Migrations idempotentes (`IF NOT EXISTS`) para poder re-aplicar entre branch e prod.
2. Colunas novas são nullable ou com default não-destrutivo.
3. Backfill de dados usando `lote_categorias.gmd` como fonte de verdade (item 1.4).
4. Sem triggers de sincronização write-through (não há coexistência com legado).
5. Sem `COALESCE` em camadas no cron (rewrite puro para a nova estrutura).

### Migration A — `lotes.formulacao_id` (FK da fila, índice [0])

```sql
ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS formulacao_id uuid;

ALTER TABLE public.lotes
  DROP CONSTRAINT IF EXISTS lotes_formulacao_id_fkey;

ALTER TABLE public.lotes
  ADD CONSTRAINT lotes_formulacao_id_fkey
  FOREIGN KEY (formulacao_id)
  REFERENCES public.formulacoes(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lotes_formulacao_id
  ON public.lotes(formulacao_id)
  WHERE formulacao_id IS NOT NULL;
```

**Backfill:** para cada lote ativo, setar `formulacao_id` com a formulação do plano vigente. Se o lote tem categorias com planos vigentes de formulações diferentes, o plano mais antigo (menor `data_inicio`) vence; os demais são normalizados na Migration H.

```sql
UPDATE public.lotes l
SET formulacao_id = sub.formulacao_id
FROM (
  SELECT lc.lote_id, pn.formulacao_id
  FROM public.lote_categorias lc
  JOIN public.planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
  WHERE lc.ativo = true AND lc.data_fim IS NULL
    AND pn.formulacao_id IS NOT NULL
  ORDER BY pn.data_inicio ASC
  -- DISTINCT ON (lc.lote_id) para pegar o plano mais antigo por lote
) sub
WHERE l.id = sub.lote_id
  AND l.formulacao_id IS NULL;
```

### Migration B — Tabela de GMD por categoria da formulação

```sql
CREATE TABLE IF NOT EXISTS public.formulacao_categorias_gmd (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulacao_id uuid NOT NULL REFERENCES public.formulacoes(id) ON DELETE CASCADE,
  categoria text NOT NULL,
  gmd numeric(8,3) NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT formulacao_categorias_gmd_unique UNIQUE (formulacao_id, categoria)
);

ALTER TABLE public.formulacao_categorias_gmd ENABLE ROW LEVEL SECURITY;

-- RLS: peão só vê/edita GMDs de formulações da sua fazenda
CREATE POLICY formulacao_categorias_gmd_select_fazenda
  ON public.formulacao_categorias_gmd FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.formulacoes f
      WHERE f.id = formulacao_id
        AND f.fazenda_id = (
          SELECT uf.fazenda_id FROM public.usuario_fazenda uf
          WHERE uf.auth_id = auth.uid() LIMIT 1
        )
    )
  );

-- (repetir para INSERT/UPDATE/DELETE)

CREATE INDEX IF NOT EXISTS idx_formulacao_categorias_gmd_form
  ON public.formulacao_categorias_gmd(formulacao_id);
```

**Sem trigger de agregação para `formulacoes.gmd`.** Na abordagem big-bang, `formulacoes.gmd` deixa de ser a fonte de verdade. O cron é reescrito (Migration E) para ler de `formulacao_categorias_gmd` diretamente. A coluna `formulacoes.gmd` permanece no banco com o valor antigo para referência, mas não é mais lida pelo cron.

**Backfill usando `lote_categorias.gmd` como fonte de verdade:**

```sql
-- Para cada lote_categorias ativa com GMD e formulação (direta ou via plano),
-- inserir (formulacao_id, categoria, gmd) na nova tabela.
-- Em caso de conflito (mesma formulação + categoria com GMDs diferentes),
-- preferir o GMD do plano com gmd_planejado não-NULL; em empate, pegar qualquer um.
INSERT INTO public.formulacao_categorias_gmd (formulacao_id, categoria, gmd, ordem)
SELECT DISTINCT ON (formulacao_id, categoria)
  COALESCE(lc.formulacao_id, pn.formulacao_id) AS formulacao_id,
  lc.categoria,
  COALESCE(pn.gmd_planejado, NULLIF(lc.gmd,'')::numeric, f.gmd) AS gmd,
  0 AS ordem
FROM public.lote_categorias lc
LEFT JOIN public.planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
LEFT JOIN public.formulacoes f ON f.id = COALESCE(lc.formulacao_id, pn.formulacao_id)
WHERE lc.ativo = true AND lc.data_fim IS NULL
  AND COALESCE(lc.formulacao_id, pn.formulacao_id) IS NOT NULL
  AND lc.categoria IS NOT NULL
  AND lc.categoria NOT IN ('Tropa', 'Bezerro ao pé', 'Bezerra ao pé', 'Bezerro ao Pé', 'Bezerra ao Pé')
  AND COALESCE(pn.gmd_planejado, NULLIF(lc.gmd,'')::numeric, f.gmd) IS NOT NULL
ORDER BY formulacao_id, categoria, (pn.gmd_planejado IS NOT NULL) DESC
ON CONFLICT (formulacao_id, categoria) DO NOTHING;
```

### Migration C — `formulacoes.versao` + `formulacoes_historico` + trigger BEFORE UPDATE

```sql
ALTER TABLE public.formulacoes
  ADD COLUMN IF NOT EXISTS versao integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.formulacoes_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulacao_id uuid NOT NULL,
  versao_snapshot integer NOT NULL,
  snapshot_jsonb jsonb NOT NULL,
  alterado_em timestamptz NOT NULL DEFAULT now(),
  alterado_por uuid
);

CREATE INDEX IF NOT EXISTS idx_formulacoes_historico_form
  ON public.formulacoes_historico(formulacao_id, versao_snapshot DESC);

CREATE OR REPLACE FUNCTION public.fn_snapshot_formulacao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  -- Só snapshot+incrementa quando campos relevantes mudam
  IF row_to_json(NEW)::jsonb - 'updated_at' - 'versao'
     IS DISTINCT FROM
     row_to_json(OLD)::jsonb - 'updated_at' - 'versao' THEN
    INSERT INTO public.formulacoes_historico (formulacao_id, versao_snapshot, snapshot_jsonb, alterado_por)
    VALUES (OLD.id, OLD.versao, to_jsonb(OLD), NULL);
    NEW.versao := OLD.versao + 1;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_snapshot_formulacao ON public.formulacoes;
CREATE TRIGGER trg_snapshot_formulacao
  BEFORE UPDATE ON public.formulacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_snapshot_formulacao();
```

**Semântica do enunciado** ("se o update for bem-sucedido, incrementa a versão principal"): em PostgreSQL, o `BEFORE UPDATE` incrementa dentro da mesma transação; se a transação falhar, o insert no histórico e o incremento caem juntos (rollback atômico). Isso já satisfaz "só incrementa se bem-sucedido".

### Migration D — Sincronização `lotes.formulacao_id` → `lote_categorias.gmd`

Na abordagem big-bang, esta trigger é a fonte principal de GMD para `lote_categorias`. Quando `lotes.formulacao_id` muda, ou quando o GMD por categoria da formulação muda, o `lote_categorias.gmd` é atualizado via match.

```sql
CREATE OR REPLACE FUNCTION public.sync_gmd_lote_categorias()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  IF NEW.formulacao_id IS DISTINCT FROM OLD.formulacao_id OR TG_OP = 'INSERT' THEN
    -- Limpa GMD de categorias que não estão na nova formulação
    UPDATE public.lote_categorias lc
      SET gmd = NULL
      WHERE lc.lote_id = NEW.id
        AND lc.ativo = true AND lc.data_fim IS NULL
        AND LOWER(TRIM(lc.categoria)) NOT IN ('bezerro ao pé','bezerro ao pe','bezerra ao pé','bezerra ao pe')
        AND NOT EXISTS (
          SELECT 1 FROM public.formulacao_categorias_gmd fcg
          WHERE fcg.formulacao_id = NEW.formulacao_id
            AND LOWER(TRIM(fcg.categoria)) = LOWER(TRIM(lc.categoria))
        );

    -- Seta GMD das categorias que estão na formulação
    UPDATE public.lote_categorias lc
      SET gmd = fcg.gmd::text
      FROM public.formulacao_categorias_gmd fcg
      WHERE lc.lote_id = NEW.id
        AND lc.ativo = true AND lc.data_fim IS NULL
        AND fcg.formulacao_id = NEW.formulacao_id
        AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(fcg.categoria));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_lotes_sync_gmd_categorias ON public.lotes;
CREATE TRIGGER trg_lotes_sync_gmd_categorias
  AFTER INSERT OR UPDATE OF formulacao_id ON public.lotes
  FOR EACH ROW EXECUTE FUNCTION public.sync_gmd_lote_categorias();
```

Trigger complementar em `formulacao_categorias_gmd` para repropagar quando o GMD por categoria muda:

```sql
CREATE OR REPLACE FUNCTION public.repropagar_gmd_para_lotes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE v_form_id uuid;
BEGIN
  v_form_id := COALESCE(NEW.formulacao_id, OLD.formulacao_id);
  UPDATE public.lote_categorias lc
    SET gmd = fcg.gmd::text
    FROM public.formulacao_categorias_gmd fcg
    WHERE lc.ativo = true AND lc.data_fim IS NULL
      AND fcg.formulacao_id = v_form_id
      AND LOWER(TRIM(lc.categoria)) = LOWER(TRIM(fcg.categoria))
      AND EXISTS (
        SELECT 1 FROM public.lotes l
        WHERE l.id = lc.lote_id AND l.formulacao_id = v_form_id
      );
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_formulacao_categorias_gmd_repropaga ON public.formulacao_categorias_gmd;
CREATE TRIGGER trg_formulacao_categorias_gmd_repropaga
  AFTER INSERT OR UPDATE OF gmd OR DELETE ON public.formulacao_categorias_gmd
  FOR EACH ROW EXECUTE FUNCTION public.repropagar_gmd_para_lotes();
```

### Migration E — Cron `update_dados_lotes` rewrite puro

O cron passa a ler o GMD de `lote_categorias.gmd` (materializado pela Migration D) em vez de `COALESCE(pn.gmd_planejado, f.gmd)`. O JOIN com `planos_nutricionais` permanece para pegar `data_inicio`, `peso_inicio_kg_cab`, etc., mas o GMD vem de `lc.gmd`.

```sql
CREATE OR REPLACE FUNCTION public.update_dados_lotes()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE
  categoria_record RECORD;
  days_diff INTEGER;
  new_peso_vivo NUMERIC;
  dias_para_meta INTEGER;
  dias_restantes INTEGER;
  calc_peso_entrada_arrobas NUMERIC;
  calc_quant_atual INTEGER;
  gmd_value NUMERIC;
  peso_base NUMERIC;
BEGIN
  FOR categoria_record IN
    SELECT lc.id, lc.lote_id, lc.categoria, lc.peso_entrada_kg_cab,
           NULLIF(lc.gmd,'')::numeric AS gmd_efetivo,
           lc.data_meta_projetada, lc.rc_inicial,
           lc.data_ajuste_peso,
           lc.peso_vivo_atual_kg_cab,
           pn.id AS plano_id,
           pn.data_inicio,
           pn.peso_inicio_kg_cab,
           pn.peso_meta_kg,
           pn.condicao_migracao,
           pn.migracao_automatica,
           pn.ordem
    FROM lote_categorias lc
    LEFT JOIN planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
    WHERE lc.peso_entrada_kg_cab IS NOT NULL
      AND lc.ativo = true
      AND lc.data_fim IS NULL
      AND NULLIF(lc.gmd,'')::numeric IS NOT NULL
  LOOP
    gmd_value := categoria_record.gmd_efetivo;
    IF gmd_value IS NULL THEN CONTINUE; END IF;

    -- ... resto da lógica de projeção inalterado (data_ajuste_peso vs data_inicio)
    -- ... UPDATE lote_categorias SET peso_vivo_atual_kg_cab = new_peso_vivo, ... WHERE id = ...
  END LOOP;
END;
$function$;
```

**Mudanças chave vs. versão antiga:**
- GMD vem de `lc.gmd` (materializado pela Migration D), não de `COALESCE(pn.gmd_planejado, f.gmd)`.
- JOIN com `formulacoes` removido do cursor (não precisa mais ler `f.gmd`).
- JOIN com `planos_nutricionais` vira `LEFT JOIN` (categoria pode evoluir sem plano, caso dos bezerros ao pé).
- Categorias sem GMD (`lc.gmd IS NULL`) são puladas (para de evoluir peso, caso de recategorização para categoria não contemplada pela formulação).

**A trigger existente em `formulacoes` (AFTER UPDATE OF `gmd`) que recalcula `registros_suplementacao`** precisa ser revisada. Como `formulacoes.gmd` deixa de ser lida pelo cron, a trigger pode ser removida ou adaptada para ler de `formulacao_categorias_gmd`. Decisão a tomar na implementação.

### Migration F — Bezerros ao pé com GMD padrão

```sql
CREATE OR REPLACE FUNCTION public.fn_set_gmd_bezerro_ao_pe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF LOWER(TRIM(NEW.categoria)) IN ('bezerro ao pé','bezerro ao pe') THEN
      NEW.gmd := '0.600';
    ELSIF LOWER(TRIM(NEW.categoria)) IN ('bezerra ao pé','bezerra ao pe') THEN
      NEW.gmd := '0.500';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_gmd_bezerro_ao_pe ON public.lote_categorias;
CREATE TRIGGER trg_set_gmd_bezerro_ao_pe
  BEFORE INSERT ON public.lote_categorias
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_gmd_bezerro_ao_pe();
```

Como o cron agora lê `lc.gmd` diretamente (Migration E), o bezerro ao pé passa a evoluir sem plano nutricional. A regra "não acessa modal de planos" é enforcement de UI no novo painel, não de banco.

**Backfill de bezerros ao pé existentes sem GMD:**

```sql
UPDATE public.lote_categorias
SET gmd = CASE
  WHEN LOWER(TRIM(categoria)) IN ('bezerro ao pé','bezerro ao pe') THEN '0.600'
  WHEN LOWER(TRIM(categoria)) IN ('bezerra ao pé','bezerra ao pe') THEN '0.500'
END
WHERE ativo = true AND data_fim IS NULL AND (gmd IS NULL OR gmd = '')
  AND LOWER(TRIM(categoria)) IN ('bezerro ao pé','bezerro ao pe','bezerra ao pé','bezerra ao pe');
```

### Migration G — Reescrita da RPC `recategorizar_lote_categoria` (decisão item 1)

A RPC atual cria nova `lote_categorias`, encerra o plano via `encerrar_plano_nutricional`, cria novo `planos_nutricionais` e registra auditoria. Na nova arquitetura, recategorização não cria nem encerra plano: a categoria continua no plano vigente do lote, apenas com novo GMD.

```sql
CREATE OR REPLACE FUNCTION public.recategorizar_lote_categoria(
  p_lote_categoria_id uuid,
  p_nova_categoria text,
  p_manter_formulacao boolean DEFAULT true,
  p_usuario_id uuid DEFAULT NULL,
  p_motivo text DEFAULT NULL,
  p_observacao text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  v_lote_id uuid;
  v_formulacao_id uuid;
  v_novo_gmd numeric;
  v_categoria_origem text;
  v_peso_atual numeric;
BEGIN
  SELECT lc.lote_id, lc.categoria, lc.peso_vivo_atual_kg_cab
    INTO v_lote_id, v_categoria_origem, v_peso_atual
  FROM public.lote_categorias lc
  WHERE lc.id = p_lote_categoria_id
    AND lc.ativo = true AND lc.data_fim IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lote_categorias ativa não encontrada para id %', p_lote_categoria_id;
  END IF;

  SELECT l.formulacao_id INTO v_formulacao_id
  FROM public.lotes l WHERE l.id = v_lote_id;

  IF v_formulacao_id IS NOT NULL THEN
    SELECT fcg.gmd INTO v_novo_gmd
    FROM public.formulacao_categorias_gmd fcg
    WHERE fcg.formulacao_id = v_formulacao_id
      AND LOWER(TRIM(fcg.categoria)) = LOWER(TRIM(p_nova_categoria))
    LIMIT 1;
  END IF;

  UPDATE public.lote_categorias
  SET categoria = p_nova_categoria,
      gmd = CASE WHEN v_novo_gmd IS NOT NULL THEN v_novo_gmd::text ELSE NULL END
  WHERE id = p_lote_categoria_id;

  INSERT INTO public.lote_categorias_transicoes (
    fazenda_id, lote_id, lote_categoria_origem_id, lote_categoria_destino_id,
    categoria_origem, categoria_destino, peso_na_transicao_kg,
    data_transicao, motivo, usuario_id, snapshot_jsonb
  )
  SELECT lc.fazenda_id, lc.lote_id, lc.id, lc.id,
         v_categoria_origem, p_nova_categoria, v_peso_atual,
         now(), COALESCE(p_motivo,'manual'), p_usuario_id,
         jsonb_build_object(
           'lote_origem', to_jsonb(l),
           'categoria_origem', v_categoria_origem,
           'categoria_destino', p_nova_categoria,
           'formulacao_id', v_formulacao_id,
           'gmd_novo', v_novo_gmd,
           'gmd_encontrado', (v_novo_gmd IS NOT NULL)
         )
  FROM public.lote_categorias lc
  JOIN public.lotes l ON l.id = lc.lote_id
  WHERE lc.id = p_lote_categoria_id;

  -- Se GMD não encontrado, a categoria para de evoluir peso (gmd=NULL).
  -- O frontend mostra aviso "a formulação vigente no lote não contempla essa nova categoria".

  RETURN p_lote_categoria_id;
END; $$;
```

**Mudanças chave vs. RPC antiga:**
- Não cria nova `lote_categorias` (`categoria_origem_id` não é mais usado).
- Não chama `encerrar_plano_nutricional`.
- Não cria novo `planos_nutricionais`.
- Atualiza `lote_categorias.categoria` e `lote_categorias.gmd` in-place.
- Se a formulação não contempla a nova categoria, `gmd` fica NULL e a categoria para de evoluir (o cron pula por `NULLIF(lc.gmd,'')::numeric IS NOT NULL`).
- Auditoria continua em `lote_categorias_transicoes` para preservar o histórico, mas `lote_categoria_origem_id = lote_categoria_destino_id` (mesma linha).

### Migration H — Normalização de planos vigentes por lote (backfill, decisão item 1)

Lotes existentes com categorias e planos vigentes distintos precisam ser normalizados: o plano mais antigo (menor `data_inicio`) vira o plano do lote; os demais são encerrados via `encerrar_plano_nutricional`.

Antes de rodar o backfill, executar query de diagnóstico para quantificar o passivo:

```sql
SELECT l.id, l.nome, COUNT(DISTINCT pn.id) AS planos_vigentes,
       array_agg(pn.id ORDER BY pn.data_inicio) AS plano_ids,
       array_agg(pn.formulacao_id ORDER BY pn.data_inicio) AS formulacao_ids
FROM public.lotes l
JOIN public.lote_categorias lc ON lc.lote_id = l.id AND lc.ativo = true AND lc.data_fim IS NULL
JOIN public.planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
WHERE l.ativo = true
GROUP BY l.id, l.nome
HAVING COUNT(DISTINCT pn.id) > 1
ORDER BY planos_vigentes DESC;
```

O backfill em si depende do resultado do diagnóstico e será detalhado na implementação. Esboço:

```sql
-- Para cada lote com mais de um plano vigente ativo:
-- 1. Identificar o plano "vencedor" (menor data_inicio)
-- 2. Encerrar os demais via encerrar_plano_nutricional
-- 3. Setar lotes.formulacao_id com a formulação do plano vencedor
-- 4. Repropagar GMD via trigger da Migration D
```

---

## 5. O que NÃO entra no banco nesta fase (fica no frontend novo)

1. **Trava de nome da formulação ativa em lote** — fica no `Formulacoes.tsx` novo. Só vira constraint/check de banco na fase de corte.
2. **Trava de salvamento "formulação deve contemplar exatamente as categorias do lote"** — validação de frontend no novo `Lotes.tsx`. O banco aceita `lotes.formulacao_id` qualquer; a coerência é checada no submit.

**Nota sobre "lote com 2+ categorias não pode ter planos vigentes diferentes":** resolvida estruturalmente pela decisão do item 1 (seção 8). Como a recategorização não cria mais plano novo por categoria (Migration G), e o backfill da Migration H normaliza lotes existentes, a regra fica automaticamente satisfeita pela arquitetura. Não precisa de trigger bloqueadora nem de validação de frontend.

A validação de movimentação no PWA (item 6 do enunciado) é no app, então também não toca o banco; só precisa ler `lotes.formulacao_id` + `formulacao_categorias_gmd` no momento da movimentação.

---

## 6. Fase de corte (depois de confirmada estabilidade)

- Dropar `formulacoes.gmd` (ou depreciar).
- Dropar `lote_categorias.formulacao_id` depois de confirmar que nada mais lê.
- Dropar `planos_nutricionais.formulacao_id` se a formulação passar a ser lida só de `lotes.formulacao_id`.
- Tornar `lotes.formulacao_id` NOT NULL se fizer sentido.
- As travas de negócio (nome de formulação ativa) podem virar constraints/triggers de banco.

---

## 7. Plano de migração de dados (passivo existente)

### 7.1 Lotes com planos enfileirados ou formulações ativas

Não podem perder nenhum dado. A transição é contínua porque:

- `lote_categorias.gmd` existente **é a fonte de verdade** para backfill da Migration B. Cada `lote_categorias` ativa com GMD vira uma entrada em `formulacao_categorias_gmd`.
- `planos_nutricionais` existentes **não são tocados** na estrutura. Continuam com seu `formulacao_id` e `gmd_planejado` para referência histórica. O cron deixa de ler `gmd_planejado` e passa a ler `lc.gmd`.
- `lotes.formulacao_id` é backfilled na Migration A com a formulação do plano vigente mais antigo.
- A Migration H normaliza lotes com planos vigentes distintos.

### 7.2 Lotes com categorias evoluindo peso

Continuam evoluindo via cron com o GMD de `lote_categorias.gmd` (que já estava materializado pelo cron antigo). Após o deploy, a Migration D passa a ser a fonte de `lote_categorias.gmd`, mas o valor inicial é o mesmo que já estava lá. A evolução é contínua, sem reset de peso.

### 7.3 Bezerros ao pé existentes

O backfill da Migration F seta GMD padrão (0.600/0.500) para bezerros ao pé ativos sem GMD. A partir da próxima execução do cron, passam a evoluir. O peso atual não muda retroativamente; a evolução começa a partir do `peso_vivo_atual_kg_cab` já registrado.

---

## 8. Pontos de decisão resolvidos

1. ~~Regra "lote com 2+ categorias não pode ter planos vigentes diferentes"~~: **Resolvido em 2026-08-20.** Quando uma categoria for recategorizada, nenhum plano novo será criado. Ela continuará no plano vigente do lote, mas agora com novo GMD, de acordo com o cadastro da formulação. Se a formulação não contemplar a nova categoria, ela para de evoluir peso e mostra um aviso: "a formulação vigente no lote não contempla essa nova categoria". Implementado na Migration G (rewrite da RPC) e Migration H (normalização de planos existentes).
2. ~~Branch do Supabase vs. backup pontual~~: **Resolvido em 2026-08-20.** Plano upgraded, branch disponível. Estratégia é branch-first.
3. ~~GMD agregado em `formulacoes.gmd`~~: **Resolvido em 2026-08-20.** Com big-bang, `formulacoes.gmd` deixa de ser lida pelo cron. O cron lê de `lote_categorias.gmd` (materializado pela Migration D). Backfill da nova tabela usa `lote_categorias.gmd` como fonte de verdade. Sem trigger de agregação, sem `COALESCE` em camadas.
4. ~~Trava de nome de formulação ativa~~: **Resolvido em 2026-08-20.** Fica somente no frontend novo nesta fase. Só vira constraint/check de banco na fase de corte.
5. ~~Bezerros ao pé~~: **Resolvido em 2026-08-20.** Confirmado GMD padrão 0.600 (Bezerro ao pé) e 0.500 (Bezerra ao pé). A edição dos GMDs dos bezerros ao pé será feita num local separado em `Lotes.tsx` (não dentro das categorias), via update direto em `lote_categorias.gmd`. Essas categorias não entram na lista da formulação em `Formulacoes.tsx` e não acessam o modal de planos nutricionais.

---

## 9. Plano de testes (tudo na branch, fazenda `d649c65e-...`)

Com big-bang, **toda a validação acontece na branch antes de promover para produção**. Não há teste de features novas em produção; a branch é o ambiente completo de validação, com dados reais de prod copiados no momento da criação. A fazenda de testes `d649c65e-...` é o escopo de mutações dentro da branch: podemos usar lotes existentes dessa fazenda (que vêm no snapshot da branch), criar novos lotes para testar edge cases, e simular todos os backfills para verificar que estão corretos.

### 9.1 Setup da branch

1. Criar branch do Supabase a partir do projeto prod (snapshot de dados reais).
2. Aplicar migrations A–H na branch.
3. Apontar painel novo (dev) e PWA (dev) para a URL da branch.
4. Verificar se o `pg_cron` foi copiado para a branch; se não, executar `SELECT update_dados_lotes()` manualmente.

### 9.2 Validação de migrations e backfills (estrutura)

Validar que cada migration fez o que deveria, usando os dados reais do snapshot:

- **Migration A**: `lotes.formulacao_id` populada para lotes ativos com plano vigente. Query de verificação: `SELECT id, nome, formulacao_id FROM lotes WHERE ativo = true AND formulacao_id IS NOT NULL`.
- **Migration B**: `formulacao_categorias_gmd` populada a partir de `lote_categorias.gmd`. Query de verificação: comparar `SELECT formulacao_id, categoria, gmd FROM formulacao_categorias_gmd` contra `SELECT COALESCE(lc.formulacao_id, pn.formulacao_id), lc.categoria, COALESCE(pn.gmd_planejado, NULLIF(lc.gmd,'')::numeric) FROM lote_categorias lc LEFT JOIN planos_nutricionais pn ...`. Os valores devem bater.
- **Migration C**: editar uma formulação e confirmar que `formulacoes_historico` ganhou uma linha com o snapshot da versão anterior e `formulacoes.versao` incrementou.
- **Migration D**: setar `lotes.formulacao_id` num lote de teste e confirmar que `lote_categorias.gmd` foi atualizado para as categorias que estão na formulação, e setado para NULL nas que não estão.
- **Migration E**: comparar `peso_vivo_atual_kg_cab` de lotes amostrais (pelo menos um de cada fazenda ativa) antes e depois de executar `SELECT update_dados_lotes()`. Devem permanecer idênticos para lotes que já tinham GMD materializado.
- **Migration F**: confirmar que bezerros ao pé ativos sem GMD agora têm 0.600/0.500, e que o cron os projeta corretamente.
- **Migration G**: chamar `recategorizar_lote_categoria` numa categoria de teste e confirmar que não criou novo plano nem nova `lote_categorias`, apenas atualizou `categoria` e `gmd` in-place.
- **Migration H**: rodar a query de diagnóstico antes e depois do backfill. Confirmar que lotes com planos vigentes distintos foram normalizados (apenas um plano vigente por lote).

### 9.3 Validação de features novas (fluxos de UI, restrito à fazenda de testes)

Usar lotes existentes da fazenda `d649c65e-...` (que vêm no snapshot da branch) e criar novos lotes conforme necessário para testar cada fluxo:

1. **Formulacoes.tsx novo**: remover input de GMD, adicionar modal de categorias com GMD por categoria, validar que GMD é obrigatório para todas as categorias vinculadas. Testar criar formulação nova, editar existente, excluir categoria da lista, adicionar categoria da lista.
2. **Lotes.tsx novo**: seletor de fila de formulações no topo, trava de salvamento (formulação contempla exatamente as categorias do lote), salvar `lotes.formulacao_id` com índice [0]. Testar com lote existente (que já tem categorias) e com lote novo.
3. **Modal de categorias**: consulta e exibe formulações enfileiradas no lote, com vigente em destaque (herança puramente visual). Confirmar que não escreve `formulacao_id` na categoria.
4. **Bezerros ao pé**: GMD padrão exibido e editável em local separado em `Lotes.tsx`, sem acesso a modal de planos. Testar editar GMD de bezerro ao pé existente e confirmar que o cron usa o novo valor na próxima execução.
5. **PWA**: bloqueio de movimentação quando categoria de origem não existe no lote de destino e a formulação ativa no destino não contempla a categoria. Atualizar leitura de nome de formulação para ler de `lotes.formulacao_id`. Testar movimentação permitida e bloqueada.
6. **Notificacoes.tsx**: notificação de nova categoria que entrou via movimentação e começou a evoluir, mas precisa de Peso Meta e Período. Testar fluxo completo: movimentar animal para lote com formulação ativa, confirmar notificação aparece.
7. **Recategorização**: testar recategorizar uma categoria para outra que está na formulação (GMD atualiza, peso continua evoluindo) e para outra que não está (GMD fica NULL, peso para, aviso aparece).
8. **Transição de fila**: testar encerrar plano vigente e confirmar que `lotes.formulacao_id` avança para a próxima formulação da fila.

### 9.4 Simulação de backfills

Os backfills das Migrations A, B, F e H podem ser re-executados na branch para verificar idempotência e corretude:

- **Re-executar backfill da Migration B** e confirmar que não duplica linhas (`ON CONFLICT DO NOTHING`) e que os valores continuam corretos.
- **Re-executar backfill da Migration F** e confirmar que não sobrescreve GMDs já setados manualmente pelo usuário.
- **Re-executar backfill da Migration H** e confirmar que não encerra planos já normalizados.
- **Criar cenário de edge case**: inserir `lote_categorias` com GMD conflitante com o da formulação e confirmar que o backfill escolhe o valor correto (preferir `gmd_planejado` não-NULL).

### 9.5 Critérios de sucesso (todos na branch antes de promover)

- Nenhum erro no cron ao executar `SELECT update_dados_lotes()` manualmente.
- `peso_vivo_atual_kg_cab` de lotes legados inalterado (amostragem antes/depois).
- Todos os fluxos do item 9.3 funcionais na fazenda de testes dentro da branch.
- `formulacoes_historico` populado corretamente em updates.
- `lote_categorias.gmd` materializado corretamente a partir de `lotes.formulacao_id`.
- `formulacao_categorias_gmd` populada corretamente pelo backfill.
- Lotes com planos vigentes distintos normalizados pela Migration H.
- Backfills idempotentes (re-execução não duplica nem sobrescreve incorretamente).
- PWA: movimentação bloqueada/permitida conforme esperado.
- Recategorização: GMD atualiza in-place, sem criar plano novo.

---

## 10. Ordem de execução recomendada (branch-first, tudo validado antes de promover)

### 10.1 Migrations na ordem exata de execução

As 16 migrations abaixo devem ser aplicadas em produção nesta ordem. O `supabase db push` respeita a ordem alfabética do timestamp do arquivo, que já corresponde à sequência correta.

| # | Arquivo | Commit | O que faz |
|---|---------|--------|-----------|
| 1 | `20260825010000_migration_a_lotes_formulacao_id.sql` | `dea8424` | Adiciona `lotes.formulacao_id` + backfill a partir do plano vigente mais antigo |
| 2 | `20260825020000_migration_b_formulacao_categorias_gmd.sql` | `dea8424` | Cria `formulacao_categorias_gmd` + backfill a partir de `lote_categorias.gmd` |
| 3 | `20260825030000_migration_c_formulacoes_versao_historico.sql` | `dea8424` | Versionamento de formulações + `formulacoes_historico` + trigger de snapshot |
| 4 | `20260825040000_migration_d_sync_gmd_lote_categorias.sql` | `dea8424` | Trigger `repropagar_gmd_para_lotes`: ao mudar `lotes.formulacao_id`, repropaga GMD para `lote_categorias` |
| 5 | `20260825050000_migration_e_rewrite_cron_update_dados_lotes.sql` | `dea8424` | Cron reescrito v1 (JOIN por `lote_id`, lê `lc.gmd`). Sobrescrito pela migration N |
| 6 | `20260825060000_migration_f_bezerros_ao_pe_gmd_padrao.sql` | `dea8424` | Backfill de GMD padrão (0.600/0.500) para bezerros/bezerras ao pé ativos sem GMD |
| 7 | `20260825070000_migration_g_rewrite_rpc_recategorizar.sql` | `dea8424` | RPC `recategorizar_lote_categoria` reescrita: atualiza categoria in-place, não cria plano novo |
| 8 | `20260825080000_migration_h_normalizacao_planos_lote.sql` | `dea8424` | Backfill: normaliza lotes com planos vigentes distintos (deixa apenas um vigente por lote) |
| 9 | `20260825090000_migration_i_fix_encerrar_plano_nutricional_rc.sql` | `fd4e01d` | Fix `encerrar_plano_nutricional`: `rc_atual` inexistente → `rc_final` |
| 10 | `20260825100000_migration_j_normalizacao_categorias.sql` | `5c0ac62` | Normalização de categorias (case + unicode) com triggers BEFORE INSERT/UPDATE |
| 11 | `20260825110000_migration_k_planos_por_lote.sql` | `4e685f7` | Planos por lote: adiciona `planos_nutricionais.lote_id`, cria `plano_categoria_personalizacao`, cria RPCs `iniciar_plano_lote`/`encerrar_plano_lote`/`migrar_plano_lote` |
| 12 | `20260825120000_migration_l_remove_gmd_base_fallback.sql` | `4e685f7` | Remove fallback `gmd_planejado`/`f.gmd`, GMD apenas de `formulacao_categorias_gmd`, `unaccent` na filtragem de bezerros ao pé |
| 13 | `20260825130000_migration_n_cron_rewrite.sql` | `4e685f7` | Cron reescrito v2: JOIN por `lote_id`, LEFT JOIN com `plano_categoria_personalizacao`, interrompe ganho por período/peso meta, remove migração automática, `unaccent` |
| 14 | `20260825140000_migration_o_fix_criar_snapshot_entrada.sql` | `4e685f7` | Fix `criar_snapshot_entrada`: guard por `lote_id` (não `lote_categoria_id`), GMD de `formulacao_categorias_gmd` |
| 15 | `20260825150000_migration_p_fix_migrar_plano_lote.sql` | `4e685f7` | Fix `migrar_plano_lote`: GMD de `formulacao_categorias_gmd`, `unaccent` |
| 16 | `20260825160000_migration_q_r_fix_unaccent_rpcs.sql` | `4e685f7` | Fix `unaccent` em `iniciar_plano_lote` e `encerrar_plano_lote`, remove `gmd_planejado` como fallback |

**Notas sobre sobreposição:**
- A migration E (n. 5) cria a v1 do cron. A migration N (n. 13) reescreve o cron com personalização e interrupção de ganho. Ambas devem rodar em ordem.
- As migrations L (n. 12) e Q-R (n. 16) definem as mesmas funções (`iniciar_plano_lote`, `encerrar_plano_lote`) com a mesma lógica. Q-R é idempotente (`CREATE OR REPLACE`), não causa problema.
- As migrations O (n. 14) e P (n. 15) corrigem `criar_snapshot_entrada` e `migrar_plano_lote` que foram criadas na K (n. 11). A ordem K → O → P deve ser respeitada.

### 10.2 Passos para promover para produção

1. Backup pontual de prod como rede de segurança.
2. `git pull` na branch `refactor/formulacao-por-lote` (todas as 16 migrations estão commitadas).
3. `supabase db push` na produção. O CLI aplica automaticamente apenas as migrations que ainda não existem em `supabase_migrations.schema_migrations`.
4. Deploy do código frontend novo + PWA atualizado para prod.
5. Monitorar as primeiras 24h em prod (sem janela de manutenção, mas com atenção).
6. Fase de corte (seção 6) só depois de confirmada estabilidade.

### 10.3 Validação pós-aplicação (queries de checagem)

```sql
-- 1. lotes.formulacao_id populada
SELECT id, nome, formulacao_id FROM lotes WHERE ativo = true AND formulacao_id IS NOT NULL;

-- 2. formulacao_categorias_gmd populada
SELECT formulacao_id, categoria, gmd FROM formulacao_categorias_gmd ORDER BY formulacao_id, categoria;

-- 3. planos_nutricionais.lote_id backfilled
SELECT COUNT(*) AS total, COUNT(lote_id) AS com_lote FROM planos_nutricionais;

-- 4. plano_categoria_personalizacao criada
SELECT COUNT(*) FROM plano_categoria_personalizacao;

-- 5. Cron sem erro
SELECT update_dados_lotes();

-- 6. Bezerros ao pé com GMD
SELECT categoria, gmd FROM lote_categorias WHERE LOWER(unaccent(categoria)) ILIKE 'bezer% ao pe' AND ativo = true AND data_fim IS NULL;

-- 7. Lotes com planos vigentes distintos (deve retornar vazio)
SELECT l.id, l.nome, COUNT(DISTINCT pn.id) AS planos_vigentes
FROM lotes l
JOIN planos_nutricionais pn ON pn.lote_id = l.id AND pn.ativo = true AND pn.data_fim IS NULL
WHERE l.ativo = true
GROUP BY l.id, l.nome
HAVING COUNT(DISTINCT pn.id) > 1;
```
