import type { HistoricalFeature, SourceRecord } from '../types'
import { buildPlaceDetails } from '../lib/placeDetails'
import { PlaceDetailsPanel } from './PlaceDetailsPanel'
import { RoadDetailsPanel } from './RoadDetailsPanel'

export function DetailsPanel({ feature, sources, onClose }: {
  feature?: HistoricalFeature; sources: SourceRecord[]; onClose: () => void
}) {
  if (!feature) return null
  return feature.properties.kind === 'road'
    ? <RoadDetailsPanel feature={feature} sources={sources} onClose={onClose} />
    : <PlaceDetailsPanel details={buildPlaceDetails({ feature, sources })} onClose={onClose} />
}
