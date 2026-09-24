// Research-only candidate generator. Never modifies application data or geometry.
// Run with --write to refresh the dated JSON and Markdown inventory.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { utm51nToWgs84 } from '../../scripts/lib/coordinate-systems.mjs'
import { normalizeHeritageAddress } from '../../scripts/lib/heritage-addresses.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = p => fs.readFileSync(path.join(root, p), 'utf8')
const json = p => JSON.parse(read(p))
const inputs = {
  source: 'scripts/data/virtual-shanghai-buildings-live.json',
  roads: 'public/data/historical-features.geojson',
  roadAudit: 'research/rechecks/2026-09-23-all-vs-address-road-audit.json',
  heritage: 'public/data/shanghai-excellent-historical-buildings/buildings-enriched.json',
  map: 'public/data/shanghai-excellent-historical-buildings/map-buildings.geojson',
  boundaries: 'public/data/jurisdictions.geojson',
  links: 'src/data/heritageLandmarkLinks.ts',
  exclusions: 'research/unresolved-landmarks/excluded-utility-records.json',
}
const hashes = Object.fromEntries(Object.entries(inputs).map(([k, p]) => [k, createHash('sha256').update(read(p)).digest('hex')]))
const vs = json(inputs.source).records
const audit = json(inputs.roadAudit)
assert.equal(hashes.source, audit.sourceSha256, 'Refresh all-VS road audit first')
assert.equal(hashes.roads, audit.roadSha256, 'Refresh all-VS road audit first')
const heritage = json(inputs.heritage).records
const points = new Map(json(inputs.map).features.map(f => [f.properties.officialId, f.geometry.coordinates]))
const polygons = json(inputs.boundaries).features.filter(f => f.properties.jurisdiction === 'french-concession')
const linkText = read(inputs.links)
const links = JSON.parse(linkText.slice(linkText.indexOf('= [') + 2).trim().replace(/;$/, ''))
const reviewPath = 'research/rechecks/2026-09-24-french-concession-address-reviews.json'
const reviews = fs.existsSync(path.join(root, reviewPath)) ? json(reviewPath).records : []
const excludedIds = new Set(json(inputs.exclusions).records.map(r => r.IDBAT))
const skippedIds = []

function insideRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function insidePolygon(p, rings) { return insideRing(p, rings[0]) && !rings.slice(1).some(r => insideRing(p, r)) }
function sourcePoint(r) {
  if (!Number.isFinite(r.x) || !Number.isFinite(r.y)) return null
  if (Math.abs(r.x) <= 180 && Math.abs(r.y) <= 90) return [r.x, r.y]
  const p = utm51nToWgs84(r.x, r.y)
  return [p.longitude, p.latitude]
}
function distance(a, b) {
  if (!a || !b) return null
  const rad = v => v * Math.PI / 180
  const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2
  return Math.round(6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h))))
}
const frenchName = s => /^(ROUTE |RUE |AVENUE (?!ROAD(?:\s|$))|BOULEVARD |QUAI DE FRANCE)/.test(s)
// Match audit expressions while preserving original house-number punctuation.
const normalizeExpression = s => s.replace(/(?<=\d)\/(?=\d)/g, '-').replace(/^[\d?][\d?\s,\-]*[A-E]?\s+/i, '').trim().toUpperCase()
function addressParts(address) {
  return (address ?? '').split(/(?<!\d)\s*\/\s*|\s+\/\s+|\s*\/\s*(?!\d)/).map(s => s.trim()).filter(Boolean)
}
function numberPrefix(part) {
  const prefix = part.match(/^([\d?][\d?\s,\-/]*[A-E]?)\s+(?=[A-Z])/i)?.[1]?.trim() ?? null
  return { raw: prefix, single: /^\d+$/.test(prefix ?? '') ? Number(prefix) : null }
}
// Do not interpret a compound's internal door/building number as street frontage.
// Ranges are suggestions only; parity applies when both endpoints have the same parity.
function frontageMatch(address, road, number) {
  const normalized = normalizeHeritageAddress(address) ?? ''
  const escaped = road.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = normalized.match(new RegExp(`(?:^|[、，,；;/])${escaped}(\\d+)(?:-(\\d+))?(号|弄)`))
  if (!match) return null
  const lo = Number(match[1]), hi = match[2] ? Number(match[2]) : lo
  if (number < lo || number > hi) return null
  if (lo !== hi && lo % 2 === hi % 2 && number % 2 !== lo % 2) return null
  if (lo !== hi) return 'frontage-range-candidate'
  return match[3] === '弄' ? 'same-lane-entrance-number' : 'same-frontage-number'
}
assert.equal(frontageMatch('岳阳路319号11号楼', '岳阳路', 11), null)
assert.equal(frontageMatch('岳阳路319号11号楼', '岳阳路', 319), 'same-frontage-number')
assert.equal(frontageMatch('华山路351弄11号', '华山路', 11), null)
assert.equal(frontageMatch('复兴中路543-551号', '复兴中路', 544), null)
assert.equal(frontageMatch('复兴中路543-551号', '复兴中路', 547), 'frontage-range-candidate')
assert.equal(numberPrefix('311/331 AVENUE PETAIN').single, null)
assert.deepEqual(addressParts('311/331 AVENUE PETAIN / 83 ROUTE PICHON'), ['311/331 AVENUE PETAIN', '83 ROUTE PICHON'])
assert.equal(frenchName('AVENUE ROAD'), false)

