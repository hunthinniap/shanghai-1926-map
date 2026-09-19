import { normalizeHeritageAddress } from './heritage-addresses.mjs'
import { bd09ToWgs84 } from './coordinate-systems.mjs'

export function heritageAddressKey(value) {
  return (normalizeHeritageAddress(value) ?? '')
    .replace(/^上海市?/u, '')
    .replace(/^(?:原闸北|闸北|卢湾|黄浦|徐汇|长宁|静安|普陀|虹口|杨浦|闵行|宝山|嘉定|浦东新|金山|松江|青浦|奉贤|崇明)[区县]/u, '')
    .replace(/[、，,；;]/gu, ',')
    .replace(/\((?:单号|双号)\)/gu, '')
}

const generic = /^(?:住宅|民宅|民居|待考|建筑|办公楼|学校|居民楼|多单位使用|综合办公楼|商场)$/u
function nameKey(value) { return heritageAddressKey(value).replace(/[\p{P}\s]/gu, '') }
function namedAgreement(target, candidate) {
  const names = [target.official.originalNameOrUse, target.official.listedNameOrUse]
    .flatMap((name) => (name ?? '').split(/[、，,/；;]/u)).map(nameKey)
    .filter((name) => name.length >= 3 && !generic.test(name))
  const namesInSource = [candidate.nameS, candidate.nameT].map(nameKey)
  return names.some((name) => namesInSource.some((other) => other === name ||
    (Math.min(name.length, other.length) >= 4 && (name.includes(other) || other.includes(name)))))
}

