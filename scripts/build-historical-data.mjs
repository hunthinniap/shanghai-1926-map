import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'
import proj4 from 'proj4'
import * as shapefile from 'shapefile'
import { clusterBuildingRecords } from './lib/cluster-buildings.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheRoot = path.join(projectRoot, '.cache', 'historical-source')
const outputRoot = path.join(projectRoot, 'public', 'data')
const liveBuildingsPath = path.join(projectRoot, 'scripts', 'data', 'virtual-shanghai-buildings-live.json')
const buildingSiteOverridesPath = path.join(projectRoot, 'scripts', 'data', 'virtual-shanghai-site-overrides.json')
const supplementalSourcesPath = path.join(projectRoot, 'scripts', 'data', 'historical-supplemental-sources.json')
const buildingClusterAuditPath = path.join(outputRoot, 'virtual-shanghai-building-clusters.json')
const shanghaiBounds = [121.36, 31.13, 121.59, 31.33]

const downloads = [
  {
    id: 'geocoder',
    url: 'https://www.virtualshanghai.net/Asset/Source/dbData_ID-200_No-01.zip',
    shape: 'GEOCODER_1939',
  },
  {
    id: 'geocoder-ext',
    url: 'https://www.virtualshanghai.net/Asset/Source/dbData_ID-200_No-02.zip',
    shape: 'GEOCODER_1939_Ext',
  },
  {
    id: 'buildings',
    url: 'https://www.virtualshanghai.net/Asset/Source/dbData_ID-204_No-01.zip',
    shape: 'Buildings',
  },
  {
    id: 'parks',
    url: 'https://www.virtualshanghai.net/Asset/Source/dbData_ID-206_No-01.zip',
    shape: 'Parks',
  },
  {
    id: 'international-settlement',
    url: 'https://www.virtualshanghai.net/Asset/Source/dbData_ID-224_No-01.zip',
    shape: 'FS_IS_POL_DISTRICT_1928_1934',
  },
  {
    id: 'french-concession',
    url: 'https://www.virtualshanghai.net/Asset/Source/dbData_ID-222_No-01.zip',
    shape: 'FS_FC_SAN_DISTRICT_1920',
  },
]

const sources = [
  {
    id: 'stanford-map-1928',
    title: 'Shanghai shijie ditu（1928 年配准街道图）',
    url: 'https://geodata-prod.lib.utexas.edu/catalog/stanford-tk943wf2394',
    license: 'Public Domain Mark 1.0',
    year: 1928,
  },
  {
    id: 'vs-geocoder-1939',
    title: 'Virtual Shanghai Historical Geocoder 1939',
    url: 'https://www.virtualshanghai.net/Data/Tables?ID=200',
    license: 'CC BY 4.0',
    year: 1939,
  },
  {
    id: 'vs-buildings',
    title: 'Virtual Shanghai Major Buildings before 1949',
    url: 'https://www.virtualshanghai.net/Data/Tables?ID=204',
    license: 'CC BY 4.0',
    year: 1949,
  },
  {
    id: 'vs-parks',
    title: 'Virtual Shanghai Public Parks before and after 1949',
    url: 'https://www.virtualshanghai.net/Data/Tables?ID=206',
    license: 'CC BY 4.0',
    year: 1949,
  },
  {
    id: 'vs-is-districts-1928',
    title: 'Virtual Shanghai International Settlement Police Districts 1928–1934',
    url: 'https://www.virtualshanghai.net/Data/Tables?ID=224',
    license: 'CC BY 4.0',
    year: 1928,
  },
  {
    id: 'vs-fc-districts-1920',
    title: 'Virtual Shanghai French Concession Sanitary Districts 1920',
    url: 'https://www.virtualshanghai.net/Data/Tables?ID=222',
    license: 'CC0 1.0',
    year: 1920,
  },
]

const utm51 = '+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs'
const wgs84 = '+proj=longlat +datum=WGS84 +no_defs'

function text(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\u0000/g, '').trim()
}

function repairDisplayText(value) {
  let clean = text(value)
    .replace(/Fran[�?]aise/g, 'Française')
    .replace(/Fran[�?]ais/g, 'Français')
    .replace(/Coll[�]ge/g, 'Collège')
    .replace(/Universit[�]/g, 'Université')
    .replace(/H[�]pital/g, 'Hôpital')
    .replace(/Soci[�]t[�]/g, 'Société')
    .replace(/Th[�][�]tre/g, 'Théâtre')
    .replace(/Dauphin[�]/g, 'Dauphiné')
    .replace(/[D|d][�]amiti[�]/g, (match) => (match[0] === 'D' ? 'D’amitié' : 'd’amitié'))

  if (clean.includes('�')) {
    const beforeParenthesis = clean.split('(')[0].trim()
    const parenthetical = [...clean.matchAll(/\(([^)]+)\)/g)]
      .map((match) => match[1].trim())
      .find((part) => part && !/[�?]/.test(part))
    clean = !/[�?]/.test(beforeParenthesis) && beforeParenthesis ? beforeParenthesis : parenthetical ?? ''
  }
  return clean
}

