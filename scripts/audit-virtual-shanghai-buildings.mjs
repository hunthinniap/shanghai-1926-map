import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as shapefile from 'shapefile'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(projectRoot, '.cache', 'historical-source', 'buildings')
const shpPath = path.join(sourceRoot, 'Buildings.shp')
const shxPath = path.join(sourceRoot, 'Buildings.shx')
const dbfPath = path.join(sourceRoot, 'Buildings.dbf')
const prjPath = path.join(sourceRoot, 'Buildings.prj')
const readmePath = path.join(sourceRoot, 'Buildings_ReadMe.txt')
const completePath = path.join(sourceRoot, '.complete')
const outputPath = path.join(projectRoot, '.cache', 'research', 'full-buildings-audit.json')
const liveSnapshotPath = path.join(projectRoot, 'scripts', 'data', 'virtual-shanghai-buildings-live.json')
const clusterAuditPath = path.join(projectRoot, 'public', 'data', 'virtual-shanghai-building-clusters.json')

const TASK_STATED_COUNT = 1803
const TARGET_IDS = new Set([323, 324, 493])

function text(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\u0000/g, '').trim()
}

function normalizedText(value) {
  return text(value)
    .normalize('NFKC')
    .toLocaleUpperCase('en')
    .replace(/[，。；：、,./\\()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizedAddress(value) {
  return normalizedText(value)
    .replace(/\bN(?:O)?\.?\s*(?=\d)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function propertyCoordinate(feature) {
  const x = Number(feature.properties?.XC)
  const y = Number(feature.properties?.YC)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return [x, y]
}

function geometryCoordinate(feature) {
  const coordinates = feature.geometry?.coordinates
  if (feature.geometry?.type !== 'Point' || !Array.isArray(coordinates)) return null
  const x = Number(coordinates[0])
  const y = Number(coordinates[1])
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return [x, y]
}

function coordinateKey(feature, decimals = 4) {
  const coordinate = propertyCoordinate(feature) ?? geometryCoordinate(feature)
  if (!coordinate) return ''
  return coordinate.map((value) => value.toFixed(decimals)).join(',')
}

function roundedMetreCoordinateKey(feature) {
  const coordinate = propertyCoordinate(feature) ?? geometryCoordinate(feature)
  if (!coordinate) return ''
  return coordinate.map((value) => Math.round(value)).join(',')
}

function semanticSignature(feature) {
  const properties = feature.properties ?? {}
  const types = Array.from({ length: 11 }, (_, index) => normalizedText(properties[`TYP${String(index + 1).padStart(2, '0')}`]))
    .filter(Boolean)
  return [
    normalizedText(properties.NAME),
    normalizedText(properties.CHINESE),
    types.join('>'),
    Number(properties.START) || 0,
    Number(properties.END_) || 0,
  ].join('|')
}

function groupBy(features, keyFunction) {
  const groups = new Map()
  for (const feature of features) {
    const key = keyFunction(feature)
    if (!key) continue
    const group = groups.get(key) ?? []
    group.push(feature)
    groups.set(key, group)
  }
  return groups
}

function compactRecord(feature) {
  const properties = feature.properties ?? {}
  return {
    IDBAT: properties.IDBAT ?? null,
    OBJECTID: properties.OBJECTID ?? null,
    NAME: properties.NAME ?? null,
    CHINESE: properties.CHINESE ?? null,
    F_ADDRESS: properties.F_ADDRESS ?? null,
    START: properties.START ?? null,
    END_: properties.END_ ?? null,
    types: Array.from({ length: 11 }, (_, index) => properties[`TYP${String(index + 1).padStart(2, '0')}`])
      .filter((value) => value !== null && value !== undefined && text(value) !== ''),
    coordinate: propertyCoordinate(feature) ?? geometryCoordinate(feature),
  }
}

function clusterSummary(groups, { limit = 20 } = {}) {
  const duplicateGroups = [...groups.entries()]
    .filter(([, records]) => records.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
  return {
    clusterCount: duplicateGroups.length,
    recordsInClusters: duplicateGroups.reduce((sum, [, records]) => sum + records.length, 0),
    largestClusterSize: duplicateGroups[0]?.[1].length ?? 0,
    heterogeneousSemanticClusterCount: duplicateGroups.filter(([, records]) => new Set(records.map(semanticSignature)).size > 1).length,
    largestClusters: duplicateGroups.slice(0, limit).map(([key, records]) => ({
      key,
      count: records.length,
      records: records.map(compactRecord),
    })),
  }
}

function collisionMetrics(features, keyFunction) {
  const groups = groupBy(features, keyFunction)
  const collisions = [...groups.values()].filter((records) => records.length > 1)
  return {
    eligibleRecords: [...groups.values()].reduce((sum, records) => sum + records.length, 0),
    distinctKeys: groups.size,
    collisionClusters: collisions.length,
    recordsInCollisionClusters: collisions.reduce((sum, records) => sum + records.length, 0),
    heterogeneousSemanticClusters: collisions.filter((records) => new Set(records.map(semanticSignature)).size > 1).length,
    largestClusterSize: Math.max(0, ...collisions.map((records) => records.length)),
  }
}

function readDbfHeader(buffer) {
  const recordCount = buffer.readUInt32LE(4)
  const headerLength = buffer.readUInt16LE(8)
  const recordLength = buffer.readUInt16LE(10)
  const fields = []
  for (let offset = 32; offset < headerLength - 1; offset += 32) {
    if (buffer[offset] === 0x0d) break
    const zero = buffer.indexOf(0, offset)
    const nameEnd = zero >= offset && zero < offset + 11 ? zero : offset + 11
    fields.push({
      name: buffer.toString('ascii', offset, nameEnd),
      dbfType: String.fromCharCode(buffer[offset + 11]),
      width: buffer[offset + 16],
      decimals: buffer[offset + 17],
    })
  }
  return { recordCount, headerLength, recordLength, fields }
}

function readShxCount(buffer) {
  return (buffer.length - 100) / 8
}

function valueKey(value) {
  if (value instanceof Date) return value.toISOString()
  return JSON.stringify(value)
}

function fieldStatistics(features, fieldSchema) {
  return fieldSchema.map((schema) => {
    const values = features.map((feature) => feature.properties?.[schema.name])
    const nonNull = values.filter((value) => value !== null && value !== undefined)
    const blankStrings = nonNull.filter((value) => typeof value === 'string' && text(value) === '').length
    const populated = nonNull.filter((value) => !(typeof value === 'string' && text(value) === ''))
    const types = {}
    for (const value of populated) {
      const type = value instanceof Date ? 'date' : typeof value
      types[type] = (types[type] ?? 0) + 1
    }
    return {
      ...schema,
      populated: populated.length,
      nullOrUndefined: values.length - nonNull.length,
      blankStrings,
      numericZero: populated.filter((value) => typeof value === 'number' && value === 0).length,
      distinctPopulatedValues: new Set(populated.map(valueKey)).size,
      parsedTypes: types,
    }
  })
}

function yearColumnStatistics(features, fieldName) {
  const raw = features.map((feature) => feature.properties?.[fieldName])
  const numeric = raw.map(Number).filter(Number.isFinite)
  const known = numeric.filter((value) => value > 0)
  const plausible = known.filter((value) => Number.isInteger(value) && value >= 1000 && value <= 2100)
  return {
    total: raw.length,
    knownPositive: known.length,
    zeroSentinel: numeric.filter((value) => value === 0).length,
    nullOrNonNumeric: raw.length - numeric.length,
    plausibleYearCount: plausible.length,
    implausiblePositiveValues: [...new Set(known.filter((value) => !plausible.includes(value)))].sort((a, b) => a - b),
    minimumKnown: known.length ? Math.min(...known) : null,
    maximumKnown: known.length ? Math.max(...known) : null,
    atOrBefore1928: known.filter((value) => value <= 1928).length,
    after1928: known.filter((value) => value > 1928).length,
  }
}

function yearsStatistics(features) {
  const startKnown = (feature) => Number(feature.properties?.START) > 0
  const endKnown = (feature) => Number(feature.properties?.END_) > 0
  const creationValues = features.map((feature) => feature.properties?.DATE_CREAT).filter(Boolean)
  return {
    START: yearColumnStatistics(features, 'START'),
    END_: yearColumnStatistics(features, 'END_'),
    combinations: {
      bothKnown: features.filter((feature) => startKnown(feature) && endKnown(feature)).length,
      startKnownEndUnknown: features.filter((feature) => startKnown(feature) && !endKnown(feature)).length,
      startUnknownEndKnown: features.filter((feature) => !startKnown(feature) && endKnown(feature)).length,
      bothUnknown: features.filter((feature) => !startKnown(feature) && !endKnown(feature)).length,
      endBeforeStart: features.filter((feature) => startKnown(feature) && endKnown(feature) && Number(feature.properties.END_) < Number(feature.properties.START)).length,
    },
    DATE_CREAT: {
      populated: creationValues.length,
      distinctValues: [...new Set(creationValues.map(valueKey))].sort(),
    },
    interpretation: "START=0 and END_=0 are used as unknown sentinels in this DBF; they are not years. The source README does not promise complete construction/demolition dates.",
  }
}

function coordinateStatistics(features) {
  const propertyCoordinates = features.map(propertyCoordinate).filter(Boolean)
  const geometryCoordinates = features.map(geometryCoordinate).filter(Boolean)
  const distances = features.map((feature) => {
    const property = propertyCoordinate(feature)
    const geometry = geometryCoordinate(feature)
    if (!property || !geometry) return null
    return Math.hypot(property[0] - geometry[0], property[1] - geometry[1])
  }).filter((value) => value !== null)
  const exact = clusterSummary(groupBy(features, (feature) => coordinateKey(feature, 4)))
  const roundedOneMetre = clusterSummary(groupBy(features, roundedMetreCoordinateKey))
  return {
    coordinateReferenceSystem: 'WGS 84 / UTM zone 51N (EPSG:32651), metres',
    geometryTypes: Object.fromEntries([...groupBy(features, (feature) => feature.geometry?.type ?? 'missing')].map(([key, records]) => [key, records.length])),
    propertyXY: {
      bothPresent: propertyCoordinates.length,
      missingEither: features.length - propertyCoordinates.length,
      bounds: propertyCoordinates.length ? {
        minX: Math.min(...propertyCoordinates.map(([x]) => x)),
        maxX: Math.max(...propertyCoordinates.map(([x]) => x)),
        minY: Math.min(...propertyCoordinates.map(([, y]) => y)),
        maxY: Math.max(...propertyCoordinates.map(([, y]) => y)),
      } : null,
    },
    pointGeometry: {
      present: geometryCoordinates.length,
      missingOrNonPoint: features.length - geometryCoordinates.length,
    },
    propertyVersusGeometry: {
      compared: distances.length,
      mismatchesOverOneMillimetre: distances.filter((distance) => distance > 0.001).length,
      maximumDifferenceMetres: distances.length ? Math.max(...distances) : null,
    },
    exactToFourDecimals: exact,
    roundedToNearestMetreCandidateOnly: roundedOneMetre,
  }
}

function addressStatistics(features) {
  const rawPresent = features.filter((feature) => text(feature.properties?.F_ADDRESS))
  const exactGroups = groupBy(features, (feature) => text(feature.properties?.F_ADDRESS))
  const normalizedGroups = groupBy(features, (feature) => normalizedAddress(feature.properties?.F_ADDRESS))
  return {
    populated: rawPresent.length,
    missingOrBlank: features.length - rawPresent.length,
    distinctRaw: exactGroups.size,
    distinctNormalized: normalizedGroups.size,
    rawExactDuplicates: clusterSummary(exactGroups),
    normalizedDuplicates: clusterSummary(normalizedGroups),
    normalization: "Unicode NFKC; uppercase; punctuation to spaces; collapse whitespace; remove an address-number NO/N prefix only when immediately before digits. No road-name translation or old/new street conversion is attempted.",
  }
}

function fullTargetRecord(feature, sourceIndex) {
  return {
    sourceIndex,
    properties: Object.fromEntries(Object.entries(feature.properties ?? {}).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ])),
    geometry: feature.geometry,
    normalized: {
      address: normalizedAddress(feature.properties?.F_ADDRESS),
      coordinateKeyFourDecimals: coordinateKey(feature, 4),
      semanticSignature: semanticSignature(feature),
    },
  }
}

function pairwiseTargetDistances(targets) {
  const pairs = []
  for (let left = 0; left < targets.length; left += 1) {
    for (let right = left + 1; right < targets.length; right += 1) {
      const a = propertyCoordinate(targets[left].feature) ?? geometryCoordinate(targets[left].feature)
      const b = propertyCoordinate(targets[right].feature) ?? geometryCoordinate(targets[right].feature)
      pairs.push({
        ids: [targets[left].feature.properties.IDBAT, targets[right].feature.properties.IDBAT],
        distanceMetres: a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : null,
      })
    }
  }
  return pairs
}

async function main() {
  const [dbfBuffer, shxBuffer, projection, readme, sourceUrl, liveSnapshot, clusterAudit] = await Promise.all([
    fs.readFile(dbfPath),
    fs.readFile(shxPath),
    fs.readFile(prjPath, 'utf8'),
    fs.readFile(readmePath, 'utf8'),
    fs.readFile(completePath, 'utf8').then((value) => value.trim()),
    fs.readFile(liveSnapshotPath, 'utf8').then(JSON.parse),
    fs.readFile(clusterAuditPath, 'utf8').then(JSON.parse),
  ])
  const dbf = readDbfHeader(dbfBuffer)
  const reader = await shapefile.open(shpPath, dbfPath, { encoding: 'utf-8' })
  const features = []
  while (true) {
    const next = await reader.read()
    if (next.done) break
    features.push(next.value)
  }

  const targets = features
    .map((feature, sourceIndex) => ({ feature, sourceIndex }))
    .filter(({ feature }) => TARGET_IDS.has(Number(feature.properties?.IDBAT)))
    .sort((a, b) => Number(a.feature.properties.IDBAT) - Number(b.feature.properties.IDBAT))

  const idbatGroups = groupBy(features, (feature) => text(feature.properties?.IDBAT))
  const objectIdGroups = groupBy(features, (feature) => text(feature.properties?.OBJECTID))
  const deterministicKeys = {
    idbatRecordIdentity: collisionMetrics(features, (feature) => text(feature.properties?.IDBAT)),
    normalizedAddressOnly: collisionMetrics(features, (feature) => normalizedAddress(feature.properties?.F_ADDRESS)),
    exactCoordinateOnly: collisionMetrics(features, (feature) => coordinateKey(feature, 4)),
    addressAndExactCoordinate: collisionMetrics(features, (feature) => {
      const address = normalizedAddress(feature.properties?.F_ADDRESS)
      const coordinate = coordinateKey(feature, 4)
      return address && coordinate ? `${address}|${coordinate}` : ''
    }),
    conservativeSemanticDuplicate: collisionMetrics(features, (feature) => {
      const address = normalizedAddress(feature.properties?.F_ADDRESS)
      const coordinate = coordinateKey(feature, 4)
      const semantic = semanticSignature(feature)
      return address && coordinate && semantic ? `${address}|${coordinate}|${semantic}` : ''
    }),
  }
  const liveRecordIds = liveSnapshot.records.map((record) => Number(record.id))
  const liveCoordinateCount = liveSnapshot.records.filter((record) =>
    Number.isFinite(Number(record.x)) && Number.isFinite(Number(record.y))).length
  if (!liveSnapshot.complete || liveSnapshot.errors?.length || liveSnapshot.records.length !== TASK_STATED_COUNT) {
    throw new Error('The live Virtual Shanghai building snapshot is incomplete')
  }
  if (new Set(liveRecordIds).size !== TASK_STATED_COUNT) {
    throw new Error('The live Virtual Shanghai building snapshot has duplicate or missing record IDs')
  }
  if (liveCoordinateCount !== TASK_STATED_COUNT) {
    throw new Error(`Only ${liveCoordinateCount}/${TASK_STATED_COUNT} live records have mapped coordinates`)
  }
  if (clusterAudit.summary?.mappedSourceRecords !== TASK_STATED_COUNT ||
    clusterAudit.summary?.omittedClusters !== 0) {
    throw new Error('The generated site-cluster audit does not account for all 1803 live records')
  }

  const report = {
    generatedAt: new Date().toISOString(),
    source: {
      downloadUrl: sourceUrl,
      relativeDirectory: '.cache/historical-source/buildings',
      projectionWkt: projection.trim(),
      readmeNotes: {
        description: 'Location shape for buildings identified by C. Henriot; IDBAT links to the Virtual Shanghai building ID.',
        localOnlineDriftWarning: 'The bundled README warns that C. Henriot frequently adds buildings without notice, so the online and local files may be out of sync.',
        sourceColumnDiscrepancy: 'The README documents a File/source column, but the downloaded DBF schema has no File field.',
      },
      readmeCharacterCount: readme.length,
    },
    counts: {
      taskStatedRecordCount: TASK_STATED_COUNT,
      liveDirectorySnapshotRecordCount: liveSnapshot.records.length,
      dbfHeaderRecordCount: dbf.recordCount,
      shxIndexRecordCount: readShxCount(shxBuffer),
      shapefileReaderRecordCount: features.length,
      differenceFromTaskStatedCount: features.length - TASK_STATED_COUNT,
      liveOnlyRecordCount: liveSnapshot.records.length - features.length,
      conclusion: features.length === TASK_STATED_COUNT
        ? 'The local source contains the task-stated number of records.'
        : `The downloadable shapefile contains ${features.length} records while the live directory snapshot contains all ${TASK_STATED_COUNT}; the ${TASK_STATED_COUNT - features.length} live-only records are preserved with explicit coordinate provenance.`,
    },
    liveDirectorySnapshot: {
      sourceUrl: liveSnapshot.sourceUrl,
      fetchedAt: liveSnapshot.fetchedAt,
      complete: liveSnapshot.complete,
      errors: liveSnapshot.errors,
      sync: liveSnapshot.sync,
      distinctRecordIds: new Set(liveRecordIds).size,
      recordsWithCoordinates: liveCoordinateCount,
    },
    generatedSiteClusters: clusterAudit.summary,
    identifiers: {
      IDBAT: {
        populated: [...idbatGroups.values()].reduce((sum, records) => sum + records.length, 0),
        missing: features.length - [...idbatGroups.values()].reduce((sum, records) => sum + records.length, 0),
        distinct: idbatGroups.size,
        duplicateClusters: [...idbatGroups.values()].filter((records) => records.length > 1).length,
      },
      OBJECTID: {
        populated: [...objectIdGroups.values()].reduce((sum, records) => sum + records.length, 0),
        missing: features.length - [...objectIdGroups.values()].reduce((sum, records) => sum + records.length, 0),
        distinct: objectIdGroups.size,
        duplicateClusters: [...objectIdGroups.values()].filter((records) => records.length > 1).length,
      },
    },
    dbf: {
      headerLengthBytes: dbf.headerLength,
      recordLengthBytes: dbf.recordLength,
      fieldCount: dbf.fields.length,
      fields: fieldStatistics(features, dbf.fields),
    },
    years: yearsStatistics(features),
    coordinates: coordinateStatistics(features),
    addresses: addressStatistics(features),
    targetRecords: {
      requestedIds: [...TARGET_IDS],
      recordsFound: targets.length,
      records: targets.map(({ feature, sourceIndex }) => fullTargetRecord(feature, sourceIndex)),
      pairwiseCoordinateDistancesMetres: pairwiseTargetDistances(targets),
      auditFinding: 'IDBAT 323 and 493 both describe Muslim Cemetery at 597 ROUTE DE ZIKAWEI, with variant Chinese characters and points about 82 m apart; they are plausible same-site candidates but not exact-record duplicates. IDBAT 324 is a Temple at the same address, has START=1892 and a different type signature, and lies about 79 m from 323 and 157 m from 493. Address-only grouping would therefore merge a semantically distinct temple into the cemetery cluster.',
    },
    clusteringAudit: {
      keyCollisionMetrics: deterministicKeys,
      recommendedKeys: {
        immutableRecordIdentity: "`vs-building:${IDBAT}`. IDBAT is fully populated and unique in this local snapshot; use it to preserve source-record identity, never to infer that two IDs are the same site.",
        deterministicAutoMergeKey: "normalized(F_ADDRESS) + XC/YC to 0.0001 m + normalized(NAME) + normalized(CHINESE) + ordered TYP01..TYP11 + START + END_. Only exact agreement on all components should be eligible for automatic deduplication.",
        candidateSiteBlockingKey: "normalized(F_ADDRESS) plus a spatial-neighbour test in EPSG:32651. This may create review candidates but must not auto-merge records; the search radius must be explicit and recorded.",
      },
      falseMergeRisks: [
        {
          key: 'normalized address alone',
          risk: 'high',
          explanation: 'One street number can contain several facilities or a large compound. IDs 323, 324 and 493 are the concrete counterexample: the same address contains cemetery and temple records at different points.',
        },
        {
          key: 'coordinate alone',
          risk: 'high',
          explanation: 'Geocoders may reuse a representative point for several institutions in one building/compound. Exact-coordinate collisions with different semantic signatures are counted in keyCollisionMetrics and must remain separate without corroboration.',
        },
        {
          key: 'name or Chinese label alone',
          risk: 'high',
          explanation: 'Generic labels such as Temple, Hotel, Bank and School recur throughout the table; orthographic variants such as 清真公瑩/清真公塋 also defeat simple equality without proving identity.',
        },
        {
          key: 'address plus coordinate',
          risk: 'medium',
          explanation: 'This is a useful duplicate-candidate key, but multiple contemporaneous functions may legitimately share a point. Require the semantic signature to match for automatic merge, or preserve separate IDBAT records.',
        },
        {
          key: 'rounded spatial grid',
          risk: 'high',
          explanation: 'Rounding creates boundary artefacts and can merge nearby but distinct structures. It is reported only as a candidate-discovery diagnostic, not as a deterministic identity key.',
        },
      ],
      decisionForRequestedIds: {
        keepSeparateSourceRecords: [323, 324, 493],
        candidateSamePhysicalSitePair: [323, 493],
        neverAutoMergeWithCemeteryPair: 324,
        rationale: '323/493 share English name and address but differ in IDBAT, Chinese spelling, coordinates and TYP03; 324 differs in name, chronology and functional taxonomy. Preserve all three and express any same-site relationship separately from record identity.',
      },
    },
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(
    `Audited ${features.length} shapefile records plus ${liveSnapshot.records.length} live-directory records; ` +
    `${clusterAudit.summary.siteClusters} mapped sites retain all ${clusterAudit.summary.mappedSourceRecords} source records -> ` +
    path.relative(projectRoot, outputPath),
  )
}

await main()
