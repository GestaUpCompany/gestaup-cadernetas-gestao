import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map, MapRef, Source, Layer, Popup } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { TerraDraw, TerraDrawPolygonMode, TerraDrawPointMode, TerraDrawLineStringMode, TerraDrawSelectMode, TerraDrawRenderMode } from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'
import { kml } from '@tmcw/togeojson'
import { strFromU8, unzipSync } from 'fflate'
import { supabase } from '../../services/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { getFazendaIdForUser } from '../../utils/fazendaContext'
import { Button, Card, Modal, Select } from '../../components/ui'

// Tipos
interface PastoMapa {
  id: string
  nome: string
  setor?: string | null
  tipo?: string | null
  area_total_ha?: number | null
  area_util_ha?: number | null
  especie?: string | null
  ativo: boolean
  geometria_geojson?: GeoJSON.FeatureCollection | null
  // detalhes extras para o side panel
  metragem_cocho_m?: number | null
  possui_deposito?: boolean | null
  fonte_agua_principal?: string | null
  modulo_nome?: string | null
}

interface BebedouroMapa {
  id: string
  nome: string
  capacidade?: number | null
  geometria_geojson?: GeoJSON.FeatureCollection | null
}

interface EstradaMapa {
  id: string
  nome: string
  geometria_geojson?: GeoJSON.FeatureCollection | null
}

interface PontoMapa {
  id: string
  tipo: string
  nome: string
  geometria_geojson?: GeoJSON.FeatureCollection | null
}

