import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { parseWikipediaHeritageList } from './lib/wikipedia-heritage-list.mjs'
import { matchListings, articleScope, articleLocation } from './lib/wikipedia-heritage-enrichment.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const directory = path.join(root, 'public/data/shanghai-excellent-historical-buildings')
const args = new Set(process.argv.slice(2))
if ([...args].some((arg) => !['--check', '--offline'].includes(arg))) throw new Error('Usage: enrich-shanghai-heritage-wikipedia.mjs [--offline | --check]')
const check = args.has('--check')
const json = async (relative) => JSON.parse(await fs.readFile(path.join(root, relative), 'utf8'))
const datasetJson = async (relative) => JSON.parse(await fs.readFile(path.join(directory, relative), 'utf8'))
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const listSource = await datasetJson('wikipedia/list-source.json')
const listBytes = await fs.readFile(path.join(directory, 'wikipedia', listSource.localPath))
if (listBytes.length !== listSource.byteLength || hash(listBytes) !== listSource.sha256) throw new Error('Wikipedia list source checksum mismatch')
const list = parseWikipediaHeritageList(listBytes.toString('utf8'), listSource)
const official = await datasetJson('buildings.json')
const details = await datasetJson('wikipedia/article-details.json')
let geocoding = null
try { geocoding = await datasetJson('geocoding/results.json') } catch (error) {
  if (error.code !== 'ENOENT') throw error
}
const geocodingById = new Map((geocoding?.records ?? []).map((record) => [record.officialId, record]))
const labelsDocument = await datasetJson('wikipedia/linked-entity-labels.json')
const labelIndex = Object.fromEntries(labelsDocument.records.map((r) => [r.requestedId, r]))
const firstBatch = await json('scripts/data/shanghai-heritage-wikipedia-batch1.json')
const scopes = await json('scripts/data/shanghai-heritage-wikipedia-link-scopes.json')
if (new Set(scopes.overrides.map((r) => r.title)).size !== scopes.overrides.length ||
    scopes.overrides.some((r) => !['organization', 'campus', 'complex', 'person', 'uncertain', 'building-reference'].includes(r.scope) || !r.reason)) {
  throw new Error('Duplicate or invalid article scope overrides')
}
if (String(firstBatch.sourceRevisionId) !== String(listSource.revisionId) || firstBatch.sourceSha256 !== listSource.sha256) {
  throw new Error('Wikipedia list changed: re-review the first-batch identity mapping and article scopes before enrichment')
}
const matches = matchListings(official.records, list.records, firstBatch.mappings)
if (JSON.stringify(details.listSource) !== JSON.stringify(listSource)) throw new Error('Article details were collected against a different Wikipedia list snapshot')
if (details.failures.length) throw new Error(`Resolve article collection failures before enrichment: ${details.failures.length}`)
const byWikiId = new Map(list.records.map((r) => [r.id, r]))
const byOfficialId = new Map(matches.map((r) => [r.officialId, r]))
const byTitle = new Map(details.records.map((r) => [r.requestedTitle, r]))
const allTitles = new Set(list.records.flatMap((r) => r.articleLinks.filter((l) => l.role === 'original-name').map((l) => l.title)))
if (allTitles.size !== details.records.length || [...allTitles].some((title) => !byTitle.has(title))) throw new Error('Article title coverage mismatch')
for (const scope of scopes.overrides) {
  if (!details.records.some((r) => r.requestedTitle === scope.title || r.resolvedTitle === scope.title)) throw new Error(`Stale article scope override: ${scope.title}`)
}
const detailFields = ['originalNameOrUse', 'listedNameOrUse', 'addressAsListed', 'districtAsListed',
  'constructionDateText', 'floorsText', 'structureText', 'designerText', 'protectionCategoryText', 'useTypeText']
