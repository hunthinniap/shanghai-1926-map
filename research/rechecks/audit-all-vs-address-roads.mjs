// Read-only audit. Prints JSON; never changes application data or map geometry.
// Input is ALL Virtual Shanghai building records, irrespective of research status.
import fs from 'node:fs'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Converter } from 'opencc-js'
import { utm51nToWgs84 } from '../../scripts/lib/coordinate-systems.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const sourcePath = 'scripts/data/virtual-shanghai-buildings-live.json'
const roadPath = 'public/data/historical-features.geojson'
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const sourceText = read(sourcePath)
const roadText = read(roadPath)
const source = JSON.parse(sourceText)
const roads = JSON.parse(roadText).features.filter((f) => f.properties.kind === 'road')
const cn = Converter({ from: 't', to: 'cn' })
const normalize = (s) => cn(s ?? '').normalize('NFD').replace(/\p{M}/gu, '')
  .toUpperCase().replace(/[^A-Z0-9\p{Script=Han}]/gu, '')
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex')
const fields = ['historicalName', 'historicalChinese', 'modernNameZh', 'modernNameEn', 'aliases']
const nameIndex = new Map()
for (const f of roads) {
  for (const field of fields) {
    for (const value of [f.properties[field]].flat().filter(Boolean)) {
      // Composite database labels (e.g. Édouard VII / Edward VII Road) are aliases too.
      for (const label of [value, ...value.split(/\s+\/\s+/)]) {
        const key = normalize(label)
        if (!nameIndex.has(key)) nameIndex.set(key, [])
        nameIndex.get(key).push({ f, field, label })
      }
    }
  }
}
function lookup(names) {
  const hits = names.flatMap((n) => nameIndex.get(normalize(n)) ?? [])
  return {
    roadFeatureCount: new Set(hits.map((h) => h.f.properties.id)).size,
    roadGroups: [...new Map(hits.map(({ f }) => [f.properties.featureGroupId, {
      id: f.properties.featureGroupId, historicalName: f.properties.historicalName,
      historicalChinese: f.properties.historicalChinese, modernNameZh: f.properties.modernNameZh,
    }])).values()],
    matchingLabels: [...new Set(hits.map((h) => `${h.field}: ${h.label}`))],
  }
}

