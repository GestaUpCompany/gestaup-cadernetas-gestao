# Spec: Premix como ingrediente de formulação

**Data:** 2026-08-14
**Status:** Aprovado para implementação
**Escopo:** Painel Web (`GestaUp-Cadernetas-Gestao`) + PWA (`Caderneta-Digital-Gesta-Up`) + Supabase

## 1. Contexto e objetivo

Fazendas de confinamento e semiconfinamento produzem um concentrado pré-misturado (premix) num misturador estacionário, com ingredientes secos de baixa inclusão (milho, farelo de soja, ureia, núcleo mineral-vitamínico). Esse premix é fisicamente uma mistura, mas operacionalmente vira um **ingrediente** que entra no vagão misturador junto com silagem, caroço e capulho para formar a dieta total (TMR).

Hoje o sistema não suporta esse fluxo: uma formulação só pode conter insumos atômicos, não outras formulações. O nutricionista não tem como modelar "fórmula dentro de fórmula".

**Objetivo:** permitir que uma formulação marcada como premix gere automaticamente um insumo correspondente (com teor_ms e preco_ton_mn derivados do cálculo), para que esse insumo possa ser usado como ingrediente em outras formulações (as TMRs finais).

## 2. Decisões de modelagem (aprovadas)

1. **Abordagem A: premix vira insumo.** O premix é uma formulação com flag `é_premix = true`. Ao salvar, o sistema faz upsert num insumo correspondente. A TMR referencia esse insumo normalmente. Não há recursão no JSONB da TMR.
2. **Composição bromatológica mínima.** O insumo gerado carrega apenas `teor_ms` e `preco_ton_mn` (derivados de `teorMSDieta` e `custo_mn_tonelada` já calculados em `Formulacoes.tsx`). Não adicionamos PB, NDT, FDN, Ca, P.
3. **Geração automática on save.** Ao salvar uma formulação com `é_premix = true`, o upsert do insumo acontece na mesma submissão. Sem botão separado.
4. **Sem auto-propagação para TMRs.** Quando o premix é editado, o insumo é atualizado, mas as TMRs que o usam mantêm o snapshot antigo no JSONB delas. O nutricionista deve reabrir e salvar a TMR para refletir. Consistente com o comportamento atual de insumos.
5. **Sem ordem de carregamento nem campo equipamento.** A separação estacionário vs vagão fica implícita na estrutura (premix = estacionário, TMR = vagão). A ordem dentro de cada equipamento é conhecimento operacional do peão. Aditivo no futuro se necessário.
6. **Flag `é_premix` ortogonal a `tipo`.** O campo `tipo` (Sal Mineral, Proteico, Ração, etc.) continua classificando a natureza nutricional. `é_premix` discrimina o papel na hierarquia.
7. **Insumos gerados são read-only em `Insumos.tsx`.** Editar teor_ms ou preco_ton_mn manualmente dessincronizaria o insumo da fórmula. A edição redireciona para `Formulacoes.tsx?edit=<formulacao_id>`.

## 3. Mudanças no banco de dados

### Migration: `add_premix_flag_and_insumo_origem`

```sql
-- 1. Flag é_premix em formulacoes
ALTER TABLE public.formulacoes
ADD COLUMN IF NOT EXISTS e_premix boolean NOT NULL DEFAULT false;

-- 2. Link de origem em insumos (marca insumos derivados de premix)
ALTER TABLE public.insumos
ADD COLUMN IF NOT EXISTS formulacao_origem_id uuid;

ALTER TABLE public.insumos
DROP CONSTRAINT IF EXISTS insumos_formulacao_origem_id_fkey;

ALTER TABLE public.insumos
ADD CONSTRAINT insumos_formulacao_origem_id_fkey
FOREIGN KEY (formulacao_origem_id)
REFERENCES public.formulacoes(id)
ON DELETE SET NULL;

-- 3. Índice para buscar insumo gerado de uma formulação
CREATE INDEX IF NOT EXISTS idx_insumos_formulacao_origem_id
ON public.insumos (formulacao_origem_id)
WHERE formulacao_origem_id IS NOT NULL;

-- 4. Comentários
COMMENT ON COLUMN public.formulacoes.e_premix IS
  'true se esta formulação é um premix que gera um insumo para uso em outras formulações (TMR)';
COMMENT ON COLUMN public.insumos.formulacao_origem_id IS
  'Se não-null, este insumo é derivado automaticamente da formulação apontada. Read-only em Insumos.tsx.';
```

**Notas:**
- O nome da coluna é `e_premix` (sem acento) por convenção SQL do projeto (ver `categoria_inferida_automaticamente`, `deleted_at`).
- O backfill é implícito: todas as formulações existentes ficam `e_premix = false` (TMRs), todos os insumos existentes ficam `formulacao_origem_id = NULL` (insumos atômicos). Nada quebra.
- RLS: as policies existentes de `formulacoes` e `insumos` filtram por `fazenda_id`, e as novas colunas herdam esse filtro automaticamente. Não precisa de policy nova.

## 4. Mudanças no Painel Web

### 4.1. `Formulacoes.tsx`

#### 4.1.1. Interface `Dieta`

