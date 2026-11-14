import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { HistoricalFeatureCollection } from '../types'
import { mergeCuratedParkFeatures } from './parkLabels'
import { historicalFeatureAtYear, siteStageAtYear, historicalSiteVisibleAtYear } from './siteTimeline'
import { historicalBuildingPeriod } from './buildingTimeline'
import { landmarkMapName } from './landmarkLabels'
import { buildPlaceDetails } from './placeDetails'

const curated = JSON.parse(readFileSync('public/data/curated-parks.geojson', 'utf8')) as HistoricalFeatureCollection
const parks = mergeCuratedParkFeatures({ type: 'FeatureCollection', features: [] }, curated)
const park = (id: string) => parks.features.find(feature => feature.properties.featureGroupId === id)!

describe('reviewed park names on the map and cards', () => {
  it.each([
    ['yanzhong', 2001, '延中绿地'], ['taipingqiao', 2001, '太平桥公园'],
    ['xujiahui', 2001, '徐家汇公园'], ['jiuzi', 2006, '九子公园'], ['gucheng', 2002, '古城公园'],
  ])('shows modern park %s only from its opening year', (id, year, name) => {
    const feature = park(`park-modern-${id}`)
    const period = historicalBuildingPeriod(feature)
    expect(historicalSiteVisibleAtYear(feature, period, year - 1)).toBe(false)
    expect(historicalSiteVisibleAtYear(feature, period, year)).toBe(true)
    expect(landmarkMapName(historicalFeatureAtYear(feature, year).properties)).toBe(name)
    const card = buildPlaceDetails({ feature })
    expect(card.events.map(event => [event.year, event.name])).toEqual([[year, name]])
    expect(card.address).toBeTruthy()
  })
  it.each([
    [1909, '顾家宅公园（法国公园）'], [1943, '顾家宅公园（法国公园）'],
    [1944, '大兴公园'], [1945, '大兴公园'], [1946, '复兴公园'], [2026, '复兴公园'],
  ])('uses the sourced Fuxing Park name at %s', (year, name) => {
    const feature = historicalFeatureAtYear(park('park-french-park'), year)
    expect(landmarkMapName(feature.properties)).toBe(name)
    expect(buildPlaceDetails({ feature }).name).toBe(name)
  })
  it('does not show French Park before its opening', () => {
    const feature = park('park-french-park')
    expect(historicalSiteVisibleAtYear(feature, historicalBuildingPeriod(feature), 1908)).toBe(false)
  })
  it.each([
    ['park-paul-brunat-square', 1942, '宝昌公园'], ['park-paul-brunat-square', 1943, '迪化公园'],
    ['park-paul-brunat-square', 1953, '迪化公园'], ['park-paul-brunat-square', 1954, '乌鲁木齐路儿童公园'],
    ['park-paul-brunat-square', 1991, '乌鲁木齐路儿童公园'], ['park-paul-brunat-square', 1992, '聂耳音乐广场'],
    ['park-jessfield-park', 1943, '兆丰公园'], ['park-jessfield-park', 1944, '中山公园'],
    ['park-parc-ravinel', 1946, '林森公园'], ['park-parc-ravinel', 1950, '襄阳公园'],
    ['park-public-gardens', 1945, '春申公园'], ['park-public-gardens', 1946, '黄浦公园'],
    ['park-edan-park', 1943, '衡山公园'], ['park-hongkew-park', 1987, '虹口公园'],
    ['park-hongkew-park', 1988, '鲁迅公园'], ['park-xu-guangqi-tomb', 1978, '南丹公园'],
    ['park-xu-guangqi-tomb', 1983, '光启公园'], ['park-tatung-school-grounds', 1953, '蓬莱公园'],
  ])('selects %s at %s', (id, year, name) => {
    const stage = siteStageAtYear(park(id), year)
    expect(stage.nameZh || stage.name).toBe(name)
  })
  it('shows only reviewed naming stages while preserving original documentary records and sources', () => {
    const feature = structuredClone(park('park-french-park'))
    feature.properties.sourceRecordIds = [77]
    feature.properties.historicalRecords = [{ name: 'Koukaza Park', nameZh: '复兴公园',
      startYear: 1909, sourceUrls: ['https://www.virtualshanghai.net/Data/Buildings?ID=77'] }]
    const details = buildPlaceDetails({ feature })
    expect(details.events.map(event => [event.year, event.name])).toEqual([
      [1909, '顾家宅公园（法国公园）'], [1944, '大兴公园'], [1946, '复兴公园'],
    ])
    expect(feature.properties.historicalRecords[0].name).toBe('Koukaza Park')
    expect(details.sources.some(item => item.url.includes('ID=77'))).toBe(true)
    expect(details.sources.some(item => item.url.includes('1143025'))).toBe(true)
  })
})
