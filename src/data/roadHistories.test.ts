import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { reviewedRoadHistory, roadHistories } from './roadHistories'
import importedHistories from './importedRoadHistories.json'
import { roadHistorySupplementIdentity } from './roadHistorySupplements'
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

  it('requires the group, original name and modern name for every imported history', () => {
    for (const history of importedHistories) {
      const feature = features.find(f => f.properties.featureGroupId === history.featureGroupId)!
      expect(reviewedRoadHistory(feature.properties)).toMatchObject(history)
      expect(roadHistorySupplementIdentity(feature.properties)).toBeDefined()
      expect(reviewedRoadHistory({ ...feature.properties, featureGroupId: 'another-road' })).toBeUndefined()
      expect(reviewedRoadHistory({ ...feature.properties, modernNameZh: '另一条路' })).toBeUndefined()
      expect(reviewedRoadHistory({ ...feature.properties, historicalName: 'Other Road' })).toBeUndefined()
    }
  })

  it('displays range starts while preserving the original periods and open date limits', () => {
    const events = (name: string) => importedHistories.find(h => h.modernName === name)!.events
    expect(events('安义路').at(-1)).toMatchObject({ period: '1949年后', name: '安义路' })
    expect(events('安义路').at(-1)).not.toHaveProperty('year')
    expect(events('五原路')[0]).toMatchObject({ period: '1925年以前', kind: '辟筑' })
    expect(events('余庆路')[0]).toMatchObject({ period: '1920年代初' })
    expect(events('余庆路')[0]).toMatchObject({ displayYear: 1920 })
    expect(events('建国东路').at(-1)).toMatchObject({ period: '1945年（一说1946年）' })
    expect(events('合肥路')[0]).toMatchObject({ year: 1916, segment: '黄陂南路以东路段' })
  })

  it('uses road events while excluding building dates, lengths and mismatched road identities', () => {
    const gaoan = features.find(f => f.properties.featureGroupId === 'road-route-andre-cohen-高安路')!
    expect(roadHistorySupplementIdentity(gaoan.properties)).toBeDefined()
    expect(reviewedRoadHistory(gaoan.properties)?.events.map(e => e.year)).toEqual([1914])
    const weihai = importedHistories.find(h => h.modernName === '威海路')!
    expect(weihai.events.map(e => e.year)).toEqual([1901, 1966])
    const wuting = features.find(f => f.properties.featureGroupId === 'road-wuting-road-武定西路')!
    expect(reviewedRoadHistory(wuting.properties)).toBeUndefined()
    expect(roadHistorySupplementIdentity({ ...gaoan.properties, modernNameZh: '另一条路' })).toBeUndefined()
  })

  it('adopts the user-approved Gordon Road timeline at the range start', () => {
    const feature = features.find(f => f.properties.featureGroupId === 'road-gordon-road-江宁路')!
    const history = reviewedRoadHistory(feature.properties)!
    expect(history.events.map(e => [e.year, e.name])).toEqual([
      [1884, '戈登路 (Gordon Road)'], [1943, '江宁路'],
    ])
    expect(history.events[0].originalPeriod).toBe('1884年—1900年')
    expect(history.events.every(e => !e.name.includes('巡捕房'))).toBe(true)
  })
})
