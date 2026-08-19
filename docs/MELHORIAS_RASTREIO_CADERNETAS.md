# RastreioCadernetas.tsx — Oportunidades de melhoria

Levantamento de melhorias identificadas no componente `src/pages/controller/RastreioCadernetas.tsx`, organizadas por fases de implementação sugeridas (da maior para a menor urgência).

Referências de linha são aproximadas e podem divergir após edições recentes do usuário.

---

## Fase 1 — Clareza semântica dos números (alto impacto visual, baixo risco) — CONCLUÍDA

### 1.1 Card de tendência: números sem rótulo de unidade
**Linhas**: ~370-389
**Problema**: os três números grandes (`totalPeriodoAnterior`, `totalRegistros`, `tendenciaDelta`) têm apenas labels minúsculos em cinza-400 acima deles. O usuário precisa deduzir que "Período anterior" significa "X registros no período anterior". Faltam as palavras "registros" e o período de referência concreto (ex: "30 dias anteriores" em vez de "Período anterior").
**Sugestão**: adicionar "registros" abaixo ou ao lado de cada número, e substituir "Período anterior" / "Período atual" por labels concretos como "30 dias anteriores" / "últimos 30 dias".

### 1.2 Card "Caderneta mais usada": número sem rótulo
**Linhas**: ~451-461
**Problema**: o número grande `cadernetaMaisUsada.total` aparece em `text-3xl` sem rótulo. O texto auxiliar diz "X registros no período", mas o número em si parece um KPI isolado.
**Sugestão**: integrar a palavra "registros" abaixo do número, ou reescrever o card para que o número apareça dentro de uma frase.

### 1.3 Distribuição por dia da semana: números sem indicar que são registros
**Linhas**: ~339-359
**Problema**: cada barra tem o número no topo, mas não há rótulo de eixo Y nem indicação de que o número representa registros. O `title` no tooltip diz "X registros", mas o usuário não vê isso sem hover.
**Sugestão**: adicionar rótulo "registros" no canto superior esquerdo do card, ou um pequeno subtítulo abaixo do título.

### 1.4 Timeline diária do usuário: mesmo problema
**Linhas**: ~541-563
**Problema**: números no topo das barras sem indicar que são registros. O eixo X mostra dd/mm mas não há indicação de que o eixo Y é quantidade de registros.
**Sugestão**: mesma da 1.3.

### 1.5 Card "Usuários ativos": não diz "no período"
**Linhas**: ~308
**Problema**: mostra o número mas não diz "no período" explicitamente. Quando `periodo === 'tudo'`, o número significa todos que já registraram, mas o rótulo é o mesmo.
**Sugestão**: tornar o rótulo dinâmico: "Usuários ativos" quando período finito, "Usuários com histórico" quando `tudo`.

---

## Fase 2 — Correções de lógica e consistência (médio impacto, médio risco) — CONCLUÍDA

### 2.1 Tendência mostra "-" sem explicação quando não há período anterior
**Linhas**: ~231, ~383-385
**Problema**: quando `usuarioSelecionado` está ativo e o usuário não tinha registros no período anterior, `totalPeriodoAnterior` fica 0, `tendenciaDelta` retorna `null`, e o card mostra "-" sem explicar que não há período anterior para comparar.
**Sugestão**: distinguir três estados: (a) há comparação válida → mostra delta, (b) período anterior é zero → mostra "sem registros no período anterior", (c) `periodo === 'tudo'` → mostra mensagem atual.

### 2.2 Inconsistência entre registros filtrados e contador de usuários global na tendência
**Linhas**: ~374, ~379
**Problema**: com filtro de usuário, `totalRegistros` é filtrado (só o usuário), mas `usuarios.length` continua global. A linha 379 tenta corrigir com ternário, mas o número `totalPeriodoAnterior` também é filtrado enquanto `prevPeriodUsuarios.length` não é. A comparação "X usuários vs Y usuários" mistura escopos.
**Sugestão**: quando há filtro, mostrar "1 usuário" nos dois lados, ou ocultar o contador de usuários e mostrar apenas registros.

