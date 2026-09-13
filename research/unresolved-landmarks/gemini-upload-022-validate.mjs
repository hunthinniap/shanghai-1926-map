// Offline, read-only QA for this supplemental review. Prints JSON; writes nothing.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { utm51nToWgs84, wgs84ToGcj02 } from '../../scripts/lib/coordinate-systems.mjs'

const directory = path.dirname(fileURLToPath(import.meta.url))
const repository = path.resolve(directory, '../..')
const local = name => path.join(directory, `gemini-upload-022-${name}`)
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'))
const hash = content => createHash('sha256').update(content).digest('hex')
const digest = filename => hash(fs.readFileSync(filename))
const baseline = read(local('completion-baseline.json'))
const review = read(local('followup-review.json'))
const spatial = read(local('spatial-review-2026-09-12.json'))
const overpass = read(local('overpass-2026-09-12.json'))
const live = read(path.join(repository, 'scripts/data/virtual-shanghai-buildings-live.json'))
const mapPath = path.join(repository, 'public/data/historical-features.geojson')
const map = read(mapPath)
const overrides = read(path.join(repository, 'scripts/data/landmark-current-use-overrides.json'))
const fixed = read(path.join(directory, '022-input.json'))
const ids = review.records.map(r => r.IDBAT)
assert.equal(new Set(ids).size, 10)
assert.deepEqual([...ids].sort((a, b) => a - b), [403, 573, 574, 591, 1062, 1139, 1354, 1355, 1565, 1693])
assert.equal(fixed.length, 50)
assert.equal(fixed.filter(r => ids.includes(r.IDBAT)).length, 0)
assert.equal(overrides.length, 296)

for (const [filename, expected] of Object.entries(baseline.protectedFiles)) {
  assert.equal(digest(path.join(repository, filename)), expected, `Changed protected file: ${filename}`)
}
const protectedChangesFromHead = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', ...baseline.trackedProtected], { cwd: repository, encoding: 'utf8' }).trim()
assert.equal(protectedChangesFromHead, '', 'Map/source/application files differ from HEAD')
const archiveDirectory = path.join(repository, 'research/external/2026-09-11-current-020-d2077a11')
const manifest = read(path.join(archiveDirectory, 'manifest.json'))
for (const [filename, metadata] of Object.entries(manifest.files)) {
  assert.equal(digest(path.join(archiveDirectory, filename)), metadata.sha256, `Archive changed: ${filename}`)
}
const uploaded = review.scope.uploadedSource
assert.equal(digest(uploaded.path), uploaded.sha256)

