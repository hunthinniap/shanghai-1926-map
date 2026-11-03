import { readFileSync } from 'node:fs'
import { act, type ComponentProps } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import App from './App'
import type { MapView } from './components/MapView'
import type { HeritageBuildingFeature } from './lib/heritageBuildings'

vi.mock('./components/MapView', () => ({
  MapView: (props: ComponentProps<typeof MapView>) => <div data-testid="map"
    data-selected-heritage={props.selectedHeritage?.properties.officialId ?? ''}
    data-heritage-count={props.heritageVisible ? props.heritageBuildings?.features.length ?? 0 : 0} />,
}))

it('loads the heritage directory from search and shows an undated result on the map when selected', async () => {
  const building: HeritageBuildingFeature = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8')).features
    .find((feature: HeritageBuildingFeature) => feature.properties.officialId === 'sh-fgj-2B019-01')
  const empty = { type: 'FeatureCollection', features: [] }
  const fixtures: Record<string, unknown> = {
    '/data/historical-features.geojson': empty, '/data/curated-parks.geojson': empty,
    '/data/jurisdictions.geojson': empty, '/data/sources.json': [],
    '/data/shanghai-excellent-historical-buildings/map-buildings.geojson': { ...empty, features: [building] },
    '/data/shanghai-excellent-historical-buildings/historical-use-categories.json': {
      schemaVersion: 1, records: { [building.properties.officialId]: {
        category: null, categories: [], status: 'unresolved', historicalName: null, note: '', sources: [],
      } },
    },
  }
  const fetchMock = vi.fn(async (path: string) => ({ ok: true, json: async () => fixtures[path] }))
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('fetch', fetchMock)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const click = async (selector: string) => {
    const button = container.querySelector<HTMLButtonElement>(selector)
    expect(button).not.toBeNull()
    await act(async () => button!.click())
  }
  const search = async (value: string) => {
    const input = container.querySelector<HTMLInputElement>('.search-control input')!
    await act(async () => {
      input.focus()
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  try {
    await act(async () => root.render(<App />))
    expect(fetchMock.mock.calls.some(([path]) => path.includes('map-buildings.geojson'))).toBe(false)
    await search('2B019')
    expect(container.querySelector('[role="option"]')?.textContent).toContain('华山路643号')
    expect(container.querySelector('.heritage-toggle-button')?.getAttribute('aria-pressed')).toBe('false')

    // A date filter still hides undated buildings; explicitly choosing one restores all dates.
    await click('[aria-label="查看 1928 年"]')
    expect(container.querySelector('[data-testid="map"]')?.getAttribute('data-heritage-count')).toBe('0')
    await click('[role="option"]')
    expect(container.querySelector('.timeline-year')?.textContent).toBe('全部年代')
    expect(container.querySelector('.heritage-toggle-button')?.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('[data-testid="map"]')?.getAttribute('data-selected-heritage')).toBe('sh-fgj-2B019-01')
    expect(container.querySelector('.details-panel')?.textContent).toContain('华山路643号/华山路639号')
    expect(fetchMock.mock.calls.filter(([path]) => path.includes('map-buildings.geojson'))).toHaveLength(1)
  } finally {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  }
})
