import { describe, expect, it } from 'vitest'
import type { HistoricalFeature } from '../types'
import { buildPlaceDetails } from './placeDetails'
import { historicalFeatureAtYear } from './siteTimeline'
import type { NotableResident } from '../types'
import { reviewedResidentsForHeritage } from '../data/notableResidents'

const feature = {
  type: 'Feature', geometry: { type: 'Point', coordinates: [121.47, 31.23] }, properties: {
    id: 'site', featureGroupId: 'site', kind: 'landmark', historicalName: 'Old School', modernNameZh: '旧学校',
    category: '学校', priority: 1, jurisdiction: 'old-city', language: 'en', labelYear: 1900,
    sourceIds: ['vs-buildings'], sourceRecordIds: [1, 2, 3],
    historicalAddresses: [{ sourceRecordId: 1, address: '10 OLD ROAD' }, { sourceRecordId: 2, address: '20 OTHER ROAD' }],
    historicalRecords: [
      { name: 'Cinema', nameZh: '影院', startYear: 1930, sourceRecordIds: [2], sourceUrls: ['http://www.virtualshanghai.net/Data/Buildings?ID=2'] },
      { name: 'Old School', nameZh: '旧学校', startYear: 1900, sourceRecordIds: [1], sourceUrls: ['https://www.virtualshanghai.net/数据/建筑?ID=1'] },
      { name: 'Unknown name', sourceRecordIds: [3], sourceUrls: ['https://example.org/undated'] },
    ],
  },
} satisfies HistoricalFeature

describe('place card evidence organization', () => {
  it('pairs a documented current Chinese park name with its current English name, retaining the old name in the timeline', () => {
    const park: HistoricalFeature = { ...feature, properties: { ...feature.properties,
      historicalName: 'Parc Ravinel', modernNameZh: '襄阳公园', modernNameEn: 'Xiangyang Park',
      currentNameZh: '襄阳公园', currentUseSourceUri: 'https://example.org/park-history', historicalRecords: undefined,
    } }
    const result = buildPlaceDetails({ feature: park })
    expect([result.name, result.foreignName]).toEqual(['襄阳公园', 'Xiangyang Park'])
    expect(result.events.some(event => event.originalName === 'Parc Ravinel')).toBe(true)
  })
  it('keeps residence periods and house numbers with their sources, omits unsourced claims and does not mutate input', () => {
    const residents: NotableResident[] = [
      { name: '有居住记录的人', period: '1948年', address: '某路2号', sources: [{ title: '居住资料', url: 'https://example.org/residence' }] },
      { name: '居住时间未载的人', sources: [{ url: 'https://example.org/residence-2' }] },
      { name: '仅为传闻的人', sources: [] },
    ]
    const value = { ...feature, properties: { ...feature.properties, notableResidents: residents } }
    const before = structuredClone(value)
    const result = buildPlaceDetails({ feature: value })
    expect(result.residents).toHaveLength(2)
    expect(result.residents[0]).toMatchObject({ name: '有居住记录的人', period: '1948年', address: '某路2号' })
    expect(result.residents[1].period).toBeUndefined()
    expect(result.sources.some(source => source.url === 'https://example.org/residence')).toBe(true)
    expect(value).toEqual(before)
  })
  it('only attaches reviewed Yicun residents to the matching directory identity and address', () => {
    const identity = { officialId: 'sh-fgj-2D008-01', officialName: '逸村', address: '淮海中路1610弄' }
    expect(reviewedResidentsForHeritage(identity).map(resident => [resident.name, resident.address])).toEqual([
      ['蒋经国', '淮海中路1610弄2号'], ['徐恩曾', '淮海中路1610弄7号'],
    ])
    expect(reviewedResidentsForHeritage({ ...identity, officialName: '其他住宅' })).toEqual([])
    expect(reviewedResidentsForHeritage({ ...identity, address: '其他路1号' })).toEqual([])
  })
  it('retains the former land use and separates unresolved current use from historical notes', () => {
    const value: HistoricalFeature = { ...feature, properties: { ...feature.properties,
      historicalUse: 'racecourse', currentUse: '现使用单位待核。',
    } }
    const result = buildPlaceDetails({ feature: value })
    expect(result.notes.find(item => item.label === '民国时期用途')?.value).toBe('跑马场')
    expect(result.questions.find(item => item.label === '现在用途')?.value).toBe('现使用单位待核。')
    expect(result.notes.some(item => item.value.includes('现使用单位待核'))).toBe(false)
  })
  it('sorts source records, keeps each old address with its own ID and leaves unknown years at the end', () => {
    const before = structuredClone(feature)
    const result = buildPlaceDetails({ feature })
    expect(result.events.map(event => event.year)).toEqual([1900, 1930, undefined])
    expect(result.events.map(event => event.address)).toEqual(['10 OLD ROAD', '20 OTHER ROAD', undefined])
    expect(result.events[2].period).toBe('年份未知')
    expect(result.catalogue).toHaveLength(3)
    expect(result.sources.filter(source => /ID=1/.test(source.url))).toHaveLength(1)
    expect(feature).toEqual(before)
  })
  it('keeps a relocated institution out of the header address and records the move in notes', () => {
    const relocated = { ...feature, properties: { ...feature.properties, currentNameZh: '新医院', currentAddress: '新路100号',
      currentUseRelationship: 'institutional-successor-relocated' as const, currentUseSourceUri: 'https://example.org/move' } }
    const result = buildPlaceDetails({ feature: relocated })
    expect(result.name).toBe('旧学校')
    expect(result.address).toBeUndefined()
    expect(result.notes.find(note => note.label === '机构现址（非地图点）')?.value).toBe('新路100号')
  })
  it('does not relabel the original record year with a later selected phase name', () => {
    const site: HistoricalFeature = { ...feature, properties: { ...feature.properties, historicalRecords: [], historicalPhases: [
      { id: 'cinema', name: 'Cinema', nameZh: '影院', startYear: 1930, relationship: 'same-building', sources: [{ url: 'https://example.org/phase' }] },
    ] } }
    const result = buildPlaceDetails({ feature: historicalFeatureAtYear(site, 1940) })
    expect(result.name).toBe('影院')
    expect(result.foreignName).toBe('Cinema')
    expect(result.events.filter(event => event.year === 1900)).toHaveLength(0)
    expect(result.events[0]).toMatchObject({ year: 1930, name: '影院', active: true })
  })
})
