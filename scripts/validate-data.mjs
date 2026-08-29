import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeUnresolvedRecordComparator } from './lib/unresolved-ranking.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = path.join(projectRoot, 'public', 'data', 'historical-features.geojson')
const curatedParksPath = path.join(projectRoot, 'public', 'data', 'curated-parks.geojson')
const sourcesPath = path.join(projectRoot, 'public', 'data', 'sources.json')
const landmarkCurrentUseAuditPath = path.join(projectRoot, 'public', 'data', 'landmark-current-use-audit.json')
const unresolvedLandmarksDirectory = path.join(projectRoot, 'public', 'data', 'unresolved-landmarks')
const landmarkCurrentUseOverridesPath = path.join(projectRoot, 'scripts', 'data', 'landmark-current-use-overrides.json')
const buildingClusterAuditPath = path.join(projectRoot, 'public', 'data', 'virtual-shanghai-building-clusters.json')
const jurisdictionsPath = path.join(projectRoot, 'public', 'data', 'jurisdictions.geojson')
const metroPath = path.join(projectRoot, 'public', 'data', 'metro-lines.geojson')
const metroStationsPath = path.join(projectRoot, 'public', 'data', 'metro-stations.geojson')
const stylePath = path.join(projectRoot, 'public', 'style', 'no-label-style.json')

const historicalCollection = JSON.parse(await fs.readFile(dataPath, 'utf8'))
const curatedParks = JSON.parse(await fs.readFile(curatedParksPath, 'utf8'))
const sources = JSON.parse(await fs.readFile(sourcesPath, 'utf8'))
const landmarkCurrentUseAudit = JSON.parse(await fs.readFile(landmarkCurrentUseAuditPath, 'utf8'))
const unresolvedLandmarkFilenames = (await fs.readdir(unresolvedLandmarksDirectory))
  .filter((filename) => /^\d{3}\.json$/u.test(filename))
  .sort()
const unresolvedLandmarkChunks = await Promise.all(unresolvedLandmarkFilenames.map(
  (filename) => fs.readFile(path.join(unresolvedLandmarksDirectory, filename), 'utf8').then(JSON.parse),
))
const unresolvedRecords = unresolvedLandmarkChunks.flat()
const landmarkCurrentUseOverrides = JSON.parse(await fs.readFile(landmarkCurrentUseOverridesPath, 'utf8'))
const buildingClusterAudit = JSON.parse(await fs.readFile(buildingClusterAuditPath, 'utf8'))
const jurisdictions = JSON.parse(await fs.readFile(jurisdictionsPath, 'utf8'))
const collection = {
  type: 'FeatureCollection',
  features: [...historicalCollection.features, ...curatedParks.features],
}
const metro = JSON.parse(await fs.readFile(metroPath, 'utf8'))
const metroStations = JSON.parse(await fs.readFile(metroStationsPath, 'utf8'))
const style = JSON.parse(await fs.readFile(stylePath, 'utf8'))
const errors = []
const ids = new Set()
const sourceIds = new Set(sources.map((source) => source.id))

function featureHistoricalNames(feature) {
  return new Set([
    feature.properties?.historicalName,
    feature.properties?.modernNameZh,
    feature.properties?.historicalChinese,
    ...(feature.properties?.aliases ?? []),
    ...(feature.properties?.historicalRecords ?? []).flatMap((record) => [record.name, record.nameZh]),
  ].filter(Boolean))
}

function matchesFeatureGroup(feature, featureGroupId) {
  return [
    feature.properties?.featureGroupId,
    ...(feature.properties?.legacyFeatureGroupIds ?? []),
  ].includes(featureGroupId)
}

function polygonAreaHectares(ring) {
  const longitudeScale = Math.cos((31.224 * Math.PI) / 180)
  const toMetres = ([longitude, latitude]) => [longitude * 111_320 * longitudeScale, latitude * 111_320]
  let doubledArea = 0
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [startX, startY] = toMetres(ring[index])
    const [endX, endY] = toMetres(ring[index + 1])
    doubledArea += startX * endY - endX * startY
  }
  return Math.abs(doubledArea) / 2 / 10_000
}

