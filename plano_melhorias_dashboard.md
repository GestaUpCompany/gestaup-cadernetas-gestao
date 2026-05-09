# Plano de Melhorias do Dashboard

## Objetivo
Melhorar o dashboard atual com visualizações de dados, gráficos e métricas relevantes para gestão de fazendas.

---

## 1. Análise do Dashboard Atual

**Estado Atual:**
- Dashboard básico com poucas informações
- Falta de visualizações gráficas
- Métricas limitadas
- Necessidade de insights mais profundos

---

## 2. Métricas Principais a Implementar

### 2.1 Métricas de Gado
- Total de animais por lote ✅
- Distribuição por categoria (maternidade, enfermaria, rodeio) ⚠️ (removido por enquanto)
- Taxa de mortalidade mensal ✅
- Peso médio por lote ✅
- Taxa de crescimento ❌

### 2.2 Métricas de Nutrição
- Consumo de ração por animal/dia
- Estoque de insumos (alertas de baixo estoque)
- Custo de alimentação por animal
- Eficiência de conversão alimentar

### 2.3 Métricas de Saúde
- Casos de enfermaria por mês ✅
- Causas de morte mais frequentes ✅
- Taxa de recuperação ❌ (falta campo de status na tabela)
- Animais em tratamento ❌ (falta campo de status na tabela)

### 2.4 Métricas de Reprodução
- Taxa de natalidade
- Intervalo entre partos
- Taxa de sucesso de inseminação
- Produção de leite (se aplicável)

### 2.5 Métricas Climáticas
- Média pluviométrica mensal
- Temperaturas médias
- Alertas de condições extremas
- Correlação clima x produtividade

### 2.6 Métricas Financeiras
- Custo por animal
- Receita estimada
- Gastos com insumos
- Projeção de custos

---

## 3. Gráficos a Implementar

### 3.1 Gráficos de Linha
- Evolução do número de animais ao longo do tempo
- Consumo de ração mensal
- Taxa de mortalidade mensal
- Precipitação mensal
- Custos mensais

### 3.2 Gráficos de Barra
- Distribuição de animais por lote
- Causas de morte por período
- Consumo por tipo de insumo
- Gastos por categoria

### 3.3 Gráficos de Pizza/Donut
- Distribuição por categoria de animal
- Distribuição por status (ativo/inativo)
- Composição de custos
- Distribuição por fazenda (se múltiplas)

### 3.4 Gráficos de Área
- Evolução do estoque de insumos
- Acumulado de mortes por mês
- Histórico de tratamentos

### 3.5 Gráficos de Barras Empilhadas
- Animais por lote x status
- Insumos por tipo x status (ativo/inativo)

### 3.6 KPI Cards
- Total de animais
- Animais em tratamento
- Estoque crítico de insumos
- Custo mensal
- Taxa de mortalidade
- Próximas tarefas/registros pendentes

---

## 4. Bibliotecas de Gráficos a Avaliar

### 4.1 Opções Principais
- **Recharts** (Recomendado)
  - Leve e fácil de usar
  - Componentes React nativos
  - Boa documentação
  - Responsivo por padrão

- **Chart.js + react-chartjs-2**
  - Muito popular
  - Grande variedade de gráficos
  - Performance boa
  - Comunidade ativa

- **Victory**
  - Componentes declarativos
  - Animações suaves
  - Customizável
  - Documentação completa

- **Nivo**
  - Baseado em D3
  - Muito customizável
  - Gráficos bonitos
  - Performance excelente

### 4.2 Recomendação
**Recharts** é a melhor opção para este projeto por:
- Ser leve e simples
- Integração nativa com React
- Performance adequada para dashboards
- Curva de aprendizado baixa

---

## 5. Fase 1: Preparação

### 5.1 Análise de Dados Disponíveis
- Verificar quais tabelas têm dados relevantes
- Identificar campos numéricos para métricas
- Mapear relacionamentos entre tabelas
- Definir períodos de tempo (diário, semanal, mensal)

### 5.2 Instalação de Bibliotecas
- Instalar Recharts para gráficos
- Instalar date-fns para manipulação de datas
- Instalar bibliotecas auxiliares se necessário

### 5.3 Estrutura de Componentes
- Criar pasta `src/components/dashboard/`
- Criar componentes base para gráficos
- Criar componentes para KPI cards
- Criar contexto/filtros de período

### 5.4 Organização de Páginas
- Dashboard: KPIs principais e resumos (visão geral)
- Relatórios detalhados em telas separadas:
  - `/controller/relatorios/gado` - Gráficos e tabelas detalhadas de gado
  - `/controller/relatorios/saude` - Gráficos e tabelas detalhadas de saúde
  - `/controller/relatorios/nutricao` - Estoque e consumo de insumos
  - `/controller/relatorios/clima` - Dados climáticos
- Botões "Ver detalhes" nas seções do dashboard para navegar aos relatórios

