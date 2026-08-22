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
    {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[121.48, 31.24], [121.49, 31.24]] },
      properties: {
        id: 'hupin-1',
        featureGroupId: 'road-hupin',
        kind: 'road',
        historicalName: 'Wu Bin Lu',
        historicalChinese: '和平路',
        modernNameZh: '天潼路',
        jurisdiction: 'chinese-administered',
        language: 'wuu',
        labelYear: 1939,
        sourceIds: ['test'],
        category: '道路',
        priority: 4,
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[121.49, 31.24], [121.5, 31.24]] },
      properties: {
        id: 'damaged-1',
        featureGroupId: 'road-damaged',
        kind: 'road',
        historicalName: 'XX昌路',
        modernNameZh: 'XX昌路',
        jurisdiction: 'chinese-administered',
        language: 'zh',
        labelYear: 1939,
        sourceIds: ['test'],
        category: '道路',
        priority: 4,
        labelOnMap: false,
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

  it('uses Shanghainese romanization and skips damaged source names', () => {
    const labels = buildRoadLabelIndex(features)
    expect(labels.get('天潼路')?.historicalName).toBe('Wu Bin Lu')
    expect(labels.has('XX昌路')).toBe(false)
  })

  it('resolves a selected historical group to its modern basemap road', () => {
    expect(roadModernNameForGroup(features, 'road-gaston')).toBe('嘉善路')
    expect(roadModernNameForGroup(features, 'missing-road')).toBeUndefined()
  })

  it('uses the Old City street-side name instead of a concession boundary label', () => {
    const oldCityFeatures: HistoricalFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        ...features.features,
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[121.48, 31.22], [121.49, 31.22]] },
          properties: {
            id: 'old-city-renmin-1',
            featureGroupId: 'road-old-city-人民路',
            kind: 'road',
            historicalName: 'Min Kueq Lu',
            historicalChinese: '民國路',
            modernNameZh: '人民路',
            jurisdiction: 'old-city',
            language: 'wuu',
            labelYear: 1927,
            sourceIds: ['test'],
            category: '道路',
            priority: 1,
          },
        },
      ],
    }
    expect(buildRoadLabelIndex(oldCityFeatures).get('人民路')).toMatchObject({
      historicalName: 'Min Kueq Lu',
      featureGroupId: 'road-old-city-人民路',
    })
  })
})
