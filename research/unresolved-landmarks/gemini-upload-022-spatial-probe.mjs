// Read-only, reproducible spatial support for the separately uploaded Gemini report.
// Prints JSON; does not change the map, fixed batch inputs, or historical geometry.
import fs from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import { utm51nToWgs84, wgs84ToGcj02 } from '../../scripts/lib/coordinate-systems.mjs'

const live = JSON.parse(await fs.readFile(new URL('../../scripts/data/virtual-shanghai-buildings-live.json', import.meta.url)))
const map = JSON.parse(await fs.readFile(new URL('../../public/data/historical-features.geojson', import.meta.url)))
const ids = [573, 574, 591, 1062, 1139, 1355, 1354, 1565, 1693, 403]
const records = ids.map(id => {
  const original = live.records.find(record => record.id === id)
  if (!original) throw new Error(`Missing original record ${id}`)
  const feature = map.features.find(feature => feature.properties.sourceRecordIds?.includes(id))
  return { IDBAT: id, original, groupId: feature?.properties.featureGroupId,
    groupMembers: feature?.properties.sourceRecordIds,
    wgs84: utm51nToWgs84(original.x, original.y) }
})

function pointInside(point, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if ((yi > point[1]) !== (yj > point[1]) &&
      point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function distanceToGeometry(point, geometry, isArea) {
  if (isArea && pointInside(point, geometry)) return { distanceMetres: 0, pointInsideArea: true }
  const sx = 111195 * Math.cos(point[1] * Math.PI / 180)
  const sy = 111195
  const projected = geometry.map(([x, y]) => [(x - point[0]) * sx, (y - point[1]) * sy])
  let min = Infinity
  for (let i = 0; i < projected.length; i++) {
    const a = projected[i]
    min = Math.min(min, Math.hypot(...a))
    if (!i) continue
    const b = projected[i - 1]
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const length2 = dx * dx + dy * dy
    const t = length2 ? Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / length2)) : 0
    min = Math.min(min, Math.hypot(a[0] + t * dx, a[1] + t * dy))
  }
  return { distanceMetres: Math.round(min * 100) / 100, pointInsideArea: false }
}

async function probe(record) {
  const { longitude, latitude } = record.wgs84
  const bbox = [longitude - .001, latitude - .0008, longitude + .001, latitude + .0008]
  const queryUrl = `https://www.openstreetmap.org/api/0.6/map?bbox=${bbox.map(x => x.toFixed(7)).join(',')}`
  const result = { ...record, gcj02: wgs84ToGcj02(longitude, latitude),
    queriedAt: new Date().toISOString(), queryUrl, comparisonCrs: 'EPSG:4326',
    method: 'Fresh OSM map API. Named nodes and ways; unnamed building/amenity areas within 30 m included. Distances to geometry; area containment only for complete closed ways with area semantics. Relations excluded. Spatial compatibility is not historical identity or proof of current operation.',
    lookupError: null, nearby: [] }
  try {
    const response = await fetch(queryUrl, { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'Shanghai historical-site research' } })
    result.httpStatus = response.status
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const document = new JSDOM(await response.text(), { contentType: 'text/xml' }).window.document
    const nodes = new Map([...document.querySelectorAll('osm > node')].map(n => [n.getAttribute('id'), [+n.getAttribute('lon'), +n.getAttribute('lat')]]))
    for (const element of document.querySelectorAll('osm > node, osm > way')) {
      const type = element.tagName
      const tags = Object.fromEntries([...element.querySelectorAll('tag')].map(t => [t.getAttribute('k'), t.getAttribute('v')]))
      if (!tags.name && !tags['name:zh'] && !tags.building && !tags.amenity) continue
      const references = [...element.querySelectorAll('nd')].map(n => n.getAttribute('ref'))
      const geometry = type === 'node' ? [nodes.get(element.getAttribute('id'))] : references.map(ref => nodes.get(ref))
      if (!geometry.length || geometry.some(p => !p)) continue
      const closed = type === 'way' && references.length >= 4 && references[0] === references.at(-1)
      const isArea = closed && tags.area !== 'no' && Boolean(tags.area === 'yes' || tags.building || tags.landuse || tags.amenity || tags.leisure)
      const spatial = distanceToGeometry([longitude, latitude], geometry, isArea)
      if (spatial.distanceMetres > 160 || (!tags.name && !tags['name:zh'] && spatial.distanceMetres > 30)) continue
      const osmId = Number(element.getAttribute('id'))
      result.nearby.push({ osmType: type, osmId, name: tags.name || tags['name:zh'] || null,
        sourceUrl: `https://www.openstreetmap.org/${type}/${osmId}`,
        osmTimestamp: element.getAttribute('timestamp'), osmVersion: Number(element.getAttribute('version')),
        tags, isArea, ...spatial, geometry })
    }
    result.nearby.sort((a, b) => a.distanceMetres - b.distanceMetres)
  } catch (error) { result.lookupError = error.message }
  return result
}

