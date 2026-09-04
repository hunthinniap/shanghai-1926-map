import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { utm51nToWgs84, wgs84ToGcj02 } from './lib/coordinate-systems.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const chunk = process.argv[2] ?? '001'
if (!/^\d{3}$/u.test(chunk)) throw new Error(`Invalid chunk number: ${chunk}`)

const liveChunkPath = path.join(projectRoot, 'public', 'data', 'unresolved-landmarks', `${chunk}.json`)
const snapshotPath = path.join(projectRoot, 'scripts', 'data', 'virtual-shanghai-buildings-live.json')
const researchDirectory = path.join(projectRoot, 'research', 'unresolved-landmarks')
const inputSnapshotPath = path.join(researchDirectory, `${chunk}-input.json`)
const partPaths = ['a', 'b', 'c'].map((part) => path.join(researchDirectory, `${chunk}-${part}.json`))
const outputPath = path.join(researchDirectory, `${chunk}-results.json`)
const workflowOutputPath = path.join(
  projectRoot,
  'scripts',
  'data',
  `unresolved-landmarks-${chunk}-research.json`,
)
const allowedStatuses = new Set(['verified', 'likely', 'unresolved'])
const statusOrder = new Map([
  ['verified', 0],
  ['likely', 1],
  ['unresolved', 2],
])
const sourceDataIssues = new Map([
  [407, '原 FUNCTION 将建筑 Adeodata Hall 归为 park；现址资料证明它是历史住宅建筑，现作文化空间。'],
  [75, '公开资料同时出现延安东路725号与755号两个旧门牌版本。'],
  [538, 'Virtual Shanghai 记录年代为1940年，现存交通银行大楼1948年才竣工；二者是同一机构地块上的前后建筑。'],
  [1776, '原地址、坐标和“15 Apartments”名称之间尚无法相互校验。'],
  [1033, '原地址与坐标落点之间存在明显冲突。'],
  [465, '英文名称为 Temple，但原 FUNCTION 指向小学，来源字段互相冲突。'],
  [1189, '英文名称为 Base Ball Ground，历史中文字段却写“美军靶子场”，用途字段互相冲突。'],
  [4134, '原始坐标已经是WGS84经纬度，但其落点与华山路670号历史地址明显不符；保留原坐标并禁止据此自动落位。'],
])
const explicitlyApprovedMapWriteIds = new Set([569])

const roadNames = new Map([
  ['AVENUE HAIG', '华山路'],
  ['NORTH SZECHUEN ROAD', '四川北路'],
  ['AVENUE JOFFRE', '淮海中路'],
  ['YUYUEN ROAD', '愚园路'],
  ['AVENUE ROAD', '北京西路'],
  ['AVENUE DU ROI ALBERT', '陕西南路'],
  ['HONGKONG ROAD', '香港路'],
  ['HAIPHONG ROAD', '海防路'],
  ['BOONE ROAD', '塘沽路'],
  ['BROADWAY ROAD', '大名路'],
  ['FOOCHOW ROAD', '福州路'],
  ['ROUTE LOUIS DUFOUR', '乌鲁木齐南路'],
  ['GORDON ROAD', '江宁路'],
  ['EDWARD VII', '延安东路'],
  ['BUND ROAD', '中山东一路'],
  ['WHANGPOO ROAD', '黄浦路'],
  ['ROUTE VALLON', '南昌路'],
  ['ROUTE BOURGEAT', '长乐路'],
  ['AVENUE DUBAIL', '重庆南路'],
  ['ROUTE DU PERE FROC', '合肥路'],
  ['ROBISON ROAD', '长寿路'],
  ['BOULEVARD DES DEUX REPUBLIQUES', '人民路'],
  ['RUE AMIRAL BAYLE', '黄陂南路'],
  ['TIENDONG ROAD', '天潼路'],
  ['SZECHUEN ROAD', '四川中路'],
  ['QUAI DE FRANCE', '中山东二路'],
  ['KULING ROAD', '牯岭路'],
  ['MINHONG', '闵行路'],
  ['XIBAOXING LU', '西宝兴路'],
  ['CHANGPING ROAD', '昌平路'],
  ['TOLUN', '多伦路'],
  ['ROUTE BRIDOU', '吴兴路'],
  ['ROUTE JOSEPH FRELUPT', '建国西路'],
  ['YANGJIADU LU', '杨家渡路'],
  ['NANYANG', '南阳路'],
  ['CONNAUGHT ROAD', '康定路'],
  ['TONQUIN ROAD', '昌化路'],
  ['ROUTE RAYMOND TENANT DE LA TOUR', '襄阳南路'],
  ['MUSEUM ROAD', '虎丘路'],
  ['CHENGTU ROAD', '成都北路'],
  ['ROUTE DE ZIKAWEI', '徐家汇路'],
  ['HANKOW ROAD', '汉口路'],
  ['BUBBLING WELL ROAD', '南京西路'],
  ['KIANGSE ROAD', '江西中路'],
  ['SINGAPORE ROAD', '余姚路'],
  ['ROUTE LORTON', '襄阳北路'],
  ['SINZA ROAD', '新闸路'],
  ['ROUTE AMIRAL COURBET', '富民路'],
  ['CANTON ROAD', '广东路'],
  ['TATUNG ROAD', '大田路'],
  ['RUE DE NINGPO', '淮海东路'],
  ['ROUTE MAYEN', '华亭路'],
  ['TSEPOO ROAD', '七浦路'],
  ['YUYACHING ROAD', '西藏中路'],
  ['ROUTE DE GROUCHY', '延庆路'],
  ['HANNEN ROAD', '海南路'],
  ['NORTH SOOCHOW ROAD', '北苏州路'],
  ['NEWCHWANG ROAD', '牛庄路'],
  ['CHAOFOONG ROAD', '高阳路'],
  ['WANPING NANLI', '宛平南路'],
  ['BAOTONG', '宝通路'],
  ["TIANTONG'AN", '天通庵路'],
  ['WAIMA', '外马路'],
  ['PANJIAWAN', '潘家湾路'],
  ['JIANGWAN', '东江湾路'],
])

