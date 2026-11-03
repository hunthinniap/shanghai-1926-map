import fs from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HistoricalFeatureCollection } from '../types'
import type { HeritageBuildingCollection } from '../lib/heritageBuildings'
import { applyReviewedHeritageConstructionDates } from '../lib/heritageConstructionDates'
import { mergeLandmarkSites } from '../lib/landmarkSites'
import { linkHeritageLandmarks } from '../lib/heritageLandmarkLinks'
import { heritageLandmarkLinks } from './heritageLandmarkLinks'
import { buildPlaceDetails } from '../lib/placeDetails'
import { PlaceDetailsPanel } from '../components/PlaceDetailsPanel'
import { reviewedUseHistoryForHeritage } from './heritageUseHistories'
import { shtongHeritageUseHistories, shtongLandmarkDateHistories } from './shtongDatedHistories'
import { shtongHeritageUseHistoriesBatch002 } from './shtongDatedHistoriesBatch002'

const original = JSON.parse(fs.readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
const heritage = applyReviewedHeritageConstructionDates(JSON.parse(fs.readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8')) as HeritageBuildingCollection)
const reviewed = mergeLandmarkSites(original, shtongLandmarkDateHistories)
const linked = linkHeritageLandmarks(reviewed, heritage, heritageLandmarkLinks)

describe('first full-chapter gazetteer date review', () => {
  it.each([...shtongHeritageUseHistories, ...shtongHeritageUseHistoriesBatch002])('dates the use of $name at the exact listed address and keeps construction separate', review => {
    const target = heritage.features.find(feature => feature.properties.officialId === review.officialId)!
    expect(target).toBeDefined()
    const before = structuredClone(target)
    const details = buildPlaceDetails({ heritage: target, linked: linked.byOfficialId.get(review.officialId) })
    expect(details.events.find(event => event.name === review.name && event.kind === '使用沿革')).toMatchObject({
      period: review.period, year: review.year, address: review.expectedAddress, url: review.sourceUrl,
    })
    expect(details.events.some(event => event.name === review.name && event.year === undefined && event.kind === '名录公布时名称')).toBe(false)
    expect(details.sources.find(source => source.url === review.sourceUrl)?.note).toContain(review.note)
    expect(details.sources.find(source => source.url === review.sourceUrl)?.note).not.toContain('1963年5月')
    const construction = details.events.find(event => event.key === `construction-${review.officialId}`)
    const withoutUseReview = buildPlaceDetails({ heritage: { ...target, properties: { ...target.properties, listedName: '未经补年的名录单位' } } })
    expect(construction).toEqual(withoutUseReview.events.find(event => event.key === `construction-${review.officialId}`))
    const html = renderToStaticMarkup(<PlaceDetailsPanel details={details} onClose={() => undefined} />)
    expect(html).toContain(review.period)
    expect(target).toEqual(before)
    for (const change of [{ officialId: 'other' }, { officialName: '其他机构' }, { address: '其他地址' }, { listedName: '其他名称' }]) {
      expect(reviewedUseHistoryForHeritage({ ...target.properties, ...change })).toBeUndefined()
    }
  })

  it.each(shtongLandmarkDateHistories.flatMap(link => link.recordDates!.map(record => ({ link, record }))))(
    'only dates guarded source record $record.sourceRecordId, retaining its name, address, VS link and map geometry', ({ link, record }) => {
      const before = original.features.find(feature => feature.properties.id === link.canonicalFeatureId)!
      const after = reviewed.features.find(feature => feature.properties.id === link.canonicalFeatureId)!
      expect(after.geometry).toEqual(before.geometry)
      expect(after.properties.sourceRecordIds).toEqual(before.properties.sourceRecordIds)
      expect(after.properties.historicalAddresses).toEqual(before.properties.historicalAddresses)
      const dated = after.properties.historicalRecords!.find(item => item.sourceRecordIds?.includes(record.sourceRecordId))!
      expect(dated).toMatchObject({ name: record.expectedName, startYear: record.year, endYear: record.year, dateEvidence: record.evidence })
      expect(dated.sourceUrls?.some(url => url.includes(`ID=${record.sourceRecordId}`))).toBe(true)
      const details = buildPlaceDetails({ feature: after })
      expect(details.events.find(event => event.sourceRecordId === record.sourceRecordId)).toMatchObject({
        year: record.year, url: record.evidence.sourceUrl, description: record.evidence.note, address: record.expectedAddress,
      })
      expect(before.properties.historicalRecords?.find(item => item.sourceRecordIds?.includes(record.sourceRecordId))?.startYear).toBeUndefined()
      const changed = structuredClone(original)
      const feature = changed.features.find(feature => feature.properties.id === link.canonicalFeatureId)!
      feature.properties.historicalAddresses!.find(address => address.sourceRecordId === record.sourceRecordId)!.address = 'OTHER ROAD'
      const withheld = mergeLandmarkSites(changed, [link]).features.find(feature => feature.properties.id === link.canonicalFeatureId)!
      expect(withheld.properties.historicalRecords!.find(item => item.sourceRecordIds?.includes(record.sourceRecordId))!.dateEvidence).toBeUndefined()
      const existing = structuredClone(after)
      existing.properties.historicalRecords!.find(item => item.sourceRecordIds?.includes(record.sourceRecordId))!.startYear = 1901
      const protectedRecord = mergeLandmarkSites({ type: 'FeatureCollection', features: [existing] }, [link]).features[0]
        .properties.historicalRecords!.find(item => item.sourceRecordIds?.includes(record.sourceRecordId))!
      expect(protectedRecord.startYear).toBe(1901)
    })

  it('preserves unrelated features, repeated application and all four original map groups', () => {
    expect(reviewed.features).toHaveLength(original.features.length)
    const affected = new Set(shtongLandmarkDateHistories.map(link => link.canonicalFeatureId))
    expect(reviewed.features.filter(feature => !affected.has(feature.properties.id))).toEqual(original.features.filter(feature => !affected.has(feature.properties.id)))
    expect(mergeLandmarkSites(reviewed, shtongLandmarkDateHistories)).toEqual(reviewed)
    expect(shtongLandmarkDateHistories).toHaveLength(4)
    expect(shtongLandmarkDateHistories.flatMap(link => link.recordDates!)).toHaveLength(5)
    const court = reviewed.features.find(feature => feature.properties.id === 'landmark-vs-site-776')!
    expect(court.properties.historicalRecords?.map(record => [record.sourceRecordIds![0], record.startYear])).toEqual([[776, 1931], [777, 1930]])
  })
})
