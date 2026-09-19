import { readFileSync } from 'node:fs'
import { act, type ComponentProps } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import App from './App'
import type { MapView } from './components/MapView'
import type { HeritageBuildingFeature } from './lib/heritageBuildings'
import type { HistoricalFeature } from './types'

vi.mock('./components/MapView', () => ({
  MapView: (props: ComponentProps<typeof MapView>) => (
    <div>{props.landmarksVisible && props.features.features.map((feature) => (
      <button key={feature.properties.id} data-testid="landmark" onClick={() => props.onSelect(feature.properties.featureGroupId)}>
        {feature.properties.historicalName}
      </button>
    ))}</div>
  ),
}))

it('clears a pending shared-building selection when its last visible layer is closed', async () => {
  const historical: HistoricalFeature = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8'))
    .features.find((feature: HistoricalFeature) => feature.properties.id === 'landmark-vs-site-609')
  const heritage: HeritageBuildingFeature = JSON.parse(readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8'))
    .features.find((feature: HeritageBuildingFeature) => feature.properties.officialId === 'sh-fgj-4A016-01')
  let resolveHeritage!: (value: { ok: boolean; json: () => Promise<unknown> }) => void
  const pendingHeritage = new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => { resolveHeritage = resolve })
  const empty = { type: 'FeatureCollection', features: [] }
  const fixtures: Record<string, unknown> = {
    '/data/historical-features.geojson': { type: 'FeatureCollection', features: [historical] },
    '/data/curated-parks.geojson': empty, '/data/jurisdictions.geojson': empty, '/data/sources.json': [],
  }
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('fetch', vi.fn(async (path: string) => path.includes('map-buildings.geojson')
    ? pendingHeritage : { ok: true, json: async () => fixtures[path] }))
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const click = async (selector: string) => {
    const button = container.querySelector<HTMLButtonElement>(selector)
    expect(button).not.toBeNull()
    await act(async () => button!.click())
  }
  try {
    await act(async () => root.render(<App />))
    await click('.landmark-toggle-button')
    await click('[data-testid="landmark"]')
    expect(container.querySelector('.details-panel h2')?.textContent).toBe('Nanjing Hotel')
    await click('.landmark-toggle-button')
    expect(container.querySelector('.details-panel')).toBeNull()
    await act(async () => resolveHeritage({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [heritage] }) }))
    expect(container.querySelector('.details-panel')).toBeNull()
    expect(container.querySelector('.heritage-toggle-button')?.getAttribute('aria-pressed')).toBe('false')
    expect(container.querySelector('.landmark-toggle-button')?.getAttribute('aria-pressed')).toBe('false')
  } finally {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  }
})
