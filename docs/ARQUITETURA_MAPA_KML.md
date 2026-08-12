# Arquitetura — Mapas KML, georreferenciamento e GPS offline

### Documento criado em 12/08/2026

> **Status:** decisão tomada, aguardando implementação. Este documento registra a arquitetura aprovada para o MVP de mapas com KML, edição de pastos no Painel Web e visualização offline com GPS no PWA.

## Contexto

O sistema não possui hoje nenhuma capacidade de mapa, KML, georreferenciamento ou GPS. O schema do Supabase é completamente não-espacial: `pastos` (1294 registros), `bebedouros` (501), `fazendas` (44), `modulos_pastos`, `setores`, `locais` não têm colunas de geometria. O PWA é offline-first com IndexedDB e Capacitor 8, mas não tem `@capacitor/geolocation` instalado. O Painel Web é React + TanStack Query, online.

A extensão PostGIS foi ativada no Supabase em 12/08/2026, habilitando `geometry` nativo com SRID 4326, índices GIST e queries espaciais (`ST_Contains`, `ST_Distance`, `ST_DWithin`, `ST_Intersects`).

O setor de projetos da empresa usa ArcGIS e tem mapas das fazendas com pastos delimitados, bebedouros e cochos. Esses mapas podem ser exportados como KML ou KMZ. Ortomosaicos de alta resolução existem apenas para poucas fazendas pequenas, insuficiente para satélite offline no PWA.

## Escopo do MVP

### Painel Web (edição)
- Importar KML e KMZ do ArcGIS/Google Earth e sobrepor ao mapa
- Desenhar e editar polígonos de pastos sobre o mapa
- Associar pastos desenhados a pastos cadastrados no banco (vínculo 1:1 via `pastos.id`)
- Clicar num pasto e ver detalhes (área, espécie, ocupação, lote atual, bebedouros associados), padrão AgroHUB
- Marcar bebedouros, cochos e estradas como geometrias no mapa

### PWA (visualização)
- Baixar o mapa da fazenda do usuário (uma fazenda por usuário, sem multi-tenancy)
- Fundo de satélite online (ESRI World Imagery, gratuito)
- Projetar a posição do usuário via GPS nativo do Capacitor
- Projetar os pastos da fazenda como polígonos sobre o mapa
- Selecionar um pasto-alvo e ver a distância até ele
- Funcionar offline para a funcionalidade core (polígonos, GPS, distância); o satélite exige conexão

### Fora do MVP (futuro aditivo, sem reescrita)
- Satélite offline no PWA via PMTiles (quando houver fonte de tiles viável)
- Routing pelas estradas marcadas (Dijkstra/A* com `ngraph.path` ou `turf.shortestPath`)
- Edição de geometrias no PWA (só no Painel Web no MVP)
- Terrain 3D e DEM
- Import de Shapefile (KML+KMZ cobre o MVP)
- Import de File Geodatabase (.gdb) do ArcGIS

## Decisões arquiteturais

### Biblioteca de mapa: MapLibre GL JS

Escolhida sobre Leaflet e Mapbox GL JS.

**MapLibre sobre Leaflet:** Leaflet é raster-first, o que torna tiles offline pesados (centenas de MB de PNG por fazenda). MapLibre é vetorial, mesma engine do Mapbox GL, e o caminho para PMTiles offline no futuro é adicionar um tile source, não reescrever a camada de renderização. `leaflet-draw` está sem manutenção ativa; `leaflet-geoman` é pago para uso comercial.

**MapLibre sobre Mapbox GL JS:** MapLibre é fork open-source do Mapbox GL, mesma engine de renderização, sem token, sem custo, sem vendor lock-in. A API é compatível, então migração para Mapbox no futuro (se tiles premium ou routing API justificarem) é trocar o construtor, não reescrever a aplicação.

**Wrapper React:** `vis.gl/react-map-gl`, que suporta MapLibre e Mapbox na mesma API.

**Desenho de geometrias:** `@mapbox/mapbox-gl-draw`, compatível com MapLibre, é a lib de drawing mais madura do ecossistema GL.

### Tiles de fundo

**Painel Web:** ESRI World Imagery via source raster do MapLibre. Gratuito para uso online, boa cobertura rural no Brasil, sem token.

**PWA (MVP):** ESRI World Imagery online. Quando o MapLibre não consegue carregar tiles (sem conexão), o mapa mostra fundo neutro (verde acinzentado) com aviso visual discreto: "Sem conexão: mostrando delimitações e sua posição. O fundo de satélite voltará quando houver sinal." Os polígonos, GPS e distância continuam funcionando, porque são dados locais e compute local.

