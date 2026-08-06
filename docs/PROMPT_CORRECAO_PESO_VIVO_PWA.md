# Correção: peso_vivo_kg deve refletir a data do registro, não a data da sincronização

## Contexto

O PWA grava `peso_vivo_kg` em `registros_suplementacao` no momento da sincronização (`created_at`), lendo o valor de `lote_categorias.peso_vivo_atual_kg_cab`. Esse valor é atualizado diariamente pelo cron `update_dados_lotes` (00:00 UTC), que projeta o peso com base em `peso_inicio_kg_cab + gmd * dias_desde_data_inicio`.

O problema: quando o peão registra um trato retroativo (ou sincroniza horas/dias depois do trato), o PWA lê o peso **atual** (projetado para a data do `created_at`), não o peso projetado para a **data do registro** (`data`). Isso introduz um descolamento temporal: o registro fica com um peso que pertence a uma data diferente do trato.

## Evidência

Lote "Farmacia", fazenda Guanabara (`f8be22c5-12e9-4bda-a813-fae8cb3d47ec`), plano com `peso_inicio_kg_cab = 450`, `gmd_planejado = 0.8`, `data_inicio = 2026-07-23`:

| data_registro | created_at | peso gravado (errado) | peso projetado para data_registro (correto) |
|---|---|---|---|
| 05/08 | 06/08 11:43 | 461,20 (peso de 06/08) | 460,40 (peso de 05/08) |
| 29/07 | 29/07 22:12 | 458,40 | 454,80 |
| 28/07 | 28/07 00:17 | 350,00 | 454,00 |

O registro de 05/08 foi sincronizado em 06/08, após o cron de 06/08 ter rodado. O PWA leu 461,2 (peso projetado para 06/08) e gravou no registro com data 05/08. A diferença de +0,8 kg é exatamente um dia extra de GMD.

## Correção

No momento de gravar `peso_vivo_kg` em `registros_suplementacao`, o PWA deve calcular o peso projetado para a **data do registro** (`data`), não ler o valor atual de `lote_categorias.peso_vivo_atual_kg_cab` (que reflete a data de hoje).

### Ação: Calcular a projeção no cliente (recomendada)

Buscar os parâmetros do plano nutricional ativo do lote e calcular:

```
peso_vivo_kg = peso_inicio_kg_cab + gmd_efetivo * (data_registro::date - data_inicio::date)
```

Onde `gmd_efetivo = COALESCE(plano.gmd_planejado, formulacao.gmd)`.

Query para obter os parâmetros (via Supabase client com RLS do peão):

```sql
SELECT
  pn.peso_inicio_kg_cab,
  pn.data_inicio,
  COALESCE(pn.gmd_planejado, f.gmd) AS gmd_efetivo,
  lc.data_ajuste_peso,
  lc.peso_vivo_atual_kg_cab
FROM lote_categorias lc
JOIN planos_nutricionais pn ON pn.lote_categoria_id = lc.id AND pn.ativo = true
JOIN formulacoes f ON f.id = pn.formulacao_id
WHERE lc.lote_id = :lote_id
  AND lc.ativo = true
  AND lc.data_fim IS NULL
LIMIT 1;
```

Cálculo no cliente (TypeScript):

```typescript
function calcularPesoProjetado(
  dataRegistro: string, // ISO date do campo "data" do registro
  pesoInicioKgCab: number,
  dataInicio: string, // ISO date do plano
  gmdEfetivo: number,
  dataAjustePeso: string | null, // lc.data_ajuste_peso
  pesoVivoAtualKgCab: number | null, // lc.peso_vivo_atual_kg_cab
): number {
  const dataReg = new Date(dataRegistro)
  const dataIni = new Date(dataInicio)
  const hoje = new Date() // data atual do dispositivo

  if (dataAjustePeso && pesoVivoAtualKgCab) {
    // Ajuste manual: peso_vivo_atual_kg_cab é o peso projetado para HOJE
    // (o cron update_dados_lotes incrementa peso_vivo_atual_kg_cab diariamente).
    // Para obter o peso na data D: peso_atual + gmd * (D - hoje)
    // Isso é equivalente a: peso_no_ajuste + gmd * (D - data_ajuste)
    // quando o cron tem corrido diariamente.
    const diasAteRegistro = Math.floor(
      (dataReg.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
    )
    return pesoVivoAtualKgCab + gmdEfetivo * diasAteRegistro
  }

  // Projeção padrão: peso_inicio + gmd * dias_desde_data_inicio
  const diasDesdeInicio = Math.max(
    0,
    Math.floor((dataReg.getTime() - dataIni.getTime()) / (1000 * 60 * 60 * 24)),
  )
  return pesoInicioKgCab + gmdEfetivo * diasDesdeInicio
}
```

