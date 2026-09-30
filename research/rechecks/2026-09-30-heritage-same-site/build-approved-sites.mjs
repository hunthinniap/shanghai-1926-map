import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (filename) => JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8'))
const review = read('research/rechecks/2026-09-30-heritage-same-site/approvals.json')
const frenchReview = read('research/rechecks/2026-10-01-french-concession-review.json')
const candidates = [
  ...read('research/rechecks/2026-09-19-heritage-landmark-links/candidates.json').candidates,
  ...read('research/rechecks/2026-09-20-heritage-card-review/supplemental-candidates.json').candidates,
]
const candidatesById = new Map(candidates.map((candidate) => [candidate.candidateId, candidate]))
const mappedOfficialIds = new Set(read('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson')
  .features.map((feature) => feature.properties.officialId))
const additionalApprovals = frenchReview.decisions.filter((item) => item.decision === 'approve-same-site')
const approvals = [...review.candidates, ...additionalApprovals]
const approved = approvals.map((item) => {
  const originalCandidate = candidatesById.get(item.candidateId)
  return {
    ...item,
    candidate: originalCandidate && item.correctedHeritage
      ? {
        ...originalCandidate,
        heritage: {
          ...originalCandidate.heritage,
          ...item.correctedHeritage,
          sourceReferences: [item.correctedHeritage.sourceUrl],
        },
      }
      : originalCandidate,
  }
})
if (review.candidates.length !== 20 || additionalApprovals.length !== 7
  || approved.length !== 27 || new Set(approved.map((item) => item.row)).size !== 27
  || approved.some(({ candidate }) => !candidate)) throw new Error('Approval list does not resolve to 27 unique candidates')
for (let index = 0; index < 20; index += 1) {
  if (approved[index].row !== `C${String(index + 1).padStart(3, '0')}`) {
    throw new Error(`Approval row order changed at ${index + 1}`)
  }
}
const located = approved.filter(({ candidate }) => mappedOfficialIds.has(candidate.heritage.officialId))
const unlocated = approved.filter(({ candidate }) => !mappedOfficialIds.has(candidate.heritage.officialId))
if (located.length !== 16 || unlocated.length !== 11) throw new Error('Heritage coordinate coverage changed; re-review display policy')