if (process.argv.includes('--cache')) {
  const directory = new URL('./', import.meta.url)
  const elements = new Map()
  const files = (await fs.readdir(directory)).filter(name => /osm.*\.json$/u.test(name) && !name.startsWith('gemini')).sort()
  for (const filename of files) {
    const data = JSON.parse(await fs.readFile(new URL(filename, directory)))
    if (!Array.isArray(data)) continue
    for (const record of data) for (const element of record.nearby ?? []) {
      const tags = element.tags ?? {}
      if (!element.geometry || tags.highway || tags.railway || tags.waterway) continue
      const provenance = { cacheFile: `research/unresolved-landmarks/${filename}`, cacheRecordId: record.IDBAT,
        originalSourceFile: element.cachedSourceFile ?? `research/unresolved-landmarks/${filename}`,
        originalQueryUrl: element.cachedQueryUrl ?? record.queryUrl ?? null,
        originallyQueriedAt: element.cachedQueriedAt ?? record.queriedAt ?? null }
      const key = `${element.osmType}/${element.osmId}`
      const existing = elements.get(key)
      if (!existing || String(provenance.originallyQueriedAt) >= String(existing.provenance.originallyQueriedAt)) {
        elements.set(key, { element, provenance })
      }
    }
  }
  const output = records.map(record => ({ IDBAT: record.IDBAT, wgs84: record.wgs84,
    nearby: [...elements.values()].flatMap(({ element, provenance }) => {
      const geometry = element.geometry, tags = element.tags ?? {}
      const closed = geometry.length >= 4 && JSON.stringify(geometry[0]) === JSON.stringify(geometry.at(-1))
      const isArea = closed && tags.area !== 'no' && Boolean(tags.area === 'yes' || tags.building || tags.landuse || tags.amenity || tags.leisure)
      const spatial = distanceToGeometry([record.wgs84.longitude, record.wgs84.latitude], geometry, isArea)
      if (spatial.distanceMetres > 180) return []
      return [{ osmType: element.osmType, osmId: element.osmId, name: element.name, tags,
        sourceUrl: element.sourceUrl, provenance, isArea, ...spatial, geometry }]
    }).sort((a, b) => a.distanceMetres - b.distanceMetres) }))
  console.log(JSON.stringify({ method: 'Existing cached OSM geometry only; independently recomputed distances and area containment for each original point. No fresh lookup and no proof of current operation or historical parcel boundaries. Roads, railways and waterways excluded.', records: output }, null, 2))
} else {
  const output = []
  for (let i = 0; i < records.length; i += 3) output.push(...await Promise.all(records.slice(i, i + 3).map(probe)))
  console.log(JSON.stringify({ scope: 'Gemini upload labelled 022; not the repository fixed batch 022', records: output }, null, 2))
}