const labelFor = (id) => {
  const labels = labelIndex[id]?.labels ?? {}
  return { id, label: labels['zh-hans']?.value ?? labels.zh?.value ?? labels.en?.value ?? id,
    url: `https://www.wikidata.org/wiki/${id}` }
}
const records = official.records.map((record) => {
  const match = byOfficialId.get(record.id)
  const wiki = byWikiId.get(match.wikipediaId)
  const articleReferences = wiki.articleLinks.filter((l) => l.role === 'original-name').map((link) => {
    const article = byTitle.get(link.title)
    let scope = articleScope(article, scopes.overrides, labelIndex)
    // GeoData/P625 describes the page entity, not a building in a section anchor.
    if (new URL(link.url).hash) scope = { scope: 'uncertain', method: 'section-link', reason: '来源链接指向条目中的章节；整篇条目坐标不能代表该章节所述楼栋。' }
    const location = articleLocation(article, scope)
    return { requestedTitle: link.title, resolvedTitle: article.resolvedTitle, listLinkUrl: link.url,
      url: article.url, revisionId: article.revisionId, wikidataId: article.wikidataId,
      entityRevisionId: article.entity?.lastrevid ?? null, sourceRefs: article.sourceRefs,
      scope, location,
      architects: (article.entity?.architectIds ?? []).map(labelFor),
      architecturalStyles: (article.entity?.styleIds ?? []).map(labelFor),
      entityInceptionClaims: article.entity?.inceptionClaims ?? [],
      detailsRef: { file: 'wikipedia/article-details.json', requestedTitle: link.title } }
  })
  return { id: record.id, batch: record.batch, code: record.code, codeRaw: record.codeRaw,
    official: { originalNameOrUse: record.originalNameOrUse, listedNameOrUse: record.listedNameOrUse,
      addressAsListed: record.addressAsListed, districtAsListed: record.districtAsListed,
      sourceNotes: record.sourceNotes, qualityFlags: record.qualityFlags, source: record.source,
      recordRef: { file: 'buildings.json', id: record.id } },
    match,
    address: { value: record.addressAsListed || wiki.addressAsListed,
      source: record.addressAsListed ? 'shanghai-fgj' : 'wikipedia-list',
      sourceUrl: record.addressAsListed ? record.source.url : listSource.requestedUrl,
      comparisonStatus: match.comparisons.address.status,
      alternatives: match.comparisons.address.status === 'different-as-listed' ? [{ value: wiki.addressAsListed, source: 'wikipedia-list', sourceUrl: listSource.requestedUrl }] : [] },
    wikipedia: { id: wiki.id, codeRaw: wiki.codeRaw, sequenceRaw: wiki.sequenceRaw,
      ...Object.fromEntries(detailFields.map((field) => [field, wiki[field]])),
      components: wiki.components, articleLinks: wiki.articleLinks, imageLinks: wiki.imageLinks,
      notes: wiki.notes, source: wiki.source },
    articleReferences,
    locationStatus: articleReferences.some((r) => r.location.point) ? 'has-reference-point'
      : articleReferences.some((r) => r.location.candidates.length) ? 'candidates-need-review' : 'no-source-coordinate',
  }
})

for (const record of records) {
  const result = geocodingById.get(record.id)
  if (!result) continue
  if (record.wikipedia.addressAsListed !== result.wikipediaAddress || record.official.addressAsListed !== result.officialAddress) {
    throw new Error(`Address source changed; re-review geocoding ${record.id}`)
  }
  if (record.locationStatus !== 'no-source-coordinate') throw new Error(`Address supplement would overwrite an existing Wikipedia location: ${record.id}`)
  record.wikipediaLocationStatus = record.locationStatus
  record.geocoding = { status: result.status, method: result.method, reason: result.reason,
    resultRef: { file: 'geocoding/results.json', officialId: record.id }, point: result.point }
  if (result.point) record.locationStatus = 'has-reference-point'
  else if (result.candidates.length) record.locationStatus = 'candidates-need-review'
}

