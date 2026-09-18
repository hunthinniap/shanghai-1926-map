import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual, promisify } from 'node:util'

const run = promisify(execFile)
const projectRoot = fileURLToPath(new URL('../../../', import.meta.url))
const outputPath = fileURLToPath(new URL('./compilation-validation.json', import.meta.url))
const batches = ['001', '007', '008', '009', '010']
const compilerPath = 'scripts/compile-unresolved-research.mjs'
const coordinatePath = 'scripts/lib/coordinate-systems.mjs'
const livePath = 'scripts/data/virtual-shanghai-buildings-live.json'
const approvedPlanPath = 'research/corrections/2026-09-18-001-010/a-plan.json'
const resultPath = (batch) => `research/unresolved-landmarks/${batch}-results.json`
const workflowPath = (batch) => `scripts/data/unresolved-landmarks-${batch}-research.json`
const inputPaths = batches.flatMap((batch) => ['input', 'a', 'b', 'c']
  .map((part) => `research/unresolved-landmarks/${batch}-${part}.json`))
const observedPaths = [compilerPath, coordinatePath, livePath, approvedPlanPath, ...inputPaths,
  ...batches.flatMap((batch) => [resultPath(batch), workflowPath(batch)])]
const bytesByPath = new Map(await Promise.all(observedPaths.map(async (relativePath) =>
  [relativePath, await fs.readFile(path.join(projectRoot, relativePath))])))
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const beforeHashes = Object.fromEntries([...bytesByPath].map(([name, bytes]) => [name, digest(bytes)]))
const parseOriginal = (name) => JSON.parse(bytesByPath.get(name).toString('utf8'))
const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'shanghai-compilation-validation-'))
const report = {
  generatedAt: new Date().toISOString(),
  scope: batches,
  method: 'Compile copies in a temporary workspace, then compare complete records by IDBAT. Only record order and all top-level metadata/date fields are ignored. Reference-array order, values, null/missing distinctions and record fields are compared exactly.',
  temporaryWorkspace: { path: temporaryRoot, removed: false, historicalMapCopied: false },
  sourceFileHashes: beforeHashes,
  copiedDependencies: [],
  batches: [],
  specialChecks: [],
  originalFilesUnchanged: false,
  changedOriginalFiles: [],
  status: 'pending',
}

function compareRecords(batch, kind, expected, actual) {
  const differences = []
  const expectedById = new Map(expected.map((record) => [record.IDBAT, record]))
  const actualById = new Map(actual.map((record) => [record.IDBAT, record]))
  if (expectedById.size !== expected.length || actualById.size !== actual.length) {
    differences.push({ batch, kind, field: 'IDBAT', problem: 'Duplicate IDs in expected or compiled records' })
  }
  for (const id of new Set([...expectedById.keys(), ...actualById.keys()])) {
    const original = expectedById.get(id)
    const compiled = actualById.get(id)
    if (!original || !compiled) {
      differences.push({ batch, kind, IDBAT: id, problem: original ? 'Missing compiled record' : 'Unexpected compiled record' })
      continue
    }
    for (const key of new Set([...Object.keys(original), ...Object.keys(compiled)])) {
      if (!isDeepStrictEqual(original[key], compiled[key]) ||
          Object.hasOwn(original, key) !== Object.hasOwn(compiled, key)) {
        differences.push({
          batch, kind, IDBAT: id, field: key,
          expectedPresent: Object.hasOwn(original, key), compiledPresent: Object.hasOwn(compiled, key),
          expected: original[key] ?? null, compiled: compiled[key] ?? null,
        })
      }
    }
  }
  return { expectedRecordCount: expected.length, compiledRecordCount: actual.length,
    comparedFields: [...new Set([...expected, ...actual].flatMap(Object.keys))].sort(), differences }
}

