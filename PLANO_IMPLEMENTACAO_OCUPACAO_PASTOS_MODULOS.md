# Plano de Implementação: Ocupação de Pastos e Módulos

## Resumo Executivo

Este documento define o plano piloto para implementar o rastreamento de ocupação de lotes em pastos e módulos, incluindo datas de entrada/saída, peso vivo médio, número de cabeças, tempo de ocupação, metas e alertas.

**Premissa importante:** O sistema atual (GestaUp-Cadernetas-Gestao) **apenas consulta** a tabela `registros_pastagens`. O sistema **Caderneta Digital** é o único que insere registros nessa tabela. Portanto, toda a lógica de criação e atualização de histórico de ocupação deve residir no banco de dados (triggers e functions), garantindo que ambos os sistemas vejam dados consistentes sem duplicar lógica no frontend.

---

## 1. Contexto e Premissas

### 1.1. Sistemas envolvidos
- **Sistema A (este projeto):** `GestaUp-Cadernetas-Gestao` — interface web de consulta e configuração.
- **Sistema B:** `Caderneta-Digital-Gesta-Up` — app de campo que registra as movimentações de pastagem.

### 1.2. Fluxo de dados
1. Sistema B insere um registro em `registros_pastagens` (via API/Supabase).
2. Uma trigger no banco dispara e executa a função de movimentação.
3. A função atualiza `lotes.pasto_id`, `lotes.modulo_id` e os históricos.
4. Sistema A consulta os históricos e views para exibir ocupação e alertas.

### 1.3. Regras de negócio
- Um lote pode ocupar apenas **um pasto por vez**.
- Um lote pode ocupar apenas **um módulo por vez**.
- A entrada em um módulo ocorre quando o lote entra no primeiro pasto do módulo.
- A saída do módulo ocorre quando o lote sai do último pasto do módulo.
- O histórico de ocupação é **imutável** após fechamento, exceto por correções auditadas.

---

## 2. Objetivos

- Registrar entrada e saída de lotes em pastos e módulos.
- Armazenar peso vivo médio e número de cabeças na entrada e saída.
- Calcular duração da ocupação em dias e horas.
- Permitir definir metas de ocupação por pasto e por módulo.
- Calcular desvio percentual da ocupação em relação à meta.
- Gerar alertas quando a meta for excedida.
- Manter compatibilidade total com o Sistema B.

---

## 3. Arquitetura Recomendada

### 3.1. Centralização no banco de dados
Toda a lógica de movimentação deve ser feita por uma função PostgreSQL chamada por trigger. Isso garante:
- Atomicidade
- Consistência entre os dois sistemas
- Manutenibilidade
- Proteção contra falhas de rede no frontend

### 3.2. Estrutura de dados

#### Tabelas modificadas
| Tabela | Alteração | Motivo |
|--------|-----------|--------|
| `pastos` | Adicionar `meta_intervalo_ocupacao_dias` | Meta de ocupação por pasto |
| `modulos_pastos` | Adicionar `meta_intervalo_ocupacao_dias` | Meta de ocupação por módulo |
| `lotes` | Adicionar `modulo_id` | Rastrear módulo atual do lote |
| `lote_pasto_historico` | Adicionar campos de peso, cabeças, meta, desvio e módulo | Enriquecer histórico existente |

#### Tabela nova
| Tabela | Propósito |
|--------|-----------|
| `lote_modulo_historico` | Histórico de ocupação de lotes em módulos |

#### Views novas
| View | Propósito |
|------|-----------|
| `v_lote_pasto_ocupacao_atual` | Ocupação atual por pasto com métricas calculadas |
| `v_lote_modulo_ocupacao_atual` | Ocupação atual por módulo com métricas calculadas |

---

## 4. Fases de Implementação

### Fase 1 — Preparação e Modelagem (Sem impacto no Sistema B)

**Objetivo:** Preparar o banco de dados sem quebrar o funcionamento atual.

**Tarefas:**
1. Adicionar `meta_intervalo_ocupacao_dias` em `pastos` e `modulos_pastos`.
2. Adicionar `modulo_id` em `lotes`.
3. Expandir `lote_pasto_historico` com:
   - `data_hora_entrada` (timestamptz)
   - `data_hora_saida` (timestamptz)
   - `cabecas_entrada` (integer)
   - `peso_vivo_medio_entrada_kg` (numeric)
   - `cabecas_saida` (integer)
   - `peso_vivo_medio_saida_kg` (numeric)
   - `modulo_id` (uuid)
   - `meta_intervalo_ocupacao_dias` (integer)
   - `desvio_tempo_ocupacao_percent` (numeric)
4. Criar `lote_modulo_historico`.
5. Criar índices para performance.
6. Migrar dados históricos existentes:
   - Converter `data_inicial`/`data_final` para `data_hora_entrada`/`data_hora_saida`
   - Preencher `modulo_id` a partir de `pastos.modulo_id`
   - Preencher `meta_intervalo_ocupacao_dias` a partir de `pastos.meta_intervalo_ocupacao_dias`

