import { describe, expect, it } from 'vitest'
import type { HistoricalFeature } from '../types'
import { heritageFeatureAtYear, historicalFeatureAtYear, historicalSiteVisibleAtYear, siteStageAtYear } from './siteTimeline'
import { zhangyuanTimeline } from '../data/zhangyuanTimeline'
import type { HeritageBuildingFeature } from './heritageBuildings'
import type { LinkedHeritageBuilding } from './heritageLandmarkLinks'

const site = { properties: { kind: 'landmark', historicalName: 'Site', modernNameZh: '地点',
  labelYear: 1900, historicalRecords: [
    { name: 'Garden', startYear: 1900, endYear: 1910, sourceUrls: ['https://example.org/1'] },
    { name: 'School', startYear: 1920, endYear: 1930, sourceUrls: ['https://example.org/2'] },
    { name: 'Cinema', startYear: 1940, sourceUrls: ['https://example.org/3'] },
  ] } } as HistoricalFeature

describe('site chronology projections', () => {
  it('switches dated names while retaining original records and search aliases', () => {
    expect(siteStageAtYear(site, 1905).name).toBe('Garden')
    expect(siteStageAtYear(site, 1925).name).toBe('School')
    expect(siteStageAtYear(site, 1915)).toMatchObject({ name: 'Garden', status: 'latest-record' })
    expect(siteStageAtYear(site, 1950)).toMatchObject({ name: 'Cinema', status: 'latest-record' })
    expect(siteStageAtYear(site, 1890).status).toBe('unknown')
    expect(historicalFeatureAtYear(site, 1890).properties.historicalName).toBe('Site')
    expect(historicalFeatureAtYear(site, 1950).properties.historicalName).toBe('Cinema')
    expect(historicalFeatureAtYear(site, 1925).properties.historicalRecords).toBe(site.properties.historicalRecords)
    expect(historicalFeatureAtYear(site, 1925).properties.aliases).toContain('Site')
    expect(historicalFeatureAtYear(site, null)).toBe(site)
    expect(site.properties.historicalName).toBe('Site')
  })
  it('keeps simultaneous names rather than choosing a false sole identity', () => {
    const overlapping = { ...site, properties: { ...site.properties, historicalRecords: [
      { name: 'A', startYear: 1900, endYear: 1920 }, { name: 'B', startYear: 1910, endYear: 1930 },
    ] } }
    expect(siteStageAtYear(overlapping, 1915).name).toBe('A / B')
  })
  it('marks conflicting reviewed phases unknown and requires sources', () => {
    const phase = { id: 'a', name: 'A', startYear: 1900, endYear: 1920,
      relationship: 'same-building' as const, sources: [{ url: 'https://example.org' }] }
    const feature = { ...site, properties: { ...site.properties, historicalPhases: [phase, { ...phase, id: 'b' }] } }
    expect(siteStageAtYear(feature, 1910).status).toBe('unknown')
    feature.properties.historicalPhases = [{ ...phase, sources: [] }]
    expect(siteStageAtYear(feature, 1910).status).toBe('record-span')
  })
  it('distinguishes replacement buildings with separate reviewed phase identity', () => {
    const feature = { ...site, properties: { ...site.properties, historicalPhases: [
      { id: 'old', name: 'Old hall', buildingId: 'old-building', startYear: 1900, endYear: 1920,
        relationship: 'same-building' as const, sources: [{ url: 'https://example.org/old' }] },
      { id: 'new', name: 'New tower', buildingId: 'new-building', startYear: 1930,
        relationship: 'replacement-building' as const, sources: [{ url: 'https://example.org/new' }] },
    ] } }
    expect(siteStageAtYear(feature, 1919).phase?.buildingId).toBe('old-building')
    expect(siteStageAtYear(feature, 1920).status).not.toBe('reviewed-phase')
    expect(siteStageAtYear(feature, 1930).phase).toMatchObject({ buildingId: 'new-building', relationship: 'replacement-building' })
    const oldBuilding = { startYear: 1900, demolishedYear: 1920, basis: 'construction' as const }
    expect(historicalSiteVisibleAtYear(feature, oldBuilding, 1919)).toBe(true)
    expect(historicalSiteVisibleAtYear(feature, oldBuilding, 1925)).toBe(false)
    expect(historicalSiteVisibleAtYear(feature, oldBuilding, 1930)).toBe(true)
  })
  it('uses the sourced Zhangyuan site phases at transition boundaries', () => {
    const feature = { ...site, properties: { ...site.properties, historicalPhases: zhangyuanTimeline } }
    expect(siteStageAtYear(feature, 1900).nameZh).toBe('张园（味莼园）')
    expect(siteStageAtYear(feature, 1918).name).toContain('里弄住宅')
    expect(siteStageAtYear(feature, 2018).name).toContain('保护更新')
    expect(siteStageAtYear(feature, 2022).name).toContain('西区开放')
    expect(zhangyuanTimeline.every(phase => phase.relationship === 'site-use')).toBe(true)
  })
  it('shares same-site labels with heritage but never borrows a nearby site chronology', () => {
    const heritage = { properties: { name: 'Directory name', articleTitle: '', officialId: '1' } } as HeritageBuildingFeature
    const linked = { heritage, landmark: site, link: { relation: 'same-historical-site' } } as LinkedHeritageBuilding
    expect(heritageFeatureAtYear(heritage, 1925, linked).properties.historicalDisplayName).toBe('School')
    linked.link.relation = 'nearby-residential-context'
    expect(heritageFeatureAtYear(heritage, 1925, linked).properties.timelineStage?.status).toBe('unknown')
    expect(heritageFeatureAtYear(heritage, 1925, linked).properties.historicalDisplayName).toBe('Directory name')
    expect(heritageFeatureAtYear(heritage, 1925, linked).properties.timelineStage?.name).toBe('Directory name')
    expect(heritageFeatureAtYear(heritage, null, linked)).toBe(heritage)
  })
})
