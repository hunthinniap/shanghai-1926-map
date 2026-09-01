import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { utm51nToWgs84 } from './lib/coordinate-systems.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const chunk = process.argv[2] ?? '001'
if (!/^\d{3}$/u.test(chunk)) throw new Error(`Invalid chunk number: ${chunk}`)

const outputDirectory = path.join(projectRoot, 'research', 'unresolved-landmarks')
const stableInputPath = path.join(outputDirectory, `${chunk}-input.json`)
const liveInputPath = path.join(projectRoot, 'public', 'data', 'unresolved-landmarks', `${chunk}.json`)
const outputPath = path.join(outputDirectory, `${chunk}-osm-nearby.json`)
let records
try {
  records = JSON.parse(await fs.readFile(stableInputPath, 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  records = JSON.parse(await fs.readFile(liveInputPath, 'utf8'))
}
const prepared = records.map((record) => ({
  record,
  wgs84: utm51nToWgs84(record.XC, record.YC),
}))

const overpassEndpoints = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

async function fetchNearbyElements(batch) {
  const query = `[out:json][timeout:45];(${batch.map(({ wgs84 }) =>
    `nwr(around:100,${wgs84.latitude},${wgs84.longitude})[name];`).join('')});out center tags;`
  const failures = []
  for (const endpoint of overpassEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'Shanghai-1928-map historical-site research',
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(60_000),
      })
      if (!response.ok) {
        failures.push(`${endpoint}: HTTP ${response.status}`)
        continue
      }
      return (await response.json()).elements ?? []
    } catch (error) {
      failures.push(`${endpoint}: ${error.message}`)
    }
  }
  throw new Error(`Overpass batch failed (${failures.join('; ')})`)
}

const elements = []
for (let index = 0; index < prepared.length; index += 10) {
  elements.push(...await fetchNearbyElements(prepared.slice(index, index + 10)))
}
const uniqueElements = [...new Map(elements.map((element) => [`${element.type}:${element.id}`, element])).values()]

function distanceMetres(left, right) {
  const radians = (value) => value * Math.PI / 180
  const latitudeDelta = radians(right.latitude - left.latitude)
  const longitudeDelta = radians(right.longitude - left.longitude)
  const meanLatitude = radians((left.latitude + right.latitude) / 2)
  return 6_371_000 * Math.sqrt(
    latitudeDelta ** 2 + (Math.cos(meanLatitude) * longitudeDelta) ** 2,
  )
}

function elementPoint(element) {
  const latitude = element.lat ?? element.center?.lat
  const longitude = element.lon ?? element.center?.lon
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : undefined
}

const output = prepared.map(({ record, wgs84 }) => ({
  IDBAT: record.IDBAT,
  wgs84,
  nearby: uniqueElements
    .map((element) => {
      const point = elementPoint(element)
      if (!point) return undefined
      const distance = distanceMetres(wgs84, point)
      if (distance > 120) return undefined
      return {
        osmType: element.type,
        osmId: element.id,
        name: element.tags?.name ?? null,
        nameEn: element.tags?.['name:en'] ?? null,
        address: [
          element.tags?.['addr:street'],
          element.tags?.['addr:housenumber'],
        ].filter(Boolean).join('') || null,
        category: element.tags?.amenity ?? element.tags?.historic ?? element.tags?.tourism ??
          element.tags?.shop ?? element.tags?.office ?? element.tags?.building ?? null,
        distanceMetres: Math.round(distance),
        coordinates: point,
        sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.distanceMetres - right.distanceMetres)
    .slice(0, 12),
}))

await fs.mkdir(outputDirectory, { recursive: true })
await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(`Saved nearby OpenStreetMap clues for ${output.length} records to ${path.relative(projectRoot, outputPath)}.`)
