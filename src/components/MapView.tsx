import { useEffect, useRef } from 'react'
import maplibregl, {
  AttributionControl,
  LngLatBounds,
  Map,
  NavigationControl,
  type MapLayerMouseEvent,
} from 'maplibre-gl'
import type { FeatureCollection, Geometry, Position } from 'geojson'
import type {
  HighlightedJurisdiction,
  HistoricalFeature,
  HistoricalFeatureCollection,
} from '../types'
import { assetUrl } from '../lib/assets'
import {
  buildMetroStationLabelIndex,
  type MetroStationLabelEntry,
  type MetroStationSelection,
} from '../lib/metroLabels'
import {
  buildRoadLabelIndex,
  roadModernNameForGroup,
  type RoadLabelEntry,
} from '../lib/roadLabels'
import { buildParkLabelIndex, type ParkLabelEntry } from '../lib/parkLabels'

interface MapViewProps {
  features: HistoricalFeatureCollection
  jurisdictions: FeatureCollection
  buildingsVisible: boolean
  landmarksVisible: boolean
  subwayVisible: boolean
  highlightedJurisdiction?: HighlightedJurisdiction
  selectedGroupId?: string
  selectedMetroStation?: MetroStationSelection
  onSelect: (groupId: string) => void
  onSelectMetro: (station: MetroStationSelection) => void
  onMapError: (message?: string) => void
}

const interactiveLayers = [
  'historical-road-hit',
  'historical-road-label-major',
  'historical-road-label-minor',
  'historical-landmark-point',
  'historical-landmark-area',
  'historical-landmark-label',
  'historical-park-hit',
  'historical-park-label',
  'historical-park-curated-hit',
  'historical-park-curated-label',
  'historical-subway-station-hit',
  'historical-subway-station',
  'historical-subway-station-label',
]

const landmarkLayers = [
  'historical-landmark-area',
  'historical-landmark-point',
  'historical-landmark-label',
  'selected-landmark-area',
  'selected-landmark',
]

const subwayLayers = [
  'historical-subway-track',
  'historical-subway-casing',
  'historical-subway-line',
  'historical-subway-station-hit',
  'historical-subway-station',
  'historical-subway-station-label',
  'selected-subway-station',
]

const selectedRoadLayers = ['selected-road-casing', 'selected-road']

const baseTransitLayers = [
  'tunnel_transit_rail',
  'tunnel_transit_rail_hatching',
  'road_transit_rail',
  'road_transit_rail_hatching',
  'bridge_transit_rail',
  'bridge_transit_rail_hatching',
]

const buildingLayers = ['building']

function setBuildingVisibility(map: Map, visible: boolean) {
  const visibility = visible ? 'visible' : 'none'
  buildingLayers.forEach((layerId) => {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility)
  })
}

function setLandmarkVisibility(map: Map, visible: boolean) {
  const visibility = visible ? 'visible' : 'none'
  landmarkLayers.forEach((layerId) => {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility)
  })
}

function setSubwayVisibility(map: Map, visible: boolean) {
  const visibility = visible ? 'visible' : 'none'
  subwayLayers.forEach((layerId) => {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility)
  })
}

function selectedRoadFilter(modernName?: string): maplibregl.FilterSpecification {
  if (!modernName) return ['==', ['get', 'name'], '__no_selected_road__']
  return [
    'any',
    ...['name:nonlatin', 'name_zh', 'name', 'name:latin', 'name_en'].map(
      (property) => ['==', ['get', property], modernName],
    ),
  ] as maplibregl.FilterSpecification
}

function setSelectedRoad(map: Map, modernName?: string) {
  const filter = selectedRoadFilter(modernName)
  selectedRoadLayers.forEach((layerId) => {
    if (map.getLayer(layerId)) map.setFilter(layerId, filter)
  })
}

function highlightedJurisdictionFilter(
  jurisdiction?: HighlightedJurisdiction,
): maplibregl.FilterSpecification {
  return ['==', ['get', 'jurisdiction'], jurisdiction ?? '__no_highlighted_jurisdiction__']
}

