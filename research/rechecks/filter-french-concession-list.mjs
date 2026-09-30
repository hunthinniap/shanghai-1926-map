// Build a research list with reviewed modern-address lookups.
// Does not edit application currentUse fields, links or coordinates.
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
const lookupPath = 'research/rechecks/2026-09-28-french-concession-current-use-lookups.json'
const lookupText = read(lookupPath)
const lookups = JSON.parse(lookupText)
const displayApprovalPath = 'scripts/data/french-concession-address-use-approvals.json'
const displayApprovalText = read(displayApprovalPath)
const displayApproval = JSON.parse(displayApprovalText)
assert.equal(displayApproval.lookupSha256, hash(lookupText), 'Re-review map display after lookup changes')
const displayedIds = new Set(displayApproval.approvedSourceIds)
const confirmedDisplayIds = new Set(displayApproval.confirmedIdentity.map(r => r.sourceId))
assert.equal(lookups.sourcePath, audit.inputs.source)
assert.equal(lookups.roadAuditPath, audit.inputs.roadAudit)
assert.equal(lookups.sourceSha256, audit.hashes.source, 'Re-review lookups after VS source changes')
assert.equal(lookups.roadAuditSha256, audit.hashes.roadAudit, 'Re-review lookups after road mapping changes')
const lookupLabels = {
  'address-use-supported': '同号现址用途有据',
  'address-use-clue': '现代用途线索，待复核',
  'needs-review': '门牌／时效／证据待核',
  'searched-unresolved': '已检索，未取得可靠现用途',
  'not-searched': '待检索',
}
const lookupSourceById = new Map(lookups.sources.map(s => [s.id, s]))
assert.equal(lookupSourceById.size, lookups.sources.length, 'Duplicate lookup source reference')
for (const s of lookups.sources) {
  assert(s.title && s.supports && s.accessedOn && Object.hasOwn(s, 'informationAsOf'))
  assert(['http:', 'https:'].includes(new URL(s.url).protocol))
  assert(s.accessedOn <= lookups.updatedOn)
}
const lookupBySourceId = new Map()
for (const result of lookups.records) {
  assert(Object.hasOwn(lookupLabels, result.status) && result.status !== 'not-searched')
  assert.equal(result.eligibleForMapWrite, false, 'Address evidence must not authorize map writes')
  assert(result.sourceIds.length && result.queryAddresses.length && result.searchQueries.length)
  assert(result.identityNote && result.reviewedOn <= lookups.updatedOn)
  assert(result.sourceRefs.every(id => lookupSourceById.has(id)), 'Unknown evidence reference')
  if (result.status.startsWith('address-use-')) {
    assert(result.modernUse && result.matchedModernAddress && result.sourceRefs.length)
  }
  if (result.status === 'searched-unresolved') assert.equal(result.modernUse, null)
  for (const id of result.sourceIds) {
    assert(!lookupBySourceId.has(id), `Duplicate lookup decision: ${id}`)
    lookupBySourceId.set(id, result)
  }
}
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
  unresolvedOnly: '调查范围保留原始地图要素没有currentUse字段的记录；既有currentUse记录不进入本清单。新批准的卡片用途证据采用独立展示字段，回填后仍保留调查行，不把今址参考算作历史原址已解决。',
  modernAddressUse: '新增列是“今路名＋原门牌”查到的现代门址用途，不是历史地标身份已确认。具体楼层、院区、门店与整栋楼分开；不自动修改地图现用途、位置或合并关系。',
  evidenceDates: '未检索、已检索未取证、弱线索和用途有据分别标记；旧文保名称、旧经营报道、搜索收录时间不当作今日营业证明。来源资料时点与本次查阅日期分别保存。',
  manualAddressSearch: '自动今址候选为空时，只允许以完整原地址作为研究查询锚点；人工道路假设另记检索词及判断，不改上游路名映射。复杂门牌保留附号、弄号、号段，未证实拆分不得直接回填。',
  approvedDisplay: '2026-09-30用户批准64条有据用途分层展示；9条名称／沿革可对应，显示“现在用途”，55条仅显示“今址用途参考”。展示批准独立保存，不修改研究底稿eligibleForMapWrite，不解除原址待核hold。',
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
  .map(r => ({
    ...r, currentUseDisplay: displayedIds.has(r.id)
      ? `${confirmedDisplayIds.has(r.id) ? '现在用途' : '今址用途参考'}：${lookupBySourceId.get(r.id).modernUse}`
      : '暂未查到可靠对应',
    ...(displayedIds.has(r.id) ? { mapCardDisplay: {
      approvedOn: displayApproval.approvedOn,
      mode: confirmedDisplayIds.has(r.id) ? 'current-use' : 'address-reference',
      label: confirmedDisplayIds.has(r.id) ? '现在用途' : '今址用途参考',
    } } : {}),
    ...(r.scopeStatus === 'inside-polygon-candidate' ? {
      sameNumberLookup: lookupBySourceId.get(r.id) ?? {
        status: 'not-searched', modernUse: null, matchedModernAddress: null,
        reviewedOn: null, sourceRefs: [], searchQueries: [], eligibleForMapWrite: false,
        identityNote: r.readyForSingleNumberSearch ? '本轮尚未查询。' : '本轮尚未查询；须先确认道路、复杂门牌或无门牌地名。',
      },
    } : {}),
  }))
