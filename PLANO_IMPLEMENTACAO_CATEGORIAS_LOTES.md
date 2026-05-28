# Plano de Implementação: Sistema de Categorias Específicas por Lote

## ⚠️ AVISOS DE SEGURANÇA CRÍTICOS

**1. NUNCA executar comandos DROP COLUMN sem backup prévio**
**2. NUNCA executar comandos DROP TABLE sem backup prévio**
**3. SEMPRE verificar a migração antes de remover colunas**
**4. SEMPRE usar transações (BEGIN/COMMIT/ROLLBACK) para operações destrutivas**
**5. AGUARDAR aprovação explícita do usuário antes de cada fase destrutiva**

## Objetivo
Restruturar o sistema de lotes para suportar dados específicos por categoria (vaca, touro, boi gordo, etc.), permitindo uma visão clara e detalhada de cada categoria dentro de um lote.

---

## Fase 1: Estrutura do Banco de Dados

### 1.1 Tabela `lotes` (Ajustada)
Manter apenas campos comuns ao lote como um todo:

**Campos a manter:**
- `id` (uuid, PK)
- `fazenda_id` (uuid, FK → fazendas)
- `nome` (text)
- `pasto_id` (uuid, FK → pastos)
- `sistema_producao` (text)
- `ativo` (boolean)
- `produtor_rural` (text)
- `propriedade_origem` (text)
- `numero_contrato` (text)
- `mes_competencia` (text)
- `data_liberacao_sisbov` (date)
- `periodo_liberacao_sisbov` (integer, calculado)
- `data_embarque_prevista` (date)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**⚠️ IMPORTANTE: Campos a migrar para lote_categorias (NÃO REMOVER AINDA)**
- `categorias` (jsonb)
- `n_cabecas` (integer)
- `categorias` (array)
- `peso_vivo_kg` (numeric)
- `peso_vivo_meta_kg` (numeric)
- `data_meta` (date)
- `qtd_bezerros` (integer)
- `quant_inicial` (integer)
- `data_pesagem` (date)
- `peso_entrada` (numeric)
- `gmd` (numeric)
- `periodo` (integer)
- `rc_inicial` (numeric)
- `preco_animal_kg` (numeric)
- `preco_animal_cab` (numeric)
- `raca` (text)
- `sexo` (text)
- `idade` (integer)
- `custo_operacional` (numeric)
- `estrategia_nutricional` (text)
- `dias_restantes_meta` (integer)
- `morte` (integer)
- `consumo` (integer)
- `abate` (integer)
- `transf_entrada` (integer)
- `transf_saida` (integer)

**⚠️ AVISO CRÍTICO: NÃO EXECUTAR COMANDOS DROP COLUMN ATÉ QUE A MIGRAÇÃO SEJA VERIFICADA E APROVADA.**

### 1.2 Nova Tabela `lote_categorias`
Armazena dados específicos para cada categoria dentro de um lote.

**Estrutura:**
```sql
CREATE TABLE lote_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL, -- 'vaca', 'touro', 'boi gordo', 'boi magro', 'garrote', 'bezerro', 'novilha', 'tropa'
  
  -- Dados de Pesagem e Crescimento
  quant_inicial INTEGER,
  data_pesagem DATE,
  peso_entrada NUMERIC(10,2),
  peso_entrada_arrobas NUMERIC(10,2), -- Calculado: (peso_entrada * rc_inicial) / 15
  gmd NUMERIC(10,3),
  periodo INTEGER, -- Calculado: CURRENT_DATE - data_pesagem
  rc_inicial NUMERIC(5,2),
  
  -- Dados Atuais
  quant_atual INTEGER, -- Calculado: quant_inicial - morte - consumo - abate - transf_saida + transf_entrada
  peso_vivo_kg NUMERIC(10,2), -- Calculado: peso_entrada + (gmd * periodo)
  peso_vivo_meta_kg NUMERIC(10,2),
  dias_restantes_meta INTEGER, -- Calculado: (data_meta - data_pesagem) - periodo
  data_meta DATE,
  estrategia_nutricional TEXT,
  
  -- Dados de Identificação
  raca TEXT,
  sexo TEXT,
  idade INTEGER,
  
  -- Dados Financeiros
  preco_animal_kg NUMERIC(10,2),
  preco_animal_cab NUMERIC(10,2),
  custo_operacional NUMERIC(10,2),
  
  -- Dados de Movimentação
  morte INTEGER DEFAULT 0,
  consumo INTEGER DEFAULT 0,
  abate INTEGER DEFAULT 0,
  transf_entrada INTEGER DEFAULT 0,
  transf_saida INTEGER DEFAULT 0,
  qtd_bezerros INTEGER,
  
  -- Metadados
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_lote_categoria UNIQUE (lote_id, categoria)
);
```

