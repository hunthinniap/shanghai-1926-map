import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DetailsPanel } from '../components/DetailsPanel'
import { historicalBuildingPeriod } from '../lib/buildingTimeline'
import { mergeLandmarkSites } from '../lib/landmarkSites'
import { historicalSiteVisibleAtYear } from '../lib/siteTimeline'
import type { HistoricalFeatureCollection } from '../types'
import { landmarkSiteLinksWithSources } from './landmarkSiteSourceAdditions'
import { yeshiyuanHistory } from './yeshiyuanHistory'

const raw: HistoricalFeatureCollection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8'))

describe('Yeshiyuan destruction evidence', () => {
  it('hides the historic garden from 1937, retains all-years access and explains surviving stones', () => {
    const before = structuredClone(raw)
    const after = mergeLandmarkSites(raw, landmarkSiteLinksWithSources)
    const garden = after.features.find(feature => feature.properties.id === yeshiyuanHistory.canonicalFeatureId)!
    const original = raw.features.find(feature => feature.properties.id === garden.properties.id)!
    const period = historicalBuildingPeriod(garden)
    expect(period).toEqual({ startYear: 1878, basis: 'earliest-record', demolishedYear: 1937 })
    expect(historicalSiteVisibleAtYear(garden, period, 1936)).toBe(true)
    expect(historicalSiteVisibleAtYear(garden, period, 1937, true)).toBe(false)
    expect(historicalSiteVisibleAtYear(garden, period, 2026)).toBe(false)
    expect(historicalSiteVisibleAtYear(garden, period, null)).toBe(true)
    expect(garden.geometry).toEqual(original.geometry)
    expect(garden.properties.historicalAddresses).toEqual(original.properties.historicalAddresses)
    expect(garden.properties.currentUse).toBe(original.properties.currentUse)
    expect(raw).toEqual(before)
    const markup = renderToStaticMarkup(<DetailsPanel feature={garden} sources={[]} onClose={() => undefined} />)
    expect(markup).toContain('1937 年')
    expect(markup).toContain('毁损／消失：也是園')
    expect(markup).toContain('部分遗石后来移入豫园')
    expect(markup).toContain(yeshiyuanHistory.buildingLifeDates!.demolished!.sourceUrl)
  })

  it('does not apply the date to changed identities or nearby roads and buildings', () => {
    const garden = raw.features.find(feature => feature.properties.id === yeshiyuanHistory.canonicalFeatureId)!
    const changed = { ...garden, properties: { ...garden.properties, sourceRecordIds: [9999] } }
    expect(mergeLandmarkSites({ type: 'FeatureCollection', features: [changed] }, [yeshiyuanHistory]).features[0]).toBe(changed)
    const after = mergeLandmarkSites(raw, [yeshiyuanHistory])
    expect(after.features.filter(feature => feature.properties.id !== garden.properties.id))
      .toEqual(raw.features.filter(feature => feature.properties.id !== garden.properties.id))
  })
})