// Used only to corroborate a complete address already matched to the Wikipedia
// listing, never as a free-form geocoder. Lane numbers keep their own hierarchy.
export function addressesOverlap(left, right) {
  const parts = (value) => {
    const text = (normalizeHeritageAddress(value) ?? '').replace(/[、，,；;]/gu, ',')
    return [...text.matchAll(/([^0-9,()]+(?:路|街|道|巷))([0-9]+)(?:号)?(?:-([0-9]+))?(弄)?/gu)].map((match) => {
      const tail = text.slice(match.index + match[0].length)
      const parity = /^号?\((单号|双号)\)/u.exec(tail)?.[1] ?? null
      const inner = match[4] ? /^\(?([0-9]+)(?:号)?(?:-([0-9]+))?(?:号)?/u.exec(tail) : null
      return { road: heritageAddressKey(match[1]), start: Number(match[2]), end: Number(match[3] ?? match[2]),
        lane: Boolean(match[4]), parity, inner: inner ? { start: Number(inner[1]), end: Number(inner[2] ?? inner[1]), parity: null } : null }
    })
  }
  const rangeOverlap = (a, b) => {
    const low = Math.max(a.start, b.start), high = Math.min(a.end, b.end)
    if (low > high || (a.parity && b.parity && a.parity !== b.parity)) return false
    const parity = a.parity ?? b.parity
    return !parity || low + (low % 2 === (parity === '单号' ? 1 : 0) ? 0 : 1) <= high
  }
  return parts(left).some((a) => parts(right).some((b) => a.road === b.road && a.lane === b.lane &&
    rangeOverlap(a, b) && (!a.inner || !b.inner || rangeOverlap(a.inner, b.inner))))
}

function scopeFor(plan, candidate) {
  return ['lane', 'number-range', 'multiple-streets', 'multiple-numbers', 'descriptive-area', 'intersection', 'sub-building'].includes(plan.addressClass)
    || /弄|学校|中学|大学|校园|花园|新村|公园|码头|厂/u.test(`${candidate.address} ${candidate.nameS}`)
    || plan.sameAddressOfficialIds.length > 1
    ? 'building-complex-reference-point' : 'address-reference-point'
}

export function matchHeritageLibrary(target, plan, library, overrides = [], coordinateReviews = []) {
  const override = overrides.find((item) => item.officialId === target.id)
  const officialKey = heritageAddressKey(target.official.addressAsListed)
  const wikiKey = heritageAddressKey(target.wikipedia.addressAsListed)
  let method = 'official-full-address'
  let candidates = library.filter((item) => officialKey && heritageAddressKey(item.address) === officialKey)
  if (!candidates.length) {
    method = 'wikipedia-full-address-with-corroboration'
    candidates = library.filter((item) => wikiKey && heritageAddressKey(item.address) === wikiKey)
  }
  if (override) {
    method = 'reviewed-name-and-address'
    candidates = library.filter((item) => item.uri === override.libraryUri)
    if (candidates.length !== 1 || !override.reason) throw new Error(`Invalid heritage library override: ${target.id}`)
  }
  const candidateEvidence = candidates.map((candidate) => ({
    libraryUri: candidate.uri, name: candidate.nameS, address: candidate.address,
    sourceCoordinates: candidate.coordinates,
    namedAgreement: namedAgreement(target, candidate),
    officialAddressOverlap: addressesOverlap(target.official.addressAsListed, candidate.address),
    coordinateReview: coordinateReviews.find((review) => review.libraryUri === candidate.uri) ?? null,
  }))
  const result = { officialId: target.id, officialCodeRaw: target.codeRaw,
    name: target.official.originalNameOrUse, officialAddress: target.official.addressAsListed,
    wikipediaAddress: target.wikipedia.addressAsListed, addressClass: plan.addressClass,
    method, status: 'unmatched', reason: '尚无可核对的图书馆地址实体。', candidates: candidateEvidence, point: null }
  if (!candidates.length) return result
  const held = candidateEvidence.filter((candidate) => candidate.coordinateReview?.action === 'hold')
  if (held.length) return { ...result, status: 'needs-review', reason: `来源坐标异常，暂停选点：${held.map((candidate) => candidate.coordinateReview.reason).join('；')}` }
  if (!override && method !== 'official-full-address' && !candidateEvidence.some((candidate) => candidate.namedAgreement || candidate.officialAddressOverlap)) {
    return { ...result, status: 'needs-review', reason: '维基门牌与图书馆相符，但官方门牌没有范围交集且缺少独特名称佐证。' }
  }
  let sharedAddressUnresolved = false
  if (candidates.length > 1) {
    const named = candidates.filter((candidate) => namedAgreement(target, candidate))
    if (named.length === 1) candidates = named
    else if (new Set(candidates.map((candidate) => `${candidate.long},${candidate.lat}`)).size > 1) {
      return { ...result, status: 'needs-review', reason: '同一门牌有多个不同来源点，尚不能确定对应楼栋。' }
    } else sharedAddressUnresolved = true
  }
  const selected = candidates[0]
  const lon = selected.coordinates?.longitude, lat = selected.coordinates?.latitude
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < 120.7 || lon > 122.3 || lat < 30.6 || lat > 32) {
    return { ...result, status: 'needs-review', reason: '来源点缺失或超出上海宽边界。' }
  }
  const wgs = bd09ToWgs84(lon, lat)
  const coordinateScope = sharedAddressUnresolved ? 'building-complex-reference-point' : override?.coordinateScope ?? scopeFor(plan, selected)
  const notes = [coordinateScope === 'building-complex-reference-point'
    ? '此为门址所在里弄、院落或建筑群参考点，未逐栋核定位置。'
    : '此为来源目录门牌参考点，未独立测绘或核定建筑轮廓。']
  if (plan.flags.includes('source-reports-demolished')) notes.push('官方名录已注明灭失；点位仅作原门址参考，不表示建筑仍存在。')
  if (officialKey !== heritageAddressKey(selected.address)) notes.push('来源门址与官方写法有差异，原始门牌和对照理由均保留。')
  if (plan.sameAddressOfficialIds.length > 1) notes.push('同址有多个保护项，分别保留记录；共用门址点不能区分各楼栋。')
  if (sharedAddressUnresolved) notes.push('图书馆同址多个实体使用同一点，尚未区分具体楼栋；仅作共用门址参考，不采用其中任一楼名。')
  return { ...result, status: 'accepted-reference-point', reason: override?.reason ??
    (method === 'official-full-address' ? '完整官方门牌与图书馆地址一致，采用该门址的来源参考点。'
      : '完整维基名单门牌与图书馆一致，另由官方门牌范围或具名建筑名称交叉对应。'),
    point: { lon: wgs.longitude, lat: wgs.latitude, coordinateSystem: 'WGS84', coordinateScope,
      precision: null, accuracyMetres: null, origin: 'shanghai-library',
      sourceTitle: '上海图书馆历史建筑开放数据',
      sourceUrl: selected.uri.replace(/^http:/u, 'https:'), libraryUri: selected.uri,
      libraryName: sharedAddressUnresolved ? null : selected.nameS, sourceAddress: selected.address,
      identity: sharedAddressUnresolved ? 'shared-address-unresolved' : 'source-address-reference',
      supportingLibraryUris: candidates.map((candidate) => candidate.uri),
      sourceCoordinates: { coordinateSystem: 'BD-09', lon, lat },
      conversion: 'BD-09 → GCJ-02 → WGS84 (iterative inverse; 6 decimal places)',
      historicalGeometryVerified: false, notes } }
}