**PWA (futuro, satélite offline):** PMTiles em OPFS (Origin Private File System), lido pelo MapLibre via protocolo `pmtiles://`. Plugin `makinacorpus/maplibre-offline-pmtiles` gerencia download e armazenamento. Recomendação de tamanho: 10-100MB por fazenda, zoom levels 12-16. Fonte dos tiles a definir quando o MVP validar: ortomosaicos próprios do setor de projetos (ideal, sem custo, melhor qualidade) para as fazendas que têm, ou Mapbox Satellite com offline tiles (pago, licenciamento correto) como fallback.

**Por que não ESRI offline:** os termos do "World Imagery (for Export)" destinam os tiles exportados "ao uso apenas dentro do ArcGIS". Baixar tiles ESRI para uso offline num app MapLibre próprio é violação de termos.

### Formato: KML/KMZ como entrada, GeoJSON como intercâmbio, PostGIS como armazenamento

**Armazenamento:** PostGIS `geometry(*,4326)`. Nativo, indexável com GIST, suporta queries espaciais.

**API interna:** GeoJSON. Toda query do frontend usa `ST_AsGeoJSON(geometria)` e recebe GeoJSON pronto para renderizar. Nenhuma lib de mapa precisa de conversão.

**Importação:** KML e KMZ. KMZ é ZIP contendo KML; deszipar com `fflate` (8KB, sem dependência) e rodar `@tmcw/togeojson` no KML extraído. Uma função `importarKmlOuKmz(file)` detecta pelo MIME type ou extensão.

**Exportação (futuro):** `@tmcw/tokml` para gerar KML a partir de GeoJSON quando precisar.

### Parser de KML/KMZ

- `fflate`: deszipar KMZ (lib JS pura, 8KB)
- `@tmcw/togeojson`: KML → GeoJSON (sem dependência, mantida)
- `@tmcw/tokml`: GeoJSON → KML para export (futuro)

### GPS no PWA

`@capacitor/geolocation` para `getCurrentPosition` e `watchPosition` (streaming contínuo). Plugin nativo do Capacitor 8, funciona em Android e iOS. Para PWA web sem Capacitor, a Web Geolocation API (`navigator.geolocation`) funciona mas é menos precisa em background.

### Distância até pasto-alvo

`turf.js` rodando no celular, sem rede:
- `turf.distance`: distância em linha reta do GPS atual ao centroide do pasto-alvo
- `turf.pointToPolygonDistance`: distância do GPS atual à borda do polígono do pasto

### Routing (futuro, registrado para não bloquear a arquitetura)

As `mapa_estradas` já são LineStrings no PostGIS. Para routing offline no PWA: construir grafo com `ngraph.path` a partir das LineStrings (nós nas interseções, arestas com peso por distância) e rodar Dijkstra/A* no celular. `turf.js` também tem `turf.shortestPath` mas é mais limitado. A qualidade da rota depende da conectividade do grafo, que é problema de edição (garantir que estradas se conectam nos nós), não de ferramenta.

## Modelo de dados

### Princípio

Geometria é um atributo da entidade, não uma entidade separada. Se a entidade já tem tabela, a geometria é uma coluna nela. Se não tem tabela, cria tabela nova.

### Colunas novas em tabelas existentes (relação 1:1 natural)

| Tabela | Coluna | Tipo PostGIS | Observações |
|---|---|---|---|
| `pastos` | `geometria` | `geometry(Polygon,4326)` | Nullable. 1294 registros existentes começam com NULL, populados conforme o usuário desenha ou importa. |
| `bebedouros` | `geometria` | `geometry(Point,4326)` | Nullable. 501 registros existentes começam com NULL. |
| `fazendas` | `bounding_box` | `geometry(Polygon,4326)` | Nullable. Perímetro da fazenda. Essencial para definir a área de download de tiles no futuro. |

### Tabelas novas (para o que não tem casa)

| Tabela | Colunas | Observações |
|---|---|---|
| `mapa_estradas` | `id, fazenda_id, nome, geometria geometry(LineString,4326), ativo, created_at, updated_at` | Estradas não existem como entidade hoje. Necessárias para routing no futuro. |
| `mapa_pontos` | `id, fazenda_id, tipo, nome, geometria geometry(Point,4326), ativo, created_at, updated_at` | Pontos de interesse sem tabela própria: cochos individuais, portões, currais de manejo, saleiros. `tipo` é text livre (`'cocho'`, `'portao'`, `'saleiro'`). |

