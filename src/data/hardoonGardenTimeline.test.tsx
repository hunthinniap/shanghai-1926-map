import { readFileSync } from 'node:fs'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { landmarkSiteLinksWithSources } from './landmarkSiteSourceAdditions'
import { heritageLandmarkLinks } from './heritageLandmarkLinks'
import { mergeLandmarkSites } from '../lib/landmarkSites'
import { linkHeritageLandmarks } from '../lib/heritageLandmarkLinks'
import { heritageFeatureAtYear, historicalFeatureAtYear } from '../lib/siteTimeline'
import { heritageBuildingPeriod, visibleAtYear } from '../lib/buildingTimeline'
import { makeSearchRecords, searchRecords } from '../lib/search'
import { HeritageDetailsPanel } from '../components/HeritageDetailsPanel'
import type { HistoricalFeatureCollection } from '../types'
import type { HeritageBuildingCollection } from '../lib/heritageBuildings'

const historical: HistoricalFeatureCollection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8'))
const heritage: HeritageBuildingCollection = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8'))
const merged = mergeLandmarkSites(historical, landmarkSiteLinksWithSources)
const links = linkHeritageLandmarks(merged, heritage, heritageLandmarkLinks)
const linked = links.byOfficialId.get('sh-fgj-4B001-01')!

describe('Hardoon Garden site names', () => {
  it('attaches later phases to the existing approved site and leaves the raw records intact', () => {
    expect(linked).toBeDefined()
    expect(linked.link.relation).toBe('same-historical-site')
    expect(linked.landmark.properties.sourceRecordIds).toEqual([1092])
    expect(linked.landmark.properties.sourceParkRecordIds).toEqual([115])
    expect(linked.landmark.properties.historicalRecords?.map(record => record.startYear)).toEqual([1909, 1904])
    expect(historical.features.find(feature => feature.properties.id === 'landmark-vs-site-1092')?.properties.historicalPhases).toBeUndefined()
    expect(heritageBuildingPeriod(linked.heritage).startYear).toBe(1955)
    expect(visibleAtYear(heritageBuildingPeriod(linked.heritage), 1928)).toBe(false)
  })
  it.each([
    [1928, 'Hardoon Garden'], [1954, '中苏友好大厦（建设中）'],
    [1955, '中苏友好大厦'], [1967, '中苏友好大厦'],
    [1968, '上海展览馆'], [1983, '上海展览馆'],
    [1984, '上海展览中心'], [2026, '上海展览中心'],
  ] as const)('shows the correct name in both projections in %s', (year, name) => {
    expect(historicalFeatureAtYear(linked.landmark, year).properties.historicalName).toBe(name)
    expect(heritageFeatureAtYear(linked.heritage, year, linked).properties.historicalDisplayName).toBe(year === 1928 ? '爱俪园' : name)
  })
  it('keeps historical and modern names searchable while showing the selected year name', () => {
    const projected = historicalFeatureAtYear(linked.landmark, 2026)
    const records = makeSearchRecords([projected])
    for (const name of ['Hardoon Garden', '哈同花园', '中苏友好大厦', '上海展览馆', '上海展览中心']) {
      expect(searchRecords(records, name)[0]?.historicalName).toBe('上海展览中心')
    }
    expect(historicalFeatureAtYear(linked.landmark, null)).toBe(linked.landmark)
  })
  it('updates the shared card heading and use from the garden to the current venue', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const container = document.createElement('div')
    const root = createRoot(container)
    try {
      for (const [year, name] of [[1955, '中苏友好大厦'], [2026, '上海展览中心']] as const) {
        const projected = heritageFeatureAtYear(linked.heritage, year, linked)
        await act(async () => root.render(<HeritageDetailsPanel feature={projected}
          linked={{ ...linked, landmark: historicalFeatureAtYear(linked.landmark, year) }} onClose={() => {}} />))
        expect(container.querySelector('h2')?.textContent).toBe(name)
        expect(container.querySelector('.place-timeline')?.textContent).toContain('展览、会议与大型活动场所')
        expect(container.querySelector('.place-timeline')?.textContent).toContain('上海展览馆')
      }
    } finally {
      await act(async () => root.unmount())
      vi.unstubAllGlobals()
    }
  })
})
