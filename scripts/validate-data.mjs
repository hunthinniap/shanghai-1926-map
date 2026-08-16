import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const metroPath = path.join(projectRoot, 'public', 'data', 'metro-lines.geojson')
const metroStationsPath = path.join(projectRoot, 'public', 'data', 'metro-stations.geojson')
const stylePath = path.join(projectRoot, 'public', 'style', 'no-label-style.json')

const collection = JSON.parse(await fs.readFile(dataPath, 'utf8'))
const metro = JSON.parse(await fs.readFile(metroPath, 'utf8'))
const metroStations = JSON.parse(await fs.readFile(metroStationsPath, 'utf8'))
const style = JSON.parse(await fs.readFile(stylePath, 'utf8'))
const errors = []
const ids = new Set()

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
    feature.properties.historicalName === 'French Park' &&
    feature.properties.modernNameZh === '复兴公园' &&
    feature.properties.jurisdiction === 'french-concession',
)
const hasGastonKahn = collection.features.some(
  (feature) =>
    feature.properties.historicalName === 'Route Gaston Kahn' && feature.properties.modernNameZh === '嘉善路',
)
if (!hasVallon) errors.push('Route Vallon acceptance feature is missing')
if (!hasDolfus) errors.push('Route Dolfus acceptance feature is missing')
if (!hasFrenchPark) errors.push('French Park acceptance feature is missing')
if (!hasGastonKahn) errors.push('Route Gaston Kahn must map to 嘉善路')

const osmAlignedRoads = collection.features.filter(
  (feature) => feature.properties.kind === 'road' && feature.properties.id.startsWith('osm-'),
)
if (osmAlignedRoads.length < 1_000) {
  errors.push(`Only ${osmAlignedRoads.length} road features use OSM-aligned geometry`)
}
const nanchangRoads = collection.features.filter(
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
  `Validated ${collection.features.length} historical features, ${metro.features.length} coloured metro segments, ${metroStations.features.length} metro stations, and a label-free base style.`,
)
