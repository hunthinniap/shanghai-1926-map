import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Converter } from 'opencc-js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const historicalPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const curatedParksPath = path.join(projectRoot, 'public', 'data', 'curated-parks.geojson')
const sourcesPath = path.join(projectRoot, 'public', 'data', 'sources.json')
const auditPath = path.join(projectRoot, 'public', 'data', 'landmark-current-use-audit.json')
const researchOverridesPath = path.join(projectRoot, 'scripts', 'data', 'landmark-current-use-overrides.json')
const sourceId = 'sh-library-excellent-historical-buildings'
const wikipediaSourceId = 'wikipedia-shanghai-excellent-historical-buildings'
const researchSourceId = 'verified-landmark-current-uses'
const sourcePage = 'https://data.library.sh.cn/shnh/wkl/webapi/building/toAllBuilding'
const wikipediaListPage = 'https://zh.wikipedia.org/zh-cn/上海市优秀历史建筑'
const sourceScript = 'https://data.library.sh.cn/res/js/building/allBuilding.js'
const apiBase = 'https://data.library.sh.cn/shnh/gmwx/webapi/architecture/getArchitectures'
const detailBase = 'https://data.library.sh.cn/shnh/gmwx/webapi/architecture/getArchitectureDetail'
// Virtual Shanghai landmark points can be displaced by roughly 1–1.2 km from
// the present-day building coordinates. A match still requires a full-text
// hit for the historical Chinese name; coordinate proximity alone is rejected.
const maxAcceptedDistanceMetres = 2_500
const simplify = Converter({ from: 'hk', to: 'cn' })

const source = {
  id: sourceId,
  title: '上海图书馆“上海年华”：上海市优秀历史建筑',
  url: sourcePage,
  license: 'CC BY-NC-SA 2.0',
  year: 2026,
}

const wikipediaSource = {
  id: wikipediaSourceId,
  title: '维基百科：上海市优秀历史建筑名单及建筑条目',
  url: wikipediaListPage,
  license: 'CC BY-SA 4.0',
  year: 2026,
}

const researchSource = {
  id: researchSourceId,
  title: '逐地点资料：现址与今日用途',
  url: 'https://www.shanghai.gov.cn/',
  license: '各链接页面条款',
  year: 2026,
}

