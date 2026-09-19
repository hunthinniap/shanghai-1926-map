import { Converter } from 'opencc-js'

const simplify = Converter({ from: 't', to: 'cn' })
export const normalizeText = (value) => simplify(String(value ?? '').normalize('NFKC'))
  .replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase()

const districtCodes = { HP: 'A', XH: 'D', CN: 'M', JA: 'B', PT: 'N', ZB: 'H', HK: 'F', YP: 'G',
  BS: 'K', JD: 'S', PD: 'W', JS: 'Y', SJ: 'P', QP: 'X', FX: 'Z', CM: 'R' }
const fifthExceptions = {
  HP013: ['sh-fgj-5A012-02', '官网第二个5A012为皋兰路12号；维基独立列HP-J-013-V。'],
  HK039: ['sh-fgj-5F038-02', '官网第二个5F038为高阳路165—167号；维基独立列HK-J-039-V。'],
  XH035: ['sh-fgj-b5-D5035-01', '官网原编号D5035与维基XH-J-035-V对应；未改写原编号。'],
  XH080: ['sh-fgj-b5-50D80-01', '官网原编号50D80与维基XH-J-080-V对应；常熟路门牌不同，保留双方地址。'],
  XH102: ['sh-fgj-b5-D50102-01', '官网原编号D50102与维基XH-J-102-V对应；保留双方门牌范围。'],
}

/** Crosswalk is scoped by batch. A legacy Roman III is not the batch number. */
export function codeTarget(wiki) {
  if (wiki.batch === 1) return null
  if (wiki.batch === 4) {
    if (!/^4[A-Z]\d{3}$/u.test(wiki.codeRaw)) throw new Error(`Unknown fourth-batch code: ${wiki.codeRaw}`)
    return wiki.codeRaw === '4H008'
      ? { code: '4H007', rule: 'fourth-batch-code-exception', reason: '福新面粉一厂在维基编号4H008，官网编号4H007。' }
      : { code: wiki.codeRaw, rule: 'same-code', reason: '同批次原编号一致。' }
  }
  if (wiki.batch === 5) {
    const match = wiki.codeRaw?.match(/^([A-Z]{2})-J-(\d{3})-V$/u)
    if (!match || !districtCodes[match[1]]) throw new Error(`Unknown fifth-batch code: ${wiki.codeRaw}`)
    const key = `${match[1]}${match[2]}`
    if (fifthExceptions[key]) return { officialId: fifthExceptions[key][0], rule: 'fifth-batch-source-anomaly', reason: fifthExceptions[key][1] }
    const code = `5${districtCodes[match[1]]}${match[2]}`
    if (['HP012', 'HK038'].includes(key)) return { officialId: `sh-fgj-${code}-01`, rule: 'fifth-batch-first-code-occurrence', reason: '按建筑名称与地址对应官网重复编号的第一条，未合并第二条。' }
    return { code, rule: 'fifth-batch-district-code', reason: `第五批维基区码${match[1]}对应官网编号字母${districtCodes[match[1]]}；不据此推断今日行政区。` }
  }
  const match = wiki.codeRaw?.normalize('NFKC').match(/^([A-Z])-III-(\d+)$/u)
  if (![2, 3].includes(wiki.batch) || !match) throw new Error(`Unknown legacy code: batch ${wiki.batch}, ${wiki.codeRaw}`)
  let letter = match[1]
  let number = Number(match[2])
  const rules = ['legacy-code']
  if (wiki.batch === 2 && letter === 'E') {
    if (number < 1 || number > 3) throw new Error(`Unknown second-batch E code: ${wiki.codeRaw}`)
    letter = 'A'; number += 55; rules.push('official-alternate-code')
  }
  if (wiki.batch === 3) {
    if (letter === 'D') {
      if (number < 49 || number > 83) throw new Error(`Unknown third-batch D code: ${wiki.codeRaw}`)
      number -= 48; rules.push('xuhui-offset-48')
    }
    if ({ O: 'W', P: 'J', Q: 'K' }[letter]) {
      letter = { O: 'W', P: 'J', Q: 'K' }[letter]; rules.push('legacy-district-letter')
    }
  }
  return { code: `${wiki.batch}${letter}${String(number).padStart(3, '0')}`, rule: rules.join('+'),
    reason: '按该批旧编号对照官网编号；旧编号中III为原编号组成部分，不作为批次。' }
}

