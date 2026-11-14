import { readFileSync } from 'node:fs'
import { act, type ComponentProps } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import App from './App'
import type { MapView } from './components/MapView'
import type { HistoricalFeature } from './types'
import type { HeritageBuildingFeature } from './lib/heritageBuildings'

vi.mock('./components/MapView', () => ({ MapView: (props: ComponentProps<typeof MapView>) => (
  <div data-testid="map" data-buildings-visible={props.buildingsVisible}
    data-landmarks-visible={props.landmarksVisible} data-heritage-visible={props.heritageVisible}>
    {props.features.features.map(feature => <button key={feature.properties.id} data-testid="historical"
      onClick={() => props.onSelect(feature.properties.featureGroupId)}>{feature.properties.historicalName}</button>)}
    {props.heritageBuildings?.features.map(feature => <span data-testid="heritage" key={feature.properties.officialId}>{feature.properties.name}</span>)}
  </div>
) }))

it('filters both building layers and search, preserves roads, restores all dates and clears hidden selections', async () => {
  const template: HistoricalFeature = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')).features
    .find((feature: HistoricalFeature) => feature.properties.kind === 'landmark')
  const makeHistorical = (id: string, year: number, fallback = false): HistoricalFeature => ({ ...template,
    properties: { ...template.properties, id, featureGroupId: id, historicalName: id, aliases: [],
      heritageOfficialId: undefined, sourceRecordIds: [], historicalRecords: [], labelYear: year, labelYearIsFallback: fallback },
  })
  const road = makeHistorical('Road', 1930)
  road.properties.kind = 'road'
  const historical = [road, makeHistorical('Early', 1900), makeHistorical('Future', 1935), makeHistorical('Unknown', 1949, true)]
  historical[1].properties.historicalPhases = [
    { id: 'school', name: 'Early School', use: '学校', startYear: 1900, endYear: 1935, relationship: 'same-building', sources: [{ url: 'https://example.org/school' }] },
    { id: 'cinema', name: 'Early Cinema', use: '电影院', startYear: 1935, relationship: 'same-building', sources: [{ url: 'https://example.org/cinema' }] },
  ]
  const heritageTemplate: HeritageBuildingFeature = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8')).features[0]
  const buildings = ['1900年', '1935年', null].map((date, i) => ({ ...heritageTemplate,
    properties: { ...heritageTemplate.properties, officialId: `timeline-${i}`, constructionDate: date },
  }))
  const empty = { type: 'FeatureCollection', features: [] }
  const fixtures: Record<string, unknown> = {
    '/data/historical-features.geojson': { ...empty, features: historical },
    '/data/curated-parks.geojson': empty, '/data/jurisdictions.geojson': empty, '/data/sources.json': [],
    '/data/shanghai-excellent-historical-buildings/map-buildings.geojson': { ...empty, features: buildings },
    '/data/shanghai-excellent-historical-buildings/historical-use-categories.json': { schemaVersion: 1,
      records: Object.fromEntries(buildings.map(feature => [feature.properties.officialId, {
        category: null, categories: [], status: 'unresolved', historicalName: null, note: '', sources: [],
      }])) },
  }
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('fetch', vi.fn(async (path: string) => ({ ok: true, json: async () => fixtures[path] })))
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const click = async (selector: string) => {
    const target = container.querySelector<HTMLElement>(selector)
    expect(target).not.toBeNull()
    await act(async () => target!.click())
  }
  const names = () => [...container.querySelectorAll('[data-testid="historical"]')].map(el => el.textContent)
  const expectVisibility = (buildings: boolean, landmarks: boolean, heritage: boolean) => {
    for (const [layer, value] of [['building', buildings], ['landmark', landmarks], ['heritage', heritage]] as const) {
      expect(container.querySelector(`.${layer}-toggle-button`)?.getAttribute('aria-pressed')).toBe(String(value))
    }
    const map = container.querySelector('[data-testid="map"]')!
    expect(map.getAttribute('data-buildings-visible')).toBe(String(buildings))
    expect(map.getAttribute('data-landmarks-visible')).toBe(String(landmarks))
    expect(map.getAttribute('data-heritage-visible')).toBe(String(heritage))
  }
  try {
    await act(async () => root.render(<App />))
    expect(container.querySelector('.timeline-year')?.textContent).toBe('全部年代')
    await click('[aria-label="查看 1928 年"]')
    expectVisibility(false, false, false)
    expect(vi.mocked(fetch).mock.calls.some(([path]) => String(path).includes('shanghai-excellent-historical-buildings'))).toBe(false)
    await click('.timeline-all')
    expectVisibility(false, false, false)
    await click('.building-toggle-button')
    await click('[aria-label="下一年"]')
    expectVisibility(true, false, false)
    await click('.landmark-toggle-button')
    await click('[aria-label="查看 1949 年"]')
    expectVisibility(true, true, false)
    await click('.landmark-toggle-button')
    await click('.heritage-toggle-button')
    await click('[aria-label="查看 1900 年"]')
    expectVisibility(true, false, true)
    await click('.heritage-toggle-button')
    await click('[aria-label="查看 1928 年"]')
    expectVisibility(true, false, false)
    await click('.building-toggle-button')
    await click('.landmark-toggle-button')
    await click('.heritage-toggle-button')
    expectVisibility(false, true, true)
    expect(names()).toEqual(['Road', 'Early School'])
    expect(container.querySelectorAll('[data-testid="heritage"]')).toHaveLength(1)
    expect(container.querySelector('.landmark-toggle-button')?.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('.heritage-toggle-button')?.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('.timeline-status')?.textContent).toContain('显示 2 处 · 年代不明 2 处')
    await click('.timeline-status input')
    expect(names()).toEqual(['Road', 'Early School', 'Unknown'])
    expect(container.querySelectorAll('[data-testid="heritage"]')).toHaveLength(2)
    await click('[data-testid="historical"]:nth-child(2)')
    expect(container.querySelector('.details-panel')).not.toBeNull()
    await click('[aria-label="查看 1949 年"]')
    expect(container.querySelector('.details-panel h2')?.textContent).toBe('Early Cinema')
    expect(container.querySelector('.place-timeline .is-active')?.textContent).toContain('电影院')
    await click('[aria-label="查看 1840 年"]')
    expect(names()).toEqual(['Road', 'Unknown'])
    expect(container.querySelector('.details-panel')).toBeNull()
    await click('.timeline-all')
    expect(names()).toEqual(['Road', 'Early', 'Future', 'Unknown'])
    expect(container.querySelectorAll('[data-testid="heritage"]')).toHaveLength(3)
  } finally {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  }
})

