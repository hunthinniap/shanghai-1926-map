import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { VectorTile } from '@mapbox/vector-tile'
import Pbf from 'pbf'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const sourcesPath = path.join(projectRoot, 'public', 'data', 'sources.json')
const roadBounds = [121.33, 31.18, 121.52, 31.3]
const tileZoom = 14

const auditedSources = [
  {
    id: 'sh-hongkou-north-roads-history',
    title: '上海市虹口区人民政府：北四川路越界筑路与历史路名',
    url: 'https://www.shhk.gov.cn/xwzx/002006/20210716/5898c605-5045-4692-a295-337bfb19348a.html',
    license: 'Government public information; research citation',
    year: 2021,
  },
  {
    id: 'sh-changning-lixi-history',
    title: '上海市长宁区人民政府：利西路历史沿革',
    url: 'https://www.shcn.gov.cn/col7343/20241008/1269199.html',
    license: 'Government public information; research citation',
    year: 2024,
  },
  {
    id: 'sh-changning-1925-roads',
    title: '上海市长宁区人民政府：1925年前后越界筑路与道路旧名',
    url: 'https://www.shcn.gov.cn/col7000/20110817/720753.html',
    license: 'Government public information; research citation',
    year: 2011,
  },
  {
    id: 'old-shanghai-street-index',
    title: 'Portuguese in Shanghai：旧上海街道中英文名称索引',
    url: 'https://macaudata.fmac.org.mo/macaubook/ebook001/html/PortgueseInShanghai.pdf',
    license: 'Research citation; rights retained by source',
    year: 1941,
  },
]

// These records are the accepted results of the Republican-era road-name audit.
// Geometry always comes from the current named road in OpenFreeMap, keeping the
// historical label precisely aligned with the visible modern street network.
const auditedRoads = [
  {
    modernNameZh: '多伦路',
    modernNameEn: 'Duolun Road',
    historicalChinese: '窦乐安路',
    historicalName: 'Darroch Road',
    jurisdiction: 'international-settlement',
    language: 'en',
    labelYear: 1927,
    sourceIds: ['sh-hongkou-north-roads-history', 'old-shanghai-street-index'],
    priority: 2,
  },
  {
    modernNameZh: '山阴路',
    modernNameEn: 'Shanyin Road',
    historicalChinese: '施高塔路',
    historicalName: 'Scott Road',
    jurisdiction: 'international-settlement',
    language: 'en',
    labelYear: 1927,
    sourceIds: ['sh-hongkou-north-roads-history', 'old-shanghai-street-index'],
    priority: 2,
  },
  {
    modernNameZh: '东江湾路',
    modernNameEn: 'East Jiangwan Road',
    historicalChinese: '江湾路',
    historicalName: 'Kiangwan Road',
    jurisdiction: 'international-settlement',
    language: 'en',
    labelYear: 1927,
    sourceIds: ['sh-hongkou-north-roads-history', 'old-shanghai-street-index'],
    priority: 2,
  },
  {
    modernNameZh: '利西路',
    modernNameEn: 'Lixi Road',
    historicalChinese: '吕西纳路',
    historicalName: 'Lucerne Road',
    jurisdiction: 'international-settlement',
    language: 'en',
    labelYear: 1920,
    sourceIds: ['sh-changning-lixi-history', 'old-shanghai-street-index'],
    priority: 3,
  },
  {
    modernNameZh: '绥宁路',
    modernNameEn: 'Suining Road',
    historicalChinese: '碑坊路',
    historicalName: 'Monument Road',
    jurisdiction: 'international-settlement',
    language: 'en',
    labelYear: 1925,
    sourceIds: ['sh-changning-1925-roads', 'old-shanghai-street-index'],
    priority: 3,
  },
  {
    modernNameZh: '东宝兴路',
    modernNameEn: 'East Baoxing Road',
    historicalChinese: '宝兴路',
    historicalName: 'Paoshing Road',
    jurisdiction: 'international-settlement',
    language: 'en',
    labelYear: 1939,
    sourceIds: ['old-shanghai-street-index'],
    priority: 2,
  },
  {
    modernNameZh: '云南北路',
    modernNameEn: 'North Yunnan Road',
    historicalChinese: '北云南路',
    historicalName: 'North Yunnan Road',
    jurisdiction: 'international-settlement',
    language: 'en',
    labelYear: 1939,
    sourceIds: ['vs-geocoder-1939', 'old-shanghai-street-index'],
    priority: 2,
  },
  {
    modernNameZh: '延安东路',
    modernNameEn: "Yan'an East Road",
    historicalChinese: '爱多亚路',
    historicalName: 'Avenue Édouard VII / Edward VII Road',
    jurisdiction: 'international-settlement',
    language: 'en',
    labelYear: 1928,
    sourceIds: ['stanford-map-1928', 'vs-geocoder-1939', 'old-shanghai-street-index'],
    priority: 1,
  },
  {
    modernNameZh: '盛泽路',
    modernNameEn: 'Shengze Road',
    historicalChinese: '磨坊街',
    historicalName: 'Rue du Moulin',
    jurisdiction: 'french-concession',
    language: 'fr',
    labelYear: 1928,
    sourceIds: ['stanford-map-1928', 'vs-geocoder-1939', 'old-shanghai-street-index'],
    priority: 3,
  },
]

