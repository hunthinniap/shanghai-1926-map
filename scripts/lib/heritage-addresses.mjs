import { createHash } from 'node:crypto'
import * as OpenCC from 'opencc-js'

const simplify = OpenCC.Converter({ from: 'tw', to: 'cn' })

export const QUERY_DISTRICT_ALIASES = {
  原闸北区: '静安区',
  闸北区: '静安区',
  崇明县: '崇明区',
}

export const QUERY_DISTRICT_SOURCES = [
  { from: ['原闸北区', '闸北区'], to: '静安区', url: 'https://zh.wikisource.org/wiki/国务院关于同意上海市调整部分行政区划的批复_(2015年)' },
  { from: ['崇明县'], to: '崇明区', url: 'https://www.shanghai.gov.cn/chongming/index.html' },
]

export function normalizeHeritageAddress(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  return simplify(value.normalize('NFKC'))
    .replace(/\r?\n/gu, '；')
    .replace(/[\s\u007f]+/gu, '')
    .replace(/[—–－~～至]/gu, '-')
    .replace(/--+/gu, '-')
    .replace(/；+/gu, '；')
}

function currentDistrict(district) {
  const normalized = normalizeHeritageAddress(district)
  return QUERY_DISTRICT_ALIASES[normalized] ?? normalized
}

function forQuery(address, district) {
  if (!address) return null
  let text = address.replace(/^上海市?/u, '')
  for (const [oldDistrict, newDistrict] of Object.entries(QUERY_DISTRICT_ALIASES)) {
    if (text.startsWith(oldDistrict)) text = newDistrict + text.slice(oldDistrict.length)
  }
  // An explicit district in a source address wins over the table heading.
  const hasDistrict = /^(?:黄浦|徐汇|长宁|静安|普陀|虹口|杨浦|闵行|宝山|嘉定|浦东新|金山|松江|青浦|奉贤|崇明)区/u.test(text)
  return `上海市${hasDistrict ? '' : district ?? ''}${text}`
}

function topLevelParts(text) {
  const parts = []
  let depth = 0
  let part = ''
  for (const character of text) {
    if (character === '(' || character === '（') depth += 1
    if (character === ')' || character === '）') depth = Math.max(0, depth - 1)
    if (depth === 0 && /[、,，;；/]/u.test(character)) {
      if (part) parts.push(part)
      part = ''
    } else part += character
  }
  if (part) parts.push(part)
  return parts
}

function splitStreetComponents(address) {
  const components = []
  for (const part of topLevelParts(address)) {
    // Only a new explicitly named road/street/lane starts a new component.
    // Bare numbers keep their inherited street/lane context and full extent.
    if (!components.length || /^[^0-9()]+(?:路|街|道|巷|弄)(?:[0-9]|口|$)/u.test(part)) {
      components.push(part)
    } else components[components.length - 1] += `、${part}`
  }
  return components
}

function classify(address, components) {
  if (!address) return { addressClass: 'missing-address', precisionHint: 'name-or-area-only' }
  const numeric = /[0-9]/u.test(address)
  if (!numeric && /路口|交[叉汇]口/u.test(address)) return { addressClass: 'intersection', precisionHint: 'intersection-reference' }
  if (!numeric) return { addressClass: 'descriptive-area', precisionHint: 'area-reference' }
  if (components.length > 1) return { addressClass: 'multiple-streets', precisionHint: 'multi-address-reference' }
  if (/\d+(?:号|弄)?-\d+/u.test(address)) return { addressClass: 'number-range', precisionHint: 'address-range-reference' }
  if (/[、,，/;；]/u.test(address) || /\d+(?:号|弄)及\d/u.test(address)) return { addressClass: 'multiple-numbers', precisionHint: 'multi-address-reference' }
  if (/号楼|[东西南北]楼|[红灰]楼|号院|楼内|校内|校区|主楼/u.test(address)) return { addressClass: 'sub-building', precisionHint: 'sub-building-needs-confirmation' }
  if (/\d+弄\(?\d+号(?:[甲乙丙丁])?\)?$/u.test(address)) return { addressClass: 'lane-door', precisionHint: 'lane-door-candidate' }
  if (/\d+弄/u.test(address)) return { addressClass: 'lane', precisionHint: 'lane-reference' }
  if (/\d+号[甲乙丙丁]?$/u.test(address) && /村|[家氏]宅/u.test(address)) return { addressClass: 'rural-number', precisionHint: 'rural-address-candidate' }
  if (/^[^0-9]+\d+(?:[甲乙丙丁])?号[甲乙丙丁]?$/u.test(address)) return { addressClass: 'single-door', precisionHint: 'door-number-candidate' }
  return { addressClass: 'qualified-address', precisionHint: 'qualified-address-needs-confirmation' }
}

