import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HistoricalFeatureCollection } from '../types'
import { fenyang83History } from './fenyang83History'
import { mergeLandmarkSites } from '../lib/landmarkSites'
import { historicalBuildingPeriod } from '../lib/buildingTimeline'
import { historicalFeatureAtYear, siteStageAtYear } from '../lib/siteTimeline'
import { buildPlaceDetails } from '../lib/placeDetails'
import { PlaceDetailsPanel } from '../components/PlaceDetailsPanel'
import { landmarkMapName } from '../lib/landmarkLabels'
import { makeSearchRecords, searchRecords } from '../lib/search'

const original = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
const reviewed = mergeLandmarkSites(original, [fenyang83History])
const before = original.features.find(feature => feature.properties.id === 'landmark-vs-site-413')!
const after = reviewed.features.find(feature => feature.properties.id === before.properties.id)!

describe('Polish representation and hospital history at Fenyang Road 83', () => {
  it('dates only the 413 record and retains its geometry, original name, address, source and the 1942 hospital record', () => {
    expect(after.geometry).toEqual(before.geometry)
    expect(after.properties.sourceRecordIds).toEqual(before.properties.sourceRecordIds)
    expect(after.properties.historicalAddresses).toEqual(before.properties.historicalAddresses)
    const record = after.properties.historicalRecords!.find(record => record.sourceRecordIds?.includes(413))!
    expect(record).toMatchObject({ name: 'Embassy of Poland', startYear: 1927, endYear: 1927,
      dateEvidence: { sourceUrl: expect.stringContaining('nodeId=103622') } })
    expect(record.sourceUrls).toEqual(before.properties.historicalRecords!.find(record => record.sourceRecordIds?.includes(413))!.sourceUrls)
    expect(after.properties.historicalRecords!.find(record => record.sourceRecordIds?.includes(1716)))
      .toEqual({ ...before.properties.historicalRecords!.find(record => record.sourceRecordIds?.includes(1716)), displayNameZh: '战时犹太医院' })
    expect(before.properties.historicalRecords!.find(record => record.sourceRecordIds?.includes(1716))!.displayNameZh).toBeUndefined()
    expect(before.properties.historicalRecords!.find(record => record.sourceRecordIds?.includes(413))!.startYear).toBeUndefined()
    expect(reviewed.features.filter(feature => feature.properties.id !== before.properties.id))
      .toEqual(original.features.filter(feature => feature.properties.id !== before.properties.id))
    expect(mergeLandmarkSites(reviewed, [fenyang83History])).toEqual(reviewed)
  })

  it.each([
    [1926, 'unknown', 'Shanghai Yutase Hospital'],
    [1927, 'record-span', 'Embassy of Poland'],
    [1942, 'latest-record', 'Shanghai Yutase Hospital'],
    [1951, 'latest-record', 'Shanghai Yutase Hospital'],
    [1952, 'reviewed-phase', '眼耳鼻喉科医院（汾阳院址）'],
    [2000, 'reviewed-phase', '眼耳鼻喉科医院（汾阳院址）'],
    [2001, 'reviewed-phase', '复旦大学附属眼耳鼻喉科医院（汾阳院区）'],
  ])('uses documented dates for %s without inventing a 1949 hospital opening', (year, status, name) => {
    expect(siteStageAtYear(after, year)).toMatchObject({ status, name })
  })

  it('shows 1927 with its date source and hospital phases in a single card, while retaining both VS catalogue links', () => {
    const details = buildPlaceDetails({ feature: after })
    expect(details).toMatchObject({ name: '复旦大学附属眼耳鼻喉科医院（汾阳院区）', address: '汾阳路83号' })
    expect(details.events.find(event => event.sourceRecordId === 413)).toMatchObject({ year: 1927, period: '1927 年',
      address: '83 ROUTE PICHON', description: expect.stringContaining('公使代办处') })
    expect(details.events.find(event => event.year === 1952)?.description).toContain('1952年7月1日')
    expect(details.events.some(event => event.year === 1949)).toBe(false)
    expect(details.catalogue.filter(source => source.title.includes('建筑记录'))).toHaveLength(2)
    const html = renderToStaticMarkup(<PlaceDetailsPanel details={details} onClose={() => undefined} />)
    expect(html).toContain('1927 年')
    expect(html).not.toContain('年份未知')
    expect(details.events.find(event => event.sourceRecordId === 1716)).toMatchObject({ name: '战时犹太医院', year: 1942 })
    expect(html).not.toContain('上海ュタセ醫院')
    const wartime = historicalFeatureAtYear(after, 1942)
    expect(buildPlaceDetails({ feature: wartime }).name).toBe('战时犹太医院')
    expect(landmarkMapName(wartime.properties)).toBe('战时犹太医院')
    expect(landmarkMapName(after.properties)).toBe('战时犹太医院')
    expect(searchRecords(makeSearchRecords([after]), '战时犹太医院')[0].modernNameZh).toBe('战时犹太医院')
    expect(buildPlaceDetails({ feature: historicalFeatureAtYear(after, 1952) }).address).toBe('汾阳路83号')
    expect(historicalBuildingPeriod(after)).toMatchObject({ startYear: 1927, basis: 'earliest-record' })
    expect(after.properties.buildingLifeDates?.built).toBeUndefined()
    expect(after.properties.historicalPhases!.every(phase => phase.relationship === 'site-use')).toBe(true)
  })

  it('fails closed for unexpected group members and withholds the date if the record name or old address changes', () => {
    const changed = structuredClone(original)
    changed.features.find(feature => feature.properties.id === before.properties.id)!.properties.sourceRecordIds!.push(9999)
    expect(mergeLandmarkSites(changed, [fenyang83History])).toEqual(changed)
    for (const field of ['name', 'address']) {
      const changed = structuredClone(original)
      const feature = changed.features.find(feature => feature.properties.id === before.properties.id)!
      if (field === 'name') feature.properties.historicalRecords!.find(record => record.sourceRecordIds?.includes(413))!.name = 'Another institution'
      else feature.properties.historicalAddresses!.find(address => address.sourceRecordId === 413)!.address = '83 OTHER ROAD'
      const result = mergeLandmarkSites(changed, [fenyang83History]).features.find(feature => feature.properties.id === before.properties.id)!
      expect(result.properties.historicalRecords!.find(record => record.sourceRecordIds?.includes(413))!.dateEvidence).toBeUndefined()
    }
  })
})
