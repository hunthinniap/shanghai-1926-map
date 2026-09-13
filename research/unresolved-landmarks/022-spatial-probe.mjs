// Fixed batch 022 research helper. Read-only: prints JSON; never edits map data.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { utm51nToWgs84, wgs84ToGcj02 } from '../../scripts/lib/coordinate-systems.mjs'

const directory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(directory, '../..')
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const input = read(path.join(directory, '022-input.json'))
const live = read(path.join(root, 'scripts/data/virtual-shanghai-buildings-live.json')).records
const features = read(path.join(root, 'public/data/historical-features.geojson')).features
const groups = new Map()
for (const raw of input) {
  const feature = features.find(f => f.properties.sourceRecordIds?.includes(raw.IDBAT))
  if (!feature) throw new Error(`No group for ${raw.IDBAT}`)
  groups.set(feature.properties.featureGroupId, feature)
}
const allIds = [...new Set([...groups.values()].flatMap(f => f.properties.sourceRecordIds))]
const members = allIds.map(id => {
  const original = live.find(r => r.id === id)
  if (!original) throw new Error(`No live record ${id}`)
  const wgs84 = utm51nToWgs84(original.x, original.y)
  const feature = features.find(f => f.properties.sourceRecordIds?.includes(id))
  return { IDBAT: id, isBatchInput: input.some(r => r.IDBAT === id), original,
    groupId: feature.properties.featureGroupId, groupMemberIds: feature.properties.sourceRecordIds,
    wgs84, gcj02: wgs84ToGcj02(wgs84.longitude, wgs84.latitude) }
})
const context = { batch: '022', inputFile: 'research/unresolved-landmarks/022-input.json',
  fixedInputCount: input.length, groupCount: groups.size, groupMemberCount: members.length,
  records: input.map(originalInput => ({ IDBAT: originalInput.IDBAT, originalInput,
    ...members.find(r => r.IDBAT === originalInput.IDBAT) })), groupMembers: members }

function measure(point, geometry, area) {
  let inside = false
  if (area) for (let i = 0, j = geometry.length - 1; i < geometry.length; j = i++) {
    const [xi, yi] = geometry[i], [xj, yj] = geometry[j]
    if ((yi > point.latitude) !== (yj > point.latitude) && point.longitude <
      (xj - xi) * (point.latitude - yi) / (yj - yi) + xi) inside = !inside
  }
  const vertices = geometry.map(([x, y]) => [(x - point.longitude) * 111195 * Math.cos(point.latitude * Math.PI / 180), (y - point.latitude) * 111195])
  let distance = Infinity
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]
    distance = Math.min(distance, Math.hypot(...a))
    if (!i) continue
    const b = vertices[i - 1], dx = b[0] - a[0], dy = b[1] - a[1]
    const square = dx * dx + dy * dy
    const t = square ? Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / square)) : 0
    distance = Math.min(distance, Math.hypot(a[0] + t * dx, a[1] + t * dy))
  }
  return { containment: area ? inside ? 'inside' : 'outside' : 'not-checked',
    pointInsideArea: inside, distanceMeters: inside ? 0 : Number(distance.toFixed(2)),
    distanceToBoundaryMeters: Number(distance.toFixed(2)) }
}

if (process.argv.includes('--batch')) {
  const index = Number(process.argv[process.argv.indexOf('--batch') + 1])
  const selected = members.slice(index * 4, (index + 1) * 4)
  if (!selected.length) throw new Error(`Invalid batch ${index}`)
  const statements = selected.flatMap(({ wgs84: p }) => [
    `way(around:160,${p.latitude},${p.longitude})[~"^(landuse|leisure|building|amenity)$"~"."];`,
    `node(around:120,${p.latitude},${p.longitude})[name];`,
  ])
  const query = `[out:json][timeout:25];(${statements.join('')});out geom;`
  const endpoint = 'https://overpass-api.de/api/interpreter'
  let response = null, lookupError = null
  const startedAt = new Date().toISOString()
  try {
    const raw = execFileSync('curl', ['--silent', '--show-error', '--fail', '--max-time', '40', '--get', '--data-urlencode', `data=${query}`, endpoint], { encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 })
    response = JSON.parse(raw)
    if (!Array.isArray(response.elements)) throw new Error('Missing elements')
    if (response.remark) lookupError = `Partial response: ${response.remark}`
  } catch (error) { lookupError = String(error.message) }
  console.log(JSON.stringify({ batch: '022', queryIndex: index, selectedIds: selected.map(r => r.IDBAT),
    startedAt, completedAt: new Date().toISOString(), endpoint, query,
    queryUrl: `${endpoint}?data=${encodeURIComponent(query)}`, comparisonCrs: 'EPSG:4326', lookupError, response }))
} else if (process.argv.includes('--review')) {
  const files = fs.readdirSync(directory).filter(f => /^022-overpass-\d{2}\.json$/u.test(f)).sort()
  const elements = new Map(), queries = files.map(file => ({ file, data: read(path.join(directory, file)) }))
  for (const { file, data } of queries) for (const e of data.response?.elements ?? []) {
    elements.set(`${e.type}/${e.id}`, { ...e, responseFile: `research/unresolved-landmarks/${file}`, queriedAt: data.completedAt })
  }
  const output = { batch: '022', reviewedAt: new Date().toISOString(),
    method: 'Original member points converted separately to EPSG:4326; named nodes and complete closed ways with area semantics. Distance is to geometry, not geocoded address. OSM is not cadastral or operating evidence; relations excluded.',
    totalQueries: queries.length, fullySuccessfulQueries: queries.filter(q => !q.data.lookupError).length,
    uniqueElements: elements.size,
    records: members.map(record => ({ ...record,
      ownQueryFiles: queries.filter(q => q.data.selectedIds.includes(record.IDBAT)).map(q => ({ file: q.file, lookupError: q.data.lookupError })),
      nearby: [...elements.values()].flatMap(e => {
        const geometry = e.type === 'node' ? [[e.lon, e.lat]] : e.geometry?.map(p => [p.lon, p.lat])
        if (!geometry?.length || geometry.some(p => p.some(n => !Number.isFinite(n)))) return []
        const tags = e.tags ?? {}
        const closed = e.type === 'way' && geometry.length >= 4 && JSON.stringify(geometry[0]) === JSON.stringify(geometry.at(-1))
        const isArea = Boolean(closed && tags.area !== 'no' && (tags.area === 'yes' || tags.building || tags.landuse || tags.amenity || tags.leisure))
        const spatial = measure(record.wgs84, geometry, isArea)
        if (spatial.distanceMeters > 160) return []
        return [{ osmType: e.type, osmId: e.id, name: tags.name || tags['name:zh'] || null, tags, isArea,
          ...spatial, geometry: process.argv.includes('--compact') ? undefined : geometry, sourceUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`,
          responseFile: e.responseFile, queriedAt: e.queriedAt }]
      }).sort((a, b) => a.distanceMeters - b.distanceMeters) })) }
  if (process.argv.includes('--part')) {
    const part = Number(process.argv[process.argv.indexOf('--part') + 1])
    output.records = output.records.slice(part * 4, (part + 1) * 4)
    output.part = part
  }
  console.log(JSON.stringify(output))
} else {
  console.log(JSON.stringify(context))
}