function addressKey(record) {
  const address = normalizeHeritageAddress(record.official?.addressAsListed)
  return address ? forQuery(address, currentDistrict(record.official?.districtAsListed)) : null
}

function duplicateGroups(records) {
  const groups = new Map()
  for (const record of records) {
    const key = addressKey(record)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(record.id)
  }
  return groups
}

function alternativeAddresses(record) {
  const alternatives = []
  const add = (value, source, sourceUrl, componentName = null) => {
    if (!value || alternatives.some((item) => item.value === value && item.componentName === componentName)) return
    alternatives.push({ value, source, sourceUrl, componentName })
  }
  for (const alternative of record.address?.alternatives ?? []) add(alternative.value, alternative.source, alternative.sourceUrl)
  if (record.wikipedia?.addressAsListed !== record.official?.addressAsListed) {
    add(record.wikipedia?.addressAsListed, 'wikipedia-list', record.wikipedia?.source?.url)
  }
  for (const component of record.wikipedia?.components ?? []) {
    add(component.addressAsListed, 'wikipedia-list-component', record.wikipedia?.source?.url, component.originalNameOrUse)
  }
  return alternatives
}

export function planHeritageAddress(record, sameAddressOfficialIds = record.sameAddressOfficialIds ?? [record.id]) {
  const official = record.official ?? {}
  const normalizedAddress = normalizeHeritageAddress(official.addressAsListed)
  const queryDistrict = currentDistrict(official.districtAsListed)
  const components = normalizedAddress ? splitStreetComponents(normalizedAddress) : []
  const classification = classify(normalizedAddress, components)
  const flags = []
  if (official.districtAsListed !== queryDistrict) flags.push('historical-district-query-alias')
  if ((record.match?.reviewFlags ?? []).includes('address-difference')) flags.push('source-address-difference')
  if (sameAddressOfficialIds.length > 1) flags.push('shared-listed-address')
  if ((official.sourceNotes ?? []).some((note) => /灭失|拆除/u.test(note))) flags.push('source-reports-demolished')
  if (normalizedAddress && /\d+(?:号|弄)?-\d+/u.test(normalizedAddress)) flags.push('number-range-not-expanded')
  if (normalizedAddress && /\d+弄/u.test(normalizedAddress)) flags.push('lane-or-compound')
  if (normalizedAddress && /[东西南北][侧部]|西段|东段|老\d|原址|旧址/u.test(normalizedAddress)) flags.push('relative-or-historical-qualifier')
  if (classification.addressClass === 'sub-building') flags.push('sub-building-not-compound-centroid')
  const requiresReview = !['single-door', 'lane-door'].includes(classification.addressClass)
    || flags.some((flag) => ['shared-listed-address', 'source-reports-demolished'].includes(flag))
  const queries = []
  const addQuery = (addressText, kind, precisionHint, review, source = 'shanghai-fgj', sourceUrl = official.source?.url) => {
    const query = forQuery(addressText, queryDistrict)
    if (!query || queries.some((item) => item.query === query)) return
    queries.push({ query, addressText, kind, precisionHint, requiresReview: review, source, sourceUrl: sourceUrl ?? null })
  }
  addQuery(normalizedAddress, 'full-listed-address', classification.precisionHint, requiresReview)
  for (const component of components.length > 1 ? components : []) {
    addQuery(component, 'explicit-street-component', 'component-reference', true)
  }
  const alternatives = alternativeAddresses(record)
  for (const alternative of alternatives) {
    addQuery(normalizeHeritageAddress(alternative.value), 'source-alternative-address', 'alternative-address-needs-review', true, alternative.source, alternative.sourceUrl)
  }
  if (!queries.length && official.originalNameOrUse) {
    addQuery(normalizeHeritageAddress(official.originalNameOrUse), 'historic-name-only', 'name-or-area-only', true)
  }
  return {
    officialId: record.id,
    batch: record.batch,
    codeRaw: record.codeRaw,
    originalNameOrUse: official.originalNameOrUse ?? null,
    listedNameOrUse: official.listedNameOrUse ?? null,
    districtAsListed: official.districtAsListed ?? null,
    queryDistrict,
    addressAsListed: official.addressAsListed ?? null,
    addressSource: { source: 'shanghai-fgj', url: official.source?.url ?? null },
    normalizedAddress,
    ...classification,
    requiresReview,
    queries,
    addressComponents: components.map((addressText) => ({ addressText, ...classify(addressText, [addressText]) })),
    flags,
    sameAddressOfficialIds,
    alternativeAddresses: alternatives,
    sourceNotes: official.sourceNotes ?? [],
  }
}

