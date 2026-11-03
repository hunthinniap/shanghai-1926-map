import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HeritageBuildingCollection } from '../lib/heritageBuildings'
import { applyReviewedHeritageConstructionDates } from '../lib/heritageConstructionDates'
import { applyHeritageUses, type HeritageUseIndex } from '../lib/heritageUses'
import { heritageFeatureAtYear } from '../lib/siteTimeline'
import { makePlaceSearchRecords, searchRecords } from '../lib/search'
import { buildPlaceDetails } from '../lib/placeDetails'
import { PlaceDetailsPanel } from '../components/PlaceDetailsPanel'
import { reviewedHeritageSiteHistoryFor } from './heritageSiteHistories'

const original = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8')) as HeritageBuildingCollection
const collection = applyReviewedHeritageConstructionDates(original)
const target = collection.features.find(feature => feature.properties.officialId === 'sh-fgj-5D040-01')!

describe('construction and documented uses at Yueyang Road 44', () => {
  it('keeps 1927 as the house construction year, without dating the modern tenant or Huang Fu residence to that year', () => {
    const before = structuredClone(target)
    const details = buildPlaceDetails({ heritage: target })
    expect(details.events.find(event => event.kind === '建造年代')).toMatchObject({
      year: 1927, name: '岳阳路44号花园住宅', url: expect.stringContaining('b9946bf8'),
    })
    expect(details.events.filter(event => event.year === 1927)).toHaveLength(1)
    expect(details.residents.find(resident => resident.name === '黄郛')).toMatchObject({
      address: '岳阳路44号', sources: [expect.objectContaining({ url: expect.stringContaining('meet-in-shanghai.net') })],
    })
    expect(details.residents.find(resident => resident.name === '黄郛')?.period).toBeUndefined()
    expect(details.notes.find(note => note.label === '名录登记名称')?.value).toContain('市文广局老干部活动中心')
    expect(target).toEqual(before)
    expect(original.features.find(feature => feature.properties.officialId === target.properties.officialId)!.properties.constructionDate).toBeNull()
  })

  it.each([
    [1927, '岳阳路44号花园住宅', 'unknown'],
    [1968, '岳阳路44号花园住宅', 'unknown'],
    [1988, '上海音像资料馆', 'record-span'],
    [2018, '市文广局老干部活动中心', 'record-span'],
    [2026, '上海市文化和旅游局老干部服务中心', 'record-span'],
  ])('uses evidence for %s and keeps gaps separate from later tenants', (year, name, status) => {
    const projected = heritageFeatureAtYear(target, year as number)
    const details = buildPlaceDetails({ heritage: projected })
    expect(details.name).toBe(name)
    expect(projected.properties.timelineStage?.status).toBe(status)
    if (status === 'unknown') expect(details.questions.find(question => question.label === `${year}年用途`)).toBeDefined()
    const html = renderToStaticMarkup(<PlaceDetailsPanel details={details} onClose={() => undefined} />)
    expect(html).toContain('1988年初')
    expect(details.events.find(event => event.year === 2018)?.period).toBe('2018年资料记载')
    expect(details.events.find(event => event.year === 2026)?.description).toContain('不是机构迁入年份')
  })

  it('makes the house and its sourced former resident searchable while preserving directory names and geometry', () => {
    const index = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/historical-use-categories.json', 'utf8')) as HeritageUseIndex
    const result = applyHeritageUses({ type: 'FeatureCollection', features: [target] }, index)
    expect(result.features[0].properties.historicalDisplayName).toBe('岳阳路44号花园住宅')
    expect(result.features[0].properties.name).toBe('市文广局老干部活动中心')
    expect(result.features[0].geometry).toEqual(target.geometry)
    const records = makePlaceSearchRecords([], result.features)
    for (const query of ['黄郛旧居', '岳阳路44号', '市文广局老干部活动中心']) {
      expect(searchRecords(records, query).map(record => record.heritageOfficialId)).toEqual([target.properties.officialId])
    }
  })

  it('does not apply the researched history to another identity or address, and never uses a modern tenant as a construction event title', () => {
    for (const change of [{ officialId: 'another' }, { officialName: '另一机构' }, { address: '岳阳路45号' }]) {
      expect(reviewedHeritageSiteHistoryFor({ ...target.properties, ...change })).toBeUndefined()
    }
    const other = { ...target, properties: { ...target.properties, officialId: 'another', name: '现代机构' } }
    expect(buildPlaceDetails({ heritage: other }).events.find(event => event.kind === '建造年代')?.name).toBe('岳阳路44号建筑')
  })
})