for (const feature of collection.features ?? []) {
  const properties = feature.properties ?? {}
  for (const key of [
    'id',
    'featureGroupId',
    'kind',
    'historicalName',
    'modernNameZh',
    'jurisdiction',
    'language',
    'labelYear',
    'sourceIds',
    'category',
  ]) {
    if (properties[key] === undefined || properties[key] === '' || properties[key] === null) {
      errors.push(`${properties.id ?? 'unknown'} is missing ${key}`)
    }
  }
  if (!feature.geometry) errors.push(`${properties.id ?? 'unknown'} is missing geometry`)
  if (/[�?]/.test(properties.historicalName)) errors.push(`${properties.id} contains a damaged historical name`)
  if (properties.labelYear >= 1945 && !properties.sourceIds?.includes('vs-buildings')) {
    errors.push(`${properties.id} uses a post-1944 label year outside the complete Virtual Shanghai building catalogue`)
  }
  for (const sourceId of properties.sourceIds ?? []) {
    if (!sourceIds.has(sourceId)) errors.push(`${properties.id} references missing source ${sourceId}`)
  }
  if (properties.kind === 'landmark' && properties.sourceIds?.includes('vs-buildings')) {
    const detailUrl = properties.sourceUrls?.['vs-buildings']
    if (!/^https:\/\/www\.virtualshanghai\.net\/数据\/建筑\?ID=\d+$/u.test(detailUrl ?? '')) {
      errors.push(`${properties.id} is missing its record-specific Virtual Shanghai building URL`)
    }
  }
  if (properties.currentUseSourceId && !sourceIds.has(properties.currentUseSourceId)) {
    errors.push(`${properties.id} references missing current-use source ${properties.currentUseSourceId}`)
  }
  if (['sh-library-excellent-historical-buildings', 'wikipedia-shanghai-excellent-historical-buildings', 'verified-landmark-current-uses']
    .includes(properties.currentUseSourceId)) {
    for (const key of ['currentUse', 'currentNameZh', 'currentAddress', 'currentUseSourceUri', 'currentUseMatch']) {
      if (!properties[key]) errors.push(`${properties.id} has a verified current-use match without ${key}`)
    }
  }
  if (ids.has(properties.id)) errors.push(`Duplicate feature id: ${properties.id}`)
  ids.add(properties.id)
}

const resolvedOverrideGroups = new Set()
for (const override of landmarkCurrentUseOverrides) {
  const targets = collection.features.filter(
    (feature) => feature.properties?.kind === 'landmark' && matchesFeatureGroup(feature, override.featureGroupId),
  )
  if (targets.length !== 1) {
    errors.push(`Current-use override ${override.featureGroupId} resolves to ${targets.length} landmark groups`)
    continue
  }
  const target = targets[0]
  if (resolvedOverrideGroups.has(target.properties.featureGroupId)) {
    errors.push(`More than one current-use override resolves to ${target.properties.featureGroupId}`)
  }
  resolvedOverrideGroups.add(target.properties.featureGroupId)

  if (override.sourceRecordIds?.length && !override.sourceRecordIds.every(
    (sourceRecordId) => target.properties.sourceRecordIds?.includes(sourceRecordId),
  )) {
    errors.push(`Current-use override ${override.featureGroupId} failed its Virtual Shanghai ID guard`)
  }
  if (override.expectedHistoricalNames?.length) {
    const knownNames = featureHistoricalNames(target)
    const missingNames = override.expectedHistoricalNames.filter((name) => !knownNames.has(name))
    if (missingNames.length) {
      errors.push(`Current-use override ${override.featureGroupId} is missing guarded names: ${missingNames.join(', ')}`)
    }
  }
  for (const key of [
    'currentUse',
    'currentNameZh',
    'currentAddress',
    'currentUseSourceUri',
    'currentUseNote',
    'currentUseRelationship',
  ]) {
    if (override[key] !== undefined && target.properties?.[key] !== override[key]) {
      errors.push(`Current-use override ${override.featureGroupId} did not propagate ${key}`)
    }
  }
  const auditRecord = landmarkCurrentUseAudit.records?.find(
    (record) => record.featureGroupId === target.properties.featureGroupId,
  )
  if (auditRecord?.status !== 'matched-research') {
    errors.push(`Current-use override ${override.featureGroupId} is not recorded as matched-research`)
  }
}

