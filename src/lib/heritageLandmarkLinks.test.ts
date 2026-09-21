import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { heritageLandmarkLinks } from '../data/heritageLandmarkLinks'
import { landmarkSiteLinks } from '../data/landmarkSiteLinks'
import type { HistoricalFeatureCollection } from '../types'
import type { HeritageBuildingCollection } from './heritageBuildings'
import { linkHeritageLandmarks, withReviewedHeritageAliases } from './heritageLandmarkLinks'
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
    expect(result.byGroupId.size).toBe(heritageLandmarkLinks.reduce((count, link) => count + 1 + (link.additionalLandmarks?.length ?? 0), 0))
    const heldIds = new Set<number>(JSON.parse(readFileSync('scripts/data/landmark-current-use-holds.json', 'utf8'))
      .flatMap((hold: { sourceRecordIds: number[] }) => hold.sourceRecordIds))
    for (const linked of result.byOfficialId.values()) {
      expect(linked.link.expectedSourceRecordIds.some((id) => heldIds.has(id))).toBe(false)
      const allIds = [linked.link, ...(linked.link.additionalLandmarks ?? [])].flatMap((member) => member.expectedSourceRecordIds)
      expect(allIds.some((id) => heldIds.has(id))).toBe(false)
      expect(linked.link.historicalAddresses.every((address) => allIds.includes(address.sourceRecordId))).toBe(true)
      const positioned = result.features.features.find((feature) => feature.properties.id === linked.link.landmarkFeatureId)!
      expect(positioned.geometry).toEqual(linked.heritage.geometry)
      const currentFields = (feature: typeof positioned) => Object.fromEntries(Object.entries(feature.properties).filter(([key]) => key.startsWith('current')))
      expect(currentFields(positioned)).toEqual(currentFields(linked.landmark))
    }
    const sourceIds = result.features.features.flatMap((feature) => feature.properties.sourceRecordIds ?? [])
    expect(sourceIds).toHaveLength(1803)
    expect(new Set(sourceIds).size).toBe(1803)
  })

  it('shares the HSBC card and heritage point while keeping the 1874 record and 1923 building separate', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-1A003-01')!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byGroupId.get('landmark-vs-site-526')!
    expect(place.link.relation).toBe('same-historical-site')
    expect(place.landmark.properties.labelYear).toBe(1874)
    expect(place.heritage.properties.constructionDate).toBe('1923年')
    expect(place.link.historicalAddresses[0].address).toBe('12 BUND ROAD')
    expect(place.link.modernAddress?.address).toBe('中山东一路12号')
    expect(place.heritage.properties.address).toBe('中山东一路10-12号')
    const records = makeSearchRecords(result.features.features)
    for (const query of ['Hongkong & Shanghai Banking Corporation', '汇丰银行大楼', '12 BUND ROAD', '中山东一路12号']) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe('landmark-vs-site-526')
    }
  })

  it('combines old and new Wing On buildings in one listed-complex card without losing either history', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-1A019-01')!
    const before = structuredClone(historical)
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const old = result.byGroupId.get('landmark-vs-site-681')!
    expect(old).toBe(result.byGroupId.get('landmark-vs-site-631'))
    expect(old.landmarks).toHaveLength(2)
    expect(old.landmark.properties.sourceRecordIds).toEqual([681, 631])
    expect(old.landmark.properties.historicalRecords?.flatMap((record) => record.sourceRecordIds)).toEqual(expect.arrayContaining([681, 631]))
    expect(old.landmark.properties.historicalRecords?.map((record) => [record.startYear, record.endYear])).toEqual([[1918, 1918], [1935, 1935]])
    expect(result.features.features.filter((feature) => feature.properties.heritageOfficialId === link.officialId)).toHaveLength(1)
    const records = makeSearchRecords(result.features.features)
    for (const query of ['CHEKIANG ROAD / NANKING ROAD', '627 NANKING ROAD', 'Wing On Company (New Building)', '南京东路627号', '七重天大厦']) {
      expect(searchRecords(records, query)[0].featureGroupId).toBe('landmark-vs-site-681')
    }
    expect(historical).toEqual(before)
    const incomplete = structuredClone(historical)
    incomplete.features = incomplete.features.filter((feature) => feature.properties.id !== 'landmark-vs-site-631')
    expect(linkHeritageLandmarks(incomplete, heritage, [link]).byOfficialId.size).toBe(0)
    const changed = structuredClone(historical)
    changed.features.find((feature) => feature.properties.id === 'landmark-vs-site-631')!.properties.sourceRecordIds!.push(99999)
    expect(linkHeritageLandmarks(changed, heritage, [link]).byOfficialId.size).toBe(0)
    expect(linkHeritageLandmarks(historical, heritage, [link, {
      ...link, officialId: 'another-listing', landmarkFeatureId: 'landmark-vs-site-631',
      expectedSourceRecordIds: [631], additionalLandmarks: undefined,
    }]).byOfficialId.size).toBe(0)
  })

  it.each([
    { id: 1763, code: '2C010', aliases: ['King Albert Apartments', "King'S Albert Apartments", '陕南村', '陕南邨', '亚尔培公寓', '金亚尔培公寓'], oldAddress: '377 AVENUE DU ROI ALBERT', newAddress: '陕西南路157-187号', relation: 'same-listed-complex' },
    { id: 218, code: '3C013', aliases: ['Dubail Apartments', '吕班公寓', '重庆公寓'], oldAddress: '181 AVENUE DUBAIL', newAddress: '重庆南路185号', relation: 'same-listed-building' },
    { id: 1438, code: '4M007', aliases: ['Yue Apartments', '月邨', '月村'], oldAddress: '472 EDINBURGH ROAD', newAddress: '江苏路480弄', relation: 'same-listed-complex' },
    { id: 357, code: '2D041', aliases: ['新乐路东正教堂', '圣母大堂'], oldAddress: '55 ROUTE PAUL HENRY', newAddress: '新乐路55号', relation: 'same-listed-building' },
    { id: 671, code: '1A023', aliases: ['Metropol Cinema', '大上海大戏院'], oldAddress: '500 YUYACHING ROAD', newAddress: '西藏中路500号', relation: 'same-historical-site' },
  ])('resolves reviewed body-text aliases for $code without inventing source dates or addresses', (entry) => {
    const links = heritageLandmarkLinks.filter((link) => link.officialId === `sh-fgj-${entry.code}-01`)
    const result = linkHeritageLandmarks(historical, heritage, links)
    const groupId = `landmark-vs-site-${entry.id}`
    const place = result.byGroupId.get(groupId)!
    expect(place.link.relation).toBe(entry.relation)
    expect(place.link.historicalAddresses.map((address) => address.address)).toContain(entry.oldAddress)
    expect(place.link.modernAddress?.address || place.heritage.properties.address).toContain(entry.newAddress)
    const original = historical.features.find((feature) => feature.properties.id === groupId)!
    expect(place.landmark.properties).toEqual(original.properties)
    const records = makeSearchRecords(result.features.features)
    for (const query of entry.aliases) expect(searchRecords(records, query)[0].featureGroupId).toBe(groupId)
  })

  it('finds new aliases before heritage loading without changing geometry, dates or source data', () => {
    const original = historical.features.find((feature) => feature.properties.id === 'landmark-vs-site-1763')!
    const snapshot = structuredClone(original)
    const result = withReviewedHeritageAliases([original], heritageLandmarkLinks)
    expect(result[0].geometry).toEqual(original.geometry)
    expect(result[0].properties.labelYearIsFallback).toBe(true)
    expect(result[0].properties.labelYear).toBe(original.properties.labelYear)
    expect(result[0].properties.heritageOfficialId).toBeUndefined()
    for (const query of ['King Albert Apartments', '金亚尔培公寓', '陕南村']) {
      expect(searchRecords(makeSearchRecords(result), query)[0].featureGroupId).toBe(original.properties.featureGroupId)
    }
    expect(original).toEqual(snapshot)
  })

  it('does not assign reviewed aliases to changed, duplicated or competing group members', () => {
    const original = historical.features.find((feature) => feature.properties.id === 'landmark-vs-site-1763')!
    const changed = structuredClone(original)
    changed.properties.sourceRecordIds!.push(99999)
    expect(withReviewedHeritageAliases([changed], heritageLandmarkLinks)).toEqual([changed])
    expect(withReviewedHeritageAliases([original, original], heritageLandmarkLinks)).toEqual([original, original])
    const link = heritageLandmarkLinks.find((item) => item.expectedSourceRecordIds.includes(1763))!
    expect(withReviewedHeritageAliases([original], [link, { ...link, officialId: 'another-place' }])).toEqual([original])
  })

  it('preserves an unknown bank-record year when sharing the Union Building card', () => {
    const link = heritageLandmarkLinks.find((item) => item.officialId === 'sh-fgj-2A002-01')!
    const result = linkHeritageLandmarks(historical, heritage, [link])
    const place = result.byGroupId.get('landmark-vs-site-548')!
    expect(place).toBe(result.byGroupId.get('landmark-vs-site-551'))
    expect(place.landmark.properties.sourceRecordIds).toEqual([548, 551])
    const bankRecord = place.landmark.properties.historicalRecords!.find((record) => record.sourceRecordIds?.includes(551))!
    expect(bankRecord.startYear).toBeUndefined()
    expect(bankRecord.endYear).toBeUndefined()
    expect(result.features.features.filter((feature) => feature.properties.heritageOfficialId === link.officialId)).toHaveLength(1)
  })
})