function setHighlightedJurisdiction(map: Map, jurisdiction?: HighlightedJurisdiction) {
  const filter = highlightedJurisdictionFilter(jurisdiction)
  for (const layerId of ['highlighted-jurisdiction-fill', 'highlighted-jurisdiction-outline']) {
    if (map.getLayer(layerId)) map.setFilter(layerId, filter)
  }
}

function walkCoordinates(value: unknown, bounds: LngLatBounds) {
  if (!Array.isArray(value)) return
  if (typeof value[0] === 'number' && typeof value[1] === 'number') {
    bounds.extend([value[0], value[1]])
    return
  }
  value.forEach((part) => walkCoordinates(part, bounds))
}

function groupFeatures(collection: HistoricalFeatureCollection, groupId?: string): HistoricalFeature[] {
  if (!groupId) return []
  return collection.features.filter((feature) => feature.properties.featureGroupId === groupId)
}

function selectedCollection(collection: HistoricalFeatureCollection, groupId?: string): FeatureCollection<Geometry> {
  return { type: 'FeatureCollection', features: groupFeatures(collection, groupId) }
}

function roadNameExpression(names: string[]): maplibregl.ExpressionSpecification {
  const matches = (property: string): maplibregl.ExpressionSpecification => [
    'match',
    ['get', property],
    names,
    true,
    false,
  ]
  return [
    'case',
    matches('name:nonlatin'),
    ['get', 'name:nonlatin'],
    matches('name_zh'),
    ['get', 'name_zh'],
    matches('name'),
    ['get', 'name'],
    matches('name:latin'),
    ['get', 'name:latin'],
    matches('name_en'),
    ['get', 'name_en'],
    '',
  ]
}

function roadValueExpression<T extends string | number>(
  entries: RoadLabelEntry[],
  roadName: maplibregl.ExpressionSpecification,
  value: (entry: RoadLabelEntry) => T,
  fallback: T,
): maplibregl.ExpressionSpecification {
  return [
    'match',
    roadName,
    ...entries.flatMap((entry) => [entry.modernName, value(entry)]),
    fallback,
  ] as unknown as maplibregl.ExpressionSpecification
}

function metroValueExpression(
  entries: MetroStationLabelEntry[],
  stationName: maplibregl.ExpressionSpecification,
): maplibregl.ExpressionSpecification {
  return [
    'match',
    stationName,
    ...entries.flatMap((entry) => [entry.modernName, entry.historicalName]),
    '',
  ] as unknown as maplibregl.ExpressionSpecification
}

function parkValueExpression(
  entries: ReadonlyMap<string, ParkLabelEntry>,
  parkName: maplibregl.ExpressionSpecification,
  value: (entry: ParkLabelEntry) => string,
): maplibregl.ExpressionSpecification {
  return [
    'match',
    parkName,
    ...[...entries.entries()].flatMap(([modernName, entry]) => [modernName, value(entry)]),
    '',
  ] as unknown as maplibregl.ExpressionSpecification
}

function matchingRoadName(
  properties: Record<string, unknown> | null | undefined,
  labels: ReadonlyMap<string, RoadLabelEntry>,
) {
  if (!properties) return undefined
  for (const property of ['name:nonlatin', 'name_zh', 'name', 'name:latin', 'name_en']) {
    const value = properties[property]
    if (typeof value === 'string' && labels.has(value.trim())) return value.trim()
  }
  return undefined
}

function matchingMetroStationName(
  properties: Record<string, unknown> | null | undefined,
  labels: ReadonlyMap<string, MetroStationLabelEntry>,
) {
  if (!properties) return undefined
  for (const property of ['name:nonlatin', 'name_zh', 'name', 'name:latin', 'name_en']) {
    const value = properties[property]
    if (typeof value === 'string' && labels.has(value.trim())) return value.trim()
  }
  return undefined
}