try {
  for (const relativePath of [compilerPath, coordinatePath, livePath, ...inputPaths]) {
    const destination = path.join(temporaryRoot, relativePath)
    await fs.mkdir(path.dirname(destination), { recursive: true })
    await fs.writeFile(destination, bytesByPath.get(relativePath))
  }
  await fs.writeFile(path.join(temporaryRoot, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
  const copied = new Set()
  async function copyDependency(name, resolver) {
    const packageFile = resolver.resolve(`${name}/package.json`)
    const manifest = JSON.parse(await fs.readFile(packageFile, 'utf8'))
    if (copied.has(name)) {
      const previous = report.copiedDependencies.find((entry) => entry.name === name)
      if (previous.version !== manifest.version) throw new Error(`Conflicting dependency versions for ${name}`)
      return
    }
    copied.add(name)
    const destination = path.join(temporaryRoot, 'node_modules', name)
    await fs.mkdir(path.dirname(destination), { recursive: true })
    await fs.cp(path.dirname(packageFile), destination, { recursive: true })
    report.copiedDependencies.push({ name, version: manifest.version })
    const dependencyResolver = createRequire(packageFile)
    for (const dependency of Object.keys(manifest.dependencies ?? {})) await copyDependency(dependency, dependencyResolver)
  }
  await copyDependency('proj4', createRequire(path.join(projectRoot, 'package.json')))

  for (const batch of batches) {
    const execution = await run(process.execPath, [path.join(temporaryRoot, compilerPath), batch], {
      cwd: temporaryRoot, timeout: 60_000, maxBuffer: 1024 * 1024,
    })
    const compiledResult = JSON.parse(await fs.readFile(path.join(temporaryRoot, resultPath(batch)), 'utf8'))
    const compiledWorkflow = JSON.parse(await fs.readFile(path.join(temporaryRoot, workflowPath(batch)), 'utf8'))
    const resultComparison = compareRecords(batch, 'result', parseOriginal(resultPath(batch)).records, compiledResult.records)
    const workflowComparison = compareRecords(batch, 'workflow', parseOriginal(workflowPath(batch)).records, compiledWorkflow.records)
    report.batches.push({ batch, stdout: execution.stdout.trim(), stderr: execution.stderr.trim(),
      result: resultComparison, workflow: workflowComparison,
      passed: resultComparison.differences.length === 0 && workflowComparison.differences.length === 0 })
    if (batch === '001') {
      const byId = new Map(compiledWorkflow.records.map((record) => [record.IDBAT, record]))
      const approved538 = parseOriginal(approvedPlanPath).records.find((record) => record.IDBAT === 538).workflowPatch.sourceDataIssue
      report.specialChecks.push(
        { IDBAT: 241, field: 'outcomeCategory', expected: 'demolished-current-use',
          actual: byId.get(241)?.outcomeCategory, passed: byId.get(241)?.outcomeCategory === 'demolished-current-use' },
        { IDBAT: 538, field: 'sourceDataIssue', expected: approved538,
          actual: byId.get(538)?.sourceDataIssue, passed: byId.get(538)?.sourceDataIssue === approved538 },
        { IDBAT: 569, field: 'mapWriteRecommendation', expected: 'yes',
          actual: byId.get(569)?.mapWriteRecommendation, passed: byId.get(569)?.mapWriteRecommendation === 'yes' },
      )
    }
  }
} catch (error) {
  report.error = { message: error.message, stdout: error.stdout ?? null, stderr: error.stderr ?? null }
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true })
  report.temporaryWorkspace.removed = true
  for (const relativePath of observedPaths) {
    const currentHash = await fs.readFile(path.join(projectRoot, relativePath)).then(digest).catch(() => null)
    if (currentHash !== beforeHashes[relativePath]) report.changedOriginalFiles.push(relativePath)
  }
  report.originalFilesUnchanged = report.changedOriginalFiles.length === 0
  report.summary = {
    batchesCompared: report.batches.length,
    resultRecordsCompared: report.batches.reduce((count, batch) => count + batch.result.expectedRecordCount, 0),
    workflowRecordsCompared: report.batches.reduce((count, batch) => count + batch.workflow.expectedRecordCount, 0),
    differenceCount: report.batches.reduce((count, batch) => count + batch.result.differences.length + batch.workflow.differences.length, 0),
    failedSpecialChecks: report.specialChecks.filter((check) => !check.passed).length,
  }
  report.status = !report.error && report.batches.length === batches.length && report.batches.every((batch) => batch.passed) &&
    report.specialChecks.length === 3 && report.specialChecks.every((check) => check.passed) && report.originalFilesUnchanged ? 'passed' : 'failed'
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
}
console.log(JSON.stringify({ status: report.status, ...report.summary, originalFilesUnchanged: report.originalFilesUnchanged, output: outputPath }, null, 2))
if (report.status !== 'passed') process.exitCode = 1
