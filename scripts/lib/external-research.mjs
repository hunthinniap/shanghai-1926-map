import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'

const resultKeys = ['IDBAT', 'currentNameZh', 'currentAddress', 'currentUse', 'relationship', 'verificationStatus', 'notes', 'sources'].sort()
const progressStatuses = new Set(['completed', 'partial', 'not-started'])
const statusPairs = new Set(['verified:yes', 'verified:review', 'likely:review', 'unresolved:no'])

export async function loadExternalResearch(projectRoot) {
  const indexPath = path.join(projectRoot, 'research', 'external', 'index.json')
  let index
  try {
    index = JSON.parse(await fs.readFile(indexPath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  if (index.schemaVersion !== 1 || !Array.isArray(index.archives)) throw new Error('Invalid external research index')
  const archives = []
  const archiveIds = new Set()
  for (const manifestFile of index.archives) {
    const manifestPath = path.resolve(projectRoot, manifestFile)
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
    const fail = (message) => { throw new Error(`External research ${manifest.id}: ${message}`) }
    if (manifest.schemaVersion !== 1 || !manifest.id || archiveIds.has(manifest.id)) fail('invalid or duplicate archive id')
    archiveIds.add(manifest.id)
    const contents = {}
    for (const name of ['input.json', 'results.json', 'evidence.json', 'review.md']) {
      const bytes = await fs.readFile(path.join(path.dirname(manifestPath), name))
      const hash = createHash('sha256').update(bytes).digest('hex')
      if (hash !== manifest.files?.[name]?.sha256 || bytes.length !== manifest.files?.[name]?.bytes) fail(`${name} archive checksum mismatch`)
      contents[name] = name.endsWith('.json') ? JSON.parse(bytes.toString('utf8')) : bytes.toString('utf8')
    }
    const input = contents['input.json']
    const results = contents['results.json']
    const evidence = contents['evidence.json']
    if (!Array.isArray(input) || !Array.isArray(results) || !Array.isArray(evidence.records)) fail('records must be arrays')
    const ids = input.map((record) => record.IDBAT)
    if (new Set(ids).size !== ids.length || ids.some((id) => !Number.isInteger(id))) fail('input IDs must be unique integers')
    if (manifest.recordCount !== ids.length || evidence.recordCount !== ids.length) fail('record count mismatch')
    if (evidence.inputSha256 !== manifest.files['input.json'].sha256 || manifest.inputSha256 !== evidence.inputSha256) fail('input snapshot hash mismatch')
    for (const candidate of [results.map((record) => record.IDBAT), evidence.records.map((record) => record.IDBAT), evidence.inputIds]) {
      if (!isDeepStrictEqual(candidate, ids)) fail('ID order or coverage mismatch')
    }
    for (let i = 0; i < ids.length; i += 1) {
      const result = results[i]
      const record = evidence.records[i]
      if (!isDeepStrictEqual(Object.keys(result).sort(), resultKeys)) fail(`#${ids[i]} results schema mismatch`)
      if (!isDeepStrictEqual(record.originalInput, input[i])) fail(`#${ids[i]} original input mismatch`)
      if (record.conclusion !== result.notes || record.verificationStatus !== result.verificationStatus) fail(`#${ids[i]} conclusion/status mismatch`)
      if (!progressStatuses.has(record.researchProgress?.status)) fail(`#${ids[i]} invalid research progress`)
      if (!statusPairs.has(`${record.verificationStatus}:${record.mapWriteRecommendation}`)) fail(`#${ids[i]} invalid status combination`)
      if (record.mapWriteRecommendation === 'review' && !result.notes.includes('待核')) fail(`#${ids[i]} missing review caveat`)
      const sourceUrls = new Set(record.sourceReviews.map((source) => source.url))
      const citedUrls = [...result.sources.map((source) => source.url), ...Object.values(record.fieldFindings ?? {}).flatMap((finding) => finding.sourceUrls ?? [])]
      if (citedUrls.some((url) => !sourceUrls.has(url))) fail(`#${ids[i]} missing source review`)
    }
    const supplementalReview = manifest.supplementalReview
      ? JSON.parse(await fs.readFile(path.join(path.dirname(manifestPath), manifest.supplementalReview), 'utf8'))
      : null
    if (supplementalReview?.followUpQueue?.some((record) => !ids.includes(record.IDBAT))) fail('follow-up ID outside input snapshot')
    archives.push({ manifest, manifestFile, input, results, evidence, supplementalReview })
  }
  return archives
}

export function externalResearchExclusions(archives) {
  const researchedIds = new Set()
  const reservedIds = new Set()
  for (const archive of archives) {
    for (const record of archive.evidence.records) {
      if (record.researchProgress.status === 'completed') researchedIds.add(record.IDBAT)
      if (record.researchProgress.status === 'partial') reservedIds.add(record.IDBAT)
    }
  }
  return { researchedIds, reservedIds }
}
