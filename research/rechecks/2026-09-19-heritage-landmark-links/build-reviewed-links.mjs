import fs from 'node:fs'
import crypto from 'node:crypto'

const directory = 'research/rechecks/2026-09-19-heritage-landmark-links'
const candidates = JSON.parse(fs.readFileSync(`${directory}/candidates.json`, 'utf8'))
const review = JSON.parse(fs.readFileSync(`${directory}/second-review.json`, 'utf8'))
if (crypto.createHash('sha256').update(fs.readFileSync(`${directory}/candidates.json`)).digest('hex') !== review.input.sha256) {
  throw new Error('Candidate audit changed after the independent review')
}
for (const { path, sha256 } of Object.values(candidates.methodology.inputs)) {
  if (crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex') !== sha256) {
    throw new Error(`Reviewed input changed; recheck its identities before rebuilding: ${path}`)
  }
}
const accepted = review.reviews.filter((item) => item.decision.startsWith('accept-'))
const usedOfficialIds = new Set()
const usedLandmarkIds = new Set()
const relations = new Set(['same-listed-building', 'same-listed-complex', 'same-listed-structure'])
const sourceTitles = new Map((review.supplementalSources ?? []).map((source) => [source.url, source.title]))
const links = accepted.map((item) => {
  const candidate = candidates.candidates.find((entry) => entry.candidateId === item.candidateId)
  if (!candidate) throw new Error(`Accepted identity is missing from full audit: ${item.candidateId}`)
  const sortedIds = (ids) => [...new Set(ids)].sort((a, b) => a - b).join(',')
  if (candidate.heritage.officialId !== item.officialId
    || sortedIds(candidate.landmark.sourceRecordIds) !== sortedIds(item.sourceRecordIds)) {
    throw new Error(`Reviewed membership differs from candidate: ${item.candidateId}`)
  }
  if (!candidate.heritage.coordinate || !relations.has(item.relation)) throw new Error(`Unresolved point or scope: ${item.candidateId}`)
  if (usedOfficialIds.has(item.officialId) || usedLandmarkIds.has(candidate.landmark.featureId)) {
    throw new Error(`Competing identity: ${item.candidateId}`)
  }
  usedOfficialIds.add(item.officialId)
  usedLandmarkIds.add(candidate.landmark.featureId)
  const uniqueUrls = [...new Set([...(item.sourceUrls ?? []), ...(item.supplementalSourceUrls ?? [])])]
  return {
    id: item.candidateId,
    officialId: item.officialId,
    landmarkFeatureId: candidate.landmark.featureId,
    expectedSourceRecordIds: candidate.landmark.sourceRecordIds,
    historicalAddresses: candidate.landmark.historicalAddresses.map(({ sourceRecordId, address, sourceUrl }) => ({ sourceRecordId, address, sourceUrl })),
    relation: item.relation,
    ...(item.scopeNote ? { scopeNote: item.scopeNote } : {}),
    note: item.displayNote || item.reason,
    // The card already includes each original VS record and the official /
    // Wikipedia listing. Add the independent identity evidence here.
    sources: uniqueUrls.filter((url) => !/virtualshanghai\.net|fgj\.sh\.gov\.cn\/yxlsjz\/|wikipedia\.org/.test(url))
      .map((url) => ({ title: sourceTitles.get(url) || '建筑名称与地址沿革资料', url })),
  }
})

const output = `import type { HeritageLandmarkLink } from '../lib/heritageLandmarkLinks'\n\n// Explicit reviewed identities; see ${directory}/README.md.\n// Rebuild with: node ${directory}/build-reviewed-links.mjs\nexport const heritageLandmarkLinks: HeritageLandmarkLink[] = ${JSON.stringify(links, null, 2)}\n`
const file = 'src/data/heritageLandmarkLinks.ts'
if (process.argv.includes('--check')) {
  if (fs.readFileSync(file, 'utf8') !== output) throw new Error('Reviewed display configuration differs from the review')
} else fs.writeFileSync(file, output)
console.log(`${process.argv.includes('--check') ? 'Verified' : 'Wrote'} ${links.length} reviewed heritage–landmark links`)
