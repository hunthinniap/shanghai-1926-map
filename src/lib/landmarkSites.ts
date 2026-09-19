import type { CurrentUseSource, HistoricalFeature, HistoricalFeatureCollection, HistoricalRecord } from '../types'

export interface LandmarkSiteLink {
  id: string
  canonicalFeatureId: string
  memberFeatureIds: string[]
  expectedBuildingIds: number[]
  expectedParkIds: number[]
  currentUseFromFeatureId?: string
  historicalName?: string
  nameZh?: string
  aliases?: string[]
  category?: string
  historicalUse?: HistoricalFeature['properties']['historicalUse']
  note: string
  sources: CurrentUseSource[]
}

const unique = <T,>(values: T[]) => [...new Set(values)]
const sameIds = (actual: number[], expected: number[]) =>
  JSON.stringify(unique(actual).sort((a, b) => a - b)) === JSON.stringify(unique(expected).sort((a, b) => a - b))
const isName = (value: string | undefined): value is string => Boolean(value?.trim()) && !/^(?:VANISHED|NONE|NO|YES|NULL)$/i.test(value!.trim())

function sourceRecords(feature: HistoricalFeature): HistoricalRecord[] {
  const p = feature.properties
  return p.historicalRecords?.length ? p.historicalRecords : [{
    name: p.historicalName,
    nameZh: isName(p.modernNameZh) ? p.modernNameZh : undefined,
    sourceRecordIds: p.sourceRecordIds,
    sourceParkRecordIds: p.sourceParkRecordIds,
    startYear: p.labelYearIsFallback ? undefined : p.labelYear,
    category: p.category,
    sourceUrls: Object.values(p.sourceUrls ?? {}),
  }]
}

/** Explicit, reviewed display associations; raw source geometry stays untouched. */
export function mergeLandmarkSites(collection: HistoricalFeatureCollection, links: LandmarkSiteLink[]): HistoricalFeatureCollection {
  let features = collection.features
  for (const link of links) {
    const ids = unique([link.canonicalFeatureId, ...link.memberFeatureIds])
    const members = ids.map((id) => features.find((feature) => feature.properties.id === id))
    if (!members[0] || members.some((feature) => feature && feature.properties.kind !== 'landmark')) continue
    const present = members.filter((feature): feature is HistoricalFeature => Boolean(feature))
    // A rebuild may already have consolidated all reviewed source IDs into
    // the canonical feature. Still apply its reviewed names in that case;
    // incomplete groups and unknown source IDs must continue to fail closed.
    if (present.length !== ids.length && present.length !== 1) continue
    const buildingIds = unique(present.flatMap((feature) => feature.properties.sourceRecordIds ?? []))
    const parkIds = unique(present.flatMap((feature) => feature.properties.sourceParkRecordIds ?? []))
    if (!sameIds(buildingIds, link.expectedBuildingIds) || !sameIds(parkIds, link.expectedParkIds)) continue
    const canonical = present[0]
    const p = canonical.properties
    // Only retain an existing, explicitly selected current-use conclusion.
    // Shared coordinates never grant permission to infer one for the group.
    const currentUseSource = present.find((feature) => feature.properties.id === link.currentUseFromFeatureId)
    const currentUseProperties = Object.fromEntries(Object.entries(currentUseSource?.properties ?? {})
      .filter(([key]) => key.startsWith('current')))
    const records = present.flatMap(sourceRecords)
    const merged: HistoricalFeature = {
      ...canonical,
      properties: {
        ...p,
        ...currentUseProperties,
        historicalName: link.historicalName ?? p.historicalName,
        modernNameZh: link.nameZh ?? p.modernNameZh,
        historicalChinese: link.nameZh ?? p.historicalChinese,
        category: link.category ?? p.category,
        historicalUse: link.historicalUse ?? p.historicalUse,
        sourceRecordIds: buildingIds,
        sourceParkRecordIds: parkIds,
        sourceIds: unique(present.flatMap((feature) => feature.properties.sourceIds)),
        sourceUrls: Object.assign({}, ...present.slice().reverse().map((feature) => feature.properties.sourceUrls ?? {})),
        aliases: unique([
          link.historicalName,
          link.nameZh,
          ...(link.aliases ?? []),
          ...present.flatMap((feature) => [feature.properties.historicalName, feature.properties.modernNameZh,
            feature.properties.historicalChinese, ...(feature.properties.aliases ?? [])]),
        ].filter(isName)),
        historicalRecords: [...new Map(records.map((record) => [JSON.stringify(record), record])).values()],
        legacyFeatureGroupIds: unique(present.flatMap((feature) => [feature.properties.featureGroupId,
          ...(feature.properties.legacyFeatureGroupIds ?? [])])).filter((id) => id !== p.featureGroupId),
        historicalSiteNote: link.note,
        historicalSiteSources: link.sources,
      },
    }
    features = features.flatMap((feature) => feature.properties.id === link.canonicalFeatureId ? [merged]
      : ids.includes(feature.properties.id) ? [] : [feature])
  }
  return { ...collection, features }
}