if (buildingClusterAudit.summary?.sourceRecords !== 1803) {
  errors.push(`Virtual Shanghai building audit has ${buildingClusterAudit.summary?.sourceRecords ?? 0} records instead of 1803`)
}
if (buildingClusterAudit.summary?.mappedSourceRecords !== 1803 ||
  buildingClusterAudit.summary?.omittedClusters !== 0) {
  errors.push('Not every one of the 1803 Virtual Shanghai building records maps to a site cluster')
}
const buildingRecordOwners = new Map()
for (const feature of historicalCollection.features ?? []) {
  for (const sourceRecordId of feature.properties?.sourceRecordIds ?? []) {
    const owners = buildingRecordOwners.get(sourceRecordId) ?? []
    owners.push(feature.properties.featureGroupId)
    buildingRecordOwners.set(sourceRecordId, owners)
  }
}
if (buildingRecordOwners.size !== 1803) {
  errors.push(`Historical features expose ${buildingRecordOwners.size} unique Virtual Shanghai building IDs instead of 1803`)
}
for (const [sourceRecordId, owners] of buildingRecordOwners) {
  if (owners.length !== 1) {
    errors.push(`Virtual Shanghai building ${sourceRecordId} belongs to ${owners.length} map features`)
  }
}
if (Object.keys(buildingClusterAudit.recordToCluster ?? {}).length !== 1803) {
  errors.push('Building cluster audit does not retain an ID-to-cluster mapping for all 1803 source records')
}
const rihuiPortSite = historicalCollection.features.find((feature) =>
  [323, 324, 493].every((sourceRecordId) => feature.properties?.sourceRecordIds?.includes(sourceRecordId)))
if (!rihuiPortSite) {
  errors.push('Virtual Shanghai buildings 323, 324 and 493 must resolve to one site cluster')
} else {
  if (rihuiPortSite.properties.historicalName === 'Temple') {
    errors.push('The 597 Route de Zikawei cluster must not use the generic Temple label')
  }
  if (!/日晖港清真寺/u.test([
    rihuiPortSite.properties.modernNameZh,
    ...(rihuiPortSite.properties.historicalRecords ?? []).map((record) => record.nameZh),
  ].filter(Boolean).join(' '))) {
    errors.push('The 597 Route de Zikawei cluster is missing the researched 日晖港清真寺 name')
  }
  const mosqueRecord = rihuiPortSite.properties.historicalRecords?.find((record) =>
    /Rihui Port Mosque|日晖港清真寺/u.test(`${record.name} ${record.nameZh ?? ''}`))
  const cemeteryRecord = rihuiPortSite.properties.historicalRecords?.find((record) =>
    /Muslim Cemetery|日晖港清真公墓/u.test(`${record.name} ${record.nameZh ?? ''}`))
  if (mosqueRecord?.startYear !== 1892 || !mosqueRecord.sourceRecordIds?.includes(324)) {
    errors.push('The Rihui Port Mosque record must retain Virtual Shanghai #324 and its 1892 date')
  }
  if (cemeteryRecord?.startYear !== 1864 ||
    ![323, 493].every((sourceRecordId) => cemeteryRecord.sourceRecordIds?.includes(sourceRecordId))) {
    errors.push('The Muslim Cemetery record must retain Virtual Shanghai #323/#493 and its researched start year')
  }
  if (rihuiPortSite.properties.currentNameZh !== '上海市卢湾体育中心（卢湾体育场）') {
    errors.push('The Rihui Port site is missing its verified present-day Luwan Sports Center use')
  }
}
for (const feature of historicalCollection.features ?? []) {
  if (feature.properties?.kind !== 'landmark') continue
  if (/^(Temple|School|Bank|Hospital|Church)$/i.test(feature.properties.historicalName) &&
    feature.properties.labelOnMap !== false) {
    errors.push(`${feature.properties.id} exposes a generic building name as a map label`)
  }
}

const modernSymbolLayers = (style.layers ?? []).filter((layer) => layer.type === 'symbol')
if (modernSymbolLayers.length > 0) {
  errors.push(`Base style contains symbol layers: ${modernSymbolLayers.map((layer) => layer.id).join(', ')}`)
}

const hasVallon = collection.features.some(
  (feature) => feature.properties.historicalName === 'Route Vallon' && feature.properties.modernNameZh === '南昌路',
)
const hasDolfus = collection.features.some(
  (feature) => feature.properties.historicalName === 'Route Dolfus' && feature.properties.modernNameZh === '南昌路',
)
const hasFrenchPark = collection.features.some(
  (feature) =>
    feature.properties.historicalName === 'Parc français' &&
    feature.properties.modernNameZh === '复兴公园' &&
    feature.properties.jurisdiction === 'french-concession' &&
    feature.properties.language === 'fr',
)
const hasRavinelPark = collection.features.some(
  (feature) =>
    feature.properties.historicalName === 'Parc Ravinel' &&
    feature.properties.modernNameZh === '襄阳公园' &&
    feature.properties.historicalUse === 'park',
)
const hasGastonKahn = collection.features.some(
  (feature) =>
    feature.properties.historicalName === 'Route Gaston Kahn' && feature.properties.modernNameZh === '嘉善路',
)
if (!hasVallon) errors.push('Route Vallon acceptance feature is missing')
if (!hasDolfus) errors.push('Route Dolfus acceptance feature is missing')
if (!hasFrenchPark) errors.push('Parc français must map to 复兴公园 as a French label')
if (!hasRavinelPark) errors.push('Parc Ravinel must map to 襄阳公园')
if (!hasGastonKahn) errors.push('Route Gaston Kahn must map to 嘉善路')
if (!collection.features.some(
  (feature) => feature.properties?.historicalName === 'Consulate General of France' &&
    feature.properties?.sourceUrls?.['vs-buildings'] === 'https://www.virtualshanghai.net/数据/建筑?ID=6',
)) {
  errors.push('The French Consulate must link to Virtual Shanghai building record 6')
}

