import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { heritageLandmarkLinks } from '../data/heritageLandmarkLinks'
import type { HistoricalFeatureCollection } from '../types'
import type { HeritageBuildingCollection } from './heritageBuildings'
import { linkHeritageLandmarks } from './heritageLandmarkLinks'

describe('heritage identity guard across map features', () => {
  it('rejects an otherwise matching feature when its group also contains an unreviewed member', () => {
    const historical = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    const heritage = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8')) as HeritageBuildingCollection
    const link = heritageLandmarkLinks.find((entry) => entry.officialId === 'sh-fgj-4A016-01')!
    const canonical = historical.features.find((feature) => feature.properties.id === link.landmarkFeatureId)!
    const unknown = structuredClone(canonical)
    unknown.properties.id = 'unreviewed-member'
    unknown.properties.sourceRecordIds = [99999]
    unknown.geometry = { type: 'Point', coordinates: [121.5, 31.3] }
    const input: HistoricalFeatureCollection = { type: 'FeatureCollection', features: [canonical, unknown] }
    const before = structuredClone(input)
    const result = linkHeritageLandmarks(input, heritage, [link])
    expect(result.byOfficialId.size).toBe(0)
    expect(result.byGroupId.size).toBe(0)
    expect(result.features).toEqual(before)
    expect(input).toEqual(before)
  })
})