Adicionar campo `e_premix?: boolean` à interface `Dieta` (linha 18-42).

#### 4.1.2. Estado do formulário

Adicionar `e_premix: false` ao estado inicial de `formData` (linha 125-135) e ao reset em `handleSubmit` (linha 342-352), `handleCancel` (linha 392-404) e `handleEdit` (linha 362-388, ler `dieta.e_premix ?? false`).

#### 4.1.3. Query de leitura

`loadFormulacoes` (linha 155-174) já faz `select('*')`, então `e_premix` vem automaticamente. Sem mudança.

#### 4.1.4. Checkbox no formulário

Adicionar um checkbox logo após o campo "Sistema de Produção" (após linha 633), na mesma seção de parâmetros. Estilo consistente com o botão "Ativo/Inativo" existente (linha 790-800):

```tsx
<div className="flex items-center gap-3 sm:col-span-2 md:col-span-1">
  <button
    type="button"
    onClick={() => setFormData({ ...formData, e_premix: !formData.e_premix })}
    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 border-2 ${
      formData.e_premix
        ? 'bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200'
        : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
    }`}
  >
    {formData.e_premix ? '✓ Premix' : 'Premix'}
  </button>
  <span className="text-xs text-gray-500 leading-tight">
    Marque se esta formulação é um premix. Ela gerará automaticamente um insumo
    para uso em outras formulações (TMR do vagão).
  </span>