const currentUseAcceptanceCases = [
  ['Chinese Red Cross Hospital No. 1', '复旦大学附属华山医院', '医疗 / 教学医院'],
  ['Franco-Chinese Technical Institute (Institut Technique Franco-Chinois)', '上海理工大学复兴路校区', '高等教育'],
  ['Facang Jiangsi Temple', '法藏讲寺', '宗教场所 / 佛教寺院'],
  ['Baiyunguan Temple', '上海白云观', '宗教场所 / 道观'],
  ['Hongkong & Shanghai Banking Corporation', '上海浦东发展银行总部', '金融办公'],
  ['Aurora University (Université Aurore)', '上海第二医科大学', '教育'],
  ['Saint Mary Hospital (Hôpital Sainte Marie)', '瑞金医院8号楼', '医疗 / 康养'],
  ['Yufosi Temple (Jade Buddha)', '玉佛寺', '宗教场所'],
  ['St. Joseph Church', '洋泾浜圣若瑟堂', '宗教场所'],
  ['Great Northern Cable Office', '盘谷银行上海分行', '金融办公'],
  ['Yokohama Specie Bank', '中国工商银行上海分行营业部', '金融办公'],
  ['All Saints Church', '诸圣堂', '宗教场所'],
]
for (const [historicalName, currentNameZh, currentUse] of currentUseAcceptanceCases) {
  if (!collection.features.some(
    (feature) => featureHistoricalNames(feature).has(historicalName) &&
      feature.properties?.currentNameZh === currentNameZh &&
      feature.properties?.currentUse === currentUse,
  )) {
    errors.push(`${historicalName} is missing its verified current use ${currentNameZh} / ${currentUse}`)
  }
}
const currentUseGroupAcceptanceCases = [
  ['landmark-vs-site-301', '淡井庙遗址（上海瑞金洲际酒店内）', '酒店园区 / 历史遗迹'],
  ['landmark-vs-site-1000', '上海市儿童医院（上海交通大学医学院附属儿童医院）', '原址用途待核 / 儿童医院机构延续'],
  ['landmark-vs-site-504', '中华基督教女青年会全国协会大楼（旧址）', '历史建筑 / 机构办公及综合使用'],
  ['landmark-vs-site-1003', '梅龙镇广场（更新中）', '商业综合体 / 城市更新地块'],
  ['landmark-vs-site-1004', '梅龙镇广场（更新中）', '商业综合体 / 城市更新地块'],
  ['landmark-vs-site-1031', '上海市教师教育学院（上海市教委教学研究室）院区', '教育教研办公 / 历史院区'],
  ['landmark-vs-site-1036', '太平花园', '住宅 / 历史建筑群'],
  ['landmark-vs-site-1022', '金鹰国际购物中心（西摩路小菜场旧址）', '商业综合体'],
  ['landmark-dingxiang-huayuan-dingxiang-huayuan', '丁香花园', '老干部活动 / 餐饮 / 历史花园建筑'],
  ['landmark-vs-site-446', '枕流公寓', '住宅 / 上海市优秀历史建筑'],
]
for (const [featureGroupId, currentNameZh, currentUse] of currentUseGroupAcceptanceCases) {
  const feature = collection.features.find((candidate) => candidate.properties?.featureGroupId === featureGroupId)
  if (feature?.properties?.currentNameZh !== currentNameZh || feature?.properties?.currentUse !== currentUse) {
    errors.push(`${featureGroupId} is missing its verified current use ${currentNameZh} / ${currentUse}`)
  }
}
const dingxiangGarden = collection.features.find(
  (feature) => feature.properties?.featureGroupId === 'landmark-dingxiang-huayuan-dingxiang-huayuan',
)
if (dingxiangGarden?.properties?.modernNameZh !== '丁香花园' ||
  !dingxiangGarden?.properties?.sourceParkRecordIds?.includes(120) ||
  dingxiangGarden?.properties?.category !== '花园住宅 / 历史建筑') {
  errors.push('Dingxiang Huayuan must resolve to 丁香花园 and retain Virtual Shanghai park record 120')
}
const brooksideApartments = collection.features.find(
  (feature) => feature.properties?.featureGroupId === 'landmark-vs-site-446',
)
if (brooksideApartments?.properties?.modernNameZh !== '枕流公寓' ||
  brooksideApartments?.properties?.sourceUrls?.['vs-buildings'] !==
    'https://www.virtualshanghai.net/数据/建筑?ID=446') {
  errors.push('Brookside Apartments must resolve to 枕流公寓 and link to Virtual Shanghai building 446')
}
if (collection.features.some(
  (feature) => feature.properties?.historicalName === 'Temple' &&
    feature.properties?.modernNameZh === '寺廟' &&
    feature.properties?.currentUse,
)) {
  errors.push('Generic Temple / 寺廟 received an unsupported current-use match')
}
for (const feature of curatedParks.features ?? []) {
  if (!feature.properties?.currentUse) {
    errors.push(`${feature.properties?.id ?? 'unknown park'} is missing its documented present use`)
  }
}
if (!sourceIds.has('sh-library-excellent-historical-buildings')) {
  errors.push('Shanghai Library current-use source record is missing')
}
if (!sourceIds.has('wikipedia-shanghai-excellent-historical-buildings')) {
  errors.push('Wikipedia protected-building current-use source record is missing')
}
if (landmarkCurrentUseAudit.rules?.locationOnlyMatchesAccepted !== false) {
  errors.push('Landmark current-use audit allows unsupported location-only matches')
}
if (landmarkCurrentUseAudit.rules?.partialNameMatchesAccepted !== false) {
  errors.push('Landmark current-use audit allows unsupported partial-name matches')
}
if (landmarkCurrentUseAudit.rules?.duplicateSourceMatchesAccepted !== false) {
  errors.push('Landmark current-use audit allows one library record to be assigned to multiple landmarks')
}
const acceptedLibraryRecords = landmarkCurrentUseAudit.records?.filter((record) => record.status === 'matched') ?? []
if (acceptedLibraryRecords.some((record) => record.accepted?.evidence === 'partial-current-or-alternate-name')) {
  errors.push('Landmark current-use audit accepted a partial-name Shanghai Library match')
}
const acceptedLibraryUriOwners = new Map()
for (const record of acceptedLibraryRecords) {
  const uri = record.accepted?.sourceUri
  if (!uri) continue
  const owners = acceptedLibraryUriOwners.get(uri) ?? []
  owners.push(record.featureGroupId)
  acceptedLibraryUriOwners.set(uri, owners)
}
for (const [uri, owners] of acceptedLibraryUriOwners) {
  if (owners.length > 1) {
    errors.push(`Shanghai Library record ${uri} was accepted for ${owners.length} landmark groups`)
  }
}
const auditedStatusTotal = Object.entries(landmarkCurrentUseAudit.summary ?? {})
  .filter(([key]) => key !== 'landmarkGroups')
  .reduce((total, [, count]) => total + (Number(count) || 0), 0)