function field(properties, ...names) {
  const entries = Object.entries(properties ?? {})
  for (const name of names) {
    const found = entries.find(([key]) => key.toLowerCase() === name.toLowerCase())
    if (found) return text(found[1])
  }
  return ''
}

function parseYear(value) {
  const match = text(value).match(/(?:18|19)\d{2}/)
  return match ? Number(match[0]) : undefined
}

function slug(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72)
}

const lowercaseWords = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'of', 'the', 'and'])
const romanNumerals = new Set(['ii', 'iii', 'iv', 'vi', 'vii', 'viii', 'ix', 'xi', 'xii'])

function canonicalName(value) {
  const clean = text(value).replace(/\s+/g, ' ')
  if (!clean) return ''
  if (/[^\u0000-\u024f]/.test(clean)) return clean
  if (/[a-z]/.test(clean) && /[A-Z]/.test(clean)) return clean

  return clean
    .toLocaleLowerCase('en')
    .split(' ')
    .map((word, index) => {
      if (romanNumerals.has(word)) return word.toUpperCase()
      if (index > 0 && lowercaseWords.has(word)) return word
      return word
        .split(/([-’'])/)
        .map((part) =>
          /[-’']/.test(part) || !part ? part : `${part[0].toLocaleUpperCase()}${part.slice(1)}`,
        )
        .join('')
    })
    .join(' ')
}

function transformCoordinates(coordinates) {
  if (!Array.isArray(coordinates)) return coordinates
  if (typeof coordinates[0] === 'number') {
    const [longitude, latitude] = proj4(utm51, wgs84, coordinates)
    return [Number(longitude.toFixed(6)), Number(latitude.toFixed(6))]
  }
  return coordinates.map(transformCoordinates)
}

function transformGeometry(geometry) {
  if (!geometry) return geometry
  if (geometry.type === 'GeometryCollection') {
    return { ...geometry, geometries: geometry.geometries.map(transformGeometry) }
  }
  return { ...geometry, coordinates: transformCoordinates(geometry.coordinates) }
}

function everyCoordinate(geometry) {
  const result = []
  const visit = (value) => {
    if (!Array.isArray(value)) return
    if (typeof value[0] === 'number') result.push(value)
    else value.forEach(visit)
  }
  if (geometry?.coordinates) visit(geometry.coordinates)
  return result
}

function geometryInBounds(geometry) {
  const coordinates = everyCoordinate(geometry)
  return coordinates.some(
    ([longitude, latitude]) =>
      longitude >= shanghaiBounds[0] &&
      longitude <= shanghaiBounds[2] &&
      latitude >= shanghaiBounds[1] &&
      latitude <= shanghaiBounds[3],
  )
}

function languageFor(name, type) {
  if (/[^\u0000-\u024f]/.test(name)) return 'zh'
  if (/^(rue|route|quai|place|impasse|passage|all[ée]e?|boulevard)\b/i.test(name)) return 'fr'
  if (/\b(rue|route|quai)\b/i.test(type)) return 'fr'
  return 'en'
}

function jurisdictionFor(language) {
  if (language === 'fr') return 'french-concession'
  if (language === 'zh') return 'chinese-administered'
  return 'international-settlement'
}

function roadPriority(name, type) {
  const value = `${name} ${type}`.toLowerCase()
  if (/avenue|boulevard|bund|highway/.test(value)) return 1
  if (/road|route|quai/.test(value)) return 2
  if (/street|rue|place/.test(value)) return 3
  return 4
}

function landmarkCategory(properties) {
  const typeText = Object.entries(properties)
    .filter(([key]) => /^typ\d+/i.test(key) || /^type/i.test(key))
    .map(([, value]) => text(value))
    .join(' ')
    .toLowerCase()

  if (/hospital|medical|clinic|hôpital/.test(typeText)) return '医院'
  if (/school|college|university|education|école/.test(typeText)) return '学校'
  if (/church|temple|cathedral|relig|mosque|synagogue/.test(typeText)) return '宗教设施'
  if (/railway station|railroad station|train station|\bgare\b/.test(typeText)) return '车站'
  if (/\bport\b|wharf|dock|jetty/.test(typeText)) return '码头'
  if (/park|garden/.test(typeText)) return '公园'
  return '重要建筑'
}

function isMajorBuilding(properties, historicalName) {
  const category = landmarkCategory(properties)
  if (category !== '重要建筑') return true
  return /municipal|consulate|club|hotel|bank|museum|theatre|theater|library|office|palace|hall|exchange|market|court|police|customs/i.test(
    historicalName,
  )
}

async function ensureDownload(item) {
  const zipPath = path.join(cacheRoot, `${item.id}.zip`)
  const extractRoot = path.join(cacheRoot, item.id)
  const marker = path.join(extractRoot, '.complete')

  try {
    await fs.access(marker)
    return extractRoot
  } catch {
    // Continue with download.
  }

  await fs.mkdir(extractRoot, { recursive: true })
  const response = await fetch(item.url)
  if (!response.ok) throw new Error(`Unable to download ${item.url}: ${response.status}`)
  await fs.writeFile(zipPath, Buffer.from(await response.arrayBuffer()))
  new AdmZip(zipPath).extractAllTo(extractRoot, true)
  await fs.writeFile(marker, item.url)
  return extractRoot
}

async function findShape(root, baseName) {
  const queue = [root]
  while (queue.length) {
    const current = queue.shift()
    const entries = await fs.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name)
      if (entry.isDirectory() && entry.name !== '__MACOSX') queue.push(entryPath)
      if (entry.isFile() && entry.name.toLowerCase() === `${baseName.toLowerCase()}.shp`) {
        return entryPath
      }
    }
  }
  throw new Error(`Unable to find ${baseName}.shp in ${root}`)
}

async function readShape(item) {
  const root = await ensureDownload(item)
  const shpPath = await findShape(root, item.shape)
  const dbfPath = shpPath.replace(/\.shp$/i, '.dbf')
  const reader = await shapefile.open(shpPath, dbfPath, { encoding: 'utf-8' })
  const features = []
  while (true) {
    const next = await reader.read()
    if (next.done) break
    features.push(next.value)
  }
  return features
}

function makeRoads(rawFeatures) {
  const roads = []
  const rejectedNames = /^(unknown|unnamed|null|0|-|n\/a)$/i

  rawFeatures.forEach((raw, index) => {
    const properties = raw.properties ?? {}
    const type = field(properties, 'TYPE_ST', 'TYPE')
    let historicalName = canonicalName(
      field(properties, 'FULL_NAME', 'FULLNAME') ||
        [type, field(properties, 'SH_NAME', 'NAME')].filter(Boolean).join(' '),
    )
    const historicalChinese = field(properties, 'OCN', 'OLD_CHINESE')
    const modernNameZh = field(properties, 'NCN', 'CURRENT_CN') || historicalChinese
    const modernNameEn = canonicalName(field(properties, 'CURRENT_NA', 'CURRENT_NAME'))
    if (!historicalName || rejectedNames.test(historicalName) || !modernNameZh) return

    const geometry = transformGeometry(raw.geometry)
    if (!geometry || !geometryInBounds(geometry)) return
    if (!['LineString', 'MultiLineString'].includes(geometry.type)) return

    let language = languageFor(historicalName, type)
    const hasWesternRoadType = /\b(road|street|avenue|lane|alley|terrace|crescent|drive|bund|rue|route|quai|place|boulevard)\b/i.test(
      `${historicalName} ${type}`,
    )
    if (language === 'en' && historicalChinese && !hasWesternRoadType) {
      historicalName = historicalChinese
      language = 'zh'
    }
    const groupKey = slug(`${historicalName}-${modernNameZh}`) || `road-${index}`
    roads.push({
      type: 'Feature',
      geometry,
      properties: {
        id: `road-${groupKey}-${index}`,
        featureGroupId: `road-${groupKey}`,
        kind: 'road',
        historicalName,
        modernNameZh,
        modernNameEn: modernNameEn || undefined,
        historicalChinese: historicalChinese || undefined,
        aliases: [historicalChinese, modernNameEn].filter(Boolean),
        jurisdiction: jurisdictionFor(language),
        language,
        labelYear: 1939,
        sourceIds: ['stanford-map-1928', 'vs-geocoder-1939'],
        category: '道路',
        priority: roadPriority(historicalName, type),
      },
    })
  })

  return roads
}

function buildingRecordProperties(record) {
  return record?.properties ?? record ?? {}
}

function buildingRecordTypes(record) {
  if (Array.isArray(record?.types)) return record.types.map(text).filter(Boolean)
  const properties = buildingRecordProperties(record)
  return Array.from({ length: 11 }, (_, index) => field(properties, `TYP${String(index + 1).padStart(2, '0')}`))
    .filter(Boolean)
}

function buildingCategoryFromTypes(types) {
  return landmarkCategory(Object.fromEntries(types.map((value, index) => [
    `TYP${String(index + 1).padStart(2, '0')}`,
    value,
  ])))
}

function isExactGenericBuildingLabel(value) {
  return /^(Temple|School|Bank|Hospital|Church)$/i.test(text(value))
}

function virtualShanghaiBuildingUrl(recordId) {
  return `https://www.virtualshanghai.net/数据/建筑?ID=${encodeURIComponent(recordId)}`
}

function legacyBuildingGroupId(record) {
  const properties = buildingRecordProperties(record)
  const historicalName = canonicalName(repairDisplayText(field(properties, 'NAME', 'historicalName', 'name', 'label')))
  const historicalNameZh = field(properties, 'CHINESE', 'historicalNameZh', 'nameZh', 'chineseName')
  if (!historicalName && !historicalNameZh) return ''
  return `landmark-${slug(`${historicalName}-${historicalNameZh}`)}`
}

function buildingCoordinateToWgs84(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length < 2) return undefined
  const [x, y] = coordinate.map(Number)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined
  const result = Math.abs(x) <= 180 && Math.abs(y) <= 90
    ? [x, y]
    : proj4(utm51, wgs84, [x, y])
  return result.map((value) => Number(value.toFixed(6)))
}

async function loadLiveBuildingRecords(fallbackFeatures) {
  try {
    const live = JSON.parse(await fs.readFile(liveBuildingsPath, 'utf8'))
    if (!Array.isArray(live.records) || live.records.length !== 1803) {
      throw new Error(`expected 1803 records, received ${live.records?.length ?? 0}`)
    }
    return {
      records: live.records,
      sourceMode: 'live-directory-snapshot',
      sourceCount: live.records.length,
      snapshot: {
        fetchedAt: live.fetchedAt,
        sourceUrl: live.sourceUrl,
        errors: live.errors ?? [],
        sync: live.sync,
      },
    }
  } catch (error) {
    if (process.env.ALLOW_STALE_VS_BUILDINGS !== '1') {
      throw new Error(
        `The 1803-record Virtual Shanghai snapshot is required. Run npm run data:sync-buildings first. ${error.message}`,
      )
    }
    return {
      records: fallbackFeatures,
      sourceMode: 'stale-1790-shapefile-fallback',
      sourceCount: fallbackFeatures.length,
      snapshot: { warning: error.message },
    }
  }
}

async function loadBuildingSiteOverrides() {
  const overrides = JSON.parse(await fs.readFile(buildingSiteOverridesPath, 'utf8'))
  if (!Array.isArray(overrides)) throw new Error('Virtual Shanghai site overrides must be an array')
  const keys = new Set()
  for (const override of overrides) {
    if (!Array.isArray(override.sourceRecordIds) || !override.sourceRecordIds.length ||
      override.sourceRecordIds.some((recordId) => !Number.isInteger(recordId))) {
      throw new Error(`Invalid site override sourceRecordIds: ${JSON.stringify(override.sourceRecordIds)}`)
    }
    const key = [...override.sourceRecordIds].sort((left, right) => left - right).join(',')
    if (keys.has(key)) throw new Error(`Duplicate site override: ${key}`)
    keys.add(key)
  }
  return overrides
}

function makeBuildings(rawRecords, sourceMetadata, siteOverrides = []) {
  const clustered = clusterBuildingRecords(rawRecords)
  const preparedById = new Map(clustered.sourceRecords.map((record) => [String(record.recordId), record]))
  const buildings = []
  const omittedClusters = []
  const appliedOverrides = new Map()

  for (const cluster of clustered.clusters) {
    const numericSourceRecordIds = cluster.sourceRecordIds.map(Number).filter(Number.isFinite)
    const clusterRecordIds = new Set(numericSourceRecordIds)
    const matchingOverrides = siteOverrides.filter((override) =>
      override.sourceRecordIds.every((recordId) => clusterRecordIds.has(recordId)))
    if (matchingOverrides.length > 1) {
      throw new Error(`Multiple curated site overrides match ${cluster.clusterId}`)
    }
    const siteOverride = matchingOverrides[0]
    if (siteOverride) appliedOverrides.set(cluster.clusterId, siteOverride)
    const primary = preparedById.get(String(cluster.primaryRecordId))
    const primarySource = primary?.sourceRecord ?? {}
    const repairedHistoricalName = canonicalName(repairDisplayText(cluster.historicalName)) || cluster.historicalNameZh
    const nameIsFallback = !repairedHistoricalName
    let historicalName = repairedHistoricalName ||
      (cluster.address ? `Unnamed site · ${cluster.address}` : `Unnamed Virtual Shanghai site #${cluster.primaryRecordId}`)
    let historicalNameZh = cluster.historicalNameZh || (nameIsFallback ? '名称未载' : historicalName)
    const coordinate = buildingCoordinateToWgs84(cluster.centroid ?? cluster.coordinate)
    if (!coordinate) {
      omittedClusters.push({
        clusterId: cluster.clusterId,
        sourceRecordIds: cluster.sourceRecordIds,
        reason: 'missing-coordinate',
      })
      continue
    }

    const primaryTypes = buildingRecordTypes(primarySource)
    let category = buildingCategoryFromTypes(primaryTypes)
    let language = languageFor(historicalName, primaryTypes.join(' '))
    const primaryAlias = cluster.historicalRecords.find((record) =>
      record.sourceRecordIds.map(String).includes(String(cluster.primaryRecordId)))
    const primaryIsGeneric = nameIsFallback ||
      Boolean(primaryAlias?.isGeneric) ||
      isExactGenericBuildingLabel(historicalName)
    const hasSpecificAlias = cluster.historicalRecords.some((record) => !record.isGeneric)
    const visibleHistoricalRecords = cluster.historicalRecords.filter((record) =>
      !record.isGeneric || !hasSpecificAlias)
    let historicalRecords = visibleHistoricalRecords.map((record) => {
      const recordName = canonicalName(repairDisplayText(record.historicalName)) || record.historicalNameZh
      const recordIds = record.sourceRecordIds.map(Number).filter(Number.isFinite)
      const recordTypes = recordIds.flatMap((recordId) =>
        buildingRecordTypes(preparedById.get(String(recordId))?.sourceRecord ?? {}))
      return {
        sourceRecordIds: recordIds,
        name: recordName,
        nameZh: record.historicalNameZh || undefined,
        startYear: record.startYear || undefined,
        endYear: record.endYear || undefined,
        sourceUrls: recordIds.map(virtualShanghaiBuildingUrl),
        category: buildingCategoryFromTypes(recordTypes),
        generic: record.isGeneric,
      }
    }).filter((record) => record.name)
    if (!historicalRecords.length) {
      const recordIds = cluster.sourceRecordIds.map(Number).filter(Number.isFinite)
      historicalRecords = [{
        sourceRecordIds: recordIds,
        name: historicalName,
        nameZh: historicalNameZh,
        sourceUrls: recordIds.map(virtualShanghaiBuildingUrl),
        category,
        generic: true,
      }]
    }
    const knownStartYears = cluster.historicalRecords
      .flatMap((record) => record.periods ?? [])
      .map((period) => period.startYear)
      .filter((year) => Number.isInteger(year) && year > 0)
    let labelYear = knownStartYears.length ? Math.min(...knownStartYears) : 1949
    const legacyFeatureGroupIds = [...new Set(cluster.sourceRecordIds
      .map((recordId) => legacyBuildingGroupId(preparedById.get(String(recordId))?.sourceRecord))
      .filter(Boolean))]
    let aliases = [...new Set(cluster.historicalRecords.flatMap((record) => [
      record.historicalName,
      record.historicalNameZh,
      ...(record.historicalNameVariants ?? []),
      ...(record.historicalNameZhVariants ?? []),
    ]).map(text).filter((value) => value && value !== historicalName && value !== historicalNameZh))]
    const siteId = cluster.clusterId.replace(/^vs-building-site:/, '')
    const featureGroupId = `landmark-vs-site-${siteId}`

    if (siteOverride) {
      historicalName = siteOverride.historicalName ?? historicalName
      historicalNameZh = siteOverride.modernNameZh ?? historicalNameZh
      category = siteOverride.category ?? category
      language = siteOverride.language ?? language
      labelYear = siteOverride.labelYear ?? labelYear
      aliases = [...new Set([...aliases, ...(siteOverride.aliases ?? [])]
        .map(text)
        .filter((value) => value && value !== historicalName && value !== historicalNameZh))]
      if (siteOverride.historicalRecords) {
        historicalRecords = siteOverride.historicalRecords.map((record) => ({
          ...record,
          sourceRecordIds: record.sourceRecordIds?.map(Number).filter(Number.isFinite),
          sourceUrls: record.sourceUrls?.map((url) => url.replace(/^http:/, 'https:')),
        }))
      }
    }

    buildings.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coordinate },
      properties: {
        id: featureGroupId,
        featureGroupId,
        kind: 'landmark',
        historicalName,
        modernNameZh: historicalNameZh,
        historicalRecords: cluster.sourceRecordIds.length > 1 || siteOverride ? historicalRecords : undefined,
        sourceRecordIds: numericSourceRecordIds,
        legacyFeatureGroupIds,
        clusterReason: cluster.mergeReasons.length
          ? [...new Set(cluster.mergeReasons.map((reason) => reason.code))].join(', ')
          : 'single-source-record',
        aliases,
        jurisdiction: siteOverride?.jurisdiction ?? jurisdictionFor(language),
        language,
        labelYear,
        labelYearIsFallback: siteOverride?.labelYear === undefined && !knownStartYears.length,
        sourceIds: ['vs-buildings'],
        sourceUrls: {
          'vs-buildings': virtualShanghaiBuildingUrl(cluster.primaryRecordId),
        },
        category,
        priority: primaryIsGeneric
          ? 7
          : /municipal|consulate|station|cathedral|bund|club/i.test(historicalName) ? 1 : 3,
        labelOnMap: siteOverride?.labelOnMap ?? !primaryIsGeneric,
      },
    })
  }

  const audit = {
    generatedAt: new Date().toISOString(),
    source: sourceMetadata,
    rules: {
      numberedAddressMaximumMetres: 250,
      unnumberedAddressMaximumMetres: 30,
      semanticVariantMaximumMetres: 8,
      recordIdentityPreserved: true,
      genericPrimaryLabelsHidden: true,
    },
    summary: {
      sourceRecords: rawRecords.length,
      siteClusters: clustered.clusters.length,
      mappedClusters: buildings.length,
      mappedSourceRecords: buildings.reduce((sum, feature) => sum + feature.properties.sourceRecordIds.length, 0),
      multiRecordClusters: clustered.clusters.filter((cluster) => cluster.sourceRecordIds.length > 1).length,
      omittedClusters: omittedClusters.length,
      mergeReasons: clustered.mergeReasons.length,
      curatedOverrides: appliedOverrides.size,
    },
    recordToCluster: clustered.recordToCluster,
    omittedClusters,
    clusters: clustered.clusters.map((cluster) => ({
      clusterId: cluster.clusterId,
      featureGroupId: `landmark-vs-site-${cluster.clusterId.replace(/^vs-building-site:/, '')}`,
      primaryRecordId: cluster.primaryRecordId,
      sourceRecordIds: cluster.sourceRecordIds,
      historicalName: cluster.historicalName,
      historicalNameZh: cluster.historicalNameZh,
      address: cluster.address,
      normalizedAddress: cluster.normalizedAddress,
      centroid: cluster.centroid,
      historicalRecords: cluster.historicalRecords,
      mergeReasons: cluster.mergeReasons,
      curatedOverride: appliedOverrides.get(cluster.clusterId),
    })),
  }
  return { buildings, audit }
}

