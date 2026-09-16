import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadExternalResearch, externalResearchExclusions } from './lib/external-research.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const batch = process.argv[2]
if (!/^\d{3}$/u.test(batch ?? '')) {
  throw new Error('Usage: node scripts/prepare-unresolved-research-batch.mjs NNN')
}

const batchNumber = Number(batch)
if (batchNumber < 2) throw new Error('Batch 001 already has a dedicated stable snapshot')

const unresolvedDirectory = path.join(projectRoot, 'public', 'data', 'unresolved-landmarks')
const researchDataDirectory = path.join(projectRoot, 'scripts', 'data')
const outputDirectory = path.join(projectRoot, 'research', 'unresolved-landmarks')
const outputPath = path.join(outputDirectory, `${batch}-input.json`)
const excludedUtilityPath = path.join(outputDirectory, 'excluded-utility-records.json')

try {
  await fs.access(outputPath)
  throw new Error(`${path.relative(projectRoot, outputPath)} already exists; stable research snapshots are never overwritten`)
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

const unresolvedFilenames = (await fs.readdir(unresolvedDirectory))
  .filter((filename) => /^\d{3}\.json$/u.test(filename))
  .sort()
const unresolvedRecords = (await Promise.all(unresolvedFilenames.map((filename) =>
  fs.readFile(path.join(unresolvedDirectory, filename), 'utf8').then(JSON.parse),
))).flat()

// External reports use immutable ID snapshots, not the current numbered chunks.
// Partial investigations stay reserved for follow-up rather than being picked
// again as a new, unresearched batch. This does not approve any map writes.
const externalArchives = await loadExternalResearch(projectRoot)
const { researchedIds, reservedIds } = externalResearchExclusions(externalArchives)
// Utility records explicitly parked by the curator are retained in their
// original numbered chunks but are not selected for a future research batch.
try {
  const excluded = JSON.parse(await fs.readFile(excludedUtilityPath, 'utf8'))
  for (const record of excluded.records ?? []) {
    if (Number.isInteger(record.IDBAT)) researchedIds.add(record.IDBAT)
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
for (let number = 1; number < batchNumber; number += 1) {
  const priorBatch = String(number).padStart(3, '0')
  const filename = `unresolved-landmarks-${priorBatch}-research.json`
  const researchPath = path.join(researchDataDirectory, filename)
  try {
    const archive = JSON.parse(await fs.readFile(researchPath, 'utf8'))
    for (const record of archive.records ?? []) researchedIds.add(record.IDBAT)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  // Keep earlier stable batches reserved even when their research is unfinished.
  const priorInputPath = path.join(outputDirectory, `${priorBatch}-input.json`)
  try {
    const records = JSON.parse(await fs.readFile(priorInputPath, 'utf8'))
    for (const record of records) reservedIds.add(record.IDBAT)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

const selected = unresolvedRecords
  .filter((record) => !researchedIds.has(record.IDBAT) && !reservedIds.has(record.IDBAT))
  .slice(0, 50)
  .map(({ IDBAT, NAME, F_ADDRESS, FUNCTION, XC, YC }) => ({
    IDBAT,
    NAME,
    F_ADDRESS,
    FUNCTION,
    XC,
    YC,
  }))

if (selected.length !== 50) {
  throw new Error(`Expected 50 unresearched unresolved records, found ${selected.length}`)
}
if (new Set(selected.map((record) => record.IDBAT)).size !== selected.length) {
  throw new Error('Prepared research batch contains duplicate Virtual Shanghai IDs')
}

await fs.mkdir(outputDirectory, { recursive: true })
await fs.writeFile(outputPath, `${JSON.stringify(selected, null, 2)}\n`, 'utf8')
console.log(`Prepared ${selected.length} stable records in ${path.relative(projectRoot, outputPath)}.`)
console.log(`IDBAT: ${selected.map((record) => record.IDBAT).join(', ')}`)
