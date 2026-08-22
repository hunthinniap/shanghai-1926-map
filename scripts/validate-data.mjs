import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const curatedParksPath = path.join(projectRoot, 'public', 'data', 'curated-parks.geojson')
const sourcesPath = path.join(projectRoot, 'public', 'data', 'sources.json')
const jurisdictionsPath = path.join(projectRoot, 'public', 'data', 'jurisdictions.geojson')
const metroPath = path.join(projectRoot, 'public', 'data', 'metro-lines.geojson')
const metroStationsPath = path.join(projectRoot, 'public', 'data', 'metro-stations.geojson')
const stylePath = path.join(projectRoot, 'public', 'style', 'no-label-style.json')

const historicalCollection = JSON.parse(await fs.readFile(dataPath, 'utf8'))
const curatedParks = JSON.parse(await fs.readFile(curatedParksPath, 'utf8'))
const sources = JSON.parse(await fs.readFile(sourcesPath, 'utf8'))
const jurisdictions = JSON.parse(await fs.readFile(jurisdictionsPath, 'utf8'))
const collection = {
  type: 'FeatureCollection',
  features: [...historicalCollection.features, ...curatedParks.features],
}
const metro = JSON.parse(await fs.readFile(metroPath, 'utf8'))
const metroStations = JSON.parse(await fs.readFile(metroStationsPath, 'utf8'))
const style = JSON.parse(await fs.readFile(stylePath, 'utf8'))
const errors = []
const ids = new Set()
const sourceIds = new Set(sources.map((source) => source.id))

function polygonAreaHectares(ring) {
  const longitudeScale = Math.cos((31.224 * Math.PI) / 180)
  const toMetres = ([longitude, latitude]) => [longitude * 111_320 * longitudeScale, latitude * 111_320]
  let doubledArea = 0
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [startX, startY] = toMetres(ring[index])
    const [endX, endY] = toMetres(ring[index + 1])
    doubledArea += startX * endY - endX * startY
  }
  return Math.abs(doubledArea) / 2 / 10_000
}

for (const feature of collection.features ?? []) {
  const properties = feature.properties ?? {}
  for (const key of [
    'id',
    'featureGroupId',
    'kind',
    'historicalName',
    'modernNameZh',
    'jurisdiction',
    'language',
    'labelYear',
    'sourceIds',
    'category',
  ]) {
    if (properties[key] === undefined || properties[key] === '' || properties[key] === null) {
      errors.push(`${properties.id ?? 'unknown'} is missing ${key}`)
    }
  }
  if (!feature.geometry) errors.push(`${properties.id ?? 'unknown'} is missing geometry`)
  if (/[�?]/.test(properties.historicalName)) errors.push(`${properties.id} contains a damaged historical name`)
  if (properties.labelYear >= 1945) errors.push(`${properties.id} uses a post-1944 label year`)
  for (const sourceId of properties.sourceIds ?? []) {
    if (!sourceIds.has(sourceId)) errors.push(`${properties.id} references missing source ${sourceId}`)
  }
  if (ids.has(properties.id)) errors.push(`Duplicate feature id: ${properties.id}`)
  ids.add(properties.id)
}

const modernSymbolLayers = (style.layers ?? []).filter((layer) => layer.type === 'symbol')
if (modernSymbolLayers.length > 0) {
  errors.push(`Base style contains symbol layers: ${modernSymbolLayers.map((layer) => layer.id).join(', ')}`)
}

const hasVallon = collection.features.some(
  (feature) => feature.properties.historicalName === 'Route Vallon' && feature.properties.modernNameZh === '南昌路',
)
const hasDolfus = collection.features.some(
  (feature) => feature.properties.historicalName === 'Route Dolfus' && feature.properties.modernNameZh === '南昌路',
)
const hasFrenchPark = collection.features.some(
  (feature) =>
    feature.properties.historicalName === 'Parc français' &&
    feature.properties.modernNameZh === '复兴公园' &&
    feature.properties.jurisdiction === 'french-concession' &&
    feature.properties.language === 'fr',
)
const hasRavinelPark = collection.features.some(
  (feature) =>
    feature.properties.historicalName === 'Parc Ravinel' &&
    feature.properties.modernNameZh === '襄阳公园' &&
    feature.properties.historicalUse === 'park',
)
const hasGastonKahn = collection.features.some(
  (feature) =>
    feature.properties.historicalName === 'Route Gaston Kahn' && feature.properties.modernNameZh === '嘉善路',
)
if (!hasVallon) errors.push('Route Vallon acceptance feature is missing')
if (!hasDolfus) errors.push('Route Dolfus acceptance feature is missing')
if (!hasFrenchPark) errors.push('Parc français must map to 复兴公园 as a French label')
if (!hasRavinelPark) errors.push('Parc Ravinel must map to 襄阳公园')
if (!hasGastonKahn) errors.push('Route Gaston Kahn must map to 嘉善路')

