import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { HistoricalFeatureCollection } from '../types'
import { applyReviewedBridgeHistories } from '../data/bridgeHistories'
import { historicalFeatureAtYear, siteStageAtYear } from './siteTimeline'
import { buildPlaceDetails } from './placeDetails'

const raw = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
const reviewed = applyReviewedBridgeHistories(raw)
const bridge = (id: number) => reviewed.features.find(feature => feature.properties.id === `landmark-vs-site-${id}`)!

describe('Suzhou Creek bridge identities and names', () => {
  it.each([
    [1332, 1928, '新垃圾桥'], [1332, 1941, '新垃圾桥'], [1332, 1942, '西藏路桥'], [1332, 1996, '西藏路桥'],
    [1336, 1908, '老垃圾桥'], [1336, 1942, '浙江路桥'], [1336, 1996, '浙江路桥'],
    [1365, 1945, '老闸桥'], [1365, 1946, '福建路桥'], [1365, 1996, '福建路桥'],
    [1366, 1955, '盆汤弄桥'], [1366, 1956, '盆汤弄桥旧址'], [1366, 1996, '盆汤弄桥旧址'], [1366, 2007, '山西路桥'],
    [1368, 1925, '河南路桥'], [1368, 1996, '河南路桥'],
    [1406, 1928, '曹家渡桥'], [1406, 1980, '曹杨路桥'],
  ])('selects bridge %s name at %s', (id, year, name) => {
    const stage = siteStageAtYear(bridge(id), year)
    expect(stage.nameZh || stage.name).toBe(name)
    expect(buildPlaceDetails({ feature: historicalFeatureAtYear(bridge(id), year) }).name).toBe(name)
  })
  it('preserves documentary names and source points while correcting the warehouse misclassification', () => {
    const before = raw.features.find(feature => feature.properties.id === 'landmark-vs-site-1332')!
    expect(bridge(1332).geometry).toEqual(before.geometry)
    expect(bridge(1332).properties.historicalName).toBe('New Garbage Bridge')
    expect(bridge(1332).properties.category).toBe('桥梁')
    const railway = buildPlaceDetails({ feature: bridge(1368) })
    expect(railway.name).toBe('河南路桥')
    expect(railway.sources.some(item => item.url.includes('1368'))).toBe(true)
    expect(railway.events.map(event => event.name)).toEqual(['河南路桥'])
    expect(bridge(1368).properties.aliases).toContain('Railway Bridge')
  })
  it('requires both source ID and original name before applying a reviewed identity', () => {
    const changed = structuredClone(bridge(1332))
    changed.properties.sourceRecordIds = [999]
    changed.properties.historicalPhases = undefined
    expect(applyReviewedBridgeHistories({ type: 'FeatureCollection', features: [changed] }).features[0]).toBe(changed)
  })
})
