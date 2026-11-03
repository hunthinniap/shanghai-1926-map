import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DetailsPanel } from '../components/DetailsPanel'
import { mergeLandmarkSites } from '../lib/landmarkSites'
import { makeSearchRecords, searchRecords } from '../lib/search'
import type { HistoricalFeatureCollection } from '../types'
import { landmarkSiteLinksWithSources } from './landmarkSiteSourceAdditions'

const raw = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection

describe('approved public bath histories in the map', () => {
  it('finds all three histories in the app overlay, retains their original points, and renders dated evidence', () => {
    const before = structuredClone(raw)
    const after = mergeLandmarkSites(raw, landmarkSiteLinksWithSources)
    const search = makeSearchRecords(after.features)
    const cases = [
      { id: 1789, query: '大观园绿地', name: '大观园浴室', evidence: '绿地于2004年建成', sourceCount: 2 },
      { id: 983, query: '卡德池', name: '卡德池', evidence: '1932年开张', sourceCount: 2 },
      { id: 68, query: '日新池', name: '日新池浴室', evidence: '迁址经过及原楼去向尚待厘清', sourceCount: 1 },
    ]
    for (const entry of cases) {
      const original = raw.features.find(f => f.properties.sourceRecordIds?.includes(entry.id))!
      const matches = after.features.filter(f => f.properties.sourceRecordIds?.includes(entry.id))
      expect(matches).toHaveLength(1)
      const feature = matches[0]
      expect(feature.geometry).toEqual(original.geometry)
      expect(feature.properties.historicalAddresses).toEqual(original.properties.historicalAddresses)
      expect(feature.properties.sourceRecordIds).toEqual([entry.id])
      expect(feature.properties.labelYear).toBe(original.properties.labelYear)
      expect(feature.properties.labelYearIsFallback).toBe(original.properties.labelYearIsFallback)
      expect(feature.properties.modernNameZh).toBe(entry.name)
      expect(feature.properties.currentUse).toBe(original.properties.currentUse)
      expect(searchRecords(search, entry.query)[0].featureGroupId).toBe(original.properties.featureGroupId)
      const markup = renderToStaticMarkup(<DetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
      expect(markup).toContain(entry.evidence)
      expect(markup).toContain('历史沿革备注')
      expect(feature.properties.historicalSiteSources).toHaveLength(entry.sourceCount)
      for (const source of feature.properties.historicalSiteSources ?? []) expect(markup).toContain(source.url)
    }
    expect(raw).toEqual(before)
    // The unapproved 温来/温泉 identity remains unresolved and untouched.
    expect(after.features.find(f => f.properties.sourceRecordIds?.includes(712)))
      .toEqual(raw.features.find(f => f.properties.sourceRecordIds?.includes(712)))
    expect(mergeLandmarkSites(after, landmarkSiteLinksWithSources)).toEqual(after)
  })
})