const knownCurrentUseCount = eligibleRecords.length - records.length
const excludedRecords = audit.records.filter(r => !r.inFrenchPolygon).map(r => ({
  id: r.id, name: r.name, nameZh: r.nameZh, oldAddress: r.oldAddress,
  sourceUrl: r.sourceUrl, sourcePointWgs84: r.sourcePointWgs84,
  sameNumberSearchAllowed: false,
  reason: '原始参考点未落入项目法租界边界；仅有法文路名不能纳入。可能是界路另一侧、越界筑路或坐标误差，另待归属证据。',
}))
const ordinary = records.filter(r => r.scopeStatus === 'inside-polygon-candidate')
const pending = records.filter(r => r.scopeStatus === 'boundary-road-review')
assert([...displayedIds].every(id => ordinary.some(r => r.id === id
  && r.sameNumberLookup.status === 'address-use-supported')), 'Display approval must remain supported and inside the main list')
const lookupMatchesSourceAddress = (record, result) => {
  const candidates = record.addresses.flatMap(a => a.queryCandidates)
  if (candidates.length) return candidates.some(q => result.queryAddresses.includes(q))
  // A missing road mapping may still be researched, but cannot silently acquire
  // an invented modern address. Anchor such a review to its exact raw address.
  return !!record.oldAddress && result.queryAddresses.length === 1 && result.queryAddresses[0] === record.oldAddress
}
const missingMappingFixture = { oldAddress: '106 RUE PALIKAO', addresses: [{ queryCandidates: [] }] }
assert(lookupMatchesSourceAddress(missingMappingFixture, { queryAddresses: ['106 RUE PALIKAO'] }))
assert(!lookupMatchesSourceAddress(missingMappingFixture, { queryAddresses: ['云南南路106'] }))
assert(!lookupMatchesSourceAddress(missingMappingFixture, { queryAddresses: ['106 RUE PALIKAO', '云南南路106'] }))
const mappedFixture = { ...missingMappingFixture, addresses: [{ queryCandidates: ['云南南路106'] }] }
assert(lookupMatchesSourceAddress(mappedFixture, { queryAddresses: ['云南南路106'] }))
assert(!lookupMatchesSourceAddress(mappedFixture, { queryAddresses: ['106 RUE PALIKAO'] }))
for (const [id, result] of lookupBySourceId) {
  const record = ordinary.find(r => r.id === id)
  assert(record, `Lookup is not in the active main list: ${id}`)
  assert(lookupMatchesSourceAddress(record, result),
    `Lookup query no longer matches source address: ${id}`)
}
assert(pending.every(r => !Object.hasOwn(r, 'sameNumberLookup')), 'Boundary group must remain deferred')
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
  sameNumberReviewed: lookupBySourceId.size,
  sameNumberAddressUseSupported: ordinary.filter(r => r.sameNumberLookup.status === 'address-use-supported').length,
  sameNumberAddressUseClue: ordinary.filter(r => r.sameNumberLookup.status === 'address-use-clue').length,
  sameNumberNeedsReview: ordinary.filter(r => r.sameNumberLookup.status === 'needs-review').length,
  sameNumberSearchedUnresolved: ordinary.filter(r => r.sameNumberLookup.status === 'searched-unresolved').length,
  sameNumberNotSearched: ordinary.filter(r => r.sameNumberLookup.status === 'not-searched').length,
  mapCardDisplayed: displayedIds.size,
  mapCardCurrentUse: confirmedDisplayIds.size,
  mapCardAddressReference: displayedIds.size - confirmedDisplayIds.size,
}
assert.equal(counts.sameNumberReviewed + counts.sameNumberNotSearched, ordinary.length)
assert.equal(counts.sameNumberAddressUseSupported + counts.sameNumberAddressUseClue + counts.sameNumberNeedsReview + counts.sameNumberSearchedUnresolved, counts.sameNumberReviewed)
const output = {
  date: '2026-09-24', updatedOn: lookups.updatedOn, policy,
  inputPath, inputSha256: hash(inputText), lookupPath, lookupSha256: hash(lookupText),
  displayApprovalPath, displayApprovalSha256: hash(displayApprovalText),
  lookupSources: lookups.sources, boundaryRoadCues, counts, records,
}
const cell = v => String(v ?? '—').replace(/\|/g, '／').replace(/\s*\n\s*/g, ' ')
const lookupCell = r => {
  const v = r.sameNumberLookup
  const refs = v.sourceRefs.map(id => `[依据][fc-${id}]`).join(' ')
  const description = [
    r.mapCardDisplay ? `已写入地图卡片：${r.mapCardDisplay.label}` : null,
    lookupLabels[v.status],
    v.modernUse,
    v.matchedModernAddress ? `资料门址：${v.matchedModernAddress}` : null,
    v.identityNote,
  ].filter(Boolean).join('；')
  return cell(`${description}${refs ? ` ${refs}` : ''}`)
}
const table = (rows, includeQueries) => [
  `| VS | 历史名称 | 原地址 | ${includeQueries ? '今路名＋原门牌（检索假设） | 现址用途（同号地址查询）' : '处理'} |`,
  includeQueries ? '| --- | --- | --- | --- | --- |' : '| --- | --- | --- | --- |',
  ...rows.map(r => `| [${r.id}](${r.sourceUrl}) | ${cell(r.name)}${r.nameZh ? `／${cell(r.nameZh)}` : ''} | ${cell(r.oldAddress)} | ${includeQueries ? `${cell(r.addresses.flatMap(a => a.queryCandidates).join('；'))} | ${lookupCell(r)}` : '暂不使用同号规则'} |`), '',
]
const md = [
  '# 法租界地标名单：现址用途调查与回填', '',
  '本清单取代上一轮574条“法租界沿线”名单，保留原调查范围并记录地图卡片分层回填。未修改坐标或既有建筑链接。', '',
  ...Object.values(policy).map(s => `- ${s}`), '',
  `边界内原有 **${polygonRecords.length}** 条；门牌标为“??”的 **${deferredMissingDoorRecords.length}** 条不进入调查，既有现用途的 **${knownCurrentUseCount}** 条不进入本清单。保留原调查范围 **${records.length}** 条：主名单 **${ordinary.length}** 条，界路名称待核 **${pending.length}** 条。另有界外参考点 **${excludedRecords.length}** 条未纳入。`, '',
  `主名单中 **${counts.readyForSingleNumberSearch}** 条至少有一组明确单门牌与单一今路名，其余须补查复杂门牌或道路。厕所／浴室等${counts.utilitiesAlreadyExcluded}条已在上一轮排除，未恢复。`, '',
  `### 同号现址查询进度（${lookups.updatedOn}）`, '',
  `已完成首轮查询并记录结果 **${counts.sameNumberReviewed}** 条：**${counts.sameNumberAddressUseSupported}** 条有现代同号门址用途证据，**${counts.sameNumberAddressUseClue}** 条为待复核用途线索，**${counts.sameNumberNeedsReview}** 条涉及门牌、时效或证据问题，**${counts.sameNumberSearchedUnresolved}** 条首轮未取得可靠现用途。另 **${counts.sameNumberNotSearched}** 条仍待检索；不将它们计入“已查无结果”。`, '',
  `地图卡片已分层展示 **${counts.mapCardDisplayed}** 条：**${counts.mapCardCurrentUse}** 条“现在用途”、**${counts.mapCardAddressReference}** 条“今址用途参考”。“同号现址用途有据”不自动证明原历史建筑仍存；相同地址的不同历史记录逐行保留，共享查询证据不代表合并地标。`, '',
  '## 主名单：界内参考点，无已标记界路线索', '',
  '仅表示可以优先按同号逻辑查证，不等于身份、门牌延续或行政归属已逐条核实。', '',
  ...table(ordinary, true),
  '## 界内但涉及界路名称：单列待核', '',
  '需核对地址所在路段、道路哪一侧、坐标及年代；暂不生成可执行的同号检索地址。', '',
  ...table(pending, false),
  '## 现址查询来源与资料时点', '',
  '每项记录的完整检索词、判断和证据见 `2026-09-28-french-concession-current-use-lookups.json`。下列“未标日期”不能理解为2026年实地核验；涉及经营变动的线索须再核实。', '',
  ...lookups.sources.flatMap(s => [
    `- [${cell(s.title)}][fc-${s.id}]。资料时点：${cell(s.informationAsOf ?? '未标日期')}；查阅：${s.accessedOn}。${cell(s.supports)}`,
  ]), '',
  ...lookups.sources.map(s => `[fc-${s.id}]: <${s.url}>`), '',
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