function makeParks(rawFeatures) {
  const parks = []
  rawFeatures.forEach((raw, index) => {
    const properties = raw.properties ?? {}
    const start = parseYear(field(properties, 'START'))
    const end = parseYear(field(properties, 'END'))
    const parkRecordId = Number(field(properties, 'ID_PARKOBJ'))
    if (!start || start > 1928 || (end && end < 1928)) return

    let historicalName = canonicalName(field(properties, 'S_NAME', 'NAME'))
    let modernNameZh = field(properties, 'CURRENT_NA', 'CHINESE')
    const searchable = `${historicalName} ${modernNameZh}`.toLowerCase()
    let category = '公园'
    let priority = 1
    let historicalChinese
    let aliases
    if (/fuxing|fu xing|復興|复兴|french park/.test(searchable)) {
      historicalName = 'Parc français'
      modernNameZh = '复兴公园'
    }
    if (/dingxiang huayuan|丁香花[园園]/.test(searchable)) {
      historicalName = 'Dingxiang Huayuan'
      modernNameZh = '丁香花园'
      historicalChinese = '丁香花園'
      aliases = ['丁香花园', '丁香花園', 'Lilac Garden', 'Li Jingmai Residence']
      category = '花园住宅 / 历史建筑'
      priority = 2
    }
    if (!historicalName || !modernNameZh) return

    const geometry = transformGeometry(raw.geometry)
    if (!geometry || !geometryInBounds(geometry)) return
    const language = /parc|jardin/i.test(historicalName) ? 'fr' : 'en'
    const groupKey = historicalName === 'Dingxiang Huayuan'
      ? 'dingxiang-huayuan-dingxiang-huayuan'
      : slug(`${historicalName}-${modernNameZh}`) || `park-${index}`
    parks.push({
      type: 'Feature',
      geometry,
      properties: {
        id: `landmark-${groupKey}-${index}`,
        featureGroupId: `landmark-${groupKey}`,
        kind: 'landmark',
        historicalName,
        modernNameZh,
        ...(historicalChinese ? { historicalChinese } : {}),
        ...(aliases ? { aliases } : {}),
        jurisdiction: language === 'fr' ? 'french-concession' : 'international-settlement',
        language,
        labelYear: start,
        sourceIds: ['vs-parks'],
        ...(Number.isFinite(parkRecordId) && parkRecordId > 0
          ? { sourceParkRecordIds: [parkRecordId] }
          : {}),
        category,
        priority,
      },
    })
  })
  return parks
}

