import type { HistoricalFeatureCollection, HistoricalFeatureProperties } from '../types'

export const chineseName = (...names: (string | undefined)[]) =>
  names.find(name => name && /\p{Script=Han}/u.test(name))?.trim()

export function landmarkMapName(properties: HistoricalFeatureProperties) {
  const stage = properties.timelineStage
  // A selected historical stage must not borrow a different period's name.
  if (stage) return chineseName(stage.nameZh, stage.name) || stage.name
  return chineseName(properties.historicalChinese, properties.modernNameZh, properties.historicalName)
    || properties.historicalName
}

/** Presentation-only labels; the source names remain available to search and details. */
export function withLandmarkMapNames(collection: HistoricalFeatureCollection): HistoricalFeatureCollection {
  return { ...collection, features: collection.features.map(feature => feature.properties.kind === 'landmark'
    ? { ...feature, properties: { ...feature.properties, mapDisplayName: landmarkMapName(feature.properties) } }
    : feature) }
}
