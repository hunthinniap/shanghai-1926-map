import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const previousBuildDataPath = path.join(projectRoot, 'dist', 'data', 'historical-features.geojson')
const overpassUrl = process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter'
const proximityMetres = 120
const metresPerDegree = 111_320
const longitudeScale = Math.cos((31.23 * Math.PI) / 180)

function linesFromGeometry(geometry) {
  if (geometry.type === 'LineString') return [geometry.coordinates]
  if (geometry.type === 'MultiLineString') return geometry.coordinates
  return []
}

function toMetric([longitude, latitude]) {
  return [longitude * metresPerDegree * longitudeScale, latitude * metresPerDegree]
}

function squaredDistanceToSegment(point, start, end) {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  if (dx === 0 && dy === 0) return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2
  const ratio = Math.max(
    0,
    Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)),
  )
  const nearestX = start[0] + ratio * dx
  const nearestY = start[1] + ratio * dy
  return (point[0] - nearestX) ** 2 + (point[1] - nearestY) ** 2
}

function historicalSegments(features) {
  return features.flatMap((feature) =>
    linesFromGeometry(feature.geometry).flatMap((line) =>
      line.slice(1).map((coordinate, index) => [toMetric(line[index]), toMetric(coordinate)]),
    ),
  )
}

function assignWayToHistoricalGroups(coordinates, groups) {
  const chunks = []
  let currentCoordinates = []
  let currentGroup
  const maximumSquaredDistance = proximityMetres ** 2

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index]
    const end = coordinates[index + 1]
    const midpoint = toMetric([(start[0] + end[0]) / 2, (start[1] + end[1]) / 2])
    let nearestGroup
    let nearestSquaredDistance = Number.POSITIVE_INFINITY

    groups.forEach((group) => {
      group.segments.forEach(([historicalStart, historicalEnd]) => {
        const distance = squaredDistanceToSegment(midpoint, historicalStart, historicalEnd)
        if (distance < nearestSquaredDistance) {
          nearestSquaredDistance = distance
          nearestGroup = group
        }
      })
    })
    if (nearestSquaredDistance > maximumSquaredDistance) nearestGroup = undefined

    if (nearestGroup?.featureGroupId === currentGroup?.featureGroupId) {
      currentCoordinates.push(end)
      continue
    }

    if (currentGroup && currentCoordinates.length > 1) {
      chunks.push({ group: currentGroup, coordinates: currentCoordinates })
    }
    currentGroup = nearestGroup
    currentCoordinates = nearestGroup ? [start, end] : []
  }
  if (currentGroup && currentCoordinates.length > 1) {
    chunks.push({ group: currentGroup, coordinates: currentCoordinates })
  }
  return chunks
}

function roadNames(tags = {}) {
  return [...new Set([tags.name, tags['name:zh'], tags.official_name].filter(Boolean).map((name) => name.trim()))]
}

async function loadPreviousAlignedWays(requestedNames) {
  try {
    const previous = JSON.parse(await fs.readFile(previousBuildDataPath, 'utf8'))
    const names = new Set(requestedNames)
    return (previous.features ?? []).flatMap((feature, index) => {
      const properties = feature.properties ?? {}
      if (properties.kind !== 'road' || !String(properties.id ?? '').startsWith('osm-') ||
        !names.has(properties.modernNameZh)) return []
      return linesFromGeometry(feature.geometry).map((coordinates, lineIndex) => ({
        type: 'way',
        id: `previous-${index}-${lineIndex}`,
        tags: { highway: 'road', name: properties.modernNameZh },
        geometry: coordinates.map(([lon, lat]) => ({ lon, lat })),
      }))
    })
  } catch (error) {
    if (error?.code !== 'ENOENT') console.warn(`Ignoring previous road geometry: ${error.message}`)
    return []
  }
}