// Tipos de pontos de interesse com cor e ícone
const TIPOS_PONTO: { value: string; label: string; cor: string; icone: string }[] = [
  { value: 'fabrica', label: 'Fábrica de Ração', cor: '#7c3aed', icone: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5' },
  { value: 'curral', label: 'Curral', cor: '#dc2626', icone: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
  { value: 'portao', label: 'Portão', cor: '#0891b2', icone: 'M4 4v16M20 4v16M4 12h16' },
  { value: 'saleiro', label: 'Saleiro', cor: '#ca8a04', icone: 'M12 2C8 2 5 5 5 9c0 3 4 8 7 13 3-5 7-10 7-13 0-4-3-7-7-7z' },
  { value: 'cocho', label: 'Cocho', cor: '#16a34a', icone: 'M4 6h16M4 6l2 12h12l2-12' },
  { value: 'outro', label: 'Outro', cor: '#6b7280', icone: 'M12 2a8 8 0 100 16 8 8 0 000-16z' },
]

function corPonto(tipo: string): string {
  return TIPOS_PONTO.find((t) => t.value === tipo)?.cor ?? '#6b7280'
}

function labelPonto(tipo: string): string {
  return TIPOS_PONTO.find((t) => t.value === tipo)?.label ?? tipo
}

interface PastoDetalhe extends PastoMapa {
  bebedouros: { id: string; nome: string }[]
  lote_atual?: {
    id: string
    nome: string
    n_cabecas: number
    raca?: string | null
    sexo?: string | null
    peso_medio_atual_kg?: number | null
  } | null
}

// Config ESRI World Imagery (raster, gratuito, sem token)
const esriWorldImagery: maplibregl.RasterSourceSpecification = {
  type: 'raster',
  tiles: [
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  ],
  tileSize: 256,
  attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
  maxzoom: 19,
}

// Persistência de posição/zoom do mapa no localStorage
const MAP_VIEW_KEY = 'mapaFazendaView'
const DEFAULT_VIEW = { longitude: -55.0, latitude: -13.0, zoom: 8 }

function loadSavedView(): { longitude: number; latitude: number; zoom: number } {
  try {
    const raw = localStorage.getItem(MAP_VIEW_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (
        typeof parsed.longitude === 'number' &&
        typeof parsed.latitude === 'number' &&
        typeof parsed.zoom === 'number'
      ) {
        return parsed
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_VIEW
}

function saveView(lng: number, lat: number, zoom: number) {
  try {
    localStorage.setItem(MAP_VIEW_KEY, JSON.stringify({ longitude: lng, latitude: lat, zoom }))
  } catch {
    // ignore
  }
}

const esriLabels: maplibregl.RasterSourceSpecification = {
  type: 'raster',
  tiles: [
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  ],
  tileSize: 256,
  maxzoom: 19,
}

// Estilo do mapa: fundo verde acinzentado para fallback offline gracioso
const mapStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    esri: esriWorldImagery,
    'esri-labels': esriLabels,
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#3a4a3a',
      },
    },
    {
      id: 'esri-satellite',
      type: 'raster',
      source: 'esri',
      paint: {},
    },
    {
      id: 'esri-labels',
      type: 'raster',
      source: 'esri-labels',
      paint: {
        'raster-opacity': 0.8,
      },
    },
  ],
}

// Gerar círculo de precisão como polígono (aproximação esférica)
// Retorna array de coordenadas [lng, lat] formando um anel
// Calcular centróide verdadeiro de um polígono (ponderado por área)
// Fórmula: Cx = (1/6A) * Σ(xi + xi+1)(xi*yi+1 - xi+1*yi)
//          Cy = (1/6A) * Σ(yi + yi+1)(xi*yi+1 - xi+1*yi)
//          A  = (1/2) * Σ(xi*yi+1 - xi+1*yi)
function calcularCentroidePoligono(coords: [number, number][]): [number, number] {
  let area = 0
  let cx = 0
  let cy = 0

  for (let i = 0; i < coords.length - 1; i++) {
    const [x0, y0] = coords[i]
    const [x1, y1] = coords[i + 1]
    const cross = x0 * y1 - x1 * y0
    area += cross
    cx += (x0 + x1) * cross
    cy += (y0 + y1) * cross
  }

  area *= 0.5
  if (area === 0) {
    // Polígono degenerado: fallback para média dos vértices
    let lx = 0, ly = 0
    coords.forEach((c) => { lx += c[0]; ly += c[1] })
    return [lx / coords.length, ly / coords.length]
  }

  cx = cx / (6 * area)
  cy = cy / (6 * area)
  return [cx, cy]
}

// Testar se um ponto está dentro de um polígono (ray casting)
function pontoDentroPoligono(lng: number, lat: number, coords: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0], yi = coords[i][1]
    const xj = coords[j][0], yj = coords[j][1]
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// Calcular o melhor ponto para o label do pasto:
// 1. Tenta o centróide verdadeiro (ponderado por área)
// 2. Se cair fora do polígono, usa o centro do bounding box
// 3. Se também cair fora, faz uma busca em grade do bounding box
function calcularMelhorLabel(coords: [number, number][]): [number, number] {
  // 1. Centróide verdadeiro
  const [cx, cy] = calcularCentroidePoligono(coords)
  if (pontoDentroPoligono(cx, cy, coords)) {
    return [cx, cy]
  }

  // 2. Centro do bounding box
  const lngs = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const bboxCx = (minLng + maxLng) / 2
  const bboxCy = (minLat + maxLat) / 2
  if (pontoDentroPoligono(bboxCx, bboxCy, coords)) {
    return [bboxCx, bboxCy]
  }

  // 3. Busca em grade dentro do bounding box
  const steps = 20
  for (let i = 1; i < steps; i++) {
    for (let j = 1; j < steps; j++) {
      const x = minLng + (maxLng - minLng) * (i / steps)
      const y = minLat + (maxLat - minLat) * (j / steps)
      if (pontoDentroPoligono(x, y, coords)) {
        return [x, y]
      }
    }
  }

  // Fallback final: centróide mesmo que fora do polígono
  return [cx, cy]
}

function gerarCirculoPrecisao(lng: number, lat: number, raioMetros: number): [number, number][] {
  const coords: [number, number][] = []
  const numPontos = 64
  const raioKm = raioMetros / 1000
  const latRad = (lat * Math.PI) / 180

  for (let i = 0; i <= numPontos; i++) {
    const angulo = (i * 2 * Math.PI) / numPontos
    // Aproximação esférica para distâncias curtas
    const deltaLat = (raioKm * Math.cos(angulo)) / 111.32
    const deltaLng = (raioKm * Math.sin(angulo)) / (111.32 * Math.cos(latRad))
    coords.push([lng + deltaLng, lat + deltaLat])
  }

  return coords
}

// Estilos de desenho para Terra Draw
const terraDrawStyles = {
  polygon: {
    fillColor: '#22c55e',
    outlineColor: '#16a34a',
    outlineWidth: 2,
    fillOpacity: 0.3,
  },
  point: {
    pointColor: '#3b82f6',
    pointWidth: 8,
    pointOutlineColor: '#ffffff',
    pointOutlineWidth: 2,
    pointOutlineOpacity: 1,
    pointOpacity: 1,
  },
}

export function MapaFazenda() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const mapRef = useRef<MapRef>(null)
  const drawRef = useRef<TerraDraw | null>(null)

  const [fazendaId, setFazendaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pastos, setPastos] = useState<PastoMapa[]>([])
  const [bebedouros, setBebedouros] = useState<BebedouroMapa[]>([])
  const [estradas, setEstradas] = useState<EstradaMapa[]>([])
  const [pontos, setPontos] = useState<PontoMapa[]>([])
  const [pastoDetalhe, setPastoDetalhe] = useState<PastoDetalhe | null>(null)
  const [popup, setPopup] = useState<{ lng: number; lat: number; nome: string } | null>(null)
  const [popupBebedouro, setPopupBebedouro] = useState<{ lng: number; lat: number; id: string; nome: string } | null>(null)
  const [drawMode, setDrawMode] = useState<string | null>(null)
  const drawModeRef = useRef<string | null>(null)
  useEffect(() => { drawModeRef.current = drawMode }, [drawMode])
  const [showAssocModal, setShowAssocModal] = useState(false)
  const [modoSelecaoMultipla, setModoSelecaoMultipla] = useState(false)
  const [modoTelaCheia, setModoTelaCheia] = useState(false)
  const [showEstradaModal, setShowEstradaModal] = useState(false)
  const [nomeEstrada, setNomeEstrada] = useState('')
  const [estradaDesenhada, setEstradaDesenhada] = useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null)
  const [estradaDetalhe, setEstradaDetalhe] = useState<EstradaMapa | null>(null)
  const [visCamadas, setVisCamadas] = useState({ pastos: true, bebedouros: true, estradas: true, pontos: true })
  const [showPontoModal, setShowPontoModal] = useState(false)
  const [pontoDesenhado, setPontoDesenhado] = useState<GeoJSON.Feature<GeoJSON.Point> | null>(null)
  const [tipoPontoSelecionado, setTipoPontoSelecionado] = useState('fabrica')
  const [nomePonto, setNomePonto] = useState('')
  const [pontoDetalhe, setPontoDetalhe] = useState<PontoMapa | null>(null)
  const [pastosSelecionados, setPastosSelecionados] = useState<Set<string>>(new Set())
  const [showRemocaoLoteModal, setShowRemocaoLoteModal] = useState(false)
  const [removerBebedourosLote, setRemoverBebedourosLote] = useState(false)
  const [removendoLote, setRemovendoLote] = useState(false)
  const [editandoGeometria, setEditandoGeometria] = useState<{ pastoId: string; pastoNome: string; featureId: string } | null>(null)
  const [editandoEstrada, setEditandoEstrada] = useState<{ estradaId: string; estradaNome: string; featureId: string } | null>(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [featureDesenhada, setFeatureDesenhada] = useState<GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.Point | GeoJSON.LineString> | null>(null)
  const [pastoSelecionadoAssoc, setPastoSelecionadoAssoc] = useState<string>('')
  const [pastoDetectado, setPastoDetectado] = useState<{ id: string; nome: string } | null>(null)
  const [bebedourosDoPasto, setBebedourosDoPasto] = useState<{ id: string; nome: string }[]>([])
  const [buscandoPasto, setBuscandoPasto] = useState(false)
  const [pastosSemGeometria, setPastosSemGeometria] = useState<{ id: string; nome: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)

  // Auto-dismiss do importStatus após 10 segundos
  useEffect(() => {
    if (!importStatus) return
    const t = setTimeout(() => setImportStatus(null), 10000)
    return () => clearTimeout(t)
  }, [importStatus])
  const [featuresImportadas, setFeaturesImportadas] = useState<GeoJSON.FeatureCollection | null>(null)
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number; accuracy: number } | null>(null)
  const [localizando, setLocalizando] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const fazendaIdRef = useRef<string | null>(null)
  const bebedourosRef = useRef<BebedouroMapa[]>([])
  const editandoGeometriaRef = useRef<{ pastoId: string; pastoNome: string; featureId: string } | null>(null)

  // Manter refs sincronizadas com estado
  useEffect(() => { fazendaIdRef.current = fazendaId }, [fazendaId])
  useEffect(() => { bebedourosRef.current = bebedouros }, [bebedouros])
  useEffect(() => { editandoGeometriaRef.current = editandoGeometria }, [editandoGeometria])

  const editandoEstradaRef = useRef<{ estradaId: string; estradaNome: string; featureId: string } | null>(null)
  useEffect(() => { editandoEstradaRef.current = editandoEstrada }, [editandoEstrada])

  // Esc sai do modo tela cheia
  useEffect(() => {
    if (!modoTelaCheia) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModoTelaCheia(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [modoTelaCheia])

  // Redimensionar mapa ao entrar/sair do modo tela cheia
  useEffect(() => {
    const t = setTimeout(() => {
      const map = mapRef.current?.getMap()
      if (map) map.resize()
    }, 100)
    return () => clearTimeout(t)
  }, [modoTelaCheia])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ==================== Carregar dados ====================
  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const fid = await getFazendaIdForUser(user.id)
    if (!fid) {
      setLoading(false)
      return
    }
    setFazendaId(fid)

    // Buscar pastos com geometria (ST_AsGeoJSON) e sem geometria (para o modal de associação)
    // e bebedouros com geometria (para renderizar no mapa)
    const [pastosComGeo, pastosSemGeo, bebedourosComGeo, estradasRes, pontosRes] = await Promise.all([
      supabase.rpc('get_pastos_com_geometria', { p_fazenda_id: fid }),
      supabase
        .from('pastos')
        .select('id, nome')
        .eq('fazenda_id', fid)
        .is('geometria', null)
        .is('deleted_at', null)
        .order('nome'),
      supabase.rpc('get_bebedouros_com_geometria', { p_fazenda_id: fid }),
      supabase
        .from('mapa_estradas')
        .select('id, nome, geometria')
        .eq('fazenda_id', fid)
        .eq('ativo', true)
        .order('nome'),
      supabase
        .from('mapa_pontos')
        .select('id, tipo, nome, geometria')
        .eq('fazenda_id', fid)
        .eq('ativo', true)
        .order('nome'),
    ])

    if (pastosComGeo.data) {
      const pastosParsed: PastoMapa[] = (pastosComGeo.data as any[]).map((p) => ({
        id: p.id,
        nome: p.nome,
        setor: p.setor,
        tipo: p.tipo,
        area_total_ha: p.area_total_ha,
        area_util_ha: p.area_util_ha,
        especie: p.especie,
        ativo: p.ativo,
        metragem_cocho_m: p.metragem_cocho_m,
        possui_deposito: p.possui_deposito,
        fonte_agua_principal: p.fonte_agua_principal,
        modulo_nome: p.modulo_nome,
        geometria_geojson: p.geometria_geojson
          ? ({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: { id: p.id, nome: p.nome },
                  geometry: typeof p.geometria_geojson === 'string' ? JSON.parse(p.geometria_geojson) : p.geometria_geojson,
                },
              ],
            } as GeoJSON.FeatureCollection)
          : null,
      }))
      setPastos(pastosParsed)
    }

    if (pastosSemGeo.data) {
      setPastosSemGeometria(pastosSemGeo.data as { id: string; nome: string }[])
    }

    if (bebedourosComGeo.data) {
      const bebedourosParsed: BebedouroMapa[] = (bebedourosComGeo.data as any[]).map((b) => ({
        id: b.id,
        nome: b.nome,
        capacidade: b.capacidade,
        geometria_geojson: b.geometria_geojson
          ? ({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: { id: b.id, nome: b.nome },
                  geometry: typeof b.geometria_geojson === 'string' ? JSON.parse(b.geometria_geojson) : b.geometria_geojson,
                },
              ],
            } as GeoJSON.FeatureCollection)
          : null,
      }))
      setBebedouros(bebedourosParsed)
    }

    if (estradasRes.data) {
      const estradasParsed: EstradaMapa[] = (estradasRes.data as any[]).map((e) => ({
        id: e.id,
        nome: e.nome,
        geometria_geojson: e.geometria
          ? ({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: { id: e.id, nome: e.nome },
                  geometry: typeof e.geometria === 'string' ? JSON.parse(e.geometria) : e.geometria,
                },
              ],
            } as GeoJSON.FeatureCollection)
          : null,
      }))
      setEstradas(estradasParsed)
    }

    if (pontosRes.data) {
      const pontosParsed: PontoMapa[] = (pontosRes.data as any[]).map((p) => ({
        id: p.id,
        tipo: p.tipo,
        nome: p.nome,
        geometria_geojson: p.geometria
          ? ({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: { id: p.id, tipo: p.tipo, nome: p.nome },
                  geometry: typeof p.geometria === 'string' ? JSON.parse(p.geometria) : p.geometria,
                },
              ],
            } as GeoJSON.FeatureCollection)
          : null,
      }))
      setPontos(pontosParsed)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ==================== GeoJSON sources ====================
  const pastosGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = []
    pastos.forEach((p) => {
      if (p.geometria_geojson?.features?.[0]) {
        features.push(p.geometria_geojson.features[0])
      }
    })
    return { type: 'FeatureCollection', features }
  }, [pastos])

  // GeoJSON de labels (centróide de cada pasto com nome e áreas)
  const pastosLabelsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = []
    pastos.forEach((p) => {
      if (p.geometria_geojson?.features?.[0]?.geometry?.type === 'Polygon') {
        const coords = p.geometria_geojson.features[0].geometry.coordinates[0] as [number, number][]
        // Calcular o melhor ponto para o label (centróide verdadeiro, com fallback se cair fora)
        const [lng, lat] = calcularMelhorLabel(coords)

        const areaTotal = p.area_total_ha != null ? `${p.area_total_ha} ha` : ''
        const areaUtil = p.area_util_ha != null ? `${p.area_util_ha} ha` : ''
        const sublabel = [areaTotal, areaUtil].filter(Boolean).join(' · ')

        features.push({
          type: 'Feature',
          properties: {
            id: p.id,
            nome: p.nome,
            sublabel,
          },
          geometry: { type: 'Point', coordinates: [lng, lat] },
        })
      }
    })
    return { type: 'FeatureCollection', features }
  }, [pastos])

  // GeoJSON dos pastos selecionados (para highlight visual)
  const pastosSelecionadosGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = []
    pastos.forEach((p) => {
      if (p.geometria_geojson?.features?.[0] && pastosSelecionados.has(p.id)) {
        features.push(p.geometria_geojson.features[0])
      }
    })
    return { type: 'FeatureCollection', features }
  }, [pastos, pastosSelecionados])

  // Highlight do pasto em detalhe (painel aberto)
  const pastoDetalheGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!pastoDetalhe) return { type: 'FeatureCollection', features: [] }
    const pasto = pastos.find((p) => p.id === pastoDetalhe.id)
    if (!pasto?.geometria_geojson?.features?.[0]) return { type: 'FeatureCollection', features: [] }
    return { type: 'FeatureCollection', features: [pasto.geometria_geojson.features[0]] }
  }, [pastos, pastoDetalhe])

  // Highlight da estrada em detalhe (painel aberto)
  const estradaDetalheGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!estradaDetalhe) return { type: 'FeatureCollection', features: [] }
    const estrada = estradas.find((e) => e.id === estradaDetalhe.id)
    if (!estrada?.geometria_geojson?.features?.[0]) return { type: 'FeatureCollection', features: [] }
    return { type: 'FeatureCollection', features: [estrada.geometria_geojson.features[0]] }
  }, [estradas, estradaDetalhe])

  const bebedourosGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = []
    bebedouros.forEach((b) => {
      if (b.geometria_geojson?.features?.[0]) {
        features.push(b.geometria_geojson.features[0])
      }
    })
    return { type: 'FeatureCollection', features }
  }, [bebedouros])

  // ==================== Import KML/KMZ ====================
  // ==================== Geolocalização do dispositivo ====================
  // No Painel Web (browser) usa Web Geolocation API. A precisão depende do hardware:
  // GPS nativo (celular) é preciso (~10m), WiFi triangulation é médio (~50-100m),
  // IP geolocation (desktop sem WiFi) é impreciso (~1-5km).
  // No PWA usaremos @capacitor/geolocation que acessa GPS nativo.
  const handleLocalizarDispositivo = () => {
    if (!navigator.geolocation) {
      setImportStatus({ type: 'error', msg: 'Geolocalização não suportada neste navegador.' })
      return
    }

    // Parar watch anterior se existir
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    setLocalizando(true)
    let primeiraLeitura = true

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { longitude, latitude, accuracy } = position.coords
        setUserLocation({ lng: longitude, lat: latitude, accuracy })

        // Voar para a localização apenas na primeira leitura
        if (primeiraLeitura && mapRef.current) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 1500,
          })
          primeiraLeitura = false
          setLocalizando(false)

          // Aviso de precisão
          if (accuracy > 100) {
            setImportStatus({
              type: 'info',
              msg: `Localização encontrada com precisão de ~${Math.round(accuracy)}m. No navegador desktop a precisão é limitada (usa WiFi/IP, não GPS). No app mobile a precisão será de ~10m com GPS nativo. O círculo azul mostra a margem de erro.`,
            })
          } else {
            setImportStatus({
              type: 'info',
              msg: `Localização encontrada com precisão de ~${Math.round(accuracy)}m. Você está no ponto azul.`,
            })
          }
        }
      },
      (err) => {
        setLocalizando(false)
        let msg = 'Erro ao obter localização.'
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Permissão de localização negada. Habilite no navegador para usar esta função.'
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Posição indisponível. Verifique o GPS do dispositivo.'
        } else if (err.code === err.TIMEOUT) {
          msg = 'Tempo esgotado ao obter localização. Tente novamente.'
        }
        setImportStatus({ type: 'error', msg })
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  // Limpar watch ao desmontar
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportStatus({ type: 'info', msg: `Processando ${file.name}...` })

    try {
      let kmlText: string

      if (file.name.toLowerCase().endsWith('.kmz')) {
        // KMZ é ZIP: deszipar com fflate, pegar doc.kml
        const arrayBuffer = await file.arrayBuffer()
        const files = unzipSync(new Uint8Array(arrayBuffer))
        // Procurar por doc.kml ou qualquer .kml dentro do ZIP
        const kmlKey = Object.keys(files).find((k) => k.toLowerCase().endsWith('.kml'))
        if (!kmlKey) {
          setImportStatus({ type: 'error', msg: 'KMZ não contém arquivo KML.' })
          return
        }
        kmlText = strFromU8(files[kmlKey])
      } else if (file.name.toLowerCase().endsWith('.kml')) {
        kmlText = await file.text()
      } else {
        setImportStatus({ type: 'error', msg: 'Formato não suportado. Use .kml ou .kmz.' })
        return
      }

      // Parse KML → GeoJSON
      // KMLs do Google Earth Pro podem ter namespaces não declarados (ex: xsi:schemaLocation)
      // que fazem o DOMParser falhar. Remover namespaces problemáticos antes do parse.
      let kmlClean = kmlText
        .replace(/xsi:schemaLocation="[^"]*"/g, '')
        .replace(/xmlns:xsi="[^"]*"/g, '')
        .replace(/xsi:/g, '')

      let dom: Document = new DOMParser().parseFromString(kmlClean, 'application/xml')
      let parserError = dom.getElementsByTagName('parsererror')

      if (parserError.length > 0) {
        console.warn('[KML] Parser XML falhou mesmo após limpeza. Erro:', parserError[0].textContent?.substring(0, 200))
        // Último fallback: tentar como HTML
        dom = new DOMParser().parseFromString(kmlClean, 'text/html')
      }

      const geojson = kml(dom) as GeoJSON.FeatureCollection

      // Filtrar features sem geometria (podem ocorrer em KMLs do Google Earth)
      const featuresValidas = (geojson.features || []).filter((f) => f.geometry)

      if (featuresValidas.length === 0) {
        setImportStatus({ type: 'error', msg: 'KML não contém features válidas.' })
        return
      }

      const geojsonLimpo: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: featuresValidas,
      }

      setFeaturesImportadas(geojsonLimpo)
      setImportStatus({
        type: 'success',
        msg: `${featuresValidas.length} features importadas. Clique em cada uma para associar a um pasto cadastrado, ou desenhe novas delimitações.`,
      })

      // Ajustar zoom do mapa para mostrar as features importadas
      if (mapRef.current && geojsonLimpo.features.length > 0) {
        const coords: [number, number][] = []
        geojsonLimpo.features.forEach((f) => {
          if (!f.geometry) return
          if (f.geometry.type === 'Polygon') {
            f.geometry.coordinates[0].forEach((c) => coords.push(c as [number, number]))
          } else if (f.geometry.type === 'Point') {
            coords.push(f.geometry.coordinates as [number, number])
          } else if (f.geometry.type === 'LineString') {
            f.geometry.coordinates.forEach((c) => coords.push(c as [number, number]))
          }
        })
        if (coords.length > 0) {
          const lngs = coords.map((c) => c[0])
          const lats = coords.map((c) => c[1])
          const bounds: [[number, number], [number, number]] = [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ]
          mapRef.current.fitBounds(bounds, { padding: 50, duration: 1000 })
        }
      }
    } catch (err) {
      console.error('Erro ao importar KML/KMZ:', err)
      setImportStatus({ type: 'error', msg: `Erro ao processar arquivo: ${(err as Error).message}` })
    }

    // Limpar input para permitir reimportar o mesmo arquivo
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ==================== Desenho (Terra Draw) ====================
  // Inicialização acontece no onLoad do Map (handleMapLoad), que garante
  // que o mapa está completamente carregado antes de criar o adapter.
  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map || drawRef.current) return

    const adapter = new TerraDrawMapLibreGLAdapter({ map })
    const draw = new TerraDraw({
      adapter,
      modes: [
        new TerraDrawPolygonMode({
          styles: terraDrawStyles.polygon as any,
        }),
        new TerraDrawPointMode({
          styles: terraDrawStyles.point as any,
        }),
        new TerraDrawLineStringMode({
          styles: {
            lineStringColor: '#d97706',
            lineStringWidth: 3,
            lineStringOpacity: 0.8,
            closingPointColor: '#374151',
            closingPointWidth: 6,
            closingPointOpacity: 1,
            closingPointOutlineColor: '#ffffff',
            closingPointOutlineWidth: 2,
            closingPointOutlineOpacity: 1,
            coordinatePointColor: '#6b7280',
            coordinatePointOpacity: 1,
            coordinatePointWidth: 5,
            coordinatePointOutlineColor: '#ffffff',
            coordinatePointOutlineWidth: 2,
            coordinatePointOutlineOpacity: 1,
          } as any,
        }),
        new TerraDrawSelectMode({
          flags: {
            polygon: {
              feature: {
                validation: (feature: any) => {
                  if (feature.geometry?.type === 'Polygon') {
                    const coords = feature.geometry.coordinates[0]
                    if (coords.length < 4) {
                      return { valid: false, reason: 'Polígono precisa de no mínimo 3 vértices' }
                    }
                  }
                  return { valid: true }
                },
                draggable: true,
                coordinates: {
                  midpoints: true,
                  draggable: true,
                  deletable: true,
                },
              },
            },
            render: {
              feature: {
                validation: (feature: any) => {
                  if (feature.geometry?.type === 'Polygon') {
                    const coords = feature.geometry.coordinates[0]
                    if (coords.length < 4) {
                      return { valid: false, reason: 'Polígono precisa de no mínimo 3 vértices' }
                    }
                  }
                  return { valid: true }
                },
                draggable: true,
                coordinates: {
                  midpoints: true,
                  draggable: true,
                  deletable: true,
                },
              },
            },
            linestring: {
              feature: {
                validation: (feature: any) => {
                  if (feature.geometry?.type === 'LineString') {
                    const coords = feature.geometry.coordinates
                    if (coords.length < 2) {
                      return { valid: false, reason: 'Estrada precisa de no mínimo 2 pontos' }
                    }
                  }
                  return { valid: true }
                },
                draggable: true,
                coordinates: {
                  midpoints: true,
                  draggable: true,
                  deletable: true,
                },
              },
            },
          },
        }),
        new TerraDrawRenderMode({
          modeName: 'render',
          styles: {
            polygonFillColor: '#3b82f6',
            polygonFillOpacity: 0.2,
            polygonOutlineColor: '#3b82f6',
            polygonOutlineWidth: 2,
            polygonOutlineOpacity: 0.8,
            pointColor: '#3b82f6',
            pointWidth: 6,
            pointOpacity: 0.8,
            pointOutlineColor: '#ffffff',
            pointOutlineWidth: 2,
            pointOutlineOpacity: 1,
            lineStringColor: '#d97706',
            lineStringWidth: 3,
            lineStringOpacity: 0.8,
          } as any,
        }),
      ],
    })
    draw.start()
    drawRef.current = draw

    // Listener: quando uma feature é finalizada (desenho completo)
    draw.on('finish', async () => {
      // Ignorar finish quando estiver em modo de edição de geometria existente
      if (editandoGeometriaRef.current) return
      if (editandoEstradaRef.current) return

      const snapshot = draw.getSnapshot()
      if (snapshot.length === 0) return

      // Pegar a última feature criada
      const lastFeature = snapshot[snapshot.length - 1] as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.Point | GeoJSON.LineString>
      const modoAtual = drawModeRef.current
      setDrawMode(null)

      // Se for LineString (estrada): abrir modal para nomear e salvar
      if (lastFeature.geometry.type === 'LineString') {
        setEstradaDesenhada(lastFeature as GeoJSON.Feature<GeoJSON.LineString>)
        setNomeEstrada('')
        setShowEstradaModal(true)
        return
      }

      // Se for ponto de interesse (não bebedouro): abrir modal de ponto
      if (lastFeature.geometry.type === 'Point' && modoAtual === 'point-interesse') {
        setPontoDesenhado(lastFeature as GeoJSON.Feature<GeoJSON.Point>)
        setNomePonto('')
        setShowPontoModal(true)
        return
      }

      setFeatureDesenhada(lastFeature)
      setPastoSelecionadoAssoc('')
      setPastoDetectado(null)
      setBebedourosDoPasto([])

      // Se for ponto (bebedouro), detectar qual pasto contém o ponto
      if (lastFeature.geometry.type === 'Point' && fazendaIdRef.current) {
        setBuscandoPasto(true)
        setShowAssocModal(true) // já mostra o modal com estado de busca

        try {
          const pontoGeojson = JSON.stringify(lastFeature.geometry)
          const { data: pastoData, error: pastoError } = await supabase.rpc('encontrar_pasto_por_ponto', {
            p_fazenda_id: fazendaIdRef.current,
            p_ponto_geojson: pontoGeojson,
          })

          if (pastoError) throw pastoError

          if (!pastoData || (pastoData as any[]).length === 0) {
            // Ponto não está dentro de nenhum pasto
            setPastoDetectado(null)
            setBuscandoPasto(false)
            return
          }

          const pasto = (pastoData as any[])[0]
          setPastoDetectado({ id: pasto.id, nome: pasto.nome })

          // Buscar bebedouros associados a este pasto que ainda não têm geometria
          const { data: vinculosData, error: vinculosError } = await supabase
            .from('pasto_bebedouros')
            .select('bebedouros(id, nome)')
            .eq('pasto_id', pasto.id)

          if (vinculosError) throw vinculosError

          // Filtrar bebedouros que ainda não têm geometria
          const bebedourosVinculados: { id: string; nome: string }[] = []
          if (vinculosData) {
            const idsBebedourosComGeo = new Set(bebedourosRef.current.map((b) => b.id))
            ;(vinculosData as any[]).forEach((row) => {
              const b = row.bebedouros
              if (b) {
                const arr = Array.isArray(b) ? b : [b]
                arr.forEach((x: any) => {
                  if (!idsBebedourosComGeo.has(x.id)) {
                    bebedourosVinculados.push({ id: x.id, nome: x.nome })
                  }
                })
              }
            })
          }

          setBebedourosDoPasto(bebedourosVinculados)

          // Se só tem um bebedouro, já selecionar automaticamente
          if (bebedourosVinculados.length === 1) {
            setPastoSelecionadoAssoc(bebedourosVinculados[0].id)
          }

          setBuscandoPasto(false)
        } catch (err) {
          console.error('Erro ao detectar pasto:', err)
          setBuscandoPasto(false)
        }
      } else {
        // Polígono (pasto): fluxo direto como antes
        setShowAssocModal(true)
      }
    })

    // Adicionar controles de navegação e escala
    const navControl = new maplibregl.NavigationControl()
    const scaleControl = new maplibregl.ScaleControl()
    map.addControl(navControl, 'top-right')
    map.addControl(scaleControl, 'bottom-left')
  }, [])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (drawRef.current) {
        try {
          drawRef.current.stop()
        } catch {
          // map pode já ter sido destruído
        }
        drawRef.current = null
      }
    }
  }, [])

  const ativarDesenhoPoligono = () => {
    if (!drawRef.current) return
    drawRef.current.setMode('polygon')
    setDrawMode('polygon')
    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = 'crosshair'
  }

  const ativarDesenhoPonto = () => {
    if (!drawRef.current) return
    drawRef.current.setMode('point')
    setDrawMode('point')
    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = 'crosshair'
  }

  const ativarDesenhoEstrada = () => {
    if (!drawRef.current) return
    drawRef.current.setMode('linestring')
    setDrawMode('linestring')
    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = 'crosshair'
  }

  // Calcular comprimento de uma LineString em metros (Haversine simplificado)
  const calcularComprimentoEstrada = (feature: GeoJSON.Feature<GeoJSON.LineString> | undefined): number => {
    if (!feature?.geometry?.coordinates) return 0
    const coords = feature.geometry.coordinates
    let total = 0
    for (let i = 1; i < coords.length; i++) {
      const [lng1, lat1] = coords[i - 1]
      const [lng2, lat2] = coords[i]
      const R = 6371000 // raio da Terra em metros
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLng = (lng2 - lng1) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
      total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }
    return total
  }

  const salvarEstrada = async () => {
    if (!estradaDesenhada || !fazendaId || !nomeEstrada.trim()) return
    setSalvando(true)
    try {
      const geojsonStr = JSON.stringify(estradaDesenhada.geometry)
      const { error } = await supabase.rpc('salvar_estrada', {
        p_fazenda_id: fazendaId,
        p_nome: nomeEstrada.trim(),
        p_geometria_geojson: geojsonStr,
      })
      if (error) throw error
      setImportStatus({ type: 'success', msg: `Estrada "${nomeEstrada.trim()}" salva com sucesso.` })
      // Remover feature do Terra Draw ANTES de mudar estado (evita crash no adapter)
      if (drawRef.current && estradaDesenhada.id) {
        try { drawRef.current.removeFeatures([String(estradaDesenhada.id)]) } catch (e) {
          console.warn('[Mapa] Erro ao remover feature do Terra Draw:', e)
        }
      }
      setShowEstradaModal(false)
      setEstradaDesenhada(null)
      setNomeEstrada('')
      loadData()
    } catch (err) {
      console.error('Erro ao salvar estrada:', err)
      setImportStatus({ type: 'error', msg: `Erro ao salvar estrada: ${(err as Error).message}` })
    } finally {
      setSalvando(false)
    }
  }

  const cancelarEstrada = () => {
    if (drawRef.current && estradaDesenhada?.id) {
      try { drawRef.current.removeFeatures([String(estradaDesenhada.id)]) } catch (e) {
        console.warn('[Mapa] Erro ao remover feature do Terra Draw:', e)
      }
    }
    setShowEstradaModal(false)
    setEstradaDesenhada(null)
    setNomeEstrada('')
  }

  const removerEstrada = async (estradaId: string) => {
    if (!confirm('Remover esta estrada do mapa?')) return
    try {
      const { error } = await supabase.rpc('remover_estrada', { p_estrada_id: estradaId })
      if (error) throw error
      setEstradaDetalhe(null)
      setImportStatus({ type: 'success', msg: 'Estrada removida.' })
      loadData()
    } catch (err) {
      console.error('Erro ao remover estrada:', err)
      setImportStatus({ type: 'error', msg: `Erro ao remover: ${(err as Error).message}` })
    }
  }

  // ==================== Pontos de interesse ====================

  const ativarDesenhoPontoInteresse = () => {
    if (!drawRef.current) return
    drawRef.current.setMode('point')
    setDrawMode('point-interesse')
    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = 'crosshair'
  }

  const salvarPonto = async () => {
    if (!pontoDesenhado || !fazendaId || !nomePonto.trim()) return
    setSalvando(true)
    try {
      const geojsonStr = JSON.stringify(pontoDesenhado.geometry)
      const { error } = await supabase.rpc('salvar_ponto', {
        p_fazenda_id: fazendaId,
        p_tipo: tipoPontoSelecionado,
        p_nome: nomePonto.trim(),
        p_geometria_geojson: geojsonStr,
      })
      if (error) throw error
      setImportStatus({ type: 'success', msg: `Ponto "${nomePonto.trim()}" salvo com sucesso.` })
      if (drawRef.current && pontoDesenhado.id) {
        try { drawRef.current.removeFeatures([String(pontoDesenhado.id)]) } catch (e) {
          console.warn('[Mapa] Erro ao remover feature:', e)
        }
      }
      setShowPontoModal(false)
      setPontoDesenhado(null)
      setNomePonto('')
      loadData()
    } catch (err) {
      console.error('Erro ao salvar ponto:', err)
      setImportStatus({ type: 'error', msg: `Erro ao salvar ponto: ${(err as Error).message}` })
    } finally {
      setSalvando(false)
    }
  }

  const cancelarPonto = () => {
    if (drawRef.current && pontoDesenhado?.id) {
      try { drawRef.current.removeFeatures([String(pontoDesenhado.id)]) } catch (e) {
        console.warn('[Mapa] Erro ao remover feature:', e)
      }
    }
    setShowPontoModal(false)
    setPontoDesenhado(null)
    setNomePonto('')
  }

  const removerPonto = async (pontoId: string) => {
    if (!confirm('Remover este ponto do mapa?')) return
    try {
      const { error } = await supabase.rpc('remover_ponto', { p_ponto_id: pontoId })
      if (error) throw error
      setPontoDetalhe(null)
      setImportStatus({ type: 'success', msg: 'Ponto removido.' })
      loadData()
    } catch (err) {
      console.error('Erro ao remover ponto:', err)
      setImportStatus({ type: 'error', msg: `Erro ao remover: ${(err as Error).message}` })
    }
  }

  const limparDesenho = () => {
    if (!drawRef.current) return
    try {
      const snapshot = drawRef.current.getSnapshot()
      snapshot.forEach((f) => {
        if (f.id) {
          drawRef.current?.removeFeatures([String(f.id)])
        }
      })
    } catch (err) {
      // Adapter pode falhar se o mapa estiver num estado inválido
      console.warn('[Mapa] Erro ao limpar desenho:', err)
    }
    setDrawMode(null)
    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = ''
  }

  // Restaurar cursor quando drawMode for null
  useEffect(() => {
    if (!drawMode) {
      const canvas = mapRef.current?.getCanvas()
      if (canvas) canvas.style.cursor = ''
    }
  }, [drawMode])

  // ==================== Salvar geometria ====================
  const salvarGeometriaPasto = async () => {
    if (!featureDesenhada || !pastoSelecionadoAssoc || featureDesenhada.geometry.type !== 'Polygon') {
      return
    }
    setSalvando(true)

    try {
      const geojsonStr = JSON.stringify(featureDesenhada.geometry)
      const { error } = await supabase.rpc('salvar_geometria_pasto', {
        p_pasto_id: pastoSelecionadoAssoc,
        p_geometria_geojson: geojsonStr,
      })

      if (error) throw error

      setImportStatus({ type: 'success', msg: 'Geometria salva com sucesso.' })
      setShowAssocModal(false)
      setFeatureDesenhada(null)
      setPastoSelecionadoAssoc('')
      // Recarregar dados
      loadData()
    } catch (err) {
      console.error('Erro ao salvar geometria:', err)
      setImportStatus({ type: 'error', msg: `Erro ao salvar: ${(err as Error).message}` })
    } finally {
      setSalvando(false)
    }
  }

  // ==================== Salvar geometria de bebedouro (ponto) ====================
  const salvarGeometriaBebedouro = async () => {
    if (!featureDesenhada || !pastoSelecionadoAssoc || featureDesenhada.geometry.type !== 'Point') {
      return
    }
    setSalvando(true)

    try {
      const geojsonStr = JSON.stringify(featureDesenhada.geometry)
      const { error } = await supabase.rpc('salvar_geometria_bebedouro', {
        p_bebedouro_id: pastoSelecionadoAssoc,
        p_geometria_geojson: geojsonStr,
      })

      if (error) throw error

      setImportStatus({ type: 'success', msg: 'Localização do bebedouro salva com sucesso.' })
      setShowAssocModal(false)
      setFeatureDesenhada(null)
      setPastoSelecionadoAssoc('')
      loadData()
    } catch (err) {
      console.error('Erro ao salvar geometria do bebedouro:', err)
      setImportStatus({ type: 'error', msg: `Erro ao salvar: ${(err as Error).message}` })
    } finally {
      setSalvando(false)
    }
  }

  // ==================== Remover geometria ====================
  const [confirmarRemocao, setConfirmarRemocao] = useState<{ tipo: 'pasto' | 'bebedouro'; id: string; nome: string } | null>(null)
  const [removendo, setRemovendo] = useState(false)

  const removerGeometriaPasto = (id: string, nome: string) => {
    setConfirmarRemocao({ tipo: 'pasto', id, nome })
  }

  const removerGeometriaBebedouro = (id: string, nome: string) => {
    setConfirmarRemocao({ tipo: 'bebedouro', id, nome })
  }

  const confirmarRemocaoGeometria = async () => {
    if (!confirmarRemocao) return
    setRemovendo(true)

    try {
      const rpcName = confirmarRemocao.tipo === 'pasto' ? 'remover_geometria_pasto' : 'remover_geometria_bebedouro'
      const param = confirmarRemocao.tipo === 'pasto' ? 'p_pasto_id' : 'p_bebedouro_id'
      const { error } = await supabase.rpc(rpcName, { [param]: confirmarRemocao.id })

      if (error) throw error

      setImportStatus({
        type: 'success',
        msg: `${confirmarRemocao.tipo === 'pasto' ? 'Pasto' : 'Bebedouro'} "${confirmarRemocao.nome}" removido do mapa. O cadastro continua intacto, apenas a geometria foi removida.`,
      })
      setConfirmarRemocao(null)
      setPastoDetalhe(null)
      setPopup(null)
      loadData()
    } catch (err) {
      console.error('Erro ao remover geometria:', err)
      setImportStatus({ type: 'error', msg: `Erro ao remover: ${(err as Error).message}` })
    } finally {
      setRemovendo(false)
    }
  }

  // ==================== Remoção em lote ====================
  const confirmarRemocaoLote = async () => {
    if (pastosSelecionados.size === 0) return
    setRemovendoLote(true)

    try {
      const pastoIds = Array.from(pastosSelecionados)
      const { data, error } = await supabase.rpc('remover_geometrias_lote', {
        p_pasto_ids: pastoIds,
        p_remover_bebedouros: removerBebedourosLote,
      })

      if (error) throw error

      const result = data?.[0] as any
      const pastosRemovidos = result?.pastos_removidos ?? 0
      const bebedourosRemovidos = result?.bebedouros_removidos ?? 0

      let msg = `${pastosRemovidos} pasto(s) removido(s) do mapa.`
      if (removerBebedourosLote && bebedourosRemovidos > 0) {
        msg += ` ${bebedourosRemovidos} bebedouro(s) também removido(s).`
      }
      setImportStatus({ type: 'success', msg })

      // Limpar seleção e fechar modal
      setPastosSelecionados(new Set())
      setShowRemocaoLoteModal(false)
      setRemoverBebedourosLote(false)
      setModoSelecaoMultipla(false)
      setPastoDetalhe(null)
      setPopup(null)
      setPopupBebedouro(null)
      loadData()
    } catch (err) {
      console.error('Erro ao remover geometrias em lote:', err)
      setImportStatus({ type: 'error', msg: `Erro ao remover: ${(err as Error).message}` })
    } finally {
      setRemovendoLote(false)
    }
  }

  const cancelarSelecaoMultipla = () => {
    setModoSelecaoMultipla(false)
    setPastosSelecionados(new Set())
  }

  // ==================== Editar geometria existente ====================
  const iniciarEdicaoGeometria = (pastoId: string, pastoNome: string) => {
    if (!drawRef.current) return

    // Encontrar a geometria do pasto nos dados carregados
    const pasto = pastos.find((p) => p.id === pastoId)
    if (!pasto?.geometria_geojson?.features?.[0]) return

    const feature = pasto.geometria_geojson.features[0]

    // Gerar UUID4 válido para o Terra Draw (exige UUID4 por padrão)
    const featureId = crypto.randomUUID()

    // Limpar a feature: só geometria + id + mode, sem properties extras que podem conflitar
    const featureToAdd = {
      type: 'Feature',
      geometry: feature.geometry,
      properties: { mode: 'render' },
      id: featureId,
    } as any

    try {
      const validation = drawRef.current.addFeatures([featureToAdd])
      const rejeitadas = validation.filter((v: any) => !v.valid)
      if (rejeitadas.length > 0) {
        console.error('[Mapa] Feature rejeitada pelo Terra Draw:', JSON.stringify(rejeitadas, null, 2))
        return
      }

    } catch (err) {
      console.error('[Mapa] Erro ao adicionar feature para edição:', err)
      return
    }

    // Switch para modo select e selecionar a feature programaticamente
    drawRef.current.setMode('select')
    setDrawMode('select')

    // Selecionar a feature após um breve delay para garantir que o modo foi ativado
    setTimeout(() => {
      try {
        drawRef.current?.selectFeature(featureId)
      } catch (err) {
        console.warn('[Mapa] Erro ao selecionar feature:', err)
      }
    }, 200)

    // Esconder o painel de detalhes e popup
    setPastoDetalhe(null)
    setPopup(null)
    setPopupBebedouro(null)

    setEditandoGeometria({ pastoId, pastoNome, featureId })

    // Forçar cursor apropriado
    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = 'pointer'
  }

  const salvarEdicaoGeometria = async () => {
    if (!editandoGeometria || !drawRef.current) return

    setSalvandoEdicao(true)

    try {
      // Pegar a feature atualizada do snapshot do Terra Draw
      const snapshot = drawRef.current.getSnapshot()
      const featureEditada = snapshot.find((f) => String(f.id) === editandoGeometria.featureId)

      if (!featureEditada) {
        throw new Error('Feature não encontrada no snapshot do Terra Draw.')
      }

      // Salvar a geometria atualizada via RPC
      const geojsonStr = JSON.stringify(featureEditada.geometry)
      const { error } = await supabase.rpc('salvar_geometria_pasto', {
        p_pasto_id: editandoGeometria.pastoId,
        p_geometria_geojson: geojsonStr,
      })

      if (error) throw error

      setImportStatus({ type: 'success', msg: `Geometria do pasto "${editandoGeometria.pastoNome}" atualizada com sucesso.` })

      // Remover a feature do Terra Draw
      try {
        drawRef.current.removeFeatures([editandoGeometria.featureId])
      } catch {
        // ignore
      }

      // Voltar ao modo normal
      drawRef.current.setMode('render')
      setDrawMode(null)
      setEditandoGeometria(null)

      // Restaurar cursor
      const canvas = mapRef.current?.getCanvas()
      if (canvas) canvas.style.cursor = ''

      loadData()
    } catch (err) {
      console.error('Erro ao salvar edição de geometria:', err)
      setImportStatus({ type: 'error', msg: `Erro ao salvar edição: ${(err as Error).message}` })
    } finally {
      setSalvandoEdicao(false)
    }
  }

  const cancelarEdicaoGeometria = () => {
    if (!drawRef.current || !editandoGeometria) return

    try {
      drawRef.current.removeFeatures([editandoGeometria.featureId])
    } catch (err) {
      console.warn('[Mapa] Erro ao remover feature de edição:', err)
    }

    drawRef.current.setMode('render')
    setDrawMode(null)
    setEditandoGeometria(null)

    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = ''
  }

  // ==================== Edição de estrada ====================

  const iniciarEdicaoEstrada = (estradaId: string, estradaNome: string) => {
    if (!drawRef.current) return

    const estrada = estradas.find((e) => e.id === estradaId)
    if (!estrada?.geometria_geojson?.features?.[0]) return

    const feature = estrada.geometria_geojson.features[0]
    const featureId = crypto.randomUUID()

    const featureToAdd = {
      type: 'Feature',
      geometry: feature.geometry,
      properties: { mode: 'render' },
      id: featureId,
    } as any

    try {
      const validation = drawRef.current.addFeatures([featureToAdd])
      const rejeitadas = validation.filter((v: any) => !v.valid)
      if (rejeitadas.length > 0) {
        console.error('[Mapa] Feature rejeitada pelo Terra Draw:', JSON.stringify(rejeitadas, null, 2))
        return
      }
    } catch (err) {
      console.error('[Mapa] Erro ao adicionar feature para edição:', err)
      return
    }

    drawRef.current.setMode('select')
    setDrawMode('select')

    setTimeout(() => {
      try {
        drawRef.current?.selectFeature(featureId)
      } catch (err) {
        console.warn('[Mapa] Erro ao selecionar feature:', err)
      }
    }, 200)

    setEstradaDetalhe(null)
    setEditandoEstrada({ estradaId, estradaNome, featureId })

    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = 'pointer'
  }

  const salvarEdicaoEstrada = async () => {
    if (!editandoEstrada || !drawRef.current) return

    setSalvandoEdicao(true)

    try {
      const snapshot = drawRef.current.getSnapshot()
      const featureEditada = snapshot.find((f) => String(f.id) === editandoEstrada.featureId)

      if (!featureEditada) {
        throw new Error('Feature não encontrada no snapshot do Terra Draw.')
      }

      const geojsonStr = JSON.stringify(featureEditada.geometry)
      const { error } = await supabase.rpc('atualizar_estrada', {
        p_estrada_id: editandoEstrada.estradaId,
        p_geometria_geojson: geojsonStr,
      })

      if (error) throw error

      setImportStatus({ type: 'success', msg: `Estrada "${editandoEstrada.estradaNome}" atualizada com sucesso.` })

      try {
        drawRef.current.removeFeatures([editandoEstrada.featureId])
      } catch {
        // ignore
      }

      drawRef.current.setMode('render')
      setDrawMode(null)
      setEditandoEstrada(null)

      const canvas = mapRef.current?.getCanvas()
      if (canvas) canvas.style.cursor = ''

      loadData()
    } catch (err) {
      console.error('Erro ao salvar edição de estrada:', err)
      setImportStatus({ type: 'error', msg: `Erro ao salvar edição: ${(err as Error).message}` })
    } finally {
      setSalvandoEdicao(false)
    }
  }

  const cancelarEdicaoEstrada = () => {
    if (!drawRef.current || !editandoEstrada) return

    try {
      drawRef.current.removeFeatures([editandoEstrada.featureId])
    } catch (err) {
      console.warn('[Mapa] Erro ao remover feature de edição:', err)
    }

    drawRef.current.setMode('render')
    setDrawMode(null)
    setEditandoEstrada(null)

    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = ''
  }

  const cancelarAssociacao = () => {
    setShowAssocModal(false)
    setFeatureDesenhada(null)
    setPastoSelecionadoAssoc('')
    setPastoDetectado(null)
    setBebedourosDoPasto([])
    setBuscandoPasto(false)
    // Remover a feature desenhada do Terra Draw
    if (drawRef.current && featureDesenhada?.id) {
      try {
        drawRef.current.removeFeatures([String(featureDesenhada.id)])
      } catch (err) {
        console.warn('[Mapa] Erro ao remover feature:', err)
      }
    }
  }

  // ==================== Click no pasto para ver detalhes ou selecionar ====================
  const handleMapClick = async (e: maplibregl.MapLayerMouseEvent) => {
    // Se está em modo de desenho, não tratar click como seleção
    if (drawMode || editandoGeometria || editandoEstrada) return

    const features = e.features
    if (!features || features.length === 0) return

    // Em modo de seleção múltipla, só seleciona pastos (ignora bebedouros)
    if (modoSelecaoMultipla) {
      const pastoFeature = features.find((f) => f.source === 'pastos-source' || f.source === 'pastos-labels-source')
      if (!pastoFeature) return
      const pastoId = pastoFeature.properties?.id as string
      if (!pastoId) return

      // Toggle seleção
      setPastosSelecionados((prev) => {
        const next = new Set(prev)
        if (next.has(pastoId)) {
          next.delete(pastoId)
        } else {
          next.add(pastoId)
        }
        return next
      })
      return
    }

    // Priorizar bebedouro (ponto está acima do polígono visualmente)
    const bebedouroFeature = features.find((f) => f.source === 'bebedouros-source')
    if (bebedouroFeature) {
      const bebedouroId = bebedouroFeature.properties?.id as string
      const bebedouroNome = bebedouroFeature.properties?.nome as string
      if (bebedouroId) {
        setPopupBebedouro({ lng: e.lngLat.lng, lat: e.lngLat.lat, id: bebedouroId, nome: bebedouroNome })
        return
      }
    }

    // Verificar se clicou num ponto de interesse
    const pontoFeature = features.find((f) => f.source === 'pontos-source')
    if (pontoFeature) {
      const pontoId = pontoFeature.properties?.id as string
      const pontoTipo = pontoFeature.properties?.tipo as string
      const pontoNome = pontoFeature.properties?.nome as string
      if (pontoId) {
        setPontoDetalhe({ id: pontoId, tipo: pontoTipo, nome: pontoNome, geometria_geojson: null })
        setPastoDetalhe(null)
        setEstradaDetalhe(null)
        return
      }
    }

    // Verificar se clicou numa estrada
    const estradaFeature = features.find((f) => f.source === 'estradas-source')
    if (estradaFeature) {
      console.log('[Mapa] Click estrada:', estradaFeature)
      const estradaId = estradaFeature.properties?.id as string
      const estradaNome = estradaFeature.properties?.nome as string
      if (estradaId) {
        setEstradaDetalhe({ id: estradaId, nome: estradaNome, geometria_geojson: null })
        setPastoDetalhe(null)
        setPontoDetalhe(null)
        return
      }
    }

    // Verificar se clicou numa feature importada (KML/KMZ)
    const importFeature = features.find((f) => f.source === 'import-source')
    if (importFeature && featuresImportadas) {
      // O MapLibre pode truncar coordenadas; buscar por tipo + nome ao invés de comparar coords
      const importName = importFeature.properties?.name as string
      const importType = importFeature.geometry?.type

      // Encontrar a feature completa no GeoJSON importado
      let feature = featuresImportadas.features.find((f) => {
        if (!f.geometry) return false
        if (f.geometry.type !== importType) return false
        if (importName && f.properties?.name === importName) return true
        // Fallback: comparar primeira coordenada
        if (importType === 'Polygon') {
          const a = (importFeature.geometry as any).coordinates?.[0]?.[0]
          const b = (f.geometry as GeoJSON.Polygon).coordinates[0][0]
          return a && b && a[0] === b[0] && a[1] === b[1]
        }
        if (importType === 'Point') {
          const a = (importFeature.geometry as any).coordinates
          const b = (f.geometry as GeoJSON.Point).coordinates
          return a && b && a[0] === b[0] && a[1] === b[1]
        }
        if (importType === 'LineString') {
          const a = (importFeature.geometry as any).coordinates?.[0]
          const b = (f.geometry as GeoJSON.LineString).coordinates[0]
          return a && b && a[0] === b[0] && a[1] === b[1]
        }
        return false
      })

      // Se não encontrou por nome ou coordenada, pegar a primeira do mesmo tipo
      if (!feature) {
        feature = featuresImportadas.features.find((f) => f.geometry?.type === importType)
      }

      if (feature && (feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'Point')) {
        setFeatureDesenhada(feature as any)
        setPastoSelecionadoAssoc('')
        setPastoDetectado(null)
        setBebedourosDoPasto([])
        setShowAssocModal(true)
        return
      }

      // Se for LineString importada: abrir modal para nomear e salvar como estrada
      if (feature && feature.geometry?.type === 'LineString') {
        setEstradaDesenhada(feature as GeoJSON.Feature<GeoJSON.LineString>)
        setNomeEstrada(importName || '')
        setShowEstradaModal(true)
        return
      }
    }

    // Procurar feature de pasto clicada (pode ser o polígono ou o label)
    const pastoFeature = features.find((f) => f.source === 'pastos-source' || f.source === 'pastos-labels-source')
    if (!pastoFeature) return

    const pastoId = pastoFeature.properties?.id as string
    if (!pastoId) return

    setPopupBebedouro(null)
    setPopup({ lng: e.lngLat.lng, lat: e.lngLat.lat, nome: pastoFeature.properties?.nome || 'Pasto' })

    // Buscar detalhes completos do pasto
    await carregarDetalhePasto(pastoId)
  }

  const carregarDetalhePasto = async (pastoId: string) => {
    try {
      // Buscar pasto + bebedouros + lote associado ao pasto (via RPC com dados reais)
      const [pastoRes, bebedourosRes, loteRes] = await Promise.all([
        supabase
          .from('pastos')
          .select('*, modulos_pastos!left(nome)')
          .eq('id', pastoId)
          .maybeSingle(),
        supabase
          .from('pasto_bebedouros')
          .select('bebedouros(id, nome)')
          .eq('pasto_id', pastoId),
        supabase.rpc('get_lote_por_pasto', { p_pasto_id: pastoId }),
      ])

      if (pastoRes.data) {
        const p = pastoRes.data as any
        const bebedourosList: { id: string; nome: string }[] = []
        if (bebedourosRes.data) {
          ;(bebedourosRes.data as any[]).forEach((row) => {
            const b = row.bebedouros
            if (b) {
              const arr = Array.isArray(b) ? b : [b]
              arr.forEach((x: any) => bebedourosList.push({ id: x.id, nome: x.nome }))
            }
          })
        }

        const loteData = (loteRes.data as any[])?.[0] ?? null

        const detalhe: PastoDetalhe = {
          id: p.id,
          nome: p.nome,
          setor: p.setor,
          tipo: p.tipo,
          area_total_ha: p.area_total_ha,
          area_util_ha: p.area_util_ha,
          especie: p.especie,
          ativo: p.ativo,
          metragem_cocho_m: p.metragem_cocho_m,
          possui_deposito: p.possui_deposito,
          fonte_agua_principal: p.fonte_agua_principal,
          modulo_nome: p.modulos_pastos?.nome || null,
          bebedouros: bebedourosList,
          lote_atual: loteData
            ? {
                id: loteData.id,
                nome: loteData.nome,
                n_cabecas: loteData.cabecas_atual || 0,
                raca: loteData.raca,
                sexo: loteData.sexo,
                peso_medio_atual_kg: loteData.peso_medio_atual_kg ?? null,
              }
            : null,
        }
        setPastoDetalhe(detalhe)
        setEstradaDetalhe(null)
        setPontoDetalhe(null)
      }
    } catch (err) {
      console.error('Erro ao carregar detalhe do pasto:', err)
    }
  }

  // ==================== Render ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <p className="text-gray-500">Carregando mapa...</p>
      </div>
    )
  }

  if (!fazendaId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <p className="text-gray-500">Nenhuma fazenda vinculada ao seu usuário.</p>
      </div>
    )
  }

  return (
    <div className={modoTelaCheia ? 'fixed inset-0 z-50 bg-white flex flex-col' : 'space-y-4'}>
      {/* Header (oculto em tela cheia) */}
      {!modoTelaCheia && (
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mapa da Fazenda</h1>
          <p className="text-sm text-gray-500">
            Importe KML/KMZ do ArcGIS ou Google Earth, desenhe delimitações de pastos e associe aos cadastros.
          </p>
        </div>
      </div>
      )}

      {/* Toolbar (overlay compacto em tela cheia) */}
      <div className={modoTelaCheia
        ? 'absolute top-2 left-2 right-2 z-10 flex items-center gap-2 flex-wrap bg-white/95 p-2 rounded-lg border border-gray-200 shadow-lg'
        : 'flex items-center gap-2 flex-wrap bg-white p-3 rounded-lg border border-gray-200'
      }>
        <input
          ref={fileInputRef}
          type="file"
          accept=".kml,.kmz"
          onChange={handleFileImport}
          className="hidden"
        />
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Importar KML/KMZ
          </span>
        </Button>
        <Button
          variant={drawMode === 'polygon' ? 'primary' : 'secondary'}
          onClick={ativarDesenhoPoligono}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 0l0 16l-16 0z" />
            </svg>
            Desenhar Pasto
          </span>
        </Button>
        <Button
          variant={drawMode === 'point' ? 'primary' : 'secondary'}
          onClick={ativarDesenhoPonto}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a8 8 0 00-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 00-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Marcar Bebedouro
          </span>
        </Button>
        <Button
          variant={drawMode === 'linestring' ? 'primary' : 'secondary'}
          onClick={ativarDesenhoEstrada}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 18c4-8 12-8 16 0M4 18a2 2 0 11-4 0 2 2 0 014 0zM20 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
            Traçar Estrada
          </span>
        </Button>
        <Button
          variant={drawMode === 'point-interesse' ? 'primary' : 'secondary'}
          onClick={ativarDesenhoPontoInteresse}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Marcar Ponto
          </span>
        </Button>
        <Button variant="secondary" onClick={limparDesenho}>
          Limpar Desenho
        </Button>
        <Button
          variant={modoSelecaoMultipla ? 'primary' : 'secondary'}
          onClick={() => {
            setModoSelecaoMultipla(!modoSelecaoMultipla)
            setPastosSelecionados(new Set())
          }}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            {modoSelecaoMultipla ? 'Sair da Seleção' : 'Seleção Múltipla'}
          </span>
        </Button>
        <Button
          variant="secondary"
          onClick={handleLocalizarDispositivo}
          disabled={localizando}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v3m0 14v3m10-10h-3M5 12H2" />
            </svg>
            {localizando ? 'Localizando...' : 'Minha Localização'}
          </span>
        </Button>
        {featuresImportadas && (
          <Button
            variant="secondary"
            onClick={() => {
              setFeaturesImportadas(null)
              setImportStatus(null)
            }}
          >
            Remover Importação
          </Button>
        )}
        {/* Controle de camadas */}
        <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={visCamadas.pastos}
              onChange={(e) => setVisCamadas((v) => ({ ...v, pastos: e.target.checked }))}
              className="accent-green-600"
            />
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-green-500/40 border border-green-600" />
              Pastos
            </span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={visCamadas.bebedouros}
              onChange={(e) => setVisCamadas((v) => ({ ...v, bebedouros: e.target.checked }))}
              className="accent-blue-600"
            />
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
              Bebedouros
            </span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={visCamadas.estradas}
              onChange={(e) => setVisCamadas((v) => ({ ...v, estradas: e.target.checked }))}
              className="accent-amber-600"
            />
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 bg-amber-600" />
              Estradas
            </span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={visCamadas.pontos}
              onChange={(e) => setVisCamadas((v) => ({ ...v, pontos: e.target.checked }))}
              className="accent-purple-600"
            />
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-purple-600 border-2 border-white" />
              Pontos
            </span>
          </label>
        </div>
        <Button
          variant="secondary"
          onClick={() => setModoTelaCheia((v) => !v)}
        >
          <span className="flex items-center gap-2">
            {modoTelaCheia ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
                Sair Tela Cheia
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
                Tela Cheia
              </>
            )}
          </span>
        </Button>
        <div className="ml-auto text-sm text-gray-500">
          {pastos.filter((p) => p.geometria_geojson).length} pastos ·{' '}
          {bebedouros.filter((b) => b.geometria_geojson).length} bebedouros ·{' '}
          {estradas.length} estradas ·{' '}
          {pontos.length} pontos
        </div>
      </div>

      {/* Barra de edição de geometria (overlay em tela cheia) */}
      {editandoGeometria && (
        <div className={modoTelaCheia
          ? 'absolute top-16 left-2 right-2 z-10 flex items-center gap-3 bg-blue-50 border border-blue-200 p-3 rounded-lg flex-wrap shadow-lg'
          : 'flex items-center gap-3 bg-blue-50 border border-blue-200 p-3 rounded-lg flex-wrap'
        }>
          <span className="text-sm font-medium text-blue-800">
            Editando geometria do pasto <strong>{editandoGeometria.pastoNome}</strong>.
            Arraste os vértices para reposicioná-los. Clique duas vezes num ponto intermediário para criar um novo vértice. Clique com o botão direito num vértice para removê-lo.
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="secondary"
              onClick={cancelarEdicaoGeometria}
              disabled={salvandoEdicao}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={salvarEdicaoGeometria}
              disabled={salvandoEdicao}
            >
              {salvandoEdicao ? 'Salvando...' : 'Salvar Edição'}
            </Button>
          </div>
        </div>
      )}

      {/* Barra de edição de estrada (overlay em tela cheia) */}
      {editandoEstrada && (
        <div className={modoTelaCheia
          ? 'absolute top-16 left-2 right-2 z-10 flex items-center gap-3 bg-amber-50 border border-amber-200 p-3 rounded-lg flex-wrap shadow-lg'
          : 'flex items-center gap-3 bg-amber-50 border border-amber-200 p-3 rounded-lg flex-wrap'
        }>
          <span className="text-sm font-medium text-amber-800">
            Editando estrada <strong>{editandoEstrada.estradaNome}</strong>.
            Arraste os vértices para reposicioná-los. Clique duas vezes num ponto intermediário para criar um novo vértice. Clique com o botão direito num vértice para removê-lo.
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="secondary"
              onClick={cancelarEdicaoEstrada}
              disabled={salvandoEdicao}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={salvarEdicaoEstrada}
              disabled={salvandoEdicao}
            >
              {salvandoEdicao ? 'Salvando...' : 'Salvar Edição'}
            </Button>
          </div>
        </div>
      )}

      {/* Barra de ações em lote (seleção múltipla) */}
      {modoSelecaoMultipla && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 p-3 rounded-lg flex-wrap">
          <span className="text-sm font-medium text-blue-800">
            {pastosSelecionados.size === 0
              ? 'Clique nos pastos no mapa para selecioná-los.'
              : `${pastosSelecionados.size} pasto(s) selecionado(s).`}
          </span>
          {pastosSelecionados.size > 0 && (
            <>
              <Button
                variant="secondary"
                onClick={() => setShowRemocaoLoteModal(true)}
                className="text-red-600 hover:text-red-700 border-red-200"
              >
                Remover Geometrias
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPastosSelecionados(new Set())}
              >
                Limpar Seleção
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={cancelarSelecaoMultipla} className="ml-auto">
            Sair da Seleção
          </Button>
        </div>
      )}

      {/* Status de importação (overlay em tela cheia) */}
      {importStatus && (
        <div
          className={modoTelaCheia
            ? `absolute bottom-2 left-2 z-10 p-3 pr-8 rounded-lg text-sm shadow-lg ${importStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : importStatus.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`
            : `p-3 pr-8 rounded-lg text-sm relative ${importStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : importStatus.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`
          }
        >
          {importStatus.msg}
          <button
            onClick={() => setImportStatus(null)}
            className="absolute top-1 right-1 text-current opacity-50 hover:opacity-100"
            aria-label="Dispensar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Mapa + Side Panel */}
      <div className={modoTelaCheia
        ? 'relative flex-1 flex'
        : 'flex gap-4 flex-col lg:flex-row'
      }>
        {/* Mapa */}
        <div className={modoTelaCheia
          ? 'flex-1 relative'
          : 'flex-1 rounded-lg overflow-hidden border border-gray-200'
        } style={modoTelaCheia
          ? { height: '100%' }
          : { height: 'calc(100vh - 280px)', minHeight: '400px' }
        }>
          <Map
            ref={mapRef}
            initialViewState={loadSavedView()}
            mapStyle={mapStyle}
            interactiveLayerIds={[
              ...(visCamadas.pastos ? ['pastos-fill', 'pastos-line', 'pastos-labels'] : []),
              ...(visCamadas.bebedouros ? ['bebedouros-circle'] : []),
              ...(visCamadas.estradas ? ['estradas-line'] : []),
              ...(visCamadas.pontos ? ['pontos-circle'] : []),
              ...(featuresImportadas ? ['import-fill', 'import-line', 'import-point', 'import-line-string'] : []),
            ]}
            onClick={handleMapClick}
            onLoad={handleMapLoad}
            onMoveEnd={(e) => saveView(e.viewState.longitude, e.viewState.latitude, e.viewState.zoom)}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Source: pastos com geometria (esconde o pasto em edição para evitar duplicação) */}
            <Source id="pastos-source" type="geojson" data={pastosGeoJSON}>
              <Layer
                id="pastos-fill"
                type="fill"
                layout={{ visibility: visCamadas.pastos ? 'visible' : 'none' }}
                paint={{
                  'fill-color': '#22c55e',
                  'fill-opacity': 0.25,
                }}
                filter={editandoGeometria
                  ? ['all', ['==', '$type', 'Polygon'], ['!=', 'id', editandoGeometria.pastoId]]
                  : ['==', '$type', 'Polygon']}
              />
              <Layer
                id="pastos-line"
                type="line"
                layout={{ visibility: visCamadas.pastos ? 'visible' : 'none' }}
                paint={{
                  'line-color': '#16a34a',
                  'line-width': 2,
                }}
                filter={editandoGeometria
                  ? ['all', ['==', '$type', 'Polygon'], ['!=', 'id', editandoGeometria.pastoId]]
                  : ['==', '$type', 'Polygon']}
              />
            </Source>

            {/* Source: labels dos pastos (nome + áreas no centróide) */}
            <Source id="pastos-labels-source" type="geojson" data={pastosLabelsGeoJSON}>
              <Layer
                id="pastos-labels"
                type="symbol"
                layout={{
                  'text-field': ['concat', ['get', 'nome'], '\n', ['get', 'sublabel']],
                  'text-anchor': 'center',
                  'text-justify': 'center',
                  'text-allow-overlap': true,
                  'text-size': 13,
                  visibility: visCamadas.pastos ? 'visible' : 'none',
                }}
                paint={{
                  'text-color': '#15803d',
                  'text-halo-color': '#ffffff',
                  'text-halo-width': 2,
                }}
                filter={editandoGeometria
                  ? ['!=', 'id', editandoGeometria.pastoId]
                  : ['has', 'nome']}
              />
            </Source>

            {/* Source: pastos selecionados (highlight em laranja) */}
            {pastosSelecionadosGeoJSON.features.length > 0 && (
              <Source id="pastos-selecionados-source" type="geojson" data={pastosSelecionadosGeoJSON}>
                <Layer
                  id="pastos-selecionados-fill"
                  type="fill"
                  paint={{
                    'fill-color': '#f97316',
                    'fill-opacity': 0.4,
                  }}
                  filter={['==', '$type', 'Polygon']}
                />
                <Layer
                  id="pastos-selecionados-line"
                  type="line"
                  paint={{
                    'line-color': '#ea580c',
                    'line-width': 3,
                  }}
                  filter={['==', '$type', 'Polygon']}
                />
              </Source>
            )}

            {/* Source: highlight do pasto em detalhe (contorno azul grosso) */}
            {pastoDetalheGeoJSON.features.length > 0 && (
              <Source id="pasto-detalhe-highlight" type="geojson" data={pastoDetalheGeoJSON}>
                <Layer
                  id="pasto-detalhe-line"
                  type="line"
                  paint={{
                    'line-color': '#2563eb',
                    'line-width': 4,
                    'line-opacity': 0.9,
                  }}
                  filter={['==', '$type', 'Polygon']}
                />
              </Source>
            )}

            {/* Source: highlight da estrada em detalhe (contorno azul grosso) */}
            {estradaDetalheGeoJSON.features.length > 0 && (
              <Source id="estrada-detalhe-highlight" type="geojson" data={estradaDetalheGeoJSON}>
                <Layer
                  id="estrada-detalhe-line"
                  type="line"
                  paint={{
                    'line-color': '#2563eb',
                    'line-width': 5,
                    'line-opacity': 0.9,
                  }}
                  filter={['==', '$type', 'LineString']}
                />
              </Source>
            )}

            {/* Source: bebedouros com geometria */}
            <Source id="bebedouros-source" type="geojson" data={bebedourosGeoJSON}>
              <Layer
                id="bebedouros-circle"
                type="circle"
                layout={{ visibility: visCamadas.bebedouros ? 'visible' : 'none' }}
                paint={{
                  'circle-radius': 6,
                  'circle-color': '#3b82f6',
                  'circle-stroke-color': '#ffffff',
                  'circle-stroke-width': 2,
                }}
                filter={['==', '$type', 'Point']}
              />
            </Source>

            {/* Source: estradas */}
            {estradas.length > 0 && (() => {
              const estradasGeoJSON: GeoJSON.FeatureCollection = {
                type: 'FeatureCollection',
                features: estradas
                  .filter((e) => e.geometria_geojson?.features?.[0])
                  .map((e) => {
                    const f = e.geometria_geojson!.features[0]
                    return {
                      type: 'Feature' as const,
                      properties: { id: e.id, nome: e.nome },
                      geometry: f.geometry,
                    }
                  }),
              }
              return (
                <Source id="estradas-source" type="geojson" data={estradasGeoJSON}>
                  <Layer
                    id="estradas-line"
                    type="line"
                    layout={{ visibility: visCamadas.estradas ? 'visible' : 'none' }}
                    paint={{
                      'line-color': '#d97706',
                      'line-width': 3,
                      'line-opacity': 0.9,
                    }}
                    filter={editandoEstrada
                      ? ['all', ['==', '$type', 'LineString'], ['!=', 'id', editandoEstrada.estradaId]]
                      : ['==', '$type', 'LineString']}
                  />
                  <Layer
                    id="estradas-casing"
                    type="line"
                    layout={{ visibility: visCamadas.estradas ? 'visible' : 'none' }}
                    paint={{
                      'line-color': '#ffffff',
                      'line-width': 5,
                      'line-opacity': 0.4,
                    }}
                    filter={editandoEstrada
                      ? ['all', ['==', '$type', 'LineString'], ['!=', 'id', editandoEstrada.estradaId]]
                      : ['==', '$type', 'LineString']}
                    beforeId="estradas-line"
                  />
                </Source>
              )
            })()}

            {/* Source: pontos de interesse */}
            {pontos.length > 0 && (() => {
              const pontosGeoJSON: GeoJSON.FeatureCollection = {
                type: 'FeatureCollection',
                features: pontos
                  .filter((p) => p.geometria_geojson?.features?.[0])
                  .map((p) => {
                    const f = p.geometria_geojson!.features[0]
                    return {
                      type: 'Feature' as const,
                      properties: { id: p.id, tipo: p.tipo, nome: p.nome, cor: corPonto(p.tipo) },
                      geometry: f.geometry,
                    }
                  }),
              }
              return (
                <Source id="pontos-source" type="geojson" data={pontosGeoJSON}>
                  <Layer
                    id="pontos-circle"
                    type="circle"
                    layout={{ visibility: visCamadas.pontos ? 'visible' : 'none' }}
                    paint={{
                      'circle-radius': 8,
                      'circle-color': ['coalesce', ['get', 'cor'], '#7c3aed'],
                      'circle-stroke-color': '#ffffff',
                      'circle-stroke-width': 2,
                    }}
                    filter={['==', '$type', 'Point']}
                  />
                </Source>
              )
            })()}

            {/* Source: features importadas (camada temporária) */}
            {featuresImportadas && (
              <Source id="import-source" type="geojson" data={featuresImportadas}>
                <Layer
                  id="import-fill"
                  type="fill"
                  paint={{
                    'fill-color': '#f59e0b',
                    'fill-opacity': 0.2,
                  }}
                  filter={['==', '$type', 'Polygon']}
                />
                <Layer
                  id="import-line"
                  type="line"
                  paint={{
                    'line-color': '#d97706',
                    'line-width': 2,
                    'line-dasharray': [2, 1],
                  }}
                  filter={['==', '$type', 'Polygon']}
                />
                <Layer
                  id="import-point"
                  type="circle"
                  paint={{
                    'circle-radius': 5,
                    'circle-color': '#f59e0b',
                  }}
                  filter={['==', '$type', 'Point']}
                />
                <Layer
                  id="import-line-string"
                  type="line"
                  paint={{
                    'line-color': '#d97706',
                    'line-width': 2,
                  }}
                  filter={['==', '$type', 'LineString']}
                />
              </Source>
            )}

            {/* Source: localização atual do dispositivo com círculo de precisão */}
            {userLocation && (
              <Source
                id="user-location"
                type="geojson"
                data={{
                  type: 'FeatureCollection',
                  features: [
                    {
                      type: 'Feature',
                      properties: { label: 'Você está aqui' },
                      geometry: {
                        type: 'Point',
                        coordinates: [userLocation.lng, userLocation.lat],
                      },
                    },
                  ],
                }}
              >
                <Layer
                  id="user-location-circle"
                  type="circle"
                  paint={{
                    'circle-radius': 8,
                    'circle-color': '#2563eb',
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-width': 3,
                  }}
                />
                <Layer
                  id="user-location-pulse"
                  type="circle"
                  paint={{
                    'circle-radius': 20,
                    'circle-color': '#2563eb',
                    'circle-opacity': 0.2,
                  }}
                />
              </Source>
            )}

            {/* Source: círculo de precisão (accuracy) da geolocalização */}
            {userLocation && userLocation.accuracy > 20 && (
              <Source
                id="user-accuracy"
                type="geojson"
                data={{
                  type: 'FeatureCollection',
                  features: [
                    {
                      type: 'Feature',
                      properties: {},
                      geometry: {
                        type: 'Polygon',
                        coordinates: [gerarCirculoPrecisao(userLocation.lng, userLocation.lat, userLocation.accuracy)],
                      },
                    },
                  ],
                }}
              >
                <Layer
                  id="user-accuracy-fill"
                  type="fill"
                  paint={{
                    'fill-color': '#2563eb',
                    'fill-opacity': 0.08,
                  }}
                />
                <Layer
                  id="user-accuracy-line"
                  type="line"
                  paint={{
                    'line-color': '#2563eb',
                    'line-width': 1,
                    'line-dasharray': [2, 2],
                  }}
                />
              </Source>
            )}

            {/* Popup ao clicar em pasto */}
            {popup && (
              <Popup
                longitude={popup.lng}
                latitude={popup.lat}
                closeOnClick={false}
                onClose={() => setPopup(null)}
                anchor="bottom"
              >
                <div className="p-1">
                  <p className="font-semibold text-sm">{popup.nome}</p>
                </div>
              </Popup>
            )}

            {/* Popup ao clicar em bebedouro */}
            {popupBebedouro && (
              <Popup
                longitude={popupBebedouro.lng}
                latitude={popupBebedouro.lat}
                closeOnClick={false}
                onClose={() => setPopupBebedouro(null)}
                anchor="bottom"
              >
                <div className="p-2 min-w-[160px]">
                  <p className="font-semibold text-sm mb-2">{popupBebedouro.nome}</p>
                  <button
                    onClick={() => {
                      removerGeometriaBebedouro(popupBebedouro.id, popupBebedouro.nome)
                      setPopupBebedouro(null)
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Remover do mapa
                  </button>
                </div>
              </Popup>
            )}

            {/* Controles de navegação adicionados via useEffect no map instance */}
          </Map>
        </div>

        {/* Side Panel: detalhes do pasto (overlay flutuante em tela cheia) */}
        {pastoDetalhe && (
          <div className={modoTelaCheia
            ? 'absolute top-2 right-2 bottom-2 w-80 z-10 overflow-y-auto shadow-xl'
            : 'w-full lg:w-80 flex-shrink-0'
          }>
            <Card>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{pastoDetalhe.nome}</h2>
                    {pastoDetalhe.modulo_nome && (
                      <p className="text-xs text-gray-500">Módulo: {pastoDetalhe.modulo_nome}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setPastoDetalhe(null)
                      setPopup(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Fechar detalhes"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  {pastoDetalhe.setor && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Setor:</span>
                      <span className="font-medium">{pastoDetalhe.setor}</span>
                    </div>
                  )}
                  {pastoDetalhe.tipo && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo:</span>
                      <span className="font-medium">{pastoDetalhe.tipo}</span>
                    </div>
                  )}
                  {pastoDetalhe.area_total_ha != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Área total:</span>
                      <span className="font-medium">{pastoDetalhe.area_total_ha} ha</span>
                    </div>
                  )}
                  {pastoDetalhe.area_util_ha != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Área útil:</span>
                      <span className="font-medium">{pastoDetalhe.area_util_ha} ha</span>
                    </div>
                  )}
                  {pastoDetalhe.especie && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Espécie:</span>
                      <span className="font-medium">{pastoDetalhe.especie}</span>
                    </div>
                  )}
                  {pastoDetalhe.metragem_cocho_m != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cocho:</span>
                      <span className="font-medium">{pastoDetalhe.metragem_cocho_m} m</span>
                    </div>
                  )}
                  {pastoDetalhe.fonte_agua_principal && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Água:</span>
                      <span className="font-medium">{pastoDetalhe.fonte_agua_principal}</span>
                    </div>
                  )}
                  {pastoDetalhe.possui_deposito != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Depósito:</span>
                      <span className="font-medium">{pastoDetalhe.possui_deposito ? 'Sim' : 'Não'}</span>
                    </div>
                  )}
                </div>

                {/* Lote atual */}
                {pastoDetalhe.lote_atual && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Lote Atual</p>
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{pastoDetalhe.lote_atual.nome}</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-600">
                        <span>Cabeças:</span>
                        <span className="font-medium text-gray-800">{pastoDetalhe.lote_atual.n_cabecas}</span>
                        {pastoDetalhe.lote_atual.raca && (
                          <>
                            <span>Raça:</span>
                            <span className="font-medium text-gray-800">{pastoDetalhe.lote_atual.raca}</span>
                          </>
                        )}
                        {pastoDetalhe.lote_atual.sexo && (
                          <>
                            <span>Sexo:</span>
                            <span className="font-medium text-gray-800">{pastoDetalhe.lote_atual.sexo}</span>
                          </>
                        )}
                        {pastoDetalhe.lote_atual.peso_medio_atual_kg != null && (
                          <>
                            <span>Peso médio:</span>
                            <span className="font-medium text-gray-800">
                              {pastoDetalhe.lote_atual.peso_medio_atual_kg} kg
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bebedouros */}
                {pastoDetalhe.bebedouros.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Bebedouros</p>
                    <div className="flex flex-wrap gap-1">
                      {pastoDetalhe.bebedouros.map((b) => (
                        <span key={b.id} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                          {b.nome}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ações: editar pasto, editar geometria e remover geometria */}
                <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/controller/pastos?pasto=${pastoDetalhe.id}`)}
                    className="w-full"
                  >
                    Editar Pasto
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => iniciarEdicaoGeometria(pastoDetalhe.id, pastoDetalhe.nome)}
                    className="w-full text-blue-600 hover:text-blue-700 border-blue-200"
                  >
                    Editar Geometria
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => removerGeometriaPasto(pastoDetalhe.id, pastoDetalhe.nome)}
                    className="w-full text-red-600 hover:text-red-700 border-red-200"
                  >
                    Remover do Mapa
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Side Panel: detalhes da estrada (overlay flutuante em tela cheia) */}
        {estradaDetalhe && (
          <div className={modoTelaCheia
            ? 'absolute top-2 right-2 bottom-2 w-80 z-10 overflow-y-auto shadow-xl'
            : 'w-full lg:w-80 flex-shrink-0'
          }>
            <Card>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{estradaDetalhe.nome}</h2>
                    <p className="text-xs text-gray-500">Estrada interna</p>
                  </div>
                  <button
                    onClick={() => setEstradaDetalhe(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Comprimento:</span>
                    <span className="font-medium">
                      {estradas.find((e) => e.id === estradaDetalhe.id)?.geometria_geojson?.features?.[0]?.geometry?.type === 'LineString'
                        ? `${(calcularComprimentoEstrada(estradas.find((e) => e.id === estradaDetalhe.id)?.geometria_geojson?.features?.[0] as GeoJSON.Feature<GeoJSON.LineString>)).toFixed(0)} m`
                        : '—'
                      }
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
                  <Button
                    variant="secondary"
                    onClick={() => iniciarEdicaoEstrada(estradaDetalhe.id, estradaDetalhe.nome)}
                    className="w-full"
                  >
                    Editar Geometria
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => removerEstrada(estradaDetalhe.id)}
                    className="w-full"
                  >
                    Remover Estrada
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Side Panel: detalhes do ponto de interesse */}
        {pontoDetalhe && (
          <div className={modoTelaCheia
            ? 'absolute top-2 right-2 bottom-2 w-80 z-10 overflow-y-auto shadow-xl'
            : 'w-full lg:w-80 flex-shrink-0'
          }>
            <Card>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: corPonto(pontoDetalhe.tipo) }} />
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{pontoDetalhe.nome}</h2>
                      <p className="text-xs text-gray-500">{labelPonto(pontoDetalhe.tipo)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPontoDetalhe(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
                  <Button
                    variant="danger"
                    onClick={() => removerPonto(pontoDetalhe.id)}
                    className="w-full"
                  >
                    Remover Ponto
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Modal: associar geometria desenhada a pasto (polígono) ou bebedouro (ponto) */}
      <Modal
        isOpen={showAssocModal}
        onClose={cancelarAssociacao}
        title={featureDesenhada?.geometry.type === 'Point' ? 'Associar ao Bebedouro' : 'Associar ao Pasto'}
        size="md"
      >
        <div className="space-y-4">
          {featureDesenhada?.geometry.type === 'Point' ? (
            <>
              {buscandoPasto ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Detectando pasto...
                </div>
              ) : pastoDetectado ? (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                    Ponto marcado dentro do pasto <strong>{pastoDetectado.nome}</strong>.
                  </div>

                  {bebedourosDoPasto.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                      Este pasto não tem bebedouros associados, ou todos já possuem localização marcada.
                      Associe bebedouros ao pasto na página de Pastos antes de marcá-los no mapa.
                    </div>
                  ) : bebedourosDoPasto.length === 1 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Este pasto tem apenas um bebedouro sem localização. Confirme para salvá-lo:
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 font-medium">
                        {bebedourosDoPasto[0].nome}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        Selecione qual bebedouro deste pasto está nesta localização:
                      </p>
                      <Select
                        label="Bebedouro"
                        value={pastoSelecionadoAssoc}
                        onChange={(value) => setPastoSelecionadoAssoc(value)}
                        options={[
                          { value: '', label: 'Selecione um bebedouro...' },
                          ...bebedourosDoPasto.map((b) => ({ value: b.id, label: b.nome })),
                        ]}
                      />
                    </>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={cancelarAssociacao}>
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      onClick={salvarGeometriaBebedouro}
                      disabled={!pastoSelecionadoAssoc || salvando || bebedourosDoPasto.length === 0}
                    >
                      {salvando ? 'Salvando...' : 'Salvar Localização'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                    O ponto foi marcado fora de qualquer pasto com geometria.
                    Bebedouros só podem ser marcados dentro de pastos. Desenhe o pasto primeiro ou
                    marque o ponto dentro de um pasto já delimitado.
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={cancelarAssociacao}>
                      Entendi
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Selecione qual pasto cadastrado esta delimitação representa. A geometria será salva no banco.
              </p>

              {pastosSemGeometria.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Todos os pastos já possuem geometria. Para reassociar, remova a geometria existente na página de Pastos.
                </div>
              ) : (
                <Select
                  label="Pasto"
                  value={pastoSelecionadoAssoc}
                  onChange={(value) => setPastoSelecionadoAssoc(value)}
                  options={[
                    { value: '', label: 'Selecione um pasto...' },
                    ...pastosSemGeometria.map((p) => ({ value: p.id, label: p.nome })),
                  ]}
                />
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={cancelarAssociacao}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={salvarGeometriaPasto}
                  disabled={!pastoSelecionadoAssoc || salvando || pastosSemGeometria.length === 0}
                >
                  {salvando ? 'Salvando...' : 'Salvar Geometria'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal: confirmar remoção de geometria */}
      <Modal
        isOpen={confirmarRemocao !== null}
        onClose={() => setConfirmarRemocao(null)}
        title="Remover do Mapa"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Tem certeza que deseja remover a geometria de{' '}
            <strong>{confirmarRemocao?.tipo === 'pasto' ? 'pasto' : 'bebedouro'}</strong>{' '}
            <strong>{confirmarRemocao?.nome}</strong> do mapa?
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            O cadastro não será excluído, apenas a delimitação geográfica será removida.
            Você poderá redesenhar ou reimportar a geometria depois.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setConfirmarRemocao(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={confirmarRemocaoGeometria}
              disabled={removendo}
              className="bg-red-600 hover:bg-red-700"
            >
              {removendo ? 'Removendo...' : 'Remover Geometria'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: confirmar remoção em lote */}
      <Modal
        isOpen={showRemocaoLoteModal}
        onClose={() => setShowRemocaoLoteModal(false)}
        title="Remover Geometrias em Lote"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Tem certeza que deseja remover a geometria de{' '}
            <strong>{pastosSelecionados.size} pasto(s)</strong> do mapa?
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            Os cadastros não serão excluídos, apenas as delimitações geográficas serão removidas.
            Você poderá redesenhar ou reimportar as geometrias depois.
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input
              type="checkbox"
              checked={removerBebedourosLote}
              onChange={(e) => setRemoverBebedourosLote(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Remover também as geometrias dos bebedouros dentro destes pastos
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowRemocaoLoteModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={confirmarRemocaoLote}
              disabled={removendoLote}
              className="bg-red-600 hover:bg-red-700"
            >
              {removendoLote ? 'Removendo...' : `Remover ${pastosSelecionados.size} Pasto(s)`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: nomear estrada */}
      <Modal
        isOpen={showEstradaModal}
        onClose={cancelarEstrada}
        title="Nomear Estrada"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Digite um nome para esta estrada. Ela será usada para cálculo de rotas dentro da fazenda.
          </p>
          <input
            type="text"
            value={nomeEstrada}
            onChange={(e) => setNomeEstrada(e.target.value)}
            placeholder="Ex: Estrada principal, Acesso ao curral, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && nomeEstrada.trim()) salvarEstrada() }}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={cancelarEstrada}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={salvarEstrada}
              disabled={!nomeEstrada.trim() || salvando}
            >
              {salvando ? 'Salvando...' : 'Salvar Estrada'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: nomear ponto de interesse */}
      <Modal
        isOpen={showPontoModal}
        onClose={cancelarPonto}
        title="Marcar Ponto de Interesse"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={tipoPontoSelecionado}
              onChange={(e) => setTipoPontoSelecionado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {TIPOS_PONTO.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              value={nomePonto}
              onChange={(e) => setNomePonto(e.target.value)}
              placeholder="Ex: Fábrica de ração 1, Curral de manejo, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && nomePonto.trim()) salvarPonto() }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={cancelarPonto}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={salvarPonto}
              disabled={!nomePonto.trim() || salvando}
            >
              {salvando ? 'Salvando...' : 'Salvar Ponto'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
