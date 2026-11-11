import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { reviewAmapCandidates } from './lib/amap-candidate-review.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const folder = path.join(root, 'research/rechecks/2026-11-09-heritage-amap-pois')
const plan = JSON.parse(fs.readFileSync(path.join(folder, 'search-plan.json')))
const state = JSON.parse(fs.readFileSync(path.join(folder, 'search-progress.json')))
const marketPath = path.join(folder, 'market-progress.json')
const market = fs.existsSync(marketPath) ? JSON.parse(fs.readFileSync(marketPath)) : null
const decisions = JSON.parse(fs.readFileSync(path.join(folder, 'reviewed-decisions.json')))
const scopePath = path.join(folder, 'scope-corrections.json')
const scopeCorrections = fs.existsSync(scopePath) ? JSON.parse(fs.readFileSync(scopePath)).records : []
const cachedResponses = new Map()
const ledger = path.join(root, '.cache/heritage-amap-search/requests.jsonl')
if (fs.existsSync(ledger)) for (const line of fs.readFileSync(ledger, 'utf8').split('\n').filter(Boolean)) {
  try { const entry = JSON.parse(line); cachedResponses.set(entry.requestId, entry.response) } catch { /* A concurrent writer may not have finished the last line. */ }
}
const labels = { 'reused-existing': '沿用已有链接', 'reused-live-confirmed': '沿用已核对 POI', 'reviewed-match': '资料交叉核对', 'user-reviewed-match': '用户人工复核', 'matched-listed-use': '名录列名／用途地点参考', 'matched-reviewed-alias': '已核别名／楼栋对应',
  'matched-spelling-reference': '村／邨异写入口参考',
  'matched-partial-reference': '用途部分对应的地点参考',
  'matched-building': '名称与门址吻合', 'matched-address': '门址参考', 'matched-name-reference': '名称与位置吻合（门址有差异）', 'needs-review': '待复核',
  'no-candidate': '本轮未召回候选', 'shared-poi-review': '共用 POI 待复核', pending: '尚未查询' }
