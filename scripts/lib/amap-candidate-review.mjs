import { heritageAddressKey } from './heritage-library-matching.mjs'
import { normalizeHeritageAddress } from './heritage-addresses.mjs'

const generic = /^(?:[abc]?花园住宅|住宅|别墅|里弄住宅|新式里弄|旧式里弄|公寓|办公楼|洋行|学校|医院|民宅|其他|宾馆|酒店|多单位使用|大楼|花园|旧址|上海)$/u
const genericListedUse = /^(?:花园住宅|里弄住宅|住宅|办公楼|综合大楼|教学楼|行政楼|图书馆|音乐厅|电影院|银行|公司|厂房|食堂|多单位使用|商业|商场|商店|公寓|旅馆|宾馆|酒店|其他)$/u
const plainNameKey = value => heritageAddressKey(value ?? '').replace(/\([^)]*\)/gu, '').replace(/[\p{P}\s]/gu, '').replace(/^上海市?/u, '')
const nameKey = value => {
  let key = plainNameKey(value)
    .replaceAll('邨', '村').replace(/大厦$/u, '大楼').replaceAll('老市政府', '老市府').replaceAll('中福会', '中国福利会')
  if (/领事馆/u.test(key)) key = key.replaceAll('美利坚合众国', '美国').replaceAll('俄罗斯联邦', '俄罗斯')
    .replaceAll('比利时王国', '比利时').replace(/驻(?:上海|沪)/gu, '').replaceAll('总领事馆', '领事馆')
  return key
}
const addressKey = value => {
  // The display/address key drops parity notes. Preserve them for matching:
  // a door across the street is not an overlap with an even-numbered range.
  const protectedParity = (normalizeHeritageAddress(value) ?? '').replace(/\((单|双)\)/gu, '($1号)').replace(/\((单号|双号)\)/gu, '{$1}')
  return heritageAddressKey(protectedParity).replace(/\{(单号|双号)\}/gu, '($1)').replace(/^(?:[^0-9,()]{2,12}街道)+/u, '')
}
export function protectedComponentNumbers(value) {
  const text = String(value ?? '').normalize('NFKC').replace(/\s/gu, '')
  // Street addresses such as 永嘉路628号楼 are not campus building numbers.
  return [...new Set([...text.matchAll(/(?<![路街巷道\d])(\d+(?:[-—~～至]\d+)?(?:[、,]\d+(?:[-—~～至]\d+)?)*)号(?:楼|别墅|建筑)/gu)]
    .flatMap(match => match[1].split(/[、,]/u).flatMap(part => {
      const [start, end = start] = part.split(/[-—~～至]/u).map(Number)
      return end >= start && end - start <= 100 ? Array.from({ length: end - start + 1 }, (_, n) => String(start + n)) : []
    })))]
}
function protectedComponentNames(value) {
  const text = String(value ?? '').normalize('NFKC').replace(/\s/gu, '')
  return [...new Set([...(text.match(/[东南西北中]主楼|主楼|水塔/gu) ?? []),
    ...[...text.matchAll(/([东南西北中](?:[、,][东南西北中])*)楼/gu)]
      .flatMap(match => match[1].split(/[、,]/u).map(direction => `${direction}楼`))])]
}
function expandedAddresses(value) {
  let road = '', lane = '', inheritInnerDoor = false
  return value.split(/[,，、；;]/u).map(part => {
    const street = /^([^0-9()]+(?:路|街|道|巷))(?=\d)/u.exec(part)
    if (street) {
      road = street[1]
      lane = new RegExp(`^${road}(\\d+(?:-\\d+)?弄)`, 'u').exec(part)?.[1] ?? ''
      inheritInnerDoor = Boolean(lane && new RegExp(`^${road}${lane}\\(?\\d`, 'u').test(part))
      return part
    }
    if (road && /^\d/u.test(part)) {
      const explicitLane = /^(\d+(?:-\d+)?弄)/u.exec(part)
      if (explicitLane) {
        lane = explicitLane[1]
        inheritInnerDoor = /^\(?\d/u.test(part.slice(lane.length))
      }
      return `${road}${!explicitLane && inheritInnerDoor ? lane : ''}${part}`
    }
    return part
  })
}
function addressParts(value) {
  return expandedAddresses(value).flatMap(part => {
    const match = /^([^0-9()]+(?:路|街|道|巷))(\d+)(?:号)?(?:-(\d+)(?:号)?)?(弄)?/u.exec(part)
    if (!match) return []
    const tail = part.slice(match[0].length)
    const parity = /^\((单号|双号)\)/u.exec(tail)?.[1] ?? null
    const inner = match[4] ? /^\(?(\d+)(?:号)?(?:-(\d+)(?:号)?)?/u.exec(tail) : null
    return [{ road: match[1], start: +match[2], end: +(match[3] ?? match[2]), lane: Boolean(match[4]), parity,
      suffix: !match[4] ? /^[甲乙丙丁]/u.exec(tail)?.[0] ?? null : null,
      inner: inner ? { start: +inner[1], end: +(inner[2] ?? inner[1]), parity: /^\((单号|双号)\)/u.exec(tail.slice(inner[0].length))?.[1] ?? null,
        suffix: /^[甲乙丙丁]/u.exec(tail.slice(inner[0].length))?.[0] ?? null } : null }]
  })
}
function rangeOverlap(a, b, specific) {
  const low = Math.max(a.start, b.start), high = Math.min(a.end, b.end)
  if (low > high || a.parity && b.parity && a.parity !== b.parity || specific && (b.start < a.start || b.end > a.end)) return false
  if (a.suffix && a.suffix !== b.suffix) return false
  const parity = a.parity ?? b.parity
  return !parity || low + (low % 2 === (parity === '单号' ? 1 : 0) ? 0 : 1) <= high
}
const overlap = (a, b, specific = false) => addressParts(a).some(left => addressParts(b).some(right =>
  left.road === right.road && left.lane === right.lane && rangeOverlap(left, right, specific)
    && (!left.inner || right.inner ? !left.inner || !right.inner || rangeOverlap(left.inner, right.inner, specific) : !specific)))
function distance(a, b) {
  if (!a || !b || !a.every(Number.isFinite) || !b.every(Number.isFinite)) return null
  const rad = Math.PI / 180
  const q = Math.sin((a[1] - b[1]) * rad / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin((a[0] - b[0]) * rad / 2) ** 2
  return Math.round(12742000 * Math.asin(Math.min(1, Math.sqrt(q))))
}
function partialUseNames(value, key) {
  return [...new Set(String(value ?? '').split(/[\n/、,，;；:：]/u).flatMap(part => {
    const full = key(part)
    const core = full.replace(/\d+(?:[-至]\d+)?号楼/gu, '')
      .replace(/[东南西北中甲乙丙丁]主楼|主楼|[东南西北中甲乙丙丁]楼|水塔/gu, '')
      .replace(/(?:教学大楼|教学楼|行政楼|总办公楼|办公楼|宿舍楼|住宅群|建筑群|图书馆|办公室|教研楼|综合大楼|白楼|校门|大礼堂)$/u, '')
      .replace(/(?:股份有限公司|有限责任公司|有限公司|总公司|公司)$/u, '')
    return [full, core, core.replace(/(?:大楼|大厦)$/u, ''), core.replace(/(?:大学|学院)$/u, ''), core.replace(/附(?:校|中|小)[甲乙丙丁]?$/u, '')]
  }))].filter(name => name.length >= 3 && !generic.test(name) && !genericListedUse.test(name)
    && !/^(?:花园住宅群|机关|研究所|委员会|图书馆|领事馆|总领事馆|幼儿园|文化活动中心|职工宿舍|家属楼|综合楼|生活区|住宅区|民居|民宅|氏民宅|关帝庙|天主堂|清真寺|圣母堂)$/u.test(name))
}
export function reviewAmapCandidates(target, candidates) {
  const reviewedNameKey = value => {
    let key = nameKey(value)
    for (const group of target.nameReview?.groups ?? []) {
      const canonical = nameKey(group[0])
      for (const alias of [...group].sort((a, b) => b.length - a.length)) key = key.replaceAll(nameKey(alias), canonical)
    }
    return key
  }
  const requiredComponents = [...new Set([target.name, target.listedName, target.officialAddress].flatMap(protectedComponentNumbers))]
  const requiredNamedComponents = [...new Set([target.name, target.listedName, target.officialAddress].flatMap(protectedComponentNames))]
  const names = [target.name, target.listedName, ...(target.alternateNames ?? [])].flatMap(value => (value ?? '').split(/[\n/、,，;；]/u))
    .map(reviewedNameKey).filter(value => value.length >= 2 && !generic.test(value))
  const buildingNames = (target.physicalBuildingNames ?? [target.name, target.alternateNames?.[0]])
    .flatMap(value => (value ?? '').split(/[\n/、,，;；]/u)).map(reviewedNameKey).filter(value => value.length >= 4 && !generic.test(value))
  const listedUseParts = (target.listedName ?? '').split(/[\n/、,，;；]/u).map(reviewedNameKey).filter(Boolean)
  const listedUses = listedUseParts
    .filter(value => value.length >= 4 && !genericListedUse.test(value))
  const expectedAdcode = target.queries?.map(query => query.region ?? query.params?.region).find(Boolean)
  const partialUses = partialUseNames(target.listedName, reviewedNameKey)
  const partialNames = partialUses.length ? partialUses : partialUseNames(target.name, reviewedNameKey)
  const results = [...new Map(candidates.filter(poi => poi?.id).map(poi => [poi.id, poi])).values()].map(poi => {
    const named = reviewedNameKey(poi.name)
    const usedReviewedNameAlias = Boolean(target.nameReview && named !== nameKey(poi.name))
    const matchedName = names.find(name => name === named || Math.min(name.length, named.length) >= 4 && (name.includes(named) || named.includes(name))) ?? null
    const matchedBuildingName = buildingNames.find(name => named.includes(name)) ?? null
    // A complete named listed use is evidence, even when AMap categorises it as
    // a restaurant or cultural service. A cafe/department merely containing the
    // institution name is not the same use. Door and component guards still apply.
    const matchedListedUse = listedUses.find(name => named === name || named.endsWith(name)) ?? null
    const addr = addressKey(poi.address)
    const official = addressKey(target.officialAddress)
    const exactAddress = Boolean(official && official === addr.replace(/\(.*$/u, ''))
    const namedAddressOverlap = overlap(official, addressKey(poi.name), true)
    const candidateHasDoor = /(?:路|街|道|巷)\d+/u.test(addr)
    const namedDoorEvidence = namedAddressOverlap && (!candidateHasDoor || overlap(official, addr))
    const addressOverlap = exactAddress || overlap(official, addr) || namedDoorEvidence
    const alternateAddress = Boolean(target.wikipediaAddress && overlap(addressKey(target.wikipediaAddress), addr))
    const reviewedAddressOverlap = Boolean(target.nameReview?.addresses?.some(address => overlap(addressKey(address), addr)))
    const officialDoors = addressParts(official), candidateDoors = addressParts(addr)
    const onlyDoor = officialDoors.length === 1 ? officialDoors[0] : null
    const exactDoor = exactAddress || Boolean(onlyDoor && onlyDoor.start === onlyDoor.end
      && (!onlyDoor.inner || onlyDoor.inner.start === onlyDoor.inner.end) && candidateDoors.length === 1
      && JSON.stringify(onlyDoor) === JSON.stringify(candidateDoors[0]))
    const location = typeof poi.location === 'string' ? poi.location.split(',').map(Number) : null
    const distanceMetres = location?.length === 2 ? distance(target.referenceGcj02, location) : null
    const wrongDistrict = expectedAdcode && expectedAdcode !== '310000' && poi.adcode !== expectedAdcode
    const rejectedType = /^(?:1901|1902|1903|1507|150904)/u.test(poi.typecode ?? '') || /停车场|公交站|地铁站|充电站|出入口|公共厕所/u.test(poi.name ?? '')
    const venue = /^(?:080601|080602|080603)(?:\||$)/u.test(poi.typecode ?? '')
    const buildingType = venue || /^(?:100|120|110|140|0901|130|1904)/u.test(poi.typecode ?? '')
    const tenant = !venue && /^(?:050|060|070|080|160|170)/u.test(poi.typecode ?? '')
    const subordinate = /大堂|会议厅|会议中心|宴会厅|前台|门诊|特需医疗部|接待室|售票处|办公室/u.test(poi.name ?? '')
      && !/大堂|会议厅|会议中心|宴会厅|门诊|办公室/u.test(target.name ?? '')
    // A shared campus address is not a proof of the protected sub-building.
    const candidateComponents = protectedComponentNumbers(poi.name)
    const candidateNamedComponents = protectedComponentNames(poi.name)
    const namedComponentMatch = requiredNamedComponents.some(component => (poi.name ?? '').includes(component))
    const numberedComponentMatch = candidateComponents.some(number => requiredComponents.includes(number))
    const componentMismatch = requiredComponents.length > 0 && candidateComponents.length > 0
      && !numberedComponentMatch && !namedComponentMatch
    const namedComponentMismatch = requiredNamedComponents.length > 0 && candidateNamedComponents.length > 0
      && !candidateNamedComponents.some(component => requiredNamedComponents.includes(component))
    const componentUnproven = requiredComponents.length + requiredNamedComponents.length > 0
      && !numberedComponentMatch && !namedComponentMatch
    const scopeConflict = Boolean(componentMismatch || componentUnproven
      || !requiredComponents.length && !requiredNamedComponents.length && target.componentScope
        && !(/\d+号楼|[东南西北]楼|主楼|水塔/u.test(poi.name ?? '') && matchedName))
    // Complete listed-use name + full door + independently returned district
    // can establish a destination even when the old reference point is wrong.
    const exactListedIdentity = Boolean(listedUseParts.length === 1 && matchedListedUse && exactDoor && expectedAdcode && expectedAdcode !== '310000'
      && poi.adcode === expectedAdcode)
    const listedUseReference = Boolean(matchedListedUse && addressOverlap && (exactListedIdentity || distanceMetres !== null && distanceMetres <= 160)
      && !wrongDistrict && !rejectedType && !scopeConflict && !subordinate)
    const reviewedAliasReference = Boolean(target.nameReview && matchedListedUse && reviewedAddressOverlap
      && distanceMetres !== null && distanceMetres <= 160 && !wrongDistrict && !rejectedType && !scopeConflict && !subordinate && !tenant)
    const villageSpelling = [target.name, target.listedName].filter(Boolean).some(value => value.split(/[\n/、,，;；]/u)
      .some(part => nameKey(part) === named && named.length >= 3 && /村$/u.test(named)
        && plainNameKey(part) !== plainNameKey(poi.name)))
    // Old street-number listings sometimes refer to the lane entrance now used
    // by AMap. Only a complete village name variant on the same street/number
    // can use this qualified entrance reference; inner doors are not certified.
    const villageStreet = officialDoors.some(a => candidateDoors.some(b => a.road === b.road
      && rangeOverlap(a, b, false)))
      || !/\d/u.test(official) && candidateDoors.some(door => door.road === official)
    const spellingVariantReference = Boolean(villageSpelling && villageStreet && distanceMetres !== null && distanceMetres <= 160
      && !wrongDistrict && !rejectedType && !scopeConflict && !subordinate && !tenant)
    const candidateCores = partialUseNames(poi.name, reviewedNameKey)
    const partialCoreMatched = partialNames.find(core => candidateCores.some(candidate => candidate.includes(core) || core.includes(candidate))) ?? null
    const fullCandidateName = String(poi.name ?? '').normalize('NFKC').replace(/[\p{P}\s]/gu, '')
    const departmentOnly = /(?:外科|内科|妇科|儿科|急诊|急救|门诊|住院部|病房|药房|挂号|售票|签证处|培训班|培训公寓|咖啡|花店|烟酒|维修|游客中心|居委会|居民委员会|卫生室|工会|学生宿舍|宿舍楼|教职工公寓|家属楼|肌电图|图室|体检|健康管理|停车|直升|机场)/u.test(fullCandidateName)
      || /^090/u.test(poi.typecode ?? '') && /(?:科|室|病区|康复中心|治疗中心)$/u.test(fullCandidateName)
      || /(?:大学|学院|医院|宾馆).*\d+$/u.test(named)
    const mainInstitution = !candidateComponents.length && !candidateNamedComponents.length
      && !/(?:行政楼|教学楼|商务楼|实验|花园|学院系|外国语学院|文学系|专业|病区)/u.test(named)
      && /(?:宾馆|酒店|饭店|医院|大学|学院|中学|小学|学校|办事处|领事馆|政府|老干部局|博物馆|图书馆|公园|小区)(?:总院|本部|院区|丽笙精选)?$/u.test(named)
    const partialRadius = /(?:宾馆|酒店|饭店|大学|学院)$/u.test(named) ? 800 : 250
    const partialReferenceEligible = Boolean(partialCoreMatched && !wrongDistrict && expectedAdcode && expectedAdcode !== '310000'
      && !rejectedType && !subordinate && !departmentOnly && !componentMismatch && !namedComponentMismatch
      && !(requiredNamedComponents.length && !requiredComponents.length && candidateComponents.length)
      && !(requiredComponents.length && !requiredNamedComponents.length && candidateNamedComponents.length)
      && (!tenant || matchedListedUse)
      && (!/(?:路|街|道|巷)(?:\d.*)?$/u.test(partialCoreMatched) || addressOverlap)
      && ((addressOverlap || reviewedAddressOverlap) && (distanceMetres === null || distanceMetres <= 1500)
        || distanceMetres !== null && distanceMetres <= partialRadius))
    const partialScore = (partialCoreMatched ? partialCoreMatched.length * 3 : 0) + (exactDoor ? 90 : addressOverlap ? 70 : 0)
      + (mainInstitution ? 70 : 0) + (matchedListedUse ? 25 : 0)
      + (numberedComponentMatch || namedComponentMatch ? 100 : 0)
      + (distanceMetres === null ? 0 : Math.max(0, 40 - distanceMetres / 20))
    let status = 'needs-review'
    if (reviewedAliasReference) status = 'matched-reviewed-alias'
    else if (listedUseReference && (tenant || distanceMetres === null || distanceMetres > 160)) status = 'matched-listed-use'
    else if (!wrongDistrict && !rejectedType && !scopeConflict && !subordinate && matchedName && addressOverlap && distanceMetres !== null && distanceMetres <= 160 && !tenant) status = 'matched-building'
    else if (!wrongDistrict && !rejectedType && !scopeConflict && !subordinate && (exactAddress || namedDoorEvidence) && buildingType && !tenant && distanceMetres !== null && distanceMetres <= 70) status = 'matched-address'
    else if (!wrongDistrict && !rejectedType && !scopeConflict && !subordinate && !tenant && matchedBuildingName
      && distanceMetres !== null && distanceMetres <= 60) status = 'matched-name-reference'
    else if (spellingVariantReference) status = 'matched-spelling-reference'
    let score = (matchedName ? 65 : 0) + (addressOverlap || reviewedAliasReference ? 60 : alternateAddress ? 20 : 0)
      + (distanceMetres !== null && distanceMetres <= 100 ? 25 : distanceMetres !== null && distanceMetres <= 200 ? 15 : 0)
      + (buildingType ? 10 : 0) + (listedUseReference || reviewedAliasReference ? 30 : 0) - (wrongDistrict ? 100 : 0) - (rejectedType ? 150 : 0) - (tenant ? 30 : 0) - (scopeConflict ? 50 : 0) - (subordinate ? 40 : 0)
    return { poi, status, score, matchedName, matchedBuildingName, matchedListedUse, listedUseReference, reviewedAliasReference, reviewedAddressOverlap, usedReviewedNameAlias, spellingVariantReference, partialCoreMatched, partialReferenceEligible, partialScore, mainInstitution, namedComponentMismatch, exactListedIdentity, exactAddress, exactDoor, addressOverlap, namedDoorEvidence, alternateAddress, distanceMetres, wrongDistrict: Boolean(wrongDistrict), rejectedType, tenant, scopeConflict, subordinate,
      requiredComponents, requiredNamedComponents, componentMismatch, componentUnproven }
  }).sort((a, b) => b.score - a.score)
  const acceptable = results.filter(result => result.status.startsWith('matched-'))
  const selected = acceptable[0]
  // Several same-address POIs can refer to different buildings or a campus.
  const ambiguous = selected && acceptable.slice(1).some(other => selected.score - other.score < 15 &&
    other.poi.id !== selected.poi.id && other.poi.parent !== selected.poi.id && nameKey(other.poi.name) !== nameKey(selected.poi.name))
  if (selected && !ambiguous) return { status: selected.status, selected, ambiguous: false, candidates: results }
  const approximate = results.filter(result => result.partialReferenceEligible).sort((a, b) => b.partialScore - a.partialScore)[0]
  if (approximate) {
    approximate.status = 'matched-partial-reference'
    return { status: approximate.status, selected: approximate, ambiguous: false, candidates: results }
  }
  return { status: candidates.length ? 'needs-review' : 'no-candidate', selected: null, ambiguous: Boolean(ambiguous), candidates: results }
}