// This earlier report supplies reviewed NAME pairs only, not its subset of landmark IDs.
const previous = JSON.parse(read('research/rechecks/2026-09-23-vs-road-layer-gap-audit.json'))
const candidates = previous.candidates.map((c) => ({
  modernNameZh: c.modernNameZh, expressions: [...c.virtualShanghaiNames],
  historicalChineseNames: c.historicalChineseNames,
  mappingStatus: c.mappingStatus, evidence: ['2026-09-22-vs-road-layer-gaps.md'],
}))
const extend = (zh, ...names) => candidates.find((c) => c.modernNameZh === zh).expressions.push(...names)
extend('漕溪北路', 'CAOXI BEILU (XUJIAHUI)')
extend('医学院路', 'I-HSUENYUEN LU')
extend('欧阳路', 'OUYANG LU')
const additions = [
  ['东体育会路', ['DONGTIYUHUI_1987'], 'same-name', 'https://www.shhk.gov.cn/xwzx/002005/20250120/6e385995-e28d-4854-82ad-42bae02aa6f0.html'],
  ['政民路', ['ZHENGMIN LU'], 'same-name', 'https://www.shyprd.sh.cn/yprd/html/yprd/yprd_qrdcwh/2019-01-21/Detail_4701.htm'],
  ['国定路', ['GUODING'], 'same-name', 'https://www.shyp.gov.cn/shypq/yqyw-wb-hbjzl-wryhjjgxx-spjdgg/20260112/cde17f472e934139824324226668f721/967f41daec0a4e4a9bd8af3f4f28d0d5.pdf'],
  ['淞沪路', ['SONGHU'], 'same-name', 'https://www.shyp.gov.cn/shypq/yqyw-wb-tyjzl-tygl/20230918/436898.html'],
  ['车站西路', ['CHEZHAN XILU'], 'same-name', 'https://www.shhk.gov.cn/xwzx/002008/002008040/20240915/419a1236-9df9-4d1c-ab91-7cf5321fae5d.html'],
  ['四达路', ['SIDAS'], 'spelling-and-location-candidate', 'https://www.shhk.gov.cn/xwzx/002008/002008040/20240915/419a1236-9df9-4d1c-ab91-7cf5321fae5d.html'],
  ['花园路', ['HUAYUAN'], 'same-name', 'https://www.shhk.gov.cn/xwzx/002008/002008040/20221220/379feaaa-f119-49e6-b637-863aa81ef288.html'],
  ['南丹路', ['NANDAN LU'], 'same-name', 'https://www.xuhui.gov.cn/xxgk/portal/article/detail?id=8a4c0c06829b645701829b6b05915573'],
  ['蒲西路', ['PUXI LU'], 'same-name', 'https://ghzyj.sh.gov.cn/nw2446/20231031/c0926e6275ea4524ae8ca83638d328fb.html'],
  ['半淞园路', ['BANSONGYUAN LU'], 'same-name', 'https://zjw.sh.gov.cn/gzdt/20250627/d2682374afc241db8525cd11ff42d7fc.html'],
  ['乐山路', ['LESHAN'], 'same-name', 'https://www.xuhui.gov.cn/xxgk/portal/article/detail?id=8a4c0c06829b645701829b6b05915573'],
  ['宛平南路', ['WANPING NANLU'], 'same-name', 'https://jtw.sh.gov.cn/bmts/20201126/fbe8bf9e5fa54ab0a1919526c6481691.html'],
  ['中兴路', ['ZHONGXING'], 'same-name', 'https://www.jingan.gov.cn/rmtzx/003003/20180809/b77341e2-cd4d-4453-9fc5-1ce437c457c6.html'],
  ['陆家浜路', ['LUCHIAPANG ROAD', '陸家浜路'], 'same-name', 'https://zjw.sh.gov.cn/gzdt/20250627/d2682374afc241db8525cd11ff42d7fc.html'],
  ['沪闵路', ['HUMIN'], 'same-name', 'https://www.shanghai.gov.cn/gwk/search/content/115890'],
  ['可乐路', ['KELE LU'], 'same-name', 'https://www.shcn.gov.cn/col6991/20220902/1221393.html'],
]
for (const [modernNameZh, expressions, mappingStatus, evidence] of additions) {
  candidates.push({ modernNameZh, expressions, mappingStatus, historicalChineseNames: [], evidence: evidence ? [evidence] : [] })
}

const followupPath = 'research/rechecks/2026-09-23-vs-road-toponym-followup.json'
const followupText = read(followupPath)
const followup = JSON.parse(followupText)
const reviewedByExpression = new Map()
for (const review of followup.records) {
  assert(['existing-road', 'missing-road-name', 'needs-review'].includes(review.decision))
  for (const expression of review.expressions) {
    assert(!reviewedByExpression.has(expression), `Duplicate reviewed expression: ${expression}`)
    reviewedByExpression.set(expression, review)
  }
  if (review.decision === 'missing-road-name') candidates.push({
    modernNameZh: review.modernNameZh, expressions: review.expressions,
    historicalChineseNames: review.historicalChineseNames,
    mappingStatus: 'building-anchored-road-name', confidence: review.confidence,
    evidence: review.evidence, basis: review.basis,
  })
}