**Critérios de aceitação:**
- Tabelas e colunas criadas sem erros.
- Dados antigos preservados e migrados.
- Sistema B continua inserindo em `registros_pastagens` sem erros.
- Sistema A continua consultando normalmente.

---

### Fase 2 — Lógica de Movimentação no Banco

**Objetivo:** Criar a função centralizada que será chamada pela trigger de `registros_pastagens`.

**Tarefas:**
1. Criar função auxiliar `calcular_peso_medio_lote(p_lote_id UUID)`:
   - Retorna média ponderada de `peso_vivo_atual_kg_cab` usando `quant_atual`.
   - Ignora categorias com quantidade 0 ou peso nulo.
2. Criar função auxiliar `calcular_cabecas_lote(p_lote_id UUID)`:
   - Retorna `SUM(quant_atual)` de `lote_categorias`.
3. Criar função principal `processar_movimentacao_pastagem()`:
   - Recebe o `NEW` do trigger.
   - Determina `lote_id` e `pasto_entrada_id` (prioriza IDs, fallback para nomes).
   - Fecha histórico de pasto anterior (`data_hora_saida`, `cabecas_saida`, `peso_vivo_medio_saida_kg`, `desvio_tempo_ocupacao_percent`).
   - Atualiza `lotes.pasto_id` e `lotes.modulo_id`.
   - Insere novo histórico de pasto (`data_hora_entrada`, `cabecas_entrada`, `peso_vivo_medio_entrada_kg`, `modulo_id`, `meta_intervalo_ocupacao_dias`).
   - Gerencia histórico de módulo:
     - Se primeiro pasto do módulo: abre `lote_modulo_historico`.
     - Se saída do último pasto do módulo: fecha `lote_modulo_historico`.
4. Atualizar a trigger `trg_registros_pastagens_mover_lote` para chamar a função principal.
5. Criar trigger de proteção em `lote_pasto_historico` e `lote_modulo_historico`:
   - Impedir DELETE.
   - Limitar UPDATE apenas aos campos de saída e desvio.

**Critérios de aceitação:**
- Inserir um registro em `registros_pastagens` atualiza corretamente `lotes`, `lote_pasto_historico` e `lote_modulo_historico`.
- Peso e cabeças são calculados corretamente.
- Desvio é calculado ao fechar o histórico.
- Sistema B continua funcionando normalmente.

---

### Fase 3 — Views e Performance

**Objetivo:** Facilitar consultas de ocupação atual e histórico.

**Tarefas:**
1. Criar view `v_lote_pasto_ocupacao_atual`:
   - Campos: histórico + lote, pasto, módulo + período em dias/horas + dias acima da meta + desvio percentual atual.
2. Criar view `v_lote_modulo_ocupacao_atual`:
   - Equivalente ao nível de módulo.
3. Criar view `v_historico_ocupacao_pasto`:
   - Histórico completo por pasto com período, cabeças, pesos, meta e desvio.
4. Criar view `v_historico_ocupacao_modulo`:
   - Histórico completo por módulo.
5. Criar índices:
   - `idx_lote_pasto_historico_lote_ativo` (lote_id, data_hora_saida IS NULL)
   - `idx_lote_pasto_historico_pasto_data` (pasto_id, data_hora_entrada DESC)
   - `idx_lote_modulo_historico_lote_ativo` (lote_id, data_hora_saida IS NULL)
   - `idx_lote_modulo_historico_modulo_data` (modulo_id, data_hora_entrada DESC)

**Critérios de aceitação:**
- Views retornam dados corretos.
- Consultas de ocupação atual são rápidas.

---

### Fase 4 — Alertas e Notificações

**Objetivo:** Gerar alertas quando a ocupação exceder a meta.

**Tarefas:**
1. Criar função `gerar_notificacao_ocupacao(...)`:
   - Insere em `notificacoes` com `tipo='warning'`.
   - Usa chave natural para evitar duplicidade (`lote_pasto_historico_id` + `tipo_evento`).
2. Na função de movimentação, verificar se a nova ocupação já está acima da meta e gerar notificação.
3. Criar Edge Function ou cron job para verificar ocupações estáticas acima da meta diariamente.
4. Criar view `v_notificacoes_pendentes_ocupacao` para facilitar consulta.

**Critérios de aceitação:**
- Notificações são geradas corretamente.
- Não há duplicidade de alertas.
- Sistema A consegue ler as notificações.

---

### Fase 5 — Frontend do Sistema A (Este Projeto)

**Objetivo:** Permitir consulta, configuração e visualização da ocupação.

**Tarefas:**
1. Tela de **Pastos**:
   - Adicionar campo `Meta de ocupação (dias)` no formulário.
   - Mostrar lote atual, tempo de ocupação e alerta se acima da meta.
   - Botão para ver histórico de ocupação.