**Índices:**
```sql
CREATE INDEX idx_lote_categorias_lote_id ON lote_categorias(lote_id);
CREATE INDEX idx_lote_categorias_categoria ON lote_categorias(categoria);
```

---

## Fase 2: Migração de Dados

### 2.0 ⚠️ PREPARAÇÃO DE BACKUP (OBRIGATÓRIO)
**ANTES de qualquer modificação, executar:**

```sql
-- Criar tabela de backup completa da tabela lotes
CREATE TABLE lotes_backup_YYYYMMDD AS 
SELECT * FROM lotes;

-- Verificar backup
SELECT COUNT(*) FROM lotes_backup_YYYYMMDD;
-- Deve retornar o mesmo número de registros que a tabela original

-- Verificar backup dos dados críticos
SELECT COUNT(*) FROM lotes_backup_YYYYMMDD WHERE categorias IS NOT NULL;
```

**⚠️ NÃO PROSSIGA ATÉ QUE O BACKUP SEJA VERIFICADO E APROVADO.**

### 2.1 Script de Migração
```sql
-- Para cada lote existente, criar registros em lote_categorias
-- para cada categoria presente no array 'categorias'

INSERT INTO lote_categorias (
  lote_id,
  categoria,
  quant_inicial,
  data_pesagem,
  peso_entrada,
  peso_entrada_arrobas,
  gmd,
  periodo,
  rc_inicial,
  quant_atual,
  peso_vivo_kg,
  peso_vivo_meta_kg,
  dias_restantes_meta,
  data_meta,
  estrategia_nutricional,
  raca,
  sexo,
  idade,
  preco_animal_kg,
  preco_animal_cab,
  custo_operacional,
  morte,
  consumo,
  abate,
  transf_entrada,
  transf_saida,
  qtd_bezerros,
  ativo
)
SELECT 
  id as lote_id,
  unnest(categorias) as categoria,
  quant_inicial,
  data_pesagem,
  peso_entrada,
  (peso_entrada * rc_inicial / 15) as peso_entrada_arrobas,
  gmd,
  periodo,
  rc_inicial,
  n_cabecas as quant_atual,
  peso_vivo_kg,
  peso_vivo_meta_kg,
  dias_restantes_meta,
  data_meta,
  estrategia_nutricional,
  raca,
  sexo,
  idade,
  preco_animal_kg,
  preco_animal_cab,
  custo_operacional,
  0 as morte,
  0 as consumo,
  0 as abate,
  0 as transf_entrada,
  0 as transf_saida,
  qtd_bezerros,
  ativo
FROM lotes
WHERE categorias IS NOT NULL AND array_length(categorias, 1) > 0;
```

### 2.2 ⚠️ VERIFICAÇÃO DE MIGRAÇÃO (OBRIGATÓRIO)
**ANTES de remover colunas, executar:**

```sql
-- Verificar se todos os lotes com categorias foram migrados
SELECT 
  l.nome,
  l.categorias,
  COUNT(lc.id) as num_categorias_migradas
FROM lotes l
LEFT JOIN lote_categorias lc ON l.id = lc.lote_id
WHERE l.categorias IS NOT NULL AND array_length(l.categorias, 1) > 0
GROUP BY l.id, l.nome, l.categorias
ORDER BY l.nome;

-- Verificar contagem total
SELECT 
  (SELECT COUNT(*) FROM lotes WHERE categorias IS NOT NULL) as lotes_com_categorias,
  (SELECT COUNT(*) FROM lote_categorias) as categorias_migradas;

-- Verificar integridade dos dados migrados
SELECT 
  lc.categoria,
  lc.peso_entrada,
  lc.peso_entrada_arrobas,
  (lc.peso_entrada * lc.rc_inicial / 15) as calculado
FROM lote_categorias lc
WHERE lc.peso_entrada IS NOT NULL AND lc.rc_inicial IS NOT NULL
LIMIT 10;
```

**⚠️ NÃO PROSSIGA ATÉ QUE A MIGRAÇÃO SEJA VERIFICADA E APROVADA PELO USUÁRIO.**

### 2.3 ⚠️ ORDEM ATUALIZADA DE IMPLEMENTAÇÃO (APPROACH B)

**Nova ordem para evitar downtime:**
1. ✅ Fase 1: Estrutura do Banco de Dados (criar lote_categorias)
2. ✅ Fase 2: Migração de Dados (migrar para lote_categorias)
3. ⏳ Fase 3: Atualizar Frontend (Lotes.tsx usar lote_categorias)
4. ⏳ Fase 4: Testar Frontend com nova estrutura
5. ⏳ Fase 5: Atualizar Backend (update_dados_lotes)
6. ⏳ Fase 6: Renomear colunas antigas (safety step)
7. ⏳ Fase 7: Testar aplicação com colunas renomeadas
8. ⏳ Fase 8: Remover colunas antigas
9. ⏳ Fase 9: Testes finais