it('keeps the early garden card usable before the later heritage building exists and switches it to the modern venue', async () => {
  const historical = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')).features
    .filter((feature: HistoricalFeature) => ['landmark-vs-site-1092', 'landmark-hardoon-garden-vanished-32'].includes(feature.properties.id))
  const building = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8')).features
    .find((feature: HeritageBuildingFeature) => feature.properties.officialId === 'sh-fgj-4B001-01')
  const empty = { type: 'FeatureCollection', features: [] }
  const fixtures: Record<string, unknown> = {
    '/data/historical-features.geojson': { ...empty, features: historical },
    '/data/curated-parks.geojson': empty, '/data/jurisdictions.geojson': empty, '/data/sources.json': [],
    '/data/shanghai-excellent-historical-buildings/map-buildings.geojson': { ...empty, features: [building] },
    '/data/shanghai-excellent-historical-buildings/historical-use-categories.json': { schemaVersion: 1, records: {
      'sh-fgj-4B001-01': { category: null, categories: [], status: 'unresolved', historicalName: null, note: '', sources: [] },
    } },
  }
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('fetch', vi.fn(async (path: string) => ({ ok: true, json: async () => fixtures[path] })))
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const click = async (selector: string) => {
    const target = container.querySelector<HTMLElement>(selector)
    expect(target).not.toBeNull()
    await act(async () => target!.click())
  }
  try {
    await act(async () => root.render(<App />))
    await click('.landmark-toggle-button')
    await click('.heritage-toggle-button')
    await click('[aria-label="回到 1928 年"]')
    expect(container.querySelectorAll('[data-testid="heritage"]')).toHaveLength(0)
    await click('[data-testid="historical"]')
    expect(container.querySelector('.details-panel h2')?.textContent).toBe('爱俪园')
    await click('.timeline-ticks button:last-child')
    expect(container.querySelector('.heritage-details-panel h2')?.textContent).toBe('上海展览中心')
    expect(container.querySelector('.place-timeline .is-active')?.textContent).toContain('会议、展览、会展服务')
    expect(container.querySelectorAll('[data-testid="historical"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-testid="heritage"]')).toHaveLength(1)
  } finally {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  }
})
vi.mock('./data/modernParks', () => ({ modernParks: { type: 'FeatureCollection', features: [] }, modernParkEntries: [] }))
