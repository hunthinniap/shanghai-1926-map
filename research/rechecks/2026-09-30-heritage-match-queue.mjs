import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const auditRoot = path.join(root, 'research/rechecks/2026-09-19-heritage-landmark-links')
const read = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'))
const base = read(path.join(auditRoot, 'candidates.json')).candidates
const supplemental = read(path.join(root, 'research/rechecks/2026-09-20-heritage-card-review/supplemental-candidates.json')).candidates
const reviewFiles = [
  path.join(auditRoot, 'second-review.json'),
  path.join(auditRoot, 'continuation-notes/review.json'),
  path.join(root, 'research/rechecks/2026-09-20-heritage-card-review/review.json'),
]
const decisions = new Map()
for (const filename of reviewFiles) {
  for (const review of read(filename).reviews) decisions.set(review.candidateId, review)
}
const candidates = [...base, ...supplemental]
const firstApprovals = read(path.join(root, 'research/rechecks/2026-09-30-heritage-same-site/approvals.json')).candidates
const frenchReview = read(path.join(root, 'research/rechecks/2026-10-01-french-concession-review.json')).decisions
const approvals = [...firstApprovals, ...frenchReview.filter((item) => item.decision === 'approve-same-site')]
const approvedSameSite = new Map(approvals.map(({ row, candidateId, correctedHeritage }) => [candidateId, { row, correctedHeritage }]))
const frenchExcluded = new Map(frenchReview.filter((item) => item.decision.startsWith('reject-'))
  .map((item) => [item.candidateId, item]))
if (new Set(candidates.map((candidate) => candidate.candidateId)).size !== candidates.length) {
  throw new Error('Duplicate candidate ID')
}
const accepted = candidates.filter((candidate) => decisions.get(candidate.candidateId)?.decision.startsWith('accept-'))
const held = candidates.filter((candidate) => decisions.has(candidate.candidateId)
  && !decisions.get(candidate.candidateId).decision.startsWith('accept-'))
const pending = candidates.filter((candidate) => !decisions.has(candidate.candidateId))
const outstanding = pending.filter((candidate) => !approvedSameSite.has(candidate.candidateId)
  && !frenchExcluded.has(candidate.candidateId))
const acceptedLandmarks = new Set(accepted.map((candidate) => candidate.landmark.featureId))
const acceptedHeritage = new Set(accepted.map((candidate) => candidate.heritage.officialId))
const frenchBoundary = read(path.join(root, 'public/data/jurisdictions.geojson')).features
  .filter((feature) => feature.properties.jurisdiction === 'french-concession')

function pointInRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function inFrenchConcession(candidate) {
  const point = candidate.landmark.coordinate
  return Array.isArray(point) && frenchBoundary.some(({ geometry }) =>
    geometry.type === 'Polygon'
    && pointInRing(point, geometry.coordinates[0])
    && !geometry.coordinates.slice(1).some((hole) => pointInRing(point, hole)))
}

const text = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()
const cell = (value) => text(value).replace(/\|/g, '\\|') || '—'
const link = (label, url) => url ? `[${cell(label)}](${url.replace(/\)/g, '%29')})` : cell(label)
const names = (candidate) => [candidate.landmark.displayName, candidate.landmark.displayChinese]
  .map(text).filter(Boolean).filter((name, index, all) => all.indexOf(name) === index).join(' / ')
const oldAddresses = (candidate) => candidate.landmark.historicalAddresses
  .map(({ sourceRecordId, address }) => `#${sourceRecordId} ${address}`).join('；') || '原资料未载'
const officialName = (candidate) => [candidate.heritage.originalName, candidate.heritage.listedName]
  .map(text).filter(Boolean).filter((name, index, all) => all.indexOf(name) === index).join(' / ')
const vsUrl = (candidate) => candidate.landmark.historicalAddresses[0]?.sourceUrl
  || candidate.landmark.sourceReferences.find((url) => url.includes('virtualshanghai.net'))
