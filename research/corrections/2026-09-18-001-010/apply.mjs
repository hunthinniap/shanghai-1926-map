// Apply the reviewed 001–010 corrections without rebuilding historical geometry.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { clearCurrentUse, findCurrentUseHold, applyCurrentUseHold } from '../../../scripts/lib/current-use-holds.mjs'

const directory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(directory, '../../..')
const reviewRef = 'research/corrections/2026-09-18-001-010'
const date = '2026-09-18'
const read = async (name) => JSON.parse(await fs.readFile(path.join(root, name), 'utf8'))
const write = async (name, value, compact = false) => fs.writeFile(
  path.join(root, name), `${JSON.stringify(value, null, compact ? undefined : 2)}\n`,
)
const baseline = await read(`${reviewRef}/baseline.json`)
const original = (name) => JSON.parse(execFileSync('git', ['show', `${baseline.baseCommit}:${name}`], {
  cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
}))
const findingPlans = (await Promise.all(['a', 'b', 'c'].map((part) => read(`${reviewRef}/${part}-plan.json`))))
  .flatMap((plan) => plan.records)
const audited = await read('research/rechecks/2026-09-18-001-010/audit.json')
const findings = audited.records.filter((record) => record.findings.length)
const keys = (records) => records.map((record) => `${record.batch}:${record.IDBAT}`).sort().join(',')
if (findingPlans.length !== 100 || new Set(findingPlans.map((record) => record.IDBAT)).size !== 100 || keys(findingPlans) !== keys(findings)) {
  throw new Error('Correction plans must cover exactly the 100 audited records with findings')
}
const synchronizationPlans = (await read(`${reviewRef}/synchronization-plan.json`)).records
const plans = [...findingPlans, ...synchronizationPlans]
const forbidden = new Set(['IDBAT', 'NAME', 'F_ADDRESS', 'FUNCTION', 'XC', 'YC', 'coordinates',
  'historicalName', 'historicalNameZh', 'historicalStartYear', 'historicalEndYear', 'sourceRecordIds'])
for (const plan of plans) {
  for (const patch of [plan.workflowPatch, plan.resultPatch, plan.partPatch, plan.mapPatch]) {
    for (const key of Object.keys(patch)) if (forbidden.has(key)) throw new Error(`Protected field #${plan.IDBAT}: ${key}`)
  }
}
const byId = (records, id) => {
  const matches = records.filter((record) => record.IDBAT === id)
  if (matches.length !== 1) throw new Error(`Expected one record #${id}, found ${matches.length}`)
  return matches[0]
}
const countBy = (records, key) => records.reduce((counts, record) => {
  counts[record[key]] = (counts[record[key]] ?? 0) + 1
  return counts
}, {})