const records = []
for (const r of vs) {
  const point = sourcePoint(r)
  const inFrenchPolygon = !!point && polygons.some(f => insidePolygon(point, f.geometry.coordinates))
  const expressions = audit.expressions.filter(e => e.sourceIds.includes(r.id))
  if (!inFrenchPolygon && !expressions.some(e => frenchName(e.expression))) continue
  if (excludedIds.has(r.id)) { skippedIds.push(r.id); continue }
  const parts = addressParts(r.address)
  const addresses = expressions.map(e => {
    const part = parts.find(p => normalizeExpression(p) === e.expression)
    const number = part ? numberPrefix(part) : { raw: null, single: null }
    const rawRoads = [...new Set([...(e.lookup?.roadGroups ?? []).map(g => g.modernNameZh), e.modernNameZh].filter(Boolean))]
    const roads = [...new Set(rawRoads.map(s => s.replace(/[（(].*?[）)]/g, '').trim()))]
    // Known duplicate-character labels are not silently repaired by this audit.
    const usableRoads = roads.filter(s => !/南南|西西/.test(s))
    return {
      oldRoad: e.expression, oldNumber: number.raw, singleNumber: number.single,
      mappingStatus: e.status, rawModernRoads: rawRoads, modernRoads: usableRoads,
      queryCandidates: usableRoads.map(road => `${road}${number.raw ?? '（门牌待考）'}`),
      caveats: [!part && '原地址未可靠拆分', number.single === null && '无单一明确门牌，未自动数值匹配', usableRoads.length > 1 && '旧路分段对应多条今路', roads.length !== usableRoads.length && '路层重复字标签已排除'].filter(Boolean),
    }
  })
  const candidates = []
  for (const a of addresses) {
    if (a.singleNumber === null) continue
    for (const h of heritage) {
      const matched = a.modernRoads.map(road => ({ road, method: frontageMatch(h.official.addressAsListed, road, a.singleNumber) })).filter(m => m.method)
      if (!matched.length) continue
      const existingLinks = links.filter(l => [l.officialId, ...(l.additionalHeritageOfficialIds ?? [])].includes(h.id) && [...l.expectedSourceRecordIds, ...(l.additionalLandmarks ?? []).flatMap(x => x.expectedSourceRecordIds ?? [])].includes(r.id))
      candidates.push({
        officialId: h.id, code: h.code, name: h.official.originalNameOrUse,
        address: h.official.addressAsListed, listedUse: h.official.listedNameOrUse,
        wikipediaAddress: h.wikipedia?.addressAsListed ?? null,
        matches: matched, referenceDistanceM: distance(point, points.get(h.id)),
        alreadyLinked: existingLinks.length > 0, existingRelations: existingLinks.map(l => l.relation),
        officialSourceUrl: h.official.source.url,
        review: reviews.find(v => v.sourceId === r.id && v.officialId === h.id) ?? null,
      })
    }
  }
  records.push({ id: r.id, name: r.name, nameZh: r.nameZh, oldAddress: r.address, sourceUrl: r.sourceUrl,
    inFrenchPolygon, frenchRoadNameCue: expressions.some(e => frenchName(e.expression)),
    scope: inFrenchPolygon ? 'within-project-french-polygons' : 'french-road-name-boundary-or-extension',
    sourcePointWgs84: point, addresses, candidates })
}
const candidatePairs = records.flatMap(r => r.candidates.map(c => ({ sourceId: r.id, ...c })))
assert.equal(new Set(records.map(r => r.id)).size, records.length)
assert.equal(new Set(reviews.map(r => `${r.sourceId}:${r.officialId}`)).size, reviews.length)
for (const review of reviews) {
  assert(candidatePairs.some(c => c.sourceId === review.sourceId && c.officialId === review.officialId), `Review no longer matches: ${review.sourceId}/${review.officialId}`)
  assert(review.sources.length > 0)
}
assert(records.every(r => !excludedIds.has(r.id)))
const counts = {
  allVsRecords: vs.length, scopedRecords: records.length,
  excludedUtilityRecordsInScope: skippedIds.length,
  withinProjectFrenchPolygons: records.filter(r => r.inFrenchPolygon).length,
  frenchRoadBoundaryOrExtension: records.filter(r => !r.inFrenchPolygon).length,
  withQueryCandidates: records.filter(r => r.addresses.some(a => a.queryCandidates.length)).length,
  withSingleNumberAndRoad: records.filter(r => r.addresses.some(a => a.singleNumber !== null && a.modernRoads.length)).length,
  candidatePairs: candidatePairs.length, alreadyLinkedPairs: candidatePairs.filter(c => c.alreadyLinked).length,
  unlinkedPairs: candidatePairs.filter(c => !c.alreadyLinked).length,
  reviewedPairs: candidatePairs.filter(c => c.review).length,
}
const report = {
  date: '2026-09-24', hypothesis: '旧路名换今路名，暂保留门牌数值，仅产生检索候选，不证明门牌从未变化或同一建筑。',
  scope: '全部 VS 记录中项目法租界边界内的点，另纳入法文路名沿线；后者含界路及越界筑路，不能都称法租界内部。',
  limitations: ['边界采用项目现有1920年来源图层，点位误差及时代差异会影响范围；未使用地标上可能错误的jurisdiction标签。', '只有单一明确门牌参加数值匹配；斜线、字母、范围、分号复杂门牌仍保留原样，待人工检查。', '名录只匹配各显式路名的首个门牌/范围；后续裸数字续写不自动展开，未命中不表示无对应。', '同号/落入范围不是建筑同一性证明；距离是两个来源参考点距离，不是地籍测量。', '现代名录地址与列示使用单位不是2026年实时经营状态。', '本报告不修改地图、不创建合并、不移动坐标。'],
  inputs, hashes, reviewPath, reviewSha256: fs.existsSync(path.join(root, reviewPath)) ? createHash('sha256').update(read(reviewPath)).digest('hex') : null,
  excludedUtilityIds: skippedIds, counts, records,
}
const cell = v => String(v ?? '—').replace(/\|/g, '／').replace(/\s*\n\s*/g, ' ')
const md = ['# 法租界沿线地标：保留门牌的地址复查（2026-09-24）', '', report.hypothesis, '', report.scope, '',
  ...Object.entries(counts).map(([k,v]) => `- ${k}: ${v}`), '', '## 本轮人工核验', '',
  '| VS | 历史名称／地址 | 同号名录候选 | 本轮判断 |', '| --- | --- | --- | --- |',
  ...records.flatMap(r => r.candidates.filter(c => c.review).map(c => `| ${r.id} | ${cell(r.name)}／${cell(r.oldAddress)} | ${c.code} ${cell(c.name)}／${cell(c.address)} | ${cell(c.review.conclusion)} ${c.review.sources.map((s,i) => `[证据${i+1}](${s.url})`).join(' ')} |`)),
  '', '## 未建立直接链接的数值候选（不是待一键合并清单）', '',
  '| VS | 历史名称／地址 | 今名录候选 | 参考点距离 |', '| --- | --- | --- | --- |',
  ...records.flatMap(r => r.candidates.filter(c => !c.alreadyLinked).map(c => `| ${r.id} | ${cell(r.name)}／${cell(r.oldAddress)} | ${c.code} ${cell(c.name)}／${cell(c.address)} | ${c.referenceDistanceM ?? '未知'} m |`)),
  '', '## 全量地址检索清单', '', '以下今地址均为检索假设，原门牌标点保留；复杂门牌及分段道路需另查。', '',
  '| VS | 历史名称 | 原地址 | 换路名后检索候选 | 范围／注意事项 |', '| --- | --- | --- | --- | --- |',
  ...records.map(r => `| [${r.id}](${r.sourceUrl}) | ${cell(r.name)} | ${cell(r.oldAddress)} | ${cell(r.addresses.flatMap(a => a.queryCandidates).join('；'))} | ${r.inFrenchPolygon ? '界内参考点' : '界路／延伸线索'}；${cell(r.addresses.flatMap(a => a.caveats).join('；'))} |`),
  '', '## 限制与复跑', '', ...report.limitations.map(s => `- ${s}`), '',
  '`node research/rechecks/audit-french-concession-addresses.mjs --write`', '',
  '只读一致性检查：`node research/rechecks/audit-french-concession-addresses.mjs --check`。检查通过不等于所有候选已人工查明。', '',
].join('\n')
const base = path.join(root, 'research/rechecks/2026-09-24-french-concession-address-audit')
const jsonText = JSON.stringify(report, null, 2) + '\n'
if (process.argv.includes('--write')) {
  fs.writeFileSync(`${base}.json`, jsonText)
  fs.writeFileSync(`${base}.md`, md)
}
if (process.argv.includes('--check')) {
  assert.equal(fs.readFileSync(`${base}.json`, 'utf8'), jsonText, 'JSON audit is stale')
  assert.equal(fs.readFileSync(`${base}.md`, 'utf8'), md, 'Markdown audit is stale')
}
console.log(JSON.stringify(counts, null, 2))