async function downloadNamedRoads(names) {
  const batches = []
  for (let index = 0; index < names.length; index += 10) batches.push(names.slice(index, index + 10))
  const waysById = new Map()
  for (const [index, batch] of batches.entries()) {
    const selectors = batch
      .map((name) => `way["highway"]["name"=${JSON.stringify(name)}](31.11,121.34,31.35,121.61);`)
      .join('')
    const query = `[out:json][timeout:120];(${selectors});out tags geom;`
    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'Shanghai1928Map/1.0 (local historical map preprocessing)',
      },
      body: new URLSearchParams({ data: query }),
    })
    if (!response.ok) {
      throw new Error(`Overpass request ${index + 1}/${batches.length} failed: ${response.status} ${response.statusText}`)
    }
    const payload = await response.json()
    payload.elements.forEach((element) => waysById.set(element.id, element))
  }
  return [...waysById.values()].filter(
    (element) => element.type === 'way' && element.geometry?.length > 1 && element.tags?.highway,
  )
}

const collection = JSON.parse(await fs.readFile(dataPath, 'utf8'))
const roadGroups = new Map()

collection.features.forEach((feature) => {
  if (feature.properties.kind !== 'road') return
  const modernName = feature.properties.modernNameZh.trim()
  if (!/[\u3400-\u9fff]/.test(modernName)) return
  const featureGroupId = feature.properties.featureGroupId
  const group = roadGroups.get(featureGroupId) ?? {
    featureGroupId,
    modernName,
    features: [],
  }
  group.features.push(feature)
  roadGroups.set(featureGroupId, group)
})

const groupsByModernName = new Map()
roadGroups.forEach((group) => {
  const groups = groupsByModernName.get(group.modernName) ?? []
  groups.push({ ...group, segments: historicalSegments(group.features) })
  groupsByModernName.set(group.modernName, groups)
})
const requestedNames = process.env.OSM_ROAD_NAMES
  ?.split(',')
  .map((name) => name.trim())
  .filter(Boolean)
const namesToAlign = requestedNames?.length ? requestedNames : [...groupsByModernName.keys()]
const previousWays = await loadPreviousAlignedWays(namesToAlign)
const previousNames = new Set(previousWays.flatMap((way) => roadNames(way.tags)))
const missingNames = namesToAlign.filter((name) => !previousNames.has(name))
let downloadedWays = []
if (missingNames.length && process.env.OSM_OFFLINE !== '1') {
  try {
    downloadedWays = await downloadNamedRoads(missingNames)
  } catch (error) {
    if (!previousWays.length) throw error
    console.warn(`${error.message}; continuing with ${previousNames.size} names cached in the previous production build.`)
  }
}
const osmWays = [...previousWays, ...downloadedWays]
const waysByName = new Map()

osmWays.forEach((way) => {
  roadNames(way.tags).forEach((name) => {
    const ways = waysByName.get(name) ?? []
    ways.push(way)
    waysByName.set(name, ways)
  })
})

const replacements = new Map()
for (const [modernName, groups] of groupsByModernName) {
  const ways = waysByName.get(modernName)
  if (!ways?.length) continue
  const chunkCounts = new Map()
  ways.forEach((way) => {
    const coordinates = way.geometry.map(({ lon, lat }) => [lon, lat])
    assignWayToHistoricalGroups(coordinates, groups).forEach(({ group, coordinates: chunk }) => {
      const representative = group.features[0]
      const chunkIndex = chunkCounts.get(group.featureGroupId) ?? 0
      chunkCounts.set(group.featureGroupId, chunkIndex + 1)
      const alignedFeatures = replacements.get(group.featureGroupId) ?? []
      alignedFeatures.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: chunk },
        properties: {
          ...representative.properties,
          id: `osm-${group.featureGroupId}-${way.id}-${chunkIndex}`,
        },
      })
      replacements.set(group.featureGroupId, alignedFeatures)
    })
  })
}

const retainedFeatures = collection.features.filter(
  (feature) =>
    feature.properties.kind !== 'road' || !replacements.has(feature.properties.featureGroupId),
)
const alignedFeatures = [...replacements.values()].flat()
const output = { ...collection, features: [...retainedFeatures, ...alignedFeatures] }

await fs.writeFile(dataPath, `${JSON.stringify(output)}\n`, 'utf8')
console.log(
  `Aligned ${replacements.size} historical road segments across ` +
    `${new Set(alignedFeatures.map((feature) => feature.properties.modernNameZh)).size} modern road names ` +
    `to ${alignedFeatures.length} clipped OSM line features; ${roadGroups.size - replacements.size} groups retained historical geometry.`,
)