// Independent winding-number containment and projected segment-distance check.
// This validates arithmetic, not whether OSM faithfully represents legal boundaries.
function metrics(point, geometry, isArea) {
  const radians = Math.PI / 180
  const xScale = 111195 * Math.cos(point.latitude * radians)
  const vertices = geometry.map(([x, y]) => [(x - point.longitude) * xScale, (y - point.latitude) * 111195])
  let winding = 0
  let distance = Infinity
  for (let i = 1; i < vertices.length; i++) {
    const [ax, ay] = vertices[i - 1]
    const [bx, by] = vertices[i]
    const cross = ax * by - bx * ay
    if (ay <= 0 && by > 0 && cross > 0) winding++
    if (ay > 0 && by <= 0 && cross < 0) winding--
    const dx = bx - ax, dy = by - ay
    const squared = dx * dx + dy * dy
    const t = squared ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / squared)) : 0
    distance = Math.min(distance, Math.hypot(ax + t * dx, ay + t * dy))
  }
  return { inside: isArea && winding !== 0, boundary: distance }
}
assert.equal(overpass.response.elements.length, 118)
const rawWays = new Map(overpass.response.elements.map(e => [e.id, e]))
let checkedWays = 0
const actualStatusCounts = {}, actualRecommendationCounts = {}
for (const record of review.records) {
  const original = live.records.find(r => r.id === record.IDBAT)
  assert.deepEqual(record.original, original, `Original fields differ: ${record.IDBAT}`)
  const feature = map.features.find(f => f.properties.sourceRecordIds?.includes(record.IDBAT))
  assert.equal(record.groupId, feature.properties.featureGroupId)
  assert.deepEqual(record.groupMemberIds, feature.properties.sourceRecordIds)
  for (const id of record.groupMemberIds) assert.ok(ids.includes(id), `Unchecked group member ${id}`)
  const projected = utm51nToWgs84(original.x, original.y)
  assert.deepEqual(record.spatial.wgs84, projected)
  assert.deepEqual(record.spatial.gcj02, wgs84ToGcj02(projected.longitude, projected.latitude))
  const sp = spatial.records.find(r => r.IDBAT === record.IDBAT)
  assert.deepEqual(sp.wgs84, projected)
  assert.equal(record.mapImportExecuted, false)
  actualStatusCounts[record.verificationStatus] = (actualStatusCounts[record.verificationStatus] || 0) + 1
  actualRecommendationCounts[record.mapWriteRecommendation] = (actualRecommendationCounts[record.mapWriteRecommendation] || 0) + 1
  for (const entry of sp.nearby) {
    const way = rawWays.get(entry.osmId)
    assert.ok(way && way.type === 'way')
    const geometry = way.geometry.map(p => [p.lon, p.lat])
    assert.deepEqual(entry.geometry, geometry, `Geometry changed: ${way.id}`)
    const closed = geometry.length >= 4 && JSON.stringify(geometry[0]) === JSON.stringify(geometry.at(-1))
    const tags = way.tags || {}
    const isArea = Boolean(closed && tags.area !== 'no' && (tags.area === 'yes' || tags.building || tags.landuse || tags.amenity || tags.leisure))
    assert.equal(entry.isArea, isArea)
    const check = metrics(projected, geometry, isArea)
    assert.equal(entry.pointInsideArea, check.inside, `Containment differs: ${record.IDBAT}/${way.id}`)
    assert.ok(Math.abs(entry.distanceToBoundaryMetres - check.boundary) < 0.011, `Boundary distance differs: ${record.IDBAT}/${way.id}`)
    assert.ok(Math.abs(entry.distanceMetres - (check.inside ? 0 : check.boundary)) < 0.011)
    checkedWays++
  }
  for (const selected of record.spatial.selectedWays) {
    const { geometry, ...expected } = sp.nearby.find(e => e.osmId === selected.osmId)
    assert.deepEqual(selected, expected)
  }
}
assert.deepEqual(actualStatusCounts, review.summary.verificationStatus)
assert.deepEqual(actualRecommendationCounts, review.summary.mapWriteRecommendation)
assert.deepEqual(review.records.filter(r => r.mapWriteRecommendation === 'yes').map(r => r.IDBAT).sort(), [1062, 1565])
const expectedRelations = [[1565, 545482989, true], [1062, 1153655815, true], [1693, 293400223, false], [403, 533589793, false]]
for (const [id, way, inside] of expectedRelations) {
  assert.equal(spatial.records.find(r => r.IDBAT === id).nearby.find(e => e.osmId === way).pointInsideArea, inside)
}
for (const id of [573, 574]) assert.equal(spatial.records.find(r => r.IDBAT === id).nearby.length, 0)
const artifacts = fs.readdirSync(directory).filter(n => n.startsWith('gemini-upload-022-') && n.endsWith('.json') && !n.endsWith('-validation.json'))
for (const filename of artifacts) read(path.join(directory, filename))
const roads = map.features.filter(f => f.properties.kind === 'road')
assert.equal(map.features.length, 5507)
assert.equal(roads.length, 3832)
execFileSync('git', ['diff', '--check'], { cwd: repository })
console.log(JSON.stringify({
  validatedAt: new Date().toISOString(), validationScope: 'offline arithmetic, data preservation and research consistency; not an independent audit of web-source truth',
  baselineHead: baseline.head, recordCount: ids.length, groups: new Set(review.records.map(r => r.groupId)).size,
  originalFieldsAndCoordinatesExact: true, allGroupMembersCovered: true, fixed022InputPreserved: true, fixed022Overlap: 0,
  summaryCountsMatch: true, mapImportExecuted: false, overrides: overrides.length,
  featureCount: map.features.length, roadCount: roads.length, mapSha256: digest(mapPath),
  protectedFilesPreserved: Object.keys(baseline.protectedFiles).length, protectedFilesMatchHead: true,
  externalArchiveManifestHashesMatch: true, uploadedSourceHashMatches: true,
  rawOverpassWays: rawWays.size, independentlyRecomputedPointWayPairs: checkedWays,
  keyContainmentChecks: expectedRelations, jsonParsed: artifacts.length,
  researchFileSha256: Object.fromEntries(artifacts.map(n => [n, digest(path.join(directory, n))])),
  gitDiffCheck: 'passed', applicationBuildRun: false, noGitCommitOrPush: true,
}, null, 2))