### Por que não tabela `mapa_elementos` genérica

A tentação de centralizar tudo numa tabela com `tipo='pasto'|'bebedouro'|'estrada'` parece limpa mas quebra em três pontos:

1. `pastos` e `bebedouros` já têm dezenas de colunas de atributos e relacionamentos (lotes, planos nutricionais, histórico de limpeza). Duplicar isso numa tabela genérica ou forçar join sempre que clica no pasto é retrocesso.
2. O constraint de tipo de geometria do PostGIS é por coluna: `geometry(Polygon,4326)` rejeita LineString na inserção, mas `geometry(Geometry,4326)` genérico aceita qualquer coisa e perde a validação.
3. A RLS que o sistema inteiro usa é `WHERE fazenda_id IN (SELECT ... FROM usuario_fazenda ...)` por tabela. Manter o padrão por tabela é mais simples que uma policy genérica com filtro por `tipo`.

### Por que não tabela `mapa_pastos` separada de `pastos`

O `cadastroCache` do PWA já baixa `pastos` e `bebedouros` hoje. Adicionar `geometria` nessas queries é zero infraestrutura nova: o mesmo SELECT que já roda ganha uma coluna, o IndexedDB armazena junto, o PWA renderiza. Se a geometria vivesse numa tabela separada, seria um novo item de cache, nova lógica de sync, nova lógica de merge entre geometria e atributos. A feature de "clicar no pasto e ver detalhes" precisa da geometria e dos atributos juntos; se estão na mesma linha, é uma query; se estão em tabelas separadas, é um join sempre.

### Índices e constraints

Cada coluna de geometria precisa de índice GIST para que `ST_Contains`, `ST_DWithin` e `ST_Distance` sejam rápidos:

```sql
CREATE INDEX pastos_geometria_gist ON pastos USING GIST(geometria);
CREATE INDEX bebedouros_geometria_gist ON bebedouros USING GIST(geometria);
CREATE INDEX fazendas_bounding_box_gist ON fazendas USING GIST(bounding_box);
CREATE INDEX mapa_estradas_geometria_gist ON mapa_estradas USING GIST(geometria);
CREATE INDEX mapa_pontos_geometria_gist ON mapa_pontos USING GIST(geometria);
```

As colunas em `pastos` e `bebedouros` são nullable: os registros existentes começam com `geometria=NULL` e são populados conforme o usuário desenha ou importa. Sem backfill obrigatório, sem migração de dados.

### RLS

Seguir o mesmo padrão do resto do sistema: `WHERE fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id = uf.usuario_id WHERE u.auth_id = auth.uid() AND uf.ativo = true)`.

Para `pastos` e `bebedouros`, as policies existentes já filtram por `fazenda_id`; a nova coluna `geometria` é coberta pela mesma policy sem mudança.

Para `mapa_estradas` e `mapa_pontos`, criar policies novas seguindo o padrão.

### Sobre cochos especificamente

Hoje cocho é um atributo de pasto (`metragem_cocho_m`, metros lineares). O ArcGIS traz cochos como pontos individuais. Para o MVP, esses pontos vão em `mapa_pontos` com `tipo='cocho'`. Se no futuro cochos virarem entidades de primeira classe com atributos próprios (capacidade, modelo, data de instalação), promove para tabela dedicada. Não vale criar `cochos` agora sem saber se o negócio precisa.

## Stack de dependências

### Painel Web (`GestaUp-Cadernetas-Gestao`)

| Lib | Função | Custo |
|---|---|---|
| `maplibre-gl` | Engine de mapa vetorial | Gratuito, sem token |
| `vis.gl/react-map-gl` | Wrapper React para MapLibre/Mapbox | Gratuito |
| `@mapbox/mapbox-gl-draw` | Desenho e edição de polígonos/pontos/linhas | Gratuito, compatível com MapLibre |
| `@tmcw/togeojson` | KML → GeoJSON | Gratuito, sem dependência |
| `@tmcw/tokml` | GeoJSON → KML (export, futuro) | Gratuito |
| `fflate` | Deszipar KMZ | Gratuito, 8KB |

Tiles de fundo: ESRI World Imagery (raster source, gratuito, sem token).

### PWA (`Caderneta-Digital-Gesta-Up`)

| Lib | Função | Custo |
|---|---|---|
| `maplibre-gl` | Engine de mapa vetorial | Gratuito, sem token |
| `vis.gl/react-map-gl` | Wrapper React | Gratuito |
| `@capacitor/geolocation` | GPS nativo (Android/iOS) | Gratuito, plugin Capacitor 8 |
| `turf.js` | Distância e operações geoespaciais client-side | Gratuito |

