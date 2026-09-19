import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import * as OpenCC from 'opencc-js'
import { heritageAddressKey, addressesOverlap } from '../../../scripts/lib/heritage-library-matching.mjs'
import { planHeritageAddress } from '../../../scripts/lib/heritage-addresses.mjs'
import { normalizeBuildingAddress } from '../../../scripts/lib/cluster-buildings.mjs'

// Offline discovery only. Every output is a review candidate, never a merge instruction.
const outputDir = path.dirname(new URL(import.meta.url).pathname)
const inputs = {
  historical: 'public/data/historical-features.geojson',
  curatedParks: 'public/data/curated-parks.geojson',
  liveBuildings: 'scripts/data/virtual-shanghai-buildings-live.json',
  heritage: 'public/data/shanghai-excellent-historical-buildings/buildings-enriched.json',
  heritageMap: 'public/data/shanghai-excellent-historical-buildings/map-buildings.geojson',
  siteLinks: 'src/data/landmarkSiteLinks.ts',
  currentUseHolds: 'scripts/data/landmark-current-use-holds.json',
}
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const uniq = (v) => [...new Set(v.filter((x) => x !== undefined && x !== null && x !== ''))]
const simplify = OpenCC.Converter({ from: 'tw', to: 'cn' })
const basic = (s) => simplify(String(s ?? '').normalize('NFKC')).toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, '')
const nameKey = (s) => basic(s).replace(/^上海市?/, '').replace(/(?:旧址|旧居|原址|遗址|历史建筑|优秀历史建筑)$/u, '')
const generic = /^(?:vanished|none|null|unknown|yes|no|名称未载|住宅|花园住宅|民宅|民居|住宅楼|居民住宅|公寓|里弄|公寓楼|花园|公园|楼|建筑|建筑群|花园洋房|办公|办公楼|办公用房|办公室|综合办公楼|商业|商店|商铺|商场|学校|校舍|中学|大学|医院|厂房|仓库|码头|银行|教堂|寺庙|多户住宅|多单位使用|多户居住|其他|居住|宿舍|house|residence|residentialbuilding|hospital|school|building|villa|garden|park|factory|church|bank|office|temple)$/u
const usefulName = (s) => { const k = nameKey(s); return k.length >= (/[\u3400-\u9fff]/u.test(k) ? 3 : 5) && !generic.test(k) && !/^(?:第?[一二三四五六七八九十0-9]+[号栋楼幢座]|\d+号住宅)$/u.test(k) }
async function moduleTs(p) {
  const code = ts.transpileModule(fs.readFileSync(p, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
}
const { mergeCuratedParkFeatures } = await moduleTs('src/lib/parkLabels.ts')
const { mergeLandmarkSites } = await moduleTs('src/lib/landmarkSites.ts')
const { landmarkSiteLinks } = await moduleTs(inputs.siteLinks)
const raw = read(inputs.historical), live = read(inputs.liveBuildings).records
const holds = read(inputs.currentUseHolds)
const runtime = mergeLandmarkSites(mergeCuratedParkFeatures(raw, read(inputs.curatedParks)), landmarkSiteLinks)
const heritage = read(inputs.heritage).records, map = read(inputs.heritageMap).features
const liveById = new Map(live.map((r) => [r.id, r])), mapById = new Map(map.map((f) => [f.properties.officialId, f]))
const addNames = (into, value, role, source, url) => {
  if (typeof value !== 'string' || !value.trim()) return
  const variants = uniq([value, ...value.split(/[\n；;、/／]/u), ...[...value.matchAll(/[（(]([^）)]+)[）)]/gu)].map((m) => m[1]), value.replace(/[（(][^）)]*[）)]/gu, '')])
  for (const v of variants) if (usefulName(v)) into.push({ value: v.trim(), normalized: nameKey(v), role, source, ...(url ? { url } : {}) })
}
const dedupeNames = (names) => [...new Map(names.map((n) => [`${n.value}|${n.role}|${n.source}`, n])).values()]
function referencePoint(g) {
  if (g.type === 'Point') return { coordinate: g.coordinates, method: 'source-point' }
  const ring = g.type === 'Polygon' ? g.coordinates[0] : g.type === 'MultiPolygon' ? g.coordinates[0][0] : null
  if (!ring) return { coordinate: null, method: 'unsupported-geometry' }
  // A rough polygon centre is ONLY used for candidate discovery.
  return { coordinate: [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length], method: 'polygon-vertex-mean-discovery-only' }
}
function distance(a, b) {
  if (!a || !b) return null
  const rad = Math.PI / 180, dlat = (a[1] - b[1]) * rad, dlon = (a[0] - b[0]) * rad
  const q = Math.sin(dlat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dlon / 2) ** 2
  return Math.round(6371008.8 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q)))
}
function normalizedUrl(s) { try { const u = new URL(s); return decodeURIComponent(u.hostname.replace(/^www\./, '') + u.pathname + u.search).replace(/\/$/, '').toLowerCase() } catch { return null } }
const groups = new Map()
const historicalRoads = new Map()
for (const f of raw.features.filter((f) => f.properties.kind === 'road')) {
  const p = f.properties
  for (const name of [p.historicalName, ...(p.aliases ?? [])]) {
    if (!name || !/[a-z]/iu.test(name) || !/[路街道]/u.test(p.modernNameZh)) continue
    const key = normalizeBuildingAddress(name).street
    if (!historicalRoads.has(key)) historicalRoads.set(key, new Set())
    historicalRoads.get(key).add(p.modernNameZh)
  }
}
for (const f of runtime.features.filter((f) => f.properties.kind === 'landmark')) {
  const id = f.properties.featureGroupId
  if (!groups.has(id)) groups.set(id, [])
  groups.get(id).push(f)
}
const landmarks = [...groups].map(([groupId, features]) => {
  const first = features[0], p = first.properties, sourceRecordIds = uniq(features.flatMap((f) => f.properties.sourceRecordIds ?? []))
  const rows = sourceRecordIds.map((id) => liveById.get(id)).filter(Boolean), names = []
  for (const f of features) {
    const q = f.properties
    for (const v of [q.historicalName, q.modernNameZh, q.historicalChinese, ...(q.aliases ?? [])]) addNames(names, v, 'historical-name-or-alias', 'runtime-landmark')
    addNames(names, q.currentNameZh, 'current-name', 'existing-current-use', q.currentUseSourceUri)
    for (const r of q.historicalRecords ?? []) for (const v of [r.name, r.nameZh]) addNames(names, v, 'historical-record', 'runtime-historical-record')
  }
  for (const r of rows) for (const v of [r.name, r.nameZh]) addNames(names, v, 'vs-source-name', `vs-building:${r.id}`, r.sourceUrl)
  const historicalAddresses = rows.filter((r) => r.address).map((r) => {
    const a = normalizeBuildingAddress(r.address), modernRoads = [...(historicalRoads.get(a.street) ?? [])]
    return { address: r.address, sourceRecordId: r.id, sourceUrl: r.sourceUrl, oldStreetNumber: a.streetNumber, historicalStreet: a.street, modernRoadNameHints: modernRoads, warning: modernRoads.length ? '项目道路名对照仅作线索；没有推断门牌号未变。' : null }
  })
  const persistentHolds = holds.filter((hold) => hold.featureGroupId === groupId || (hold.sourceRecordIds ?? []).some((id) => sourceRecordIds.includes(id)))
  return { featureId: p.id, featureGroupId: groupId, featureIds: features.map((f) => f.properties.id), sourceRecordIds, sourceParkRecordIds: uniq(features.flatMap((f) => f.properties.sourceParkRecordIds ?? [])), displayName: p.historicalName, displayChinese: p.modernNameZh, names: dedupeNames(names), historicalAddresses, currentAddresses: uniq(features.map((f) => f.properties.currentAddress)), currentNames: uniq(features.map((f) => f.properties.currentNameZh)), currentUseRelationships: uniq(features.map((f) => f.properties.currentUseRelationship)), currentUseMatches: uniq(features.map((f) => f.properties.currentUseMatch)), currentUseNotes: uniq(features.map((f) => f.properties.currentUseNote)), persistentHolds, sourceReferences: uniq(features.flatMap((f) => [...Object.values(f.properties.sourceUrls ?? {}), f.properties.currentUseSourceUri, ...(f.properties.currentUseSources ?? []).map((s) => s.url)])), labelYears: uniq(features.map((f) => f.properties.labelYearIsFallback ? null : f.properties.labelYear)), ...referencePoint(first.geometry) }
})
const heritageRows = heritage.map((r) => {
  const names = [], source = r.official.source?.url
  addNames(names, r.official.originalNameOrUse, 'official-original-name', 'shanghai-fgj', source)
  addNames(names, r.official.listedNameOrUse, 'official-listed-name', 'shanghai-fgj', source)
  addNames(names, r.wikipedia?.originalNameOrUse, 'wikipedia-original-name', 'wikipedia-list', r.wikipedia?.source?.url)
  addNames(names, r.wikipedia?.listedNameOrUse, 'wikipedia-listed-name', 'wikipedia-list', r.wikipedia?.source?.url)
  for (const c of r.wikipedia?.components ?? []) addNames(names, c.originalNameOrUse, 'component-name', 'wikipedia-list', r.wikipedia?.source?.url)
  for (const a of r.articleReferences ?? []) if (a.scope?.scope === 'building-reference') addNames(names, a.resolvedTitle, 'building-article-title', 'wikipedia-article', a.url)
  const f = mapById.get(r.id), plan = planHeritageAddress(r)
  if (f) addNames(names, f.properties.articleTitle, 'map-location-title', f.properties.origin, f.properties.sourceUrl)
  return { officialId: r.id, batch: r.batch, code: r.code, originalName: r.official.originalNameOrUse, listedName: r.official.listedNameOrUse, address: r.official.addressAsListed, wikipediaAddress: r.wikipedia?.addressAsListed, components: r.wikipedia?.components ?? [], names: dedupeNames(names), addresses: uniq([r.official.addressAsListed, r.wikipedia?.addressAsListed, ...(r.address?.alternatives ?? []).map((a) => a.value)]), coordinate: f?.geometry.coordinates ?? null, coordinateScope: f?.properties.coordinateScope ?? null, locationSource: f ? { origin: f.properties.origin, sourceUrl: f.properties.sourceUrl, articleTitle: f.properties.articleTitle } : null, addressClass: plan.addressClass, flags: plan.flags, sourceReferences: uniq([source, ...(r.articleReferences ?? []).map((a) => a.url), f?.properties.sourceUrl]), constructionDate: r.wikipedia?.constructionDateText ?? null }
})
const rowsByName = new Map(), rowsByAddress = new Map(), rowsBySource = new Map()
for (const h of heritageRows) {
  for (const n of h.names) { if (!rowsByName.has(n.normalized)) rowsByName.set(n.normalized, []); rowsByName.get(n.normalized).push({ h, n }) }
  for (const a of h.addresses) { const k = heritageAddressKey(a); if (!rowsByAddress.has(k)) rowsByAddress.set(k, []); rowsByAddress.get(k).push(h) }
  for (const s of h.sourceReferences) { const k = normalizedUrl(s); if (k && !/fgj\.sh\.gov\.cn|上海市优秀历史建筑/u.test(k)) { if (!rowsBySource.has(k)) rowsBySource.set(k, []); rowsBySource.get(k).push(h) } }
}
const nameEntries = [...rowsByName]
const candidates = [], landmarkCoverage = []
for (const l of landmarks) {
  const pairs = new Map()
  const pair = (h) => { if (!pairs.has(h.officialId)) pairs.set(h.officialId, { h, names: [], addresses: [], sources: [] }); return pairs.get(h.officialId) }
  for (const n of l.names) {
    for (const { h, n: hn } of rowsByName.get(n.normalized) ?? []) pair(h).names.push({ landmark: n.value, heritage: hn.value, landmarkRole: n.role, heritageRole: hn.role, match: 'normalized-exact', normalized: n.normalized })
    if (n.normalized.length < 4 || !/[\u3400-\u9fff]/u.test(n.normalized)) continue
    for (const [key, values] of nameEntries) {
      if (key === n.normalized || key.length < 4 || Math.min(key.length, n.normalized.length) / Math.max(key.length, n.normalized.length) < 0.48) continue
      if (!(key.includes(n.normalized) || n.normalized.includes(key))) continue
      for (const { h, n: hn } of values) { if ((distance(l.coordinate, h.coordinate) ?? 100000) > 1000) continue; pair(h).names.push({ landmark: n.value, heritage: hn.value, landmarkRole: n.role, heritageRole: hn.role, match: 'distinctive-substring-review', normalized: key.length < n.normalized.length ? key : n.normalized }) }
    }
  }
  for (const a of l.currentAddresses) for (const h of heritageRows) {
    for (const b of h.addresses) {
      if (heritageAddressKey(a) === heritageAddressKey(b)) pair(h).addresses.push({ landmark: a, heritage: b, match: 'full-normalized-current-address' })
      else if (addressesOverlap(a, b)) pair(h).addresses.push({ landmark: a, heritage: b, match: 'road-door-range-overlap-review' })
    }
  }
  for (const s of l.sourceReferences) for (const h of rowsBySource.get(normalizedUrl(s)) ?? []) pair(h).sources.push(s)
  for (const a of l.historicalAddresses) {
    if (!/^\d+[a-z]?(?:-\d+[a-z]?)?$/iu.test(a.oldStreetNumber ?? '') || a.modernRoadNameHints.length !== 1) continue
    const query = `${a.modernRoadNameHints[0]}${a.oldStreetNumber}号`
    for (const h of heritageRows) {
      if ((distance(l.coordinate, h.coordinate) ?? Infinity) > 180) continue
      for (const b of h.addresses) if (addressesOverlap(query, b)) pair(h).addresses.push({ landmark: a.address, heritage: b, modernRoadHint: a.modernRoadNameHints[0], match: 'old-road-name-and-number-coincidence-only', warning: '门牌可能重编；这是候选检索线索，不是旧新号等同证明。' })
    }
  }
  // Neighbours are included only as an explicit low-confidence queue, never as proposed merges.
  const near = heritageRows.map((h) => ({ h, d: distance(l.coordinate, h.coordinate) })).filter((x) => x.d !== null && x.d <= 35).sort((a, b) => a.d - b.d)
  for (const { h } of near) pair(h)
  for (const { h, names, addresses, sources } of pairs.values()) {
    const d = distance(l.coordinate, h.coordinate)
    const evidence = { nameMatches: [...new Map(names.map((n) => [JSON.stringify(n), n])).values()], addressMatches: [...new Map(addresses.map((a) => [JSON.stringify(a), a])).values()], sharedSourceUrls: uniq(sources) }
    const exact = evidence.nameMatches.some((n) => n.match === 'normalized-exact')
    const exactHistorical = evidence.nameMatches.some((n) => n.match === 'normalized-exact' && n.landmarkRole !== 'current-name' && !['official-listed-name', 'wikipedia-listed-name', 'map-location-title'].includes(n.heritageRole))
    const hazards = []
    if (!h.coordinate) hazards.push('heritage-has-no-coordinate')
    if (l.method !== 'source-point') hazards.push('landmark-polygon-reference-only')
    if (l.currentUseRelationships.includes('institutional-successor-relocated')) hazards.push('relocated-institution-modern-information')
    if (l.currentUseRelationships.includes('site-redeveloped')) hazards.push('same-site-rebuilt-not-same-building')
    if (l.currentUseRelationships.some((s) => ['same-site-continuing-use', 'same-site-repurposed', 'partial-remains-on-original-site'].includes(s))) hazards.push('existing-research-proves-site-scope-only')
    if (l.sourceRecordIds.length > 1) hazards.push('multi-source-landmark-site')
    if (h.components.length > 1 || /大学|校园|校区|建筑群|[弄坊邨村]|住宅群|[号栋幢]楼|[东南西北红灰]楼|主楼|教学楼|门楼|步高里/u.test(`${h.originalName} ${h.address}`) || /中学|大学|学院|医院|学校|公学|学堂|女中|厂|码头/u.test(h.originalName ?? '')) hazards.push('campus-complex-or-component-scope')
    if (l.persistentHolds.length) hazards.push('persistent-current-use-hold')
    if (evidence.nameMatches.length && !evidence.nameMatches.some((n) => n.landmarkRole !== 'current-name')) hazards.push('existing-current-name-only-not-identity-proof')
    if (l.currentUseMatches.some((s) => ['historical-name-and-location', 'historical-name-and-list-record'].includes(s))) hazards.push('legacy-automatic-current-use-does-not-prove-identity')
    if (l.sourceRecordIds.includes(551) && h.officialId === 'sh-fgj-2A002-01') hazards.push('reviewed-source-door-conflict-vs4-bund-heritage3')
    if (l.sourceRecordIds.includes(598) && h.officialId === 'sh-fgj-5A075-01') hazards.push('reviewed-source-door-conflict-algar60-vs-ymca85')
    if (d !== null && d > 250) hazards.push('coordinate-separation-over-250m')
    if (h.flags.includes('source-reports-demolished')) hazards.push('official-demolished-flag')
    if (!evidence.nameMatches.length && !evidence.addressMatches.length && !evidence.sharedSourceUrls.length) hazards.push('distance-only-do-not-merge')
    let classification = 'insufficient-evidence'
    if (exact && d !== null && d > 250) classification = 'name-match-location-conflict'
    else if (exactHistorical && d !== null && d <= 180 && !hazards.some((x) => ['campus-complex-or-component-scope', 'landmark-polygon-reference-only', 'relocated-institution-modern-information', 'official-demolished-flag', 'multi-source-landmark-site', 'persistent-current-use-hold', 'reviewed-source-door-conflict-vs4-bund-heritage3', 'reviewed-source-door-conflict-algar60-vs-ymca85', 'same-site-rebuilt-not-same-building', 'existing-research-proves-site-scope-only'].includes(x))) classification = 'strong-one-to-one'
    else if (evidence.nameMatches.length || evidence.addressMatches.length || evidence.sharedSourceUrls.length) classification = 'complex-site-review'
    candidates.push({ candidateId: `${l.featureGroupId}__${h.officialId}`, classification, landmark: l, heritage: h, distanceMetres: d, evidence, hazards, reason: classification === 'strong-one-to-one' ? '有独特历史名称精确交集且参考点近邻；仍须核完整门牌、时期及实体范围后才能生成合并配置。' : classification === 'name-match-location-conflict' ? '名称一致但坐标差异超过250米；可能为异址、机构迁移或来源点误差，保留两条待核。' : hazards.includes('distance-only-do-not-merge') ? '仅空间近邻，不构成实体同一证据；不得直接合并。' : '有名称、门牌或实体来源交叉线索，但建筑群、时期、名称变更或坐标范围仍需人工复核。' })
  }
  landmarkCoverage.push({ featureGroupId: l.featureGroupId, featureId: l.featureId, sourceRecordIds: l.sourceRecordIds, candidateCount: pairs.size, status: pairs.size ? 'has-review-candidate' : 'no-evidence-candidate', nameCount: l.names.length, currentAddressCount: l.currentAddresses.length, historicalAddressCount: l.historicalAddresses.length })
}
// Do not present one-to-many findings as simple one-to-one relationships.
const strongByLandmark = new Map(), strongByHeritage = new Map()
for (const c of candidates.filter((c) => c.classification === 'strong-one-to-one')) {
  for (const [m, key] of [[strongByLandmark, c.landmark.featureGroupId], [strongByHeritage, c.heritage.officialId]]) { if (!m.has(key)) m.set(key, []); m.get(key).push(c) }
}
for (const c of candidates.filter((c) => c.classification === 'strong-one-to-one')) if (strongByLandmark.get(c.landmark.featureGroupId).length > 1 || strongByHeritage.get(c.heritage.officialId).length > 1) { c.classification = 'complex-site-review'; c.hazards.push('multiple-strong-pairs'); c.reason = '同一地标或保护项有多条强名称候选，不能自动指定一对一归并。' }
for (const c of candidates.filter((c) => c.classification === 'strong-one-to-one')) {
  const competing = candidates.filter((other) => other.candidateId !== c.candidateId &&
    (other.heritage.officialId === c.heritage.officialId || other.landmark.featureId === c.landmark.featureId) &&
    other.distanceMetres !== null && other.distanceMetres <= 180 && other.evidence.nameMatches.some((n) => n.match === 'normalized-exact'))
  if (!competing.length) continue
  c.classification = 'complex-site-review'
  c.hazards.push('nearby-competing-exact-name-pair')
  c.competingCandidateIds = competing.map((other) => other.candidateId)
  c.reason = '另有相近的同名地标/保护项竞争，即便该项单独看是强名称线索，也需要先复核两侧实体范围。'
}
const byClass = (items) => Object.fromEntries(uniq(items.map((c) => c.classification)).map((k) => [k, items.filter((c) => c.classification === k).length]))
const sourceToGroups = new Map()
for (const l of landmarks) for (const id of l.sourceRecordIds) { if (!sourceToGroups.has(id)) sourceToGroups.set(id, []); sourceToGroups.get(id).push(l.featureGroupId) }
const output = {
  schemaVersion: 1, generatedAt: new Date().toISOString(), status: 'discovery-candidates-not-merge-config',
  methodology: { inputs: Object.fromEntries(Object.entries(inputs).map(([k, p]) => [k, { path: p, sha256: createHash('sha256').update(fs.readFileSync(p)).digest('hex') }])), runtimeComposition: 'mergeLandmarkSites(mergeCuratedParkFeatures(raw, curatedParks), landmarkSiteLinks)', normalization: 'OpenCC traditional to simplified, case/punctuation folding, Shanghai prefix and old-site suffix removal; original strings retained', matching: ['All runtime landmark names/aliases plus all 1803 source records are checked against all 1058 official records.', 'Exact distinctive names are compared globally, substring names within 1000m, existing modern addresses globally, entity source URLs globally.', 'Every heritage point within 35m is a distance-only queue, not a merge proposal.', 'Historical Latin-script addresses are retained verbatim, not automatically converted to modern Chinese door numbers.', 'Strong classification is an audit priority, never authorization to merge; current occupant names and institution succession require separate historical evidence.'], distance: 'WGS84 Haversine; polygons use vertex mean only for discovery; source points retain their original reference precision.' },
  coverage: { liveBuildingRecords: live.length, officialRecords: heritage.length, locatedHeritageRecords: map.length, runtimeLandmarkGroups: landmarks.length, linkedSourceBuildingIds: sourceToGroups.size, missingSourceBuildingIds: live.filter((r) => !sourceToGroups.has(r.id)).map((r) => r.id), duplicateSourceBuildingIds: [...sourceToGroups].filter(([, ids]) => ids.length > 1).map(([sourceRecordId, groups]) => ({ sourceRecordId, groups })), candidates: candidates.length, byClassification: byClass(candidates) },
  candidates: candidates.sort((a, b) => a.classification.localeCompare(b.classification) || (a.distanceMetres ?? Infinity) - (b.distanceMetres ?? Infinity)),
  landmarkCoverage,
  sourceBuildingCoverage: live.map((r) => ({ sourceRecordId: r.id, name: r.name, nameZh: r.nameZh, historicalAddress: r.address, runtimeGroups: sourceToGroups.get(r.id) ?? [], candidateIds: candidates.filter((c) => c.landmark.sourceRecordIds.includes(r.id)).map((c) => c.candidateId) })),
  heritageCoverage: heritageRows.map((h) => ({ officialId: h.officialId, originalName: h.originalName, address: h.address, hasCoordinate: Boolean(h.coordinate), candidateIds: candidates.filter((c) => c.heritage.officialId === h.officialId).map((c) => c.candidateId) })),
}
fs.writeFileSync(path.join(outputDir, 'candidates.json'), JSON.stringify(output, null, 2) + '\n')
console.log(JSON.stringify(output.coverage, null, 2))