if (auditedStatusTotal !== landmarkCurrentUseAudit.summary?.landmarkGroups ||
  landmarkCurrentUseAudit.records?.length !== landmarkCurrentUseAudit.summary?.landmarkGroups) {
  errors.push('Landmark current-use audit status totals do not equal the landmark-group count')
}
if ((landmarkCurrentUseAudit.summary?.matchedFromLibrary ?? 0) < 25) {
  errors.push('Landmark current-use audit has too few Shanghai Library matches')
}
if ((landmarkCurrentUseAudit.summary?.matchedFromWikipedia ?? 0) < 12) {
  errors.push('Landmark current-use audit has too few Wikipedia list matches')
}
if ((landmarkCurrentUseAudit.summary?.matchedFromCurrentPlaceName ?? 0) < 20) {
  errors.push('Landmark current-use audit has too few documented current-place uses')
}
if ((landmarkCurrentUseAudit.summary?.genericName ?? 0) < 1) {
  errors.push('Landmark current-use audit no longer records unresolved generic names')
}

const unresolvedAuditStatuses = new Set([
  'not-found',
  'generic-name',
  'needs-review-partial-name',
  'needs-review-duplicate-source',
])
const auditRecordsByGroup = new Map(
  (landmarkCurrentUseAudit.records ?? []).map((record) => [record.featureGroupId, record]),
)
const unresolvedExpectedRecordIds = new Set()
for (const feature of historicalCollection.features ?? []) {
  const properties = feature.properties ?? {}
  if (properties.kind !== 'landmark' || !properties.sourceIds?.includes('vs-buildings')) continue
  const auditRecord = auditRecordsByGroup.get(properties.featureGroupId)
  const institutionalOriginalSiteUnknown =
    properties.currentUseRelationship === 'institutional-successor-relocated' &&
    /待核|尚未找到|具体用途尚不明确/u.test(
      `${properties.currentUse ?? ''} ${properties.currentUseNote ?? ''}`,
    )
  if (unresolvedAuditStatuses.has(auditRecord?.status) || institutionalOriginalSiteUnknown) {
    for (const sourceRecordId of properties.sourceRecordIds ?? []) {
      unresolvedExpectedRecordIds.add(sourceRecordId)
    }
  }
}
const unresolvedActualRecordIds = new Set(unresolvedRecords.map((record) => record.IDBAT))
if (unresolvedExpectedRecordIds.size !== unresolvedActualRecordIds.size ||
  [...unresolvedExpectedRecordIds].some((sourceRecordId) => !unresolvedActualRecordIds.has(sourceRecordId))) {
  errors.push('Unresolved landmark export does not match the current-use audit and relocated-successor records')
}
if (unresolvedRecords.length !== unresolvedActualRecordIds.size) {
  errors.push('Unresolved landmark export count is wrong or contains duplicate building records')
}
if (!unresolvedLandmarkChunks.length) {
  errors.push('Unresolved landmark export folder contains no numbered JSON files')
}
for (const [index, chunk] of unresolvedLandmarkChunks.entries()) {
  const expectedFilename = `${String(index + 1).padStart(3, '0')}.json`
  if (unresolvedLandmarkFilenames[index] !== expectedFilename) {
    errors.push(`Unresolved landmark chunk ${unresolvedLandmarkFilenames[index]} should be ${expectedFilename}`)
  }
  if (!Array.isArray(chunk) || chunk.length < 1 || chunk.length > 50 ||
    (index < unresolvedLandmarkChunks.length - 1 && chunk.length !== 50)) {
    errors.push(`${expectedFilename} must contain 50 records, except for the final partial file`)
  }
}
const correctlyRankedUnresolvedRecords = [...unresolvedRecords]
  .sort(makeUnresolvedRecordComparator(unresolvedRecords))
