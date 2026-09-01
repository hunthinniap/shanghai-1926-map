import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeBuildingAddress } from './lib/cluster-buildings.mjs'
import { utm51nToWgs84 } from './lib/coordinate-systems.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const historicalPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const clusterAuditPath = path.join(projectRoot, 'public', 'data', 'virtual-shanghai-building-clusters.json')
const liveSnapshotPath = path.join(projectRoot, 'scripts', 'data', 'virtual-shanghai-buildings-live.json')
const separationsPath = path.join(projectRoot, 'scripts', 'data', 'virtual-shanghai-site-separations.json')
const siteOverridesPath = path.join(projectRoot, 'scripts', 'data', 'virtual-shanghai-site-overrides.json')

const [historical, audit, liveSnapshot, separations, siteOverrides] = await Promise.all([
  fs.readFile(historicalPath, 'utf8').then(JSON.parse),
  fs.readFile(clusterAuditPath, 'utf8').then(JSON.parse),
  fs.readFile(liveSnapshotPath, 'utf8').then(JSON.parse),
  fs.readFile(separationsPath, 'utf8').then(JSON.parse),
  fs.readFile(siteOverridesPath, 'utf8').then(JSON.parse),
])

const liveById = new Map(liveSnapshot.records.map((record) => [record.id, record]))
const overrideBySingleId = new Map(siteOverrides
  .filter((override) => override.sourceRecordIds?.length === 1)
  .map((override) => [override.sourceRecordIds[0], override]))
let applied = 0

function sourceUrl(recordId) {
  return `https://www.virtualshanghai.net/数据/建筑?ID=${recordId}`
}

function cleanHistoricalRecord(record, live) {
  return {
    sourceRecordIds: [live.id],
    name: record?.name ?? live.name,
    nameZh: record?.nameZh ?? live.nameZh ?? undefined,
    startYear: record?.startYear ?? live.startYear ?? undefined,
    endYear: record?.endYear ?? live.endYear ?? undefined,
    sourceUrls: [sourceUrl(live.id)],
    category: record?.category ?? '重要建筑',
    generic: record?.generic ?? false,
  }
}

for (const separation of separations) {
  const pair = separation.sourceRecordIds
  if (!Array.isArray(pair) || pair.length !== 2) throw new Error(`Invalid site separation: ${JSON.stringify(separation)}`)
  const pairSet = new Set(pair)
  const combinedIndex = historical.features.findIndex((feature) => {
    const ids = feature.properties?.sourceRecordIds ?? []
    return pair.every((recordId) => ids.includes(recordId))
  })
  if (combinedIndex < 0) {
    const alreadySeparated = pair.every((recordId) => historical.features.some(
      (feature) => feature.properties?.sourceRecordIds?.length === 1 &&
        feature.properties.sourceRecordIds[0] === recordId,
    ))
    if (!alreadySeparated) throw new Error(`Could not find combined or separated features for #${pair.join('/#')}`)
    continue
  }

  const combined = historical.features[combinedIndex]
  const combinedIds = combined.properties?.sourceRecordIds ?? []
  if (combinedIds.length !== pair.length || combinedIds.some((recordId) => !pairSet.has(recordId))) {
    throw new Error(`Curated separation #${pair.join('/#')} is only safe for an exact two-record feature group`)
  }
  const separatedFeatures = pair.map((recordId) => {
    const live = liveById.get(recordId)
    if (!live) throw new Error(`Missing live Virtual Shanghai record #${recordId}`)
    const originalRecordIndex = (combined.properties.historicalRecords ?? []).findIndex(
      (record) => record.sourceRecordIds?.includes(recordId),
    )
    const originalRecord = combined.properties.historicalRecords?.[originalRecordIndex]
    const curated = overrideBySingleId.get(recordId) ?? {}
    const historicalRecord = cleanHistoricalRecord(originalRecord, live)
    const featureGroupId = `landmark-vs-site-${recordId}`
    const legacyFeatureGroupId = combined.properties.legacyFeatureGroupIds?.[originalRecordIndex]
    const coordinate = utm51nToWgs84(live.x, live.y)
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [coordinate.longitude, coordinate.latitude],
      },
      properties: {
        id: featureGroupId,
        featureGroupId,
        kind: 'landmark',
        historicalName: curated.historicalName ?? historicalRecord.name,
        modernNameZh: curated.modernNameZh ?? historicalRecord.nameZh ?? historicalRecord.name,
        historicalRecords: [historicalRecord],
        sourceRecordIds: [recordId],
        legacyFeatureGroupIds: legacyFeatureGroupId ? [legacyFeatureGroupId] : undefined,
        clusterReason: 'curated-site-separation',
        aliases: curated.aliases ?? [],
        jurisdiction: curated.jurisdiction ?? combined.properties.jurisdiction,
        language: curated.language ?? combined.properties.language,
        labelYear: curated.labelYear ?? historicalRecord.startYear ?? 1949,
        labelYearIsFallback: curated.labelYear === undefined && !historicalRecord.startYear,
        sourceIds: ['vs-buildings'],
        sourceUrls: { 'vs-buildings': sourceUrl(recordId) },
        category: curated.category ?? historicalRecord.category ?? combined.properties.category,
        priority: combined.properties.priority,
        labelOnMap: curated.labelOnMap ?? combined.properties.labelOnMap,
      },
    }
  })
  historical.features.splice(combinedIndex, 1, ...separatedFeatures)

  const auditIndex = audit.clusters.findIndex((cluster) => pair.every(
    (recordId) => cluster.sourceRecordIds?.includes(recordId),
  ))
  if (auditIndex < 0) throw new Error(`Missing combined audit cluster for #${pair.join('/#')}`)
  const combinedAudit = audit.clusters[auditIndex]
  const separatedAuditClusters = pair.map((recordId) => {
    const live = liveById.get(recordId)
    const originalRecord = combinedAudit.historicalRecords.find((record) => record.sourceRecordIds?.includes(recordId))
    const curatedOverride = overrideBySingleId.get(recordId)
    return {
      clusterId: `vs-building-site:${recordId}`,
      featureGroupId: `landmark-vs-site-${recordId}`,
      primaryRecordId: recordId,
      sourceRecordIds: [recordId],
      historicalName: live.name,
      historicalNameZh: live.nameZh,
      address: live.address,
      normalizedAddress: normalizeBuildingAddress(live.address).normalized,
      centroid: [live.x, live.y],
      historicalRecords: [originalRecord],
      mergeReasons: [],
      curatedOverride,
    }
  })
  audit.clusters.splice(auditIndex, 1, ...separatedAuditClusters)
  for (const recordId of pair) audit.recordToCluster[String(recordId)] = `vs-building-site:${recordId}`
  audit.summary.siteClusters += 1
  audit.summary.mappedClusters += 1
  audit.summary.multiRecordClusters -= 1
  audit.summary.mergeReasons -= combinedAudit.mergeReasons.length
  audit.summary.curatedOverrides += separatedAuditClusters.filter((cluster) => cluster.curatedOverride).length
  applied += 1
}

if (applied) {
  audit.generatedAt = new Date().toISOString()
  audit.rules.curatedSiteSeparations = separations.length
  audit.rules.siteSeparations = separations
  audit.summary.curatedSeparations = separations.length
  await Promise.all([
    fs.writeFile(historicalPath, `${JSON.stringify(historical)}\n`, 'utf8'),
    fs.writeFile(clusterAuditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8'),
  ])
}

console.log(applied
  ? `Applied ${applied} curated Virtual Shanghai site separation(s).`
  : 'All curated Virtual Shanghai site separations were already applied.')