Tiles de fundo: ESRI World Imagery online (raster source, gratuito). Fallback gracioso offline com aviso visual e fundo neutro.

GeoJSON dos pastos/bebedouros/estradas cacheado no IndexedDB via `cadastroCache.ts` (mesmo padrão existente para outros cadastros).

## Arquitetura offline do PWA

O PWA já tem uma arquitetura offline madura que a feature de mapa reaproveita:

- **IndexedDB** via `idb` (store `cadernetas-digitais`, v22) é a fonte de verdade local. `cadastroCache.ts` baixa e persiste cadastros (pastos, lotes, bebedouros, raças) e refresha via Background Sync.
- **Service Worker custom** (`sw.ts`, `injectManifest` do vite-plugin-pwa com Workbox): precache de assets, `NetworkFirst` para navegação com fallback, `CacheFirst` para fontes/imagens, Background Sync para `sync-registros` e `refresh-cadastro-cache`.
- **Capacitor 8** instalado com `app`, `browser`, `haptics`, `network`, `preferences`, `splash-screen`. `@capacitor/geolocation` será adicionado.

O GeoJSON das geometrias entra como mais um item de cadastro cacheado em `cadastroCache.ts`. Uma query `SELECT id, nome, ST_AsGeoJSON(geometria) as geometria FROM pastos WHERE fazenda_id = $1` retorna o que o PWA precisa renderizar. O peão loga com o `acesso_id` da fazenda dele, o cache baixa só os dados dessa fazenda. Sem multi-tenancy, sem download incremental: é um payload único por fazenda, e como são só GeoJSON dos pastos (sem tiles), o tamanho é pequeno (uma fazenda com 100 pastos e polígonos de 50 vértices cada fica em torno de 200-500KB de GeoJSON, trivial para o IndexedDB).

## Fluxo de dados

### Painel Web: importar KML/KMZ

1. Usuário arrasta `.kml` ou `.kmz` para o mapa
2. Se KMZ, deszipar com `fflate`, extrair `doc.kml`
3. `@tmcw/togeojson` converte KML → GeoJSON
4. GeoJSON renderizado no MapLibre como camada temporária
5. Usuário associa cada polígono importado a um `pastos.id` existente (ou cria novo pasto)
6. Ao salvar, `UPDATE pastos SET geometria = ST_GeomFromGeoJSON($1) WHERE id = $2`

### Painel Web: desenhar pasto

1. Usuário clica em "Desenhar pasto" no `mapbox-gl-draw`
2. Desenha polígono no mapa sobre o satélite ESRI
3. Ao terminar, seleciona qual `pastos.id` aquele polígono representa
4. Salva: `UPDATE pastos SET geometria = ST_GeomFromGeoJSON($1) WHERE id = $2`

### Painel Web: clicar em pasto e ver detalhes

1. Click no polígono dispara `queryRenderedFeatures` no MapLibre
2. Pega o `pastos.id` da feature
3. Query `SELECT * FROM pastos WHERE id = $1` + joins com lotes, bebedouros, etc.
4. Side panel mostra detalhes (área, espécie, ocupação, lote atual, bebedouros associados)

### PWA: baixar mapa da fazenda

1. Peão loga com `acesso_id` da fazenda
2. `cadastroCache` baixa `SELECT id, nome, ST_AsGeoJSON(geometria) as geometria FROM pastos WHERE fazenda_id = $1 AND geometria IS NOT NULL`
3. Mesmo para `bebedouros`, `mapa_estradas`, `mapa_pontos`
4. GeoJSON armazenado no IndexedDB

### PWA: mostrar mapa com GPS

1. Tela "Mapa da Fazenda" abre MapLibre
2. Source raster ESRI World Imagery (online)
3. Source GeoJSON dos pastos/bebedouros/estradas (do IndexedDB, offline)
4. `@capacitor/geolocation` `watchPosition` atualiza posição do usuário no mapa
5. Usuário seleciona um pasto-alvo na lista
6. `turf.distance(gpsAtual, centroidePasto)` calcula distância em linha reta
7. `turf.pointToPolygonDistance(gpsAtual, poligonoPasto)` calcula distância à borda
8. Distância destacada na tela

### PWA: sem conexão