if (correctlyRankedUnresolvedRecords.some(
  (record, index) => record.IDBAT !== unresolvedRecords[index]?.IDBAT,
)) {
  errors.push('Unresolved landmark chunks are not ordered from specific/verifiable names to general names')
}
const unresolvedRecordKeys = ['IDBAT', 'NAME', 'F_ADDRESS', 'FUNCTION', 'XC', 'YC']
for (const record of unresolvedRecords) {
  const keys = Object.keys(record)
  if (keys.length !== unresolvedRecordKeys.length ||
    unresolvedRecordKeys.some((key) => !Object.hasOwn(record, key))) {
    errors.push(`Unresolved Virtual Shanghai building ${record.IDBAT ?? 'unknown'} must contain only the six requested fields`)
  }
  if (!Number.isInteger(record.IDBAT) || !Number.isFinite(record.XC) || !Number.isFinite(record.YC)) {
    errors.push(`Unresolved Virtual Shanghai building ${record.IDBAT ?? 'unknown'} has invalid core fields`)
  }
}

const proposedLandmarks = collection.features.filter(
  (feature) => feature.properties?.kind === 'landmark' &&
    feature.properties?.namingBasis?.startsWith('proposed-'),
)
if (proposedLandmarks.length) {
  errors.push(`Found ${proposedLandmarks.length} proposed landmark features after proposal removal`)
}

for (const feature of curatedParks.features ?? []) {
  if (/[\u3400-\u9fff]/u.test(feature.properties?.historicalName ?? '')) {
    errors.push(`${feature.properties?.id ?? 'unknown park'} uses a non-Latin map label`)
  }
  if (feature.properties?.jurisdiction === 'french-concession') {
    if (feature.properties.language !== 'fr') {
      errors.push(`${feature.properties.id} is in the French Concession but is not marked as French`)
    }
    if (/\b(?:Park|Garden|Gardens|Playground|Road|Works)\b/i.test(feature.properties.historicalName)) {
      errors.push(`${feature.properties.id} uses an English map label inside the French Concession`)
    }
  }
}

