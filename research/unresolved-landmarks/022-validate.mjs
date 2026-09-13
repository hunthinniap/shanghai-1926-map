// Read-only, offline consistency and spatial-arithmetic QA for the in-progress batch.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { utm51nToWgs84, wgs84ToGcj02 } from '../../scripts/lib/coordinate-systems.mjs'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '../..')
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'))
const local = name => read(path.join(dir, `022-${name}.json`))
const digest = filename => createHash('sha256').update(fs.readFileSync(filename)).digest('hex')
const baseline = local('baseline')
const input = local('input'), results = local('results'), evidence = local('evidence')
const context = local('context'), spatial = local('osm-nearby'), log = local('root-search-log')
const continuation = local('continuation-2026-09-13-search-log')
const round2 = local('continuation-2026-09-13-r2-search-log')
const round2Baseline = local('continuation-2026-09-13-r2-record-baseline')
const round2Findings = local('continuation-2026-09-13-r2-findings')
const round2Sources = local('continuation-2026-09-13-r2-sources')
const round2Attachments = local('continuation-2026-09-13-r2-attachments')
const recordBaseline = local('continuation-2026-09-13-record-baseline')
const continuationBaseline = local('continuation-baseline-2026-09-13')
const objectDigest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
assert.deepEqual(continuation.scopeIds, [911, 1117, 744, 238, 73, 1247])
assert.equal(evidence.lastContinuedAt, '2026-09-13')
assert.deepEqual(evidence.continuations[0].scopeIds, continuation.scopeIds)
assert.deepEqual(recordBaseline.allowedChangedIds, continuation.scopeIds)
assert.deepEqual(round2.scopeIds, [24, 837, 1066, 856, 45, 161])
assert.deepEqual(round2Baseline.allowedChangedIds, round2.scopeIds)
assert.deepEqual(evidence.continuations[1].scopeIds, round2.scopeIds)
// Check each round against its immediate predecessor; do not weaken r1's 44-record guarantee.
for (const result of results) {
  const id = result.IDBAT
  if (!continuation.scopeIds.includes(id)) {
    assert.equal(round2Baseline.results[id], recordBaseline.results[id], `r1 result preservation: ${id}`)
    assert.equal(round2Baseline.evidence[id], recordBaseline.evidence[id], `r1 evidence preservation: ${id}`)
  }
  if (!round2.scopeIds.includes(id)) {
    assert.equal(objectDigest(result), round2Baseline.results[id], `r2 result preservation: ${id}`)
    assert.equal(objectDigest(evidence.records.find(r => r.IDBAT === id)), round2Baseline.evidence[id], `r2 evidence preservation: ${id}`)
  }
}
const revisedFiles = new Set(['022-results.json', '022-evidence.json', '022-validate.mjs', '022-validation.json', '022-review.md'])
for (const [file, expected] of Object.entries(continuationBaseline.files)) {
  if (!revisedFiles.has(path.basename(file))) assert.equal(digest(path.join(root, file)), expected, `Continuation changed historical artifact: ${file}`)
}
for (const [file, expected] of Object.entries(round2Baseline.files)) {
  if (!revisedFiles.has(path.basename(file))) assert.equal(digest(path.join(root, file)), expected, `r2 changed prior artifact: ${file}`)
}
assert.equal(digest(path.join(dir, '022-review-2026-09-13-r1.md')), round2Baseline.files['research/unresolved-landmarks/022-review.md'])
assert.equal(digest(path.join(dir, '022-validation-2026-09-13-r1.json')), round2Baseline.files['research/unresolved-landmarks/022-validation.json'])
const live = read(path.join(root, 'scripts/data/virtual-shanghai-buildings-live.json')).records
const map = read(path.join(root, 'public/data/historical-features.geojson'))
const overrides = read(path.join(root, 'scripts/data/landmark-current-use-overrides.json'))
assert.equal(input.length, 50)
const ids = input.map(r => r.IDBAT)
assert.equal(new Set(ids).size, 50)
assert.deepEqual(results.map(r => r.IDBAT), ids)
assert.deepEqual(evidence.inputIds, ids)
assert.deepEqual(evidence.records.map(r => r.IDBAT), ids)
assert.equal(evidence.inputSha256, digest(path.join(dir, '022-input.json')))
assert.equal(evidence.recordCount, 50)
assert.equal(evidence.batchStatus, 'in-progress')
assert.equal(context.groupCount, 49)
assert.equal(context.groupMembers.length, 64)
assert.equal(spatial.records.length, 64)
assert.equal(new Set(context.groupMembers.map(r => r.groupId)).size, 49)
assert.deepEqual(spatial.records.map(r => r.IDBAT), context.groupMembers.map(r => r.IDBAT))

