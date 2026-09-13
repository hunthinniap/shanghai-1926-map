import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { loadExternalResearch, externalResearchExclusions } from './external-research.mjs'

const run = promisify(execFile)
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const json = (value) => `${JSON.stringify(value, null, 2)}\n`
const inputRecord = (IDBAT) => ({ IDBAT, NAME: `Place ${IDBAT}`, F_ADDRESS: null, FUNCTION: 'School', XC: 350000, YC: 3450000 })

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'external-research-test-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const directory = path.join(root, 'research/external/fixture')
  await fs.mkdir(directory, { recursive: true })
  const input = [1, 2, 3].map(inputRecord)
  input[0].extraHistoricalField = { spelling: '保留原值' }
  const results = input.map(({ IDBAT }) => ({
    IDBAT, currentNameZh: null, currentAddress: null, currentUse: null, relationship: null,
    verificationStatus: IDBAT === 2 ? 'likely' : 'unresolved',
    notes: IDBAT === 2 ? '待核：原点范围。' : '没有建立可靠对应。', sources: [],
  }))
  const evidence = {
    researchedAt: '2026-09-11', recordCount: 3, inputIds: [1, 2, 3], inputSha256: sha256(json(input)),
    records: input.map((record, i) => ({
      IDBAT: record.IDBAT, originalInput: record,
      conclusion: results[i].notes, verificationStatus: results[i].verificationStatus,
      researchProgress: { status: ['completed', 'partial', 'not-started'][i] },
      mapWriteRecommendation: i === 1 ? 'review' : 'no', sourceReviews: [],
    })),
  }
  const manifest = { schemaVersion: 1, id: 'fixture', recordCount: 3, inputSha256: evidence.inputSha256, files: {} }
  for (const [name, bytes] of Object.entries({ 'input.json': json(input), 'results.json': json(results), 'evidence.json': json(evidence), 'review.md': '测试归档\n' })) {
    await fs.writeFile(path.join(directory, name), bytes)
    manifest.files[name] = { sha256: sha256(bytes), bytes: Buffer.byteLength(bytes) }
  }
  await fs.writeFile(path.join(directory, 'manifest.json'), json(manifest))
  await fs.writeFile(path.join(root, 'research/external/index.json'), json({ schemaVersion: 1, archives: ['research/external/fixture/manifest.json'] }))
  return { root, directory, manifest, evidence }
}

test('external research preserves original fields and reserves only started investigations', async (t) => {
  const { root } = await fixture(t)
  const archives = await loadExternalResearch(root)
  assert.deepEqual(archives[0].evidence.records[0].originalInput.extraHistoricalField, { spelling: '保留原值' })
  const { researchedIds, reservedIds } = externalResearchExclusions(archives)
  assert.deepEqual([...researchedIds], [1])
  assert.deepEqual([...reservedIds], [2])
})

test('registration rejects altered originals even when an evidence checksum is refreshed', async (t) => {
  const { root, directory, manifest, evidence } = await fixture(t)
  await fs.appendFile(path.join(directory, 'results.json'), '\n')
  await assert.rejects(loadExternalResearch(root), /results.json archive checksum mismatch/u)
  const resultBytes = await fs.readFile(path.join(directory, 'results.json'))
  manifest.files['results.json'] = { sha256: sha256(resultBytes), bytes: resultBytes.length }
  evidence.records[0].originalInput.extraHistoricalField.spelling = '被改写'
  const evidenceBytes = json(evidence)
  await fs.writeFile(path.join(directory, 'evidence.json'), evidenceBytes)
  manifest.files['evidence.json'] = { sha256: sha256(evidenceBytes), bytes: Buffer.byteLength(evidenceBytes) }
  await fs.writeFile(path.join(directory, 'manifest.json'), json(manifest))
  await assert.rejects(loadExternalResearch(root), /#1 original input mismatch/u)
})

test('progress and new batches join immutable IDs across renumbered current chunks', async (t) => {
  const { root } = await fixture(t)
  for (const directory of ['scripts/lib', 'scripts/data', 'public/data/unresolved-landmarks', 'research/unresolved-landmarks']) {
    await fs.mkdir(path.join(root, directory), { recursive: true })
  }
  for (const filename of ['lib/external-research.mjs', 'research-progress.mjs', 'prepare-unresolved-research-batch.mjs']) {
    await fs.copyFile(new URL(`../${filename}`, import.meta.url), path.join(root, 'scripts', filename))
  }
  await fs.writeFile(path.join(root, 'public/data/unresolved-landmarks/029.json'), json(Array.from({ length: 54 }, (_, i) => inputRecord(i + 1))))
  await fs.writeFile(path.join(root, 'scripts/data/unresolved-landmarks-001-research.json'), json({ records: [{ IDBAT: 54, resolutionStatus: 'unresolved' }] }))
  await fs.writeFile(path.join(root, 'research/unresolved-landmarks/001-input.json'), json([inputRecord(53)]))
  await run(process.execPath, [path.join(root, 'scripts/research-progress.mjs')])
  const progress = JSON.parse(await fs.readFile(path.join(root, 'research/progress.json'), 'utf8'))
  assert.equal(progress.summary.allIdsWithResearchRecords, 3)
  assert.equal(progress.summary.externalNewResearchIds, 2)
  assert.equal(progress.summary.currentChunkRecordsReservedWithoutResults, 1)
  assert.equal(progress.summary.currentChunkRecordsNotYetInvestigatedOrReserved, 50)
  assert.deepEqual(progress.chunks[0].externalResearchProgress, { completed: 1, partial: 1, 'not-started': 1 })
  await run(process.execPath, [path.join(root, 'scripts/prepare-unresolved-research-batch.mjs'), '002'])
  const output = path.join(root, 'research/unresolved-landmarks/002-input.json')
  const bytes = await fs.readFile(output, 'utf8')
  assert.deepEqual(JSON.parse(bytes).map((record) => record.IDBAT), Array.from({ length: 50 }, (_, i) => i + 3))
  await assert.rejects(run(process.execPath, [path.join(root, 'scripts/prepare-unresolved-research-batch.mjs'), '002']), /stable research snapshots are never overwritten/u)
  assert.equal(await fs.readFile(output, 'utf8'), bytes)
})
