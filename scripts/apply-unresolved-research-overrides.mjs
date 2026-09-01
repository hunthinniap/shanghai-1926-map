import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const chunk = process.argv[2]
if (!/^\d{3}$/u.test(chunk ?? '')) {
  throw new Error('Usage: node scripts/apply-unresolved-research-overrides.mjs NNN')
}

const resultsPath = path.join(
  projectRoot,
  'research',
  'unresolved-landmarks',
  `${chunk}-results.json`,
)
const workflowPath = path.join(
  projectRoot,
  'scripts',
  'data',
  `unresolved-landmarks-${chunk}-research.json`,
)
const historicalPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const overridesPath = path.join(projectRoot, 'scripts', 'data', 'landmark-current-use-overrides.json')

const relationshipMap = new Map([
  ['same-building', 'same-building'],
  ['same-building-repurposed', 'same-building'],
  ['same-site-repurposed', 'same-site-repurposed'],
  ['same-site-rebuilt', 'same-site-continuing-use'],
  ['same-site-continuing-use', 'same-site-continuing-use'],
  ['same-site-institutional-continuity', 'same-site-continuing-use'],
  ['demolished-site-redeveloped', 'site-redeveloped'],
  ['site-redeveloped-partially-preserved', 'partial-remains-on-original-site'],
])

const [results, workflow, historical, overrides] = await Promise.all([
  fs.readFile(resultsPath, 'utf8').then(JSON.parse),
  fs.readFile(workflowPath, 'utf8').then(JSON.parse),
  fs.readFile(historicalPath, 'utf8').then(JSON.parse),
  fs.readFile(overridesPath, 'utf8').then(JSON.parse),
])

const workflowById = new Map(workflow.records.map((record) => [record.IDBAT, record]))
const landmarks = historical.features.filter((feature) => feature.properties?.kind === 'landmark')
const featureBySourceRecordId = new Map()
for (const feature of landmarks) {
  for (const sourceRecordId of feature.properties.sourceRecordIds ?? []) {
    if (featureBySourceRecordId.has(sourceRecordId)) {
      throw new Error(`Virtual Shanghai #${sourceRecordId} belongs to more than one feature group`)
    }
    featureBySourceRecordId.set(sourceRecordId, feature)
  }
}

const existingGroups = new Set(overrides.map((override) => override.featureGroupId))
const added = []
const skipped = []

for (const record of results.records) {
  const workflowRecord = workflowById.get(record.IDBAT)
  if (!workflowRecord) throw new Error(`Missing workflow record #${record.IDBAT}`)
  if (workflowRecord.mapWriteRecommendation !== 'yes') continue

  const feature = featureBySourceRecordId.get(record.IDBAT)
  if (!feature) throw new Error(`Missing landmark feature for Virtual Shanghai #${record.IDBAT}`)
  const properties = feature.properties
  const mixedEvidenceIds = (properties.sourceRecordIds ?? []).filter((sourceRecordId) => {
    const groupedRecord = workflowById.get(sourceRecordId)
    return groupedRecord && groupedRecord.mapWriteRecommendation !== 'yes'
  })
  if (mixedEvidenceIds.length) {
    skipped.push({
      IDBAT: record.IDBAT,
      featureGroupId: properties.featureGroupId,
      reason: `mixed-evidence group also contains #${mixedEvidenceIds.join(', #')}`,
    })
    continue
  }
  if (existingGroups.has(properties.featureGroupId)) {
    skipped.push({
      IDBAT: record.IDBAT,
      featureGroupId: properties.featureGroupId,
      reason: 'override already exists',
    })
    continue
  }

  const currentUseRelationship = relationshipMap.get(record.relationship)
  if (!currentUseRelationship) {
    throw new Error(`Unsupported relationship for #${record.IDBAT}: ${record.relationship}`)
  }
  const researchSources = record.references.filter(
    (reference) => !reference.url.includes('virtualshanghai.net'),
  )
  if (!researchSources.length) throw new Error(`Verified record #${record.IDBAT} lacks a research source`)

  overrides.push({
    featureGroupId: properties.featureGroupId,
    sourceRecordIds: [record.IDBAT],
    expectedHistoricalNames: [record.NAME],
    currentUseRelationship,
    currentUse: record.currentUse,
    currentNameZh: record.currentNameZh,
    currentAddress: record.currentAddress,
    currentUseSourceUri: researchSources[0].url,
    currentUseSources: researchSources.map(({ title, url }) => ({ title, url })),
    currentUseNote: record.notes,
    evidence: record.notes,
  })
  existingGroups.add(properties.featureGroupId)
  added.push({ IDBAT: record.IDBAT, featureGroupId: properties.featureGroupId })
}

await fs.writeFile(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`, 'utf8')
console.log(`Added ${added.length} current-use overrides from research batch ${chunk}.`)
console.log(`Added IDs: ${added.map((item) => item.IDBAT).join(', ') || 'none'}`)
if (skipped.length) console.log(`Skipped: ${JSON.stringify(skipped)}`)