const replacedHistoricalNames = new Set([
  'Avenue Edouard VII / Edward VII Road',
  'Avenue Edward VII / Edward VII Road',
  'Avenue Édouard VII / Edward VII Road',
  'Rue du Moulin',
])

function namesForRoad(properties = {}) {
  return new Set(
    [
      properties['name:nonlatin'],
      properties.name_zh,
      properties['name:zh-Hans'],
      properties['name:zh'],
      properties.name,
      properties.name_en,
      properties['name:latin'],
    ]
      .filter(Boolean)
      .map((value) => value.trim()),
  )
}

function longitudeToTileX(longitude, zoom) {
  return Math.floor(((longitude + 180) / 360) * 2 ** zoom)
}

function latitudeToTileY(latitude, zoom) {
  const radians = latitude * Math.PI / 180
  return Math.floor(((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * 2 ** zoom)
}

function lineStrings(geometry) {
  if (geometry.type === 'LineString') return [geometry.coordinates]
  if (geometry.type === 'MultiLineString') return geometry.coordinates
  return []
}

async function fetchRoadLines() {
  const tileJsonResponse = await fetch('https://tiles.openfreemap.org/planet')
  if (!tileJsonResponse.ok) throw new Error(`OpenFreeMap TileJSON failed: ${tileJsonResponse.status}`)
  const tileJson = await tileJsonResponse.json()
  const template = tileJson.tiles?.[0]
  if (!template) throw new Error('OpenFreeMap TileJSON has no vector-tile URL')

  const [west, south, east, north] = roadBounds
  const minX = longitudeToTileX(west, tileZoom)
  const maxX = longitudeToTileX(east, tileZoom)
  const minY = latitudeToTileY(north, tileZoom)
  const maxY = latitudeToTileY(south, tileZoom)
  const roads = []

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      const tileUrl = template
        .replace('{z}', String(tileZoom))
        .replace('{x}', String(x))
        .replace('{y}', String(y))
      const response = await fetch(tileUrl)
      if (!response.ok) throw new Error(`OpenFreeMap tile ${tileZoom}/${x}/${y} failed: ${response.status}`)
      const tile = new VectorTile(new Pbf(new Uint8Array(await response.arrayBuffer())))
      const layer = tile.layers.transportation_name
      if (!layer) continue
      for (let index = 0; index < layer.length; index += 1) {
        const feature = layer.feature(index)
        const geometry = feature.toGeoJSON(x, y, tileZoom).geometry
        lineStrings(geometry).forEach((coordinates, lineIndex) => {
          if (coordinates.length < 2) return
          roads.push({
            id: `${tileZoom}-${x}-${y}-${feature.id ?? index}-${lineIndex}`,
            properties: feature.properties,
            coordinates,
          })
        })
      }
    }
  }
  return roads
}

const [collection, sources, roadLines] = await Promise.all([
  fs.readFile(dataPath, 'utf8').then(JSON.parse),
  fs.readFile(sourcesPath, 'utf8').then(JSON.parse),
  fetchRoadLines(),
])

const linesByName = new Map()
roadLines.forEach((roadLine) => {
  namesForRoad(roadLine.properties).forEach((name) => {
    const matching = linesByName.get(name) ?? []
    matching.push(roadLine)
    linesByName.set(name, matching)
  })
})

const curatedFeatures = []
const missingNames = []
auditedRoads.forEach((road) => {
  const matchingLines = linesByName.get(road.modernNameZh) ?? []
  if (!matchingLines.length) {
    missingNames.push(road.modernNameZh)
    return
  }
  matchingLines.forEach((roadLine, index) => {
    curatedFeatures.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: roadLine.coordinates,
      },
      properties: {
        id: `osm-verified-road-${roadLine.id}-${index}`,
        featureGroupId: `road-verified-${road.modernNameZh}`,
        kind: 'road',
        historicalName: road.historicalName,
        modernNameZh: road.modernNameZh,
        modernNameEn: road.modernNameEn,
        historicalChinese: road.historicalChinese,
        aliases: [...new Set([
          road.modernNameZh,
          road.modernNameEn,
          road.historicalChinese,
          ...namesForRoad(roadLine.properties),
        ])],
        jurisdiction: road.jurisdiction,
        language: road.language,
        labelYear: road.labelYear,
        sourceIds: road.sourceIds,
        category: '道路',
        priority: road.priority,
        curatedVerifiedRoad: true,
      },
    })
  })
})

if (missingNames.length) {
  throw new Error(`No current named OpenFreeMap road found for: ${missingNames.join('、')}`)
}

const retainedFeatures = collection.features.filter((feature) => {
  const properties = feature.properties ?? {}
  if (properties.curatedVerifiedRoad) return false
  return !(properties.kind === 'road' && replacedHistoricalNames.has(properties.historicalName))
})
const mergedSources = [
  ...sources.filter((source) => !auditedSources.some((addition) => addition.id === source.id)),
  ...auditedSources,
]

await Promise.all([
  fs.writeFile(dataPath, `${JSON.stringify({ ...collection, features: [...retainedFeatures, ...curatedFeatures] })}\n`, 'utf8'),
  fs.writeFile(sourcesPath, `${JSON.stringify(mergedSources, null, 2)}\n`, 'utf8'),
])

console.log(
  `Applied ${auditedRoads.length} verified road mappings as ${curatedFeatures.length} current OpenFreeMap line segments.`,
)
