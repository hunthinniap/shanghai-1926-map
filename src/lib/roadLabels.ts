import { isRoadNameEvent, reviewedRoadHistory, roadHistoryEventYear, type RoadHistoryEvent } from '../data/roadHistories'
import type { FeatureCollection, Geometry } from 'geojson'
import type { HistoricalFeatureCollection, HistoricalFeatureProperties } from '../types'
import { roadDisplayName } from './roadDisplayNames'

export interface RoadLabelEntry {
  modernName: string
  historicalName: string
  priority: number
  featureGroupId?: string
  inferred?: boolean
}

export function roadModernNameForGroup(
  collection: HistoricalFeatureCollection,
  groupId?: string,
) {
  if (!groupId) return undefined
  const feature = collection.features.find(
    (candidate) =>
      candidate.properties.kind === 'road' &&
      !candidate.properties.roadLabelFromGeometry &&
      candidate.properties.featureGroupId === groupId,
  )
  return feature?.properties.modernNameZh.trim() || undefined
}

const inferredRoadLabels: RoadLabelEntry[] = [
  { modernName: '延安高架路', historicalName: 'Foch Expressway', priority: 1, inferred: true },
  { modernName: '延安高架', historicalName: 'Foch Expressway', priority: 1, inferred: true },
  { modernName: '延安高架快速路', historicalName: 'Foch Expressway', priority: 1, inferred: true },
  { modernName: '南北高架路', historicalName: 'Dubail Expressway', priority: 1, inferred: true },
  { modernName: '南北高架', historicalName: 'Dubail Expressway', priority: 1, inferred: true },
  { modernName: "Yan'an Elevated Road", historicalName: 'Foch Expressway', priority: 1, inferred: true },
  { modernName: 'North-South Elevated Road', historicalName: 'Dubail Expressway', priority: 1, inferred: true },
]

const labelOverrides = new Map<string, { historicalName: string; featureGroupId?: string }>([
  ['南昌路', { historicalName: 'Route Vallon / Route Dolfus' }],
  ['嘉善路', { historicalName: 'Route Gaston Kahn' }],
  ['人民路', { historicalName: '民國路', featureGroupId: 'road-old-city-人民路' }],
  ['中华路', { historicalName: '中華路', featureGroupId: 'road-old-city-中华路' }],
  ['复兴东路', { historicalName: '肇嘉路', featureGroupId: 'road-old-city-复兴东路' }],
  ['方浜中路', { historicalName: '方浜路', featureGroupId: 'road-old-city-方浜中路' }],
  ['河南南路', { historicalName: '晏海路', featureGroupId: 'road-old-city-河南南路' }],
  ['蓬莱路', { historicalName: '蓬莱路', featureGroupId: 'road-old-city-蓬莱路' }],
])

const datedSegmentGroups = new Map([
  ['南昌路', ['road-route-vallon', 'road-route-dolfus']],
  ['顺昌路', ['road-rue-du-marche-顺昌路', 'road-rue-eugene-bard-顺昌路']],
  ['吴兴路', ['road-route-pershing-吴兴路-北段', 'road-route-bridou-吴兴路-南段']],
  ['太仓路', ['road-rue-auguste-boppe-太仓路-西段', 'road-rue-ou-song-kiang-太仓路-东段']],
  ['安亭路81弄', ['road-rue-adina-安亭路81弄']],
])
const datedSegmentIds = new Set([...datedSegmentGroups.values()].flat())

export function datedRoadSegments(collection: HistoricalFeatureCollection, year: number | null): FeatureCollection<Geometry> {
  const features = collection.features.flatMap(feature => {
    const p = feature.properties
    if (p.kind !== 'road' || p.labelOnMap === false) return []
    if (p.roadLabelEndYear !== undefined && (year ?? 1928) >= p.roadLabelEndYear) return []
    if (!p.roadLabelFromGeometry && (year === null || !datedSegmentIds.has(p.featureGroupId))) return []
    const name = roadNameAtYear(p, year ?? 1928)
    return name ? [{ ...feature, properties: {
      featureGroupId: p.featureGroupId, modernNameZh: p.modernNameZh, historicalName: name, priority: p.priority,
    } }] : []
  })
  return { type: 'FeatureCollection', features }
}