2. Tela de **Módulos de Pastos**:
   - Adicionar campo `Meta de ocupação (dias)` no formulário.
   - Mostrar lotes atualmente no módulo e tempo de ocupação.
   - Botão para ver histórico de ocupação.
3. Tela de **Lotes**:
   - Mostrar pasto atual e módulo atual.
   - Mostrar tempo de ocupação no pasto e no módulo.
   - Botão para ver histórico completo.
4. Tela/histórico de **Ocupação**:
   - Listar entradas/saídas com datas, pesos, cabeças, meta e desvio.
5. Atualizar tipos TypeScript do Sistema A.
6. Componente de **Alertas**:
   - Indicadores visuais (badges, cores) quando meta for excedida.

**Critérios de aceitação:**
- Usuário consegue configurar metas.
- Usuário visualiza ocupação atual e histórico.
- Alertas são exibidos corretamente.

---

### Fase 6 — Ajustes no Sistema B (Caderneta Digital) — Opcional

**Objetivo:** Garantir compatibilidade e aproveitar melhorias. **Esta fase é opcional.** A funcionalidade nova funciona sem alterar o Sistema B, desde que ele continue inserindo em `registros_pastagens` com os IDs dos pastos.

**Tarefas:**
1. Regenerar os tipos TypeScript do Sistema B (`supabase gen types`).
2. Remover ou simplificar cálculos locais de tempo de ocupação e vedação em `PastagensPage.tsx`:
   - Substituir por consultas às views `v_lote_pasto_ocupacao_atual`.
3. Validar que o envio de `pasto_saida_id` e `pasto_entrada_id` continua funcionando.
4. Testar fluxo completo de inserção de uma pastagem e verificar histórico no banco.

**Critérios de aceitação:**
- Sistema B compila sem erros de tipo.
- Inserção em `registros_pastagens` funciona.
- Histórico é gerado corretamente.

---

### Fase 7 — Testes e Validação

**Objetivo:** Garantir qualidade e estabilidade.

**Tarefas:**
1. Testes de integração no banco:
   - Inserir movimentação e verificar atualização de todas as tabelas.
   - Testar fallback para nomes quando IDs não são enviados.
   - Testar entrada e saída de módulos.
   - Testar alertas de meta excedida.
2. Testes no Sistema A:
   - CRUD de metas.
   - Visualização de ocupação e histórico.
   - Notificações.
3. Testes no Sistema B:
   - Inserção de registros de pastagem.
   - Sincronização offline/online.
4. Testes de performance:
   - Consultas de ocupação atual com grandes volumes.
5. Testes de regressão:
   - Verificar que módulos continuam sendo excluídos corretamente e pastos ficam órfãos.

**Critérios de aceitação:**
- Todos os testes passam.
- Nenhuma funcionalidade existente quebra.

---

### Fase 8 — Documentação e Deploy

**Objetivo:** Documentar e colocar em produção.

**Tarefas:**
1. Documentar a arquitetura e regras no README ou wiki.
2. Documentar a API interna (views e funções) para futuros desenvolvedores.
3. Criar script de rollback para cada fase.
4. Aplicar migrations no ambiente de produção.
5. Monitorar logs e notificações nos primeiros dias.

**Critérios de aceitação:**
- Documentação atualizada.
- Sistema em produção sem incidentes.

---

## 5. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Sistema B não enviar IDs corretamente | Histórico incorreto | Manter fallback para nomes na trigger |
| Peso/cabeças mudarem durante a estadia | Entrada/saída inconsistentes | Congelar valores no momento da movimentação |
| Concorrência em movimentações | Duplicidade de histórico | Usar lock de linha na função de movimentação |
| Usuário excluir pasto com histórico | Perda de rastreabilidade | Impedir exclusão ou usar soft delete com RESTRICT |
| Notificações duplicadas | Poluição do usuário | Usar chave natural e idempotência |
| Grande volume de dados | Lentidão nas consultas | Criar índices e views materializadas se necessário |

---

## 6. Decisões Tomadas

1. **Tabela própria para módulo:** Sim, criar `lote_modulo_historico` para clareza e performance.
2. **Lógica no banco:** Sim, toda a movimentação é feita por triggers/functions.
3. **Imutabilidade do histórico:** Sim, com proteção via triggers.
4. **Compatibilidade com Sistema B:** Sim, manter colunas de texto e fallback para nomes.
5. **Cálculo de peso:** Média ponderada por categoria a partir de `lote_categorias`.
6. **Cálculo de cabeças:** `SUM(quant_atual)` de `lote_categorias`.
7. **Alertas:** Híbrido (trigger + cron/edge function).

---

## 7. Próximos Passos Imediatos

1. Validar este plano com o time/proprietário.
2. Preparar as migrations da Fase 1.
3. Implementar a Fase 1 (estrutura de dados) e validar com dados reais.
4. Proceder para a Fase 2 (lógica de movimentação).

**Não prosseguir sem aprovação explícita.**
