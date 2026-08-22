import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { VectorTile } from '@mapbox/vector-tile'
import Pbf from 'pbf'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const sourcesPath = path.join(projectRoot, 'public', 'data', 'sources.json')
const oldCityBounds = [121.4767, 31.2148, 121.4963, 31.2332]
const tileZoom = 14

const oldCitySources = [
  {
    id: 'vs-map-259-1927',
    title: 'Virtual Shanghai：上海新地圖（1927）',
    url: 'https://www.virtualshanghai.net/maps/collection?ID=259',
    license: 'Rights information on source record',
    year: 1927,
  },
  {
    id: 'sh-old-city-place-names',
    title: '上海市测绘院／《上海地名志》：上海旧城厢的地名文化',
    url: 'https://www.thepaper.cn/newsDetail_forward_15247094',
    license: 'Research citation; rights retained by source',
    year: 2021,
  },
]

// Labels use old-pronunciation Wugniu spellings without tone numbers, matching
// the rest of the Chinese-administered road layer. The Chinese form is retained
// for search and the details panel. Except for the four renamed trunk roads,
// these are long-lived Old City street names still attached to the same street.
const oldCityRoads = [
  ['人民路', 'Renmin Road', '民國路', 'Min Kueq Lu', 1],
  ['中华路', 'Zhonghua Road', '中華路', 'Tzon Wa Lu', 1],
  ['复兴东路', 'Fuxing East Road', '肇嘉路', 'Dzo Ka Lu', 1],
  ['方浜中路', 'Fangbang Middle Road', '方浜路', 'Faon Pan Lu', 2],
  ['河南南路', 'Henan South Road', '晏海路', 'Ae He Lu', 2],
  ['大境路', 'Dajing Road', '大境路', 'Da Cin Lu', 3],
  ['青莲街', 'Qinglian Street', '青蓮街', 'Tsin Li Ka', 4],
  ['露香园路', 'Luxiangyuan Road', '露香園路', 'Lu Xian Yeu Lu', 3],
  ['梦花街', 'Menghua Street', '夢花街', 'Maon Hau Ka', 4],
  ['老道前街', 'Laodaoqian Street', '老道前街', 'Lo Do Dzi Ka', 4],
  ['学宫街', 'Xuegong Street', '學宮街', 'Roq Kon Ka', 4],
  ['学前街', 'Xueqian Street', '學前街', 'Roq Dzi Ka', 3],
  ['文庙路', 'Wenmiao Road', '文廟路', 'Ven Mio Lu', 3],
  ['西仓桥街', 'Xicangqiao Street', '西倉橋街', 'Sij Tsaon Djio Ka', 4],
  ['先棉祠街', 'Xianmianci Street', '先棉祠街', 'Si Mi Zy Ka', 4],
  ['沉香阁路', 'Chenxiangge Road', '沉香閣路', 'Dzen Xian Koq Lu', 4],
  ['豫园老街', 'Yuyuan Old Street', '豫園老街', 'Yu Yeu Lo Ka', 3],
  ['安仁街', 'Anren Street', '安仁街', 'Eu Gnin Ka', 4],
  ['梧桐路', 'Wutong Road', '梧桐路', 'Ngu Don Lu', 4],
  ['丹凤路', 'Danfeng Road', '丹鳳路', 'Tae Von Lu', 4],
  ['四牌楼路', 'Sipailou Road', '四牌樓路', 'Sy Ba Loe Lu', 3],
  ['东街', 'East Street', '東街', 'Ton Ka', 4],
  ['望云路', 'Wangyun Road', '望雲路', 'Maon Yun Lu', 3],
  ['凝和路', 'Ninghe Road', '凝和路', 'Gnin Wu Lu', 3],
  ['乔家路', 'Qiaojia Road', '喬家路', 'Djio Ka Lu', 3],
  ['药局弄', 'Yaoju Lane', '藥局弄', 'Yaoq Djioq Lon', 4],
  ['巡道街', 'Xundao Street', '巡道街', 'Zin Do Ka', 4],
  ['万竹街', 'Wanzhu Street', '萬竹街', 'Vae Tzoq Ka', 4],
  ['阜春街', 'Fuchun Street', '阜春街', 'Voe Tsen Ka', 4],
  ['金家坊', 'Jinjiafang', '金家坊', 'Cin Ka Faon', 4],
  ['西马街', 'Xima Street', '西馬街', 'Sij Mau Ka', 4],
  ['大夫坊', 'Dafufang', '大夫坊', 'Da Fu Faon', 4],
  ['天灯弄', 'Tiandeng Lane', '天燈弄', 'Thi Ten Lon', 4],
  ['吾园街', 'Wuyuan Street', '吾園街', 'Ngu Yeu Ka', 4],
  ['光启路', 'Guangqi Road', '光啟路', 'Kuaon Chij Lu', 3],
  ['东梅家街', 'Dongmeijia Street', '東梅家街', 'Ton Me Ka Ka', 4],
  ['引线弄', 'Yinxian Lane', '引線弄', 'Yin Si Lon', 4],
  ['福佑路', 'Fuyou Road', '福佑路', 'Foq Yoe Lu', 3],
  ['蓬莱路', 'Penglai Road', '蓬萊路', 'Bon Le Lu', 3],
  ['尚文路', 'Shangwen Road', '尚文路', 'Zaon Ven Lu', 3],
  ['学院路', 'Xueyuan Road', '敬業路', 'Cin Gniq Lu', 3],
  ['旧校场路', 'Jiujiaochang Road', '舊校場路', 'Djioe Yo Dzan Lu', 3],
  ['侯家路', 'Houjia Road', '侯家路', 'Roe Ka Lu', 3],
  ['松雪街', 'Songxue Street', '松雪街', 'Son Siq Ka', 4],
  ['昼锦路', 'Zhoujin Road', '晝錦路', 'Tzoe Cin Lu', 3],
  ['三牌楼路', 'Sanpailou Road', '三牌樓路', 'Sae Ba Loe Lu', 3],
  ['小桃园街', 'Xiaotaoyuan Street', '小桃園街', 'Sio Do Yeu Ka', 4],
  ['黄家路', 'Huangjia Road', '黃家路', 'Waon Ka Lu', 3],
  ['庄家街', 'Zhuangjia Street', '莊家街', 'Tzaon Ka Ka', 4],
  ['迎勋北路', 'Yingxun North Road', '迎勳北路', 'Gnin Xiun Poq Lu', 4],
  ['永泰街', 'Yongtai Street', '永泰街', 'Ion Tha Ka', 4],
  ['仪凤弄', 'Yifeng Lane', '儀鳳弄', 'Gnij Von Lon', 4],
  ['曹家街', 'Caojia Street', '曹家街', 'Dzo Ka Ka', 4],
  ['也是园弄', 'Yeshiyuan Lane', '也是園弄', 'Ra Zy Yeu Lon', 4],
  ['孔家弄', 'Kongjia Lane', '孔家弄', 'Khon Ka Lon', 4],
  ['白衣街', 'Baiyi Street', '白衣街', 'Baoq Ij Ka', 4],
  ['徽宁路', 'Huining Road', '徽寧路', 'Hue Gnin Lu', 3],
  ['刘家弄', 'Liujia Lane', '劉家弄', 'Lioe Ka Lon', 4],
  ['净土街', 'Jingtu Street', '淨土街', 'Dzin Thu Ka', 4],
  ['狮子街', 'Shizi Street', '獅子街', 'Sy Tzy Ka', 4],
].map(([modernNameZh, modernNameEn, historicalChinese, historicalName, priority]) => ({
  modernNameZh,
  modernNameEn,
  historicalChinese,
  historicalName,
  priority,
}))

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

  const [west, south, east, north] = oldCityBounds
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
oldCityRoads.forEach((road) => {
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
        id: `osm-old-city-road-${roadLine.id}-${index}`,
        featureGroupId: `road-old-city-${road.modernNameZh}`,
        kind: 'road',
        historicalName: road.historicalName,
        modernNameZh: road.modernNameZh,
        modernNameEn: road.modernNameEn,
        historicalChinese: road.historicalChinese,
        aliases: [...new Set([road.modernNameZh, road.historicalChinese])],
        jurisdiction: 'old-city',
        language: 'wuu',
        labelYear: 1927,
        sourceIds: ['vs-map-259-1927', 'sh-old-city-place-names', 'rime-wugniu-lopha'],
        category: '道路',
        priority: road.priority,
        curatedOldCity: true,
      },
    })
  })
})

const retainedFeatures = collection.features.filter((feature) => !feature.properties?.curatedOldCity)
const mergedSources = [
  ...sources.filter((source) => !oldCitySources.some((addition) => addition.id === source.id)),
  ...oldCitySources,
]

await Promise.all([
  fs.writeFile(dataPath, `${JSON.stringify({ ...collection, features: [...retainedFeatures, ...curatedFeatures] })}\n`, 'utf8'),
  fs.writeFile(sourcesPath, `${JSON.stringify(mergedSources, null, 2)}\n`, 'utf8'),
])

console.log(
  `Added ${new Set(curatedFeatures.map((feature) => feature.properties.featureGroupId)).size} Old City road groups ` +
    `from ${curatedFeatures.length} current OSM line segments.`,
)
if (missingNames.length) console.log(`No current named OSM way found for: ${missingNames.join('、')}`)
