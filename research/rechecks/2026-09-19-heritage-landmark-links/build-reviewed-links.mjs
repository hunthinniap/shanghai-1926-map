import fs from 'node:fs'
import crypto from 'node:crypto'

const directory = 'research/rechecks/2026-09-19-heritage-landmark-links'
const candidateDocument = JSON.parse(fs.readFileSync(`${directory}/candidates.json`, 'utf8'))
const reviewFiles = ['second-review.json', 'continuation-notes/review.json', '../2026-09-20-heritage-card-review/review.json']
const reviewDocuments = reviewFiles.map((file) => JSON.parse(fs.readFileSync(`${directory}/${file}`, 'utf8')))
const candidateHash = crypto.createHash('sha256').update(fs.readFileSync(`${directory}/candidates.json`)).digest('hex')
for (const review of reviewDocuments) {
  if (candidateHash !== review.input.sha256) throw new Error('Candidate audit changed after a review')
  for (const { path, sha256 } of review.baselineFiles ?? []) {
    if (crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex') !== sha256) {
      throw new Error(`Earlier review changed after the follow-up: ${path}`)
    }
  }
}
for (const { path, sha256 } of Object.values(candidateDocument.methodology.inputs)) {
  if (crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex') !== sha256) {
    throw new Error(`Reviewed input changed; recheck its identities before rebuilding: ${path}`)
  }
}
const supplementalCandidateDocuments = new Map()
for (const review of reviewDocuments) for (const input of review.supplementalCandidateInputs ?? []) {
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(input.path)).digest('hex')
  if (actualHash !== input.sha256) throw new Error(`Supplemental candidate audit changed after review: ${input.path}`)
  if (!supplementalCandidateDocuments.has(input.path)) {
    supplementalCandidateDocuments.set(input.path, JSON.parse(fs.readFileSync(input.path, 'utf8')))
  }
}
const allCandidates = [candidateDocument, ...supplementalCandidateDocuments.values()]
  .flatMap((document) => document.candidates)
