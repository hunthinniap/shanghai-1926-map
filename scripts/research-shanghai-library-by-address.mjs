import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Converter } from 'opencc-js'
import { utm51nToWgs84 } from './lib/coordinate-systems.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const batch = process.argv[2]
if (!/^\d{3}$/u.test(batch ?? '')) {
  throw new Error('Usage: node scripts/research-shanghai-library-by-address.mjs NNN')
}

const inputPath = path.join(projectRoot, 'research', 'unresolved-landmarks', `${batch}-input.json`)
const outputPath = path.join(
  projectRoot,
  'research',
  'unresolved-landmarks',
  `${batch}-shanghai-library-address.json`,
)
const historicalPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const sourcePage = 'https://data.library.sh.cn/shnh/wkl/webapi/building/toAllBuilding'
const sourceScript = 'https://data.library.sh.cn/res/js/building/allBuilding.js'
const apiBase = 'https://data.library.sh.cn/shnh/gmwx/webapi/architecture/getArchitectures'
const detailBase = 'https://data.library.sh.cn/shnh/gmwx/webapi/architecture/getArchitectureDetail'
const simplify = Converter({ from: 'hk', to: 'cn' })

// Only use this table when the local historical-road layer has no exact match.
// Values are modern road names, not proposed historical labels.
const manualRoadMappings = new Map(Object.entries({
  'NANYANG': '南阳路',
  'CHAOFOONG ROAD': '高阳路',
  'WANPING NANLI': '宛平南路',
  'BAOTONG': '宝通路',
  'TIANTONG’AN': '天通庵路',
  'TIANTONG\'AN': '天通庵路',
  'WAIMA': '外马路',
  'PANJIAWAN': '潘家湾路',
  'JIANGWAN': '东江湾路',
  'EDWARD VII': '延安东路',
  'ROUTE AMIRAL COURBET': '古城路',
}))

