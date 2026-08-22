import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const sourcesPath = path.join(projectRoot, 'public', 'data', 'sources.json')
const sourceId = 'wikipedia-1865-smc-road-list'

const source = {
  id: sourceId,
  title: '1865年上海工部局命名道路列表',
  url: 'https://zh.wikipedia.org/wiki/1865年上海工部局命名道路列表',
  license: 'CC BY-SA 4.0',
  year: 1865,
}

// Only rows whose “原名” column is populated are included. Matching also uses
// the later formal name and today’s road, so similarly named roads elsewhere
// cannot be changed accidentally. The two branches of the former Soochow Road
// are intentionally represented as separate modern-road groups.
const originalRoadNames = [
  {
    key: 'bund',
    modernNameZh: '中山东一路',
    formalNames: ['Bund Road'],
    historicalName: 'Bund',
    historicalChinese: '外滩',
    aliases: ['黄浦滩', '滩路', '黄浦路'],
  },
  {
    key: 'bridge-street',
    modernNameZh: '四川中路',
    formalNames: ['Szechuen Road'],
    historicalName: 'Bridge Street',
    historicalChinese: '桥街',
  },
  {
    key: 'church-street',
    modernNameZh: '江西中路',
    formalNames: ['Kiangse Road'],
    historicalName: 'Church Street',
    historicalChinese: '教堂街',
  },
  {
    key: 'barrier-street',
    modernNameZh: '河南中路',
    formalNames: ['Honan Road'],
    historicalName: 'Barrier Street',
    historicalChinese: '界路',
  },
  {
    key: 'temple-street',
    modernNameZh: '山东中路',
    formalNames: ['Shantung Road'],
    historicalName: 'Temple Street',
    historicalChinese: '庙街',
  },
  {
    key: 'louzar-road',
    modernNameZh: '山西南路',
    formalNames: ['Shanse Road'],
    historicalName: 'Louzar Road',
    historicalChinese: '老闸路',
  },
  {
    key: 'shackloo-road',
    modernNameZh: '福建中路',
    formalNames: ['Fokien Road', 'Fukien Road'],
    historicalName: 'Shackloo Road',
    historicalChinese: '石路',
    aliases: ['闭路'],
  },
  {
    key: 'soochow-chekiang',
    modernNameZh: '浙江中路',
    formalNames: ['Chekiang Road'],
    historicalName: 'Soochow Road',
    historicalChinese: '苏州路',
  },
  {
    key: 'soochow-hoopeh',
    modernNameZh: '湖北路',
    formalNames: ['Hoopeh Road'],
    historicalName: 'Soochow Road',
    historicalChinese: '苏州路',
  },
  {
    key: 'sikh-road',
    modernNameZh: '广西北路',
    formalNames: ['Kwangse Road', 'Quangsee Road'],
    historicalName: 'Sikh Road',
    historicalChinese: '锡克路',
    aliases: ['印度路'],
  },
  {
    key: 'soochow-creek-bund',
    modernNameZh: '南苏州路',
    formalNames: ['Soochow Road'],
    historicalName: 'Bund on the Soochow Creek',
    historicalChinese: '苏州河滩路',
  },
  {
    key: 'gnaomen-road',
    modernNameZh: '香港路',
    formalNames: ['Hongkong Road'],
    historicalName: 'Gnaomen Road',
    historicalChinese: '诺门路',
  },
  {
    key: 'consulate-road',
    modernNameZh: '北京东路',
    formalNames: ['Peking Road'],
    historicalName: 'Consulate Road',
    historicalChinese: '领事馆路',
  },
  {
    key: 'kirks-avenue',
    modernNameZh: '宁波路',
    formalNames: ['Ningpo Road'],
    historicalName: "Kirk's Avenue",
    historicalChinese: '宽克路',
  },
  {
    key: 'fives-court-lane',
    modernNameZh: '天津路',
    formalNames: ['Tientsin Road'],
    historicalName: 'Fives Court Lane',
    historicalChinese: '五柱球弄',
    aliases: ['球场弄'],
  },
  {
    key: 'garden-park-maloo',
    modernNameZh: '南京东路',
    formalNames: ['Nanking Road'],
    historicalName: 'Garden Lane / Park Lane / Maloo',
    historicalChinese: '花园弄',
    aliases: ['派克弄', '马路', 'Garden Lane, Park Lane & Maloo'],
  },
  {
    key: 'rope-walk-road',
    modernNameZh: '九江路',
    formalNames: ['Kiukiang Road'],
    historicalName: 'Rope Walk Road',
    historicalChinese: '打绳路',
    aliases: ['纤道路'],
  },
  {
    key: 'custom-house-road',
    modernNameZh: '汉口路',
    formalNames: ['Hankow Road'],
    historicalName: 'Custom House Road',
    historicalChinese: '海关路',
  },
  {
    key: 'mission-road',
    modernNameZh: '福州路',
    formalNames: ['Foochow Road'],
    historicalName: 'Mission Road',
    historicalChinese: '布道路',
    aliases: ['教会路'],
  },
  {
    key: 'north-gate-street',
    modernNameZh: '广东路',
    formalNames: ['Canton Road'],
    historicalName: 'North Gate Street',
    historicalChinese: '北门街',
  },
]

const [collection, sources] = await Promise.all([
  fs.readFile(dataPath, 'utf8').then(JSON.parse),
  fs.readFile(sourcesPath, 'utf8').then(JSON.parse),
])

const matchedGroups = new Map(originalRoadNames.map((road) => [road.key, new Set()]))
const updatedFeatures = collection.features.map((feature) => {
  const properties = feature.properties ?? {}
  if (properties.kind !== 'road' || properties.jurisdiction !== 'international-settlement') return feature

  const road = originalRoadNames.find((candidate) =>
    properties.original1865Key === candidate.key ||
    (properties.modernNameZh === candidate.modernNameZh && candidate.formalNames.includes(properties.historicalName)),
  )
  if (!road) return feature

  matchedGroups.get(road.key).add(properties.featureGroupId)
  const priorAliases = [
    ...(properties.aliases ?? []),
    properties.historicalName,
    properties.historicalChinese,
  ].filter(Boolean)

  return {
    ...feature,
    properties: {
      ...properties,
      featureGroupId: `road-original-1865-${road.key}`,
      historicalName: road.historicalName,
      historicalChinese: road.historicalChinese,
      aliases: [...new Set([
        ...priorAliases,
        ...(road.aliases ?? []),
        road.historicalName,
        road.historicalChinese,
      ])],
      labelYear: 1865,
      sourceIds: [...new Set([...(properties.sourceIds ?? []), sourceId])],
      language: 'en',
      curated1865Original: true,
      original1865Key: road.key,
    },
  }
})

const missingRoads = originalRoadNames.filter((road) => matchedGroups.get(road.key).size === 0)
if (missingRoads.length) {
  throw new Error(`Could not find existing road groups for: ${missingRoads.map((road) => road.modernNameZh).join('、')}`)
}

const mergedSources = [...sources.filter((entry) => entry.id !== sourceId), source]
await Promise.all([
  fs.writeFile(dataPath, `${JSON.stringify({ ...collection, features: updatedFeatures })}\n`, 'utf8'),
  fs.writeFile(sourcesPath, `${JSON.stringify(mergedSources, null, 2)}\n`, 'utf8'),
])

console.log(
  `Applied ${originalRoadNames.length} original-name mappings to ${
    new Set(updatedFeatures.filter((feature) => feature.properties?.curated1865Original).map((feature) => feature.properties.featureGroupId)).size
  } existing road groups.`,
)
