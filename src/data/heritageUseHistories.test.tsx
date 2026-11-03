import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HeritageBuildingCollection } from '../lib/heritageBuildings'
import type { HistoricalFeatureCollection } from '../types'
import { buildPlaceDetails } from '../lib/placeDetails'
import { linkHeritageLandmarks } from '../lib/heritageLandmarkLinks'
import { heritageLandmarkLinks } from './heritageLandmarkLinks'
import { reviewedUseHistoryForHeritage } from './heritageUseHistories'
import { HeritageDetailsPanel } from '../components/HeritageDetailsPanel'

const heritage = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8')) as HeritageBuildingCollection
const target = heritage.features.find(feature => feature.properties.officialId === 'sh-fgj-1D003-01')!

describe('documented use history at Fenyang Road 79', () => {
  it('replaces the undated listed-name row with the sourced May 1963 use event, preserving construction and raw data', () => {
    const before = structuredClone(target)
    const details = buildPlaceDetails({ heritage: target })
    expect(details.events.find(event => event.name === '工艺美术研究所')).toMatchObject({
      year: 1963, period: '1963年5月', kind: '使用沿革', address: '汾阳路79号',
      url: expect.stringContaining('bookId=81772&parentNodeId=81786&nodeId=109007'),
      description: expect.stringContaining('工作、传艺'),
    })
    expect(details.events.filter(event => event.name === '工艺美术研究所')).toHaveLength(1)
    expect(details.events.some(event => event.year === 1963 && event.kind === '建造年代')).toBe(false)
    expect(details.catalogue.some(source => source.title.includes('1D003') && source.url === target.properties.officialSourceUrl)).toBe(true)
    expect(target).toEqual(before)
  })

  it('does not apply the date to a different listing, name, address or listed institution', () => {
    for (const change of [{ officialId: 'another-listing' }, { officialName: '另一幢住宅' }, { address: '汾阳路80号' }, { listedName: '另一机构' }]) {
      expect(reviewedUseHistoryForHeritage({ ...target.properties, ...change })).toBeUndefined()
    }
  })

  it('renders the same dated and linked use event on the existing shared building card', () => {
    const historical = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    const linked = linkHeritageLandmarks(historical, heritage,
      heritageLandmarkLinks.filter(link => link.officialId === target.properties.officialId)).byOfficialId.get(target.properties.officialId)!
    expect(linked).toBeDefined()
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<HeritageDetailsPanel feature={target} linked={linked} onClose={() => undefined} />)
    const event = [...container.querySelectorAll('.place-timeline > li')].find(row => row.textContent?.includes('工艺美术研究所'))!
    expect(event.querySelector('.place-event-year')?.textContent).toBe('1963年5月')
    expect(event.querySelector('.place-event-kind')?.textContent).toBe('使用沿革')
    expect(event.querySelector('a')?.href).toContain('szfz.shtong.gov.cn')
    expect(event.textContent).not.toContain('名录公布时名称')
  })
})