function sourceCoordinates(raw) {
  if (Math.abs(raw.XC) <= 180 && Math.abs(raw.YC) <= 90) {
    return {
      sourceCrs: 'EPSG:4326',
      wgs84: {
        longitude: Number(raw.XC.toFixed(6)),
        latitude: Number(raw.YC.toFixed(6)),
      },
    }
  }
  return { sourceCrs: 'EPSG:32651', wgs84: utm51nToWgs84(raw.XC, raw.YC) }
}

function mappedRoads(address) {
  const upperAddress = String(address ?? '').toUpperCase()
  const matches = []
  for (const [historicalName, modernNameZh] of [...roadNames].sort(
    ([left], [right]) => right.length - left.length,
  )) {
    if (!upperAddress.includes(historicalName)) continue
    if (historicalName === 'SZECHUEN ROAD' && upperAddress.includes('NORTH SZECHUEN ROAD')) continue
    matches.push({ historicalName, modernNameZh })
  }
  return matches
}

function modernRoadAddress(address) {
  let translated = String(address ?? '').toUpperCase()
  let changed = false
  for (const [historicalName, modernNameZh] of [...roadNames].sort(
    ([left], [right]) => right.length - left.length,
  )) {
    if (!translated.includes(historicalName)) continue
    if (historicalName === 'SZECHUEN ROAD' && translated.includes('NORTH SZECHUEN ROAD')) continue
    translated = translated.replaceAll(historicalName, modernNameZh)
    changed = true
  }
  return changed ? translated.replace(/\s+/gu, ' ').trim() : null
}

function outcomeCategory(record) {
  if (record.verificationStatus !== 'verified') return 'location-only-current-use'
  return /demolished|site-redeveloped(?!-partially-preserved)/u.test(record.relationship ?? '')
    ? 'demolished-current-use'
    : 'survives-with-history'
}

function mapWriteRecommendation(record) {
  if (record.verificationStatus === 'unresolved') return 'no'
  if (record.verificationStatus === 'likely') return 'review'
  if (explicitlyApprovedMapWriteIds.has(record.IDBAT)) return 'yes'
  if (/待核|待查|尚不明确/u.test(`${record.currentUse ?? ''} ${record.notes ?? ''}`)) return 'review'
  return 'yes'
}

