import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { gcj02ToWgs84 } from './lib/coordinate-systems.mjs'
import { heritageAddressKey, addressesOverlap } from './lib/heritage-library-matching.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const inputs = process.argv.slice(2)
if (inputs.length !== 4) throw new Error('Pass the four *_with_poiid.json input paths, in batch order.')
const output = path.join(root, 'research/rechecks/2026-11-09-heritage-amap-pois')
const collection = JSON.parse(fs.readFileSync(path.join(root, 'public/data/shanghai-excellent-historical-buildings/map-buildings.geojson')))
const enriched = JSON.parse(fs.readFileSync(path.join(root, 'public/data/shanghai-excellent-historical-buildings/buildings-enriched.json')))
const buildings = new Map(enriched.records.map(record => [record.id, record]))
const features = new Map(collection.features.map(feature => [feature.properties.officialId, feature]))
const sources = inputs.map((input, index) => {
  const bytes = fs.readFileSync(input)
  const data = JSON.parse(bytes)
  if (data.batch !== index + 1) throw new Error(`Unexpected batch: ${input}`)
  return { file: path.basename(input), sha256: createHash('sha256').update(bytes).digest('hex'), data }
})
const all = sources.flatMap(source => source.data.records)
if (new Set(all.map(record => record.id)).size !== all.length) throw new Error('Duplicate official IDs')
for (const record of all) {
  const official = buildings.get(record.id)?.official
  if (!official || official.addressAsListed !== record.addressAsListed || official.originalNameOrUse !== record.originalNameOrUse) {
    throw new Error(`Input identity changed: ${record.id}`)
  }
}
const assignments = new Map()
for (const record of all) {
  const id = record.amapPoi?.poiid
  if (id) assignments.set(id, [...(assignments.get(id) ?? []), record.id])
}
const clean = value => heritageAddressKey(value ?? '').replace(/\(.*$/u, '')
const nameKey = value => clean(value).replace(/[\p{P}\s]/gu, '')
const generic = /^(?:住宅|花园住宅|里弄住宅|新式里弄|旧式里弄|公寓|办公楼|洋行|学校|医院|民宅|建筑|其他)$/u
function nameMatch(record, building, poi) {
  const names = [record.originalNameOrUse, record.listedNameOrUse, building.wikipedia?.originalNameOrUse,
    building.wikipedia?.listedNameOrUse, ...(building.articleReferences ?? []).map(article => article.resolvedTitle)]
    .flatMap(value => (value ?? '').split(/[\n/、,，;；]/u)).map(nameKey)
    .filter(value => value.length >= 3 && !generic.test(value))
  const candidate = nameKey(poi.name)
  return names.find(value => value === candidate || Math.min(value.length, candidate.length) >= 4 &&
    (value.includes(candidate) || candidate.includes(value))) ?? null
}
function distance(a, b) {
  const rad = Math.PI / 180
  const q = Math.sin((a[1] - b[1]) * rad / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin((a[0] - b[0]) * rad / 2) ** 2
  return Math.round(12_742_000 * Math.asin(Math.min(1, Math.sqrt(q))))
}
const labels = { ready: '可接入（初筛）', mismatch: '不宜接入', review: '需要复核', missing: '缺少 POI' }
const records = all.map(record => {
  const building = buildings.get(record.id)
  const feature = features.get(record.id)
  const poi = record.amapPoi ?? null
  const point = poi?.location?.split(',').map(Number)
  const validPoint = point?.length === 2 && point.every(Number.isFinite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90
  const wgs = validPoint ? gcj02ToWgs84(...point) : null
  const distanceMetres = feature && wgs ? distance(feature.geometry.coordinates, [wgs.longitude, wgs.latitude]) : null
  const exactAddress = Boolean(clean(record.addressAsListed) && clean(record.addressAsListed) === clean(poi?.address))
  const overlappingAddress = Boolean(poi?.address && addressesOverlap(record.addressAsListed, clean(poi.address)))
  const matchedName = poi ? nameMatch(record, building, poi) : null
  const duplicateOfficialIds = assignments.get(poi?.poiid) ?? []
  const componentScope = /\d+号楼|[东南西北]楼|主楼|水塔|(?:^|[，,])\s*[a-c]花园/u.test(`${record.originalNameOrUse} ${record.addressAsListed}`)
  const reasons = []
  let status = 'review'
  if (!poi?.poiid) {
    status = 'missing'; reasons.push('输入文件未提供非空 POI ID。')
  } else if (!/^[A-Za-z0-9]+$/u.test(poi.poiid)) {
    status = 'mismatch'; reasons.push('POI ID 格式异常。')
  } else {
    const broad = /^(?:190301|190302)$/u.test(poi.typecode) || /(?:交叉口|交汇处)$/u.test(poi.name ?? '')
    if (broad) {
      status = 'mismatch'; reasons.push('返回整条道路或路口，不能作为该历史建筑的 POI。')
    } else if (!exactAddress && !overlappingAddress && !matchedName && distanceMetres !== null && distanceMetres > 500) {
      status = 'mismatch'; reasons.push('名称与名录不对应、门址无交集，且距现有参考点超过 500 米；存在明显错配线索。')
    } else if ((exactAddress || overlappingAddress) && matchedName && distanceMetres !== null && distanceMetres <= 150
      && duplicateOfficialIds.length === 1 && !feature?.properties.coordinateReview && !componentScope) {
      status = 'ready'; reasons.push('具名建筑／使用名称、官方门址及现有参考点互相吻合，作为外部地点参考链接接入。')
    }
    if (exactAddress) reasons.push('高德门址与官方门址一致（去除括号附注及格式差异）。')
    else if (overlappingAddress) reasons.push('高德门牌落在官方列示门牌或范围内；仍需注意园区／楼栋范围。')
    else reasons.push('高德门址与官方门址未获得一致或范围交集的佐证。')
    if (matchedName) reasons.push(`名称佐证：${matchedName}。`)
    else reasons.push('未获得具名建筑／使用名称的直接佐证。')
    if (!validPoint) reasons.push('高德坐标缺失或格式异常。')
    if (distanceMetres === null) reasons.push('现有地图无参考点或高德坐标不可用，未计算距离。')
    else if (distanceMetres > 150) reasons.push(`距现有参考点约 ${distanceMetres} 米；现有参考点也可能不准，不能只凭距离判错。`)
    if (duplicateOfficialIds.length > 1) reasons.push(`同一 POI 分配给 ${duplicateOfficialIds.length} 个名录项，具体楼栋／保护范围需要区分。`)
    if (feature?.properties.coordinateReview) reasons.push('现有建筑位置含范围或部分定位复核说明，暂不自动接入。')
    if (componentScope) reasons.push('名录限定具体楼号／组成物，不能仅凭同一园区地址确认具体对象。')
  }
  return {
    officialId: record.id, batch: record.batch, code: record.codeRaw, name: record.originalNameOrUse,
    listedName: record.listedNameOrUse, officialAddress: record.addressAsListed,
    officialSourceUrl: record.source.url, status, statusLabel: labels[status], reasons,
    amapPoi: poi, amapUrl: poi?.poiid ? `https://uri.amap.com/marker?markers=${encodeURIComponent(poi.poiid)}&src=shanghai_heritage&callnative=1` : null,
    evidence: { exactAddress, overlappingAddress, matchedName, distanceMetres,
      amapWgs84: wgs, mapWgs84: feature?.geometry.coordinates ?? null,
      mapCoordinateScope: feature?.properties.coordinateScope ?? null, mapSourceUrl: feature?.properties.sourceUrl ?? null,
      wikipediaAddress: building.wikipedia?.addressAsListed ?? null, duplicateOfficialIds: duplicateOfficialIds.length > 1 ? duplicateOfficialIds : [],
      onMap: Boolean(feature) },
  }
})
const counts = list => Object.fromEntries(Object.keys(labels).map(status => [status, list.filter(record => record.status === status).length]))
const report = {
  schemaVersion: 1, reviewedOn: '2026-11-09', recordCount: records.length,
  sources: sources.map(({ file, sha256, data }) => ({ file, sha256, batch: data.batch, records: data.records.length })),
  methodology: [
    '根据用户提供的四份 JSON 静态交叉检查，不等于逐条访问高德实时详情，也未核定 POI 当前有效性。',
    '按官方编号、原名称和门址校验输入与现有名录身份一致，保留原始 POI 字段、查询词及匹配阶段。',
    '高德 GCJ-02 转换为 WGS84 后再与现有地图参考点比较。现有点也可能偏差，距离不单独作为判错依据。',
    '可接入仅指具名名称＋官方门牌一致或交集＋参考点距离≤150米＋唯一分配＋无位置复核标记的保守初筛；不是建筑边界、每个组成物或现状的认证。',
    '道路／路口结果不作为建筑 POI 接入。名称、官方门址均无佐证且参考点距离>500米的结果暂列不宜接入，仍可复核。',
    '同名异址、异名同址、园区和单栋范围、多个名录项共用 POI、缺坐标等情况保留复核，不自动替换 ID。',
    '不直接采用输入 markerUri：统一使用官方支持的 markers=POIID 格式，以免附带坐标掩盖 POI 身份错配。',
  ],
  summary: { ...counts(records), withPoi: records.filter(record => record.amapPoi?.poiid).length,
    readyOnMap: records.filter(record => record.status === 'ready' && record.evidence.onMap).length,
    duplicatePoiGroups: [...assignments.values()].filter(ids => ids.length > 1).length,
    byBatch: sources.map(source => ({ batch: source.data.batch, total: source.data.records.length, ...counts(records.filter(record => record.batch === source.data.batch)) })) },
  records,
}
fs.mkdirSync(output, { recursive: true })
fs.writeFileSync(path.join(output, 'audit.json'), JSON.stringify(report, null, 2) + '\n')
// Keep the runtime index independent of generated heritage map data, so normal
// map rebuilds cannot silently erase or reintroduce held POI assignments.
fs.writeFileSync(path.join(root, 'src/data/heritageAmapPois.json'), JSON.stringify(Object.fromEntries(
  records.filter(record => record.status === 'ready').map(record => [record.officialId, {
    poiid: record.amapPoi.poiid, name: record.amapPoi.name, address: record.amapPoi.address,
  }]),
), null, 2) + '\n')
const cell = value => String(value ?? '').replaceAll('|', '／').replace(/\r?\n/gu, '；')
const table = list => ['| 编号 | 历史建筑 | 名录地址 | 高德地点 | 高德地址 | 距离（米） |', '| --- | --- | --- | --- | --- | ---: |',
  ...list.map(record => `| ${record.code} | ${cell(record.name)} | ${cell(record.officialAddress)} | ${record.amapUrl ? `[${cell(record.amapPoi.name || record.amapPoi.poiid)}](${record.amapUrl})` : '—'} | ${cell(record.amapPoi?.address)} | ${record.evidence.distanceMetres ?? '—'} |`)].join('\n')
fs.writeFileSync(path.join(output, 'README.md'), `# 历史建筑高德 POI 核对（2026-11-09）\n\n共 ${records.length} 项，${report.summary.withPoi} 项有 POI ID。\n\n${report.methodology.map(text => `- ${text}`).join('\n')}\n\n| 批次 | 总数 | 可接入（初筛） | 不宜接入 | 需要复核 | 缺少 POI |\n| --- | ---: | ---: | ---: | ---: | ---: |\n${report.summary.byBatch.map(row => `| ${row.batch} | ${row.total} | ${row.ready} | ${row.mismatch} | ${row.review} | ${row.missing} |`).join('\n')}\n| 合计 | ${records.length} | ${report.summary.ready} | ${report.summary.mismatch} | ${report.summary.review} | ${report.summary.missing} |\n\n[可筛选的完整对照表](audit.html) · [完整 JSON 与逐项理由](audit.json)\n\n重跑：\n\n\`\`\`sh\nnode scripts/audit-heritage-amap-pois.mjs /path/001_with_poiid.json /path/002_with_poiid.json /path/003_with_poiid.json /path/004_with_poiid.json\n\`\`\`\n\n${Object.entries(labels).map(([key, label]) => `## ${label}（${report.summary[key]}）\n\n${table(records.filter(record => record.status === key))}`).join('\n\n')}\n`)
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
fs.writeFileSync(path.join(output, 'audit.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>历史建筑高德 POI 核对</title><style>body{margin:32px;font:14px/1.7 system-ui;color:#292722;background:#faf8f3}h1{font-size:26px}p{max-width:1050px}nav{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}input,select{font:inherit;padding:9px;border:1px solid #ccc;border-radius:5px}input{width:min(500px,85vw)}.table{overflow:auto}table{border-collapse:collapse;width:100%;min-width:1100px;background:white}th,td{border-bottom:1px solid #e5dfd5;padding:12px;text-align:left;vertical-align:top}th{background:#eee9df}td{min-width:135px}td:last-child{min-width:300px}a{color:#71463f}small{color:#6b675f}tr[hidden]{display:none}.status{white-space:nowrap;font-weight:600}.ready{color:#236453}.mismatch{color:#a33131}.review{color:#8a601d}ul{padding-left:18px;margin:0}#count{align-self:center}</style><h1>历史建筑高德 POI 核对</h1><p>2026-11-09 · 共 ${records.length} 项 · 可接入初筛 ${report.summary.ready} · 不宜接入 ${report.summary.mismatch} · 需要复核 ${report.summary.review} · 缺少 POI ${report.summary.missing}</p><p>这是输入文件与现有名录的静态交叉检查，未逐条调用高德实时详情。“可接入”要求具名名称、官方门址和距离共同支持，仍仅作为地点参考。距离已将 GCJ-02 转为 WGS84；现有参考点本身也可能有偏差。</p><nav><input id="query" aria-label="搜索" placeholder="搜索编号、建筑名、门址或 POI ID"><select id="status" aria-label="核对结论"><option value="">全部结论</option>${Object.entries(labels).map(([key, label]) => `<option value="${key}">${label}（${report.summary[key]}）</option>`).join('')}</select><span id="count"></span></nav><div class="table"><table><thead><tr><th>编号／结论</th><th>历史建筑／名录地址</th><th>高德地点／门址</th><th>距离／编号</th><th>核对依据</th></tr></thead><tbody>${records.map(record => `<tr data-status="${record.status}"><td>${escape(record.code)}<br><span class="status ${record.status}">${labels[record.status]}</span></td><td><a href="${escape(record.officialSourceUrl)}" target="_blank" rel="noreferrer">${escape(record.name)}</a><br>${escape(record.officialAddress)}<br><small>名录使用单位：${escape(record.listedName)}</small></td><td>${record.amapUrl ? `<a href="${escape(record.amapUrl)}" target="_blank" rel="noreferrer">${escape(record.amapPoi.name || '在高德地图查看')}</a>` : '无 POI'}<br>${escape(record.amapPoi?.address)}</td><td>${record.evidence.distanceMetres === null ? '未计算' : record.evidence.distanceMetres + ' 米'}<br><small>${escape(record.amapPoi?.poiid)}</small><br>${record.evidence.mapSourceUrl ? `<a href="${escape(record.evidence.mapSourceUrl)}" target="_blank" rel="noreferrer">现有参考点来源</a>` : '未上图'}</td><td><ul>${record.reasons.map(reason => `<li>${escape(reason)}</li>`).join('')}</ul></td></tr>`).join('')}</tbody></table></div><script>const rows=[...document.querySelectorAll('tbody tr')],query=document.querySelector('#query'),status=document.querySelector('#status');function filter(){let count=0;for(const row of rows){row.hidden=!!(status.value&&row.dataset.status!==status.value||!row.textContent.toLowerCase().includes(query.value.trim().toLowerCase()));if(!row.hidden)count++}document.querySelector('#count').textContent='显示 '+count+' 项'}query.addEventListener('input',filter);status.addEventListener('change',filter);filter();</script></html>`)
console.log(JSON.stringify({ output, summary: report.summary }, null, 2))
