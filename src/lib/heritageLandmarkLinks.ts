import type { HeritageBuildingCollection, HeritageBuildingFeature } from './heritageBuildings'
import type { CurrentUseSource, HistoricalFeature, HistoricalFeatureCollection, HistoricalRecord } from '../types'

export interface HistoricalBuildingAddress {
  sourceRecordId: number
  address: string
  sourceUrl: string
}

export interface HeritageLandmarkLink {
  id: string
  officialId: string
  landmarkFeatureId: string
  expectedSourceRecordIds: number[]
  historicalAddresses: HistoricalBuildingAddress[]
  additionalLandmarks?: { landmarkFeatureId: string; expectedSourceRecordIds: number[] }[]
  modernAddress?: { address: string; sourceUrl: string; title: string }
  aliases?: string[]
  relation?: 'same-listed-building' | 'same-listed-complex' | 'same-listed-structure' | 'same-historical-site' | 'component-of-listed-complex'
  scopeNote?: string
  note: string
  sources: CurrentUseSource[]
}

export interface LinkedHeritageBuilding {
  heritage: HeritageBuildingFeature
  landmark: HistoricalFeature
  landmarks?: HistoricalFeature[]
  link: HeritageLandmarkLink
}

/** Make reviewed names searchable before the directory's lazy load. No move or merge. */
export function withReviewedHeritageAliases(features: HistoricalFeature[], links: HeritageLandmarkLink[]) {
  const sortedIds = (ids: number[]) => [...new Set(ids)].sort((a, b) => a - b).join(',')
  return features.map((feature) => {
    const matches = links.filter((link) => link.aliases?.length
      && [link, ...(link.additionalLandmarks ?? [])].some((member) =>
        member.landmarkFeatureId === feature.properties.id
        && member.expectedSourceRecordIds.length > 0
        && sortedIds(member.expectedSourceRecordIds) === sortedIds(feature.properties.sourceRecordIds ?? [])))
    if (feature.properties.kind !== 'landmark' || matches.length !== 1
      || features.filter((other) => other.properties.featureGroupId === feature.properties.featureGroupId).length !== 1) return feature
    return { ...feature, properties: { ...feature.properties,
      aliases: [...new Set([...(feature.properties.aliases ?? []), ...matches[0].aliases!])],
    } }
  })
}

function recordsFor(feature: HistoricalFeature): HistoricalRecord[] {
  const properties = feature.properties
  if (properties.historicalRecords?.length) return properties.historicalRecords
  // A single-source landmark need not already have a timeline. Preserve its
  // own label year as a dated record, not an inferred operating period.
  return [{
    sourceRecordIds: properties.sourceRecordIds,
    sourceParkRecordIds: properties.sourceParkRecordIds,
    name: properties.historicalName,
    nameZh: properties.historicalChinese || properties.modernNameZh,
    ...(!properties.labelYearIsFallback ? { startYear: properties.labelYear, endYear: properties.labelYear } : {}),
    sourceUrls: Object.values(properties.sourceUrls ?? {}),
    category: properties.category,
  }]
}

/** Reviewed identities only. Coordinate proximity never establishes a link. */
export function linkHeritageLandmarks(
  historical: HistoricalFeatureCollection,
  heritage: HeritageBuildingCollection | undefined,
  links: HeritageLandmarkLink[],
) {
  const byOfficialId = new Map<string, LinkedHeritageBuilding>()
  const byGroupId = new Map<string, LinkedHeritageBuilding>()
  if (!heritage) return { features: historical, byOfficialId, byGroupId }
  const sortedIds = (ids: number[]) => [...new Set(ids)].sort((a, b) => a - b).join(',')
  const members = (link: HeritageLandmarkLink) => [link, ...(link.additionalLandmarks ?? [])]
  const unique = <T,>(items: T[]) => [...new Set(items)]
  for (const link of links) {
    // Conflicting one-to-many candidates remain independent until reviewed.
    if (links.filter((item) => item.officialId === link.officialId).length !== 1
      || members(link).some((member) => links.flatMap(members)
        .filter((item) => item.landmarkFeatureId === member.landmarkFeatureId).length !== 1)) continue
    const candidates = members(link).map((member) => {
      const matches = historical.features.filter((feature) => feature.properties.id === member.landmarkFeatureId)
      const feature = matches[0]
      return matches.length === 1 && feature.properties.kind === 'landmark'
        && member.expectedSourceRecordIds.length > 0
        && sortedIds(feature.properties.sourceRecordIds ?? []) === sortedIds(member.expectedSourceRecordIds)
        && historical.features.filter((other) => other.properties.featureGroupId === feature.properties.featureGroupId).length === 1
        ? feature : undefined
    })
    const places = heritage.features.filter((feature) => feature.properties.officialId === link.officialId)
    if (candidates.some((feature) => !feature) || places.length !== 1) continue
    const landmarks = candidates as HistoricalFeature[]
    const primary = landmarks[0]
    const landmark = landmarks.length === 1 ? primary : {
      ...primary,
      properties: {
        ...primary.properties,
        sourceRecordIds: unique(landmarks.flatMap((feature) => feature.properties.sourceRecordIds ?? [])),
        sourceParkRecordIds: unique(landmarks.flatMap((feature) => feature.properties.sourceParkRecordIds ?? [])),
        sourceIds: unique(landmarks.flatMap((feature) => feature.properties.sourceIds)),
        historicalRecords: landmarks.flatMap(recordsFor),
        aliases: unique(landmarks.flatMap((feature) => [feature.properties.historicalName,
          feature.properties.modernNameZh, feature.properties.currentNameZh,
          feature.properties.currentAddress, ...(feature.properties.aliases ?? [])]).filter((name): name is string => Boolean(name))),
      },
    }
    const building = places[0]
    if (building.geometry.type !== 'Point' || building.properties.coordinateSystem !== 'WGS84'
      || building.geometry.coordinates.length < 2 || !building.geometry.coordinates.every(Number.isFinite)
      || Math.abs(building.geometry.coordinates[0]) > 180 || Math.abs(building.geometry.coordinates[1]) > 90) continue
    const linked = { heritage: building, landmark, landmarks, link }
    byOfficialId.set(link.officialId, linked)
    for (const member of landmarks) byGroupId.set(member.properties.featureGroupId, linked)
  }
  return {
    byOfficialId,
    byGroupId,
    features: {
      ...historical,
      features: historical.features.flatMap((feature) => {
        const linked = byGroupId.get(feature.properties.featureGroupId)
        if (linked && feature.properties.id !== linked.link.landmarkFeatureId) return []
        return linked ? [{
          ...linked.landmark,
          geometry: linked.heritage.geometry,
          properties: {
            ...linked.landmark.properties,
            heritageOfficialId: linked.heritage.properties.officialId,
            aliases: [...new Set([
              ...(linked.landmark.properties.aliases ?? []),
              ...(linked.link.aliases ?? []),
              linked.link.modernAddress?.address,
              linked.heritage.properties.name,
              linked.heritage.properties.articleTitle,
              linked.heritage.properties.officialName,
              linked.heritage.properties.listedName,
              linked.heritage.properties.address,
              linked.heritage.properties.wikipediaAddress,
              ...linked.link.historicalAddresses.map((address) => address.address),
            ].filter((name): name is string => Boolean(name)))],
          },
        }] : [feature]
      }),
    } satisfies HistoricalFeatureCollection,
  }
}
