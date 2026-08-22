import type { HistoricalFeatureCollection } from '../types'

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
  ['人民路', { historicalName: 'Min Kueq Lu', featureGroupId: 'road-old-city-人民路' }],
  ['中华路', { historicalName: 'Tzon Wa Lu', featureGroupId: 'road-old-city-中华路' }],
  ['复兴东路', { historicalName: 'Dzo Ka Lu', featureGroupId: 'road-old-city-复兴东路' }],
  ['方浜中路', { historicalName: 'Faon Pan Lu', featureGroupId: 'road-old-city-方浜中路' }],
  ['河南南路', { historicalName: 'Ae He Lu', featureGroupId: 'road-old-city-河南南路' }],
])

export function buildRoadLabelIndex(collection: HistoricalFeatureCollection) {
  const groupsByModernName = new Map<
    string,
    Map<string, { historicalName: string; priority: number; featureCount: number; modernNameEn?: string }>
  >()

  collection.features.forEach((feature) => {
    if (feature.properties.kind !== 'road') return
    if (feature.properties.labelOnMap === false) return
    const modernName = feature.properties.modernNameZh.trim()
    if (!modernName) return
    const groups = groupsByModernName.get(modernName) ?? new Map()
    const groupId = feature.properties.featureGroupId
    const current = groups.get(groupId)
    groups.set(groupId, {
      historicalName: feature.properties.historicalName,
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
    const [featureGroupId, selected] = ranked[0]
    const override = labelOverrides.get(modernName)
    const entry: RoadLabelEntry = {
      modernName,
      historicalName: override?.historicalName ?? selected.historicalName,
      priority: selected.priority,
      featureGroupId: override?.featureGroupId ?? featureGroupId,
    }
    labels.set(modernName, entry)
    if (selected.modernNameEn) labels.set(selected.modernNameEn, { ...entry, modernName: selected.modernNameEn })
  })

  inferredRoadLabels.forEach((entry) => labels.set(entry.modernName, entry))
  return labels
}