const officialUrl = (candidate) => candidate.heritage.sourceReferences.find((url) => url.includes('fgj.sh.gov.cn'))

const hazardLabels = {
  'existing-research-proves-site-scope-only': '旧研究仅证同址',
  'campus-complex-or-component-scope': '建筑群／楼栋范围待核',
  'existing-current-name-only-not-identity-proof': '今名不能单独证同栋',
  'legacy-automatic-current-use-does-not-prove-identity': '旧自动匹配不能当证据',
  'reviewed-source-door-conflict-vs4-bund-heritage3': '外滩旧4号／今3号冲突',
  'same-site-rebuilt-not-same-building': '同址重建，非同栋',
  'multi-source-landmark-site': '地标含多条源记录',
  'nearby-competing-exact-name-pair': '附近存在更强同名候选',
  'persistent-current-use-hold': '现用途持久待核',
  'multiple-strong-pairs': '多个强候选竞争',
  'reviewed-source-door-conflict-algar60-vs-ymca85': '旧门牌60／85冲突',
  'landmark-polygon-reference-only': '地标为面参考点',
  'coordinate-separation-over-250m': '点位相距超过250米',
  'heritage-has-no-coordinate': '名录暂无可用坐标',
  'relocated-institution-modern-information': '机构已迁址',
  'distance-only-do-not-merge': '仅距离近，不能据此合并',
}
const evidenceLabels = {
  'full-normalized-current-address': '已有今址文字相合',
  'old-road-name-and-number-coincidence-only': '旧路名映射＋门牌相同（未独立验证门牌沿用）',
  'road-door-range-overlap-review': '门牌范围交叠待核',
}
function clues(candidate) {
  const historicalNameMatches = candidate.evidence.nameMatches.filter((item) => item.landmarkRole !== 'current-name')
  const currentNameMatches = candidate.evidence.nameMatches.filter((item) => item.landmarkRole === 'current-name')
  const found = [
    ...(candidate.candidateId === 'landmark-vs-site-253__sh-fgj-3C017-01'
      ? ['本轮建筑史资料直证同址（见上文）'] : []),
    ...(historicalNameMatches.some((item) => item.match === 'normalized-exact') ? ['历史名规范化相合'] : []),
    ...(historicalNameMatches.some((item) => item.match === 'distinctive-substring-review') ? ['历史名包含关系待核'] : []),
    ...(currentNameMatches.length ? ['仅旧研究今名相合（不能单独证身份）'] : []),
    ...new Set(candidate.evidence.addressMatches.map((item) => evidenceLabels[item.match] ?? item.match)),
  ]
  if (candidate.evidence.sharedSourceUrls.length) found.push('共享来源链接（可能来自既有回填）')
  return found.join('；') || '无名称、地址或来源交叉证据'
}
function warnings(candidate) {
  const flags = candidate.hazards.map((hazard) => hazardLabels[hazard] ?? hazard)
  if (acceptedLandmarks.has(candidate.landmark.featureId)) flags.push('该VS地标已有其他采用关联')
  if (acceptedHeritage.has(candidate.heritage.officialId)) flags.push('该名录项已有其他采用关联')
  const competingLandmarks = candidates.filter((other) => other.candidateId !== candidate.candidateId
    && other.landmark.featureId === candidate.landmark.featureId).length
  const competingHeritage = candidates.filter((other) => other.candidateId !== candidate.candidateId
    && other.heritage.officialId === candidate.heritage.officialId).length
  if (competingLandmarks) flags.push(`同一VS另有${competingLandmarks}候选`)
  if (competingHeritage) flags.push(`同一名录另有${competingHeritage}候选`)
  return [...new Set(flags)].join('；') || '—'
}
function rank(candidate) {
  if (candidate.candidateId === 'landmark-vs-site-253__sh-fgj-3C017-01') return -100
  const name = candidate.evidence.nameMatches.length > 0 ? 1 : 0
  const address = candidate.evidence.addressMatches.length > 0 ? 1 : 0
  const conflict = acceptedLandmarks.has(candidate.landmark.featureId)
    || acceptedHeritage.has(candidate.heritage.officialId) ? 1 : 0
  return conflict * 10 - name * 3 - address * 2 + Math.min(candidate.distanceMetres ?? 9999, 9999) / 10000
}
function sorted(list) {
  return [...list].sort((left, right) => rank(left) - rank(right)
    || (left.distanceMetres ?? Infinity) - (right.distanceMetres ?? Infinity)
    || left.candidateId.localeCompare(right.candidateId))
}
function rows(list, prefix, includeHoldReason = false, predicate = () => true) {
  return sorted(list).map((candidate, index) => {
    if (!predicate(candidate)) return null
    const decision = decisions.get(candidate.candidateId)
    const id = `${prefix}${String(index + 1).padStart(3, '0')}`
    const recordLabel = candidate.landmark.sourceRecordIds.length
      ? `VS ${candidate.landmark.sourceRecordIds.join('/')}`
      : candidate.landmark.sourceParkRecordIds.length
        ? `VS 公园 ${candidate.landmark.sourceParkRecordIds.join('/')}` : '其他历史地标'
    const source = link(`${recordLabel}: ${names(candidate)}`, vsUrl(candidate))
    const official = link(`${candidate.heritage.code}: ${officialName(candidate)}`, officialUrl(candidate))
    const approval = approvedSameSite.get(candidate.candidateId)
    const exclusion = frenchExcluded.get(candidate.candidateId)
    if (approval && approval.row !== id) throw new Error(`Approved row moved: ${approval.row} became ${id}`)
    if (exclusion && exclusion.row !== id) throw new Error(`Excluded row moved: ${exclusion.row} became ${id}`)
    const note = exclusion ? exclusion.reason : approval?.correctedHeritage
      ? `原候选与34 EDWARD VII ROAD不同址；实际对应${approval.correctedHeritage.code} ${approval.correctedHeritage.address}`
      : includeHoldReason ? decision.reason
        : [clues(candidate), warnings(candidate)].filter((part) => part !== '—').join('；')
    const status = exclusion ? '不合并' : approval?.correctedHeritage
      ? `原候选不合并；改配 ${approval.correctedHeritage.code}`
      : approval
        ? candidate.heritage.coordinate ? '已确认同址（共卡）' : '已确认同址（名录点待核）'
      : '待你判断'
    return `| ${id} | ${source} | ${cell(oldAddresses(candidate))} | ${official} | ${cell(candidate.heritage.address)} | ${candidate.distanceMetres ?? '无坐标'} | ${cell(note)} | ${status} |`
  }).filter(Boolean)
}