// Explicit reading decisions, NOT fuzzy distance matching. These only exclude aliases
// of roads already present; they do not establish current door numbers or exact sites.
const aliases = new Map([
  ['AVENUE EDWARD VII', 'Edward VII Road'], ['EDWARD VII', 'Edward VII Road'],
  ['BUISSONNET', 'Rue Buissonnet'], ['DEUX REPUBLIQUES', 'Boulevard des Deux Republiques'],
  ['DONG JIAXING 东嘉兴路', '东嘉兴路'], ['CENTRAL FOKIEN ROAD', '福建中路'],
  ['CHAOFOONG ROAD', '高阳路'], ['CHAOFOONG', '高阳路'],
  ['CHIHTSAO ROAD', '制造局路'],
  ['EASTERN FUSHING ROAD', '复兴东路'], ['FUSHING (EASTERN)', '复兴东路'],
  ['HIANGFUN LOONG', '香粉弄'], ['HONAN RAOD', 'Honan Road'],
  ['HSIATU ROAD', '斜土路'], ['HWEINING', '徽宁路'],
  ['JIANGWAN', '东江湾路'], ['KEIYUAN', '武定路'], ['KIANGNING ROAD', '江宁路'],
  ['KIANGSE RAOD', 'Kiangse Road'], ['LLYOD ROAD', 'Lloyd Road'],
  ['MAJECTIC ROAD', 'Majestic Road'], ['MEUGNIOT', 'Rue du Pere Meugniot'],
  ['MINHONG', '闵行路'], ['NAYANG', '南阳路'],
  ['NORTH YANGTSE ROAD', 'North Yangtsze Road'], ['OMEI', '峨眉路'],
  ['PALIKAO', 'Rue Palikao'], ['PANJIAWAN', '潘家湾路'],
  ['PERSHING', 'Route Pershing'], ['PICARD DESTELAN', 'Route Picard Destelan'],
  ['POLO', 'Rue Marco Polo'], ['QUINSHAN ROAD', 'Quinsan Road'],
  ['RO HSIANGYUAN', '露香园路'], ['ROBINSON ROAD', 'Robison Road'],
  ['ROUTE AMIRAL COURBET', 'Rue Amiral Courbet'], ['ROUTE DE NINGPO', 'Rue de Ningpo'],
  ['ROUTE GUSTAVE BOISSEZON', 'Route Gustave de Boissezon'],
  ['ROUTE J. PRENTICE', 'Route John Prentice'], ['ROUTE KAUFMANN', 'Route Kaufman'],
  ['ROUTE PERE ROBERTT', 'Route Pere Robert'], ['RUE DE CAPITAINE RABIER', 'Rue du Capitaine Rabier'],
  ['SINCHIAO ROAD', '新桥路'], ['TIANDENG XIANG', '天灯弄'],
  ['TIENTSIEN ROAD', 'Tientsin Road'], ['TOLUN', '多伦路'],
  ['TUNGCHIATU ROAD', '董家渡路'], ['WEIHAWEI ROAD', 'Weihaiwei Road'],
  ['WHAMPOO ROAD', 'Whangpoo Road'], ['WOCHANG', '武昌路'],
  ['WONGKASHAW GARDENS', '黄家沙花园'], ['WUTSIN ROAD', '武进路'], ['WUTSIN', '武进路'],
  ['XIAOTAOYUAN', '小桃园街'], ['XIEHE LU', '协和路'], ['XUNDAO JIE', '巡道街'],
])
const annotated = new Map([
  ['DINGXING LU (138 TATUNG ROAD)', ['定兴路', 'Tatung Road']],
  ['SINGAPORE ROAD (770 YUYAO ROAD)', ['Singapore Road']],
  ['ROUTE HERVE SIEYES (ZENKA LONG)', ['Route Herve de Sieyes']],
])
const nonRoads = new Set([
  'CAOYANG -QIAO (WUSONG JIANG)-', 'FOKIEN -BRIDGE (SUZHOU HE)-',
  'GARDEN BRIDGE', 'HONAN -BRIDGE (SUZHOU HE)-', 'LAOLAJI -QIAO (SUZHOU HE)-',
  'SHANSE -BRIDGE (SUZHOU HE)-', 'THIBET -(SUZHOU HE) BRIDGE-',
  'HYDRO (LONGHUA GANG)', 'PUDONG',
])
const candidateByExpression = new Map()
for (const c of candidates) for (const token of c.expressions) {
  const key = normalize(token)
  assert(!candidateByExpression.has(key), `Duplicate candidate expression: ${token}`)
  candidateByExpression.set(key, c)
}
function parseAddress(address) {
  // A slash between house numbers is not an intersection (1/9 AMOY ROAD).
  return address.replace(/(?<=\d)\/(?=\d)/g, '-').split(/\s*\/\s*/)
    .map((s) => s.replace(/^[\d?][\d?\s,\-]*[A-E]?\s+/i, '').trim().toUpperCase())
    .filter(Boolean)
}
assert.deepEqual(parseAddress('1/9 AMOY ROAD'), ['AMOY ROAD'])
assert.deepEqual(parseAddress('23-8/23-12 ROUTE HERVE DE SIEYES'), ['ROUTE HERVE DE SIEYES'])
assert.deepEqual(parseAddress('? DALIAN (XI)_1987'), ['DALIAN (XI)_1987'])
assert.deepEqual(parseAddress('250 HUAYUAN / 723 TONGXIN'), ['HUAYUAN', 'TONGXIN'])
assert.deepEqual(parseAddress('20E ROUTE PERE ROBERT'), ['ROUTE PERE ROBERT'])
assert.equal(normalize('牛莊路'), normalize('牛庄路'))
assert.equal(normalize('大連西路'), normalize('大连西路'))
const tokens = new Map()
const addresslessIds = []
for (const r of source.records) {
  if (!r.address?.trim()) { addresslessIds.push(r.id); continue }
  for (const expression of parseAddress(r.address)) {
    if (!tokens.has(expression)) tokens.set(expression, { expression, sourceIds: [] })
    tokens.get(expression).sourceIds.push(r.id)
  }
}
const sourceRecord = (r) => ({ id: r.id, name: r.name, nameZh: r.nameZh,
  address: r.address, sourceUrl: r.sourceUrl })
