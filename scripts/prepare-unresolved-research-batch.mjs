import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

const researchedIds = new Set()
for (let number = 1; number < batchNumber; number += 1) {
  const filename = `unresolved-landmarks-${String(number).padStart(3, '0')}-research.json`
  const researchPath = path.join(researchDataDirectory, filename)
  try {
    const archive = JSON.parse(await fs.readFile(researchPath, 'utf8'))
    for (const record of archive.records ?? []) researchedIds.add(record.IDBAT)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

const selected = unresolvedRecords
  .filter((record) => !researchedIds.has(record.IDBAT))
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
