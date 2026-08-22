import { BookOpen, Building2, MapPin, MapPinOff, RotateCcw, TrainFront } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DetailsPanel } from './components/DetailsPanel'
import { MapView } from './components/MapView'
import { MetroDetailsPanel } from './components/MetroDetailsPanel'
import { SearchBox } from './components/SearchBox'
import { SourcesPanel } from './components/SourcesPanel'
import { assetUrl } from './lib/assets'
import type { MetroStationSelection } from './lib/metroLabels'
import { makeSearchRecords } from './lib/search'
import { mergeCuratedParkFeatures } from './lib/parkLabels'
import type { AppData, HighlightedJurisdiction, HistoricalFeature } from './types'

function App() {
  const [data, setData] = useState<AppData>()
  const [loadError, setLoadError] = useState<string>()
  const [mapError, setMapError] = useState<string>()
  const [selectedGroupId, setSelectedGroupId] = useState<string>()
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [landmarksVisible, setLandmarksVisible] = useState(false)
  const [buildingsVisible, setBuildingsVisible] = useState(false)
  const [subwayVisible, setSubwayVisible] = useState(false)
  const [highlightedJurisdiction, setHighlightedJurisdiction] = useState<HighlightedJurisdiction>()
  const [selectedMetroStation, setSelectedMetroStation] = useState<MetroStationSelection>()
  const [mapKey, setMapKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(assetUrl('data/historical-features.geojson')).then((response) => {
        if (!response.ok) throw new Error('历史地名数据加载失败')
        return response.json()
      }),
      fetch(assetUrl('data/curated-parks.geojson')).then((response) => {
        if (!response.ok) throw new Error('现存公园历史名称数据加载失败')
        return response.json()
      }),
      fetch(assetUrl('data/jurisdictions.geojson')).then((response) => {
        if (!response.ok) throw new Error('历史辖区数据加载失败')
        return response.json()
      }),
      fetch(assetUrl('data/sources.json')).then((response) => {
        if (!response.ok) throw new Error('来源数据加载失败')
        return response.json()
      }),
    ])
      .then(([features, curatedParks, jurisdictions, sources]) => {
        if (!cancelled) {
          setData({
            features: mergeCuratedParkFeatures(features, curatedParks),
            jurisdictions,
            sources,
          })
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedGroupId(undefined)
        setSelectedMetroStation(undefined)
        setSourcesOpen(false)
        setHighlightedJurisdiction(undefined)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const searchRecords = useMemo(
    () => (data ? makeSearchRecords(data.features.features) : []),
    [data],
  )
  const selectedFeature = useMemo<HistoricalFeature | undefined>(
    () => data?.features.features.find((feature) => feature.properties.featureGroupId === selectedGroupId),
    [data, selectedGroupId],
  )
  const roadCount = useMemo(
    () =>
      data
        ? new Set(
            data.features.features
              .filter((feature) => feature.properties.kind === 'road')
              .map((feature) => feature.properties.featureGroupId),
          ).size
        : 0,
    [data],
  )
  const landmarkCount = data?.features.features.filter((feature) => feature.properties.kind === 'landmark').length ?? 0

  const handleMapError = useCallback((message?: string) => setMapError(message), [])
  const selectHistoricalFeature = useCallback((groupId: string) => {
    setSelectedMetroStation(undefined)
    setSelectedGroupId(groupId)
  }, [])
  const selectMetroStation = useCallback((station: MetroStationSelection) => {
    setSelectedGroupId(undefined)
    setSelectedMetroStation(station)
  }, [])
  const toggleJurisdiction = useCallback((jurisdiction: HighlightedJurisdiction) => {
    setHighlightedJurisdiction((selected) => selected === jurisdiction ? undefined : jurisdiction)
  }, [])

  if (loadError) {
    return (
      <main className="fatal-state">
        <p className="eyebrow">SHANGHAI · 1928</p>
        <h1>历史数据没有成功抵达</h1>
        <p>{loadError}</p>
        <button type="button" onClick={() => window.location.reload()}>
          重新加载
        </button>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="loading-state" aria-live="polite">
        <div className="loading-mark">滬</div>
        <p>正在展开 1928 年的上海……</p>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <p>SHANGHAI · MCMXXVIII</p>
          <h1>上海 1928</h1>
        </div>

        <SearchBox
          records={searchRecords}
          onSelect={(record) => selectHistoricalFeature(record.featureGroupId)}
        />

        <div className="topbar-actions">
          <button
            type="button"
            className="building-toggle-button"
            aria-pressed={buildingsVisible}
            onClick={() => setBuildingsVisible((visible) => !visible)}
          >
            <Building2 size={16} aria-hidden="true" />
            <span>{buildingsVisible ? '隐藏建筑' : '显示建筑'}</span>
          </button>
          <button
            type="button"
            className="landmark-toggle-button"
            aria-pressed={landmarksVisible}
            onClick={() => setLandmarksVisible((visible) => !visible)}
          >
            {landmarksVisible
              ? <MapPinOff size={16} aria-hidden="true" />
              : <MapPin size={16} aria-hidden="true" />}
            <span>{landmarksVisible ? '隐藏地标' : '显示地标'}</span>
          </button>
          <button
            type="button"
            className="subway-toggle-button"
            aria-pressed={subwayVisible}
            onClick={() => {
              if (subwayVisible) setSelectedMetroStation(undefined)
              setSubwayVisible((visible) => !visible)
            }}
          >
            <TrainFront size={16} aria-hidden="true" />
            <span>{subwayVisible ? '隐藏地铁' : '显示地铁'}</span>
          </button>
          <button type="button" className="sources-button" onClick={() => setSourcesOpen(true)}>
            <BookOpen size={16} aria-hidden="true" />
            <span>资料来源</span>
          </button>
        </div>
      </header>

      <section className="map-stage">
        <MapView
          key={mapKey}
          features={data.features}
          jurisdictions={data.jurisdictions}
          buildingsVisible={buildingsVisible}
          landmarksVisible={landmarksVisible}
          subwayVisible={subwayVisible}
          highlightedJurisdiction={highlightedJurisdiction}
          selectedGroupId={selectedGroupId}
          selectedMetroStation={selectedMetroStation}
          onSelect={selectHistoricalFeature}
          onSelectMetro={selectMetroStation}
          onMapError={handleMapError}
        />

        <div className="map-caption" aria-label="地图说明">
          <span className="caption-rule" aria-hidden="true" />
          <p>现代街廓 · 民国旧名</p>
          <small>
            {roadCount} 条历史道路 · {landmarkCount} 处地标
            {subwayVisible ? ' · 地铁站名为推定' : ''}
          </small>
        </div>

        <div className="map-legend" aria-label="历史辖区图例">
          <button
            type="button"
            aria-pressed={highlightedJurisdiction === 'french-concession'}
            onClick={() => toggleJurisdiction('french-concession')}
          >
            <i className="legend-french" aria-hidden="true" />French Quarter
          </button>
          <button
            type="button"
            aria-pressed={highlightedJurisdiction === 'international-settlement'}
            onClick={() => toggleJurisdiction('international-settlement')}
          >
            <i className="legend-international" aria-hidden="true" />Commerce District
          </button>
          <button
            type="button"
            aria-pressed={highlightedJurisdiction === 'old-city'}
            onClick={() => toggleJurisdiction('old-city')}
          >
            <i className="legend-chinese" aria-hidden="true" />Old City
          </button>
        </div>

        {mapError && (
          <div className="map-error" role="alert">
            <span>现代底图暂时无法载入，历史数据仍可检索。</span>
            <button
              type="button"
              onClick={() => {
                setMapError(undefined)
                setMapKey((value) => value + 1)
              }}
            >
              <RotateCcw size={14} aria-hidden="true" />重试
            </button>
          </div>
        )}
      </section>

      <DetailsPanel feature={selectedFeature} sources={data.sources} onClose={() => setSelectedGroupId(undefined)} />
      <MetroDetailsPanel station={selectedMetroStation} onClose={() => setSelectedMetroStation(undefined)} />
      <SourcesPanel open={sourcesOpen} sources={data.sources} onClose={() => setSourcesOpen(false)} />
    </main>
  )
}

export default App