**Atenção sobre a fórmula data_ajuste_peso**: `peso_vivo_atual_kg_cab` tem semântica
ambígua. Logo após um ajuste manual (antes do cron rodar), ele é o peso na
`data_ajuste_peso`. Depois que o cron roda (diariamente às 00:00 UTC), ele é o peso
projetado para hoje. A fórmula `peso_atual + gmd * (D - hoje)` é correta quando o cron
já rodou (caso comum, pois o peão sincroniza durante o dia, após o cron). Se o cron
ainda não rodou no dia do ajuste, o valor calculado será ligeiramente incorreto, mas a
trigger no banco (`recalcular_peso_vivo_lote`) corrigirá automaticamente quando o cron
rodar.

## Considerações

1. **Lote sem plano ativo**: se o lote não tem plano nutricional ativo, a RPC/consulta retorna NULL. Nesse caso, o PWA deve preservar o comportamento atual (gravar NULL ou o valor que tinha antes). Não inventar peso.
2. **Recategorização**: se o registro é de uma data anterior à recategorização (categoria atual não cobre aquela data), a projeção pode ser incorreta. A RPC usa a categoria ativa hoje, que pode não ter existido na data do registro. Para registros retroativos antes de recategorização, o peso ideal seria lido da categoria que estava ativa naquela data, mas isso adiciona complexidade significativa. Para a versão inicial, aceitar essa limitação e documentar.
3. **Fuso horário**: `data_registro` é timestamptz. Normalizar para date (sem horário) antes de calcular dias, para evitar off-by-one por fuso.
4. **GMD do plano vs formulação**: usar `COALESCE(pn.gmd_planejado, f.gmd)`, mesma lógica do cron.
5. **data_ajuste_peso**: se o peão ajustou o peso manualmente em uma data específica, a projeção deve partir do peso ajustado, não do peso_inicio. A fórmula correta é `peso_vivo_atual_kg_cab + gmd * (D - hoje)` (não `+ gmd * (D - data_ajuste)`), porque `peso_vivo_atual_kg_cab` já é o peso projetado para hoje após o cron rodar. A trigger `recalcular_peso_vivo_lote` no banco corrige qualquer defasagem.
6. **Trigger de correção no banco**: existe uma trigger `recalcular_peso_vivo_lote` que recalcula `peso_vivo_kg` em `registros_suplementacao` quando `data_inicio`, `gmd_planejado`, `peso_inicio_kg_cab`, `data_ajuste_peso`, `peso_vivo_atual_kg_cab` ou `peso_entrada_kg_cab` são editados. Isso significa que mesmo que o PWA grave um valor ligeiramente incorreto (por defasagem de cron ou cache), o banco corrigirá automaticamente quando os parâmetros mudarem ou quando o cron rodar.

## Onde calcular

O cálculo deve acontecer **em ambos** os momentos, com o sync como fonte de verdade:

1. **No salvamento local** (`SuplementacaoPage.tsx` ao salvar em IndexedDB): calcular com os parâmetros do plano em cache no dispositivo, para o peão ver o peso imediatamente na tela. Usar a `data` do registro, não `NOW()`.
2. **No sync** (antes do INSERT/UPDATE em `registros_suplementacao` no Supabase): recalcular com parâmetros frescos do Supabase para a mesma `data` do registro. Se o valor diferir do local, atualizar o registro antes de enviar. O sync é quem garante que o peso gravado no Supabase está correto.

A razão de não fazer só no sync é UX: o peão que registra um trato enquanto online espera ver o peso projetado na hora, não um campo vazio que só preenche após a sincronização. A razão de não fazer só no local é que os parâmetros em cache podem estar desatualizados se o plano foi editado ou o lote foi recategorizado entre o último acesso do peão e o registro do trato. O sync corrige essa defasagem.

## Disparador

Aplicar esta correção quando o PWA for gravar `peso_vivo_kg` em `registros_suplementacao`. O cálculo deve acontecer antes do INSERT, usando a `data` do registro (não `created_at`/`NOW()`).
