# Plano Mobile First - GestaUp Cadernetas Gestão

## Visão Geral
Este plano descreve a abordagem Mobile First para tornar toda a aplicação GestaUp Cadernetas Gestão responsiva e otimizada para dispositivos móveis, seguindo as melhores práticas de design e desenvolvimento.

## Objetivos
1. Garantir que todas as páginas sejam totalmente responsivas
2. Melhorar a experiência do usuário em dispositivos móveis
3. Manter consistência visual e funcional em todos os tamanhos de tela
4. Otimizar performance em dispositivos móveis
5. Melhorar acessibilidade em telas pequenas

## Breakpoints Atuais e Recomendados

### Breakpoints Atuais (Tailwind CSS)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Estratégia Mobile First
- Desenvolver primeiro para telas pequenas (mobile)
- Adicionar classes responsivas para telas maiores (tablet, desktop)
- Usar breakpoint `sm` como base para mobile, `md` para tablet, `lg+` para desktop

## Fase 1: Layouts e Navegação

### 1.1 AdminLayout
**Status:** ✅ Menu mobile implementado

**Tarefas:**
- [x] Adicionar botão de menu mobile (hamburger)
- [x] Implementar menu mobile drawer/modal
- [x] Adicionar estado para controlar menu mobile
- [x] Ajustar sidebar para ser oculta em mobile
- [x] Adicionar overlay quando menu mobile estiver aberto
- [ ] Testar em dispositivos móveis reais

**Arquivo:** `src/components/layout/AdminLayout.tsx`

---

### 1.2 ControllerLayout
**Status:** ✅ Menu mobile melhorado

**Tarefas:**
- [x] Revisar implementação atual do menu mobile
- [x] Melhorar animações de transição
- [x] Testar usabilidade em diferentes dispositivos
- [x] Verificar se todos os itens do menu são acessíveis
- [x] Adicionar gestos de swipe para fechar menu

**Arquivo:** `src/components/layout/ControllerLayout.tsx`

---

### 1.3 Sidebar Genérico
**Status:** ✅ Menu mobile implementado

**Tarefas:**
- [x] Adicionar propriedade para habilitar menu mobile
- [x] Implementar menu mobile drawer
- [x] Adicionar animações suaves
- [x] Garantir que sidebar seja colapsável em mobile

**Arquivo:** `src/components/layout/Sidebar.tsx`

---

### 1.4 Header
**Status:** ✅ Responsivo otimizado

**Tarefas:**
- [x] Revisar layout em telas muito pequenas (< 360px)
- [x] Otimizar espaçamento entre elementos
- [x] Considerar esconder logo em telas muito pequenas
- [x] Testar dropdown do usuário em mobile
- [x] Otimizar GlobalSearch para mobile (considerar fullscreen modal)

**Arquivo:** `src/components/layout/Header.tsx`

---

## Fase 2: Componentes UI

### 2.1 Button
**Status:** ⚠️ Precisa de revisão

**Tarefas:**
- [ ] Adicionar tamanhos mobile específicos (xs, sm)
- [ ] Ajustar padding em telas pequenas
- [ ] Garantir que texto não quebre em botões
- [ ] Testar todos os variantes em mobile
- [ ] Otimizar tamanho de toque (mínimo 44x44px)

**Arquivo:** `src/components/ui/Button.tsx`

---

### 2.2 Input
**Status:** ⚠️ Precisa de revisão

**Tarefas:**
- [ ] Ajustar tamanho de fonte em mobile
- [ ] Otimizar padding para toque fácil
- [ ] Testar inputs com labels em mobile
- [ ] Garantir que placeholder seja legível
- [ ] Ajustar tamanho de inputs em formulários

**Arquivo:** `src/components/ui/Input.tsx`

---

### 2.3 Modal
**Status:** ⚠️ Precisa de revisão

**Tarefas:**
- [ ] Garantir que modal seja fullscreen em mobile
- [ ] Adicionar scroll interno quando necessário
- [ ] Otimizar botões de ação em mobile
- [ ] Testar fechamento com gesture de swipe down
- [ ] Ajustar z-index para não cobrir header

**Arquivo:** `src/components/ui/Modal.tsx`

---

### 2.4 Dropdown
**Status:** ⚠️ Precisa de revisão

**Tarefas:**
- [ ] Garantir que dropdown não seja cortado em mobile
- [ ] Ajustar posicionamento em telas pequenas
- [ ] Testar dropdown do usuário em mobile
- [ ] Considerar usar bottom sheet em mobile
- [ ] Otimizar animações de abertura/fechamento

**Arquivo:** `src/components/ui/Dropdown.tsx`

---

### 2.5 CardItem
**Status:** ✅ Já responsivo

**Tarefas:**
- [ ] Revisar breakpoint `md` para garantir que funciona
- [ ] Testar em diferentes tamanhos de mobile
- [ ] Otimizar espaçamento em telas muito pequenas
- [ ] Garantir que botões não overflow