**Benefícios desta ordem:**
- Aplicação nunca fica inoperante
- Frontend funciona com nova estrutura antes de modificar banco
- Testes incrementais em cada fase
- Rollback mais fácil se houver problemas

### 2.4 Remoção de Colunas Antigas (APÓS FRONTEND ATUALIZADO)
**⚠️ EXECUTAR APENAS APÓS FRONTEND ESTIVER FUNCIONANDO COM lote_categorias**

```sql
-- Iniciar transação para rollback em caso de erro
BEGIN;

-- Renomear colunas primeiro (como segurança adicional)
ALTER TABLE lotes 
  RENAME COLUMN categorias TO categorias_old,
  RENAME COLUMN n_cabecas TO n_cabecas_old,
  RENAME COLUMN peso_vivo_kg TO peso_vivo_kg_old,
  RENAME COLUMN peso_vivo_meta_kg TO peso_vivo_meta_kg_old,
  RENAME COLUMN data_meta TO data_meta_old,
  RENAME COLUMN qtd_bezerros TO qtd_bezerros_old,
  RENAME COLUMN quant_inicial TO quant_inicial_old,
  RENAME COLUMN data_pesagem TO data_pesagem_old,
  RENAME COLUMN peso_entrada TO peso_entrada_old,
  RENAME COLUMN gmd TO gmd_old,
  RENAME COLUMN periodo TO periodo_old,
  RENAME COLUMN rc_inicial TO rc_inicial_old,
  RENAME COLUMN preco_animal_kg TO preco_animal_kg_old,
  RENAME COLUMN preco_animal_cab TO preco_animal_cab_old,
  RENAME COLUMN raca TO raca_old,
  RENAME COLUMN sexo TO sexo_old,
  RENAME COLUMN idade TO idade_old,
  RENAME COLUMN custo_operacional TO custo_operacional_old,
  RENAME COLUMN estrategia_nutricional TO estrategia_nutricional_old,
  RENAME COLUMN dias_restantes_meta TO dias_restantes_meta_old,
  RENAME COLUMN morte TO morte_old,
  RENAME COLUMN consumo TO consumo_old,
  RENAME COLUMN abate TO abate_old,
  RENAME COLUMN transf_entrada TO transf_entrada_old,
  RENAME COLUMN transf_saida TO transf_saida_old;

-- Testar aplicação com colunas renomeadas
-- Se funcionar corretamente, então remover as colunas

-- Remover colunas renomeadas
ALTER TABLE lotes 
  DROP COLUMN IF EXISTS categorias_old,
  DROP COLUMN IF EXISTS n_cabecas_old,
  DROP COLUMN IF EXISTS peso_vivo_kg_old,
  DROP COLUMN IF EXISTS peso_vivo_meta_kg_old,
  DROP COLUMN IF EXISTS data_meta_old,
  DROP COLUMN IF EXISTS qtd_bezerros_old,
  DROP COLUMN IF EXISTS quant_inicial_old,
  DROP COLUMN IF EXISTS data_pesagem_old,
  DROP COLUMN IF EXISTS peso_entrada_old,
  DROP COLUMN IF EXISTS gmd_old,
  DROP COLUMN IF EXISTS periodo_old,
  DROP COLUMN IF EXISTS rc_inicial_old,
  DROP COLUMN IF EXISTS preco_animal_kg_old,
  DROP COLUMN IF EXISTS preco_animal_cab_old,
  DROP COLUMN IF EXISTS raca_old,
  DROP COLUMN IF EXISTS sexo_old,
  DROP COLUMN IF EXISTS idade_old,
  DROP COLUMN IF EXISTS custo_operacional_old,
  DROP COLUMN IF EXISTS estrategia_nutricional_old,
  DROP COLUMN IF EXISTS dias_restantes_meta_old,
  DROP COLUMN IF EXISTS morte_old,
  DROP COLUMN IF EXISTS consumo_old,
  DROP COLUMN IF EXISTS abate_old,
  DROP COLUMN IF EXISTS transf_entrada_old,
  DROP COLUMN IF EXISTS transf_saida_old;

COMMIT;

-- Em caso de erro, executar: ROLLBACK;
```

---

## Fase 3: Lógica de Cálculo (Backend)

### 3.1 Atualização da Função `update_dados_lotes`
A função deve iterar sobre `lote_categorias` em vez de `lotes`.