const index = Object.fromEntries(plan.records.map(target => [target.officialId, { ...target, ...(state.records[target.officialId] ?? { status: 'pending' }) }]))
for (const [officialId, result] of Object.entries(market?.records ?? {})) {
  const previous = index[officialId]
  if (!previous || previous.status.startsWith('reused-')) throw new Error(`Invalid MCP target: ${officialId}`)
  index[officialId] = { ...previous, ...result,
    queries: [...new Map([...(previous.queries ?? []), ...(result.queries ?? [])].map(query => [query.requestId, query])).values()],
    candidates: [...new Map([...(previous.candidates ?? []), ...(result.candidates ?? [])].map(candidate => [candidate.poi.id, candidate])).values()],
    mcpCheckedAt: result.checkedAt,
  }
}
for (const record of Object.values(index)) {
  // A user can confirm a linked POI that earlier searches did not recall for
  // this target. Keep that input separate from the API's original responses.
  const decision = decisions.records.find(item => item.officialId === record.officialId)
  if (decision?.candidatePoi) {
    if (!verifiedUserDecision(decision) || decision.candidatePoi.id !== decision.poiid
      || !/^[A-Za-z0-9]+$/.test(decision.poiid)) throw new Error(`Invalid user-supplied candidate: ${record.officialId}`)
    record.candidates = [...(record.candidates ?? []).filter(candidate => candidate.poi.id !== decision.poiid),
      { poi: decision.candidatePoi, requestIds: [], source: 'user-confirmed-link' }]
  }
  if (!record.candidates?.length || record.status.startsWith('reused-')) continue
  const allCandidates = new Map(record.candidates.map(candidate => [candidate.poi.id, candidate.poi]))
  const provenance = new Map(record.candidates.map(candidate => [candidate.poi.id, candidate.requestIds ?? []]))
  for (const query of record.queries ?? []) for (const poi of cachedResponses.get(query.requestId)?.pois ?? []) {
    if (!poi.id) continue
    allCandidates.set(poi.id, poi)
    provenance.set(poi.id, [...new Set([...(provenance.get(poi.id) ?? []), query.requestId])])
    for (const child of poi.children ?? []) if (child.id) {
      allCandidates.set(child.id, { ...child, parent: poi.id, adcode: poi.adcode })
      provenance.set(child.id, [...new Set([...(provenance.get(child.id) ?? []), query.requestId])])
    }
  }
  const review = reviewAmapCandidates(record, [...allCandidates.values()])
  record.status = review.status
  record.selectedPoi = review.selected?.poi ?? null
  record.evidence = review.selected ? Object.fromEntries(Object.entries(review.selected).filter(([key]) => key !== 'poi')) : null
  record.ambiguous = review.ambiguous
  const displayed = review.candidates.slice(0, 12)
  const chosen = decision ? review.candidates.find(candidate => candidate.poi.id === decision.poiid) : review.selected
  if (chosen && !displayed.some(candidate => candidate.poi.id === chosen.poi.id)) displayed.splice(11, 1, chosen)
  record.candidates = displayed.map(candidate => ({ ...candidate, requestIds: provenance.get(candidate.poi.id) ?? [] }))
}
const reviewedIds = new Set()
function verifiedUserDecision(decision) {
  if (!decision.userReview) return false
  const proof = decision.userReview
  if (!/^user-reviews\/[A-Za-z0-9_-]+\.json$/.test(proof.file)) throw new Error('Invalid user review snapshot path')
  const bytes = fs.readFileSync(path.join(folder, proof.file))
  if (createHash('sha256').update(bytes).digest('hex') !== proof.sha256) throw new Error('User review snapshot changed')
  const document = JSON.parse(bytes)
  const selected = document.records?.find(item => item.officialId === decision.officialId)
  if (document.schemaVersion !== 1 || document.kind !== 'shanghai-heritage-poi-review'
    || document.exportedAt !== proof.exportedAt || selected?.verdict !== 'confirmed'
    || !selected.selectedIds?.includes(decision.poiid)) throw new Error(`Unsupported user selection: ${decision.officialId}`)
  return true
}
for (const decision of decisions.records) {
  const record = index[decision.officialId]
  const candidate = record?.candidates?.find(item => item.poi.id === decision.poiid)
  const userConfirmed = verifiedUserDecision(decision)
  if (reviewedIds.has(decision.officialId) || !candidate || record.status.startsWith('reused-')
    || candidate.wrongDistrict || candidate.rejectedType || candidate.tenant && !userConfirmed || candidate.componentMismatch
    || (candidate.scopeConflict && decision.scopeVerified !== true) || candidate.subordinate
    || !userConfirmed && (candidate.distanceMetres === null || candidate.distanceMetres > 160) || !decision.reason || !decision.referenceNote
    || !decision.sources?.length || decision.sources.some(source => !source.title || !source.url?.startsWith('https://'))) {
    throw new Error(`Invalid or unsupported reviewed decision: ${decision.officialId}`)
  }
  reviewedIds.add(decision.officialId)
  record.status = userConfirmed ? 'user-reviewed-match' : 'reviewed-match'
  record.selectedPoi = candidate.poi
  record.evidence = Object.fromEntries(Object.entries(candidate).filter(([key]) => !['poi', 'requestIds'].includes(key)))
  record.reviewedDecision = { ...decision, reviewedOn: decision.reviewedOn ?? decisions.reviewedOn }
  record.ambiguous = false
  record.note = decision.reason
}
const groups = new Map()
for (const record of Object.values(index)) {
  if (!record.selectedPoi) continue
  const id = record.selectedPoi.id ?? record.selectedPoi.poiid
  groups.set(id, [...(groups.get(id) ?? []), record.officialId])
}
for (const [poiid, officialIds] of groups) {
  if (officialIds.length < 2) continue
  const identities = officialIds.filter(id => index[id].status !== 'matched-partial-reference')
  for (const officialId of officialIds) {
    const record = index[officialId]
    if (!record.status.startsWith('matched-') && !['reviewed-match', 'user-reviewed-match'].includes(record.status)) continue
    if (record.status === 'matched-partial-reference' || identities.length > 1 && record.evidence?.partialReferenceEligible
      && !record.reviewedDecision && !record.status.startsWith('reused-')) {
      record.status = 'matched-partial-reference'
      record.sharedPoi = { poiid, officialIds }
      record.note = '多个名录项可共用该到访地点；不以共用POI区分具体保护楼栋。'
      continue
    }
    if (identities.length <= 1) continue
    record.status = 'shared-poi-review'
    record.sharedPoi = { poiid, officialIds }
    record.note = '同一 POI 对应多个名录项，楼栋／保护范围尚未区分，暂不自动接入。'
  }
}
const records = Object.values(index)
for (const correction of scopeCorrections) {
  if (!index[correction.officialId]) throw new Error(`Unknown scope correction: ${correction.officialId}`)
  index[correction.officialId].scopeCorrection = correction
}
function pendingReason(record) {
  const candidates = record.candidates ?? []
  if (record.scopeCorrection) return ['protected-component', record.scopeCorrection.reason]
  if (record.status === 'shared-poi-review') return ['shared-poi', '多个名录项共用候选 POI，需区分具体保护对象。']
  if (record.componentScope || candidates.some(candidate => candidate.requiredComponents?.length || candidate.requiredNamedComponents?.length)) return ['protected-component', '名录指定主楼、号楼等组成物，现候选未证明对应单体。']
  if (!record.referenceGcj02) return ['missing-reference', '缺少可交叉检查的位置参考，现有候选不能只凭名称采纳。']
  if (record.ambiguous) return ['multiple-candidates', '多个建筑、门牌或单位候选同时成立，尚不能唯一选定。']
  const plausible = candidates.filter(candidate => !candidate.wrongDistrict && !candidate.rejectedType && !candidate.tenant && !candidate.subordinate)
  if (plausible.some(candidate => candidate.matchedName && candidate.addressOverlap && candidate.distanceMetres > 160)) {
    return ['reference-position-conflict', '名称和门址可对应，但与现有位置参考相距较远，需查明参考点或候选是否有误。']
  }
  if (plausible.some(candidate => candidate.matchedName && candidate.distanceMetres !== null && candidate.distanceMetres <= 160)) {
    return ['name-address-discrepancy', '附近有名称对应候选，但门牌或保护范围差异缺少独立资料佐证。']
  }
  if (candidates.some(candidate => candidate.addressOverlap && (candidate.tenant || candidate.subordinate))) {
    return ['tenant-only-evidence', '召回同址商铺或楼内单位，尚未证明可代表历史建筑本体。']
  }
  return ['insufficient-evidence', '现有候选尚不能同时核对建筑名称、完整门址与保护范围。']
}
for (const record of records) if (['needs-review', 'shared-poi-review', 'no-candidate', 'pending'].includes(record.status)) {
  [record.reviewReasonCode, record.reviewReason] = pendingReason(record)
}
const summary = Object.fromEntries(Object.keys(labels).map(status => [status, records.filter(record => record.status === status).length]))
const linkedStatuses = ['matched-building', 'matched-address', 'matched-name-reference', 'matched-listed-use', 'matched-reviewed-alias', 'matched-spelling-reference', 'matched-partial-reference', 'reused-existing', 'reused-live-confirmed', 'reviewed-match', 'user-reviewed-match']
function referenceNoteFor(record) {
  if (record.reviewedDecision) return record.reviewedDecision.referenceNote
  if (record.status === 'matched-partial-reference') {
    const components = [...(record.evidence?.requiredComponents ?? []).map(number => `${number}号楼`), ...(record.evidence?.requiredNamedComponents ?? [])]
    return `地点参考：按名录用途／名称部分对应“${record.selectedPoi.name}”。${components.length ? `未细分名录指定的${components.join('、')}。` : '不作为具体保护建筑的认证。'}${record.evidence?.addressOverlap ? '' : '高德门牌与名录有差异。'}${record.sharedPoi ? '其他名录项也可能共用此到访地点。' : ''}`
  }
  if (record.nameReview && record.evidence?.usedReviewedNameAlias) return record.nameReview.note
  if (record.status === 'matched-spelling-reference') return '按村／邨同名异写、同一路段与附近参考位置对应建筑群入口；保留名录街号与高德弄号差异，未逐栋核定保护单体。'
  if (record.status === 'matched-listed-use') return `按名录列名／用途“${record.evidence.matchedListedUse}”及门址对应的到访参考。${record.evidence.distanceMetres === null ? '原记录缺少位置参考。' : record.evidence.distanceMetres > 160 ? '原参考坐标存在偏差，定位请以高德地点为准。' : '具体保护范围仍以名录为准。'}`
  const components = [...(record.evidence?.requiredComponents ?? []).map(number => `${number}号楼`), ...(record.evidence?.requiredNamedComponents ?? [])]
  if (components.length > 1) return `对应名录范围内的具名楼栋；同项其他保护楼栋尚未逐栋核定。`
  if (components.length === 1) return `对应名录指定的${components[0]}。`
  if (record.status === 'matched-address') return '门址参考，具体保护楼栋尚未逐栋核定。'
  if (record.status === 'matched-name-reference') return '按建筑名称和参考位置匹配；高德门址与名录有差异。'
  if (record.officialId === 'sh-fgj-2A048-01') return '高德地址字段有差异；已结合楼内单位及参考位置核对。'
  if (record.status === 'matched-building' && /弄/u.test(record.officialAddress)) return '对应里弄／建筑群入口，未逐栋核定全部保护单体。'
  return undefined
}
const report = { schemaVersion: 1, updatedAt: new Date().toISOString(), runStatus: market?.runStatus ?? state.runStatus,
  error: market ? market.error ?? null : state.error ?? null,
  querySources: { webApi: { runStatus: state.runStatus, error: state.error ?? null },
    marketMcp: market ? { server: market.server, runStatus: market.runStatus, completed: market.completed,
      creditsSpent: market.creditsSpent, creditsConfirmed: market.creditsSpent - market.uncertainCredits, uncertainCredits: market.uncertainCredits, maxCredits: market.maxCredits } : null },
  recordCount: plan.recordCount, searched: records.filter(record => record.status !== 'pending').length,
  withLink: records.filter(record => linkedStatuses.includes(record.status)).length, summary,
  notes: [
    '全部 1058 项名录逐项列出；按用户要求跳过已有记录。沿用已有链接仍属于此前静态初筛，不伪称已实时核验。',
    '新查询用名称／别名、门牌范围和现有 GCJ-02 参考位置交叉检查；区县、停车场、道路名和商铺类型另行排除。',
    '名称与门址吻合：有具名名称佐证、官方门址一致或范围交集、参考点距离≤160米且无明确楼栋范围冲突。',
    '门址参考：完整门址一致，或完整门牌在 POI 名称中而地址栏没有矛盾门牌；建筑／门牌类 POI、距现有参考点≤70米；仅供位置参考，尚未证明每个保护组成物。',
    '名录列名／用途地点参考：候选完整对应名录的具名用途、门址有交集且距参考点≤160米；或单一具名用途、完整门牌及实际返回区县全部吻合时，允许旧参考点缺失／冲突，明确保留提示。不以泛称、商户店名中提及的建筑名、学校院区替代指定楼栋。',
    '音乐厅／影剧院不再因高德0806类型一概判为商铺。用户网页勾选结果保存原始导出及校验值，单列人工复核；同址营业单位作为到访参考时在卡片明确说明。',
    '名称比较处理村／邨、大楼／大厦、机构简称及领事馆国名全称；酒店品牌和机构改名另用逐项审核的别名组，不把任意宾馆、酒店、大学或学院视作同名。别名对应仍核对区县、具体楼号及已核门址，并保留名录门牌差异。',
    '2026-11-11用户要求按用途与POI部分名称对应放宽到访链接。严格匹配不成立时，可采用同区县、具名用途部分对应、门址相符或附近的医院／宾馆／学校等整体地点，单列为地点参考；明确其他楼号、相反方向楼、异地迁址、普通门诊和商铺等不据此采纳。酒店／校园整体参考允许参考点距离较大，以覆盖大院不同入口；不声称已核定保护单体。多个名录项可共用整体到访POI，仍各自保留官方编号。',
    '名称与位置吻合：独特历史建筑名或建筑词条名在候选名中完整出现，距现有参考点≤60米，排除商铺、道路、区县冲突及明确组成物冲突；门址差异在卡片中保留提示。',
    '同一 POI 新匹配到多个名录项时暂缓接入，不以共用坐标证明同一建筑。',
    '保护楼栋编号同时检查名录原名、列名现用途和门址；展开楼号范围与列表，明确其他楼号不能自动替代指定楼栋。缺少楼号的历史别名须有资料逐项证明对应关系。',
    '资料交叉核对：对门牌差异或候选歧义逐项记录政府、建筑管理方或图书馆依据，明确选用建筑本体或建筑群入口；不改写原始名录门牌。',
    '明复图书馆旧参考坐标已于2026-11-10纠正，并按官方名称与陕西南路235号核定具名图书馆POI。纠正位置来自该高德POI，同源距离不作为独立匹配证据。该修正未消耗查询积分。',
    '待复核和未召回均不等于地点不存在，也不意味着高德没有对应 POI；保留候选及查询依据供继续核对。',
    '原始响应缓存位于 .cache/heritage-amap-search/requests.jsonl，查询和报告不保存 API Key。',
    ...(market ? [`指定市场 MCP 已完成 ${market.completed} 项补查，已确认 ${market.creditsSpent - market.uncertainCredits} 积分，另预留 ${market.uncertainCredits} 积分待账单确认，总预算占用 ${market.creditsSpent}／${market.maxCredits}；启动时跳过已回填项目，同一请求复用缓存。`,
      '市场 MCP 若仅返回上海市区县名称而未返回 adcode，按实际返回的区县名称对照代码，绝不从查询目标继承区县；该来源标记保留在候选中。'] : []),
  ], records }