const proposedLandmarks = collection.features.filter(
  (feature) => feature.properties?.kind === 'landmark' &&
    feature.properties?.namingBasis?.startsWith('proposed-'),
)
if (proposedLandmarks.length) {
  errors.push(`Found ${proposedLandmarks.length} proposed landmark features after proposal removal`)
}

for (const feature of curatedParks.features ?? []) {
  if (/[\u3400-\u9fff]/u.test(feature.properties?.historicalName ?? '')) {
    errors.push(`${feature.properties?.id ?? 'unknown park'} uses a non-Latin map label`)
  }
  if (feature.properties?.jurisdiction === 'french-concession') {
    if (feature.properties.language !== 'fr') {
      errors.push(`${feature.properties.id} is in the French Concession but is not marked as French`)
    }
    if (/\b(?:Park|Garden|Gardens|Playground|Road|Works)\b/i.test(feature.properties.historicalName)) {
      errors.push(`${feature.properties.id} uses an English map label inside the French Concession`)
    }
  }
}

for (const feature of historicalCollection.features ?? []) {
  const properties = feature.properties ?? {}
  if (properties.kind !== 'road' || properties.labelOnMap === false) continue
  if (/[\u3400-\u9fff]/u.test(properties.historicalName ?? '')) {
    errors.push(`${properties.id ?? 'unknown road'} uses a Han-script map label`)
  }
  if (properties.language === 'wuu') {
    if (!properties.historicalChinese) {
      errors.push(`${properties.id} has a Shanghainese map label without its historical Chinese name`)
    }
    if (!properties.sourceIds?.includes('rime-wugniu-lopha')) {
      errors.push(`${properties.id} has a Shanghainese map label without the Wugniu source`)
    }
  }
}

const oldCityBoundaries = jurisdictions.features.filter(
  (feature) => feature.properties?.jurisdiction === 'old-city',
)
for (const feature of jurisdictions.features ?? []) {
  const jurisdictionSourceId = feature.properties?.sourceId
  if (jurisdictionSourceId && !sourceIds.has(jurisdictionSourceId)) {
    errors.push(`${feature.properties?.id ?? 'unknown jurisdiction'} references missing source ${jurisdictionSourceId}`)
  }
}
if (oldCityBoundaries.length !== 1) {
  errors.push(`Expected one Old City boundary, found ${oldCityBoundaries.length}`)
} else {
  const oldCityBoundary = oldCityBoundaries[0]
  const ring = oldCityBoundary.geometry?.coordinates?.[0] ?? []
  const area = polygonAreaHectares(ring)
  if (oldCityBoundary.properties?.sourceId !== 'sh-civil-affairs-renmin-road') {
    errors.push('Old City boundary does not cite the Min Kuo Road–Chunghwa Road source')
  }
  if (area < 190 || area > 210) {
    errors.push(`Old City boundary area is ${area.toFixed(1)} ha; expected the approximately 200 ha walled city`)
  }
}
if (historicalCollection.features.filter((feature) => feature.properties?.jurisdiction === 'old-city').length < 1) {
  errors.push('No historical features are classified inside the Old City ring')
}
const curatedOldCityRoads = new Set(
  historicalCollection.features
    .filter((feature) => feature.properties?.kind === 'road' && feature.properties?.curatedOldCity)
    .map((feature) => feature.properties.featureGroupId),
)
if (curatedOldCityRoads.size < 35) {
  errors.push(`Only ${curatedOldCityRoads.size} curated Old City road groups are present`)
}
for (const requiredRoad of [
  ['人民路', 'Min Kueq Lu'],
  ['中华路', 'Tzon Wa Lu'],
  ['复兴东路', 'Dzo Ka Lu'],
  ['方浜中路', 'Faon Pan Lu'],
]) {
  const [modernNameZh, historicalName] = requiredRoad
  if (!historicalCollection.features.some(
    (feature) => feature.properties?.curatedOldCity &&
      feature.properties.modernNameZh === modernNameZh &&
      feature.properties.historicalName === historicalName,
  )) {
    errors.push(`${modernNameZh} is missing its Old City label ${historicalName}`)
  }
}

for (const [modernNameZh, historicalName] of [
  ['多伦路', 'Darroch Road'],
  ['山阴路', 'Scott Road'],
  ['东江湾路', 'Kiangwan Road'],
  ['利西路', 'Lucerne Road'],
  ['绥宁路', 'Monument Road'],
  ['东宝兴路', 'Paoshing Road'],
  ['云南北路', 'North Yunnan Road'],
  ['延安东路', 'Avenue Édouard VII / Edward VII Road'],
  ['盛泽路', 'Rue du Moulin'],
]) {
  const matchingFeatures = historicalCollection.features.filter(
    (feature) => feature.properties?.curatedVerifiedRoad &&
      feature.properties.modernNameZh === modernNameZh &&
      feature.properties.historicalName === historicalName,
  )
  if (!matchingFeatures.length) {
    errors.push(`${modernNameZh} is missing its verified road label ${historicalName}`)
  } else if (matchingFeatures.some((feature) => !feature.properties.id.startsWith('osm-verified-road-'))) {
    errors.push(`${historicalName} is not aligned to current OpenFreeMap road geometry`)
  }
}
if (historicalCollection.features.some(
  (feature) => feature.properties?.kind === 'road' &&
    /Avenue (?:Edouard|Edward|Édouard) VII/.test(feature.properties.historicalName ?? '') &&
    feature.properties.modernNameZh !== '延安东路',
)) {
  errors.push('Avenue Édouard VII still has an incorrect modern road mapping')
}
if (historicalCollection.features.some(
  (feature) => feature.properties?.kind === 'road' &&
    feature.properties.historicalName === 'Rue du Moulin' &&
    feature.properties.modernNameZh !== '盛泽路',
)) {
  errors.push('Rue du Moulin still has an incorrect modern road mapping')
}

