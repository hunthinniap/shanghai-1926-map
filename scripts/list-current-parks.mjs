import { VectorTile } from '@mapbox/vector-tile'
import Protobuf from 'pbf'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const boundsArgument = process.argv.find((argument) => argument.startsWith('--bounds='))?.split('=')[1]
const BOUNDS = boundsArgument
  ? boundsArgument.split(',').map(Number)
  : [121.34, 31.11, 121.61, 31.35]
const ZOOM = 14
const SOURCE_LAYER = process.argv[2] ?? 'park'
const JURISDICTION = process.argv.find((argument) => argument.startsWith('--jurisdiction='))?.split('=')[1]
const INCLUDE_UNNAMED = process.argv.includes('--include-unnamed')
const NAME_FILTER = new Set(process.argv.slice(3).filter((argument) => !argument.startsWith('--')))
const PARK_CLASSES = new Set(['park', 'garden', 'nature_reserve', 'recreation_ground', 'playground'])
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function pointInRing([x, y], ring) {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [xi, yi] = ring[index]
    const [xj, yj] = ring[previous]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

async function jurisdictionPolygons() {
  if (!JURISDICTION) return []
  const data = JSON.parse(
    await fs.readFile(path.join(projectRoot, 'public', 'data', 'jurisdictions.geojson'), 'utf8'),
  )
  return data.features
    .filter((feature) => feature.properties?.jurisdiction === JURISDICTION)
    .flatMap((feature) => feature.geometry.type === 'Polygon'
      ? feature.geometry.coordinates
      : feature.geometry.coordinates.flat())
}

function tileCoordinates(lon, lat, zoom) {
  const scale = 2 ** zoom
  return [
    Math.floor(((lon + 180) / 360) * scale),
    Math.floor(
      ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * scale,
    ),
  ]
}

function displayName(properties) {
  return properties['name:zh-Hans']
    ?? properties['name:zh']
    ?? properties['name:nonlatin']
    ?? properties.name
    ?? properties['name:latin']
}

function representativeCoordinates(geometry) {
  if (geometry.type === 'Point') return geometry.coordinates
  const points = []
  const visit = (coordinates) => {
    if (typeof coordinates?.[0] === 'number') points.push(coordinates)
    else if (Array.isArray(coordinates)) coordinates.forEach(visit)
  }
  visit(geometry.coordinates)
  if (points.length === 0) return undefined
  const longitudes = points.map(([longitude]) => longitude)
  const latitudes = points.map(([, latitude]) => latitude)
  return [
    (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  ]
}

async function main() {
  const polygons = await jurisdictionPolygons()
  const tileJson = await fetch('https://tiles.openfreemap.org/planet').then((response) => response.json())
  const template = tileJson.tiles[0]
  const [west, south, east, north] = BOUNDS
  const [minX, maxY] = tileCoordinates(west, south, ZOOM)
  const [maxX, minY] = tileCoordinates(east, north, ZOOM)
  const requests = []

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      requests.push({ x, y })
    }
  }

  const names = new Map()
  for (let offset = 0; offset < requests.length; offset += 6) {
    const batch = requests.slice(offset, offset + 6)
    const tiles = await Promise.all(batch.map(async ({ x, y }) => {
      const url = template.replace('{z}', ZOOM).replace('{x}', x).replace('{y}', y)
      let response
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          response = await fetch(url)
          if (response.ok) break
        } catch (error) {
          if (attempt === 2) throw error
        }
      }
      if (!response?.ok) throw new Error(`Tile request failed: ${url}`)
      const buffer = await response.arrayBuffer()
      return { x, y, tile: new VectorTile(new Protobuf(new Uint8Array(buffer))) }
    }))

    for (const { x, y, tile } of tiles) {
      const layer = tile.layers[SOURCE_LAYER]
      if (!layer) continue
      for (let index = 0; index < layer.length; index += 1) {
        const feature = layer.feature(index)
        if (SOURCE_LAYER === 'poi'
          && !PARK_CLASSES.has(feature.properties.class)
          && !PARK_CLASSES.has(feature.properties.subclass)) continue
        const name = displayName(feature.properties)
        if ((!name && !INCLUDE_UNNAMED) || (NAME_FILTER.size > 0 && !NAME_FILTER.has(name))) continue
        const geometry = feature.toGeoJSON(x, y, ZOOM).geometry
        const point = representativeCoordinates(geometry)
        if (!point
          || point[0] < BOUNDS[0]
          || point[0] > BOUNDS[2]
          || point[1] < BOUNDS[1]
          || point[1] > BOUNDS[3]) continue
        if (polygons.length > 0) {
          if (geometry.type !== 'Point' || !polygons.some((ring) => pointInRing(geometry.coordinates, ring))) {
            continue
          }
        }
        const key = `${feature.id ?? ''}:${name ?? ''}`
        if (!names.has(key)) {
          names.set(key, { id: feature.id, name, properties: feature.properties, geometry })
        }
      }
    }
  }

  const results = [...names.values()]
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'zh-Hans'))
    .map(({ id, name, properties, geometry }) => ({
      id,
      name,
      nameZh: properties['name:zh'],
      nameLatin: properties['name:latin'],
      nameEn: properties['name:en'],
      class: properties.class,
      subclass: properties.subclass,
      geometryType: geometry.type,
      coordinates: representativeCoordinates(geometry),
      properties: INCLUDE_UNNAMED ? properties : undefined,
    }))

  console.log(JSON.stringify(results, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
