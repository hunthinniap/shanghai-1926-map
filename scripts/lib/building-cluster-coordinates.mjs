import { wgs84ToUtm51n } from './coordinate-systems.mjs'

// The live snapshot mixes UTM 51N shapefile records with WGS84 coordinate
// overrides. Use one metre-based frame before both distance checks and site
// centroid calculation. Keep the stored source records and their coordinates
// intact; only the geographic records need a projected clustering copy.
export function buildingRecordsInUtm51n(records) {
  return records.map((record) => {
    const { x, y } = record
    if (!Number.isFinite(x) || !Number.isFinite(y) ||
      Math.abs(x) > 180 || Math.abs(y) > 90) return record
    return { ...record, ...wgs84ToUtm51n(x, y) }
  })
}
