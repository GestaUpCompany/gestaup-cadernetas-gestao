# Plano de Modernização do Layout

**Versão:** 2.0  
**Data:** 03/05/2026  
**Status:** Em Andamento  
**Repositório:** gestaup-cadernetas-gestao

---

## 1. Visão Geral

### 1.1 Objetivo
Modernizar o layout do site Gesta'Up Cadernetas Digitais com foco em:
- **Simplicidade**: Interface limpa, sem elementos desnecessários
- **Praticidade**: Ações rápidas e intuitivas
- **Intuitividade**: Navegação clara e previsível
- **Sem complexidade**: Fluxos simples e diretos

### 1.2 Diretrizes de Design
- Minimalismo visual
- Hierarquia clara de informações
- Feedback visual imediato
- Acessibilidade (WCAG AA)
- Responsividade total (mobile-first)

---

## 2. Identidade Visual

### 2.1 Paleta de Cores
```css
--primary: #1a3a2a      /* Verde GestaUp (fundo escuro, texto) */
--white: #ffffff        /* Branco (fundo, texto) */
--accent: #FACC15       /* Amarelo (destaques, CTAs, ícones) */
--gray-50: #f9fafb      /* Fundo claro */
--gray-100: #f3f4f6     /* Bordas sutis */
--gray-500: #6b7280     /* Texto secundário */
--gray-800: #1f2937     /* Texto principal */
```

### 2.2 Tipografia
- **Fonte**: Inter ou system-ui (clean, legível)
- **Tamanhos**: 
  - H1: 32px (2rem)
  - H2: 24px (1.5rem)
  - H3: 20px (1.25rem)
  - Body: 16px (1rem)
  - Small: 14px (0.875rem)

### 2.3 Espaçamento
- Base: 8px (0.5rem)
- Padding cards: 24px (1.5rem)
- Gap grids: 16px (1rem)
- Section spacing: 32px (2rem)

### 2.4 Arredondamento
- Buttons: 8px (rounded-lg)
- Cards: 12px (rounded-xl)
- Inputs: 8px (rounded-lg)
- Imagens cadernetas: 32px (rounded-[32px])

---

## 3. Elementos Visuais

### 3.1 Logomarca
- **Arquivo**: `public/images/logo/logo-gestaup.png`
- **Uso**: 
  - Header (Admin e Controller) - esquerda, sticky
  - Tela de Login - centro
  - Altura: 40px (header), 80px (login)

### 3.2 Imagens das Cadernetas
Substituir emojis por imagens personalizadas:
- `public/images/cadernetas/maternidade.png` - Caderneta Maternidade
- `public/images/cadernetas/movimentacao.png` - Caderneta Movimentação
- `public/images/cadernetas/pastagens.png` - Caderneta Pastagens
- `public/images/cadernetas/bebedouros.png` - Caderneta Bebedouros
- `public/images/cadernetas/rodeio.png` - Caderneta Rodeio
- `public/images/cadernetas/suplementacao.png` - Caderneta Suplementação
- `public/images/cadernetas/enfermaria.png` - Caderneta Enfermaria

**Dimensões**: 
- Página Cadernetas: 96x96px (w-24 h-24) com rounded-[32px]
- Dashboard: 64x64px (w-16 h-16) com rounded-[32px]

---

## 4. Layout por Página

### 4.1 Tela de Login
**Antes:**
- Card cinza central
- Texto "GestaUp" + "Cadernetas Gestão"
- Link "Cadastre-se"

**Depois:**
- Fundo branco limpo
- Logo centralizado (80px)
- Título "Gesta'Up Cadernetas Digitais" (H2)
- Subtítulo "Faça login para acessar sua fazenda"
- Formulário minimalista
- Sem link de cadastro
- Footer com "© 2026 Gesta'Up"

