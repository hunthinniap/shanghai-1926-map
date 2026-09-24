// Filter existing research only; does not edit the application, links or coordinates.
// --write regenerates the lists; --check is a read-only reproducibility check.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = p => fs.readFileSync(path.join(root, p), 'utf8')
const hash = s => createHash('sha256').update(s).digest('hex')
const inputPath = 'research/rechecks/2026-09-24-french-concession-address-audit.json'
const inputText = read(inputPath)
const audit = JSON.parse(inputText)
for (const [key, p] of Object.entries(audit.inputs)) {
  assert.equal(hash(read(p)), audit.hashes[key], `Stale upstream audit: ${p}`)
}
assert.equal(hash(read(audit.reviewPath)), audit.reviewSha256)
const landmarkFeatures = JSON.parse(read(audit.inputs.roads)).features.filter(f => f.properties.kind === 'landmark')
const featureBySourceId = new Map()
for (const feature of landmarkFeatures) {
  for (const sourceId of feature.properties.sourceRecordIds ?? []) {
    assert(!featureBySourceId.has(sourceId), `Source record appears in multiple map landmarks: ${sourceId}`)
    featureBySourceId.set(sourceId, feature)
  }
}

// Conservative NAME cues, not a claim that every segment of these roads is a boundary.
// Suspend these records even when their reference points fall just inside the polygon.
const boundaryRoadCues = [
  'EDWARD VII', 'AVENUE FOCH', 'AVENUE HAIG',
  'ROUTE DE ZIKAWEI', 'BOULEVARD DES DEUX REPUBLIQUES',
]
const missingDoorPattern = /(?:^|[\s/])\?\?(?:\s|$)/
const policy = {
  rule: '仅对法租界范围内的候选采用换路名、保留门牌的检索假设；不推广至公共租界、华界或越界筑路。',
  scope: '以项目现有vs-fc-districts-1920边界与VS原始坐标转换点初筛，不按法文路名判归属，也不使用可能不准确的地标jurisdiction标签。',
  boundaryReview: '界路名称是保守暂缓线索，涉及分段道路；不意味着这些道路全线或两侧都不在法租界。需核对具体门牌所在一侧及年代后再启用同号检索。',
  limitations: '这是空间初筛名单，非逐条确证的历史行政归属；原始坐标、道路映射或边界误差仍可能造成错分。同号只作检索假设，不证明同一建筑或原址不变。',
  excludedUtilities: '继续沿用厕所／浴室等排除名单，不恢复调查。',
  missingDoorNumbers: '原地址以“??”明确标记门牌不详的记录，不适用旧今同号方法，不进入本清单。',
  unresolvedOnly: '只保留地图卡片“现在用途”显示“暂未查到可靠对应”的记录，即对应地标要素没有currentUse字段；已有现用途的记录不进入本清单。',
}
const polygonRecords = audit.records.filter(r => r.inFrenchPolygon)
const deferredMissingDoorRecords = polygonRecords.filter(r => missingDoorPattern.test(r.oldAddress ?? '')).map(r => ({
  id: r.id, name: r.name, nameZh: r.nameZh, oldAddress: r.oldAddress,
  sourceUrl: r.sourceUrl, sourcePointWgs84: r.sourcePointWgs84,
  sameNumberSearchAllowed: false,
  reason: '原始地址以??标记门牌不详，无法应用旧今同号检索；保留记录但暂不调查。',
}))
const eligibleRecords = polygonRecords.filter(r => !missingDoorPattern.test(r.oldAddress ?? '')).map(r => {
  const cues = r.addresses.filter(a => boundaryRoadCues.some(s => a.oldRoad.includes(s))).map(a => a.oldRoad)
  const hasUsableNumber = r.addresses.some(a => a.singleNumber !== null && a.modernRoads.length === 1)
  const scopeStatus = cues.length ? 'boundary-road-review' : 'inside-polygon-candidate'
  return {
    ...r, scopeStatus, boundaryRoadCues: cues,
    sameNumberSearchAllowed: !cues.length,
    readyForSingleNumberSearch: !cues.length && hasUsableNumber,
    // Suspended rows retain original evidence, but no active same-number queries.
    addresses: r.addresses.map(a => ({ ...a, queryCandidates: cues.length ? [] : a.queryCandidates })),
    candidates: r.candidates.map(c => ({ ...c, scopeReviewRequired: !!cues.length })),
  }
})
for (const record of eligibleRecords) assert(featureBySourceId.has(record.id), `No map landmark for source record: ${record.id}`)
const records = eligibleRecords.filter(r => featureBySourceId.get(r.id).properties.currentUse == null)
  .map(r => ({ ...r, currentUseDisplay: '暂未查到可靠对应' }))