**Arquivo:** `src/components/ui/CardItem.tsx`

---

### 2.6 GlobalSearch
**Status:** ⚠️ Precisa de revisão

**Tarefas:**
- [ ] Implementar modal fullscreen para mobile
- [ ] Otimizar layout de resultados em mobile
- [ ] Testar teclado virtual em mobile
- [ ] Garantir que input seja fácil de focar
- [ ] Considerar adicionar botão de busca no header mobile

**Arquivo:** `src/components/ui/GlobalSearch.tsx`

---

### 2.7 Notifications
**Status:** ⚠️ Precisa de revisão

**Tarefas:**
- [ ] Otimizar layout de notificações em mobile
- [ ] Ajustar posicionamento para não cobrir header
- [ ] Testar dropdown de notificações em mobile
- [ ] Considerar usar bottom sheet em mobile

**Arquivo:** `src/components/ui/Notifications.tsx`

---

### 2.8 Breadcrumbs
**Status:** ⚠️ Precisa de revisão

**Tarefas:**
- [ ] Ajustar layout em mobile (considerar scroll horizontal)
- [ ] Otimizar tamanho de fonte em telas pequenas
- [ ] Testar com breadcrumbs longos
- [ ] Considerar esconder em telas muito pequenas

**Arquivo:** `src/components/ui/Breadcrumbs.tsx`

---

## Fase 3: Páginas de Cadastro

### 3.1 Páginas Já Atualizadas (CardItem)
**Status:** ✅ Já atualizadas

**Arquivos:**
- Medicamentos.tsx
- Pastos.tsx
- BebedourosCadastro.tsx
- Pluviometros.tsx
- Lotes.tsx
- Insumos.tsx
- Funcionarios.tsx
- Racao.tsx
- Proteinado.tsx
- Mineral.tsx
- Frigorificos.tsx
- Fornecedores.tsx
- Dietas.tsx
- CausasMorte.tsx

**Tarefas:**
- [ ] Revisar grid layouts em mobile (atualmente 2 colunas)
- [ ] Considerar mudar para 1 coluna em mobile
- [ ] Testar formulários de edição/criação em mobile
- [ ] Otimizar botões de ação em formulários
- [ ] Garantir que modais de confirmação sejam fullscreen

---

### 3.2 Páginas de Detalhes
**Status:** ⚠️ Precisam de revisão

**Arquivos:**
- BebedourosDetalhes.tsx
- EnfermariaDetalhes.tsx
- MaternidadeDetalhes.tsx
- MovimentacaoDetalhes.tsx
- PastagensCaderneta.tsx

**Tarefas:**
- [ ] Revisar layout de detalhes em mobile
- [ ] Otimizar tabelas/lists em mobile
- [ ] Ajustar formulários de edição
- [ ] Testar gráficos/charts em mobile
- [ ] Otimizar botões de ação

---

## Fase 4: Dashboard

### 4.1 Controller Dashboard
**Status:** ⚠️ Precisa de revisão

**Arquivo:** `src/pages/controller/Dashboard.tsx`

**Tarefas:**
- [ ] Revisar grid de cards de cadernetas em mobile
- [ ] Otimizar cards de estatísticas em mobile
- [ ] Ajustar layout de atividades recentes
- [ ] Testar gráficos em mobile
- [ ] Considerar reorganizar layout para mobile (empilhar verticalmente)

---

### 4.2 Admin Dashboard
**Status:** ⚠️ Precisa de revisão

**Arquivo:** `src/pages/admin/Dashboard.tsx`

**Tarefas:**
- [ ] Revisar layout em mobile
- [ ] Otimizar cards de estatísticas
- [ ] Ajustar tabelas/lists
- [ ] Testar todos os componentes em mobile

---

## Fase 5: Páginas de Listagem

### 5.1 Páginas de Listagem Admin
**Status:** ⚠️ Precisam de revisão

**Arquivos:**
- Fazendas.tsx
- Usuarios.tsx

**Tarefas:**
- [ ] Revisar tabelas em mobile (considerar cards)
- [ ] Otimizar filtros em mobile
- [ ] Ajustar paginação
- [ ] Testar ações de editar/excluir em mobile

---

### 5.2 Páginas de Listagem Controller
**Status:** ⚠️ Precisam de revisão

**Arquivos:**
- Bebedouros.tsx
- Cadernetas.tsx
- Enfermaria.tsx
- Maternidade.tsx
- Movimentacao.tsx

**Tarefas:**
- [ ] Revisar tabelas/lists em mobile
- [ ] Otimizar filtros
- [ ] Ajustar layout de cards em mobile
- [ ] Testar navegação entre páginas

---

## Fase 6: Formulários

### 6.1 Formulários de Criação/Edição
**Status:** ⚠️ Precisam de revisão