fs.writeFileSync(path.join(folder, 'search-results.json'), JSON.stringify(report, null, 2) + '\n')
fs.writeFileSync(path.join(folder, 'poiid-index.json'), JSON.stringify({
  schemaVersion: 1, updatedAt: report.updatedAt, recordCount: report.recordCount, withPoi: report.withLink,
  note: '未核定项的 poiid 为 null；matchStatus 区分旧记录沿用、建筑对应与位置参考，不能将参考项当成保护楼栋认证。',
  records: records.map(record => {
    const accepted = linkedStatuses.includes(record.status) && record.selectedPoi
    const poiid = accepted ? record.selectedPoi.id ?? record.selectedPoi.poiid : null
    return { officialId: record.officialId, batch: record.batch, code: record.code, name: record.name,
      address: record.officialAddress, poiid, amapName: accepted ? record.selectedPoi.name : null,
      amapAddress: accepted ? record.selectedPoi.address : null,
      amapUrl: poiid ? `https://uri.amap.com/marker?markers=${encodeURIComponent(poiid)}&src=shanghai_heritage&callnative=1` : null,
      matchStatus: record.status, matchLabel: labels[record.status],
      referenceNote: accepted ? referenceNoteFor(record) ?? null : null,
      reviewSources: record.reviewedDecision?.sources ?? (record.evidence?.usedReviewedNameAlias ? record.nameReview.sources : record.scopeCorrection ? [{ title: '官方名录楼栋范围复核', url: record.scopeCorrection.sourceUrl }] : []),
      pendingReason: accepted ? null : record.reviewReason,
      checkedWithLiveApi: Boolean(accepted && record.status !== 'reused-existing') }
  }),
}, null, 2) + '\n')
const live = Object.fromEntries(records.filter(record => linkedStatuses.includes(record.status) && record.status !== 'reused-existing').map(record => [record.officialId, {
  poiid: record.selectedPoi.id ?? record.selectedPoi.poiid, name: record.selectedPoi.name,
  address: typeof record.selectedPoi.address === 'string' ? record.selectedPoi.address : '',
  referenceNote: referenceNoteFor(record),
  sources: record.reviewedDecision?.sources ?? (record.evidence?.usedReviewedNameAlias ? record.nameReview.sources : undefined),
}]))
fs.writeFileSync(path.join(root, 'src/data/heritageAmapLivePois.json'), JSON.stringify(live, null, 2) + '\n')
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const href = poi => `https://uri.amap.com/marker?markers=${encodeURIComponent(poi.id ?? poi.poiid)}&src=shanghai_heritage&callnative=1`
const reviewEvidenceHtml = record => `${record.reviewReason ? `<p>${esc(record.reviewReason)}</p>` : ''}${record.reviewedDecision ? `<p>资料核对：${record.reviewedDecision.sources.map(source => `<a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.title)}</a>`).join(' · ')}</p>` : ''}${record.nameReview && record.evidence?.usedReviewedNameAlias ? `<p>别名核对：${esc(record.nameReview.note)} ${record.nameReview.sources.map(source => `<a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.title)}</a>`).join(' · ')}</p>` : ''}${record.scopeCorrection ? `<p>楼栋复核：前阶段候选${esc(record.scopeCorrection.previousAmapName)}，${esc(record.scopeCorrection.reason)} <a href="${esc(record.scopeCorrection.sourceUrl)}" target="_blank" rel="noreferrer">官方保护对象</a></p>` : ''}`
fs.writeFileSync(path.join(folder, 'search-results.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>全量历史建筑 POI 查找</title><style>body{margin:30px;font:14px/1.7 system-ui;background:#faf8f3;color:#292722}h1{font-size:26px}nav{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}input,select{font:inherit;padding:9px;border:1px solid #ccc;border-radius:5px}input{width:min(450px,80vw)}.table{overflow:auto}table{width:100%;min-width:1000px;border-collapse:collapse;background:white}td,th{padding:12px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}th{background:#eee9df}td{min-width:145px}td:last-child{min-width:300px}small{color:#716b60}a{color:#71463f}li{margin-bottom:6px}tr[hidden]{display:none}</style><h1>全量优秀历史建筑 POI 查找</h1><p>总数 ${plan.recordCount} · 已查找／沿用 ${report.searched} · 有链接 ${report.withLink} · 状态 ${esc(report.runStatus)}<br><small>更新时间 ${esc(report.updatedAt)}${report.error ? ' · API：' + esc(report.error.info) : ''}</small></p><details><summary>核对方法与限制</summary><ul>${report.notes.map(note => `<li>${esc(note)}</li>`).join('')}</ul></details><nav><input id="query" aria-label="搜索" placeholder="编号、名称、门牌、POI ID"><select id="status" aria-label="结论"><option value="">全部结论</option>${Object.entries(labels).map(([key, label]) => `<option value="${key}">${label}（${summary[key]}）</option>`).join('')}</select><span id="count"></span></nav><div class="table"><table><thead><tr><th>编号／结论</th><th>历史建筑／门址</th><th>选定高德地点</th><th>依据／候选</th></tr></thead><tbody>${records.map(record => `<tr data-status="${record.status}"><td>${esc(record.code)}<br>${labels[record.status]}</td><td>${esc(record.name)}<br>${esc(record.officialAddress)}</td><td>${linkedStatuses.includes(record.status) && record.selectedPoi ? `<a href="${esc(href(record.selectedPoi))}" target="_blank" rel="noreferrer">${esc(record.selectedPoi.name)}</a><br>${esc(record.selectedPoi.address)}<br><small>${esc(record.selectedPoi.id ?? record.selectedPoi.poiid)}</small>` : '待核定'}</td><td>${record.evidence ? `<p>名称佐证：${esc(record.evidence.matchedName || '无独特名称')}；门牌${record.evidence.exactAddress ? '一致' : record.evidence.addressOverlap ? '范围交集' : record.evidence.reviewedAddressOverlap ? '已核现门址（与名录有差异）' : record.status === 'matched-spelling-reference' ? '街号／弄号差异保留' : '待核'}；距参考点 ${record.evidence.distanceMetres} 米。</p>` : ''}${reviewEvidenceHtml(record)}${record.note ? `<p>${esc(record.note)}</p>` : ''}${record.queries ? `<small>完成 ${record.queries.length} 次查询</small>` : ''}${record.candidates?.length ? `<details><summary>查看 ${record.candidates.length} 个候选</summary><ul>${record.candidates.map(candidate => `<li><a href="${esc(href(candidate.poi))}" target="_blank" rel="noreferrer">${esc(candidate.poi.name)}</a> · ${esc(candidate.poi.address)} · ${candidate.distanceMetres ?? '—'}米<br><small>${esc(candidate.poi.id)}；门牌${candidate.addressOverlap ? '有交集' : '未对应'}；${candidate.wrongDistrict ? '区县不符；' : ''}${candidate.rejectedType ? '类型不符；' : ''}${candidate.tenant ? '商铺／单位候选；' : ''}${candidate.scopeConflict ? '楼栋范围待核；' : ''}</small></li>`).join('')}</ul></details>` : ''}</td></tr>`).join('')}</tbody></table></div><script>const rows=[...document.querySelectorAll('tbody tr')],q=document.querySelector('#query'),s=document.querySelector('#status');function filter(){let n=0;for(const r of rows){r.hidden=!!(s.value&&r.dataset.status!==s.value||!r.textContent.toLowerCase().includes(q.value.trim().toLowerCase()));if(!r.hidden)n++}document.querySelector('#count').textContent='显示 '+n+' 项'}q.addEventListener('input',filter);s.addEventListener('change',filter);filter()</script></html>`)
fs.writeFileSync(path.join(folder, 'SEARCH.md'), `# 全量优秀历史建筑高德 POI 查找\n\n更新时间：${report.updatedAt}\n\n总数 ${plan.recordCount}；已查找／沿用 ${report.searched}；有链接 ${report.withLink}；运行状态：${report.runStatus}。\n\n${report.error ? `当前查询返回：${report.error.info}（${report.error.infocode}）。已保存断点。\n\n` : ''}| 结论 | 数量 |\n| --- | ---: |\n${Object.entries(labels).map(([key, label]) => `| ${label} | ${summary[key]} |`).join('\n')}\n\n[可搜索完整结果](search-results.html) · [结构化结果及候选](search-results.json) · [查询计划](search-plan.json)\n\n${report.notes.map(note => `- ${note}`).join('\n')}\n\n重新运行查找自动跳过已完成项，复用缓存，不改原始名录和地图坐标：\n\n\`\`\`sh\npython3 -u scripts/search-all-heritage-amap.py\nnode scripts/compile-heritage-amap-search.mjs\n\`\`\`\n\nKey 通过隐藏输入或 AMAP_WEB_SERVICE_KEY 环境变量传递。进程结束不会将 Key 写入结果。\n`)
console.log(JSON.stringify({ runStatus: report.runStatus, searched: report.searched, total: report.recordCount, withLink: report.withLink, summary }, null, 2))
fs.appendFileSync(path.join(folder, 'SEARCH.md'), '\n[简明 POI 清单（全部名录，未核定项为 null）](poiid-index.json)\n\n如需只补查尚未对应条目的门牌 POI，可运行 `python3 -u scripts/search-all-heritage-amap.py --supplement-addresses`，再重新汇总。已完成的门牌补查自动跳过。\n')

const unresolved = records.filter(record => !linkedStatuses.includes(record.status))
const reasonCounts = Object.fromEntries([...new Set(unresolved.map(record => record.reviewReasonCode))].map(code => [code, unresolved.filter(record => record.reviewReasonCode === code).length]))
fs.writeFileSync(path.join(folder, 'review-queue.json'), JSON.stringify({ updatedAt: report.updatedAt, recordCount: unresolved.length, reasonCounts,
  note: '此为证据不足原因分类，不等于高德没有该建筑；不把候选 ID 当作已核定 POI。',
  records: unresolved.map(record => ({ officialId: record.officialId, code: record.code, name: record.name, address: record.officialAddress,
    reasonCode: record.reviewReasonCode, reason: record.reviewReason, candidates: record.candidates ?? [] })) }, null, 2) + '\n')
fs.appendFileSync(path.join(folder, 'SEARCH.md'), '\n[逐项资料核对及来源](REVIEW.md) · [剩余复核队列与原因](review-queue.json)\n')
fs.writeFileSync(path.join(folder, 'REVIEW.md'), `# 逐项资料核对\n\n核对截至：${[decisions.reviewedOn, ...decisions.records.map(decision => decision.reviewedOn).filter(Boolean)].sort().at(-1)}。这份记录说明名称或门牌差异的处理依据；建筑群入口不代表逐栋测绘或保护范围认证。\n\n${decisions.records.map(decision => {
  const record = index[decision.officialId]
  return `## ${record.code} ${record.name}\n\n名录门址：${record.officialAddress}\n\n高德：${record.selectedPoi.name} · ${record.selectedPoi.address} · ${decision.poiid}\n\n${decision.reason}\n\n卡片说明：${decision.referenceNote}\n\n${decision.sources.map(source => `- [${source.title}](${source.url})`).join('\n')}\n`
}).join('\n')}\n`)

if (market) fs.appendFileSync(path.join(folder, 'SEARCH.md'), `\n市场 MCP 补查：${market.completed} 项；已确认 ${market.creditsSpent - market.uncertainCredits} 积分，待确认预留 ${market.uncertainCredits} 积分，总预算占用 ${market.creditsSpent} / ${market.maxCredits}。[断点与费用记录](market-progress.json)。\n\n指定服务可用 \`python3 -u scripts/search-heritage-market-mcp.py\` 续查；凭据读取本机 MCP 配置，自动复用缓存和跳过已核定项。预算已用尽时停止付费查询，不自动增加预算。\n`)