for (let index = 1; index <= 10; index += 1) {
  const batch = String(index).padStart(3, '0')
  const workflowPath = `scripts/data/unresolved-landmarks-${batch}-research.json`
  const workflow = await read(workflowPath)
  const batchPlans = plans.filter((plan) => plan.batch === batch)
  for (const plan of batchPlans) Object.assign(byId(workflow.records, plan.IDBAT), plan.workflowPatch)
  workflow.correctedAt = date
  workflow.correctionReview = `${reviewRef}/README.md`
  if (['002', '004'].includes(batch)) {
    const inputPath = `research/unresolved-landmarks/${batch}-input.json`
    await fs.copyFile(path.join(root, `research/rechecks/2026-09-18-001-010/${batch}-recovered-input.json`), path.join(root, inputPath))
    workflow.input = inputPath
    workflow.inputProvenance = { status: 'recovered-exact-git-snapshot',
      evidence: 'research/rechecks/2026-09-18-001-010/input-provenance.json' }
  } else if (['003', '005', '006'].includes(batch)) {
    workflow.input = null
    workflow.inputProvenance = { status: 'original-snapshot-unavailable',
      note: '原同号public文件会重排，不能用作固定批次输入；已提交的同号Git历史未找回完整50条原快照。固定ID及修正前记录保存在审查context中，本轮不伪造原输入。',
      fixedRecordContext: 'research/rechecks/2026-09-18-001-010/context.json',
      evidence: 'research/rechecks/2026-09-18-001-010/input-provenance.json' }
  }
  if (workflow.summary.byOutcomeCategory) {
    workflow.summary = { total: workflow.records.length,
      byOutcomeCategory: countBy(workflow.records, 'outcomeCategory'),
      byResolutionStatus: countBy(workflow.records, 'resolutionStatus'),
      mapWriteRecommendation: countBy(workflow.records, 'mapWriteRecommendation') }
  } else {
    const counts = countBy(workflow.records, 'resolutionStatus')
    workflow.summary = { total: workflow.records.length, resolved: counts.resolved ?? 0,
      probable: counts.probable ?? 0, historyOnly: counts['history-only'] ?? 0, unresolved: counts.unresolved ?? 0 }
  }
  await write(workflowPath, workflow)
  if (!['001', '007', '008', '009', '010'].includes(batch)) continue
  const resultPath = `research/unresolved-landmarks/${batch}-results.json`
  const results = await read(resultPath)
  for (const plan of batchPlans) Object.assign(byId(results.records, plan.IDBAT), plan.resultPatch)
  const ordering = ['verified', 'likely', 'unresolved']
  results.records.sort((a, b) => ordering.indexOf(a.verificationStatus) - ordering.indexOf(b.verificationStatus) ||
    String(a.NAME ?? '').localeCompare(String(b.NAME ?? ''), 'en'))
  results.verificationSummary = Object.fromEntries(ordering.map((status) => [status,
    results.records.filter((record) => record.verificationStatus === status).length]))
  await write(resultPath, results)
  for (const part of ['a', 'b', 'c']) {
    const partPath = `research/unresolved-landmarks/${batch}-${part}.json`
    const records = await read(partPath)
    for (const plan of batchPlans) {
      const record = records.find((entry) => entry.IDBAT === plan.IDBAT)
      if (record) Object.assign(record, plan.partPatch)
    }
    await write(partPath, records)
  }
}

const historicalPath = 'public/data/historical-features.geojson'
const overridesPath = 'scripts/data/landmark-current-use-overrides.json'
const auditPath = 'public/data/landmark-current-use-audit.json'
const holdsPath = 'scripts/data/landmark-current-use-holds.json'
const historical = await read(historicalPath)
const audit = await read(auditPath)
let overrides = await read(overridesPath)
const holds = await read(holdsPath).catch((error) => { if (error.code === 'ENOENT') return []; throw error })
const featureFor = (id) => {
  const features = historical.features.filter((feature) => feature.properties?.sourceRecordIds?.includes(id))
  if (features.length !== 1) throw new Error(`Ambiguous feature for #${id}`)
  return features[0]
}
const groupMatches = (feature, group) => [feature.properties.featureGroupId,
  ...(feature.properties.legacyFeatureGroupIds ?? [])].includes(group)