await fs.mkdir(researchDirectory, { recursive: true })
let rawRecords
try {
  rawRecords = await fs.readFile(inputSnapshotPath, 'utf8').then(JSON.parse)
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  const sourceText = await fs.readFile(liveChunkPath, 'utf8')
  rawRecords = JSON.parse(sourceText)
  await fs.writeFile(inputSnapshotPath, `${JSON.stringify(rawRecords, null, 2)}\n`, 'utf8')
}
const snapshot = await fs.readFile(snapshotPath, 'utf8').then(JSON.parse)
const liveById = new Map(snapshot.records.map((record) => [record.id, record]))
const researchParts = await Promise.all(partPaths.map(
  (partPath) => fs.readFile(partPath, 'utf8').then(JSON.parse),
))
const researchRecords = researchParts.flat()
const researchById = new Map(researchRecords.map((record) => [record.IDBAT, record]))
const rawIds = new Set(rawRecords.map((record) => record.IDBAT))

if (researchById.size !== researchRecords.length) {
  throw new Error('Research parts contain duplicate Virtual Shanghai IDs')
}
for (const research of researchRecords) {
  if (!rawIds.has(research.IDBAT)) {
    throw new Error(`Research parts contain an ID outside chunk ${chunk}: ${research.IDBAT}`)
  }
  if (!allowedStatuses.has(research.verificationStatus)) {
    throw new Error(`Invalid verification status for #${research.IDBAT}: ${research.verificationStatus}`)
  }
  if (research.sources !== undefined && !Array.isArray(research.sources)) {
    throw new Error(`Sources must be an array for #${research.IDBAT}`)
  }
  for (const source of research.sources ?? []) {
    if (!source.title || !/^https?:\/\//u.test(source.url ?? '')) {
      throw new Error(`Invalid research source for #${research.IDBAT}`)
    }
  }
}

const records = rawRecords.map((raw) => {
  const research = researchById.get(raw.IDBAT)
  if (!research) throw new Error(`Missing research record for Virtual Shanghai #${raw.IDBAT}`)
  const live = liveById.get(raw.IDBAT)
  if (!live) throw new Error(`Missing live Virtual Shanghai record #${raw.IDBAT}`)
  const { sourceCrs, wgs84 } = sourceCoordinates(raw)
  const gcj02 = wgs84ToGcj02(wgs84.longitude, wgs84.latitude)
  if (wgs84.longitude < 120.8 || wgs84.longitude > 122 || wgs84.latitude < 30.5 || wgs84.latitude > 31.8) {
    throw new Error(`Converted coordinate for #${raw.IDBAT} falls outside greater Shanghai`)
  }
  const references = [
    {
      title: `Virtual Shanghai 建筑记录 #${raw.IDBAT}`,
      url: `https://www.virtualshanghai.net/data/buildings?ID=${raw.IDBAT}`,
    },
    ...(research.sources ?? []),
  ]
  const uniqueReferences = [...new Map(references.map((reference) => [reference.url, reference])).values()]
  return {
    ...raw,
    historicalNameZh: live.nameZh ?? null,
    historicalStartYear: live.startYear ?? null,
    historicalEndYear: live.endYear ?? null,
    coordinates: {
      sourceCrs,
      wgs84,
      gcj02,
    },
    historicalRoadMappings: mappedRoads(raw.F_ADDRESS),
    currentNameZh: research.currentNameZh ?? null,
    currentAddress: research.currentAddress ?? null,
    currentUse: research.currentUse ?? null,
    relationship: research.relationship ?? null,
    verificationStatus: research.verificationStatus,
    notes: research.notes ?? null,
    references: uniqueReferences,
  }
})

records.sort((left, right) =>
  statusOrder.get(left.verificationStatus) - statusOrder.get(right.verificationStatus) ||
  String(left.NAME ?? '').localeCompare(String(right.NAME ?? ''), 'en'),
)

const verificationSummary = Object.fromEntries(
  ['verified', 'likely', 'unresolved'].map((status) => [
    status,
    records.filter((record) => record.verificationStatus === status).length,
  ]),
)
if (records.length !== rawRecords.length || Object.values(verificationSummary).reduce((a, b) => a + b, 0) !== records.length) {
  throw new Error('Research status is missing or invalid')
}

await fs.writeFile(outputPath, `${JSON.stringify({
  methodology: {
    coordinateTransform: 'EPSG:32651 → EPSG:4326; GCJ-02 is supplied only for comparison with Chinese map services.',
    evidencePolicy: 'verified requires a source that directly identifies the place or present site; likely is a spatial/name inference; unresolved means no reliable modern identity was found.',
    roadNameMapping: 'Matched against the project historical-road index and manually reviewed for this batch.',
    resultOrdering: 'Records are ordered verified → likely → unresolved; original Virtual Shanghai fields remain unchanged inside each record.',
  },
  recordCount: records.length,
  verificationSummary,
  records,
}, null, 2)}\n`, 'utf8')