```sql
CREATE OR REPLACE FUNCTION public.update_dados_lotes()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  categoria_record RECORD;
  days_diff INTEGER;
  new_peso_vivo NUMERIC;
  dias_para_meta INTEGER;
  dias_restantes INTEGER;
  peso_entrada_arrobas NUMERIC;
  quant_atual INTEGER;
BEGIN
  FOR categoria_record IN 
    SELECT id, peso_entrada, gmd, data_pesagem, data_meta, rc_inicial,
           quant_inicial, morte, consumo, abate, transf_saida, transf_entrada
    FROM lote_categorias
    WHERE peso_entrada IS NOT NULL 
      AND gmd IS NOT NULL 
      AND data_pesagem IS NOT NULL
  LOOP
    -- STEP 1: Calculate periodo
    days_diff := (CURRENT_DATE - categoria_record.data_pesagem)::INTEGER;
    
    -- STEP 2: Calculate peso_vivo_kg
    new_peso_vivo := categoria_record.peso_entrada + (categoria_record.gmd * days_diff);
    
    -- STEP 3: Calculate dias_restantes_meta
    IF categoria_record.data_meta IS NOT NULL THEN
      dias_para_meta := (categoria_record.data_meta - categoria_record.data_pesagem)::INTEGER;
      dias_restantes := dias_para_meta - days_diff;
    ELSE
      dias_restantes := NULL;
    END IF;
    
    -- STEP 4: Calculate peso_entrada_arrobas
    IF categoria_record.rc_inicial IS NOT NULL THEN
      peso_entrada_arrobas := (categoria_record.peso_entrada * categoria_record.rc_inicial) / 15;
    ELSE
      peso_entrada_arrobas := NULL;
    END IF;
    
    -- STEP 5: Calculate quant_atual
    IF categoria_record.quant_inicial IS NOT NULL THEN
      quant_atual := categoria_record.quant_inicial 
                    - (categoria_record.morte || 0) 
                    - (categoria_record.consumo || 0) 
                    - (categoria_record.abate || 0) 
                    - (categoria_record.transf_saida || 0) 
                    + (categoria_record.transf_entrada || 0);
    ELSE
      quant_atual := NULL;
    END IF;
    
    -- STEP 6: Update all in same transaction
    UPDATE lote_categorias
    SET periodo = days_diff,
        peso_vivo_kg = new_peso_vivo,
        dias_restantes_meta = dias_restantes,
        peso_entrada_arrobas = peso_entrada_arrobas,
        quant_atual = quant_atual
    WHERE id = categoria_record.id;
  END LOOP;
END;
$function$;
```

### 3.2 Triggers para Cálculos em Tempo Real
```sql
-- Trigger para recalcular quando peso_entrada ou rc_inicial mudar
CREATE OR REPLACE FUNCTION recalcular_peso_entrada_arrobas()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.peso_entrada IS NOT NULL AND NEW.rc_inicial IS NOT NULL THEN
    NEW.peso_entrada_arrobas := (NEW.peso_entrada * NEW.rc_inicial) / 15;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalcular_peso_entrada_arrobas
  BEFORE INSERT OR UPDATE OF peso_entrada, rc_inicial
  ON lote_categorias
  FOR EACH ROW
  EXECUTE FUNCTION recalcular_peso_entrada_arrobas();
```

---

## Fase 4: Interface do Usuário (Frontend)

### 4.1 Atualização do Formulário (Lotes.tsx)

#### 4.1.1 Nova Estrutura de Estado
```typescript
interface LoteCategoria {
  id?: string;
  categoria: string;
  quant_inicial: string;
  data_pesagem: string;
  peso_entrada: string;
  peso_entrada_arrobas: string; // Calculado
  gmd: string;
  periodo: string; // Calculado
  rc_inicial: string;
  quant_atual: string; // Calculado
  peso_vivo_kg: string; // Calculado
  peso_vivo_meta_kg: string;
  dias_restantes_meta: string; // Calculado
  data_meta: string;
  estrategia_nutricional: string;
  raca: string;
  sexo: string;
  idade: string;
  preco_animal_kg: string;
  preco_animal_cab: string;
  custo_operacional: string;
  morte: string;
  consumo: string;
  abate: string;
  transf_entrada: string;
  transf_saida: string;
  qtd_bezerros: string;
}

interface LoteFormData {
  // Campos comuns do lote
  nome: string;
  pasto_id: string;
  sistema_producao: string;
  ativo: boolean;
  produtor_rural: string;
  propriedade_origem: string;
  numero_contrato: string;
  mes_competencia: string;
  data_liberacao_sisbov: string;
  periodo_liberacao_sisbov: string; // Calculado
  data_embarque_prevista: string;
  
  // Categorias (array)
  categorias: LoteCategoria[];
}
```

#### 4.1.2 Componente de Categoria Dinâmica
Criar um componente reutilizável para cada categoria:

```typescript
function CategoriaForm({ 
  categoria, 
  index, 
  onUpdate, 
  onRemove 
}: { 
  categoria: LoteCategoria;
  index: number;
  onUpdate: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
}) {
  // Cálculos locais
  useEffect(() => {
    // Calcular peso_entrada_arrobas
    if (categoria.peso_entrada && categoria.rc_inicial) {
      const pesoEntrada = parseFloat(categoria.peso_entrada);
      const rcInicial = parseFloat(categoria.rc_inicial);
      const arrobas = (pesoEntrada * rcInicial) / 15;
      onUpdate(index, 'peso_entrada_arrobas', arrobas.toFixed(2));
    }
  }, [categoria.peso_entrada, categoria.rc_inicial]);

  useEffect(() => {
    // Calcular periodo
    if (categoria.data_pesagem) {
      const dataPesagem = new Date(categoria.data_pesagem);
      const currentDate = new Date();
      const diffDays = Math.ceil((currentDate.getTime() - dataPesagem.getTime()) / (1000 * 60 * 60 * 24));
      onUpdate(index, 'periodo', diffDays.toString());
    }
  }, [categoria.data_pesagem]);

  useEffect(() => {
    // Calcular peso_vivo_kg
    if (categoria.peso_entrada && categoria.gmd && categoria.periodo) {
      const pesoEntrada = parseFloat(categoria.peso_entrada);
      const gmd = parseFloat(categoria.gmd);
      const periodo = parseFloat(categoria.periodo);
      const pesoVivo = pesoEntrada + (gmd * periodo);
      onUpdate(index, 'peso_vivo_kg', pesoVivo.toFixed(2));
    }
  }, [categoria.peso_entrada, categoria.gmd, categoria.periodo]);

  useEffect(() => {
    // Calcular quant_atual
    if (categoria.quant_inicial) {
      const quantInicial = parseInt(categoria.quant_inicial);
      const morte = parseInt(categoria.morte) || 0;
      const consumo = parseInt(categoria.consumo) || 0;
      const abate = parseInt(categoria.abate) || 0;
      const transfSaida = parseInt(categoria.transf_saida) || 0;
      const transfEntrada = parseInt(categoria.transf_entrada) || 0;
      const quantAtual = quantInicial - morte - consumo - abate - transfSaida + transfEntrada;
      onUpdate(index, 'quant_atual', quantAtual.toString());
    }
  }, [categoria.quant_inicial, categoria.morte, categoria.consumo, categoria.abate, categoria.transf_saida, categoria.transf_entrada]);

  useEffect(() => {
    // Calcular dias_restantes_meta
    if (categoria.data_meta && categoria.data_pesagem && categoria.periodo) {
      const dataMeta = new Date(categoria.data_meta);
      const dataPesagem = new Date(categoria.data_pesagem);
      const periodo = parseFloat(categoria.periodo);
      const diffDays = Math.ceil((dataMeta.getTime() - dataPesagem.getTime()) / (1000 * 60 * 60 * 24));
      const diasRestantes = diffDays - periodo;
      onUpdate(index, 'dias_restantes_meta', diasRestantes.toString());
    }
  }, [categoria.data_meta, categoria.data_pesagem, categoria.periodo]);

  return (
    <Card className="border-2 border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold capitalize">{categoria.categoria}</h4>
        <Button 
          variant="danger" 
          onClick={() => onRemove(index)}
          size="sm"
        >
          Remover
        </Button>
      </div>
      
      {/* Grid de campos específicos da categoria */}
      <div className="grid grid-cols-6 gap-2">
        {/* Campos de Identificação */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Raça</label>
          <Input
            type="text"
            value={categoria.raca}
            onChange={(e) => onUpdate(index, 'raca', e.target.value)}
            placeholder="Ex: Nelore"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
          <select
            value={categoria.sexo}
            onChange={(e) => onUpdate(index, 'sexo', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">Selecione</option>
            <option value="macho">Macho</option>
            <option value="fêmea">Fêmea</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Idade (meses)</label>
          <Input
            type="number"
            value={categoria.idade}
            onChange={(e) => onUpdate(index, 'idade', e.target.value)}
            placeholder="Ex: 24"
          />
        </div>
        
        {/* Campos de Pesagem e Crescimento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quant. Inicial</label>
          <Input
            type="number"
            value={categoria.quant_inicial}
            onChange={(e) => onUpdate(index, 'quant_inicial', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Pesagem</label>
          <Input
            type="date"
            value={categoria.data_pesagem}
            onChange={(e) => onUpdate(index, 'data_pesagem', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peso Entrada (kg)</label>
          <Input
            type="number"
            step="0.1"
            value={categoria.peso_entrada}
            onChange={(e) => onUpdate(index, 'peso_entrada', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peso Entrada (@)</label>
          <Input
            type="number"
            step="0.01"
            value={categoria.peso_entrada_arrobas}
            disabled
            className="opacity-60"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GMD (kg/cab/dia)</label>
          <Input
            type="number"
            step="0.01"
            value={categoria.gmd}
            onChange={(e) => onUpdate(index, 'gmd', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Período (dias)</label>
          <Input
            type="number"
            value={categoria.periodo}
            disabled
            className="opacity-60"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">RC Inicial (%)</label>
          <Input
            type="number"
            step="0.1"
            value={categoria.rc_inicial}
            onChange={(e) => onUpdate(index, 'rc_inicial', e.target.value)}
            placeholder="Ex: 50"
          />
        </div>
        
        {/* Campos Atuais */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quant. Atual (cab)</label>
          <Input
            type="number"
            value={categoria.quant_atual}
            disabled
            className="opacity-60"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peso Vivo Atual (kg)</label>
          <Input
            type="number"
            step="0.1"
            value={categoria.peso_vivo_kg}
            disabled
            className="opacity-60"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peso Vivo Meta (kg)</label>
          <Input
            type="number"
            step="0.1"
            value={categoria.peso_vivo_meta_kg}
            onChange={(e) => onUpdate(index, 'peso_vivo_meta_kg', e.target.value)}
            placeholder="Ex: 500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dias Restantes Meta</label>
          <Input
            type="number"
            value={categoria.dias_restantes_meta}
            disabled
            className="opacity-60"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Meta</label>
          <Input
            type="date"
            value={categoria.data_meta}
            onChange={(e) => onUpdate(index, 'data_meta', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estratégia Nutricional</label>
          <Input
            type="text"
            value={categoria.estrategia_nutricional}
            onChange={(e) => onUpdate(index, 'estrategia_nutricional', e.target.value)}
            placeholder="Ex: RIP"
          />
        </div>
        
        {/* Campos Financeiros */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$/kg)</label>
          <Input
            type="number"
            step="0.01"
            value={categoria.preco_animal_kg}
            onChange={(e) => onUpdate(index, 'preco_animal_kg', e.target.value)}
            placeholder="Ex: 12.50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$/cab)</label>
          <Input
            type="number"
            step="0.01"
            value={categoria.preco_animal_cab}
            onChange={(e) => onUpdate(index, 'preco_animal_cab', e.target.value)}
            placeholder="Ex: 5300.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Custo Operacional</label>
          <Input
            type="number"
            step="0.01"
            value={categoria.custo_operacional}
            onChange={(e) => onUpdate(index, 'custo_operacional', e.target.value)}
            placeholder="Ex: 1.80"
          />
        </div>
        
        {/* Campos de Movimentação */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Morte (cab)</label>
          <Input
            type="number"
            value={categoria.morte}
            onChange={(e) => onUpdate(index, 'morte', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Consumo (cab)</label>
          <Input
            type="number"
            value={categoria.consumo}
            onChange={(e) => onUpdate(index, 'consumo', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Abate (cab)</label>
          <Input
            type="number"
            value={categoria.abate}
            onChange={(e) => onUpdate(index, 'abate', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transf. Entrada</label>
          <Input
            type="number"
            value={categoria.transf_entrada}
            onChange={(e) => onUpdate(index, 'transf_entrada', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transf. Saída</label>
          <Input
            type="number"
            value={categoria.transf_saida}
            onChange={(e) => onUpdate(index, 'transf_saida', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Qtd Bezerros</label>
          <Input
            type="number"
            value={categoria.qtd_bezerros}
            onChange={(e) => onUpdate(index, 'qtd_bezerros', e.target.value)}
            placeholder="Ex: 25"
          />
        </div>
      </div>
    </Card>
  );
}
```

