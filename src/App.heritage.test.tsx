import { act, type ComponentProps } from 'react'
import { readFileSync } from 'node:fs'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { MapView } from './components/MapView'
import type { HeritageBuildingCollection, HeritageBuildingFeature } from './lib/heritageBuildings'
import type { HistoricalFeature } from './types'

// Keep App's loading and selection logic, and its real detail panels, while
// replacing WebGL with buttons that exercise the same map callbacks.
vi.mock('./components/MapView', () => ({
  MapView: (props: ComponentProps<typeof MapView>) => (
    <div
      data-testid="map"
      data-historical-count={props.features.features.length}
      data-heritage-visible={props.heritageVisible}
      data-selected-heritage={props.selectedHeritage?.properties.officialId ?? ''}
      data-selected-historical={props.selectedGroupId ?? ''}
      data-nanjing-coordinate={JSON.stringify(props.features.features.find((feature) => feature.properties.id === 'landmark-vs-site-609')?.geometry)}
    >
      {props.features.features.map((feature) => (
        <button
          key={feature.properties.id}
          data-testid="historical-point"
          onClick={() => props.onSelect(feature.properties.featureGroupId)}
        >
          {feature.properties.historicalName}
        </button>
      ))}
      {props.heritageVisible && props.heritageBuildings?.features.map((feature) => (
        <button
          key={feature.properties.officialId}
          data-testid="heritage-point"
          onClick={() => props.onSelectHeritage(feature)}
        >
          {feature.properties.name}
        </button>
      ))}
    </div>
  ),
}))

const heritagePath = '/data/shanghai-excellent-historical-buildings/map-buildings.geojson'
const historicalFeature: HistoricalFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [121.47, 31.22] },
  properties: {
    id: 'historical-library',
    featureGroupId: 'historical-library',
    kind: 'landmark',
    historicalName: 'Historical Library',
    modernNameZh: '旧图书馆',
    jurisdiction: 'international-settlement',
    language: 'en',
    labelYear: 1928,
    sourceIds: [],
    category: '图书馆',
    priority: 1,
  },
}
const heritageFeature: HeritageBuildingFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [121.49, 31.24] },
  properties: {
    officialId: 'sh-fgj-test-building',
    wikipediaId: 'wiki-test-building',
    batch: 1,
    officialCodeRaw: '1A001',
    name: '测试历史建筑',
    articleTitle: '测试历史建筑条目',
    address: '测试路12号',
    addressComparison: 'exact',
    coordinateScope: 'linked-building-reference-point',
    coordinateSystem: 'WGS84',
    precisionDegrees: 0.0001,
    origin: 'wikidata-P625',
    sourceUrl: 'https://www.wikidata.org/wiki/Q123',
    wikipediaUrl: 'https://zh.wikipedia.org/wiki/TestBuilding',
    wikidataId: 'Q123',
    historicalGeometryVerified: false,
    officialName: '原建筑名称',
    listedName: null,
    wikipediaAddress: '测试路12号',
    district: '黄浦区',
    constructionDate: '1923',
    floors: '4',
    structure: null,
    designer: null,
    officialSourceUrl: 'https://fgj.sh.gov.cn/test-building',
    wikipediaListUrl: 'https://zh.wikipedia.org/wiki/TestList',
  },
}
const heritageCollection: HeritageBuildingCollection = {
  type: 'FeatureCollection',
  features: [heritageFeature],
}
const emptyCollection = { type: 'FeatureCollection', features: [] }
const nanjingHistorical: HistoricalFeature = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8'))
  .features.find((feature: HistoricalFeature) => feature.properties.id === 'landmark-vs-site-609')
const nanjingHeritage: HeritageBuildingFeature = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8'))
  .features.find((feature: HeritageBuildingFeature) => feature.properties.officialId === 'sh-fgj-4A016-01')