</div>
```

#### 4.1.5. Submissão (`handleSubmit`)

**Validação bloqueante de colisão de nome (antes do insert/update da formulação):**

Antes de salvar, se `formData.e_premix === true`, verificar se já existe um insumo ativo com o mesmo nome e `formulacao_origem_id IS NULL` (insumo atômico, não gerado de premix). Se existir, bloquear o submit com mensagem e não salvar:

```typescript
if (formData.e_premix) {
  const { data: colisao } = await supabase
    .from('insumos')
    .select('id, nome')
    .eq('fazenda_id', fazendaId)
    .eq('nome', formData.nome)
    .eq('ativo', true)
    .is('formulacao_origem_id', null)
    .maybeSingle()

  if (colisao) {
    alert(
      `Já existe um insumo atômico chamado "${formData.nome}". ` +
      `Renomeie a formulação ou o insumo existente para evitar confusão no select de ingredientes.`
    )
    setSubmitting(false)
    return
  }
}
```

A verificação é por nome exato (case-sensitive, conforme o `eq` do Supabase). Não cobre variações de case ("Premix" vs "premix"), mas isso é aceitável: o cenário real de colisão é o usuário digitando o nome idêntico, e o alerta é suficiente para guiá-lo. Se quiser case-insensitive no futuro, troca-se `eq('nome', ...)` por `ilike('nome', formData.nome)`.

**Upsert do insumo gerado (após insert/update da formulação):**

Após o insert/update da formulação (linha 327-337), se `formData.e_premix === true`, executar upsert no insumo correspondente:

```typescript
if (formData.e_premix) {
  // teorMSDieta e custo_mn_tonelada já estão calculados acima
  const insumoData = {
    fazenda_id: fazendaId,
    nome: formData.nome,
    tipo: 'Premix',
    teor_ms: teorMSDieta,
    preco_ton_mn: custoTotal, // custo_mn_tonelada recebe custoTotal (linha 320)
    ativo: formData.ativo,
    formulacao_origem_id: editingFormulacao?.id || insertedId,
  }

  // Upsert: se já existe insumo com formulacao_origem_id = this, update; senão, insert
  const { data: existingInsumo } = await supabase
    .from('insumos')
    .select('id')
    .eq('formulacao_origem_id', editingFormulacao?.id)
    .maybeSingle()

  if (existingInsumo) {
    await supabase.from('insumos').update(insumoData).eq('id', existingInsumo.id)
  } else {
    await supabase.from('insumos').insert(insumoData)
  }
}
```

**Ponto de atenção:** o insert atual (linha 335) não retorna o `id` da formulação criada. Para o caso de criação (não edição), é preciso capturar o id retornado:

```typescript
// Alterar o bloco de insert para capturar o id
if (editingFormulacao) {
  const { error: updateError } = await supabase
    .from('formulacoes')
    .update(data)
    .eq('id', editingFormulacao.id)
  error = updateError
  newFormulacaoId = editingFormulacao.id
} else {
  const { data: inserted, error: insertError } = await supabase
    .from('formulacoes')
    .insert(data)
    .select('id')
    .single()
  error = insertError
  newFormulacaoId = inserted?.id
}
```

#### 4.1.6. Desmarcação do premix

Se o usuário desmarca o checkbox e salva uma formulação que antes era premix, o insumo gerado deve ser desativado (não deletado, para preservar TMRs que o referenciam):

```typescript
if (!formData.e_premix && editingFormulacao?.e_premix) {
  await supabase
    .from('insumos')
    .update({ ativo: false, deleted_at: new Date().toISOString() })
    .eq('formulacao_origem_id', editingFormulacao.id)
}
```

#### 4.1.7. Badge na listagem

No `CardItem` da listagem (linha 820-878), adicionar badge "Premix" no subtítulo quando `dieta.e_premix`:

```tsx
subtitle={
  dieta.e_premix
    ? `Premix • ${(dieta.tipo || 'Sem tipo').replace(/\b\w/g, (c) => c.toUpperCase())}`
    : (dieta.categoria
        ? `${(dieta.tipo || 'Sem tipo').replace(/\b\w/g, (c) => c.toUpperCase())} • ${dieta.categoria.replace(/\b\w/g, (c) => c.toUpperCase())}`
        : (dieta.tipo ? dieta.tipo.replace(/\b\w/g, (c) => c.toUpperCase()) : undefined))
}
```

#### 4.1.8. Filtro de listagem (opcional)

Adicionar um toggle "Mostrar só TMR" / "Mostrar só Premix" ao lado de "Mostrar Desativados" (linha 475-484), com três estados: Todos (default), só TMR, só Premix. Implementação análoga ao `showInactive`:

```tsx
const [premixFilter, setPremixFilter] = useState<'todos' | 'tmr' | 'premix'>('todos')
// ...
.filter((dieta) =>
  (showInactive || dieta.ativo) &&
  (premixFilter === 'todos' ||
   (premixFilter === 'premix' && dieta.e_premix) ||
   (premixFilter === 'tmr' && !dieta.e_premix)) &&
  (dieta.nome.toLowerCase().includes(searchTerm.toLowerCase()) || ...)
)
```

#### 4.1.9. Aviso de "premix sem insumos"

Se `e_premix = true` e `selectedInsumos.length === 0`, mostrar aviso não-bloqueante acima da tabela: "Um premix deve conter pelo menos um insumo para gerar um ingrediente válido." Não bloquear o submit (o usuário pode querer salvar rascunho), mas o insumo gerado terá teor_ms = 0 e preco = 0, o que é inútil. O aviso é suficiente.

### 4.2. `Insumos.tsx`

#### 4.2.1. Interface `Insumo`

Adicionar `formulacao_origem_id?: string` à interface (linha 30-41).

#### 4.2.2. Query de leitura

`loadInsumos` (linha 72-96) já faz `select('*')`, então `formulacao_origem_id` vem automaticamente. Sem mudança.

#### 4.2.3. Badge na listagem

No `CardItem` (linha 422-471), se `insumo.formulacao_origem_id` for não-null, mostrar badge "Gerado de formulação" acima do nome ou no subtítulo:

```tsx
subtitle={
  insumo.formulacao_origem_id
    ? `${insumo.tipo || 'Sem tipo'} • Gerado de formulação`
    : insumo.tipo
}
```

#### 4.2.4. Comportamento do botão "Editar"

Se `insumo.formulacao_origem_id` for não-null, o botão "Editar" (linha 448-458) redireciona para `Formulacoes.tsx?edit=<formulacao_origem_id>` em vez de abrir o formulário de insumo:

```tsx
onClick={(e) => {
  e.stopPropagation()
  if (insumo.formulacao_origem_id) {
    navigate(`/controller/formulacoes?edit=${insumo.formulacao_origem_id}`)
  } else {
    handleEdit(insumo)
  }
}}
```

Isso exige importar `useNavigate` do `react-router-dom` no `Insumos.tsx`.

#### 4.2.5. Bloquear "Desativar" para insumos gerados

O botão "Desativar/Ativar" (linha 459-469) fica oculto quando `insumo.formulacao_origem_id` for não-null. A desativação deve virar via formulação (desmarcar premix e salvar), para manter consistência:

```tsx
{!insumo.formulacao_origem_id && (
  <Button
    size="sm"
    variant="secondary"
    className="text-red-600 hover:text-red-700"
    onClick={(e) => {
      e.stopPropagation()
      handleToggleActive(insumo)
    }}
  >
    {insumo.ativo ? 'Desativar' : 'Ativar'}
  </Button>
)}
```

#### 4.2.6. Ocultar premix-gerados do select de fornecedores (não aplicável)

O select de fornecedores em `Insumos.tsx` é para o campo `fornecedor` do insumo. Premix-gerados não têm fornecedor. O campo já é opcional. Sem mudança.

### 4.3. Select de insumos em `Formulacoes.tsx`

O select "Adicionar Insumo" (linha 638-653) lista insumos ativos da fazenda. Premix-gerados aparecerão automaticamente aqui (são insumos como qualquer outro). Sem mudança necessária.

**Decisão:** não filtrar premix-gerados do select. O nutricionista pode querer usar um premix como ingrediente de outro premix (premix de premix, cenário raro mas possível). Se isso virar problema, filtra-se depois.

### 4.4. `Lotes.tsx` - select de formulação para vínculo com `lote_categorias`

O `Lotes.tsx` na linha 260 faz o select de formulações que popula o campo "estratégia nutricional" vinculado a `lote_categorias.formulacao_id`:

```typescript
supabase.from('formulacoes').select('id, nome, tipo, categoria, consumo_ms_percent_pv, gmd')
  .eq('fazenda_id', fazendaId).eq('ativo', true).is('deleted_at', null).order('nome')
