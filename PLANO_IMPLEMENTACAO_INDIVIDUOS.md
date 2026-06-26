# Plano de Implementação - Gestão de Indivíduos

## Objetivo

Implementar o frontend e os ajustes backend necessários para gerenciamento de indivíduos (animais), incluindo criação manual, visualização e edição de indivíduos criados automaticamente via registros de maternidade, além de notificações para dados incompletos.

## Princípios Acordados

- Dois modos de visualização: **condensada** (resumo essencial) e **completa** (todos os campos organizados).
- Nunca permitir edição direta de `lote_atual` e `pasto_atual` na tela do indivíduo. Esses dados devem ser alterados apenas pelos fluxos de movimentação existentes.
- Não haverá exclusão de indivíduos nesta fase.
- Não haverá importação nem exportação nesta fase.
- Campos calculados pelos triggers devem ser exibidos como somente leitura.
- Notificações devem ser enviadas para todos os usuários ativos vinculados à fazenda.

---

## Fase 1 - Fundação e Banco de Dados

### 1.1 Revisão estrutural da tabela `individuos`

- Revisar todos os 47 campos da tabela.
- Classificar cada campo em:
  - **Obrigatório para completude**: `id_brinco`, `id_chip`, `id_manejo`, `data_nascimento`, `peso_nascimento_kg`, `sexo`, `categoria`, `raca`.
  - **Recomendado**: `pai`, `mae`, `peso_atual_kg`, `peso_meta_kg`, `lote_atual`, `pasto_atual`.
  - **Opcional/derivado**: demais campos.
- Documentar a regra de completude para uso no score e nos filtros.

### 1.2 Índices e constraints

- Criar `UNIQUE INDEX` parciais para `id_manejo`, `id_brinco` e `id_chip` por fazenda, respeitando `deleted_at IS NULL`:
  ```sql
  CREATE UNIQUE INDEX idx_individuos_brinco_unico
  ON public.individuos (fazenda_id, id_brinco)
  WHERE deleted_at IS NULL AND id_brinco IS NOT NULL;
  ```
- Criar índices para consultas frequentes:
  - `(fazenda_id, status)`
  - `(fazenda_id, categoria)`
  - `(fazenda_id, sexo)`
  - `(fazenda_id, lote_atual)`
  - `(fazenda_id, pasto_atual)`
  - `(fazenda_id, origem)`
  - `(fazenda_id, sync_status)`

### 1.3 Campo de status de completude

- Definir valores semânticos para `sync_status`:
  - `automatico_incompleto`: criado via maternidade, dados mínimos.
  - `manual_completo`: criado/editado pelo usuário, dados essenciais preenchidos.
  - `manual_incompleto`: criado/editado pelo usuário, mas ainda faltam dados essenciais.
- Atualizar o trigger `create_individual_from_maternidade` para definir `sync_status = 'automatico_incompleto'`.
- Atualizar o trigger/função de notificação para considerar esse campo.

### 1.4 Validações em nível de banco

Adicionar `CHECK` constraints onde possível:

- `sexo` IN ('Macho', 'Fêmea').
- `status` IN ('Vivo', 'Morto', 'Vendido', 'Transferido').
- `data_nascimento` não pode ser futura.
- `peso_nascimento_kg` entre 10 e 100 kg (ajustável).
- Consistência sexo/categoria: criar trigger `trg_individuos_validar_categoria` que impede `sexo = 'Macho'` com categoria feminina e vice-versa.

### 1.5 RLS

- Verificar se as políticas RLS existentes para `individuos` restringem corretamente por `fazenda_id`.
- Garantir que usuários só consultem indivíduos das fazendas vinculadas a eles.
- Não reimplementar políticas que causaram problemas anteriores; apenas revisar e ajustar se necessário.

---

## Fase 2 - Backend: Notificações e Triggers

### 2.1 Notificação de criação automática (já implementada)

- A função `notificar_individuo_incompleto` já notifica todos os usuários ativos da fazenda quando um indivíduo é criado via maternidade.
- Verificar se o link `acao_url` (`/controller/individuos/{id}`) está funcionando corretamente com o componente `Notifications`.

### 2.2 Notificação de lembrete de completude

- Criar função `notificar_individuos_incompletos_antigos()`.
- Disparar para indivíduos com `sync_status = 'automatico_incompleto'` e `created_at` há mais de 7 dias.
- Inserir notificação para todos os usuários ativos da fazenda, uma vez por semana.
- Agendar via `pg_cron` (ex: toda segunda-feira às 08:00).