const lastBudget = market?.budgetAuthorizations?.at(-1)
if (lastBudget?.creditsUsedAtEnd !== undefined) fs.appendFileSync(path.join(folder, 'SEARCH.md'), `\n最近追加 ${lastBudget.additionalCredits} 积分阶段：完成 ${lastBudget.uniqueRecordsChecked ?? lastBudget.newRecordsCompleted} 项补查／细化（新增完成MCP补查 ${lastBudget.newRecordsCompleted} 项，细化既有记录 ${lastBudget.refinedOldRecords ?? 0} 项）；新增 ${lastBudget.newLinks} 项链接、撤回 ${lastBudget.withdrawnLinks ?? 0} 项（${lastBudget.linksAtAuthorization} → ${lastBudget.linksAtEnd}）。确认扣费 ${lastBudget.creditsConfirmedAtEnd - lastBudget.creditsConfirmedAtAuthorization} 积分，另预留 ${lastBudget.uncertainCreditsAtEnd - lastBudget.uncertainCreditsAtAuthorization} 积分待确认；剩余额度 ${lastBudget.unusedAdditionalCredits ?? 0} 积分。\n`)

if (scopeCorrections.length) fs.appendFileSync(path.join(folder, 'SEARCH.md'), `\n楼栋范围复核撤回前阶段 ${scopeCorrections.length} 项候选，保留原POI、指定保护楼栋和来源：[纠正记录](scope-corrections.json)。新链接统计包含新增及撤回后的结果。\n`)