for (const feature of historicalCollection.features ?? []) {
  const properties = feature.properties ?? {}
  if (properties.kind !== 'road' || properties.labelOnMap === false) continue
  if (/[\u3400-\u9fff]/u.test(properties.historicalName ?? '')) {
    errors.push(`${properties.id ?? 'unknown road'} uses a Han-script map label`)
  }
  if (properties.language === 'wuu') {
    if (!properties.historicalChinese) {
      errors.push(`${properties.id} has a Shanghainese map label without its historical Chinese name`)
    }
    if (!properties.sourceIds?.includes('rime-wugniu-lopha')) {
      errors.push(`${properties.id} has a Shanghainese map label without the Wugniu source`)
    }
  }
}

const oldCityBoundaries = jurisdictions.features.filter(
  (feature) => feature.properties?.jurisdiction === 'old-city',
)
for (const feature of jurisdictions.features ?? []) {
  const jurisdictionSourceId = feature.properties?.sourceId
  if (jurisdictionSourceId && !sourceIds.has(jurisdictionSourceId)) {
    errors.push(`${feature.properties?.id ?? 'unknown jurisdiction'} references missing source ${jurisdictionSourceId}`)
  }
}
if (oldCityBoundaries.length !== 1) {
  errors.push(`Expected one Old City boundary, found ${oldCityBoundaries.length}`)
} else {
  const oldCityBoundary = oldCityBoundaries[0]
  const ring = oldCityBoundary.geometry?.coordinates?.[0] ?? []
  const area = polygonAreaHectares(ring)
  if (oldCityBoundary.properties?.sourceId !== 'sh-civil-affairs-renmin-road') {
    errors.push('Old City boundary does not cite the Min Kuo Road–Chunghwa Road source')
  }
  if (area < 190 || area > 210) {
    errors.push(`Old City boundary area is ${area.toFixed(1)} ha; expected the approximately 200 ha walled city`)
  }
}
if (historicalCollection.features.filter((feature) => feature.properties?.jurisdiction === 'old-city').length < 1) {
  errors.push('No historical features are classified inside the Old City ring')
}
const curatedOldCityRoads = new Set(
  historicalCollection.features
    .filter((feature) => feature.properties?.kind === 'road' && feature.properties?.curatedOldCity)
    .map((feature) => feature.properties.featureGroupId),
)
if (curatedOldCityRoads.size < 35) {
  errors.push(`Only ${curatedOldCityRoads.size} curated Old City road groups are present`)
}
for (const requiredRoad of [
  ['人民路', 'Min Kueq Lu'],
  ['中华路', 'Tzon Wa Lu'],
  ['复兴东路', 'Dzo Ka Lu'],
  ['方浜中路', 'Faon Pan Lu'],
]) {
  const [modernNameZh, historicalName] = requiredRoad
  if (!historicalCollection.features.some(
    (feature) => feature.properties?.curatedOldCity &&
      feature.properties.modernNameZh === modernNameZh &&
      feature.properties.historicalName === historicalName,
  )) {
    errors.push(`${modernNameZh} is missing its Old City label ${historicalName}`)
  }
}

for (const [modernNameZh, historicalName] of [
  ['多伦路', 'Darroch Road'],
  ['山阴路', 'Scott Road'],
  ['东江湾路', 'Kiangwan Road'],
  ['利西路', 'Lucerne Road'],
  ['绥宁路', 'Monument Road'],
  ['东宝兴路', 'Paoshing Road'],
  ['云南北路', 'North Yunnan Road'],
  ['延安东路', 'Avenue Édouard VII / Edward VII Road'],
  ['盛泽路', 'Rue du Moulin'],
]) {
  const matchingFeatures = historicalCollection.features.filter(
    (feature) => feature.properties?.curatedVerifiedRoad &&
      feature.properties.modernNameZh === modernNameZh &&
      feature.properties.historicalName === historicalName,
  )
  if (!matchingFeatures.length) {
    errors.push(`${modernNameZh} is missing its verified road label ${historicalName}`)
  } else if (matchingFeatures.some((feature) => !feature.properties.id.startsWith('osm-verified-road-'))) {
    errors.push(`${historicalName} is not aligned to current OpenFreeMap road geometry`)
  }
}
if (historicalCollection.features.some(
  (feature) => feature.properties?.kind === 'road' &&
    /Avenue (?:Edouard|Edward|Édouard) VII/.test(feature.properties.historicalName ?? '') &&
    feature.properties.modernNameZh !== '延安东路',
)) {
  errors.push('Avenue Édouard VII still has an incorrect modern road mapping')
}
if (historicalCollection.features.some(
  (feature) => feature.properties?.kind === 'road' &&
    feature.properties.historicalName === 'Rue du Moulin' &&
    feature.properties.modernNameZh !== '盛泽路',
)) {
  errors.push('Rue du Moulin still has an incorrect modern road mapping')
}

