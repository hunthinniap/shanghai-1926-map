import type { HeritageBuildingCollection, HeritageBuildingFeature } from './heritageBuildings'
import type { CurrentUseSource, HistoricalFeature, HistoricalFeatureCollection } from '../types'

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
  relation?: 'same-listed-building' | 'same-listed-complex' | 'same-listed-structure'
  scopeNote?: string
  note: string
  sources: CurrentUseSource[]
}

export interface LinkedHeritageBuilding {
  heritage: HeritageBuildingFeature
  landmark: HistoricalFeature
  link: HeritageLandmarkLink
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
  for (const link of links) {
    // Conflicting one-to-many candidates remain independent until reviewed.
    if (links.filter((item) => item.officialId === link.officialId).length !== 1
      || links.filter((item) => item.landmarkFeatureId === link.landmarkFeatureId).length !== 1) continue
    const candidates = historical.features.filter((feature) => feature.properties.id === link.landmarkFeatureId)
    const places = heritage.features.filter((feature) => feature.properties.officialId === link.officialId)
    if (candidates.length !== 1 || places.length !== 1) continue
    const landmark = candidates[0]
    const building = places[0]
    if (historical.features.filter((feature) => feature.properties.featureGroupId === landmark.properties.featureGroupId).length !== 1) continue
    if (landmark.properties.kind !== 'landmark' || !link.expectedSourceRecordIds.length
      || sortedIds(landmark.properties.sourceRecordIds ?? []) !== sortedIds(link.expectedSourceRecordIds)) continue
    if (building.geometry.type !== 'Point' || building.properties.coordinateSystem !== 'WGS84'
      || building.geometry.coordinates.length < 2 || !building.geometry.coordinates.every(Number.isFinite)
      || Math.abs(building.geometry.coordinates[0]) > 180 || Math.abs(building.geometry.coordinates[1]) > 90) continue
    const linked = { heritage: building, landmark, link }
    byOfficialId.set(link.officialId, linked)
    byGroupId.set(landmark.properties.featureGroupId, linked)
  }
  return {
    byOfficialId,
    byGroupId,
    features: {
      ...historical,
      features: historical.features.map((feature) => {
        const linked = byGroupId.get(feature.properties.featureGroupId)
        return linked ? {
          ...feature,
          geometry: linked.heritage.geometry,
          properties: {
            ...feature.properties,
            heritageOfficialId: linked.heritage.properties.officialId,
            aliases: [...new Set([
              ...(feature.properties.aliases ?? []),
              linked.heritage.properties.name,
              linked.heritage.properties.articleTitle,
              linked.heritage.properties.officialName,
              linked.heritage.properties.listedName,
              linked.heritage.properties.address,
              linked.heritage.properties.wikipediaAddress,
              ...linked.link.historicalAddresses.map((address) => address.address),
            ].filter((name): name is string => Boolean(name)))],
          },
        } : feature
      }),
    } satisfies HistoricalFeatureCollection,
  }
}
