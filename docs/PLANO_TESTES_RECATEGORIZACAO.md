# Plano de Testes: Cronologia Evolutiva e Recategorização

**Fazenda de testes:** `d649c65e-16ab-4b77-a84b-df937aa41cc3` (Fazenda Gesta'Up)
**Data:** 2026-07-28
**Objetivo:** Garantir que a implementação da cronologia evolutiva (faixas de peso, recategorização, planos nutricionais, snapshots de auditoria) cobre todos os casos possíveis em uma fazenda real antes de produção.

---

## Estado atual da fazenda

### Lotes ativos (7)

| Lote | Categoria atual | Sexo | Raça | Cab | Peso (kg) | Sistema | Destino | Formulacao | Plano ativo |
|------|-----------------|------|------|-----|-----------|---------|---------|------------|-------------|
| L1 | Boi Gordo | macho | Nelore | 50 | 170 | Cria | corte | Sim (Boi Magro) | Sim |
| L2 | Touro | macho | Nelore | 99 | 492 | Engorda | null | nao | nao |
| L3 | Touro | macho | Angus | 60 | 665 | Cria | null | nao | nao |
| L4 | vaca + bezerro ao pe | femea | Caracu | 50 | 384 | Recria | null | nao | nao |
| L5 | boi magro | macho | Angus | 78 | 410 | Recria | null | Sim (Boi Magro 2) | Sim |
| L6 | boi gordo | macho | Angus | 49 | 450 | Recria | corte | nao | nao |
| Lote Teste | Touro | macho | Charoles | 40 | 501 | null | null | Sim (TIP) | nao |

### Formulações ativas (8)

| Nome | Categoria | GMD | Peso medio |
|------|-----------|-----|------------|
| L1 - Bezerro ao Pe | bezerro ao pe | 0.8 | 90 |
| L1 - Bezerro | bezerro | 1.0 | 170 |
| L1 - Garrote | garrote | 1.2 | 290 |
| R/S - Proteinado 0,3% PV | garrote | 0.45 | 300 |
| L1 - Boi Magro | boi magro | 1.4 | 400 |
| Boi Magro 1 | boi magro | 1.4 | 360 |
| Boi Magro 2 | boi magro | 1.2 | 400 |
| E/S - TIP 2,0% | boi magro | 1.25 | 435 |

### Faltam formulações para
- boi gordo, touro (machos)
- bezerra ao pe, bezerra, novilha, vaca (fêmeas)

### Faixas de categorias configuradas

**Machos:** Bezerro ao Pe (0-120) > Bezerro (120-210) > Garrote (210-350) > Boi Magro (360-450) > Boi Gordo (450-520) > Touro (450-700)
**Fêmeas:** Bezerro ao Pe (0-120) > Bezerra (120-210) > Novilha (210-330) > Vaca (330-600)

---

## Fase 0: Preparação

### 0.1 Criar formulações faltantes

Criar 6 formulações novas na fazenda de teste:

| Nome | Categoria | GMD | Peso medio |
|------|-----------|-----|------------|
| Teste - Boi Gordo | boi gordo | 1.0 | 500 |
| Teste - Touro | touro | 0.5 | 550 |
| Teste - Bezerra ao Pe | bezerra ao pe | 0.7 | 85 |
| Teste - Bezerra | bezerra | 0.9 | 160 |
| Teste - Novilha | novilha | 1.0 | 280 |
| Teste - Vaca | vaca | 0.3 | 400 |

### 0.2 Resetar L1

L1 já acumulou 4 transições de testes anteriores. Para um teste limpo:
- Deletar todas as `lote_categorias` do L1 (inclusive encerradas)
- Deletar todas as `lote_categorias_transicoes` do L1
- Deletar planos nutricionais associados (cascade)
- Recriar L1 como "bezerro ao pe" com dados completos:
  - n_cabecas=50, sexo=macho, raca=Nelore, idade_meses=6
  - sistema_producao=Cria, destino=corte
  - peso_entrada_kg_cab=90, peso_vivo_atual_kg_cab=90
  - gmd=0.8, formulacao_id=L1 - Bezerro ao Pe
  - quant_inicial=50, quant_atual=50
  - Criar plano nutricional ativo: nome="Bezerro ao Pe - 0.8 kg/dia", formulacao=L1 - Bezerro ao Pe, gmd=0.8, peso_meta=120, peso_inicio=90

### 0.3 Criar L7 "Teste Reprodução" (macho, reprodução)

Novo lote com dados completos:
- n_cabecas=40, sexo=macho, raca=Angus, idade_meses=7
- sistema_producao=Cria, destino=reprodução
- peso_entrada_kg_cab=85, peso_vivo_atual_kg_cab=85
- Categoria inicial: "bezerro ao pe"
- formulacao_id=L1 - Bezerro ao Pe
- Criar plano nutricional ativo

### 0.4 Criar L8 "Teste Fêmea" (fêmea, reprodução)

Novo lote com dados completos:
- n_cabecas=30, sexo=fêmea, raca=Nelore, idade_meses=6
- sistema_producao=Cria, destino=reprodução
- peso_entrada_kg_cab=80, peso_vivo_atual_kg_cab=80
- Categoria inicial: "bezerra ao pe"
- formulacao_id=Teste - Bezerra ao Pe
- Criar plano nutricional ativo

### 0.5 Completar dados de lotes existentes (opcional)

Completar n_cabecas, sexo, raca, idade_meses dos lotes L2-L6 e Lote Teste para validar que o snapshot captura dados reais.

---

## Fase 1: Cenário Corte (L1, macho, corte)

Cronologia completa: bezerro ao pe > bezerro > garrote > boi magro > boi gordo

### Step 1.1: bezerro ao pe > bezerro (TROCAR formulação)

- **Origem:** bezerro ao pe, peso=90kg, formulacao=L1 - Bezerro ao Pe
- **Destino:** bezerro
- **Decisão:** TROCAR para L1 - Bezerro (gmd=1.0, peso=170)
- **Validar:**
  - [ ] Nova lote_categoria criada com categoria="bezerro", ativo=true
  - [ ] Categoria origem encerrada: ativo=false, data_fim preenchida
  - [ ] categoria_origem_id aponta para a origem
  - [ ] Novo plano nutricional criado com:
    - nome="bezerro - 1.0 kg/dia"
    - gmd_planejado=1.0 (da nova formulação, não da origem)
    - peso_meta_kg=170 (peso_vivo_medio da nova formulação)
    - peso_inicio_kg_cab=90 (peso na transição)
    - formulacao_id=L1 - Bezerro
  - [ ] Plano origem encerrado: ativo=false, data_fim preenchida
  - [ ] Transição registrada em lote_categorias_transicoes com:
    - snapshot_jsonb.lote_categoria_origem preenchido
    - snapshot_jsonb.lote_origem preenchido (nome=L1, sistema=Cria, destino=corte, etc.)
    - snapshot_jsonb.plano_nutricional_origem preenchido
    - manter_formulacao=false
    - nova_formulacao_id=L1 - Bezerro

### Step 1.2: Editar plano vigente

- Abrir o plano nutricional do L1 (categoria bezerro) no PlanoNutricionalModal
- **Validar:**
  - [ ] Botão "Editar" aparece (plano vigente, data_fim=null)
  - [ ] Conseguir editar: mudar peso_meta_kg de 170 para 200
  - [ ] Conseguir salvar sem erro
  - [ ] Plano atualizado no banco com peso_meta_kg=200

### Step 1.3: bezerro > garrote (TROCAR formulação)

- **Origem:** bezerro, peso=170kg (simular pesagem), formulacao=L1 - Bezerro
- **Destino:** garrote
- **Decisão:** TROCAR para L1 - Garrote (gmd=1.2, peso=290)
- **Validar:** mesmas verificações do Step 1.1, com:
  - [ ] peso_meta_kg=290 (da nova formulação)
  - [ ] gmd_planejado=1.2
  - [ ] Snapshot do lote captura estado atualizado

### Step 1.4: garrote > boi magro (TROCAR formulação)

- **Origem:** garrote, peso=290kg, formulacao=L1 - Garrote
- **Destino:** boi magro
- **Decisão:** TROCAR para L1 - Boi Magro (gmd=1.4, peso=400)
- **Validar:** mesmas verificações

### Step 1.5: boi magro > boi gordo (MANTER formulação)

- **Origem:** boi magro, peso=400kg, formulacao=L1 - Boi Magro
- **Destino:** boi gordo
- **Decisão:** MANTER formulação (não há formulação específica de boi gordo, mantém a do boi magro)
- **Validar:**
  - [ ] Nova lote_categoria criada com categoria="boi gordo"
  - [ ] formulacao_id preservado (L1 - Boi Magro)
  - [ ] Novo plano com:
    - peso_meta_kg preservado da origem (não da formulação, porque MANTER)
    - gmd_planejado da formulação (1.4)
  - [ ] Snapshot com manter_formulacao=true

### Step 1.5b: Editar plano vigente após MANTER, trocando para nova formulação

Após o Step 1.5, o plano vigente do L1 (boi gordo) herdou a formulação do boi magro (L1 - Boi Magro, gmd=1.4, peso_meta=400). O usuário decide que o boi gordo merece uma formulação de terminação própria.

- **Ação:** Abrir o plano vigente do L1 no PlanoNutricionalModal e editar
- **Mudança:** Trocar formulação de "L1 - Boi Magro" para "Teste - Boi Gordo" (gmd=1.0, peso=500)
- **Validar:**
  - [ ] Botão "Editar" aparece (plano vigente, data_fim=null)
  - [ ] Select de formulação permite trocar para "Teste - Boi Gordo"
  - [ ] Ao salvar, plano atualizado no banco com:
    - formulacao_id = Teste - Boi Gordo
    - gmd_planejado = 1.0 (da nova formulação)
    - peso_meta_kg = 500 (peso_vivo_medio da nova formulação)
  - [ ] lote_categorias.formulacao_id também atualizado para Teste - Boi Gordo
  - [ ] Nome do plano atualizado para refletir nova formulação/categoria

### Step 1.5c: Editar plano vigente após MANTER, preservando formulação herdada

Simular o caso onde o usuário edita o plano mas decide manter a formulação que foi herdada da recategorização, apenas ajustando metas operacionais.

- **Ação:** Abrir o mesmo plano (agora com Teste - Boi Gordo) e editar novamente
- **Mudança:** Manter formulação "Teste - Boi Gordo", mas ajustar:
  - peso_meta_kg de 500 para 520 (boi gordo de abate mais pesado)
  - periodo_dias de 0 para 90
  - gmd_planejado de 1.0 para 0.9 (GMD real do pasto, diferente do planejado da formulação)
- **Validar:**
  - [ ] Conseguir editar todos os campos sem erro
  - [ ] Ao salvar, plano atualizado com:
    - formulacao_id preservado (Teste - Boi Gordo)
    - peso_meta_kg = 520
    - periodo_dias = 90
    - gmd_planejado = 0.9
  - [ ] Validação de peso_meta >= pesoAtualCategoria passa (520 >= 450)
  - [ ] Plano permanece ativo (data_fim=null)

### Step 1.6: Exportar auditoria XLSX do L1

- Disparar exportação na página Faixas de Categorias
- **Validar:**
  - [ ] Arquivo XLSX (não CSV) gerado com 2 abas
  - [ ] Aba "Transições": 4 linhas (uma por transição), com todas as 35 colunas preenchidas
  - [ ] Aba "Lote (auditoria)": 4 linhas, com dados completos do lote em cada transição
  - [ ] Nome do arquivo: auditoria_L1_YYYY-MM-DD.xlsx

---

## Fase 2: Cenário Reprodução (L7, macho, reprodução)

Cronologia completa: bezerro ao pe > bezerro > garrote > touro

### Step 2.1: bezerro ao pe > bezerro (MANTER formulação)

- **Origem:** bezerro ao pe, peso=85kg, formulacao=L1 - Bezerro ao Pe
- **Destino:** bezerro
- **Decisão:** MANTER formulação
- **Validar:**
  - [ ] formulacao_id preservado (L1 - Bezerro ao Pe)
  - [ ] peso_meta_kg preservado da origem
  - [ ] Snapshot com manter_formulacao=true, lote_origem com destino=reprodução

### Step 2.2: bezerro > garrote (TROCAR formulação)

- **Origem:** bezerro, peso=170kg
- **Destino:** garrote
- **Decisão:** TROCAR para L1 - Garrote (gmd=1.2, peso=290)
- **Validar:** mesmas verificações

### Step 2.3: garrote > touro (TROCAR formulação)

- **Origem:** garrote, peso=290kg
- **Destino:** touro
- **Decisão:** TROCAR para Teste - Touro (gmd=0.5, peso=550)
- **Validar:**
  - [ ] Nova categoria="touro", ativo=true
  - [ ] peso_meta_kg=550 (da formulação do touro)
  - [ ] gmd_planejado=0.5
  - [ ] Snapshot captura destino=reprodução

### Step 2.4: Exportar auditoria XLSX do L7

- **Validar:** 3 transições na aba "Transições", 3 linhas na aba "Lote (auditoria)"

---

## Fase 3: Cenário Fêmea (L8, fêmea, reprodução)

Cronologia completa: bezerra ao pe > bezerra > novilha > vaca

### Step 3.1: bezerra ao pe > bezerra (TROCAR formulação)

- **Origem:** bezerra ao pe, peso=80kg, formulacao=Teste - Bezerra ao Pe
- **Destino:** bezerra
- **Decisão:** TROCAR para Teste - Bezerra (gmd=0.9, peso=160)
- **Validar:** mesmas verificações

### Step 3.2: bezerra > novilha (TROCAR formulação)

- **Origem:** bezerra, peso=160kg
- **Destino:** novilha
- **Decisão:** TROCAR para Teste - Novilha (gmd=1.0, peso=280)
- **Validar:** mesmas verificações

### Step 3.3: novilha > vaca (TROCAR formulação)

- **Origem:** novilha, peso=280kg
- **Destino:** vaca
- **Decisão:** TROCAR para Teste - Vaca (gmd=0.3, peso=400)
- **Validar:** mesmas verificações

### Step 3.4: Exportar auditoria XLSX do L8

- **Validar:** 3 transições, dados completos

---

## Fase 4: Edge Cases

### 4.1 Recategorização sem formulação (L6)

L6 (boi gordo) não tem formulacao_id nem plano ativo.
- **Ação:** Recategorizar boi gordo > touro (simulando mudança de destino)
- **Decisão:** MANTER (não há formulação para manter)
- **Validar:**
  - [ ] Nova categoria criada sem formulacao_id
  - [ ] Nenhum plano nutricional criado (origem não tinha plano)
  - [ ] Transição registrada com plano_nutricional_origem=null
  - [ ] Snapshot do lote capturado mesmo sem plano

### 4.2 Recategorização com TROCAR quando origem não tem plano (L6)

- **Ação:** Recategorizar touro > boi magro com TROCAR para Boi Magro 1
- **Validar:**
  - [ ] Novo plano criado mesmo sem plano origem (Caso B da RPC)
  - [ ] peso_meta_kg=360 (peso_vivo_medio da formulação Boi Magro 1)
  - [ ] gmd_planejado=1.4
  - [ ] periodo_dias=0, condicao_migracao='peso'

### 4.3 Recategorização com peso fora da faixa (aviso não-bloqueante)

- **Ação:** Recategorizar uma categoria onde o peso atual está fora da faixa da categoria destino
- **Exemplo:** L5 (boi magro, 410kg) > garrote (faixa 210-350). Peso 410 está acima da faixa.
- **Validar:**
  - [ ] Aviso exibido na UI mas não bloqueia
  - [ ] Recategorização executada com sucesso
  - [ ] Snapshot registra o peso fora da faixa

### 4.4 Edição de plano encerrado (histórico)

- **Ação:** Tentar editar um plano nutricional encerrado (data_fim preenchida)
- **Validar:**
  - [ ] Botão "Editar" não aparece (condição: !plano.data_fim)
  - [ ] Plano é exibido como somente leitura

### 4.5 Salvar lote não deleta categorias encerradas

- **Ação:** Abrir L1 no editor de lotes, fazer uma edição menor (ex: mudar nome do produtor), salvar
- **Validar:**
  - [ ] Categorias encerradas (ativo=false) permanecem no banco
  - [ ] Apenas categoria ativa é editada
  - [ ] Nenhuma categoria encerrada é deletada
  - [ ] Transições permanecem intactas

### 4.6 Cron não atualiza categorias encerradas

- **Ação:** Rodar `update_dados_lotes()` manualmente
- **Validar:**
  - [ ] Apenas categorias com ativo=true e data_fim=NULL são atualizadas
  - [ ] Categorias encerradas não têm peso_vivo_atual_kg_cab modificado
  - [ ] Snapshots permanecem íntegros

### 4.7 Dashboard não soma categorias encerradas

- **Ação:** Carregar o dashboard da fazenda
- **Validar:**
  - [ ] Total de cabeças = soma apenas de categorias ativas
  - [ ] Peso médio = apenas de categorias ativas
  - [ ] L1 com 50 cab (não 250 = 50 x 5 categorias)

### 4.8 Snapshot completo do lote

- **Ação:** Após todas as transições, consultar snapshot_jsonb da última transição de L1
- **Validar:**
  - [ ] lote_origem tem todos os 47 campos da tabela lotes
  - [ ] lote_categoria_origem tem dados da categoria antes do encerramento
  - [ ] plano_nutricional_origem tem dados do plano antes do encerramento
  - [ ] manter_formulacao e nova_formulacao_id corretos

### 4.9 Toast notification pós-recategorização

- **Ação:** Executar uma recategorização pela UI (não por SQL)
- **Validar:**
  - [ ] Toast aparece no canto superior direito
  - [ ] Mostra nome do plano criado
  - [ ] Mostra peso meta em kg
  - [ ] Link para /controller/cadernetas/suplementacao funciona
  - [ ] Auto-dismiss após 8 segundos
  - [ ] Botão de fechar manual funciona

### 4.10 Export XLSX com lote sem transições

- **Ação:** Selecionar um lote sem nenhuma transição (ex: L3) e tentar exportar
- **Validar:**
  - [ ] Botão de exportar desabilitado ou mensagem "sem transições"
  - [ ] Não gera arquivo vazio

### 4.11 Editar plano após MANTER com formulação de categoria diferente

Após uma recategorização com MANTER, o plano herdou a formulação da categoria anterior. O usuário edita o plano e troca para uma formulação cuja categoria é diferente da categoria atual do lote.

- **Cenário:** L7 (reprodução) após Step 2.1 (MANTER). Plano tem formulação "L1 - Bezerro ao Pe" (categoria=bezerro ao pe) mas a categoria atual do lote é "bezerro".
- **Ação:** Editar o plano e trocar formulação para "L1 - Bezerro" (categoria=bezerro, compatível) ou para "Teste - Boi Gordo" (categoria=boi gordo, incompatível)
- **Validar:**
  - [ ] Trocar para formulação de categoria compatível: permite salvar, atualiza formulacao_id e gmd_planejado
  - [ ] Trocar para formulação de categoria incompatível: permite salvar (soft mode, não bloqueia), mas pode mostrar aviso
  - [ ] lote_categorias.formulacao_id sincronizado com o novo formulacao_id do plano
  - [ ] Snapshot da próxima recategorização captura o formulacao_id atualizado

### 4.12 Editar plano após MANTER sem trocar formulação, apenas ajustar metas

- **Cenário:** Mesmo plano do 4.11, mas o usuário mantém a formulação herdada e apenas ajusta peso_meta_kg e periodo_dias.
- **Ação:** Editar peso_meta_kg (ex: de 120 para 150) e periodo_dias (ex: de 0 para 60)
- **Validar:**
  - [ ] formulacao_id preservado
  - [ ] peso_meta_kg e periodo_dias atualizados
  - [ ] gmd_planejado pode ser ajustado independentemente da formulação
  - [ ] Plano permanece ativo

---

## Fase 5: Validação final

### 5.1 Verificar cadeia completa de categorias

Para L1 (após 4 transições):
- [ ] 5 categorias no total (4 encerradas + 1 ativa)
- [ ] Cadeia categoria_origem_id conecta todas sequencialmente
- [ ] Apenas a última (boi gordo) tem ativo=true

### 5.2 Verificar transições

- [ ] 4 transições registradas em lote_categorias_transicoes
- [ ] Todas têm snapshot_jsonb com lote_origem preenchido
- [ ] Ordem cronológica correta

### 5.3 Verificar planos nutricionais

- [ ] Cada categoria encerrada tem seu plano encerrado (data_fim preenchida)
- [ ] Apenas a categoria ativa tem plano ativo
- [ ] Nenhum plano órfão (sem lote_categoria)

### 5.4 Limpeza pós-teste (opcional)

- [ ] Deletar L7, L8 e formulações "Teste - *" criadas para o teste
- [ ] Ou manter como dados de demonstração

---

## Critérios de sucesso

O teste passa se TODOS os itens abaixo forem verdadeiros:

1. **Cronologia corte (L1):** 4 transições executadas, bezerro ao pe > boi gordo, com snapshots completos
2. **Cronologia reprodução (L7):** 3 transições executadas, bezerro ao pe > touro, com snapshots completos
3. **Cronologia fêmea (L8):** 3 transições executadas, bezerra ao pe > vaca, com snapshots completos
4. **MANTER vs TROCAR:** ambos os caminhos testados e validados (peso_meta e gmd corretos em cada caso)
5. **Edição de plano vigente:** funciona corretamente
6. **Plano encerrado:** não é editável
7. **Edição de plano após MANTER:** usuário pode trocar para nova formulação (atualiza formulacao_id, gmd, peso_meta) ou preservar a herdada e ajustar apenas metas operacionais (peso_meta, periodo, gmd)
8. **Categorias encerradas:** não somam no dashboard, não são atualizadas pelo cron, não são deletadas ao salvar lote
9. **Snapshots:** capturam lote completo (47 campos), lote_categoria e plano nutricional
10. **Export XLSX:** gera 2 abas (Transições + Lote auditoria) com dados completos
11. **Toast notification:** aparece após recategorização pela UI
12. **Edge cases:** todos os 12 cenários da Fase 4 passam