for (const [modernNameZh, historicalName] of [
  ['中山东一路', 'Bund'],
  ['四川中路', 'Bridge Street'],
  ['江西中路', 'Church Street'],
  ['河南中路', 'Barrier Street'],
  ['山东中路', 'Temple Street'],
  ['山西南路', 'Louzar Road'],
  ['福建中路', 'Shackloo Road'],
  ['浙江中路', 'Soochow Road'],
  ['湖北路', 'Soochow Road'],
  ['广西北路', 'Sikh Road'],
  ['南苏州路', 'Bund on the Soochow Creek'],
  ['香港路', 'Gnaomen Road'],
  ['北京东路', 'Consulate Road'],
  ['宁波路', "Kirk's Avenue"],
  ['天津路', 'Fives Court Lane'],
  ['南京东路', 'Garden Lane / Park Lane / Maloo'],
  ['九江路', 'Rope Walk Road'],
  ['汉口路', 'Custom House Road'],
  ['福州路', 'Mission Road'],
  ['广东路', 'North Gate Street'],
]) {
  const matchingFeatures = historicalCollection.features.filter(
    (feature) => feature.properties?.curated1865Original &&
      feature.properties.modernNameZh === modernNameZh &&
      feature.properties.historicalName === historicalName &&
      feature.properties.sourceIds?.includes('wikipedia-1865-smc-road-list'),
  )
  if (!matchingFeatures.length) {
    errors.push(`${modernNameZh} is missing its documented pre-1865 name ${historicalName}`)
  }
}
for (const unchangedRoad of ['云南中路', '西藏中路', '厦门路', '牛庄路', '台湾路']) {
  if (historicalCollection.features.some(
    (feature) => feature.properties?.modernNameZh === unchangedRoad && feature.properties?.curated1865Original,
  )) {
    errors.push(`${unchangedRoad} was changed even though the reference has no original name`)
  }
}

const osmAlignedRoads = historicalCollection.features.filter(
  (feature) => feature.properties.kind === 'road' && feature.properties.id.startsWith('osm-'),
)
if (osmAlignedRoads.length < 1_000) {
  errors.push(`Only ${osmAlignedRoads.length} road features use OSM-aligned geometry`)
}
const nanchangRoads = historicalCollection.features.filter(
  (feature) => feature.properties.kind === 'road' && feature.properties.modernNameZh === '南昌路',
)
if (nanchangRoads.some((feature) => !feature.properties.id.startsWith('osm-'))) {
  errors.push('Nanchang Road historical segments are not aligned to OSM geometry')
}

const metroLines = new Set()
for (const feature of metro.features ?? []) {
  const { line, colour, osmRelationId, osmWayId } = feature.properties ?? {}
  if (!line || !/^#[0-9A-F]{6}$/i.test(colour ?? '') || !osmRelationId || !osmWayId) {
    errors.push(`Invalid metro segment: ${feature.id ?? 'unknown'}`)
  }
  if (feature.geometry?.type !== 'LineString' || feature.geometry.coordinates.length < 2) {
    errors.push(`Metro segment ${feature.id ?? 'unknown'} has invalid geometry`)
  }
  metroLines.add(String(line))
}
for (const requiredLine of ['1', '2', '3', '4', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '18']) {
  if (!metroLines.has(requiredLine)) errors.push(`Metro Line ${requiredLine} colour geometry is missing`)
}

for (const feature of metroStations.features ?? []) {
  if (!feature.properties?.name || feature.geometry?.type !== 'Point') {
    errors.push(`Invalid local metro station: ${feature.id ?? 'unknown'}`)
  }
}
if ((metroStations.features?.length ?? 0) < 250) errors.push('Local metro station coverage is incomplete')
if (!metroStations.features?.some((feature) => feature.properties?.name === '人民广场')) {
  errors.push('People’s Square metro acceptance station is missing')
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(
  `Validated ${historicalCollection.features.length} historical features, ${curatedParks.features.length} current-park correspondences, ${metro.features.length} coloured metro segments, ${metroStations.features.length} metro stations, and a label-free base style.`,
)