**Cores:**
- Fundo: white
- Card: white com sombra suave
- Botão: primary (#1a3a2a) com texto white
- Links: accent (#FACC15)

### 4.2 Header (Admin e Controller)
**Antes:**
- Título da página
- Botão "Sair"

**Depois:**
- Logo esquerda (40px)
- Título da página (centro)
- Nome do usuário + Avatar (direita)
- Botão "Sair" (secondary)
- **Sticky**: position sticky top-0 z-50

**Layout:**
```
[Logo] [Título da Página]              [Nome] [Avatar] [Sair]
```

### 4.3 Dashboard Admin
**Antes:**
- Cards de estatísticas
- Lista de fazendas
- Ações rápidas

**Depois:**
- Header com logo (sticky)
- Seção "Visão Geral" com 3 cards principais
  - Total Fazendas
  - Total Usuários
  - Total Registros
- Seção "Fazendas Recentes" (últimas 5)
- Botão flutuante "Nova Fazenda" (accent)
- Navegação lateral simplificada (se necessário)

### 4.4 Dashboard Controller
**Antes:**
- Header da fazenda
- Estatísticas de cadastros
- Estatísticas de cadernetas
- Ações rápidas

**Depois:**
- Header com logo + nome da fazenda (sticky)
- Seção "Resumo Consolidado" com totais
  - Total de registros hoje
  - Total de registros esta semana
  - Total de cadastros
- Seção "Resumo" com 4 cards principais
  - Pastos, Lotes, Funcionários, Insumos
- Seção "Cadernetas" com 7 cards (imagens)
  - Ordem: Maternidade, Pastagens, Rodeio, Suplementação, Bebedouros, Movimentação, Enfermaria
  - Cada card: imagem (64x64px, rounded-[32px]) + nome + contador
  - Card inteiro clicável (remover botão "Ver Registros")
  - Hover: sombra + borda accent
- Seção "Atividades Recentes" (3-5 registros mais recentes)
- Seção "Ações Rápidas" (4 botões com ícones)

### 4.5 Página Cadernetas
**Antes:**
- Grid de cards com emojis

**Depois:**
- Header com logo + título "Cadernetas" (sticky)
- Grid de cards com imagens
- Ordem: Maternidade, Pastagens, Rodeio, Suplementação, Bebedouros, Movimentação, Enfermaria
- Cada card:
  - Imagem (96x96px, rounded-[32px])
  - Nome (H3)
  - Descrição (small, gray-500)
  - Hover: borda accent + shadow
- Click: navega direta para listagem

### 4.6 Listagens (Cadastros e Cadernetas)
**Antes:**
- Tabela completa
- Filtros
- Botão exportar

**Depois:**
- Header com título + botões (Filtrar, Exportar)
- Filtros colapsáveis (acordeon)
- Tabela simplificada:
  - Colunas essenciais apenas
  - Row hover: background gray-50
  - Click: navega para detalhes
- Paginação (se necessário)
- Empty state com ilustração

### 4.7 Detalhes de Registros
**Antes:**
- Card com campos
- Botão voltar

**Depois:**
- Header com título + botão voltar
- Grid de 2 colunas
- Seções agrupadas:
  - Informações Gerais
  - Detalhes Específicos
  - Metadados
- Labels em negrito, valores em normal
- Metadados em gray-500 (small)

---

## 5. Componentes UI

### 5.1 Button
```tsx
// Primary
<Button variant="primary">
  Ação Principal
</Button>
// primary: #1a3a2a, text: white

// Secondary
<Button variant="secondary">
  Ação Secundária
</Button>
// secondary: white, border: gray-200, text: gray-800

// Accent
<Button variant="accent">
  Destaque
</Button>
// accent: #FACC15, text: #1a3a2a
```

### 5.2 Card
```tsx
<Card className="bg-white rounded-xl shadow-sm border-0">
  {/* Conteúdo */}
</Card>
// Sem borda, sombra suave, fundo branco
```

### 5.3 Input
```tsx
<Input
  label="Label"
  placeholder="Placeholder"
  className="border-gray-200 focus:border-accent"
/>
// Borda cinza clara, focus em accent
```

### 5.4 Table
```tsx
// Row hover
<tr className="hover:bg-gray-50 cursor-pointer">
  {/* Colunas */}
</tr>

// Header
<th className="bg-gray-50 text-gray-500 font-medium">
  {/* Coluna */}
</th>
```

---

## 6. Cronograma de Implementação

### FASE 1: Configuração Base (1-2h)
- [x] Atualizar Tailwind config com paleta de cores
- [x] Adicionar imagens ao projeto (já organizado)
- [x] Criar tipos TypeScript para imagens

### FASE 2: Headers e Login (2-3h)
- [x] Adicionar logo no Header Admin
- [x] Adicionar logo no Header Controller
- [x] Modernizar tela de Login
- [ ] Fazer Header sticky
- [ ] Atualizar nome do site para "Gesta'Up Cadernetas Digitais"

### FASE 3: Cadernetas (1-2h)
- [x] Substituir emojis por imagens na página Cadernetas
- [x] Substituir emojis por imagens no Dashboard Controller
- [x] Ajustar tamanhos e posicionamento
- [x] Reordenar cadernetas (Maternidade, Pastagens, Rodeio, Suplementação, Bebedouros, Movimentação, Enfermaria)
- [ ] Aumentar imagens no Dashboard (64x64px) com rounded-[32px]
- [ ] Tornar cards clicáveis (remover botão "Ver Registros")

### FASE 4: Dashboards (2-3h)
- [x] Modernizar Dashboard Admin
- [x] Modernizar Dashboard Controller
- [x] Simplificar cards e layouts
- [ ] Adicionar seção "Atividades Recentes" no Dashboard Controller
- [ ] Adicionar seção "Resumo Consolidado" no Dashboard Controller
- [ ] Simplificar Header da Fazenda no Dashboard Controller

### FASE 5: Listagens e Detalhes (2-3h)
- [ ] Modernizar listagens de cadastros
- [ ] Modernizar listagens de cadernetas
- [ ] Modernizar telas de detalhes

### FASE 6: Polimento Final (1-2h)
- [ ] Melhorar espaçamento e tipografia
- [ ] Adicionar transições suaves
- [ ] Testar responsividade
- [ ] Ajustes finais

**Total estimado: 12-20h**

---

## 7. Checklist de Implementação

### Cores e Configuração
- [x] Atualizar tailwind.config.js com cores personalizadas
- [x] Adicionar imagens ao projeto (já organizado)
- [ ] Testar contraste e acessibilidade

### Headers
- [x] Header Admin com logo
- [x] Header Controller com logo
- [ ] Header sticky (Admin e Controller)
- [ ] Ajustar responsividade mobile

### Login
- [x] Redesign da tela de login
- [x] Adicionar logo centralizado
- [x] Simplificar formulário
- [x] Remover link de cadastro
- [ ] Atualizar nome para "Gesta'Up Cadernetas Digitais"

### Cadernetas
- [x] Substituir emojis por imagens (7 cadernetas)
- [x] Ajustar card layout
- [x] Reordenar cadernetas
- [x] Testar hover states
- [ ] Aumentar imagens no Dashboard
- [ ] Tornar cards clicáveis

### Dashboards
- [x] Modernizar Dashboard Admin
- [x] Modernizar Dashboard Controller
- [x] Simplificar cards
- [x] Melhorar hierarquia visual
- [ ] Adicionar Atividades Recentes
- [ ] Adicionar Resumo Consolidado
- [ ] Simplificar Header da Fazenda

### Listagens
- [ ] Simplificar tabelas
- [ ] Melhorar filtros
- [ ] Adicionar empty states
- [ ] Melhorar paginação

### Detalhes
- [ ] Modernizar layout de detalhes
- [ ] Agrupar informações em seções
- [ ] Melhorar legibilidade

### Polimento
- [ ] Adicionar transições CSS
- [ ] Melhorar espaçamento
- [ ] Testar responsividade
- [ ] Revisar acessibilidade

---

## 8. Próximos Passos

1. Fazer Header sticky (Admin e Controller)
2. Atualizar nome do site para "Gesta'Up Cadernetas Digitais" em todos os lugares
3. Aumentar imagens das cadernetas no Dashboard (64x64px) com rounded-[32px]
4. Tornar cards de cadernetas clicáveis (remover botão "Ver Registros")
5. Adicionar seção "Atividades Recentes" no Dashboard Controller
6. Adicionar seção "Resumo Consolidado" no Dashboard Controller
7. Modernizar listagens de cadastros e cadernetas
8. Modernizar telas de detalhes
9. Polimento final e testes