import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { heritageLandmarkLinks } from '../data/heritageLandmarkLinks'
import { linkHeritageLandmarks } from './heritageLandmarkLinks'
import type { HistoricalFeature } from '../types'
import type { HeritageBuildingFeature } from './heritageBuildings'
import type { LinkedHeritageBuilding } from './heritageLandmarkLinks'
import { heritageBuildingPeriod, linkedHeritageBuildingPeriod, historicalBuildingPeriod, parseConstructionDate, visibleAtYear } from './buildingTimeline'

const landmark = (properties: Partial<HistoricalFeature['properties']> = {}) => ({
  type: 'Feature', geometry: { type: 'Point', coordinates: [121.47, 31.23] }, properties: {
    kind: 'landmark', labelYear: 1928, historicalRecords: [{ name: 'A', startYear: 1900, endYear: 1910 }], ...properties,
  },
}) as HistoricalFeature
const heritage = (constructionDate: string | null) => ({ properties: { constructionDate } }) as HeritageBuildingFeature

describe('building timeline evidence', () => {
  it('keeps the actual Xinle Road Orthodox Church visible consistently in both layers', () => {
    const historical = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8'))
    const buildings = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8'))
    const linked = linkHeritageLandmarks(historical, buildings, heritageLandmarkLinks).byOfficialId.get('sh-fgj-2D041-01')!
    expect(linked).toBeDefined()
    expect(linked.heritage.properties.constructionDate).toBe('1932（始建）')
    const period = linkedHeritageBuildingPeriod(linked.heritage, linked)
    expect(period).toEqual({ startYear: 1938, basis: 'earliest-record' })
    expect(period).toEqual(historicalBuildingPeriod(linked.landmark, linked))
    expect(visibleAtYear(period, 1937)).toBe(false)
    expect(visibleAtYear(period, 1938)).toBe(true)
    expect(visibleAtYear(period, 2026)).toBe(true)
    expect(visibleAtYear(period, null)).toBe(true)
    const siteOnly = { ...linked, link: { ...linked.link, relation: 'same-historical-site' as const } }
    expect(linkedHeritageBuildingPeriod(linked.heritage, siteOnly).basis).toBe('unknown')
  })
  it('includes a building from its explicit construction year', () => {
    const period = parseConstructionDate('1923年')
    expect(period).toEqual({ startYear: 1923, basis: 'construction' })
    expect(visibleAtYear(period, 1922)).toBe(false)
    expect(visibleAtYear(period, 1923)).toBe(true)
  })
  it('uses the latest year of a construction interval or decade', () => {
    expect(parseConstructionDate('1918~ 1920').startYear).toBe(1920)
    expect(parseConstructionDate('1925年-1930年').startYear).toBe(1930)
    expect(parseConstructionDate('1920年代').startYear).toBe(1929)
    expect(parseConstructionDate('1920年竣工').startYear).toBe(1920)
  })
  it.each(['不详', null, '193年', '1893前', '约1921年', '1935前后', '1928（始建）',
    '1921年/1947年重建', '1924年，(一说1919年)', '前楼1927年，后楼1934年', '1930~1920'])
  ('keeps uncertain or conflicting text unknown: %s', value => {
    const period = parseConstructionDate(value)
    expect(period.basis).toBe('unknown')
    expect(visibleAtYear(period, 1928)).toBe(false)
    expect(visibleAtYear(period, 1928, true)).toBe(true)
    expect(visibleAtYear(period, null)).toBe(true)
  })
  it('uses earliest records without mistaking the end of a name for demolition', () => {
    const period = historicalBuildingPeriod(landmark())
    expect(period).toEqual({ startYear: 1900, basis: 'earliest-record' })
    expect(visibleAtYear(period, 2026)).toBe(true)
    expect(historicalBuildingPeriod(landmark({ labelYearIsFallback: true, historicalRecords: [] })).basis).toBe('unknown')
  })
  it('requires cited physical dates for demolition and excludes the demolition year', () => {
    const feature = heritage('1900年')
    feature.properties.buildingLifeDates = { demolished: { year: 1980, sourceUrl: 'https://example.org/history' } }
    const period = heritageBuildingPeriod(feature)
    expect(visibleAtYear(period, 1979)).toBe(true)
    expect(visibleAtYear(period, 1980, true)).toBe(false)
    expect(visibleAtYear(period, null)).toBe(true)
    feature.properties.buildingLifeDates.demolished!.sourceUrl = ''
    expect(heritageBuildingPeriod(feature).demolishedYear).toBeUndefined()
  })
  it('does not borrow the date of a different building on the same site', () => {
    const linked = { heritage: heritage('1930年'), link: { relation: 'same-historical-site' } } as LinkedHeritageBuilding
    expect(historicalBuildingPeriod(landmark(), linked).startYear).toBe(1900)
    linked.link.relation = 'same-listed-building'
    expect(historicalBuildingPeriod(landmark(), linked).startYear).toBe(1930)
  })
})