function matchingParkName(
  properties: Record<string, unknown> | null | undefined,
  labels: ReadonlyMap<string, ParkLabelEntry>,
) {
  if (!properties) return undefined
  for (const property of ['name:nonlatin', 'name:zh-Hans', 'name:zh', 'name', 'name:latin', 'name:en']) {
    const value = properties[property]
    if (typeof value === 'string' && labels.has(value.trim())) return value.trim()
  }
  return undefined
}

function addHistoricalLayers(
  map: Map,
  features: HistoricalFeatureCollection,
  jurisdictions: FeatureCollection,
  roadLabels: ReadonlyMap<string, RoadLabelEntry>,
  metroStationLabels: ReadonlyMap<string, MetroStationLabelEntry>,
  parkLabels: ReadonlyMap<string, ParkLabelEntry>,
) {
  const allEntries = [...roadLabels.values()]
  const labelEntries = allEntries.filter((entry) => !entry.inferred)
  const inferredEntries = allEntries.filter((entry) => entry.inferred)
  const currentRoadName = roadNameExpression(labelEntries.map((entry) => entry.modernName))
  const historicalRoadName = roadValueExpression(
    labelEntries,
    currentRoadName,
    (entry) => entry.historicalName,
    '',
  )
  const roadPriority = roadValueExpression(labelEntries, currentRoadName, (entry) => entry.priority, 4)
  const labelledRoadFilter: maplibregl.FilterSpecification = ['!=', currentRoadName, '']
  const inferredRoadName = roadNameExpression(inferredEntries.map((entry) => entry.modernName))
  const inferredHistoricalName = roadValueExpression(
    inferredEntries,
    inferredRoadName,
    (entry) => entry.historicalName,
    '',
  )
  const interactiveRoadNames = labelEntries.filter((entry) => entry.featureGroupId).map((entry) => entry.modernName)
  const interactiveRoadName = roadNameExpression(interactiveRoadNames)
  const metroEntries = [...metroStationLabels.values()]
  const currentMetroStationName = roadNameExpression(metroEntries.map((entry) => entry.modernName))
  const historicalMetroStationName = metroValueExpression(metroEntries, currentMetroStationName)
  const metroStationFilter: maplibregl.FilterSpecification = [
    '!=', currentMetroStationName, '',
  ]
  const subwayTrackFilter: maplibregl.FilterSpecification = [
    'all',
    ['match', ['get', 'class'], ['transit', 'rail'], true, false],
    ['match', ['get', 'subclass'], ['subway', 'light_rail'], true, false],
  ]
  const currentParkName = roadNameExpression([...parkLabels.keys()])
  const historicalParkName = parkValueExpression(
    parkLabels,
    currentParkName,
    (entry) => entry.historicalName,
  )
  const historicalParkFilter: maplibregl.FilterSpecification = [
    'all',
    ['match', ['get', 'class'], ['park', 'garden'], true, false],
    ['!=', currentParkName, ''],
  ]

  baseTransitLayers.forEach((layerId) => {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none')
  })

  map.addSource('jurisdictions', { type: 'geojson', data: jurisdictions })
  map.addLayer(
    {
      id: 'historical-jurisdictions',
      type: 'fill',
      source: 'jurisdictions',
      paint: {
        'fill-color': [
          'match',
          ['get', 'jurisdiction'],
          'french-concession',
          '#caa58e',
          'international-settlement',
          '#8da8a5',
          'old-city',
          '#c4b38c',
          'rgba(0,0,0,0)',
        ],
        'fill-opacity': 0.12,
      },
    },
    map.getLayer('building') ? 'building' : undefined,
  )
  map.addLayer(
    {
      id: 'highlighted-jurisdiction-fill',
      type: 'fill',
      source: 'jurisdictions',
      filter: highlightedJurisdictionFilter(),
      paint: {
        'fill-color': [
          'match',
          ['get', 'jurisdiction'],
          'french-concession',
          '#b47768',
          'international-settlement',
          '#6f9695',
          'old-city',
          '#a9925c',
          'rgba(0,0,0,0)',
        ],
        'fill-opacity': 0.3,
      },
    },
    map.getLayer('building') ? 'building' : undefined,
  )
  map.addLayer({
    id: 'highlighted-jurisdiction-outline',
    type: 'line',
    source: 'jurisdictions',
    filter: highlightedJurisdictionFilter(),
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': [
        'match',
        ['get', 'jurisdiction'],
        'french-concession',
        '#8e5148',
        'international-settlement',
        '#436f70',
        'old-city',
        '#7f6a3f',
        '#57483c',
      ],
      'line-width': ['interpolate', ['linear'], ['zoom'], 10.5, 1.5, 16, 3.2],
      'line-opacity': 0.95,
    },
  })
  map.addSource('historical-features', { type: 'geojson', data: features, promoteId: 'id' })
  map.addSource('metro-lines', { type: 'geojson', data: assetUrl('data/metro-lines.geojson') })
  map.addSource('metro-stations', { type: 'geojson', data: assetUrl('data/metro-stations.geojson') })
  map.addSource('selected-feature', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addSource('selected-metro-station', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })

  map.addLayer({
    id: 'historical-subway-track',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 10.5,
    filter: subwayTrackFilter,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#716b62',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10.5, 1.1, 16, 2.6],
      'line-opacity': 0.45,
    },
  })
  map.addLayer({
    id: 'historical-subway-casing',
    type: 'line',
    source: 'metro-lines',
    minzoom: 10.5,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#f7efdc',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10.5, 3.8, 16, 8],
      'line-opacity': 0.98,
    },
  })
  map.addLayer({
    id: 'historical-subway-line',
    type: 'line',
    source: 'metro-lines',
    minzoom: 10.5,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['get', 'colour'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 10.5, 1.8, 16, 4],
      'line-opacity': 0.96,
    },
  })

  map.addLayer({
    id: 'historical-road-hit',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation_name',
    filter: ['!=', interactiveRoadName, ''],
    paint: { 'line-color': '#000000', 'line-width': 16, 'line-opacity': 0.01 },
  })

  map.addLayer({
    id: 'selected-road-casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation_name',
    filter: selectedRoadFilter(),
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#f2ead6',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10.5, 5.5, 16, 11],
      'line-opacity': 0.94,
    },
  })
  map.addLayer({
    id: 'selected-road',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation_name',
    filter: selectedRoadFilter(),
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#d07d35',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10.5, 2.5, 16, 6],
      'line-opacity': 0.98,
    },
  })

  const labelLayout = {
    'symbol-placement': 'line' as const,
    'symbol-spacing': 430,
    'text-field': ['get', 'historicalName'] as maplibregl.ExpressionSpecification,
    'text-font': ['Noto Sans Regular'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11, 16, 14] as maplibregl.ExpressionSpecification,
    'text-letter-spacing': 0.04,
    'text-max-angle': 35,
    'text-padding': 7,
  }

  map.addLayer({
    id: 'historical-road-label-major',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'transportation_name',
    minzoom: 10.8,
    filter: ['all', labelledRoadFilter, ['<=', roadPriority, 2]],
    layout: { ...labelLayout, 'text-field': historicalRoadName },
    paint: {
      'text-color': '#3f332b',
      'text-halo-color': '#f2ead6',
      'text-halo-width': 1.5,
      'text-halo-blur': 0.6,
    },
  })
  map.addLayer({
    id: 'historical-road-label-minor',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'transportation_name',
    minzoom: 13.6,
    filter: ['all', labelledRoadFilter, ['>', roadPriority, 2]],
    layout: { ...labelLayout, 'text-field': historicalRoadName, 'symbol-spacing': 520 },
    paint: {
      'text-color': '#57483c',
      'text-halo-color': '#f2ead6',
      'text-halo-width': 1.4,
      'text-halo-blur': 0.5,
    },
  })
  map.addLayer({
    id: 'historical-expressway-label',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'transportation_name',
    minzoom: 10.5,
    filter: ['!=', inferredRoadName, ''],
    layout: {
      ...labelLayout,
      'symbol-spacing': 650,
      'text-field': inferredHistoricalName,
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11.5, 16, 15],
      'text-offset': [0, -1.05],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#6b3f38',
      'text-halo-color': '#f2ead6',
      'text-halo-width': 1.7,
      'text-halo-blur': 0.6,
    },
  })
  map.addLayer({
    id: 'historical-subway-station-hit',
    type: 'circle',
    source: 'metro-stations',
    minzoom: 11.5,
    filter: metroStationFilter,
    paint: {
      'circle-radius': 12,
      'circle-color': '#000000',
      'circle-opacity': 0.01,
    },
  })
  map.addLayer({
    id: 'historical-subway-station',
    type: 'circle',
    source: 'metro-stations',
    minzoom: 11.5,
    filter: metroStationFilter,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11.5, 2.8, 16, 4.8],
      'circle-color': '#f7efdc',
      'circle-stroke-color': '#453d35',
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 11.5, 1.2, 16, 2],
    },
  })
  map.addLayer({
    id: 'selected-subway-station',
    type: 'circle',
    source: 'selected-metro-station',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11.5, 8, 16, 11],
      'circle-color': 'rgba(0,0,0,0)',
      'circle-stroke-color': '#d07d35',
      'circle-stroke-width': 3,
    },
  })
  map.addLayer({
    id: 'historical-subway-station-label',
    type: 'symbol',
    source: 'metro-stations',
    minzoom: 12,
    filter: metroStationFilter,
    layout: {
      'text-field': historicalMetroStationName,
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 12.5],
      'text-offset': [0, 0.85],
      'text-anchor': 'top',
      'text-padding': 5,
      'text-max-width': 10,
    },
    paint: {
      'text-color': '#6d3f50',
      'text-halo-color': '#f2ead6',
      'text-halo-width': 1.5,
      'text-halo-blur': 0.5,
    },
  })

  map.addLayer({
    id: 'historical-park-hit',
    type: 'circle',
    source: 'openmaptiles',
    'source-layer': 'poi',
    minzoom: 11.2,
    filter: historicalParkFilter,
    paint: {
      'circle-radius': 18,
      'circle-color': '#000000',
      'circle-opacity': 0.01,
    },
  })
  map.addLayer({
    id: 'historical-park-label',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'poi',
    minzoom: 11.2,
    filter: historicalParkFilter,
    layout: {
      'text-field': historicalParkName,
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 11.2, 11.5, 16, 14],
      'text-letter-spacing': 0.03,
      'text-padding': 7,
      'text-max-width': 13,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#3f593f',
      'text-halo-color': '#f2ead6',
      'text-halo-width': 1.7,
      'text-halo-blur': 0.5,
    },
  })
  map.addLayer({
    id: 'historical-park-curated-hit',
    type: 'circle',
    source: 'historical-features',
    minzoom: 11.2,
    filter: ['==', ['get', 'labelFromFeature'], true],
    paint: {
      'circle-radius': 18,
      'circle-color': '#000000',
      'circle-opacity': 0.01,
    },
  })
  map.addLayer({
    id: 'historical-park-curated-label',
    type: 'symbol',
    source: 'historical-features',
    minzoom: 11.2,
    filter: ['==', ['get', 'labelFromFeature'], true],
    layout: {
      'text-field': ['get', 'historicalName'],
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 11.2, 11.5, 16, 14],
      'text-letter-spacing': 0.03,
      'text-padding': 7,
      'text-max-width': 13,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#3f593f',
      'text-halo-color': '#f2ead6',
      'text-halo-width': 1.7,
      'text-halo-blur': 0.5,
    },
  })

  map.addLayer({
    id: 'historical-landmark-area',
    type: 'fill',
    source: 'historical-features',
    filter: [
      'all',
      ['==', ['get', 'kind'], 'landmark'],
      ['!=', ['get', 'category'], '现存公园'],
      ['==', ['geometry-type'], 'Polygon'],
    ],
    paint: { 'fill-color': '#7d4f45', 'fill-opacity': 0.17, 'fill-outline-color': '#7d4f45' },
  })
  map.addLayer({
    id: 'historical-landmark-point',
    type: 'circle',
    source: 'historical-features',
    minzoom: 12.4,
    filter: [
      'all',
      ['==', ['get', 'kind'], 'landmark'],
      ['!=', ['get', 'category'], '现存公园'],
      ['==', ['geometry-type'], 'Point'],
    ],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 17, 5],
      'circle-color': '#7d4f45',
      'circle-stroke-color': '#f2ead6',
      'circle-stroke-width': 1.5,
    },
  })
  map.addLayer({
    id: 'historical-landmark-label',
    type: 'symbol',
    source: 'historical-features',
    minzoom: 12.7,
    filter: [
      'all',
      ['==', ['get', 'kind'], 'landmark'],
      ['!=', ['get', 'category'], '现存公园'],
    ],
    layout: {
      'text-field': ['get', 'historicalName'],
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10.5, 16, 13],
      'text-offset': [0, 1.05],
      'text-anchor': 'top',
      'text-padding': 8,
      'symbol-sort-key': ['get', 'priority'],
    },
    paint: {
      'text-color': '#5b342e',
      'text-halo-color': '#f2ead6',
      'text-halo-width': 1.5,
    },
  })

  map.addLayer({
    id: 'selected-landmark-area',
    type: 'fill',
    source: 'selected-feature',
    filter: ['all', ['==', ['get', 'kind'], 'landmark'], ['==', ['geometry-type'], 'Polygon']],
    paint: {
      'fill-color': '#d07d35',
      'fill-opacity': 0.2,
      'fill-outline-color': '#d07d35',
    },
  })
  map.addLayer({
    id: 'selected-landmark',
    type: 'circle',
    source: 'selected-feature',
    filter: ['all', ['==', ['get', 'kind'], 'landmark'], ['==', ['geometry-type'], 'Point']],
    paint: {
      'circle-radius': 9,
      'circle-color': '#d07d35',
      'circle-stroke-color': '#f2ead6',
      'circle-stroke-width': 3,
    },
  })
}