if (new Set(allCandidates.map((candidate) => candidate.candidateId)).size !== allCandidates.length) {
  throw new Error('Duplicate candidate across automatic and supplemental audits')
}
const decisionsById = new Map()
for (const document of reviewDocuments) for (const item of document.reviews) {
  const earlier = decisionsById.get(item.candidateId)
  if (earlier && (!item.supersedes || item.supersedes.decision !== earlier.decision
    || item.supersedes.reason !== earlier.reason)) {
    throw new Error(`Earlier decision needs an explicit, matching supersedes record: ${item.candidateId}`)
  }
  if (!earlier && item.supersedes) throw new Error(`Missing earlier decision: ${item.candidateId}`)
  decisionsById.set(item.candidateId, item)
}
const reviews = [...decisionsById.values()]
const accepted = reviews.filter((item) => item.decision.startsWith('accept-'))
const usedOfficialIds = new Set()
const usedLandmarkIds = new Set()
const relations = new Set(['same-listed-building', 'same-listed-complex', 'same-listed-structure', 'same-historical-site', 'component-of-listed-complex', 'nearby-residential-context', 'nearby-campus-context'])
const sourceTitles = new Map(reviewDocuments.flatMap((review) => review.supplementalSources ?? []).map((source) => [source.url, source.title]))
const individualLinks = accepted.map((item) => {
  const candidate = allCandidates.find((entry) => entry.candidateId === item.candidateId)
  if (!candidate) throw new Error(`Accepted identity is missing from full audit: ${item.candidateId}`)
  const sortedIds = (ids) => [...new Set(ids)].sort((a, b) => a - b).join(',')
  if (candidate.heritage.officialId !== item.officialId
    || sortedIds(candidate.landmark.sourceRecordIds) !== sortedIds(item.sourceRecordIds)) {
    throw new Error(`Reviewed membership differs from candidate: ${item.candidateId}`)
  }
  if (!candidate.heritage.coordinate || !relations.has(item.relation)) throw new Error(`Unresolved point or scope: ${item.candidateId}`)
  const siblings = accepted.filter((review) => review.officialId === item.officialId)
  const sharedCard = siblings.length > 1 && siblings.every((review) => review.cardGroup === item.officialId)
    && siblings.filter((review) => review.cardPrimary).length === 1
  if (item.cardGroup && !sharedCard) throw new Error(`Incomplete shared card: ${item.candidateId}`)
  const heritageSiblings = item.heritageGroup
    ? accepted.filter((review) => review.heritageGroup === item.heritageGroup) : []
  const sharedHeritageCard = heritageSiblings.length > 1
    && heritageSiblings.every((review) => review.heritageGroup === candidate.landmark.featureId)
    && heritageSiblings.filter((review) => review.heritagePrimary).length === 1
    && new Set(heritageSiblings.map((review) => review.officialId)).size === heritageSiblings.length
    && new Set(heritageSiblings.map((review) => review.relation)).size === 1
  if (item.heritageGroup && !sharedHeritageCard) throw new Error(`Incomplete multi-listing card: ${item.candidateId}`)
  if ((usedOfficialIds.has(item.officialId) && !sharedCard)
    || (usedLandmarkIds.has(candidate.landmark.featureId) && !sharedHeritageCard)) {
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
    ...(item.modernAddress ? { modernAddress: item.modernAddress } : {}),
    ...((item.aliases?.length || item.relation === 'nearby-residential-context') ? {
      aliases: [...new Set([
        ...(item.aliases ?? []),
        ...(item.relation === 'nearby-residential-context'
          ? candidate.landmark.historicalAddresses.map((address) => address.address) : []),
      ])],
    } : {}),
    ...(item.currentUseHoldRetained ? { currentUseHoldRetained: true } : {}),
    ...(item.relation === 'nearby-residential-context' ? { nearbyResidentialContext: true } : {}),
    relation: item.relation,
    ...(item.scopeNote ? { scopeNote: item.scopeNote } : {}),
    note: item.displayNote || item.reason,
    // The card already includes each original VS record and the official /
    // Wikipedia listing. Add the independent identity evidence here.
    sources: uniqueUrls.filter((url) => !/virtualshanghai\.net|fgj\.sh\.gov\.cn\/yxlsjz\//.test(url))
      .map((url) => ({ title: sourceTitles.get(url) || '建筑名称与地址沿革资料', url })),
  }
})
const landmarkCollapsedLinks = individualLinks.filter((link) => {
  const review = decisionsById.get(link.id)
  return !review.cardGroup || review.cardPrimary
}).map((link) => {
  const extra = individualLinks.filter((other) => other.officialId === link.officialId && other.id !== link.id)
  if (!extra.length) return link
  const hasNearbyResidentialContext = [link, ...extra].some((other) => other.nearbyResidentialContext)
  const mixedReviewedIdentity = hasNearbyResidentialContext && [link, ...extra]
    .some((other) => !other.nearbyResidentialContext)
  return { ...link,
    additionalLandmarks: extra.map((other) => ({ landmarkFeatureId: other.landmarkFeatureId, expectedSourceRecordIds: other.expectedSourceRecordIds })),
    historicalAddresses: [link, ...extra].flatMap((other) => other.historicalAddresses),
    ...([link, ...extra].some((other) => other.aliases?.length)
      ? { aliases: [...new Set([link, ...extra].flatMap((other) => other.aliases ?? []))] } : {}),
    sources: [...new Map([link, ...extra].flatMap((other) => other.sources).map((source) => [source.url, source])).values()],
    ...(hasNearbyResidentialContext ? {
      nearbyResidentialContext: true,
      scopeNote: mixedReviewedIdentity
        ? '其中具名记录与名录项按原核定关系保留；无名 Apartment／Residential Complex 仅按同一新旧路名对应及125米内邻近位置归入本卡，不表示已核定为同一栋建筑。'
        : '无名 Apartment／Residential Complex 仅按同一新旧路名对应及125米内邻近位置归入本卡；各条原始门牌与年代分别保留，不表示已核定为同一栋建筑。',
    } : {}),
  }
})
const links = landmarkCollapsedLinks.filter((link) => {
  const review = decisionsById.get(link.id)
  return !review.heritageGroup || review.heritagePrimary
}).map((link) => {
  const review = decisionsById.get(link.id)
  if (!review.heritageGroup) return link
  const extra = landmarkCollapsedLinks.filter((other) => other.id !== link.id
    && decisionsById.get(other.id).heritageGroup === review.heritageGroup)
  return {
    ...link,
    additionalHeritageOfficialIds: extra.map((other) => other.officialId),
    historicalAddresses: [...new Map([link, ...extra].flatMap((other) => other.historicalAddresses)
      .map((address) => [`${address.sourceRecordId}|${address.address}`, address])).values()],
    ...([link, ...extra].some((other) => other.aliases?.length)
      ? { aliases: [...new Set([link, ...extra].flatMap((other) => other.aliases ?? []))] } : {}),
    sources: [...new Map([link, ...extra].flatMap((other) => other.sources)
      .map((source) => [source.url, source])).values()],
  }
})

const output = `import type { HeritageLandmarkLink } from '../lib/heritageLandmarkLinks'\n\n// Explicit reviewed identities; see ${directory}/README.md.\n// Rebuild with: node ${directory}/build-reviewed-links.mjs\nexport const heritageLandmarkLinks: HeritageLandmarkLink[] = ${JSON.stringify(links, null, 2)}\n`
const file = 'src/data/heritageLandmarkLinks.ts'
const manifest = {
  schemaVersion: 2,
  reviewedAt: reviewDocuments.at(-1).reviewedAt,
  input: reviewDocuments[0].input,
  reviewFiles: reviewFiles.map((path) => ({
    path: `${directory}/${path}`,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(`${directory}/${path}`)).digest('hex'),
  })),
  summary: {
    reviewed: reviews.length,
    accepted: accepted.length,
    acceptedBuildings: accepted.filter((item) => item.relation === 'same-listed-building').length,
    acceptedComplexes: accepted.filter((item) => item.relation === 'same-listed-complex').length,
    acceptedStructures: accepted.filter((item) => item.relation === 'same-listed-structure').length,
    acceptedHistoricalSites: accepted.filter((item) => item.relation === 'same-historical-site').length,
    acceptedComponents: accepted.filter((item) => item.relation === 'component-of-listed-complex').length,
    acceptedNearbyResidentialContexts: accepted.filter((item) => item.relation === 'nearby-residential-context').length,
    acceptedNearbyCampusContexts: accepted.filter((item) => item.relation === 'nearby-campus-context').length,
    sharedCards: links.length,
    notApplied: reviews.length - accepted.length,
  },
  applied: accepted.map((item) => {
    const candidate = allCandidates.find((entry) => entry.candidateId === item.candidateId)
    return {
      candidateId: item.candidateId, sourceRecordIds: item.sourceRecordIds, officialId: item.officialId,
      relation: item.relation, scopeNote: item.scopeNote,
      ...(item.aliases?.length ? { aliases: item.aliases } : {}),
      oldAddresses: candidate.landmark.historicalAddresses, newAddress: item.modernAddress?.address || candidate.heritage.address,
      ...(item.modernAddress ? { listedAddress: candidate.heritage.address, modernAddressSource: item.modernAddress } : {}),
      originalCoordinate: candidate.landmark.coordinate, displayCoordinate: candidate.heritage.coordinate,
      coordinateSystem: 'WGS84', coordinateScope: candidate.heritage.coordinateScope,
    }
  }),
  notApplied: reviews.filter((item) => !item.decision.startsWith('accept-')).map((item) => ({
    candidateId: item.candidateId, sourceRecordIds: item.sourceRecordIds, officialId: item.officialId,
    decision: item.decision, reason: item.reason,
  })),
  remainingUnreviewedPairs: allCandidates.length - reviews.length,
}
for (const [path, content] of [[file, output], [`${directory}/applied-links.json`, JSON.stringify(manifest, null, 2) + '\n']]) {
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(path, 'utf8') !== content) throw new Error(`Reviewed output differs from the review: ${path}`)
  } else fs.writeFileSync(path, content)
}
console.log(`${process.argv.includes('--check') ? 'Verified' : 'Wrote'} ${links.length} reviewed heritage–landmark links`)