for (const [file, expected] of Object.entries(baseline.files)) {
  assert.equal(digest(path.join(root, file)), expected, `Changed baseline file: ${file}`)
}
assert.equal(overrides.length, 296)
assert.equal(map.features.length, 5507)
assert.equal(map.features.filter(f => f.properties.kind === 'road').length, 3832)
const elements = new Map()
const queries = []
for (let index = 0; index < 16; index++) {
  const q = local(`overpass-${String(index).padStart(2, '0')}`)
  assert.equal(q.lookupError, null)
  assert.equal(q.comparisonCrs, 'EPSG:4326')
  assert.equal(q.selectedIds.length, 4)
  queries.push(q)
  for (const e of q.response.elements) elements.set(`${e.type}/${e.id}`, e)
}
assert.equal(elements.size, 2085)
assert.deepEqual(queries.flatMap(q => q.selectedIds), context.groupMembers.map(r => r.IDBAT))

// Winding number (independent of the probe's crossing test); distance to segments.
function checkGeometry(point, geometry, isArea) {
  const xScale = 111195 * Math.cos(point.latitude * Math.PI / 180)
  const pts = geometry.map(([x, y]) => [(x - point.longitude) * xScale, (y - point.latitude) * 111195])
  let winding = 0
  let distance = Math.min(...pts.map(([x, y]) => Math.hypot(x, y)))
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i]
    const cross = ax * by - bx * ay
    if (ay <= 0 && by > 0 && cross > 0) winding++
    if (ay > 0 && by <= 0 && cross < 0) winding--
    const dx = bx - ax, dy = by - ay
    const length2 = dx * dx + dy * dy
    const t = length2 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / length2)) : 0
    distance = Math.min(distance, Math.hypot(ax + t * dx, ay + t * dy))
  }
  return { inside: isArea && winding !== 0, distance }
}

let pairs = 0
for (const record of spatial.records) {
  const raw = live.find(r => r.id === record.IDBAT)
  assert.deepEqual(record.original, raw)
  const feature = map.features.find(f => f.properties.sourceRecordIds?.includes(record.IDBAT))
  assert.equal(record.groupId, feature.properties.featureGroupId)
  assert.deepEqual(record.groupMemberIds, feature.properties.sourceRecordIds)
  const point = utm51nToWgs84(raw.x, raw.y)
  assert.deepEqual(record.wgs84, point)
  assert.deepEqual(record.gcj02, wgs84ToGcj02(point.longitude, point.latitude))
  assert.ok(point.longitude > 120 && point.longitude < 123 && point.latitude > 30 && point.latitude < 32)
  for (const n of record.nearby) {
    const e = elements.get(`${n.osmType}/${n.osmId}`)
    assert.ok(e)
    const stored = read(path.join(root, n.responseFile)).response.elements.find(e => e.type === n.osmType && e.id === n.osmId)
    assert.deepEqual(stored, e)
    const g = e.type === 'node' ? [[e.lon, e.lat]] : e.geometry.map(p => [p.lon, p.lat])
    const t = e.tags || {}
    const closed = g.length >= 4 && JSON.stringify(g[0]) === JSON.stringify(g.at(-1))
    const area = Boolean(e.type === 'way' && closed && t.area !== 'no' && (t.area === 'yes' || t.building || t.landuse || t.amenity || t.leisure))
    assert.equal(n.isArea, area)
    assert.deepEqual(n.tags, t)
    const check = checkGeometry(point, g, area)
    assert.equal(n.pointInsideArea, check.inside, `Containment differs: ${record.IDBAT}/${e.id}`)
    assert.equal(n.containment, area ? check.inside ? 'inside' : 'outside' : 'not-checked')
    assert.ok(Math.abs(n.distanceToBoundaryMeters - check.distance) < 0.011)
    assert.ok(Math.abs(n.distanceMeters - (check.inside ? 0 : check.distance)) < 0.011)
    pairs++
  }
}