const wikipediaMatches = new Map([
  ['landmark-st-joseph-church-天主堂', {
    currentUse: '宗教场所',
    currentNameZh: '洋泾浜圣若瑟堂',
    currentAddress: '四川南路36号',
    currentUseSourceUri: 'https://zh.wikipedia.org/zh-cn/洋泾浜圣若瑟堂',
  }],
  ['landmark-french-municipal-council-法工部局', {
    currentUse: '商业 / 办公',
    currentNameZh: '中环广场（原法公董局）',
    currentAddress: '淮海中路375号',
    currentUseSourceUri: wikipediaListPage,
  }],
  ['landmark-french-municipal-council-conseil-municipal-francais-法工部局', {
    currentUse: '商业 / 办公',
    currentNameZh: '中环广场（原法公董局）',
    currentAddress: '淮海中路375号',
    currentUseSourceUri: wikipediaListPage,
  }],
  ['landmark-all-saints-church-中華聖公會-諸聖堂', {
    currentUse: '宗教场所',
    currentNameZh: '诸圣堂',
    currentAddress: '复兴中路425号',
    currentUseSourceUri: 'https://zh.wikipedia.org/zh-cn/诸圣堂_(上海)',
  }],
  ['landmark-great-northern-cable-office-大北電報局', {
    currentUse: '金融办公',
    currentNameZh: '盘谷银行上海分行',
    currentAddress: '中山东一路7号',
    currentUseSourceUri: 'https://zh.wikipedia.org/zh-cn/大北电报公司大楼',
  }],
  ['landmark-capitol-theater-光陸大戯院', {
    currentUse: '历史建筑 / 功能调整中',
    currentNameZh: '光陆大楼',
    currentAddress: '虎丘路146号',
    currentUseSourceUri: 'https://zh.wikipedia.org/zh-cn/光陆大楼',
  }],
  ['landmark-yokohama-specie-bank-横浜正金銀行', {
    currentUse: '金融办公',
    currentNameZh: '中国工商银行上海分行营业部',
    currentAddress: '中山东一路24号',
    currentUseSourceUri: 'https://zh.wikipedia.org/zh-cn/横滨正金银行大楼_(上海)',
  }],
  ['landmark-trinity-church-教堂', {
    currentUse: '宗教场所',
    currentNameZh: '圣三一基督教堂',
    currentAddress: '九江路219号',
    currentUseSourceUri: 'https://zh.wikipedia.org/zh-cn/圣三一堂_(上海)',
  }],
  ['landmark-shanghai-bank-club-上海市銀行公會', {
    currentUse: '办公 / 机构',
    currentNameZh: '爱建公司（原银行公会大楼）',
    currentAddress: '香港路59号',
    currentUseSourceUri: wikipediaListPage,
  }],
  ['landmark-cixiu-temple-慈修庵', {
    currentUse: '宗教场所',
    currentNameZh: '慈修庵',
    currentAddress: '榛岭街15号',
    currentUseSourceUri: 'https://zh.wikipedia.org/zh-cn/慈修庵',
  }],
  ['landmark-blind-children-school-盲童學校', {
    currentUse: '教育',
    currentNameZh: '上海盲童学校',
    currentAddress: '虹桥路1850号',
    currentUseSourceUri: wikipediaListPage,
  }],
  ['landmark-qingxin-middle-school-for-girls-清心女中學', {
    currentUse: '教育',
    currentNameZh: '上海市第八中学',
    currentAddress: '陆家浜路650号',
    currentUseSourceUri: 'https://zh.wikipedia.org/zh-cn/清心女中',
  }],
  ['landmark-xuhui-junior-high-school-徐匯公學', {
    currentUse: '教育',
    currentNameZh: '徐汇中学',
    currentAddress: '虹桥路50号',
    currentUseSourceUri: 'https://zh.wikipedia.org/zh-cn/徐汇公学',
  }],
  ['landmark-consulate-of-russia-俄國領事館', {
    currentUse: '外交机构',
    currentNameZh: '俄罗斯驻上海总领事馆',
    currentAddress: '黄浦路20号',
    currentUseSourceUri: 'https://zh.wikipedia.org/zh-cn/俄罗斯驻上海总领事馆',
  }],
  ['landmark-vs-site-1497', {
    currentUse: '宗教场所',
    currentNameZh: '董家渡天主堂',
    currentAddress: '董家渡185号',
    currentUseSourceUri: 'https://zh.wikipedia.org/zh-cn/董家渡圣方济各沙勿略堂',
  }],
  ['landmark-xujiahui-library-徐家匯圖書館', {
    currentUse: '图书馆 / 文化设施',
    currentNameZh: '上海图书馆徐家汇藏书楼',
    currentAddress: '漕溪北路80号',
    currentUseSourceUri: 'https://zh.wikipedia.org/zh-cn/徐家汇藏书楼',
  }],
].map(([featureGroupId, match]) => [featureGroupId, {
  ...match,
  currentUseSourceId: wikipediaSourceId,
  currentUseMatch: 'historical-name-and-list-record',
}]))

const genericQueries = new Set([
  '住宅', '仓库', '会所', '俱乐部', '公园', '剧院', '医院', '商店', '商场', '学校', '大学',
  '中学', '小学', '工厂', '工场', '教堂', '寺庙', '寺院', '银行', '饭店', '旅馆', '酒店',
  '码头', '车站', '邮局', '邮政局', '警察局', '巡捕房', '青年会', '海关', '办公', '办公室',
])

const queryOverrides = new Map([
  ['Maritime Customs', ['江海关']],
  ['Trinity Church', ['圣三一堂']],
  ['Office of the Postal Service Administration', ['上海邮政管理局']],
  ['Bethel Hospital', ['伯特利医院']],
  ['Commerce Bank of China', ['中国通商银行']],
  ['Lianhua Buddhist Temple', ['莲花寺', '莲花佛寺']],
  ['Church of Christ King', ['君王堂', '基督君王堂']],
])

