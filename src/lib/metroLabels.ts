import type { HistoricalFeatureCollection } from '../types'

export interface MetroStationLabelEntry {
  modernName: string
  historicalName: string
  basis: 'historical-match' | 'inferred'
}

export interface MetroStationSelection extends MetroStationLabelEntry {
  coordinates: [number, number]
}

const inferredStations: Array<[string, string]> = [
  ['人民广场', 'Race Course'],
  ['静安寺', 'Bubbling Well Temple'],
  ['徐家汇', 'Zikawei'],
  ['老西门', 'Old West Gate'],
  ['小南门', 'Little South Gate'],
  ['豫园', 'Yu Garden'],
  ['大世界', 'Great World'],
  ['打浦桥', 'Dapoo Bridge'],
  ['上海火车站', 'North Railway Station'],
  ['上海南站', 'Lunghwa Station'],
  ['上海西站', 'Chenju Station'],
  ['交通大学', 'Nanyang College'],
  ['上海图书馆', 'Zi-ka-wei Library'],
  ['龙华', 'Lunghwa'],
  ['龙华中路', 'Lunghwa Road'],
  ['陆家嘴', 'Lokawei'],
  ['东昌路', 'Pootung Wharf'],
  ['世纪大道', 'Pootung Crossroads'],
  ['中山公园', 'Jessfield Park'],
  ['上海体育馆', 'Chungsan Road'],
  ['上海体育场', 'Ziatu Road'],
  ['虹口足球场', 'Hongkew Recreation Ground'],
  ['上海马戏城', 'Chapei Recreation Ground'],
  ['自然博物馆', 'Race Club Stables'],
  ['南京西路', 'Love Lane'],
  ['一大会址·黄陂南路', 'Rue Amiral Bayle'],
  ['一大会址·新天地', 'French Concession'],
  ['南浦大桥', 'Nantao Riverfront'],
  ['国际客运中心', 'Hongkew Wharf'],
  ['提篮桥', 'Tilanqiao'],
  ['五角场', 'Kiangwan Civic Centre'],
  ['江湾体育场', 'Kiangwan Civic Stadium'],
  ['同济大学', 'Tongji University'],
  ['复旦大学', 'Fudan University'],
]

export function buildMetroStationLabelIndex(collection: HistoricalFeatureCollection) {
  const candidates = new Map<string, { historicalName: string; priority: number; count: number }>()

  collection.features.forEach((feature) => {
    const modernName = feature.properties.modernNameZh.trim()
    if (!modernName) return
    const current = candidates.get(modernName)
    if (
      !current ||
      feature.properties.priority < current.priority ||
      (feature.properties.priority === current.priority && current.count < 1)
    ) {
      candidates.set(modernName, {
        historicalName: feature.properties.historicalName,
        priority: feature.properties.priority,
        count: (current?.count ?? 0) + 1,
      })
    } else {
      current.count += 1
    }
  })

  const labels = new Map<string, MetroStationLabelEntry>()
  candidates.forEach((candidate, modernName) => {
    labels.set(modernName, {
      modernName,
      historicalName: candidate.historicalName,
      basis: 'historical-match',
    })
  })
  inferredStations.forEach(([modernName, historicalName]) => {
    labels.set(modernName, { modernName, historicalName, basis: 'inferred' })
  })
  return labels
}