const sourceLocation = (r) => ({
  ...sourceRecord(r), originalCoordinates: { x: r.x, y: r.y },
  coordinateInterpretation: 'VS source point interpreted as UTM51N, for area checks only; not a surveyed building entrance.',
  wgs84: utm51nToWgs84(r.x, r.y),
})
for (const review of followup.records) {
  const actualIds = [...new Set(review.expressions.flatMap((t) => {
    assert(tokens.has(t), `Reviewed expression missing from source: ${t}`)
    return tokens.get(t).sourceIds
  }))].sort((a, b) => a - b)
  assert.deepEqual(actualIds, [...review.sourceIds].sort((a, b) => a - b),
    `Review scope changed; manually check new sources for ${review.expressions.join(', ')}`)
}
for (const row of tokens.values()) {
  row.sourceIds = [...new Set(row.sourceIds)]
  const t = row.expression
  const c = candidateByExpression.get(normalize(t))
  const review = reviewedByExpression.get(t)
  if (/^(?:[\d?\s]+|TO COMPLETE)$/.test(t)) {
    row.status = 'no-identifiable-road'
  } else if (nonRoads.has(t)) {
    row.status = 'bridge-waterway-or-area'
  } else if (t === 'DALIAN (XI)_1987') {
    row.status = 'missing-segment-name'
    row.modernNameZh = '大连西路'
    row.lookup = lookup(['大连西路', 'Dalian Xilu', 'Dalny Road Western', 'Dairen Road Western'])
    row.relatedExistingRoad = lookup(['Dalny Road'])
    row.note = '已有大连湾路／大连路记录，但无大连西路名称；不能把南段与西段视作已完整覆盖。_1987 原样保留，含义未核定。'
  } else if (review) {
    row.toponymReview = review
    row.lookup = lookup(review.decision === 'needs-review' ? [t]
      : [t, review.modernNameZh, ...review.historicalChineseNames])
    if (review.decision === 'needs-review') row.status = 'needs-review'
    else {
      row.modernNameZh = review.modernNameZh
      row.mappingStatus = 'building-anchored-road-name'
      if (review.decision === 'existing-road') {
        assert(row.lookup.roadFeatureCount > 0, `Reviewed road no longer in database: ${t}`)
        row.status = 'existing-reviewed-name'
      } else {
        assert.equal(row.lookup.roadFeatureCount, 0, `Candidate now in database: ${t}`)
        row.status = 'missing-name-candidate'
      }
    }
    row.sourceRecords = source.records.filter((r) => row.sourceIds.includes(r.id)).map(sourceLocation)
  } else if (c) {
    row.lookup = lookup([c.modernNameZh, ...c.expressions, ...c.historicalChineseNames])
    row.status = row.lookup.roadFeatureCount ? 'existing-reviewed-name' : 'missing-name-candidate'
    row.modernNameZh = c.modernNameZh
    row.mappingStatus = c.mappingStatus
  } else {
    row.lookup = lookup([t])
    if (row.lookup.roadFeatureCount) row.status = 'existing-exact-name'
    else if (aliases.has(t) || annotated.has(t)) {
      row.reviewedAs = annotated.get(t) ?? [aliases.get(t)]
      row.lookup = lookup(row.reviewedAs)
      row.status = row.lookup.roadFeatureCount ? 'existing-reviewed-name' : 'needs-review'
    } else {
      // Only omission/interchange of a road suffix is allowed here; no fuzzy spelling.
      row.lookup = lookup([`${t} LU`, `${t} ROAD`, `${t} JIE`, `${t} STREET`, t.replace(/ROAD$/, 'LU')])
      row.status = row.lookup.roadFeatureCount ? 'existing-suffix-variant' : 'needs-review'
    }
  }
  if (!row.sourceRecords && ['missing-name-candidate', 'missing-segment-name', 'needs-review'].includes(row.status)) {
    row.sourceRecords = source.records.filter((r) => row.sourceIds.includes(r.id)).map(sourceRecord)
  }
}
const expressions = [...tokens.values()].sort((a, b) => a.expression.localeCompare(b.expression, 'en'))
const checked = new Set([...addresslessIds, ...expressions.flatMap((r) => r.sourceIds)])
assert.equal(checked.size, source.records.length, 'Every VS record must be accounted for')
assert.equal(new Set(source.records.map((r) => r.id)).size, source.records.length)
const byId = (id) => expressions.filter((r) => r.sourceIds.includes(id))
assert.equal(byId(1262)[0].status, 'missing-segment-name')
assert.equal(byId(1290)[0].status, 'existing-reviewed-name')
assert.equal(byId(1712)[0].status, 'existing-reviewed-name')
assert.equal(byId(1519).length, 2)
assert.equal(byId(1520)[0].modernNameZh, '医学院路')
assert.equal(byId(1522)[0].modernNameZh, '宛平南路')
assert.equal(byId(1537)[0].status, 'needs-review') // NANLI is not silently rewritten.
const byExpression = (t) => expressions.find((r) => r.expression === t)
assert.equal(byExpression('BAOCHENG LONG').lookup.roadFeatureCount, 2)
assert.equal(byExpression('BAOCHENG LONG').modernNameZh, '叶家宅路')
assert.equal(byExpression('XUEQIAN XIANG').status, 'existing-reviewed-name')
assert.equal(byExpression('KOOKA LUNG').modernNameZh, '顾家弄')
assert.equal(byExpression('YUYUAN (BIS) LU').modernNameZh, '豫园路')
for (const t of ['FUCHUN JIE', 'YUQINGLI LONG', 'YUQINGLI LOONG', 'CHUMEN ROAD', 'LIUYUSI JIE']) {
  assert.equal(byExpression(t).status, 'needs-review', `Unproven renaming must stay unresolved: ${t}`)
  assert(!byExpression(t).modernNameZh)
}
const candidateSummary = candidates.map((c) => {
  const rows = expressions.filter((r) => r.modernNameZh === c.modernNameZh)
  assert(rows.length, `Candidate must actually occur in VS: ${c.modernNameZh}`)
  const sourceIds = [...new Set(rows.flatMap((r) => r.sourceIds))].sort((a, b) => a - b)
  const result = lookup([c.modernNameZh, ...c.expressions, ...c.historicalChineseNames])
  assert.equal(result.roadFeatureCount, 0, `Candidate already in roads: ${c.modernNameZh}`)
  return { ...c, ...result, sourceIds }
})
const counts = Object.fromEntries([...new Set(expressions.map((r) => r.status))].sort()
  .map((s) => [s, expressions.filter((r) => r.status === s).length]))