### 5.5 API de Dados
- Criar queries Supabase para agregações
- Implementar cache de dados
- Criar endpoints para dados agregados se necessário

---

## 6. Fase 2: Implementação Base

### 6.1 KPI Cards no Dashboard
- Criar componente `KPICard`
- Implementar cards principais no dashboard:
  - Total de animais
  - Mortes no mês
  - Peso médio
  - Casos de enfermaria
- Adicionar botões "Ver detalhes" para navegar aos relatórios

### 6.2 Páginas de Relatórios Detalhados
- Implementar página de relatório de gado com:
  - KPIs detalhados
  - Tabelas com dados por lote
  - Gráficos de evolução (quando Recharts instalado)
- Implementar página de relatório de saúde com:
  - KPIs detalhados
  - Tabelas com causas de morte
  - Histórico de tratamentos

### 6.3 Gráficos Básicos (quando Recharts instalado)
- Implementar gráfico de linha para evolução de animais
- Implementar gráfico de barra para distribuição por lote
- Implementar gráfico de pizza para status dos animais
- Adicionar filtros de período (7 dias, 30 dias, 90 dias)

### 6.3 Layout do Dashboard
- Organizar KPI cards no topo
- Gráficos principais em destaque
- Gráficos secundários em grid
- Responsivo para mobile

---

## 7. Fase 3: Gráficos Avançados

### 7.1 Gráficos Compostos
- Combinar múltiplas métricas em um gráfico
- Gráficos de duplo eixo
- Gráficos com múltiplas séries

### 7.2 Gráficos Interativos
- Tooltip detalhados
- Zoom e pan
- Filtros dinâmicos
- Drill-down (clicar para detalhar)

### 7.3 Gráficos Específicos
- Gráfico de calor para atividade
- Gráfico de dispersão para correlações
- Timeline de eventos
- Mapa de calor temporal

---

## 8. Fase 4: Funcionalidades Adicionais

### 8.1 Filtros e Controles
- Seletor de período (customizável)
- Filtro por fazenda (se múltiplas)
- Filtro por lote
- Filtro por categoria
- Comparação entre períodos

### 8.2 Exportação de Dados
- Exportar gráficos como PNG
- Exportar dados como CSV
- Exportar relatório PDF
- Compartilhar dashboard

### 8.3 Alertas e Notificações
- Alertas de estoque baixo
- Alertas de mortalidade alta
- Alertas de condições climáticas
- Notificações de tarefas pendentes

### 8.4 Comparação e Análise
- Comparar períodos (mês atual vs anterior)
- Análise de tendências
- Projeções simples
- Metas e benchmarks

---

## 9. Fase 5: Refinamento e Otimização

### 9.1 Performance
- Lazy loading de gráficos
- Virtualização de dados grandes
- Cache de queries
- Otimização de renders

### 9.2 Acessibilidade
- Labels descritivos
- Cores acessíveis (WCAG)
- Suporte a leitores de tela
- Teclado navigation

### 9.3 Visual
- Animações suaves
- Transições entre estados
- Loading states
- Empty states

### 9.4 Testes
- Testes de integração
- Testes de performance
- Testes de responsividade
- Testes de acessibilidade

---

## 10. Priorização

### 10.1 Alta Prioridade (Fase 1 e 2)
- KPI cards principais
- Gráficos de linha para evolução
- Gráficos de barra para distribuição
- Filtros de período básicos

### 10.2 Média Prioridade (Fase 3)
- Gráficos compostos
- Interatividade avançada
- Comparação de períodos
- Alertas básicos

### 10.3 Baixa Prioridade (Fase 4 e 5)
- Exportação avançada
- Análises complexas
- Projeções
- Otimizações de performance

---

## 11. Considerações Técnicas

### 11.1 Banco de Dados
- Usar agregações SQL quando possível
- Considerar materialized views para queries pesadas
- Indexar campos usados em filtros

### 11.2 Performance
- Limitar quantidade de dados retornados
- Implementar paginação
- Usar debounce em filtros
- Considerar Web Workers para cálculos pesados

### 11.3 Responsividade
- Gráficos devem se adaptar a mobile
- Usar breakpoints do Tailwind
- Considerar layout diferente para mobile
- Testar em diversos dispositivos

---

## 12. Roadmap

### Mês 1
- Preparação e análise
- Instalação de bibliotecas
- Implementação de KPI cards
- Gráficos básicos

### Mês 2
- Gráficos avançados
- Filtros e controles
- Interatividade

### Mês 3
- Funcionalidades adicionais
- Exportação
- Alertas

### Mês 4
- Refinamento
- Otimização
- Testes finais

---

## 13. Métricas de Sucesso

- Tempo de carregamento do dashboard < 3 segundos
- Usabilidade em mobile
- Clareza das visualizações
- Facilidade de navegação
- Adoção pelos usuários