function nameParts(record) {
  return [record, ...(record.components ?? [])].flatMap((r) => [r.originalNameOrUse, r.listedNameOrUse])
    .filter(Boolean).flatMap((value) => value.split(/[\n/／、（()）]/u))
    .map(normalizeText).filter((s) => s.length >= 3 && !/^(?:花园|普通|职工)?(?:住宅|公寓|办公楼|办公|学校|医院|厂房|民居|民宅)$/u.test(s))
}

export function compareRecords(official, wiki) {
  const a = nameParts(official), b = nameParts(wiki)
  const namePairs = a.flatMap((left) => b.filter((right) => left === right || (Math.min(left.length, right.length) >= 4 && (left.includes(right) || right.includes(left))))
    .map((right) => ({ official: left, wikipedia: right, exact: left === right })))
  const officialAddress = official.addressAsListed
  const wikiAddress = wiki.addressAsListed
  return {
    name: { status: namePairs.length ? 'corroborated' : 'no-distinctive-name-overlap', evidence: namePairs },
    address: { status: !officialAddress ? 'official-missing' : !wikiAddress ? 'wikipedia-missing'
      : officialAddress === wikiAddress ? 'exact' : normalizeText(officialAddress) === normalizeText(wikiAddress) ? 'formatting-only' : 'different-as-listed',
    official: officialAddress, wikipedia: wikiAddress },
  }
}

export function matchListings(officialRecords, wikiRecords, batch1Mappings) {
  const byId = new Map(officialRecords.map((r) => [r.id, r]))
  const first = new Map(batch1Mappings.map((m) => [m.wikipediaId, m]))
  if (byId.size !== officialRecords.length || new Set(wikiRecords.map((r) => r.id)).size !== wikiRecords.length || first.size !== batch1Mappings.length) {
    throw new Error('Duplicate source IDs or first-batch mapping IDs')
  }
  const used = new Set(), matches = []
  for (const wiki of wikiRecords) {
    const mapping = wiki.batch === 1 ? first.get(wiki.id) : codeTarget(wiki)
    if (!mapping) throw new Error(`No reviewed mapping: ${wiki.id}`)
    const targets = mapping.officialId ? [byId.get(mapping.officialId)].filter(Boolean)
      : officialRecords.filter((r) => r.batch === wiki.batch && r.code === mapping.code)
    if (targets.length !== 1 || targets[0].batch !== wiki.batch) throw new Error(`Ambiguous/missing target: ${wiki.id}`)
    const official = targets[0]
    if (used.has(official.id)) throw new Error(`Multiple Wikipedia listings target ${official.id}`)
    used.add(official.id)
    const comparisons = compareRecords(official, wiki)
    matches.push({ officialId: official.id, wikipediaId: wiki.id, batch: wiki.batch,
      officialCodeRaw: official.codeRaw, wikipediaCodeRaw: wiki.codeRaw, wikipediaSequence: wiki.sequenceRaw,
      status: 'matched', method: wiki.batch === 1 ? 'reviewed-name-address-crosswalk' : mapping.rule,
      reason: mapping.reason, notes: mapping.notes ?? [], comparisons,
      reviewFlags: [
        ...(comparisons.address.status === 'different-as-listed' ? ['address-difference'] : []),
        ...(comparisons.name.status === 'no-distinctive-name-overlap' ? ['name-needs-context'] : []),
      ],
    })
  }
  if (used.size !== officialRecords.length) throw new Error(`Only ${used.size}/${officialRecords.length} official records mapped`)
  return matches
}

export function isShanghaiCoordinate(point) {
  return Number.isFinite(point.lat) && Number.isFinite(point.lon) && point.lat >= 30.5 && point.lat <= 32 && point.lon >= 120.7 && point.lon <= 122.4
}

const physicalTitle = /(?:大楼|楼旧址|公寓|住宅|别墅|旧居|故居|公馆|礼拜堂|教堂|清真寺|会堂|教会堂|天主堂|礼堂|会馆|新村|里弄|小区|广场|仓库|书店|戏院|剧院|影剧院|电影院|饭店|旅馆|大酒店|宾馆|邮局|捕房|监狱|桥|塔|墓|祠|庙|堂)$/u
const organizationTitle = /(?:大学|学院|中学|小学|幼儿园|学校|银行|报社|公司|事务所|研究所|研究院|医院|总局|分局|教会|俱乐部)$/u

