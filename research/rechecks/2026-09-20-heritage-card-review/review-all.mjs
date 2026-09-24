import fs from 'node:fs'
import crypto from 'node:crypto'
import { decisions, holds, modernAddresses, grouping, heritageGrouping } from './decisions.mjs'
import { reviewedAliases, supplementalSources } from './alias-followup.mjs'

const directory = 'research/rechecks/2026-09-20-heritage-card-review'
const baseline = 'research/rechecks/2026-09-19-heritage-landmark-links'
const read = (path) => JSON.parse(fs.readFileSync(path, 'utf8'))
const hash = (path) => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex')
const candidatePath = `${baseline}/candidates.json`
const data = read(candidatePath)
const supplementalCandidatePath = `${directory}/supplemental-candidates.json`
const supplementalData = read(supplementalCandidatePath)
for (const input of Object.values(data.methodology.inputs)) {
  if (hash(input.path) !== input.sha256) throw new Error(`Source changed; regenerate and review candidates: ${input.path}`)
}
for (const input of Object.values(supplementalData.methodology.inputs)) {
  if (hash(input.path) !== input.sha256) throw new Error(`Supplemental source changed; regenerate and review candidates: ${input.path}`)
}
const candidates = [...data.candidates, ...supplementalData.candidates]
if (new Set(candidates.map((candidate) => candidate.candidateId)).size !== candidates.length) {
  throw new Error('Duplicate automatic/supplemental candidate')
}
const baselineFiles = ['second-review.json', 'continuation-notes/review.json']
const previous = new Map(baselineFiles.flatMap((file) => read(`${baseline}/${file}`).reviews)
  .map((review) => [review.candidateId, review]))