const directSources = new Map([
  ['C001', { title: 'Building Russian Shanghai · 修德堂旧址', url: 'https://brs.russianshanghai.city/architects/m-z/a-j-yaron' }],
  ['C004', { title: '耶松船厂旧址沿革', url: 'https://zh.wikipedia.org/zh-sg/耶松船厂旧址' }],
  ['C005', { title: '高阳大楼沿革', url: 'https://zh.wikipedia.org/zh-sg/高陽大樓' }],
  ['C006', { title: '新民晚报 · 中国大戏院沿革', url: 'https://paper.xinmin.cn/html/shequ/2022-06-29/06/5386.html' }],
  ['C020', { title: '上海市文旅 · 大北电报新楼', url: 'https://english.shanghai.gov.cn/en-CultureHeritage/20251028/ed891dffdfb14193ad6368aad5aaf5ad.html' }],
  ['C026', { title: '丽波花园 · 两类住宅沿革', url: 'https://zh.wikipedia.org/wiki/丽波花园' }],
  ['C053', { title: '看看新闻 · 淮海中路1131号门牌沿革', url: 'https://www.kankanews.com/detail/80299RV8n26' }],
  ['C056', { title: '上海理工大学 · 复兴路校区沿革', url: 'https://www.sbc.usst.edu.cn/2023/0908/c14877a305011/page.htm' }],
])
const scopeNotes = new Map([
  ['C002', '丽波花园含吴兴路87号东主楼（2D038）及衡山路300弄里弄（4D027），同属住宅群但非同一栋；旧址177 PERSHING保留原文，不推定门牌未变。'],
  ['C003', '历史地址25 QUAI DE FRANCE与名录中山东二路22号门牌不一致；保留原文，不推定旧新门牌未变。'],
  ['C005', '南洋兄弟烟草公司与高阳大楼沿革相合；VS旧门牌833 EAST BROADWAY ROAD与名录东大名路817号不同，保留原文，不推定门牌未变。'],
  ['C007', '丁香花园范围与2D013主楼、4D023花园住宅同址；两项保护建筑分别保留，不认定为同一栋。'],
  ['C009', '虹桥俱乐部与虹桥路2419号院落同址，不将俱乐部指定为名录中的2号楼或3号楼。'],
  ['C020', '原候选2A004位于中山东一路7号，与VS #545的34 EDWARD VII ROAD不同址；改配延安东路34号的3A005。两栋都曾由大北电报使用，不能混为一楼。'],
  ['C038', '新华日报旧址29 RUE MONTAUBAN落在名录四川南路27—29号范围；报社是该址历史用途，不认定其占用约克大楼全部楼体。'],
  ['C041', '法国兵营旧址319 ROUTE GHISI与岳阳路319号院落同址；名录4D045为院内11号楼，尚不能认定兵营就在该单栋。'],
  ['C048', '球场旧址72 ROUTE PAUL LEGENDRE与兴国路72号院落同址；球场属历史场地，不等同名录1M006的宾馆1号楼。现用途待核继续保留。'],
  ['C053', '网球场旧址1131 AVENUE JOFFRE与淮海中路1131号同址；场地用途不等同名录花园住宅本体。'],
  ['C056', '中法工学院与名录3D001属于复兴中路1195号旧校园沿革；406 AVENUE DU ROI ALBERT保留为旧门址线索，不推定单栋相同。'],
])
const unlocatedScopeNotes = new Map([
  ['C010', '名录旧表写秦岭街15号；市房管局2023年慈修庵修缮批复写榛岭街15号。两种原文并存，不擅改官方名录。'],
  ['C036', '建筑史资料将433 AVENUE HAIG明确对应华山路699—731号枕流公寓；因该名录项暂缺独立地图点，仍使用VS历史地标参考点。'],
])
const unlocatedScopeSources = new Map([
  ['C010', 'https://fgj.sh.gov.cn/yxlsjzjk/20240201/680e399bdfd8406a8c3fc734071bf847.html'],
  ['C036', 'https://brs.russianshanghai.city/architects/m-z/g-b-rabinovich'],
])
const groups = new Map()
for (const item of located) {
  const key = item.candidate.landmark.featureId
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(item)
}
const links = [...groups.values()].map((items) => {
  const primary = items[0]
  const { candidate } = primary
  const isGarden = items.length > 1
  return {
    id: `user-same-site-${primary.row.toLowerCase()}`,
    officialId: candidate.heritage.officialId,
    ...(isGarden ? { additionalHeritageOfficialIds: items.slice(1).map(({ candidate: extra }) => extra.heritage.officialId) } : {}),
    landmarkFeatureId: candidate.landmark.featureId,
    expectedSourceRecordIds: candidate.landmark.sourceRecordIds,
    ...(candidate.landmark.sourceParkRecordIds.length
      ? { expectedSourceParkRecordIds: candidate.landmark.sourceParkRecordIds } : {}),
    historicalAddresses: candidate.landmark.historicalAddresses.map(({ sourceRecordId, address, sourceUrl }) => ({
      sourceRecordId, address, sourceUrl,
    })),
    relation: isGarden ? 'same-listed-complex' : 'same-historical-site',
    scopeNote: scopeNotes.get(primary.row)
      ?? '人工审定为同址关系；不因此断言现存保护楼体就是历史记录所指的同一栋。',
    note: primary.row === 'C020'
      ? '用户提出同址；核对原始地址后从2A004更正为3A005。原始门牌、历史用途和名录范围分别保留。'
      : `用户分批审定候选${items.map((item) => item.row).join('、')}为同址；原始门牌、历史用途和名录范围分别保留。`,
    sources: items.map((item) => directSources.get(item.row)).filter(Boolean),
  }
})
const unlocatedSites = unlocated.map(({ row, candidate }) => ({
  candidateId: candidate.candidateId,
  row,
  landmarkFeatureId: candidate.landmark.featureId,
  expectedSourceRecordIds: candidate.landmark.sourceRecordIds,
  officialId: candidate.heritage.officialId,
  officialCode: candidate.heritage.code,
  name: candidate.heritage.originalName,
  address: candidate.heritage.address,
  sourceUrl: candidate.heritage.sourceReferences.find((url) => url.includes('fgj.sh.gov.cn')),
  ...(unlocatedScopeNotes.has(row) ? { scopeNote: unlocatedScopeNotes.get(row) } : {}),
  ...(unlocatedScopeSources.has(row) ? { scopeSourceUrl: unlocatedScopeSources.get(row) } : {}),
}))
if (unlocatedSites.some((site) => !site.sourceUrl)) throw new Error('Unlocated site is missing official source')
const destination = path.join(root, 'src/data/userApprovedHeritageSites.ts')
const source = `// Generated from the 2026-09-30 same-site approvals and 2026-10-01 French-concession review.\n`
  + `// These are same-site decisions, not assertions that each VS point is the listed surviving building.\n`
  + `import type { HeritageLandmarkLink } from '../lib/heritageLandmarkLinks'\n\n`
  + `export const userApprovedHeritageSiteLinks: HeritageLandmarkLink[] = ${JSON.stringify(links, null, 2)}\n\n`
  + `export interface ApprovedUnlocatedHeritageSite {\n`
  + `  candidateId: string\n  row: string\n  landmarkFeatureId: string\n`
  + `  expectedSourceRecordIds: number[]\n  officialId: string\n  officialCode: string\n`
  + `  name: string\n  address: string\n  sourceUrl: string\n  scopeNote?: string\n  scopeSourceUrl?: string\n}\n\n`
  + `export const approvedUnlocatedHeritageSites: ApprovedUnlocatedHeritageSite[] = ${JSON.stringify(unlocatedSites, null, 2)}\n`
if (process.argv.includes('--check')) {
  if (fs.readFileSync(destination, 'utf8') !== source) throw new Error('Approved site configuration is stale')
} else {
  fs.writeFileSync(destination, source)
}
console.log(`${process.argv.includes('--check') ? 'Checked' : 'Wrote'} ${links.length} map links (${located.length} approvals) and ${unlocatedSites.length} no-coordinate site annotations.`)
