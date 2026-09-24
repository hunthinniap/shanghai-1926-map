import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { reviewedLandmarkIdentities } from '../data/reviewedLandmarkIdentities'
import type { HistoricalFeatureCollection } from '../types'
import { makeSearchRecords, searchRecords } from './search'
import { applyReviewedLandmarkIdentities } from './reviewedLandmarkIdentities'

const historical = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection

describe('reviewed landmark-only identities', () => {
  it('identifies Carmelite Convent as 加尔默罗会圣若瑟圣衣院 without changing source geometry or dates', () => {
    const original = historical.features.find((feature) => feature.properties.id === 'landmark-vs-site-499')!
    const snapshot = structuredClone(original)
    const result = applyReviewedLandmarkIdentities(
      { type: 'FeatureCollection', features: [original] },
      reviewedLandmarkIdentities,
    )
    expect(result.features[0].properties.modernNameZh).toBe('加尔默罗会圣若瑟圣衣院')
    expect(result.features[0].properties.sourceRecordIds).toEqual([499, 1554])
    expect(result.features[0].properties.labelYear).toBe(1874)
    expect(result.features[0].geometry).toEqual(original.geometry)
    for (const query of ['Carmelite Convent', '圣衣院', '徐家汇圣衣院', '加尔默罗会圣若瑟圣衣院']) {
      expect(searchRecords(makeSearchRecords(result.features), query)[0].featureGroupId).toBe('landmark-vs-site-499')
    }
    expect(original).toEqual(snapshot)
  })

  it('does not apply a reviewed identity to changed membership', () => {
    const changed = structuredClone(historical.features.find((feature) => feature.properties.id === 'landmark-vs-site-499')!)
    changed.properties.sourceRecordIds = [499]
    const input: HistoricalFeatureCollection = { type: 'FeatureCollection', features: [changed] }
    expect(applyReviewedLandmarkIdentities(input, reviewedLandmarkIdentities)).toEqual(input)
  })
})
