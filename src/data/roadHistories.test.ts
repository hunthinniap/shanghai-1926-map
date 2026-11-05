import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { reviewedRoadHistory, roadHistories } from './roadHistories'
import type { HistoricalFeatureCollection } from '../types'

const features = (JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection).features
describe('reviewed road history identity and event types', () => {
  it('keeps each history attached to both its modern and original road name', () => {
    for (const history of roadHistories) {
      const feature = features.find(f => f.properties.kind === 'road' && f.properties.modernNameZh === history.modernName && history.historicalNames.includes(f.properties.historicalName))!
      expect(feature, history.modernName).toBeDefined()
      expect(reviewedRoadHistory(feature.properties)).toBe(history)
      expect(reviewedRoadHistory({ ...feature.properties, modernNameZh: '异路' })).toBeUndefined()
      expect(history.events.every(e => e.url?.startsWith('https://zh.wikipedia.org/'))).toBe(true)
      expect(history.events.map(e => e.year)).toEqual(history.events.map(e => e.year).sort((a, b) => a! - b!))
    }
  })
  it('keeps the eastern and western Nanchang Road construction histories separate', () => {
    const a = roadHistories.find(h => h.historicalNames.includes('Route Vallon'))!
    const b = roadHistories.find(h => h.historicalNames.includes('Route Dolfus'))!
    expect(a.events[0].year).toBe(1912)
    expect(b.events[0].year).toBe(1902)
    expect(b.events[1]).toMatchObject({ year: 1920, kind: '更名' })
  })
})
