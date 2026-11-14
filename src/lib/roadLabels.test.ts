import type { HistoricalFeatureCollection } from '../types'
import { buildRoadLabelIndex, datedRoadSegments, roadModernNameForGroup, roadNameAtYear } from './roadLabels'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { roadDisplayName } from './roadDisplayNames'

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

  it('displays the Chinese historical name and skips damaged source names', () => {
    const labels = buildRoadLabelIndex(features)
    expect(labels.get('天潼路')?.historicalName).toBe('和平路')
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
      historicalName: '民國路',
      featureGroupId: 'road-old-city-人民路',
    })
  })

  it('shows identified Chinese names in the real road label index while retaining foreign names', () => {
    const collection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    const before = JSON.stringify(collection)
    const labels = buildRoadLabelIndex(collection)
    for (const name of ['海宁路', '嘉兴路', '厦门路', '新闸路', '七浦路', '愚园路', '圆明园路', '甘肃路', '山海关路']) {
      expect(labels.get(name)?.historicalName, name).toBe(name)
    }
    for (const [modern, historical] of [
      ['新疆路', '南川虹路'], ['蒙古路', '蒙古路'], ['晋元路', '满州路'],
      ['滇池路', '仁记路'], ['九江路', '打绳路'],
    ]) {
      expect(labels.get(modern)?.historicalName, modern).toBe(historical)
    }
    for (const original of ['Yates Road', 'Amherst Road', 'Rockhill Avenue', 'Avenue Joffre', 'Seymour Road']) {
      const road = collection.features.find(feature => feature.properties.kind === 'road' && feature.properties.historicalName === original)!
      expect(roadDisplayName(road.properties)).toBe(original)
    }
    for (const chinese of ['白利南支路', '派克衖']) {
      const road = collection.features.find(feature => feature.properties.kind === 'road' && feature.properties.historicalChinese === chinese)!
      expect(roadDisplayName(road.properties)).toBe(road.properties.historicalName)
    }
    expect(JSON.stringify(collection)).toBe(before)
  })

  it('does not substitute a modern name when the Chinese historical form is missing or damaged', () => {
    const road = { ...features.features[1].properties, historicalName: 'Haining Road', language: 'en' as const }
    expect(roadDisplayName({ ...road, historicalChinese: undefined })).toBe('Haining Road')
    expect(roadDisplayName({ ...road, historicalChinese: 'XX路' })).toBe('Haining Road')
  })

  it('switches dated map labels at the accepted year, showing a recorded water name before the road', () => {
    const collection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    const names = (year: number, road: string) => buildRoadLabelIndex(collection, year).get(road)?.historicalName
    expect(names(1913, '复兴中路')).toBe('南长浜')
    expect(names(1914, '复兴中路')).toBe('法华路')
    expect(names(1918, '复兴中路')).toBe('Route Lafayette')
    expect(names(1943, '复兴中路')).toBe('大兴路')
    expect(names(1945, '复兴中路')).toBe('复兴中路')
    for (const [groupId, name] of [
      ['road-boulevard-des-deux-republiques-人民路', 'Boulevard des Deux Republiques'],
      ['road-old-city-人民路', '法华民国路'],
    ]) {
      const road = collection.features.find(feature => feature.properties.featureGroupId === groupId)!.properties
      expect(roadNameAtYear(road, 1912)).toBeUndefined()
      expect(roadNameAtYear(road, 1913)).toBe(name)
    }
    expect(names(1914, '瑞金二路')).toBe('Route Pere Robert')
    expect(names(1914, '瑞金一路')).toBe('Route des Soeurs')
    expect(names(1891, '新建路')).toBe('新记浜')
    expect(names(1915, '延安东路')).toBe('洋泾浜')
    expect(names(1916, '延安东路')).toBe('Avenue Édouard VII / Edward VII Road')
    expect(names(1919, '德昌路')).toBeUndefined()
    expect(names(1920, '德昌路')).toBe('Route Delaunay')
    expect(names(1943, '德昌路')).toBe('德昌路')
    expect(buildRoadLabelIndex(collection).get('蓬莱路')?.historicalName).toBe('蓬莱路')
    expect(names(1905, '蓬莱路')).toBe('半段泾 / 杨家桥浜 / 运粮浜')
    expect(names(1906, '蓬莱路')).toBe('蓬莱路')
    expect(names(1928, '延安高架路')).toBeUndefined()
  })

  it('keeps Zhaojia Road through 1944 and switches to Fuxing East Road in 1945', () => {
    const collection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    const road = collection.features.find(f => f.properties.featureGroupId === 'road-old-city-复兴东路')!.properties
    const expectedNames = [
      [1900, '肇嘉浜'], [1912, '肇嘉浜'], [1913, '肇嘉路'], [1928, '肇嘉路'],
      [1943, '肇嘉路'], [1944, '肇嘉路'], [1945, '复兴东路'],
    ] as const
    for (const [year, name] of expectedNames) {
      expect(roadNameAtYear(road, year), String(year)).toBe(name)
      expect(buildRoadLabelIndex(collection, year).get('复兴东路')?.historicalName, String(year)).toBe(name)
    }
  })

  it('places different names on the north and south road segments without labelling the whole road', () => {
    const collection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    const segments = (year: number) => new Set(datedRoadSegments(collection, year).features
      .filter(feature => feature.properties?.modernNameZh.startsWith('吴兴路'))
      .map(feature => feature.properties?.historicalName))
    expect(segments(1919)).toEqual(new Set())
    expect(segments(1920)).toEqual(new Set(['Route Bridou', 'Route Pershing']))
    expect(segments(1943)).toEqual(new Set(['吴兴路']))
    expect(buildRoadLabelIndex(collection, 1920).get('吴兴路')).toBeUndefined()
    expect(datedRoadSegments(collection, null).features.some(feature =>
      feature.properties?.modernNameZh.startsWith('吴兴路'))).toBe(false)
  })

  it('labels the existing Huiguan Lane basemap line from its first documented year', () => {
    const collection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    expect(buildRoadLabelIndex(collection, 1909).get('会馆弄')).toBeUndefined()
    expect(buildRoadLabelIndex(collection, 1910).get('会馆弄')).toMatchObject({
      historicalName: '会馆弄',
      featureGroupId: 'road-old-city-会馆弄',
    })
    expect(datedRoadSegments(collection, 1910).features.some(feature =>
      feature.properties?.featureGroupId === 'road-old-city-会馆弄')).toBe(false)
  })

  it('uses reviewed geometry for reverse-matched roads and limits the current Huiguan Street to its dated segment', () => {
    const collection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    const segments = (year: number | null, road: string) => datedRoadSegments(collection, year).features
      .filter(feature => feature.properties?.modernNameZh === road)
    const name = (year: number | null, road: string) => segments(year, road)[0]?.properties?.historicalName
    expect(buildRoadLabelIndex(collection, 1928).has('柳市路')).toBe(false)
    expect(name(1909, '柳市路')).toBeUndefined()
    expect(name(null, '柳市路')).toBe('留云寺路')
    expect(name(1943, '柳市路')).toBe('柳市路')
    expect(segments(2017, '会馆街')).toEqual([])
    expect(name(2018, '会馆街')).toBe('会馆街')
    expect(segments(2018, '会馆街')[0].geometry).toMatchObject({
      type: 'LineString',
      coordinates: [[121.5012929, 31.2148305], [121.4995552, 31.2153148], [121.4977106, 31.215829]],
    })
  })

  it('switches reviewed Old City segment names without carrying a local name onto the whole road', () => {
    const collection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    const labels = (year: number, prefix: string) => datedRoadSegments(collection, year).features
      .filter(feature => feature.properties?.modernNameZh.startsWith(prefix))
      .map(feature => feature.properties?.historicalName)
    expect(labels(1903, '东江阴街')).toEqual([])
    expect(new Set(labels(1904, '东江阴街'))).toEqual(new Set(['校场街', '复善堂街']))
    expect(labels(1930, '东江阴街')).toEqual(['复善堂街'])
    expect(labels(1964, '东江阴街')).toEqual(['东江阴街'])
    expect(labels(1908, '白渡路')).toEqual(['肇家浜'])
    expect(new Set(labels(1909, '白渡路'))).toEqual(new Set(['坝基桥街', '老白渡路']))
    expect(labels(1950, '白渡路')).toEqual(['白渡路'])
    expect(labels(1979, '光启南路')).toEqual(['阜民路'])
    expect(labels(1980, '光启南路')).toEqual(['光启南路'])
    const north = collection.features.find(f => f.properties.modernNameZh === '光启南路（北段）')!
    expect(roadNameAtYear(north.properties, 1979)).toBe('阜民路')
    expect(roadNameAtYear(north.properties, 1980)).toBe('光启南路')
    expect(labels(1963, '金坛路')).toEqual(['警察厅路'])
    expect(labels(1964, '金坛路')).toEqual(['金坛路'])
  })

  it('keeps Hengshan Road named after 1943 instead of using nightlife prose', () => {
    const collection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    const road = collection.features.find(f => f.properties.featureGroupId === 'road-avenue-petain-衡山路')!
    expect(roadNameAtYear(road.properties, 1921)).toBeUndefined()
    expect(roadNameAtYear(road.properties, 1922)).toBe('Avenue Petain')
    expect(roadNameAtYear(road.properties, 1942)).toBe('Avenue Petain')
    expect(roadNameAtYear(road.properties, 1943)).toBe('衡山路')
    expect(roadNameAtYear(road.properties, 2004)).toBe('衡山路')
  })
  it('uses the requested Chinese labels for Xinhui and Yichang after 1943', () => {
    const collection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    for (const [id, name] of [['road-mapai-road-新会路', '新会路'], ['road-ichang-road-宜昌路', '宜昌路']]) {
      const road = collection.features.find(feature => feature.properties.featureGroupId === id)!
      expect(roadNameAtYear(road.properties, 1943)).toBe(name)
      expect(roadNameAtYear(road.properties, 1996)).toBe(name)
    }
  })

  it('uses Tianjin Road before the dataset year and keeps construction prose out of Beihai labels', () => {
    const collection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    const tianjin = collection.features.find(f => f.properties.featureGroupId === 'road-original-1865-fives-court-lane')!
    expect(roadNameAtYear(tianjin.properties, 1900)).toBe('天津路')
    expect(roadNameAtYear(tianjin.properties, 1864)).toBe('球场弄')
    for (const id of ['road-pakhoi-road-北海路', 'road-hoikow-road-北海路']) {
      const road = collection.features.find(f => f.properties.featureGroupId === id)!
      expect(roadNameAtYear(road.properties, 1883)).toBe('北海路')
      expect(roadNameAtYear(road.properties, 2003)).toBe('北海路')
    }
  })

  it('keeps the independently sourced Huiguan Lane bends and does not inherit the hall construction date', () => {
    const collection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection
    const lane = collection.features.find(f => f.properties.featureGroupId === 'road-old-city-会馆弄')!
    expect(lane.geometry).toMatchObject({ type: 'LineString', coordinates: [
      [121.4948385,31.2259772],[121.4949365,31.226008],[121.4955526,31.2262019],
      [121.4961278,31.2263829],[121.4962863,31.2265204],
    ] })
    expect(roadNameAtYear(lane.properties, 1909)).toBeUndefined()
    expect(roadNameAtYear(lane.properties, 1910)).toBe('会馆弄')
  })
})