const complex = pending.filter((candidate) => candidate.classification === 'complex-site-review')
const locationConflict = pending.filter((candidate) => candidate.classification === 'name-match-location-conflict')
const distanceOnly = pending.filter((candidate) => candidate.classification === 'insufficient-evidence')
const header = '| 编号 | Virtual Shanghai 地标 | 历史地址 | 优秀历史建筑名录 | 名录地址 | 点距（米） | 线索／疑点 | 你的结论 |\n|---|---|---|---|---|---:|---|---|'
const output = [
  '# 地标 × 优秀历史建筑：候选判断清单',
  '',
  '初稿日期：2026-09-30；2026-10-01 更新法租界审定。根据 2026-09-19 的 498 对初筛、2026-09-20 的 19 对补充及分轮人工审阅生成；这是**判定工作单，不是已确认对应表**。数据冻结后新增的证据未自动改变其他候选的结论。',
  '',
  `总候选 **${candidates.length} 对**：此前已采用 ${accepted.length}、曾审阅暂缓 ${held.length}、2026-09-30 同址确认 19 对并将 C020 改配、2026-10-01 法租界同址确认 7 对／排除 6 对、仍待判断 ${outstanding.length}。复杂线索组 ${complex.length} 对，同名但点位冲突 ${locationConflict.length}、仅近邻／证据不足 ${distanceOnly.length}。`,
  '',
  '回复时可写“C001 同栋／同址／不合并／待查”这样的编号；“同址”表示可放在同一卡片并分别记录历史时期，但**不宣称现存楼体就是原建筑**。旧路名映射加同号只是线索，不自动证明门牌始终未变。点距是两个来源参考点距离，不是两栋楼的测绘误差。若行内提示已有其他采用关联，须先审查竞争关系。',
  '',
  '## 已独立复核的示例：修德堂',
  '',
  '- **VS #253 Recoletos Procuration／修徳堂 → 3C017 香山路住宅**：旧址 6 RUE MOLIERE，名录地址香山路6号，参考点约53米。建筑史资料直接写明1930年 Recoletos Procuration 迁入该址，且对应今天香山路6号。用户已判“同址”；名录建造年代（1920年代）与1930年迁入时间不完全一致，具体楼体改建史仍需保留疑点。来源：[VS #253](https://www.virtualshanghai.net/data/buildings?ID=253)、[市房管局3C017](https://fgj.sh.gov.cn/yxlsjz1/20200414/b9946bf8508e4b9689671fcd4146bb86.html)、[建筑史研究](https://brs.russianshanghai.city/architects/m-z/a-j-yaron)。',
  '',
  `## A. 复杂线索（${complex.length} 对，含已确认、改配和排除）`,
  '',
  header,
  ...rows(complex, 'C'),
  '',
  `## B. 尚未审阅：名称相近但位置冲突（${locationConflict.length} 对）`,
  '',
  '此组**不建议仅凭名称批准**，应先查迁址、同名异楼或错误坐标。',
  '',
  header,
  ...rows(locationConflict, 'N'),
  '',
  `## C. 尚未审阅：仅近邻／证据不足（${distanceOnly.length} 对）`,
  '',
  '此组大多由空间距离进入候选池，**默认不合并**；列出是为了完整性，除非另有独立历史来源。',
  '',
  header,
  ...rows(distanceOnly, 'D'),
  '',
  `## D. 曾人工审阅但暂缓（${held.length} 对）`,
  '',
  '这一组已有具体反对理由。你可以要求重审，但不能把它们视为与 A 组等价的未处理候选。',
  '',
  header,
  ...rows(held, 'H', true),
  '',
  '## 数据出处与复核边界',
  '',
  '- 候选全集：[初筛 candidates.json](2026-09-19-heritage-landmark-links/candidates.json)、[补充 supplemental-candidates.json](2026-09-20-heritage-card-review/supplemental-candidates.json)。',
  '- 人工结论：[第一轮](2026-09-19-heritage-landmark-links/second-review.json)、[第二轮](2026-09-19-heritage-landmark-links/continuation-notes/review.json)、[第三轮](2026-09-20-heritage-card-review/review.json)。后轮对同一候选有明确覆核时，以后轮为准。',
  '- 本次同址确认及用户补充资料：[approvals.json](2026-09-30-heritage-same-site/approvals.json)。原候选 C001–C019 中 9 对有名录地图点，10 对仅有名录文字记录；后者不得凭历史地标点伪造名录楼栋坐标。C020 经核对改配有名录地图点的 3A005。',
  '- 法租界本轮结论与纠错：[review.json](2026-10-01-french-concession-review.json)。C023、C031、C035 与 C061 存在独立地址或楼栋反证，未按概括同意强行合并；C037、C057 按用户明确意见排除。',
  '- **C020 纠错**：VS #545 原址 34 EDWARD VII ROAD 对应延安东路34号的大北电报新楼（3A005），不是中山东一路7号的大北电报旧楼（2A004）。同一公司曾使用两栋不同楼；参见 [Virtual Shanghai #545](https://www.virtualshanghai.net/data/buildings?ID=545)、[市房管局第三批名录](https://fgj.sh.gov.cn/yxlsjz1/20200331/2447d47b3e2947bfba7c64ed04a758a7.html)、[上海市政府文旅介绍](https://english.shanghai.gov.cn/en-CultureHeritage/20251028/ed891dffdfb14193ad6368aad5aaf5ad.html)。',
  '- 每个名称链接指向 VS 原条目或市房管局名录页。表格中的线索是**原自动筛选的理由**；人工审定行以状态与审定理由为准。未重新逐一检索其余候选。',
  '',
].join('\n')
const outputPath = path.join(root, 'research/rechecks/2026-09-30-heritage-match-queue.md')
fs.writeFileSync(outputPath, output)
console.log(`Wrote ${outputPath}: ${complex.length} complex, ${locationConflict.length} location conflicts, ${distanceOnly.length} insufficient, ${held.length} held.`)

