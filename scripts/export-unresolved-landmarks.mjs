import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  makeUnresolvedRecordComparator,
  unresolvedRecordTier,
} from './lib/unresolved-ranking.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const historicalPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const auditPath = path.join(projectRoot, 'public', 'data', 'landmark-current-use-audit.json')
const clusterAuditPath = path.join(projectRoot, 'public', 'data', 'virtual-shanghai-building-clusters.json')
const snapshotPath = path.join(projectRoot, 'scripts', 'data', 'virtual-shanghai-buildings-live.json')
const outputDirectory = path.join(projectRoot, 'public', 'data', 'unresolved-landmarks')
const chunkSize = 50

const unresolvedAuditStatuses = new Set([
  'not-found',
  'generic-name',
  'needs-review-partial-name',
  'needs-review-duplicate-source',
])
const [historical, audit, clusterAudit, snapshot] = await Promise.all([
  fs.readFile(historicalPath, 'utf8').then(JSON.parse),
  fs.readFile(auditPath, 'utf8').then(JSON.parse),
  fs.readFile(clusterAuditPath, 'utf8').then(JSON.parse),
  fs.readFile(snapshotPath, 'utf8').then(JSON.parse),
])

if (!snapshot.complete || snapshot.sourceCount !== 1803 || snapshot.records?.length !== 1803) {
  throw new Error('The Virtual Shanghai building snapshot is not the complete 1803-record catalogue')
}

const featuresByGroup = new Map()
for (const feature of historical.features ?? []) {
  const properties = feature.properties ?? {}
  if (properties.kind !== 'landmark' || !properties.sourceIds?.includes('vs-buildings')) continue
  if (!featuresByGroup.has(properties.featureGroupId)) {
    featuresByGroup.set(properties.featureGroupId, feature)
  }
}

const auditByGroup = new Map((audit.records ?? []).map((record) => [record.featureGroupId, record]))
const clusterByGroup = new Map((clusterAudit.clusters ?? []).map((cluster) => [cluster.featureGroupId, cluster]))
const liveById = new Map(snapshot.records.map((record) => [record.id, record]))

function unresolvedReason(feature, auditRecord) {
  if (unresolvedAuditStatuses.has(auditRecord?.status)) return auditRecord.status
  const properties = feature.properties ?? {}
  if (properties.currentUseRelationship === 'institutional-successor-relocated' &&
    /待核|尚未找到|具体用途尚不明确/u.test(
      `${properties.currentUse ?? ''} ${properties.currentUseNote ?? ''}`,
    )) {
    return 'original-site-current-use-unresolved'
  }
  return undefined
}

function exportedRecord(sourceRecordId) {
  const live = liveById.get(sourceRecordId)
  if (!live) throw new Error(`Missing Virtual Shanghai live snapshot record ${sourceRecordId}`)
  const functions = Object.values(live.types ?? {}).filter(Boolean)
  return {
    IDBAT: sourceRecordId,
    NAME: live.name ?? null,
    F_ADDRESS: live.address ?? null,
    FUNCTION: functions.length ? functions.join(' / ') : null,
    XC: live.x ?? null,
    YC: live.y ?? null,
  }
}

const unresolvedRecordIds = new Set()
for (const [featureGroupId, feature] of featuresByGroup) {
  const auditRecord = auditByGroup.get(featureGroupId)
  const reason = unresolvedReason(feature, auditRecord)
  if (!reason) continue
  const cluster = clusterByGroup.get(featureGroupId)
  if (!cluster) throw new Error(`Missing cluster audit for ${featureGroupId}`)
  for (const sourceRecordId of cluster.sourceRecordIds) unresolvedRecordIds.add(sourceRecordId)
}

const records = [...unresolvedRecordIds]
  .sort((left, right) => left - right)
  .map(exportedRecord)
records.sort(makeUnresolvedRecordComparator(records))

await fs.mkdir(outputDirectory, { recursive: true })
for (const filename of await fs.readdir(outputDirectory)) {
  if (/^\d{3}\.json$/u.test(filename)) {
    await fs.unlink(path.join(outputDirectory, filename))
  }
}

const chunks = Array.from(
  { length: Math.ceil(records.length / chunkSize) },
  (_, index) => records.slice(index * chunkSize, (index + 1) * chunkSize),
)
await Promise.all(chunks.map((chunk, index) => fs.writeFile(
  path.join(outputDirectory, `${String(index + 1).padStart(3, '0')}.json`),
  `${JSON.stringify(chunk, null, 2)}\n`,
  'utf8',
)))

const tierCounts = [0, 1, 2, 3].map(
  (tier) => records.filter((record) => unresolvedRecordTier(record) === tier).length,
)
console.log(
  `Exported ${records.length} unresolved Virtual Shanghai records into ${chunks.length} files ` +
  `(specific/complete ${tierCounts[0]}, specific/partial ${tierCounts[1]}, general ${tierCounts[2]}, unnamed ${tierCounts[3]}).`,
)
