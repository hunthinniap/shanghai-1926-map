import { describe, expect, it } from 'vitest'
import type { HistoricalFeature } from '../types'
import { makeSearchRecords, normalizeSearchTerm, searchRecords } from './search'

const road = {
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: [[121.46, 31.21], [121.47, 31.21]] },
  properties: {
    id: 'road-route-vallon-1',
    featureGroupId: 'road-route-vallon',
    kind: 'road',
    historicalName: 'Route Vallon',
    modernNameZh: '南昌路',
    modernNameEn: 'Nanchang Road',
    aliases: ['環龍路'],
    jurisdiction: 'french-concession',
    language: 'fr',
    labelYear: 1928,
    sourceIds: ['source'],
    category: '道路',
    priority: 1,
  },
} satisfies HistoricalFeature

describe('historical name search', () => {
  const records = makeSearchRecords([road])

  it('normalizes accents, punctuation and traditional Chinese', () => {
    expect(normalizeSearchTerm('  Rue d’Aurélie ')).toBe('rue d aurelie')
    expect(normalizeSearchTerm('復興公園')).toBe('复兴公园')
  })

  it('finds a road by historical and modern names', () => {
    expect(searchRecords(records, 'vallon')[0]?.historicalName).toBe('Route Vallon')
    expect(searchRecords(records, '南昌路')[0]?.modernNameZh).toBe('南昌路')
    expect(searchRecords(records, '環龍路')[0]?.historicalName).toBe('Route Vallon')
  })

  it('ranks exact matches ahead of partial matches', () => {
    const extended = [
      ...records,
      { ...records[0], featureId: 'other', featureGroupId: 'other', normalizedTerms: ['route vallon west'] },
    ]
    expect(searchRecords(extended, 'route vallon')[0]?.featureId).toBe('road-route-vallon-1')
  })
})