for (const [code, ids] of Object.entries(grouping)) {
  const actual = decisions.filter((row) => row[1] === code).map((row) => row[0])
  if (ids.length < 2 || new Set(ids).size !== ids.length
    || actual.length !== ids.length || ids.some((id) => !actual.includes(id))) {
    throw new Error(`Incomplete shared-card membership: ${code}`)
  }
}
for (const [id, codes] of Object.entries(heritageGrouping)) {
  const numericId = Number(id)
  const actual = decisions.filter((row) => row[0] === numericId).map((row) => row[1])
  if (codes.length < 2 || new Set(codes).size !== codes.length
    || actual.length !== codes.length || codes.some((code) => !actual.includes(code))) {
    throw new Error(`Incomplete multi-listing card membership: ${id}`)
  }
}
function resolve(id, code) {
  const matches = candidates.filter((candidate) => candidate.landmark.sourceRecordIds.includes(id)
    && candidate.heritage.code === code)
  if (matches.length !== 1) throw new Error(`Ambiguous decision: ${id} / ${code}`)
  return matches[0]
}
const reviews = decisions.map(([id, code, relation, reason, sourceUrls, options = {}]) => {
  const candidate = resolve(id, code)
  if (candidate.landmark.persistentHolds.length && !options.allowCurrentUseHoldForHistoricalIdentity) {
    throw new Error(`Unresolved current-use hold: ${id}`)
  }
  if (!candidate.heritage.coordinate) throw new Error(`Missing heritage point: ${id}`)
  const earlier = previous.get(candidate.candidateId)
  return {
    candidateId: candidate.candidateId,
    sourceRecordIds: candidate.landmark.sourceRecordIds,
    officialId: candidate.heritage.officialId,
    officialCode: code,
    decision: 'accept-reviewed-site-card',
    ...(earlier ? { supersedes: { decision: earlier.decision, reason: earlier.reason } } : {}),
    relation, reason, displayNote: reason,
    scopeNote: options.scopeNote ?? (relation === 'nearby-campus-context' ? reason
      : relation === 'nearby-residential-context'
      ? '按同一新旧路名对应及125米内邻近住宅归并展示；未核定为同一栋建筑或同一建筑群，原始点、门牌和年代分别保留。'
      : relation === 'same-historical-site'
      ? '按同一地点的历史沿革合并展示；早期机构、原址建筑与现存楼体的年代分别保留。'
      : relation === 'same-listed-complex' || relation === 'component-of-listed-complex'
        ? reason : '对应名录所列建筑；原始门牌、各来源年代与历史用途分别保留。'),
    ...(grouping[code] ? { cardGroup: candidate.heritage.officialId,
      cardPrimary: grouping[code][0] === id } : {}),
    ...(heritageGrouping[id] ? { heritageGroup: candidate.landmark.featureId,
      heritagePrimary: heritageGrouping[id][0] === code } : {}),
    ...(modernAddresses[id] ? { modernAddress: modernAddresses[id] } : {}),
    ...(reviewedAliases[id] ? { aliases: reviewedAliases[id] } : {}),
    ...(candidate.landmark.persistentHolds.length ? { currentUseHoldRetained: true } : {}),
    sourceUrls: [...new Set([
      ...candidate.landmark.historicalAddresses.map((address) => address.sourceUrl),
      candidate.heritage.sourceReferences[0], ...sourceUrls,
    ])],
    evidenceMethod: relation === 'nearby-campus-context'
      ? 'reviewed-adjacent-school-campus-context-not-institutional-identity'
      : relation === 'nearby-residential-context'
      ? 'user-approved-same-road-nearby-residential-display-grouping'
      : sourceUrls.length ? 'named-building-and-address-history-review' : 'frozen-original-name-address-directory-crosscheck',
  }
})
for (const [id, code, reason, sourceUrls] of holds) {
  const candidate = resolve(id, code)
  if (previous.has(candidate.candidateId)) throw new Error(`Hold needs explicit supersedes: ${id}`)
  reviews.push({
    candidateId: candidate.candidateId, sourceRecordIds: candidate.landmark.sourceRecordIds,
    officialId: candidate.heritage.officialId, officialCode: code,
    decision: 'hold-identity-address-or-scope', reason, sourceUrls,
    evidenceMethod: 'source-conflict-and-building-scope-review',
  })
}
if (new Set(reviews.map((row) => row.candidateId)).size !== reviews.length) throw new Error('Duplicate review')
const updates = new Map(reviews.map((review) => [review.candidateId, review]))
const allDecisions = new Map([...previous, ...updates])
const accepted = [...allDecisions.values()].filter((review) => review.decision.startsWith('accept-'))
const selectedByLandmark = new Map(accepted.map((review) => [candidates.find((c) => c.candidateId === review.candidateId).landmark.featureId, review.officialId]))
const rows = candidates.map((candidate) => {
  const { candidateId, landmark, heritage, hazards } = candidate
  const decided = allDecisions.get(candidateId)
  let status, reason, method
  if (decided) {
    status = decided.decision.startsWith('accept-') ? 'linked' : 'held-after-review'
    reason = decided.reason
    method = updates.has(candidateId) ? 'explicit-2026-09-20-to-22-review' : 'earlier-reviewed-decision-inputs-revalidated'
  } else {
    method = 'full-dataset-screening-not-a-new-web-investigation'
    const selected = selectedByLandmark.get(landmark.featureId)
    if (selected && selected !== heritage.officialId) {
      status = 'alternative-not-proven'
      reason = `该历史记录已有证据对应${selected}；${heritage.code}另列为独立保护项，当前没有共同建筑范围证据。`
    } else if (hazards.includes('distance-only-do-not-merge')) {
      status = 'proximity-only'
      reason = '仅点位接近，缺少名称、地址沿革或独立来源支持同一地点。'
    } else if (landmark.persistentHolds.length) {
      status = 'held-current-use-or-member-scope'
      reason = landmark.persistentHolds.map((hold) => hold.reason).join(' ')
    } else if (!heritage.coordinate) {
      status = 'needs-location-and-identity-review'
      reason = '已有身份/门址候选，但本名录项缺可用参考点，且范围仍须核实；不能把相邻保护项坐标借给本项。'
    } else if (candidate.distanceMetres > 250) {
      status = 'needs-location-or-branch-review'
      reason = `两参考点相距${candidate.distanceMetres}米；需区分异址分支、迁址与来源点错误。名称相同不足以改变位置。`
    } else {
      status = 'needs-address-or-scope-evidence'
      reason = `候选“${landmark.displayName}”与“${heritage.originalName}”尚缺完整门牌/使用沿革/建筑群成员对应。${landmark.sourceRecordIds.length > 1 ? '同址组每个历史成员均需解释。' : ''}`
    }
  }
  return {
    candidateId, sourceRecordIds: landmark.sourceRecordIds, historicalName: landmark.displayName,
    officialId: heritage.officialId, heritageName: heritage.originalName,
    historicalAddresses: landmark.historicalAddresses, listedAddress: heritage.address,
    distanceMetres: candidate.distanceMetres, status, reason, method,
    evidenceSignals: candidate.evidence, hazards,
    reviewFile: updates.has(candidateId) ? `${directory}/review.json` : previous.has(candidateId) ? baseline : null,
  }
})
const counts = rows.reduce((result, row) => { result[row.status] = (result[row.status] ?? 0) + 1; return result }, {})
const doc = {
  schemaVersion: 3, reviewedAt: '2026-09-22',
  input: { path: candidatePath, sha256: hash(candidatePath) },
  supplementalCandidateInputs: [{ path: supplementalCandidatePath, sha256: hash(supplementalCandidatePath) }],
  baselineFiles: baselineFiles.map((file) => ({ path: `${baseline}/${file}`, sha256: hash(`${baseline}/${file}`) })),
  policy: '已证同址允许跨年代共卡，名录点优先；新旧门牌及建筑分期分别显示。多地标共卡必须显式列出全部组员。邻近校址记录只按校园语境归并，不能推定为同一学校或同一栋楼。无专名Apartments／Residential Complex可按同一新旧路名对应且125米内的住宅类名录项就近归并，但必须标为邻近语境而非实体同一。候选筛查与新网页调查分开统计。',
  supplementalSources,
  reviews,
}
const audit = {
  schemaVersion: 1, reviewedAt: doc.reviewedAt, input: doc.input,
  coverage: { ...data.coverage, supplementalCandidates: supplementalData.candidates.length,
    totalCandidatesReviewedByThisAudit: rows.length },
  summary: { screenedPairs: rows.length, explicitDecisionsThisRound: reviews.length,
    newlyAcceptedPairs: reviews.filter((row) => row.decision.startsWith('accept-') && !row.supersedes?.decision.startsWith('accept-')).length,
    explicitlyHeldThisRound: holds.length,
    refreshedAcceptedPairs: reviews.filter((row) => row.supersedes?.decision.startsWith('accept-')).length,
    reexaminedPreviousHolds: reviews.filter((row) => row.supersedes && !row.supersedes.decision.startsWith('accept-')).length,
    linkedPairs: accepted.length,
    sharedCards: new Set(accepted.map((row) => row.heritageGroup || row.officialId)).size,
    statuses: counts },
  limitation: `498对为冻结的全量自动候选筛查，另有${supplementalData.candidates.length}对跨语言、建筑群范围、大偏移、邻近校址或无名住宅语境补充候选；并非所有候选均重新网上考证。邻近住宅或校址共卡是展示归纳，不构成同一实体、同栋、同宗地或现用途证据。未匹配记录按当前名称、别名、完整地址、已有来源和近邻检索范围登记，不等于已证明没有对应建筑。`,
  rows, landmarkCoverage: data.landmarkCoverage, heritageCoverage: data.heritageCoverage,
}
for (const [name, value] of [['review.json', doc], ['audit.json', audit]]) {
  const content = JSON.stringify(value, null, 2) + '\n', file = `${directory}/${name}`
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(file, 'utf8') !== content) throw new Error(`Stale output: ${file}`)
  } else fs.writeFileSync(file, content)
}
console.log(JSON.stringify(audit.summary, null, 2))
