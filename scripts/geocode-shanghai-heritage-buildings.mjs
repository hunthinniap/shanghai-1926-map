import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { buildHeritageAddressPlan } from './lib/heritage-addresses.mjs'
import { matchHeritageLibrary } from './lib/heritage-library-matching.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const directory = path.join(root, 'public/data/shanghai-excellent-historical-buildings')
const args = new Set(process.argv.slice(2))
if ([...args].some((arg) => !['--check', '--offline'].includes(arg))) throw new Error('Usage: geocode-shanghai-heritage-buildings.mjs [--offline | --check]')
const check = args.has('--check')
const inputHashes = []
const read = async (file, repositoryFile = false) => {
  const bytes = await fs.readFile(path.join(repositoryFile ? root : directory, file))
  inputHashes.push({ [repositoryFile ? 'repositoryFile' : 'file']: file, byteLength: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex') })
  return JSON.parse(bytes)
}
const targets = await read('geocoding/targets.json')
const official = await read('buildings.json')
const library = await read('geocoding/library/buildings.json')
await read('geocoding/library/sources.json')
const plans = buildHeritageAddressPlan(targets)
const mappings = await read('scripts/data/shanghai-heritage-library-matches.json', true)
if (mappings.sourceSha256 !== inputHashes.find((input) => input.file === 'geocoding/library/buildings.json').sha256) {
  throw new Error('Library source changed: re-review the saved identity mappings')
}
const residualReviews = await read('geocoding/library-residual-review.json')
const addressReviews = await read('scripts/data/shanghai-heritage-library-address-reviews.json', true)
const coordinateReviews = await read('scripts/data/shanghai-heritage-library-coordinate-review.json', true)
const reviewedPoints = await read('geocoding/reviewed-points.json')
for (const reviewed of reviewedPoints.records) {
  if (!reviewed.sourceRefs?.length) throw new Error(`Missing reviewed point evidence: ${reviewed.officialId}`)
  for (const source of reviewed.sourceRefs ?? []) {
    if (!source.rawPath || !source.sha256) throw new Error(`Missing reviewed point source snapshot: ${reviewed.officialId}`)
    const bytes = await fs.readFile(path.join(directory, 'geocoding', source.rawPath))
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    if (sha256 !== source.sha256) throw new Error(`Reviewed source checksum mismatch: ${source.rawPath}`)
    inputHashes.push({ file: `geocoding/${source.rawPath}`, byteLength: bytes.length, sha256 })
  }
}
const overrides = [...mappings.overrides, ...addressReviews.overrides]
const targetIds = new Set(targets.records.map((record) => record.id))
if (targets.recordCount !== 913 || targetIds.size !== 913) throw new Error('The original 913-item target snapshot must remain fixed')
if (new Set(overrides.map((item) => item.officialId)).size !== overrides.length) throw new Error('Duplicate matching overrides')
for (const target of targets.records) {
  const source = official.records.find((record) => record.id === target.id)
  if (!source || source.addressAsListed !== target.official.addressAsListed || source.originalNameOrUse !== target.official.originalNameOrUse) {
    throw new Error(`Official target changed; re-review ${target.id}`)
  }
}
for (const item of [...overrides, ...reviewedPoints.records]) {
  if (!targetIds.has(item.officialId)) throw new Error(`Override outside original missing-coordinate set: ${item.officialId}`)
}
for (const override of overrides) {
  if (!['address-reference-point', 'building-complex-reference-point'].includes(override.coordinateScope)) {
    throw new Error(`Invalid reference scope: ${override.officialId}`)
  }
}
const records = targets.records.map((target, index) => {
  const result = matchHeritageLibrary(target, plans.records[index], library.records, overrides, coordinateReviews.reviews)
  const addressReview = addressReviews.reviews.find((record) => record.officialId === target.id)
  if (addressReview) {
    result.addressReviewRef = { repositoryFile: 'scripts/data/shanghai-heritage-library-address-reviews.json', officialId: target.id }
    if (!result.point) result.reason = addressReview.reason
  }
  const residual = residualReviews.records.find((record) => record.officialId === target.id)
  if (residual) {
    result.residualReviewRef = { file: 'geocoding/library-residual-review.json', officialId: target.id }
    if (!result.point) {
      result.reason = residual.reason
      if (residual.candidate && !result.candidates.some((candidate) => candidate.libraryUri === residual.candidate.libraryUri)) {
        result.candidates.push(residual.candidate)
        result.status = 'needs-review'
      }
    }
  }
  const reviewed = reviewedPoints.records.find((record) => record.officialId === target.id)
  if (!reviewed) return result
  const { point } = reviewed
  if (!reviewed.reason || point.coordinateSystem !== 'WGS84' || !point.sourceUrl || !Number.isFinite(point.lon) || !Number.isFinite(point.lat)
    || point.lon < 120.7 || point.lon > 122.3 || point.lat < 30.6 || point.lat > 32
    || !['address-reference-point', 'building-reference-point', 'building-complex-reference-point'].includes(point.coordinateScope)) {
    throw new Error(`Invalid reviewed source point: ${target.id}`)
  }
  return { ...result, status: 'accepted-reference-point', method: 'independently-reviewed-source',
    reason: reviewed.reason, libraryMatchStatus: result.status, libraryMatchReason: result.reason,
    point: { ...point, lon: Number(point.lon.toFixed(6)), lat: Number(point.lat.toFixed(6)), historicalGeometryVerified: false } }
})
const coverage = {
  targetRecords: records.length,
  acceptedReferencePoints: records.filter((record) => record.point).length,
  needsReview: records.filter((record) => record.status === 'needs-review').length,
  unmatched: records.filter((record) => record.status === 'unmatched').length,
  byOrigin: Object.fromEntries([...new Set(records.map((record) => record.point?.origin).filter(Boolean))].sort().map((origin) =>
    [origin, records.filter((record) => record.point?.origin === origin).length])),
  byScope: Object.fromEntries(['address-reference-point', 'building-reference-point', 'building-complex-reference-point'].map((scope) =>
    [scope, records.filter((record) => record.point?.coordinateScope === scope).length])),
}
const methodology = {
  targets: '冻结本轮开始时缺少来源坐标的913项；原100项维基参考点及45项待核候选不在此补点范围。',
  identity: '完整官方门牌优先；维基门牌必须另获官方地址范围或独特名称支持；非完全一致的复杂门牌另有逐项对照理由。地址点不宣称楼栋一一对应。',
  positions: '图书馆原始坐标为BD-09（发布方地图客户端代码证明），经GCJ-02逆转换为地图WGS84；保存原始坐标、URI、源门牌和转换方法。',
  precision: '六位小数仅为存储分辨率，不是测量精度。门牌、里弄、园区、建筑群均只作参考点；不代表保护轮廓、现存状况或1926年建筑位置。',
  review: '发现跨道路复制点、不同实体同门牌多点或无地址/名称交叉支持时暂停选点。独立来源替代点保留原异常与复核证据。',
  libraryAttribution: { title: '上海图书馆历史建筑开放数据', url: library.sourcePage,
    licenseNotice: '发布方声明cc2.0：署名、非商业性使用、相同方式共享；参见library/sources.json保存声明。' },
}
const results = { schemaVersion: 1, coverage, methodology, inputs: inputHashes, records }
const outputs = {
  'geocoding/address-plan.json': plans,
  'geocoding/results.json': results,
  'geocoding/review-queue.json': { schemaVersion: 1, recordCount: records.filter((record) => !record.point).length,
    records: records.filter((record) => !record.point).map((record) => ({ ...record,
      queries: plans.records.find((plan) => plan.officialId === record.officialId).queries })) },
  'geocoding/validation.json': { schemaVersion: 1, coverage, inputs: inputHashes,
    checks: { immutableTargetCount: 913, originalOfficialFieldsUnchanged: true,
      allTargetsInvestigated: records.length === 913, acceptedAllHaveSourceAndCoordinateSystem: true,
      existingWikipediaPointsNotOverwritten: true } },
}
for (const [file, value] of Object.entries(outputs)) {
  const text = `${JSON.stringify(value, null, 2)}\n`
  if (check) {
    if (await fs.readFile(path.join(directory, file), 'utf8') !== text) throw new Error(`Geocoding output drift: ${file}`)
  } else await fs.writeFile(path.join(directory, file), text)
}
console.log(JSON.stringify({ ...coverage, checked: check }, null, 2))