const keys = ['IDBAT', 'currentNameZh', 'currentAddress', 'currentUse', 'relationship', 'verificationStatus', 'notes', 'sources'].sort()
const statuses = {}, progress = {}, recommendations = {}
const increment = (object, key) => { object[key] = (object[key] || 0) + 1 }
const allowedCombos = new Set(['verified/yes', 'verified/review', 'likely/review', 'unresolved/no'])
const relations = new Set([null, 'same-building', 'same-building-repurposed', 'same-site-repurposed', 'same-site-continuing-use', 'demolished-site-redeveloped', 'site-redeveloped-partially-preserved'])
for (let i = 0; i < 50; i++) {
  const r = results[i], e = evidence.records[i], s = spatial.records.find(p => p.IDBAT === r.IDBAT)
  assert.deepEqual(Object.keys(r).sort(), keys)
  assert.deepEqual(e.originalInput, input[i])
  assert.deepEqual(context.records[i].originalInput, input[i])
  assert.equal(r.verificationStatus, e.verificationStatus)
  assert.equal(r.notes, e.conclusion)
  assert.ok(allowedCombos.has(`${e.verificationStatus}/${e.mapWriteRecommendation}`))
  assert.ok(relations.has(r.relationship))
  for (const key of ['currentNameZh', 'currentAddress', 'currentUse']) assert.ok(r[key] === null || typeof r[key] === 'string')
  assert.ok(['completed', 'partial', 'not-started'].includes(e.researchProgress.status))
  if (e.mapWriteRecommendation === 'review') assert.ok(r.notes.includes('待核'))
  if (e.researchProgress.status === 'not-started') {
    assert.ok(r.notes.includes('本轮未开始研究'))
    assert.equal(e.queries.length, 0)
    assert.equal(r.verificationStatus, 'unresolved')
  }
  if (e.researchProgress.status === 'completed') assert.ok(e.queries.length >= 2)
  const reviewedUrls = new Set(e.sourceReviews.map(s => s.url))
  for (const source of r.sources) {
    assert.deepEqual(Object.keys(source).sort(), ['title', 'url'])
    assert.ok(reviewedUrls.has(source.url))
  }
  for (const finding of Object.values(e.fieldFindings)) {
    assert.ok(['confirmed', 'candidate', 'unknown', 'conflicting'].includes(finding.status))
    for (const url of finding.sourceUrls) assert.ok(reviewedUrls.has(url))
  }
  for (const review of e.sourceReviews) {
    assert.ok(['full-text', 'pdf', 'search-snippet', 'reprint', 'inaccessible'].includes(review.accessMethod))
    for (const key of ['url', 'title', 'publisher', 'publishedAt', 'accessMethod', 'locator', 'supports', 'limitations', 'accessedAt', 'readThisRound', 'sourceFamily']) assert.ok(key in review)
  }
  for (const query of e.queries) assert.ok(log.targetedQueries.some(q => q.id === r.IDBAT && q.q === query.query) || log.scoutQueries.some(x => x.search_query.some(q => q.q === query.query)) || [continuation, round2].some(c => c.targetedQueries.some(q => q.IDBAT === r.IDBAT && q.q === query.query && q.executedAt === query.executedAt)))
  assert.deepEqual(e.spatialReview.originalWgs84, s.wgs84)
  assert.deepEqual(e.spatialReview.originalGcj02, s.gcj02)
  if (e.spatialReview.comparisonSourceUrl) {
    const n = s.nearby.find(n => n.sourceUrl === e.spatialReview.comparisonSourceUrl)
    assert.ok(n && n.isArea)
    assert.equal(e.spatialReview.containment, n.containment)
    assert.equal(e.spatialReview.distanceMeters, n.distanceMeters)
    assert.equal(e.spatialReview.distanceToBoundaryMeters, n.distanceToBoundaryMeters)
  }
  assert.deepEqual(e.relatedRecords.map(r => r.IDBAT), s.groupMemberIds.filter(id => id !== r.IDBAT))
  if (e.mapWriteRecommendation === 'yes') {
    for (const key of ['currentNameZh', 'currentAddress', 'currentUse', 'relationship']) assert.ok(r[key])
    assert.equal(e.spatialReview.compatibility, 'supported')
    assert.ok(e.mapWriteScope.level)
  }
  increment(statuses, r.verificationStatus)
  increment(progress, e.researchProgress.status)
  increment(recommendations, e.mapWriteRecommendation)
}
assert.deepEqual(results.filter(r => r.verificationStatus === 'verified').map(r => r.IDBAT), [1679, 1076])
assert.deepEqual(results.filter(r => r.verificationStatus === 'likely').map(r => r.IDBAT), [1480, 1091, 911, 161])
assert.equal(recommendations.yes || 0, 0)
assert.deepEqual(progress, { partial: 24, completed: 8, 'not-started': 18 })
assert.equal(recommendations.review, 6)
assert.equal(recommendations.no, 44)
assert.equal(log.targetedQueries.length, 56)
assert.equal(continuation.targetedQueries.length, 54)
assert.equal(continuation.virtualShanghaiReads.length, 8)
assert.deepEqual(continuation.virtualShanghaiReads.map(r => r.IDBAT).sort((a,b) => a-b), [73,238,744,911,1115,1116,1117,1247])
for (const page of continuation.virtualShanghaiReads) assert.ok(page.rows.includes(`Building ID ${page.IDBAT}`))
assert.equal(round2.targetedQueries.length, 56)
assert.equal(round2.virtualShanghaiReads.length, 11)
assert.deepEqual(round2.virtualShanghaiReads.map(r => r.IDBAT).sort((a,b) => a-b), [24,45,161,837,856,857,859,1066,1067,1068,1070])
for (const page of round2.virtualShanghaiReads) assert.ok(page.rows.includes(`Building ID ${page.IDBAT}`))
assert.equal(round2.newSpatialQueries, 0)
assert.equal(round2.reusedSpatialQueryDate, '2026-09-12')
assert.deepEqual(round2Findings.map(r => r.IDBAT), round2.scopeIds)
for (const f of round2Findings) {
  const e = evidence.records.find(r => r.IDBAT === f.IDBAT), r = results.find(r => r.IDBAT === f.IDBAT)
  assert.equal(f.notes, r.notes)
  assert.equal(f.status, r.verificationStatus)
  assert.equal(f.progress, e.researchProgress.status)
  assert.deepEqual(e.queries, round2.targetedQueries.filter(q => q.IDBAT === f.IDBAT).map(q => ({query:q.q,executedAt:q.executedAt,method:'web-search'})))
  for (const key of f.sourceKeys) assert.deepEqual(e.sourceReviews.find(s => s.url === round2Sources[key].url), round2Sources[key])
  for (const member of e.relatedRecords) for (const n of member.independentSpatialComparisons) {
    const actual = spatial.records.find(p => p.IDBAT === member.IDBAT).nearby.find(x => x.sourceUrl === n.sourceUrl)
    assert.equal(actual.containment, n.containment)
    assert.equal(actual.distanceMeters, n.distanceMeters)
    assert.equal(actual.distanceToBoundaryMeters, n.distanceToBoundaryMeters)
  }
  for (const s of e.sourceReviews.filter(s => s.sourceFamily === 'OpenStreetMap')) {
    assert.equal(s.readThisRound, false)
    assert.ok(s.accessedAt.startsWith('2026-09-12'))
  }
  assert.ok([null, 'site', 'building', 'part-of-building'].includes(e.mapWriteScope.level))
  assert.equal(r.currentUse, null)
  assert.equal(r.relationship, null)
}
assert.equal(results.find(r => r.IDBAT === 837).verificationStatus, 'unresolved', 'Same number/nearby cannot alone justify likely')
const sourceFiles = round2Attachments.items.filter(a => a.status === 'downloaded-and-read')
assert.equal(sourceFiles.length, 3)
assert.equal(round2Attachments.renderedPages.length, 4)
let localAttachmentsChecked = 0
for (const a of [...sourceFiles, ...round2Attachments.renderedPages]) {
  if (fs.existsSync(a.path)) {
    assert.equal(digest(a.path), a.sha256)
    assert.equal(fs.statSync(a.path).size, a.bytes)
    localAttachmentsChecked++
  }
}
assert.equal(evidence.records.reduce((sum, r) => sum + r.queries.length, 0), 170)
assert.equal(log.virtualShanghaiReads.length + log.explicitVsWebReads.length, 21)
assert.ok(!fs.existsSync(path.join(root, 'scripts/data/unresolved-landmarks-022-research.json')), 'Partial batch must not enter legacy complete-coverage compiler')
execFileSync('git', ['diff', '--check'], { cwd: root })
console.log(JSON.stringify({
  validatedAt: new Date().toISOString(), executionStatus: 'executed',
  validationScope: 'offline schema, original data preservation and spatial arithmetic; not independent proof of historical correspondence or current operation',
  checks: ['50 inputs/order/8 fields/originalInput exact', 'legal status combinations and conclusions', 'sources covered by sourceReviews', '170 actual queries across dated logs', '44 out-of-scope result/evidence objects preserved per continuation', 'r2 findings/source catalog/related-member comparisons agree', 'r1 artifacts and archived review/validation preserved', 'original Sep12 catalogs/log/context/spatial preserved', '49 groups and 64 individual members', 'independent geometry re-computation', '342 pre-existing file SHA-256 preservation', 'map/overrides unchanged', 'git diff --check'],
  failures: [], inputSha256: evidence.inputSha256, baselineHead: baseline.head,
  records: 50, groups: 49, groupMembers: 64, progress, statuses, recommendations,
  partialIds: evidence.records.filter(r => r.researchProgress.status === 'partial').map(r => r.IDBAT),
  notStartedIds: evidence.records.filter(r => r.researchProgress.status === 'not-started').map(r => r.IDBAT),
  actualTargetedSearches: 166, scoutSearches: 4, exactVirtualShanghaiPagesRead: 40,
  continuation: { date: '2026-09-13', records: 6, actualTargetedSearches: 54, exactVirtualShanghaiPagesRead: 8, unchangedPriorRecordObjects: 44, newOverpassQueries: 0, reusedSpatialQueryDate: '2026-09-12' },
  latestContinuation: { date: '2026-09-13', round: 'r2', records: 6, actualTargetedSearches: 56, exactVirtualShanghaiPagesRead: 11, unchangedPriorRecordObjects: 44, newOverpassQueries: 0, reusedSpatialQueryDate: '2026-09-12' },
  localAttachmentsChecked, attachmentHashCheckNote: 'Source files live outside repo; validate SHA/size when present, no remote download. Image inspection is documented, not automated.',
  overpassQueries: queries.length, uniqueOsmElements: elements.size, independentlyCheckedPointGeometryPairs: pairs,
  baselineFilesPreserved: Object.keys(baseline.files).length, overrides: overrides.length,
  featureCount: map.features.length, roadCount: map.features.filter(f => f.properties.kind === 'road').length,
  mapSha256: digest(path.join(root, 'public/data/historical-features.geojson')),
  mapImportExecuted: false, formalCoverageCounterUpdated: false, applicationBuildRun: false, gitCommitOrPush: false,
  artifactSha256: Object.fromEntries(['results', 'evidence', 'findings', 'source-catalog', 'root-search-log', 'attachment-review', 'osm-nearby', 'continuation-2026-09-13-search-log', 'continuation-2026-09-13-sources', 'continuation-2026-09-13-findings', 'continuation-2026-09-13-attachments', 'continuation-2026-09-13-record-baseline', 'continuation-2026-09-13-r2-search-log', 'continuation-2026-09-13-r2-sources', 'continuation-2026-09-13-r2-findings', 'continuation-2026-09-13-r2-attachments', 'continuation-2026-09-13-r2-record-baseline'].map(n => [`022-${n}.json`, digest(path.join(dir, `022-${n}.json`))])),
}, null, 2))
