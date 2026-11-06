import indexData from './roadHistorySupplementIndex.json'
import type { HistoricalFeatureProperties } from '../types'

interface SupplementIdentity { batchId: string; modernNameZh: string; historicalName: string }
export interface RoadHistorySupplement {
  featureGroupId: string
  modernNameZh: string
  historicalName: string
  status: 'verified' | 'conflicting' | 'unresolved'
  identity: string
  events: { year: number | null; period: string; kind: string; name: string; segment: string; sources: string[] }[]
  origins: { roadName: string; name: string; description: string; sources: string[] }[]
  sources: { title: string; url: string; locator: string }[]
  conflicts: string[]
  reasons: string[]
}
const index: Record<string, SupplementIdentity> = indexData
const batches = new Map<string, Promise<RoadHistorySupplement[]>>()

export function roadHistorySupplementIdentity(p: HistoricalFeatureProperties) {
  const identity = index[p.featureGroupId]
  return p.kind === 'road' && identity?.modernNameZh === p.modernNameZh && identity.historicalName === p.historicalName
    ? identity : undefined
}

export async function loadRoadHistorySupplement(p: HistoricalFeatureProperties) {
  const identity = roadHistorySupplementIdentity(p)
  if (!identity) return undefined
  const { batchId } = identity
  let batch = batches.get(batchId)
  if (!batch) {
    batch = fetch(`${import.meta.env.BASE_URL}data/road-history-supplements/${batchId}.json`)
      .then(response => {
        if (!response.ok) throw new Error(`Road history: ${response.status}`)
        return response.json() as Promise<RoadHistorySupplement[]>
      })
      .catch(error => { batches.delete(batchId); throw error })
    batches.set(batchId, batch)
  }
  return (await batch).find(row => row.featureGroupId === p.featureGroupId
    && row.modernNameZh === p.modernNameZh && row.historicalName === p.historicalName)
}