const workflowRecords = records.map((record) => {
  const recommendation = mapWriteRecommendation(record)
  const category = outcomeCategory(record)
  const evidence = record.notes ?? (
    record.verificationStatus === 'unresolved'
      ? '尚未找到能把历史名称、门牌或坐标与今天具体地点闭环的可靠资料。'
      : '现有名称、地址或空间线索具有一致性，但还缺少直接沿革或地籍证据。'
  )
  return {
    IDBAT: record.IDBAT,
    historicalName: record.NAME,
    ...(record.historicalNameZh ? { historicalNameCorrectionZh: record.historicalNameZh } : {}),
    ...(record.historicalStartYear !== null ? { historicalStartYear: record.historicalStartYear } : {}),
    ...(record.historicalEndYear !== null ? { historicalEndYear: record.historicalEndYear } : {}),
    coordinates: {
      wgs84: [record.coordinates.wgs84.longitude, record.coordinates.wgs84.latitude],
      gcj02: [record.coordinates.gcj02.longitude, record.coordinates.gcj02.latitude],
    },
    modernRoadAddress: modernRoadAddress(record.F_ADDRESS),
    outcomeCategory: category,
    resolutionStatus: record.verificationStatus === 'verified'
      ? 'resolved'
      : record.verificationStatus === 'likely'
        ? 'probable'
        : 'unresolved',
    confidence: record.verificationStatus === 'verified'
      ? 'high'
      : record.verificationStatus === 'likely'
        ? 'medium'
        : 'low',
    currentNameZh: record.currentNameZh,
    currentUse: record.currentUse,
    currentAddress: record.currentAddress,
    currentUseRelationship: record.relationship ?? 'coordinate-only',
    mapWriteRecommendation: recommendation,
    ...(sourceDataIssues.has(record.IDBAT) ? { sourceDataIssue: sourceDataIssues.get(record.IDBAT) } : {}),
    evidence,
    sourceUrls: record.references.map((reference) => reference.url),
  }
})

const countBy = (values, key) => Object.fromEntries(
  [...new Set(values.map((value) => value[key]))].map((name) => [
    name,
    values.filter((value) => value[key] === name).length,
  ]),
)

await fs.writeFile(workflowOutputPath, `${JSON.stringify({
  batch: chunk,
  researchedAt: new Date().toISOString().slice(0, 10),
  input: `research/unresolved-landmarks/${chunk}-input.json`,
  method: {
    sourceCrs: 'EPSG:32651',
    canonicalCrs: 'EPSG:4326',
    mapLookupCrs: 'GCJ-02',
    outcomeCategories: {
      'survives-with-history': '可确认历史实体延续到今天，或历史建筑/机构在原址有明确连续关系。',
      'demolished-current-use': '可确认历史实体已经拆除、毁坏或被重建，并可说明原址今天的用途。',
      'location-only-current-use': '历史实体与现代地块之间尚无闭环；只保留空间、名称或现代地点线索。',
    },
    notes: [
      'WGS84 coordinates are canonical; GCJ-02 coordinates are lookup aids only and must not be written back as project geometry.',
      'A translated road, nearby POI, or matching modern street number alone is not evidence of building continuity.',
      `The raw six-field input remains stable in research/unresolved-landmarks/${chunk}-input.json even after unresolved chunks are regenerated.`,
      'Map overrides are applied at feature-group level; mixed-evidence groups require an additional group-level review.',
    ],
  },
  summary: {
    total: workflowRecords.length,
    byOutcomeCategory: countBy(workflowRecords, 'outcomeCategory'),
    byResolutionStatus: countBy(workflowRecords, 'resolutionStatus'),
    mapWriteRecommendation: countBy(workflowRecords, 'mapWriteRecommendation'),
  },
  records: workflowRecords,
}, null, 2)}\n`, 'utf8')

console.log(
  `Compiled ${records.length} research records to ${path.relative(projectRoot, outputPath)} ` +
  `and ${path.relative(projectRoot, workflowOutputPath)}.`,
)