export function MapView({
  features,
  jurisdictions,
  buildingsVisible,
  landmarksVisible,
  subwayVisible,
  highlightedJurisdiction,
  selectedGroupId,
  selectedMetroStation,
  onSelect,
  onSelectMetro,
  onMapError,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const onSelectRef = useRef(onSelect)
  const onSelectMetroRef = useRef(onSelectMetro)
  const buildingsVisibleRef = useRef(buildingsVisible)
  const landmarksVisibleRef = useRef(landmarksVisible)
  const subwayVisibleRef = useRef(subwayVisible)
  const highlightedJurisdictionRef = useRef(highlightedJurisdiction)
  const selectedGroupIdRef = useRef(selectedGroupId)
  onSelectRef.current = onSelect
  onSelectMetroRef.current = onSelectMetro
  buildingsVisibleRef.current = buildingsVisible
  landmarksVisibleRef.current = landmarksVisible
  subwayVisibleRef.current = subwayVisible
  highlightedJurisdictionRef.current = highlightedJurisdiction
  selectedGroupIdRef.current = selectedGroupId
  const roadLabels = buildRoadLabelIndex(features)
  const metroStationLabels = buildMetroStationLabelIndex(features)
  const parkLabels = buildParkLabelIndex()

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new Map({
      container: containerRef.current,
      style: assetUrl('style/no-label-style.json'),
      center: [121.47052, 31.23443],
      zoom: 12.25,
      minZoom: 10.5,
      maxZoom: 18.5,
      maxBounds: [
        [121.34, 31.11],
        [121.61, 31.35],
      ],
      renderWorldCopies: false,
      attributionControl: false,
    })
    mapRef.current = map
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution: 'Historical data © Virtual Shanghai · 1928 map public domain',
      }),
      'bottom-left',
    )

    const handleClick = (event: MapLayerMouseEvent) => {
      const hits = map.queryRenderedFeatures(event.point, { layers: interactiveLayers })
      const metroHit = hits.find((feature) => feature.layer.id.startsWith('historical-subway-station'))
      if (metroHit) {
        const modernName = matchingMetroStationName(metroHit.properties, metroStationLabels)
        const station = modernName ? metroStationLabels.get(modernName) : undefined
        const coordinates = metroHit.geometry.type === 'Point'
          ? metroHit.geometry.coordinates
          : [event.lngLat.lng, event.lngLat.lat]
        if (station && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
          onSelectMetroRef.current({
            ...station,
            coordinates: [coordinates[0], coordinates[1]],
          })
        }
        return
      }

      const parkHit = hits.find((feature) => feature.layer.id.startsWith('historical-park'))
      if (parkHit) {
        const directGroupId = parkHit.properties?.featureGroupId
        if (directGroupId) {
          onSelectRef.current(String(directGroupId))
          return
        }
        const modernName = matchingParkName(parkHit.properties, parkLabels)
        const groupId = modernName ? parkLabels.get(modernName)?.featureGroupId : undefined
        if (groupId) onSelectRef.current(groupId)
        return
      }

      const hit = hits[0]
      if (hit?.layer.id.startsWith('historical-road')) {
        const modernName = matchingRoadName(hit.properties, roadLabels)
        const groupId = modernName ? roadLabels.get(modernName)?.featureGroupId : undefined
        if (groupId) onSelectRef.current(groupId)
        return
      }
      const groupId = hit?.properties?.featureGroupId
      if (groupId) onSelectRef.current(String(groupId))
    }

    map.on('style.load', () => {
      addHistoricalLayers(map, features, jurisdictions, roadLabels, metroStationLabels, parkLabels)
      setBuildingVisibility(map, buildingsVisibleRef.current)
      setLandmarkVisibility(map, landmarksVisibleRef.current)
      setSubwayVisibility(map, subwayVisibleRef.current)
      setHighlightedJurisdiction(map, highlightedJurisdictionRef.current)
      setSelectedRoad(map, roadModernNameForGroup(features, selectedGroupIdRef.current))
      map.on('click', interactiveLayers, handleClick)
      map.on('mouseenter', interactiveLayers, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', interactiveLayers, () => {
        map.getCanvas().style.cursor = ''
      })
      onMapError(undefined)
    })

    map.on('error', (event) => {
      const message = event.error?.message ?? '地图底图加载失败'
      if (!/abort|cancel/i.test(message)) onMapError(message)
    })

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [features, jurisdictions, onMapError])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    setBuildingVisibility(map, buildingsVisible)
  }, [buildingsVisible])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    setLandmarkVisibility(map, landmarksVisible)
  }, [landmarksVisible])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    setSubwayVisibility(map, subwayVisible)
  }, [subwayVisible])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    setHighlightedJurisdiction(map, highlightedJurisdiction)
  }, [highlightedJurisdiction])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const selected = selectedCollection(features, selectedGroupId)
    const source = map.getSource('selected-feature') as maplibregl.GeoJSONSource | undefined
    source?.setData(selected)
    setSelectedRoad(map, roadModernNameForGroup(features, selectedGroupId))
    if (!selected.features.length) return

    const bounds = new LngLatBounds()
    selected.features.forEach((feature) => {
      if ('coordinates' in feature.geometry) walkCoordinates(feature.geometry.coordinates, bounds)
    })
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: { top: 120, right: window.innerWidth > 760 ? 410 : 40, bottom: window.innerWidth > 760 ? 80 : 330, left: 40 },
        maxZoom: selected.features[0]?.properties?.kind === 'landmark' ? 16.4 : 15.5,
        duration: 850,
      })
    }
  }, [features, selectedGroupId])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const source = map.getSource('selected-metro-station') as maplibregl.GeoJSONSource | undefined
    source?.setData({
      type: 'FeatureCollection',
      features: selectedMetroStation
        ? [{
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: selectedMetroStation.coordinates },
          }]
        : [],
    })
  }, [selectedMetroStation])

  return (
    <div
      ref={containerRef}
      className="map-canvas"
      aria-label="上海历史路名交互地图"
      data-highlighted-jurisdiction={highlightedJurisdiction ?? 'none'}
    />
  )
}
