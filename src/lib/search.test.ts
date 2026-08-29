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

  it('indexes a landmark by its present occupant and use', () => {
    const landmark = {
      ...road,
      geometry: { type: 'Point' as const, coordinates: [121.485, 31.238] },
      properties: {
        ...road.properties,
        id: 'landmark-hsbc',
        featureGroupId: 'landmark-hsbc',
        kind: 'landmark' as const,
        historicalName: 'Hongkong & Shanghai Banking Corporation',
        modernNameZh: '汇丰银行',
        currentNameZh: '上海浦东发展银行总部',
        currentUse: '金融办公',
        category: '重要建筑',
      },
    } satisfies HistoricalFeature
    const landmarkRecords = makeSearchRecords([landmark])
    expect(searchRecords(landmarkRecords, '浦东发展银行')[0]?.historicalName)
      .toBe('Hongkong & Shanghai Banking Corporation')
    expect(searchRecords(landmarkRecords, '金融办公')[0]?.featureGroupId).toBe('landmark-hsbc')
  })

  it('indexes every important historical name inside a clustered site', () => {
    const clusteredLandmark = {
      ...road,
      geometry: { type: 'Point' as const, coordinates: [121.458, 31.206] },
      properties: {
        ...road.properties,
        id: 'landmark-rihui-port-mosque',
        featureGroupId: 'landmark-rihui-port-mosque',
        kind: 'landmark' as const,
        historicalName: 'Rihui Port Mosque',
        modernNameZh: '日晖港清真寺',
        category: '宗教设施',
        historicalRecords: [
          { name: 'Rihui Port Mosque', nameZh: '日晖港清真寺', startYear: 1892 },
          { name: 'Muslim Cemetery', nameZh: '清真公塋' },
        ],
      },
    } satisfies HistoricalFeature
    const clusteredRecords = makeSearchRecords([clusteredLandmark])

    expect(searchRecords(clusteredRecords, 'Muslim Cemetery')[0]?.featureGroupId)
      .toBe('landmark-rihui-port-mosque')
    expect(searchRecords(clusteredRecords, '清真公塋')[0]?.historicalName)
      .toBe('Rihui Port Mosque')
  })
})
