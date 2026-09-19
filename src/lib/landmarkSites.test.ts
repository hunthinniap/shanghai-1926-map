import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { landmarkSiteLinks } from '../data/landmarkSiteLinks'
import type { HistoricalFeatureCollection } from '../types'
import { mergeLandmarkSites } from './landmarkSites'
import { mergeCuratedParkFeatures } from './parkLabels'
import { makeSearchRecords, searchRecords } from './search'

const raw = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
const parks = JSON.parse(readFileSync('public/data/curated-parks.geojson', 'utf8')) as HistoricalFeatureCollection
const before = mergeCuratedParkFeatures(raw, parks)

describe('reviewed landmark site display associations', () => {
  it('shows one Yushi site while preserving both source records and the raw data', () => {
    const snapshot = JSON.stringify(before)
    const after = mergeLandmarkSites(before, landmarkSiteLinks)
    const yushi = after.features.find((feature) => feature.properties.id === 'landmark-yushishanzhuang-vanished-74')!
    expect(after.features.some((feature) => feature.properties.id === 'landmark-vs-site-1566')).toBe(false)
    expect(yushi.properties.modernNameZh).toBe('郁氏山庄（昧园）')
    expect(yushi.properties.sourceRecordIds).toEqual([1566])
    expect(yushi.properties.sourceParkRecordIds).toEqual([162])
    expect(yushi.properties.historicalRecords?.map((record) => record.name)).toEqual(['Yushishanzhuang', 'Yu Family Tomb'])
    expect(yushi.geometry).toEqual(before.features.find((feature) => feature.properties.id === yushi.properties.id)!.geometry)
    expect(yushi.properties.aliases).not.toContain('VANISHED')
    expect(yushi.properties.currentNameZh).toBeUndefined()
    expect(JSON.stringify(before)).toBe(snapshot)
  })

  it('resolves the romanization, English description and Chinese variants to the same result', () => {
    const records = makeSearchRecords(mergeLandmarkSites(before, landmarkSiteLinks).features)
    for (const query of ['Yushishanzhuang', 'Yu Family Tomb', '郁氏山庄', '郁氏山莊', '郁氏山壯', '春光坊']) {
      expect(searchRecords(records, query).map((record) => record.featureGroupId)).toEqual(['landmark-yushishanzhuang-vanished'])
    }
  })

  it('leaves every unrelated feature intact and retains all building source IDs once', () => {
    const after = mergeLandmarkSites(before, landmarkSiteLinks)
    const touched = new Set(landmarkSiteLinks.flatMap((link) => [link.canonicalFeatureId, ...link.memberFeatureIds]))
    expect(after.features.filter((feature) => !touched.has(feature.properties.id)))
      .toEqual(before.features.filter((feature) => !touched.has(feature.properties.id)))
    const ids = after.features.flatMap((feature) => feature.properties.sourceRecordIds ?? [])
    expect(ids.length).toBe(1803)
    expect(new Set(ids).size).toBe(1803)
    expect(after.features.find((feature) => feature.properties.sourceRecordIds?.includes(241))?.properties.sourceRecordIds).not.toContain(242)
  })

  it('applies all 13 reviewed associations without dropping provenance or changing their geometry', () => {
    const after = mergeLandmarkSites(before, landmarkSiteLinks)
    expect(landmarkSiteLinks).toHaveLength(13)
    expect(before.features.length - after.features.length).toBe(13)
    for (const link of landmarkSiteLinks) {
      const canonical = after.features.find((feature) => feature.properties.id === link.canonicalFeatureId)!
      expect(canonical.properties.historicalSiteNote, link.id).toBe(link.note)
      expect(canonical.properties.sourceRecordIds).toEqual(link.expectedBuildingIds)
      expect(canonical.properties.sourceParkRecordIds).toEqual(link.expectedParkIds)
      expect(canonical.geometry).toEqual(before.features.find((feature) => feature.properties.id === link.canonicalFeatureId)!.geometry)
      expect(canonical.properties.historicalRecords!.flatMap((record) => record.sourceRecordIds ?? []).sort((a, b) => a - b))
        .toEqual([...link.expectedBuildingIds].sort((a, b) => a - b))
      expect(canonical.properties.historicalRecords!.flatMap((record) => record.sourceParkRecordIds ?? []))
        .toEqual(link.expectedParkIds)
      expect(after.features.some((feature) => link.memberFeatureIds.includes(feature.properties.id))).toBe(false)
      if (link.currentUseFromFeatureId) {
        const original = before.features.find((feature) => feature.properties.id === link.currentUseFromFeatureId)!
        for (const [key, value] of Object.entries(original.properties).filter(([key]) => key.startsWith('current'))) {
          expect(canonical.properties[key as keyof typeof canonical.properties], `${link.id}: ${key}`).toEqual(value)
        }
      }
    }
  })

  it('does not merge a changed, unreviewed source group or a missing member', () => {
    const changed = structuredClone(before)
    changed.features.find((feature) => feature.properties.id === 'landmark-vs-site-1566')!.properties.sourceRecordIds = [1566, 99999]
    const yushi = landmarkSiteLinks.filter((link) => link.id === 'yushi-shanzhuang')
    expect(mergeLandmarkSites(changed, yushi)).toEqual(changed)
    const missing = { ...before, features: before.features.filter((feature) => feature.properties.id !== 'landmark-vs-site-1566') }
    expect(mergeLandmarkSites(missing, yushi)).toEqual(missing)
  })

  it('retains reviewed names after the upstream builder has already merged the same source IDs', () => {
    const links = landmarkSiteLinks.filter((link) => link.id.startsWith('buildings-'))
    const rebuilt = structuredClone(before)
    for (const link of links) {
      const canonical = rebuilt.features.find((feature) => feature.properties.id === link.canonicalFeatureId)!
      const originals = rebuilt.features.filter((feature) => [link.canonicalFeatureId, ...link.memberFeatureIds].includes(feature.properties.id))
      canonical.properties.sourceRecordIds = link.expectedBuildingIds
      canonical.properties.historicalRecords = originals.map((feature) => ({
        name: feature.properties.historicalName,
        nameZh: feature.properties.modernNameZh,
      }))
      canonical.properties.aliases = canonical.properties.historicalRecords.map((record) => record.name)
      rebuilt.features = rebuilt.features.filter((feature) => !link.memberFeatureIds.includes(feature.properties.id))
    }
    const after = mergeLandmarkSites(rebuilt, links)
    expect(after.features).toHaveLength(rebuilt.features.length)
    for (const link of links) {
      const feature = after.features.find((feature) => feature.properties.id === link.canonicalFeatureId)!
      expect(feature.properties.historicalName).toBe(link.historicalName)
      expect(feature.properties.historicalSiteNote).toBe(link.note)
      expect(feature.properties.sourceRecordIds).toEqual(link.expectedBuildingIds)
      const changed = structuredClone(rebuilt)
      changed.features.find((feature) => feature.properties.id === link.canonicalFeatureId)!.properties.sourceRecordIds!.push(99999)
      expect(mergeLandmarkSites(changed, [link])).toEqual(changed)
    }
  })

  it('is idempotent and preserves park identifiers through existing park replacements', () => {
    const after = mergeLandmarkSites(before, landmarkSiteLinks)
    expect(mergeLandmarkSites(after, landmarkSiteLinks)).toEqual(after)
    expect(before.features.find((feature) => feature.properties.id === 'park-jessfield-park')?.properties.sourceParkRecordIds).toContain(74)
    for (const parkId of [35, 74, 110]) {
      const original = raw.features.find((feature) => feature.properties.sourceParkRecordIds?.includes(parkId))!
      const record = after.features.flatMap((feature) => feature.properties.historicalRecords ?? [])
        .find((record) => record.sourceParkRecordIds?.includes(parkId))!
      expect(record.name).toBe(original.properties.historicalName)
      expect(record.category).toBe(original.properties.category)
      expect(record.startYear).toBe(original.properties.labelYear)
    }
  })
})
