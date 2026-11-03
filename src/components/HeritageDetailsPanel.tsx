import type { HeritageBuildingFeature } from '../lib/heritageBuildings'
import type { LinkedHeritageBuilding } from '../lib/heritageLandmarkLinks'
import { buildPlaceDetails } from '../lib/placeDetails'
import { PlaceDetailsPanel } from './PlaceDetailsPanel'

export function HeritageDetailsPanel({ feature, linked, onClose }: {
  feature?: HeritageBuildingFeature; linked?: LinkedHeritageBuilding; onClose: () => void
}) {
  if (!feature) return null
  return <PlaceDetailsPanel details={buildPlaceDetails({ heritage: feature, linked })} onClose={onClose} />
}
