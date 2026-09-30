import type { AddressUseEvidence, HistoricalFeatureCollection } from '../types'

export interface ReviewedAddressUse {
  featureId: string
  expectedSourceRecordIds: number[]
  evidence: AddressUseEvidence[]
}

const key = (ids: number[]) => [...ids].sort((a, b) => a - b).join(',')

/** Guarded card-only evidence. Never writes currentUse or changes a map point. */
export function applyReviewedAddressUses(collection: HistoricalFeatureCollection, entries: ReviewedAddressUse[]): HistoricalFeatureCollection {
  return { ...collection, features: collection.features.map(feature => {
    const p = feature.properties
    const matches = entries.filter(entry => entry.featureId === p.id)
    const entry = matches[0]
    if (p.kind !== 'landmark' || matches.length !== 1 || !entry.expectedSourceRecordIds.length
      || key(p.sourceRecordIds ?? []) !== key(entry.expectedSourceRecordIds)
      || collection.features.filter(f => f.properties.id === p.id).length !== 1
      || key(entry.evidence.flatMap(e => e.sourceRecordIds)) !== key(entry.expectedSourceRecordIds)) return feature
    return { ...feature, properties: { ...p, addressUseEvidence: entry.evidence } }
  }) }
}