#### 4.1.3 Seletor de Categorias
```typescript
const categoriasDisponiveis = [
  'vaca', 'touro', 'boi gordo', 'boi magro', 'garrote', 'bezerro', 'novilha', 'tropa'
];

function CategoriaSelector({ 
  selectedCategorias, 
  onAddCategoria 
}: { 
  selectedCategorias: string[];
  onAddCategoria: (categoria: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Adicionar Categoria
      </label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {categoriasDisponiveis.map(categoria => {
          const isSelected = selectedCategorias.includes(categoria);
          return (
            <button
              key={categoria}
              type="button"
              onClick={() => !isSelected && onAddCategoria(categoria)}
              disabled={isSelected}
              className={`px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${
                isSelected
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
              }`}
            >
              <span className="capitalize">{categoria}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

#### 4.1.4 Integração no Formulário Principal
```typescript
// No componente Lotes
const [formData, setFormData] = useState<LoteFormData>({
  // Campos comuns
  nome: '',
  pasto_id: '',
  sistema_producao: '',
  ativo: true,
  // ... outros campos comuns
  
  // Categorias
  categorias: []
});

const handleAddCategoria = (categoria: string) => {
  const novaCategoria: LoteCategoria = {
    categoria,
    quant_inicial: '',
    data_pesagem: '',
    peso_entrada: '',
    peso_entrada_arrobas: '',
    gmd: '',
    periodo: '',
    rc_inicial: '',
    quant_atual: '',
    peso_vivo_kg: '',
    peso_vivo_meta_kg: '',
    dias_restantes_meta: '',
    data_meta: '',
    estrategia_nutricional: '',
    raca: '',
    sexo: '',
    idade: '',
    preco_animal_kg: '',
    preco_animal_cab: '',
    custo_operacional: '',
    morte: '',
    consumo: '',
    abate: '',
    transf_entrada: '',
    transf_saida: '',
    qtd_bezerros: ''
  };
  
  setFormData({
    ...formData,
    categorias: [...formData.categorias, novaCategoria]
  });
};