### 2.3 Notificação de proximidade de desmama

- Criar função `notificar_proximidade_desmama()`.
- Identificar indivíduos com categoria `Bezerro ao Pé` ou `Bezerra ao Pé`, `idade_atual_meses` entre 6 e 8 meses e `data_desmama` nula.
- Notificar uma vez por mês para evitar spam.

### 2.4 Atualização do `sync_status` na edição

- Criar função `atualizar_sync_status_individuo()` que verifica se os campos essenciais estão preenchidos.
- Chamar via trigger `BEFORE UPDATE` na tabela `individuos`.
- Regras:
  - Se todos os campos essenciais estiverem preenchidos: `sync_status = 'manual_completo'`.
  - Se faltar algum essencial: `sync_status = 'manual_incompleto'`.
  - Não alterar `sync_status` se o registro está marcado como `automatico_incompleto` e ainda não foi editado pelo usuário (exceto para atualizar a categoria quando preenchido).

### 2.5 Vínculo maternidade ↔ indivíduo

- O trigger `create_individual_from_maternidade` já atualiza `registros_maternidade.individuo_id_cria`.
- Verificar se o vínculo é consistente e se permite navegação bidirecional no frontend.

---

## Fase 3 - Frontend: Listagem e Detalhes (Visualização Condensada)

### 3.1 Estrutura de rotas e menu

- Adicionar em `src/App.tsx`:
  - `/controller/individuos` — listagem.
  - `/controller/individuos/novo` — criação.
  - `/controller/individuos/:id` — edição/visualização.
- Adicionar item **"Indivíduos"** no menu `ControllerLayout.tsx`, dentro do grupo **"Gestão da Fazenda"**.

### 3.2 Página de listagem (`Individuos.tsx`)

- Layout mobile-first com cards em telas pequenas e tabela em telas grandes.
- Colunas condensadas:
  - Identificação principal (`id_brinco` ou `id_chip` ou `id_provisorio_cria`).
  - `categoria`.
  - `sexo`.
  - `raca`.
  - `data_nascimento`.
  - `status`.
  - Indicador de completude (badge ou barra de progresso).
- Badge "Criado via maternidade" quando `origem = 'Nascimento'` e `sync_status = 'automatico_incompleto'`.
- Botões de ação: **Ver**, **Editar**.
- Botão **"Novo Indivíduo"**.

### 3.3 Filtros e busca

- Busca por `id_manejo`, `id_brinco`, `id_chip`, `id_provisorio_cria`.
- Filtros rápidos:
  - Status (`Vivo`, `Morto`, `Vendido`).
  - Sexo (`Macho`, `Fêmea`).
  - Categoria.
  - Raça.
  - Lote atual.
  - Pasto atual.
  - Origem.
- Filtro especial **"Incompletos"**: mostrar apenas `sync_status IN ('automatico_incompleto', 'manual_incompleto')`.
- Filtro **"Criados automaticamente"**: `sync_status = 'automatico_incompleto'`.
- Botão **"Limpar filtros"**.

### 3.4 Real-time

- Inscrever-se em mudanças na tabela `individuos` para a fazenda atual.
- Recarregar a listagem quando um novo indivíduo for criado automaticamente via maternidade.

### 3.5 Score de completude

- Calcular no frontend com base na regra definida na Fase 1.
- Exibir como porcentagem ou badge:
  - 100%: verde.
  - 70-99%: amarelo.
  - < 70%: vermelho.

### 3.6 Página de detalhes condensada

- Tela inicial do indivíduo mostra apenas os dados essenciais em um card.
- Botão **"Ver ficha completa"** para expandir a visualização completa (sem editar).
- Destacar campos ausentes com alerta visual.
- Link para o registro de maternidade que originou o indivíduo, quando disponível.
- Exibir campos calculados em seção somente leitura.

---

## Fase 4 - Frontend: Criação e Edição (Visualização Completa)

### 4.1 Página de criação (`IndividuoNovo.tsx`)

- Formulário com campos essenciais para criação rápida:
  - `id_manejo`, `id_brinco`, `id_chip`.
  - `sexo`, `categoria`, `raca`.
  - `data_nascimento`, `peso_nascimento_kg`.
  - `origem`, `status`.
  - `pai`, `mae` (opcional).
- Validação em tempo real.
- Após salvar, redirecionar para `/controller/individuos/{id}` para edição completa.

### 4.2 Página de edição completa (`IndividuoDetalhes.tsx`)