```

Sem filtro, o premix aparece nesse select. Se o nutricionista vincular um premix a `lote_categorias.formulacao_id` por engano (em vez da TMR), o sistema não bloqueia e o resultado é conceitualmente errado: o lote passa a "comer" só o concentrado, o GMD projetado passa a ser o do premix (não o da dieta total), o cron `update_dados_lotes` projeta peso errado, e o `FormulacaoDetalhesCard` do PWA mostra métricas do premix como se fosse a dieta do lote. Nada quebra em sentido de erro de banco, mas os números ficam errados silenciosamente.

**Mudança:** adicionar `.eq('e_premix', false)` à query:

```typescript
supabase.from('formulacoes').select('id, nome, tipo, categoria, consumo_ms_percent_pv, gmd, e_premix')
  .eq('fazenda_id', fazendaId).eq('ativo', true).eq('e_premix', false).is('deleted_at', null).order('nome')
```

O `e_premix` também entra no `select` para que o tipo do `nutritionalOptions` seja consistente, embora o filtro já garanta que só virão TMRs.

**Impacto em `lote_categorias` existentes:** nenhum. Lotes já vinculados a formulações continuam funcionando, porque todas as formulações existentes nasceram com `e_premix = false` (default da migration). O filtro só impede novos vínculos a premixes criados depois da implementação.

### 4.5. Outros selects de formulação no Painel Web (auditoria completa)

A auditoria de todos os `from('formulacoes')` no Painel Web encontrou 8 pontos além dos já tratados em 4.1, 4.3 e 4.4. Três precisam do filtro `e_premix = false`, os demais não.

#### Precisam de filtro `.eq('e_premix', false)`

**`PlanoNutricionalModal.tsx:137`** — select de formulações para criar/editar plano nutricional:

```typescript
const { data: formulacoesData, error: formError } = await supabase
  .from('formulacoes')
  .select('id, nome, tipo, gmd, consumo_ms_percent_pv, categoria, e_premix')
  .eq('fazenda_id', fId)
  .eq('ativo', true)
  .eq('e_premix', false)
  .order('nome', { ascending: true })
```

Sem filtro, o nutricionista poderia vincular um premix a um plano nutricional, e o plano projetaria GMD/custo baseados no premix (só concentrado) em vez da TMR. Mesmo problema do `Lotes.tsx:260`.

**`FaixasCategorias.tsx:610`** (`carregarFormulacoes`) — select de formulações para o modal "Trocar formulação" na recategorização:

```typescript
const { data, error } = await supabase
  .from('formulacoes')
  .select('id, nome, categoria, e_premix')
  .eq('fazenda_id', fazendaId)
  .eq('ativo', true)
  .eq('e_premix', false)
  .order('nome', { ascending: true })
```

Sem filtro, o nutricionista poderia recategorizar um lote para um premix como nova formulação, quebrando a cronologia nutricional (o lote passaria a "comer" só concentrado).

**`Currais.tsx:171`** — select de formulações para vincular ao curral (`currais.formulacao_id`):

```typescript
supabase.from('formulacoes').select('id, nome, tipo, e_premix')
  .eq('fazenda_id', fazendaId).eq('ativo', true).eq('e_premix', false).is('deleted_at', null).order('nome'),
