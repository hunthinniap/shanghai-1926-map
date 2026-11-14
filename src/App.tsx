import { BookOpen, Building2, Landmark, MapPin, MapPinOff, RotateCcw, TrainFront } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { metroEnabled } from './config'
import { DetailsPanel } from './components/DetailsPanel'
import { MapView } from './components/MapView'
import { MetroDetailsPanel } from './components/MetroDetailsPanel'
import { HeritageDetailsPanel } from './components/HeritageDetailsPanel'
import { HeritageRouteButton } from './components/HeritageRoute'
import { SearchBox } from './components/SearchBox'
import { SourcesPanel } from './components/SourcesPanel'
import { TimelineControl } from './components/TimelineControl'
import { historicalFeatureAtYear, heritageFeatureAtYear, historicalSiteVisibleAtYear } from './lib/siteTimeline'
import { linkedHeritageBuildingPeriod, historicalBuildingPeriod, timelineMinYear, timelineMaxYear, visibleAtYear } from './lib/buildingTimeline'
import { assetUrl } from './lib/assets'
import type { HeritageBuildingCollection, HeritageBuildingFeature } from './lib/heritageBuildings'
import { applyHeritageUses, heritageUseCategories, type HeritageUseIndex } from './lib/heritageUses'
import { applyReviewedHeritageConstructionDates } from './lib/heritageConstructionDates'
import type { MetroStationSelection } from './lib/metroLabels'
import { makePlaceSearchRecords } from './lib/search'
import { mergeCuratedParkFeatures } from './lib/parkLabels'
import { mergeLandmarkSites } from './lib/landmarkSites'
import { landmarkSiteLinksWithSources } from './data/landmarkSiteSourceAdditions'
import { linkHeritageLandmarks, withReviewedHeritageAliases } from './lib/heritageLandmarkLinks'
import { heritageLandmarkLinks } from './data/heritageLandmarkLinks'
import { userApprovedHeritageSiteLinks } from './data/userApprovedHeritageSites'
import { reviewedLandmarkIdentities } from './data/reviewedLandmarkIdentities'
import { applyReviewedLandmarkIdentities } from './lib/reviewedLandmarkIdentities'
import { applyReviewedAddressUses } from './lib/reviewedAddressUses'
import { reviewedAddressUses } from './data/reviewedAddressUses'
import { applyReviewedBridgeHistories } from './data/bridgeHistories'
import type { AppData, HighlightedJurisdiction, HistoricalFeature } from './types'

const reviewedHeritageLinks = [...heritageLandmarkLinks, ...userApprovedHeritageSiteLinks]

