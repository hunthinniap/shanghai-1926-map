import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'
import proj4 from 'proj4'
import * as shapefile from 'shapefile'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheRoot = path.join(projectRoot, '.cache', 'historical-source')
const outputRoot = path.join(projectRoot, 'public', 'data')
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

function makeBuildings(rawFeatures) {
  const buildings = []
  rawFeatures.forEach((raw, index) => {
    const properties = raw.properties ?? {}
    const start = parseYear(field(properties, 'START', 'DATE_START'))
    const end = parseYear(field(properties, 'END', 'DATE_END'))
    if (!start || start > 1928 || (end && end < 1928)) return

    const historicalName = canonicalName(repairDisplayText(field(properties, 'NAME', 'F_NAME')))
    const modernNameZh = field(properties, 'CHINESE', 'C_NAME')
    if (!historicalName || !modernNameZh || !isMajorBuilding(properties, historicalName)) return

    const geometry = transformGeometry(raw.geometry)
    if (!geometry || !geometryInBounds(geometry)) return
    const category = landmarkCategory(properties)
    const groupKey = slug(`${historicalName}-${modernNameZh}`) || `building-${index}`
    buildings.push({
      type: 'Feature',
      geometry,
      properties: {
        id: `landmark-${groupKey}-${index}`,
        featureGroupId: `landmark-${groupKey}`,
        kind: 'landmark',
        historicalName,
        modernNameZh,
        jurisdiction: 'international-settlement',
        language: 'en',
        labelYear: start,
        sourceIds: ['vs-buildings'],
        category,
        priority: /municipal|consulate|station|cathedral|bund|club/i.test(historicalName) ? 1 : 3,
      },
    })
  })
  return buildings
}

function makeParks(rawFeatures) {
  const parks = []
  rawFeatures.forEach((raw, index) => {
    const properties = raw.properties ?? {}
    const start = parseYear(field(properties, 'START'))
    const end = parseYear(field(properties, 'END'))
    if (!start || start > 1928 || (end && end < 1928)) return

    let historicalName = canonicalName(field(properties, 'S_NAME', 'NAME'))
    let modernNameZh = field(properties, 'CURRENT_NA', 'CHINESE')
    const searchable = `${historicalName} ${modernNameZh}`.toLowerCase()
    if (/fuxing|fu xing|復興|复兴|french park/.test(searchable)) {
      historicalName = 'Parc français'
      modernNameZh = '复兴公园'
    }
    if (!historicalName || !modernNameZh) return

    const geometry = transformGeometry(raw.geometry)
    if (!geometry || !geometryInBounds(geometry)) return
    const language = /parc|jardin/i.test(historicalName) ? 'fr' : 'en'
    const groupKey = slug(`${historicalName}-${modernNameZh}`) || `park-${index}`
    parks.push({
      type: 'Feature',
      geometry,
      properties: {
        id: `landmark-${groupKey}-${index}`,
        featureGroupId: `landmark-${groupKey}`,
        kind: 'landmark',
        historicalName,
        modernNameZh,
        jurisdiction: language === 'fr' ? 'french-concession' : 'international-settlement',
        language,
        labelYear: start,
        sourceIds: ['vs-parks'],
        category: '公园',
        priority: 1,
      },
    })
  })
  return parks
}

function ensureAcceptanceExamples(features) {
  let hasDolfus = false
  let hasVallon = false
  let hasFrenchPark = false
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
          properties: {
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
          },
        }]
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
      properties: {
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
      },
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
  const buildings = makeBuildings(loaded.buildings)
  const parks = makeParks(loaded.parks)
  const features = ensureAcceptanceExamples([...roads, ...buildings, ...parks])
  const jurisdictions = makeJurisdictions(
    loaded['international-settlement'],
    loaded['french-concession'],
  )

  await Promise.all([
    fs.writeFile(
      path.join(outputRoot, 'historical-features.geojson'),
      JSON.stringify({ type: 'FeatureCollection', features }),
    ),
    fs.writeFile(
      path.join(outputRoot, 'jurisdictions.geojson'),
      JSON.stringify({ type: 'FeatureCollection', features: jurisdictions }),
    ),
    fs.writeFile(path.join(outputRoot, 'sources.json'), JSON.stringify(sources, null, 2)),
  ])

  const roadGroups = new Set(
    features.filter((feature) => feature.properties.kind === 'road').map((feature) => feature.properties.featureGroupId),
  )
  const landmarks = features.filter((feature) => feature.properties.kind === 'landmark')
  console.log(
    `Generated ${features.length} features: ${roadGroups.size} named roads, ${landmarks.length} landmarks, ${jurisdictions.length} jurisdiction polygons.`,
  )
}

await main()