describe('historical-building layer interactions', () => {
  let container: HTMLDivElement
  let root: Root
  let failHeritageRequest: boolean
  let heritageRequests: number
  let loadedHeritageCollection: HeritageBuildingCollection
  let loadedHistoricalFeatures: HistoricalFeature[]

  beforeEach(() => {
    failHeritageRequest = false
    heritageRequests = 0
    loadedHeritageCollection = heritageCollection
    loadedHistoricalFeatures = [historicalFeature]
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      if (input === heritagePath) {
        heritageRequests += 1
        return {
          ok: !failHeritageRequest,
          json: async () => loadedHeritageCollection,
        }
      }
      const fixtures: Record<string, unknown> = {
        '/data/historical-features.geojson': { type: 'FeatureCollection', features: loadedHistoricalFeatures },
        '/data/curated-parks.geojson': emptyCollection,
        '/data/jurisdictions.geojson': emptyCollection,
        '/data/sources.json': [],
      }
      if (!(input in fixtures)) throw new Error(`Unexpected request: ${input}`)
      return { ok: true, json: async () => fixtures[input] }
    }))
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  function element(selector: string): HTMLElement {
    const result = container.querySelector<HTMLElement>(selector)
    expect(result, `Missing element: ${selector}`).not.toBeNull()
    return result!
  }

  async function click(selector: string) {
    await act(async () => element(selector).click())
  }

  it('opens the same card from either layer, uses the heritage point, and keeps one marker when both are on', async () => {
    loadedHistoricalFeatures = [nanjingHistorical]
    loadedHeritageCollection = { type: 'FeatureCollection', features: [nanjingHeritage] }
    await act(async () => root.render(<App />))
    expect(heritageRequests).toBe(0)
    await click('.landmark-toggle-button')
    expect(heritageRequests).toBe(1)
    expect(JSON.parse(element('[data-testid="map"]').dataset.nanjingCoordinate!)).toEqual(nanjingHeritage.geometry)
    await click('[data-testid="historical-point"]')
    expect(container.querySelectorAll('.details-panel')).toHaveLength(1)
    const historicalCard = element('.heritage-details-panel').textContent
    expect(historicalCard).toContain('Nanjing Hotel')
    expect(historicalCard).toContain('200 SHANSE ROAD')
    expect(historicalCard).toContain('山西南路182-200号')

    await click('.heritage-toggle-button')
    expect(container.querySelector('[data-testid="historical-point"]')).toBeNull()
    await click('[data-testid="heritage-point"]')
    expect(container.querySelectorAll('.details-panel')).toHaveLength(1)
    expect(element('.heritage-details-panel').textContent).toBe(historicalCard)
    await click('.heritage-toggle-button')
    expect(element('.heritage-details-panel').textContent).toBe(historicalCard)
    expect(container.querySelector('[data-testid="historical-point"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="heritage-point"]')).toBeNull()
    await click('.landmark-toggle-button')
    expect(container.querySelector('.details-panel')).toBeNull()
    expect(heritageRequests).toBe(1)
  })

  it('loads on demand, switches between real detail panels, and reuses data after hiding', async () => {
    await act(async () => root.render(<App />))

    expect(heritageRequests).toBe(0)
    expect(element('.heritage-toggle-button').getAttribute('aria-pressed')).toBe('false')
    expect(container.querySelector('[data-testid="heritage-point"]')).toBeNull()

    await click('.heritage-toggle-button')
    expect(heritageRequests).toBe(1)
    expect(element('.heritage-toggle-button').getAttribute('aria-pressed')).toBe('true')
    await click('[data-testid="heritage-point"]')
    const details = element('.heritage-details-panel')
    expect(details.querySelector('h2')?.textContent).toBe(heritageFeature.properties.name)
    expect(details.textContent).toContain(heritageFeature.properties.address)
    expect(details.querySelector(`a[href="${heritageFeature.properties.officialSourceUrl}"]`)).not.toBeNull()
    expect(element('[data-testid="map"]').dataset.selectedHeritage).toBe(heritageFeature.properties.officialId)

    await click('[data-testid="historical-point"]')
    expect(container.querySelector('.heritage-details-panel')).toBeNull()
    expect(element('.details-panel h2').textContent).toBe(historicalFeature.properties.historicalName)
    expect(element('[data-testid="map"]').dataset.selectedHeritage).toBe('')

    await click('[data-testid="heritage-point"]')
    expect(element('[data-testid="map"]').dataset.selectedHistorical).toBe('')
    expect(container.querySelectorAll('.details-panel')).toHaveLength(1)
    await click('.heritage-toggle-button')
    expect(container.querySelector('.heritage-details-panel')).toBeNull()
    expect(container.querySelector('[data-testid="heritage-point"]')).toBeNull()
    expect(element('[data-testid="map"]').dataset.selectedHeritage).toBe('')

    await click('.heritage-toggle-button')
    expect(heritageRequests).toBe(1)
    expect(element('[data-testid="heritage-point"]').textContent).toBe(heritageFeature.properties.name)
    expect(container.querySelector('.heritage-details-panel')).toBeNull()
  })

  it('keeps the historical map usable when the layer fails and loads reference points on retry', async () => {
    failHeritageRequest = true
    await act(async () => root.render(<App />))
    const map = element('[data-testid="map"]')

    await click('.heritage-toggle-button')
    expect(heritageRequests).toBe(1)
    expect(container.querySelector('.heritage-load-error[role="alert"]')).not.toBeNull()
    expect(element('[data-testid="map"]')).toBe(map)
    expect(map.dataset.historicalCount).toBe('1')
    expect(container.querySelector('[data-testid="heritage-point"]')).toBeNull()

    await click('[data-testid="historical-point"]')
    expect(element('.details-panel h2').textContent).toBe(historicalFeature.properties.historicalName)
    failHeritageRequest = false
    await click('.heritage-load-error button')

    expect(heritageRequests).toBe(2)
    expect(container.querySelector('.heritage-load-error')).toBeNull()
    expect(element('[data-testid="map"]')).toBe(map)
    expect(map.dataset.selectedHistorical).toBe(historicalFeature.properties.featureGroupId)
    await click('[data-testid="heritage-point"]')
    expect(element('.heritage-details-panel h2').textContent).toBe(heritageFeature.properties.name)
    expect(map.dataset.selectedHistorical).toBe('')
  })

  it('attributes address reference points to Shanghai Library while retaining the building sources', async () => {
    const librarySource = 'https://data.library.sh.cn/entity/architecture/test-building'
    loadedHeritageCollection = {
      type: 'FeatureCollection',
      features: [{
        ...heritageFeature,
        properties: {
          ...heritageFeature.properties,
          coordinateScope: 'address-reference-point',
          origin: 'shanghai-library',
          sourceUrl: librarySource,
          coordinateSourceTitle: '上海图书馆 · 上海年华',
          sourceAddress: '黄浦区测试路12号',
          locationNote: '按名录门址匹配的参考点；院内具体建筑位置尚未核定。',
        },
      }],
    }
    await act(async () => root.render(<App />))
    await click('.heritage-toggle-button')
    await click('[data-testid="heritage-point"]')

    const details = element('.heritage-details-panel')
    expect(details.textContent).toContain('门牌参考点')
    expect(details.textContent).toContain('黄浦区测试路12号')
    expect(details.textContent).toContain('院内具体建筑位置尚未核定')
    expect(details.querySelector(`a[href="${librarySource}"]`)?.textContent).toContain('上海图书馆 · 上海年华')
    expect(details.querySelector(`a[href="${librarySource}"]`)?.textContent).toContain('门址与参考坐标')
    expect(details.querySelector(`a[href="${heritageFeature.properties.officialSourceUrl}"]`)).not.toBeNull()
    expect(details.querySelector(`a[href="${heritageFeature.properties.wikipediaListUrl}"]`)).not.toBeNull()
    expect(details.querySelector(`a[href="${heritageFeature.properties.wikipediaUrl}"]`)?.textContent).toContain('建筑条目 · CC BY-SA 4.0')
    expect(details.textContent).not.toContain('建筑条目与坐标来源')
    expect(details.textContent).not.toContain('Wikidata · 坐标来源')
  })
})
