import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { heritageLandmarkLinks } from '../data/heritageLandmarkLinks'
import { landmarkSiteLinks } from '../data/landmarkSiteLinks'
import type { HistoricalFeatureCollection } from '../types'
import type { HeritageBuildingCollection } from './heritageBuildings'
import { linkHeritageLandmarks } from './heritageLandmarkLinks'
import { makeSearchRecords, searchRecords } from './search'
import { mergeCuratedParkFeatures } from './parkLabels'
import { mergeLandmarkSites } from './landmarkSites'

const historical = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
const heritage = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8')) as HeritageBuildingCollection
const nanjing = heritageLandmarkLinks.filter((link) => link.officialId === 'sh-fgj-4A016-01')

describe('reviewed heritage and historical landmark identities', () => {
  it('uses the heritage point for Nanjing Hotel without changing either source collection', () => {
    const oldSnapshot = JSON.stringify(historical)
    const heritageSnapshot = JSON.stringify(heritage)
    const linked = linkHeritageLandmarks(historical, heritage, nanjing)
    const place = linked.byOfficialId.get('sh-fgj-4A016-01')!
    expect(linked.byGroupId.get('landmark-vs-site-609')).toBe(place)
    const positioned = linked.features.features.find((feature) => feature.properties.id === 'landmark-vs-site-609')!
    expect(positioned.geometry).toEqual(place.heritage.geometry)
    expect(place.landmark.geometry).toEqual({ type: 'Point', coordinates: [121.477603, 31.239438] })
    expect(positioned.properties.sourceRecordIds).toEqual([609])
    expect(place.link.historicalAddresses[0].address).toBe('200 SHANSE ROAD')
    expect(JSON.stringify(historical)).toBe(oldSnapshot)
    expect(JSON.stringify(heritage)).toBe(heritageSnapshot)
    expect(linked.features.features.filter((feature) => feature.properties.id !== 'landmark-vs-site-609'))
      .toEqual(historical.features.filter((feature) => feature.properties.id !== 'landmark-vs-site-609'))
  })

  it('finds the shared building by its historical name, listed name and both addresses', () => {
    const linked = linkHeritageLandmarks(historical, heritage, nanjing)
    const records = makeSearchRecords(linked.features.features)
    for (const name of ['Nanjing Hotel', '南京饭店', '200 SHANSE ROAD', '山西南路182-200号']) {
      expect(searchRecords(records, name).map((record) => record.featureGroupId)).toEqual(['landmark-vs-site-609'])
    }
  })

  it.each([
    { id: 580, officialId: 'sh-fgj-1A025-01', name: 'Trinity Church', chinese: '圣三一基督教堂', oldAddress: '210 HANKOW ROAD', newAddress: '九江路201号', year: 1869 },
    { id: 679, officialId: 'sh-fgj-1A018-01', name: "Moore's Memorial Church", chinese: '沐恩堂', oldAddress: '316 YUYACHING ROAD', newAddress: '西藏中路316号', year: 1892 },
  ])('resolves $name through its reviewed history while retaining the original date and address', (entry) => {
    const links = heritageLandmarkLinks.filter((link) => link.officialId === entry.officialId)
    const linked = linkHeritageLandmarks(historical, heritage, links)
    const place = linked.byGroupId.get(`landmark-vs-site-${entry.id}`)!
    expect(place.heritage.properties.officialId).toBe(entry.officialId)
    expect(place.landmark.properties.labelYear).toBe(entry.year)
    expect(place.link.historicalAddresses.map((address) => address.address)).toContain(entry.oldAddress)
    expect(place.heritage.properties.address).toBe(entry.newAddress)
    const records = makeSearchRecords(linked.features.features)
    for (const query of [entry.name, entry.chinese]) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe(`landmark-vs-site-${entry.id}`)
    }
  })

  it('keeps the historical map usable before heritage data is loaded', () => {
    const result = linkHeritageLandmarks(historical, undefined, nanjing)
    expect(result.features).toBe(historical)
    expect(result.byGroupId.size).toBe(0)
  })

  it('rejects additional group members, missing listed buildings and conflicting associations', () => {
    const changed = structuredClone(historical)
    changed.features.find((feature) => feature.properties.id === 'landmark-vs-site-609')!.properties.sourceRecordIds = [609, 99999]
    expect(linkHeritageLandmarks(changed, heritage, nanjing).byGroupId.size).toBe(0)
    expect(linkHeritageLandmarks(historical, { type: 'FeatureCollection', features: [] }, nanjing).byGroupId.size).toBe(0)
    expect(linkHeritageLandmarks(historical, heritage, [...nanjing, { ...nanjing[0], officialId: 'another-listing' }]).byGroupId.size).toBe(0)
    expect(linkHeritageLandmarks(historical, heritage, [...nanjing, { ...nanjing[0], landmarkFeatureId: 'another-place' }]).byGroupId.size).toBe(0)
  })

  it('applies every reviewed association against actual runtime groups without losing source IDs or bypassing holds', () => {
    const parks = JSON.parse(readFileSync('public/data/curated-parks.geojson', 'utf8')) as HistoricalFeatureCollection
    const runtime = mergeLandmarkSites(mergeCuratedParkFeatures(historical, parks), landmarkSiteLinks)
    const result = linkHeritageLandmarks(runtime, heritage, heritageLandmarkLinks)
    expect(result.byOfficialId.size).toBe(heritageLandmarkLinks.length)
    expect(result.byGroupId.size).toBe(heritageLandmarkLinks.length)
    const heldIds = new Set<number>(JSON.parse(readFileSync('scripts/data/landmark-current-use-holds.json', 'utf8'))
      .flatMap((hold: { sourceRecordIds: number[] }) => hold.sourceRecordIds))
    for (const linked of result.byOfficialId.values()) {
      expect(linked.link.expectedSourceRecordIds.some((id) => heldIds.has(id))).toBe(false)
      expect(linked.link.historicalAddresses.every((address) => linked.link.expectedSourceRecordIds.includes(address.sourceRecordId))).toBe(true)
      const positioned = result.features.features.find((feature) => feature.properties.id === linked.link.landmarkFeatureId)!
      expect(positioned.geometry).toEqual(linked.heritage.geometry)
      const currentFields = (feature: typeof positioned) => Object.fromEntries(Object.entries(feature.properties).filter(([key]) => key.startsWith('current')))
      expect(currentFields(positioned)).toEqual(currentFields(linked.landmark))
    }
    const sourceIds = result.features.features.flatMap((feature) => feature.properties.sourceRecordIds ?? [])
    expect(sourceIds).toHaveLength(1803)
    expect(new Set(sourceIds).size).toBe(1803)
  })
})