export function buildHeritageGeocodingTargets(dataset, inputBytes = JSON.stringify(dataset)) {
  const groups = duplicateGroups(dataset.records)
  const targets = dataset.records.filter((record) => record.locationStatus === 'no-source-coordinate')
  return {
    schemaVersion: 1,
    selection: "locationStatus === 'no-source-coordinate' before address geocoding",
    recordCount: targets.length,
    inputSource: { file: '../buildings-enriched.json', sha256: createHash('sha256').update(inputBytes).digest('hex') },
    records: targets.map((record) => ({
      id: record.id, batch: record.batch, codeRaw: record.codeRaw,
      locationStatus: record.locationStatus,
      official: {
        originalNameOrUse: record.official.originalNameOrUse,
        listedNameOrUse: record.official.listedNameOrUse,
        addressAsListed: record.official.addressAsListed,
        districtAsListed: record.official.districtAsListed,
        sourceNotes: record.official.sourceNotes,
        qualityFlags: record.official.qualityFlags,
        source: { url: record.official.source.url, rowIndices: record.official.source.rowIndices },
      },
      address: record.address,
      match: { reviewFlags: record.match.reviewFlags, addressComparison: record.match.comparisons.address },
      wikipedia: {
        id: record.wikipedia.id,
        addressAsListed: record.wikipedia.addressAsListed,
        source: record.wikipedia.source,
        components: record.wikipedia.components.map(({ originalNameOrUse, addressAsListed }) => ({ originalNameOrUse, addressAsListed })),
      },
      sameAddressOfficialIds: groups.get(addressKey(record)) ?? [record.id],
    })),
  }
}

export function buildHeritageAddressPlan(targets) {
  const records = targets.records.map((record) => planHeritageAddress(record))
  const countBy = (get) => Object.fromEntries([...new Set(records.map(get))].sort().map((key) => [key, records.filter((record) => get(record) === key).length]))
  return {
    schemaVersion: 1,
    recordCount: records.length,
    inputSource: targets.inputSource,
    districtQueryAliases: QUERY_DISTRICT_ALIASES,
    districtQuerySources: QUERY_DISTRICT_SOURCES,
    methodology: [
      '官方地址保持原样。简繁、全角、空格及旧行政区名转换仅用于查询，不修改源地址。',
      '完整地址始终优先；多街道拆分仅生成明确街道的补充查询，数字清单保留继承的路名/弄号，范围不展开或取首号。',
      'precisionHint 仅描述查询粒度，不是返回坐标精度或已匹配证明。所有候选必须验证道路、门牌和对象范围。',
      '同址不同保护项分别保留，地址坐标不能证明其为同一建筑；弄、园区和多门牌结果须明确标注参考点范围。',
      '维基地址差异与续行地址单独作为需核对的备选，不覆盖官方地址。',
      '官方标注已灭失的建筑，其门牌编码最多指向现址/旧址参考点，不证明历史建筑仍存在。',
    ],
    stats: {
      byAddressClass: countBy((record) => record.addressClass),
      byQueryDistrict: countBy((record) => record.queryDistrict),
      singleDoorQueries: records.filter((record) => record.addressClass === 'single-door').length,
      requiresReview: records.filter((record) => record.requiresReview).length,
      withHistoricalDistrictAlias: records.filter((record) => record.flags.includes('historical-district-query-alias')).length,
      withSharedListedAddress: records.filter((record) => record.flags.includes('shared-listed-address')).length,
      withSourceAddressDifference: records.filter((record) => record.flags.includes('source-address-difference')).length,
      reportedDemolished: records.filter((record) => record.flags.includes('source-reports-demolished')).length,
      uniqueFullQueries: new Set(records.map((record) => record.queries[0]?.query).filter(Boolean)).size,
    },
    records,
  }
}