### 2.3 Mensagem genérica quando `prevPeriodUsuarios.length === 0`
**Linhas**: ~393-396
**Problema**: mostra "Sem dados do período anterior" sem distinguir se é fazenda nova sem histórico suficiente vs. nenhum usuário registrou no período anterior.
**Sugestão**: verificar `allTimeUsuarios.length` para distinguir "fazenda sem histórico suficiente" de "nenhum registro no período anterior".

### 2.4 `cadernetaMaisUsada` não deixa claro que é do período
**Linhas**: ~191, ~446-461
**Problema**: o título "Caderneta mais usada" não especifica que é do período selecionado, não de todos os tempos.
**Sugestão**: alterar para "Caderneta mais usada no período" ou similar.

---

## Fase 3 — Performance e carregamento (baixo impacto visual, médio impacto técnico) — CONCLUÍDA

### 3.1 Cross-filter refaz query de cadernetas desnecessariamente
**Linhas**: ~122-136
**Problema**: quando `usuarioSelecionado` muda, o effect chama `getRastreioCadernetas(fazendaId, dataInicio)` novamente (sem filtro de usuário) e depois filtra no cliente com `.filter`. A query de cadernetas já foi feita na carga principal e está em `cadernetas`.
**Sugestão**: filtrar o estado `cadernetas` existente em vez de refazer a RPC. Só a query de `detalhe` precisa ser refazida (pois é por usuário).

### 3.2 `allTimeUsuarios` recarrega a cada mudança de período
**Linhas**: ~139-147
**Problema**: `allTimeUsuarios` não depende do período, mas o effect roda quando `dataInicioAnterior` muda (que deriva de `periodo`). A query all-time é refeita desnecessariamente a cada troca de preset.
**Sugestão**: separar em um effect independente que roda apenas quando `fazendaId` muda, não quando `periodo` muda.

### 3.3 `effectiveCadernetas.sort` muta o array original
**Linhas**: ~238
**Problema**: `cadernetasDoUsuario` chama `.sort` diretamente em `effectiveCadernetas`, que é o mesmo array referenciado por `coberturaPorCaderneta` e outras métricas. O sort muta o array original, o que pode afetar a ordem de renderização em outros componentes.
**Sugestão**: usar `[...effectiveCadernetas].sort(...)` para criar uma cópia antes de ordenar.

---

## Fase 4 — UX e interatividade (polimento, baixo risco) — CONCLUÍDA

### 4.1 Tabela "Registros por caderneta" sem ordenação
**Linhas**: ~470-496
**Problema**: a tabela mostra usuário, caderneta, total, dias e último, mas não é ordenável. Com muitos usuários e cadernetas, fica difícil encontrar o maior contribuinte.
**Sugestão**: adicionar sortable headers (clique no header ordena por aquela coluna), com estado local de `sortColumn` e `sortDirection`.

### 4.2 Tabela "Usuários parados" sem ação
**Linhas**: ~619-659
**Problema**: lista usuários parados há X dias, mas não oferece nenhuma ação. É apenas diagnóstico sem desfecho.
**Sugestão**: adicionar botão "ver histórico" que filtra por aquele usuário, ou um link para contato/notificação.

### 4.3 Cobertura por caderneta não é clicável
**Linhas**: ~577-589
**Problema**: as barras de cobertura mostram volume por caderneta, mas não são clicáveis. Seria natural clicar numa caderneta para ver quais usuários a usaram, similar ao cross-filter de usuário.
**Sugestão**: adicionar onClick na barra para filtrar por caderneta (novo estado `cadernetaSelecionada`), com banner de filtro similar ao de usuário.