**Tarefas:**
- [ ] Revisar todos os formulários em mobile
- [ ] Otimizar layout de campos (empilhar verticalmente)
- [ ] Ajustar tamanho de inputs
- [ ] Otimizar botões de submit/cancel
- [ ] Testar validação em mobile
- [ ] Garantir que keyboard virtual não cubra inputs

**Arquivos:** Todos os arquivos de cadastro

---

### 6.2 Formulários de Busca
**Status:** ⚠️ Precisam de revisão

**Tarefas:**
- [ ] Otimizar campo de busca em mobile
- [ ] Ajustar filtros em mobile
- [ ] Testar resultados de busca
- [ ] Considerar usar modal fullscreen para filtros

---

## Fase 7: Páginas de Autenticação

### 7.1 Login
**Status:** ⚠️ Precisa de revisão

**Arquivo:** `src/pages/auth/Login.tsx`

**Tarefas:**
- [ ] Revisar layout em mobile
- [ ] Otimizar formulário de login
- [ ] Ajustar logo e branding
- [ ] Testar em diferentes tamanhos de mobile
- [ ] Garantir que inputs sejam fáceis de preencher

---

## Fase 8: Otimizações Gerais

### 8.1 Performance
- [ ] Otimizar imagens para mobile (lazy loading, compressão)
- [ ] Reduzir tamanho de bundles
- [ ] Implementar code splitting por rota
- [ ] Otimizar carregamento de dados
- [ ] Testar performance em dispositivos móveis reais

### 8.2 Acessibilidade
- [ ] Garantir tamanho mínimo de toque (44x44px)
- [ ] Otimizar contraste em telas pequenas
- [ ] Testar com leitores de tela
- [ ] Garantir navegação por teclado em mobile
- [ ] Otimizar foco em elementos interativos

### 8.3 UX Mobile
- [ ] Adicionar feedback visual para toques
- [ ] Otimizar scroll em listas longas
- [ ] Implementar pull-to-refresh onde apropriado
- [ ] Adicionar gestos de swipe onde apropriado
- [ ] Otimizar transições e animações

---

## Fase 9: Testes

### 9.1 Testes de Responsividade
- [ ] Testar em iPhone SE (375x667)
- [ ] Testar em iPhone 12 Pro (390x844)
- [ ] Testar em iPhone 14 Pro Max (430x932)
- [ ] Testar em Android pequeno (360x640)
- [ ] Testar em Android médio (412x915)
- [ ] Testar em iPad (768x1024)
- [ ] Testar em landscape mode

### 9.2 Testes de Usabilidade
- [ ] Testar fluxos completos em mobile
- [ ] Testar com usuários reais
- [ ] Coletar feedback e iterar
- [ ] Testar performance em 3G/4G

---

## Fase 10: Documentação

### 10.1 Guia de Estilo Mobile
- [ ] Documentar padrões de layout mobile
- [ ] Criar guidelines para componentes mobile
- [ ] Documentar breakpoints e uso
- [ ] Criar exemplos de patterns mobile

### 10.2 Guia de Desenvolvimento
- [ ] Documentar como desenvolver mobile first
- [ ] Criar checklist para novas features
- [ ] Documentar testes necessários
- [ ] Criar guidelines para revisão de código

---

## Priorização

### Alta Prioridade (Fase 1-3)
1. Adicionar menu mobile ao AdminLayout
2. Revisar e otimizar componentes UI base
3. Revisar formulários em mobile

### Média Prioridade (Fase 4-6)
1. Revisar dashboards em mobile
2. Revisar páginas de listagem
3. Otimizar tabelas/lists

### Baixa Prioridade (Fase 7-10)
1. Páginas de autenticação
2. Otimizações de performance
3. Testes e documentação

---

## Recursos Necessários

### Ferramentas
- Chrome DevTools (Device Mode)
- Responsively App
- BrowserStack ou similar para testes reais
- Lighthouse para performance

### Referências
- [Mobile First Design](https://www.smashingmagazine.com/2016/04/mobile-first-responsive-web-design/)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Material Design Mobile Guidelines](https://m3.material.io/)

---

## Timeline Estimada

- **Fase 1:** 2-3 dias
- **Fase 2:** 3-4 dias
- **Fase 3:** 2-3 dias
- **Fase 4:** 2-3 dias
- **Fase 5:** 2-3 dias
- **Fase 6:** 3-4 dias
- **Fase 7:** 1-2 dias
- **Fase 8:** 3-4 dias
- **Fase 9:** 2-3 dias
- **Fase 10:** 2-3 dias

**Total estimado:** 22-32 dias

---

## Notas

- Este plano deve ser revisado e ajustado conforme necessário
- Prioridades podem mudar baseado em feedback de usuários
- Algumas fases podem ser feitas em paralelo por diferentes desenvolvedores
- Testes contínuos são essenciais durante o processo
- Documentação deve ser mantida atualizada durante o desenvolvimento