const features = records.flatMap((record) => record.articleReferences.flatMap((article, index) => {
  const point = article.location.point
  if (!point) return []
  return [{ type: 'Feature', id: `${record.id}-reference-${index + 1}`,
    geometry: { type: 'Point', coordinates: [point.lon, point.lat] },
    properties: { officialId: record.id, wikipediaId: record.wikipedia.id, batch: record.batch,
      officialCodeRaw: record.codeRaw, name: record.official.originalNameOrUse,
      articleTitle: article.resolvedTitle, address: record.address.value,
      addressComparison: record.address.comparisonStatus, coordinateScope: point.coordinateScope,
      coordinateSystem: 'WGS84', precisionDegrees: point.precision, origin: point.origin,
      sourceUrl: point.sourceUrl, wikipediaUrl: article.url, wikidataId: article.wikidataId,
      historicalGeometryVerified: false } }]
}))
const addressFeatures = records.filter((record) => record.geocoding?.point).map((record) => {
  const point = record.geocoding.point
  const displayName = /^(住宅|民宅|民居|待考|建筑|花园住宅|里弄住宅|公寓|办公楼|学校|医院|厂房|其他)$/u.test(record.official.originalNameOrUse?.trim() ?? '')
    ? `${point.sourceAddress ?? record.address.value} ${point.libraryName ?? record.official.originalNameOrUse}`
    : record.official.originalNameOrUse
  return { type: 'Feature', id: `${record.id}-address-reference`,
    geometry: { type: 'Point', coordinates: [point.lon, point.lat] },
    properties: { officialId: record.id, wikipediaId: record.wikipedia.id, batch: record.batch,
      officialCodeRaw: record.codeRaw, name: record.official.originalNameOrUse,
      articleTitle: displayName, address: record.address.value, addressComparison: record.address.comparisonStatus,
      coordinateScope: point.coordinateScope, coordinateSystem: 'WGS84', precisionDegrees: null,
      origin: point.origin, sourceUrl: point.sourceUrl, coordinateSourceTitle: point.sourceTitle,
      sourceAddress: point.sourceAddress, locationNote: point.notes.join(' '),
      wikipediaUrl: record.articleReferences[0]?.url ?? listSource.requestedUrl,
      wikidataId: null, historicalGeometryVerified: false } }
})
// A compact map payload avoids downloading the research archive to open a card.
const enrichedById = new Map(records.map((record) => [record.id, record]))
const mapFeatures = [...features, ...addressFeatures].map((feature) => {
  const record = enrichedById.get(feature.properties.officialId)
  return { ...feature, properties: { ...feature.properties,
    officialName: record.official.originalNameOrUse,
    listedName: record.official.listedNameOrUse,
    wikipediaAddress: record.wikipedia.addressAsListed,
    district: record.official.districtAsListed,
    constructionDate: record.wikipedia.constructionDateText,
    floors: record.wikipedia.floorsText,
    structure: record.wikipedia.structureText,
    designer: record.wikipedia.designerText,
    officialSourceUrl: record.official.source.url,
    wikipediaListUrl: listSource.requestedUrl,
  } }
})
const byBatch = Object.fromEntries([1, 2, 3, 4, 5].map((batch) => [batch, records.filter((r) => r.batch === batch).length]))
const coverage = {
  officialRecords: official.records.length, wikipediaRecords: list.recordCount, matchedRecords: matches.length, byBatch,
  recordsWithAddress: records.filter((r) => r.address.value).length,
  addressesFilledFromWikipedia: records.filter((r) => r.address.source === 'wikipedia-list').length,
  addressDifferences: matches.filter((r) => r.comparisons.address.status === 'different-as-listed').length,
  recordsWithConstructionDateText: records.filter((r) => r.wikipedia.constructionDateText).length,
  recordsWithFloorsText: records.filter((r) => r.wikipedia.floorsText).length,
  recordsWithStructureText: records.filter((r) => r.wikipedia.structureText).length,
  recordsWithDesignerText: records.filter((r) => r.wikipedia.designerText).length,
  recordsWithOriginalNameArticleLinks: records.filter((r) => r.articleReferences.length).length,
  uniqueArticleTitles: details.articleCount,
  articlesWithAnySourceCoordinate: details.coordinateCoverage.articlesWithEitherSource,
  recordsWithReferencePoints: records.filter((r) => r.locationStatus === 'has-reference-point').length,
  referencePointFeatures: mapFeatures.length,
  wikipediaReferencePointFeatures: features.length,
  addressReferencePointFeatures: addressFeatures.length,
  recordsWithOnlyCoordinateCandidates: records.filter((r) => r.locationStatus === 'candidates-need-review').length,
  recordsWithoutSourceCoordinates: records.filter((r) => r.locationStatus === 'no-source-coordinate').length,
}
const methodology = {
  identity: '名录条目对应，不等于所有字段已获双源核实。第一批采用61条人工名称/地址对照，其余批次采用经核对的编号转换及来源异常例外。不同编号同址不合并。',
  addresses: '优先保留官网地址，只有官网空缺时由维基补充；差异均并存，different-as-listed只是差异标记，不自动裁定哪一方正确。',
  dates: 'constructionDateText直接保留维基表中建造年代；Wikidata P571仅作为entityInceptionClaims保存，未当作建成年份。',
  currentUse: '双方listedNameOrUse及第五批混合列均为页面记载，不视为独立核定的今日用途。',
  locations: '原维基点使用建筑名称链接的GeoData/P625，保留原筛查规则。地址补点来自上海图书馆公开目录或独立复核来源；门牌、里弄、校园及建筑群参考点分别标注来源和范围。完整选择、暂停及坐标转换理由见geocoding/results.json。',
  precision: 'Wikidata precision单位为角度，是来源数值精度，不是测绘误差保证；Wikipedia未提供precision时为null。候选与选点均不代表建筑轮廓或1926年历史位置。',
  media: '只保存图片来源链接，未下载图片；图片有各自版权许可，须查看文件说明页。',
  attribution: { wikipediaUrl: listSource.requestedUrl, wikipediaRevisionId: listSource.revisionId,
    wikipediaLicense: 'https://creativecommons.org/licenses/by-sa/4.0/',
    wikidataLicense: 'https://creativecommons.org/publicdomain/zero/1.0/',
    changes: '表格字段结构化、编号对照、链接实体资料拼接、坐标筛选及差异标记；官网原件未改。' },
}
const enriched = { schemaVersion: 1, recordCount: records.length, sourceIndexUrl: official.sourceIndexUrl,
  wikipediaSource: listSource, coverage, methodology, geocodingCoverage: geocoding?.coverage ?? null, records }
