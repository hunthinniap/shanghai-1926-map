import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { HistoricalFeatureCollection } from '../types'
import { reviewedAddressUses } from '../data/reviewedAddressUses'
import { applyReviewedAddressUses } from './reviewedAddressUses'
import { mergeCuratedParkFeatures } from './parkLabels'
import { mergeLandmarkSites } from './landmarkSites'
import { landmarkSiteLinksWithSources } from '../data/landmarkSiteSourceAdditions'
import { makeSearchRecords, searchRecords } from './search'

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const raw = read('public/data/historical-features.geojson') as HistoricalFeatureCollection
const parks = read('public/data/curated-parks.geojson') as HistoricalFeatureCollection

describe('reviewed French Concession use evidence', () => {
  it('adds exactly 64 approved record observations on 54 existing features, preserving every original field', () => {
    const before = structuredClone(raw)
    const after = applyReviewedAddressUses(raw, reviewedAddressUses)
    const evidence = after.features.flatMap(f => f.properties.addressUseEvidence ?? [])
    expect(evidence.flatMap(e => e.sourceRecordIds)).toHaveLength(64)
    expect(new Set(evidence.flatMap(e => e.sourceRecordIds)).size).toBe(64)
    expect(after.features.filter(f => f.properties.addressUseEvidence?.length)).toHaveLength(54)
    expect(evidence.filter(e => e.mode === 'current-use').flatMap(e => e.sourceRecordIds)).toHaveLength(9)
    expect(evidence.filter(e => e.mode === 'address-reference').flatMap(e => e.sourceRecordIds)).toHaveLength(55)
    expect(evidence.filter(e => e.retainedHold).flatMap(e => e.sourceRecordIds)).toHaveLength(6)
    expect(evidence.filter(e => e.retainedHold).every(e => e.mode === 'address-reference')).toBe(true)
    expect({ ...after, features: after.features.map(f => {
      const { addressUseEvidence, ...properties } = f.properties
      return { ...f, properties }
    }) }).toEqual(before)
    expect(raw).toEqual(before)
    expect(applyReviewedAddressUses(after, reviewedAddressUses)).toEqual(after)
  })

  it('survives existing park/site display merges, including Fuxing Park, without moving features', () => {
    const before = mergeLandmarkSites(mergeCuratedParkFeatures(raw, parks), landmarkSiteLinksWithSources)
    const after = mergeLandmarkSites(mergeCuratedParkFeatures(
      applyReviewedAddressUses(raw, reviewedAddressUses), parks,
    ), landmarkSiteLinksWithSources)
    const evidence = after.features.flatMap(f => f.properties.addressUseEvidence ?? [])
    expect(evidence.flatMap(e => e.sourceRecordIds)).toHaveLength(64)
    expect(evidence.some(e => e.sourceRecordIds.includes(196))).toBe(true)
    expect(after.features.map(f => [f.properties.id, f.geometry])).toEqual(before.features.map(f => [f.properties.id, f.geometry]))
    const result = searchRecords(makeSearchRecords(after.features), '常熟路100弄10号')
    expect(result.some(r => r.featureId === 'landmark-vs-site-440')).toBe(true)
  })

  it('fails closed for changed members, duplicate targets, and unapproved members', () => {
    const entry = reviewedAddressUses.find(e => e.expectedSourceRecordIds.includes(416))!
    const fixture = { type: 'FeatureCollection', features: [structuredClone(raw.features.find(f => f.properties.id === entry.featureId)!)] } as HistoricalFeatureCollection
    const changed = structuredClone(fixture)
    changed.features[0].properties.sourceRecordIds!.push(9999)
    expect(applyReviewedAddressUses(changed, [entry])).toEqual(changed)
    expect(applyReviewedAddressUses(fixture, [entry, entry])).toEqual(fixture)
    const duplicated = { ...fixture, features: [...fixture.features, ...fixture.features] }
    expect(applyReviewedAddressUses(duplicated, [entry])).toEqual(duplicated)
    expect(applyReviewedAddressUses(fixture, [{ ...entry, evidence: [] }])).toEqual(fixture)
  })
})