export function articleScope(article, overrides = [], labels = {}) {
  const override = overrides.find((r) => r.title === article.requestedTitle || r.title === article.resolvedTitle)
  if (override) return { scope: override.scope, reason: override.reason, method: 'reviewed-override' }
  if (article.missing || article.incomplete || article.isDisambiguation) return { scope: 'uncertain', reason: '条目缺失、不完整或为消歧义页。', method: 'api-state' }
  const title = simplify(article.resolvedTitle ?? article.requestedTitle).replace(/\s*\([^)]*\)\s*/gu, '').trim()
  if (organizationTitle.test(title) && !physicalTitle.test(title)) return { scope: 'organization', reason: '条目名称指向机构；保留资料但不将其坐标用作具体历史建筑点。', method: 'conservative-title-filter' }
  const types = (article.entity?.instanceOfIds ?? []).flatMap((id) => {
    const labelSet = labels[id]?.labels ?? labels[id] ?? {}
    return Object.values(labelSet).map((v) => typeof v === 'string' ? v : v?.value).filter(Boolean)
  }).join(' ').toLowerCase()
  if (article.entity?.instanceOfIds?.includes('Q5')) return { scope: 'person', reason: 'Wikidata P31为人。', method: 'entity-type' }
  if (physicalTitle.test(title) || /\b(?:building|house|apartment|residence|villa|mansion|church|cathedral|temple|mosque|synagogue|cinema|theatre|theater|hotel|palace|warehouse|bridge|cemetery)\b/u.test(types)) {
    return { scope: 'building-reference', reason: '链接条目标题或实体类型明确指向建筑；点位仅为该条目参考位置。', method: 'title-or-entity-type' }
  }
  return { scope: 'uncertain', reason: '尚不能确认链接实体是该条保护建筑；坐标留作候选。', method: 'conservative-default' }
}

function distanceMeters(a, b) {
  const radians = (v) => v * Math.PI / 180
  const dlat = radians(a.lat - b.lat), dlon = radians(a.lon - b.lon)
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dlon / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Retain every candidate; export only unambiguous in-area building reference points. */
export function articleLocation(article, scope) {
  const candidates = [
    ...(article.wikipediaCoordinates ?? []).map((c) => ({ ...c, origin: 'wikipedia-geodata', sourceUrl: article.url })),
    ...(article.entity?.coordinateClaims ?? []).map((c) => ({ ...c, origin: 'wikidata-P625', sourceUrl: `https://www.wikidata.org/wiki/${article.wikidataId}` })),
  ].map((c) => ({ ...c, exclusionReasons: [
    ...(!isShanghaiCoordinate(c) ? ['outside-shanghai-or-invalid'] : []),
    ...((c.origin === 'wikidata-P625' || c.globe) && !['earth', 'http://www.wikidata.org/entity/Q2', 'https://www.wikidata.org/entity/Q2'].includes(c.globe) ? ['non-earth-or-unknown-globe'] : []),
    ...(c.rank === 'deprecated' ? ['deprecated-claim'] : []),
    ...(c.origin === 'wikipedia-geodata' && !c.primary ? ['secondary-coordinate'] : []),
    ...(c.precision != null && (!Number.isFinite(c.precision) || c.precision <= 0 || c.precision > 0.001) ? ['coarse-or-invalid-declared-precision'] : []),
  ] }))
  const eligible = candidates.filter((c) => !c.exclusionReasons.length)
  const fromWiki = eligible.filter((c) => c.origin === 'wikipedia-geodata')
  const fromData = eligible.filter((c) => c.origin === 'wikidata-P625')
  const preferred = fromData.filter((c) => c.rank === 'preferred')
  const ranked = preferred.length ? preferred : fromData
  const selectedGroup = fromWiki.length ? fromWiki : ranked
  const selected = selectedGroup[0]
  const conflicts = selected ? [...fromWiki, ...ranked].filter((c) => distanceMeters(selected, c) > 100) : []
  const allowedScope = ['building-reference', 'complex'].includes(scope.scope)
  return { status: !candidates.length ? 'unavailable' : !eligible.length
    ? candidates.some((c) => c.exclusionReasons.includes('coarse-or-invalid-declared-precision')) ? 'precision-review' : 'rejected'
    : !allowedScope ? 'scope-review' : conflicts.length ? 'coordinate-conflict' : 'reference-point',
  scope, coordinateSystem: 'WGS84', candidates,
  point: allowedScope && selected && !conflicts.length ? {
    lat: selected.lat, lon: selected.lon, precision: selected.precision ?? null,
    origin: selected.origin, sourceUrl: selected.sourceUrl, sourceRefs: article.sourceRefs,
    coordinateScope: scope.scope === 'complex' ? 'building-complex-reference-point' : 'linked-building-reference-point',
  } : null,
  notes: ['坐标为关联条目/实体的参考点，不是官网测绘点、历史建筑轮廓或已核定的1926年位置。',
    ...(conflicts.length ? ['主坐标/非弃用优先坐标相差超过100米，暂不选点。'] : [])] }
}