function App() {
  const [data, setData] = useState<AppData>()
  const [loadError, setLoadError] = useState<string>()
  const [mapError, setMapError] = useState<string>()
  const [selectedGroupId, setSelectedGroupId] = useState<string>()
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [landmarksVisible, setLandmarksVisible] = useState(false)
  const [heritageVisible, setHeritageVisible] = useState(false)
  const [heritageBuildings, setHeritageBuildings] = useState<HeritageBuildingCollection>()
  const [heritageLoading, setHeritageLoading] = useState(false)
  const [heritageError, setHeritageError] = useState<string>()
  const [heritageRetry, setHeritageRetry] = useState(0)
  const [selectedHeritage, setSelectedHeritage] = useState<HeritageBuildingFeature>()
  const [buildingsVisible, setBuildingsVisible] = useState(false)
  const [subwayVisible, setSubwayVisible] = useState(false)
  const [highlightedJurisdiction, setHighlightedJurisdiction] = useState<HighlightedJurisdiction>()
  const [selectedMetroStation, setSelectedMetroStation] = useState<MetroStationSelection>()
  const [mapKey, setMapKey] = useState(0)
  const [timelineYear, setTimelineYear] = useState<number | null>(null)
  const [includeUnknownDates, setIncludeUnknownDates] = useState(false)
  const [searchHasQuery, setSearchHasQuery] = useState(false)
  const selectedNeedsHeritage = Boolean(selectedGroupId && data?.features.features.some((feature) =>
    feature.properties.featureGroupId === selectedGroupId
    && reviewedHeritageLinks.some((link) => [link, ...(link.additionalLandmarks ?? [])]
      .some((member) => member.landmarkFeatureId === feature.properties.id))))
  const needsHeritage = heritageVisible || landmarksVisible || selectedNeedsHeritage || searchHasQuery

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
            features: applyReviewedBridgeHistories(applyReviewedLandmarkIdentities(
              mergeLandmarkSites(mergeCuratedParkFeatures(
                applyReviewedAddressUses(features, reviewedAddressUses), curatedParks,
              ), landmarkSiteLinksWithSources),
              reviewedLandmarkIdentities,
            )),
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
    if (!needsHeritage || heritageBuildings) return
    const controller = new AbortController()
    setHeritageLoading(true)
    setHeritageError(undefined)
    Promise.all([
      fetch(assetUrl('data/shanghai-excellent-historical-buildings/map-buildings.geojson'), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('历史建筑数据加载失败')
        return response.json() as Promise<HeritageBuildingCollection>
      }),
      fetch(assetUrl('data/shanghai-excellent-historical-buildings/historical-use-categories.json'), { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error('历史用途数据加载失败')
          return response.json() as Promise<HeritageUseIndex>
        }),
    ])
      .then(([collection, uses]) => {
        if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
          throw new Error('历史建筑数据格式有误')
        }
        if (!controller.signal.aborted) {
          setHeritageBuildings(applyHeritageUses(applyReviewedHeritageConstructionDates(collection), uses))
          setHeritageLoading(false)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHeritageError('历史建筑暂时无法载入')
          setHeritageLoading(false)
        }
      })
    return () => controller.abort()
  }, [needsHeritage, heritageBuildings, heritageRetry])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.querySelector('dialog[open]')) return
        setSelectedGroupId(undefined)
        setSelectedMetroStation(undefined)
        setSelectedHeritage(undefined)
        setSourcesOpen(false)
        setHighlightedJurisdiction(undefined)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const linkedBuildings = useMemo(() => data
    ? linkHeritageLandmarks(data.features, heritageBuildings, reviewedHeritageLinks) : undefined,
  [data, heritageBuildings])
  const historicalPeriods = useMemo(() => new Map(
    (linkedBuildings?.features.features ?? []).map(feature => [feature.properties.featureGroupId,
      historicalBuildingPeriod(feature, linkedBuildings?.byGroupId.get(feature.properties.featureGroupId))]),
  ), [linkedBuildings])
  const heritagePeriods = useMemo(() => new Map(
    (heritageBuildings?.features ?? []).map(feature => [feature.properties.officialId,
      linkedHeritageBuildingPeriod(feature, linkedBuildings?.byOfficialId.get(feature.properties.officialId))]),
  ), [heritageBuildings, linkedBuildings])
  const datedFeatures = useMemo(() => linkedBuildings && ({ ...linkedBuildings.features,
    features: linkedBuildings.features.features.filter(feature => feature.properties.kind === 'road'
      || historicalSiteVisibleAtYear(feature, historicalPeriods.get(feature.properties.featureGroupId)!, timelineYear, includeUnknownDates))
      .map(feature => historicalFeatureAtYear(feature, timelineYear)),
  }), [linkedBuildings, historicalPeriods, timelineYear, includeUnknownDates])
  const datedHeritage = useMemo(() => heritageBuildings && ({ ...heritageBuildings,
    features: heritageBuildings.features.filter(feature =>
      visibleAtYear(heritagePeriods.get(feature.properties.officialId)!, timelineYear, includeUnknownDates))
      .map(feature => heritageFeatureAtYear(feature, timelineYear, linkedBuildings?.byOfficialId.get(feature.properties.officialId))),
  }), [heritageBuildings, heritagePeriods, linkedBuildings, timelineYear, includeUnknownDates])
  const searchRecords = useMemo(
    () => makePlaceSearchRecords(
      datedFeatures ? withReviewedHeritageAliases(datedFeatures.features, reviewedHeritageLinks) : [],
      heritageBuildings?.features ?? [],
      new Map([...(linkedBuildings?.byOfficialId ?? [])].map(([id, linked]) => [id, linked.landmark.properties.featureGroupId])),
    ),
    [datedFeatures, heritageBuildings, linkedBuildings],
  )
  const selectedFeature = useMemo<HistoricalFeature | undefined>(
    () => datedFeatures?.features.find((feature) => feature.properties.featureGroupId === selectedGroupId),
    [datedFeatures, selectedGroupId],
  )
  const rawSelectedLinkedBuilding = selectedHeritage
    ? linkedBuildings?.byOfficialId.get(selectedHeritage.properties.officialId)
    : selectedGroupId ? linkedBuildings?.byGroupId.get(selectedGroupId) : undefined
  const selectedLinkedBuilding = rawSelectedLinkedBuilding && { ...rawSelectedLinkedBuilding,
    landmark: historicalFeatureAtYear(rawSelectedLinkedBuilding.landmark, timelineYear) }
  const activeOfficialId = (selectedLinkedBuilding?.heritage ?? selectedHeritage)?.properties.officialId
  const activeHeritage = datedHeritage?.features.find(feature => feature.properties.officialId === activeOfficialId)
  const activeGroupId = selectedLinkedBuilding?.landmark.properties.featureGroupId ?? selectedGroupId
  // When both layers are enabled, use the heritage marker for shared buildings.
  const mapFeatures = useMemo(() => {
    if (!datedFeatures) return data?.features
    if (!heritageVisible) return datedFeatures
    const visibleIds = new Set(datedHeritage?.features.map(feature => feature.properties.officialId))
    return { ...datedFeatures, features: datedFeatures.features.filter(feature =>
      !feature.properties.heritageOfficialId || !visibleIds.has(feature.properties.heritageOfficialId)) }
  }, [data, datedFeatures, datedHeritage, heritageVisible])
  const visibleBuildingCount = (landmarksVisible
    ? mapFeatures?.features.filter(feature => feature.properties.kind === 'landmark').length ?? 0 : 0)
    + (heritageVisible ? datedHeritage?.features.length ?? 0 : 0)
  const unknownBuildingCount = useMemo(() => {
    const heritageIds = new Set(heritageVisible ? heritageBuildings?.features.map(feature => feature.properties.officialId) : [])
    const landmarks = landmarksVisible ? (linkedBuildings?.features.features ?? []).filter(feature =>
      feature.properties.kind === 'landmark'
      && !heritageIds.has(feature.properties.heritageOfficialId ?? '')
      && historicalPeriods.get(feature.properties.featureGroupId)?.startYear === undefined).length : 0
    return landmarks + (heritageVisible ? [...heritagePeriods.values()].filter(period => period.startYear === undefined).length : 0)
  }, [heritageVisible, landmarksVisible, heritageBuildings, linkedBuildings, historicalPeriods, heritagePeriods])

  useEffect(() => {
    if (timelineYear === null) return
    if (selectedGroupId && historicalPeriods.has(selectedGroupId)
      && data?.features.features.some(feature => feature.properties.featureGroupId === selectedGroupId && feature.properties.kind === 'landmark')
      && !datedFeatures?.features.some(feature => feature.properties.featureGroupId === selectedGroupId)) {
      setSelectedGroupId(undefined)
    }
    if (selectedHeritage && !visibleAtYear(heritagePeriods.get(selectedHeritage.properties.officialId)!, timelineYear, includeUnknownDates)) {
      setSelectedHeritage(undefined)
    }
  }, [timelineYear, includeUnknownDates, historicalPeriods, heritagePeriods, datedFeatures, data, selectedGroupId, selectedHeritage])
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
  const landmarkCount = linkedBuildings?.features.features.filter((feature) => feature.properties.kind === 'landmark').length ?? 0
  const buildingRecordCount = useMemo(
    () => data
      ? new Set(data.features.features.flatMap(
          (feature) => feature.properties.sourceRecordIds ?? [],
        )).size
      : 0,
    [data],
  )

  const handleMapError = useCallback((message?: string) => setMapError(message), [])
  const selectHistoricalFeature = useCallback((groupId: string) => {
    setSelectedMetroStation(undefined)
    setSelectedHeritage(undefined)
    setSelectedGroupId(groupId)
  }, [])
  const selectMetroStation = useCallback((station: MetroStationSelection) => {
    setSelectedGroupId(undefined)
    setSelectedHeritage(undefined)
    setSelectedMetroStation(station)
  }, [])
  const selectHeritageBuilding = useCallback((feature: HeritageBuildingFeature) => {
    setSelectedGroupId(undefined)
    setSelectedMetroStation(undefined)
    setSelectedHeritage(feature)
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
          <p>SHANGHAI</p>
          <h1>上海</h1>
        </div>

        <SearchBox
          records={searchRecords}
          onQueryChange={(query) => setSearchHasQuery(Boolean(query.trim()))}
          loading={heritageLoading}
          onSelect={(record) => {
            if (record.heritageOfficialId) {
              const building = heritageBuildings?.features.find(feature => feature.properties.officialId === record.heritageOfficialId)
              if (!building) return
              // Keep the selected point and card visible under the same date filter.
              if (!datedHeritage?.features.some(feature => feature.properties.officialId === record.heritageOfficialId)) setTimelineYear(null)
              setHeritageVisible(true)
              selectHeritageBuilding(building)
            } else selectHistoricalFeature(record.featureGroupId)
          }}
        />

        <div className="topbar-actions">
          <HeritageRouteButton />
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
            onClick={() => {
              if (landmarksVisible && (selectedLinkedBuilding || selectedNeedsHeritage) && !heritageVisible) {
                setSelectedGroupId(undefined)
                setSelectedHeritage(undefined)
              }
              setLandmarksVisible((visible) => !visible)
            }}
          >
            {landmarksVisible
              ? <MapPinOff size={16} aria-hidden="true" />
              : <MapPin size={16} aria-hidden="true" />}
            <span>{landmarksVisible ? '隐藏地标' : '显示地标'}</span>
          </button>
          <button
            type="button"
            className="heritage-toggle-button"
            aria-pressed={heritageVisible}
            aria-busy={heritageVisible && heritageLoading}
            title={heritageVisible ? '隐藏历史建筑' : '显示历史建筑'}
            onClick={() => {
              if (heritageVisible) {
                if (selectedLinkedBuilding && landmarksVisible) {
                  setSelectedGroupId(selectedLinkedBuilding.landmark.properties.featureGroupId)
                } else if (selectedLinkedBuilding || (selectedNeedsHeritage && !landmarksVisible)) setSelectedGroupId(undefined)
                setSelectedHeritage(undefined)
              }
              setHeritageVisible((visible) => !visible)
            }}
          >
            <Landmark size={16} aria-hidden="true" />
            <span>{heritageVisible ? '隐藏历史建筑' : '显示历史建筑'}</span>
          </button>
          {metroEnabled && (
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
          )}
          <button type="button" className="sources-button" onClick={() => setSourcesOpen(true)}>
            <BookOpen size={16} aria-hidden="true" />
            <span>资料来源</span>
          </button>
        </div>
      </header>

      <section className="map-stage">
        <MapView
          key={mapKey}
          features={mapFeatures ?? data.features}
          timelineYear={timelineYear}
          jurisdictions={data.jurisdictions}
          buildingsVisible={buildingsVisible}
          landmarksVisible={landmarksVisible}
          heritageVisible={heritageVisible}
          heritageBuildings={datedHeritage}
          selectedHeritage={heritageVisible && activeHeritage
            && visibleAtYear(heritagePeriods.get(activeHeritage.properties.officialId)!, timelineYear, includeUnknownDates) ? activeHeritage : undefined}
          subwayVisible={metroEnabled && subwayVisible}
          highlightedJurisdiction={highlightedJurisdiction}
          selectedGroupId={selectedLinkedBuilding && activeHeritage && heritageVisible ? undefined : activeGroupId}
          selectedMetroStation={metroEnabled ? selectedMetroStation : undefined}
          onSelect={selectHistoricalFeature}
          onSelectMetro={selectMetroStation}
          onSelectHeritage={selectHeritageBuilding}
          onMapError={handleMapError}
        />

        <div className="map-caption" aria-label="地图说明">
          <span className="caption-rule" aria-hidden="true" />
          <p>现代街廓 · {timelineYear === null ? '民国旧名' : `${timelineYear} 年路名`}</p>
          <small>
            {roadCount} 条历史道路 · {landmarkCount} 处地标
            {buildingRecordCount ? `（${buildingRecordCount} 条建筑原始记录）` : ''}
            {metroEnabled && subwayVisible ? ' · 地铁站名为推定' : ''}
          </small>
          {heritageVisible && !heritageError && (
            <small className="heritage-caption" role="status">
              <i aria-hidden="true" />
              {datedHeritage ? `${datedHeritage.features.length} 处历史建筑参考点` : '正在载入历史建筑……'}
            </small>
          )}
          {heritageVisible && heritageBuildings && (
            <details className="heritage-use-legend">
              <summary>历史用途图例</summary>
              <div>{heritageUseCategories.map(category => (
                <span key={category.id}><i style={{ backgroundColor: category.color }}>{category.symbol}</i>{category.label}</span>
              ))}<span><i style={{ backgroundColor: '#817c70' }}>?</i>用途待核</span></div>
              <small>按历史原用途初分；后建建筑以卡片年代为准。</small>
            </details>
          )}
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

        <TimelineControl year={timelineYear} minYear={timelineMinYear} maxYear={timelineMaxYear}
          visibleCount={visibleBuildingCount} unknownCount={unknownBuildingCount}
          includeUnknown={includeUnknownDates} loading={needsHeritage && heritageLoading}
          onYearChange={setTimelineYear} onIncludeUnknownChange={setIncludeUnknownDates} />

        {needsHeritage && heritageError && (
          <div className="heritage-load-error" role="alert">
            <span>{heritageError}</span>
            <button type="button" onClick={() => setHeritageRetry((value) => value + 1)}>
              <RotateCcw size={14} aria-hidden="true" />重试
            </button>
          </div>
        )}

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

      <DetailsPanel feature={selectedLinkedBuilding && activeHeritage ? undefined : selectedFeature} sources={data.sources}
        timelineYear={timelineYear} onClose={() => setSelectedGroupId(undefined)} />
      {metroEnabled && <MetroDetailsPanel station={selectedMetroStation} onClose={() => setSelectedMetroStation(undefined)} />}
      <HeritageDetailsPanel feature={activeHeritage} linked={selectedLinkedBuilding} onClose={() => {
        setSelectedHeritage(undefined)
        if (selectedLinkedBuilding) setSelectedGroupId(undefined)
      }} />
      <SourcesPanel open={sourcesOpen} sources={data.sources} onClose={() => setSourcesOpen(false)} />
    </main>
  )
}

export default App