const handleUpdateCategoria = (index: number, field: string, value: string) => {
  const novasCategorias = [...formData.categorias];
  novasCategorias[index] = { ...novasCategorias[index], [field]: value };
  setFormData({ ...formData, categorias: novasCategorias });
};

const handleRemoveCategoria = (index: number) => {
  const novasCategorias = formData.categorias.filter((_, i) => i !== index);
  setFormData({ ...formData, categorias: novasCategorias });
};

// No JSX do formulário
<div className="border-t pt-4">
  <h4 className="text-lg font-semibold text-gray-800 mb-4">Categorias</h4>
  
  <CategoriaSelector 
    selectedCategorias={formData.categorias.map(c => c.categoria)}
    onAddCategoria={handleAddCategoria}
  />
  
  {formData.categorias.map((categoria, index) => (
    <CategoriaForm
      key={index}
      categoria={categoria}
      index={index}
      onUpdate={handleUpdateCategoria}
      onRemove={handleRemoveCategoria}
    />
  ))}
</div>
```

### 4.2 Atualização da Visualização em Cards

#### 4.2.1 Novo Layout de Card
```typescript
function LoteCard({ lote, onEdit, onDelete }: { lote: LoteWithCategorias }) {
  return (
    <Card className="border-2 border-gray-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">{lote.nome}</h3>
          <p className="text-sm text-gray-600">{lote.pasto_nome}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => onEdit(lote)}>
            Editar
          </Button>
          <Button variant="danger" onClick={() => onDelete(lote.id)}>
            Excluir
          </Button>
        </div>
      </div>
      
      {/* Tabela de Categorias */}
      <div className="mt-4">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">Categorias</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-700">Categoria</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Quant.</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Peso Atual (kg)</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Peso Meta (kg)</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Dias Restantes</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">GMD</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Peso Entrada (@)</th>
              </tr>
            </thead>
            <tbody>
              {lote.categorias.map(cat => (
                <tr key={cat.id} className="border-t">
                  <td className="px-3 py-2 capitalize">{cat.categoria}</td>
                  <td className="px-3 py-2 text-right">{cat.quant_atual || '-'}</td>
                  <td className="px-3 py-2 text-right">{cat.peso_vivo_kg || '-'}</td>
                  <td className="px-3 py-2 text-right">{cat.peso_vivo_meta_kg || '-'}</td>
                  <td className="px-3 py-2 text-right">{cat.dias_restantes_meta || '-'}</td>
                  <td className="px-3 py-2 text-right">{cat.gmd || '-'}</td>
                  <td className="px-3 py-2 text-right">{cat.peso_entrada_arrobas || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Informações Adicionais */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium text-gray-700">Sistema:</span> {lote.sistema_producao}
        </div>
        <div>
          <span className="font-medium text-gray-700">Status:</span> {lote.ativo ? 'Ativo' : 'Inativo'}
        </div>
      </div>
    </Card>
  );
}
```

#### 4.2.2 Atualização do Fetch de Dados
```typescript
interface LoteWithCategorias extends Lote {
  categorias: LoteCategoria[];
  pasto_nome?: string;
}

const loadLotes = async () => {
  if (!user) return;

  const { data: vinculos } = await supabase
    .from('usuario_fazenda')
    .select('fazenda_id')
    .eq('usuario_id', user.id)
    .eq('ativo', true);

  if (!vinculos || vinculos.length === 0) return;

  const fazendaId = vinculos[0].fazenda_id;

  const { data, error } = await supabase
    .from('lotes')
    .select(`
      *,
      pasto: pastos (nome),
      categorias: lote_categorias (*)
    `)
    .eq('fazenda_id', fazendaId)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar lotes:', error);
    return;
  }

  setLotes(data as LoteWithCategorias[]);
  setLoading(false);
};
```

---

## Fase 5: Testes

### 5.1 Testes de Integridade de Dados

#### 5.1.1 Teste de Migração
```sql
-- Verificar se todos os lotes foram migrados
SELECT 
  l.nome,
  COUNT(lc.id) as num_categorias
FROM lotes l
LEFT JOIN lote_categorias lc ON l.id = lc.lote_id
GROUP BY l.id, l.nome
ORDER BY l.nome;
```

#### 5.1.2 Teste de Cálculos
```sql
-- Verificar cálculo de peso_entrada_arrobas
SELECT 
  categoria,
  peso_entrada,
  rc_inicial,
  peso_entrada_arrobas,
  (peso_entrada * rc_inicial / 15) as esperado
FROM lote_categorias
WHERE peso_entrada IS NOT NULL AND rc_inicial IS NOT NULL;
```

#### 5.1.3 Teste de Consistência
```sql
-- Verificar se quant_atual está consistente
SELECT 
  categoria,
  quant_inicial,
  morte,
  consumo,
  abate,
  transf_saida,
  transf_entrada,
  quant_atual,
  (quant_inicial - COALESCE(morte, 0) - COALESCE(consumo, 0) - COALESCE(abate, 0) - COALESCE(transf_saida, 0) + COALESCE(transf_entrada, 0)) as esperado
FROM lote_categorias
WHERE quant_inicial IS NOT NULL;
```

### 5.2 Testes de Performance

#### 5.2.1 Teste de Query com JOIN
```sql
EXPLAIN ANALYZE
SELECT 
  l.*,
  lc.*
FROM lotes l
JOIN lote_categorias lc ON l.id = lc.lote_id
WHERE l.fazenda_id = 'fazenda-id-teste';
```

#### 5.2.2 Teste da Função de Cálculo
```sql
-- Medir tempo de execução
EXPLAIN ANALYZE
SELECT update_dados_lotes();
```

### 5.3 Testes de UI

#### 5.3.1 Cenário 1: Criar Novo Lote com Múltiplas Categorias
1. Acessar página de Lotes
2. Clicar em "Novo Lote"
3. Preencher campos comuns
4. Adicionar categoria "vaca"
5. Preencher dados da categoria
6. Adicionar categoria "bezerro"
7. Preencher dados da categoria
8. Salvar
9. Verificar se ambos foram salvos corretamente

#### 5.3.2 Cenário 2: Editar Categoria Existente
1. Selecionar um lote existente
2. Clicar em "Editar"
3. Modificar dados de uma categoria
4. Verificar cálculos automáticos (peso_entrada_arrobas, periodo, etc.)
5. Salvar
6. Verificar se dados foram atualizados

#### 5.3.3 Cenário 3: Remover Categoria
1. Editar lote com múltiplas categorias
2. Clicar em "Remover" em uma categoria
3. Salvar
4. Verificar se categoria foi removida

#### 5.3.4 Cenário 4: Visualização em Cards
1. Carregar lista de lotes
2. Verificar se tabela de categorias está sendo exibida
3. Verificar se dados calculados estão corretos
4. Verificar formatação dos dados

---

## Fase 6: Rollback Plan

### 6.1 Rollback de Migração
```sql
-- Reverter migração em caso de problema
BEGIN;

-- Recriar colunas antigas em lotes
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS categorias TEXT[];
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS n_cabecas INTEGER;
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS peso_vivo_kg NUMERIC(10,2);
-- ... adicionar todas as colunas removidas

-- Migrar dados de volta (agregar por lote)
-- (Script complexo de agregação)

-- Remover tabela lote_categorias
DROP TABLE IF EXISTS lote_categorias;

COMMIT;
```

---

## Fase 7: Considerações Adicionais

### 7.1 Impacto em Outras Tabelas
- `lote_pasto_historico`: Não afetado (usa lote_id)
- Tabelas de registros (maternidade, pastagens, etc.): Não afetadas (usam lote_id)
- Futura tabela `animais`: Usará `lote_categoria_id` como FK

### 7.2 Excel Import/Export
- Atualizar template para incluir colunas por categoria
- Implementar lógica de parsing para múltiplas categorias por linha
- Considerar formato: "Categoria|Raca|Sexo|Idade|..."

### 7.3 Validações
- Garantir que pelo menos uma categoria seja adicionada
- Validar que categoria não seja duplicada no mesmo lote
- Validar campos obrigatórios por categoria

### 7.4 Permissões
- Aplicar RLS na tabela `lote_categorias`
- Criar políticas semelhantes às de `lotes`
- Grant de permissões para usuários

---

## Resumo de Execução

### Ordem de Execução:
1. ✅ Criar tabela `lote_categorias`
2. ✅ Migrar dados existentes
3. ✅ Remover colunas antigas de `lotes`
4. ✅ Atualizar função `update_dados_lotes`
5. ✅ Criar triggers para cálculos automáticos
6. ✅ Atualizar frontend (Lotes.tsx)
7. ✅ Testar migração e cálculos
8. ✅ Testar UI
9. ✅ Deploy

### Riscos Mitigados:
- **Perda de dados:** Migração com backup e rollback plan
- **Performance:** Índices apropriados e testes de query
- **UI:** Componentização reutilizável e testes de cenários
- **Consistência:** Triggers e validações no banco

### Próximos Passos:
- Implementar tabela de animais individuais
- Adicionar relatórios por categoria
- Implementar tracking de movimentação entre categorias