```

O curral recebe a dieta final (TMR) que vai ao cocho, não o premix intermediário. Sem filtro, o nutricionista poderia vincular um premix ao curral, o que é conceitualmente errado.

#### Coberto indiretamente (sem mudança adicional)

**`PlanoNutricionalDraftModal.tsx`** — recebe `formulacoes` como prop de `Lotes.tsx:3244`, derivado de `nutritionalOptions` (populado pela query de `Lotes.tsx:260`). Se a query de `Lotes.tsx:260` for filtrada conforme seção 4.4, o draft modal automaticamente só vê TMRs. Sem mudança no modal.

#### Não precisam de filtro

**`FaixasCategorias.tsx:231`** (`loadFormulacoesMap`) — carrega todas as formulações (sem filtro `ativo`, sem filtro `e_premix`) para um mapa `id → {nome, consumo_ms_percent_pv}` usado para resolver nomes em transições históricas e cronologia. Premixes no mapa são inofensivos: só resolvem nomes para auditoria, não são selecionáveis. Se um premix foi vinculado a um lote_categoria em algum momento (cenário que o filtro dos selects impede going forward, mas pode existir em dados históricos se alguém criou o vínculo antes do filtro), o mapa precisa resolver o nome. Filtrar quebraria a exibição de histórico.

**`useDashboardQueries.ts:117`** — query do backfill alert, filtra `categoria_inferida_automaticamente = true`. Premixes sem categoria confirmada devem aparecer no alerta de backfill como qualquer outra formulação. Filtrar premixes aqui faria o nutricionista nunca ver o aviso de categoria a confirmar para um premix.

**`DetalhesFazenda.tsx:114`** — count de formulações ativas para stats admin. Premixes são formulações ativas, contar junto é correto. O admin quer saber quantas formulações a fazenda tem no total.

**`SuplementacaoDetalhes.tsx:65`** — busca formulação por nome exato (`eq('nome', registro.formulacao)`). Não é seletor, é busca por nome. Se o registro de suplementação tem o nome da TMR, encontra a TMR.

### 4.6. RPCs e triggers do Supabase (auditoria completa)

A auditoria de todas as migrations que referenciam `formulacoes` (13 arquivos) confirmou que nenhuma RPC ou trigger lista formulações para seleção. Todas as referências são:

- **JOIN por ID** para resolver nomes em resultados de RPC (`get_detalhes_pasto_mapa`, `get_detalhes_curral_mapa` em `20260814130000`): `LEFT JOIN formulacoes f ON f.id = lc.formulacao_id`. Equivalente ao `loadFormulacoesMap` do `FaixasCategorias.tsx`: resolução de nomes para exibição, não seleção. Não precisa de filtro.
- **COUNT** para estatísticas (`rpc_farm_usage_metrics` em `20260807180000`): `COUNT(*) FROM formulacoes WHERE ativo = true`. Premixes são formulações ativas, contar junto é correto. Não precisa de filtro.
- **Leitura pontual por `formulacao_id`** em triggers de cálculo de consumo (`trigger_consumo_suplementacao`, `trigger_recalc_consumo_registros`, `trigger_recalc_consumo_on_n_cabecas_update`, `criar_snapshot_entrada_guard_categoria`, `criar_planos_nutricionais_snapshot_auditoria`): operam em cima de `formulacao_id` já vinculado a um registro de suplementação ou plano nutricional. Se o vínculo foi feito corretamente (só TMRs, graças aos filtros dos selects), o trigger lê a TMR certa. Não precisa de filtro.
- **Migração de schema** (`renomear_meta_consumo_ms_percent_pv`, `gmd_planejado_como_fonte_principal`, `adicionar_fk_formulacao_lote_categorias_e_fluxo_estrategia_individuos`, `ajustar_estrategia_nutricional_formulacoes`): alteram estrutura ou migram dados históricos. Não são chamadas em runtime. Não precisa de filtro.

**Conclusão:** nenhuma RPC ou trigger precisa de mudança. A proteção fica toda na camada de UI (selects filtrados), que é onde o nutricionista escolhe a formulação. As RPCs/triggers apenas processam o que foi vinculado.

### 4.7. Auditoria do PWA (completa)

A auditoria de todos os `getFormulacoes` e `from('formulacoes')` no PWA confirmou que a spec cobre todos os pontos relevantes:

- **`SuplementacaoPage.tsx:237`** e **`MortePage.tsx:358`**: chamam `getFormulacoes(fazendaId)` para select de formulação. Spec seção 5.1 adiciona `soTMR = true`.
- **`cadastroCache.ts:1699, 1711, 2071`**: cache de formulações. Spec seção 5.5 mantém sem filtro (traz tudo para cache).
- **`supabaseService.ts:532`**: busca `gmd` por `formulacao_id` específico (leitura pontual por ID). Não é listagem, não precisa de filtro.
- **`supabaseService.ts:830` (`getFormulacaoById`)**: busca por ID. Não é listagem, não precisa de filtro.
- **`supabaseService.ts:1028` (`getFormulacoesDietas`)**, **`getDietas`**, **`createFormulacao`**: legados sem consumidores na UI. Sem impacto.
- **`supabaseService.ts:1044` (`getFormulacoesNomes`)**: definido mas sem consumidores na UI. Sem impacto.
- **`useCadastroOptions.ts:35`**: registra `getFormulacoes` como fonte de opções de cadastro, mas nenhuma página chama `useCadastroOptions('formulacoes', ...)`. Sem impacto.

**Conclusão:** o PWA está totalmente coberto pela spec atual. Nenhuma mudança adicional além das já previstas nas seções 5.1 e 5.2.

### 4.8. Chat IA e Relatórios

A auditoria incluiu busca por `from('formulacoes')` e `getFormulacoes` em todos os arquivos de chat IA e relatórios do Painel Web. Nenhum resultado. Nem o chat IA nem os relatórios acessam a tabela `formulacoes` diretamente; consomem dados derivados (lotes, planos nutricionais, registros de suplementação) que já refletem as formulações vinculadas. Sem mudança necessária.

**Auditoria completa:** todos os pontos de acesso a `formulacoes` no Painel Web (8 arquivos), PWA (5 arquivos) e Supabase (13 migrations) foram verificados. A spec cobre todos os que precisam de filtro e documenta os que não precisam.

## 5. Mudanças no PWA

### 5.1. `supabaseService.ts` - `getFormulacoes`

A função `getFormulacoes` (linha 800-810) é usada em três contextos:

1. **`SuplementacaoPage.tsx`** (linha 237): select de formulação no registro de suplementação. O peão só deve ver TMRs (fórmulas finais), não premixes intermediários.
2. **`MortePage.tsx`** (linha 346): mesmo contexto, mesmo filtro.
3. **`cadastroCache.ts`** (linhas 1699, 1711, 2071): cache geral de formulações. Pode trazer tudo.

**Solução:** adicionar parâmetro opcional `soTMR: boolean = false`:

```typescript
export async function getFormulacoes(fazendaId: string, soTMR: boolean = false): Promise<any[]> {
  const client = getSupabaseClient()
  let query = (client as any)
    .from('formulacoes')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
  if (soTMR) {
    query = query.eq('e_premix', false)
  }
  const { data, error } = await query.order('nome')
  if (error) throw error
  return data
}
```

Atualizar as chamadas em `SuplementacaoPage.tsx:237` e `MortePage.tsx:346` para `getFormulacoes(fazendaId, true)`. As chamadas em `cadastroCache.ts` permanecem sem o parâmetro (traz tudo).

### 5.2. `supabaseService.ts` - `getInsumos`

Sem mudança. Premix-gerados aparecem como insumos normalmente. O peão pode registrar saída de premix na produção de TMR (o premix é consumido como input da dieta final).

### 5.3. `supabaseService.ts` - `getInsumosNomes`

Sem mudança. Usado para autocomplete em entradas de insumos. Premix-gerados não deveriam aparecer aqui (não são comprados, são produzidos), mas o filtro seria `.is('formulacao_origem_id', null)`. **Decisão:** não filtrar agora. Se o peão registrar entrada de um premix por engano, é imprecisão operacional corrigível, não bug. Adicionar filtro depois se virar problema.

### 5.4. `FormulacaoDetalhesCard.tsx`

Sem mudança. Continua mostrando teor MS, meta de consumo, peso vivo e métricas históricas para a fórmula final (TMR). O premix não precisa de card no PWA porque o peão não registra suplementação contra premix.

### 5.5. `cadastroCache.ts`

Sem mudança estrutural. O cache já armazena `formulacoes` e `insumos` como listas planas em IndexedDB. As novas colunas (`e_premix`, `formulacao_origem_id`) vêm no `select('*')` e são persistidas automaticamente no cache. O PWA offline consegue distinguir premix de TMR e insumo atômico de insumo gerado sem nenhuma lógica nova.

### 5.6. `syncService.ts`

Sem mudança. O PWA não cria nem edita formulações ou insumos. O sync de registros operacionais (suplementação, entrada/saida de insumos) não é afetado.

## 6. Fluxos de UI/UX

### 6.1. Criar premix (nutricionista, Painel Web)

1. Nutricionista clica em "Nova Formulação" no `Formulacoes.tsx`.
2. Preenche nome ("Premix Boi Magro"), tipo ("Proteico"), categoria, parâmetros.
3. Adiciona insumos (milho, farelo de soja, ureia, núcleo) e define `% MS` de cada um.
4. Marca o checkbox "Premix".
5. Vê no rodapé da tabela: `Teor MS: 89,4%`, `Custo MN: R$ 2.023,00/t`. Esses são os valores que o insumo gerado terá.
6. Clica em "Salvar Formulação".
7. Sistema salva a formulação com `e_premix = true` e faz upsert no insumo "Premix Boi Magro" com `teor_ms = 89,4`, `preco_ton_mn = 2023`, `tipo = 'Premix'`, `formulacao_origem_id = <id da formulação>`.
8. Toast/snackbar: "Formulação salva. Insumo 'Premix Boi Magro' gerado para uso em TMRs."

### 6.2. Criar TMR que usa premix (nutricionista, Painel Web)

1. Nutricionista clica em "Nova Formulação".
2. Preenche nome ("TMR Boi Magro Confinação"), tipo ("Ração"), categoria, parâmetros.
3. Adiciona insumos: silagem de capim, caroço de algodão, capulho de algodão, e **"Premix Boi Magro"** (que aparece no select de insumos como qualquer outro).
4. Define `% MS` de cada um. O premix entra com seu teor_ms (89,4%) e preço (R$ 2.023/t) reais.
5. Não marca o checkbox "Premix" (esta é a TMR final).
6. Clica em "Salvar Formulação".
7. Sistema salva a TMR com `e_premix = false`. Nenhum insumo é gerado.

### 6.3. Editar premix (nutricionista, Painel Web)

1. Nutricionista clica no card do premix na listagem (badge "Premix" visível).
2. Edita os insumos ou `% MS`.
3. Salva.
4. Sistema atualiza a formulação e o insumo correspondente (upsert via `formulacao_origem_id`).
5. TMRs que usam o premix **não são recalculadas automaticamente**. O snapshot antigo permanece no JSONB delas.
6. Se o nutricionista quiser atualizar a TMR, reabre e salva (relê o insumo atualizado).

### 6.4. Editar insumo gerado (tentativa, Painel Web)

1. Nutricionista clica no card do insumo "Premix Boi Magro" em `Insumos.tsx`.
2. Vê badge "Gerado de formulação" no subtítulo.
3. Clica em "Editar". É redirecionado para `/controller/formulacoes?edit=<formulacao_id>`.
4. O botão "Desativar" não aparece.

### 6.5. Desativar premix (nutricionista, Painel Web)

1. Nutricionista abre o premix em `Formulacoes.tsx`.
2. Desmarca o checkbox "Premix".
3. Salva.
4. Sistema atualiza a formulação com `e_premix = false` e desativa o insumo correspondente (`ativo = false`, `deleted_at = now()`).
5. O insumo some do select de insumos em novas TMRs (filtro `ativo = true` e `is('deleted_at', null)`).
6. TMRs existentes que referenciam o insumo no JSONB continuam funcionando (o snapshot tem os valores).

### 6.6. Registrar suplementação (peão, PWA)

1. Peão abre `SuplementacaoPage.tsx`.
2. No select de formulação, só vê TMRs (`e_premix = false`). Premixes não aparecem.
3. Seleciona a TMR, registra leitura de cocho, kg, etc.
4. Salva. O sync envia para `registros_suplementacao` normalmente.

### 6.7. Registrar entrada de insumos (peão, PWA)

1. Peão abre a caderneta de entrada de insumos.
2. No select de insumo, vê todos os insumos ativos, incluindo premix-gerados.
3. Se registrar entrada de um premix por engano, o dado vai para o banco. Imprecisão operacional, não bug. Corrigível depois.

## 7. Edge cases

### 7.1. Premix sem insumos

Se o nutricionista marca "Premix" e salva sem adicionar insumos, o insumo gerado terá `teor_ms = 0` e `preco_ton_mn = 0`. Aviso não-bloqueante é exibido (seção 4.1.9). O insumo é inútil mas não quebra nada. Se o nutricionista adicionar insumos depois e salvar, o insumo é atualizado.

### 7.2. Premix com `ativo = false`

Se o nutricionista marca "Premix" e "Inativo" e salva, a formulação é salva com `e_premix = true` e `ativo = false`, e o insumo é gerado com `ativo = false`. Nem a formulação nem o insumo aparecem em selects. Cenário válido para rascunho.

### 7.3. Renomear premix

Se o nutricionista renomeia a formulação de "Premix Boi Magro" para "Premix Boi Magro v2" e salva, o insumo correspondente é atualizado com o novo nome (upsert via `formulacao_origem_id`). TMRs que referenciam o insumo pelo `insumo_id` no JSONB continuam funcionando (o snapshot tem o nome antigo, mas o `insumo_id` aponta para o insumo renomeado). Se o nutricionista reabrir e salvar a TMR, o snapshot é atualizado com o novo nome.

### 7.4. Deletar formulação premix

O `handleToggleActive` de `Formulacoes.tsx` (linha 407-427) faz soft delete (`ativo = false`, `deleted_at = now()`). Não deleta fisicamente. O insumo gerado **não é desativado automaticamente** quando a formulação é desativada via toggle (apenas quando o checkbox "Premix" é desmarcado no formulário). **Decisão:** alinhar os dois caminhos. Se a formulação premix é desativada via toggle, o insumo gerado também deve ser desativado. Adicionar ao `handleToggleActive`:

```typescript
if (editingFormulacao?.e_premix || dieta.e_premix) {
  await supabase
    .from('insumos')
    .update({ ativo: !dieta.ativo, deleted_at: !dieta.ativo ? new Date().toISOString() : null })
    .eq('formulacao_origem_id', dieta.id)
}
```

### 7.5. Premix referenciado por TMR inativa

Se um premix é desativado mas uma TMR ativa o referencia no JSONB, a TMR continua funcionando (o snapshot tem os valores). O premix não aparece mais no select de insumos para novas TMRs, mas TMRs existentes não quebram. Comportamento correto.

### 7.6. Conflito de nome de insumo

Se já existe um insumo atômico chamado "Premix Boi Magro" e o nutricionista cria uma formulação premix com o mesmo nome, o `handleSubmit` bloqueia o save com alerta antes de qualquer escrita no banco (seção 4.1.5). A validação consulta `insumos` por nome exato, `ativo = true` e `formulacao_origem_id IS NULL`, e se encontra colisão, exibe:

> Já existe um insumo atômico chamado "Premix Boi Magro". Renomeie a formulação ou o insumo existente para evitar confusão no select de ingredientes.

O nutricionista precisa renomear a formulação (ex: "Premix Boi Magro v2") ou ir em `Insumos.tsx` e desativar/renomear o insumo atômico conflitante antes de salvar.

**Decisão:** não adicionar unique constraint em `(fazenda_id, nome)` no banco agora, porque pode quebrar dados existentes (insumos duplicados históricos). A validação frontend é suficiente para o fluxo normal. A constraint fica como débito técnico futuro, após uma limpeza de duplicatas históricas.

**Cenário não coberto pela validação:** renomear um premix para o nome de um insumo atômico existente na edição. A validação no `handleSubmit` cobre esse caso também, porque roda tanto em insert quanto em update. Se o nutricionista edita o premix "Premix A" e renomeia para "Milho" (que já existe como insumo atômico), o save é bloqueado.

## 8. O que não muda

- `lote_categorias`, `planos_nutricionais`, cron `update_dados_lotes`, recategorização, cronologia evolutiva: sem impacto. O lote continua referenciando a TMR (fórmula final) via `lote_categorias.formulacao_id`.
- `registros_suplementacao`, `registros_entrada_insumos`, `registros_saida_insumos`: sem impacto. O PWA continua lendo e escrevendo normalmente.
- `FormulacaoDetalhesCard` do PWA: sem impacto. Continua mostrando métricas da fórmula final.
- Sync do PWA, IndexedDB, offline-first: sem impacto. O premix é só mais um insumo e mais uma formulação com flag.
- RLS: sem policy nova. As colunas novas herdam o filtro por `fazenda_id` das policies existentes.

## 9. Plano de implementação

### Ordem recomendada

1. **Migration** (`add_premix_flag_and_insumo_origem`): criar colunas `e_premix` e `formulacao_origem_id` + FK + índice. Testar na fazenda de testes.
2. **`Formulacoes.tsx`**: checkbox, validação bloqueante de colisão de nome, upsert do insumo on save, badge na listagem, filtro de listagem, aviso de premix sem insumos, alinhar `handleToggleActive`.
3. **`Insumos.tsx`**: badge, redirecionamento de edição, bloquear desativar.
4. **`Lotes.tsx`**: filtrar `e_premix = false` no select de formulações que popula `nutritionalOptions` (linha 260). Isso cobre indiretamente o `PlanoNutricionalDraftModal`.
5. **`PlanoNutricionalModal.tsx`**: filtrar `e_premix = false` no select de formulações (linha 137).
6. **`FaixasCategorias.tsx`**: filtrar `e_premix = false` no `carregarFormulacoes` (linha 610). Não filtrar o `loadFormulacoesMap` (linha 231).
7. **`Currais.tsx`**: filtrar `e_premix = false` no select de formulações (linha 171).
8. **PWA `supabaseService.ts`**: parâmetro `soTMR` em `getFormulacoes`.
9. **PWA `SuplementacaoPage.tsx` e `MortePage.tsx`**: passar `soTMR = true`.
10. **Testes** na fazenda de testes (`d649c65e-16ab-4b77-a84b-df937aa41cc3`): criar premix, criar TMR com premix, editar premix, desativar premix, verificar PWA, verificar que premix não aparece em nenhum select de vínculo (lote, plano nutricional, recategorização, curral, suplementação PWA).
11. **Typecheck e build** de ambos os repositórios.

### Verificação

- `cd frontend && npx tsc --noEmit` (Painel Web)
- `cd frontend && npm run build` (Painel Web)
- `cd frontend && npx tsc --noEmit` (PWA)
- `cd frontend && npm run build` (PWA)

### Critérios de sucesso

1. Criar uma formulação marcada como premix gera um insumo com teor_ms e preco_ton_mn corretos.
2. O insumo gerado aparece no select de insumos ao criar outra formulação.
3. Editar o premix atualiza o insumo correspondente.
4. O PWA não lista premixes no select de suplementação.
5. Insumos gerados não são editáveis em `Insumos.tsx` (redirecionam para a formulação).
6. Desativar um premix desativa o insumo correspondente.
7. TMRs existentes que referenciam um premix não quebram quando o premix é editado ou desativado.
8. Criar ou editar um premix com nome idêntico a um insumo atômico ativo existente é bloqueado com alerta antes de qualquer escrita no banco.
9. Premixes não aparecem no select de "estratégia nutricional" em `Lotes.tsx` (vínculo com `lote_categorias.formulacao_id`), impedindo que um premix seja tratado como dieta final de um lote.
10. Premixes não aparecem no select de formulação em `PlanoNutricionalModal.tsx` (criar/editar plano nutricional).
11. Premixes não aparecem no select de "Trocar formulação" no modal de recategorização em `FaixasCategorias.tsx`.
12. Premixes não aparecem no select de formulação em `Currais.tsx` (vínculo com `currais.formulacao_id`).
13. Premixes continuam aparecendo no mapa de resolução de nomes em `FaixasCategorias.tsx:loadFormulacoesMap` (auditoria/histórico não é quebrada).
14. Premixes sem categoria confirmada continuam aparecendo no alerta de backfill do dashboard.

## 10. Pontos de atenção para a implementação

1. **Capturar id da formulação no insert.** O insert atual não retorna id. É preciso adicionar `.select('id').single()` e capturar o retorno para usar no `formulacao_origem_id` do insumo.
2. **Ordem das operações no `handleSubmit`.** Salvar a formulação primeiro, pegar o id, depois fazer upsert do insumo. Se o upsert do insumo falhar, a formulação já está salva (não é transacional). Aceitável: o nutricionista pode reabrir e salvar de novo. Se quiser transacional, seria RPC, mas o custo-benefício não justifica para este fluxo.
3. **`handleToggleActive` em `Formulacoes.tsx`** precisa ser atualizado para desativar/reativar o insumo gerado junto com a formulação premix. Sem isso, desativar o premix via toggle deixa o insumo órfão ativo.
4. **`useNavigate` em `Insumos.tsx`.** Importar de `react-router-dom`. Verificar se a rota `/controller/formulacoes` está correta (confirmar no `ControllerLayout` ou router).
5. **Filtro `soTMR` no PWA.** Garantir que `cadastroCache.ts` não passa o parâmetro (precisa trazer tudo para cache), e que `SuplementacaoPage.tsx` e `MortePage.tsx` passam `true`.
6. **Coluna `e_premix` sem acento.** Seguir convenção SQL do projeto. O TypeScript pode chamar `e_premix` ou `ePremix` conforme o estilo do arquivo (verificar padrão de camelCase nos outros campos do `Dieta`).