### 4.4 Sem indicador de período nas métricas
**Linhas**: ~305-329
**Problema**: os cards de resumo não repetem o período selecionado. Com `periodo === 'tudo'`, "Total de registros" significa "todos os registros ever", mas com `periodo === '7d'` significa "últimos 7 dias". O contexto está apenas no botão de período no topo.
**Sugestão**: adicionar um subtítulo no topo da seção de cards, ou repetir o período no rodapé dos cards.

### 4.5 Banner de cross-filter usa travessão
**Linhas**: ~287
**Problema**: o texto usa `—` (travessão Unicode) como separador, que viola a regra de estilo do projeto de não usar travessão.
**Sugestão**: substituir por vírgula, dois-pontos ou parênteses.

---

## Fase 5 — Acessibilidade (baixo impacto visual, importante para conformidade) — CONCLUÍDA

### 5.1 Barras de gráfico sem role ou aria-label
**Linhas**: ~339-359, ~541-563
**Problema**: os gráficos de distribuição semanal e timeline diária são puramente visuais. Não há `role="img"` nem `aria-label` descrevendo os dados. Um leitor de tela não consegue interpretar as barras.
**Sugestão**: envolver cada gráfico em um container com `role="img"` e `aria-label` contendo um resumo textual dos dados.

### 5.2 Botões de período sem aria-pressed
**Linhas**: ~267-279
**Problema**: os botões de 7d/30d/90d/tudo não indicam estado ativo para leitores de tela.
**Sugestão**: adicionar `aria-pressed={periodo === p}` em cada botão.

### 5.3 Status "ativo/parado" do usuário baseado apenas em cor
**Linhas**: ~426
**Problema**: o indicador verde/cinza no bullet point da lista de usuários não tem texto alternativo. Um usuário daltônico ou leitor de tela não sabe se o ponto verde significa "ativo".
**Sugestão**: adicionar `aria-label` ou `sr-only` com o texto "ativo" / "inativo", ou usar um ícone com texto.

---

## Fase 6 — Edge cases (baixa frequência, médio risco de confusão)

### 6.1 `regularidadeUsuarios` não respeita filtro de usuário
**Linhas**: ~195
**Problema**: `regularidadeUsuarios` é calculado sobre `usuarios` (global), não sobre `effectiveCadernetas`. Quando um usuário está selecionado, a lista lateral continua mostrando todos os usuários com suas regularidades globais.
**Nota**: isso é intencional (a lista lateral é global), mas o contraste com as métricas filtradas pode confundir.
**Sugestão**: manter o comportamento, mas adicionar um subtítulo na lista lateral esclarecendo que ela é global mesmo com filtro ativo.

### 6.2 Período "tudo" sem indicação de que tendência está indisponível
**Linhas**: ~392-396
**Problema**: o card de tendência mostra "Selecione um período finito" quando `periodo === 'tudo'`. Mas os cards de resumo continuam mostrando números sem indicar que a tendência é a única métrica indisponível.
**Sugestão**: adicionar um aviso visual sutil (ex: badge "indisponível no modo tudo") nos cards de resumo quando `periodo === 'tudo'`, ou ocultar a seção de tendência completamente em vez de mostrar o placeholder.

---

## Resumo de prioridades

| Fase | Itens | Impacto | Risco | Esforço |
|------|-------|---------|-------|---------|
| 1 | 5 | Alto visual | Baixo | Baixo |
| 2 | 4 | Médio | Médio | Médio |
| 3 | 3 | Baixo visual | Médio técnico | Baixo |
| 4 | 5 | Polimento | Baixo | Médio |
| 5 | 3 | Baixo visual | Baixo | Baixo |
| 6 | 2 | Baixa frequência | Médio confusão | Baixo |

**Recomendação**: começar pela Fase 1 (clareza semântica) e Fase 3 (performance), que juntas resolvem os problemas mais visíveis e os técnicos de baixo risco. Fase 2 em seguida, pois envolve mudanças de lógica que precisam teste. Fases 4, 5 e 6 podem ser feitas incrementalmente.
