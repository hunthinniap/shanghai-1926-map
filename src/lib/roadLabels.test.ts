import type { HistoricalFeatureCollection } from '../types'
import { buildRoadLabelIndex, roadModernNameForGroup } from './roadLabels'
import { describe, expect, it } from 'vitest'

const features: HistoricalFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[121.46, 31.21], [121.47, 31.22]] },
      properties: {
        id: 'gaston-1',
        featureGroupId: 'road-gaston',
        kind: 'road',
        historicalName: 'Route Gaston Kahn',
        modernNameZh: '嘉善路',
        modernNameEn: 'Jiashan Road',
        jurisdiction: 'french-concession',
        language: 'fr',
        labelYear: 1928,
        sourceIds: ['test'],
        category: '道路',
        priority: 2,
      },
    },
  ],
}

describe('labels on the modern road network', () => {
  it('extends Route Gaston Kahn across modern Jiashan Road', () => {
    const labels = buildRoadLabelIndex(features)
    expect(labels.get('嘉善路')?.historicalName).toBe('Route Gaston Kahn')
    expect(labels.get('Jiashan Road')?.featureGroupId).toBe('road-gaston')
  })

  it('adds the requested inferred expressway names', () => {
    const labels = buildRoadLabelIndex(features)
    expect(labels.get('延安高架路')?.historicalName).toBe('Foch Expressway')
    expect(labels.get('南北高架路')?.historicalName).toBe('Dubail Expressway')
  })

  it('resolves a selected historical group to its modern basemap road', () => {
    expect(roadModernNameForGroup(features, 'road-gaston')).toBe('嘉善路')
    expect(roadModernNameForGroup(features, 'missing-road')).toBeUndefined()
  })
})