const affectedGroups = new Set()
for (const plan of plans) {
  if (plan.mapAction === 'retain') continue
  const feature = featureFor(plan.IDBAT)
  const properties = feature.properties
  affectedGroups.add(properties.featureGroupId)
  if (plan.mapAction === 'hold') {
    let hold = holds.find((entry) => entry.featureGroupId === properties.featureGroupId)
    if (!hold) {
      hold = { featureGroupId: properties.featureGroupId, sourceRecordIds: properties.sourceRecordIds,
        reason: plan.reason, sourceUrls: [...plan.sourceUrls], reviewedAt: date, reviewRef: `${reviewRef}/README.md` }
      holds.push(hold)
    } else {
      hold.sourceUrls = [...new Set([...hold.sourceUrls, ...plan.sourceUrls])]
    }
  } else if (plan.mapAction === 'update') {
    const matches = overrides.filter((override) => groupMatches(feature, override.featureGroupId))
    if (matches.length !== 1) throw new Error(`Map update requires an existing unique override for #${plan.IDBAT}`)
    Object.assign(matches[0], plan.mapPatch)
    if (plan.mapPatch.currentUseNote && !plan.mapPatch.evidence) matches[0].evidence = plan.mapPatch.currentUseNote
  } else throw new Error(`Unknown map action: ${plan.mapAction}`)
}
overrides = overrides.filter((override) => {
  const feature = historical.features.find((entry) => groupMatches(entry, override.featureGroupId))
  return !feature || !findCurrentUseHold(holds, feature.properties)
})
for (const feature of historical.features) {
  if (!affectedGroups.has(feature.properties?.featureGroupId)) continue
  const properties = feature.properties
  const hold = findCurrentUseHold(holds, properties)
  const auditIndex = audit.records.findIndex((record) => record.featureGroupId === properties.featureGroupId)
  if (auditIndex < 0) throw new Error(`Missing audit group ${properties.featureGroupId}`)
  if (hold) {
    feature.properties = clearCurrentUse(properties)
    audit.records[auditIndex] = applyCurrentUseHold(audit.records[auditIndex], hold)
    continue
  }
  const override = overrides.find((entry) => groupMatches(feature, entry.featureGroupId))
  const match = Object.fromEntries(Object.entries(override).filter(([key]) => key.startsWith('current')))
  Object.assign(match, { currentUseSourceId: 'verified-landmark-current-uses', currentUseMatch: 'verified-online-research' })
  feature.properties = { ...clearCurrentUse(properties), ...match }
  audit.records[auditIndex] = { ...audit.records[auditIndex], status: 'matched-research',
    accepted: { ...match, evidence: override.evidence, matchedLegacyFeatureGroupId: override.featureGroupId } }
}
const statusKeys = { matched: 'matchedFromLibrary', 'matched-library-cache': 'matchedFromLibraryCache',
  'matched-wikipedia': 'matchedFromWikipedia', 'matched-research': 'matchedFromResearch',
  'current-place-name': 'matchedFromCurrentPlaceName', 'needs-review-partial-name': 'needsReviewPartialName',
  'needs-review-duplicate-source': 'needsReviewDuplicateSource', 'needs-review-research': 'needsReviewResearch',
  'not-found': 'notFound', 'generic-name': 'genericName' }
for (const [status, key] of Object.entries(statusKeys)) audit.summary[key] = audit.records.filter((record) => record.status === status).length
audit.correctedAt = date
audit.correctionReview = `${reviewRef}/README.md`
holds.sort((a, b) => a.featureGroupId.localeCompare(b.featureGroupId, 'en', { numeric: true }))
await write(holdsPath, holds)
await write(overridesPath, overrides)
await write(historicalPath, historical, true)
await write(auditPath, audit)

const previousOverrides = original(overridesPath)
const removedOverrides = previousOverrides.filter((entry) => !overrides.some((override) => override.featureGroupId === entry.featureGroupId))
const changedWorkflowIds = plans.filter((plan) => {
  const before = byId(original(`scripts/data/unresolved-landmarks-${plan.batch}-research.json`).records, plan.IDBAT)
  return Object.entries(plan.workflowPatch).some(([key, value]) => JSON.stringify(before[key]) !== JSON.stringify(value))
}).map((plan) => plan.IDBAT)
await write(`${reviewRef}/applied.json`, { correctedAt: date, baseCommit: baseline.baseCommit,
  plannedRecords: findingPlans.length, synchronizationRecords: synchronizationPlans.length,
  changedWorkflowIds, mapActions: countBy(findingPlans, 'mapAction'),
  heldGroups: holds.length, heldSourceRecords: new Set(holds.flatMap((hold) => hold.sourceRecordIds)).size,
  removedOverrides, remainingOverrides: overrides.length,
  archivePolicy: '原audit、来源阅读记录、023—032复查和bath专项保留原样；此文件保存撤回的override用于追溯，不是可回填来源。' })
console.log(JSON.stringify({ plannedRecords: findingPlans.length, synchronizationRecords: synchronizationPlans.length,
  changedWorkflowRecords: changedWorkflowIds.length,
  heldGroups: holds.length, removedOverrides: removedOverrides.length, remainingOverrides: overrides.length }))