for (const [modernNameZh, historicalName] of [
  ['中山东一路', 'Bund'],
  ['四川中路', 'Bridge Street'],
  ['江西中路', 'Church Street'],
  ['河南中路', 'Barrier Street'],
  ['山东中路', 'Temple Street'],
  ['山西南路', 'Louzar Road'],
  ['福建中路', 'Shackloo Road'],
  ['浙江中路', 'Soochow Road'],
  ['湖北路', 'Soochow Road'],
  ['广西北路', 'Sikh Road'],
  ['南苏州路', 'Bund on the Soochow Creek'],
  ['香港路', 'Gnaomen Road'],
  ['北京东路', 'Consulate Road'],
  ['宁波路', "Kirk's Avenue"],
  ['天津路', 'Fives Court Lane'],
  ['南京东路', 'Garden Lane / Park Lane / Maloo'],
  ['九江路', 'Rope Walk Road'],
  ['汉口路', 'Custom House Road'],
  ['福州路', 'Mission Road'],
  ['广东路', 'North Gate Street'],
]) {
  const matchingFeatures = historicalCollection.features.filter(
    (feature) => feature.properties?.curated1865Original &&
      feature.properties.modernNameZh === modernNameZh &&
      feature.properties.historicalName === historicalName &&
      feature.properties.sourceIds?.includes('wikipedia-1865-smc-road-list'),
  )
  if (!matchingFeatures.length) {
    errors.push(`${modernNameZh} is missing its documented pre-1865 name ${historicalName}`)
  }
}
for (const unchangedRoad of ['云南中路', '西藏中路', '厦门路', '牛庄路', '台湾路']) {
  if (historicalCollection.features.some(
    (feature) => feature.properties?.modernNameZh === unchangedRoad && feature.properties?.curated1865Original,
  )) {
    errors.push(`${unchangedRoad} was changed even though the reference has no original name`)
  }
}

const osmAlignedRoads = historicalCollection.features.filter(
  (feature) => feature.properties.kind === 'road' && feature.properties.id.startsWith('osm-'),
)
if (osmAlignedRoads.length < 1_000) {
  errors.push(`Only ${osmAlignedRoads.length} road features use OSM-aligned geometry`)
}
const nanchangRoads = historicalCollection.features.filter(
  (feature) => feature.properties.kind === 'road' && feature.properties.modernNameZh === '南昌路',
)
if (nanchangRoads.some((feature) => !feature.properties.id.startsWith('osm-'))) {
  errors.push('Nanchang Road historical segments are not aligned to OSM geometry')
}

const metroLines = new Set()
for (const feature of metro.features ?? []) {
  const { line, colour, osmRelationId, osmWayId } = feature.properties ?? {}
  if (!line || !/^#[0-9A-F]{6}$/i.test(colour ?? '') || !osmRelationId || !osmWayId) {
    errors.push(`Invalid metro segment: ${feature.id ?? 'unknown'}`)
  }
  if (feature.geometry?.type !== 'LineString' || feature.geometry.coordinates.length < 2) {
    errors.push(`Metro segment ${feature.id ?? 'unknown'} has invalid geometry`)
  }
  metroLines.add(String(line))
}
for (const requiredLine of ['1', '2', '3', '4', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '18']) {
  if (!metroLines.has(requiredLine)) errors.push(`Metro Line ${requiredLine} colour geometry is missing`)
}

for (const feature of metroStations.features ?? []) {
  if (!feature.properties?.name || feature.geometry?.type !== 'Point') {
    errors.push(`Invalid local metro station: ${feature.id ?? 'unknown'}`)
  }
}
if ((metroStations.features?.length ?? 0) < 250) errors.push('Local metro station coverage is incomplete')
if (!metroStations.features?.some((feature) => feature.properties?.name === '人民广场')) {
  errors.push('People’s Square metro acceptance station is missing')
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(
  `Validated ${historicalCollection.features.length} historical features, ${curatedParks.features.length} current-park correspondences, ${metro.features.length} coloured metro segments, ${metroStations.features.length} metro stations, and a label-free base style.`,
)