1. MapLibre tenta carregar tiles ESRI, falha
2. Evento `error` no source dispara aviso visual: "Sem conexão: mostrando delimitações e sua posição. O fundo de satélite voltará quando houver sinal."
3. Fundo do mapa fica verde acinzentado (configurado no estilo do MapLibre)
4. Polígonos, GPS e distância continuam funcionando (dados locais + compute local)

## Caminho de evolução (sem reescrita)

| Evolução | O que muda | Esforço |
|---|---|---|
| Satélite offline no PWA | Adicionar source PMTiles local ao lado do source ESRI online | Adição de source, sem tocar na camada de polígonos/GPS/distância |
| Routing pelas estradas | Construir grafo de `mapa_estradas` com `ngraph.path`, rodar Dijkstra/A* no celular | Nova função, sem tocar no mapa existente |
| 3D e terrain | Adicionar source DEM ao MapLibre | Adição de source |
| Migração para Mapbox | Trocar `new maplibregl.Map()` por `new mapboxgl.Map()` + token | Troca de construtor, `react-map-gl` suporta ambos |
| Import de Shapefile | Adicionar `shpjs` ao pipeline de import | Nova função de import, sem tocar no resto |

## Pontos de atenção para a implementação

1. **Separação de camadas no MapLibre**: o source de satélite deve ser uma camada separada dos sources de GeoJSON dos pastos. Quando o dia chegar de adicionar PMTiles offline, é trocar o source raster online por um source PMTiles local, sem tocar na camada de polígonos, GPS ou distância. Se o código misturar as camadas, a migração vira refactor.

2. **Fallback gracioso offline**: configurar a cor de background do mapa para um tom de verde acinzentado que não brilhe, para que os polígonos se destaquem mesmo sem o satélite por trás. O aviso visual deve ser discreto, não modal.

3. **Validação de geometria**: ao importar KML, validar que os polígonos são válidos (sem self-intersections) com `ST_IsValid` antes de salvar. Se inválido, usar `ST_MakeValid` ou avisar o usuário.

4. **SRID consistente**: todas as geometrias usam SRID 4326 (WGS84, padrão GPS). KML do Google Earth e export do ArcGIS já são 4326. Se receber dado em outro SRID, converter com `ST_Transform` antes de salvar.

5. **Associação pasto desenhado ↔ pasto cadastrado**: a geometria vive na tabela `pastos`, então o vínculo é natural (1:1). Um pasto só pode ter uma geometria. Se o usuário desenhar dois polígonos para o mesmo pasto, precisa decidir se junta (MultiPolygon) ou se cria dois pastos separados. Para o MVP, um polígono por pasto.

6. **Performance do `cadastroCache`**: a query de geometrias deve ser filtrada por `geometria IS NOT NULL` para não trazer pastos sem geometria (a maioria dos 1294 atuais). O payload do cache só cresce conforme o usuário associa geometrias.

7. **Atualização do `cadastroCache`**: quando o Painel Web salva uma nova geometria, o PWA precisa saber que há atualização. O mecanismo de Background Sync existente (`refresh-cadastro-cache`) já cuida disso, mas a versão do cache precisa ser incrementada para forçar refresh quando o schema mudar.

8. **PostGIS extension**: já ativa no Supabase desde 12/08/2026. Verificar com `SELECT postgis_full_version()` se precisar confirmar.

## Decisões registradas e não reconsideradas

- **MapLibre GL JS** sobre Leaflet e Mapbox GL JS (escala melhor para offline vetorial no futuro, sem custo, sem lock-in)
- **PostGIS `geometry` nativo** sobre `jsonb` com GeoJSON (queries espaciais nativas, validação de tipo por coluna, índices GIST)
- **Colunas em tabelas existentes** (`pastos.geometria`, `bebedouros.geometria`, `fazendas.bounding_box`) sobre tabela `mapa_elementos` genérica (vínculo 1:1 natural, zero infra nova no `cadastroCache`, sem join sempre que clica no pasto)
- **Tabelas novas `mapa_estradas` e `mapa_pontos`** só para o que não tem casa (estradas e pontos de interesse sem tabela própria)
- **KML+KMZ no MVP**, Shapefile depois (KML/KMZ cobre o que vem do Google Earth e do ArcGIS via export)
- **Satélite online no MVP** via ESRI World Imagery gratuito, com fallback gracioso offline (sem custo, sem violação de licenciamento)
- **Satélite offline no futuro** via PMTiles, fonte a definir (ortomosaicos próprios ideal, Mapbox pago como fallback)
- **`turf.js` para distância** no PWA (rodando no celular, sem rede)
- **`@capacitor/geolocation` para GPS** (nativo, mais preciso que Web Geolocation API)
