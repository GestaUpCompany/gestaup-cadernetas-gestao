// Hook: geolocalizacao do dispositivo + import KML/KMZ
import { useEffect, useRef, useState } from 'react'
import { kml } from '@tmcw/togeojson'
import { strFromU8, unzipSync } from 'fflate'
import type { MapRef } from 'react-map-gl/maplibre'

interface ImportStatus { type: 'success' | 'error' | 'info'; msg: string }
interface UserLocation { lng: number; lat: number; accuracy: number }

interface Props {
  mapRef: React.RefObject<MapRef | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
}

export function useMapGeolocalizacao({ mapRef, fileInputRef }: Props) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [localizando, setLocalizando] = useState(false)
  const [featuresImportadas, setFeaturesImportadas] = useState<GeoJSON.FeatureCollection | null>(null)
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null)
  const watchIdRef = useRef<number | null>(null)

  // Auto-dismiss do importStatus após 10 segundos
  useEffect(() => {
    if (!importStatus) return
    const t = setTimeout(() => setImportStatus(null), 10000)
    return () => clearTimeout(t)
  }, [importStatus])

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

  return {
    userLocation,
    localizando,
    featuresImportadas,
    importStatus,
    setImportStatus,
    setFeaturesImportadas,
    handleLocalizarDispositivo,
    handleFileImport,
  }
}