- Formulário organizado em seções (tabs ou accordion):
  - **Identificação**.
  - **Nascimento e origem**.
  - **Entrada na fazenda**.
  - **Localização atual** (somente leitura, com link para o lote/pasto).
  - **Nutrição e peso**.
  - **Desmama**.
  - **Sisbov e rastreabilidade**.
  - **Campos calculados** (somente leitura).
- Campos de referência devem usar selects buscando dados das tabelas relacionadas:
  - `raca` → `racas`.
  - `lote_atual` → `lotes` (somente leitura/link).
  - `pasto_atual` → `pastos` (somente leitura/link).
  - `pai` → `individuos` com `sexo = 'Macho'`.
  - `mae` → `individuos` com `sexo = 'Fêmea'`.
  - `fornecedor` → `fornecedores`.
  - `estrategia_nutricional_id` → `estrategias_nutricionais` (se existir).

### 4.3 Validação frontend

- Unicidade dos identificadores por fazenda (validar via consulta ao Supabase antes de salvar).
- Consistência sexo/categoria.
- Data futura bloqueada.
- Peso realista.
- Categoria obrigatória conforme sexo.

### 4.4 Regras de status

- Se `status` for alterado para `Morto`:
  - Exibir modal informando que é necessário registrar a morte em `Registros de Morte`.
  - Bloquear a alteração direta de status até que o registro de morte exista (ou redirecionar para a tela de registro).
- Se `status` for alterado para `Vendido`:
  - Exigir data de saída e destino.
- Campos produtivos devem ser desabilitados quando `status != 'Vivo'`.

### 4.5 Score de completude na edição

- Barra de progresso visível no topo do formulário.
- Listar campos pendentes com ícones de alerta.
- Ao salvar, chamar a função/atualização que recalcula `sync_status`.

### 4.6 Cálculo de peso atual

- Decidir se `peso_atual_kg` será:
  - Informado manualmente pelo usuário.
  - Calculado automaticamente a partir do peso de entrada + GMD × dias.
- Se for calculado, exibir como somente leitura e permitir ajuste manual com justificativa.

---

## Fase 5 - Integrações

### 5.1 Integração com maternidade

- Em `MaternidadeDetalhes.tsx`, quando `individuo_id_cria` estiver preenchido:
  - Exibir botão **"Ver indivíduo"**.
  - Redirecionar para `/controller/individuos/{individuo_id_cria}`.
- Em `IndividuoDetalhes.tsx`, quando o indivíduo foi originado por maternidade:
  - Exibir link para o registro de maternidade.

### 5.2 Integração com registros de morte

- Na tela do indivíduo com `status = 'Morto'`, exibir link para o registro de morte.
- Na tela de `RegistrosMorteDetalhes`, quando existir `individuo_id`, exibir link para o indivíduo.

### 5.3 Integração com lotes e pastos

- A tela do indivíduo deve mostrar `lote_atual` e `pasto_atual` como links para os respectivos detalhes.
- Nunca permitir edição direta desses campos.
- Movimentações devem continuar sendo feitas pelos fluxos existentes (`Movimentacao`, `PastagensCaderneta`, etc.).

### 5.4 Integração com notificações

- Ao clicar na notificação de "indivíduo criado automaticamente", redirecionar para `/controller/individuos/{id}` e marcar a notificação como lida.
- Garantir que a tela de edição abra em modo que destaque os campos incompletos.

---

## Fase 6 - Testes e Ajustes Finais

### 6.1 Testes manuais

- Inserir um registro de maternidade e verificar:
  - Indivíduo criado automaticamente.
  - `individuo_id_cria` preenchido na maternidade.
  - Notificação recebida por todos os usuários ativos da fazenda.
  - Redirecionamento correto ao clicar na notificação.
- Criar um indivíduo manualmente e verificar:
  - Validações de unicidade.
  - Cálculo do score de completude.
  - Atualização de `sync_status`.
- Editar um indivíduo incompleto e verificar:
  - Campos calculados não editáveis.
  - Lote/pasto não editáveis.
  - Status `Morto` redireciona para registro de morte.

### 6.2 Testes mobile

- Verificar usabilidade da listagem em cards.
- Verificar navegação entre abas do formulário de edição.
- Verificar filtros em telas pequenas.

### 6.3 Testes de performance

- Listagem com 1000+ individuos.
- Verificar que a paginação e filtros server-side (se aplicável) são eficientes.
- Verificar que a inscrição real-time não causa re-renderizações excessivas.

### 6.4 Ajustes finais