console.log(JSON.stringify({
  auditedAt: '2026-09-23',
  scope: 'ALL records in the local Virtual Shanghai buildings snapshot; no research-status, category, map visibility, district or merge-status filter.',
  sourcePath, sourceFetchedAt: source.fetchedAt, sourceSha256: hash(sourceText),
  websiteCountCheck: { checkedAt: '2026-09-23', url: 'https://www.virtualshanghai.net/data/buildings?pn=29', count: 1803, note: 'Index total checked; not a new fetch of all 1,803 detail pages.' },
  roadPath, roadSha256: hash(roadText), matchedFields: fields,
  followupPath, followupSha256: hash(followupText),
  method: 'OpenCC t→cn; case/diacritic/spacing/punctuation normalization; exact name, explicit reviewed alias or road suffix only. No fuzzy auto-merges. Raw addresses and _1987 markers preserved. Inventory coverage is complete; historical-name resolution is not.',
  evidenceLimits: 'Modern official address/road sources corroborate current road names only unless otherwise stated; they do not prove historic house-number continuity, the VS building footprint, or that every historic alias has been resolved. Zero name hits are candidates, not a proof of absent geometry.',
  counts: { sourceRecords: source.records.length, recordsWithAddress: source.records.length - addresslessIds.length,
    addresslessRecords: addresslessIds.length, roadFeatures: roads.length, addressExpressions: expressions.length,
    missingNameCandidates: candidateSummary.length, missingSegmentNames: expressions.filter((r) => r.status === 'missing-segment-name').length,
    expressionsByStatus: counts },
  addresslessIds, candidates: candidateSummary, expressions,
}, null, 2))