const frenchOutstanding = outstanding.filter(inFrenchConcession)
const frenchHeld = held.filter(inFrenchConcession)
const frenchAccepted = accepted.filter(inFrenchConcession)
const frenchApproved = pending.filter((candidate) => approvedSameSite.has(candidate.candidateId) && inFrenchConcession(candidate))
const frenchNewExcluded = pending.filter((candidate) => frenchExcluded.has(candidate.candidateId) && inFrenchConcession(candidate))
const frenchOutput = [
  '# 法租界内：地标 × 优秀历史建筑候选',
  '',
  '按本项目采用的 [1920 年法租界卫生区界](../../public/data/jurisdictions.geojson) 对 Virtual Shanghai 地标**参考点**作点在面内筛选；并非逐栋地籍核定。候选地标的旧地址与名录地址仍须分别核查，界线上或坐标有偏移的记录可能遗漏。原编号沿用[总清单](2026-09-30-heritage-match-queue.md)，因此编号不连续。',
  '',
  `共 **${frenchOutstanding.length} 对待判断**：复杂线索 ${frenchOutstanding.filter((candidate) => candidate.classification === 'complex-site-review').length}、同名但点位冲突 ${frenchOutstanding.filter((candidate) => candidate.classification === 'name-match-location-conflict').length}、仅近邻／证据不足 ${frenchOutstanding.filter((candidate) => candidate.classification === 'insufficient-evidence').length}。另列本轮排除 ${frenchNewExcluded.length} 对、此前暂缓 ${frenchHeld.length} 对供复核；原已采用 ${frenchAccepted.length} 对、本轮同址确认／改配 ${frenchApproved.length} 对，均不重复列出。`,
  '',
  '## A. 待判断：复杂线索',
  '',
  header,
  ...rows(complex, 'C', false, (candidate) => inFrenchConcession(candidate)
    && !approvedSameSite.has(candidate.candidateId) && !frenchExcluded.has(candidate.candidateId)),
  '',
  '## B. 待判断：同名但点位冲突',
  '',
  '这一组不能仅凭同名合并，应先确认是否迁址或坐标错配。',
  '',
  header,
  ...rows(locationConflict, 'N', false, inFrenchConcession),
  '',
  '## C. 待判断：仅近邻／证据不足',
  '',
  '默认不合并；需要独立历史来源才能升级。',
  '',
  header,
  ...rows(distanceOnly, 'D', false, inFrenchConcession),
  '',
  '## D. 本轮不合并',
  '',
  'C023、C031、C035 与 C061 有独立反证；C037、C057 为用户明确排除。',
  '',
  header,
  ...rows(complex, 'C', false, (candidate) => inFrenchConcession(candidate) && frenchExcluded.has(candidate.candidateId)),
  '',
  '## E. 曾审阅暂缓（可复核）',
  '',
  header,
  ...rows(held, 'H', true, inFrenchConcession),
  '',
  '说明：此处依据候选地标点筛选，不依据其 `jurisdiction` 字段；后者在 VS 地标中有大量旧默认值。若要按门牌而非参考点重新划界，需逐条核实。',
  '',
].join('\n')
const frenchOutputPath = path.join(root, 'research/rechecks/2026-10-01-french-concession-heritage-candidates.md')
fs.writeFileSync(frenchOutputPath, frenchOutput)
console.log(`Wrote ${frenchOutputPath}: ${frenchOutstanding.length} pending, ${frenchHeld.length} held.`)