- Revisar textos, labels e mensagens de erro.
- Revisar responsividade.
- Revisar permissões e RLS.
- Documentar decisões de negócio tomadas durante a implementação.

---

## Decisões de Negócio Definidas

1. **Quais campos são essenciais para considerar um indivíduo "completo"?**

   Um indivíduo será considerado suficientemente completo quando possuir preenchidos:
   - Pelo menos uma identificação principal: `id_brinco`, `id_chip`, `id_manejo` ou `id_provisorio_cria`.
   - `data_nascimento`.
   - `sexo`.
   - `categoria`.
   - `raca`.
   - `peso_nascimento_kg`.
   - `status`.

   Campos adicionais recomendados, mas não obrigatórios para completude: `pai`, `mae`, `lote_atual`, `pasto_atual`.

2. **Qual o peso mínimo e máximo realista para nascimento?**

   Não será aplicada validação de faixa fixa. O peso de nascimento já vem diretamente do `registros_maternidade`, portanto utilizar o valor informado no registro de parto.

3. **Categorias permitidas por sexo?**

   Lista oficial de categorias (todos os sexos, exceto onde indicado):
   - Bezerro ao Pé
   - Bezerra ao Pé
   - Bezerro Desmama
   - Bezerra Desmama
   - Garrote
   - Novilha
   - Boi Magro
   - Primípara
   - Vaca Parida
   - Vaca Prenha
   - Vaca Vazia
   - Vaca Descarte
   - Touro

   Regras de validação:
   - `sexo = 'Macho'`: permitir Bezerro ao Pé, Bezerro Desmama, Garrote, Boi Magro, Touro.
   - `sexo = 'Fêmea'`: permitir Bezerra ao Pé, Bezerra Desmama, Novilha, Primípara, Vaca Parida, Vaca Prenha, Vaca Vazia, Vaca Descarte.

4. **Status permitidos?**

   Lista oficial de status (serão modificados automaticamente no futuro, mas por enquanto serão dropdowns editáveis):
   - `Abatido`
   - `Doado`
   - `Morto`
   - `Transferido`
   - `Venda Vivo`
   - `Vivo`

5. **O `peso_atual_kg` é informado manualmente ou calculado?**

   Será calculado futuramente, mas por enquanto ficará em branco (`NULL`). Não será campo obrigatório e nem editável nesta fase.

6. **Qual o tempo de tolerância para notificação de indivíduo incompleto?**

   7 dias após a criação automática.

7. **Qual a idade considerada para notificação de proximidade de desmama?**

   Indivíduos entre 6 e 8 meses de idade, com peso estimado entre 180kg e 210kg, e ainda sem `data_desmama` preenchida.

8. **É necessário histórico de alterações do indivíduo?**

   Não. Por enquanto não será implementado histórico de alterações. O campo `version` permanece existente, mas sem controle de auditoria.

---

## Arquivos a Criar/Alterar

### Novos arquivos

- `src/pages/controller/Individuos.tsx`
- `src/pages/controller/IndividuoNovo.tsx`
- `src/pages/controller/IndividuoDetalhes.tsx`
- `src/utils/individualCompleteness.ts` (cálculo do score de completude)
- `src/utils/individualValidation.ts` (validações frontend)
- Nova migration SQL no `supabase/migrations`

### Arquivos a alterar

- `src/App.tsx` — adicionar rotas.
- `src/components/layout/ControllerLayout.tsx` — adicionar menu.
- `src/pages/controller/MaternidadeDetalhes.tsx` — link para indivíduo.
- `src/pages/controller/RegistrosMorteDetalhes.tsx` — link para indivíduo (opcional).
- Banco de dados — triggers, funções, índices e constraints.

---

## Ordem Sugerida de Execução

1. Confirmar as decisões de negócio.
2. Fase 1: ajustes no banco de dados.
3. Fase 2: notificações e triggers.
4. Fase 3: listagem e detalhes condensados.
5. Fase 4: criação e edição completa.
6. Fase 5: integrações.
7. Fase 6: testes e ajustes finais.

---

## Notas Técnicas

- Reutilizar componentes existentes: `Button`, `Card`, `Input`, `Select`, `Modal`, `Badge`.
- Seguir padrão de fetch via `supabase` e `useAuth` para obter `fazenda_id`.
- Manter consistência visual com outras telas do controller.
- Não adicionar dependências novas sem necessidade.
- Todo trigger/função nova deve ser `SECURITY DEFINER` para evitar erros de permissão.