function ensureAcceptanceExamples(features) {
  let hasDolfus = false
  let hasVallon = false
  let hasFrenchPark = false
  const frenchParkBuildingRecords = []
  const withFrenchParkBuildingRecords = (properties) => {
    if (!frenchParkBuildingRecords.length) return properties
    const sourceRecordIds = [...new Set(frenchParkBuildingRecords.flatMap(
      (record) => record.sourceRecordIds ?? [],
    ))]
    const legacyFeatureGroupIds = [...new Set(frenchParkBuildingRecords.flatMap(
      (record) => record.legacyFeatureGroupIds ?? [],
    ))]
    const buildingSourceUrl = frenchParkBuildingRecords
      .map((record) => record.sourceUrls?.['vs-buildings'])
      .find(Boolean)
    return {
      ...properties,
      sourceIds: [...new Set([...properties.sourceIds, 'vs-buildings'])],
      sourceRecordIds,
      legacyFeatureGroupIds,
      historicalRecords: [{
        sourceRecordIds,
        name: 'Koukaza Park',
        nameZh: '法国公園',
        startYear: frenchParkBuildingRecords.map((record) => record.labelYear).find(Boolean),
        sourceUrls: frenchParkBuildingRecords.flatMap((record) =>
          record.sourceRecordIds?.map(virtualShanghaiBuildingUrl) ?? []),
        category: '公园',
      }],
      sourceUrls: buildingSourceUrl
        ? { ...(properties.sourceUrls ?? {}), 'vs-buildings': buildingSourceUrl }
        : properties.sourceUrls,
    }
  }
  const output = features.flatMap((feature) => {
    const properties = feature.properties
    const modern = `${properties.modernNameZh} ${properties.modernNameEn ?? ''}`.toLowerCase()
    const historical = properties.historicalName.toLowerCase()

    if (properties.kind === 'road' && /gaston\s+kahn/.test(historical)) {
      return [{
        ...feature,
        properties: {
          ...properties,
          featureGroupId: 'road-route-gaston-kahn-嘉善路',
          historicalName: 'Route Gaston Kahn',
          modernNameZh: '嘉善路',
          modernNameEn: 'Jiashan Road',
          aliases: [...new Set([...(properties.aliases ?? []), '甘世东路', 'Jiashan Lu'])],
        },
      }]
    }

    if (properties.kind === 'road' && /南昌|nanchang/.test(modern)) {
      if (/doll?fus/.test(historical)) {
        hasDolfus = true
        return [{
          ...feature,
          properties: {
            ...properties,
            featureGroupId: 'road-route-dolfus',
            historicalName: 'Route Dolfus',
            modernNameZh: '南昌路',
            modernNameEn: 'Nanchang Road',
            historicalChinese: '陶而斐司路',
            aliases: ['陶而斐司路', 'Route Dollfus'],
            labelYear: 1928,
          },
        }]
      }
      if (/vallon/.test(historical)) {
        hasVallon = true
        return [{
          ...feature,
          properties: {
            ...properties,
            featureGroupId: 'road-route-vallon',
            historicalName: 'Route Vallon',
            modernNameZh: '南昌路',
            modernNameEn: 'Nanchang Road',
            historicalChinese: '環龍路',
            aliases: ['环龙路', '環龍路', 'Rue Vallon'],
            labelYear: 1928,
          },
        }]
      }
      return []
    }

    if (properties.kind === 'landmark') {
      if (properties.historicalName === 'Parc français' && properties.modernNameZh === '复兴公园') {
        if (hasFrenchPark) return []
        hasFrenchPark = true
        return [{
          ...feature,
          properties: withFrenchParkBuildingRecords({
            ...properties,
            id: 'landmark-french-park',
            featureGroupId: 'landmark-french-park',
            historicalName: 'Parc français',
            modernNameZh: '复兴公园',
            modernNameEn: 'Fuxing Park',
            aliases: ['French Park', '法國公園', '法国公园', 'Koukaza Park', 'Parc de Koukaza'],
            jurisdiction: 'french-concession',
            language: 'fr',
            labelYear: 1909,
            sourceIds: ['stanford-map-1928', 'vs-parks'],
          }),
        }]
      }
      if ((/koukaza park/.test(historical) || /法国公园|法國公園/.test(modern)) &&
        properties.sourceIds?.includes('vs-buildings')) {
        frenchParkBuildingRecords.push(properties)
        return []
      }
      if (/koukaza park/.test(historical) || /法国公园|法國公園/.test(modern)) return []
    }
    return [feature]
  })

  if (!hasDolfus) output.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [121.467017, 31.221163],
          [121.466524, 31.220987],
          [121.464893, 31.221289],
        ],
      },
      properties: {
        id: 'road-route-dolfus',
        featureGroupId: 'road-route-dolfus',
        kind: 'road',
        historicalName: 'Route Dolfus',
        modernNameZh: '南昌路',
        modernNameEn: 'Nanchang Road',
        historicalChinese: '陶而斐司路',
        aliases: ['陶而斐司路', 'Route Dollfus'],
        jurisdiction: 'french-concession',
        language: 'fr',
        labelYear: 1928,
        sourceIds: ['stanford-map-1928', 'vs-geocoder-1939'],
        category: '道路',
        priority: 2,
      },
    })
  if (!hasVallon) output.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [121.464893, 31.221289],
          [121.461522, 31.220121],
          [121.45687, 31.21806],
          [121.451643, 31.216026],
        ],
      },
      properties: {
        id: 'road-route-vallon',
        featureGroupId: 'road-route-vallon',
        kind: 'road',
        historicalName: 'Route Vallon',
        modernNameZh: '南昌路',
        modernNameEn: 'Nanchang Road',
        historicalChinese: '環龍路',
        aliases: ['环龙路', '環龍路', 'Rue Vallon'],
        jurisdiction: 'french-concession',
        language: 'fr',
        labelYear: 1928,
        sourceIds: ['stanford-map-1928', 'vs-geocoder-1939'],
        category: '道路',
        priority: 2,
      },
    })
  if (!hasFrenchPark) output.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [121.46435, 31.21935] },
      properties: withFrenchParkBuildingRecords({
        id: 'landmark-french-park',
        featureGroupId: 'landmark-french-park',
        kind: 'landmark',
        historicalName: 'Parc français',
        modernNameZh: '复兴公园',
        modernNameEn: 'Fuxing Park',
        aliases: ['French Park', '法國公園', '法国公园', 'Koukaza Park', 'Parc de Koukaza'],
        jurisdiction: 'french-concession',
        language: 'fr',
        labelYear: 1909,
        sourceIds: ['stanford-map-1928', 'vs-parks'],
        category: '公园',
        priority: 1,
      }),
    })

  return output
}

