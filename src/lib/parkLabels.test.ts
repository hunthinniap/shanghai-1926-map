import { describe, expect, it } from 'vitest'
import type { HistoricalFeature, HistoricalFeatureCollection } from '../types'
import { buildParkLabelIndex, mergeCuratedParkFeatures } from './parkLabels'

function point(id: string, featureGroupId: string): HistoricalFeature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [121.45, 31.22] },
    properties: {
      id,
      featureGroupId,
      kind: 'landmark',
      historicalName: id,
      modernNameZh: id,
      jurisdiction: 'french-concession',
      language: 'fr',
      labelYear: 1928,
      sourceIds: ['source'],
      category: '公园',
      priority: 1,
    },
  }
}

describe('current park historical labels', () => {
  it('maps Xiangyang Park to Parc Ravinel', () => {
    const entry = buildParkLabelIndex().get('襄阳公园')
    expect(entry?.historicalName).toBe('Parc Ravinel')
    expect(entry?.featureGroupId).toBe('park-parc-ravinel')
  })

  it('uses the same Jessfield Park record for both current name variants', () => {
    const index = buildParkLabelIndex()
    expect(index.get('中山公园')).toBe(index.get('上海中山公园'))
    expect(index.get('上海中山公园')?.historicalName).toBe('Jessfield Park')
  })

  it('maps Nie Er Music Square to Square Paul Brunat', () => {
    const index = buildParkLabelIndex()
    expect(index.get('聂耳音乐广场')?.historicalName).toBe('Square Paul Brunat')
    expect(index.get('聂耳绿地')).toBe(index.get('聂耳音乐广场'))
  })

  it.each([
    ['复兴公园', 'Parc français'],
    ['衡山公园', 'Parc Edan'],
    ['上海文化广场', 'Le Canidrome'],
    ['蓬莱公园', 'Tatung School Grounds'],
    ['漕溪公园', 'Tsao Family Garden'],
    ['康健园', 'Kang Chien Garden'],
    ['华山花园', 'Jardin de la famille Chow'],
  ])('maps %s to the approved Latin-script label', (modernName, historicalName) => {
    expect(buildParkLabelIndex().get(modernName)?.historicalName).toBe(historicalName)
  })

  it.each([
    '静安公园',
    '淮海公园',
    '徐家汇公园',
    '绍兴公园',
    '延中公园',
    '延中广场公园',
    '辅德里公园',
    '九子公园',
    '古城公园',
    '太平桥公园',
    '丽园公园',
    '徐汇跑道公园',
    '华山儿童公园',
    '淮茂绿地',
    '延福绿地',
    '东湖绿地',
    '宝庆路3号花园',
    '静安雕塑公园',
    '蝴蝶湾花园',
  ])('does not expose the removed proposed label for %s', (modernName) => {
    expect(buildParkLabelIndex().has(modernName)).toBe(false)
  })

  it('keeps map-facing park labels in Latin script', () => {
    for (const entry of buildParkLabelIndex().values()) {
      expect(entry.historicalName).not.toMatch(/[\u3400-\u9fff]/)
    }
  })

  it('replaces drift-prone legacy park geometry with curated current park points', () => {
    const legacyFrenchPark = point('legacy', 'landmark-french-park')
    legacyFrenchPark.properties.sourceIds = ['source', 'vs-buildings']
    legacyFrenchPark.properties.sourceRecordIds = [77]
    legacyFrenchPark.properties.sourceUrls = {
      'vs-buildings': 'https://www.virtualshanghai.net/数据/建筑?ID=77',
    }
    legacyFrenchPark.properties.historicalRecords = [{
      name: 'Koukaza Park',
      sourceRecordIds: [77],
      sourceUrls: ['https://www.virtualshanghai.net/数据/建筑?ID=77'],
    }]
    const historical: HistoricalFeatureCollection = {
      type: 'FeatureCollection',
      features: [legacyFrenchPark, point('road', 'unrelated')],
    }
    const curated: HistoricalFeatureCollection = {
      type: 'FeatureCollection',
      features: [point('park-french-park', 'park-french-park')],
    }
    const merged = mergeCuratedParkFeatures(historical, curated)
    expect(merged.features.map((feature) => feature.properties.id)).toEqual([
      'road',
      'park-french-park',
    ])
    const frenchPark = merged.features.find((feature) => feature.properties.id === 'park-french-park')
    expect(frenchPark?.properties.sourceRecordIds).toEqual([77])
    expect(frenchPark?.properties.historicalRecords?.[0].name).toBe('Koukaza Park')
    expect(frenchPark?.properties.sourceUrls?.['vs-buildings']).toContain('ID=77')
  })
})