const reviews = records.filter((r) => r.match.reviewFlags.length || r.locationStatus === 'candidates-need-review').map((r) => ({
  officialId: r.id, wikipediaId: r.wikipedia.id, officialName: r.official.originalNameOrUse,
  wikipediaName: r.wikipedia.originalNameOrUse, flags: r.match.reviewFlags,
  address: r.match.comparisons.address, locationStatus: r.locationStatus,
  coordinateReviews: r.articleReferences.filter((a) => a.location.candidates.length && !a.location.point).map((a) => ({
    title: a.resolvedTitle, status: a.location.status, scope: a.scope, sourceUrl: a.url,
  })),
}))
const inputs = ['buildings.json', 'wikipedia/list-source.json', 'wikipedia/raw/list.html', 'wikipedia/article-details.json',
  'wikipedia/linked-entity-labels.json', 'wikipedia/detail-sources.json']
if (geocoding) inputs.push('geocoding/results.json')
const inputHashes = []
for (const file of inputs) {
  const bytes = await fs.readFile(path.join(directory, file))
  inputHashes.push({ file, byteLength: bytes.length, sha256: hash(bytes) })
}
for (const file of ['scripts/data/shanghai-heritage-wikipedia-batch1.json', 'scripts/data/shanghai-heritage-wikipedia-link-scopes.json']) {
  const bytes = await fs.readFile(path.join(root, file))
  inputHashes.push({ repositoryFile: file, byteLength: bytes.length, sha256: hash(bytes) })
}
const outputs = {
  'wikipedia/list-records.json': { schemaVersion: 1, ...list },
  'wikipedia/matches.json': { schemaVersion: 1, recordCount: matches.length, methodology: methodology.identity, records: matches },
  'buildings-enriched.json': enriched,
  'wikipedia/locations.geojson': { type: 'FeatureCollection', metadata: { coordinateSystem: 'WGS84', meaning: methodology.locations, coverage }, features },
  'map-buildings.geojson': { type: 'FeatureCollection', metadata: { coordinateSystem: 'WGS84', meaning: methodology.locations, coverage }, features: mapFeatures },
  ...(geocoding ? { 'geocoding/locations.geojson': { type: 'FeatureCollection', metadata: {
    coordinateSystem: 'WGS84', meaning: geocoding.methodology, coverage: geocoding.coverage }, features: addressFeatures } } : {}),
  'wikipedia/review-queue.json': { schemaVersion: 1, recordCount: reviews.length,
    meaning: '地址差异/名称泛化/坐标范围待核的独立清单；差异不自动推翻名录对应，也不代表均为错误。', records: reviews },
  'wikipedia/validation.json': { schemaVersion: 1, coverage, inputs: inputHashes,
    checks: { allOfficialRecordsMappedOnce: true, allWikipediaRecordsMappedOnce: true,
      articleTitleCoverageComplete: true, apiFailures: details.failures.length,
      sourceListHashVerified: true, outputMode: 'independent-reference-dataset' } },
}
for (const [file, value] of Object.entries(outputs)) {
  const text = serialize(value)
  const destination = path.join(directory, file)
  if (check) {
    if (await fs.readFile(destination, 'utf8') !== text) throw new Error(`Enrichment output drift: ${file}`)
  } else await fs.writeFile(destination, text)
}
console.log(JSON.stringify({ ...coverage, checked: check }, null, 2))
