import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const directory = path.dirname(fileURLToPath(import.meta.url))
const parent = path.dirname(directory)
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const sha = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const candidateFile = path.join(parent, 'candidates.json')
const candidates = read(candidateFile)
const baseline = read(path.join(parent, 'second-review.json'))
const root = read(path.join(directory, 'review-root.json'))
if (root.input.sha256 !== sha(candidateFile) || baseline.input.sha256 !== sha(candidateFile)) {
  throw new Error('Candidate snapshot differs from the reviewed inputs')
}

const parts = ['root', '0', '1', '2'].map((part) => {
  const inputFile = path.join(directory, `input-${part}.json`)
  const reviewFile = path.join(directory, `review-${part}.json`)
  const input = read(inputFile)
  const review = read(reviewFile)
  const inputIds = new Set(input.map((item) => item.candidateId))
  const reviewIds = new Set(review.reviews.map((item) => item.candidateId))
  if (inputIds.size !== input.length || reviewIds.size !== review.reviews.length
    || inputIds.size !== reviewIds.size || [...inputIds].some((id) => !reviewIds.has(id))) {
    throw new Error(`Missing, duplicate, or unassigned decision in part ${part}`)
  }
  for (const item of input) {
    const original = candidates.candidates.find((candidate) => candidate.candidateId === item.candidateId)
    if (JSON.stringify(original) !== JSON.stringify(item)) throw new Error(`Input snapshot drifted: ${item.candidateId}`)
  }
  return { part, review, inputSha256: sha(inputFile), reviewSha256: sha(reviewFile) }
})
const reviews = parts.flatMap(({ review }) => review.reviews)
const allIds = [...baseline.reviews, ...reviews].map((item) => item.candidateId)
if (new Set(allIds).size !== allIds.length) throw new Error('Continuation overlaps another part or an earlier decision')
const accepted = reviews.filter((item) => item.decision.startsWith('accept-'))
const supplementalSources = [...new Map(parts.flatMap(({ review }) => review.supplementalSources ?? [])
  .map((source) => [source.url, source])).values()]
const result = {
  schemaVersion: 1,
  reviewedAt: root.reviewedAt,
  status: 'complete-for-defined-inputs',
  input: root.input,
  baselineReviewSha256: sha(path.join(parent, 'second-review.json')),
  selectionPolicy: '108 previously unreviewed candidate pairs with existing same-building research, no persistent hold, nonempty VS source membership and an available heritage point; plus the two user-named churches and two competing Trinity listings. Existing notes are checked against their cited sources; a same-building flag alone does not authorize a merge.',
  methodology: root.methodology,
  parts: parts.map(({ part, inputSha256, reviewSha256 }) => ({
    input: `input-${part}.json`, inputSha256,
    review: `review-${part}.json`, reviewSha256,
  })),
  summary: {
    reviewed: reviews.length, accepted: accepted.length,
    acceptedBuildings: accepted.filter((item) => item.relation === 'same-listed-building').length,
    acceptedComplexes: accepted.filter((item) => item.relation === 'same-listed-complex').length,
    acceptedStructures: accepted.filter((item) => item.relation === 'same-listed-structure').length,
    held: reviews.length - accepted.length,
  },
  reviews,
  supplementalSources,
}
const output = JSON.stringify(result, null, 2) + '\n'
const file = path.join(directory, 'review.json')
if (process.argv.includes('--check')) {
  if (fs.readFileSync(file, 'utf8') !== output) throw new Error('Combined review differs from the reviewed parts')
} else fs.writeFileSync(file, output)
console.log(JSON.stringify(result.summary))
