import { describe, expect, it } from 'vitest'
import type { HistoricalFeatureCollection } from '../types'
import { buildMetroStationLabelIndex } from './metroLabels'

const collection: HistoricalFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[121.4, 31.2], [121.41, 31.21]] },
      properties: {
        id: 'road-hengshan',
        featureGroupId: 'road-hengshan',
        kind: 'road',
        historicalName: 'Avenue Petain',
        modernNameZh: '衡山路',
        jurisdiction: 'french-concession',
        language: 'fr',
        labelYear: 1939,
        sourceIds: ['test'],
        category: '道路',
        priority: 2,
      },
    },
  ],
}

describe('Republican-era metro station inference', () => {
  it('reuses an existing historical road name for a station', () => {
    expect(buildMetroStationLabelIndex(collection).get('衡山路')).toMatchObject({
      historicalName: 'Avenue Petain',
      basis: 'historical-match',
    })
  })

  it('adds explicit place-name inferences for central interchanges', () => {
    const labels = buildMetroStationLabelIndex(collection)
    expect(labels.get('人民广场')?.historicalName).toBe('Race Course')
    expect(labels.get('静安寺')?.historicalName).toBe('Bubbling Well Temple')
    expect(labels.get('徐家汇')?.historicalName).toBe('Zikawei')
  })
})