const knownCurrentUseCount = eligibleRecords.length - records.length
const excludedRecords = audit.records.filter(r => !r.inFrenchPolygon).map(r => ({
  id: r.id, name: r.name, nameZh: r.nameZh, oldAddress: r.oldAddress,
  sourceUrl: r.sourceUrl, sourcePointWgs84: r.sourcePointWgs84,
  sameNumberSearchAllowed: false,
  reason: '原始参考点未落入项目法租界边界；仅有法文路名不能纳入。可能是界路另一侧、越界筑路或坐标误差，另待归属证据。',
}))
const ordinary = records.filter(r => r.scopeStatus === 'inside-polygon-candidate')
const pending = records.filter(r => r.scopeStatus === 'boundary-road-review')
assert.equal(eligibleRecords.length + deferredMissingDoorRecords.length + excludedRecords.length, audit.records.length)
assert.equal(new Set([...eligibleRecords, ...deferredMissingDoorRecords, ...excludedRecords].map(r => r.id)).size, audit.records.length)
assert(records.every(r => r.inFrenchPolygon))
assert(pending.every(r => !r.sameNumberSearchAllowed && r.addresses.every(a => !a.queryCandidates.length)))
assert([...records, ...deferredMissingDoorRecords, ...excludedRecords].every(r => !audit.excludedUtilityIds.includes(r.id)))
assert(records.every(r => !missingDoorPattern.test(r.oldAddress ?? '')))
assert(deferredMissingDoorRecords.every(r => r.sameNumberSearchAllowed === false))
assert(excludedRecords.every(r => r.sameNumberSearchAllowed === false))
assert(records.every(r => featureBySourceId.get(r.id).properties.currentUse == null))
assert(eligibleRecords.filter(r => !records.some(x => x.id === r.id)).every(r => featureBySourceId.get(r.id).properties.currentUse != null))
const counts = {
  previousBroadScope: audit.records.length,
  frenchPolygonAfterMissingDoorDeferral: eligibleRecords.length,
  unresolvedCurrentUseOnly: records.length,
  knownCurrentUseOmitted: knownCurrentUseCount,
  insidePolygonBeforeMissingDoorDeferral: polygonRecords.length,
  missingDoorNumberDeferred: deferredMissingDoorRecords.length,
  mainList: ordinary.length,
  boundaryRoadReview: pending.length,
  outsidePolygonExcluded: excludedRecords.length,
  readyForSingleNumberSearch: records.filter(r => r.readyForSingleNumberSearch).length,
  utilitiesAlreadyExcluded: audit.excludedUtilityIds.length,
}
const output = { date: '2026-09-24', policy, inputPath, inputSha256: hash(inputText), boundaryRoadCues, counts, records }
const cell = v => String(v ?? '—').replace(/\|/g, '／').replace(/\s*\n\s*/g, ' ')
const table = (rows, includeQueries) => [
  `| VS | 历史名称 | 原地址 | ${includeQueries ? '今路名＋原门牌（检索假设）' : '处理'} |`,
  '| --- | --- | --- | --- |',
  ...rows.map(r => `| [${r.id}](${r.sourceUrl}) | ${cell(r.name)}${r.nameZh ? `／${cell(r.nameZh)}` : ''} | ${cell(r.oldAddress)} | ${includeQueries ? cell(r.addresses.flatMap(a => a.queryCandidates).join('；')) : '暂不使用同号规则'} |`), '',
]
const md = [
  '# 法租界地标名单：现在用途暂未查到可靠对应', '',
  '本清单取代上一轮574条“法租界沿线”名单，作为后续同号地址调查的入口。没有修改地图、坐标或既有建筑链接。', '',
  ...Object.values(policy).map(s => `- ${s}`), '',
  `边界内原有 **${polygonRecords.length}** 条；门牌标为“??”的 **${deferredMissingDoorRecords.length}** 条不进入调查，已有现用途的 **${knownCurrentUseCount}** 条不进入本清单。最终只保留 **${records.length}** 条显示“暂未查到可靠对应”的记录：主名单 **${ordinary.length}** 条，界路名称待核 **${pending.length}** 条。另有界外参考点 **${excludedRecords.length}** 条未纳入。`, '',
  `主名单中 **${counts.readyForSingleNumberSearch}** 条至少有一组明确单门牌与单一今路名，其余须补查复杂门牌或道路。厕所／浴室等${counts.utilitiesAlreadyExcluded}条已在上一轮排除，未恢复。`, '',
  '## 主名单：界内参考点，无已标记界路线索', '',
  '仅表示可以优先按同号逻辑查证，不等于身份、门牌延续或行政归属已逐条核实。', '',
  ...table(ordinary, true),
  '## 界内但涉及界路名称：单列待核', '',
  '需核对地址所在路段、道路哪一侧、坐标及年代；暂不生成可执行的同号检索地址。', '',
  ...table(pending, false),
  '## 复跑', '',
  '`node research/rechecks/filter-french-concession-list.mjs --write`', '',
  '只读检查：`node research/rechecks/filter-french-concession-list.mjs --check`。', '',
].join('\n')
const base = path.join(root, 'research/rechecks/2026-09-24-french-concession-only-list')
for (const [suffix, content] of [['json', JSON.stringify(output, null, 2) + '\n'], ['md', md]]) {
  if (process.argv.includes('--write')) fs.writeFileSync(`${base}.${suffix}`, content)
  if (process.argv.includes('--check')) assert.equal(fs.readFileSync(`${base}.${suffix}`, 'utf8'), content)
}
console.log(JSON.stringify(counts, null, 2))
