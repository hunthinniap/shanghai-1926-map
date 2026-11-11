import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { wgs84ToGcj02 } from './lib/coordinate-systems.mjs'
import { planHeritageAddress } from './lib/heritage-addresses.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const folder = path.join(root, 'research/rechecks/2026-11-09-heritage-amap-pois')
const buildings = JSON.parse(fs.readFileSync(path.join(root, 'public/data/shanghai-excellent-historical-buildings/buildings-enriched.json')))
const nameReviews = JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/heritage-amap-alias-reviews.json')))
const nameReviewById = new Map(nameReviews.records.map(record => [record.officialId, record]))
if (nameReviews.schemaVersion !== 1 || nameReviewById.size !== nameReviews.records.length) throw Error('Invalid name alias review IDs')
const map = new Map(JSON.parse(fs.readFileSync(path.join(root, 'public/data/shanghai-excellent-historical-buildings/map-buildings.geojson')))
  .features.map(feature => [feature.properties.officialId, feature]))
const districtCodes = { 黄浦区: '310101', 卢湾区: '310101', 徐汇区: '310104', 长宁区: '310105', 静安区: '310106',
  闸北区: '310106', 原闸北区: '310106', 普陀区: '310107', 虹口区: '310109', 杨浦区: '310110', 闵行区: '310112',
  宝山区: '310113', 嘉定区: '310114', 浦东新区: '310115', 金山区: '310116', 松江区: '310117', 松江县: '310117',
  青浦区: '310118', 青浦县: '310118', 奉贤区: '310120', 崇明区: '310151', 崇明县: '310151' }
const generic = /^(?:[abc]?花园住宅|住宅|里弄住宅|新式里弄|旧式里弄|公寓|办公楼|洋行|学校|医院|民宅|其他|宾馆|酒店|多单位使用)$/u
const records = buildings.records.map(record => {
  const nameReview = nameReviewById.get(record.id)
  if (nameReview && (nameReview.expectedName !== record.official.originalNameOrUse
    || nameReview.expectedListedName !== record.official.listedNameOrUse || nameReview.expectedAddress !== record.official.addressAsListed
    || !nameReview.groups?.length || nameReview.groups.some(group => group.length < 2 || group.some(name => !name || name.length < 4))
    || !nameReview.addresses?.length || !nameReview.note || !nameReview.sources?.length
    || nameReview.sources.some(source => !source.title || !source.url?.startsWith('https://')))) throw Error(`Alias review identity changed: ${record.id}`)
  const feature = map.get(record.id)
  const queries = []
  const region = districtCodes[record.official.districtAsListed] ?? '310000'
  function add(value, kind) {
    const keyword = (value ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' ')
    if (!keyword || keyword.length > 80 || generic.test(keyword.replaceAll(' ', '')) || queries.some(query => query.keywords === keyword)) return
    queries.push({ kind, keywords: keyword, region, city_limit: 'true', page_size: '25', page_num: '1', show_fields: 'children,business,navi,indoor' })
  }
  const addNames = (value, kind) => (value ?? '').split(/[\n/、,，;；]/u).forEach(name => add(name, kind))
  addNames(record.official.originalNameOrUse, 'historic-name')
  addNames(record.wikipedia?.originalNameOrUse, 'wikipedia-name')
  for (const article of record.articleReferences ?? []) add(article.resolvedTitle, 'article-name')
  const addressPlan = planHeritageAddress(record)
  for (const query of addressPlan.queries) add(query.addressText, query.kind)
  for (const query of addressPlan.queries) {
    for (const part of query.addressText?.matchAll(/([^0-9,，、；;()]+(?:路|街|道|巷))(\d+)(?:号)?-(\d+)(弄)?/gu) ?? []) {
      if (!part[4]) {
        add(`${part[1]}${part[2]}号`, 'range-start-door')
        add(`${part[1]}${part[3]}号`, 'range-end-door')
      }
    }
  }
  addNames(record.official.listedNameOrUse, 'listed-use-name')
  // Listed organisations may have moved. Never turn a name query into an
  // accepted assignment without checking the original site's full address.
  const gcj = feature ? wgs84ToGcj02(...feature.geometry.coordinates) : null
  return { officialId: record.id, batch: record.batch, code: record.codeRaw, name: record.official.originalNameOrUse,
    listedName: record.official.listedNameOrUse, officialAddress: record.official.addressAsListed,
    districtAsListed: record.official.districtAsListed, queries,
    ...(nameReview ? { nameReview } : {}),
    wikipediaAddress: record.wikipedia?.addressAsListed ?? null,
    alternateNames: [record.wikipedia?.originalNameOrUse, record.wikipedia?.listedNameOrUse,
      ...(record.articleReferences ?? []).filter(article => article.scope?.scope === 'building-reference').map(article => article.resolvedTitle)].filter(Boolean),
    physicalBuildingNames: [record.official.originalNameOrUse, record.wikipedia?.originalNameOrUse,
      ...(record.articleReferences ?? []).filter(article => article.scope?.scope === 'building-reference').map(article => article.resolvedTitle)].filter(Boolean),
    componentScope: /\d+号楼|[东南西北]楼|主楼|水塔|(?:^|[，,])\s*[a-c]花园/u.test(`${record.official.originalNameOrUse} ${record.official.addressAsListed}`),
    referenceGcj02: gcj ? [gcj.longitude, gcj.latitude] : null,
    referenceSourceUrl: feature?.properties.sourceUrl ?? null,
    referenceScope: feature?.properties.coordinateScope ?? null,
    aroundFallback: gcj ? { endpoint: 'https://restapi.amap.com/v5/place/around', location: `${gcj.longitude},${gcj.latitude}`,
      radius: '200', sortrule: 'distance', region, city_limit: 'true', page_size: '25', page_num: '1', show_fields: 'children,business,navi,indoor',
      note: '仅在文本搜索无法确认后使用；先带有区别性的建筑名，不要将最近商铺自动当成历史建筑。' } : null,
  }
})
if (records.filter(record => record.nameReview).length !== nameReviewById.size) throw Error('Unused alias review')
fs.mkdirSync(folder, { recursive: true })
const output = path.join(folder, 'search-plan.json')
fs.writeFileSync(output, JSON.stringify({ schemaVersion: 1, recordCount: records.length,
  textEndpoint: 'https://restapi.amap.com/v5/place/text',
  note: '候选召回计划，不是已匹配结果；不包含 Key。分区查询仍须校验返回 adcode；旧区名仅用于映射，不改官方门址。',
  districtCodes, records }, null, 2) + '\n')
console.log(JSON.stringify({ output, buildings: records.length, withReferencePoint: records.filter(record => record.referenceGcj02).length,
  plannedQueries: records.reduce((sum, record) => sum + record.queries.length, 0) }, null, 2))