if (scopeCorrections.length) fs.appendFileSync(path.join(folder, 'REVIEW.md'), `\n## 前阶段链接的楼栋范围纠正\n\n以下原候选已撤回，保留官方保护对象和原因。若后续核定新的具体楼栋，将在完整结果中单列。\n\n| 编号 | 官方保护对象／门址 | 原高德候选 | 撤回原因 |\n| --- | --- | --- | --- |\n${scopeCorrections.map(c => `| ${c.code} | [${c.listedName} · ${c.officialAddress}](${c.sourceUrl}) | ${c.previousAmapName} · ${c.previousAmapAddress} | ${c.reason} |`).join('\n')}\n`)
fs.appendFileSync(path.join(folder, 'SEARCH.md'), '\n2026-11-10：明复图书馆坐标纠正后从缓存回填链接（536 → 537），不计入上一付费阶段新增数，积分记录未变。[剩余坐标冲突本地复核](coordinate-conflict-audit.json)。\n')
const listedRecheckPath = path.join(folder, 'listed-use-recheck.json')
if (fs.existsSync(listedRecheckPath)) {
  const audit = JSON.parse(fs.readFileSync(listedRecheckPath))
  fs.appendFileSync(path.join(folder, 'SEARCH.md'), `\n${audit.reviewedOn}按名录列名／用途重新核对${audit.reviewedRecords}项：用户确认${audit.userConfirmed}项、缓存另核定${audit.additionalCacheMatches}项，新增${audit.addedLinks}项（${audit.beforeLinks} → ${audit.afterLinks}），本次0积分；既有${audit.existingLinksPreserved}项链接保留。[逐项说明](LISTED-USE-RECHECK.md) · [全部重核结果](listed-use-recheck.json)。\n`)
}
const aliasRecheckPath = path.join(folder, 'alias-recheck.json')
if (fs.existsSync(aliasRecheckPath)) {
  const audit = JSON.parse(fs.readFileSync(aliasRecheckPath))
  fs.appendFileSync(path.join(folder, 'SEARCH.md'), `\n${audit.reviewedOn}别名／品牌改名及同名异写重核${audit.reviewedRecords}项：新增${audit.addedLinks}项，另优化${audit.updatedExistingLinks}项既有门牌链接（${audit.beforeLinks} → ${audit.afterLinks}），剩余${audit.remaining}项，本次0积分。[瑞金1号楼及同类对应说明](ALIAS-RECHECK.md) · [全部重核结果](alias-recheck.json)。\n`)
}
const partialRecheckPath = path.join(folder, 'partial-recheck.json')
if (fs.existsSync(partialRecheckPath)) {
  const audit = JSON.parse(fs.readFileSync(partialRecheckPath))
  const note = `\n${audit.reviewedOn}按用户要求放宽至用途／名称部分对应的到访参考，重核${audit.reviewedRecords}项，新增${audit.addedLinks}项（${audit.beforeLinks} → ${audit.afterLinks}），剩余${audit.remaining}项，本次0积分；原有${audit.existingLinksPreserved}项POI保留。同一院落允许多个名录项共用链接，具体保护楼栋未细分。此前仅因缺少楼栋证据撤回的院落POI可作为地点参考重新接入，明确其他楼号仍不采用。[逐项说明](PARTIAL-RECHECK.md) · [全部重核结果](partial-recheck.json)。\n`
  fs.appendFileSync(path.join(folder, 'SEARCH.md'), note)
  fs.appendFileSync(path.join(folder, 'REVIEW.md'), note)
}
