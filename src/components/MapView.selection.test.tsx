import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HeritageBuildingFeature } from '../lib/heritageBuildings'
import type { HistoricalFeatureCollection } from '../types'
import { MapView } from './MapView'

const mapCalls = vi.hoisted(() => ({
  created: vi.fn(), fitBounds: vi.fn(), remove: vi.fn(), setData: vi.fn(),
}))

vi.mock('maplibre-gl', () => ({
  default: {},
  Map: class {
    constructor() { mapCalls.created() }
    addControl() {}
    on() {}
    getLayer() { return undefined }
    getSource() { return { setData: mapCalls.setData } }
    setMinZoom() {}
    setMaxBounds() {}
    resize() {}
    remove() { mapCalls.remove() }
    fitBounds(...args: unknown[]) { mapCalls.fitBounds(...args) }
  },
  NavigationControl: class {},
  AttributionControl: class {},
  LngLatBounds: class {
    empty = true
    extend() { this.empty = false }
    isEmpty() { return this.empty }
  },
}))

const features: HistoricalFeatureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature', geometry: { type: 'Point', coordinates: [121.47772, 31.2393] },
    properties: {
      id: 'landmark-vs-site-609', featureGroupId: 'landmark-vs-site-609', kind: 'landmark',
      historicalName: 'Nanjing Hotel', modernNameZh: '南京飯店', sourceIds: ['vs-buildings'],
      jurisdiction: 'international-settlement', language: 'en', labelYear: 1931, category: '饭店', priority: 3,
      sourceRecordIds: [609], heritageOfficialId: 'sh-fgj-4A016-01',
    },
  }],
}

const heritagePoint = {
  type: 'Feature', geometry: features.features[0].geometry,
  properties: { officialId: 'sh-fgj-4A016-01' },
} as HeritageBuildingFeature

describe('MapView selected building camera', () => {
  let container: HTMLDivElement
  let root: Root
  let props: ComponentProps<typeof MapView>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    props = {
      features, jurisdictions: { type: 'FeatureCollection', features: [] },
      buildingsVisible: false, landmarksVisible: true, heritageVisible: false, subwayVisible: false,
      selectedGroupId: 'landmark-vs-site-609', onSelect: vi.fn(), onSelectMetro: vi.fn(),
      onSelectHeritage: vi.fn(), onMapError: vi.fn(),
    }
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  async function render(update: Partial<ComponentProps<typeof MapView>> = {}) {
    props = { ...props, ...update }
    await act(async () => root.render(<MapView {...props} />))
  }

  it('updates loaded feature data without recreating the map or recentering an unchanged selection', async () => {
    await render()
    expect(mapCalls.fitBounds).toHaveBeenCalledTimes(1)
    mapCalls.fitBounds.mockClear()
    const loadedFeatures = structuredClone(features)
    loadedFeatures.features[0].properties.aliases = ['南京饭店']
    await render({ features: loadedFeatures })
    expect(mapCalls.created).toHaveBeenCalledTimes(1)
    expect(mapCalls.remove).not.toHaveBeenCalled()
    expect(mapCalls.setData).toHaveBeenCalledWith(loadedFeatures)
    expect(mapCalls.fitBounds).not.toHaveBeenCalled()
  })

  it('preserves the camera when the same selected building switches between the two layers', async () => {
    await render()
    mapCalls.fitBounds.mockClear()
    await render({
      heritageVisible: true, selectedGroupId: undefined, selectedHeritage: heritagePoint,
      features: { type: 'FeatureCollection', features: [] },
    })
    expect(mapCalls.fitBounds).not.toHaveBeenCalled()
    await render({ heritageVisible: false, selectedHeritage: undefined, selectedGroupId: 'landmark-vs-site-609', features })
    expect(mapCalls.fitBounds).not.toHaveBeenCalled()
    expect(mapCalls.created).toHaveBeenCalledTimes(1)
    await render({ selectedGroupId: undefined })
    await render({ selectedGroupId: 'landmark-vs-site-609' })
    expect(mapCalls.fitBounds).toHaveBeenCalledTimes(1)
  })

  it('recenters once when an initial historical point is replaced with a different verified reference point', async () => {
    await render()
    mapCalls.fitBounds.mockClear()
    const corrected = structuredClone(features)
    corrected.features[0].geometry = { type: 'Point', coordinates: [121.478, 31.2395] }
    await render({ features: corrected })
    expect(mapCalls.fitBounds).toHaveBeenCalledTimes(1)
    await render({ features: structuredClone(corrected) })
    expect(mapCalls.fitBounds).toHaveBeenCalledTimes(1)
  })
})
