import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { applyReviewedHeritageConstructionDates } from './heritageConstructionDates'
import type { HeritageBuildingCollection } from './heritageBuildings'
import { heritageBuildingPeriod, visibleAtYear } from './buildingTimeline'
import registry from '../data/heritageConstructionDateReviews.json'
import { shtongConstructionDateReviews } from '../data/shtongDatedHistoriesBatch002'
const allReviews = [...registry.records, ...shtongConstructionDateReviews]

const collection: HeritageBuildingCollection = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8'))

describe('reviewed construction date evidence', () => {
  it('applies exactly the reviewed identities, preserves source fields and does not mutate input', () => {
    const original = JSON.stringify(collection)
    const result = applyReviewedHeritageConstructionDates(collection)
    const applied = result.features.filter(feature => feature.properties.constructionDateEvidence)
    expect(applied).toHaveLength(allReviews.length)
    expect(new Set(allReviews.map(review => review.officialId)).size).toBe(allReviews.length)
    for (const review of allReviews) {
      const before = collection.features.find(feature => feature.properties.officialId === review.officialId)!
      const after = result.features.find(feature => feature.properties.officialId === review.officialId)!
      expect(after.properties.constructionDate).toBe(review.dateText)
      expect(after.properties.constructionDateEvidence?.sourceUrl).toMatch(/^https:\/\//)
      expect({ ...after.properties, constructionDate: before.properties.constructionDate, constructionDateEvidence: undefined })
        .toEqual({ ...before.properties, constructionDateEvidence: undefined })
      expect(after.geometry).toEqual(before.geometry)
      expect(heritageBuildingPeriod(after).startYear).toBeDefined()
    }
    expect(JSON.stringify(collection)).toBe(original)
  })
  it('uses a synagogue completion year and a rebuilt bridge year, not institution or predecessor dates', () => {
    const result = applyReviewedHeritageConstructionDates(collection)
    const church = result.features.find(feature => feature.properties.officialId === 'sh-fgj-2B014-01')!
    expect(heritageBuildingPeriod(church).startYear).toBe(1920)
    expect(visibleAtYear(heritageBuildingPeriod(church), 1919)).toBe(false)
    expect(visibleAtYear(heritageBuildingPeriod(church), 1920)).toBe(true)
    const bridge = result.features.find(feature => feature.properties.officialId === 'sh-fgj-2A013-01')!
    expect(heritageBuildingPeriod(bridge).startYear).toBe(1927)
  })
  it('keeps conflicts and other building scopes unresolved', () => {
    const result = applyReviewedHeritageConstructionDates(collection)
    for (const id of ['sh-fgj-2D041-01', 'sh-fgj-2H001-01', 'sh-fgj-2A014-01']) {
      const before = collection.features.find(feature => feature.properties.officialId === id)!
      expect(result.features.find(feature => feature.properties.officialId === id)).toBe(before)
    }
  })
  it('dates Yicun from its construction record rather than a resident arrival or listing year', () => {
    const result = applyReviewedHeritageConstructionDates(collection)
    const village = result.features.find(feature => feature.properties.officialId === 'sh-fgj-2D008-01')!
    expect(village.properties.constructionDate).toBe('1942年')
    expect(village.properties.constructionDateEvidence?.originalText).toBeNull()
    expect(village.properties.constructionDateEvidence?.sourceUrl).toContain('web.archive.org/web/20211220055148')
    expect(visibleAtYear(heritageBuildingPeriod(village), 1941)).toBe(false)
    expect(visibleAtYear(heritageBuildingPeriod(village), 1942)).toBe(true)
    expect(village.properties.officialName).toBe('逸村')
    expect(village.properties.address).toBe('淮海中路1610弄')
  })
  it('separates original construction from later added floors and repairs', () => {
    const result = applyReviewedHeritageConstructionDates(collection)
    for (const [id, year] of [['sh-fgj-3F002-01', 1928], ['sh-fgj-3F009-01', 1927],
      ['sh-fgj-3A006-01', 1921], ['sh-fgj-3A007-01', 1921]] as const) {
      const feature = result.features.find(feature => feature.properties.officialId === id)!
      expect(heritageBuildingPeriod(feature).startYear).toBe(year)
      expect(feature.properties.constructionDateEvidence?.originalText).toMatch(/加建/)
    }
  })
  it('does not apply evidence after identity, address or original date changes', () => {
    const original = collection.features.find(feature => feature.properties.officialId === registry.records[0].officialId)!
    for (const change of [{ address: '不同门址' }, { officialName: '不同建筑' }, { constructionDate: '2000年' }]) {
      const altered = { ...original, properties: { ...original.properties, ...change } }
      expect(applyReviewedHeritageConstructionDates({ type: 'FeatureCollection', features: [altered] }).features[0]).toBe(altered)
    }
  })
  it('separates the Astor House building from its predecessor institution and later lobby renovation', () => {
    const before = collection.features.find(feature => feature.properties.officialId === 'sh-fgj-3F005-01')!
    const after = applyReviewedHeritageConstructionDates(collection).features.find(feature => feature.properties.officialId === before.properties.officialId)!
    expect(after.properties.constructionDate).toBe('1907年')
    expect(after.properties.constructionDateEvidence).toMatchObject({ originalText: '1907（1922年改建底楼大厅）', reviewedOn: '2026-11-02' })
    expect(after.properties.constructionDateEvidence?.note).toContain('1922年底层大厅改建')
    expect(heritageBuildingPeriod(after).startYear).toBe(1907)
    expect(after.geometry).toEqual(before.geometry)
    for (const change of [{ officialName: '不同建筑' }, { address: '不同地址' }, { constructionDate: '1910年' }]) {
      const changed = { ...before, properties: { ...before.properties, ...change } }
      expect(applyReviewedHeritageConstructionDates({ type: 'FeatureCollection', features: [changed] }).features[0]).toBe(changed)
    }
  })
})