function normalizeRoadName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[’‘`]/gu, "'")
    .replace(/[.,;:()[\]{}]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .toUpperCase()
}

function roadLookup(features) {
  const candidates = new Map()
  for (const feature of features) {
    const properties = feature.properties ?? {}
    if (properties.kind !== 'road' || !properties.modernNameZh) continue
    const names = [
      properties.historicalName,
      properties.historicalChinese,
      properties.modernNameEn,
      ...(properties.aliases ?? []),
    ]
    for (const name of names) {
      const normalized = normalizeRoadName(name)
      if (!normalized) continue
      if (!candidates.has(normalized)) candidates.set(normalized, new Set())
      candidates.get(normalized).add(properties.modernNameZh)
    }
  }
  return candidates
}

function parseHistoricalAddress(value) {
  const address = String(value ?? '').trim()
  const match = address.match(/^((?:\d+[A-Z]?(?:[-–/]\d+[A-Z]?)?)|\?+)\s+(.+)$/iu)
  if (!match) return { number: undefined, historicalRoad: address }
  return {
    number: /^\d/u.test(match[1]) ? match[1] : undefined,
    historicalRoad: match[2].trim(),
  }
}

function modernRoadCandidates(historicalRoad, roads) {
  const normalized = normalizeRoadName(historicalRoad)
  const exact = [...(roads.get(normalized) ?? [])]
  if (exact.length) return { modernRoads: exact, mappingMethod: 'local-road-layer-exact' }
  const manual = manualRoadMappings.get(normalized)
  if (manual) return { modernRoads: [manual], mappingMethod: 'reviewed-manual-fallback' }
  return { modernRoads: [], mappingMethod: 'unmapped' }
}

function point(record) {
  if (Math.abs(record.XC) <= 180 && Math.abs(record.YC) <= 90) {
    return { longitude: record.XC, latitude: record.YC }
  }
  return utm51nToWgs84(record.XC, record.YC)
}

function distanceMetres(from, to) {
  if (!Number.isFinite(to.longitude) || !Number.isFinite(to.latitude)) return undefined
  const radians = (value) => value * Math.PI / 180
  const latitudeDelta = radians(to.latitude - from.latitude)
  const longitudeDelta = radians(to.longitude - from.longitude)
  const meanLatitude = radians((from.latitude + to.latitude) / 2)
  return Math.round(6_371_000 * Math.sqrt(
    latitudeDelta ** 2 + (Math.cos(meanLatitude) * longitudeDelta) ** 2,
  ))
}

async function fetchWithTimeout(url, timeoutMilliseconds = 20_000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMilliseconds) })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response
}

async function fetchApiKey() {
  const script = await fetchWithTimeout(sourceScript).then((response) => response.text())
  const apiKey = script.match(/key\s*:\s*["']([a-f0-9]{32,})["']/iu)?.[1]
  if (!apiKey) throw new Error('Could not locate the public Shanghai Library API key')
  return apiKey
}

async function queryBuildings(query, apiKey) {
  const url = `${apiBase}?${new URLSearchParams({
    freetext: query,
    isRed: '3',
    key: apiKey,
    pageth: '1',
    iflimit: '1',
  })}`
  const result = await fetchWithTimeout(url).then((response) => response.json())
  return Array.isArray(result.data) ? result.data : []
}

async function fetchBuildingDetail(uri, apiKey) {
  const url = `${detailBase}?${new URLSearchParams({ uri, key: apiKey })}`
  let result = await fetchWithTimeout(url).then((response) => response.json())
  if (typeof result === 'string') result = JSON.parse(result)
  return result.data?.[0]
}

function stringValue(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function candidateRecord(candidate, origin, query) {
  const longitude = Number(candidate.long ?? candidate.longitude ?? candidate.lng)
  const latitude = Number(candidate.lat ?? candidate.latitude)
  const address = stringValue(candidate.address ?? candidate.addressS ?? candidate.addr)
  const normalizedQuery = simplify(query).replace(/\s+/gu, '')
  const normalizedAddress = simplify(address ?? '').replace(/\s+/gu, '')
  return {
    nameZh: stringValue(candidate.nameS ?? candidate.nameT ?? candidate.name),
    alternateName: stringValue(candidate.nameT),
    address,
    type: stringValue(candidate.type ?? candidate.architectureType),
    uri: stringValue(candidate.uri),
    placeUri: stringValue(candidate.placeUri),
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    distanceMetres: distanceMetres(origin, { longitude, latitude }),
    exactAddressTextMatch: normalizedAddress.includes(normalizedQuery),
  }
}

async function mapWithConcurrency(items, concurrency, callback) {
  const results = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await callback(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

const [records, historical, apiKey] = await Promise.all([
  fs.readFile(inputPath, 'utf8').then(JSON.parse),
  fs.readFile(historicalPath, 'utf8').then(JSON.parse),
  fetchApiKey(),
])
const roads = roadLookup(historical.features)

const researched = await mapWithConcurrency(records, 4, async (record) => {
  const parsed = parseHistoricalAddress(record.F_ADDRESS)
  const mapped = modernRoadCandidates(parsed.historicalRoad, roads)
  const origin = point(record)
  const queries = parsed.number
    ? mapped.modernRoads.map((road) => `${road}${parsed.number}号`)
    : []
  const queryResults = []
  for (const query of queries) {
    try {
      const candidates = await queryBuildings(query, apiKey)
      const detailedCandidates = await Promise.all(candidates.map(async (candidate) => {
        const normalized = candidateRecord(candidate, origin, query)
        if (!normalized.uri) return normalized
        try {
          return {
            ...normalized,
            libraryDetail: await fetchBuildingDetail(normalized.uri, apiKey),
          }
        } catch (error) {
          return { ...normalized, detailError: error.message }
        }
      }))
      queryResults.push({
        query,
        candidates: detailedCandidates,
      })
    } catch (error) {
      queryResults.push({ query, error: error.message, candidates: [] })
    }
  }
  return {
    IDBAT: record.IDBAT,
    historicalName: record.NAME,
    historicalAddress: record.F_ADDRESS,
    historicalRoad: parsed.historicalRoad,
    historicalNumber: parsed.number,
    modernRoadCandidates: mapped.modernRoads,
    roadMappingMethod: mapped.mappingMethod,
    coordinates: { wgs84: origin },
    queries: queryResults,
  }
})

const output = {
  batch,
  generatedAt: new Date().toISOString(),
  source: {
    title: '上海图书馆“上海年华”：上海市优秀历史建筑',
    url: sourcePage,
  },
  methodology: {
    note: 'Address results are research candidates only. A matching road/number or nearby point does not prove historical-building continuity.',
    canonicalCoordinates: 'WGS84 (EPSG:4326)',
  },
  records: researched,
}

await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
const queryCount = researched.reduce((sum, record) => sum + record.queries.length, 0)
const candidateCount = researched.reduce(
  (sum, record) => sum + record.queries.reduce((subtotal, query) => subtotal + query.candidates.length, 0),
  0,
)
console.log(`Queried ${queryCount} modern addresses for ${records.length} records.`)
console.log(`Saved ${candidateCount} candidates to ${path.relative(projectRoot, outputPath)}.`)