function distanceMetres([fromLongitude, fromLatitude], [toLongitude, toLatitude]) {
  const radians = (value) => value * Math.PI / 180
  const latitudeDelta = radians(toLatitude - fromLatitude)
  const longitudeDelta = radians(toLongitude - fromLongitude)
  const meanLatitude = radians((fromLatitude + toLatitude) / 2)
  return 6_371_000 * Math.sqrt(
    latitudeDelta ** 2 + (Math.cos(meanLatitude) * longitudeDelta) ** 2,
  )
}

function pointCoordinates(feature) {
  if (feature.geometry?.type !== 'Point') return undefined
  const [longitude, latitude] = feature.geometry.coordinates
  return Number.isFinite(longitude) && Number.isFinite(latitude)
    ? [longitude, latitude]
    : undefined
}

function searchQueries(properties) {
  const currentPlace = properties.category?.startsWith('现存')
  const candidates = [
    ...(currentPlace ? [] : [properties.modernNameZh]),
    properties.historicalChinese,
    ...(properties.historicalRecords ?? []).flatMap((record) => [record.nameZh, record.name]),
    ...(properties.aliases ?? []),
    ...(queryOverrides.get(properties.historicalName) ?? []),
  ]
  return [...new Set(candidates
    .filter((value) => typeof value === 'string' && /[\u3400-\u9fff]/u.test(value))
    .map((value) => simplify(value).replace(/[（）()·/]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((value) => value.length >= 2 && !genericQueries.has(value))
    .slice(0, 3))]
}

function inferCurrentUse(record) {
  const text = String(record.nameS ?? '').replace(/[（(]原[^）)]*[）)]/gu, '')
  const rules = [
    [/寺|教堂|清真|道观|道院|修道|礼拜|天主堂|佛堂|庵|教区|献堂会|焉息堂|清心堂/u, '宗教场所'],
    [/医院|诊所|卫生院|医疗|疗养院|医学院/u, '医疗 / 康养'],
    [/大学|学院|学校|中学|小学|幼儿园|教育/u, '教育'],
    [/博物馆|纪念馆|图书馆|文化馆|美术馆|艺术|剧场|影院|电影院|会堂|剧团/u, '文化设施'],
    [/公园|绿地|广场|公共花园/u, '公园 / 公共开放空间'],
    [/银行|金融|证券|保险/u, '金融办公'],
    [/饭店|宾馆|酒店|旅社|旅馆/u, '酒店 / 住宿'],
    [/餐厅|商厦|商场|商店|百货|商业|公司门市/u, '商业'],
    [/住宅|公寓|新村|居民楼|别墅|里弄|花园住宅|坊/u, '住宅'],
    [/工厂|厂房|制造|仓库|货栈/u, '工业 / 仓储'],
    [/研究所|科学院|实验室/u, '科研'],
    [/监狱|看守所/u, '司法 / 监所'],
    [/体育|运动场|俱乐部|活动中心/u, '体育 / 社区活动'],
    [/政府|人民政府|公安|法院|检察院|管理局|委员会|海关/u, '公共管理'],
    [/公司|集团|办公|办事处|中心|协会|公会/u, '办公 / 机构'],
  ]
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? '现址建筑 / 机构'
}

async function mapWithConcurrency(items, concurrency, callback) {
  const results = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await callback(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

async function fetchApiKey() {
  const response = await fetch(sourceScript)
  if (!response.ok) throw new Error(`Shanghai Library page script failed: ${response.status}`)
  const script = await response.text()
  const apiKey = script.match(/key\s*:\s*["']([a-f0-9]{32,})["']/i)?.[1]
  if (!apiKey) throw new Error('Could not locate the public Shanghai Library API key')
  return apiKey
}

async function queryBuildings(query, apiKey) {
  const url = `${apiBase}?${new URLSearchParams({
    freetext: query,
    isRed: '3',
    key: apiKey,
    pageth: '1',
    iflimit: '1',
  })}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Shanghai Library query failed for ${query}: ${response.status}`)
  const result = await response.json()
  return result.data ?? []
}

async function fetchBuildingDetail(uri, apiKey) {
  const url = `${detailBase}?${new URLSearchParams({ uri, key: apiKey })}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Shanghai Library detail failed for ${uri}: ${response.status}`)
  let result = await response.json()
  if (typeof result === 'string') result = JSON.parse(result)
  return result.data?.[0]
}

function simplifiedNames(detail) {
  return [
    detail?.nameS,
    detail?.nameT,
    ...(detail?.otherNameList ?? []).flatMap((name) => [name.nameS, name.nameT, name.name, name.value]),
  ]
    .filter(Boolean)
    .map((name) => simplify(String(name)).replace(/\s+/g, '').trim())
}

function candidateEvidence(query, detail) {
  if (!detail) return undefined
  const normalizedQuery = simplify(query).replace(/\s+/g, '')
  const names = simplifiedNames(detail)
  if (names.some((name) => name === normalizedQuery)) return 'exact-current-or-alternate-name'
  if (normalizedQuery.length >= 3 && names.some(
    (name) => name.includes(normalizedQuery) || normalizedQuery.includes(name),
  )) return 'partial-current-or-alternate-name'

  const description = simplify([
    detail.des,
    ...(detail.descriptionList ?? []).map((item) => item.description),
  ].filter(Boolean).join(' '))
  const index = description.indexOf(normalizedQuery)
  if (index < 0) return undefined
  const context = description.slice(Math.max(0, index - 45), index + normalizedQuery.length + 45)
  return /原|前身|旧址|曾名|曾用|改称|又称|原址/u.test(context)
    ? 'historical-relation-in-description'
    : undefined
}

function currentPlaceUse(properties) {
  if (!properties.category?.startsWith('现存')) return undefined
  const name = properties.modernNameZh ?? ''
  let currentUse = '公园 / 公共开放空间'
  if (/文化广场/u.test(name)) currentUse = '文化演艺设施 / 公共空间'
  else if (/烈士陵园|陵园/u.test(name)) currentUse = '纪念设施 / 陵园'
  else if (name === '豫园') currentUse = '历史园林 / 旅游景点'
  else if (/私家花园/u.test(properties.category)) currentUse = '历史花园'
  return {
    currentUse,
    currentNameZh: name,
    currentUseMatch: 'documented-current-place',
  }
}

function representativeFeatures(collections) {
  const byGroup = new Map()
  collections.flatMap((collection) => collection.features).forEach((feature) => {
    if (feature.properties?.kind !== 'landmark') return
    if (!byGroup.has(feature.properties.featureGroupId)) {
      byGroup.set(feature.properties.featureGroupId, feature)
    }
  })
  return [...byGroup.values()]
}

const [historical, curatedParks, sources, researchOverrides, apiKey] = await Promise.all([
  fs.readFile(historicalPath, 'utf8').then(JSON.parse),
  fs.readFile(curatedParksPath, 'utf8').then(JSON.parse),
  fs.readFile(sourcesPath, 'utf8').then(JSON.parse),
  fs.readFile(researchOverridesPath, 'utf8').then(JSON.parse),
  fetchApiKey(),
])

const researchRecords = new Map()
for (const match of researchOverrides) {
  if (researchRecords.has(match.featureGroupId)) {
    throw new Error(`Duplicate current-use research override: ${match.featureGroupId}`)
  }
  for (const key of ['featureGroupId', 'currentUse', 'currentNameZh', 'currentAddress', 'currentUseSourceUri', 'evidence']) {
    if (!match[key]) throw new Error(`${match.featureGroupId ?? 'unknown override'} is missing ${key}`)
  }
  researchRecords.set(match.featureGroupId, match)
}

const researchMatches = new Map(researchOverrides.map((match) => [match.featureGroupId, {
  currentUse: match.currentUse,
  currentNameZh: match.currentNameZh,
  currentAddress: match.currentAddress,
  currentUseNote: match.currentUseNote,
  currentUseRelationship: match.currentUseRelationship,
  currentUseSources: match.currentUseSources,
  currentUseSourceId: researchSourceId,
  currentUseSourceUri: match.currentUseSourceUri,
  currentUseMatch: 'verified-online-research',
}]))

function matchedByCurrentOrLegacyGroup(map, properties) {
  const keys = [properties.featureGroupId, ...(properties.legacyFeatureGroupIds ?? [])]
  const matchedKey = keys.find((key) => map.has(key))
  return matchedKey ? { key: matchedKey, value: map.get(matchedKey) } : undefined
}

const allLandmarks = representativeFeatures([historical, curatedParks])
const landmarks = allLandmarks.filter((feature) =>
  pointCoordinates(feature) ||
  matchedByCurrentOrLegacyGroup(researchMatches, feature.properties) ||
  matchedByCurrentOrLegacyGroup(wikipediaMatches, feature.properties) ||
  currentPlaceUse(feature.properties))

function matchingLandmarks(featureGroupId) {
  return allLandmarks.filter((feature) => [
    feature.properties.featureGroupId,
    ...(feature.properties.legacyFeatureGroupIds ?? []),
  ].includes(featureGroupId))
}

function validateManualTargets(entries, label) {
  const targetGroups = new Set()
  for (const [featureGroupId] of entries) {
    const targets = matchingLandmarks(featureGroupId)
    if (targets.length !== 1) {
      throw new Error(`${label} ${featureGroupId} resolves to ${targets.length} landmark groups`)
    }
    const target = targets[0]
    if (targetGroups.has(target.properties.featureGroupId)) {
      throw new Error(`${label} has more than one record for ${target.properties.featureGroupId}`)
    }
    targetGroups.add(target.properties.featureGroupId)

    const record = label === 'Research override' ? researchRecords.get(featureGroupId) : undefined
    if (record?.sourceRecordIds?.length && !record.sourceRecordIds.every(
      (sourceRecordId) => target.properties.sourceRecordIds?.includes(sourceRecordId),
    )) {
      throw new Error(`${label} ${featureGroupId} does not match its guarded Virtual Shanghai record IDs`)
    }
    if (record?.expectedHistoricalNames?.length) {
      const names = new Set([
        target.properties.historicalName,
        target.properties.modernNameZh,
        target.properties.historicalChinese,
        ...(target.properties.aliases ?? []),
        ...(target.properties.historicalRecords ?? []).flatMap((historicalRecord) => [
          historicalRecord.name,
          historicalRecord.nameZh,
        ]),
      ].filter(Boolean))
      const missingNames = record.expectedHistoricalNames.filter((name) => !names.has(name))
      if (missingNames.length) {
        throw new Error(`${label} ${featureGroupId} is missing guarded historical names: ${missingNames.join(', ')}`)
      }
    }
  }
}

validateManualTargets(researchRecords, 'Research override')
validateManualTargets(wikipediaMatches, 'Wikipedia override')

const queryJobs = landmarks
  .filter((feature) => !matchedByCurrentOrLegacyGroup(researchMatches, feature.properties))
  .filter((feature) => !matchedByCurrentOrLegacyGroup(wikipediaMatches, feature.properties))
  .filter((feature) => !currentPlaceUse(feature.properties))
  .flatMap((feature) => searchQueries(feature.properties).map((query) => ({
  feature,
  query,
})))
const uniqueQueries = [...new Set(queryJobs.map((job) => job.query))]
const queryResults = await mapWithConcurrency(uniqueQueries, 8, async (query) => [
  query,
  await queryBuildings(query, apiKey),
])
const resultsByQuery = new Map(queryResults)

const preliminaryRecords = landmarks.map((feature) => {
  const coordinates = pointCoordinates(feature)
  const hasManualResolution = Boolean(
    matchedByCurrentOrLegacyGroup(researchMatches, feature.properties) ||
    matchedByCurrentOrLegacyGroup(wikipediaMatches, feature.properties) ||
    currentPlaceUse(feature.properties),
  )
  const queries = hasManualResolution ? [] : searchQueries(feature.properties)
  const candidates = queries.flatMap((query) => (resultsByQuery.get(query) ?? []).map((record) => ({
    query,
    record,
    distanceMetres: distanceMetres(coordinates, [Number(record.long), Number(record.lat)]),
  })))
    .filter((candidate) => Number.isFinite(candidate.distanceMetres))
    .sort((left, right) => left.distanceMetres - right.distanceMetres)

  return { feature, queries, candidates }
})

const candidateUris = [...new Set(preliminaryRecords.flatMap(({ candidates }) => candidates
  .filter((candidate) => candidate.distanceMetres <= maxAcceptedDistanceMetres)
  .map((candidate) => candidate.record.uri)))]
const detailResults = await mapWithConcurrency(candidateUris, 8, async (uri) => [
  uri,
  await fetchBuildingDetail(uri, apiKey),
])
const detailsByUri = new Map(detailResults)

const evaluatedRecords = preliminaryRecords.map(({ feature, queries, candidates }) => {
  const evaluatedCandidates = candidates
    .filter((candidate) => candidate.distanceMetres <= maxAcceptedDistanceMetres)
    .map((candidate) => ({
      ...candidate,
      detail: detailsByUri.get(candidate.record.uri),
      evidence: candidateEvidence(candidate.query, detailsByUri.get(candidate.record.uri)),
    }))
  const supported = evaluatedCandidates.find((candidate) => [
    'exact-current-or-alternate-name',
    'historical-relation-in-description',
  ].includes(candidate.evidence))
  const partial = evaluatedCandidates.find(
    (candidate) => candidate.evidence === 'partial-current-or-alternate-name',
  )
  return { feature, queries, candidates, supported, partial }
})

const supportedUriOwners = new Map()
for (const { feature, supported } of evaluatedRecords) {
  if (!supported) continue
  const owners = supportedUriOwners.get(supported.record.uri) ?? []
  owners.push(feature.properties.featureGroupId)
  supportedUriOwners.set(supported.record.uri, owners)
}
const duplicateSupportedUris = new Set([...supportedUriOwners]
  .filter(([, owners]) => owners.length > 1)
  .map(([uri]) => uri))

const matches = new Map()
const auditRecords = evaluatedRecords.map(({ feature, queries, candidates, supported, partial }) => {
  const duplicateSource = supported && duplicateSupportedUris.has(supported.record.uri)
  const accepted = duplicateSource ? undefined : supported
  const documentedCurrentPlace = currentPlaceUse(feature.properties)
  const wikipediaResolution = matchedByCurrentOrLegacyGroup(wikipediaMatches, feature.properties)
  const researchResolution = matchedByCurrentOrLegacyGroup(researchMatches, feature.properties)
  const wikipediaMatch = wikipediaResolution?.value
  const researchMatch = researchResolution?.value
  if (researchMatch) {
    matches.set(feature.properties.featureGroupId, researchMatch)
  } else if (wikipediaMatch) {
    matches.set(feature.properties.featureGroupId, wikipediaMatch)
  } else if (documentedCurrentPlace) {
    matches.set(feature.properties.featureGroupId, documentedCurrentPlace)
  } else if (accepted) {
    const currentRecord = accepted.detail ?? accepted.record
    matches.set(feature.properties.featureGroupId, {
      currentUse: inferCurrentUse(currentRecord),
      currentNameZh: currentRecord.nameS,
      currentAddress: currentRecord.address,
      currentUseSourceId: sourceId,
      currentUseSourceUri: accepted.record.uri,
      currentUseMatch: 'historical-name-and-location',
      currentUseMatchDistance: Math.round(accepted.distanceMetres),
    })
  }

  const status = researchMatch
    ? 'matched-research'
    : wikipediaMatch
      ? 'matched-wikipedia'
      : documentedCurrentPlace
        ? 'current-place-name'
        : accepted
          ? 'matched'
          : duplicateSource
            ? 'needs-review-duplicate-source'
            : partial
              ? 'needs-review-partial-name'
        : queries.length
          ? 'not-found'
          : 'generic-name'

  return {
    featureGroupId: feature.properties.featureGroupId,
    historicalName: feature.properties.historicalName,
    historicalChinese: feature.properties.historicalChinese,
    mappedName: feature.properties.modernNameZh,
    category: feature.properties.category,
    queries,
    searchResultCount: candidates.length,
    status,
    accepted: researchMatch ? {
      ...researchMatch,
      evidence: researchRecords.get(researchResolution.key)?.evidence,
      matchedLegacyFeatureGroupId: researchResolution.key,
    } : (accepted ? {
      currentNameZh: (accepted.detail ?? accepted.record).nameS,
      currentAddress: (accepted.detail ?? accepted.record).address,
      currentUse: inferCurrentUse(accepted.detail ?? accepted.record),
      distanceMetres: Math.round(accepted.distanceMetres),
      sourceUri: accepted.record.uri,
      query: accepted.query,
      evidence: accepted.evidence,
    } : wikipediaMatch ?? documentedCurrentPlace),
    reviewCandidate: !accepted && (supported ?? partial) ? {
      currentNameZh: ((supported ?? partial).detail ?? (supported ?? partial).record).nameS,
      currentAddress: ((supported ?? partial).detail ?? (supported ?? partial).record).address,
      distanceMetres: Math.round((supported ?? partial).distanceMetres),
      sourceUri: (supported ?? partial).record.uri,
      query: (supported ?? partial).query,
      evidence: (supported ?? partial).evidence,
      duplicateOwners: duplicateSource ? supportedUriOwners.get(supported.record.uri) : undefined,
    } : undefined,
    nearestSearchResult: !accepted && !(supported ?? partial) && candidates[0] ? {
      currentNameZh: candidates[0].record.nameS,
      currentAddress: candidates[0].record.address,
      distanceMetres: Math.round(candidates[0].distanceMetres),
      query: candidates[0].query,
    } : undefined,
  }
})

function applyMatches(collection) {
  return {
    ...collection,
    features: collection.features.map((feature) => {
      if (feature.properties?.kind !== 'landmark') return feature
      const currentUse = matches.get(feature.properties.featureGroupId)
      const cleanedProperties = { ...feature.properties }
      for (const key of [
        'currentUse',
        'currentNameZh',
        'currentAddress',
        'currentUseNote',
        'currentUseRelationship',
        'currentUseSources',
        'currentUseSourceId',
        'currentUseSourceUri',
        'currentUseMatch',
        'currentUseMatchDistance',
      ]) delete cleanedProperties[key]
      return currentUse
        ? { ...feature, properties: { ...cleanedProperties, ...currentUse } }
        : { ...feature, properties: cleanedProperties }
    }),
  }
}

const updatedHistorical = applyMatches(historical)
const updatedParks = applyMatches(curatedParks)
const updatedSources = [
  ...sources.filter((entry) => ![sourceId, wikipediaSourceId, researchSourceId].includes(entry.id)),
  source,
  wikipediaSource,
  researchSource,
]
const audit = {
  generatedAt: new Date().toISOString(),
  source: sourcePage,
  rules: {
    method: 'Shanghai Library full-text historical-name match plus coordinate check',
    maximumDistanceMetres: maxAcceptedDistanceMetres,
    locationOnlyMatchesAccepted: false,
    partialNameMatchesAccepted: false,
    duplicateSourceMatchesAccepted: false,
  },
  summary: {
    landmarkGroups: landmarks.length,
    matchedFromLibrary: auditRecords.filter((record) => record.status === 'matched').length,
    matchedFromWikipedia: auditRecords.filter((record) => record.status === 'matched-wikipedia').length,
    matchedFromResearch: auditRecords.filter((record) => record.status === 'matched-research').length,
    matchedFromCurrentPlaceName: auditRecords.filter((record) => record.status === 'current-place-name').length,
    needsReviewPartialName: auditRecords.filter((record) => record.status === 'needs-review-partial-name').length,
    needsReviewDuplicateSource: auditRecords.filter((record) => record.status === 'needs-review-duplicate-source').length,
    notFound: auditRecords.filter((record) => record.status === 'not-found').length,
    genericName: auditRecords.filter((record) => record.status === 'generic-name').length,
  },
  records: auditRecords,
}

await Promise.all([
  fs.writeFile(historicalPath, `${JSON.stringify(updatedHistorical)}\n`, 'utf8'),
  fs.writeFile(curatedParksPath, `${JSON.stringify(updatedParks, null, 2)}\n`, 'utf8'),
  fs.writeFile(sourcesPath, `${JSON.stringify(updatedSources, null, 2)}\n`, 'utf8'),
  fs.writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8'),
])

console.log(
  `Matched ${audit.summary.matchedFromLibrary} landmark groups from Shanghai Library and ` +
    `${audit.summary.matchedFromWikipedia} from Wikipedia's protected-building list; ` +
    `${audit.summary.matchedFromResearch} from verified per-place web research; ` +
    `${audit.summary.matchedFromCurrentPlaceName} current parks from their documented present names; ` +
    `${audit.summary.notFound} named groups were not found and ${audit.summary.genericName} only had generic names.`,
)
