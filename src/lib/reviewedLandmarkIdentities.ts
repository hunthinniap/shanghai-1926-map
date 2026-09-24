import type { CurrentUseSource, HistoricalFeature, HistoricalFeatureCollection } from '../types'

export interface ReviewedLandmarkIdentity {
  landmarkFeatureId: string
  expectedSourceRecordIds: number[]
  canonicalNameZh: string
  aliases: string[]
  note: string
  sources: CurrentUseSource[]
}

export function applyReviewedLandmarkIdentities(
  collection: HistoricalFeatureCollection,
  identities: ReviewedLandmarkIdentity[],
): HistoricalFeatureCollection {
  const sortedIds = (ids: number[]) => [...new Set(ids)].sort((a, b) => a - b).join(',')
  const features = collection.features.map((feature): HistoricalFeature => {
    if (feature.properties.kind !== 'landmark') return feature
    const matches = identities.filter((identity) => identity.landmarkFeatureId === feature.properties.id
      && identity.expectedSourceRecordIds.length > 0
      && sortedIds(identity.expectedSourceRecordIds) === sortedIds(feature.properties.sourceRecordIds ?? []))
    if (matches.length !== 1
      || collection.features.filter((other) => other.properties.featureGroupId === feature.properties.featureGroupId).length !== 1) {
      return feature
    }
    const identity = matches[0]
    return {
      ...feature,
      properties: {
        ...feature.properties,
        modernNameZh: identity.canonicalNameZh,
        aliases: [...new Set([
          ...(feature.properties.aliases ?? []),
          feature.properties.modernNameZh,
          ...identity.aliases,
        ])],
      },
    }
  })
  return { ...collection, features }
}