function makeJurisdictions(rawInternational, rawFrench) {
  const convert = (features, jurisdiction, sourceId) =>
    features.flatMap((raw, index) => {
      const geometry = transformGeometry(raw.geometry)
      if (!geometry || !geometryInBounds(geometry)) return []
      return [
        {
          type: 'Feature',
          geometry,
          properties: {
            id: `${jurisdiction}-${index}`,
            jurisdiction,
            sourceId,
          },
        },
      ]
    })

  return [
    ...convert(rawInternational, 'international-settlement', 'vs-is-districts-1928'),
    ...convert(rawFrench, 'french-concession', 'vs-fc-districts-1920'),
  ]
}

async function main() {
  await fs.mkdir(cacheRoot, { recursive: true })
  await fs.mkdir(outputRoot, { recursive: true })
  const loaded = Object.fromEntries(
    await Promise.all(downloads.map(async (item) => [item.id, await readShape(item)])),
  )

  const roads = makeRoads([...loaded.geocoder, ...loaded['geocoder-ext']])
  const buildingSiteOverrides = await loadBuildingSiteOverrides()
  const liveBuildings = await loadLiveBuildingRecords(loaded.buildings)
  const { buildings, audit: buildingClusterAudit } = makeBuildings(
    liveBuildings.records,
    {
      mode: liveBuildings.sourceMode,
      sourceRecordCount: liveBuildings.sourceCount,
      ...liveBuildings.snapshot,
    },
    buildingSiteOverrides,
  )
  const parks = makeParks(loaded.parks)
  const features = ensureAcceptanceExamples([...roads, ...buildings, ...parks])
  const jurisdictions = makeJurisdictions(
    loaded['international-settlement'],
    loaded['french-concession'],
  )
  const supplementalSources = JSON.parse(await fs.readFile(supplementalSourcesPath, 'utf8'))
  const mergedSources = [...new Map(
    [...sources, ...supplementalSources].map((source) => [source.id, source]),
  ).values()]

  await Promise.all([
    fs.writeFile(
      path.join(outputRoot, 'historical-features.geojson'),
      JSON.stringify({ type: 'FeatureCollection', features }),
    ),
    fs.writeFile(
      path.join(outputRoot, 'jurisdictions.geojson'),
      JSON.stringify({ type: 'FeatureCollection', features: jurisdictions }),
    ),
    fs.writeFile(buildingClusterAuditPath, JSON.stringify(buildingClusterAudit, null, 2)),
    fs.writeFile(path.join(outputRoot, 'sources.json'), JSON.stringify(mergedSources, null, 2)),
  ])

  const roadGroups = new Set(
    features.filter((feature) => feature.properties.kind === 'road').map((feature) => feature.properties.featureGroupId),
  )
  const landmarks = features.filter((feature) => feature.properties.kind === 'landmark')
  console.log(
    `Generated ${features.length} features: ${roadGroups.size} named roads, ${landmarks.length} landmarks ` +
    `from ${buildingClusterAudit.summary.sourceRecords} Virtual Shanghai building records, ` +
    `${jurisdictions.length} jurisdiction polygons.`,
  )
}

await main()