function mapNameForEvent(event: RoadHistoryEvent, road: HistoricalFeatureProperties): string | undefined {
  if (event.mapName !== undefined) return event.mapName
  if (!isRoadNameEvent(event)) return undefined
  if (/裁撤|消失/.test(event.kind)) return ''
  if (/^(?:开工|填浜开工)$/.test(event.kind) || /^(?:拆城填濠|填浜筑路)$/.test(event.name)) return undefined
  const name = event.name.replace(/^并入/, '').trim()
  if (name === road.modernNameZh && /更名|改名|统一命名/.test(event.kind)) return name
  const old = road.historicalName
  const chinese = road.historicalChinese
  if (name === old || name.endsWith(`（${old}）`) || name.endsWith(` (${old})`)
    || (chinese && [chinese, `${old} · ${chinese}`].includes(name))) {
    return roadDisplayName(road)
  }
  return name
}

export function roadNameAtYear(road: HistoricalFeatureProperties, year: number): string | undefined {
  const history = reviewedRoadHistory(road)
  let firstYear = Infinity
  let firstKind = ''
  let currentYear = -Infinity
  let current: string | undefined
  for (const event of history?.events ?? []) {
    const start = roadHistoryEventYear(event)
    const name = mapNameForEvent(event, road)
    if (start === undefined || name === undefined) continue
    if (start < firstYear) {
      firstYear = start
      firstKind = event.kind
    }
    if (start <= year && start >= currentYear) {
      currentYear = start
      current = name
    }
  }
  if (current !== undefined) return current || undefined
  if (history?.predecessor) return history.predecessor
  // A dated source can show the old name before the first recorded renaming.
  if ((firstYear === Infinity || /更名|并入/.test(firstKind)) && !road.labelYearIsFallback && road.labelYear <= year) {
    return roadDisplayName(road)
  }
  return undefined
}

export function buildRoadLabelIndex(collection: HistoricalFeatureCollection, year: number | null = null) {
  const groupsByModernName = new Map<
    string,
    Map<string, { properties: HistoricalFeatureProperties; priority: number; featureCount: number; modernNameEn?: string }>
  >()

  collection.features.forEach((feature) => {
    if (feature.properties.kind !== 'road') return
    if (feature.properties.labelOnMap === false || feature.properties.roadLabelFromGeometry) return
    const modernName = feature.properties.modernNameZh.trim()
    if (!modernName) return
    const groups = groupsByModernName.get(modernName) ?? new Map()
    const groupId = feature.properties.featureGroupId
    if (year !== null && (datedSegmentGroups.has(modernName.replace(/[（(][东西南北]段[）)]$/, ''))
      || groupId === 'road-rue-adina-安亭路')) return
    const current = groups.get(groupId)
    groups.set(groupId, {
      properties: current && current.properties.labelYear <= feature.properties.labelYear && !current.properties.labelYearIsFallback
        ? current.properties : feature.properties,
      priority: Math.min(current?.priority ?? 4, feature.properties.priority),
      featureCount: (current?.featureCount ?? 0) + 1,
      modernNameEn: feature.properties.modernNameEn ?? current?.modernNameEn,
    })
    groupsByModernName.set(modernName, groups)
  })

  const labels = new Map<string, RoadLabelEntry>()
  groupsByModernName.forEach((groups, modernName) => {
    const ranked = [...groups.entries()].sort(
      ([, left], [, right]) => right.featureCount - left.featureCount || left.priority - right.priority,
    )
    const override = labelOverrides.get(modernName)
    const names = year === null ? undefined : ranked.flatMap(([id, group]) => {
      const historicalName = roadNameAtYear(group.properties, year)
      return historicalName ? [{ id, group, historicalName }] : []
    })
    const active = names?.find(candidate => candidate.id === override?.featureGroupId) ?? names?.[0]
    if (year !== null && !active) return
    const [featureGroupId, selected] = active ? [active.id, active.group] : ranked[0]
    const historicalName = active?.historicalName ?? override?.historicalName ?? roadDisplayName(selected.properties)
    const entry: RoadLabelEntry = {
      modernName,
      historicalName,
      priority: selected.priority,
      featureGroupId: year === null ? override?.featureGroupId ?? featureGroupId : featureGroupId,
    }
    labels.set(modernName, entry)
    if (selected.modernNameEn) labels.set(selected.modernNameEn, { ...entry, modernName: selected.modernNameEn })
  })

  if (year === null) inferredRoadLabels.forEach((entry) => labels.set(entry.modernName, entry))
  return labels
}
